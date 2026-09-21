import type React from "react";
/**
 * PAWLY Pet Hub — lib barrel. Pay lives in petHubSend; cert gate in petHubPay.
 */
export { quoteRaydiumOut, quoteHubSwap, fetchHubPx, HUB_POOL } from "./petHubQuote";
export type { HubPx } from "./petHubQuote";
export { requireHubPaySuccess } from "./petHubPay";
export { payHub, quoteCoin } from "./petHubSend";
export type { PayPhase, PayPhaseFn, HubSign, HubSend, HubWallet } from "./petHubSend";
export const PET_SLOT_CAP = 10;
export const FEED_DAY_MAX = 3;
export function sgDay() { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }); }
export function feedsTodayOf(p?: { feedDay?: string; feedsToday?: number } | null) {
  if (!p) return 0;
  return String(p.feedDay || "") === sgDay() ? Number(p.feedsToday || 0) : 0;
}
export function pickFeedPet(list: PetRec[], id?: string) { return list.find((x) => x.id === id) || list[0]; }
const STORE = "pawly_pet_hub_v1_";
const SPENT = "pawly_pet_hub_spent_v1_";
const STORE_NFT = "pawly_pet_hub_nft_v1_";
const EMAIL_KEY = "pawly_pet_hub_email_v1";
export type PayCoin = "PAWLY" | "USDC" | "USDT" | "SOL";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
export type SceneId = "street" | "hospital" | "shelter" | "shop" | "hotel" | "groom" | "park";
export type PetRec = { id: string; kind: string; species: string; name: string; emoji: string; hunger: number; health: number; streak: number; pricePawly?: number; sig?: string; feedsTotal?: number; feedsToday?: number; feedDay?: string; level?: number; art?: string };
export type CartKind = "adopt" | "rescue" | "service" | "food";
export type CertJob = { title: string; amount: number; kind: CartKind; species?: string; emoji?: string; sig: string; certPng?: string; photoPng?: string };
export type CartItem = { title: string; amount: number; kind: CartKind; species?: string; emoji?: string; petId?: string };
export const COMPANIONS = [
  { species: "dog", label: "Dog", emoji: "\ud83d\udc36", pricePawly: 80 },
  { species: "cat", label: "Cat", emoji: "\ud83d\udc31", pricePawly: 70 },
  { species: "rabbit", label: "Rabbit", emoji: "\ud83d\udc30", pricePawly: 55 },
  { species: "hamster", label: "Hamster", emoji: "\ud83d\udc39", pricePawly: 25 },
  { species: "parrot", label: "Parrot", emoji: "\ud83e\udd9c", pricePawly: 45 },
  { species: "chicken", label: "Chicken", emoji: "\ud83d\udc14", pricePawly: 20 },
  { species: "duck", label: "Duck", emoji: "\ud83e\udd86", pricePawly: 20 },
  { species: "minipig", label: "Mini pig", emoji: "\ud83d\udc37", pricePawly: 40 },
  { species: "alpaca", label: "Alpaca", emoji: "\ud83e\udd99", pricePawly: 60 },
  { species: "lizard", label: "Lizard", emoji: "\ud83e\udd8e", pricePawly: 22 },
  { species: "snake", label: "Snake", emoji: "\ud83d\udc0d", pricePawly: 26 },
  { species: "gecko", label: "Gecko", emoji: "\ud83e\udd8e", pricePawly: 20 },
  { species: "beetle", label: "Beetle", emoji: "\ud83e\udeb2", pricePawly: 12 },
  { species: "tarantula", label: "Tarantula", emoji: "\ud83d\udd77", pricePawly: 15 },
  { species: "mantis", label: "Mantis", emoji: "\ud83e\udd97", pricePawly: 12 },
];
export const RESCUES = [
  { species: "stray-cat", label: "Stray cat", emoji: "\ud83d\udc31", pricePawly: 10 },
  { species: "stray-dog", label: "Stray dog", emoji: "\ud83d\udc36", pricePawly: 10 },
  { species: "orangutan", label: "Orangutan", emoji: "\ud83e\udda7", pricePawly: 25 },
  { species: "sunbear", label: "Sun bear", emoji: "\ud83d\udc3b", pricePawly: 25 },
  { species: "malayan-tiger", label: "Malayan tiger", emoji: "\ud83d\udc2f", pricePawly: 30 },
  { species: "seaturtle", label: "Sea turtle", emoji: "\ud83d\udc22", pricePawly: 20 },
  { species: "hornbill", label: "Hornbill", emoji: "\ud83e\udd85", pricePawly: 20 },
  { species: "asian-elephant", label: "Asian elephant", emoji: "\ud83d\udc18", pricePawly: 30 },
  { species: "pangolin", label: "Pangolin", emoji: "\ud83e\udd94", pricePawly: 20 },
  { species: "gibbon", label: "Gibbon", emoji: "\ud83d\udc12", pricePawly: 20 },
];
export const FOODS = [
  { id: "snack", label: "Treat / snack", emoji: "\ud83c\udf6a", pricePawly: 6 },
  { id: "catfood", label: "Cat food", emoji: "\ud83d\udc1f", pricePawly: 10 },
  { id: "dogfood", label: "Dog food", emoji: "\ud83e\uddb4", pricePawly: 10 },
  { id: "seed", label: "Bird / farm feed", emoji: "\ud83c\udf3e", pricePawly: 8 },
  { id: "veg", label: "Herbivore mix", emoji: "\ud83e\udd6c", pricePawly: 8 },
  { id: "bug", label: "Insect / reptile feed", emoji: "\ud83c\udf47", pricePawly: 8 },
  { id: "deluxe", label: "Deluxe bowl", emoji: "\ud83c\udf71", pricePawly: 18 },
];
export const TITLE: Record<SceneId, string> = { street: "Tampines pet street", hospital: "Novena Pet Hospital", park: "East Coast park", shop: "Pet Shop", shelter: "Rescue", hotel: "Pet Hotel", groom: "Grooming" };
export const SHOPS: { id: SceneId; label: string }[] = [{ id: "shop", label: "Shop" }, { id: "hospital", label: "Hospital" }, { id: "shelter", label: "Rescue" }, { id: "hotel", label: "Hotel" }, { id: "groom", label: "Groom" }, { id: "park", label: "Park" }];
export const CLIP: Record<SceneId, string> = { street: "pet-hub-street-walk.mp4", hospital: "pet-hub-hospital.mp4", park: "pet-hub-park.mp4", shop: "pet-hub-shop.mp4", shelter: "pet-hub-shelter.mp4", hotel: "pet-hub-hotel.mp4", groom: "pet-hub-groom.mp4" };
function rosterHdr() {
  return { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" };
}
type MintNft = { id: string; species: string; name: string; emoji?: string; parents?: string[]; breedSig?: string; art?: string };
function localNfts(w: string): MintNft[] {
  if (!w) return [];
  try {
    const raw = localStorage.getItem(STORE_NFT + w);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((n) => n && n.id) : [];
  } catch { return []; }
}
export function loadSpent(w: string): string[] {
  if (!w) return [];
  try { const raw = localStorage.getItem(SPENT + w); const list = raw ? JSON.parse(raw) : []; return Array.isArray(list) ? list.filter((x) => typeof x === "string") : []; } catch { return []; }
}
export function addSpent(w: string, ids: string[]) {
  if (!w) return;
  const next = Array.from(new Set(loadSpent(w).concat(ids.filter(Boolean))));
  try { localStorage.setItem(SPENT + w, JSON.stringify(next)); } catch { /* ignore */ }
}
export function applyMinted(w: string, list: PetRec[]): PetRec[] {
  const spent = new Set(loadSpent(w));
  const nfts = localNfts(w);
  const need = new Map<string, number>();
  for (const n of nfts) for (const sp of n.parents || []) need.set(sp, (need.get(sp) || 0) + 1);
  const keep: PetRec[] = [];
  for (const p of list || []) {
    if (!p || !p.id || spent.has(p.id) || p.kind === "myth") continue;
    const left = need.get(p.species) || 0;
    if (left > 0) { need.set(p.species, left - 1); continue; }
    keep.push(p);
  }
  const ids = new Set(keep.map((p) => p.id));
  for (const n of nfts) {
    if (ids.has(n.id)) continue;
    const prev = (list || []).find((p) => p && p.id === n.id);
    keep.push({
      id: n.id, kind: "myth", species: n.species, name: n.name,
      emoji: n.emoji || "\u2728",
      hunger: prev?.hunger ?? 80,
      health: prev?.health ?? 90,
      streak: prev?.streak ?? 0,
      feedsTotal: Number(prev?.feedsTotal ?? 10),
      feedsToday: Number(prev?.feedsToday ?? 0),
      feedDay: prev?.feedDay,
      level: Number(prev?.level ?? 1),
      sig: n.breedSig,
      art: n.art || prev?.art,
    });
    ids.add(n.id);
  }
  return keep.slice(0, PET_SLOT_CAP);
}
export function loadPets(w: string): PetRec[] {
  if (!w) return [];
  try {
    const raw = localStorage.getItem(STORE + w);
    const list = raw ? JSON.parse(raw) : [];
    return applyMinted(w, Array.isArray(list) ? list as PetRec[] : []);
  } catch { return applyMinted(w, []); }
}
export function mergePetLists(a: PetRec[], b: PetRec[]): PetRec[] {
  return [...a, ...b].filter((p, i, arr) => p && p.id && arr.findIndex((x) => x && x.id === p.id) === i).slice(0, PET_SLOT_CAP);
}
export function dropSpent(w: string, list: PetRec[]): PetRec[] {
  return applyMinted(w, list);
}
export async function pullCloudPets(w: string): Promise<PetRec[]> {
  if (!w) return [];
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/pet_hub_roster?wallet=eq." + encodeURIComponent(w) + "&select=pets", { headers: rosterHdr() });
    const rows = (await r.json()) as { pets?: PetRec[] }[];
    const raw = rows && rows[0] && Array.isArray(rows[0].pets) ? rows[0].pets.filter((p) => p && (p.id || p.sig)) : [];
    return applyMinted(w, raw);
  } catch { return applyMinted(w, []); }
}
export function savePets(w: string, list: PetRec[]) {
  if (!w) return;
  const clean = applyMinted(w, list);
  try { localStorage.setItem(STORE + w, JSON.stringify(clean)); } catch { /* ignore */ }
  void fetch(SUPABASE_URL + "/rest/v1/pet_hub_roster", {
    method: "POST",
    headers: { ...rosterHdr(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ wallet: w, pets: clean, updated_at: new Date().toISOString() }),
  }).catch(() => {});
}
export function loadEmail() { try { return localStorage.getItem(EMAIL_KEY) || ""; } catch { return ""; } }
export function saveEmail(v: string) { try { localStorage.setItem(EMAIL_KEY, v); } catch { /* ignore */ } }
export function drawPetPhotoPng(emoji: string, name: string) {
  const c = document.createElement("canvas"); c.width = 720; c.height = 720; const g = c.getContext("2d"); if (!g) return "";
  g.fillStyle = "#7ecbff"; g.fillRect(0, 0, 720, 720); g.font = "280px serif"; g.textAlign = "center"; g.fillText(emoji || "\ud83d\udc3e", 360, 340); g.fillStyle = "#08200f"; g.font = "bold 36px sans-serif"; g.fillText(name || "PAWLY friend", 360, 640); return c.toDataURL("image/png");
}
export function drawCertPng(job: CertJob) {
  const c = document.createElement("canvas"); c.width = 1200; c.height = 800; const g = c.getContext("2d"); if (!g) return "";
  g.fillStyle = "#08140e"; g.fillRect(0, 0, 1200, 800); g.fillStyle = "#00ff9d"; g.font = "bold 42px sans-serif"; g.textAlign = "center"; g.fillText("PAWLY PETS CERTIFICATE", 600, 150); g.fillText(job.emoji || "\ud83d\udc3e", 600, 330); g.fillStyle = "#e8eef7"; g.font = "bold 40px sans-serif"; g.fillText(job.title, 600, 460); return c.toDataURL("image/png");
}
export function downloadDataUrl(name: string, url: string) { if (!url) return; const a = document.createElement("a"); a.href = url; a.download = name; a.click(); }
export function asset(name: string) { return "/" + name.replace(/^\//, ""); }
export const ghost: React.CSSProperties = { background: "rgba(0,0,0,0.55)", color: "#c8ffe8", border: "1px solid rgba(0,255,157,0.4)", borderRadius: 10, padding: "6px 8px", cursor: "pointer", fontWeight: 700, fontSize: 11 };
export const primary: React.CSSProperties = { ...ghost, background: "linear-gradient(90deg,#00ff9d,#7cffc8)", color: "#052015", border: "none", fontSize: 13, padding: "10px 12px" };
export const rowBtn: React.CSSProperties = { ...ghost, display: "flex", justifyContent: "space-between", width: "100%", marginBottom: 4, fontSize: 12, padding: "8px 10px" };
