#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.9 — Raydium inputAccount + user-signed swap then till.",
    " * PAWLY Pet Hub v0.2.10 — extract Raydium data[] txs; SOL wrapSol no prewrap.",
)
NEW = r'''async function swapCoinToTillPawly(opts: {
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
  const qUrl =
    "https://transaction-v1.raydium.io/compute/swap-base-in?inputMint=" +
    inputMint +
    "&outputMint=" +
    PAWLY_MINT +
    "&amount=" +
    String(rawIn) +
    "&slippageBps=150&txVersion=V0";
  const qr = await fetch(qUrl, { headers: { Accept: "application/json" } });
  const quote = (await qr.json()) as { success?: boolean; data?: { outputAmount?: string; otherAmountThreshold?: string }; msg?: string; message?: string };
  if (!qr.ok || !quote || quote.success === false || !quote.data) {
    throw new Error(String((quote && (quote.msg || quote.message)) || "Raydium no quote / 无法报价"));
  }
  const body: Record<string, unknown> = {
    computeUnitPriceMicroLamports: "100000",
    swapResponse: quote,
    txVersion: "V0",
    wallet: opts.from.toBase58(),
    wrapSol: isSol,
    unwrapSol: false,
  };
  if (!isSol) {
    const inMint = new PublicKey(inputMint);
    const ata = await getAssociatedTokenAddress(inMint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    let inputAccount = ata;
    const info = await opts.conn.getAccountInfo(ata, "confirmed");
    if (!info) {
      const listed = await opts.conn.getTokenAccountsByOwner(opts.from, { mint: inMint });
      if (!listed.value.length) throw new Error("No " + opts.coin + " token account / 没有" + opts.coin + "账户");
      inputAccount = listed.value[0].pubkey;
    }
    body.inputAccount = inputAccount.toBase58();
  }
  const sr = await fetch("https://transaction-v1.raydium.io/transaction/swap-base-in", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const pack = (await sr.json()) as { success?: boolean; msg?: string; message?: string; data?: unknown; transaction?: string; transactions?: unknown[] };
  const bag: string[] = [];
  const push = (x: unknown) => {
    if (!x) return;
    if (typeof x === "string" && x.length > 40) {
      bag.push(x);
      return;
    }
    if (Array.isArray(x)) {
      x.forEach(push);
      return;
    }
    if (typeof x === "object") {
      const o = x as { transaction?: unknown; tx?: unknown; data?: unknown; transactions?: unknown };
      push(o.transaction);
      push(o.tx);
      push(o.data);
      push(o.transactions);
    }
  };
  push(pack);
  if (!sr.ok || pack.success === false || !bag[0]) {
    throw new Error(String((pack && (pack.msg || pack.message)) || "Raydium build failed / 兑换构造失败"));
  }
  const tx = VersionedTransaction.deserialize(b64ToBytes(bag[0]));
  let sig = "";
  if (typeof opts.signTransaction === "function") {
    const signed = await opts.signTransaction(tx);
    try {
      sig = await opts.conn.sendRawTransaction(signed.serialize(), { skipPreflight: true, maxRetries: 3 });
    } catch {
      sig = await opts.sendTransaction(signed, opts.conn);
    }
  } else {
    sig = await opts.sendTransaction(tx, opts.conn);
  }
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
    raise SystemExit("bounds")
t = t[:i] + NEW + t[j:]
p.write_text(t)
print("ok", t.splitlines()[1])
print("forEach array", "x.forEach(push)" in t)
print("no prewrap", "syncNative" not in t and "Uint8Array.from([17])" not in t)
