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
  let last = "Signature not on-chain";
  for (let i = 0; i < 8; i++) {
    try {
      const stPack = await withTimeout(conn.getSignatureStatuses([sig], { searchTransactionHistory: true }), 3500, "Status timeout");
      const st = stPack?.value?.[0];
      if (st && st.err) throw new Error("Transaction failed on-chain / 链上失败，不出证书");
      if (!st) { last = "Signature not on-chain"; await sleepHub(300); continue; }
      const tx = await withTimeout(conn.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }), 4000, "Tx timeout").catch(() => null);
      if (!tx) { last = "Tx indexing"; await sleepHub(300); continue; }
      if (tx.meta?.err) throw new Error("Transaction failed on-chain / 链上失败，不出证书");
      const pre = tx.meta?.preTokenBalances || [];
      const post = tx.meta?.postTokenBalances || [];
      const uiOf = (rows: typeof pre, owner: string) => {
        let sum = 0;
        for (let r = 0; r < rows.length; r++) {
          if (String(rows[r].mint) === PAWLY_MINT && String(rows[r].owner || "") === owner) sum = Number(rows[r].uiTokenAmount?.uiAmount || 0);
        }
        return sum;
      };
      const delta = uiOf(post, SHOP_TILL) - uiOf(pre, SHOP_TILL);
      if (delta > 0) {
        if (minPawly > 0 && delta + 0.000001 < minPawly * 0.5) throw new Error("Till got " + delta.toFixed(2) + " PAWLY, need " + minPawly + " / 货款不足，不出证书");
        return;
      }
      last = "Till not credited yet";
    } catch (e) {
      const msg = String((e as { message?: string })?.message || e);
      if (/failed on-chain|货款不足|不出证书/i.test(msg) && !/未确认/.test(msg)) throw e instanceof Error ? e : new Error(msg);
      last = msg;
    }
    await sleepHub(300);
  }
  throw new Error(last + " / 店柜未收到 PAWLY，不出证书。请打开第二签把 PAWLY 打进店柜，勿连点第一签。");
}
