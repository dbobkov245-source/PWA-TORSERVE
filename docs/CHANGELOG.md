# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed (Backend — не влияет на APK)
- **КРИТИЧНО — Tracker announces broken after restart (`torrent.js`):** Все торренты показывали 0 peers после перезапуска контейнера. Корневая причина: `torrent-stream` кэширует `.torrent`-файлы в `/tmp/`, и при загрузке из кэша `torrent.announce = []` (пустой список трекеров — metadata info-dict не содержит трекеры). `discovery.announce` тоже был пустым, т.к. `opts.trackers` не передавался. Итог: трекер-клиент создавался без URL → анонсы не отправлялись → 0 peers навсегда. **Фикс:** Добавлен `trackers: PUBLIC_TRACKERS` в engine options → `discovery.announce = PUBLIC_TRACKERS` → трекеры всегда доступны независимо от кэша.
- **Kickstart: select all video files (`torrent.js`):** При восстановлении торрента на `engine ready` теперь вызывается `file.select()` на **всех** видеофайлах, а не только на крупнейшем. Исправлена критическая ошибка: сериальные торренты (несколько эпизодов) не скачивались вообще — был выбран только самый большой файл (напр. E01), а остальные эпизоды оставались невыбранными навсегда. В `torrent-stream` невыбранный файл никогда не скачивается, независимо от числа подключённых пиров. Приоритизация (`prioritizeFileInternal`) теперь ставится на первый файл по имени (E01→E02→... — естественный порядок эпизодов).

## [3.10.1] - 2026-03-07

### Fixed
- **Auto-Update:** Исправлен повторный системный prompt на установку APK после уже завершённого обновления. В pending-install state теперь учитывается `versionCode`.
- **Auto-Download UI:** Исправлен расчёт `lastEpisode` из имён вида `S01E05`; picker больше не сохраняет серию как `1` вместо `5`.
- **TV Player:** Восстановлен обязательный `FLAG_ACTIVITY_NEW_TASK` для запуска внешнего плеера через Android intent.

### Fixed (Backend — влияет на отображение в APK)
- **Local Library:** Sparse/placeholder-файлы в `DOWNLOAD_PATH` больше не считаются полностью скачанными и не маскируют активные торренты как `ready`.
- **Auto-Download:** Season-pack релизы без явного номера серии теперь распознаются как batch и не добавляются как “новая серия”.

## [3.10.0] - 2026-02-21

### Added
- **Smart Sort in Search:** Новый режим сортировки "🧠 Smart" — дефолтный. Ранжирует результаты поиска по `playabilityScore`, статусу (playable > risky > unchecked > dead) и числу peers. Заменяет старый дефолт "По сидам".
- **Playability Badges in Search:** В каждом результате поиска теперь отображается иконка + статус: 🟢 live N, 🟡 risky N, 🔴 dead, ⚪ unchecked.

### Fixed (Backend — не влияет на APK)
- **Torrent Inbound TCP:** `engine.listen(TORRENT_PORT)` теперь вызывается явно. Без этого `torrent-stream` не принимал входящие соединения от пиров (только исходящие). Результат: скорость загрузки выросла с 0 до 2-4 MB/s.
- **Port Already In Use Crash:** При восстановлении нескольких торрентов после рестарта — только первый engine занимает фиксированный порт 6881 (`fixedPortClaimed` флаг), остальные получают ephemeral порт. Предотвращает краш Node.js процесса.
- **docker-compose:** Добавлен маппинг порта `6881:6881` TCP+UDP и переменная `TORRENT_PORT=6881`.

### Docs
- **CLAUDE.md / AGENTS.md:** Добавлена секция `Backend — Known Gotchas` с тремя критическими уроками: `engine.listen()`, Stream Stall Watchdog, DOH_DEBUG.
- **Cleanup:** Удалены мусорные файлы (consolelog.md 337KB, bugreport.md 1.1MB, docs/claude.md, патчи).
- **History:** POSTER_BATTLE_HISTORY.md перемещён в `docs/history/`.

### Previously Unreleased (included in this release)
- **Local Library Recovery:** Backend теперь индексирует завершённые видеофайлы из `DOWNLOAD_PATH` и отдаёт их в `/api/status`.
- **Local Streaming Path:** `/stream/:infoHash/:fileIndex` умеет стримить локальные файлы без активного swarm.
- **Library Rescan API:** `POST /api/library/rescan`.
- **Delete Semantics:** `DELETE /api/delete/:infoHash` по умолчанию — hard delete. Soft mode через `?soft=1`.
- **Search Ranking:** `risky` с `preflight.peers=0` ниже `unchecked` в результатах.
- **Rutor Size Parsing:** Исправлен парсинг размера когда counter и size в разных ячейках.
- **Frozen Reuse Resume:** При реюзе замороженного engine — принудительное возобновление swarm.

## [3.9.0] - 2026-02-15

### Fixed
- **Voice Search (Rollback):** Полный откат на простую и надежную логику поиска v3.7.2 (`popup: true`). Исправлена ошибка, когда пользователя игнорировало при первом нажатии (зависал без UI).
- **Auto-Update:** Исправлена ошибка циклического скачивания обновления. Теперь при запуске приложение проверяет наличие уже скачанного APK и сразу предлагает установку.

## [3.8.4] - 2026-02-15 (Hotfix)

### Fixed
- **Voice Search:** Исправлен кейс, когда требовалось дважды нажимать кнопку микрофона (добавлены дедупликация in-flight вызовов и retry fallback при `RecognitionService busy`).
- **Voice Search:** Стабилизирован переход `primary -> fallback` после timeout (защитный `stop()` + небольшая задержка перед popup-режимом).
- **Auto-Update:** Исправлен переход в установщик APK (добавлена проверка и явная обработка разрешения `Install unknown apps`, запуск через `ACTION_INSTALL_PACKAGE`).
- **Auto-Update:** Устранена повторная загрузка APK после принудительного перезапуска приложения (переиспользование кэшированного APK через pending-install state).

## [3.8.1] - 2026-02-15 (Hotfix)

### Fixed
- **Voice Search:** Временно отключен Hybrid Mode (popup:false) из-за зависаний. Возврат к `popup:true`.
- **Freeze:** Исправлено зависание кнопки микрофона (добавлены таймауты).

## [3.8.0] - 2026-02-15

### Added
- **Hybrid Voice Search (Этап 1):** Новая логика голосового поиска. Сначала выполняется "тихая" попытка (без системного окна), если за 4 секунды результат не получен — открывается стандартный диалог. Это решает проблему с закрытием приложения на Sony Android 10.
- **Graceful Cancel:** Отмена голосового поиска кнопкой "Назад" теперь происходит тихо, без лишних уведомлений.

### Changed
- **Side Panel Design:** Полностью переработан дизайн боковой панели. Убраны лишние тени и границы, унифицирован фон (`bg-[#141414]`), удалён логотип для увеличения полезного пространства.
- **Performance:** Оптимизирована анимация открытия боковой панели (используется `transform` вместо `width/margin`).

### Fixed
- **Voice Search Fallback:** Исправлена ошибка, из-за которой отмена голосового поиска могла приводить к сбою или некорректному поведению на некоторых устройствах.
