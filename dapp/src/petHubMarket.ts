/**
 * PAWLY Pet Hub v0.3 net + v0.4 stall/NFT.
 * New species NFT = sacred/weird mythic, not real-world animals.
 */
import type { PetRec, PayCoin } from "./petHubLib";
import { mythicFrom } from "./petHubNftArt";
import type { MythKind } from "./petHubNftArt";

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
  kind?: MythKind;
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
  return list.filter((p) => Number(p.level || 0) >= 1 && p.kind !== "myth");
}

export function makeNft(opts: { owner: string; a: PetRec; b: PetRec; sig: string }): NftRec {
  const myth = mythicFrom(opts.a.species, opts.b.species, opts.sig);
  return {
    id: "nft_" + Date.now() + "_" + Math.floor(Math.random() * 9999),
    owner: opts.owner,
    species: myth.species,
    name: myth.name,
    emoji: myth.kind === "sacred" ? "\u2728" : "\ud83d\udc7e",
    kind: myth.kind,
    parents: [opts.a.species, opts.b.species],
    gen: Math.max(1, Number((opts.a as { gen?: number }).gen || 0), Number((opts.b as { gen?: number }).gen || 0)) + 1,
    breedSig: opts.sig,
    listed: false,
    pricePawly: 0,
    highPrice: 0,
    createdAt: new Date().toISOString(),
  };
}

export function nftAsPet(n: NftRec): PetRec {
  return {
    id: n.id,
    kind: "myth",
    species: n.species,
    name: n.name,
    emoji: n.emoji || "\u2728",
    hunger: 80,
    health: 90,
    streak: 0,
    feedsTotal: 10,
    level: 1,
    sig: n.breedSig,
  };
}

export function liveRoster(pets: PetRec[], nfts: NftRec[], spent: string[]): PetRec[] {
  const gone = new Set(spent);
  const need = new Map<string, number>();
  for (const n of nfts) {
    for (const sp of n.parents || []) need.set(sp, (need.get(sp) || 0) + 1);
  }
  const keep: PetRec[] = [];
  for (const p of pets) {
    if (!p || gone.has(p.id) || p.kind === "myth") continue;
    const left = need.get(p.species) || 0;
    if (left > 0) { need.set(p.species, left - 1); continue; }
    keep.push(p);
  }
  const ids = new Set(keep.map((p) => p.id));
  for (const n of nfts) {
    const pet = nftAsPet(n);
    if (!ids.has(pet.id)) { keep.push(pet); ids.add(pet.id); }
  }
  return keep.slice(0, 10);
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
  if (kind === "buy") return "P2P to seller. Team 0.";
  if (coin === "PAWLY") return "PAWLY to till.";
  return coin + " -> PAWLY -> till.";
}

export function priceLabel(n: NftRec) {
  const p = Number(n.pricePawly);
  if (n.listed && p > 0) return p + " PAWLY";
  return "unlisted";
}
