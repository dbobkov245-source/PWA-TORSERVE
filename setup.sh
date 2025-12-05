#!/bin/bash

echo "=========================================="
echo "   PWA-TorServe Automated Setup (Termux)  "
echo "=========================================="

# 1. Update System
echo "[1/5] Updating system packages..."
pkg update -y && pkg upgrade -y

# 2. Install Dependencies
echo "[2/5] Installing build tools and Node.js..."
pkg install -y python make clang cmake nodejs-lts git

# 3. Install Global Tools
echo "[3/5] Installing global NPM tools (node-gyp, pm2)..."
npm install -g node-gyp pm2

# 4. Install Project Dependencies
echo "[4/5] Installing project dependencies..."
# Ensure we are in the right directory
cd ~/pwa-torserve || exit 1

# Clean old modules to be safe
rm -rf node_modules package-lock.json

# Install
npm install

# 5. Setup PM2
echo "[5/5] Setting up PM2 process manager..."
# Stop existing if any
pm2 delete pwa-torserve 2>/dev/null || true

# Start server
pm2 start server/index.js --name "pwa-torserve"

# Save list
pm2 save

echo "=========================================="
echo "               SUCCESS!                   "
echo "=========================================="
echo "Server is running!"
echo "You can manage it with these commands:"
echo "  pm2 status       - Check status"
echo "  pm2 logs         - View logs"
echo "  pm2 restart all  - Restart server"
echo "=========================================="
