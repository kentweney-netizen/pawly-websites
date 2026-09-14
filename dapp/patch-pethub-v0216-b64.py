#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.15 — both hops fee payer = hot wallet only; no user-SOL fallback.",
    " * PAWLY Pet Hub v0.2.16 — robust b64 for Raydium + sponsor (no Failed to decode base64).",
)
OLD_B = '''function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}'''
NEW_B = '''function b64ToBytes(b64: string) {
  let s = String(b64 || "").trim();
  const comma = s.indexOf(",");
  if (s.slice(0, 5) === "data:" && comma >= 0) s = s.slice(comma + 1);
  s = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(raw: Uint8Array) {
  const u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
  let s = "";
  for (let i = 0; i < u8.length; i += 8192) {
    s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 8192)));
  }
  return btoa(s);
}'''
if OLD_B not in t:
    raise SystemExit("b64ToBytes missing")
t = t.replace(OLD_B, NEW_B, 1)
OLD_T = '''async function txToB64(tx: VersionedTransaction) {
  const rawBytes = tx.serialize();
  try { return btoa(String.fromCharCode.apply(null, Array.from(rawBytes))); }
  catch {
    let s = "";
    for (let i = 0; i < rawBytes.length; i++) s += String.fromCharCode(rawBytes[i]);
    return btoa(s);
  }
}'''
NEW_T = '''async function txToB64(tx: VersionedTransaction) {
  return bytesToB64(tx.serialize());
}'''
if OLD_T not in t:
    raise SystemExit("txToB64 missing")
t = t.replace(OLD_T, NEW_T, 1)
OLD_D = '''  const tx = VersionedTransaction.deserialize(b64ToBytes(bag[0]));'''
NEW_D = '''  let tx: VersionedTransaction | null = null;
  let lastB64 = "";
  for (let i = 0; i < bag.length; i++) {
    try {
      lastB64 = "";
      tx = VersionedTransaction.deserialize(b64ToBytes(bag[i]));
      break;
    } catch (e) {
      lastB64 = String((e && (e as Error).message) || e);
    }
  }
  if (!tx) throw new Error(lastB64 || "Raydium tx decode failed / 兑换交易解析失败");'''
if OLD_D not in t:
    raise SystemExit("deserialize line missing")
t = t.replace(OLD_D, NEW_D, 1)
p.write_text(t)
print(t.splitlines()[1])
print("bytesToB64", "function bytesToB64" in t)
