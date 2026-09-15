#!/usr/bin/env python3
import base64
from pathlib import Path

root = Path(__file__).resolve().parents[1]
src = Path(__file__).resolve().parent / "pixel-b64"
dests = [root / "pets" / "pixel", root / "dapp" / "public" / "pets" / "pixel"]
for dest in dests:
    dest.mkdir(parents=True, exist_ok=True)

n = 0
skipped = 0
if src.exists():
    for p in sorted(src.glob("*.b64")):
        raw = "".join(p.read_text().split())
        raw = "".join(ch for ch in raw if ch.isalnum() or ch in "+/=")
        pad = (-len(raw)) % 4
        if pad:
            raw += "=" * pad
        try:
            data = base64.b64decode(raw, validate=False)
        except Exception as e:
            print("skip", p.name, e)
            skipped += 1
            continue
        if not data.startswith(b"\x89PNG"):
            print("skip", p.name, "not png", len(data))
            skipped += 1
            continue
        for dest in dests:
            (dest / (p.stem + ".png")).write_bytes(data)
        n += 1
print("pixel sprites", n, "skipped", skipped)
