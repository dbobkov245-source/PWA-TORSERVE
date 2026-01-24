import https from 'https';

/**
 * DoH (DNS-over-HTTPS) Module with Provider Rotation + Circuit Breaker
 * ARC-01: Multi-provider resilience for anti-censorship
 *
 * Features:
 * - Multiple DoH providers (Google, Cloudflare, Quad9)
 * - Race strategy with 2s timeout (fastest wins)
 * - Circuit Breaker: auto-disable failing providers
 * - Automatic recovery after cooldown period
 */

// --- CONFIGURATION ---
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes
const RACE_TIMEOUT_MS = 2000; // 2 seconds per provider in race
const CIRCUIT_BREAKER_THRESHOLD = 3; // Failures before opening circuit
const CIRCUIT_BREAKER_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown
const DEBUG = process.env.DOH_DEBUG === 'true';

// --- DoH PROVIDERS ---
// ARC-01: Multiple providers for resilience
const DOH_PROVIDERS = [
    {
        name: 'Google',
        url: 'https://dns.google/resolve',
        // Google uses standard JSON format
    },
    {
        name: 'Cloudflare',
        url: 'https://cloudflare-dns.com/dns-query',
        // Cloudflare also supports JSON format with Accept header
    },
    {
        name: 'Quad9',
        url: 'https://dns.quad9.net:5053/dns-query',
        // Quad9 supports JSON with Accept header
    }
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

    // Check if cooldown has passed (half-open state)
    if (Date.now() - state.lastFailure > CIRCUIT_BREAKER_COOLDOWN_MS) {
        if (DEBUG) console.log(`[DoH] 🟡 ${provider.name} entering half-open state`);
        return true; // Allow one attempt
    }

    return false;
}

// --- DNS CACHE ---
const dnsCache = new Map();

// --- HTTPS AGENT ---
// Agent with keepAlive and SSL ignore (for self-signed mirrors)
export const insecureAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    keepAliveMsecs: 10000
});

// --- SINGLE PROVIDER RESOLVE ---
async function resolveWithProvider(hostname, provider) {
    const state = initProviderState(provider);

    // Skip if circuit is open
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
        const record = data.Answer.find(r => r.type === 1); // Type A (IPv4)
        if (record) {
            recordSuccess(provider);
            return { ip: record.data, provider: provider.name };
        }
    }

    throw new Error('No A record found');
}

// --- RACE STRATEGY ---
// ARC-01: Race all available providers, fastest wins
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

    // Get available providers
    const availableProviders = DOH_PROVIDERS.filter(isProviderAvailable);

    if (availableProviders.length === 0) {
        // All circuits open - reset all and try again
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

    // Race all available providers
    const racePromises = availableProviders.map(provider =>
        resolveWithProvider(hostname, provider).catch(err => {
            recordFailure(provider);
            throw err;
        })
    );

    try {
        const result = await Promise.any(racePromises);

        // Cache the result
        if (dnsCache.size > 1000) dnsCache.clear();
        dnsCache.set(hostname, {
            ip: result.ip,
            expires: Date.now() + CACHE_TTL_MS,
            provider: result.provider
        });

        if (DEBUG) console.log(`[DoH] Resolved ${hostname} -> ${result.ip} (via ${result.provider})`);
        return result.ip;

    } catch (err) {
        // All providers failed
        if (DEBUG) console.error(`[DoH] All providers failed for ${hostname}`);
        return null;
    }
}

// --- SMART CONFIG ---
export async function getSmartConfig(urlStr, baseOptions = {}) {
    let targetUrl;
    try {
        targetUrl = new URL(urlStr);
    } catch (e) {
        throw new Error(`Invalid URL: ${urlStr}`);
    }

    const ip = await resolveIP(targetUrl.hostname);

    // Browser mimicry headers
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(baseOptions.headers || {})
    };

    if (ip) {
        const directUrl = urlStr.replace(targetUrl.hostname, ip);
        headers['Host'] = targetUrl.hostname; // Important for Cloudflare

        return {
            url: directUrl,
            headers,
            hostname: targetUrl.hostname, // For SNI
            resolvedIP: ip
        };
    } else {
        return { url: urlStr, headers, resolvedIP: null };
    }
}

import http from 'http';

// --- SMART FETCH ---
// Universal fetch with DoH resolution and SNI support
export async function smartFetch(urlStr, options = {}) {
    const config = await getSmartConfig(urlStr, options);
    const targetUrl = new URL(config.url);
    const isHttps = targetUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    return new Promise((resolve, reject) => {
        const requestOptions = {
            method: options.method || 'GET',
            headers: config.headers,
            agent: options.agent || (options.insecure ? insecureAgent : undefined),
        };

        // 🔥 SNI Support for HTTPS when using resolved IP
        if (config.resolvedIP && isHttps) {
            requestOptions.hostname = config.resolvedIP;
            requestOptions.servername = config.hostname; // Critical for TMDB/Cloudflare
            requestOptions.path = targetUrl.pathname + targetUrl.search;
        }

        const req = transport.request(config.resolvedIP && isHttps ? requestOptions : config.url, (res) => {
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
                        resolvedIP: config.resolvedIP
                    });
                } catch (e) {
                    // Fallback to text if JSON parse fails
                    resolve({
                        data: buffer.toString(),
                        status: res.statusCode,
                        headers: res.headers,
                        resolvedIP: config.resolvedIP,
                        parseError: e.message
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.setTimeout(options.timeout || 15000);

        if (options.body) {
            const body = typeof options.body === 'object' ? JSON.stringify(options.body) : options.body;
            req.write(body);
        }

        req.end();
    });
}

// --- DIAGNOSTIC EXPORT ---
// For debugging/monitoring
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
