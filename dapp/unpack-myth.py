#!/usr/bin/env python3
from pathlib import Path
import base64
import re

root = Path(__file__).resolve().parents[1]
dapp = Path(__file__).resolve().parent
out = dapp / "public" / "myth"
out.mkdir(parents=True, exist_ok=True)
art = dapp / "game-art"
src = dapp / "src"

SPRITES = ("fox", "moth", "wyrm", "boar", "cat", "toad", "lynx", "rose")

def b64jpeg(raw: str):
    raw = re.sub(r"\s+", "", raw or "").replace('"', "")
    if not raw:
        return None
    if len(raw) % 4 == 1:
        raw = raw[:-1]
    raw += "=" * ((4 - len(raw) % 4) % 4)
    try:
        data = base64.b64decode(raw)
    except Exception:
        return None
    if len(data) < 800 or data[:2] != b"\xff\xd8":
        return None
    return data

def read_text(path: Path) -> str:
    return path.read_text(errors="ignore") if path.exists() else ""

def score(d: bytes):
    return (1 if d.endswith(b"\xff\xd9") else 0, len(d))

def better(cur, nxt):
    if nxt is None:
        return cur
    if cur is None or score(nxt) > score(cur):
        return nxt
    return cur

def from_split(sprite: str):
    blob = ""
    for suffix in ("1.b64", "2.b64", "3.b64", "A.b64", "B.b64", ".jpg.b64"):
        blob += read_text(art / ("myth-" + sprite + suffix))
    return b64jpeg(blob)

def from_ts(sprite: str):
    text = read_text(src / ("petHubMyth" + sprite[:1].upper() + sprite[1:] + ".ts"))
    found = re.findall(r"/9j/[A-Za-z0-9+/=]+", text)
    data = b64jpeg("".join(found)) if found else None
    m = re.search(r"data:image/jpeg;base64,([A-Za-z0-9+/=\s]+)", text)
    return better(data, b64jpeg(m.group(1)) if m else None)

def from_toad_parts():
    blob = ""
    for name in ("petHubMythToadA.ts", "petHubMythToadB.ts", "petHubMythToadC.ts"):
        blob += "".join(re.findall(r"\"([A-Za-z0-9+/=]+)\"", read_text(src / name)))
    return b64jpeg(blob)

for sprite in SPRITES:
    data = from_split(sprite)
    for cand in (
        root / "myth-cards-v044" / (sprite + ".jpg"),
        root / "myth" / (sprite + ".jpg"),
        art / (sprite + ".jpg"),
    ):
        if cand.exists() and cand.stat().st_size > 800:
            raw = cand.read_bytes()
            if raw[:2] == b"\xff\xd8":
                data = better(data, raw)
    if sprite == "toad":
        data = better(data, from_toad_parts())
    data = better(data, from_ts(sprite))
    if data is None and sprite == "moth":
        fox = out / "fox.jpg"
        if fox.exists():
            data = fox.read_bytes()
    if data is None:
        print("missing myth", sprite)
        continue
    dest = out / (sprite + ".jpg")
    dest.write_bytes(data)
    print("myth", dest, dest.stat().st_size, "eoi" if data.endswith(b"\xff\xd9") else "NO-EOI")
