#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.19 \u2014 cache RPC, skip heavy recover when roster exists, faster videos.",
    " * PAWLY Pet Hub v0.2.21 \u2014 Jupiter/local-key stablecoin pay: sign-only + site proxy + retry.",
)
if "v0.2.21" not in t.splitlines()[1] and "v0.2.19" in t:
    t = t.replace(
        " * PAWLY Pet Hub v0.2.19 — cache RPC, skip heavy recover when roster exists, faster videos.",
        " * PAWLY Pet Hub v0.2.21 — Jupiter/local-key stablecoin pay: sign-only + site proxy + retry.",
    )
needle = "async function sendHubSwapTx("
if "async function hubUserSign(" not in t:
    insert = r'''function sleepHub(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function isUserCancel(e: unknown) {
  return /reject|denied|cancel|user abort/i.test(String((e as { message?: string })?.message || e || ""));
}
async function hubUserSign(tx: VersionedTransaction, signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>) {
  const tries: Array<() => Promise<VersionedTransaction>> = [];
  if (typeof signTransaction === "function") tries.push(() => signTransaction(tx));
  const w = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
  const bags = w ? [w.solana, (w.phantom as { solana?: unknown } | undefined)?.solana, w.solflare, (w.jupiter as { solana?: unknown } | undefined)?.solana, (w.bitkeep as { solana?: unknown } | undefined)?.solana] : [];
  bags.forEach((p) => {
    const prov = p as { signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>; signAllTransactions?: (xs: VersionedTransaction[]) => Promise<VersionedTransaction[]> } | null;
    if (prov && typeof prov.signTransaction === "function") tries.push(() => prov.signTransaction!(tx));
    if (prov && typeof prov.signAllTransactions === "function") tries.push(async () => (await prov.signAllTransactions!([tx]))[0]);
  });
  let last: unknown = "Wallet cannot sign / 钱包无法签名";
  for (let i = 0; i < tries.length; i++) {
    try {
      const signed = await tries[i]();
      if (signed) return signed;
    } catch (e) {
      if (isUserCancel(e)) throw e;
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
async function pawlyUiOf(conn: Connection, owner: PublicKey) {
  try {
    const ata = await getAssociatedTokenAddress(new PublicKey(PAWLY_MINT), owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const info = await conn.getTokenAccountBalance(ata);
    return Number(info.value.uiAmount || 0);
  } catch { return 0; }
}
async function buildHubSwapTx(opts: { inputMint: string; amount: string; user: string; inputAccount?: string; slippageBps: number }) {
  const paths = ["/.netlify/functions/hub-jup-swap", "/dapp/.netlify/functions/hub-jup-swap"];
  let last = "swap proxy failed";
  for (const path of paths) {
    try {
      const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inputMint: opts.inputMint, outputMint: PAWLY_MINT, amount: opts.amount, userPublicKey: opts.user, inputAccount: opts.inputAccount || "", slippageBps: opts.slippageBps }) });
      const d = (await r.json()) as { swapTransaction?: string; error?: string };
      if (r.ok && d.swapTransaction) return d;
      last = String(d.error || ("HTTP " + r.status));
    } catch (e) { last = String((e as { message?: string })?.message || e); }
  }
  throw new Error(last);
}
'''
    if needle not in t:
        raise SystemExit("sendHub missing")
    t = t.replace(needle, insert + needle, 1)
t = t.replace("const signed = await opts.signTransaction(vtx);", "const signed = await hubUserSign(vtx, opts.signTransaction);")
t = t.replace("const signed = await opts.signTransaction(tx);", "const signed = await hubUserSign(tx, opts.signTransaction);")
start = t.find("async function swapCoinToTillPawly(")
end = t.find("async function payHubToken(")
if start < 0 or end < 0:
    raise SystemExit("swap markers")
if "slips = [200, 400, 800]" not in t:
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
  const rawIn = isSol ? Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL)) : Math.max(1, Math.round(opts.coinAmount * 1e6));
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
  const slips = [200, 400, 800];
  let lastErr: unknown = null;
  let swapSig = "";
  for (let attempt = 0; attempt < slips.length; attempt++) {
    try {
      const pack = await buildHubSwapTx({ inputMint, amount: String(rawIn), user: opts.from.toBase58(), inputAccount, slippageBps: slips[attempt] });
      const tx = VersionedTransaction.deserialize(b64ToBytes(String(pack.swapTransaction)));
      swapSig = await sendHubSwapTx({ conn: opts.conn, tx, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction });
      await assertOnchainSuccess(opts.conn, swapSig);
      lastErr = null;
      break;
    } catch (e) {
      if (isUserCancel(e)) throw e;
      lastErr = e;
      await sleepHub(500);
    }
  }
  if (!swapSig) throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || "Swap failed / 兑换失败"));
  let after = before;
  for (let i = 0; i < 12; i++) {
    after = await pawlyUiOf(opts.conn, opts.from);
    if (after > before + 0.000001) break;
    await sleepHub(500);
  }
  const list = Number(opts.pawlyList || 0);
  const payAmt = list > 0 ? Math.min(list, after) : Math.max(0, after - before);
  if (payAmt <= 0) throw new Error("Swap landed but no PAWLY yet / 兑换已发出，PAWLY 尚未到账");
  let hop2: unknown = null;
  for (let i = 0; i < 3; i++) {
    try {
      return await payHubToken({ from: opts.from, pawlyList: payAmt, coin: "PAWLY", coinAmount: payAmt, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction });
    } catch (e) {
      if (isUserCancel(e)) throw e;
      hop2 = e;
      await sleepHub(600);
    }
  }
  throw hop2 instanceof Error ? hop2 : new Error(String(hop2 || "Second hop failed"));
}

'''
    t = t[:start] + NEW_SWAP + t[end:]
p.write_text(t)
print(t.splitlines()[1])
print("hubUserSign", t.count("hubUserSign"))
