#!/bin/bash
set -e

echo "[start.sh] starting container for session=${SESSION_ID}"

# Workspace for board files
mkdir -p /workspace

# Start virtual framebuffer (16-bit for bandwidth)
Xvfb :99 -screen 0 1920x1080x16 &
export DISPLAY=:99
sleep 1

# Start window manager (auto-maximizes + no decorations)
openbox &
sleep 1

# Start VNC server (optimized for snappy remote)
x11vnc -display :99 -nopw -forever -shared -rfbport 5900 \
  -ncache 10 \
  -ncache_cr \
  -tight \
  -quality 7 \
  -depth 16 &
sleep 1

# Start noVNC
websockify --web /usr/share/novnc \
  --heartbeat=30 \
  6080 localhost:5900 &
sleep 1

echo "[start.sh] launching pcbnew"
pcbnew &

echo "[start.sh] all services started, poller will auto-load via KiCad plugin system"
wait
