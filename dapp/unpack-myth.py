#!/usr/bin/env python3
from pathlib import Path
import base64
import re
import shutil

root = Path(__file__).resolve().parents[1]
dapp = Path(__file__).resolve().parent
out = dapp / "public" / "myth"
out.mkdir(parents=True, exist_ok=True)

SPRITES = ("fox", "moth", "wyrm", "boar", "cat", "toad", "lynx", "rose")

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
        root / "myth-cards-v044" / (sprite + ".jpg"),
        root / "myth" / (sprite + ".jpg"),
        dapp / "public" / "myth" / (sprite + ".jpg"),
    ):
        if cand.exists() and cand.is_file() and cand.stat().st_size > 200:
            data = cand.read_bytes()
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
