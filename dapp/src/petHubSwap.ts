import { AddressLookupTableAccount, Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction } from "@solana/spl-token";
import type { HubSign, HubSend, HubWallet, PayCoin, PayPhaseFn } from "./petHubSend";

const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const WSOL_MINT = "So11111111111111111111111111111111111111112";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const ATA_PROG = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
const JUP_Q = ["https://lite-api.jup.ag/swap/v1/quote", "https://quote-api.jup.ag/v6/quote"];
const JUP_S = ["https://lite-api.jup.ag/swap/v1/swap", "https://quote-api.jup.ag/v6/swap"];

function conn() { return new Connection(RPC, "confirmed"); }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function isCancel(e: unknown) { return /reject|denied|cancel|user abort/i.test(String((e as { message?: string })?.message || e || "")); }
async function fetchJson(url: string, init: RequestInit, ms: number, label: string) {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => { try { ctrl.abort(); } catch { /* ignore */ } }, ms);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
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
function txToB64(tx: VersionedTransaction) {
  const raw = tx.serialize();
  const u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
  let s = "";
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 8192)));
  return btoa(s);
}
async function broadcast(signed: VersionedTransaction) {
  const { r, d } = await fetchJson(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
    body: JSON.stringify({ transaction: txToB64(signed), feePawly: 1, mode: "send" }),
  }, 20000, "Sponsor timeout");
  const body = d as { signature?: string; error?: string };
  if (r.ok && body.signature) return String(body.signature);
  throw new Error(String(body.error || ("Sponsor HTTP " + r.status)));
}
async function userSign(tx: VersionedTransaction, wallet?: HubWallet | null, signTransaction?: HubSign) {
  const ad = wallet && (wallet.adapter || (wallet.wallet && wallet.wallet.adapter) || wallet);
  const tryAll = async () => {
    const fn = (ad && ad.signAllTransactions) || (wallet && wallet.signAllTransactions);
    if (typeof fn !== "function") return null;
    const arr = await fn([tx]);
    return arr && arr[0] ? arr[0] : null;
  };
  const take = (out: unknown) => (out && typeof (out as VersionedTransaction).serialize === "function" ? out as VersionedTransaction : tx);
  if (typeof signTransaction === "function") {
    try { return take(await signTransaction(tx)); } catch (e) { if (isCancel(e)) throw e; const alt = await tryAll(); if (alt) return take(alt); }
  }
  if (ad && typeof ad.signTransaction === "function") {
    try { return take(await ad.signTransaction(tx)); } catch (e) { if (isCancel(e)) throw e; const alt = await tryAll(); if (alt) return take(alt); throw e; }
  }
  const alt = await tryAll();
  if (alt) return take(alt);
  throw new Error("Wallet cannot sign swap");
}
async function pawlyUi(c: Connection, owner: PublicKey) {
  let total = 0;
  const programs = [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];
  for (let p = 0; p < programs.length; p++) {
    try {
      const listed = await c.getParsedTokenAccountsByOwner(owner, { mint: new PublicKey(PAWLY_MINT), programId: programs[p] });
      const rows = listed && listed.value ? listed.value : [];
      for (let i = 0; i < rows.length; i++) total += Number(rows[i].account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0);
    } catch { /* ignore */ }
  }
  return total;
}
function rewriteAtaPayer(ixs: { programId: PublicKey; keys: { pubkey: PublicKey; isSigner: boolean }[] }[], user: PublicKey, sponsor: PublicKey) {
  const ata = new PublicKey(ATA_PROG);
  for (let i = 0; i < ixs.length; i++) {
    if (!ixs[i].programId.equals(ata) || !ixs[i].keys[0]) continue;
    if (ixs[i].keys[0].pubkey.equals(user)) { ixs[i].keys[0].pubkey = sponsor; ixs[i].keys[0].isSigner = false; }
  }
}
function u32le(data: Uint8Array) {
  if (!data || data.length < 4) return -1;
  return data[0] + data[1] * 256 + data[2] * 65536 + data[3] * 16777216;
}
function rewriteCloseToSponsor(ixs: { programId: PublicKey; data: Uint8Array; keys: { pubkey: PublicKey; isSigner: boolean }[] }[], user: PublicKey, sponsor: PublicKey) {
  for (let i = 0; i < ixs.length; i++) {
    const ix = ixs[i];
    const closeTok = ix.programId.equals(TOKEN_PROGRAM_ID) || ix.programId.equals(TOKEN_2022_PROGRAM_ID);
    if (closeTok && ix.data && ix.data.length >= 1 && ix.data[0] === 9 && ix.keys[1] && ix.keys[1].pubkey.equals(user)) {
      ix.keys[1].pubkey = sponsor;
    }
    if (ix.programId.equals(SystemProgram.programId) && u32le(ix.data) === 2 && ix.keys[1] && ix.keys[1].pubkey.equals(user) && ix.keys[0] && !ix.keys[0].pubkey.equals(user)) {
      ix.keys[1].pubkey = sponsor;
    }
  }
}
async function jupSwapTx(opts: { inputMint: string; amount: string; user: string; slippageBps: number; wrapSol: boolean }) {
  const q = "?inputMint=" + opts.inputMint + "&outputMint=" + PAWLY_MINT + "&amount=" + opts.amount + "&slippageBps=" + opts.slippageBps + "&swapMode=ExactIn";
  let quote: Record<string, unknown> | null = null;
  for (let i = 0; i < JUP_Q.length; i++) {
    try {
      const pack = await fetchJson(JUP_Q[i] + q, { method: "GET" }, 10000, "Jup quote timeout");
      if (pack.r.ok && (pack.d as { outAmount?: string }).outAmount) { quote = pack.d as Record<string, unknown>; break; }
    } catch { /* next */ }
  }
  if (!quote) throw new Error("Jupiter no quote");
  for (let i = 0; i < JUP_S.length; i++) {
    try {
      const pack = await fetchJson(JUP_S[i], {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: opts.user,
          wrapAndUnwrapSol: opts.wrapSol,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 50000,
        }),
      }, 12000, "Jup swap timeout");
      const tx = String((pack.d as { swapTransaction?: string }).swapTransaction || "");
      if (pack.r.ok && tx) return tx;
    } catch { /* next */ }
  }
  throw new Error("Jupiter no swap tx");
}
async function raySwapTx(opts: { inputMint: string; amount: string; user: string; inputAccount?: string; slippageBps: number; wrapSol: boolean }) {
  const paths = ["/.netlify/functions/hub-jup-swap", "/dapp/.netlify/functions/hub-jup-swap"];
  let last = "Raydium failed";
  for (const path of paths) {
    try {
      const pack = await fetchJson(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inputMint: opts.inputMint, outputMint: PAWLY_MINT, amount: opts.amount, userPublicKey: opts.user, inputAccount: opts.inputAccount || "", slippageBps: opts.slippageBps, wrapSol: opts.wrapSol }) }, 12000, "Raydium timeout");
      const tx = String((pack.d as { swapTransaction?: string }).swapTransaction || "");
      if (pack.r.ok && tx) return tx;
      last = String((pack.d as { error?: string }).error || last);
    } catch (e) { last = String((e as { message?: string })?.message || e); }
  }
  throw new Error(last);
}
async function sponsorize(rawB64: string, user: PublicKey, sponsor: PublicKey, wrapLamports = 0) {
  const c = conn();
  const rawTx = VersionedTransaction.deserialize(b64ToBytes(rawB64));
  const lookups = ((rawTx.message as { addressTableLookups?: { accountKey?: PublicKey }[] }).addressTableLookups) || [];
  const alts: AddressLookupTableAccount[] = [];
  for (let a = 0; a < lookups.length; a++) {
    const rawKey = lookups[a] && lookups[a].accountKey;
    if (!rawKey) continue;
    try {
      const key = rawKey instanceof PublicKey ? rawKey : new PublicKey(String(rawKey));
      const acc = await c.getAddressLookupTable(key);
      if (acc.value) alts.push(acc.value);
    } catch { /* ignore */ }
  }
  const ixs = TransactionMessage.decompile(rawTx.message, { addressLookupTableAccounts: alts }).instructions;
  const wsolMint = new PublicKey(WSOL_MINT);
  const wsolAta = await getAssociatedTokenAddress(wsolMint, user, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  rewriteAtaPayer(ixs, user, sponsor);
  rewriteCloseToSponsor(ixs as { programId: PublicKey; data: Uint8Array; keys: { pubkey: PublicKey; isSigner: boolean }[] }[], user, sponsor);
  if (wrapLamports > 0) {
    const wrapIxs = [
      createAssociatedTokenAccountIdempotentInstruction(sponsor, wsolAta, user, wsolMint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
      SystemProgram.transfer({ fromPubkey: user, toPubkey: wsolAta, lamports: wrapLamports }),
      createSyncNativeInstruction(wsolAta),
    ];
    ixs.unshift(...wrapIxs);
  }
  const { blockhash } = await c.getLatestBlockhash("confirmed");
  return new VersionedTransaction(new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(alts));
}

export async function swapCoinToPawly(opts: {
  from: PublicKey; coin: PayCoin; coinAmount: number;
  signTransaction?: HubSign; wallet?: HubWallet | null; onPhase?: PayPhaseFn;
}): Promise<{ sig: string; gained: number; have: number }> {
  const say = (label: string) => { try { opts.onPhase && opts.onPhase("swap", label); } catch { /* ignore */ } };
  if (opts.coin === "PAWLY") throw new Error("Already PAWLY");
  const c = conn();
  const sponsor = new PublicKey(SHOP_TILL);
  const isSol = opts.coin === "SOL";
  const inputMint = isSol ? WSOL_MINT : opts.coin === "USDT" ? USDT_MINT : USDC_MINT;
  const rawIn = isSol ? Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL)) : Math.max(1, Math.round(opts.coinAmount * 1e6));
  let inputAccount = "";
  if (isSol) {
    inputAccount = (await getAssociatedTokenAddress(new PublicKey(WSOL_MINT), opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)).toBase58();
  } else {
    const inMint = new PublicKey(inputMint);
    const ata = await getAssociatedTokenAddress(inMint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const info = await c.getAccountInfo(ata);
    if (info) inputAccount = ata.toBase58();
    else {
      const listed = await c.getTokenAccountsByOwner(opts.from, { mint: inMint });
      if (!listed.value.length) throw new Error("No " + opts.coin + " in wallet");
      inputAccount = listed.value[0].pubkey.toBase58();
    }
  }
  const before = await pawlyUi(c, opts.from);
  let last = "swap failed";
  let swapSig = "";
  const user = opts.from.toBase58();
  const tries: Array<() => Promise<string>> = isSol
    ? [
      () => raySwapTx({ inputMint, amount: String(rawIn), user, inputAccount, slippageBps: 400, wrapSol: false }),
      () => jupSwapTx({ inputMint, amount: String(rawIn), user, slippageBps: 400, wrapSol: false }),
      () => raySwapTx({ inputMint, amount: String(rawIn), user, inputAccount, slippageBps: 800, wrapSol: false }),
      () => jupSwapTx({ inputMint, amount: String(rawIn), user, slippageBps: 800, wrapSol: false }),
    ]
    : [
      () => jupSwapTx({ inputMint, amount: String(rawIn), user, slippageBps: 400, wrapSol: false }),
      () => raySwapTx({ inputMint, amount: String(rawIn), user, inputAccount, slippageBps: 400, wrapSol: false }),
      () => jupSwapTx({ inputMint, amount: String(rawIn), user, slippageBps: 800, wrapSol: false }),
      () => raySwapTx({ inputMint, amount: String(rawIn), user, inputAccount, slippageBps: 800, wrapSol: false }),
    ];
  for (let i = 0; i < tries.length; i++) {
    try {
      say("1/2 Sign " + opts.coin + " \u2192 PAWLY");
      const vtx = await sponsorize(await tries[i](), opts.from, sponsor, isSol ? rawIn : 0);
      swapSig = await broadcast(await userSign(vtx, opts.wallet, opts.signTransaction));
      last = "";
      break;
    } catch (e) {
      if (isCancel(e)) throw e;
      last = String((e as { message?: string })?.message || e);
      await sleep(200);
    }
  }
  if (!swapSig) throw new Error(last || "USDC/USDT/SOL swap failed");
  say("2/2 Sign PAWLY to shop now");
  return { sig: swapSig, gained: 0, have: before };
}

export async function swapThenTill(opts: {
  from: PublicKey; coin: PayCoin; coinAmount: number; listPawly: number;
  signTransaction?: HubSign; sendTransaction?: HubSend; wallet?: HubWallet | null; onPhase?: PayPhaseFn;
}): Promise<string> {
  await swapCoinToPawly({
    from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount,
    signTransaction: opts.signTransaction, wallet: opts.wallet, onPhase: opts.onPhase,
  });
  const payAmt = Number(opts.listPawly || 0);
  if (!(payAmt > 0)) throw new Error("No PAWLY list price");
  try { opts.onPhase && opts.onPhase("till", "2/2 Sign " + payAmt.toFixed(2) + " PAWLY to till"); } catch { /* ignore */ }
  const { payHub } = await import("./petHubSend");
  return await payHub({
    from: opts.from, coin: "PAWLY", amount: payAmt,
    signTransaction: opts.signTransaction, sendTransaction: opts.sendTransaction,
    wallet: opts.wallet, onPhase: opts.onPhase,
  });
}
