# PWA-TorServe Docker Image
# Multi-stage build: Client + Server

# ─── Stage 1: Build Client ───
# ─── Stage 1: Client Builder ───
FROM node:20-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ─── Stage 2: Server Dependency Builder ───
FROM node:20-slim AS server-builder
WORKDIR /app
# Install build tools for native modules (python3, make, g++)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
# Install ALL dependencies (including devDependencies if needed for build, but usually --only=production is fine if no build steps)
# We use --only=production to avoid dev deps, but we need build tools.
RUN npm ci --only=production

# ─── Stage 3: Final Production Image ───
FROM node:20-slim

# Install runtime dependencies (ffmpeg only)
RUN apt-get update && \
    apt-get install -y ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built node_modules from builder
COPY --from=server-builder /app/node_modules ./node_modules
# Copy built client from client-builder
COPY --from=client-builder /app/client/dist ./client/dist
# Copy project files
COPY package*.json ./
COPY server/ ./server/

# Create directories
RUN mkdir -p /app/downloads /app/data && \
    echo '{"serverStatus":"ok","lastStateChange":0,"storageFailures":0,"progress":{}}' > /app/data/db.json

# Expose port
EXPOSE 3000

# Environment defaults
ENV DOWNLOAD_PATH=/app/downloads
ENV DB_PATH=/app/data/db.json
ENV NODE_ENV=production

# Health check (using curl)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start server
CMD ["node", "server/index.js"]
