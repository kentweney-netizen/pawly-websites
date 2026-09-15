import React from "react";

export type PetRigPet = {
  species: string;
  level: number;
  emoji?: string;
  name?: string;
};

const FACE: Record<string, string> = {
  dog: "🐶",
  cat: "🐱",
  rabbit: "🐰",
  hamster: "🐹",
  parrot: "🦜",
  chicken: "🐔",
  duck: "🦆",
  minipig: "🐷",
  pig: "🐷",
  alpaca: "🦙",
  lizard: "🦎",
  gecko: "🦎",
  snake: "🐍",
  beetle: "🪲",
  tarantula: "🕷",
  mantis: "🦗",
  "stray-cat": "🐱",
  "stray-dog": "🐶",
  orangutan: "🦧",
  sunbear: "🐻",
  "malayan-tiger": "🐯",
  seaturtle: "🐢",
  hornbill: "🦅",
  "asian-elephant": "🐘",
  pangolin: "🦔",
  gibbon: "🐒",
};

function normSpecies(species: string) {
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  if (raw === "pig" || raw === "mini-pig" || raw === "minipig") return "minipig";
  if (raw === "sun-bear") return "sunbear";
  if (raw === "sea-turtle") return "seaturtle";
  return raw;
}

function faceOf(species: string, emoji?: string) {
  const key = normSpecies(species);
  return FACE[key] || emoji || "🐾";
}

function sizeFor(level: number, base: number) {
  const lv = Math.max(0, Number(level || 0));
  if (lv <= 0) return Math.round(base * 0.72);
  if (lv === 1) return Math.round(base * 1.05);
  return Math.round(base * (1.18 + Math.min(lv - 2, 3) * 0.08));
}

export function PetRig(props: { pet: PetRigPet; size?: number; moving?: boolean }) {
  const lv = Math.max(0, Number(props.pet.level || 0));
  const face = faceOf(props.pet.species, props.pet.emoji);
  const px = sizeFor(lv, props.size || 88);
  const cls = props.moving
    ? lv >= 2
      ? "pawly-body pawly-run"
      : "pawly-body pawly-hop"
    : "pawly-body pawly-idle";
  return (
    <div className={cls} style={{ width: px + 8, textAlign: "center", lineHeight: 1 }}>
      <div className="pawly-critter" style={{ fontSize: px, filter: lv >= 1 ? "none" : "saturate(0.92)" }}>
        {face}
      </div>
      <div className="pawly-ground" />
    </div>
  );
}

export const PET_RIG_CSS = `
.pawly-critter { display: inline-block; transform-origin: 50% 90%; }
.pawly-idle .pawly-critter { animation: pawly-breath 1.6s ease-in-out infinite; }
.pawly-hop .pawly-critter { animation: pawly-bounce 0.55s ease-in-out infinite; }
.pawly-run .pawly-critter { animation: pawly-gallop 0.38s ease-in-out infinite; }
.pawly-ground { height: 6px; margin: -4px auto 0; width: 56%; border-radius: 50%; background: rgba(0,0,0,0.28); }
.pawly-stroll { position: absolute; bottom: 10%; will-change: transform; pointer-events: none; }
.pawly-stroll-0 { animation: pawly-cross 9s linear infinite; bottom: 12%; }
.pawly-stroll-1 { animation: pawly-cross 11s linear infinite reverse; bottom: 18%; animation-delay: -3s; }
.pawly-stroll-2 { animation: pawly-cross 8s linear infinite; bottom: 8%; animation-delay: -5s; }
.pawly-stroll-3 { animation: pawly-cross 12s linear infinite reverse; bottom: 22%; animation-delay: -2s; }
.pawly-bubble { background: #fff; color: #102018; font-size: 11px; font-weight: 800; border-radius: 10px; padding: 4px 8px; margin-bottom: 4px; width: max-content; }
@keyframes pawly-breath { from { transform: translateY(0) scale(1); } to { transform: translateY(-3px) scale(1.03); } }
@keyframes pawly-bounce { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-14px) rotate(6deg); } }
@keyframes pawly-gallop { 0%,100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-10px) rotate(8deg); } }
@keyframes pawly-cross {
  0% { transform: translateX(-30%) scaleX(1); }
  48% { transform: translateX(108%) scaleX(1); }
  50% { transform: translateX(108%) scaleX(-1); }
  98% { transform: translateX(-30%) scaleX(-1); }
  100% { transform: translateX(-30%) scaleX(1); }
}
`;
