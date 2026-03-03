import threading
import time
import os
import json

LOCKFILE = "/tmp/poller.lock"
LOG_FILE = "/tmp/poller.log"

BACKEND_URL = os.environ.get("BACKEND_URL", "http://host.docker.internal:3000")
SESSION_ID = os.environ.get("SESSION_ID", "unknown")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "3"))
INTERNAL_API_SECRET = os.environ.get("INTERNAL_API_SECRET", "")


def log(msg):
    line = "[kicad_poller] %s" % msg
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass


def snapshot(board):
    state = {"footprints": [], "tracks": [], "zones": []}

    for fp in board.GetFootprints():
        state["footprints"].append({
            "reference": fp.GetReference(),
            "value": fp.GetValue(),
            "footprint": fp.GetFPID().GetLibItemName().wx_str(),
            "position": {
                "x": fp.GetPosition().x / 1_000_000,
                "y": fp.GetPosition().y / 1_000_000,
            },
            "orientation": fp.GetOrientation().AsDegrees(),
            "layer": "front" if not fp.IsFlipped() else "back",
        })

    for track in board.GetTracks():
        state["tracks"].append({
            "net": track.GetNet().GetNetname(),
            "start": {
                "x": track.GetStart().x / 1_000_000,
                "y": track.GetStart().y / 1_000_000,
            },
            "end": {
                "x": track.GetEnd().x / 1_000_000,
                "y": track.GetEnd().y / 1_000_000,
            },
            "width": track.GetWidth() / 1_000_000,
            "layer": board.GetLayerName(track.GetLayer()),
        })

    for zone in board.Zones():
        state["zones"].append({
            "net": zone.GetNet().GetNetname(),
            "layer": board.GetLayerName(zone.GetLayer()),
        })

    return state


def poll_loop():
    import pcbnew
    import requests

    log("poll_loop started -- session=%s, backend=%s, interval=%ds" % (SESSION_ID, BACKEND_URL, POLL_INTERVAL))

    board = None
    for attempt in range(60):
        try:
            board = pcbnew.GetBoard()
            if board is not None:
                log("board acquired after %d attempts" % (attempt + 1))
                break
        except Exception as e:
            log("GetBoard() attempt %d failed: %s" % (attempt + 1, e))
        time.sleep(2)

    if board is None:
        log("ERROR: could not acquire board after 120s, exiting poller")
        return

    prev_hash = None
    post_url = "%s/api/poller/%s/events" % (BACKEND_URL, SESSION_ID)
    headers = {"x-internal-secret": INTERNAL_API_SECRET, "Content-Type": "application/json"}
    consecutive_errors = 0

    while True:
        try:
            board = pcbnew.GetBoard()
            if board is None:
                time.sleep(POLL_INTERVAL)
                continue

            current = snapshot(board)
            current_hash = hash(json.dumps(current, sort_keys=True))

            if current_hash != prev_hash:
                resp = requests.post(
                    post_url,
                    json={"timestamp": time.time(), "snapshot": current},
                    headers=headers,
                    timeout=5,
                )
                if resp.status_code == 200:
                    prev_hash = current_hash
                    consecutive_errors = 0
                else:
                    consecutive_errors += 1
                    log("POST failed: %d %s" % (resp.status_code, resp.text[:200]))
        except requests.exceptions.ConnectionError:
            consecutive_errors += 1
            if consecutive_errors % 10 == 1:
                log("connection error (attempt %d): cannot reach %s" % (consecutive_errors, BACKEND_URL))
        except Exception as e:
            consecutive_errors += 1
            if consecutive_errors % 10 == 1:
                log("error (attempt %d): %s" % (consecutive_errors, e))

        time.sleep(POLL_INTERVAL)


def start():
    try:
        fd = os.open(LOCKFILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, b"%d" % os.getpid())
        os.close(fd)
    except FileExistsError:
        log("already running, skipping duplicate start")
        return

    log("starting background poller thread")
    t = threading.Thread(target=poll_loop, daemon=True)
    t.start()


start()
