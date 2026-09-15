import React, { useState } from "react";
import { spriteFor } from "./petSprites";

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
  const src = spriteFor(props.pet.species);
  const size = props.size || 36;
  const moving = !!props.moving;
  const face = props.pet.emoji || FACE[key] || "🐾";
  const [broken, setBroken] = useState(false);
  if (lv <= 0 || !src || broken) {
    return <FaceBadge face={face} size={lv <= 0 ? Math.min(size, 36) : size} />;
  }
  return (
    <div
      className={moving ? "pawly-rig pawly-bob" : "pawly-rig"}
      style={{
        width: size,
        height: Math.round(size * 1.12),
        overflow: "visible",
        display: "inline-block",
        background: "transparent",
      }}
    >
      <img
        alt={props.pet.name || key}
        src={src}
        draggable={false}
        onError={() => setBroken(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center bottom",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}

export const PET_RIG_CSS = `
.pawly-rig { display: inline-block; line-height: 1; vertical-align: bottom; background: transparent; }
.pawly-bob img, .pawly-bob { animation: pawly-step 0.28s steps(2) infinite; }
.pawly-stroll { position: absolute; pointer-events: auto; z-index: 4; background: transparent; border: none; padding: 0; cursor: pointer; }
.pawly-stroll-0 { bottom: 14%; animation: pawly-patrol 11s linear infinite; }
.pawly-stroll-1 { bottom: 20%; animation: pawly-patrol 14s linear infinite reverse; animation-delay: -4s; }
.pawly-stroll-2 { bottom: 11%; animation: pawly-patrol 9s linear infinite; animation-delay: -2s; }
.pawly-stroll-3 { bottom: 24%; animation: pawly-patrol 13s linear infinite reverse; animation-delay: -6s; }
@keyframes pawly-step {
  0% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
  100% { transform: translateY(0); }
}
@keyframes pawly-patrol {
  0% { left: -16%; transform: scaleX(1); }
  49% { left: 74%; transform: scaleX(1); }
  50% { left: 74%; transform: scaleX(-1); }
  99% { left: -16%; transform: scaleX(-1); }
  100% { left: -16%; transform: scaleX(1); }
}
`;
