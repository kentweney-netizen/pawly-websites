import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

export type PayCoin = "PAWLY" | "USDC" | "USDT" | "SOL";
export type PayPhase = "build" | "sign" | "sponsor" | "confirm" | "swap" | "till";
export type PayPhaseFn = (phase: PayPhase, label: string) => void;
export type HubSign = (tx: VersionedTransaction) => Promise<VersionedTransaction>;
export type HubSend = (tx: VersionedTransaction, conn: Connection, opts?: { skipPreflight?: boolean; preflightCommitment?: string; maxRetries?: number }) => Promise<string>;
export type HubWallet = {
  adapter?: {
    signTransaction?: HubSign;
    signAllTransactions?: (xs: VersionedTransaction[]) => Promise<VersionedTransaction[]>;
    signAndSendTransaction?: (tx: VersionedTransaction) => Promise<string | { signature?: string }>;
    sendTransaction?: HubSend;
  };
  wallet?: { adapter?: HubWallet["adapter"] };
  signTransaction?: HubSign;
  signAllTransactions?: (xs: VersionedTransaction[]) => Promise<VersionedTransaction[]>;
  signAndSendTransaction?: (tx: VersionedTransaction) => Promise<string | { signature?: string }>;
  sendTransaction?: HubSend;
};

const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
const MINTS: Record<Exclude<PayCoin, "SOL">, string> = { PAWLY: PAWLY_MINT, USDC: USDC_MINT, USDT: USDT_MINT };
const DECIMALS: Record<PayCoin, number> = { PAWLY: 6, USDC: 6, USDT: 6, SOL: 9 };

function openHubConn() { return new Connection(RPC, "confirmed"); }
function isUserCancel(e: unknown) { return /reject|denied|cancel|user abort/i.test(String((e as { message?: string })?.message || e || "")); }
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(label)), ms);
    p.then((v) => { window.clearTimeout(t); resolve(v); }, (e) => { window.clearTimeout(t); reject(e); });
  });
}
function sleepHub(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function txToB64(tx: VersionedTransaction) {
  const raw = tx.serialize();
  const u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
  let s = "";
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 8192)));
  return btoa(s);
}
function pickSig(res: unknown): string {
  if (!res) return "";
  if (typeof res === "string") return res === "[object Object]" ? "" : res;
  const o = res as { signature?: string; txid?: string };
  return String(o.signature || o.txid || "");
}
function pickSigned(out: unknown, fallback: VersionedTransaction): VersionedTransaction {
  if (out && typeof out === "object" && typeof (out as VersionedTransaction).serialize === "function") return out as VersionedTransaction;
  return fallback;
}

export async function readPawlyUi(owner: PublicKey): Promise<number> {
  const conn = openHubConn();
  const mint = new PublicKey(PAWLY_MINT);
  const ata = await getAssociatedTokenAddress(mint, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  try {
    const bal = await withTimeout(conn.getTokenAccountBalance(ata, "confirmed"), 4000, "Balance timeout");
    return Number(bal?.value?.uiAmount || 0);
  } catch {
    return 0;
  }
}

async function resolveTokenProgramId(conn: Connection, mint: PublicKey) {
  try {
    const info = await conn.getAccountInfo(mint, "confirmed");
    if (info && info.owner) return info.owner;
  } catch { /* default */ }
  return TOKEN_PROGRAM_ID;
}

async function waitSigOk(conn: Connection, sig: string) {
  for (let i = 0; i < 8; i++) {
    const stPack = await withTimeout(conn.getSignatureStatuses([sig], { searchTransactionHistory: true }), 3000, "Status timeout");
    const st = stPack && stPack.value ? stPack.value[0] : null;
    if (st && st.err) throw new Error("Transaction failed on-chain / 链上失败");
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized" || st.slot)) return;
    await sleepHub(280);
  }
}

async function sponsorBroadcast(signed: VersionedTransaction, feePawly: number) {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => { try { ctrl.abort(); } catch { /* ignore */ } }, 20000);
  try {
    const r = await fetch(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
      body: JSON.stringify({ transaction: txToB64(signed), feePawly: Math.max(1, feePawly || 1), mode: "send" }),
      signal: ctrl.signal,
    });
    const d = await r.json().catch(() => ({})) as { signature?: string; error?: string };
    if (r.ok && d.signature) return String(d.signature);
    throw new Error(String(d.error || ("Sponsor HTTP " + r.status)));
  } catch (e) {
    if (String((e as { name?: string })?.name || "") === "AbortError") throw new Error("Sponsor timeout / 代付超时，请再试一次（已签名勿连点）");
    throw e;
  } finally { window.clearTimeout(timer); }
}

export async function userPartialSign(tx: VersionedTransaction, wallet?: HubWallet | null, signTransaction?: HubSign): Promise<VersionedTransaction> {
  const adapter = wallet && (wallet.adapter || (wallet.wallet && wallet.wallet.adapter) || wallet);
  const tryAll = async () => {
    const fn = (adapter && adapter.signAllTransactions) || (wallet && wallet.signAllTransactions);
    if (typeof fn !== "function") return null;
    const arr = await fn([tx]);
    return (arr && arr[0]) ? pickSigned(arr[0], tx) : null;
  };
  const tryOne = async (fn: HubSign) => pickSigned(await fn(tx), tx);
  if (typeof signTransaction === "function") {
    try { return await tryOne(signTransaction); } catch (e) {
      if (isUserCancel(e)) throw e;
      const alt = await tryAll(); if (alt) return alt;
    }
  }
  if (adapter && typeof adapter.signTransaction === "function") {
    try { return await tryOne(adapter.signTransaction); } catch (e) {
      if (isUserCancel(e)) throw e;
      const alt = await tryAll(); if (alt) return alt;
      throw e;
    }
  }
  const alt = await tryAll();
  if (alt) return alt;
  throw new Error("Wallet cannot sign / 钱包无法签名");
}

async function walletSignAndSend(opts: {
  conn: Connection;
  tx: VersionedTransaction;
  wallet?: HubWallet | null;
  sendTransaction?: HubSend;
}): Promise<string> {
  const adapter = opts.wallet && (opts.wallet.adapter || (opts.wallet.wallet && opts.wallet.wallet.adapter) || opts.wallet);
  const pick = async (fn: (tx: VersionedTransaction) => Promise<unknown>) => {
    const sig = pickSig(await fn(opts.tx));
    if (sig && sig.length > 40) return sig;
    return "";
  };
  if (adapter && typeof adapter.signAndSendTransaction === "function") {
    try {
      const sig = await pick(adapter.signAndSendTransaction);
      if (sig) return sig;
    } catch (e) {
      if (isUserCancel(e)) throw e;
    }
  }
  if (opts.wallet && typeof opts.wallet.signAndSendTransaction === "function") {
    try {
      const sig = await pick(opts.wallet.signAndSendTransaction);
      if (sig) return sig;
    } catch (e) {
      if (isUserCancel(e)) throw e;
    }
  }
  const send = opts.sendTransaction || (adapter && adapter.sendTransaction);
  if (typeof send !== "function") throw new Error("Wallet cannot sign / 钱包无法签名");
  try {
    return await send(opts.tx, opts.conn, { skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 3 });
  } catch (e1) {
    if (isUserCancel(e1)) throw e1;
    return await send(opts.tx, opts.conn, { skipPreflight: true, preflightCommitment: "confirmed", maxRetries: 3 });
  }
}

async function findSourceAta(conn: Connection, mint: PublicKey, owner: PublicKey, programId: PublicKey, rawNeed: number) {
  const ata = await getAssociatedTokenAddress(mint, owner, false, programId, ASSOCIATED_TOKEN_PROGRAM_ID);
  try {
    const acc = await getAccount(conn, ata, "confirmed", programId);
    if (Number(acc.amount.toString()) >= rawNeed) return ata;
  } catch { /* scan */ }
  const listed = await conn.getParsedTokenAccountsByOwner(owner, { mint, programId });
  let best: PublicKey | null = null;
  let bestAmt = -1;
  for (const row of listed.value || []) {
    const amt = Number((row.account.data as { parsed?: { info?: { tokenAmount?: { amount?: string } } } }).parsed?.info?.tokenAmount?.amount || 0);
    if (amt > bestAmt) { bestAmt = amt; best = row.pubkey; }
  }
  if (!best || bestAmt < rawNeed) throw new Error("Need more tokens / 钱包余额不足");
  return best;
}

async function buildTransferIxs(opts: {
  conn: Connection;
  from: PublicKey;
  till: PublicKey;
  payer: PublicKey;
  coin: PayCoin;
  uiAmount: number;
}) {
  const raw = Math.round(opts.uiAmount * Math.pow(10, DECIMALS[opts.coin]));
  if (!(raw > 0)) throw new Error("Amount too small");
  if (opts.coin === "SOL") {
    return [SystemProgram.transfer({ fromPubkey: opts.from, toPubkey: opts.till, lamports: raw })];
  }
  const mint = new PublicKey(MINTS[opts.coin]);
  const programId = await resolveTokenProgramId(opts.conn, mint);
  const source = await findSourceAta(opts.conn, mint, opts.from, programId, raw);
  const toAta = await getAssociatedTokenAddress(mint, opts.till, false, programId, ASSOCIATED_TOKEN_PROGRAM_ID);
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
    createAssociatedTokenAccountIdempotentInstruction(opts.payer, toAta, opts.till, mint, programId, ASSOCIATED_TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(source, mint, toAta, opts.from, raw, DECIMALS[opts.coin], [], programId),
  ];
}

export function quoteCoin(pawlyAmt: number, coin: PayCoin, px: { pawlyUsd: number; solUsd: number; pawlyPerUsdc?: number }) {
  const unit = px.pawlyUsd > 0 ? px.pawlyUsd : (px.pawlyPerUsdc && px.pawlyPerUsdc > 0 ? 1 / px.pawlyPerUsdc : 0);
  const usd = pawlyAmt * unit;
  if (coin === "PAWLY") return { amount: pawlyAmt, label: pawlyAmt.toFixed(2) + " PAWLY", usd };
  if (coin === "SOL") { const v = px.solUsd > 0 && usd > 0 ? usd / px.solUsd : 0; return { amount: v, label: v.toFixed(6) + " SOL", usd }; }
  return { amount: usd, label: usd.toFixed(4) + " " + coin, usd };
}

export async function payHub(opts: {
  from: PublicKey;
  coin: PayCoin;
  amount: number;
  signTransaction?: HubSign;
  sendTransaction?: HubSend;
  wallet?: HubWallet | null;
  onPhase?: PayPhaseFn;
  listPawly?: number;
}): Promise<string> {
  const say = (phase: PayPhase, label: string) => { try { opts.onPhase && opts.onPhase(phase, label); } catch { /* ignore */ } };
  if (!opts.from) throw new Error("Connect wallet first");
  if (!(opts.amount > 0)) throw new Error("Amount too small");
  const till = new PublicKey(SHOP_TILL);
  const sponsor = new PublicKey(SHOP_TILL);
  if (opts.from.equals(till)) throw new Error("Shop till is this wallet");
  const conn = openHubConn();
  say("build", "Pay " + opts.coin + " like dApp Payment");
  const { blockhash } = await withTimeout(conn.getLatestBlockhash("confirmed"), 5000, "RPC timeout");

  const trySponsor = opts.coin !== "SOL";
  if (trySponsor) {
    try {
      say("sign", "Sign " + opts.coin + " to shop (sponsored)");
      const ixs = await buildTransferIxs({ conn, from: opts.from, till, payer: sponsor, coin: opts.coin, uiAmount: opts.amount });
      const tx = new VersionedTransaction(new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message());
      const signed = await userPartialSign(tx, opts.wallet, opts.signTransaction);
      say("sponsor", "Broadcast...");
      const sig = await sponsorBroadcast(signed, 1);
      say("confirm", "Paid " + sig.slice(0, 8));
      await waitSigOk(conn, sig);
      return sig;
    } catch (e) {
      if (isUserCancel(e)) throw e;
      say("sign", "Sponsor skipped — wallet send like Payment");
    }
  }

  say("sign", "Sign " + opts.coin + " in wallet");
  const ixs = await buildTransferIxs({ conn, from: opts.from, till, payer: opts.from, coin: opts.coin, uiAmount: opts.amount });
  const tx = new VersionedTransaction(new TransactionMessage({ payerKey: opts.from, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message());
  const sig = await walletSignAndSend({ conn, tx, wallet: opts.wallet, sendTransaction: opts.sendTransaction });
  if (!sig || sig.length < 40) throw new Error("Wallet did not return signature / 钱包未返回签名");
  say("confirm", "Paid " + sig.slice(0, 8));
  await waitSigOk(conn, sig);
  return sig;
}
