#!/usr/bin/env python3
"""World layer: if fused zip/mp4 is at repo root, copy over pet-hub-street.mp4."""
from pathlib import Path
import zipfile
import shutil

root = Path(__file__).resolve().parents[1]
dests = [root / "pet-hub-street.mp4", root / "dapp" / "public" / "pet-hub-street.mp4"]
for d in dests:
    d.parent.mkdir(parents=True, exist_ok=True)

zip_cands = [
    root / "pawly-street-world-fused.zip",
    root / "pet-hub-street-fused.zip",
]
mp4_cands = [
    root / "pet-hub-street-fused.mp4",
    root / "dapp" / "pet-hub-street-fused.mp4",
]

copied = False
for z in zip_cands:
    if z.exists():
        with zipfile.ZipFile(z) as zf:
            names = zf.namelist()
            hit = next((n for n in names if n.endswith("pet-hub-street.mp4") or n.endswith("pet-hub-street-fused.mp4")), None)
            if not hit:
                hit = next((n for n in names if n.lower().endswith(".mp4")), None)
            if hit:
                data = zf.read(hit)
                for d in dests:
                    d.write_bytes(data)
                print("street world from zip", z.name, len(data))
                copied = True
                break

if not copied:
    for m in mp4_cands:
        if m.exists():
            for d in dests:
                if d.resolve() != m.resolve():
                    shutil.copyfile(m, d)
            print("street world from", m.name, m.stat().st_size)
            copied = True
            break

if not copied:
    print("street world unchanged")
