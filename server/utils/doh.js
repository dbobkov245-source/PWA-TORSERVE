import https from 'https';

// --- КОНФИГУРАЦИЯ ---
const DOH_PROVIDER = process.env.DOH_PROVIDER || 'https://cloudflare-dns.com/dns-query';
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 минут
const TIMEOUT_MS = 5000;
const DEBUG = process.env.DOH_DEBUG === 'true';

const dnsCache = new Map();

// Агент с keepAlive и игнорированием SSL (для самоподписанных зеркал)
export const insecureAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    keepAliveMsecs: 10000
});

async function resolveIP(hostname) {
    if (dnsCache.has(hostname)) {
        const cached = dnsCache.get(hostname);
        if (Date.now() < cached.expires) return cached.ip;
        dnsCache.delete(hostname);
    }

    try {
        const url = `${DOH_PROVIDER}?name=${encodeURIComponent(hostname)}&type=A`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/dns-json' },
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.Answer && data.Answer.length > 0) {
            const record = data.Answer.find(r => r.type === 1); // Type A (IPv4)
            if (record) {
                const ip = record.data;
                if (DEBUG) console.log(`[DoH] Resolved ${hostname} -> ${ip}`);
                if (dnsCache.size > 1000) dnsCache.clear();
                dnsCache.set(hostname, { ip, expires: Date.now() + CACHE_TTL_MS });
                return ip;
            }
        }
    } catch (e) {
        if (DEBUG) console.error(`[DoH] Error resolving ${hostname}: ${e.message}`);
    }
    return null;
}

export async function getSmartConfig(urlStr, baseOptions = {}) {
    let targetUrl;
    try { targetUrl = new URL(urlStr); } catch (e) { throw new Error(`Invalid URL: ${urlStr}`); }

    const ip = await resolveIP(targetUrl.hostname);

    // Мимикрия под браузер
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(baseOptions.headers || {})
    };

    if (ip) {
        const directUrl = urlStr.replace(targetUrl.hostname, ip);
        headers['Host'] = targetUrl.hostname; // Важно для Cloudflare

        return {
            url: directUrl,
            headers,
            hostname: targetUrl.hostname // Для SNI
        };
    } else {
        return { url: urlStr, headers };
    }
}

// Универсальный fetch с DoH
export async function smartFetch(url, options = {}) {
    const config = await getSmartConfig(url, options);

    const fetchOptions = {
        method: options.method || 'GET',
        headers: config.headers,
        signal: AbortSignal.timeout(options.timeout || 10000)
    };

    const response = await fetch(config.url, fetchOptions);

    // Совместимость с axios-style response
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const isImage = response.headers.get('content-type')?.startsWith('image/');

    let data;
    if (options.responseType === 'arraybuffer' || isImage) {
        data = Buffer.from(await response.arrayBuffer());
    } else if (isJson) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    return {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
    };
}
