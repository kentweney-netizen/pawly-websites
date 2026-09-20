#!/usr/bin/env python3
from pathlib import Path
import base64
import binascii

dapp = Path(__file__).resolve().parent
root = dapp.parent
art = dapp / "game-art"
folders = [root / "pets", dapp / "public" / "pets", dapp / "public" / "game"]
for folder in folders:
    folder.mkdir(parents=True, exist_ok=True)

def decode_b64(text: str):
    data = "".join((text or "").split()).replace('"', "")
    if len(data) < 80:
        return None
    variants = [data, data + "=", data + "==", data + "==="]
    if len(data) % 4:
        variants.append(data[: len(data) - (len(data) % 4)])
    best = None
    for item in variants:
        pad = item + ("=" * ((4 - len(item) % 4) % 4))
        try:
            raw = base64.b64decode(pad, validate=False)
        except (binascii.Error, ValueError):
            continue
        if not raw:
            continue
        if raw[:2] in (b"\xff\xd8", b"\x89P") and (best is None or len(raw) > len(best)):
            best = raw
    return best

for name in ("fox", "toad", "rose", "cat", "boar", "wyrm", "moth", "lynx"):
    raw = None
    for pth in (art / ("walk-" + name + ".jpg.b64"), art / ("walk-" + name + ".jpg")):
        if not pth.exists():
            continue
        if pth.suffix == ".b64":
            raw = decode_b64(pth.read_text(errors="ignore"))
            if raw is None:
                print("skip invalid walk b64", pth.name)
                continue
        else:
            raw = pth.read_bytes()
        break
    if not raw:
        print("missing walk", name)
        continue
    if raw[:2] == b"\xff\xd8" and not raw.endswith(b"\xff\xd9"):
        raw += b"\xff\xd9"
    for folder in folders:
        out = folder / ("walk-" + name + ".jpg")
        out.write_bytes(raw)
        print("walk", out, len(raw))
