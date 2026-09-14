#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.2 — USDC/USDT/SOL sponsor then user gas.",
    " * PAWLY Pet Hub v0.2.3 — stables/SOL swap to PAWLY till in-hub.",
)
WSOL = "So11111111111111111111111111111111111111112"
HELPER = '''
const WSOL_MINT = "So11111111111111111111111111111111111111112";
function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function swapCoinToTillPawly(opts: {
  from: PublicKey;
  coin: PayCoin;
  coinAmount: number;
  conn: Connection;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}) {
  const inputMint = opts.coin === "SOL" ? WSOL_MINT : opts.coin === "USDT" ? USDT_MINT : USDC_MINT;
  const rawIn = opts.coin === "SOL"
    ? Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL))
    : Math.max(1, Math.round(opts.coinAmount * 1e6));
  const qs = new URLSearchParams({
    inputMint,
    outputMint: PAWLY_MINT,
    amount: String(rawIn),
    slippageBps: "150",
    onlyDirectRoutes: "false",
  });
  const qr = await fetch("https://quote-api.jup.ag/v6/quote?" + qs.toString());
  const quote = await qr.json() as { outAmount?: string; error?: string };
  if (!qr.ok || !quote.outAmount) throw new Error(String(quote.error || "No swap quote / 无法兑换，请用 PAWLY"));
  const till = new PublicKey(SHOP_TILL);
  const tillAta = await getAssociatedTokenAddress(new PublicKey(PAWLY_MINT), till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const sr = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: opts.from.toBase58(),
      destinationTokenAccount: tillAta.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
    }),
  });
  const pack = await sr.json() as { swapTransaction?: string; error?: string };
  if (!sr.ok || !pack.swapTransaction) throw new Error(String(pack.error || "Swap build failed / 兑换构造失败"));
  const tx = VersionedTransaction.deserialize(b64ToBytes(pack.swapTransaction));
  let sig = "";
  if (typeof opts.signTransaction === "function") {
    try {
      const signed = await opts.signTransaction(tx);
      sig = await postSponsor(signed, 1);
    } catch {
      sig = "";
    }
  }
  if (!sig) sig = await opts.sendTransaction(tx, opts.conn);
  await assertOnchainSuccess(opts.conn, sig);
  return sig;
}
'''
if "swapCoinToTillPawly" not in t:
    t = t.replace("async function payHubToken", HELPER + "async function payHubToken", 1)
NEEDLE = "  if (opts.coinAmount <= 0) throw new Error(\"No live price / 拉不到价，改用 PAWLY\");\n  const conn = await openHubConn();"
INSERT = "  if (opts.coinAmount <= 0) throw new Error(\"No live price / 拉不到价，改用 PAWLY\");\n  const conn = await openHubConn();\n  if (opts.coin !== \"PAWLY\") {\n    return swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction });\n  }"
if "swapCoinToTillPawly({" not in t:
    if NEEDLE not in t:
        raise SystemExit("payHub needle missing")
    t = t.replace(NEEDLE, INSERT, 1)
p.write_text(t)
print("ok", "v0.2.3" in t, "swapCoinToTillPawly" in t)
