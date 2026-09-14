#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.18 — reload pets on wallet change + recover adopts from till txs.",
    " * PAWLY Pet Hub v0.2.19 — cache RPC, skip heavy recover when roster exists, faster videos.",
)
OLD = '''async function openHubConn() {
  let last = "";
  for (const url of RPCS) {
    try {
      const conn = new Connection(url, "confirmed");
      await conn.getLatestBlockhash();
      return conn;
    } catch (e) {
      last = String((e as { message?: string })?.message || e);
    }
  }
  throw new Error("RPC failed / 节点连不上 " + last);
}'''
NEW = '''let hubConn: Connection | null = null;
let hubConnAt = 0;
async function openHubConn() {
  if (hubConn && Date.now() - hubConnAt < 90000) return hubConn;
  let last = "";
  for (const url of RPCS) {
    try {
      const conn = new Connection(url, "confirmed");
      await conn.getLatestBlockhash();
      hubConn = conn;
      hubConnAt = Date.now();
      return conn;
    } catch (e) {
      last = String((e as { message?: string })?.message || e);
    }
  }
  if (hubConn) return hubConn;
  throw new Error("RPC failed / 节点连不上 " + last);
}'''
if OLD not in t:
    raise SystemExit("openHubConn missing")
t = t.replace(OLD, NEW, 1)
OLD2 = '''async function recoverAdoptsFromChain(w: string): Promise<PetRec[]> {
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
NEW2 = '''async function recoverAdoptsFromChain(w: string): Promise<PetRec[]> {
  if (!w) return [];
  if (loadPets(w).length > 0) return [];
  const conn = await openHubConn();
  const sigs = (await conn.getSignaturesForAddress(new PublicKey(w), { limit: 12 })).filter((s) => !s.err).slice(0, 12);
  const out: PetRec[] = [];
  for (let i = 0; i < sigs.length; i += 4) {
    const chunk = sigs.slice(i, i + 4);
    const txs = await Promise.all(
      chunk.map((s) =>
        conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 }).catch(() => null),
      ),
    );
    for (let j = 0; j < chunk.length; j++) {
      const tx = txs[j];
      if (!tx || !tx.meta) continue;
      const tillIn = uiAmt(tx.meta.postTokenBalances as never, SHOP_TILL, PAWLY_MINT) - uiAmt(tx.meta.preTokenBalances as never, SHOP_TILL, PAWLY_MINT);
      const userOut = uiAmt(tx.meta.preTokenBalances as never, w, PAWLY_MINT) - uiAmt(tx.meta.postTokenBalances as never, w, PAWLY_MINT);
      const catalog = matchCompanion(tillIn) || matchCompanion(userOut);
      if (!catalog) continue;
      out.push({
        id: "onchain_" + chunk[j].signature.slice(0, 12),
        kind: "adopted",
        species: catalog.species,
        name: catalog.label,
        emoji: catalog.emoji,
        hunger: 70,
        health: 80,
        streak: 0,
        pricePawly: catalog.pricePawly,
        sig: chunk[j].signature,
      });
      if (out.length >= PET_SLOT_CAP) return out;
    }
  }
  return out;
}'''
if OLD2 not in t:
    raise SystemExit("recover missing")
t = t.replace(OLD2, NEW2, 1)
OLD3 = '''        <video key={scene} src={asset(CLIP[scene])} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />'''
NEW3 = '''        <video key={scene} src={asset(CLIP[scene])} autoPlay muted loop playsInline preload="metadata" poster="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#0b1220" }} />'''
if OLD3 not in t:
    raise SystemExit("video tag missing")
t = t.replace(OLD3, NEW3, 1)
p.write_text(t)
print(t.splitlines()[1])
print("cache", "hubConnAt" in t)
print("skip local", "loadPets(w).length > 0" in t)
