/** Live official-pool quote. Never block on Gecko. DexScreener pair list is empty for PAWLY. */
export type PayCoin = "PAWLY" | "USDC" | "USDT" | "SOL";
export type HubPx = { pawlyUsd: number; solUsd: number; pawlyPerUsdc: number; src: string };

const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const WSOL_MINT = "So11111111111111111111111111111111111111112";
const OFFICIAL_POOL = "6n8wjFK3mLxrw25q2k6oejt8oYupzWoBPdZqrcHDVwJ";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const PX_KEY = "pawly_hub_px_v1";
export const HUB_POOL = OFFICIAL_POOL;

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

function readCache(): HubPx | null {
  try {
    const raw = localStorage.getItem(PX_KEY);
    const o = raw ? JSON.parse(raw) as HubPx : null;
    return o && o.pawlyUsd > 0 ? o : null;
  } catch { return null; }
}
function writeCache(px: HubPx) {
  try { if (px.pawlyUsd > 0) localStorage.setItem(PX_KEY, JSON.stringify(px)); } catch { /* ignore */ }
}

export async function quoteRaydiumOut(inputMint: string, rawIn: string): Promise<{ outPawly: number; impact: number; poolId: string }> {
  const paths = ["/.netlify/functions/hub-jup-swap", "/.netlify/functions/hub-jup-swap/", "/dapp/.netlify/functions/hub-jup-swap"];
  const payload = { inputMint, outputMint: PAWLY_MINT, amount: rawIn, userPublicKey: SHOP_TILL, quoteOnly: true, slippageBps: 400 };
  for (const path of paths) {
    try {
      const { r, d } = await fetchJson(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, 6000, "Quote timeout");
      const body = d as { outAmount?: string; outputAmount?: string; priceImpactPct?: number; poolId?: string };
      const raw = Number(body.outAmount || body.outputAmount || 0);
      if (r.ok && raw > 0) return { outPawly: raw / 1e6, impact: Number(body.priceImpactPct || 0), poolId: String(body.poolId || OFFICIAL_POOL) };
    } catch { /* next */ }
  }
  try {
    const url = "https://transaction-v1.raydium.io/compute/swap-base-in?inputMint=" + encodeURIComponent(inputMint) + "&outputMint=" + encodeURIComponent(PAWLY_MINT) + "&amount=" + encodeURIComponent(rawIn) + "&slippageBps=400&txVersion=V0";
    const { r, d } = await fetchJson(url, { method: "GET" }, 6000, "Raydium quote timeout");
    const data = (d as { data?: { outputAmount?: string; priceImpactPct?: number; routePlan?: { poolId?: string }[] } }).data;
    const raw = Number(data?.outputAmount || 0);
    if (r.ok && raw > 0) return { outPawly: raw / 1e6, impact: Number(data?.priceImpactPct || 0), poolId: String((data?.routePlan && data.routePlan[0] && data.routePlan[0].poolId) || OFFICIAL_POOL) };
  } catch { /* ignore */ }
  return { outPawly: 0, impact: 0, poolId: OFFICIAL_POOL };
}

export async function quoteHubSwap(coin: PayCoin, coinAmount: number): Promise<{ outPawly: number; impact: number; poolId: string; inRaw: string }> {
  if (coin === "PAWLY" || !(coinAmount > 0)) return { outPawly: 0, impact: 0, poolId: OFFICIAL_POOL, inRaw: "0" };
  const inputMint = coin === "SOL" ? WSOL_MINT : coin === "USDT" ? USDT_MINT : USDC_MINT;
  const rawIn = coin === "SOL" ? String(Math.max(1, Math.round(coinAmount * 1e9))) : String(Math.max(1, Math.round(coinAmount * 1e6)));
  const q = await quoteRaydiumOut(inputMint, rawIn);
  return { ...q, inRaw: rawIn };
}

export async function fetchHubPx(): Promise<HubPx> {
  const cached = readCache();
  let pawlyUsd = cached ? cached.pawlyUsd : 0;
  let solUsd = cached ? cached.solUsd : 0;
  let pawlyPerUsdc = cached ? cached.pawlyPerUsdc : 0;
  let src = cached ? (cached.src + " cache") : "";
  try {
    const q = await quoteRaydiumOut(USDC_MINT, "1000000");
    if (q.outPawly > 0) {
      pawlyPerUsdc = q.outPawly;
      pawlyUsd = 1 / q.outPawly;
      src = "raydium official pool";
    }
  } catch { /* ignore */ }
  if (!pawlyUsd) {
    try {
      const { r, d } = await fetchJson("https://api.geckoterminal.com/api/v2/networks/solana/pools/" + OFFICIAL_POOL, { method: "GET" }, 4000, "gecko timeout");
      const usd = Number((d as { data?: { attributes?: { base_token_price_usd?: string } } }).data?.attributes?.base_token_price_usd || 0);
      if (r.ok && usd > 0) {
        pawlyUsd = usd;
        if (!pawlyPerUsdc) pawlyPerUsdc = 1 / usd;
        src = "official pool";
      }
    } catch { /* ignore */ }
  }
  if (!solUsd) {
    try {
      const { d } = await fetchJson("https://api.dexscreener.com/latest/dex/tokens/" + WSOL_MINT, { method: "GET" }, 4000, "sol timeout");
      const p = ((d as { pairs?: { chainId?: string; priceUsd?: string; quoteToken?: { symbol?: string } }[] }).pairs || []).find((x) => x.chainId === "solana" && String(x.quoteToken?.symbol || "").includes("USD"));
      solUsd = Number(p?.priceUsd || 0);
    } catch { /* ignore */ }
  }
  const out: HubPx = { pawlyUsd, solUsd, pawlyPerUsdc, src };
  if (out.pawlyUsd > 0) writeCache(out);
  return out;
}
