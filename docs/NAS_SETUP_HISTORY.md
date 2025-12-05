# NAS Setup History - Synology + Ugoos AM8

> **Дата**: 2025-12-05  
> **Цель**: Настроить Ugoos AM8 (Termux) для использования Synology NAS в качестве хранилища для торрентов

---

## 📋 Конфигурация

| Параметр | Значение |
|----------|----------|
| NAS IP | `192.168.1.70` |
| NAS User | `ilya8253` |
| NAS Password | `Markin4359!` |
| NAS Path | `/tor-cache` (в корне) |
| Ugoos IP | `192.168.1.88` |
| Termux SSH Port | `8022` |
| Termux User | `u0_a388` |
| Termux Password | `asdf` |

---

## ✅ Что работает

### 1. SSH доступ к Ugoos
```bash
ssh -p 8022 u0_a388@192.168.1.88
# Password: asdf
```

### 2. rclone установлен и настроен
Конфиг: `~/.config/rclone/rclone.conf`
```ini
[nas]
type = sftp
host = 192.168.1.70
user = ilya8253
pass = Hd9qQQlBGSDeqOz3YHO-juXWzdqOjn1xigSz
shell_type = unix
```

### 3. SFTP подключение к NAS работает
```bash
rclone lsd nas:/               # ✅ Показывает папки
rclone lsd nas:/tor-cache      # ✅ Папка существует
```

---

## ❌ Что НЕ работает

### 1. rclone mount (FUSE)
**Проблема**: Termux не поддерживает FUSE
```bash
rclone mount nas:/tor-cache ~/tor-cache --daemon
# Error: mount failed - FUSE not available
```

### 2. sshfs
**Проблема**: Пакет недоступен в Termux
```bash
pkg install sshfs
# E: Unable to locate package sshfs
```

### 3. SSH Key Auth на Synology
**Проблема**: SSH ключ добавлен, но аутентификация не работает
```bash
rclone lsd nas:/tor-cache
# ssh: unable to authenticate, attempted methods [none publickey]
```
Synology требует дополнительную настройку для SSH ключей (возможно `/etc/ssh/sshd_config`).

### 4. NFS mount
**Проблема**: Termux не имеет root доступа для mount
```bash
mount -t nfs 192.168.1.70:/volume2/tor-cache ~/tor-cache
# Permission denied
```

---

## 🔧 Решение: rclone sync

Поскольку mount невозможен, используем периодическую синхронизацию:

### Ручная синхронизация
```bash
# Локально → NAS
rclone sync ~/downloads nas:/tor-cache --progress

# NAS → Локально
rclone sync nas:/tor-cache ~/downloads --progress
```

### Автоматическая синхронизация (в start.sh)
```bash
# Фоновый процесс каждые 5 минут
while true; do
    sleep 300
    rclone sync ~/downloads nas:/tor-cache --quiet
done &
```

---

## 📝 Попытки настройки (хронология)

### Попытка 1: rclone с SSH ключом
1. Создали SSH ключ на Ugoos: `ssh-keygen -t rsa`
2. Добавили ключ на NAS через Mac
3. **Результат**: ❌ `unable to authenticate, attempted methods [publickey]`

### Попытка 2: rclone с паролем
1. Получили obscured пароль: `rclone obscure 'Markin4359!'`
2. Обновили rclone.conf с паролем
3. **Результат**: ❌ `ssh: subsystem request failed`

### Попытка 3: Включить SFTP на Synology
1. DSM → Control Panel → File Services → FTP → Enable SFTP
2. **Результат**: ✅ SFTP заработал!

### Попытка 4: rclone mount
1. Установили rclone на Termux
2. Попытались mount с VFS cache
3. **Результат**: ❌ FUSE недоступен на Termux

### Попытка 5: sshfs
1. `pkg install sshfs`
2. **Результат**: ❌ Пакет не найден

### Итоговое решение
**rclone sync** каждые 5 минут в фоновом режиме

---

## 🔜 Альтернативные решения для будущего

### 1. Запустить сервер в Docker на Synology NAS
- Сервер напрямую пишет на диск NAS
- Не нужен mount на Ugoos

### 2. Termux:Boot + Wake Lock
- Автозапуск сервера при перезагрузке
- Фоновая синхронизация

### 3. Использовать USB накопитель на Ugoos
- Большой объём без сети
- Синхронизация на NAS по расписанию

### 4. Root Ugoos + mount NFS
- С root можно mount NFS
- Требует разблокировку bootloader

---

## 📁 Файлы конфигурации

### server/scripts/start.sh
```bash
#!/bin/bash
# Запуск сервера + sync каждые 5 мин
export DOWNLOAD_PATH=~/downloads

# Фоновая синхронизация
(while true; do
    sleep 300
    rclone sync ~/downloads nas:/tor-cache --quiet
done) &

# Запуск сервера
node server/index.js
```

### ~/.config/rclone/rclone.conf (на Ugoos)
```ini
[nas]
type = sftp
host = 192.168.1.70
user = ilya8253
pass = Hd9qQQlBGSDeqOz3YHO-juXWzdqOjn1xigSz
shell_type = unix
```
