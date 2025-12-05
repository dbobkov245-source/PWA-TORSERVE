#!/data/data/com.termux/files/usr/bin/sh

# Setup Termux:Boot for PWA-TorServe
# Run this script on the Ugoos device

BOOT_DIR="$HOME/.termux/boot"
SCRIPT_PATH="$BOOT_DIR/start_server"

echo "Setting up Termux:Boot..."

# Create boot directory if it doesn't exist
if [ ! -d "$BOOT_DIR" ]; then
    mkdir -p "$BOOT_DIR"
    echo "Created $BOOT_DIR"
fi

# Create the boot script
cat > "$SCRIPT_PATH" << 'EOF'
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock

# Configuration
export PROJECT_DIR="$HOME/pwa-torserve"
export DOWNLOAD_PATH="/mnt/media_rw/9016-4EF8/Torrents" # CHANGE THIS TO YOUR NAS PATH
export PORT=3000

# Logging
LOG_FILE="$PROJECT_DIR/boot.log"

echo "Starting PWA-TorServe at $(date)" >> "$LOG_FILE"

# Navigate to project
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    
    # Start Server
    # We use nohup to ensure it stays alive, though Termux:Boot handles it too.
    # Using 'node server/index.js' directly.
    
    npm start >> "$LOG_FILE" 2>&1 &
    
    echo "Server started with PID $!" >> "$LOG_FILE"
else
    echo "Project directory not found: $PROJECT_DIR" >> "$LOG_FILE"
fi
EOF

# Make it executable
chmod +x "$SCRIPT_PATH"

echo "Boot script created at $SCRIPT_PATH"
echo "Please install the Termux:Boot app and launch it once to initialize."
