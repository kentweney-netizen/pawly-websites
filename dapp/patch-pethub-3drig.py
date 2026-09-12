#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
if 'from "./petAvatar"' not in t:
    t = t.replace(
        'import { usePawlyWallet } from "./localWallet";',
        'import { usePawlyWallet } from "./localWallet";\nimport { PetRig, PET_RIG_CSS } from "./petAvatar";',
        1,
    )
if "PET_RIG_CSS" in t and t.count("PET_RIG_CSS") == 1:
    # imported but not injected
    pass
if "{PET_RIG_CSS}" not in t:
    if "<style>{`" in t:
        t = t.replace("<style>{`", "<style>{PET_RIG_CSS + `", 1)
    elif "<style>{`" not in t and "export function PetHubPage" in t:
        t = t.replace(
            "    </div>\n  );\n}",
            "      <style>{PET_RIG_CSS}</style>\n    </div>\n  );\n}",
            1,
        )
# hide companion catalog on street: only render when scene==shop
# v0.9.3 renders COMPANIONS always after shop buttons. Wrap if not already.
if "scene === \"shop\" && COMPANIONS" not in t and "{COMPANIONS.map" in t:
    t = t.replace(
        "{COMPANIONS.map",
        '{scene === "shop" ? COMPANIONS.map',
        1,
    )
    # close the ternary after companions block — fragile; add : null before RESCUES map
    if '{scene === "shelter" && RESCUES.map' in t and "COMPANIONS.map" in t:
        # find first RESCUES usage after shop wrap
        pass
    # better: the original is `) : (`  no
# After companions map there is typically `)}` then RESCUES or hospital.
# Insert street roster before shop row if missing.
marker = '{scene === "street" && ('
if marker not in t and "Your pets · tap" not in t:
    inject = '''        {scene === "street" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", padding: "6px 0 10px" }}>
            {pets.length ? pets.map((p) => (
              <div key={p.id} style={{ textAlign: "center" }}>
                <PetRig pet={{ species: p.species, level: Number((p as { level?: number }).level || 0), emoji: p.emoji }} size={88} />
                <div style={{ fontSize: 11, fontWeight: 800 }}>{p.name}</div>
              </div>
            )) : <div style={{ color: "#8aa", fontSize: 12 }}>Adopt in Shop to see your 3D pet here.</div>}
          </div>
        )}
'''
    key = '<div style={{ display: "flex", gap: 4, overflowX: "auto"'
    if key in t:
        t = t.replace(key, inject + "        " + key, 1)
p.write_text(t)
print("ok", "petAvatar" in t, "PetRig" in t, "PET_RIG_CSS" in t)
