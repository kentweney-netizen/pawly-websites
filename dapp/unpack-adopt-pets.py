#!/usr/bin/env python3
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
zpath = root / "pawly-adopt-pets-sprites.zip"
dests = [root / "pets", root / "dapp" / "public" / "pets"]
need = {
    "dog.png", "cat.png", "rabbit.png", "hamster.png", "parrot.png",
    "chicken.png", "duck.png", "minipig.png", "alpaca.png", "lizard.png",
    "snake.png", "gecko.png", "beetle.png", "tarantula.png", "mantis.png",
}
if not zpath.exists():
    print("adopt zip missing", zpath)
    raise SystemExit(0)
with zipfile.ZipFile(zpath) as z:
    names = {Path(n).name for n in z.namelist() if n.lower().endswith(".png")}
    missing = sorted(need - names)
    if missing:
        print("zip missing", missing)
        raise SystemExit(1)
    for dest in dests:
        dest.mkdir(parents=True, exist_ok=True)
        for info in z.infolist():
            name = Path(info.filename).name
            if name in need:
                (dest / name).write_bytes(z.read(info))
        print("unpacked", dest, len(list(dest.glob("*.png"))))
