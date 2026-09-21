#!/usr/bin/env python3
"""Apply Pet Hub v0.4.19 title + PetRec.art before tsc."""
from pathlib import Path
root = Path(__file__).resolve().parent
src = root / "src"
if not src.exists():
    src = Path("dapp/src")

def patch_path(p: Path, pairs):
    if not p.exists():
        print("skip missing", p)
        return
    t = p.read_text()
    orig = t
    for a, b in pairs:
        t = t.replace(a, b)
    if t != orig:
        p.write_text(t)
        print("patched", p)
    else:
        print("no change", p)

patch_path(src / "petHub.tsx", [
    ("v0.4.14", "v0.4.19"),
    ("v0.4.15", "v0.4.19"),
    ("v0.4.16", "v0.4.19"),
    ("v0.4.17", "v0.4.19"),
    ("v0.4.18", "v0.4.19"),
    ("PAWLY till + Studio (parts + doodle + 0-dec mint).", "PAWLY till + Studio + NFT art + saved feeds."),
    ("PAWLY till + Studio + metadata attach.", "PAWLY till + Studio + NFT art + saved feeds."),
    ("PAWLY till + Studio + on-chain mint retry.", "PAWLY till + Studio + NFT art + saved feeds."),
    ("pet={{ species: p.species, level: Math.max(1, Number(p.level || 1)), emoji: p.emoji, name: p.name }}",
     "pet={{ species: p.species, level: Math.max(1, Number(p.level || 1)), emoji: p.emoji, name: p.name, art: p.art }}"),
    ("pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name }}",
     "pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name, art: p.art }}"),
])

patch_path(src / "petHubLib.ts", [
    ("feedDay?: string; level?: number };",
     "feedDay?: string; level?: number; art?: string };"),
])

print("v0.4.19 patch done")
