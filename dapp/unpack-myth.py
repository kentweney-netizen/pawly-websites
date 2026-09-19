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
src = dapp / "src"

SPRITES = ("fox", "moth", "wyrm", "boar", "cat", "toad", "lynx", "rose")

def b64jpeg(raw: str):
    raw = re.sub(r"\s+", "", raw or "")
    try:
        data = base64.b64decode(raw)
    except Exception:
        return None
    if len(data) < 800 or data[:2] != b"\xff\xd8":
        return None
    return data

def read_text(path: Path) -> str:
    return path.read_text(errors="ignore") if path.exists() else ""

def from_split(sprite: str):
    blob = read_text(art / ("myth-" + sprite + "A.b64")) + read_text(art / ("myth-" + sprite + "B.b64"))
    blob += read_text(art / ("myth-" + sprite + ".jpg.b64"))
    return b64jpeg(blob)

def from_ts(sprite: str):
    path = src / ("petHubMyth" + sprite[:1].upper() + sprite[1:] + ".ts")
    text = read_text(path)
    found = re.findall(r"/9j/[A-Za-z0-9+/=]+", text)
    if found:
        return b64jpeg("".join(found))
    m = re.search(r"data:image/jpeg;base64,([A-Za-z0-9+/=\s]+)", text)
    return b64jpeg(m.group(1)) if m else None

def from_toad_parts():
    blob = ""
    for name in ("petHubMythToadA.ts", "petHubMythToadB.ts", "petHubMythToadC.ts"):
        blob += "".join(re.findall(r"/9j/[A-Za-z0-9+/=]+|[A-Za-z0-9+/=]{40,}", read_text(src / name)))
    return b64jpeg(blob)

for sprite in SPRITES:
    data = from_split(sprite)
    if data is None:
        for cand in (
            root / "myth-cards-v044" / (sprite + ".jpg"),
            root / "myth" / (sprite + ".jpg"),
            art / (sprite + ".jpg"),
        ):
            if cand.exists() and cand.stat().st_size > 800:
                raw = cand.read_bytes()
                if raw[:2] == b"\xff\xd8":
                    data = raw
                    break
    if data is None and sprite == "toad":
        data = from_toad_parts()
    if data is None:
        data = from_ts(sprite)
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
