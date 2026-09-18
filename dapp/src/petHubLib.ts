import type React from "react";
/**
 * PAWLY Pet Hub pay — dual-sign + 12s sponsor cap. Signature = done; never re-pay after sig.
 * Fee payer always hot wallet BPFiVa5. No user-SOL fallback.
 * USDC/USDT/SOL: market swap to PAWLY (official pool route), then PAWLY to till.
 */
import { AddressLookupTableAccount, Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
export { quoteRaydiumOut, quoteHubSwap, fetchHubPx, HUB_POOL } from "./petHubQuote";
export type { HubPx } from "./petHubQuote";
export const PET_SLOT_CAP = 10;
export const FEED_DAY_MAX = 3;
export function sgDay() { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }); }
export function feedsTodayOf(p?: { feedDay?: string; feedsToday?: number } | null) {
  if (!p) return 0;
  return String(p.feedDay || "") === sgDay() ? Number(p.feedsToday || 0) : 0;
}
export function pickFeedPet(list: PetRec[], id?: string) { return list.find((x) => x.id === id) || list[0]; }
const STORE = "pawly_pet_hub_v1_";
const EMAIL_KEY = "pawly_pet_hub_email_v1";
const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
export type PayCoin = "PAWLY" | "USDC" | "USDT" | "SOL";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const OFFICIAL_POOL = "6n8wjFK3mLxrw25q2k6oejt8oYupzWoBPdZqrcHDVwJ";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
const SPONSOR = SHOP_TILL;
export type SceneId = "street" | "hospital" | "shelter" | "shop" | "hotel" | "groom" | "park";
export type PetRec = { id: string; kind: string; species: string; name: string; emoji: string; hunger: number; health: number; streak: number; pricePawly?: number; sig?: string; feedsTotal?: number; feedsToday?: number; feedDay?: string; level?: number };
export type CartKind = "adopt" | "rescue" | "service" | "food";
export type CertJob = { title: string; amount: number; kind: CartKind; species?: string; emoji?: string; sig: string; certPng?: string; photoPng?: string };
export type CartItem = { title: string; amount: number; kind: CartKind; species?: string; emoji?: string; petId?: string };
export const COMPANIONS = [
  { species: "dog", label: "Dog", emoji: "\ud83d\udc36", pricePawly: 80 },
  { species: "cat", label: "Cat", emoji: "\ud83d\udc31", pricePawly: 70 },
  { species: "rabbit", label: "Rabbit", emoji: "\ud83d\udc30", pricePawly: 55 },
  { species: "hamster", label: "Hamster", emoji: "\ud83d\udc39", pricePawly: 25 },
  { species: "parrot", label: "Parrot", emoji: "\ud83e\udd9c", pricePawly: 45 },
  { species: "chicken", label: "Chicken", emoji: "\ud83d\udc14", pricePawly: 20 },
  { species: "duck", label: "Duck", emoji: "\ud83e\udd86", pricePawly: 20 },
  { species: "minipig", label: "Mini pig", emoji: "\ud83d\udc37", pricePawly: 40 },
  { species: "alpaca", label: "Alpaca", emoji: "\ud83e\udd99", pricePawly: 60 },
  { species: "lizard", label: "Lizard", emoji: "\ud83e\udd8e", pricePawly: 22 },
  { species: "snake", label: "Snake", emoji: "\ud83d\udc0d", pricePawly: 26 },
  { species: "gecko", label: "Gecko", emoji: "\ud83e\udd8e", pricePawly: 20 },
  { species: "beetle", label: "Beetle", emoji: "\ud83e\udeb2", pricePawly: 12 },
  { species: "tarantula", label: "Tarantula", emoji: "\ud83d\udd77", pricePawly: 15 },
  { species: "mantis", label: "Mantis", emoji: "\ud83e\udd97", pricePawly: 12 },
];
export const RESCUES = [
  { species: "stray-cat", label: "Stray cat", emoji: "\ud83d\udc31", pricePawly: 10 },
  { species: "stray-dog", label: "Stray dog", emoji: "\ud83d\udc36", pricePawly: 10 },
  { species: "orangutan", label: "Orangutan", emoji: "\ud83e\udda7", pricePawly: 25 },
  { species: "sunbear", label: "Sun bear", emoji: "\ud83d\udc3b", pricePawly: 25 },
  { species: "malayan-tiger", label: "Malayan tiger", emoji: "\ud83d\udc2f", pricePawly: 30 },
  { species: "seaturtle", label: "Sea turtle", emoji: "\ud83d\udc22", pricePawly: 20 },
  { species: "hornbill", label: "Hornbill", emoji: "\ud83e\udd85", pricePawly: 20 },
  { species: "asian-elephant", label: "Asian elephant", emoji: "\ud83d\udc18", pricePawly: 30 },
  { species: "pangolin", label: "Pangolin", emoji: "\ud83e\udd94", pricePawly: 20 },
  { species: "gibbon", label: "Gibbon", emoji: "\ud83d\udc12", pricePawly: 20 },
];
export const FOODS = [
  { id: "snack", label: "Treat / snack", emoji: "\ud83c\udf6a", pricePawly: 6 },
  { id: "catfood", label: "Cat food", emoji: "\ud83d\udc1f", pricePawly: 10 },
  { id: "dogfood", label: "Dog food", emoji: "\ud83e\uddb4", pricePawly: 10 },
  { id: "seed", label: "Bird / farm feed", emoji: "\ud83c\udf3e", pricePawly: 8 },
  { id: "veg", label: "Herbivore mix", emoji: "\ud83e\udd6c", pricePawly: 8 },
  { id: "bug", label: "Insect / reptile feed", emoji: "\ud83c\udf47", pricePawly: 8 },
  { id: "deluxe", label: "Deluxe bowl", emoji: "\ud83c\udf71", pricePawly: 18 },
];
export const TITLE: Record<SceneId, string> = { street: "Tampines pet street", hospital: "Novena Pet Hospital", park: "East Coast park", shop: "Pet Shop", shelter: "Rescue", hotel: "Pet Hotel", groom: "Grooming" };
export const SHOPS: { id: SceneId; label: string }[] = [{ id: "shop", label: "Shop" }, { id: "hospital", label: "Hospital" }, { id: "shelter", label: "Rescue" }, { id: "hotel", label: "Hotel" }, { id: "groom", label: "Groom" }, { id: "park", label: "Park" }];
export const CLIP: Record<SceneId, string> = { street: "pet-hub-street-walk.mp4", hospital: "pet-hub-hospital.mp4", park: "pet-hub-park.mp4", shop: "pet-hub-shop.mp4", shelter: "pet-hub-shelter.mp4", hotel: "pet-hub-hotel.mp4", groom: "pet-hub-groom.mp4" };
export function loadPets(w: string): PetRec[] {
  if (!w) return [];
  try { const raw = localStorage.getItem(STORE + w); const list = raw ? JSON.parse(raw) : []; return Array.isArray(list) ? (list as PetRec[]).filter((p) => p && p.id) : []; } catch { return []; }
}
export function mergePetLists(a: PetRec[], b: PetRec[]): PetRec[] { return [...a, ...b].filter((p, i, arr) => p && p.id && arr.findIndex((x) => x && x.id === p.id) === i).slice(0, PET_SLOT_CAP); }
export async function pullCloudPets(w: string): Promise<PetRec[]> {
  if (!w) return [];
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/pet_hub_roster?wallet=eq." + encodeURIComponent(w) + "&select=pets", { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } });
    const rows = (await r.json()) as { pets?: PetRec[] }[];
    return rows && rows[0] && Array.isArray(rows[0].pets) ? rows[0].pets.filter((p) => p && (p.id || p.sig)) : [];
  } catch { return []; }
}
export function savePets(w: string, list: PetRec[]) {
  if (!w) return;
  try { localStorage.setItem(STORE + w, JSON.stringify(list.slice(0, PET_SLOT_CAP))); } catch { /* ignore */ }
}
export function loadEmail() { try { return localStorage.getItem(EMAIL_KEY) || ""; } catch { return ""; } }
export function saveEmail(v: string) { try { localStorage.setItem(EMAIL_KEY, v); } catch { /* ignore */ } }
export function drawPetPhotoPng(emoji: string, name: string) {
  const c = document.createElement("canvas"); c.width = 720; c.height = 720; const g = c.getContext("2d"); if (!g) return "";
  g.fillStyle = "#7ecbff"; g.fillRect(0, 0, 720, 720); g.font = "280px serif"; g.textAlign = "center"; g.fillText(emoji || "\ud83d\udc3e", 360, 340); g.fillStyle = "#08200f"; g.font = "bold 36px sans-serif"; g.fillText(name || "PAWLY friend", 360, 640); return c.toDataURL("image/png");
}
export function drawCertPng(job: CertJob) {
  const c = document.createElement("canvas"); c.width = 1200; c.height = 800; const g = c.getContext("2d"); if (!g) return "";
  g.fillStyle = "#08140e"; g.fillRect(0, 0, 1200, 800); g.fillStyle = "#00ff9d"; g.font = "bold 42px sans-serif"; g.textAlign = "center"; g.fillText("PAWLY PETS CERTIFICATE", 600, 150); g.fillText(job.emoji || "\ud83d\udc3e", 600, 330); g.fillStyle = "#e8eef7"; g.font = "bold 40px sans-serif"; g.fillText(job.title, 600, 460); return c.toDataURL("image/png");
}
export function downloadDataUrl(name: string, url: string) { if (!url) return; const a = document.createElement("a"); a.href = url; a.download = name; a.click(); }
export function asset(name: string) { return "/" + name.replace(/^\//, ""); }
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
/** Hard gate for GameFi rewards. Wrap / ghost / missing sig must not mint a certificate. */
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
async function postSponsor(signed: VersionedTransaction, feePawly: number) {
  const { r, d } = await fetchJson(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
    body: JSON.stringify({ transaction: txToB64(signed), feePawly: Math.max(1, feePawly || 1) }),
  }, 12000, "Sponsor timeout 12s / 代付超时，请再试一次（已签名勿连点）");
  const body = d as { signature?: string; error?: string };
  if (r.ok && body.signature) return String(body.signature);
  throw new Error(String(body.error || ("Sponsor HTTP " + r.status)));
}
export type HubSign = (tx: VersionedTransaction) => Promise<VersionedTransaction>;
export type HubSend = (tx: VersionedTransaction, conn: Connection) => Promise<string>;
export type HubWallet = {
  adapter?: { signTransaction?: HubSign; signAllTransactions?: (xs: VersionedTransaction[]) => Promise<VersionedTransaction[]> };
  wallet?: { adapter?: { signTransaction?: HubSign; signAllTransactions?: (xs: VersionedTransaction[]) => Promise<VersionedTransaction[]> } };
  signTransaction?: HubSign;
  signAllTransactions?: (xs: VersionedTransaction[]) => Promise<VersionedTransaction[]>;
};
function pickSigned(out: unknown, fallback: VersionedTransaction): VersionedTransaction {
  if (out && typeof out === "object" && typeof (out as VersionedTransaction).serialize === "function") return out as VersionedTransaction;
  return fallback;
}
async function userPartialSign(tx: VersionedTransaction, wallet?: HubWallet | null, signTransaction?: HubSign): Promise<VersionedTransaction> {
  const tries: Array<() => Promise<VersionedTransaction>> = [];
  const wrap = (fn: HubSign) => async () => pickSigned(await fn(tx), tx);
  if (typeof signTransaction === "function") tries.push(wrap(signTransaction));
  const adapter = wallet && (wallet.adapter || (wallet.wallet && wallet.wallet.adapter));
  if (adapter && typeof adapter.signTransaction === "function") tries.push(wrap(adapter.signTransaction));
  if (wallet && typeof wallet.signTransaction === "function") tries.push(wrap(wallet.signTransaction));
  let last: unknown = "Wallet cannot partial-sign / 钱包无法单独签名（代付需要 signTransaction）";
  for (let i = 0; i < tries.length; i++) {
    try { const signed = await tries[i](); if (signed) return signed; } catch (e) { if (isUserCancel(e)) throw e; last = e; }
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
async function buildHubSwapTx(opts: { inputMint: string; amount: string; user: string; inputAccount?: string; slippageBps: number; wrapSol?: boolean }) {
  const paths = ["/.netlify/functions/hub-jup-swap", "/.netlify/functions/hub-jup-swap/"];
  let last = "swap proxy failed";
  const payload = { inputMint: opts.inputMint, outputMint: PAWLY_MINT, amount: opts.amount, userPublicKey: opts.user, inputAccount: opts.inputAccount || "", slippageBps: opts.slippageBps, wrapSol: opts.wrapSol === true };
  for (const path of paths) {
    try {
      const pack = await fetchJson(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, 12000, "Swap quote/build timeout 12s");
      const d = pack.d as { swapTransaction?: string; error?: string };
      if (pack.r.ok && d.swapTransaction) return d;
      last = String(d.error || ("HTTP " + pack.r.status));
    } catch (e) { last = String((e as { message?: string })?.message || e); }
  }
  throw new Error(last);
}
async function ensureUserWsolSponsored(opts: { from: PublicKey; lamports: number; conn: Connection; signTransaction?: HubSign; wallet?: HubWallet }) {
  const n = Math.max(1, Math.round(opts.lamports));
  const sponsor = new PublicKey(SPONSOR);
  const mint = new PublicKey(WSOL_MINT);
  const wsolAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const ixs = [
    createAssociatedTokenAccountIdempotentInstruction(sponsor, wsolAta, opts.from, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    SystemProgram.transfer({ fromPubkey: opts.from, toPubkey: wsolAta, lamports: n }),
    createSyncNativeInstruction(wsolAta, TOKEN_PROGRAM_ID),
  ];
  const { blockhash } = await opts.conn.getLatestBlockhash();
  const vtx = new VersionedTransaction(new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message());
  const signed = await userPartialSign(vtx, opts.wallet, opts.signTransaction);
  const sig = await postSponsor(signed, 1);
  await assertOnchainSuccess(opts.conn, sig);
  return wsolAta.toBase58();
}
async function sendHubSwapTx(opts: { conn: Connection; tx: VersionedTransaction; signTransaction?: HubSign; wallet?: HubWallet }): Promise<string> {
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
  const vtx = new VersionedTransaction(new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(alts));
  const signed = await userPartialSign(vtx, opts.wallet, opts.signTransaction);
  return await postSponsor(signed, 1);
}
export function quoteCoin(pawlyAmt: number, coin: PayCoin, px: { pawlyUsd: number; solUsd: number }) {
  const usd = pawlyAmt * (px.pawlyUsd > 0 ? px.pawlyUsd : 0);
  if (coin === "PAWLY") return { amount: pawlyAmt, label: pawlyAmt.toFixed(2) + " PAWLY", usd };
  if (coin === "SOL") { const v = px.solUsd > 0 && usd > 0 ? usd / px.solUsd : 0; return { amount: v, label: v.toFixed(6) + " SOL", usd }; }
  return { amount: usd, label: usd.toFixed(4) + " " + coin, usd };
}
async function swapCoinToTillPawly(opts: { from: PublicKey; coin: PayCoin; coinAmount: number; conn: Connection; sendTransaction?: HubSend; signTransaction?: HubSign; wallet?: HubWallet; pawlyList?: number; onPhase?: PayPhaseFn }): Promise<string> {
  const say = (phase: PayPhase, label: string) => { try { opts.onPhase && opts.onPhase(phase, label); } catch { /* ignore */ } };
  const isSol = opts.coin === "SOL";
  const inputMint = isSol ? WSOL_MINT : opts.coin === "USDT" ? USDT_MINT : USDC_MINT;
  const rawIn = isSol ? Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL)) : Math.max(1, Math.round(opts.coinAmount * 1e6));
  let inputAccount = "";
  let wrapSol = false;
  if (isSol) {
    say("swap", "Wrap SOL → wSOL");
    inputAccount = await ensureUserWsolSponsored({ from: opts.from, lamports: rawIn, conn: opts.conn, signTransaction: opts.signTransaction, wallet: opts.wallet });
    wrapSol = false;
  } else {
    const inMint = new PublicKey(inputMint);
    const ata = await getAssociatedTokenAddress(inMint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const info = await opts.conn.getAccountInfo(ata);
    if (info) inputAccount = ata.toBase58();
    else {
      const listed = await opts.conn.getTokenAccountsByOwner(opts.from, { mint: inMint });
      if (!listed.value.length) throw new Error("No " + opts.coin + " token account");
      inputAccount = listed.value[0].pubkey.toBase58();
    }
  }
  const before = await pawlyUiOf(opts.conn, opts.from);
  const slips = [200, 400, 800];
  let lastErr: unknown = null;
  let swapSig = "";
  for (let attempt = 0; attempt < slips.length; attempt++) {
    try {
      say("swap", "Quote " + opts.coin + " → PAWLY");
      const pack = await buildHubSwapTx({ inputMint, amount: String(rawIn), user: opts.from.toBase58(), inputAccount, slippageBps: slips[attempt], wrapSol });
      const tx = VersionedTransaction.deserialize(b64ToBytes(String(pack.swapTransaction)));
      say("sign", "Sign swap in wallet");
      swapSig = await sendHubSwapTx({ conn: opts.conn, tx, signTransaction: opts.signTransaction, wallet: opts.wallet });
      say("confirm", "Swap on-chain " + swapSig.slice(0, 8) + "...");
      await assertOnchainSuccess(opts.conn, swapSig);
      lastErr = null;
      break;
    } catch (e) {
      if (isUserCancel(e)) throw e;
      lastErr = e;
      await sleepHub(500);
    }
  }
  if (!swapSig) throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || "Swap failed"));
  let after = before;
  for (let i = 0; i < 3; i++) {
    after = await pawlyUiOf(opts.conn, opts.from);
    if (after > before + 0.000001) break;
    await sleepHub(300);
  }
  const list = Number(opts.pawlyList || 0);
  const gained = Math.max(0, after - before);
  const payAmt = list > 0 ? (gained > 0 ? Math.min(list, gained) : list) : gained;
  if (!(payAmt > 0)) throw new Error("Swap sig " + swapSig.slice(0, 8) + " but PAWLY not in wallet yet / 已兑换请稍候再付店柜，勿连点");
  say("till", "Pay " + payAmt.toFixed(2) + " PAWLY to till");
  let hop2: unknown = null;
  for (let i = 0; i < 3; i++) {
    try {
      return await payHub({ from: opts.from, coin: "PAWLY", amount: payAmt, signTransaction: opts.signTransaction, sendTransaction: opts.sendTransaction, wallet: opts.wallet, onPhase: opts.onPhase });
    } catch (e) {
      if (isUserCancel(e)) throw e;
      hop2 = e;
      await sleepHub(400);
    }
  }
  throw hop2 instanceof Error ? hop2 : new Error(String(hop2 || "Till transfer failed"));
}
export async function payHub(opts: { from: PublicKey; coin: PayCoin; amount: number; signTransaction?: HubSign; sendTransaction?: HubSend; wallet?: HubWallet | null; onPhase?: PayPhaseFn; listPawly?: number }): Promise<string> {
  const say = (phase: PayPhase, label: string) => { try { opts.onPhase && opts.onPhase(phase, label); } catch { /* ignore */ } };
  if (!opts.from) throw new Error("Connect wallet first");
  if (!(opts.amount > 0)) throw new Error("Amount too small");
  if (opts.coin !== "PAWLY" && opts.amount <= 0) throw new Error("No live price, use PAWLY");
  const till = new PublicKey(SHOP_TILL);
  const sponsor = new PublicKey(SPONSOR);
  if (opts.from.equals(till)) throw new Error("Shop till is this wallet");
  const conn = openHubConn();
  if (opts.coin !== "PAWLY") {
    say("swap", "Swap " + opts.coin + " → PAWLY");
    return await swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.amount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction, wallet: opts.wallet || undefined, pawlyList: Number(opts.listPawly || 0), onPhase: opts.onPhase });
  }
  say("build", "Building pay...");
  const mint = new PublicKey(PAWLY_MINT);
  const rawAmt = Math.round(opts.amount * 1e6);
  if (rawAmt <= 0) throw new Error("Amount too small");
  const fromAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const toAta = await getAssociatedTokenAddress(mint, till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  let lastErr: unknown = null;
  let gotSig = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (gotSig) break;
    try {
      const { blockhash } = await withTimeout(conn.getLatestBlockhash(), 8000, "RPC timeout");
      const ixs = [
        createAssociatedTokenAccountIdempotentInstruction(sponsor, toAta, till, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
        createTransferCheckedInstruction(fromAta, mint, toAta, opts.from, rawAmt, 6, [], TOKEN_PROGRAM_ID),
      ];
      const tx = new VersionedTransaction(new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message());
      say("sign", "Sign in wallet");
      const signed = await userPartialSign(tx, opts.wallet, opts.signTransaction);
      say("sponsor", "Paying till...");
      const sig = await postSponsor(signed, 1);
      gotSig = sig;
      say("confirm", "On-chain " + sig.slice(0, 8) + "...");
      await assertOnchainSuccess(conn, sig);
      return sig;
    } catch (e) {
      if (isUserCancel(e)) throw e;
      if (gotSig) return gotSig;
      lastErr = e;
    }
  }
  if (gotSig) return gotSig;
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || "Sponsor pay failed / 代付失败，不会改回用户自付 SOL"));
}
export const ghost: React.CSSProperties = { background: "rgba(0,0,0,0.55)", color: "#c8ffe8", border: "1px solid rgba(0,255,157,0.4)", borderRadius: 10, padding: "6px 8px", cursor: "pointer", fontWeight: 700, fontSize: 11 };
export const primary: React.CSSProperties = { ...ghost, background: "linear-gradient(90deg,#00ff9d,#7cffc8)", color: "#052015", border: "none", fontSize: 13, padding: "10px 12px" };
export const rowBtn: React.CSSProperties = { ...ghost, display: "flex", justifyContent: "space-between", width: "100%", marginBottom: 4, fontSize: 12, padding: "8px 10px" };
