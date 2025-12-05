# 🏴‍☠️ PWA-TorServe: Roadmap v3.5 (Rclone Stability)

**Цель:** Самовосстанавливающийся сервер (Docker для Dev, Termux+Rclone для Prod).

## 1. Конфигурация Storage (Termux)
* **Инструмент:** `rclone` (SFTP mount).
* **Режим:** Daemon + VFS Cache (`--vfs-cache-mode writes`).
* **Self-Healing:** Скрипт-оркестратор (`start.sh`) с циклом проверки `mountpoint`.

## 2. Server Logic
* **M3U Playlist:** Эндпоинт `/playlist.m3u` (фильтр видеофайлов).
* **Watchdog:** Проверка записи на диск (`fs.writeFile`) вместо простого доступа.

## 3. Android Integration
* **Intents:** `magnet:` схема в Manifest (без autoVerify).
* **Client:** Слушатель `appUrlOpen` в React.