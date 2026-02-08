# ADR-001: PWA-TorServe v4.1 — Enhancements & Optimizations

**Статус:** Утверждён (rev.3)  
**Дата:** 2026-02-06  
**Контекст:** Домашний NAS Synology DS418play (2GB RAM, RTD1296 4-core) + Android TV Sony KD-65XH9505  
**Принцип:** Не ломать навигацию. Минимальная нагрузка на NAS. Каждая фича — отдельный коммит.

---

## Конфигурация

Critical limits configurable via env with sane defaults.  
Non-critical limits as named constants at top of file.

| Параметр | Env variable | Default | Где |
|----------|-------------|---------|-----|
| Макс. активных движков | `MAX_ACTIVE_ENGINES` | `5` | server/torrent.js |
| Кеш постеров TTL | `IMAGE_CACHE_TTL_DAYS` | `7` | server/imageCache.js |
| Кеш постеров макс. размер | `IMAGE_CACHE_MAX_MB` | `50` | server/imageCache.js |
| Путь к кешу | `IMAGE_CACHE_DIR` | `./data/image-cache` | server/imageCache.js |
| Stream buffer size | `STREAM_HIGHWATERMARK` | `524288` (512KB) | server/index.js |

Остальные параметры (TMDB cache TTL, metadata limit, search cache TTL) — именованные константы в начале файла.

---

## Error codes

Направление для единообразной обработки ошибок на клиенте:

| Код | HTTP | Когда |
|-----|------|-------|
| `TOO_MANY_TORRENTS` | 429 | Превышен MAX_ACTIVE_ENGINES |
| `ENGINE_START_TIMEOUT` | 504 | Торрент не нашёл пиров за 90 сек |

Формат ответа:

```json
{ "error": "TOO_MANY_TORRENTS", "message": "Active engine limit reached (5/5)", "limit": 5 }
```

Клиент показывает toast (auto-dismiss 3s), **не modal**.

---

## Порядок реализации

```
Фаза 1 (Micro)    → O1, O3, O4, O5, O7, 5    — минимальные правки, быстрый результат
Фаза 2 (Core)     → O2, O6, 3, M1             — серверный кеш, метрики, UI торрентов
Фаза 3 (Rich)     → 7, 11, 13                 — quality badges, группировка, resume
Фаза 4 (UX)       → 8, 9, 6, 12               — трейлеры, рекомендации, preview, авто-выбор
```

Легенда: O = оптимизация, M = мониторинг, число = фича

---

## Фаза 1: Micro — ✅ DONE (2026-02-08)

---

### O1. ETag в прокси — ✅ DONE

**Файл:** `server/routes/proxy.js`

Заменить `'src'` (ошибочный заголовок) на `'etag'` в массиве `forwardHeaders`.

**Тест:** DevTools → Network → повторные запросы показывают `ETag` в ответе.  
**Риск:** Нулевой.

---

### O3. imageErrors через useRef — ✅ DONE

**Файл:** `client/src/components/HomeRow.jsx`

`useState(new Set())` → `useRef(new Set())`. MovieCard получает локальный `isBroken` state.

**Результат:** Ре-рендер одной карточки, не всего ряда.  
**Навигация:** Без изменений.  
**Риск:** Низкий.

---

### O4. Параметры TMDB LRU-кеша — ✅ DONE

**Файл:** `client/src/utils/tmdbClient.js`

```javascript
const TMDB_CACHE_MAX_ENTRIES = 1000
const TMDB_CACHE_TTL_MS = 6 * 60 * 60 * 1000  // 6 hours
```

LRU eviction при превышении 1000 записей — удалять 10% самых старых.  
TTL для поискового кеша оставить 5 min.

**Риск:** Нулевой.

---

### O5. Namespace версионирование metadata cache — ✅ DONE

**Файл:** `client/src/utils/tmdbClient.js`

```javascript
const METADATA_CACHE_PREFIX = 'meta:v1:'  // было 'metadata_'
const METADATA_CACHE_LIMIT = 1500
```

Одноразовая очистка legacy `metadata_*` ключей при старте (опционально).

**Риск:** Нулевой.

---

### O7. Stream buffer optimization — ✅ DONE

**Файл:** `server/index.js` — endpoint `/stream/:infoHash/:fileIndex`

```javascript
// БЫЛО:
const stream = file.createReadStream({ start, end })

// СТАЛО:
const hwm = parseInt(process.env.STREAM_HIGHWATERMARK) || 1024 * 512
const stream = file.createReadStream({ start, end, highWaterMark: hwm })
```

**Почему 512KB:**
- Default Node.js — 64KB. Для 4K рипов (60-80GB) это слишком мало.
- DS418play имеет HDD, не SSD. Крупные блоки чтения снижают IOPS.
- Sony TV подключён по Wi-Fi — плотнее забиваем канал, меньше микро-фризов.
- 512KB × 2-3 активных стрима = ~1.5MB дополнительной RAM. Незаметно.

**Важно:** `file.createReadStream()` в torrent-stream — это не `fs.createReadStream()`. Для не полностью скачанных торрентов данные читаются из swarm. Проверить, что torrent-stream поддерживает `highWaterMark`. Если нет — опция будет проигнорирована (безвредно).

**Риск:** Нулевой. Однострочная правка, стандартная настройка Node.js.

---

### 5. Бейдж «Новые серии» — ✅ DONE

**Файлы:** `server/torrent.js`, `server/index.js`, `client/src/App.jsx`

Экспортировать `getNewFilesCount` → добавить в `/api/status` → отрисовать бейдж.

**Навигация:** Не затрагивается.  
**Риск:** Минимальный.

---

## Фаза 2: Core — ✅ DONE (2026-02-08)

---

### O2. Серверный дисковый кеш постеров — ✅ DONE

**Новый файл:** `server/imageCache.js`  
**Изменяемый:** `server/routes/proxy.js`

```
/api/proxy?url=...image.tmdb.org...
  → getCachedImage() → hit? → sendFile()
                     → miss? → fetch → cacheImage() + pipe
```

TTL: 7 дней. Max: 50MB / 1000 файлов. Cleanup: watchdog 1×/сутки.

**Риск:** Средний. Graceful fallback при ошибке кеша.

---

### O6. Interval lifecycle management — ✅ DONE

**Новый файл:** `server/utils/intervals.js`

All background intervals must be registered in a central registry.

```javascript
export function registerInterval(name, fn, ms) { ... }
export function clearAllIntervals() { ... }  // graceful shutdown
```

Заменить все `setInterval` → `registerInterval()`.

**Риск:** Низкий. Чистый рефакторинг.

---

### M1. Metrics endpoint — ✅ DONE

**Файл:** `server/index.js`

```json
GET /api/metrics → { "engines": 3, "frozen": 1, "rssMB": 280, "uptimeSec": 93211, "activeStreams": 2 }
```

Счётчик `activeStreams`: `++` при начале стрима, `--` в `res.on('close')`.

**Риск:** Нулевой.

---

### 3. Прогресс-бар на карточке торрента — ✅ DONE

**Файл:** `client/src/App.jsx`

Тонкая полоска внизу карточки: зелёный = скачан, синий+пульс = качается, серый = пауза.

**Риск:** Нулевой.

---

## Фаза 3: Rich — ✅ DONE (2026-02-08)

---

### 7. Quality Badges на постерах — ✅ DONE

**Новый файл:** `server/qualityBadges.js`  
**Endpoint:** `POST /api/quality-badges`

Batch request (max 10 titles). Клиент кеширует в localStorage (TTL 1 час).

**Риск:** Средний.

---

### 11. Группировка торрентов по качеству — ✅ DONE

**Файл:** `client/src/components/SearchPanel.jsx`

Визуальные разделители по качеству (нефокусируемые).

**Риск:** Низкий.

---

### 13. Resume playback position — ⏳ PLANNED

**Файлы:** `server/index.js`, `client/src/App.jsx`

Сервер уже трекает `db.data.progress[trackKey]` с position/percentage. Нужно замкнуть цикл:

```
GET /api/playback-position/:infoHash/:fileIndex
→ { position: 2722, percentage: 45 }
```

Клиент: при play + position > 30s → мини-диалог «Продолжить / Начать сначала».

**Риск:** Средний.

---

## Фаза 4: UX — ⏳ PLANNED

---

### 8. Трейлеры с главной

**Статус:** Уже реализовано. Проверить на TV.

---

### 9. «Похожие» после просмотра

`lastPlayedTmdbId` → `getRecommendations()` → HomeRow.

**Риск:** Низкий.

---

### 6. Quick Preview (длинное нажатие)

Удержание Enter 800ms → overlay с деталями. Закрытие по отпусканию.

**Риск:** Средний.

---

### 12. Авто-выбор лучшего торрента

«⚡ Быстрый старт»: поиск → авто-выбор → add → play.

Preferred res (default 1080p) → фильтр CAM → max seeders → min size.

**Риск:** Средний.

---

## Уже реализовано — параметры зафиксированы

| Компонент | Файл | Параметры |
|-----------|------|-----------|
| SearchCache | `server/searchCache.js` | TTL: 5 min, max: 100, LRU. Key: normalized (lowercase, trimmed) |
| Engine timeout | `server/torrent.js` | 90s, clearTimeout on ready/error (Act 11) |

---

## Infrastructure (не код — конфигурация)

### Docker resource limits

**Файл:** `docker-compose.yml`

```yaml
services:
  pwa-torserve:
    deploy:
      resources:
        limits:
          memory: 768M    # Жёсткий лимит (5 движков × ~80MB + runtime)
          cpus: '1.0'     # 1 из 4 ядер RTD1296
        reservations:
          memory: 256M    # Мягкий лимит
```

**Почему не 512M:** Каждый torrent engine = 30-80MB. При 5 движках + буферы + Express = легко 500MB. С лимитом 512M watchdog будет постоянно паниковать, а Docker — OOM-kill'ить.

**Почему не 1.5 cpu:** DS418play (RTD1296) имеет 4 слабых ядра. 1.0 для torserve, остальное для DSM и других задач.

### Docker DNS

Проверить (и при необходимости добавить) в `docker-compose.yml`:

```yaml
services:
  pwa-torserve:
    dns:
      - 8.8.8.8
      - 1.1.1.1
```

Это обходит DNS-блокировки провайдера на уровне контейнера — для всех провайдеров поиска сразу, без изменения кода. Эффективнее чем smartFetch в каждом провайдере.

---

## Чеклист перед реализацией

1. ☑ Прочитать текущий код затрагиваемых файлов
2. ☑ Создать git branch: `feature/O1-etag`, `feature/5-new-episodes-badge`, etc.
3. ☑ Внести изменения
4. ☑ `npm run build` (client) без ошибок
5. ☑ Сервер стартует без ошибок
6. ☑ Навигация D-pad на TV (если затронут клиент)
7. ☑ Merge в main

**Одноразовые проверки (до начала фаз):**

8. ☑ Verify Docker DNS config — ensure `dns: ["8.8.8.8", "1.1.1.1"]`
9. ☑ Verify Docker resource limits — add if missing
10. ☑ Verify torrent-stream supports `highWaterMark` option

---

## Что НЕ трогать

- `useSpatialNavigation.js` / `SpatialNavigation.js` — ядро навигации
- `useTVNavigation.js` — хук навигации
- `handleBack` логику в App.jsx — каскад закрытия
- Zones (`setActiveZone`) — маршрутизация фокуса
- `ContentRowsRegistry.js` — реестр рядов

---

## Non-goals

- **No layout refactors** — главная, List view, боковая панель остаются как есть
- **No navigation changes** — Spatial Engine, zones, handleBack не меняются
- **No new UI paradigms** — не добавляем роутинг, не создаём новые zones
- **No TypeScript migration** — нет практической пользы для домашнего NAS
- **No database migration** — LowDB достаточен
- **No SSE/WebSocket** — polling 5s работает, не перегружает DS418play
- **No App.jsx decomposition** — монолитный компонент удобнее для AI-assisted разработки
- **No sidebar redesign** — текущий sidebar работает

Это защищает от scope creep и от будущего себя в плохом настроении.
