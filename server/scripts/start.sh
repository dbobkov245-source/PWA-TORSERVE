#!/bin/bash
# ─────────────────────────────────────────────────────────────
# PWA-TorServe: Main Startup Script for Termux
# Запускает сервер + синхронизация на NAS каждые 5 минут
# ─────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
DOWNLOAD_PATH="$HOME/downloads"
NAS_PATH="nas:/tor-cache"
SYNC_INTERVAL=300  # 5 minutes

echo "╔════════════════════════════════════════════╗"
echo "║   PWA-TorServe Starting...                ║"
echo "╚════════════════════════════════════════════╝"

# ─── Acquire Wake Lock ───
echo "🔒 Acquiring wake lock..."
termux-wake-lock 2>/dev/null || true

# ─── Create downloads folder ───
mkdir -p "$DOWNLOAD_PATH"

# ─── Export Environment ───
export DOWNLOAD_PATH
export NODE_ENV=production
echo "📁 DOWNLOAD_PATH=$DOWNLOAD_PATH"

# ─── NAS Sync Watchdog (background) ───
echo "☁️  Starting NAS sync (every 5 min)..."
(
    while true; do
        sleep $SYNC_INTERVAL
        
        echo "[$(date '+%H:%M:%S')] 🔄 Syncing to NAS..."
        if rclone sync "$DOWNLOAD_PATH" "$NAS_PATH" --quiet 2>/dev/null; then
            echo "[$(date '+%H:%M:%S')] ✅ Sync complete"
        else
            echo "[$(date '+%H:%M:%S')] ⚠️  Sync failed (NAS offline?)"
        fi
    done
) &
SYNC_PID=$!
echo "   Sync PID: $SYNC_PID"

# ─── Trap for cleanup ───
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    
    # Final sync before exit
    echo "📤 Final sync to NAS..."
    rclone sync "$DOWNLOAD_PATH" "$NAS_PATH" --quiet 2>/dev/null || true
    
    kill $SYNC_PID 2>/dev/null || true
    termux-wake-unlock 2>/dev/null || true
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
