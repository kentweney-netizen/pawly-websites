#!/usr/bin/env python3
"""v0.2.29: only upgraded player pets walk the street."""
from pathlib import Path

p = Path(__file__).resolve().parent / "src" / "petHub.tsx"
t = p.read_text()

def swap(old: str, new: str, label: str) -> None:
    global t
    if old in t:
        t = t.replace(old, new, 1)
        print(label)
        return
    print("skip", label)

swap(
    "{pets.slice(0, 4).map((p, i) => (",
    "{pets.filter((p) => Number((p as { level?: number }).level || 0) >= 1).slice(0, 4).map((p, i) => (",
    "v0229 filter lv1+",
)
swap(
    "level: Math.max(1, Number((p as { level?: number }).level || 0))",
    "level: Number((p as { level?: number }).level || 0)",
    "v0229 real level",
)
swap("size={72} moving", "size={52} moving", "v0229 size 72")
swap("size={96} moving", "size={52} moving", "v0229 size 96")
swap("size={56} moving", "size={52} moving", "v0229 size 56")

p.write_text(t)
print("ok", p)
