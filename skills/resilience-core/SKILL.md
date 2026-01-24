---
name: resilience-core
description: Specialist in network resilience, anti-censorship, and TMDB access in restricted regions.
---

# Resilience Core Skill

This skill ensures 100% uptime for metadata fetching by using a multi-layer fallback strategy.
**Metric:** The user must NEVER see a blank poster or missing description due to a network error.

## 🌐 The 5-Level Cascade
Every external request (especially to TMDB) MUST go through `tmdbClient.js`.
NEVER use `fetch()` directly for metadata.

**Cascade Order:**
1.  **Custom Cloudflare Worker:** First line of defense.
2.  **Lampa Proxy:** Public mirror (apn-latest.onrender.com).
3.  **Server Proxy:** Self-hosted proxy (`/api/proxy?url=...`).
4.  **CapacitorHttp + Client DoH (Native Only):**
    *   Uses `dns.google` API to resolve IP, bypassing ISP DNS Poisoning.
    *   Sends direct HTTPS requests to IP with `Host` header.
5.  **Corsproxy.io:** Browser-based fallback.
6.  **Kinopoisk (Search Only):** Last resort if TMDB is fully dead.

## 🛡️ Image Resilience
Images use a separate logic:
*   **Mirrors:** `imagetmdb.com`, `nl.imagetmdb.com`, etc.
*   **Auto-Ban:** If a mirror fails 20 times in 10s, it's banned.
*   **WSRV.NL:** If all mirrors fail, we switch to `wsrv.nl` proxying.

## 💻 Usage Example
```javascript
import tmdbClient from '../utils/tmdbClient';

// BAD ❌
// const res = await fetch('https://api.themoviedb.org/3/movie/550');

// GOOD ✅
const data = await tmdbClient('/movie/550');
if (data.source === 'kinopoisk') {
    // Handle specific KP logic if needed
}
```
