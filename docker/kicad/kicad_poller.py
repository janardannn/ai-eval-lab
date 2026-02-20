import pcbnew
import threading
import requests
import time
import os

BACKEND_URL = os.environ.get("BACKEND_URL", "http://web:8080")
SESSION_ID = os.environ.get("SESSION_ID", "unknown")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "3"))


def snapshot(board):
    """Capture complete board state. No diffing — full state every time."""
    state = {
        "footprints": [],
        "tracks": [],
        "zones": [],
    }

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
    prev_hash = None
    while True:
        try:
            board = pcbnew.GetBoard()
            if board is None:
                time.sleep(POLL_INTERVAL)
                continue

            current = snapshot(board)
            current_hash = hash(str(current))

            if current_hash != prev_hash:
                requests.post(
                    f"{BACKEND_URL}/api/poller/{SESSION_ID}/events",
                    json={"timestamp": time.time(), "snapshot": current},
                    timeout=5,
                )
                prev_hash = current_hash
        except Exception as e:
            print(f"[kicad_poller] error: {e}")

        time.sleep(POLL_INTERVAL)


threading.Thread(target=poll_loop, daemon=True).start()
