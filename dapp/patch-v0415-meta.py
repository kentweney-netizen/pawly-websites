#!/usr/bin/env python3
"""Apply Pet Hub v0.4.19 myth portraits + feed persist before tsc."""
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

patch_path(src / "petHub.tsx", [
    ("v0.4.14", "v0.4.19"),
    ("v0.4.15", "v0.4.19"),
    ("v0.4.16", "v0.4.19"),
    ("v0.4.17", "v0.4.19"),
    ("v0.4.18", "v0.4.19"),
    ("PAWLY till + Studio (parts + doodle + 0-dec mint).", "PAWLY till + Studio + NFT art + saved feeds."),
    ("PAWLY till + Studio + metadata attach.", "PAWLY till + Studio + NFT art + saved feeds."),
    ("PAWLY till + Studio + on-chain mint retry.", "PAWLY till + Studio + NFT art + saved feeds."),
    ("pet={{ species: p.species, level: Math.max(1, Number(p.level || 1)), emoji: p.emoji, name: p.name }}",
     "pet={{ species: p.species, level: Math.max(1, Number(p.level || 1)), emoji: p.emoji, name: p.name, art: p.art }}"),
    ("pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name }}",
     "pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name, art: p.art }}"),
])

patch_path(src / "petHubLib.ts", [
    ("export type PetRec = { id: string; kind: string; species: string; name: string; emoji: string; hunger: number; health: number; streak: number; pricePawly?: number; sig?: string; feedsTotal?: number; feedsToday?: number; feedDay?: string; level?: number };",
     "export type PetRec = { id: string; kind: string; species: string; name: string; emoji: string; hunger: number; health: number; streak: number; pricePawly?: number; sig?: string; feedsTotal?: number; feedsToday?: number; feedDay?: string; level?: number; art?: string };"),
    ("const STORE_NFT = \"pawly_pet_hub_nft_v1_\";",
     "const STORE_NFT = \"pawly_pet_hub_nft_v1_\";\nconst STORE_FEEDS = \"pawly_pet_hub_feeds_v1_\";"),
    ("type MintNft = { id: string; species: string; name: string; emoji?: string; parents?: string[]; breedSig?: string };",
     "type MintNft = { id: string; species: string; name: string; emoji?: string; parents?: string[]; breedSig?: string; art?: string };\nfunction loadFeeds(w: string): Record<string, { feedsTotal?: number; feedsToday?: number; feedDay?: string; level?: number; art?: string }> {\n  if (!w) return {};\n  try { const raw = localStorage.getItem(STORE_FEEDS + w); const row = raw ? JSON.parse(raw) : {}; return row && typeof row === \"object\" ? row : {}; } catch { return {}; }\n}\nfunction saveFeeds(w: string, list: PetRec[]) {\n  if (!w) return;\n  const row: Record<string, { feedsTotal?: number; feedsToday?: number; feedDay?: string; level?: number; art?: string }> = loadFeeds(w);\n  for (const p of list || []) {\n    if (!p || !p.id) continue;\n    row[p.id] = { feedsTotal: p.feedsTotal, feedsToday: p.feedsToday, feedDay: p.feedDay, level: p.level, art: p.art };\n  }\n  try { localStorage.setItem(STORE_FEEDS + w, JSON.stringify(row)); } catch { /* ignore */ }\n}"),
    ("    keep.push({\n      id: n.id, kind: \"myth\", species: n.species, name: n.name,\n      emoji: n.emoji || \"\\u2728\", hunger: 80, health: 90, streak: 0,\n      feedsTotal: 10, level: 1, sig: n.breedSig,\n    });",
     "    const old = (list || []).find((p) => p && p.id === n.id);\n    const snap = loadFeeds(w)[n.id] || {};\n    keep.push({\n      id: n.id, kind: \"myth\", species: n.species, name: n.name,\n      emoji: n.emoji || \"\\u2728\", hunger: old and old.hunger != null ? old.hunger : 80, health: old and old.health != null ? old.health : 90, streak: old and old.streak != null ? old.streak : 0,\n      feedsTotal: Number((old and old.feedsTotal) if old else None or snap.get('feedsTotal') or 10),\n    });"),
])
print("v0.4.19 patch done")
