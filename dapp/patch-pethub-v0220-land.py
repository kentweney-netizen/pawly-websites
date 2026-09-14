#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
if "v0.2.20" in t and "tillPawlyIxs" in t:
    print("already v0.2.20")
    raise SystemExit(0)

t = t.replace(
    " * PAWLY Pet Hub v0.2.19 — cache RPC, skip heavy recover when roster exists, faster videos.",
    " * PAWLY Pet Hub v0.2.20 — official-pool swap + till in one sponsored tx; dynamic priority fee; more land retries.",
)
t = t.replace(
    "  LAMPORTS_PER_SOL,\n} from \"@solana/web3.js\";",
    "  LAMPORTS_PER_SOL,\n  ComputeBudgetProgram,\n} from \"@solana/web3.js\";",
)

helper = '''
const HUB_SLIPPAGE_BPS = 400;
const HUB_CU_SWAP = 700000;
const HUB_CU_TILL = 120000;

function errText(e: unknown) {
  if (!e) return "";
  if (e instanceof Error) return e.message + " " + String((e as { name?: string }).name || "");
  return String(e);
}
function isUserCancel(e: unknown) {
  const s = errText(e).toLowerCase();
  return s.includes("reject") || s.includes("cancel") || s.includes("denied") || s.includes("user declined");
}
function isExpiredTx(e: unknown) {
  const s = errText(e).toLowerCase();
  return s.includes("blockhash") || s.includes("expired") || s.includes("block height") || s.includes("nonce");
}
async function hubPriorityMicroLamports(conn: Connection) {
  try {
    const fees = await conn.getRecentPrioritizationFees();
    const vals = (fees || []).map((f) => Number(f.prioritizationFee || 0)).filter((n) => n > 0).sort((a, b) => a - b);
    const mid = vals.length ? vals[Math.floor(vals.length * 0.7)] : 0;
    return Math.max(200000, Math.min(1500000, Math.floor(mid * 1.4) || 250000));
  } catch {
    return 250000;
  }
}
function budgetIxs(units: number, microLamports: number): TransactionInstruction[] {
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports }),
  ];
}
async function tillPawlyIxs(opts: { from: PublicKey; till: PublicKey; payer: PublicKey; uiAmount: number }) {
  const mint = new PublicKey(PAWLY_MINT);
  const rawAmt = Math.round(opts.uiAmount * Math.pow(10, PAWLY_DECIMALS));
  if (rawAmt <= 0) throw new Error("Amount too small / 金额太小");
  const fromAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const toAta = await getAssociatedTokenAddress(mint, opts.till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  return [
    createAssociatedTokenAccountIdempotentInstruction(opts.payer, toAta, opts.till, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(fromAta, mint, toAta, opts.from, rawAmt, PAWLY_DECIMALS, [], TOKEN_PROGRAM_ID),
  ];
}

'''
t = t.replace("async function sendHubSwapTx(opts: {", helper + "async function sendHubSwapTx(opts: {", 1)

old_send = '''async function sendHubSwapTx(opts: {
  conn: Connection;
  tx: VersionedTransaction;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}) {
  const sponsorize = async () => {
    if (typeof opts.signTransaction !== "function") throw new Error("no signer");
    const sponsor = new PublicKey(SPONSOR);
    const lookups = ((opts.tx.message as { addressTableLookups?: { accountKey?: PublicKey }[] }).addressTableLookups) || [];
    const alts: AddressLookupTableAccount[] = [];
    for (let i = 0; i < lookups.length; i++) {
      const rawKey = lookups[i] && lookups[i].accountKey;
      if (!rawKey) continue;
      let key: PublicKey;
      try { key = rawKey instanceof PublicKey ? rawKey : new PublicKey(String(rawKey)); } catch { continue; }
      let acc: { value: AddressLookupTableAccount | null } = { value: null };
      try { acc = await opts.conn.getAddressLookupTable(key); } catch { acc = { value: null }; }
      if (acc.value) alts.push(acc.value);
    }
    const ixs = TransactionMessage.decompile(opts.tx.message, { addressLookupTableAccounts: alts }).instructions;
    const { blockhash } = await opts.conn.getLatestBlockhash();
    const vtx = new VersionedTransaction(
      new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(alts)
    );
    const signed = await opts.signTransaction(vtx);
    return await postSponsor(signed, 1);
  };
  if (typeof opts.signTransaction !== "function") {
    throw new Error("Wallet cannot sign / 钱包无法签名");
  }
  return await sponsorize();
}
'''

new_send = '''async function sendHubSwapTx(opts: {
  conn: Connection;
  tx: VersionedTransaction;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  extraIxs?: TransactionInstruction[];
}) {
  if (typeof opts.signTransaction !== "function") {
    throw new Error("Wallet cannot sign / 钱包无法签名");
  }
  const sponsor = new PublicKey(SPONSOR);
  const lookups = ((opts.tx.message as { addressTableLookups?: { accountKey?: PublicKey }[] }).addressTableLookups) || [];
  const alts: AddressLookupTableAccount[] = [];
  for (let i = 0; i < lookups.length; i++) {
    const rawKey = lookups[i] && lookups[i].accountKey;
    if (!rawKey) continue;
    let key: PublicKey;
    try { key = rawKey instanceof PublicKey ? rawKey : new PublicKey(String(rawKey)); } catch { continue; }
    let acc: { value: AddressLookupTableAccount | null } = { value: null };
    try { acc = await opts.conn.getAddressLookupTable(key); } catch { acc = { value: null }; }
    if (acc.value) alts.push(acc.value);
  }
  const swapIxs = TransactionMessage.decompile(opts.tx.message, { addressLookupTableAccounts: alts }).instructions;
  const price = await hubPriorityMicroLamports(opts.conn);
  const ixs = [...budgetIxs(HUB_CU_SWAP, price), ...swapIxs, ...(opts.extraIxs || [])];
  const { blockhash } = await opts.conn.getLatestBlockhash("confirmed");
  const vtx = new VersionedTransaction(
    new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(alts)
  );
  const signed = await opts.signTransaction(vtx);
  return await postSponsor(signed, 1);
}
'''
if old_send not in t:
    raise SystemExit("sendHubSwapTx block mismatch")
t = t.replace(old_send, new_send, 1)

t = t.replace("&slippageBps=150&txVersion=V0\"", "&slippageBps=\" + HUB_SLIPPAGE_BPS + \"&txVersion=V0\"")
t = t.replace('computeUnitPriceMicroLamports: "100000",', 'computeUnitPriceMicroLamports: "400000",')

old_tail = '''  if (!tx) throw new Error(lastB64 || "Raydium tx decode failed / 兑换交易解析失败");
  const sig = await sendHubSwapTx({
    conn: opts.conn,
    tx,
    sendTransaction: opts.sendTransaction,
    signTransaction: opts.signTransaction,
  });
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
new_tail = '''  if (!tx) throw new Error(lastB64 || "Raydium tx decode failed / 兑换交易解析失败");
  const outUi = Number(quote.data.otherAmountThreshold || quote.data.outputAmount || 0) / 1e6;
  const list = Number(opts.pawlyList || 0);
  const payAmt = list > 0 ? Math.min(list, outUi) : outUi;
  const till = new PublicKey(SHOP_TILL);
  const sponsor = new PublicKey(SPONSOR);
  let extraIxs: TransactionInstruction[] = [];
  if (payAmt > 0) {
    extraIxs = await tillPawlyIxs({ from: opts.from, till, payer: sponsor, uiAmount: payAmt });
  }
  try {
    const sig = await sendHubSwapTx({
      conn: opts.conn,
      tx,
      sendTransaction: opts.sendTransaction,
      signTransaction: opts.signTransaction,
      extraIxs,
    });
    await assertOnchainSuccess(opts.conn, sig);
    return sig;
  } catch (e) {
    if (isUserCancel(e)) throw e;
    const sig = await sendHubSwapTx({
      conn: opts.conn,
      tx,
      sendTransaction: opts.sendTransaction,
      signTransaction: opts.signTransaction,
    });
    await assertOnchainSuccess(opts.conn, sig);
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
}
'''
if old_tail not in t:
    raise SystemExit("swap tail mismatch")
t = t.replace(old_tail, new_tail, 1)

old_loop = '''  if (typeof opts.signTransaction !== "function") throw new Error("Wallet cannot sign / 钱包无法签名");
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { blockhash: bh } = await conn.getLatestBlockhash();
      const ixs = await ixsFor(sponsor);
      const tx = new VersionedTransaction(
        new TransactionMessage({ payerKey: sponsor, recentBlockhash: bh, instructions: ixs }).compileToV0Message()
      );
      const signed = await opts.signTransaction(tx);
      const sig = await postSponsor(signed, 1);
      await assertOnchainSuccess(conn, sig);
      return sig;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || "Sponsor pay failed / 代付失败"));
}
'''
new_loop = '''  if (typeof opts.signTransaction !== "function") throw new Error("Wallet cannot sign / 钱包无法签名");
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const price = await hubPriorityMicroLamports(conn);
      const { blockhash: bh } = await conn.getLatestBlockhash("confirmed");
      const ixs = [...budgetIxs(HUB_CU_TILL, price), ...(await ixsFor(sponsor))];
      const tx = new VersionedTransaction(
        new TransactionMessage({ payerKey: sponsor, recentBlockhash: bh, instructions: ixs }).compileToV0Message()
      );
      const signed = await opts.signTransaction(tx);
      const sig = await postSponsor(signed, 1);
      await assertOnchainSuccess(conn, sig);
      return sig;
    } catch (e) {
      lastErr = e;
      if (isUserCancel(e)) break;
      if (!isExpiredTx(e) && attempt >= 1) break;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || "Sponsor pay failed / 代付失败"));
}
'''
if old_loop not in t:
    raise SystemExit("pay loop mismatch")
t = t.replace(old_loop, new_loop, 1)

t = t.replace(
    'setNote("Paying in Pet Hub…");',
    'setNote(payCoin === "PAWLY" ? "Paying PAWLY to shop till…" : "Official pool → PAWLY → shop till…");',
)

p.write_text(t)
print("ok", "v0.2.20" in t, "tillPawlyIxs" in t, "HUB_SLIPPAGE_BPS" in t, "attempt < 4" in t)
