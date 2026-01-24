# Client-Side DNS-over-HTTPS (DoH) Guide

## Problem
In some regions (e.g., Russia), ISPs perform **DNS Poisoning** for `api.themoviedb.org`, returning `127.0.0.1` or blocking the DNS lookup entirely.
Standard `fetch` or `CapacitorHttp` fails because it relies on the system DNS.

## Solution
We perform valid DNS resolution manually via a trusted DoH provider (Google) and then connect directly to the resolved IP.

## Implementation Details

### 1. Resolve IP
We use Google's JSON API: `https://dns.google/resolve?name=api.themoviedb.org&type=A`

```javascript
// Returns e.g., "65.8.11.22"
const ip = await resolveClientIP('api.themoviedb.org');
```

### 2. Direct Connection (SNI Trick)
We cannot just access `https://65.8.11.22/` because the SSL certificate is invalid for the IP address.
However, `CapacitorHttp` (native implementation) allows us to send the `Host` header which some servers accept, or strictly speaking, we rely on the fact that if we use the IP in the URL, we must accept that SSL verification *might* fail or we rely on SNI being set correctly if the library supports it.

*Correction:* In our implementation, we use `CapacitorHttp`.
Target: `https://<IP>/3/...`
Header: `Host: api.themoviedb.org`

**Note:** This only works because we trust the resolved IP from Google. 

### 3. Caching
DoH results are cached for 10 minutes (`dohCache`) to minimize latency.
