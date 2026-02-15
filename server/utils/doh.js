import https from 'https';
import http from 'http';
import net from 'net';

/**
 * DoH (DNS-over-HTTPS) Module with Provider Rotation + Circuit Breaker
 * ARC-01: Multi-provider resilience for anti-censorship
 *
 * v2.8.1 FIXES:
 * - FIX-1: Added `doh` mode option ('full' | 'dns-only' | false)
 *   • 'full'     — resolve IP via DoH + connect by IP with SNI (for CDN/APIs like TMDB)
 *   • 'dns-only' — resolve via DoH to bypass DNS blocking, but connect by hostname (for trackers)
 *   • false      — no DoH at all, plain request
 * - FIX-2: Added redirect following (301/302/307/308) with max 5 hops
 * - FIX-3: Always set Host header
 * - FIX-4: Added port to requestOptions when using resolved IP
 * - FIX-5: Added rejectUnauthorized: false for tracker connections
 */

// --- CONFIGURATION ---
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes
const RACE_TIMEOUT_MS = 5000;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN_MS = 60 * 1000;
const MAX_REDIRECTS = 5;
const DEBUG = true;

// --- DoH PROVIDERS ---
const DOH_PROVIDERS = [
    { name: 'Google', url: 'https://dns.google/resolve' },
    { name: 'Cloudflare', url: 'https://cloudflare-dns.com/dns-query' },
    { name: 'Quad9', url: 'https://dns.quad9.net:5053/dns-query' }
];

// --- CIRCUIT BREAKER STATE ---
const providerState = new Map();

function initProviderState(provider) {
    if (!providerState.has(provider.name)) {
        providerState.set(provider.name, {
            failures: 0,
            circuitOpen: false,
            lastFailure: 0,
            lastSuccess: 0
        });
    }
    return providerState.get(provider.name);
}

function recordSuccess(provider) {
    const state = initProviderState(provider);
    state.failures = 0;
    state.circuitOpen = false;
    state.lastSuccess = Date.now();
    if (DEBUG) console.log(`[DoH] ✅ ${provider.name} success`);
}

function recordFailure(provider) {
    const state = initProviderState(provider);
    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        state.circuitOpen = true;
        console.warn(`[DoH] 🔴 Circuit OPEN for ${provider.name} (${state.failures} failures)`);
    } else if (DEBUG) {
        console.log(`[DoH] ⚠️ ${provider.name} failure ${state.failures}/${CIRCUIT_BREAKER_THRESHOLD}`);
    }
}

function isProviderAvailable(provider) {
    const state = initProviderState(provider);
    if (!state.circuitOpen) return true;
    if (Date.now() - state.lastFailure > CIRCUIT_BREAKER_COOLDOWN_MS) {
        if (DEBUG) console.log(`[DoH] 🟡 ${provider.name} entering half-open state`);
        return true;
    }
    return false;
}

// --- DNS CACHE ---
const dnsCache = new Map();

// --- HTTPS AGENT ---
export const insecureAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    keepAliveMsecs: 10000
});

// --- SINGLE PROVIDER RESOLVE ---
async function resolveWithProvider(hostname, provider) {
    if (!isProviderAvailable(provider)) {
        throw new Error(`Circuit open for ${provider.name}`);
    }

    const url = `${provider.url}?name=${encodeURIComponent(hostname)}&type=A`;

    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/dns-json' },
        signal: AbortSignal.timeout(RACE_TIMEOUT_MS)
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.Answer && data.Answer.length > 0) {
        const record = data.Answer.find(r => r.type === 1);
        if (record) {
            recordSuccess(provider);
            return { ip: record.data, provider: provider.name };
        }
    }

    throw new Error('No A record found');
}

// --- RACE STRATEGY ---
async function resolveIP(hostname) {
    // Check cache first
    if (dnsCache.has(hostname)) {
        const cached = dnsCache.get(hostname);
        if (Date.now() < cached.expires) {
            if (DEBUG) console.log(`[DoH] Cache hit: ${hostname} -> ${cached.ip}`);
            return cached.ip;
        }
        dnsCache.delete(hostname);
    }

    const availableProviders = DOH_PROVIDERS.filter(isProviderAvailable);

    if (availableProviders.length === 0) {
        console.warn('[DoH] 🚨 All circuits open! Resetting...');
        DOH_PROVIDERS.forEach(p => {
            const state = providerState.get(p.name);
            if (state) {
                state.circuitOpen = false;
                state.failures = 0;
            }
        });
        availableProviders.push(...DOH_PROVIDERS);
    }

    if (DEBUG) console.log(`[DoH] Racing ${availableProviders.length} providers for ${hostname}`);

    const racePromises = availableProviders.map(provider =>
        resolveWithProvider(hostname, provider).catch(err => {
            recordFailure(provider);
            throw err;
        })
    );

    try {
        const result = await Promise.any(racePromises);

        if (dnsCache.size > 1000) dnsCache.clear();
        dnsCache.set(hostname, {
            ip: result.ip,
            expires: Date.now() + CACHE_TTL_MS,
            provider: result.provider
        });

        if (DEBUG) console.log(`[DoH] Resolved ${hostname} -> ${result.ip} (via ${result.provider})`);
        return result.ip;

    } catch (err) {
        if (DEBUG) console.error(`[DoH] All providers failed for ${hostname}`);
        return null;
    }
}

// --- SMART CONFIG ---
// FIX-1: Added `doh` mode option
export async function getSmartConfig(urlStr, baseOptions = {}) {
    let targetUrl;
    try {
        targetUrl = new URL(urlStr);
    } catch (e) {
        throw new Error(`Invalid URL: ${urlStr}`);
    }

    // Determine DoH mode: 'full' (default), 'dns-only', or false
    const dohMode = baseOptions.doh !== undefined ? baseOptions.doh : 'full';

    // Browser mimicry headers + FIX-3: Always set Host
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Host': targetUrl.hostname,  // FIX-3: Always set Host header
        ...(baseOptions.headers || {})
    };

    // No DoH at all
    if (dohMode === false) {
        return {
            url: urlStr,
            headers,
            hostname: targetUrl.hostname,
            resolvedIP: null,
            dohMode: false
        };
    }

    const ip = await resolveIP(targetUrl.hostname);

    if (ip) {
        if (dohMode === 'dns-only') {
            // FIX-1: DNS-only mode — resolved via DoH, but connect by hostname
            // This bypasses DNS blocking while keeping normal TLS handshake
            // The OS resolver cache will be populated, or we just use hostname directly
            if (DEBUG) console.log(`[SmartConfig] dns-only: ${targetUrl.hostname} resolved to ${ip}, but connecting by hostname`);
            return {
                url: urlStr,
                headers,
                hostname: targetUrl.hostname,
                resolvedIP: null,  // Don't use IP for connection
                resolvedForDNS: ip, // For logging/debugging only
                dohMode: 'dns-only'
            };
        }

        // 'full' mode — connect by IP with SNI (original behavior, good for TMDB/CDN)
        const directUrl = urlStr.replace(targetUrl.hostname, ip);
        return {
            url: directUrl,
            headers,
            hostname: targetUrl.hostname,
            resolvedIP: ip,
            dohMode: 'full'
        };
    } else {
        return {
            url: urlStr,
            headers,
            hostname: targetUrl.hostname,
            resolvedIP: null,
            dohMode
        };
    }
}

// --- SMART FETCH ---
// FIX-1: doh option, FIX-2: redirect following, FIX-4: port, FIX-5: rejectUnauthorized
export async function smartFetch(urlStr, options = {}, _redirectCount = 0) {
    if (_redirectCount > MAX_REDIRECTS) {
        throw new Error(`Too many redirects (>${MAX_REDIRECTS})`);
    }

    const config = await getSmartConfig(urlStr, options);
    const targetUrl = new URL(config.url);
    const isHttps = targetUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    return new Promise((resolve, reject) => {
        const requestOptions = {
            method: options.method || 'GET',
            headers: { ...config.headers },
            agent: options.agent || (options.insecure ? insecureAgent : undefined),
            rejectUnauthorized: false, // FIX-5: Don't fail on self-signed certs
        };

        // SNI Support for HTTPS when using resolved IP (only in 'full' mode)
        if (config.resolvedIP && isHttps) {
            requestOptions.hostname = config.resolvedIP;
            requestOptions.servername = config.hostname; // SNI
            requestOptions.path = targetUrl.pathname + targetUrl.search;
            requestOptions.port = targetUrl.port || 443; // FIX-4: Always set port
        }

        // FIX-6: dns-only mode — inject DoH-resolved IP via custom lookup
        // This bypasses ISP DNS poisoning while keeping hostname for TLS SNI
        // (Cloudflare shared hosting routes correctly when request uses hostname)
        if (config.resolvedForDNS) {
            const dnsIP = config.resolvedForDNS;
            const family = net.isIP(dnsIP);
            if (!family) {
                throw new Error(`Invalid DoH IP: ${dnsIP}`);
            }

            requestOptions.lookup = (hostname, opts, cb) => {
                if (typeof opts === 'function') {
                    cb = opts;
                    opts = {};
                }

                const wantsAll = opts?.all === true;

                // Node expects lookup callback asynchronously and with shape depending on opts.all.
                process.nextTick(() => {
                    if (wantsAll) {
                        cb(null, [{ address: dnsIP, family }]);
                    } else {
                        cb(null, dnsIP, family);
                    }
                });
            };

            // Avoid socket reuse path that may bypass per-request lookup.
            requestOptions.agent = false;
        }

        if (DEBUG) {
            const mode = config.dohMode || 'unknown';
            const connectTo = config.resolvedIP || config.resolvedForDNS || targetUrl.hostname;
            console.log(`[SmartFetch] ${options.method || 'GET'} ${targetUrl.hostname} -> ${connectTo} (doh: ${mode}, redirect: ${_redirectCount})`);
        }

        // FIX: Use correct Node.js http.request() signatures:
        // - IP mode:  request(options, callback)       — options already has hostname/path/headers
        // - URL mode: request(url, options, callback)  — pass URL + options for headers
        const useOptionsOnly = config.resolvedIP && isHttps;
        const req = useOptionsOnly
            ? transport.request(requestOptions, (res) => {
                handleResponse(res);
            })
            : transport.request(config.url, requestOptions, (res) => {
                handleResponse(res);
            });

        function handleResponse(res) {
            // FIX-2: Handle redirects
            if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                const redirectUrl = new URL(res.headers.location, urlStr).href;
                if (DEBUG) console.log(`[SmartFetch] Redirect ${res.statusCode} -> ${redirectUrl}`);

                // Drain body to free socket
                res.resume();

                // For 301/302, method changes to GET (per HTTP spec)
                const redirectOptions = { ...options };
                if ([301, 302].includes(res.statusCode)) {
                    redirectOptions.method = 'GET';
                    delete redirectOptions.body;
                }

                resolve(smartFetch(redirectUrl, redirectOptions, _redirectCount + 1));
                return;
            }

            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const contentType = res.headers['content-type'] || '';
                const isJson = contentType.includes('application/json');
                const isImage = contentType.startsWith('image/');

                let data;
                try {
                    if (options.responseType === 'arraybuffer' || isImage) {
                        data = buffer;
                    } else if (isJson && buffer.length > 0) {
                        data = JSON.parse(buffer.toString());
                    } else {
                        data = buffer.toString();
                    }

                    resolve({
                        data,
                        status: res.statusCode,
                        headers: res.headers,
                        resolvedIP: config.resolvedIP,
                        dohMode: config.dohMode
                    });
                } catch (e) {
                    resolve({
                        data: buffer.toString(),
                        status: res.statusCode,
                        headers: res.headers,
                        resolvedIP: config.resolvedIP,
                        parseError: e.message,
                        dohMode: config.dohMode
                    });
                }
            });
        }

        req.on('error', (err) => {
            reject(err);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        const effectiveTimeout = options.timeout || 30000;
        req.setTimeout(effectiveTimeout);

        if (options.body) {
            const body = typeof options.body === 'object' ? JSON.stringify(options.body) : options.body;
            req.write(body);
        }

        req.end();
    });
}

// --- DIAGNOSTIC EXPORT ---
export function getProviderStatus() {
    const status = {};
    DOH_PROVIDERS.forEach(p => {
        const state = providerState.get(p.name) || { failures: 0, circuitOpen: false };
        status[p.name] = {
            available: isProviderAvailable(p),
            failures: state.failures,
            circuitOpen: state.circuitOpen,
            lastSuccess: state.lastSuccess || null,
            lastFailure: state.lastFailure || null
        };
    });
    return status;
}

export { resolveIP };
