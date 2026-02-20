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
    python3 \
    python3-pip \
    && pip3 install requests \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY kicad_poller.py /usr/share/kicad/scripting/plugins/kicad_poller.py
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 6080

CMD ["/start.sh"]
