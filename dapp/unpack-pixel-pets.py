#!/usr/bin/env python3
import base64
from pathlib import Path
root = Path(__file__).resolve().parents[1]
src = Path(__file__).resolve().parent / "pixel-b64"
dests = [root / "pets" / "pixel", root / "dapp" / "public" / "pets" / "pixel"]
for dest in dests:
    dest.mkdir(parents=True, exist_ok=True)
n = 0
if src.exists():
    for p in sorted(src.glob("*.b64")):
        data = base64.b64decode("".join(p.read_text().split()))
        for dest in dests:
            (dest / (p.stem + ".png")).write_bytes(data)
        n += 1
print("pixel sprites", n)
