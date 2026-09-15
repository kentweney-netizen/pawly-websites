import React from "react";
import { grownMp4For, headFor, pixelFor } from "./petSprites";

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
  dog: "\ud83d\udc36",
  cat: "\ud83d\udc31",
  rabbit: "\ud83d\udc30",
  hamster: "\ud83d\udc39",
  parrot: "\ud83e\udd9c",
  chicken: "\ud83d\udc14",
  duck: "\ud83e\udd86",
  minipig: "\ud83d\udc37",
  pig: "\ud83d\udc37",
  alpaca: "\ud83e\udd99",
  lizard: "\ud83e\udd8e",
  gecko: "\ud83e\udd8e",
  snake: "\ud83d\udc0d",
  beetle: "\ud83e\udeb2",
  tarantula: "\ud83d\udd77",
  mantis: "\ud83e\udd97",
  "stray-cat": "\ud83d\udc31",
  "stray-dog": "\ud83d\udc36",
  orangutan: "\ud83e\udda7",
  sunbear: "\ud83d\udc3b",
  "malayan-tiger": "\ud83d\udc2f",
  seaturtle: "\ud83d\udc22",
  hornbill: "\ud83e\udd85",
  "asian-elephant": "\ud83d\udc18",
  pangolin: "\ud83e\udd94",
  gibbon: "\ud83d\udc12",
};

export function PetRig(props: { pet: PetRigPet; size?: number; moving?: boolean }) {
  const lv = Math.max(0, Number(props.pet.level || 0));
  const key = normSpecies(props.pet.species);
  const grown = lv >= 1 ? grownMp4For(props.pet.species) : null;
  const head = headFor(props.pet.species);
  const pixel = pixelFor(props.pet.species);
  const size = props.size || 88;
  const moving = !!props.moving;
  const face = FACE[key] || props.pet.emoji || "\ud83d\udc3e";

  // Street plane: same pixel language as pet-hub-street.mp4
  if (moving && pixel) {
    const h = lv <= 0 ? Math.round(size * 0.7) : Math.round(size * 0.86);
    const w = Math.round(h * 1.55);
    return (
      <div className="pawly-rig pawly-street-pet" style={{ width: w, height: h }}>
        <img
          alt={props.pet.name || key}
          src={pixel}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center bottom" }}
        />
      </div>
    );
  }

  if (grown) {
    return (
      <div className={moving ? "pawly-rig pawly-bob" : "pawly-rig"} style={{ width: size, height: Math.round(size * 0.72) }}>
        <video
          src={grown}
          autoPlay
          muted
          loop
          playsInline
          poster={head || undefined}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10, background: "transparent" }}
        />
      </div>
    );
  }

  if (head) {
    const box = Math.round(size * 0.92);
    return (
      <div
        className={moving ? "pawly-rig pawly-bob pawly-head" : "pawly-rig pawly-head"}
        style={{ width: box, height: box, borderRadius: "50%", overflow: "hidden", display: "inline-block" }}
      >
        <img alt={props.pet.name || key} src={head} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 28%" }} />
      </div>
    );
  }

  return (
    <div className={moving ? "pawly-rig pawly-bob" : "pawly-rig"} style={{ fontSize: size * 0.72, lineHeight: 1, textAlign: "center" }}>
      {face}
    </div>
  );
}

export const PET_RIG_CSS = `
.pawly-rig { display: inline-block; line-height: 0; vertical-align: bottom; }
.pawly-street-pet img { filter: drop-shadow(0 3px 0 rgba(8,6,16,0.55)); }
.pawly-bob img, .pawly-bob video, .pawly-bob { animation: pawly-step 0.32s ease-in-out infinite; }
.pawly-stroll { position: absolute; pointer-events: none; z-index: 4; }
.pawly-stroll-0 { bottom: 16%; animation: pawly-patrol 13s linear infinite; }
.pawly-stroll-1 { bottom: 12%; animation: pawly-patrol 16s linear infinite reverse; animation-delay: -4s; }
.pawly-stroll-2 { bottom: 19%; animation: pawly-patrol 11s linear infinite; animation-delay: -2s; }
.pawly-stroll-3 { bottom: 10%; animation: pawly-patrol 15s linear infinite reverse; animation-delay: -7s; }
.pawly-bubble { background: #fff; color: #102018; font-size: 11px; font-weight: 800; border-radius: 10px; padding: 4px 8px; margin-bottom: 4px; width: max-content; }
@keyframes pawly-step {
  0% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0); }
}
@keyframes pawly-patrol {
  0% { left: -18%; transform: scaleX(1); }
  49% { left: 78%; transform: scaleX(1); }
  50% { left: 78%; transform: scaleX(-1); }
  99% { left: -18%; transform: scaleX(-1); }
  100% { left: -18%; transform: scaleX(1); }
}
`;
