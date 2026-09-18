import { AddressLookupTableAccount, Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import type { PayCoin } from "./petHubSend";

const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const WSOL_MINT = "So11111111111111111111111111111111111111112";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";

function conn() { return new Connection(RPC, "confirmed"); }
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
async function buildSwapTx(opts: { inputMint: string; amount: string; user: string; inputAccount?: string; slippageBps: number }) {
  const paths = ["/.netlify/functions/hub-jup-swap", "/.netlify/functions/hub-jup-swap/", "/dapp/.netlify/functions/hub-jup-swap"];
  const payload = { inputMint: opts.inputMint, outputMint: PAWLY_MINT, amount: opts.amount, userPublicKey: opts.user, inputAccount: opts.inputAccount || "", slippageBps: opts.slippageBps, wrapSol: false };
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
async function altsOf(c: Connection, tx: VersionedTransaction) {
  const lookups = ((tx.message as { addressTableLookups?: { accountKey?: PublicKey }[] }).addressTableLookups) || [];
  const alts: AddressLookupTableAccount[] = [];
  for (let i = 0; i < lookups.length; i++) {
    const rawKey = lookups[i] && lookups[i].accountKey;
    if (!rawKey) continue;
    try {
      const key = rawKey instanceof PublicKey ? rawKey : new PublicKey(String(rawKey));
      const acc = await c.getAddressLookupTable(key);
      if (acc.value) alts.push(acc.value);
    } catch { /* ignore */ }
  }
  return alts;
}

/** One VersionedTransaction: wrap + official-pool swap + PAWLY to till. Caller signs once. */
export async function buildSwapTillTx(opts: { from: PublicKey; coin: PayCoin; coinAmount: number; listPawly: number }): Promise<VersionedTransaction> {
  if (opts.coin === "PAWLY") throw new Error("PAWLY uses direct till pay");
  const c = conn();
  const sponsor = new PublicKey(SHOP_TILL);
  const till = sponsor;
  const isSol = opts.coin === "SOL";
  const inputMint = isSol ? WSOL_MINT : opts.coin === "USDT" ? USDT_MINT : USDC_MINT;
  const rawIn = isSol ? Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL)) : Math.max(1, Math.round(opts.coinAmount * 1e6));
  const listRaw = Math.max(1, Math.round((opts.listPawly > 0 ? opts.listPawly : 1) * 1e6));
  const wrapIxs = [];
  let inputAccount = "";
  if (isSol) {
    const mint = new PublicKey(WSOL_MINT);
    const wsolAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    wrapIxs.push(createAssociatedTokenAccountIdempotentInstruction(sponsor, wsolAta, opts.from, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
    wrapIxs.push(SystemProgram.transfer({ fromPubkey: opts.from, toPubkey: wsolAta, lamports: rawIn }));
    wrapIxs.push(createSyncNativeInstruction(wsolAta, TOKEN_PROGRAM_ID));
    inputAccount = wsolAta.toBase58();
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
  let pack: { swapTransaction?: string } | null = null;
  let last = "swap failed";
  const slips = [200, 400, 800];
  for (let i = 0; i < slips.length; i++) {
    try {
      pack = await buildSwapTx({ inputMint, amount: String(rawIn), user: opts.from.toBase58(), inputAccount, slippageBps: slips[i] });
      if (pack.swapTransaction) break;
    } catch (e) { last = String((e as { message?: string })?.message || e); }
  }
  if (!pack || !pack.swapTransaction) throw new Error(last);
  const rawTx = VersionedTransaction.deserialize(b64ToBytes(String(pack.swapTransaction)));
  const alts = await altsOf(c, rawTx);
  const swapIxs = TransactionMessage.decompile(rawTx.message, { addressLookupTableAccounts: alts }).instructions;
  const pawly = new PublicKey(PAWLY_MINT);
  const userPawly = await getAssociatedTokenAddress(pawly, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const tillPawly = await getAssociatedTokenAddress(pawly, till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const tail = [
    createAssociatedTokenAccountIdempotentInstruction(sponsor, userPawly, opts.from, pawly, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createAssociatedTokenAccountIdempotentInstruction(sponsor, tillPawly, till, pawly, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(userPawly, pawly, tillPawly, opts.from, listRaw, 6, [], TOKEN_PROGRAM_ID),
  ];
  const { blockhash } = await c.getLatestBlockhash();
  return new VersionedTransaction(new TransactionMessage({
    payerKey: sponsor,
    recentBlockhash: blockhash,
    instructions: [...wrapIxs, ...swapIxs, ...tail],
  }).compileToV0Message(alts));
}
