#!/usr/bin/env python3
"""v0.4.20: title + stall market links + myth portraits."""
from pathlib import Path
root = Path(__file__).resolve().parent
src = root / "src"
if not src.exists():
    src = Path("dapp/src")

def patch_path(p: Path, pairs):
    if not p.exists():
        print("skip missing", p)
        return
    t = p.read_text()
    orig = t
    for a, b in pairs:
        t = t.replace(a, b)
    if t != orig:
        p.write_text(t)
        print("patched", p)
    else:
        print("no change", p)

VER = "v0.4.20"
patch_path(src / "petHub.tsx", [
    ("v0.4.14", VER),
    ("v0.4.15", VER),
    ("v0.4.16", VER),
    ("v0.4.17", VER),
    ("v0.4.18", VER),
    ("v0.4.19", VER),
    ("pet={{ species: p.species, level: Math.max(1, Number(p.level || 1)), emoji: p.emoji, name: p.name }}",
     "pet={{ species: p.species, level: Math.max(1, Number(p.level || 1)), emoji: p.emoji, name: p.name, art: p.art }}"),
    ("pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name }}",
     "pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name, art: p.art }}"),
])

patch_path(src / "petHubLib.ts", [
    ("feedDay?: string; level?: number };",
     "feedDay?: string; level?: number; art?: string };"),
])

patch_path(src / "petHubStalls.tsx", [
    ('import { StudioPanel } from "./petHubStudio";',
     'import { StudioPanel } from "./petHubStudio";\nimport { mintHubNft } from "./petHubMintOnchain";\nimport { marketLinks } from "./petHubMeta";'),
    ("          const loc = store.myNfts.find((x) => x.id === n.id);\n          return loc && loc.art && !n.art ? { ...n, art: loc.art } : n;",
     "          const loc = store.myNfts.find((x) => x.id === n.id);\n          if (!loc) return n;\n          return { ...n, art: n.art || loc.art, mint: n.mint || loc.mint, memoSig: n.memoSig || loc.memoSig };"),
    ('                <div style={{ fontSize: 10, color: "#9f8" }}>{"g" + Number(n.gen || 1) + " \\u00b7 " + priceLabel(n)}</div>\n              </div>\n              {n.listed',
     '                <div style={{ fontSize: 10, color: "#9f8" }}>{"g" + Number(n.gen || 1) + " \\u00b7 " + priceLabel(n)}</div>\n                {n.mint ? (\n                  <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>\n                    {marketLinks(n.mint).map((l) => (\n                      <button key={l.label} type="button" style={{ ...tiny, padding: "2px 6px", fontSize: 9 }} onClick={() => window.open(l.href, "_blank")}>{l.label}</button>\n                    ))}\n                  </div>\n                ) : null}\n              </div>\n              {!n.mint\n                ? <button type="button" style={tiny} disabled={props.busy} onClick={() => void (async () => {\n                    if (!props.wallet.publicKey) { props.setNote("Connect wallet in dApp first"); return; }\n                    props.setBusy(true); props.setNote("Retry mint — no extra PAWLY");\n                    try {\n                      const on = await mintHubNft({\n                        owner: props.wallet.publicKey,\n                        label: nftSpriteName(n),\n                        paySig: n.breedSig || n.memoSig || n.id,\n                        species: n.species,\n                        source: (n.source === "studio" ? "studio" : "breed"),\n                        wallet: props.wallet as never,\n                        signTransaction: props.wallet.signTransaction,\n                      });\n                      flush(s.myStall, s.myNfts.map((x) => x.id === n.id ? { ...x, mint: on.mint, memoSig: on.sig } : x));\n                      props.setLastSig(on.sig); props.setNote("Mint live " + on.mint);\n                    } catch (e) {\n                      const extra = e as { mint?: string; sig?: string; message?: string };\n                      if (extra && extra.mint) {\n                        flush(s.myStall, s.myNfts.map((x) => x.id === n.id ? { ...x, mint: extra.mint, memoSig: extra.sig || x.memoSig } : x));\n                      }\n                      props.setNote(String(extra && extra.message || e));\n                    } finally { props.setBusy(false); }\n                  })()}>Retry mint</button>\n                : n.listed'),
])

print("v0.4.20 patch done")
