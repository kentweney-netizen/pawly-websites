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
    'import { PetRig, PET_RIG_CSS } from "./petAvatar";\nimport { LandHotbar, LandHud, LandPlots } from "./petHubLand";\nimport { loadNfts } from "./petHubGameFi";',
    "land imports",
)

once(
    '<div style={{ height: "100dvh", maxHeight: "100dvh", overflow: "hidden", background: "#070b10", color: "#e8eef7", display: "flex", flexDirection: "column", position: "relative", maxWidth: 430, margin: "0 auto", paddingBottom: "env(safe-area-inset-bottom)" }}>',
    '<div style={{ height: "100dvh", maxHeight: "100dvh", overflow: "hidden", background: "#2b1d14", color: "#f4e1c1", display: "flex", flexDirection: "column", position: "relative", maxWidth: 430, margin: "0 auto", paddingBottom: "env(safe-area-inset-bottom)" }}>',
    "wood shell",
)

# Prefer land plots over older hotspots if present
once(
    "{scene === \"street\" ? (\n          <StreetHotspots onEnter={(id) => { setScene(id); setShopView(\"home\"); setDesk && setDesk(\"\"); setNote(\"\"); }} />\n        ) : null}",
    '{scene === "street" ? <LandPlots onEnter={(id) => { setScene(id); setShopView("home"); setNote(""); }} /> : null}',
    "plots over hotspots",
)

if "LandPlots" not in t and "<video key={scene}" in t:
    t = t.replace(
        "<video key={scene}",
        '{scene === "street" ? <LandPlots onEnter={(id) => { setScene(id); setShopView("home"); setNote(""); }} /> : null}\n        <video key={scene}',
        1,
    )
    print("plots injected before video")

once(
    "      <div style={{ flex: \"0 0 auto\", zIndex: 2, padding: \"8px 8px 10px\", background: \"#070b10\", maxHeight: \"46dvh\", overflowY: \"auto\" }}>",
    '''      <LandHotbar pets={pets} focusId={focusId} onFocus={(id) => { setFocusId(id); setFeedWarn(true); }} />
      <div style={{ flex: "0 0 auto", zIndex: 2, padding: "8px 8px 10px", background: "#2b1d14", maxHeight: "38dvh", overflowY: "auto" }}>''',
    "hotbar",
)

p.write_text(t)
print("ok", p)
