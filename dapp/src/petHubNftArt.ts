/** Seed-drawn full-body myth portraits. No external JPG. Species picked from breedSig. */
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

const PAL: Record<MythSprite, { bg: string; body: string; light: string; dark: string; accent: string; ink: string }> = {
  fox:  { bg: "#1a3348", body: "#f0a020", light: "#ffe9a8", dark: "#c45e08", accent: "#ff6b2d", ink: "#1a1208" },
  moth: { bg: "#2a1844", body: "#d4a0f0", light: "#f3e2ff", dark: "#7a3aad", accent: "#67e8f9", ink: "#1a0828" },
  wyrm: { bg: "#083040", body: "#2ad4e8", light: "#b8f4ff", dark: "#0e7480", accent: "#fde047", ink: "#041820" },
  boar: { bg: "#3a1c14", body: "#d07058", light: "#f0c8b0", dark: "#8a3028", accent: "#f0c040", ink: "#1c0a08" },
  cat:  { bg: "#1c1a40", body: "#90b8f0", light: "#e0e8ff", dark: "#3a58a8", accent: "#c4b5fd", ink: "#0c0a20" },
  toad: { bg: "#143420", body: "#48c060", light: "#c8f0b0", dark: "#1a7030", accent: "#f0d020", ink: "#082010" },
  lynx: { bg: "#143848", body: "#70d8e8", light: "#e0ffff", dark: "#1a6880", accent: "#a5b4fc", ink: "#081820" },
  rose: { bg: "#401028", body: "#e85878", light: "#ffd0dc", dark: "#9a2048", accent: "#f0e080", ink: "#200810" },
};

function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function paint(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite }) {
  if (typeof document === "undefined") return "";
  const seed = seedOf(n);
  const sprite = nftSpriteOf(n);
  const p = PAL[sprite];
  const canvas = document.createElement("canvas");
  canvas.width = 280;
  canvas.height = 280;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const g = ctx.createLinearGradient(0, 0, 0, 280);
  g.addColorStop(0, p.bg);
  g.addColorStop(1, "#070b10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 280, 280);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = 0; i < 12; i++) oval(ctx, (seed + i * 47) % 280, (seed * 3 + i * 31) % 120, 1.2, 1.2);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  oval(ctx, 140, 250, 48, 10);

  const wing = sprite === "moth" || sprite === "rose" || sprite === "wyrm";
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (wing) {
    ctx.fillStyle = p.light;
    ctx.beginPath();
    ctx.ellipse(88, 128, 42, 28, -0.5, 0, Math.PI * 2);
    ctx.ellipse(192, 128, 42, 28, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.ellipse(96, 168, 26, 16, -0.2, 0, Math.PI * 2);
    ctx.ellipse(184, 168, 26, 16, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(112, 188); ctx.lineTo(100, 236); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(168, 188); ctx.lineTo(180, 236); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(128, 190); ctx.lineTo(118, 240); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(152, 190); ctx.lineTo(162, 240); ctx.stroke();
    ctx.fillStyle = p.dark;
    oval(ctx, 98, 242, 10, 5);
    oval(ctx, 182, 242, 10, 5);
    oval(ctx, 116, 244, 10, 5);
    oval(ctx, 164, 244, 10, 5);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(188, 150);
    ctx.quadraticCurveTo(240, 120 + (seed % 20), 228, 190);
    ctx.stroke();
    ctx.fillStyle = p.accent;
    oval(ctx, 228, 190, 10, 8);
  }

  ctx.fillStyle = p.body;
  oval(ctx, 140, 168, 46, 38);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(140, 168, 46, 38, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = p.light;
  oval(ctx, 140, 178, 22, 16);

  if (!wing) {
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(104, 150); ctx.lineTo(84, 186); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(176, 150); ctx.lineTo(196, 186); ctx.stroke();
  }

  ctx.fillStyle = p.body;
  oval(ctx, 140, 96, 38, 34);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(140, 96, 38, 34, 0, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = p.body;
  if (sprite === "moth") {
    ctx.beginPath(); ctx.moveTo(128, 70); ctx.quadraticCurveTo(108, 40, 100, 52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(152, 70); ctx.quadraticCurveTo(172, 40, 180, 52); ctx.stroke();
    ctx.fillStyle = p.accent;
    oval(ctx, 100, 50, 5, 5); oval(ctx, 180, 50, 5, 5);
  } else if (sprite === "rose") {
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.moveTo(140, 48); ctx.lineTo(156, 78); ctx.lineTo(124, 78); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(118, 74); ctx.lineTo(104, 42); ctx.lineTo(136, 70); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(162, 74); ctx.lineTo(176, 42); ctx.lineTo(144, 70); ctx.fill(); ctx.stroke();
    ctx.fillStyle = p.light;
    ctx.beginPath(); ctx.moveTo(120, 72); ctx.lineTo(112, 50); ctx.lineTo(132, 70); ctx.fill();
    ctx.beginPath(); ctx.moveTo(160, 72); ctx.lineTo(168, 50); ctx.lineTo(148, 70); ctx.fill();
  }

  ctx.fillStyle = p.light;
  oval(ctx, 140, 108, 18, 12);
  ctx.fillStyle = "#fff";
  oval(ctx, 126, 92, 8, 9);
  oval(ctx, 154, 92, 8, 9);
  ctx.fillStyle = p.ink;
  oval(ctx, 128, 94, 4, 5);
  oval(ctx, 156, 94, 4, 5);
  ctx.fillStyle = "#fff";
  oval(ctx, 125, 90, 2, 2);
  oval(ctx, 153, 90, 2, 2);
  ctx.fillStyle = p.ink;
  oval(ctx, 140, 112, 4, 3);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 248, 280, 32);
  ctx.fillStyle = "#00ff9d";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(MYTH_NAME[sprite], 140, 270);
  return canvas.toDataURL("image/jpeg", 0.86);
}

export function mythArt(_sprite: MythSprite) { return ""; }
export function nftSheet(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite }) { return paint(n); }
export function nftPortrait(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite; kind?: string }) { return paint(n); }

export function nftIdleKind(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite }) {
  const s = nftSpriteOf(n);
  return (s === "moth" || s === "rose" || s === "wyrm") ? "wing" : "bob";
}

let cssReady = false;
export function ensureIdleCss() {
  if (cssReady || typeof document === "undefined") return;
  cssReady = true;
  const el = document.createElement("style");
  el.id = "pawly-nft-idle";
  el.textContent = [
    "@keyframes pawlyNftBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}",
    "@keyframes pawlyNftWing{0%,100%{transform:translateY(0) scaleX(1)}50%{transform:translateY(-4px) scaleX(1.05)}}",
  ].join("");
  document.head.appendChild(el);
}
