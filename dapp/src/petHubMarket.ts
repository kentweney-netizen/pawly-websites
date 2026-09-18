/**
 * PAWLY Pet Hub v0.3 net + v0.4 stall/NFT.
 * v0.3 = live stalls visible to any wallet in Pet Hub (PWA dApp or external wallet).
 * v0.4 = open stall 200 PAWLY to till, breed two Lv1 pets into a species NFT, user-priced P2P.
 * Team does not price listings. Ranking = highest user list/sale price.
 */
import type { PetRec, PayCoin } from "./petHubLib";

export const STALL_PAWLY = 200;
export const BREED_PAWLY = 80;
const STORE_STALL = "pawly_pet_hub_stall_v1_";
const STORE_NFT = "pawly_pet_hub_nft_v1_";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";

export type StallRec = { wallet: string; sig: string; slot: number; openedAt: string };
export type NftRec = {
  id: string;
  owner: string;
  species: string;
  name: string;
  emoji: string;
  parents: string[];
  gen: number;
  breedSig: string;
  listed: boolean;
  pricePawly: number;
  highPrice: number;
  createdAt: string;
};
export type RankRow = { wallet: string; name: string; species: string; highPrice: number; nftId: string };

function hdr() {
  return { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" };
}
function shortW(w: string) { return w ? w.slice(0, 4) + "..." + w.slice(-4) : ""; }
function stallSlot(w: string) {
  let n = 0;
  for (let i = 0; i < w.length; i++) n = (n + w.charCodeAt(i) * (i + 1)) % 8;
  return n;
}

export function loadLocalNfts(w: string): NftRec[] {
  if (!w) return [];
  try { const raw = localStorage.getItem(STORE_NFT + w); const list = raw ? JSON.parse(raw) : []; return Array.isArray(list) ? list : []; } catch { return []; }
}
export function saveLocalNfts(w: string, list: NftRec[]) {
  if (!w) return;
  try { localStorage.setItem(STORE_NFT + w, JSON.stringify(list)); } catch { /* ignore */ }
}
export function loadLocalStall(w: string): StallRec | null {
  if (!w) return null;
  try { const raw = localStorage.getItem(STORE_STALL + w); return raw ? JSON.parse(raw) as StallRec : null; } catch { return null; }
}
export function saveLocalStall(w: string, s: StallRec | null) {
  if (!w) return;
  try { if (s) localStorage.setItem(STORE_STALL + w, JSON.stringify(s)); else localStorage.removeItem(STORE_STALL + w); } catch { /* ignore */ }
}

export async function pullMarket(): Promise<{ stalls: StallRec[]; nfts: NftRec[] }> {
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/pet_hub_market?select=wallet,stall,nfts", { headers: hdr() });
    const rows = (await r.json()) as { wallet?: string; stall?: StallRec | null; nfts?: NftRec[] }[];
    if (!Array.isArray(rows)) return { stalls: [], nfts: [] };
    const stalls: StallRec[] = [];
    const nfts: NftRec[] = [];
    for (const row of rows) {
      if (row.stall && row.stall.sig) stalls.push({ ...row.stall, wallet: row.wallet || row.stall.wallet });
      if (Array.isArray(row.nfts)) nfts.push(...row.nfts.filter((n) => n && n.id));
    }
    return { stalls, nfts };
  } catch { return { stalls: [], nfts: [] }; }
}

export async function pushMarketRow(w: string, stall: StallRec | null, nfts: NftRec[]) {
  if (!w) return;
  try {
    await fetch(SUPABASE_URL + "/rest/v1/pet_hub_market", {
      method: "POST",
      headers: { ...hdr(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ wallet: w, stall, nfts, updated_at: new Date().toISOString() }),
    });
  } catch { /* local still works */ }
}

export function openStallRec(w: string, sig: string): StallRec {
  return { wallet: w, sig, slot: stallSlot(w), openedAt: new Date().toISOString() };
}

export function level1Pets(list: PetRec[]) {
  return list.filter((p) => Number(p.level || 0) >= 1);
}

export function hybridSpecies(a: string, b: string) {
  const x = [String(a || "pet"), String(b || "pet")].map((s) => s.toLowerCase().replace(/\s+/g, "-").replace(/^hybrid-/, "")).sort();
  return "hybrid-" + x[0].slice(0, 10) + "-" + x[1].slice(0, 10);
}

export function hybridName(a: PetRec, b: PetRec) {
  const left = String(a.name || a.species || "A").split(" ")[0];
  const right = String(b.name || b.species || "B").split(" ")[0];
  return left + "-" + right;
}

export function makeNft(opts: { owner: string; a: PetRec; b: PetRec; sig: string }): NftRec {
  const species = hybridSpecies(opts.a.species, opts.b.species);
  const price = 0;
  return {
    id: "nft_" + Date.now() + "_" + Math.floor(Math.random() * 9999),
    owner: opts.owner,
    species,
    name: hybridName(opts.a, opts.b),
    emoji: opts.a.emoji || opts.b.emoji || "✨",
    parents: [opts.a.species, opts.b.species],
    gen: Math.max(1, Number((opts.a as { gen?: number }).gen || 0), Number((opts.b as { gen?: number }).gen || 0)) + 1,
    breedSig: opts.sig,
    listed: false,
    pricePawly: price,
    highPrice: 0,
    createdAt: new Date().toISOString(),
  };
}

export function rankingOf(nfts: NftRec[]): RankRow[] {
  const best = new Map<string, RankRow>();
  for (const n of nfts) {
    const high = Math.max(Number(n.highPrice || 0), n.listed ? Number(n.pricePawly || 0) : 0);
    if (!(high > 0)) continue;
    const cur = best.get(n.owner);
    if (!cur || high > cur.highPrice) best.set(n.owner, { wallet: n.owner, name: n.name, species: n.species, highPrice: high, nftId: n.id });
  }
  return Array.from(best.values()).sort((a, b) => b.highPrice - a.highPrice).slice(0, 20);
}

export function listedOf(nfts: NftRec[]) {
  return nfts.filter((n) => n.listed && Number(n.pricePawly) > 0);
}

export function stallLabel(s: StallRec, mine: string) {
  return (s.wallet === mine ? "My stall" : shortW(s.wallet) + " stall");
}

export type MarketPayKind = "stall" | "breed" | "buy";
export function marketPayHint(kind: MarketPayKind, coin: PayCoin) {
  if (kind === "buy") return "P2P: PAWLY goes to the seller wallet. Team takes 0.";
  if (coin === "PAWLY") return "PAWLY goes to shop till BPFiVa5.";
  return coin + " swaps to PAWLY on the official pool, then PAWLY to shop till.";
}
