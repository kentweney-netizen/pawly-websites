#!/usr/bin/env python3
from pathlib import Path
import math
import shutil
import struct
import wave
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


def write_we_love_animals():
    """Build looping Pet Hub BGM named we-love-animals (no third-party file required)."""
    sr = 22050
    bpm = 100
    beat = 60.0 / bpm
    hz = {
        "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00,
        "A4": 440.00, "B4": 493.88, "C5": 523.25, "D5": 587.33, "E5": 659.25,
        "F5": 698.46, "G5": 783.99, "A5": 880.00,
    }
    melody = [
        ("C5", 0.5), ("E5", 0.5), ("G5", 0.5), ("E5", 0.5), ("A5", 0.5), ("G5", 0.5), ("E5", 0.5), ("D5", 0.5),
        ("C5", 0.5), ("G4", 0.5), ("A4", 0.5), ("C5", 0.5), ("E5", 0.5), ("D5", 0.5), ("C5", 1.0),
        ("E5", 0.5), ("G5", 0.5), ("C5", 0.5), ("G5", 0.5), ("A5", 0.5), ("G5", 0.5), ("F5", 0.5), ("E5", 0.5),
        ("D5", 0.5), ("E5", 0.5), ("C5", 0.5), ("A4", 0.5), ("G4", 0.5), ("B4", 0.5), ("C5", 1.0),
    ] * 2
    bass = [
        ("C4", 2), ("G4", 2), ("A4", 2), ("F4", 2),
        ("C4", 2), ("E4", 2), ("F4", 2), ("G4", 2),
    ] * 2

    def tone(freq, dur, vol, rich):
        n = int(sr * dur)
        attack = max(1, int(0.012 * sr))
        release = max(1, int(0.04 * sr))
        out = []
        for i in range(n):
            t = i / sr
            x = math.sin(2 * math.pi * freq * t)
            if rich:
                x += 0.25 * math.sin(2 * math.pi * 2 * freq * t)
                x += 0.08 * math.sin(2 * math.pi * 3 * freq * t)
            env = 1.0
            if i < attack:
                env = i / attack
            elif i > n - release:
                env = max(0.0, (n - i) / release)
            out.append(x * vol * env)
        return out

    lead = []
    for name, beats in melody:
        lead += tone(hz[name], beats * beat, 0.22, True)
    low = []
    for name, beats in bass:
        low += tone(hz[name], beats * beat, 0.12, False)
    n = max(len(lead), len(low))
    mix = [0.0] * n
    for i, v in enumerate(lead):
        mix[i] += v
    for i, v in enumerate(low):
        mix[i] += v
    step = int(beat * sr)
    for i in range(0, n, step):
        for k in range(min(180, n - i)):
            noise = ((k * 57 + 13) % 100) / 100.0 - 0.5
            mix[i + k] += noise * 0.04 * (1 - k / 180.0)
    peak = max(1e-6, max(abs(x) for x in mix))
    gain = 0.86 / peak
    frames = b"".join(struct.pack("<h", int(max(-1, min(1, x * gain)) * 32767)) for x in mix)
    targets = [
        root / "we-love-animals.wav",
        dapp / "public" / "we-love-animals.wav",
    ]
    for path in targets:
        path.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(path), "w") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes(frames)
        print("bgm", path, path.stat().st_size)

    mp3_src = next((p for p in (root / "we-love-animals.mp3", dapp / "we-love-animals.mp3") if p.exists()), None)
    if mp3_src:
        for folder in (root, dapp / "public"):
            out = folder / "we-love-animals.mp3"
            if mp3_src.resolve() != out.resolve():
                shutil.copyfile(mp3_src, out)
            print("bgm-mp3", out, out.stat().st_size)

write_we_love_animals()
