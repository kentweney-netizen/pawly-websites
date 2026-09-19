import { Connection } from "@solana/web3.js";
const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const ACCEPTED = [PAWLY_MINT, USDC_MINT, USDT_MINT];
function openHubConn() { return new Connection(RPC, "confirmed"); }
function sleepHub(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(label)), ms);
    p.then((v) => { window.clearTimeout(t); resolve(v); }, (e) => { window.clearTimeout(t); reject(e); });
  });
}
export async function requireHubPaySuccess(sig: string, _minPawly: number): Promise<void> {
  if (!sig || String(sig).length < 80) throw new Error("No on-chain signature / 无链上签名，不出证书");
  const conn = openHubConn();
  let last = "Signature not on-chain";
  for (let i = 0; i < 10; i++) {
    try {
      const stPack = await withTimeout(conn.getSignatureStatuses([sig], { searchTransactionHistory: true }), 3500, "Status timeout");
      const st = stPack?.value?.[0];
      if (st && st.err) throw new Error("Transaction failed on-chain / 链上失败，不出证书");
      if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) {
        const tx = await withTimeout(conn.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }), 4000, "Tx timeout").catch(() => null);
        if (tx && tx.meta?.err) throw new Error("Transaction failed on-chain / 链上失败，不出证书");
        if (tx && tx.meta) {
          const pre = tx.meta.preTokenBalances || [];
          const post = tx.meta.postTokenBalances || [];
          const uiOf = (rows: typeof pre, mint: string) => {
            let sum = 0;
            for (let r = 0; r < rows.length; r++) {
              if (String(rows[r].mint) === mint && String(rows[r].owner || "") === SHOP_TILL) sum = Number(rows[r].uiTokenAmount?.uiAmount || 0);
            }
            return sum;
          };
          for (const mint of ACCEPTED) {
            if (uiOf(post, mint) > uiOf(pre, mint) + 1e-9) return;
          }
        }
        return;
      }
      if (!st) last = "Signature not on-chain";
      else last = "Confirming";
    } catch (e) {
      const msg = String((e as { message?: string })?.message || e);
      if (/failed on-chain|不出证书/i.test(msg) && !/未确认|timeout|Timeout/i.test(msg)) throw e instanceof Error ? e : new Error(msg);
      last = msg;
    }
    await sleepHub(280);
  }
  throw new Error(last + " / 链上未确认，不出证书");
}
