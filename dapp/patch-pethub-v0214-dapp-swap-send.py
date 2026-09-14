#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.13 — do not re-pass confirmed; Connection already confirmed.",
    " * PAWLY Pet Hub v0.2.14 — Hub USDC/USDT/SOL = dApp Swap then Payment to till.",
)
OLD_SEND = '''  if (typeof opts.signTransaction === "function") {
    try {
      return await sponsorize();
    } catch (e1) {
      try {
        const signed = await opts.signTransaction(opts.tx);
        return await opts.conn.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 4,
        });
      } catch {
        throw e1;
      }
    }
  }
  return await opts.sendTransaction(opts.tx, opts.conn);'''
NEW_SEND = '''  if (typeof opts.signTransaction === "function") {
    try {
      return await sponsorize();
    } catch (e1) {
      try {
        return await opts.sendTransaction(opts.tx, opts.conn);
      } catch (e2) {
        try {
          const signed = await opts.signTransaction(opts.tx);
          return await opts.conn.sendRawTransaction(signed.serialize(), { maxRetries: 4 });
        } catch {
          throw e1;
        }
      }
    }
  }
  return await opts.sendTransaction(opts.tx, opts.conn);'''
if OLD_SEND not in t:
    raise SystemExit("send tail missing")
t = t.replace(OLD_SEND, NEW_SEND, 1)
OLD_A = '''async function assertOnchainSuccess(conn: Connection, sig: string) {
  const s = String(sig || "").trim();
  if (s.length < 64) throw new Error("No on-chain signature / 没有链上签名");
  let last = "";
  for (let i = 0; i < 24; i++) {
    const res = await conn.getSignatureStatuses([s], { searchTransactionHistory: true });
    const st = res?.value?.[0];
    if (st) {
      if (st.err) throw new Error("Transaction failed on-chain / 链上失败");
      if (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized" || st.confirmationStatus === "processed") {
        if (st.confirmationStatus !== "processed") return;
        last = "processed";
      } else last = String(st.confirmationStatus || "");
    } else last = "pending";
    await new Promise((r) => setTimeout(r, 900));
  }
  let tx = await conn.getTransaction(s, { maxSupportedTransactionVersion: 0 });
  if (!tx) tx = await conn.getTransaction(s, { maxSupportedTransactionVersion: 0 });
  if (tx?.meta?.err) throw new Error("Transaction failed on-chain / 链上失败");
  if (!tx && last !== "processed") throw new Error("Signature not confirmed / 签名未上链 " + last);
}'''
NEW_A = '''async function assertOnchainSuccess(conn: Connection, sig: string) {
  const s = String(sig || "").trim();
  if (s.length < 64) throw new Error("No on-chain signature / 没有链上签名");
  try {
    const latest = await conn.getLatestBlockhash();
    await conn.confirmTransaction({
      signature: s,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    });
  } catch { /* status poll below */ }
  const res = await conn.getSignatureStatuses([s], { searchTransactionHistory: true });
  const st = res?.value?.[0];
  if (st && st.err) throw new Error("Transaction failed on-chain / 链上失败");
  if (st && st.confirmationStatus) return;
  const tx = await conn.getTransaction(s, { maxSupportedTransactionVersion: 0 });
  if (tx?.meta?.err) throw new Error("Transaction failed on-chain / 链上失败");
  if (!tx) throw new Error("Signature not confirmed / 签名未上链");
}'''
if OLD_A not in t:
    print("assert not exact, left as-is")
else:
    t = t.replace(OLD_A, NEW_A, 1)
    print("assert replaced")
p.write_text(t)
print(t.splitlines()[1])
print("preflightCommitment left", "preflightCommitment" in t)
