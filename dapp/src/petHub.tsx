/**
 * PAWLY Pet Hub v0.2.14 — Hub USDC/USDT/SOL = dApp Swap then Payment to till.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
  AddressLookupTableAccount,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { usePawlyWallet } from "./localWallet";
import { PetRig, PET_RIG_CSS } from "./petAvatar";

export const PET_SLOT_CAP = 10;
export const FEED_DAY_MAX = 3;
function sgDay() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}
function feedsTodayOf(p?: { feedDay?: string; feedsToday?: number } | null) {
  if (!p) return 0;
  return String(p.feedDay || "") === sgDay() ? Number(p.feedsToday || 0) : 0;
}
function pickFeedPet(list: PetRec[], id?: string) {
  return list.find((x) => x.id === id) || list[0];
}
const STORE = "pawly_pet_hub_v1_";
const LEDGER = "pawly_pet_hub_ledger_v1_";
const EMAIL_KEY = "pawly_pet_hub_email_v1";
const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const PAWLY_DECIMALS = 6;
type PayCoin = "PAWLY" | "USDC" | "USDT" | "SOL";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const OFFICIAL_POOL = "6n8wjFK3mLxrw25q2k6oejt8oYupzWoBPdZqrcHDVwJ";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC =
  "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const RPCS = [
  RPC,
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
];
async function openHubConn() {
  let last = "";
  for (const url of RPCS) {
    try {
      const conn = new Connection(url, "confirmed");
      await conn.getLatestBlockhash();
      return conn;
    } catch (e) {
      last = String((e as { message?: string })?.message || e);
    }
  }
  throw new Error("RPC failed / 节点连不上 " + last);
}
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
const SPONSOR =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_PAWLY_GAS_SPONSOR?: string } }).env?.VITE_PAWLY_GAS_SPONSOR) ||
  SHOP_TILL;

type SceneId = "street" | "hospital" | "shelter" | "shop" | "hotel" | "groom" | "park";
type PetRec = {
  id: string;
  kind: string;
  species: string;
  name: string;
  emoji: string;
  hunger: number;
  health: number;
  streak: number;
  pricePawly?: number;
  sig?: string;
  feedsTotal?: number;
  feedsToday?: number;
  feedDay?: string;
  level?: number;
};
type CartKind = "adopt" | "rescue" | "service" | "food" | "feed";
type CartItem = {
  title: string;
  amount: number;
  kind: CartKind;
  species?: string;
  emoji?: string;
  petId?: string;
};
type CertJob = {
  title: string;
  amount: number;
  kind: CartKind;
  species?: string;
  emoji?: string;
  sig: string;
  certPng?: string;
  photoPng?: string;
};

const COMPANIONS = [
  { species: "dog", label: "Dog", emoji: "🐶", pricePawly: 1000 },
  { species: "cat", label: "Cat", emoji: "🐱", pricePawly: 800 },
  { species: "rabbit", label: "Rabbit", emoji: "🐰", pricePawly: 600 },
  { species: "hamster", label: "Hamster", emoji: "🐹", pricePawly: 280 },
  { species: "parrot", label: "Parrot", emoji: "🦜", pricePawly: 520 },
  { species: "chicken", label: "Chicken", emoji: "🐔", pricePawly: 180 },
  { species: "duck", label: "Duck", emoji: "🦆", pricePawly: 180 },
  { species: "minipig", label: "Mini pig", emoji: "🐷", pricePawly: 420 },
  { species: "alpaca", label: "Alpaca", emoji: "🦙", pricePawly: 700 },
  { species: "lizard", label: "Lizard", emoji: "🦎", pricePawly: 220 },
  { species: "snake", label: "Snake", emoji: "🐍", pricePawly: 260 },
  { species: "gecko", label: "Gecko", emoji: "🦎", pricePawly: 200 },
  { species: "beetle", label: "Beetle", emoji: "🪲", pricePawly: 80 },
  { species: "tarantula", label: "Tarantula", emoji: "🕷", pricePawly: 90 },
  { species: "mantis", label: "Mantis", emoji: "🦗", pricePawly: 70 },
];

const RESCUES = [
  { species: "stray-cat", label: "Stray cat", emoji: "🐱", pricePawly: 10 },
  { species: "stray-dog", label: "Stray dog", emoji: "🐶", pricePawly: 10 },
  { species: "orangutan", label: "Orangutan", emoji: "🦧", pricePawly: 25 },
  { species: "sunbear", label: "Sun bear", emoji: "🐻", pricePawly: 25 },
  { species: "malayan-tiger", label: "Malayan tiger", emoji: "🐯", pricePawly: 30 },
  { species: "seaturtle", label: "Sea turtle", emoji: "🐢", pricePawly: 20 },
  { species: "hornbill", label: "Hornbill", emoji: "🦅", pricePawly: 20 },
  { species: "asian-elephant", label: "Asian elephant", emoji: "🐘", pricePawly: 30 },
  { species: "pangolin", label: "Pangolin", emoji: "🦔", pricePawly: 20 },
  { species: "gibbon", label: "Gibbon", emoji: "🐒", pricePawly: 20 },
];


const FOODS = [
  { id: "snack", label: "Treat / snack", emoji: "🍪", pricePawly: 10 },
  { id: "catfood", label: "Cat food", emoji: "🐟", pricePawly: 15 },
  { id: "dogfood", label: "Dog food", emoji: "🦴", pricePawly: 15 },
  { id: "seed", label: "Bird / farm feed", emoji: "🌾", pricePawly: 12 },
  { id: "veg", label: "Herbivore mix", emoji: "🥬", pricePawly: 12 },
  { id: "bug", label: "Insect / reptile feed", emoji: "🍇", pricePawly: 12 },
  { id: "deluxe", label: "Deluxe bowl", emoji: "🍱", pricePawly: 30 },
];
const TITLE: Record<SceneId, string> = {
  street: "Tampines pet street",
  hospital: "Novena Pet Hospital",
  park: "East Coast park",
  shop: "Pet Shop",
  shelter: "Rescue",
  hotel: "Pet Hotel",
  groom: "Grooming",
};

const SHOPS: { id: SceneId; label: string }[] = [
  { id: "shop", label: "Shop" },
  { id: "hospital", label: "Hospital" },
  { id: "shelter", label: "Rescue" },
  { id: "hotel", label: "Hotel" },
  { id: "groom", label: "Groom" },
  { id: "park", label: "Park" },
];

const CLIP: Record<SceneId, string> = {
  street: "pet-hub-street.mp4",
  hospital: "pet-hub-hospital.mp4",
  park: "pet-hub-park.mp4",
  shop: "pet-hub-shop.mp4",
  shelter: "pet-hub-shelter.mp4",
  hotel: "pet-hub-hotel.mp4",
  groom: "pet-hub-groom.mp4",
};

function loadPets(w: string): PetRec[] {
  try {
    const raw = localStorage.getItem(STORE + (w || "guest"));
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return (list as PetRec[]).filter((p) => p && typeof p.sig === "string" && p.sig.length > 40);
  } catch {
    return [];
  }
}
function savePets(w: string, list: PetRec[]) {
  localStorage.setItem(STORE + (w || "guest"), JSON.stringify(list));
}
function saveLedger(w: string, row: Record<string, string | number>) {
  const key = LEDGER + (w || "guest");
  let prev: Record<string, string | number>[] = [];
  try {
    const raw = localStorage.getItem(key);
    prev = raw ? (JSON.parse(raw) as Record<string, string | number>[]) : [];
  } catch {
    prev = [];
  }
  prev.unshift(row);
  localStorage.setItem(key, JSON.stringify(prev.slice(0, 40)));
}
function asset(name: string) {
  return "/" + name.replace(/^\//, "");
}
function loadEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) || "";
  } catch {
    return "";
  }
}
function saveEmail(v: string) {
  try {
    localStorage.setItem(EMAIL_KEY, v);
  } catch {
    /* ignore */
  }
}
function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function drawRound(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function drawPetPhotoPng(emoji: string, name: string) {
  const c = document.createElement("canvas");
  c.width = 720;
  c.height = 720;
  const g = c.getContext("2d");
  if (!g) return "";
  const sky = g.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(0, "#7ecbff");
  sky.addColorStop(0.55, "#d7f4c2");
  sky.addColorStop(1, "#3d7a3a");
  g.fillStyle = sky;
  g.fillRect(0, 0, 720, 720);
  g.fillStyle = "#ffe27a";
  g.beginPath();
  g.arc(560, 120, 70, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#2f6b32";
  g.fillRect(0, 520, 720, 200);
  g.font = "280px serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(emoji || "🐾", 360, 340);
  g.font = "bold 36px sans-serif";
  g.fillStyle = "#08200f";
  g.fillText(name || "PAWLY friend", 360, 640);
  return c.toDataURL("image/png");
}
function drawCertPng(job: CertJob) {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 800;
  const g = c.getContext("2d");
  if (!g) return "";
  g.fillStyle = "#08140e";
  g.fillRect(0, 0, 1200, 800);
  g.strokeStyle = "#00ff9d";
  g.lineWidth = 8;
  drawRound(g, 40, 40, 1120, 720, 28);
  g.stroke();
  g.fillStyle = "#10281c";
  drawRound(g, 70, 70, 1060, 660, 22);
  g.fill();
  g.textAlign = "center";
  g.fillStyle = "#00ff9d";
  g.font = "bold 42px sans-serif";
  g.fillText("PAWLY PETS CERTIFICATE", 600, 150);
  g.font = "160px serif";
  g.fillText(job.emoji || "🐾", 600, 330);
  g.fillStyle = "#e8eef7";
  g.font = "bold 40px sans-serif";
  g.fillText(job.title, 600, 460);
  g.font = "28px sans-serif";
  g.fillStyle = "#c8ffe8";
  g.fillText(job.amount + " PAWLY  ·  on-chain", 600, 520);
  g.font = "16px monospace";
  g.fillStyle = "#9aa";
  const sig = String(job.sig || "");
  g.fillText(sig.slice(0, 44), 600, 590);
  g.fillText(sig.slice(44), 600, 616);
  g.font = "18px sans-serif";
  g.fillStyle = "#00ff9d";
  g.fillText("www.pawlypets.online", 600, 680);
  return c.toDataURL("image/png");
}
function downloadDataUrl(name: string, url: string) {
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}
async function queueCertMail(opts: { email: string; job: CertJob; wallet: string }) {
  const light = {
    email: opts.email.trim(),
    title: opts.job.title,
    amount: opts.job.amount,
    kind: opts.job.kind,
    species: opts.job.species || "",
    emoji: opts.job.emoji || "",
    sig: opts.job.sig,
    site: "https://www.pawlypets.online/dapp/pet",
  };
  const full = { ...light, certPng: opts.job.certPng || "", photoPng: opts.job.photoPng || "" };
  const post = async (body: Record<string, string | number>) => {
    const r = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    if (r.ok) return "sent";
    throw new Error(d.error || ("Mail HTTP " + r.status));
  };
  try {
    return await post(full);
  } catch (e1) {
    try {
      return await post(light);
    } catch (e2) {
      saveLedger(opts.wallet, { t: Date.now(), title: "cert-queue " + opts.job.title, email: light.email, sig: opts.job.sig });
      throw (e2 instanceof Error ? e2 : e1);
    }
  }
}

const BGM: Record<SceneId, { bpm: number; notes: number[]; wave: OscillatorType; vol: number }> = {
  street: { bpm: 108, notes: [523, 659, 784, 659], wave: "triangle", vol: 0.05 },
  shop: { bpm: 132, notes: [523, 587, 659, 784, 659, 587], wave: "square", vol: 0.035 },
  hospital: { bpm: 68, notes: [329, 311, 247, 294], wave: "sine", vol: 0.05 },
  shelter: { bpm: 76, notes: [220, 247, 196, 165], wave: "sine", vol: 0.05 },
  hotel: { bpm: 84, notes: [349, 392, 440, 392], wave: "triangle", vol: 0.045 },
  groom: { bpm: 144, notes: [784, 659, 880, 784], wave: "square", vol: 0.03 },
  park: { bpm: 100, notes: [523, 587, 698, 784], wave: "triangle", vol: 0.045 },
};
let bgmCtx: AudioContext | null = null;
let bgmTimer: number | null = null;
function pawlyStopBgm() {
  if (bgmTimer != null) {
    window.clearInterval(bgmTimer);
    bgmTimer = null;
  }
}
function midiHz(n: number) {
  return 440 * Math.pow(2, (n - 69) / 12);
}
const SONG: Record<SceneId, { bpm: number; root: number; bass: number[]; lead: number[]; arp: number[] }> = {
  street: { bpm: 112, root: 60, bass: [0, 0, 7, 7, 5, 5, 7, 4], lead: [4, 7, 9, 7, 12, 9, 7, 4], arp: [0, 4, 7, 12, 7, 4] },
  shop: { bpm: 126, root: 62, bass: [0, 0, 5, 5, 7, 7, 5, 4], lead: [7, 9, 12, 9, 7, 5, 4, 5], arp: [0, 4, 7, 11, 12, 7] },
  hospital: { bpm: 70, root: 57, bass: [0, 0, 3, 3, -2, -2, 0, 0], lead: [3, 2, 0, -2, 0, 3, 5, 3], arp: [0, 3, 7, 10, 7, 3] },
  shelter: { bpm: 76, root: 55, bass: [0, 0, -2, -2, -4, -4, 0, 0], lead: [3, 0, -2, 0, 3, 5, 3, 0], arp: [0, 3, 7, 3] },
  hotel: { bpm: 86, root: 65, bass: [0, 0, 4, 4, 5, 5, 4, 0], lead: [4, 5, 7, 9, 7, 5, 4, 2], arp: [0, 4, 9, 4] },
  groom: { bpm: 138, root: 67, bass: [0, 7, 5, 7, 0, 7, 9, 7], lead: [12, 9, 7, 12, 16, 12, 9, 7], arp: [0, 4, 7, 12, 16, 12] },
  park: { bpm: 104, root: 60, bass: [0, 0, 5, 4, 2, 2, 7, 5], lead: [7, 9, 12, 11, 9, 7, 4, 5], arp: [0, 5, 9, 12, 9, 5] },
};
function pawlyStartBgm(scene: SceneId) {
  pawlyStopBgm();
  const spec = SONG[scene] || SONG.street;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!bgmCtx) bgmCtx = new AC();
  if (bgmCtx.state === "suspended") void bgmCtx.resume();
  const ctx = bgmCtx;
  let step = 0;
  const beat = Math.max(140, Math.round(60000 / spec.bpm / 2));
  const beep = (hz: number, dur: number, type: OscillatorType, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = type === "square" ? 1400 : 2200;
    osc.type = type;
    osc.frequency.value = hz;
    gain.gain.value = vol;
    osc.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur + 0.02);
  };
  const hat = () => {
    const n = ctx.createBuffer(1, 2200, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = n;
    g.gain.value = 0.03;
    src.connect(g);
    g.connect(ctx.destination);
    src.start();
  };
  const tick = () => {
    const b = spec.bass[step % spec.bass.length];
    const l = spec.lead[step % spec.lead.length];
    const a = spec.arp[step % spec.arp.length];
    const root = spec.root;
    beep(midiHz(root + b - 12), 0.28, "triangle", 0.05);
    beep(midiHz(root + l), 0.18, "square", 0.028);
    beep(midiHz(root + a + 12), 0.12, "sine", 0.02);
    if (step % 2 === 0) hat();
    step += 1;
  };
  tick();
  bgmTimer = window.setInterval(tick, beat);
}

async function assertOnchainSuccess(conn: Connection, sig: string) {
  const s = String(sig || "").trim();
  if (s.length < 64) throw new Error("No on-chain signature / 没有链上签名");
  try {
    const latest = await conn.getLatestBlockhash();
    await conn.confirmTransaction({
      signature: s,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    });
  } catch { /* status poll below */ }
  const res = await conn.getSignatureStatuses([s], { searchTransactionHistory: true });
  const st = res?.value?.[0];
  if (st && st.err) throw new Error("Transaction failed on-chain / 链上失败");
  if (st && st.confirmationStatus) return;
  const tx = await conn.getTransaction(s, { maxSupportedTransactionVersion: 0 });
  if (tx?.meta?.err) throw new Error("Transaction failed on-chain / 链上失败");
  if (!tx) throw new Error("Signature not confirmed / 签名未上链");
}

async function sendHubSwapTx(opts: {
  conn: Connection;
  tx: VersionedTransaction;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}) {
  const sponsorize = async () => {
    if (typeof opts.signTransaction !== "function") throw new Error("no signer");
    const sponsor = new PublicKey(SPONSOR);
    const lookups = ((opts.tx.message as { addressTableLookups?: { accountKey?: PublicKey }[] }).addressTableLookups) || [];
    const alts: AddressLookupTableAccount[] = [];
    for (let i = 0; i < lookups.length; i++) {
      const key = lookups[i] && lookups[i].accountKey;
      if (!key) continue;
      let acc: { value: AddressLookupTableAccount | null } = { value: null };
      try { acc = await opts.conn.getAddressLookupTable(key); } catch { acc = { value: null }; }
      if (acc.value) alts.push(acc.value);
    }
    const ixs = TransactionMessage.decompile(opts.tx.message, { addressLookupTableAccounts: alts }).instructions;
    const { blockhash } = await opts.conn.getLatestBlockhash();
    const vtx = new VersionedTransaction(
      new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(alts)
    );
    const signed = await opts.signTransaction(vtx);
    return await postSponsor(signed, 1);
  };
  if (typeof opts.signTransaction === "function") {
    try {
      return await sponsorize();
    } catch (e1) {
      try {
        return await opts.sendTransaction(opts.tx, opts.conn);
      } catch (e2) {
        try {
          const signed = await opts.signTransaction(opts.tx);
          return await opts.conn.sendRawTransaction(signed.serialize(), { maxRetries: 4 });
        } catch {
          throw e1;
        }
      }
    }
  }
  return await opts.sendTransaction(opts.tx, opts.conn);
}


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
async function txToB64(tx: VersionedTransaction) {
  const rawBytes = tx.serialize();
  try { return btoa(String.fromCharCode.apply(null, Array.from(rawBytes))); }
  catch {
    let s = "";
    for (let i = 0; i < rawBytes.length; i++) s += String.fromCharCode(rawBytes[i]);
    return btoa(s);
  }
}
async function postSponsor(signed: VersionedTransaction, feePawly: number) {
  const r = await fetch(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
    body: JSON.stringify({ transaction: txToB64(signed), feePawly: Math.max(1, feePawly || 1) }),
  });
  const d = (await r.json().catch(() => ({}))) as { signature?: string; error?: string };
  if (r.ok && d.signature) return String(d.signature);
  throw new Error(String(d.error || ("Sponsor HTTP " + r.status)));
}

const WSOL_MINT = "So11111111111111111111111111111111111111112";
function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function swapCoinToTillPawly(opts: {
  from: PublicKey;
  coin: PayCoin;
  coinAmount: number;
  conn: Connection;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  pawlyList?: number;
}) {
  const isSol = opts.coin === "SOL";
  const inputMint = isSol ? WSOL_MINT : opts.coin === "USDT" ? USDT_MINT : USDC_MINT;
  const rawIn = isSol
    ? Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL))
    : Math.max(1, Math.round(opts.coinAmount * 1e6));
  const qUrl =
    "https://transaction-v1.raydium.io/compute/swap-base-in?inputMint=" +
    inputMint +
    "&outputMint=" +
    PAWLY_MINT +
    "&amount=" +
    String(rawIn) +
    "&slippageBps=150&txVersion=V0";
  const qr = await fetch(qUrl, { headers: { Accept: "application/json" } });
  const quote = (await qr.json()) as { success?: boolean; data?: { outputAmount?: string; otherAmountThreshold?: string }; msg?: string; message?: string };
  if (!qr.ok || !quote || quote.success === false || !quote.data) {
    throw new Error(String((quote && (quote.msg || quote.message)) || "Raydium no quote / 无法报价"));
  }
  const body: Record<string, unknown> = {
    computeUnitPriceMicroLamports: "100000",
    swapResponse: quote,
    txVersion: "V0",
    wallet: opts.from.toBase58(),
    wrapSol: isSol,
    unwrapSol: false,
  };
  if (!isSol) {
    const inMint = new PublicKey(inputMint);
    const ata = await getAssociatedTokenAddress(inMint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    let inputAccount = ata;
    const info = await opts.conn.getAccountInfo(ata);
    if (!info) {
      const listed = await opts.conn.getTokenAccountsByOwner(opts.from, { mint: inMint });
      if (!listed.value.length) throw new Error("No " + opts.coin + " token account / 没有" + opts.coin + "账户");
      inputAccount = listed.value[0].pubkey;
    }
    body.inputAccount = inputAccount.toBase58();
  }
  const sr = await fetch("https://transaction-v1.raydium.io/transaction/swap-base-in", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const pack = (await sr.json()) as { success?: boolean; msg?: string; message?: string; data?: unknown; transaction?: string; transactions?: unknown[] };
  const bag: string[] = [];
  const push = (x: unknown) => {
    if (!x) return;
    if (typeof x === "string" && x.length > 40) {
      bag.push(x);
      return;
    }
    if (Array.isArray(x)) {
      x.forEach(push);
      return;
    }
    if (typeof x === "object") {
      const o = x as { transaction?: unknown; tx?: unknown; data?: unknown; transactions?: unknown };
      push(o.transaction);
      push(o.tx);
      push(o.data);
      push(o.transactions);
    }
  };
  push(pack);
  if (!sr.ok || pack.success === false || !bag[0]) {
    throw new Error(String((pack && (pack.msg || pack.message)) || "Raydium build failed / 兑换构造失败"));
  }
  const tx = VersionedTransaction.deserialize(b64ToBytes(bag[0]));
  const sig = await sendHubSwapTx({
    conn: opts.conn,
    tx,
    sendTransaction: opts.sendTransaction,
    signTransaction: opts.signTransaction,
  });
  await assertOnchainSuccess(opts.conn, sig);
  const outUi = Number(quote.data.otherAmountThreshold || quote.data.outputAmount || 0) / 1e6;
  const list = Number(opts.pawlyList || 0);
  const payAmt = list > 0 ? Math.min(list, outUi) : outUi;
  if (payAmt > 0) {
    return payHubToken({
      from: opts.from,
      pawlyList: payAmt,
      coin: "PAWLY",
      coinAmount: payAmt,
      sendTransaction: opts.sendTransaction,
      signTransaction: opts.signTransaction,
    });
  }
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
  const sponsor = new PublicKey(SPONSOR);
  if (opts.from.equals(till)) throw new Error("Shop till is this wallet / 不能付给自己");
  if (opts.coinAmount <= 0) throw new Error("No live price / 拉不到价，改用 PAWLY");
  const conn = await openHubConn();
  if (opts.coin !== "PAWLY") {
    return await swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction, pawlyList: opts.pawlyList });
  }
  const { blockhash } = await conn.getLatestBlockhash();
  const ixsFor = async (ataPayer: PublicKey) => {
    if (opts.coin === "SOL") {
      const lamports = Math.max(1, Math.round(opts.coinAmount * LAMPORTS_PER_SOL));
      return [SystemProgram.transfer({ fromPubkey: opts.from, toPubkey: till, lamports })];
    }
    const mintStr = opts.coin === "USDC" ? USDC_MINT : opts.coin === "USDT" ? USDT_MINT : PAWLY_MINT;
    const mint = new PublicKey(mintStr);
    const rawAmt = Math.round(opts.coinAmount * Math.pow(10, 6));
    if (rawAmt <= 0) throw new Error("Amount too small / 金额太小");
    const fromAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const toAta = await getAssociatedTokenAddress(mint, till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    return [
      createAssociatedTokenAccountIdempotentInstruction(ataPayer, toAta, till, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
      createTransferCheckedInstruction(fromAta, mint, toAta, opts.from, rawAmt, 6, [], TOKEN_PROGRAM_ID),
    ];
  };
  const compile = async (payerKey: PublicKey) => {
    const ixs = await ixsFor(payerKey);
    const msg = new TransactionMessage({ payerKey, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message();
    return new VersionedTransaction(msg);
  };
  try {
    const tx = await compile(sponsor);
    if (typeof opts.signTransaction !== "function") throw new Error("Wallet cannot sign / 钱包无法签名");
    const signed = await opts.signTransaction(tx);
    const sig = await postSponsor(signed, 1);
    await assertOnchainSuccess(conn, sig);
    return sig;
  } catch {
    const tx = await compile(opts.from);
    const sig = await opts.sendTransaction(tx, conn);
    await assertOnchainSuccess(conn, sig);
    return sig;
  }
}
async function payPawlyInHub(opts: {
  from: PublicKey;
  amount: number;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}): Promise<string> {
  const mint = new PublicKey(PAWLY_MINT);
  const till = new PublicKey(SHOP_TILL);
  const payer = new PublicKey(SPONSOR);
  if (opts.from.equals(till)) throw new Error("Shop till is this wallet / 不能付给自己");
  const rawAmt = Math.round(opts.amount * Math.pow(10, PAWLY_DECIMALS));
  if (rawAmt <= 0) throw new Error("Invalid amount");
  const conn = await openHubConn();
  const fromAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const toAta = await getAssociatedTokenAddress(mint, till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const ixs = [
    createAssociatedTokenAccountIdempotentInstruction(payer, toAta, till, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(fromAta, mint, toAta, opts.from, rawAmt, PAWLY_DECIMALS, [], TOKEN_PROGRAM_ID),
  ];
  const { blockhash } = await conn.getLatestBlockhash();
  const msg = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message();
  const tx = new VersionedTransaction(msg);
  let sig = "";
  if (typeof opts.signTransaction === "function") {
    const signed = await opts.signTransaction(tx);
    const rawBytes = signed.serialize();
    let b64 = "";
    try {
      b64 = btoa(String.fromCharCode.apply(null, Array.from(rawBytes)));
    } catch {
      let s = "";
      for (let i = 0; i < rawBytes.length; i++) s += String.fromCharCode(rawBytes[i]);
      b64 = btoa(s);
    }
    const r = await fetch(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + SUPABASE_KEY,
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify({ transaction: b64, feePawly: 1 }),
    });
    const d = (await r.json().catch(() => ({}))) as { signature?: string; error?: string };
    if (r.ok && d.signature) sig = String(d.signature);
    else if (d.error) throw new Error(String(d.error));
  }
  if (!sig) sig = await opts.sendTransaction(tx, conn);
  await assertOnchainSuccess(conn, sig);
  return sig;
}

const ghost: React.CSSProperties = {
  background: "rgba(0,0,0,0.55)",
  color: "#c8ffe8",
  border: "1px solid rgba(0,255,157,0.4)",
  borderRadius: 10,
  padding: "6px 8px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 11,
};
const primary: React.CSSProperties = {
  ...ghost,
  background: "linear-gradient(90deg,#00ff9d,#7cffc8)",
  color: "#052015",
  border: "none",
  fontSize: 13,
  padding: "10px 12px",
};
const rowBtn: React.CSSProperties = {
  ...ghost,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginBottom: 4,
  fontSize: 12,
  padding: "8px 10px",
};

export function PetHubPage() {
  const navigate = useNavigate();
  const wallet = usePawlyWallet() as {
    publicKey?: PublicKey | null;
    sendTransaction?: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
    signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  };
  const addr = (wallet.publicKey && wallet.publicKey.toString()) || "";
  const [scene, setScene] = useState<SceneId>("street");
  const [shopView, setShopView] = useState<"home" | "adopt" | "food">("home");
  const [focusId, setFocusId] = useState("");
  const [feedWarn, setFeedWarn] = useState(false);
  const [congrats, setCongrats] = useState("");
  const [pets, setPets] = useState<PetRec[]>(() => loadPets(addr));
  const [cart, setCart] = useState<CartItem | null>(null);
  const [payCoin, setPayCoin] = useState<PayCoin>("PAWLY");
  const [px, setPx] = useState({ pawlyUsd: 0, solUsd: 0 });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [lastSig, setLastSig] = useState("");
  const [lastPaid, setLastPaid] = useState(0);
  const [lastTitle, setLastTitle] = useState("");
  const [cert, setCert] = useState<CertJob | null>(null);
  const [email, setEmail] = useState(() => loadEmail());
  const [mailNote, setMailNote] = useState("");
  const [greet, setGreet] = useState(true);
  const [music, setMusic] = useState(false);
  const hint = useMemo(() => (addr ? addr.slice(0, 4) + "…" + addr.slice(-4) : "connect wallet"), [addr]);
  useEffect(() => { void fetchHubPx().then(setPx); const id = window.setInterval(() => { void fetchHubPx().then(setPx); }, 60000); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    setGreet(true);
    const id = window.setTimeout(() => setGreet(false), 9000);
    return () => window.clearTimeout(id);
  }, [addr]);
  useEffect(() => {
    if (music) pawlyStartBgm(scene);
    else pawlyStopBgm();
    return () => pawlyStopBgm();
  }, [music, scene]);

  const openCart = (item: CartItem) => {
    setNote("");
    if (item.kind === "food" || item.kind === "feed") {
      const pet = pickFeedPet(pets, item.petId || focusId);
      if (!pet) { setNote("Adopt a pet first / 先领养"); return; }
      const n = feedsTodayOf(pet);
      if (n >= FEED_DAY_MAX) { setNote(pet.name + " already fed " + FEED_DAY_MAX + "/" + FEED_DAY_MAX + " today. Come back tomorrow / 今日已喂满 3 次"); return; }
    }
    setCart(item);
  };

  const grantAdopt = (item: CartItem, sig: string) => {
    if (item.kind !== "adopt") return;
    if (pets.length >= PET_SLOT_CAP) throw new Error("Max 10 pets / 最多 10 只");
    const next: PetRec[] = [
      ...pets,
      {
        id: "pet_" + Date.now(),
        kind: "adopted",
        species: item.species || "dog",
        name: item.title.replace(/^Adopt\s+/i, ""),
        emoji: item.emoji || "🐶",
        hunger: 70,
        health: 80,
        streak: 0,
        pricePawly: item.amount,
        sig,
      },
    ];
    setPets(next);
    savePets(addr, next);
  };

  const confirmPay = async () => {
    if (!cart) return;
    if (!wallet.publicKey || !wallet.sendTransaction) {
      setNote("Connect wallet in dApp first / 先在 dApp 连接钱包");
      return;
    }
    if (cart.kind === "adopt" && pets.length >= PET_SLOT_CAP) {
      setNote("Max 10 pets / 最多 10 只");
      return;
    }
    if (cart.kind === "rescue" && cart.amount < 10) {
      setNote("Rescue starts at 10 PAWLY");
      return;
    }
    if (cart.kind === "food" || cart.kind === "feed") {
      const pet = pickFeedPet(pets, cart.petId || focusId);
      if (!pet) { setNote("Adopt a pet first / 先领养"); return; }
      if (feedsTodayOf(pet) >= FEED_DAY_MAX) { setNote(pet.name + " already fed " + FEED_DAY_MAX + "/" + FEED_DAY_MAX + " today. Come back tomorrow / 今日已喂满 3 次"); setCart(null); return; }
    }
    setBusy(true);
    setNote("Paying in Pet Hub…");
    try {
      const q = quoteCoin(cart.amount, payCoin, px);
      if (payCoin !== "PAWLY" && q.amount <= 0) throw new Error("No live price / 拉不到价，改用 PAWLY");
      const sig = await payHubToken({
        from: wallet.publicKey,
        pawlyList: cart.amount,
        coin: payCoin,
        coinAmount: q.amount,
        sendTransaction: wallet.sendTransaction,
        signTransaction: wallet.signTransaction,
      });
      saveLedger(addr, { t: Date.now(), title: cart.title, amount: cart.amount, sig, scene, kind: cart.kind });
      grantAdopt(cart, sig);
      if (cart.kind === "food" || cart.kind === "feed") {
        const id = cart.petId || focusId || (pets[0] && pets[0].id) || "";
        if (id) {
          const next = pets.map((p) => {
            if (p.id !== id) return p;
            const total = Number(p.feedsTotal || 0) + 1;
            const today = sgDay();
            const same = String(p.feedDay || "") === today;
            const todayN = same ? Number(p.feedsToday || 0) + 1 : 1;
            return { ...p, feedsTotal: total, feedsToday: todayN, feedDay: today, level: Math.floor(total / 10) };
          });
          setPets(next);
          savePets(addr, next);
          const fed = next.find((p) => p.id === id);
          const left = fed ? 10 - (Number(fed.feedsTotal || 0) % 10) : 9;
          setCongrats("Fed once. " + left + " more feeds to next level. Today " + (fed && fed.feedsToday ? fed.feedsToday : 1) + "/3.");
        }
      }
      setLastPaid(cart.amount);
      setLastSig(sig);
      setLastTitle(cart.title);
      setNote("");
      setCart(null);
      if (cart.kind === "adopt" || cart.kind === "rescue") {
        setMailNote("");
        {
          const job: CertJob = {
            title: cart.title,
            amount: cart.amount,
            kind: cart.kind,
            species: cart.species,
            emoji: cart.emoji,
            sig,
          };
          job.photoPng = drawPetPhotoPng(job.emoji || "🐾", job.title);
          job.certPng = drawCertPng(job);
          setCert(job);
        }
      }
    } catch (e) {
      setNote(String((e as { message?: string })?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ height: "100dvh", maxHeight: "100dvh", overflow: "hidden", background: "#070b10", color: "#e8eef7", display: "flex", flexDirection: "column", position: "relative", maxWidth: 430, margin: "0 auto", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div style={{ flex: "0 0 auto", padding: "calc(env(safe-area-inset-top, 16px) + 22px) 10px 8px" }}>
        <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 15 }}>{TITLE[scene]}</div>
        <div style={{ color: "#8aa", fontSize: 11, margin: "2px 0 8px" }}>{hint}</div>
        <button type="button" style={{ ...ghost, width: "100%", minHeight: 42, fontSize: 13 }} onClick={() => setMusic((v) => !v)}>
          {music ? "BGM on · tap to mute" : "BGM off · tap for scene music"}
        </button>
      </div>
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", background: "#0a1016" }}>
        <video key={scene} src={asset(CLIP[scene])} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        {greet && pets.length ? (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            {pets.slice(0, 4).map((p, i) => (
              <div key={p.id} className={"pawly-run pawly-run-" + (i % 3)} style={{ position: "absolute", bottom: 18 + i * 10, left: 8 + i * 18 }}>
                <div className="pawly-bubble">{i % 2 === 0 ? "Hug me!" : "Snack please!"}</div>
                <div className="pawly-pet">{p.emoji}</div>
                <div style={{ fontSize: 10, color: "#fff", textShadow: "0 1px 2px #000", textAlign: "center" }}>{p.name}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <style>{PET_RIG_CSS + `
        .pawly-pet { font-size: 42px; line-height: 1; animation: pawly-wiggle 0.5s ease-in-out infinite alternate; }
        .pawly-bubble { background: #fff; color: #102018; font-size: 11px; font-weight: 800; border-radius: 10px; padding: 4px 8px; margin-bottom: 4px; width: max-content; }
        .pawly-run { animation: pawly-in 1.1s ease-out both; }
        .pawly-run-1 { animation-delay: 0.18s; }
        .pawly-run-2 { animation-delay: 0.36s; }
        @keyframes pawly-in { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pawly-wiggle { from { transform: rotate(-8deg) translateY(0); } to { transform: rotate(8deg) translateY(-6px); } }
      `}</style>
      <div style={{ flex: "0 0 auto", zIndex: 2, padding: "8px 8px 10px", background: "#070b10", maxHeight: "46dvh", overflowY: "auto" }}>
                {scene === "street" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", padding: "6px 0 10px" }}>
            {pets.length ? pets.map((p) => (
              <button key={p.id} type="button" onClick={() => { setFocusId(p.id); setFeedWarn(true); }} style={{ background: "transparent", border: "none", color: "#e8eef7" }}>
                <PetRig pet={{ species: p.species, level: Number((p as { level?: number }).level || 0), emoji: p.emoji }} size={96} />
                <div style={{ fontSize: 11, fontWeight: 800 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "#9f8" }}>{"Lv" + Number(p.level || 0) + " · " + Number(p.feedsTotal || 0) + " feeds"}</div>
                <div style={{ fontSize: 10, color: "#8aa" }}>{10 - (Number(p.feedsTotal || 0) % 10) + " to next body"}</div>
              </button>
            )) : <div style={{ color: "#8aa", fontSize: 12 }}>Adopt in Shop to see your pet here.</div>}
          </div>
        )}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 8 }}>
          <button type="button" onClick={() => { setScene("street"); setShopView("home"); setNote(""); }} style={{ ...ghost, flex: "0 0 auto", background: scene === "street" ? "rgba(0,255,157,0.28)" : ghost.background }}>Street</button>
          {SHOPS.map((s) => (
            <button key={s.id} type="button" onClick={() => { setScene(s.id); setShopView("home"); setNote(""); }} style={{ ...ghost, flex: "0 0 auto", background: scene === s.id ? "rgba(0,255,157,0.28)" : ghost.background }}>
              {s.label}
            </button>
          ))}
        </div>
        {scene !== "street" && pets.length ? <div style={{ fontSize: 12, marginBottom: 6 }}>{pets.map((p) => p.emoji + p.name).join("  ")}</div> : null}

        {scene === "shop" && shopView === "home" && (
          <div>
            <button type="button" style={{ ...primary, width: "100%", marginBottom: 8 }} onClick={() => setShopView("adopt")}>Choose your pets</button>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => setShopView("food")}>Pets food</button>
          </div>
        )}
        {scene === "shop" && shopView === "adopt" && (
          <div>
            <button type="button" style={{ ...ghost, marginBottom: 8 }} onClick={() => setShopView("home")}>← Shop</button>
            <div style={{ color: "#9aa", fontSize: 11, marginBottom: 4 }}>Choose your pets · max 10</div>
            {COMPANIONS.map((c) => (
              <button
                key={c.species}
                type="button"
                style={rowBtn}
                onClick={() => openCart({ title: "Adopt " + c.label, amount: c.pricePawly, kind: "adopt", species: c.species, emoji: c.emoji })}
              >
                <span>{c.emoji + " " + c.label}</span>
                <span>{c.pricePawly} PAWLY</span>
              </button>
            ))}
          </div>
        )}

        
        {scene === "shop" && shopView === "food" && (
          <div>
            <button type="button" style={{ ...ghost, marginBottom: 8 }} onClick={() => setShopView("home")}>← Shop</button>
            <div style={{ color: "#9aa", fontSize: 11, marginBottom: 4 }}>Pets food · 10–30 PAWLY · today {feedsTodayOf(pickFeedPet(pets, focusId))}/{FEED_DAY_MAX}</div>
            {FOODS.map((c) => (
              <button key={c.id} type="button" style={rowBtn} onClick={() => openCart({ title: c.label, amount: c.pricePawly, kind: "food", emoji: c.emoji, petId: focusId || (pets[0] && pets[0].id) || undefined })}>
                <span>{c.emoji + " " + c.label}</span><span>{c.pricePawly} PAWLY</span>
              </button>
            ))}
          </div>
        )}
        {scene === "shelter" && (
          <div>
            <div style={{ color: "#9aa", fontSize: 11, marginBottom: 4 }}>Pick who to rescue · from 10 PAWLY</div>
            {RESCUES.map((c) => (
              <button
                key={c.species}
                type="button"
                style={rowBtn}
                onClick={() => openCart({ title: "Rescue " + c.label, amount: c.pricePawly, kind: "rescue", species: c.species, emoji: c.emoji })}
              >
                <span>{c.emoji + " " + c.label}</span>
                <span>{c.pricePawly} PAWLY</span>
              </button>
            ))}
          </div>
        )}

        {scene === "hospital" && (
          <button type="button" style={{ ...primary, width: "100%" }} onClick={() => openCart({ title: "Hospital checkup", amount: 120, kind: "service" })}>
            Pay 120 PAWLY · checkup
          </button>
        )}
        {scene === "park" && (
          <button type="button" style={{ ...primary, width: "100%" }} onClick={() => openCart({ title: "Walk the dog", amount: 40, kind: "service" })}>
            Pay 40 PAWLY · walk
          </button>
        )}
        {(scene === "hotel" || scene === "groom") && (
          <button type="button" style={{ ...primary, width: "100%" }} onClick={() => openCart({ title: TITLE[scene], amount: scene === "hotel" ? 180 : 90, kind: "service" })}>
            Pay {scene === "hotel" ? 180 : 90} PAWLY
          </button>
        )}
        {note ? <div style={{ color: "#ffb4b4", fontSize: 11, marginTop: 6, wordBreak: "break-word" }}>{note}</div> : null}
        {lastSig ? (
          <div style={{ marginTop: 8, padding: "8px 8px 6px", border: "1px solid rgba(0,255,157,0.35)", borderRadius: 10, background: "#0c1410" }}>
            <div style={{ color: "#00ff9d", fontSize: 12, fontWeight: 800 }}>Paid {lastPaid} PAWLY · {lastTitle}</div>
            <div style={{ color: "#c8ffe8", fontSize: 10, lineHeight: 1.35, wordBreak: "break-all", margin: "4px 0 6px" }}>{lastSig}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" style={{ ...ghost, flex: 1 }} onClick={() => { try { navigator.clipboard.writeText(lastSig); } catch { /* ignore */ } }}>Copy sig</button>
              <button type="button" style={{ ...ghost, flex: 1 }} onClick={() => window.open("https://solscan.io/tx/" + lastSig, "_blank")}>Solscan</button>
            </div>
          </div>
        ) : null}
        <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => navigate("/")}>
          ← Home
        </button>
      </div>
      
      {feedWarn ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end" }} onClick={() => setFeedWarn(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800 }}>Feed this pet</div>
            <div style={{ fontSize: 13, margin: "8px 0 12px" }}>Max 3 feeds per day. Each feed 10–30 PAWLY. 10 feeds = 1 level.</div>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => { const pet = pickFeedPet(pets, focusId); const n = feedsTodayOf(pet); if (!pet) { setFeedWarn(false); setNote("Adopt a pet first / 先领养"); return; } if (n >= FEED_DAY_MAX) { setFeedWarn(false); setNote(pet.name + " already fed " + n + "/" + FEED_DAY_MAX + " today. Come back tomorrow / 今日已喂满 3 次"); return; } setFeedWarn(false); setScene("shop"); setShopView("food"); }}>Go to Pets food</button>
            <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setFeedWarn(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
      {congrats ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 6, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end" }} onClick={() => setCongrats("")}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800 }}>Fed!</div>
            <div style={{ margin: "8px 0 12px" }}>{congrats}</div>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => { setCongrats(""); setScene("street"); }}>Back to street</button>
          </div>
        </div>
      ) : null}
      {cart ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => !busy && setCart(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#101820", borderTop: "1px solid rgba(0,255,157,0.4)", borderRadius: "16px 16px 0 0", padding: "16px 14px 18px" }}>
            <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 16 }}>Pet Hub checkout</div>
            <div style={{ margin: "8px 0 4px", fontSize: 14 }}>{cart.emoji ? cart.emoji + " " : ""}{cart.title}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{cart.amount} PAWLY</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
              {(["PAWLY", "USDC", "USDT", "SOL"] as PayCoin[]).map((c) => (
                <button key={c} type="button" onClick={() => setPayCoin(c)} style={{ ...ghost, padding: "6px 10px", borderColor: payCoin === c ? "#00ff9d" : "rgba(255,255,255,0.2)", color: payCoin === c ? "#00ff9d" : "#c8ffe8" }}>{c}</button>
              ))}
            </div>
            <div style={{ fontSize: 14, color: "#c8ffe8", marginBottom: 6 }}>{quoteCoin(cart.amount, payCoin, px).label}{px.pawlyUsd ? " · PAWLY $" + px.pawlyUsd.toFixed(4) : ""}</div>
            <div style={{ fontSize: 11, color: "#9aa", margin: "6px 0 12px" }}>
              Pays in USDC/USDT/SOL: swaps to PAWLY on the official pool, then PAWLY hits the shop till.<br />
              用 USDC/USDT/SOL 付款时先换成 PAWLY 再进店柜，不用回 Swap 页。
            </div>
            <button type="button" disabled={busy} style={{ ...primary, width: "100%", opacity: busy ? 0.6 : 1 }} onClick={confirmPay}>
              {busy ? "Paying…" : "Confirm · " + quoteCoin(cart.amount, payCoin, px).label}
            </button>
            <button type="button" disabled={busy} style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setCart(null)}>Cancel</button>
            {note ? <div style={{ color: "#ffb4b4", fontSize: 11, marginTop: 8 }}>{note}</div> : null}
          </div>
        </div>
      ) : null}

      {cert ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 6, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ width: "100%", background: "#101820", borderTop: "1px solid rgba(0,255,157,0.4)", borderRadius: "16px 16px 0 0", padding: "16px 14px 18px" }}>
            <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 16 }}>Certificate + photo</div>
            <div style={{ margin: "10px 0", padding: 10, borderRadius: 12, background: "#0b1610", border: "1px solid rgba(0,255,157,0.35)", textAlign: "center" }}>
              {cert.photoPng ? <img alt="pet" src={cert.photoPng} onClick={() => downloadDataUrl("pawly-pet.jpg", cert.photoPng || "")} style={{ width: "46%", borderRadius: 10, marginRight: 6, cursor: "pointer" }} /> : <div style={{ fontSize: 52 }}>{cert.emoji}</div>}
              {cert.certPng ? <img alt="certificate" src={cert.certPng} onClick={() => downloadDataUrl("pawly-certificate.jpg", cert.certPng || "")} style={{ width: "46%", borderRadius: 10, cursor: "pointer" }} /> : null}
              <div style={{ fontWeight: 800, marginTop: 8 }}>{cert.title}</div>
              <div style={{ fontSize: 12, color: "#c8ffe8" }}>{cert.amount} PAWLY · generated certificate + photo</div>
              <div style={{ fontSize: 10, color: "#8aa", marginTop: 6, wordBreak: "break-all" }}>{cert.sig}</div>
            </div>
            <div style={{ fontSize: 12, color: "#c8ffe8", margin: "0 0 8px" }}>Tap a picture to save. Long-press also works on phone.</div>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => downloadDataUrl("pawly-pet.jpg", cert.photoPng || "")}>Download pet photo</button>
            <button type="button" style={{ ...primary, width: "100%", marginTop: 8 }} onClick={() => downloadDataUrl("pawly-certificate.jpg", cert.certPng || "")}>Download certificate</button>
            <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setCert(null)}>Done</button>
            {mailNote ? <div style={{ color: "#9f8", fontSize: 11, marginTop: 8 }}>{mailNote}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
