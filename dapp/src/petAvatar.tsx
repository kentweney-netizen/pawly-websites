import React from "react";

export type PetRigPet = {
  species: string;
  level: number;
  emoji?: string;
};

type Build = "quad" | "bird" | "long" | "bug";

const SPEC: Record<string, { face: string; skin: string; dark: string; build: Build }> = {
  dog: { face: "🐶", skin: "#d4a574", dark: "#8a5a32", build: "quad" },
  cat: { face: "🐱", skin: "#f4b942", dark: "#c47a12", build: "quad" },
  rabbit: { face: "🐰", skin: "#f3d7c4", dark: "#c9a08a", build: "quad" },
  hamster: { face: "🐹", skin: "#e0a060", dark: "#b06a30", build: "quad" },
  parrot: { face: "🦜", skin: "#3ecf5a", dark: "#e23d3d", build: "bird" },
  chicken: { face: "🐔", skin: "#f2f2f2", dark: "#e24b2e", build: "bird" },
  duck: { face: "🦆", skin: "#f6d84a", dark: "#e08912", build: "bird" },
  minipig: { face: "🐷", skin: "#f3b6b0", dark: "#d47a74", build: "quad" },
  alpaca: { face: "🦙", skin: "#efe6d6", dark: "#c8b496", build: "quad" },
  lizard: { face: "🦎", skin: "#7ed957", dark: "#2f7a32", build: "long" },
  gecko: { face: "🦎", skin: "#7ed957", dark: "#1f6b3a", build: "long" },
  snake: { face: "🐍", skin: "#5aa85a", dark: "#2d5c2d", build: "long" },
  beetle: { face: "🪲", skin: "#3a4a2a", dark: "#1c2414", build: "bug" },
  tarantula: { face: "🕷", skin: "#4a3020", dark: "#1c120c", build: "bug" },
  mantis: { face: "🦗", skin: "#8fd14f", dark: "#3d7a20", build: "bug" },
  "stray-cat": { face: "🐱", skin: "#c9c4b8", dark: "#7a7568", build: "quad" },
  "stray-dog": { face: "🐶", skin: "#c9b08a", dark: "#6b5333", build: "quad" },
};

function specOf(species: string, emoji?: string) {
  const key = String(species || "").replace(/^stray-(cat|dog)$/, "stray-$1");
  return SPEC[species] || SPEC[key] || { face: emoji || "🐾", skin: "#c8ffe8", dark: "#00ff9d", build: "quad" as Build };
}

export function PetRig(props: { pet: PetRigPet; size?: number }) {
  const lv = Math.max(0, Number(props.pet.level || 0));
  const size = props.size || 96;
  const s = specOf(props.pet.species, props.pet.emoji);
  const grown = lv >= 1;
  const tall = 1 + Math.min(lv, 4) * 0.08;
  return (
    <div style={{ width: size, height: size * (grown ? 1.28 : 1.05) * tall, display: "inline-block" }}>
      <svg viewBox="0 0 80 100" width="100%" height="100%" className="pawly-rig-spin" style={{ overflow: "visible" }}>
        <ellipse cx="40" cy={grown ? 92 : 78} rx={grown ? 16 : 10} ry="3.5" fill="rgba(0,0,0,0.28)" />
        {lv >= 1 && s.build === "long" ? (
          <path className="pawly-tail" d={lv >= 2 ? "M28 58 C10 64 8 78 18 86 C28 92 48 86 62 78 C72 72 70 62 58 60" : "M46 58 C62 60 70 68 64 76 C58 82 44 74 42 66"} fill={s.skin} stroke={s.dark} strokeWidth="2" />
        ) : null}
        {lv >= 1 && s.build !== "long" ? (
          <path className="pawly-tail" d="M52 58 C68 54 74 62 70 72 C66 78 56 70 52 64" fill={s.dark} />
        ) : null}
        {lv >= 2 && s.build === "quad" ? (
          <>
            <rect x="26" y="68" width="6" height="16" rx="3" fill={s.dark} />
            <rect x="36" y="70" width="6" height="16" rx="3" fill={s.dark} />
            <rect x="46" y="68" width="6" height="16" rx="3" fill={s.dark} />
            <rect x="54" y="70" width="6" height="16" rx="3" fill={s.dark} />
          </>
        ) : null}
        {lv >= 2 && s.build === "bird" ? (
          <>
            <path d="M22 52 C8 46 6 62 22 60" fill={s.dark} />
            <path d="M58 52 C74 46 74 62 58 60" fill={s.dark} />
            <rect x="34" y="70" width="5" height="14" rx="2" fill={s.dark} />
            <rect x="44" y="70" width="5" height="14" rx="2" fill={s.dark} />
          </>
        ) : null}
        {lv >= 2 && s.build === "long" ? (
          <>
            <rect x="24" y="74" width="5" height="10" rx="2" fill={s.dark} />
            <rect x="34" y="76" width="5" height="10" rx="2" fill={s.dark} />
            <rect x="46" y="76" width="5" height="10" rx="2" fill={s.dark} />
            <rect x="56" y="74" width="5" height="10" rx="2" fill={s.dark} />
          </>
        ) : null}
        {lv >= 2 && s.build === "bug" ? (
          <>
            <line x1="22" y1="62" x2="8" y2="52" stroke={s.dark} strokeWidth="3" />
            <line x1="22" y1="68" x2="8" y2="72" stroke={s.dark} strokeWidth="3" />
            <line x1="58" y1="62" x2="72" y2="52" stroke={s.dark} strokeWidth="3" />
            <line x1="58" y1="68" x2="72" y2="72" stroke={s.dark} strokeWidth="3" />
            <line x1="30" y1="76" x2="24" y2="88" stroke={s.dark} strokeWidth="3" />
            <line x1="50" y1="76" x2="56" y2="88" stroke={s.dark} strokeWidth="3" />
          </>
        ) : null}
        {lv >= 1 ? (
          <ellipse cx="40" cy={s.build === "long" ? 62 : 60} rx={s.build === "long" ? 22 : 16} ry={s.build === "long" ? 10 : 14} fill={s.skin} stroke={s.dark} strokeWidth="2" />
        ) : null}
        {lv >= 3 ? (
          <ellipse cx="40" cy="66" rx="18" ry="8" fill={s.dark} opacity="0.25" />
        ) : null}
        <g className="pawly-head" style={{ transformOrigin: "40px 36px" }}>
          <circle cx="40" cy="36" r={lv >= 1 ? 16 : 20} fill={s.skin} stroke={s.dark} strokeWidth="2" />
          <text x="40" y="44" textAnchor="middle" fontSize={lv >= 1 ? 22 : 28}>
            {s.face}
          </text>
        </g>
      </svg>
    </div>
  );
}

export const PET_RIG_CSS = `
.pawly-rig-spin { animation: pawly-turn 3.4s ease-in-out infinite alternate; }
.pawly-head { animation: pawly-bob 0.7s ease-in-out infinite alternate; }
.pawly-tail { animation: pawly-wag 0.32s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: left center; }
@keyframes pawly-turn { from { transform: rotateY(-16deg); } to { transform: rotateY(16deg); } }
@keyframes pawly-bob { from { transform: translateY(0); } to { transform: translateY(-3px); } }
@keyframes pawly-wag { from { transform: rotate(-12deg); } to { transform: rotate(14deg); } }
`;
