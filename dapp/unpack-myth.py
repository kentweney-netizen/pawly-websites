#!/usr/bin/env python3
from pathlib import Path
import base64
import re

root = Path(__file__).resolve().parents[1]
dapp = Path(__file__).resolve().parent
out = dapp / "public" / "myth"
out.mkdir(parents=True, exist_ok=True)
art = dapp / "game-art"
art.mkdir(parents=True, exist_ok=True)

SPRITES = ("fox", "moth", "wyrm", "boar", "cat", "toad", "lynx", "rose")

def decode_b64_file(path: Path):
    if not path.exists():
        return None
    raw = re.sub(r"\s+", "", path.read_text(errors="ignore"))
    try:
        data = base64.b64decode(raw)
    except Exception:
        return None
    if len(data) < 200 or data[:2] != b"\xff\xd8":
        return None
    return data

def decode_ts(path: Path):
    if not path.exists():
        return None
    text = path.read_text(errors="ignore")
    m = re.search(r"data:image/jpeg;base64,([A-Za-z0-9+/=\s]+)", text)
    if not m:
        return None
    raw = re.sub(r"\s+", "", m.group(1))
    try:
        data = base64.b64decode(raw)
    except Exception:
        return None
    if len(data) < 200 or data[:2] != b"\xff\xd8":
        return None
    return data

for sprite in SPRITES:
    data = None
    for cand in (
        art / ("myth-" + sprite + ".jpg.b64"),
        root / "myth-cards-v044" / (sprite + ".jpg"),
        root / "myth" / (sprite + ".jpg"),
        out / (sprite + ".jpg"),
    ):
        if cand.suffix == ".b64":
            data = decode_b64_file(cand)
        elif cand.exists() and cand.is_file() and cand.stat().st_size > 200:
            raw = cand.read_bytes()
            if raw[:2] == b"\xff\xd8":
                data = raw
        if data:
            break
    if data is None:
        data = decode_ts(dapp / "src" / ("petHubMyth" + sprite[:1].upper() + sprite[1:] + ".ts"))
    if data is None and sprite == "moth":
        fox = out / "fox.jpg"
        if fox.exists():
            data = fox.read_bytes()
    if data is None:
        print("missing myth", sprite)
        continue
    dest = out / (sprite + ".jpg")
    dest.write_bytes(data)
    print("myth", dest, dest.stat().st_size)
