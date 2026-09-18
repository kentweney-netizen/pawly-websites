/**
 * Live official-pool quote for Pet Hub. DexScreener pair URL is empty; use Gecko + Raydium compute.
 */
export type PayCoin = "PAWLY" | "USDC" | "USDT" | "SOL";
export type HubPx = { pawlyUsd: number; solUsd: number; pawlyPerUsdc: number; src: string };

const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const WSOL_MINT = "So11111111111111111111111111111111111111112";
const OFFICIAL_POOL = "6n8wjFK3mLxrw25q2k6oejt8oYupzWoBPdZqrcHDVwJ";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
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
  } finally {
    window.clearTimeout(timer);
  }
}

export async function quoteRaydiumOut(inputMint: string, rawIn: string): Promise<{ outPawly: number; impact: number; poolId: string }> {
  const paths = ["/.netlify/functions/hub-jup-swap", "/.netlify/functions/hub-jup-swap/"];
  const payload = { inputMint, outputMint: PAWLY_MINT, amount: rawIn, userPublicKey: SHOP_TILL, quoteOnly: true, slippageBps: 400 };
  for (const path of paths) {
    try {
      const { r, d } = await fetchJson(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, 8000, "Quote timeout");
      const body = d as { outAmount?: string; outputAmount?: string; priceImpactPct?: number; poolId?: string };
      const raw = Number(body.outAmount || body.outputAmount || 0);
      if (r.ok && raw > 0) return { outPawly: raw / 1e6, impact: Number(body.priceImpactPct || 0), poolId: String(body.poolId || OFFICIAL_POOL) };
    } catch { /* next */ }
  }
  try {
    const url = "https://transaction-v1.raydium.io/compute/swap-base-in?inputMint=" + encodeURIComponent(inputMint) + "&outputMint=" + encodeURIComponent(PAWLY_MINT) + "&amount=" + encodeURIComponent(rawIn) + "&slippageBps=400&txVersion=V0";
    const { r, d } = await fetchJson(url, { method: "GET" }, 8000, "Raydium quote timeout");
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
  let pawlyUsd = 0; let solUsd = 0; let pawlyPerUsdc = 0; let src = "";
  try {
    const r = await fetch("https://api.geckoterminal.com/api/v2/networks/solana/pools/" + OFFICIAL_POOL);
    const d = (await r.json()) as { data?: { attributes?: { base_token_price_usd?: string } } };
    const usd = Number(d.data?.attributes?.base_token_price_usd || 0);
    if (usd > 0) { pawlyUsd = usd; src = "official pool"; }
  } catch { /* ignore */ }
  if (!pawlyUsd) {
    try {
      const r = await fetch("https://api.dexscreener.com/latest/dex/tokens/" + PAWLY_MINT);
      const d = (await r.json()) as { pairs?: { pairAddress?: string; priceUsd?: string }[] };
      const list = d.pairs || [];
      const p = list.find((x) => x.pairAddress === OFFICIAL_POOL) || list[0];
      const usd = Number(p?.priceUsd || 0);
      if (usd > 0) { pawlyUsd = usd; src = "dex"; }
    } catch { /* ignore */ }
  }
  try {
    const q = await quoteRaydiumOut(USDC_MINT, "1000000");
    if (q.outPawly > 0) {
      pawlyPerUsdc = q.outPawly;
      if (!pawlyUsd) { pawlyUsd = 1 / q.outPawly; src = "raydium"; }
    }
  } catch { /* ignore */ }
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/tokens/" + WSOL_MINT);
    const d = (await r.json()) as { pairs?: { chainId?: string; priceUsd?: string; quoteToken?: { symbol?: string } }[] };
    const p = (d.pairs || []).find((x) => x.chainId === "solana" && String(x.quoteToken?.symbol || "").includes("USD"));
    solUsd = Number(p?.priceUsd || 0);
  } catch { /* ignore */ }
  return { pawlyUsd, solUsd, pawlyPerUsdc, src };
}
