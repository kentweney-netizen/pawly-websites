/**
 * P2P PAWLY to seller. No platform cut. Fee payer = hot wallet BPFiVa5.
 */
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import type { HubSign, HubWallet } from "./petHubLib";

const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";

function txToB64(tx: VersionedTransaction) {
  const raw = tx.serialize();
  const u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
  try {
    const Buf = (globalThis as { Buffer?: { from: (a: Uint8Array) => { toString: (e: string) => string } } }).Buffer;
    if (Buf && typeof Buf.from === "function") return Buf.from(u8).toString("base64");
  } catch { /* ignore */ }
  let s = "";
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + 8192)));
  return btoa(s);
}

async function signTx(tx: VersionedTransaction, wallet?: HubWallet | null, signTransaction?: HubSign) {
  const tries: HubSign[] = [];
  if (typeof signTransaction === "function") tries.push(signTransaction);
  const adapter = wallet && (wallet.adapter || (wallet.wallet && wallet.wallet.adapter));
  if (adapter && adapter.signTransaction) tries.push(adapter.signTransaction);
  if (wallet && wallet.signTransaction) tries.push(wallet.signTransaction);
  let last: unknown = "Wallet cannot partial-sign";
  for (let i = 0; i < tries.length; i++) {
    try { return await tries[i](tx); } catch (e) { last = e; }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export async function payPeer(opts: {
  from: PublicKey;
  to: string;
  amount: number;
  signTransaction?: HubSign;
  wallet?: HubWallet | null;
  onProgress?: (s: string) => void;
}): Promise<string> {
  if (!opts.to) throw new Error("No seller wallet");
  const dest = new PublicKey(opts.to);
  if (opts.from.equals(dest)) throw new Error("Cannot buy your own listing");
  const sponsor = new PublicKey(SHOP_TILL);
  const conn = new Connection(RPC, "confirmed");
  const mint = new PublicKey(PAWLY_MINT);
  const rawAmt = Math.round(opts.amount * 1e6);
  if (rawAmt <= 0) throw new Error("Amount too small");
  if (opts.onProgress) opts.onProgress("P2P PAWLY to seller...");
  const fromAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const toAta = await getAssociatedTokenAddress(mint, dest, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  let have = 0;
  try { have = Number((await conn.getTokenAccountBalance(fromAta)).value.uiAmount || 0); } catch { have = 0; }
  if (have + 0.000001 < opts.amount) throw new Error("Need " + opts.amount.toFixed(2) + " PAWLY, wallet has " + have.toFixed(2));
  const { blockhash } = await conn.getLatestBlockhash();
  const ixs = [
    createAssociatedTokenAccountIdempotentInstruction(sponsor, toAta, dest, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(fromAta, mint, toAta, opts.from, rawAmt, 6, [], TOKEN_PROGRAM_ID),
  ];
  const tx = new VersionedTransaction(new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message());
  const signed = await signTx(tx, opts.wallet, opts.signTransaction);
  if (opts.onProgress) opts.onProgress("Paying seller...");
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = window.setTimeout(() => { try { ctrl && ctrl.abort(); } catch { /* ignore */ } }, 12000);
  let r: Response;
  try {
    r = await fetch(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
      body: JSON.stringify({ transaction: txToB64(signed), feePawly: 1 }),
      signal: ctrl ? ctrl.signal : undefined,
    });
  } catch (e) {
    window.clearTimeout(timer);
    if (String((e as { name?: string })?.name || "") === "AbortError") throw new Error("Sponsor timeout 12s / 代付超时，勿连点");
    throw e;
  }
  window.clearTimeout(timer);
  const d = (await r.json().catch(() => ({}))) as { signature?: string; error?: string };
  if (!r.ok || !d.signature) throw new Error(String(d.error || ("Sponsor HTTP " + r.status)));
  const sig = String(d.signature);
  if (opts.onProgress) opts.onProgress("On-chain " + sig.slice(0, 8) + "...");
  try {
    const st = (await conn.getSignatureStatuses([sig], { searchTransactionHistory: true })).value?.[0];
    if (st && st.err) throw new Error("Transaction failed on-chain");
  } catch (e) {
    if (/failed on-chain/i.test(String((e as { message?: string })?.message || e))) throw e;
  }
  return sig;
}
