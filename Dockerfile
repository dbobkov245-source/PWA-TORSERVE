# PWA-TorServe Docker Image
# Multi-stage build: Client + Server

# ─── Stage 1: Build Client ───
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci

# Copy client source
COPY client/ ./

# Build production client
RUN npm run build

# ─── Stage 2: Production Server ───
FROM node:20-alpine

# Install additional deps for torrent-stream native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server code
COPY server/ ./server/

# Copy built client from stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Create downloads directory and fresh db.json
RUN mkdir -p /app/downloads && \
    echo '{"serverStatus":"ok","lastStateChange":0,"storageFailures":0,"progress":{}}' > /app/db.json

# Expose port
EXPOSE 3000

# Environment defaults
ENV DOWNLOAD_PATH=/app/downloads
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD wget -q --spider http://localhost:3000/api/health || exit 1

# Start server
CMD ["node", "server/index.js"]
