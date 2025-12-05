#!/bin/bash
# ─────────────────────────────────────────────────────────────
# PWA-TorServe: Termux Initial Setup Script
# Устанавливает rclone, openssh и настраивает подключение к NAS
# ─────────────────────────────────────────────────────────────

set -e

# ─── Configuration ───
NAS_IP="192.168.1.70"
NAS_USER="ilya8253"
NAS_PATH="/volume2/tor-cache"
RCLONE_REMOTE="nas"

echo "╔════════════════════════════════════════════╗"
echo "║   PWA-TorServe Termux Setup               ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# ─── Install Dependencies ───
echo "📦 Installing rclone and openssh..."
pkg update -y
pkg install -y rclone openssh

# ─── Generate SSH Key (if not exists) ───
SSH_KEY="$HOME/.ssh/id_rsa"
if [ ! -f "$SSH_KEY" ]; then
    echo "🔑 Generating SSH key..."
    mkdir -p "$HOME/.ssh"
    ssh-keygen -t rsa -b 4096 -f "$SSH_KEY" -N "" -C "termux@pwa-torserve"
    echo "✅ SSH key generated: $SSH_KEY"
else
    echo "✅ SSH key already exists: $SSH_KEY"
fi

# ─── Create Rclone Config (non-interactive) ───
echo "⚙️  Configuring rclone remote '$RCLONE_REMOTE'..."

mkdir -p "$HOME/.config/rclone"
cat > "$HOME/.config/rclone/rclone.conf" << EOF
[$RCLONE_REMOTE]
type = sftp
host = $NAS_IP
user = $NAS_USER
key_file = $SSH_KEY
shell_type = unix
md5sum_command = md5sum
sha1sum_command = sha1sum
EOF

echo "✅ Rclone config created"

# ─── Create Mount Point ───
MOUNT_POINT="$HOME/tor-cache"
mkdir -p "$MOUNT_POINT"
echo "✅ Mount point created: $MOUNT_POINT"

# ─── Display Next Steps ───
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   NEXT STEPS                               ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "1️⃣  Copy SSH key to NAS (enter password when prompted):"
echo ""
echo "   ssh-copy-id -i $SSH_KEY.pub $NAS_USER@$NAS_IP"
echo ""
echo "2️⃣  Test SSH connection:"
echo ""
echo "   ssh $NAS_USER@$NAS_IP 'echo Connection OK'"
echo ""
echo "3️⃣  Test rclone:"
echo ""
echo "   rclone ls $RCLONE_REMOTE:$NAS_PATH"
echo ""
echo "4️⃣  Run mount script:"
echo ""
echo "   ./mount.sh"
echo ""
echo "═══════════════════════════════════════════════"
