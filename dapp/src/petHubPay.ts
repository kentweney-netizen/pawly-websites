import { AddressLookupTableAccount, ComputeBudgetProgram, Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
export type PayCoin = "PAWLY" | "USDC" | "USDT" | "SOL";
const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
const SPONSOR = SHOP_TILL;
const WSOL_MINT = "So11111111111111111111111111111111111111112";
function openHubConn() { return new Connection(RPC, "confirmed"); }
function sleepHub(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function isUserCancel(e: unknown) { return /reject|denied|cancel|user abort/i.test(String((e as { message?: string })?.message || e || "")); }
export type PayPhase = "build" | "sign" | "sponsor" | "confirm" | "swap" | "till";
export type PayPhaseFn = (phase: PayPhase, label: string) => void;
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(label)), ms);
    p.then((v) => { window.clearTimeout(t); resolve(v); }, (e) => { window.clearTimeout(t); reject(e); });
  });
}
async function fetchJson(url: string, init: RequestInit, ms: number, label: string) {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = window.setTimeout(() => { try { ctrl && ctrl.abort(); } catch { /* ignore */ } }, ms);
  try {
    const r = await fetch(url, { ...init, signal: ctrl ? ctrl.signal : init.signal });
    const d = await r.json().catch(() => ({}));
    return { r, d };
  } catch (e) {
    if (String((e as { name?: string })?.name || "") === "AbortError") throw new Error(label);
    throw e;
  } finally { window.clearTimeout(timer); }
}
function b64ToBytes(b64: string) {
  let s = String(b64 || "").trim();
  const comma = s.indexOf(",");
  if (s.slice(0, 5) === "data:" && comma >= 0) s = s.slice(comma + 1);
  s = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(raw: Uint8Array) {
  const u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
  let s = "";
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 8192)));
  return btoa(s);
}
function txToB64(tx: VersionedTransaction) {
  const raw = tx.serialize();
  const u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
  try {
    const Buf = (globalThis as { Buffer?: { from: (a: Uint8Array) => { toString: (e: string) => string } } }).Buffer;
    if (Buf && typeof Buf.from === "function") return Buf.from(u8).toString("base64");
  } catch { /* ignore */ }
  return bytesToB64(u8);
}
async function resolveTokenProgramId(conn: Connection, mint: PublicKey) {
  try {
    const info = await conn.getAccountInfo(mint, "confirmed");
    if (info && info.owner) return info.owner;
  } catch { /* ignore */ }
  return TOKEN_PROGRAM_ID;
}
async function findPawlySource(conn: Connection, owner: PublicKey, rawAmt: number, tokenProgramId: PublicKey, mint: PublicKey) {
  const canon = await getAssociatedTokenAddress(mint, owner, false, tokenProgramId, ASSOCIATED_TOKEN_PROGRAM_ID);
  const readAmt = async (ata: PublicKey) => {
    try {
      const b = await conn.getTokenAccountBalance(ata);
      return Number(b.value.amount || 0);
    } catch { return -1; }
  };
  const canonAmt = await readAmt(canon);
  if (canonAmt >= rawAmt) return { source: canon, program: tokenProgramId, have: canonAmt };
  const programs = [tokenProgramId, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];
  let best: { source: PublicKey; program: PublicKey; have: number } | null = canonAmt > 0 ? { source: canon, program: tokenProgramId, have: canonAmt } : null;
  for (let p = 0; p < programs.length; p++) {
    const prog = programs[p];
    try {
      const listed = await conn.getParsedTokenAccountsByOwner(owner, { mint, programId: prog });
      const rows = listed && listed.value ? listed.value : [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const amt = Number(row.account?.data?.parsed?.info?.tokenAmount?.amount || 0);
        if (amt > (best ? best.have : -1)) best = { source: row.pubkey, program: prog, have: amt };
      }
    } catch { /* ignore */ }
  }
  if (best && best.have >= rawAmt) return best;
  const haveUi = ((best && best.have > 0 ? best.have : (canonAmt > 0 ? canonAmt : 0)) / 1e6);
  throw new Error("Need " + (rawAmt / 1e6).toFixed(2) + " PAWLY, wallet has " + haveUi.toFixed(2) + " / 余额不足，钱包模拟会失败");
}
async function softSimHub(conn: Connection, tx: VersionedTransaction) {
  try {
    const sim = await withTimeout(conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true }), 5000, "sim timeout");
    const err = sim && sim.value && sim.value.err;
    if (!err) return;
    const s = JSON.stringify(err);
    if (/InsufficientFunds|insufficient funds|0x1\b/i.test(s)) throw new Error("Simulation: insufficient funds / 余额或租金不足");
    if (/AccountNotFound|could not find account|InvalidAccount/i.test(s)) throw new Error("Simulation: missing token account / 缺代币账户");
  } catch (e) {
    const msg = String((e as { message?: string })?.message || e);
    if (/Simulation:/.test(msg)) throw e instanceof Error ? e : new Error(msg);
  }
}
async function assertOnchainSuccess(conn: Connection, s: string) {
  if (!s || s.length < 32) throw new Error("Empty signature");
  try {
    const stPack = await withTimeout(conn.getSignatureStatuses([s], { searchTransactionHistory: true }), 6000, "Status timeout");
    const st = stPack?.value?.[0];
    if (st && st.err) throw new Error("Transaction failed on-chain");
  } catch (e) {
    if (/failed on-chain/i.test(String((e as { message?: string })?.message || e))) throw e;
  }
}
export async function requireHubPaySuccess(sig: string, minPawly: number): Promise<void> {
  if (!sig || String(sig).length < 80) throw new Error("No on-chain signature / 无链上签名，不出证书");
  const conn = openHubConn();
  let last = "Signature not found";
  for (let i = 0; i < 8; i++) {
    try {
      const stPack = await withTimeout(conn.getSignatureStatuses([sig], { searchTransactionHistory: true }), 5000, "Status timeout");
      const st = stPack?.value?.[0];
      if (st && st.err) throw new Error("Transaction failed on-chain / 链上失败，不出证书");
      if (!st) { last = "Signature not on-chain"; await sleepHub(450); continue; }
      const tx = await withTimeout(conn.getTransaction(sig, { maxSupportedTransactionVersion: 0 }), 6000, "Tx timeout");
      if (!tx) { last = "Tx not indexed"; await sleepHub(450); continue; }
      if (tx.meta?.err) throw new Error("Transaction failed on-chain / 链上失败，不出证书");
      const pre = tx.meta?.preTokenBalances || [];
      const post = tx.meta?.postTokenBalances || [];
      const uiOf = (rows: typeof pre, owner: string) => {
        const row = rows.find((b) => String(b.mint) === PAWLY_MINT && String(b.owner) === owner);
        return row ? Number(row.uiTokenAmount?.uiAmount || 0) : 0;
      };
      const delta = uiOf(post, SHOP_TILL) - uiOf(pre, SHOP_TILL);
      if (!(delta > 0)) throw new Error("No PAWLY to shop till / 货款未进店柜，不出证书");
      if (minPawly > 0 && delta + 0.000001 < minPawly * 0.5) throw new Error("Till got " + delta.toFixed(2) + " PAWLY, need " + minPawly + " / 货款不足，不出证书");
      return;
    } catch (e) {
      const msg = String((e as { message?: string })?.message || e);
      if (/failed on-chain|未进店柜|货款不足|不出证书/i.test(msg)) throw e instanceof Error ? e : new Error(msg);
      last = msg;
    }
    await sleepHub(450);
  }
  throw new Error(last + " / 未确认 success，不出证书。请打开 Solscan，勿连点。");
}
