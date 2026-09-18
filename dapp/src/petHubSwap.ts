import { AddressLookupTableAccount, Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import type { HubSign, HubSend, HubWallet, PayCoin, PayPhaseFn } from "./petHubSend";

const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const WSOL_MINT = "So11111111111111111111111111111111111111112";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";

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
  try {
    const ata = await getAssociatedTokenAddress(new PublicKey(PAWLY_MINT), owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const info = await c.getTokenAccountBalance(ata);
    return Number(info.value.uiAmount || 0);
  } catch { return 0; }
}
async function buildSwapTx(opts: { inputMint: string; amount: string; user: string; inputAccount?: string; slippageBps: number; wrapSol?: boolean }) {
  const paths = ["/.netlify/functions/hub-jup-swap", "/.netlify/functions/hub-jup-swap/", "/dapp/.netlify/functions/hub-jup-swap"];
  const payload = { inputMint: opts.inputMint, outputMint: PAWLY_MINT, amount: opts.amount, userPublicKey: opts.user, inputAccount: opts.inputAccount || "", slippageBps: opts.slippageBps, wrapSol: opts.wrapSol === true };
  let last = "swap proxy failed";
  for (const path of paths) {
    try {
      const pack = await fetchJson(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, 12000, "Swap timeout 12s");
      const d = pack.d as { swapTransaction?: string; error?: string };
      if (pack.r.ok && d.swapTransaction) return d;
      last = String(d.error || ("HTTP " + pack.r.status));
    } catch (e) { last = String((e as { message?: string })?.message || e); }
  }
  throw new Error(last);
}

/** Sign 1: wrap if needed + official pool → PAWLY into the user wallet. Does NOT pay till. */
export async function swapCoinToPawly(opts: {
  from: PublicKey; coin: PayCoin; coinAmount: number;
  signTransaction?: HubSign; wallet?: HubWallet | null; onPhase?: PayPhaseFn;
}): Promise<{ sig: string; gained: number }> {
  const say = (label: string) => { try { opts.onPhase && opts.onPhase("swap", label); } catch { /* ignore */ } };
  if (opts.coin === "PAWLY") throw new Error("Already PAWLY");
  const c = conn();
  const sponsor = new PublicKey(SHOP_TILL);
  const isSol = opts.coin === "SOL";
  const inputMint = isSol ? WSOL_MINT : opts.coin === "USDT" ? USDT_MINT : USDC_MINT;
  const rawIn = isSol ? Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL)) : Math.max(1, Math.round(opts.coinAmount * 1e6));
  const wrapIxs = [];
  let inputAccount = "";
  let wrapSol = false;
  if (isSol) {
    const mint = new PublicKey(WSOL_MINT);
    const wsolAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    wrapIxs.push(createAssociatedTokenAccountIdempotentInstruction(sponsor, wsolAta, opts.from, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
    wrapIxs.push(SystemProgram.transfer({ fromPubkey: opts.from, toPubkey: wsolAta, lamports: rawIn }));
    wrapIxs.push(createSyncNativeInstruction(wsolAta, TOKEN_PROGRAM_ID));
    inputAccount = wsolAta.toBase58();
    wrapSol = false;
  } else {
    const inMint = new PublicKey(inputMint);
    const ata = await getAssociatedTokenAddress(inMint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const info = await c.getAccountInfo(ata);
    if (info) inputAccount = ata.toBase58();
    else {
      const listed = await c.getTokenAccountsByOwner(opts.from, { mint: inMint });
      if (!listed.value.length) throw new Error("No " + opts.coin + " token account");
      inputAccount = listed.value[0].pubkey.toBase58();
    }
  }
  const before = await pawlyUi(c, opts.from);
  let last = "swap failed";
  let swapSig = "";
  const slips = [200, 400, 800];
  for (let i = 0; i < slips.length; i++) {
    try {
      say("1/2 Sign swap " + opts.coin + " → PAWLY");
      const pack = await buildSwapTx({ inputMint, amount: String(rawIn), user: opts.from.toBase58(), inputAccount, slippageBps: slips[i], wrapSol });
      const rawTx = VersionedTransaction.deserialize(b64ToBytes(String(pack.swapTransaction)));
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
      const swapIxs = TransactionMessage.decompile(rawTx.message, { addressLookupTableAccounts: alts }).instructions;
      const { blockhash } = await c.getLatestBlockhash("confirmed");
      const vtx = new VersionedTransaction(new TransactionMessage({
        payerKey: sponsor,
        recentBlockhash: blockhash,
        instructions: [...wrapIxs, ...swapIxs],
      }).compileToV0Message(alts));
      const signed = await userSign(vtx, opts.wallet, opts.signTransaction);
      swapSig = await broadcast(signed);
      last = "";
      break;
    } catch (e) {
      if (isCancel(e)) throw e;
      last = String((e as { message?: string })?.message || e);
      await sleep(400);
    }
  }
  if (!swapSig) throw new Error(last || "Swap failed");
  let after = before;
  for (let i = 0; i < 12; i++) {
    after = await pawlyUi(c, opts.from);
    if (after > before + 0.000001) break;
    await sleep(600);
  }
  const gained = Math.max(0, after - before);
  if (!(gained > 0)) throw new Error("Swap " + swapSig.slice(0, 8) + " landed but PAWLY not in wallet yet / 已兑换请稍候再付店柜");
  return { sig: swapSig, gained };
}

export async function swapThenTill(opts: {
  from: PublicKey; coin: PayCoin; coinAmount: number; listPawly: number;
  signTransaction?: HubSign; sendTransaction?: HubSend; wallet?: HubWallet | null; onPhase?: PayPhaseFn;
}): Promise<string> {
  const hop1 = await swapCoinToPawly({
    from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount,
    signTransaction: opts.signTransaction, wallet: opts.wallet, onPhase: opts.onPhase,
  });
  const list = Number(opts.listPawly || 0);
  const payAmt = list > 0 ? Math.min(list, hop1.gained > 0 ? hop1.gained : list) : hop1.gained;
  if (!(payAmt > 0)) throw new Error("No PAWLY to send to till");
  try { opts.onPhase && opts.onPhase("till", "2/2 Sign pay " + payAmt.toFixed(2) + " PAWLY to till"); } catch { /* ignore */ }
  const { payHub } = await import("./petHubSend");
  return await payHub({
    from: opts.from, coin: "PAWLY", amount: payAmt,
    signTransaction: opts.signTransaction, sendTransaction: opts.sendTransaction,
    wallet: opts.wallet, onPhase: opts.onPhase,
  });
}
