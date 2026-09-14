#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.8 \u2014 in-hub USDC/USDT/SOL -> Raydium PAWLY -> till.",
    " * PAWLY Pet Hub v0.2.9 \u2014 Raydium inputAccount + user-signed swap then till.",
)
t = t.replace(
    " * PAWLY Pet Hub v0.2.8 — in-hub USDC/USDT/SOL -> Raydium PAWLY -> till.",
    " * PAWLY Pet Hub v0.2.9 — Raydium inputAccount + user-signed swap then till.",
)
old_body = '''  const sr = await fetch("https://transaction-v1.raydium.io/transaction/swap-base-in", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      computeUnitPriceMicroLamports: "100000",
      swapResponse: quote,
      txVersion: "V0",
      wallet: opts.from.toBase58(),
      wrapSol: false,
      unwrapSol: false,
    }),
  });'''
new_body = '''  const inMint = new PublicKey(inputMint);
  const pawlyMint = new PublicKey(PAWLY_MINT);
  const inputAccount = await getAssociatedTokenAddress(inMint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const outputAccount = await getAssociatedTokenAddress(pawlyMint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const inInfo = await opts.conn.getAccountInfo(inputAccount, "confirmed");
  if (!inInfo) throw new Error("No " + opts.coin + " token account / 没有" + opts.coin + "账户");
  const sr = await fetch("https://transaction-v1.raydium.io/transaction/swap-base-in", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      computeUnitPriceMicroLamports: "100000",
      swapResponse: quote,
      txVersion: "V0",
      wallet: opts.from.toBase58(),
      wrapSol: false,
      unwrapSol: false,
      inputAccount: inputAccount.toBase58(),
      outputAccount: outputAccount.toBase58(),
    }),
  });'''
if old_body not in t:
    raise SystemExit("swap POST body missing")
t = t.replace(old_body, new_body, 1)
old_send = '''  const tx = VersionedTransaction.deserialize(b64ToBytes(bag[0]));
  let sig = "";
  if (typeof opts.signTransaction === "function") {
    try { sig = await postSponsor(await opts.signTransaction(tx), 1); } catch { sig = ""; }
  }
  if (!sig) sig = await opts.sendTransaction(tx, opts.conn);'''
new_send = '''  const tx = VersionedTransaction.deserialize(b64ToBytes(bag[0]));
  let sig = "";
  try {
    sig = await opts.sendTransaction(tx, opts.conn);
  } catch (e1) {
    if (typeof opts.signTransaction === "function") {
      const signed = await opts.signTransaction(tx);
      try {
        sig = await opts.conn.sendRawTransaction(signed.serialize(), { skipPreflight: true, maxRetries: 3 });
      } catch {
        try { sig = await postSponsor(signed, 1); } catch { sig = ""; }
      }
    }
    if (!sig) throw e1;
  }'''
if old_send not in t:
    raise SystemExit("swap send block missing")
t = t.replace(old_send, new_send, 1)
p.write_text(t)
print("ok", t.splitlines()[1])
print("inputAccount", "inputAccount: inputAccount.toBase58()" in t)
print("sendRaw", "sendRawTransaction" in t)
