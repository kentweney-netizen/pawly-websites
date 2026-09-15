#!/usr/bin/env python3
"""v0.2.26: street overlay walks adopt sprites; shop adopt list uses PetRig."""
from pathlib import Path

p = Path(__file__).resolve().parent / "src" / "petHub.tsx"
t = p.read_text()
old = """        {greet && pets.length ? (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            {pets.slice(0, 4).map((p, i) => (
              <div key={p.id} className={"pawly-run pawly-run-" + (i % 3)} style={{ position: "absolute", bottom: 18 + i * 10, left: 8 + i * 18 }}>
                <div className="pawly-bubble">{i % 2 === 0 ? "Hug me!" : "Snack please!"}</div>
                <div className="pawly-pet">{p.emoji}</div>
                <div style={{ fontSize: 10, color: "#fff", textShadow: "0 1px 2px #000", textAlign: "center" }}>{p.name}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <style>{PET_RIG_CSS + `
        .pawly-pet { font-size: 42px; line-height: 1; animation: pawly-wiggle 0.5s ease-in-out infinite alternate; }
        .pawly-bubble { background: #fff; color: #102018; font-size: 11px; font-weight: 800; border-radius: 10px; padding: 4px 8px; margin-bottom: 4px; width: max-content; }
        .pawly-run { animation: pawly-in 1.1s ease-out both; }
        .pawly-run-1 { animation-delay: 0.18s; }
        .pawly-run-2 { animation-delay: 0.36s; }
        @keyframes pawly-in { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pawly-wiggle { from { transform: rotate(-8deg) translateY(0); } to { transform: rotate(8deg) translateY(-6px); } }
      `}</style>"""
new = """        {scene === "street" && pets.length ? (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            {pets.slice(0, 4).map((p, i) => (
              <div key={p.id} className={"pawly-stroll pawly-stroll-" + (i % 4)}>
                <PetRig pet={{ species: p.species, level: Math.max(1, Number((p as { level?: number }).level || 0)), emoji: p.emoji, name: p.name }} size={72} moving />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <style>{PET_RIG_CSS}</style>"""
if old in t:
    t = t.replace(old, new, 1)
    print("v0226 overlay patched")
elif "pawly-stroll" in t:
    print("v0226 overlay already present")
else:
    raise SystemExit("v0226 overlay target missing")

old2 = """                <span>{c.emoji + " " + c.label}</span>
                <span>{c.pricePawly} PAWLY</span>"""
new2 = """                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PetRig pet={{ species: c.species, level: 1, emoji: c.emoji, name: c.label }} size={40} />
                  {c.label}
                </span>
                <span>{c.pricePawly} PAWLY</span>"""
if old2 in t and "PetRig pet={{ species: c.species" not in t:
    t = t.replace(old2, new2, 1)
    print("v0226 shop list patched")
p.write_text(t)
print("ok", p)
