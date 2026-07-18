# Полный аудит PWA-TorServe — 2026-07-18

Дата проверки: 2026-07-18 (Europe/Moscow)

Ветка: `codex/full-project-audit`

База: `d73dbea`

Область: frontend, Node.js server, Android bridge, HTTP streaming, torrent lifecycle, локальные диагностические captures и Android TV emulator.
Ограничения: без push/PR/deploy/release, без изменений NAS/VPS/production Docker, без реального активного торрента и без Vimu/MX/VLC на физическом TV.

## 1. Executive summary

Аудит подтвердил семь функциональных/ресурсных дефектов и один устаревший тест. Все восемь устранены минимальными патчами с regression-тестами:

- **High:** клиентский abort полного GET оставлял файловый stream открытым; в воспроизведении 10 abort давали рост FD `24 → 34`. После исправления `24 → 24`.
- **High:** `smartFetch()` отключал проверку TLS-сертификата для всех HTTPS upstream, включая metadata/proxy. Теперь проверка включена по умолчанию, исключение возможно только явным `insecure: true`.
- **Medium:** `HEAD /stream/...` открывал и полностью читал media source. На 64 MiB сценарии чтение снизилось со `128 MiB` до `64 MiB`.
- **Medium:** runtime error torrent engine оставлял magnet/infoHash aliases в `engines`; ошибочный engine мог продолжать считаться активным. Теперь все aliases удаляются.
- **Medium:** parser принимал невалидные decimal/scientific/multi-hyphen Range. Теперь реализована строгая decimal-грамматика и safe-integer проверка.
- **Low:** Android callback без result `Intent` нарушал обязательную форму `{position,duration,finished}`.
- **Low:** текстовая сводка торрент-кнопки загрязняла её accessible name и ломала стабильную TV-команду.
- **Low:** тест ожидал старый native server IP, хотя production default уже изменён.

Финальное состояние проверок: server `130/130`, client `184/184`, Vite build — pass, Capacitor sync — pass, Android debug build — pass. Source-only ESLint не проходит: `51 error / 5 warning`. Полный `eslint .` дополнительно анализирует generated Android assets и выдаёт `355 error / 6 warning`; это отдельный дефект конфигурации lint scope.

Предыдущие captures **не подтверждают самостоятельный freeze плеера**. В двух релевантных локальных запусках server stall count равен `0`, torrent engines равны `0`, throughput восстанавливается/держится примерно `11–14.5 MB/s`. Один старый capture имеет timeline вне окна capture и непригоден для корреляции. Для ответа о спонтанном freeze всё ещё нужны отдельные 20–30 минут steady-state и активный torrent на реальной инфраструктуре.

Открытые риски с наивысшим приоритетом:

1. production dependency audit: `13` уязвимостей (`8 high`, `5 moderate`) в legacy torrent/Express dependency trees;
2. `VITE_TMDB_API_KEY` и `VITE_KP_API_KEY` попадают в client bundle (известный `SEC-01`);
3. destructive LAN API не аутентифицирован и работает с wildcard CORS;
4. Android TV Home имеет измеримый jank: `9/21` janky frames (`42.86%`) на 15 быстрых Down, при `p50=27 ms`, `p90=53 ms`, `p95=65 ms`;
5. мониторинг во время активного stream выполняет синхронные `/proc` reads; измеренная длительность sampler — около `43 ms p50`.

## 2. Проверенная архитектура

### 2.1 Путь запуска и воспроизведения

1. React UI выбирает фильм/результат поиска.
2. Клиент вызывает LAN server API для поиска/добавления torrent и получает status/file list.
3. URL воспроизведения имеет вид `/stream/:infoHash/:fileIndex`.
4. Server выбирает источник:
   - активный TorrServer job → `302` на client-reachable TorrServer URL;
   - полностью выделенный локальный файл → `fs.createReadStream()`;
   - активный `torrent-stream` engine → `file.createReadStream()` с piece prioritization/readahead.
5. `TVPlayer.play()` или `playList()` запускает внешний Android player через `ACTION_VIEW`.
6. Capacitor Promise разрешается из `ActivityCallback` только после закрытия player activity.
7. JS немедленно передаёт результат в `recordPlaybackResult()`, который синхронно сохраняет resume state в `localStorage`.

Критические флаги `FLAG_ACTIVITY_NEW_TASK`, `FLAG_ACTIVITY_CLEAR_TOP`, `FLAG_ACTIVITY_SINGLE_TOP` присутствуют в `play()` и `playList()` и в ходе аудита не менялись.

### 2.2 HTTP Range lifecycle

- Только `bytes=` single-range обрабатывается как один диапазон.
- Валидные формы: `N-M`, `N-`, `-N`; границы inclusive.
- Невалидный/неудовлетворимый Range получает `416` и `Content-Range: bytes */<length>`.
- Валидный Range получает `206`, `Content-Range`, точный `Content-Length` и watchdog `8 s`.
- `HEAD` формирует GET-equivalent headers, но после исправления не создаёт media stream.
- Cleanup теперь единый и idempotent для response `close`, response `error` и source `error`.

### 2.3 Torrent lifecycle

- Engine создаётся с фиксированным listen port и вызывает `engine.listen(port)`.
- Docker/Synology compose публикуют `6881/TCP` и `6881/UDP`.
- Magnet URI и infoHash могут быть aliases одного engine в общей Map.
- Metadata timeout учитывает реальные peers и grace cycles.
- Frozen state, SSE notification и status cache связаны с engine lifecycle.
- После исправления runtime error удаляет все aliases ошибочного engine, очищает frozen markers и инвалидирует status cache.

### 2.4 Resilience и metadata

Основной metadata cascade сосредоточен в `client/src/utils/tmdbClient.js`: custom worker → Lampa proxy → server proxy → native CapacitorHttp/DoH → browser proxy → text-only Kinopoisk fallback. Image cascade отделён: TMDB mirrors → auto-ban → `wsrv.nl`.

Найдены два нарушения/legacy-отклонения, не исправленные в этом аудите:

- `SettingsPanel.runPosterTest()` напрямую делает внешние metadata `fetch()` и дублирует cascade;
- legacy server route `/api/tmdb/image/:size/:path` загружает изображение через `smartFetch`/DoH вместо image-specific cascade.

## 3. Baseline

| Проверка | До исправлений | После исправлений |
|---|---:|---:|
| Server tests | `124/124` | `130/130` |
| Client tests | `179/183`, 4 fail | `184/184` |
| Source-only ESLint | fail | `51 errors, 5 warnings` |
| `npm run lint` после Android build | не является чистым source baseline | `355 errors, 6 warnings`, включая generated assets |
| Vite production build | pass | pass, 83 modules |
| Main JS bundle | `372.40 kB`, gzip `115.54 kB` | `372.41 kB`, gzip `115.55 kB` |
| Capacitor sync | pass | pass, 5 plugins |
| Gradle `assembleDebug` | pass с `ANDROID_HOME` | pass, 212 tasks |
| Root production `npm audit` | `13`: 8 high, 5 moderate | без изменений зависимостей |
| Client production `npm audit` | `0` | `0` |

Примечание: root `package.json` не объявляет `test` script; корректный server runner — `node server/__tests__/run-tests.js`. Отсутствующая команда не была выдумана.

## 4. Подтверждённые дефекты

### AUD-01 — source stream переживал client abort

- **Severity:** High.
- **Доказательство:** локальный 64 MiB источник; после 20 aborted Range и 10 aborted full GET FD выросли `24 → 34`. `activeStreams`/stream lifecycle не имели единого cleanup для full GET.
- **Воспроизведение:** открыть полный `/stream/...`, оборвать клиент до EOF, повторить 10 раз, сравнить `/proc`/process FD.
- **Root cause:** full GET регистрировал monitor close, но не уничтожение source stream на `res.close`; Range и full GET имели различный cleanup.
- **Исправление:** `createStreamCleanup()` с одноразовым destroy/accounting; привязка к response `close/error` и source `error`; `activeStreams` учитывает full GET.
- **Regression:** `createStreamCleanup destroys the source and accounts closure once`.
- **До/после:** FD `24 → 34` до; `24 → 24`, `activeStreams=0` после.
- **Остаточный риск:** реальная socket-state динамика с внешним Android player не воспроизведена; нужен NAS/TV run.

### AUD-02 — глобально отключена TLS-проверка upstream

- **Severity:** High.
- **Доказательство:** `server/utils/doh.js` безусловно выставлял `rejectUnauthorized: false` в каждом `smartFetch()` request.
- **Воспроизведение:** unit-level inspection/request options; любой HTTPS `smartFetch()` получал insecure transport вне зависимости от назначения.
- **Root cause:** узкое legacy-исключение для нестандартных endpoints было реализовано как глобальный default.
- **Исправление:** secure default; `rejectUnauthorized` выключается только при явном `options.insecure === true`; insecure agent также только opt-in.
- **Regression:** два теста проверяют default `true` и explicit opt-in `false`.
- **Остаточный риск:** явно insecure legacy callers нужно контролировать отдельно; в изменённом коде скрытого глобального bypass больше нет.

### AUD-03 — HEAD читал тело media source

- **Severity:** Medium.
- **Доказательство:** full GET + три 1 KiB Range + HEAD на 64 MiB до исправления: `reopenCount=5`, `served=128 MiB`; HEAD открыл источник и был полностью прокачан Node/Express.
- **Воспроизведение:** `HEAD /stream/:hash/:index` по локальному 64 MiB файлу, сравнить reopen/bytes metrics.
- **Root cause:** обработчик вызывал `createReadStream()` после `writeHead()` без ветки для HEAD.
- **Исправление:** `shouldCreateStreamBody(req.method)` завершает HEAD после headers.
- **Regression:** `shouldCreateStreamBody skips media reads for HEAD requests`.
- **До/после:** `reopenCount 5 → 4`, `served 128 → 64 MiB`.
- **Остаточный риск:** player-specific probe patterns могут включать small GET Range, что корректно продолжает читать запрошенные bytes.

### AUD-04 — нестрогий HTTP Range parser

- **Severity:** Medium.
- **Доказательство:** формы `bytes=1.5-3`, `bytes=1e2-200`, `bytes=1-2-3` принимались из-за `Number()` и `split('-')`.
- **Воспроизведение:** передать перечисленные headers в `parseRange()`.
- **Root cause:** отсутствовала проверка полной ABNF-грамматики decimal digits; extra separators отбрасывались destructuring.
- **Исправление:** regex полной формы `^(\d*)-(\d*)$`, `Number.isSafeInteger()`.
- **Regression:** отдельные invalid syntax cases плюс существующие standard/open/suffix tests.
- **Остаточный риск:** multipart Range намеренно не поддерживается и отклоняется `416`; это ограничение API, не скрытая частичная обработка.

### AUD-05 — failed torrent engine оставался доступен по aliases

- **Severity:** Medium.
- **Доказательство:** после runtime `engine.error`, уже ready engine уничтожался, но magnet/infoHash keys оставались в `engines`.
- **Воспроизведение:** положить один fake engine под двумя keys, инициировать runtime error, проверить Map и status.
- **Root cause:** error handler делал `engine.destroy()` без удаления всех Map entries, указывающих на тот же object.
- **Исправление:** `removeEngineAliases()` удаляет по object identity; очищаются frozen markers, cache и SSE state.
- **Regression:** `engine cleanup removes every map alias after a runtime error`.
- **Остаточный риск:** активный real swarm error/recreate не прогнан на NAS из-за запрета mutation.

### AUD-06 — нестабильное accessible name torrent action

- **Severity:** Low.
- **Доказательство:** 3 `MovieTorrentAction` tests падали: summary label попадал в вычисляемое имя кнопки и ломал поиск стабильной TV-команды.
- **Воспроизведение:** render ready/loading state и запросить button по ожидаемому command label.
- **Root cause:** кнопка не имела явного `aria-label`, имя собиралось из обоих `<span>`.
- **Исправление:** `aria-label={buttonLabel}`; визуальная summary сохранена.
- **Regression:** все 4 component tests проходят.
- **Остаточный риск:** screen-reader smoke на физическом Android TV не выполнялся.

### AUD-07 — неполный Android player result при `Intent data == null`

- **Severity:** Low.
- **Доказательство:** callback возвращал только `position` и `message`, хотя bridge contract требует `position`, `duration`, `finished` всегда.
- **Воспроизведение:** закрытие chooser/player, который не возвращает result Intent.
- **Root cause:** fallback branch не заполнял два обязательных поля.
- **Исправление:** `duration=-1`, `finished=false`; Promise lifecycle и Intent flags не менялись.
- **Regression:** source-contract test проверяет полный fallback shape и неизменность `NEW_TASK` в обоих methods.
- **Остаточный риск:** Vimu/MX/VLC не установлены в emulator; реальные vendor result extras не проверены.

### AUD-08 — устаревшее ожидание native server default

- **Severity:** Low.
- **Доказательство:** production helper и его основной test использовали `192.168.8.203`, fallback test всё ещё ожидал `192.168.1.70`.
- **Воспроизведение:** initial client suite — один fail в `serverApi.test.js`.
- **Root cause:** test drift после смены network default.
- **Исправление:** обновлено только ожидание test.
- **Regression:** весь client suite проходит.
- **Остаточный риск:** hard-coded LAN default остаётся deployment-specific решением.

## 5. Отклонённые гипотезы

### «Server event loop сам является причиной наблюдавшегося freeze»

Не подтверждено. В релевантных captures server stall count равен `0`, delivery остаётся высокой, а sampler сам добавляет десятки миллисекунд работы. Нельзя приписывать старый freeze event loop без capture, синхронного с самим инцидентом.

### «NAS CPU/RAM/disk были устойчиво насыщены во время локального воспроизведения»

Отклонено для проверенных окон. Load и disk не показывают устойчивого saturation, stream throughput не проваливается. Есть краткие swap/iowait spikes, но они не коррелируют с stall в этих данных.

### «В локальных captures работал torrent engine»

Отклонено: `engines=0`, `frozen=0`. Эти captures описывают `fromDisk` путь и не доказывают поведение активного swarm.

### «D-Pad теряет фокус или неверно центрирует крайние карточки»

Отклонено в emulator smoke: первый poster начинается на `32 px`; последний movie card центрируется с ошибкой около `0.000015 px`; focus остаётся в viewport; Enter/Back/touch проходят.

### «Текущие изображения ломаются или меняют геометрию в smoke»

Не воспроизведено: `252` images, все lazy; `213` уже decoded/complete после 5 секунд; broken `0`. Полноценный layout-shift trace не снимался, поэтому это не универсальное доказательство отсутствия CLS.

## 6. Неподтверждённые риски и подтверждённый открытый долг

### RISK-01 — legacy production dependency tree

- **Severity:** High.
- **Доказательство:** `npm audit --omit=dev`: `13` issues, `8 high`, `5 moderate`. Ветка `torrent-stream@1.2.1` тянет старые `ip` и `ws` через `ip-set`, `torrent-discovery`, `bittorrent-tracker`; Express `4.22.0` tree затрагивает `body-parser`, `qs`, `path-to-regexp`.
- **Сценарий:** network-facing server обрабатывает недоверенные LAN/upstream data через устаревшие packages.
- **Root cause:** legacy torrent engine ecosystem и pinned transitive tree.
- **Рекомендация:** отдельная compatibility-ветка; сначала contract/integration tests для metadata, DHT, tracker, stream/seek; затем обновление/замена engine. Не применять предложенный npm «fix», который даёт несовместимый downgrade `torrent-stream`.
- **Regression:** отсутствует безопасная автоматическая migration suite для полного swarm lifecycle.
- **Остаточный риск:** высокий до migration или изоляции сервиса.

### RISK-02 — client-exposed metadata keys (`SEC-01`)

- **Severity:** High.
- **Доказательство:** `import.meta.env.VITE_TMDB_API_KEY` и `VITE_KP_API_KEY` читаются client source; Vite `VITE_*` значения предназначены для bundle-time client exposure.
- **Сценарий:** извлечение ключа из APK/WebView assets или browser bundle.
- **Root cause:** часть resilience cascade подписывает запрос на клиенте.
- **Рекомендация:** server-side key injection в `/api/proxy`, короткоживущая/ограниченная авторизация proxy и отсутствие raw key в diagnostics UI.
- **Regression:** build test, запрещающий key-like values и `VITE_*_API_KEY` references в emitted assets.
- **Остаточный риск:** abuse/quota exhaustion до migration.

### RISK-03 — unauthenticated destructive LAN API + wildcard CORS

- **Severity:** Medium.
- **Доказательство:** `app.use(cors())` и набор POST/DELETE endpoints для torrent/database/library/autodownload; authentication middleware не найден. Rate limit ограничивает частоту, но не полномочия.
- **Сценарий:** любой процесс/страница с доступом к LAN server инициирует mutation/delete.
- **Root cause:** доверенная LAN threat model не оформлена как enforceable boundary.
- **Рекомендация:** bind/firewall allowlist, origin allowlist и локальный bearer/pairing token для mutating endpoints; GET status можно оставить отдельно.
- **Остаточный риск:** зависит от изоляции домашней сети.

### RISK-04 — diagnostics обходят resilience core

- **Severity:** Medium.
- **Доказательство:** `SettingsPanel.runPosterTest()` напрямую делает внешние metadata fetch к custom worker/Lampa/KP/CORS endpoints.
- **Сценарий:** запуск poster test при DNS poisoning/censorship даёт другой кодовый путь, раскрывает client keys и не использует общий health/ban state.
- **Root cause:** диагностический cascade скопирован в component.
- **Рекомендация:** вынести диагностический режим в `tmdbClient.js` как trace API, возвращающий per-level результат без дублирования transport.
- **Остаточный риск:** production metadata flow не затронут этим конкретным UI path, но diagnostic conclusion может быть ложным.

### RISK-05 — мониторинг сам искажает event-loop метрики

- **Severity:** Medium.
- **Доказательство:** sampler делает синхронные `readFileSync('/proc/...')` каждые 2 секунды при активности. В capture sampler duration: `p50=43.11 ms`, `p95=45.55 ms`, `p99=62.52 ms`, `max=178.41 ms`.
- **Сценарий:** активный stream запускает sampler; synchronous proc parsing блокирует event loop и попадает в следующий delay window.
- **Root cause:** несколько sync filesystem reads и parsing в одном timer callback.
- **Рекомендация:** async snapshot, разнести дешёвый stream sampler и дорогой host-pressure sampler, записывать observer cost отдельно (поле уже есть).
- **Остаточный риск:** значения lag могут частично описывать наблюдатель, а не workload.

### RISK-06 — Android TV Home jank и слишком большой focus graph

- **Severity:** Medium.
- **Доказательство:** после tier loading log показывал `zoneSize=383`. На 15 быстрых Down: `21` frames, `9` janky (`42.86%`), `p50=27 ms`, `p90=53 ms`, `p95=65 ms`, `p99=77 ms`.
- **Сценарий:** rapid vertical D-Pad по Home на 4K Android TV emulator.
- **Root cause:** сотни DOM focusables; на каждое движение geometry scan с `getBoundingClientRect()`; unconditional navigation logging; smooth scrolling. `react-window` установлен, но не используется.
- **Рекомендация:** сначала production logging gate, затем windowing/row virtualization с logical focusedIndex; измерять по одному изменению.
- **Остаточный риск:** emulator не равен физическому TV; относительный jank всё равно подтверждён.

### RISK-07 — lint и React rule debt

- **Severity:** Low, с Medium regression potential.
- **Доказательство:** source-only `51 errors / 5 warnings`. Среди них conditional hook после early return в `MovieDetail`, ref read during render, sync setState in effect, missing dependencies. Текущий parent монтирует `MovieDetail` только с truthy item, поэтому conditional-hook runtime failure не воспроизведён.
- **Сценарий:** будущий caller оставит component mounted и изменит `item` null ↔ object; порядок hooks изменится.
- **Root cause:** lint давно не является green gate; script включает generated Android assets.
- **Рекомендация:** сначала ignore `dist`, `android/app/build`, `android/app/src/main/assets/public`; затем отдельными TDD commits устранить React semantic errors, не смешивая с unused cleanup.
- **Остаточный риск:** скрытые regression остаются, пока lint не станет CI gate.

### RISK-08 — updater transport policy drift

- **Severity:** Low.
- **Доказательство:** updater разрешает local HTTP server, хотя project rule говорит HTTPS-only. Native install path проверяет package name, monotonic version и совпадение APK signature.
- **Сценарий:** MITM в LAN подменяет manifest/download; signature validation должна остановить чужой APK, но availability/rollback UX может пострадать.
- **Рекомендация:** HTTPS manifest/APK или pinned trusted origin; сохранить обязательную signature validation.
- **Остаточный риск:** integrity существенно защищена Android signature, confidentiality/availability — нет.

### RISK-09 — legacy image route использует общий DoH transport

- **Severity:** Low.
- **Доказательство:** `/api/tmdb/image/:size/:path` вызывает `smartFetch(...arraybuffer)`; client references route не найдены.
- **Сценарий:** legacy caller загружает poster через API-data transport, нарушая traffic isolation.
- **Рекомендация:** telemetry/deprecation window, затем удалить route или направить в image mirror/cache pipeline.
- **Остаточный риск:** низкий при отсутствии caller, но правило архитектуры нарушено.

### RISK-10 — version metadata drift и duplicate plugin registration log

- **Severity:** Low.
- **Доказательство:** Android/version.json `3.17.2`/`37`, client package metadata `3.10.6`; emulator log содержит warning о повторной регистрации `TVPlayer`.
- **Сценарий:** tooling/release automation читает package version; startup регистрирует bridge дважды.
- **Рекомендация:** один source of truth для version; проверить MainActivity/Capacitor auto-registration и оставить только одну регистрацию.
- **Остаточный риск:** update decisions сейчас используют native/version.json, поэтому immediate break не воспроизведён.

## 7. Измерения до/после

| Дефект | До | После | Вывод |
|---|---:|---:|---|
| Aborted full GET, 10 повторов | FD `24 → 34` | FD `24 → 24` | source закрывается |
| 64 MiB full GET + 3 Range + HEAD | reopen `5`, served `128 MiB` | reopen `4`, served `64 MiB` | HEAD не читает body |
| Malformed Range | принимался | `null`/HTTP 416 | строгая grammar |
| Engine runtime error, 2 aliases | aliases остаются | aliases `0` | stale engine устранён |
| Default HTTPS smartFetch | TLS verification off | TLS verification on | MITM surface сокращён |
| Player no-data result | 2 contract fields | 4 поля + message | форма стабильна |

## 8. Stress-test результаты

### 8.1 Read-only capture `local-no-engine`

Длительность `1801.043 s`, `826` points.

- engines/frozen: `0/0`; active streams max `2`; stall max `0`; reopen max `99`;
- active throughput: min `1.5`, avg `9.716`, p50 `11.25`, p95/p99/max `14.5 MB/s`;
- process RSS: p50 `103`, p95 `129`, max `147 MB`;
- NAS RAM used: p50 `1059`, p95 `1083`, max `1114 MB` из `1828 MB`;
- disk read: p50 `2.04`, p95 `17.62`, max `48.35 MB/s`;
- load1: p50 `0.61`, p95 `1.39`, max `2.15` на 2 cores;
- event-loop p99: p50 `21.63`, p95 `38.63`, p99 `48.59`, max `146.28 ms`;
- event-loop max: p50 `33.69`, p95 `73.99`, p99 `100.86`, max `329.78 ms`;
- sampler duration: p50 `43.11`, p95 `45.55`, p99 `62.52`, max `178.41 ms`;
- swap used `760 → 841 MB`, краткие swap/iowait spikes; stream stall отсутствует;
- последний stream: reopen `99`, served `6314.5 MB`, stall `0`.

Это stress/seek capture, не чистый steady-state. Он подтверждает восстановление потока, но не отвечает на вопрос о самостоятельном freeze.

### 8.2 Read-only capture `current-player-backpressure`

Длительность `901.299 s`, `415` points.

- engines/frozen `0/0`; active streams max `1`; stall `0`;
- reopen `81 → 105`, served delta `1594 MB`;
- active throughput: min `10.75`, avg `11.833`, p50/p95/p99 `11`, max `13.75 MB/s`;
- RSS p50 `92`, p95 `117`, max `122 MB`;
- NAS RAM p50 `1022`, max `1056 MB`;
- disk p50 `0.01`, p95 `13.75`, max `21.51 MB/s`;
- load1 p50 `0.24`, max `0.82`;
- event-loop p99 p50 `22.89`, p95 `30.46`, max `47.97 ms` для 82 active-window samples.

Capture показывает healthy delivery и отсутствие server stall в текущем локальном player path.

### 8.3 Старый `readonly-current`

Длительность `60.501 s`, `27` points. Timeline не пересекается с capture window: максимальная timestamp timeline примерно на 80 минут раньше `startedAt`. Корреляционные выводы из него недействительны. Point snapshot: engines/frozen/active/stall `0`; RSS `354–364 MB`; cumulative lag `50` не относится специально к capture.

### 8.4 Android TV emulator

Среда: Android 16 emulator, physical `3840×2160`, WebView `149.0.7827.160`, CSS viewport `960×540`.

- initial DOM: `278` focusables, `260` TV cards, `252` images; позже zone вырос до `383`;
- first poster left: `32 px`;
- 20 rapid Right: reached More; один Left выбрал last movie; center error `0.000015 px`;
- 15 rapid Down: row 13, focus внутри viewport; horizontal center error `0.000015 px`;
- 15 rapid Up: возврат на toolbar/Home, scrollTop `0`;
- Enter на More открыл CategoryPage; Back вернул Home;
- Enter на movie открыл MovieDetail; Back сработал;
- touch tap на видимой карточке открыл MovieDetail;
- gfxinfo: 21 frames, 9 janky (`42.86%`), p50 `27 ms`, p90 `53 ms`, p95 `65 ms`, p99 `77 ms`;
- unhandled JS crash не найден; log содержит ожидаемые emulator/network fallback errors и чрезмерные SpatialNav/TMDB debug messages.

Не проверено: inactive-row hook contract (`useTVNavigation` вообще не используется основным Home), real key-hold queue trace, physical-TV rendering, Vimu/MX/VLC activity results.

## 9. Интернет-источники

Дата доступа для всех источников: **2026-07-18**.

1. [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) — HEAD не должен передавать representation content; Range integers состоят из decimal digits, byte offsets inclusive.
2. [Node.js HTTP documentation](https://nodejs.org/api/http.html) — destroy/close semantics для HTTP request/socket.
3. [Node.js Streams documentation](https://nodejs.org/api/stream.html) — backpressure, `drain`, destroy и stream lifecycle.
4. [Node.js TLS documentation](https://nodejs.org/api/tls.html) — `rejectUnauthorized` по умолчанию `true`, failed certificate verification вызывает error.
5. [React Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) — Hooks нельзя вызывать после conditional return.
6. [Android: Inspect GPU rendering](https://developer.android.com/topic/performance/rendering/inspect-gpu-rendering) — reference line `16.67 ms` для 60 FPS и интерпретация frame bars.
7. [GitHub Advisory GHSA-2p57-rm9w-gvfp](https://github.com/advisories/GHSA-2p57-rm9w-gvfp) — `ip` SSRF categorization, High, patched version отсутствует.
8. [GitHub Advisory GHSA-3h5v-q93c-6h6q](https://github.com/advisories/GHSA-3h5v-q93c-6h6q) — старые `ws` DoS при большом числе HTTP headers.
9. [GitHub Advisory GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) — `ws` memory exhaustion DoS.
10. [GitHub Advisory GHSA-37ch-88jc-xwx2](https://github.com/advisories/GHSA-37ch-88jc-xwx2) — legacy `path-to-regexp` ReDoS.

Выводы по текущему коду основаны прежде всего на локальных tests/profiles/captures; внешние источники использованы для проверки protocol/runtime semantics.

## 10. Изменённые файлы и commits

Production files:

- `server/index.js`
- `server/streamSource.js`
- `server/torrent.js`
- `server/utils/doh.js`
- `server/utils/range.js`
- `client/src/components/MovieTorrentAction.jsx`
- `client/android/app/src/main/java/com/torserve/pwa/TVPlayer.java`

Tests:

- `server/__tests__/doh.test.js`
- `server/__tests__/range.test.js`
- `server/__tests__/run-tests.js`
- `server/__tests__/stream-source.test.js`
- `server/__tests__/torrent.test.js`
- `client/src/utils/serverApi.test.js`
- `client/src/utils/tvplayer-source.test.js`

Commits в хронологическом порядке:

1. `aeb4a3c test: reject malformed HTTP byte ranges`
2. `1ae5e2b fix: enforce HTTP byte-range grammar`
3. `e681f35 test: prevent HEAD media reads`
4. `7c45ff4 fix: skip stream source for HEAD probes`
5. `5bcd373 test: require idempotent stream cleanup`
6. `51975cb fix: close media sources on client disconnect`
7. `aa0f232 test: require TLS certificate verification`
8. `5ec8f46 fix: verify upstream TLS certificates by default`
9. `7ab9d19 fix: stabilize torrent action accessible name`
10. `ef0cc4f test: align native server default expectation`
11. `8e408b4 test: clean failed torrent engine aliases`
12. `fa9dfa1 fix: evict failed torrent engines`
13. `fd33a43 test: require complete player close result`
14. `a61b936 fix: complete player close results`
15. `0dfa689 test: keep player contract check lint-clean`

Отчёт фиксируется отдельным docs commit. Generated APK, build assets, captures и secrets не коммитятся.

## 11. Результаты тестов, build и APK

Финальная проверка:

- `node server/__tests__/run-tests.js` — **130 passed, 0 failed**;
- `cd client && npm test -- --run` — **29 files, 184 passed, 0 failed**;
- `cd client && npm run build` — **pass**, 83 modules, main JS `372.41 kB` / gzip `115.55 kB`;
- `cd client && npm exec -- cap sync android` — **pass**, 5 Capacitor plugins;
- `cd client/android && ANDROID_HOME=/Users/bobmark/Library/Android/sdk ./gradlew assembleDebug` — **BUILD SUCCESSFUL**, 212 tasks;
- debug APK: `client/android/app/build/outputs/apk/debug/app-debug.apk`;
- APK size: `4,404,518 bytes`;
- APK SHA-256: `2538bed4212000c9a792f3c20b680ea38c46c1e1bb30f09cbf33e44d6fc7041d`;
- source-only ESLint — **fail: 51 errors, 5 warnings**;
- configured `npm run lint` после build — **fail: 355 errors, 6 warnings**, главным образом из-за generated Android assets плюс source debt;
- root production dependency audit — **13 vulnerabilities: 8 high, 5 moderate**;
- client production dependency audit — **0 vulnerabilities**.

Первый Gradle invocation без `ANDROID_HOME` ожидаемо завершился `SDK location not found`; повтор с явным SDK прошёл. Это environment configuration, не defect приложения.

CodeRabbit CLI не установлен (`command not found`), поэтому внешний CodeRabbit review не выполнен. Выполнен ручной review полного `d73dbea..HEAD` diff и `git diff --check`; дополнительных дефектов в патчах не найдено.

## 12. Production-рекомендации без deploy

Приоритет 0 — перед production rollout этой ветки:

1. На staging/NAS повторить local file abort/seek test и подтвердить FD/activeStreams/socket cleanup.
2. Выполнить отдельный real active torrent run: metadata → inbound peers → seek в недоступный piece → runtime error/recreate.
3. Проверить Vimu, MX и VLC: resume, close result, completion, chooser cancel, playlist.
4. Не обновлять зависимости через автоматический `npm audit fix`; подготовить compatibility migration legacy torrent tree.

Приоритет 1:

1. Закрыть `SEC-01`: ключи только на server-side proxy.
2. Ввести auth/allowlist для mutating LAN API и сузить CORS.
3. Сделать monitor observer cost низким и асинхронным.
4. Уменьшить TV focus graph/window DOM и отключить production navigation logs.
5. Исправить ESLint scope, затем сделать source lint CI gate.

Приоритет 2:

1. Синхронизировать version metadata.
2. Удалить duplicate TVPlayer registration warning.
3. Мигрировать poster diagnostics в `tmdbClient` trace API.
4. Депрекейтить legacy `/api/tmdb/image`.
5. Отключить `X-Powered-By` как дешёвое hardening-изменение после отдельного regression smoke.

## 13. План дальнейшего мониторинга

### A. Чистый steady-state local file

- 20–30 минут без input;
- один заранее полностью скачанный MKV;
- фиксировать каждые 2–5 секунд: throughput, Range/reopen, active streams, FD, sockets/state/Send-Q, event-loop, RSS/external/arrayBuffers, MemAvailable, swap, major faults, iowait/disk;
- freeze считать подтверждённым только при player-visible stop без input и синхронном capture.

### B. Отдельный active torrent

- новый infoHash, engine > 0, inbound listen подтверждён;
- записать peers/wires/queued, selected pieces, download speed, seek target availability;
- отдельно tail probe MKV и seek в ещё не скачанный piece;
- после runtime error проверить отсутствие aliases/frozen engine и успешное повторное создание.

### C. Seek storm

- 20 перемоток с зафиксированными offsets и интервалами;
- после каждой: старый stream close, FD/sockets/activeStreams;
- через 60 секунд после теста показатели должны вернуться к baseline;
- не смешивать с steady-state результатом.

### D. File switching

- local A → torrent → local B;
- проверить отсутствие чтения/bytes growth старого source;
- проверить FIN_WAIT2/Send-Q и monitor reopen/stall false positives.

### E. TV Home profile

- physical TV и emulator отдельно;
- 20 Right, 15 Down, 15 Up, long scroll, key hold;
- gfxinfo frame percentiles, jank %, WebView console, focus graph size, geometry calls/key, image requests/decode;
- сравнить по одному change: logging gate, then geometry cache/windowing.

Capture format должен включать `startedAt/endedAt`, monotonic sample timestamps, scenario name и explicit input event markers. Timeline вне capture window должна автоматически отклоняться валидатором.

## 14. Блокеры и непроверенные области

- Запрещён mutation production NAS/VPS/Docker; real NAS active-torrent тест не выполнялся.
- Нет физического Android TV и установленных Vimu/MX/VLC; vendor lifecycle не проверен.
- Не выполнен чистый 20–30 минут no-input steady-state в этом аудите; имеющийся 30-минутный capture содержит stress/seek.
- Нет нескольких реальных одновременных Android clients.
- Старый APK против текущего server API не установлен и не проверен.
- Детальный React render count/Profiler trace не снят; DOM/gfxinfo/layout evidence показывает проблему, но не распределяет cost по components.
- Полный network packet capture и kernel socket lifetime на NAS не снимались.
- CodeRabbit CLI отсутствует; независимый внешнесервисный review заблокирован установкой/аутентификацией.
- Source lint остаётся красным; он явно указан как незавершённый quality gate, а не скрыт под успешными tests/build.

Итог: внесённые исправления доказаны focused regression-тестами и общей матрицей. Причина старого самостоятельного freeze всё ещё не доказана; наиболее полезный следующий шаг — чистый синхронный steady-state capture, затем полностью отдельный active-torrent capture.
