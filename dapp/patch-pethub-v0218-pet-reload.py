#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.17 — await txToB64 so Edge gets real base64 not a Promise.",
    " * PAWLY Pet Hub v0.2.18 — reload pets on wallet change + recover adopts from till txs.",
)
OLD = '''function loadPets(w: string): PetRec[] {
  try {
    const raw = localStorage.getItem(STORE + (w || "guest"));
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return (list as PetRec[]).filter((p) => p && typeof p.sig === "string" && p.sig.length > 40);
  } catch {
    return [];
  }
}
function savePets(w: string, list: PetRec[]) {
  localStorage.setItem(STORE + (w || "guest"), JSON.stringify(list));
}'''
NEW = '''function loadPets(w: string): PetRec[] {
  if (!w) return [];
  try {
    const raw = localStorage.getItem(STORE + w);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return (list as PetRec[]).filter((p) => p && (p.id || (typeof p.sig === "string" && p.sig.length > 20)));
  } catch {
    return [];
  }
}
function savePets(w: string, list: PetRec[]) {
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
}
function petsFromLedger(w: string): PetRec[] {
  if (!w) return [];
  try {
    const raw = localStorage.getItem(LEDGER + w);
    const list = raw ? (JSON.parse(raw) as Record<string, string | number>[]) : [];
    if (!Array.isArray(list)) return [];
    const out: PetRec[] = [];
    for (const row of list) {
      const kind = String(row.kind || "");
      const title = String(row.title || "");
      if (kind !== "adopt" && !/^adopt\s+/i.test(title)) continue;
      const sig = String(row.sig || "");
      const amount = Number(row.amount || 0);
      const hit = COMPANIONS.find((c) => Math.abs(c.pricePawly - amount) < 1.2) || COMPANIONS[0];
      out.push({
        id: "led_" + (sig.slice(0, 12) || String(row.t || out.length)),
        kind: "adopted",
        species: hit.species,
        name: hit.label,
        emoji: hit.emoji,
        hunger: 70,
        health: 80,
        streak: 0,
        pricePawly: hit.pricePawly,
        sig,
      });
    }
    return out;
  } catch {
    return [];
  }
}
function matchCompanion(amount: number) {
  if (!(amount > 0)) return null;
  return COMPANIONS.find((c) => Math.abs(c.pricePawly - amount) < 1.2) || null;
}
function uiAmt(
  arr: { owner?: string; mint?: string; uiTokenAmount?: { uiAmount?: number | null; uiAmountString?: string } }[] | undefined,
  owner: string,
  mint: string,
) {
  let n = 0;
  for (const b of arr || []) {
    if (b.owner === owner && b.mint === mint) n = Number(b.uiTokenAmount?.uiAmountString || b.uiTokenAmount?.uiAmount || 0);
  }
  return n;
}
async function recoverAdoptsFromChain(w: string): Promise<PetRec[]> {
  if (!w) return [];
  const conn = await openHubConn();
  const sigs = await conn.getSignaturesForAddress(new PublicKey(w), { limit: 40 });
  const out: PetRec[] = [];
  for (const s of sigs) {
    if (s.err) continue;
    const tx = await conn.getParsedTransaction(s.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    if (!tx || !tx.meta) continue;
    const tillIn = uiAmt(tx.meta.postTokenBalances as never, SHOP_TILL, PAWLY_MINT) - uiAmt(tx.meta.preTokenBalances as never, SHOP_TILL, PAWLY_MINT);
    const userOut = uiAmt(tx.meta.preTokenBalances as never, w, PAWLY_MINT) - uiAmt(tx.meta.postTokenBalances as never, w, PAWLY_MINT);
    const catalog = matchCompanion(tillIn) || matchCompanion(userOut);
    if (!catalog) continue;
    out.push({
      id: "onchain_" + s.signature.slice(0, 12),
      kind: "adopted",
      species: catalog.species,
      name: catalog.label,
      emoji: catalog.emoji,
      hunger: 70,
      health: 80,
      streak: 0,
      pricePawly: catalog.pricePawly,
      sig: s.signature,
    });
    if (out.length >= PET_SLOT_CAP) break;
  }
  return out;
}'''
if OLD not in t:
    raise SystemExit("loadPets block missing")
t = t.replace(OLD, NEW, 1)
OLD2 = '''  useEffect(() => {
    setGreet(true);
    const id = window.setTimeout(() => setGreet(false), 9000);
    return () => window.clearTimeout(id);
  }, [addr]);'''
NEW2 = '''  useEffect(() => {
    setGreet(true);
    const id = window.setTimeout(() => setGreet(false), 9000);
    return () => window.clearTimeout(id);
  }, [addr]);
  useEffect(() => {
    if (!addr) {
      setPets([]);
      return;
    }
    const local = mergePetLists(loadPets(addr), petsFromLedger(addr));
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
      });
    return () => {
      live = false;
    };
  }, [addr]);'''
if OLD2 not in t:
    raise SystemExit("addr greet effect missing")
t = t.replace(OLD2, NEW2, 1)
p.write_text(t)
print(t.splitlines()[1])
print("recover", "recoverAdoptsFromChain" in t)
print("guest key gone from save", 'STORE + (w || "guest")' not in t)
