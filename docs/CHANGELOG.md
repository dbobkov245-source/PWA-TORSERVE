# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Local Library Recovery:** Backend now indexes completed video files directly from `DOWNLOAD_PATH` and exposes them in `/api/status` as ready items, even when original torrent engines are not active.
- **Local Streaming Path:** `/stream/:infoHash/:fileIndex` can now serve indexed local media files without active swarm.
- **Library Rescan API:** Added `POST /api/library/rescan` for manual refresh of local media index.

### Changed
- **Delete Semantics:** `DELETE /api/delete/:infoHash` now defaults to hard delete (destroy engine + disk cleanup). Soft keep-alive is available only via `?soft=1`.
- **Preflight Candidate Selection:** Magnet preflight now probes top-N by seeders, not provider arrival order.
- **Preflight Cache TTL:** Configurable via `PREFLIGHT_CACHE_TTL_MS` (default reduced to `60000` ms).
- **Search Ranking:** `risky` items with `preflight.peers=0` are ranked lower than `unchecked` to avoid stale swarm picks at the top.

### Fixed
- **Rutor Size Parsing:** Fixed `size: N/A` issue for rows where comment counter and size used separate right-aligned cells.
- **Frozen Reuse Resume:** On frozen-engine reuse, swarm resume is forced to avoid idle stale state.

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
