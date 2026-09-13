import React from "react";

export type PetRigPet = {
  species: string;
  level: number;
  emoji?: string;
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
  alpaca: "🦙",
  lizard: "🦎",
  gecko: "🦎",
  snake: "🐍",
  beetle: "🪲",
  tarantula: "🕷",
  mantis: "🦗",
  "stray-cat": "🐱",
  "stray-dog": "🐶",
};

export function PetRig(props: { pet: PetRigPet; size?: number }) {
  const lv = Math.max(0, Number(props.pet.level || 0));
  const size = props.size || 88;
  const face = FACE[props.pet.species] || props.pet.emoji || "🐾";
  const scale = 0.92 + Math.min(lv, 6) * 0.1;
  return (
    <div style={{ width: size, height: size + 18, display: "inline-block", perspective: 520 }}>
      <div
        className="pawly-rig-spin"
        style={{
          width: size,
          height: size,
          transformStyle: "preserve-3d",
          transform: "scale(" + scale + ")",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", left: "16%", right: "16%", bottom: 0, height: 10, background: "rgba(0,0,0,0.35)", borderRadius: "50%", filter: "blur(2px)" }} />
        <div className="pawly-head" style={{ fontSize: size * 0.62, lineHeight: 1, textAlign: "center", position: "relative", zIndex: 2 }}>
          {face}
        </div>
        {lv >= 1 ? <div className="pawly-tail" style={{ position: "absolute", right: 2, bottom: 18, fontSize: 18 }}>~</div> : null}
        {lv >= 2 ? <div style={{ position: "absolute", left: "28%", right: "28%", bottom: 6, textAlign: "center", fontSize: 11, letterSpacing: 2 }}>║ ║</div> : null}
      </div>
    </div>
  );
}

export const PET_RIG_CSS = `
.pawly-rig-spin { animation: pawly-turn 3.2s ease-in-out infinite alternate; }
.pawly-head { animation: pawly-bob 0.65s ease-in-out infinite alternate; display:inline-block; }
.pawly-tail { animation: pawly-wag 0.28s ease-in-out infinite alternate; color:#c8ffe8; font-weight:800; }
@keyframes pawly-turn { from { transform: rotateY(-22deg) rotateX(6deg); } to { transform: rotateY(22deg) rotateX(6deg); } }
@keyframes pawly-bob { from { transform: translateY(0); } to { transform: translateY(-8px); } }
@keyframes pawly-wag { from { transform: rotate(-24deg); } to { transform: rotate(24deg); } }
`;
