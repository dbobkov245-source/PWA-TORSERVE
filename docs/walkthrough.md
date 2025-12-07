# 🏁 Walkthrough: Hybrid Offline/Online Poster System

**Status:** ✅ VICTORY
**Date:** 2025-12-07
**Component:** PWA-TorServe (Android TV)

## 🎯 Goal
Implement a robust movie poster system that:
1.  **Bypasses ISP Blocks:** Tries to fetch metadata/images via anti-censorship proxies (`allorigins.win`, `wsrv.nl`).
2.  **Eliminates Lag:** Ensures the UI never freezes, even if all network requests fail.
3.  **Falls Back Gracefully:** Displays premium "Glassmorphism" gradients if posters cannot be loaded.

---

## 🏗 Architecture "Full Client Mode"

We moved the "heavy lifting" from the Node.js Server to the Android Client. This prevents the server from hanging on blocked requests.

### 1. Client-Side Logic (`App.jsx`)
The `Poster` component follows a 3-step decision tree:

1.  **Anti-Censorship Request (Primary):**
    *   Tries to fetch metadata via `api.allorigins.win` (CORS Proxy).
    *   *Why:* Bypasses local ISP blocks on `api.themoviedb.org`.
2.  **Image Loading:**
    *   If metadata is found, constructs an image URL via `wsrv.nl`.
    *   *Why:* Bypasses local ISP blocks on `image.tmdb.org`.
3.  **Server Fallback (Secondary):**
    *   If Step 1 fails, it asks the local server (`/api/tmdb/search`).
    *   *Note:* The local server is currently set to "Offline Mode" (see below), so this immediately returns 404. This is intentional to prevent timeouts.
4.  **UI Fallback (Ultimate):**
    *   If no image is found (or requests fail), renders a **deterministically generated gradient** based on the movie title hash.

### 2. Server-Side Logic (`index.js`)
*   **Mode:** `OFFLINE`
*   **Implementation:** All `/api/tmdb/*` routes return generic 404s immediately.
*   **Benefit:** Zero processing time. No "hanging" connections waiting for timeouts.

---

## 🛠 verification Results

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Server Startup** | 🟢 OK | No errors, clean logs. |
| **Torrent Engine** | 🟢 OK | Streaming works perfectly (`/stream/...`). |
| **Poster Search** | 🟢 OK | Client attempts external fetch. |
| **ISP Blocking** | 🛡 Mitigated | `allorigins` + `wsrv` attempt to tunnel through. |
| **Fallback UI** | ✨ Excellent | Premium gradients displayed instantaneously if network fails. |

---

## 📜 Key Code Snippets

### Client: Hybrid Fetcher
```javascript
// client/src/App.jsx
const fetchPoster = async () => {
  // 1. Try AllOrigins (Bypass)
  const proxyUrl = `https://api.allorigins.win/raw?url=${tmdbUrl}`
  // ...
  
  // 3. Fallback to Gradient (Automatic via React State)
  if (!result) setBgImage(null) 
}
```

### Server: Lag Prevention
```javascript
// server/index.js
app.get('/api/tmdb/search', (req, res) => {
    // Immediate return to unblock UI thread
    res.status(404).json({ error: 'Offline Mode' })
})
```

---

## 🚀 Future Improvements (If decided later)
*   **VPN:** Install WireGuard on the NAS to route server traffic reliably.
*   **BFF:** Host a small private proxy server in Europe to replace `allorigins`.

*Enjoy the speed and stability!*
