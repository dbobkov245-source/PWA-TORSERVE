# PWA-TorServe Project Constitution

## 🎯 Goal
Лучший self-hosted клиент для стриминга на Android TV с защитой от цензуры (Resilience) и нативным UX (Lampa-style).

## 🛠 Tech Stack
- **Frontend:** React 19, Vite 7, TailwindCSS 4.
- **Platform:** Capacitor 6 (Android), Native Java Plugins (`TVPlayer.java`).
- **Backend:** Node.js (Express), Docker.
- **State:** React Hooks (No Redux), LocalStorage for heavy cache (Zero-Cost Architecture).

## 📐 Architecture Principles (Strict Adherence)
1. **TV-First UX:** Все UI-элементы доступны через D-Pad. Хук `useTVNavigation` для локальных списков/сеток, `SpatialNavigation` для глобального фокуса. Мышь/тач вторичны.
2. **Resilience First:** Все запросы за метаданными идут через каскад `tmdbClient.js`. Никогда не используем `fetch` напрямую.
3. **Zero-Cost Backend:** Сервер — только для стриминга торрентов и проксирования. Вся мета грузится клиентом.
4. **Code Style:** Functional Components, Early Returns, JSDoc для сложной логики.

## 📂 Key Context Locations
- Навигация: `client/src/hooks/useTVNavigation.js`, `client/src/utils/SpatialNavigation.js`.
- Сетевой слой: `client/src/utils/tmdbClient.js`.
- Нативный мост: `client/android/app/src/main/java/com/torserve/pwa/TVPlayer.java`.
- **Детальные скилы:** `skills/` (содержит примеры кода и справочные реализации).

---

## ⚠️ Critical Rules

### 🌐 Resilience Core — Multi-Level Resilience Cascade
Каждый внешний запрос (TMDB и др.) ДОЛЖЕН идти через `tmdbClient.js`. НИКОГДА не используй `fetch()` напрямую для метаданных.

**Порядок каскада:**
1. Custom Cloudflare Worker
2. Lampa Proxy (`apn-latest.onrender.com`)
3. Server Proxy (`/api/proxy?url=...`)
4. CapacitorHttp + Client DoH (Native Only) — `dns.google` API для обхода DNS-отравления
5. Corsproxy.io (Browser fallback)
6. Kinopoisk (Out-of-band Fallback) — **ТОЛЬКО текстовые данные** (названия, описания), только если все уровни TMDB недоступны

**🚦 Правило изоляции трафика:**
- DoH и IP-direct запросы используются **ТОЛЬКО для API-данных (JSON)**.
- **НИКОГДА** не используй DoH для загрузки изображений/постеров.
- Изображения имеют свою логику: Mirrors (`imagetmdb.com`, `nl.imagetmdb.com`) → Auto-Ban (20 сбоев за 10с) → `wsrv.nl` проксирование.

### 📱 Capacitor Bridge — Android Intent Rules

**`TVPlayer.play(options)` API:**
- `url` (string, required) — прямая ссылка на видеопоток
- `package` (string, optional) — пакет плеера, null = системный выбор  
- `title` (string) — заголовок для плеера
- `position` (number) — позиция возобновления в миллисекундах

**🚨 ЗАПРЕЩЕНО менять следующие флаги:**
- `FLAG_ACTIVITY_SINGLE_TOP` — предотвращает двойной chooser
- `FLAG_ACTIVITY_NEW_TASK` и `FLAG_ACTIVITY_CLEAR_TOP` — критичны для навигации между PWA и плеером

**Обязательно:**
- `play()` ДОЛЖЕН возвращать Promise, который разрешается ТОЛЬКО после закрытия плеера
- Результат: `{ position: number, duration: number, finished: boolean }`
- Результат НЕМЕДЛЕННО сохраняется в `localStorage`

**Поддерживаемые плееры:**
- **Vimu** (`net.gtvbox.videoplayer`): `forcename`, `forcedirect`, `startfrom`, playlist через `asusfilelist`/`asusnamelist`
- **MX Player** (`com.mxtech.videoplayer`): `title`, `position`, playlist через `video_list`
- **VLC** (`org.videolan.vlc`): `title`, `from_start`, playlist не поддерживается

### 🎮 TV Navigator — D-Pad Navigation Rules

**`useTVNavigation` хук:**
```javascript
const { focusedIndex, setFocusedIndex, containerProps, isFocused } = useTVNavigation({
  itemCount: number,      // Всего элементов
  columns: number,        // 1 = список, >1 = сетка
  itemRefs: React.RefObject,
  onSelect: (index) => void,  // Enter/OK
  onBack: () => void,         // Escape/Back
  loop: boolean,              // Default: false
  trapFocus: boolean,         // true = Изолированный (Модалы), false = Глобальный (HomeRow)
  isActive: boolean           // Внешний контроль. false = игнорирует весь ввод
});
```

**Обязательно:**
- НИКОГДА не используй `:hover` для TV-интерфейсов → используй `focusedIndex` + `.focused` state
- Фокус: `border`, `transform: scale(1.05)`, или `box-shadow`
- Контейнер ДОЛЖЕН иметь `tabIndex={0}` (из `containerProps`)
- Рефы: `ref={el => itemRefs.current[index] = el}`
- `isActive === false` → хук игнорирует ВСЕ нажатия клавиш

**Анти-паттерны:**
- ❌ `overflow: hidden` на скролл-контейнерах (кроме виртуализации)
- ❌ Пропущенный `tabIndex` — не захватит клавиатурные события
- ❌ Зависимость от `onClick` — всегда дублируй через `onSelect`

## 🐛 Backend — Known Gotchas & Applied Fixes

### 🔌 Torrent Engine — Inbound TCP (КРИТИЧНО)
`torrent-stream` требует явного вызова `engine.listen(port)` — иначе торрент работает ТОЛЬКО в исходящем режиме и реальный swarm не подключается.

```javascript
// server/torrent.js — обязательно после создания engine:
engine.listen(TORRENT_LISTEN_PORT, () => {
    console.log(`[Torrent] Listening on port ${engine.port}`)
})
```

Docker: порт **6881** должен быть замаплен явно в `docker-compose`:
```yaml
ports:
  - "6881:6881"
environment:
  - TORRENT_PORT=6881
```

### ⏱️ Stream Stall Watchdog
`file.createReadStream({start: endOfFile})` в torrent-stream **зависает без таймаута**, если нужные pieces ещё не скачаны. Это вызывало freeze при probe-запросе плеера к хвосту MKV для определения duration.

Watchdog в `server/index.js` — 8-секундный таймер, убивает висящий стрим:
```javascript
const STALL_TIMEOUT_MS = parseInt(process.env.STREAM_STALL_TIMEOUT_MS) || 8000
```

### 🔇 DoH Debug Logging
`server/utils/doh.js` — DEBUG контролируется env-переменной:
```
DOH_DEBUG=1   # включить подробные логи
DOH_DEBUG=0   # (default) тишина
```
**Не хардкодь `const DEBUG = true`** — это генерирует 3-5 строк лога на каждый HTTP-запрос.

---

## 🚨 Known Issues
- **SEC-01:** `VITE_TMDB_API_KEY` exposed в клиентском бандле. Нужна миграция на серверную инъекцию через `/api/proxy`.

### 🚀 Performance — Virtualized Lists (TV)
**Use `react-window` + `react-virtualized-auto-sizer`**.
- **Overscan:** `overscanRowCount={3}` (минимум) для предотвращения пустых зон при быстром скролле.
- **Focus:** Не полагайся на DOM focus. Используй `focusedIndex`.
- **Sizing:** Только `FixedSizeGrid` / `FixedSizeList`. Variable sizing убивает FPS на TV.

### 🔄 App Updater — Self-Hosted
**Workflow:** Check `version.json` → Download APK (CapacitorHttp) → Install (Native Intent).
- **Security:** HTTPS only. Подпись APK должна совпадать.
- **Permission:** Требует `REQUEST_INSTALL_PACKAGES` и `FileProvider`.

### 📡 Debug Remote — TV Logging
**Overlay:** Konami code для включения локального оверлея с логами.
**Network:** Отправка логов на удаленный сервер для отладки без кабеля.
