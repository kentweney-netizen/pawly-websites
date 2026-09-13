#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.10.3 — 3 feeds/day hard cap per pet.",
    " * PAWLY Pet Hub v0.10.4 — growing body rig + street Lv label.",
)
old = '''                <div style={{ fontSize: 11, fontWeight: 800 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "#9f8" }}>tap to feed</div>'''
new = '''                <div style={{ fontSize: 11, fontWeight: 800 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "#9f8" }}>{"Lv" + Number(p.level || 0) + " · " + Number(p.feedsTotal || 0) + " feeds"}</div>
                <div style={{ fontSize: 10, color: "#8aa" }}>{10 - (Number(p.feedsTotal || 0) % 10) + " to next body"}</div>'''
if old in t:
    t = t.replace(old, new, 1)
p.write_text(t)
print("label", "to next body" in t, "v0.10.4" in t)
