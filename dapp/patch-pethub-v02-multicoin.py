#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.10.4 — growing body rig + street Lv label.",
    " * PAWLY Pet Hub v0.2 — checkout PAWLY / USDC / USDT / SOL.",
)
if "SystemProgram" not in t:
    t = t.replace(
        """import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";""",
        """import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";""",
        1,
    )
if "type PayCoin" not in t:
    t = t.replace(
        "const PAWLY_DECIMALS = 6;\n",
        """const PAWLY_DECIMALS = 6;
type PayCoin = "PAWLY" | "USDC" | "USDT" | "SOL";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const OFFICIAL_POOL = "6n8wjFK3mLxrw25q2k6oejt8oYupzWoBPdZqrcHDVwJ";
""",
        1,
    )

PAY_FN = r'''
async function fetchHubPx(): Promise<{ pawlyUsd: number; solUsd: number }> {
  let pawlyUsd = 0;
  let solUsd = 0;
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/pairs/solana/" + OFFICIAL_POOL);
    const d = (await r.json()) as { pair?: { priceUsd?: string } };
    pawlyUsd = Number(d.pair?.priceUsd || 0);
  } catch { /* ignore */ }
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112");
    const d = (await r.json()) as { pairs?: { chainId?: string; priceUsd?: string; quoteToken?: { symbol?: string } }[] };
    const p = (d.pairs || []).find((x) => x.chainId === "solana" && String(x.quoteToken?.symbol || "").includes("USD"));
    solUsd = Number(p?.priceUsd || 0);
  } catch { /* ignore */ }
  return { pawlyUsd, solUsd };
}
function quoteCoin(pawlyAmt: number, coin: PayCoin, px: { pawlyUsd: number; solUsd: number }) {
  const usd = pawlyAmt * (px.pawlyUsd > 0 ? px.pawlyUsd : 0);
  if (coin === "PAWLY") return { amount: pawlyAmt, label: pawlyAmt.toFixed(2) + " PAWLY", usd };
  if (coin === "SOL") {
    const v = px.solUsd > 0 && usd > 0 ? usd / px.solUsd : 0;
    return { amount: v, label: v.toFixed(6) + " SOL", usd };
  }
  return { amount: usd, label: usd.toFixed(4) + " " + coin, usd };
}
async function sponsorOrSend(opts: {
  tx: VersionedTransaction;
  conn: Connection;
  feePawly: number;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
}) {
  let sig = "";
  if (typeof opts.signTransaction === "function") {
    const signed = await opts.signTransaction(opts.tx);
    const rawBytes = signed.serialize();
    let b64 = "";
    try { b64 = btoa(String.fromCharCode.apply(null, Array.from(rawBytes))); }
    catch {
      let s = "";
      for (let i = 0; i < rawBytes.length; i++) s += String.fromCharCode(rawBytes[i]);
      b64 = btoa(s);
    }
    const r = await fetch(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
      body: JSON.stringify({ transaction: b64, feePawly: opts.feePawly }),
    });
    const d = (await r.json().catch(() => ({}))) as { signature?: string; error?: string };
    if (r.ok && d.signature) sig = String(d.signature);
    else if (d.error && !String(d.error).toLowerCase().includes("below minimum")) throw new Error(String(d.error));
  }
  if (!sig) sig = await opts.sendTransaction(opts.tx, opts.conn);
  await assertOnchainSuccess(opts.conn, sig);
  return sig;
}
async function payHubToken(opts: {
  from: PublicKey;
  pawlyList: number;
  coin: PayCoin;
  coinAmount: number;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}): Promise<string> {
  const till = new PublicKey(SHOP_TILL);
  const payer = new PublicKey(SPONSOR);
  if (opts.from.equals(till)) throw new Error("Shop till is this wallet / 不能付给自己");
  if (opts.coinAmount <= 0) throw new Error("No live price / 拉不到价，改用 PAWLY");
  const conn = new Connection(RPC, "confirmed");
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const feePawly = opts.coin === "PAWLY" ? 1 : 0;
  if (opts.coin === "SOL") {
    const lamports = Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL));
    const ix = SystemProgram.transfer({ fromPubkey: opts.from, toPubkey: till, lamports });
    const msg = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: [ix] }).compileToV0Message();
    return sponsorOrSend({ tx: new VersionedTransaction(msg), conn, feePawly, signTransaction: opts.signTransaction, sendTransaction: opts.sendTransaction });
  }
  const mintStr = opts.coin === "USDC" ? USDC_MINT : opts.coin === "USDT" ? USDT_MINT : PAWLY_MINT;
  const decimals = opts.coin === "PAWLY" || opts.coin === "USDC" || opts.coin === "USDT" ? 6 : 6;
  const mint = new PublicKey(mintStr);
  const rawAmt = Math.round(opts.coinAmount * Math.pow(10, decimals));
  if (rawAmt <= 0) throw new Error("Amount too small / 金额太小");
  const fromAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const toAta = await getAssociatedTokenAddress(mint, till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const ixs = [
    createAssociatedTokenAccountIdempotentInstruction(payer, toAta, till, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(fromAta, mint, toAta, opts.from, rawAmt, decimals, [], TOKEN_PROGRAM_ID),
  ];
  const msg = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message();
  return sponsorOrSend({ tx: new VersionedTransaction(msg), conn, feePawly, signTransaction: opts.signTransaction, sendTransaction: opts.sendTransaction });
}
'''

if "async function payHubToken" not in t:
    t = t.replace("async function payPawlyInHub", PAY_FN + "async function payPawlyInHub", 1)
    # keep old fn unused is ok for size; or leave both. confirmPay will call payHubToken

if "const [payCoin" not in t:
    t = t.replace(
        "const [cart, setCart] = useState<CartItem | null>(null);",
        "const [cart, setCart] = useState<CartItem | null>(null);\n  const [payCoin, setPayCoin] = useState<PayCoin>(\"PAWLY\");\n  const [px, setPx] = useState({ pawlyUsd: 0, solUsd: 0 });",
        1,
    )
if "fetchHubPx()" not in t[t.find("export default function"): t.find("export default function")+2500]:
    t = t.replace(
        "  useEffect(() => {\n    setGreet(true);",
        "  useEffect(() => { void fetchHubPx().then(setPx); const id = window.setInterval(() => { void fetchHubPx().then(setPx); }, 60000); return () => window.clearInterval(id); }, []);\n  useEffect(() => {\n    setGreet(true);",
        1,
    )

t = t.replace(
    "const sig = await payPawlyInHub({",
    "const q = quoteCoin(cart.amount, payCoin, px);\n      if (payCoin !== \"PAWLY\" && q.amount <= 0) throw new Error(\"No live price / 拉不到价，改用 PAWLY\");\n      const sig = await payHubToken({",
    1,
)
if "coin: payCoin" not in t:
    t = t.replace(
        """      const sig = await payHubToken({
        from: wallet.publicKey,
        amount: cart.amount,
        sendTransaction: wallet.sendTransaction,
        signTransaction: wallet.signTransaction,
      });""",
        """      const sig = await payHubToken({
        from: wallet.publicKey,
        pawlyList: cart.amount,
        coin: payCoin,
        coinAmount: q.amount,
        sendTransaction: wallet.sendTransaction,
        signTransaction: wallet.signTransaction,
      });""",
        1,
    )

old_cart = '''            <div style={{ fontSize: 22, fontWeight: 800 }}>{cart.amount} PAWLY</div>
            <div style={{ fontSize: 11, color: "#9aa", margin: "6px 0 12px" }}>
              Avatar unlocks only after Solscan success.<br />
              没链上成功签名，不会出现宠物头像。
            </div>
            <button type="button" disabled={busy} style={{ ...primary, width: "100%", opacity: busy ? 0.6 : 1 }} onClick={confirmPay}>
              {busy ? "Paying…" : "Confirm · pay " + cart.amount + " PAWLY"}
            </button>'''
new_cart = '''            <div style={{ fontSize: 22, fontWeight: 800 }}>{cart.amount} PAWLY</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
              {(["PAWLY", "USDC", "USDT", "SOL"] as PayCoin[]).map((c) => (
                <button key={c} type="button" onClick={() => setPayCoin(c)} style={{ ...ghost, padding: "6px 10px", borderColor: payCoin === c ? "#00ff9d" : "rgba(255,255,255,0.2)", color: payCoin === c ? "#00ff9d" : "#c8ffe8" }}>{c}</button>
              ))}
            </div>
            <div style={{ fontSize: 14, color: "#c8ffe8", marginBottom: 6 }}>{quoteCoin(cart.amount, payCoin, px).label}{px.pawlyUsd ? " · PAWLY $" + px.pawlyUsd.toFixed(4) : ""}</div>
            <div style={{ fontSize: 11, color: "#9aa", margin: "6px 0 12px" }}>
              Pays the shop till on-chain. Live pool price. No price = use PAWLY.<br />
              按官方池现价折算，拉不到价请用 PAWLY。
            </div>
            <button type="button" disabled={busy} style={{ ...primary, width: "100%", opacity: busy ? 0.6 : 1 }} onClick={confirmPay}>
              {busy ? "Paying…" : "Confirm · " + quoteCoin(cart.amount, payCoin, px).label}
            </button>'''
if old_cart in t:
    t = t.replace(old_cart, new_cart, 1)
else:
    print("CART BLOCK MISSING")

p.write_text(t)
print("v02", "v0.2" in t[:80])
print("payHub", "payHubToken" in t)
print("payCoin", "payCoin" in t)
print("cart coins", "USDT" in t[t.find("Pet Hub checkout"):t.find("Pet Hub checkout")+900] if "Pet Hub checkout" in t else False)
