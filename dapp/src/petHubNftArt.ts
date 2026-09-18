/** Seed-drawn myth sprites. 8-frame idle sheet — Pokemon-like loop, original species only. */
import { MYTH_KIND, MYTH_NAME } from "./petHubMythSprites";
import type { MythSprite } from "./petHubMythSprites";

export type MythKind = "sacred" | "weird";
export type MythSpec = { name: string; species: string; kind: MythKind; seed: number; sprite: MythSprite };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function spriteOf(seed: number): MythSprite {
  return MYTH_KIND[seed % MYTH_KIND.length];
}

export function mythicFrom(a: string, b: string, sig: string): MythSpec {
  const seed = hash((sig || "pawly") + "|" + String(a || "") + "|" + String(b || ""));
  const sprite = spriteOf(seed);
  const kind: MythKind = seed % 2 === 0 ? "sacred" : "weird";
  return { name: MYTH_NAME[sprite], species: kind + "-" + sprite, kind, seed, sprite };
}

function seedOf(n: { id?: string; name?: string; species?: string; breedSig?: string }) {
  return hash(String(n.breedSig || n.id || n.species || n.name || "pawly"));
}

export function nftSpriteOf(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite }): MythSprite {
  if (n.sprite && MYTH_KIND.indexOf(n.sprite) >= 0) return n.sprite;
  const species = String(n.species || "");
  for (const k of MYTH_KIND) {
    if (species === k || species.endsWith("-" + k) || species.indexOf(k) >= 0) return k;
  }
  const name = String(n.name || "");
  for (const k of MYTH_KIND) {
    if (name === MYTH_NAME[k] || name.toLowerCase().indexOf(k) >= 0) return k;
  }
  return spriteOf(seedOf(n));
}

export function nftSpriteName(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite }) {
  return MYTH_NAME[nftSpriteOf(n)];
}

export function mythArt(_sprite: MythSprite) {
  return "";
}

const PAL: Record<MythSprite, { bg: string; ink: string; body: string; light: string; dark: string; accent: string; eye: string }> = {
  fox:  { bg: "#1a3348", ink: "#1a1208", body: "#f0a020", light: "#ffe9a8", dark: "#c45e08", accent: "#ff6b2d", eye: "#1d3b20" },
  moth: { bg: "#2a1844", ink: "#1a0828", body: "#d4a0f0", light: "#f3e2ff", dark: "#7a3aad", accent: "#67e8f9", eye: "#2a0840" },
  wyrm: { bg: "#083040", ink: "#041820", body: "#2ad4e8", light: "#b8f4ff", dark: "#0e7480", accent: "#fde047", eye: "#083040" },
  boar: { bg: "#3a1c14", ink: "#1c0a08", body: "#d07058", light: "#f0c8b0", dark: "#8a3028", accent: "#f0c040", eye: "#2a1010" },
  cat:  { bg: "#1c1a40", ink: "#0c0a20", body: "#90b8f0", light: "#e0e8ff", dark: "#3a58a8", accent: "#c4b5fd", eye: "#f0d060" },
  toad: { bg: "#143420", ink: "#082010", body: "#48c060", light: "#c8f0b0", dark: "#1a7030", accent: "#f0d020", eye: "#143420" },
  lynx: { bg: "#143848", ink: "#081820", body: "#70d8e8", light: "#e0ffff", dark: "#1a6880", accent: "#a5b4fc", eye: "#082028" },
  rose: { bg: "#401028", ink: "#200810", body: "#e85878", light: "#ffd0dc", dark: "#9a2048", accent: "#f0e080", eye: "#401028" },
};

const PX = 64;
const FRAMES = 8;

function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

function strokeOval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.stroke();
}

type Pose = { bob: number; tail: number; wing: number; blink: boolean; sway: number };

function poseOf(frame: number): Pose {
  const t = (frame / FRAMES) * Math.PI * 2;
  return {
    bob: Math.round(Math.sin(t) * 1.6),
    tail: Math.round(Math.sin(t) * 5),
    wing: Math.round(Math.sin(t) * 6),
    blink: frame === 5,
    sway: Math.round(Math.cos(t) * 1.2),
  };
}

function drawCreature(ctx: CanvasRenderingContext2D, sprite: MythSprite, seed: number, frame: number) {
  const p = PAL[sprite];
  const pose = poseOf(frame);
  ctx.save();
  ctx.translate(32 + pose.sway, 34 + pose.bob);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 2;
  ctx.strokeStyle = p.ink;
  if (sprite === "fox") drawFox(ctx, p, pose);
  else if (sprite === "moth") drawMoth(ctx, p, pose);
  else if (sprite === "wyrm") drawWyrm(ctx, p, pose);
  else if (sprite === "boar") drawBoar(ctx, p, pose);
  else if (sprite === "cat") drawCat(ctx, p, pose);
  else if (sprite === "toad") drawToad(ctx, p, pose);
  else if (sprite === "lynx") drawLynx(ctx, p, pose);
  else drawRose(ctx, p, pose);
  if (seed % 2 === 0) {
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -28, 11, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.restore();
}

type C = { body: string; light: string; dark: string; accent: string; eye: string; ink: string };

function legs(ctx: CanvasRenderingContext2D, p: C, stance: number) {
  ctx.fillStyle = p.dark;
  ctx.strokeStyle = p.ink;
  const feet = [
    [-10, 16, -12, 24],
    [6, 16, 8, 24],
    [-4, 16, -6, 25],
    [12, 16, 14, 25],
  ];
  for (const [x1, y1, x2, y2] of feet) {
    ctx.beginPath();
    ctx.moveTo(x1, y1 + stance);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = p.dark;
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = p.ink;
    ctx.stroke();
    ctx.fillStyle = p.dark;
    oval(ctx, x2, y2 + 1, 3.2, 1.6, 0);
  }
}

function face(ctx: CanvasRenderingContext2D, p: C, blink: boolean, y = -16) {
  ctx.fillStyle = "#fff";
  if (blink) {
    ctx.fillStyle = p.ink;
    ctx.fillRect(-7, y - 1, 5, 1.4);
    ctx.fillRect(2, y - 1, 5, 1.4);
  } else {
    oval(ctx, -5, y, 3.2, 3.6, 0);
    oval(ctx, 5, y, 3.2, 3.6, 0);
    ctx.fillStyle = p.eye;
    oval(ctx, -4.4, y + 0.4, 1.6, 1.8, 0);
    oval(ctx, 5.6, y + 0.4, 1.6, 1.8, 0);
    ctx.fillStyle = "#fff";
    oval(ctx, -5.2, y - 0.8, 0.8, 0.8, 0);
    oval(ctx, 4.8, y - 0.8, 0.8, 0.8, 0);
  }
}

function drawFox(ctx: CanvasRenderingContext2D, p: C, pose: Pose) {
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.moveTo(10, 2);
  ctx.quadraticCurveTo(28 + pose.tail, -6, 24 + pose.tail, 14);
  ctx.quadraticCurveTo(18, 8, 8, 8);
  ctx.fill();
  ctx.stroke();
  legs(ctx, p, 0);
  ctx.fillStyle = p.body;
  oval(ctx, 0, 6, 13, 11, 0);
  ctx.strokeStyle = p.ink;
  strokeOval(ctx, 0, 6, 13, 11, 0);
  ctx.fillStyle = p.light;
  oval(ctx, 0, 8, 7, 6, 0);
  ctx.fillStyle = p.body;
  oval(ctx, 0, -12, 11, 10, 0);
  strokeOval(ctx, 0, -12, 11, 10, 0);
  ctx.fillStyle = p.body;
  ctx.beginPath(); ctx.moveTo(-7, -18); ctx.lineTo(-11, -28); ctx.lineTo(-1, -20); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(7, -18); ctx.lineTo(11, -28); ctx.lineTo(1, -20); ctx.fill(); ctx.stroke();
  ctx.fillStyle = p.light;
  ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(-9, -25); ctx.lineTo(-3, -19); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -18); ctx.lineTo(9, -25); ctx.lineTo(3, -19); ctx.fill();
  ctx.fillStyle = p.light;
  oval(ctx, 0, -8, 6, 4.5, 0);
  face(ctx, p, pose.blink, -13);
  ctx.fillStyle = p.ink;
  oval(ctx, 0, -7, 1.4, 1, 0);
}

function drawMoth(ctx: CanvasRenderingContext2D, p: C, pose: Pose) {
  const w = pose.wing;
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.ellipse(-14, -4 - w * 0.15, 12, 9, -0.4, 0, Math.PI * 2);
  ctx.ellipse(14, -4 - w * 0.15, 12, 9, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.ellipse(-12, 6 + w * 0.1, 8, 6, -0.2, 0, Math.PI * 2);
  ctx.ellipse(12, 6 + w * 0.1, 8, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.light;
  oval(ctx, -14, -4, 4, 3, 0);
  oval(ctx, 14, -4, 4, 3, 0);
  ctx.fillStyle = p.dark;
  oval(ctx, 0, 2, 5, 12, 0);
  ctx.strokeStyle = p.ink;
  strokeOval(ctx, 0, 2, 5, 12, 0);
  ctx.fillStyle = p.body;
  oval(ctx, 0, -12, 6, 6, 0);
  strokeOval(ctx, 0, -12, 6, 6, 0);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-2, -16); ctx.quadraticCurveTo(-8, -26, -10, -24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -16); ctx.quadraticCurveTo(8, -26, 10, -24); ctx.stroke();
  ctx.fillStyle = p.accent;
  oval(ctx, -10, -24, 1.6, 1.6, 0);
  oval(ctx, 10, -24, 1.6, 1.6, 0);
  face(ctx, p, pose.blink, -12);
}

function drawWyrm(ctx: CanvasRenderingContext2D, p: C, pose: Pose) {
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.moveTo(6, 4);
  ctx.quadraticCurveTo(22 + pose.tail, 16, 18 + pose.tail, 26);
  ctx.quadraticCurveTo(10 + pose.tail, 18, 4, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.quadraticCurveTo(-18, -16 + pose.wing, -8, -22 + pose.wing);
  ctx.quadraticCurveTo(-2, -8, 4, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.body;
  oval(ctx, 0, 4, 10, 8, -0.2);
  strokeOval(ctx, 0, 4, 10, 8, -0.2);
  ctx.fillStyle = p.body;
  oval(ctx, -2, -12, 9, 8, 0);
  strokeOval(ctx, -2, -12, 9, 8, 0);
  ctx.fillStyle = p.accent;
  ctx.beginPath(); ctx.moveTo(-2, -20); ctx.lineTo(0, -28); ctx.lineTo(4, -18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = p.light;
  oval(ctx, -2, -10, 5, 3.5, 0);
  face(ctx, p, pose.blink, -13);
  ctx.fillStyle = p.ink;
  ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-12, -6); ctx.stroke();
}

function drawBoar(ctx: CanvasRenderingContext2D, p: C, pose: Pose) {
  ctx.fillStyle = p.dark;
  ctx.beginPath();
  ctx.moveTo(10, 2);
  ctx.quadraticCurveTo(20 + pose.tail * 0.4, 6, 16, 14);
  ctx.lineTo(8, 8);
  ctx.fill();
  legs(ctx, p, 1);
  ctx.fillStyle = p.body;
  oval(ctx, 0, 6, 15, 11, 0);
  strokeOval(ctx, 0, 6, 15, 11, 0);
  ctx.fillStyle = p.body;
  oval(ctx, -2, -10, 12, 10, 0);
  strokeOval(ctx, -2, -10, 12, 10, 0);
  ctx.fillStyle = p.light;
  oval(ctx, -4, -6, 6, 5, 0);
  ctx.strokeStyle = p.light;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-16, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(6, 1); ctx.stroke();
  ctx.fillStyle = p.dark;
  ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(-9, -24); ctx.lineTo(-1, -16); ctx.fill();
  ctx.beginPath(); ctx.moveTo(4, -16); ctx.lineTo(8, -22); ctx.lineTo(7, -14); ctx.fill();
  face(ctx, p, pose.blink, -11);
  ctx.fillStyle = p.ink;
  oval(ctx, -4, -5, 1.6, 1.2, 0);
}

function drawCat(ctx: CanvasRenderingContext2D, p: C, pose: Pose) {
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.moveTo(8, 4);
  ctx.quadraticCurveTo(20, 2 + pose.tail, 16 + pose.tail * 0.3, 18);
  ctx.quadraticCurveTo(10, 10, 6, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.body;
  oval(ctx, 0, 8, 12, 10, 0);
  strokeOval(ctx, 0, 8, 12, 10, 0);
  ctx.fillStyle = p.light;
  oval(ctx, 0, 10, 7, 6, 0);
  ctx.fillStyle = p.body;
  oval(ctx, 0, -10, 10, 9, 0);
  strokeOval(ctx, 0, -10, 10, 9, 0);
  ctx.fillStyle = p.body;
  ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(-9, -26); ctx.lineTo(-1, -17); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -16); ctx.lineTo(9, -26); ctx.lineTo(1, -17); ctx.fill(); ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.beginPath(); ctx.moveTo(-5, -17); ctx.lineTo(-7, -23); ctx.lineTo(-2, -17); ctx.fill();
  ctx.fillStyle = p.light;
  oval(ctx, 0, -6, 5, 3.5, 0);
  face(ctx, p, pose.blink, -11);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-16, -4); ctx.moveTo(-10, -5); ctx.lineTo(-16, -6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(16, -4); ctx.moveTo(10, -5); ctx.lineTo(16, -6); ctx.stroke();
}

function drawToad(ctx: CanvasRenderingContext2D, p: C, pose: Pose) {
  ctx.fillStyle = p.dark;
  oval(ctx, -10, 18, 6, 3.2, 0);
  oval(ctx, 10, 18, 6, 3.2, 0);
  ctx.fillStyle = p.body;
  oval(ctx, 0, 8, 16, 12, 0);
  strokeOval(ctx, 0, 8, 16, 12, 0);
  ctx.fillStyle = p.light;
  oval(ctx, 0, 12, 9, 6, 0);
  ctx.fillStyle = p.accent;
  oval(ctx, -8, 4, 3, 2.4, 0);
  oval(ctx, 8, 6, 2.6, 2, 0);
  oval(ctx, 0, 2, 2.2, 1.8, 0);
  ctx.fillStyle = p.body;
  oval(ctx, 0, -8, 12, 9, 0);
  strokeOval(ctx, 0, -8, 12, 9, 0);
  ctx.fillStyle = p.dark;
  oval(ctx, -7, -14, 5, 4, 0);
  oval(ctx, 7, -14, 5, 4, 0);
  ctx.fillStyle = p.accent;
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(3, -12); ctx.lineTo(-3, -12); ctx.fill();
  face(ctx, p, pose.blink, -8);
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(0, -2, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawLynx(ctx: CanvasRenderingContext2D, p: C, pose: Pose) {
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.moveTo(8, 2);
  ctx.quadraticCurveTo(22 + pose.tail, -2, 18 + pose.tail, 12);
  ctx.quadraticCurveTo(12, 6, 6, 6);
  ctx.fill();
  ctx.stroke();
  legs(ctx, p, 0);
  ctx.fillStyle = p.body;
  oval(ctx, 0, 6, 12, 10, 0);
  strokeOval(ctx, 0, 6, 12, 10, 0);
  ctx.fillStyle = p.light;
  oval(ctx, 0, 8, 6, 5, 0);
  ctx.fillStyle = p.body;
  oval(ctx, 0, -12, 10, 9, 0);
  strokeOval(ctx, 0, -12, 10, 9, 0);
  ctx.fillStyle = p.body;
  ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(-8, -28); ctx.lineTo(-1, -18); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -18); ctx.lineTo(8, -28); ctx.lineTo(1, -18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.fillRect(-8, -29, 2, 4);
  ctx.fillRect(6, -29, 2, 4);
  ctx.fillStyle = p.dark;
  oval(ctx, -8, 2, 3, 2.4, 0);
  oval(ctx, 8, 4, 3, 2.4, 0);
  face(ctx, p, pose.blink, -13);
}

function drawRose(ctx: CanvasRenderingContext2D, p: C, pose: Pose) {
  const w = pose.wing;
  ctx.fillStyle = p.light;
  ctx.beginPath();
  ctx.ellipse(-13, -2 - w * 0.2, 10, 7, -0.5, 0, Math.PI * 2);
  ctx.ellipse(13, -2 - w * 0.2, 10, 7, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.body;
  oval(ctx, 0, 6, 11, 12, 0);
  strokeOval(ctx, 0, 6, 11, 12, 0);
  ctx.fillStyle = p.dark;
  oval(ctx, -5, 2, 4, 4, 0);
  oval(ctx, 5, 4, 4, 4, 0);
  oval(ctx, 0, 8, 5, 4, 0);
  ctx.fillStyle = p.body;
  oval(ctx, 0, -12, 9, 8, 0);
  strokeOval(ctx, 0, -12, 9, 8, 0);
  ctx.fillStyle = p.accent;
  ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(4, -14); ctx.lineTo(-4, -14); ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.light;
  oval(ctx, 0, -10, 5, 3.5, 0);
  face(ctx, p, pose.blink, -13);
  ctx.fillStyle = p.dark;
  oval(ctx, 0, 20, 2, 6, 0);
}

function paintFrame(ctx: CanvasRenderingContext2D, sprite: MythSprite, seed: number, frame: number, ox: number) {
  const p = PAL[sprite];
  ctx.save();
  ctx.translate(ox, 0);
  const bg = ctx.createLinearGradient(0, 0, 0, PX);
  bg.addColorStop(0, p.bg);
  bg.addColorStop(1, "#070b10");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, PX, PX);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  for (let i = 0; i < 10; i++) {
    const x = ((seed >> (i % 16)) * (37 + i) + i * 53 + frame * 3) % PX;
    const y = ((seed >> ((i + 3) % 16)) * (19 + i) + i * 29) % 36;
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  oval(ctx, 32, 54, 16, 4, 0);
  drawCreature(ctx, sprite, seed, frame);
  ctx.restore();
}

function sheetOf(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite }) {
  if (typeof document === "undefined") return "";
  const seed = seedOf(n);
  const sprite = nftSpriteOf(n);
  const canvas = document.createElement("canvas");
  canvas.width = PX * FRAMES;
  canvas.height = PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;
  for (let f = 0; f < FRAMES; f++) paintFrame(ctx, sprite, seed, f, f * PX);
  return canvas.toDataURL("image/png");
}

const sheetCache = new Map<string, string>();

export function nftSheet(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite }) {
  const key = String(n.breedSig || n.id || n.species || n.name || "pawly") + "|" + nftSpriteOf(n);
  const hit = sheetCache.get(key);
  if (hit) return hit;
  const url = sheetOf(n);
  if (url) sheetCache.set(key, url);
  return url;
}

export function nftPortrait(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite; kind?: string }) {
  if (typeof document === "undefined") return "";
  const seed = seedOf(n);
  const sprite = nftSpriteOf(n);
  const canvas = document.createElement("canvas");
  canvas.width = PX;
  canvas.height = PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;
  paintFrame(ctx, sprite, seed, 0, 0);
  return canvas.toDataURL("image/png");
}

let cssReady = false;
export function ensureIdleCss() {
  if (cssReady || typeof document === "undefined") return;
  cssReady = true;
  const el = document.createElement("style");
  el.id = "pawly-nft-idle";
  el.textContent = "@keyframes pawlyNftIdle{from{background-position:0 0}to{background-position:-800% 0}}";
  document.head.appendChild(el);
}
