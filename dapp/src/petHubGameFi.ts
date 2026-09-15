/** PAWLY Pet Hub GameFi core — stays out of App.tsx.
 * Loop: adopt → feed/evolve → mint NFT → list → limited breed.
 * Economy spends PAWLY. Gameplay never mints PAWLY.
 */
export const MINT_PAWLY = 80;
export const LIST_FEE_PAWLY = 15;
export const BREED_PAWLY = 200;
export const MINT_MIN_LV = 1;
export const BREED_MIN_LV = 2;
export const BREED_COOL_MS = 48 * 3600 * 1000;
export const NFT_STORE = "pawly_pet_hub_nft_v1_";
export const MARKET_STORE = "pawly_pet_hub_market_v1";

export type Rarity = "common" | "uncommon" | "rare" | "epic";
export type HubNft = {
  id: string;
  petId: string;
  species: string;
  name: string;
  emoji: string;
  level: number;
  feeds: number;
  rarity: Rarity;
  genes: string;
  owner: string;
  mintSig: string;
  mintedAt: number;
  listed?: number;
  lastBreedAt?: number;
};
export type MarketRow = HubNft & { pricePawly: number; listedAt: number };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : fallback;
    return v as T;
  } catch {
    return fallback;
  }
}
export function loadNfts(wallet: string): HubNft[] {
  if (!wallet) return [];
  const list = readJson<HubNft[]>(NFT_STORE + wallet, []);
  return Array.isArray(list) ? list : [];
}
export function saveNfts(wallet: string, list: HubNft[]) {
  if (!wallet) return;
  try {
    localStorage.setItem(NFT_STORE + wallet, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* ignore */
  }
}
export function loadMarket(): MarketRow[] {
  const list = readJson<MarketRow[]>(MARKET_STORE, []);
  return Array.isArray(list) ? list.filter((x) => x && x.id && x.pricePawly > 0) : [];
}
export function saveMarket(list: MarketRow[]) {
  try {
    localStorage.setItem(MARKET_STORE, JSON.stringify(list.slice(0, 80)));
  } catch {
    /* ignore */
  }
}
export function genesFor(petId: string, species: string, sig: string) {
  const s = (petId + ":" + species + ":" + sig).slice(0, 48);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  const n = Math.abs(h).toString(16).padStart(8, "0");
  return (n + n).slice(0, 12).toUpperCase();
}
export function rarityFor(genes: string): Rarity {
  const n = parseInt(genes.slice(0, 2), 16) || 0;
  if (n > 232) return "epic";
  if (n > 196) return "rare";
  if (n > 140) return "uncommon";
  return "common";
}
export function canMint(level: number, already?: HubNft | null) {
  if (already) return "Already minted / 已银造";
  if (level < MINT_MIN_LV) return "Reach Lv1 (10 feeds) first / 先升到 Lv1";
  return "";
}
export function canBreed(a?: HubNft | null, b?: HubNft | null) {
  if (!a || !b) return "Pick two minted pets / 选两只已银 NFT";
  if (a.id === b.id) return "Need two different pets / 不能自交";
  if (a.level < BREED_MIN_LV || b.level < BREED_MIN_LV) return "Both parents Lv2+ / 双方都要 Lv2";
  const now = Date.now();
  if ((a.lastBreedAt || 0) + BREED_COOL_MS > now || (b.lastBreedAt || 0) + BREED_COOL_MS > now) {
    return "Breed cooldown 48h / 繁殖冷却 48 小时";
  }
  return "";
}
