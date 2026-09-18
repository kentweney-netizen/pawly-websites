/** Pocket-monster style species art. Original PAWLY creatures, not real animals. */
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

export function nftSpriteName(n: { id?: string; name?: string; species?: string; breedSig?: string }) {
  return MYTH_NAME[spriteOf(seedOf(n))];
}

const PALETTE: Record<MythSprite, { bg: string; body: string; accent: string; eye: string; mark: string }> = {
  fox:  { bg: "#14324a", body: "#f0b429", accent: "#fff3c4", eye: "#1b3a4a", mark: "#ffe566" },
  moth: { bg: "#2a1848", body: "#c084fc", accent: "#f5d0fe", eye: "#3b0764", mark: "#67e8f9" },
  wyrm: { bg: "#083344", body: "#22d3ee", accent: "#a5f3fc", eye: "#164e63", mark: "#fde047" },
  boar: { bg: "#3f1d12", body: "#fb7185", accent: "#fecdd3", eye: "#7f1d1d", mark: "#fdba74" },
  cat:  { bg: "#1e1b4b", body: "#93c5fd", accent: "#e0e7ff", eye: "#1e3a8a", mark: "#c4b5fd" },
  toad: { bg: "#14532d", body: "#4ade80", accent: "#bbf7d0", eye: "#14532d", mark: "#facc15" },
  lynx: { bg: "#164e63", body: "#67e8f9", accent: "#ecfeff", eye: "#155e75", mark: "#a5b4fc" },
  rose: { bg: "#4a044e", body: "#fb7185", accent: "#fecdd3", eye: "#831843", mark: "#f9a8d4" },
};

export function nftPortrait(n: { id?: string; name?: string; species?: string; breedSig?: string; kind?: string }) {
  const seed = seedOf(n);
  const sprite = spriteOf(seed);
  const pal = PALETTE[sprite];
  const canvas = document.createElement("canvas");
  canvas.width = 420;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const g = ctx.createRadialGradient(210, 180, 20, 210, 210, 240);
  g.addColorStop(0, pal.accent);
  g.addColorStop(1, pal.bg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 420, 420);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 18; i++) {
    const x = ((seed >> (i % 16)) * (37 + i) + i * 53) % 420;
    const y = ((seed >> ((i + 3) % 16)) * (19 + i) + i * 29) % 420;
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(210, 230);
  if (sprite === "moth" || sprite === "fox" || sprite === "rose") {
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.ellipse(-118, -10, 78, 52, -0.5, 0, Math.PI * 2);
    ctx.ellipse(118, -10, 78, 52, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (sprite === "wyrm") {
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(-20, 70);
    ctx.quadraticCurveTo(-160, 40, -90, -80);
    ctx.quadraticCurveTo(-20, 10, 10, 40);
    ctx.fill();
  }
  ctx.fillStyle = pal.body;
  ctx.beginPath();
  ctx.ellipse(0, 18, 108, 122, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.accent;
  ctx.beginPath();
  ctx.ellipse(0, 48, 70, 62, 0, 0, Math.PI * 2);
  ctx.fill();
  if (sprite === "fox" || sprite === "cat" || sprite === "lynx" || sprite === "boar") {
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.moveTo(-78, -70); ctx.lineTo(-118, -158); ctx.lineTo(-28, -92);
    ctx.moveTo(78, -70); ctx.lineTo(118, -158); ctx.lineTo(28, -92);
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(-72, -78); ctx.lineTo(-100, -138); ctx.lineTo(-40, -90);
    ctx.moveTo(72, -78); ctx.lineTo(100, -138); ctx.lineTo(40, -90);
    ctx.fill();
  }
  if (sprite === "toad") {
    ctx.fillStyle = pal.mark;
    ctx.beginPath();
    ctx.arc(-70, -40, 28, 0, Math.PI * 2);
    ctx.arc(70, -40, 28, 0, Math.PI * 2);
    ctx.fill();
  }
  if (sprite === "rose" || sprite === "boar") {
    ctx.fillStyle = pal.mark;
    ctx.beginPath();
    ctx.moveTo(0, -150); ctx.lineTo(16, -88); ctx.lineTo(-16, -88);
    ctx.fill();
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.ellipse(-38, -18, 22, 26, 0, 0, Math.PI * 2); ctx.ellipse(38, -18, 22, 26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = pal.eye;
  ctx.beginPath(); ctx.arc(-36, -14, 10, 0, Math.PI * 2); ctx.arc(36, -14, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-30, -20, 4, 0, Math.PI * 2); ctx.arc(42, -20, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = pal.eye;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 18, 18, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = pal.mark;
  ctx.beginPath();
  ctx.arc(0, -48, 8, 0, Math.PI * 2);
  ctx.fill();
  if (seed % 2 === 0) {
    ctx.strokeStyle = pal.mark;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, -118, 46, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "rgba(7,11,16,0.55)";
  ctx.fillRect(0, 348, 420, 72);
  ctx.fillStyle = "#00ff9d";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(MYTH_NAME[sprite], 210, 392);
  return canvas.toDataURL("image/jpeg", 0.84);
}
