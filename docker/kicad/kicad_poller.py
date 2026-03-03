import threading
import time
import os
import sys
import json

_STARTED = False
_LOCK = threading.Lock()

BACKEND_URL = os.environ.get("BACKEND_URL", "http://host.docker.internal:3000")
SESSION_ID = os.environ.get("SESSION_ID", "unknown")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "3"))
INTERNAL_API_SECRET = os.environ.get("INTERNAL_API_SECRET", "")


def log(msg):
    print(f"[kicad_poller] {msg}", flush=True)


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

    log(f"poll_loop started — session={SESSION_ID}, backend={BACKEND_URL}, interval={POLL_INTERVAL}s")

    # Wait for pcbnew to have a board ready
    board = None
    for attempt in range(60):
        try:
            board = pcbnew.GetBoard()
            if board is not None:
                log(f"board acquired after {attempt + 1} attempts")
                break
        except Exception as e:
            log(f"GetBoard() attempt {attempt + 1} failed: {e}")
        time.sleep(2)

    if board is None:
        log("ERROR: could not acquire board after 120s, exiting poller")
        return

    prev_hash = None
    post_url = f"{BACKEND_URL}/api/poller/{SESSION_ID}/events"
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
                    log(f"POST failed: {resp.status_code} {resp.text[:200]}")
        except requests.exceptions.ConnectionError:
            consecutive_errors += 1
            if consecutive_errors % 10 == 1:
                log(f"connection error (attempt {consecutive_errors}): cannot reach {BACKEND_URL}")
        except Exception as e:
            consecutive_errors += 1
            if consecutive_errors % 10 == 1:
                log(f"error (attempt {consecutive_errors}): {e}")

        time.sleep(POLL_INTERVAL)


def start():
    global _STARTED
    with _LOCK:
        if _STARTED:
            log("already running, skipping duplicate start")
            return
        _STARTED = True

    log("starting background poller thread")
    t = threading.Thread(target=poll_loop, daemon=True)
    t.start()


start()
