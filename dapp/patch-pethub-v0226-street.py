#!/usr/bin/env python3
"""v0.2.27: street overlay uses real level so Lv0 stays a head."""
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
