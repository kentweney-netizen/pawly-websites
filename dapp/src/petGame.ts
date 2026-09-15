export const SLOT_CAP = 10;
export const FEED_DAY_MAX = 3;
export const MINT_PAWLY = 80;
export const LIST_FEE = 15;
export const BREED_PAWLY = 200;
export const MINT_LV = 1;
export const BREED_LV = 2;
export const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
export const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
export const STORE = "pawly_pet_game_v1_";

export type SceneId = "street" | "town" | "shop" | "hospital" | "shelter" | "hotel" | "groom" | "park" | "nft" | "market" | "breed";
export type PayCoin = "PAWLY" | "USDC" | "USDT" | "SOL";
export type PetRec = {
  id: string;
  kind: "adopted" | "rescued" | "egg";
  species: string;
  name: string;
  emoji: string;
  level: number;
  feedsTotal: number;
  feedsToday?: number;
  feedDay?: string;
  sig?: string;
};

export const ADOPT = [
  { species: "dog", name: "Poodle", emoji: "\ud83d\udc36", price: 200 },
  { species: "cat", name: "Kitten", emoji: "\ud83d\udc31", price: 180 },
  { species: "rabbit", name: "Bunny", emoji: "\ud83d\udc30", price: 160 },
  { species: "minipig", name: "Mini pig", emoji: "\ud83d\udc37", price: 220 },
  { species: "duck", name: "Duck", emoji: "\ud83e\udd86", price: 140 },
  { species: "alpaca", name: "Alpaca", emoji: "\ud83e\udd99", price: 240 },
];
export const RESCUE = [
  { species: "stray-dog", name: "Stray dog", emoji: "\ud83d\udc15", price: 80 },
  { species: "stray-cat", name: "Stray cat", emoji: "\ud83d\udc08", price: 80 },
];
export const FOOD = [
  { title: "Kibble", amount: 20 },
  { title: "Can food", amount: 35 },
  { title: "Treat", amount: 15 },
];

export function sgDay() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}
export function feedsTodayOf(p?: PetRec | null) {
  if (!p) return 0;
  return String(p.feedDay || "") === sgDay() ? Number(p.feedsToday || 0) : 0;
}
export function afterFeed(p: PetRec): PetRec {
  const total = Number(p.feedsTotal || 0) + 1;
  return { ...p, feedsTotal: total, level: Math.floor(total / 10), feedsToday: feedsTodayOf(p) + 1, feedDay: sgDay() };
}
export function loadPets(w: string): PetRec[] {
  try {
    const raw = localStorage.getItem(STORE + w);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(0, SLOT_CAP) : [];
  } catch {
    return [];
  }
}
export function savePets(w: string, list: PetRec[]) {
  try {
    localStorage.setItem(STORE + w, JSON.stringify(list.slice(0, SLOT_CAP)));
  } catch {
    /* ignore */
  }
}
