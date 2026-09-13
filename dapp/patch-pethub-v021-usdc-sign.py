#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
start = t.find("async function sponsorOrSend")
end = t.find("async function payPawlyInHub")
if start < 0 or end < 0:
    raise SystemExit("anchors missing %s %s" % (start, end))
NEW = '''async function txToB64(tx: VersionedTransaction) {
  const rawBytes = tx.serialize();
  try { return btoa(String.fromCharCode.apply(null, Array.from(rawBytes))); }
  catch {
    let s = "";
    for (let i = 0; i < rawBytes.length; i++) s += String.fromCharCode(rawBytes[i]);
    return btoa(s);
  }
}
async function postSponsor(signed: VersionedTransaction, feePawly: number) {
  const r = await fetch(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
    body: JSON.stringify({ transaction: txToB64(signed), feePawly: Math.max(1, feePawly || 1) }),
  });
  const d = (await r.json().catch(() => ({}))) as { signature?: string; error?: string };
  if (r.ok && d.signature) return String(d.signature);
  throw new Error(String(d.error || ("Sponsor HTTP " + r.status)));
}
async function payHubToken(opts: {
  from: PublicKey;
  pawlyList: number;
  coin: PayCoin;
  coinAmount: number;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}): Promise<string> {
  const till = new PublicKey(SHOP_TILL);
  const sponsor = new PublicKey(SPONSOR);
  if (opts.from.equals(till)) throw new Error("Shop till is this wallet / 不能付给自己");
  if (opts.coinAmount <= 0) throw new Error("No live price / 拉不到价，改用 PAWLY");
  const conn = await openHubConn();
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const buildIxs = (ataPayer: PublicKey) => {
    if (opts.coin === "SOL") {
      const lamports = Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL));
      return [SystemProgram.transfer({ fromPubkey: opts.from, toPubkey: till, lamports })];
    }
    const mintStr = opts.coin === "USDC" ? USDC_MINT : opts.coin === "USDT" ? USDT_MINT : PAWLY_MINT;
    const mint = new PublicKey(mintStr);
    const rawAmt = Math.round(opts.coinAmount * Math.pow(10, 6));
    if (rawAmt <= 0) throw new Error("Amount too small / 金额太小");
    const fromAta = PublicKey.default;
    return { mint, rawAmt, ataPayer };
  };
  const mintStr = opts.coin === "SOL" ? "" : opts.coin === "USDC" ? USDC_MINT : opts.coin === "USDT" ? USDT_MINT : PAWLY_MINT;
  const ixsFor = async (ataPayer: PublicKey) => {
    if (opts.coin === "SOL") {
      const lamports = Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL));
      return [SystemProgram.transfer({ fromPubkey: opts.from, toPubkey: till, lamports })];
    }
    const mint = new PublicKey(mintStr);
    const rawAmt = Math.round(opts.coinAmount * Math.pow(10, 6));
    if (rawAmt <= 0) throw new Error("Amount too small / 金额太小");
    const fromAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const toAta = await getAssociatedTokenAddress(mint, till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    return [
      createAssociatedTokenAccountIdempotentInstruction(ataPayer, toAta, till, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
      createTransferCheckedInstruction(fromAta, mint, toAta, opts.from, rawAmt, 6, [], TOKEN_PROGRAM_ID),
    ];
  };
  const compile = async (payerKey: PublicKey) => {
    const ixs = await ixsFor(payerKey);
    const msg = new TransactionMessage({ payerKey, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message();
    return new VersionedTransaction(msg);
  };
  try {
    const tx = await compile(sponsor);
    if (typeof opts.signTransaction !== "function") throw new Error("Wallet cannot sign / 钱包无法签名");
    const signed = await opts.signTransaction(tx);
    const sig = await postSponsor(signed, 1);
    await assertOnchainSuccess(conn, sig);
    return sig;
  } catch (e1) {
    const tx = await compile(opts.from);
    const sig = await opts.sendTransaction(tx, conn);
    await assertOnchainSuccess(conn, sig);
    return sig;
  }
}
'''
t = t[:start] + NEW + t[end:]
t = t.replace(
    " * PAWLY Pet Hub v0.2.1 — multi RPC fallback for checkout.",
    " * PAWLY Pet Hub v0.2.2 — USDC/USDT/SOL sponsor+user fallback.",
)
p.write_text(t)
print("ok", "v0.2.2" in t, "postSponsor" in t, "sponsorOrSend" not in t)
