#!/bin/bash
# ─────────────────────────────────────────────────────────────
# PWA-TorServe: Main Startup Script for Termux
# Запускает сервер с автоматическим ремаунтом NAS при сбое
# ─────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
MOUNT_POINT="$HOME/tor-cache"

echo "╔════════════════════════════════════════════╗"
echo "║   PWA-TorServe Starting...                ║"
echo "╚════════════════════════════════════════════╝"

# ─── Acquire Wake Lock ───
echo "🔒 Acquiring wake lock..."
termux-wake-lock

# ─── Initial Mount ───
echo "🔗 Mounting NAS..."
"$SCRIPT_DIR/mount.sh"

# ─── Export Environment ───
export DOWNLOAD_PATH="$MOUNT_POINT"
export NODE_ENV=production
echo "📁 DOWNLOAD_PATH=$DOWNLOAD_PATH"

# ─── Mount Watchdog (background) ───
echo "👁️  Starting mount watchdog..."
(
    while true; do
        sleep 60
        
        if ! mountpoint -q "$MOUNT_POINT" 2>/dev/null; then
            echo "[$(date)] ⚠️  Mount lost! Attempting remount..."
            "$SCRIPT_DIR/mount.sh" || echo "[$(date)] ❌ Remount failed"
        fi
    done
) &
WATCHDOG_PID=$!
echo "   Watchdog PID: $WATCHDOG_PID"

# ─── Trap for cleanup ───
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $WATCHDOG_PID 2>/dev/null || true
    termux-wake-unlock
    echo "✅ Cleanup complete"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ─── Start Node.js Server ───
echo ""
echo "🚀 Starting Node.js server..."
echo "═══════════════════════════════════════════════"
cd "$SERVER_DIR"
node index.js
