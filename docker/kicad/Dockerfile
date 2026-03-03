FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    software-properties-common \
    && add-apt-repository ppa:kicad/kicad-8.0-releases \
    && apt-get update && apt-get install -y \
    kicad \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    openbox \
    python3 \
    python3-pip \
    && pip3 install requests \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Strip all noVNC UI chrome — only the VNC canvas should be visible
RUN sed -i 's|</head>|<style>\
#noVNC_control_bar_anchor,#noVNC_control_bar,#noVNC_control_bar_handle,\
#noVNC_status,#noVNC_transition,#noVNC_connect_dlg,#noVNC_credentials_dlg,\
#noVNC_verify_server_dlg,#noVNC_fallback_error,#noVNC_hint_anchor,\
#noVNC_control_bar_hint,#noVNC_mobile_buttons,#noVNC_clipboard,\
#noVNC_settings,#noVNC_power,#noVNC_modifiers{display:none!important}\
</style></head>|' /usr/share/novnc/vnc.html

# Openbox config: auto-maximize all windows, no decorations
RUN mkdir -p /root/.config/openbox
COPY openbox-rc.xml /root/.config/openbox/rc.xml

# Pre-seed KiCad config to skip first-run dialogs
RUN mkdir -p /root/.config/kicad/8.0
COPY config/kicad_common.json /root/.config/kicad/8.0/kicad_common.json
COPY config/fp-lib-table /root/.config/kicad/8.0/fp-lib-table

# Install poller to user plugin directory (loaded by KiCad at startup)
RUN mkdir -p /root/.local/share/kicad/8.0/scripting/plugins
COPY kicad_poller.py /root/.local/share/kicad/8.0/scripting/plugins/kicad_poller.py

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 6080

CMD ["/start.sh"]
