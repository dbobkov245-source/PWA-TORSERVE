#!/bin/sh
# torrserver-test — canonical recreate command (2026-07-26).
#
# Ports MUST be published:
#   8090 — API + stream. The app container reaches it via the docker0
#          gateway (TS_URL default http://172.17.0.1:8090) and the TV
#          player via http://<nas>:8090 (TS_PUBLIC_PORT). Without -p 8090
#          the "accelerate via TorrServer" button returns 503 and the
#          /api/add TorrServer fallback silently no-ops.
#   6882 — inbound BT peers (PeersListenPort in TS settings).
#
# Settings live in the config bind mount (config.db + settings.json) and
# survive recreate. Do NOT set UseDisk=true — it crashes MatriX 141.5.
# Image must be ghcr.io/yourok/torrserver, NOT dockerhub yourok/torrserver
# (that one ships a glibc binary into musl and exits 127).

set -e
DOCKER=/usr/local/bin/docker

$DOCKER stop torrserver-test 2>/dev/null || true
$DOCKER rm torrserver-test 2>/dev/null || true

$DOCKER run -d \
    --name torrserver-test \
    --restart unless-stopped \
    --memory=320m \
    -p 8090:8090 \
    -p 6882:6882/tcp \
    -p 6882:6882/udp \
    -v /volume1/docker/torrserver-test:/opt/ts/config \
    -v /volume2/tor-cache/ts-cache:/opt/ts/cache \
    -e TS_CONF_PATH=/opt/ts/config \
    -e TS_LOG_PATH=/opt/ts/log \
    -e TS_TORR_DIR=/opt/ts/torrents \
    -e TS_PORT=8090 \
    -e GODEBUG=madvdontneed=1 \
    ghcr.io/yourok/torrserver:latest

$DOCKER ps --filter name=torrserver-test --format '{{.Names}}|{{.Status}}|{{.Ports}}'
