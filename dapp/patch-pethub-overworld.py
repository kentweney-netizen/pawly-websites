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
    'import { PetRig, PET_RIG_CSS } from "./petAvatar";\nimport { GameHud, StreetHotspots } from "./petHubWorld";',
    "import world",
)
once(
    '<video key={scene} src={asset(CLIP[scene])} autoPlay muted loop playsInline preload="metadata" poster="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#0b1220" }} />',
    '''<video key={scene} src={asset(CLIP[scene])} autoPlay muted loop playsInline preload="metadata" poster="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#0b1220" }} />
        {scene === "street" ? (
          <StreetHotspots onEnter={(id) => { setScene(id); setShopView("home"); setDesk && setDesk(""); setNote(""); }} />
        ) : null}''',
    "hotspots",
)

# If setDesk not in source yet, strip the setDesk call
if "const [desk" not in t:
    t = t.replace('setDesk && setDesk(""); ', "")
    print("no desk yet, stripped")

once(
    '''      <div style={{ flex: "0 0 auto", padding: "calc(env(safe-area-inset-top, 16px) + 22px) 10px 8px" }}>
        <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 15 }}>{TITLE[scene]}</div>
        <div style={{ color: "#8aa", fontSize: 11, margin: "2px 0 8px" }}>{hint}</div>
        <button type="button" style={{ ...ghost, width: "100%", minHeight: 42, fontSize: 13 }} onClick={() => setMusic((v) => !v)}>
          {music ? "BGM on · tap to mute" : "BGM off · tap for scene music"}
        </button>
      </div>''',
    '''      <div style={{ flex: "0 0 auto", padding: "calc(env(safe-area-inset-top, 16px) + 8px) 0 0" }}>
        <GameHud
          hint={hint}
          scene={scene}
          desk={typeof desk === "string" ? desk : ""}
          music={music}
          onMusic={() => setMusic((v) => !v)}
          onStreet={() => { setScene("street"); setShopView("home"); setNote(""); if (typeof setDesk === "function") setDesk(""); }}
          onDesk={(d) => { if (typeof setDesk === "function") setDesk(d); setNote(""); }}
          onHome={() => navigate("/")}
        />
      </div>''',
    "hud header",
)

once(
    '''        <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 8 }}>
          <button type="button" onClick={() => { setScene("street"); setShopView("home"); setNote(""); }} style={{ ...ghost, flex: "0 0 auto", background: scene === "street" ? "rgba(0,255,157,0.28)" : ghost.background }}>Street</button>
          {SHOPS.map((s) => (
            <button key={s.id} type="button" onClick={() => { setScene(s.id); setShopView("home"); setNote(""); }} style={{ ...ghost, flex: "0 0 auto", background: scene === s.id ? "rgba(0,255,157,0.28)" : ghost.background }}>
              {s.label}
            </button>
          ))}
        </div>''',
    "",
    "remove chip bar",
)

p.write_text(t)
print("ok", p)
