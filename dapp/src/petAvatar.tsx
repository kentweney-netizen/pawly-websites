import React from "react";

export type PetRigPet = {
  species: string;
  level: number;
  emoji?: string;
};

const PAL: Record<string, { skin: string; dark: string; ear: string }> = {
  dog: { skin: "#d4a574", dark: "#8a5a32", ear: "#6b3f1f" },
  cat: { skin: "#f4b942", dark: "#c47a12", ear: "#ffd27a" },
  rabbit: { skin: "#f3d7c4", dark: "#c9a08a", ear: "#f7c0c8" },
  hamster: { skin: "#e0a060", dark: "#b06a30", ear: "#f0c090" },
  parrot: { skin: "#3ecf5a", dark: "#e23d3d", ear: "#ffd84a" },
  chicken: { skin: "#f2f2f2", dark: "#e24b2e", ear: "#ffd84a" },
  duck: { skin: "#f6d84a", dark: "#e08912", ear: "#f6d84a" },
  minipig: { skin: "#f3b6b0", dark: "#d47a74", ear: "#f3b6b0" },
  alpaca: { skin: "#efe6d6", dark: "#c8b496", ear: "#efe6d6" },
  lizard: { skin: "#7ed957", dark: "#2f7a32", ear: "#7ed957" },
  gecko: { skin: "#7ed957", dark: "#1f6b3a", ear: "#c8ff7a" },
  snake: { skin: "#5aa85a", dark: "#2d5c2d", ear: "#5aa85a" },
  beetle: { skin: "#3a4a2a", dark: "#1c2414", ear: "#7ed957" },
  tarantula: { skin: "#4a3020", dark: "#1c120c", ear: "#4a3020" },
  mantis: { skin: "#8fd14f", dark: "#3d7a20", ear: "#8fd14f" },
};

function palOf(species: string) {
  const key = String(species || "").replace(/^stray-/, "");
  return PAL[key] || PAL[species] || { skin: "#c8ffe8", dark: "#00ff9d", ear: "#9f8" };
}

export function PetRig(props: { pet: PetRigPet; size?: number }) {
  const lv = Math.max(0, Number(props.pet.level || 0));
  const size = props.size || 72;
  const pal = palOf(props.pet.species);
  const scale = 0.78 + Math.min(lv, 6) * 0.12;
  const showTail = lv >= 1;
  const showLegs = lv >= 2;
  const showBody = lv >= 1;
  const adult = lv >= 3;
  return (
    <div
      className="pawly-rig"
      style={{
        width: size,
        height: size * 1.15,
        perspective: 420,
        display: "inline-block",
      }}
    >
      <div
        className="pawly-rig-spin"
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: "scale(" + scale + ") rotateX(8deg)",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", left: "18%", right: "18%", bottom: 2, height: 8, background: "rgba(0,0,0,0.35)", borderRadius: "50%", filter: "blur(2px)" }} />
        {showTail ? (
          <div
            className="pawly-tail"
            style={{
              position: "absolute",
              right: adult ? 4 : 10,
              bottom: showLegs ? 22 : 16,
              width: adult ? 22 : 14,
              height: adult ? 8 : 6,
              background: pal.dark,
              borderRadius: 8,
              transformOrigin: "left center",
            }}
          />
        ) : null}
        {showBody ? (
          <div
            style={{
              position: "absolute",
              left: "28%",
              width: "44%",
              height: adult ? "36%" : "28%",
              bottom: showLegs ? "22%" : "16%",
              background: pal.skin,
              borderRadius: 14,
              boxShadow: "inset -6px -4px 0 " + pal.dark,
            }}
          />
        ) : null}
        {showLegs ? (
          <>
            <div style={{ position: "absolute", left: "32%", bottom: 8, width: 7, height: adult ? 16 : 12, background: pal.dark, borderRadius: 4 }} />
            <div style={{ position: "absolute", right: "32%", bottom: 8, width: 7, height: adult ? 16 : 12, background: pal.dark, borderRadius: 4 }} />
          </>
        ) : null}
        <div
          className="pawly-head"
          style={{
            position: "absolute",
            left: "22%",
            width: "56%",
            height: "56%",
            top: showBody ? "2%" : "18%",
            background: pal.skin,
            borderRadius: "46% 46% 42% 42%",
            boxShadow: "inset -8px -6px 0 " + pal.dark,
          }}
        >
          <div style={{ position: "absolute", left: 6, top: -4, width: 10, height: 14, background: pal.ear, borderRadius: "40% 40% 20% 20%" }} />
          <div style={{ position: "absolute", right: 6, top: -4, width: 10, height: 14, background: pal.ear, borderRadius: "40% 40% 20% 20%" }} />
          <div style={{ position: "absolute", left: "28%", top: "42%", width: 6, height: 6, background: "#111", borderRadius: "50%" }} />
          <div style={{ position: "absolute", right: "28%", top: "42%", width: 6, height: 6, background: "#111", borderRadius: "50%" }} />
          <div style={{ position: "absolute", left: "42%", top: "62%", width: 10, height: 6, background: pal.dark, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

export const PET_RIG_CSS = `
.pawly-rig-spin { animation: pawly-turn 3.6s ease-in-out infinite alternate; }
.pawly-head { animation: pawly-bob 0.7s ease-in-out infinite alternate; }
.pawly-tail { animation: pawly-wag 0.35s ease-in-out infinite alternate; }
@keyframes pawly-turn { from { transform: scale(var(--s,1)) rotateY(-18deg) rotateX(8deg); } to { transform: scale(var(--s,1)) rotateY(18deg) rotateX(8deg); } }
@keyframes pawly-bob { from { transform: translateY(0); } to { transform: translateY(-5px); } }
@keyframes pawly-wag { from { transform: rotate(-18deg); } to { transform: rotate(22deg); } }
`;
