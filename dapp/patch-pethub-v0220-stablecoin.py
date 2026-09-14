#!/usr/bin/env python3
from pathlib import Path

p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.19 — cache RPC, skip heavy recover when roster exists, faster videos.",
    " * PAWLY Pet Hub v0.2.20 — USDC/USDT/SOL checkout via site proxy + retry + balance second hop.",
)

OLD_ASSERT = '''async function assertOnchainSuccess(conn: Connection, sig: string) {
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

NEW_ASSERT = '''async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}
async function assertOnchainSuccess(conn: Connection, sig: string) {
  const s = String(sig || "").trim();
  if (s.length < 64) throw new Error("No on-chain signature / 没有链上签名");
  for (let i = 0; i < 20; i++) {
    const res = await conn.getSignatureStatuses([s], { searchTransactionHistory: true });
    const st = res?.value?.[0];
    if (st && st.err) throw new Error("Transaction failed on-chain / 链上失败");
    if (st && (st.confirmationStatus === "processed" || st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return;
    await sleep(700);
  }
  const tx = await conn.getTransaction(s, { maxSupportedTransactionVersion: 0 });
  if (tx?.meta?.err) throw new Error("Transaction failed on-chain / 链上失败");
  if (tx) return;
  throw new Error("Signature not confirmed / 签名未上链");
}
async function pawlyUiOf(conn: Connection, owner: PublicKey) {
  try {
    const ata = await getAssociatedTokenAddress(new PublicKey(PAWLY_MINT), owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const info = await conn.getTokenAccountBalance(ata);
    return Number(info.value.uiAmount || 0);
  } catch {
    return 0;
  }
}
async function buildHubSwapTx(opts: {
  inputMint: string;
  amount: string;
  user: string;
  inputAccount?: string;
  slippageBps: number;
}) {
  const paths = ["/.netlify/functions/hub-jup-swap", "/dapp/.netlify/functions/hub-jup-swap"];
  let last = "swap proxy failed";
  for (const path of paths) {
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputMint: opts.inputMint,
          outputMint: PAWLY_MINT,
          amount: opts.amount,
          userPublicKey: opts.user,
          inputAccount: opts.inputAccount || "",
          slippageBps: opts.slippageBps,
        }),
      });
      const d = (await r.json()) as { swapTransaction?: string; outAmount?: string; error?: string };
      if (r.ok && d.swapTransaction) return d;
      last = String(d.error || ("HTTP " + r.status));
    } catch (e) {
      last = String((e as { message?: string })?.message || e);
    }
  }
  throw new Error(last);
}'''

if OLD_ASSERT not in t:
    raise SystemExit("assert missing")
t = t.replace(OLD_ASSERT, NEW_ASSERT, 1)

start = t.find("async function swapCoinToTillPawly(")
end = t.find("async function payHubToken(")
if start < 0 or end < 0:
    raise SystemExit("swap/pay markers missing")

NEW_SWAP = '''async function swapCoinToTillPawly(opts: {
  from: PublicKey;
  coin: PayCoin;
  coinAmount: number;
  conn: Connection;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  pawlyList?: number;
}) {
  const isSol = opts.coin === "SOL";
  const inputMint = isSol ? WSOL_MINT : opts.coin === "USDT" ? USDT_MINT : USDC_MINT;
  const rawIn = isSol
    ? Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL))
    : Math.max(1, Math.round(opts.coinAmount * 1e6));
  let inputAccount = "";
  if (!isSol) {
    const inMint = new PublicKey(inputMint);
    const ata = await getAssociatedTokenAddress(inMint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const info = await opts.conn.getAccountInfo(ata);
    if (info) inputAccount = ata.toBase58();
    else {
      const listed = await opts.conn.getTokenAccountsByOwner(opts.from, { mint: inMint });
      if (!listed.value.length) throw new Error("No " + opts.coin + " token account / 没有" + opts.coin + "账户");
      inputAccount = listed.value[0].pubkey.toBase58();
    }
  }
  const before = await pawlyUiOf(opts.conn, opts.from);
  const slips = [150, 300, 500];
  let lastErr: unknown = null;
  let swapSig = "";
  for (let attempt = 0; attempt < slips.length; attempt++) {
    try {
      const pack = await buildHubSwapTx({
        inputMint,
        amount: String(rawIn),
        user: opts.from.toBase58(),
        inputAccount,
        slippageBps: slips[attempt],
      });
      const tx = VersionedTransaction.deserialize(b64ToBytes(String(pack.swapTransaction)));
      swapSig = await sendHubSwapTx({
        conn: opts.conn,
        tx,
        sendTransaction: opts.sendTransaction,
        signTransaction: opts.signTransaction,
      });
      await assertOnchainSuccess(opts.conn, swapSig);
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      await sleep(400);
    }
  }
  if (lastErr && !swapSig) throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  let after = before;
  for (let i = 0; i < 10; i++) {
    after = await pawlyUiOf(opts.conn, opts.from);
    if (after > before + 0.000001) break;
    await sleep(500);
  }
  const gained = Math.max(0, after - before);
  const list = Number(opts.pawlyList || 0);
  const payAmt = list > 0 ? Math.min(list, after) : gained;
  if (payAmt <= 0) throw new Error("Swap landed but no PAWLY yet / 兑换已发出，PAWLY 尚未到账");
  return payHubToken({
    from: opts.from,
    pawlyList: payAmt,
    coin: "PAWLY",
    coinAmount: payAmt,
    sendTransaction: opts.sendTransaction,
    signTransaction: opts.signTransaction,
  });
}

'''

t = t[:start] + NEW_SWAP + t[end:]
p.write_text(t)
print(t.splitlines()[1])
print("proxy", "buildHubSwapTx" in t)
print("slips", "500]" in t)

fn = Path("netlify/functions/hub-jup-swap.js")
js = fn.read_text()
if "slippageBps" not in js:
    js = js.replace(
        '      "&slippageBps=150&txVersion=V0";',
        '      "&slippageBps=" +
      encodeURIComponent(String(body.slippageBps || 150)) +
      "&txVersion=V0";',
    )
    js = js.replace(
        "          body: JSON.stringify({\n            computeUnitPriceMicroLamports: \"100000\",\n            swapResponse,\n            txVersion: \"V0\",\n            wallet: userPublicKey,\n            wrapSol,\n            unwrapSol: isSolIn,\n          }),",
        "          body: JSON.stringify({\n            computeUnitPriceMicroLamports: \"100000\",\n            swapResponse,\n            txVersion: \"V0\",\n            wallet: userPublicKey,\n            wrapSol,\n            unwrapSol: isSolIn,\n            inputAccount: body.inputAccount || undefined,\n          }),",
    )
    fn.write_text(js)
    print("function updated", "slippageBps" in js)
else:
    print("function already has slippage")
