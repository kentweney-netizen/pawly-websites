#!/usr/bin/env python3
from pathlib import Path
p = Path(__file__).resolve().parent / "src" / "petHub.tsx"
t = p.read_text()
old = """        {greet && pets.length ? (
          <div style={{ position: \"absolute\", inset: 0, pointerEvents: \"none\", overflow: \"hidden\" }}>
            {pets.slice(0, 4).map((p, i) => (
              <div key={p.id} className={\"pawly-run pawly-run-\" + (i % 3)} style={{ position: \"absolute\", bottom: 18 + i * 10, left: 8 + i * 18 }}>
                <div className=\"pawly-bubble\">{i % 2 === 0 ? \"Hug me!\" : \"Snack please!\"}</div>
                <div className=\"pawly-pet\">{p.emoji}</div>
                <div style={{ fontSize: 10, color: \"#fff\", textShadow: \"0 1px 2px #000\", textAlign: \"center\" }}>{p.name}</div>
              </div>
            ))}
          </div>
        ) : null}"""
new = """        {scene === \"street\" ? (
          <div style={{ position: \"absolute\", inset: 0, pointerEvents: \"none\", overflow: \"hidden\", zIndex: 6 }}>
            {pets.filter((p) => Number(p.level || 0) >= 1).slice(0, 4).map((p, i) => (
              <div key={p.id} className={\"pawly-stroll pawly-stroll-\" + (i % 4)}>
                <PetRig pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name }} size={64} moving />
              </div>
            ))}
          </div>
        ) : null}"""
if old in t:
    t = t.replace(old, new, 1)
    print("walkers from greet overlay")
elif "pawly-stroll pawly-stroll-" in t and "size={64} moving" in t:
    print("walkers already")
elif "pets.filter((p) => Number((p as { level?: number }).level || 0) >= 1)" in t:
    t = t.replace("size={52} moving", "size={64} moving")
    t = t.replace("size={56} moving", "size={64} moving")
    print("walkers size bumped")
else:
    raise SystemExit("walkers target missing")
p.write_text(t)
print("ok", p)
