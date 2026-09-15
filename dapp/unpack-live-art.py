#!/usr/bin/env python3
from pathlib import Path
import shutil
root = Path(__file__).resolve().parents[1]
dapp = Path(__file__).resolve().parent
dest = dapp / "public" / "game"
dest.mkdir(parents=True, exist_ok=True)
names = {
    "town.jpg": ["town.jpg", "pawly-town.jpg", "game/town.jpg"],
    "npc.png": ["npc.png", "pawly-npc.png", "game/npc.png"],
    "pig.png": ["pig.png", "pawly-pig.png", "game/pig.png"],
    "dog.png": ["dog.png", "pawly-dog.png", "game/dog.png"],
    "street-walk.mp4": [
        "street-walk.mp4",
        "pet-hub-street-walk.mp4",
        "game/street-walk.mp4",
        "dapp/public/game/street-walk.mp4",
    ],
}
for out, cands in names.items():
    src = None
    for name in cands:
        for base in (root, dapp, dapp / "public" / "game", dapp / "game-art"):
            p = base / name
            if p.exists() and p.is_file():
                src = p
                break
        if src:
            break
    if not src:
        print("missing", out)
        continue
    target = dest / out
    if src.resolve() != target.resolve():
        shutil.copyfile(src, target)
    print("art", out, target.stat().st_size)
