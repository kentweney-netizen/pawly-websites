import { Connection } from "@solana/web3.js";
const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
function openHubConn() { return new Connection(RPC, "confirmed"); }
function sleepHub(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(label)), ms);
    p.then((v) => { window.clearTimeout(t); resolve(v); }, (e) => { window.clearTimeout(t); reject(e); });
  });
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
