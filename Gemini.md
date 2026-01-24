# PWA-TorServe Project Constitution

## 🎯 Goal
Создание лучшего self-hosted клиента для стриминга на Android TV с защитой от цензуры (Resilience) и нативным UX (Lampa-style).

## 🛠 Tech Stack
- **Frontend:** React 19, Vite 7, TailwindCSS 4.
- **Platform:** Capacitor 6 (Android), Native Java Plugins (`TVPlayer.java`).
- **Backend:** Node.js (Express), Docker.
- **State:** React Hooks (No Redux), LocalStorage for heavy cache (Zero-Cost Architecture).

## 📐 Architecture Principles (Strict Adherence)
1. **TV-First UX:** Все элементы интерфейса должны быть доступны через D-Pad. Используем хук `useTVNavigation` (для локальных списков/сеток) и `SpatialNavigation` (для глобального фокуса). Мышь/тач вторичны.
2. **Resilience First:** Любой сетевой запрос должен идти через каскад: 
   Custom Worker -> Lampa Proxy -> Server Proxy (`/api/proxy`) -> Capacitor Http + DoH -> Corsproxy -> Kinopoisk (Search Fallback).
   Никогда не используем `fetch` напрямую без обертки `tmdbClient`.
3. **Zero-Cost Backend:** Сервер только для стриминга торрентов и проксирования. Вся метаинформация (постеры, описания) грузится клиентом напрямую (или через прокси).
4. **Code Style:** Functional Components, Early Returns, JSDoc для сложной логики.

## 📂 Key Context Locations
- Навигация: `client/src/hooks/useTVNavigation.js` (Component Logic), `client/src/utils/SpatialNavigation.js` (Geometric Logic).
- Сетевой слой: `client/src/utils/tmdbClient.js`.
- Нативный мост: `client/android/app/src/main/java/com/torserve/pwa/TVPlayer.java`.

## 🚨 Critical Known Issues (To Be Fixed)
- **SEC-01:** `VITE_TMDB_API_KEY` is exposed in client bundle. Needs migration to server-side injection via `/api/proxy`.
