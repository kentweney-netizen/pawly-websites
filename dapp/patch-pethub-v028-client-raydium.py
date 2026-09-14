#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2 LOCK \u2014 PAWLY/USDC/USDT/SOL pay till directly.",
    " * PAWLY Pet Hub v0.2.8 \u2014 in-hub USDC/USDT/SOL -> Raydium PAWLY -> till.",
)
t = t.replace(
    " * PAWLY Pet Hub v0.2 LOCK — PAWLY/USDC/USDT/SOL pay till directly.",
    " * PAWLY Pet Hub v0.2.8 — in-hub USDC/USDT/SOL -> Raydium PAWLY -> till.",
)
if "TransactionInstruction" not in t.split("from \"@solana/web3.js\"")[0][-200:] + t[t.find("from \"@solana/web3.js\"")-200:t.find("from \"@solana/web3.js\"")+200]:
    t = t.replace(
        """  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";""",
        """  VersionedTransaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";""",
    )
if "const WSOL_MINT" not in t:
    t = t.replace(
        'const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";',
        'const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";\nconst WSOL_MINT = "So11111111111111111111111111111111111111112";',
    )
NEW_FN = r'''async function swapCoinToTillPawly(opts: {
  from: PublicKey;
  coin: PayCoin;
  coinAmount: number;
  conn: Connection;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  pawlyList?: number;
}) {
  const inputMint = opts.coin === "SOL" ? WSOL_MINT : opts.coin === "USDT" ? USDT_MINT : USDC_MINT;
  let rawIn = opts.coin === "SOL"
    ? Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL))
    : Math.max(1, Math.round(opts.coinAmount * 1e6));
  const sponsor = new PublicKey(SPONSOR);
  if (opts.coin === "SOL") {
    const bal = await opts.conn.getBalance(opts.from, "confirmed");
    if (rawIn > bal) rawIn = Math.max(1, bal);
    const wsolAta = await getAssociatedTokenAddress(new PublicKey(WSOL_MINT), opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const wrapIxs = [
      createAssociatedTokenAccountIdempotentInstruction(sponsor, wsolAta, opts.from, new PublicKey(WSOL_MINT), TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
      SystemProgram.transfer({ fromPubkey: opts.from, toPubkey: wsolAta, lamports: rawIn }),
      new TransactionInstruction({ programId: TOKEN_PROGRAM_ID, keys: [{ pubkey: wsolAta, isSigner: false, isWritable: true }], data: Uint8Array.from([17]) }),
    ];
    const { blockhash } = await opts.conn.getLatestBlockhash("confirmed");
    const wrapTx = new VersionedTransaction(new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: wrapIxs }).compileToV0Message());
    let wrapSig = "";
    if (typeof opts.signTransaction === "function") {
      try {
        wrapSig = await postSponsor(await opts.signTransaction(wrapTx), 1);
      } catch { wrapSig = ""; }
    }
    if (!wrapSig) wrapSig = await opts.sendTransaction(wrapTx, opts.conn);
    await assertOnchainSuccess(opts.conn, wrapSig);
  }
  const qUrl = "https://transaction-v1.raydium.io/compute/swap-base-in?inputMint=" + inputMint + "&outputMint=" + PAWLY_MINT + "&amount=" + String(rawIn) + "&slippageBps=150&txVersion=V0";
  const qr = await fetch(qUrl, { headers: { Accept: "application/json" } });
  const quote = await qr.json() as { success?: boolean; data?: { outputAmount?: string; otherAmountThreshold?: string }; msg?: string; message?: string };
  if (!qr.ok || !quote || quote.success === false || !quote.data) {
    throw new Error(String(quote && (quote.msg || quote.message) || "Raydium no quote / 无法报价"));
  }
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
    }),
  });
  const pack = await sr.json() as { success?: boolean; msg?: string; message?: string; data?: unknown; transaction?: string; transactions?: unknown[] };
  const bag: string[] = [];
  const push = (x: unknown) => {
    if (!x) return;
    if (typeof x === "string" && x.length > 40) bag.push(x);
    else if (typeof x === "object" && x) {
      const o = x as { transaction?: unknown; tx?: unknown };
      push(o.transaction); push(o.tx);
    }
  };
  push(pack); push(pack && pack.data); if (Array.isArray(pack && pack.transactions)) pack.transactions.forEach(push);
  if (!sr.ok || !bag[0]) throw new Error(String((pack && (pack.msg || pack.message)) || "Raydium build failed / 兑换构造失败"));
  const tx = VersionedTransaction.deserialize(b64ToBytes(bag[0]));
  let sig = "";
  if (typeof opts.signTransaction === "function") {
    try { sig = await postSponsor(await opts.signTransaction(tx), 1); } catch { sig = ""; }
  }
  if (!sig) sig = await opts.sendTransaction(tx, opts.conn);
  await assertOnchainSuccess(opts.conn, sig);
  const outUi = Number(quote.data.otherAmountThreshold || quote.data.outputAmount || 0) / 1e6;
  const list = Number(opts.pawlyList || 0);
  const payAmt = list > 0 ? Math.min(list, outUi) : outUi;
  if (payAmt > 0) {
    return payHubToken({
      from: opts.from,
      pawlyList: payAmt,
      coin: "PAWLY",
      coinAmount: payAmt,
      sendTransaction: opts.sendTransaction,
      signTransaction: opts.signTransaction,
    });
  }
  return sig;
}
'''
i = t.find("async function swapCoinToTillPawly")
j = t.find("async function payHubToken")
if i < 0 or j < 0:
    raise SystemExit("fn bounds missing")
t = t[:i] + NEW_FN + t[j:]
t = t.replace(
    "  /* v0.2 LOCK: do not swap in-hub. USDC/USDT/SOL transfer to till. */",
    "  if (opts.coin !== \"PAWLY\") {\n    return await swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction, pawlyList: opts.pawlyList });\n  }",
)
t = t.replace(
    "Pays the shop till in the token you pick. Live pool price. Swap-to-PAWLY stays on the Swap page.",
    "Pays in USDC/USDT/SOL: swaps to PAWLY on the official pool, then PAWLY hits the shop till.",
)
t = t.replace(
    "按现价折算后直付店柜。要换 PAWLY 请用 dApp Swap。",
    "用 USDC/USDT/SOL 付款时先换成 PAWLY 再进店柜，不用回 Swap 页。",
)
p.write_text(t)
print("ok", t.splitlines()[1])
print("branch", "return await swapCoinToTillPawly" in t)
print("client raydium", "transaction-v1.raydium.io/compute" in t)
print("no netlify jup", "hub-jup-swap" not in t)
