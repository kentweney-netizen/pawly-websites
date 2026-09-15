import React from "react";

export type PetRigPet = {
  species: string;
  level: number;
  emoji?: string;
  name?: string;
};

type Build = "quad" | "bird" | "long" | "bug";

const SPEC: Record<string, { face: string; skin: string; dark: string; belly: string; build: Build }> = {
  dog: { face: "🐶", skin: "#d4a574", dark: "#8a5a32", belly: "#f0d2b0", build: "quad" },
  cat: { face: "🐱", skin: "#f0b429", dark: "#c47a12", belly: "#ffe7a8", build: "quad" },
  rabbit: { face: "🐰", skin: "#f3d7c4", dark: "#c9a08a", belly: "#fff4ea", build: "quad" },
  hamster: { face: "🐹", skin: "#e0a060", dark: "#b06a30", belly: "#f6d7b0", build: "quad" },
  parrot: { face: "🦜", skin: "#3ecf5a", dark: "#e23d3d", belly: "#ffe14a", build: "bird" },
  chicken: { face: "🐔", skin: "#f4f0e8", dark: "#e24b2e", belly: "#fff", build: "bird" },
  duck: { face: "🦆", skin: "#f6d84a", dark: "#e08912", belly: "#fff3b0", build: "bird" },
  minipig: { face: "🐷", skin: "#f4b2a8", dark: "#d47a74", belly: "#ffd4ce", build: "quad" },
  pig: { face: "🐷", skin: "#f4b2a8", dark: "#d47a74", belly: "#ffd4ce", build: "quad" },
  alpaca: { face: "🦙", skin: "#efe6d6", dark: "#c8b496", belly: "#fffaf0", build: "quad" },
  lizard: { face: "🦎", skin: "#7ed957", dark: "#2f7a32", belly: "#c8f2a8", build: "long" },
  gecko: { face: "🦎", skin: "#7ed957", dark: "#1f6b3a", belly: "#c8f2a8", build: "long" },
  snake: { face: "🐍", skin: "#5aa85a", dark: "#2d5c2d", belly: "#b7e0a0", build: "long" },
  beetle: { face: "🪲", skin: "#3a4a2a", dark: "#1c2414", belly: "#6a7a4a", build: "bug" },
  tarantula: { face: "🕷", skin: "#4a3020", dark: "#1c120c", belly: "#6a4a30", build: "bug" },
  mantis: { face: "🦗", skin: "#8fd14f", dark: "#3d7a20", belly: "#c8f08a", build: "bug" },
  "stray-cat": { face: "🐱", skin: "#c9c4b8", dark: "#7a7568", belly: "#ece8e0", build: "quad" },
  "stray-dog": { face: "🐶", skin: "#c9b08a", dark: "#6b5333", belly: "#eadcc4", build: "quad" },
  orangutan: { face: "🦧", skin: "#c86a2a", dark: "#7a3a12", belly: "#e09858", build: "quad" },
  sunbear: { face: "🐻", skin: "#5a3a22", dark: "#2a180c", belly: "#c9a06a", build: "quad" },
  "malayan-tiger": { face: "🐯", skin: "#e0892a", dark: "#3a220c", belly: "#ffe0a8", build: "quad" },
  seaturtle: { face: "🐢", skin: "#3d8a4a", dark: "#1f4a28", belly: "#c8e08a", build: "long" },
  hornbill: { face: "🦅", skin: "#3a3a3a", dark: "#e08912", belly: "#f0d090", build: "bird" },
  "asian-elephant": { face: "🐘", skin: "#9aa0a8", dark: "#5a6068", belly: "#c8ccd0", build: "quad" },
  pangolin: { face: "🦔", skin: "#b08a58", dark: "#6a4a28", belly: "#e0c898", build: "quad" },
  gibbon: { face: "🐒", skin: "#c49a5a", dark: "#6a4a28", belly: "#ead2a0", build: "quad" },
};

function normSpecies(species: string) {
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  if (raw === "pig" || raw === "mini-pig" || raw === "minipig") return "minipig";
  if (raw === "sun-bear") return "sunbear";
  if (raw === "sea-turtle") return "seaturtle";
  return raw;
}

function specOf(species: string, emoji?: string) {
  const key = normSpecies(species);
  return SPEC[key] || { face: emoji || "🐾", skin: "#e8c4a8", dark: "#8a5a3a", belly: "#fff0e0", build: "quad" as Build };
}

function Legs(props: { skin: string; moving: boolean; bird?: boolean }) {
  const cls = props.moving ? "pawly-leg-step" : "";
  if (props.bird) {
    return (
      <g className={cls}>
        <rect className="pawly-leg-a" x="38" y="62" width="3.5" height="16" rx="1.6" fill={props.skin} />
        <rect className="pawly-leg-b" x="48" y="62" width="3.5" height="16" rx="1.6" fill={props.skin} />
      </g>
    );
  }
  return (
    <g className={cls}>
      <rect className="pawly-leg-a" x="30" y="60" width="5" height="18" rx="2.4" fill={props.skin} />
      <rect className="pawly-leg-b" x="40" y="62" width="5" height="18" rx="2.4" fill={props.skin} />
      <rect className="pawly-leg-b" x="52" y="60" width="5" height="18" rx="2.4" fill={props.skin} />
      <rect className="pawly-leg-a" x="62" y="62" width="5" height="18" rx="2.4" fill={props.skin} />
    </g>
  );
}

export function PetRig(props: { pet: PetRigPet; size?: number; moving?: boolean }) {
  const lv = Math.max(0, Number(props.pet.level || 0));
  const s = specOf(props.pet.species, props.pet.emoji);
  const size = props.size || 88;
  const moving = !!props.moving && lv >= 1;
  const showBody = lv >= 1;
  const showLegs = lv >= 2;
  const showTail = lv >= 1;
  return (
    <div className={moving ? "pawly-rig pawly-rig-live" : "pawly-rig"} style={{ width: size, height: Math.round(size * 0.86) }}>
      <svg viewBox="0 0 100 90" width="100%" height="100%" overflow="visible">
        <ellipse cx="50" cy="84" rx={showBody ? 22 : 12} ry="3.2" fill="rgba(0,0,0,0.28)" />
        {showTail && s.build === "quad" ? (
          <path className="pawly-tail" d="M78 48 C94 44 98 56 90 64 C84 70 76 60 74 52" fill={s.dark} />
        ) : null}
        {showTail && s.build === "long" ? (
          <path className="pawly-tail" d="M70 52 C92 56 98 70 84 78 C70 84 58 70 62 58" fill={s.skin} stroke={s.dark} strokeWidth="2" />
        ) : null}
        {showTail && s.build === "bird" ? (
          <path d="M72 46 C88 40 92 54 78 56 Z" fill={s.dark} />
        ) : null}
        {showLegs ? <Legs skin={s.dark} moving={moving} bird={s.build === "bird"} /> : null}
        {showLegs && s.build === "bug" ? (
          <g>
            <line x1="28" y1="52" x2="12" y2="44" stroke={s.dark} strokeWidth="3" />
            <line x1="28" y1="58" x2="10" y2="64" stroke={s.dark} strokeWidth="3" />
            <line x1="72" y1="52" x2="88" y2="44" stroke={s.dark} strokeWidth="3" />
            <line x1="72" y1="58" x2="90" y2="64" stroke={s.dark} strokeWidth="3" />
          </g>
        ) : null}
        {showBody ? (
          <g>
            <ellipse cx="52" cy="52" rx={s.build === "long" ? 28 : 22} ry={s.build === "long" ? 11 : 14} fill={s.skin} stroke={s.dark} strokeWidth="2" />
            <ellipse cx="50" cy="56" rx="12" ry="7" fill={s.belly} opacity="0.85" />
          </g>
        ) : null}
        <g className="pawly-head" style={{ transformOrigin: "28px 34px" }}>
          <circle cx="28" cy="34" r={showBody ? 14 : 18} fill={s.skin} stroke={s.dark} strokeWidth="2" />
          <text x="28" y={showBody ? 40 : 42} textAnchor="middle" fontSize={showBody ? 16 : 22}>
            {s.face}
          </text>
        </g>
      </svg>
    </div>
  );
}

export const PET_RIG_CSS = `
.pawly-rig { display: inline-block; line-height: 0; }
.pawly-head { animation: pawly-bob 0.7s ease-in-out infinite; }
.pawly-tail { transform-box: fill-box; transform-origin: left center; animation: pawly-wag 0.34s ease-in-out infinite alternate; }
.pawly-leg-step .pawly-leg-a { transform-box: fill-box; transform-origin: top center; animation: pawly-stride 0.36s ease-in-out infinite; }
.pawly-leg-step .pawly-leg-b { transform-box: fill-box; transform-origin: top center; animation: pawly-stride 0.36s ease-in-out infinite reverse; }
.pawly-stroll { position: absolute; pointer-events: none; will-change: left; }
.pawly-stroll-0 { bottom: 10%; animation: pawly-patrol 10s linear infinite; }
.pawly-stroll-1 { bottom: 16%; animation: pawly-patrol 13s linear infinite reverse; animation-delay: -4s; }
.pawly-stroll-2 { bottom: 7%; animation: pawly-patrol 8.5s linear infinite; animation-delay: -2s; }
.pawly-stroll-3 { bottom: 20%; animation: pawly-patrol 12s linear infinite reverse; animation-delay: -6s; }
.pawly-bubble { background: #fff; color: #102018; font-size: 11px; font-weight: 800; border-radius: 10px; padding: 4px 8px; margin-bottom: 4px; width: max-content; }
@keyframes pawly-bob { from { transform: translateY(0); } to { transform: translateY(-3px); } }
@keyframes pawly-wag { from { transform: rotate(-16deg); } to { transform: rotate(14deg); } }
@keyframes pawly-stride { from { transform: rotate(22deg); } to { transform: rotate(-22deg); } }
@keyframes pawly-patrol {
  0% { left: -18%; transform: scaleX(1); }
  49% { left: 78%; transform: scaleX(1); }
  50% { left: 78%; transform: scaleX(-1); }
  99% { left: -18%; transform: scaleX(-1); }
  100% { left: -18%; transform: scaleX(1); }
}
`;
