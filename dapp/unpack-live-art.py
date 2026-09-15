#!/usr/bin/env python3
from pathlib import Path
import shutil
import zipfile

root = Path(__file__).resolve().parents[1]
dapp = Path(__file__).resolve().parent
dest = dapp / "public" / "game"
dest.mkdir(parents=True, exist_ok=True)
pets_root = root / "pets"
pets_pub = dapp / "public" / "pets"
pets_root.mkdir(parents=True, exist_ok=True)
pets_pub.mkdir(parents=True, exist_ok=True)

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
# Never copy fused 3D-head plates onto the shared street.
for out, cands in names.items():
    src = None
    for name in cands:
        for base in (root, dapp, dapp / "public" / "game", dapp / "game-art"):
            p = base / name
            if p.exists() and p.is_file() and "fused" not in p.name:
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

zip_cands = [
    root / "pawly-adopt-pets-sprites.zip",
    dapp / "pawly-adopt-pets-sprites.zip",
]
zpath = next((p for p in zip_cands if p.exists()), None)
if zpath:
    with zipfile.ZipFile(zpath) as zf:
        for info in zf.infolist():
            name = Path(info.filename).name
            if not name.lower().endswith(".png"):
                continue
            data = zf.read(info)
            for folder in (pets_root, pets_pub):
                out = folder / name.lower()
                out.write_bytes(data)
                print("sprite", out, len(data))
else:
    print("missing pawly-adopt-pets-sprites.zip")
