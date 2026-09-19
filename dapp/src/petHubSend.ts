import { ComputeBudgetProgram, Connection, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
export type PayCoin = "PAWLY" | "USDC" | "USDT" | "SOL";
export type PayPhase = "build" | "sign" | "sponsor" | "confirm" | "swap" | "till";
export type PayPhaseFn = (phase: PayPhase, label: string) => void;
export type HubSign = (tx: VersionedTransaction) => Promise<VersionedTransaction>;
export type HubSend = (tx: VersionedTransaction, conn: Connection) => Promise<string>;
export type HubWallet = {
  adapter?: { signTransaction?: HubSign; signAllTransactions?: (xs: VersionedTransaction[]) => Promise<VersionedTransaction[]> };
  wallet?: { adapter?: { signTransaction?: HubSign; signAllTransactions?: (xs: VersionedTransaction[]) => Promise<VersionedTransaction[]> } };
  signTransaction?: HubSign;
  signAllTransactions?: (xs: VersionedTransaction[]) => Promise<VersionedTransaction[]>;
};
const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
function openHubConn() { return new Connection(RPC, "confirmed"); }
function isUserCancel(e: unknown) { return /reject|denied|cancel|user abort/i.test(String((e as { message?: string })?.message || e || "")); }
function isSimErr(e: unknown) { return /simulat/i.test(String((e as { message?: string })?.message || e || "")); }
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
async function waitSigOk(conn: Connection, sig: string) {
  for (let i = 0; i < 6; i++) {
    const stPack = await withTimeout(conn.getSignatureStatuses([sig], { searchTransactionHistory: true }), 3000, "Status timeout");
    const st = stPack && stPack.value ? stPack.value[0] : null;
    if (st && st.err) throw new Error("Transaction failed on-chain / 链上失败");
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized" || st.slot)) return;
    await sleepHub(250);
  }
}
async function sponsorBroadcast(signed: VersionedTransaction, feePawly: number) {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => { try { ctrl.abort(); } catch { /* ignore */ } }, 14000);
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
function pickSigned(out: unknown, fallback: VersionedTransaction): VersionedTransaction {
  if (out && typeof out === "object" && typeof (out as VersionedTransaction).serialize === "function") return out as VersionedTransaction;
  return fallback;
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
      if (!isSimErr(e)) throw e;
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
  throw new Error("Wallet cannot partial-sign / 钱包无法单独签名（代付需要 signTransaction）");
}
export function quoteCoin(pawlyAmt: number, coin: PayCoin, px: { pawlyUsd: number; solUsd: number; pawlyPerUsdc?: number }) {
  const unit = px.pawlyUsd > 0 ? px.pawlyUsd : (px.pawlyPerUsdc && px.pawlyPerUsdc > 0 ? 1 / px.pawlyPerUsdc : 0);
  const usd = pawlyAmt * unit;
  if (coin === "PAWLY") return { amount: pawlyAmt, label: pawlyAmt.toFixed(2) + " PAWLY", usd };
  if (coin === "SOL") { const v = px.solUsd > 0 && usd > 0 ? usd / px.solUsd : 0; return { amount: v, label: v.toFixed(6) + " SOL", usd }; }
  return { amount: usd, label: usd.toFixed(4) + " " + coin, usd };
}
export async function payHub(opts: { from: PublicKey; coin: PayCoin; amount: number; signTransaction?: HubSign; sendTransaction?: HubSend; wallet?: HubWallet | null; onPhase?: PayPhaseFn; listPawly?: number }): Promise<string> {
  const say = (phase: PayPhase, label: string) => { try { opts.onPhase && opts.onPhase(phase, label); } catch { /* ignore */ } };
  if (!opts.from) throw new Error("Connect wallet first");
  if (!(opts.amount > 0)) throw new Error("Amount too small");
  const till = new PublicKey(SHOP_TILL);
  const sponsor = new PublicKey(SHOP_TILL);
  if (opts.from.equals(till)) throw new Error("Shop till is this wallet");
  const list = Number(opts.listPawly || (opts.coin === "PAWLY" ? opts.amount : 0));
  if (opts.coin !== "PAWLY") {
    const have = await readPawlyUi(opts.from);
    if (list > 0 && have + 0.000001 >= list) {
      say("till", "Wallet has " + have.toFixed(2) + " PAWLY \u2014 1 sign to shop");
      return await payHub({ ...opts, coin: "PAWLY", amount: list, listPawly: list });
    }
    say("swap", "1/2 Swap " + opts.coin + " \u2192 PAWLY");
    const mod = await import("./petHubSwap");
    return await mod.swapThenTill({
      from: opts.from, coin: opts.coin, coinAmount: opts.amount, listPawly: list,
      signTransaction: opts.signTransaction, sendTransaction: opts.sendTransaction,
      wallet: opts.wallet || undefined, onPhase: opts.onPhase,
    });
  }
  const conn = openHubConn();
  say("sign", "Sign " + Number(opts.amount).toFixed(2) + " PAWLY to shop");
  const mint = new PublicKey(PAWLY_MINT);
  const rawAmt = Math.round(opts.amount * 1e6);
  const fromAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const toAta = await getAssociatedTokenAddress(mint, till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const { blockhash } = await withTimeout(conn.getLatestBlockhash("confirmed"), 5000, "RPC timeout");
  const tx = new VersionedTransaction(new TransactionMessage({
    payerKey: sponsor,
    recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
      createAssociatedTokenAccountIdempotentInstruction(sponsor, toAta, till, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
      createTransferCheckedInstruction(fromAta, mint, toAta, opts.from, rawAmt, 6, [], TOKEN_PROGRAM_ID),
    ],
  }).compileToV0Message());
  const signed = await userPartialSign(tx, opts.wallet, opts.signTransaction);
  say("sponsor", "Broadcast...");
  const sig = await sponsorBroadcast(signed, 1);
  say("confirm", "Paid " + sig.slice(0, 8));
  await waitSigOk(conn, sig);
  return sig;
}
