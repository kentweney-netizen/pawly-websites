#!/usr/bin/env python3
from pathlib import Path
p = Path(__file__).resolve().parent / "src" / "petHub.tsx"
t = p.read_text()

def once(old, new, label):
    global t
    if old in t:
        t = t.replace(old, new, 1)
        print(label)
    else:
        print("skip", label)

once(
    'import { PetRig, PET_RIG_CSS } from "./petAvatar";',
    'import { PetRig, PET_RIG_CSS } from "./petAvatar";\nimport { PetHubGameScreen } from "./petHubGameScreen";',
    "import screen",
)

old_video = '''<video key={scene} src={asset(CLIP[scene])} autoPlay muted loop playsInline preload="metadata" poster="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#0b1220" }} />
        {greet && pets.length ? (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            {pets.slice(0, 4).map((p, i) => (
              <div key={p.id} className={"pawly-run pawly-run-" + (i % 3)} style={{ position: "absolute", bottom: 18 + i * 10, left: 8 + i * 18 }}>
                <div className="pawly-bubble">{i % 2 === 0 ? "Hug me!" : "Snack please!"}</div>
                <div className="pawly-pet">{p.emoji}</div>
                <div style={{ fontSize: 10, color: "#fff", textShadow: "0 1px 2px #000", textAlign: "center" }}>{p.name}</div>
              </div>
            ))}
          </div>
        ) : null}'''

new_video = '''<PetHubGameScreen scene={scene} pets={pets} onEnter={(id) => { setScene(id); setShopView("home"); setNote(""); }} />'''

once(old_video, new_video, "replace video+greet")

if "<video key={scene}" in t and "PetHubGameScreen" in t:
    # leftover video after other patches
    start = t.find("<video key={scene}")
    end = t.find("/>", start)
    if start >= 0 and end > start:
        t = t[:start] + "" + t[end + 2:]
        print("stripped leftover video")

p.write_text(t)
if "<video key={scene}" in t:
    raise SystemExit("video still present")
print("ok", p)
