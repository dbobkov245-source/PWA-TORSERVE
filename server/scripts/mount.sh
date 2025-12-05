#!/bin/bash
# ─────────────────────────────────────────────────────────────
# PWA-TorServe: NAS Mount Script (rclone SFTP)
# Монтирует NAS через SFTP с VFS кешем для записи
# ─────────────────────────────────────────────────────────────

# ─── Configuration ───
RCLONE_REMOTE="nas"
NAS_PATH="/volume2/tor-cache"
MOUNT_POINT="$HOME/tor-cache"

# ─── Check if already mounted ───
if mountpoint -q "$MOUNT_POINT" 2>/dev/null; then
    echo "✅ Already mounted: $MOUNT_POINT"
    exit 0
fi

# ─── Create mount point if not exists ───
mkdir -p "$MOUNT_POINT"

echo "🔗 Mounting NAS: $RCLONE_REMOTE:$NAS_PATH -> $MOUNT_POINT"

# ─── Mount with rclone ───
# Flags verified via rclone documentation:
# --vfs-cache-mode writes : Only cache files opened for writing
# --vfs-cache-max-size 4G : Limit cache to 4GB
# --daemon                : Run in background
# --allow-other           : Allow access from other users (requires fuse config)
rclone mount "$RCLONE_REMOTE:$NAS_PATH" "$MOUNT_POINT" \
    --vfs-cache-mode writes \
    --vfs-cache-max-size 4G \
    --vfs-write-back 5s \
    --dir-cache-time 5m \
    --poll-interval 30s \
    --daemon \
    --log-file="$HOME/rclone-mount.log" \
    --log-level INFO

# ─── Verify mount ───
sleep 2
if mountpoint -q "$MOUNT_POINT"; then
    echo "✅ Mount successful!"
    ls -la "$MOUNT_POINT"
else
    echo "❌ Mount failed! Check logs: $HOME/rclone-mount.log"
    exit 1
fi
