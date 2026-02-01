# 🗺️ PWA-TorServe — ROADMAP

> Этот файл — не просто список задач,  
> а **архитектурная память проекта**.
>
> Он фиксирует:
> - зачем были приняты ключевые решения
> - что уже реализовано и стабильно
> - какие шаги логично делать дальше
>
> **⚠️ Timeline Disclaimer:** Версии ниже отражают ХРОНОЛОГИЮ РАЗРАБОТКИ, а не линейный roadmap вперёд. Актуальная рабочая версия всегда указана явно.

---

## 🎯 North Star (Цель проекта)

**PWA-TorServe** — self-hosted middleware для:
- агрегации торрент-источников
- интеллектуального выбора релизов
- стриминга торрентов в PWA / Android TV клиент

Проект:
- ❌ не хостит контент
- ❌ не заменяет Jackett / Prowlarr
- ✅ ориентирован на устойчивую работу в условиях блокировок (РФ)
- ✅ рассчитан на долгосрочное развитие без архитектурного долга

---

## 🕒 v3.1: Operation "Unstoppable" — [ARCHIVED]

**Status:** 🏁 ARCHIVED  
**Outcome:** Unified Network Layer, DoH, Aggregator.

*См. `v3.1 Legacy` в истории изменений.*

---

## 🕒 v3.2: Stabilization — [COMPLETED]

**Status:** ✅ COMPLETED  
**Focus:** Устранение утечек, включение Client DoH, оптимизация под слабое железо.

| ID | Task Name | Status | Notes |
|---|---|---|---|
| **BUG-01** | **Fix Modal Trap** | ✅ DONE | `TorrentModal.jsx` focus trap implemented. |
| **BUG-02** | **Memory Leak Patch** | ✅ DONE | `server/torrent.js` Interval cleanup fixed. |
| **BUG-03** | **Search Providers Sync** | ✅ DONE | Polling API endpoint. |
| **ARC-02** | **Client DoH** | ✅ DONE | `tmdbClient.js` uses DoH / Waterfall. |
| **SEC-01** | **Global Error Boundary** | ✅ DONE | `ErrorBoundary.jsx`. |
| **BUG-04** | **Modal Focus Loss** | ⚠️ ACCEPTED | **Limitation:** Partially fixed via Zone Management. |

---

## 🚀 v3.3: TMDB Rehab & TV Core — [ACTIVE]

**Status:** 🚦 ACTIVE  
**Focus:** Fix TV Navigation Graph, Rehabilitate TMDB as a Graph, Stabilize Android Player Lifecycle.

### 📦 Batch 1: TV Core & Navigation
| ID | Task Name | Priority | Status | Description |
|---|---|---|---|---|
| **TV-01** | **Series Card Focus Graph** | ✅ DONE | ✅ | Fix D-Pad Trap & Focus Graph logic. |
| **TV-02** | **Focus Visuals Fix** | ✅ DONE | ✅ | Fix Clipped Rings in Season cards. |
| **UX-12** | **Season Detail View** | ✅ DONE | ✅ | Season click opens Detail View (no search). |
| **UX-13** | **Smart Query Generation** | ✅ DONE | ✅ | `Name S02` normalization. |

### 📦 Batch 2: Android Lifecycle
| ID | Task Name | Priority | Status | Description |
|---|---|---|---|---|
| **AND-01** | **Intent Lifecycle Fix** | ✅ DONE | ✅ | `FLAG_ACTIVITY_SINGLE_TOP`. |
| **AND-02** | **Player Preference Verification** | ✅ DONE | ✅ | Verify Intent package selection. |
| **AND-03** | **Double Player Launch Guard** | ✅ DONE | ✅ | Race condition guard `isPlaying`. |

### 📦 Batch 3: TMDB Content Graph (Current Focus)
| ID | Task Name | Priority | Status | Description |
|---|---|---|---|---|
| **TMDB-01** | **Recommendations & Similar** | ✅ DONE | ✅ | "Similar Movies" row with recursion. |
| **TMDB-02** | **Actor Filmography** | ✅ DONE | ✅ | Person Graph navigation. |
| **TMDB-03** | **Clickable Genres** | ✅ DONE | ✅ | Genre Badge navigation. |
| **TMDB-04** | **Unified Graph Nav** | ✅ DONE | ✅ | Consolidated navigation stack. |

### 📉 Backlog
* **FEAT-01:** Расширенные категории (Жанры, Страны, Годы) — **NEXT**.
* **Secondary Metadata Cache:** (SHOULD) Cache filmography/recommendations.
* **Episode Metadata:** (SHOULD) Fetch episode names/descriptions.

---

## 🔮 v4.0: Lampa Integration — [PLANNED]

**Status:** 🚦 PLANNED  
**Focus:** Архитектурная сингулярность с Lampa.

*   **Registry-Based Discovery:** `ContentRowsRegistry`.
*   **Global Spatial Controller:** `NavigationContext`.
*   **Transform-Based Scrolling:** `transform: translateX()`.

---

## 📜 ADR (Architecture Decision Records)

Архитектурные решения вынесены в отдельные документы:

*   [**ADR-002: Zone Management**](docs/adr/ADR-002-Zone-Management.md) — (Locked 01.02.2026) Почему `activeView` проверка критична для навигации.
*   [**ADR-003: Sidebar / NUM Navigation Model**](docs/adr/ADR-003-Sidebar-Navigation.md) — (Locked 01.02.2026) Единый контроллер навигации и отказ от логики в Sidebar.

---

## 🗓️ Session Logs (Archive)

История сессий разработки:

*   [**2026-02-01**](docs/sessions/2026-02-01.md) — Fix BUG-FREEZE, UI Polish.
*   [**2026-01-31**](docs/sessions/2026-01-31.md) — My List Freeze debugging, Search focus fix.
*   [**2026-01-26**](docs/sessions/2026-01-26.md) — Backend Fixes, Navigation Dead Zones (failed attempt).

---

## 🐛 Known Bugs & Limitations

| ID | Описание | Статус | Комментарий |
|----|----------|--------|-------------|
| **BUG-04** | **Modal Focus Loss** | ⚠️ ACCEPTED | Ограничение текущей архитектуры React state. |
| **OPT-01** | **List Virtualization** | ⛔ FROZEN | Риск поломки пространственной навигации. |

---