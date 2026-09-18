/** Random myth portraits drawn at mint. No public catalog. */
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

const PALETTE: Record<MythSprite, { bg: string; body: string; accent: string; eye: string; mark: string; limb: string }> = {
  fox:  { bg: "#14324a", body: "#f0b429", accent: "#fff3c4", eye: "#1b3a4a", mark: "#ffe566", limb: "#d97706" },
  moth: { bg: "#2a1848", body: "#c084fc", accent: "#f5d0fe", eye: "#3b0764", mark: "#67e8f9", limb: "#7c3aed" },
  wyrm: { bg: "#083344", body: "#22d3ee", accent: "#a5f3fc", eye: "#164e63", mark: "#fde047", limb: "#0e7490" },
  boar: { bg: "#3f1d12", body: "#fb7185", accent: "#fecdd3", eye: "#7f1d1d", mark: "#fdba74", limb: "#be123c" },
  cat:  { bg: "#1e1b4b", body: "#93c5fd", accent: "#e0e7ff", eye: "#1e3a8a", mark: "#c4b5fd", limb: "#2563eb" },
  toad: { bg: "#14532d", body: "#4ade80", accent: "#bbf7d0", eye: "#14532d", mark: "#facc15", limb: "#15803d" },
  lynx: { bg: "#164e63", body: "#67e8f9", accent: "#ecfeff", eye: "#155e75", mark: "#a5b4fc", limb: "#0e7490" },
  rose: { bg: "#4a044e", body: "#fb7185", accent: "#fecdd3", eye: "#831843", mark: "#f9a8d4", limb: "#9d174d" },
};

function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

export function mythArt(_sprite: MythSprite) {
  return "";
}

export function nftPortrait(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite; kind?: string }) {
  if (typeof document === "undefined") return "";
  const seed = seedOf(n);
  const sprite = nftSpriteOf(n);
  const pal = PALETTE[sprite];
  const canvas = document.createElement("canvas");
  canvas.width = 280;
  canvas.height = 280;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const g = ctx.createLinearGradient(0, 0, 0, 280);
  g.addColorStop(0, pal.bg);
  g.addColorStop(1, "#070b10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 280, 280);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 14; i++) {
    const x = ((seed >> (i % 16)) * (37 + i) + i * 53) % 280;
    const y = ((seed >> ((i + 3) % 16)) * (19 + i) + i * 29) % 180;
    ctx.beginPath();
    ctx.arc(x, y, 1.4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(140, 168);
  ctx.fillStyle = pal.limb;
  oval(ctx, -28, 62, 12, 28, 0.18);
  oval(ctx, 28, 62, 12, 28, -0.18);
  oval(ctx, -26, 88, 16, 8, 0.1);
  oval(ctx, 26, 88, 16, 8, -0.1);
  ctx.fillStyle = pal.mark;
  ctx.beginPath();
  ctx.moveTo(42, 18);
  ctx.quadraticCurveTo(96, 8 + (seed % 20), 78, 62);
  ctx.quadraticCurveTo(58, 28, 36, 30);
  ctx.fill();
  ctx.fillStyle = pal.body;
  oval(ctx, 0, 22, 46, 58, 0);
  ctx.fillStyle = pal.accent;
  oval(ctx, 0, 34, 28, 30, 0);
  ctx.fillStyle = pal.limb;
  oval(ctx, -52, 8, 12, 26, -0.7);
  oval(ctx, 52, 8, 12, 26, 0.7);
  if (sprite === "moth" || sprite === "fox" || sprite === "rose") {
    ctx.fillStyle = pal.accent;
    oval(ctx, -62, -8, 36, 22, -0.45);
    oval(ctx, 62, -8, 36, 22, 0.45);
  }
  if (sprite === "wyrm") {
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(-8, 40);
    ctx.quadraticCurveTo(-90, 10, -40, -70);
    ctx.quadraticCurveTo(-6, -10, 8, 20);
    ctx.fill();
  }
  ctx.fillStyle = pal.body;
  oval(ctx, 0, -38, 40, 38, 0);
  if (sprite === "fox" || sprite === "cat" || sprite === "lynx" || sprite === "boar") {
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.moveTo(-22, -58); ctx.lineTo(-34, -96); ctx.lineTo(-6, -66);
    ctx.moveTo(22, -58); ctx.lineTo(34, -96); ctx.lineTo(6, -66);
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(-20, -60); ctx.lineTo(-28, -86); ctx.lineTo(-10, -64);
    ctx.moveTo(20, -60); ctx.lineTo(28, -86); ctx.lineTo(10, -64);
    ctx.fill();
  }
  if (sprite === "toad") {
    ctx.fillStyle = pal.mark;
    ctx.beginPath(); ctx.arc(-22, -48, 10, 0, Math.PI * 2); ctx.arc(22, -48, 10, 0, Math.PI * 2); ctx.fill();
  }
  if (sprite === "rose" || sprite === "boar") {
    ctx.fillStyle = pal.mark;
    ctx.beginPath(); ctx.moveTo(0, -92); ctx.lineTo(8, -62); ctx.lineTo(-8, -62); ctx.fill();
  }
  ctx.fillStyle = "#fff";
  oval(ctx, -14, -40, 8, 10, 0);
  oval(ctx, 14, -40, 8, 10, 0);
  ctx.fillStyle = pal.eye;
  ctx.beginPath(); ctx.arc(-13, -39, 4, 0, Math.PI * 2); ctx.arc(13, -39, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = pal.eye;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, -28, 7, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  if (seed % 2 === 0) {
    ctx.strokeStyle = pal.mark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -70, 18, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "rgba(7,11,16,0.62)";
  ctx.fillRect(0, 236, 280, 44);
  ctx.fillStyle = "#00ff9d";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(MYTH_NAME[sprite], 140, 264);
  return canvas.toDataURL("image/jpeg", 0.82);
}
