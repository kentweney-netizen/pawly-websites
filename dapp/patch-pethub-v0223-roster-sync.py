#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.22 — Jupiter/local-key: partial-sign only, rewrite rent to sponsor, hop2 if PAWLY arrived.",
    " * PAWLY Pet Hub v0.2.23 — roster follows Solana address via Supabase + merge feeds across wallets.",
)

OLD_SAVE = '''function savePets(w: string, list: PetRec[]) {
  if (!w) return;
  try {
    localStorage.setItem(STORE + w, JSON.stringify(list.slice(0, PET_SLOT_CAP)));
  } catch {
    /* ignore quota */
  }
}
function mergePetLists(a: PetRec[], b: PetRec[]): PetRec[] {
  const seen = new Set<string>();
  const out: PetRec[] = [];
  for (const p of [...a, ...b]) {
    if (!p) continue;
    const k = p.sig && p.sig.length > 20 ? p.sig : p.id;
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(p);
    if (out.length >= PET_SLOT_CAP) break;
  }
  return out;
}'''

NEW_SAVE = '''function petMergeKey(p: PetRec) {
  if (p.sig && String(p.sig).length > 20) return "sig:" + p.sig;
  return "sp:" + String(p.species || "") + ":" + String(p.name || p.id || "");
}
function pickRicherPet(a: PetRec, b: PetRec): PetRec {
  const fa = Number(a.feedsTotal || 0);
  const fb = Number(b.feedsTotal || 0);
  const richer = fb > fa ? b : a;
  const other = richer === a ? b : a;
  const total = Math.max(fa, fb);
  return {
    ...other,
    ...richer,
    feedsTotal: total,
    feedsToday: Math.max(Number(a.feedsToday || 0), Number(b.feedsToday || 0)),
    feedDay: richer.feedDay || other.feedDay,
    level: Math.max(Number(a.level || 0), Number(b.level || 0), Math.floor(total / 10)),
    sig: (richer.sig && String(richer.sig).length > 20 ? richer.sig : other.sig),
  };
}
function savePets(w: string, list: PetRec[]) {
  if (!w) return;
  const clipped = list.slice(0, PET_SLOT_CAP);
  try {
    localStorage.setItem(STORE + w, JSON.stringify(clipped));
  } catch {
    /* ignore quota */
  }
  void pushCloudPets(w, clipped);
}
function mergePetLists(a: PetRec[], b: PetRec[]): PetRec[] {
  const map = new Map<string, PetRec>();
  for (const p of [...a, ...b]) {
    if (!p) continue;
    const k = petMergeKey(p);
    if (!k) continue;
    const prev = map.get(k);
    map.set(k, prev ? pickRicherPet(prev, p) : p);
  }
  return Array.from(map.values()).slice(0, PET_SLOT_CAP);
}
async function pullCloudPets(w: string): Promise<PetRec[]> {
  if (!w) return [];
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/pet_hub_roster?wallet=eq." + encodeURIComponent(w) + "&select=pets", {
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
    });
    const rows = (await r.json()) as { pets?: PetRec[] }[];
    const list = rows && rows[0] && Array.isArray(rows[0].pets) ? rows[0].pets : [];
    return list.filter((p) => p && (p.id || p.sig));
  } catch {
    return [];
  }
}
async function pushCloudPets(w: string, list: PetRec[]) {
  if (!w) return;
  try {
    await fetch(SUPABASE_URL + "/rest/v1/pet_hub_roster", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ wallet: w, pets: list.slice(0, PET_SLOT_CAP), updated_at: new Date().toISOString() }),
    });
  } catch {
    /* table missing or offline — local still works */
  }
}'''

if OLD_SAVE not in t:
    raise SystemExit("save/merge block missing")
t = t.replace(OLD_SAVE, NEW_SAVE, 1)

OLD_REC = '''  if (!w) return [];
  if (loadPets(w).length > 0) return [];
  const conn = await openHubConn();'''
NEW_REC = '''  if (!w) return [];
  const conn = await openHubConn();'''
if OLD_REC not in t:
    raise SystemExit("recover skip missing")
t = t.replace(OLD_REC, NEW_REC, 1)

OLD_FX = '''    const local = mergePetLists(loadPets(addr), petsFromLedger(addr));
    setPets(local);
    if (local.length) savePets(addr, local);
    let live = true;
    void recoverAdoptsFromChain(addr)
      .then((chain) => {
        if (!live) return;
        setPets((prev) => {
          const next = mergePetLists(prev, chain);
          savePets(addr, next);
          return next;
        });
      })
      .catch(() => {
        /* keep local roster */
      });'''
NEW_FX = '''    const local = mergePetLists(loadPets(addr), petsFromLedger(addr));
    setPets(local);
    let live = true;
    void pullCloudPets(addr).then((cloud) => {
      if (!live) return;
      setPets((prev) => {
        const next = mergePetLists(prev, cloud);
        savePets(addr, next);
        return next;
      });
    });
    void recoverAdoptsFromChain(addr)
      .then((chain) => {
        if (!live) return;
        setPets((prev) => {
          const next = mergePetLists(prev, chain);
          savePets(addr, next);
          return next;
        });
      })
      .catch(() => {
        /* keep local + cloud roster */
      });'''
if OLD_FX not in t:
    raise SystemExit("effect missing")
t = t.replace(OLD_FX, NEW_FX, 1)

p.write_text(t)
print(t.splitlines()[1])
print("cloud", "pullCloudPets" in t and "pushCloudPets" in t)
print("no skip", "loadPets(w).length > 0" not in t)
