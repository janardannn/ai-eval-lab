#!/bin/bash

# Start virtual framebuffer
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
sleep 1

# Start VNC server
x11vnc -display :99 -nopw -forever -shared -rfbport 5900 &
sleep 1

# Start noVNC
websockify --web /usr/share/novnc 6080 localhost:5900 &
sleep 1

# Launch KiCad pcbnew
pcbnew &

wait
