#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.16 — robust b64 for Raydium + sponsor (no Failed to decode base64).",
    " * PAWLY Pet Hub v0.2.17 — await txToB64 so Edge gets real base64 not a Promise.",
)
OLD = '''async function txToB64(tx: VersionedTransaction) {
  return bytesToB64(tx.serialize());
}
async function postSponsor(signed: VersionedTransaction, feePawly: number) {
  const r = await fetch(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
    body: JSON.stringify({ transaction: txToB64(signed), feePawly: Math.max(1, feePawly || 1) }),
  });'''
NEW = '''function txToB64(tx: VersionedTransaction) {
  const raw = tx.serialize();
  const u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
  try {
    const Buf = (globalThis as { Buffer?: { from: (a: Uint8Array) => { toString: (e: string) => string } } }).Buffer;
    if (Buf && typeof Buf.from === "function") return Buf.from(u8).toString("base64");
  } catch { /* fall through */ }
  return bytesToB64(u8);
}
async function postSponsor(signed: VersionedTransaction, feePawly: number) {
  const b64 = txToB64(signed);
  const r = await fetch(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
    body: JSON.stringify({ transaction: b64, feePawly: Math.max(1, feePawly || 1) }),
  });'''
if OLD not in t:
    raise SystemExit("postSponsor block missing")
t = t.replace(OLD, NEW, 1)
# also fix payPawlyInHub if it still inlines btoa of serialize without await
p.write_text(t)
print(t.splitlines()[1])
print("awaited field", "transaction: b64" in t)
print("promise leak", "transaction: txToB64(signed)" in t)
