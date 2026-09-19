#!/usr/bin/env python3
from pathlib import Path
import base64

dapp = Path(__file__).resolve().parent
root = dapp.parent
art = dapp / "game-art"
folders = [root / "pets", dapp / "public" / "pets", dapp / "public" / "game"]
for folder in folders:
    folder.mkdir(parents=True, exist_ok=True)

for name in ("fox", "toad", "rose", "cat", "boar", "wyrm", "moth", "lynx"):
    raw = None
    for pth in (art / ("walk-" + name + ".jpg.b64"), art / ("walk-" + name + ".jpg")):
        if not pth.exists():
            continue
        if pth.suffix == ".b64":
            raw = base64.b64decode("".join(pth.read_text().split()))
        else:
            raw = pth.read_bytes()
        break
    if not raw:
        print("missing walk", name)
        continue
    for folder in folders:
        out = folder / ("walk-" + name + ".jpg")
        out.write_bytes(raw)
        print("walk", out, len(raw))
