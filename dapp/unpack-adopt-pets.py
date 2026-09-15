#!/usr/bin/env python3
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
dests = [root / "pets", root / "dapp" / "public" / "pets"]
need = {
    "dog", "cat", "rabbit", "hamster", "parrot", "chicken", "duck",
    "minipig", "alpaca", "lizard", "snake", "gecko", "beetle", "tarantula", "mantis",
}

for dest in dests:
    (dest / "heads").mkdir(parents=True, exist_ok=True)
    (dest / "grown").mkdir(parents=True, exist_ok=True)

z3d = root / "pawly-adopt-3d-pets.zip"
if z3d.exists():
    with zipfile.ZipFile(z3d) as z:
        for info in z.infolist():
            name = Path(info.filename).name
            stem = Path(name).stem
            if stem not in need:
                continue
            data = z.read(info)
            for dest in dests:
                if name.endswith(".png"):
                    (dest / "heads" / name).write_bytes(data)
                elif name.endswith(".mp4"):
                    (dest / "grown" / name).write_bytes(data)
    print("unpacked 3d pack", z3d.name)
else:
    print("3d zip missing", z3d)

zold = root / "pawly-adopt-pets-sprites.zip"
if zold.exists():
    with zipfile.ZipFile(zold) as z:
        for info in z.infolist():
            name = Path(info.filename).name
            stem = Path(name).stem
            if stem in need and name.endswith(".png"):
                for dest in dests:
                    (dest / name).write_bytes(z.read(info))
    print("unpacked flat sprites")

heads_n = len(list((dests[0] / "heads").glob("*.png")))
grown_n = len(list((dests[0] / "grown").glob("*.mp4")))
print("heads", heads_n, "grown", grown_n)
if heads_n < 15 or grown_n < 15:
    print("WARN: add pawly-adopt-3d-pets.zip at repo root")
