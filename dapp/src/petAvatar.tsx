import React, { useState } from "react";
import { spriteCandidates } from "./petSprites";

export type PetRigPet = {
  species: string;
  level: number;
  emoji?: string;
  name?: string;
};

function normSpecies(species: string) {
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  if (raw === "pig" || raw === "mini-pig" || raw === "minipig") return "minipig";
  if (raw === "sun-bear") return "sunbear";
  if (raw === "sea-turtle") return "seaturtle";
  if (raw === "straycat") return "stray-cat";
  if (raw === "straydog") return "stray-dog";
  return raw;
}

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

function FaceBadge(props: { face: string; size: number }) {
  return (
    <div
      className="pawly-rig"
      style={{
        width: props.size,
        height: props.size,
        borderRadius: "50%",
        background: "transparent",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(props.size * 0.78),
        lineHeight: 1,
        overflow: "visible",
      }}
    >
      {props.face}
    </div>
  );
}

export function PetRig(props: { pet: PetRigPet; size?: number; moving?: boolean }) {
  const lv = Math.max(0, Number(props.pet.level || 0));
  const key = normSpecies(props.pet.species);
  const cands = spriteCandidates(props.pet.species);
  const size = props.size || 36;
  const moving = !!props.moving;
  const face = props.pet.emoji || FACE[key] || "🐾";
  const [idx, setIdx] = useState(0);
  const src = cands[idx] || "";
  if (lv <= 0 || !src) {
    return <FaceBadge face={face} size={lv <= 0 ? Math.min(size, 36) : size} />;
  }
  return (
    <div
      className={moving ? "pawly-rig pawly-bob" : "pawly-rig"}
      style={{
        width: size,
        height: Math.round(size * 1.15),
        overflow: "visible",
        display: "inline-block",
        background: "transparent",
      }}
    >
      <img
        alt={props.pet.name || key}
        src={src}
        draggable={false}
        onError={() => setIdx((n) => n + 1)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center bottom",
          imageRendering: "auto",
        }}
      />
    </div>
  );
}

export const PET_RIG_CSS = `
.pawly-rig { display: inline-block; line-height: 1; vertical-align: bottom; background: transparent; }
.pawly-bob img { animation: pawly-step 0.36s ease-in-out infinite; transform-origin: center bottom; }
.pawly-stroll { position: absolute; pointer-events: auto; z-index: 4; background: transparent; border: none; padding: 0; cursor: pointer; }
.pawly-stroll-0 { bottom: 13%; animation: pawly-patrol 11s linear infinite; }
.pawly-stroll-1 { bottom: 20%; animation: pawly-patrol 14s linear infinite reverse; animation-delay: -4s; }
.pawly-stroll-2 { bottom: 11%; animation: pawly-patrol 9s linear infinite; animation-delay: -2s; }
.pawly-stroll-3 { bottom: 24%; animation: pawly-patrol 13s linear infinite reverse; animation-delay: -6s; }
.pawly-stroll-4 { bottom: 16%; animation: pawly-patrol 12s linear infinite; animation-delay: -8s; }
.pawly-stroll-5 { bottom: 22%; animation: pawly-patrol 15s linear infinite reverse; animation-delay: -3s; }
.pawly-stroll-6 { bottom: 10%; animation: pawly-patrol 10s linear infinite; animation-delay: -5s; }
.pawly-stroll-7 { bottom: 18%; animation: pawly-patrol 16s linear infinite reverse; animation-delay: -7s; }
.pawly-stroll-8 { bottom: 15%; animation: pawly-patrol 12.5s linear infinite; animation-delay: -1s; }
.pawly-stroll-9 { bottom: 21%; animation: pawly-patrol 13.5s linear infinite reverse; animation-delay: -9s; }
@keyframes pawly-step {
  0% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-3px) rotate(-3deg); }
  50% { transform: translateY(0) rotate(0deg); }
  75% { transform: translateY(-3px) rotate(3deg); }
  100% { transform: translateY(0) rotate(0deg); }
}
@keyframes pawly-patrol {
  0% { left: -18%; transform: scaleX(1); }
  49% { left: 72%; transform: scaleX(1); }
  50% { left: 72%; transform: scaleX(-1); }
  99% { left: -18%; transform: scaleX(-1); }
  100% { left: -18%; transform: scaleX(1); }
}
`;
