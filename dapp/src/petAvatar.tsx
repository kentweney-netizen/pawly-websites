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

  // Street actor: only a side-view pixel sprite. Never video (iOS tile garbage).
  if (moving) {
    if (lv < 1 || !pixel) return null;
    const h = Math.round(size * 0.78);
    const w = Math.round(h * 1.35);
    return (
      <div className="pawly-rig pawly-street-pet" style={{ width: w, height: h }}>
        <img
          alt={props.pet.name || key}
          src={pixel}
          draggable={false}
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

  if (grown) {
    return (
      <div className="pawly-rig" style={{ width: size, height: Math.round(size * 0.72) }}>
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
      <div className="pawly-rig pawly-head" style={{ width: box, height: box, borderRadius: "50%", overflow: "hidden", display: "inline-block" }}>
        <img alt={props.pet.name || key} src={head} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 28%" }} />
      </div>
    );
  }

  return (
    <div className="pawly-rig" style={{ fontSize: size * 0.72, lineHeight: 1, textAlign: "center" }}>
      {face}
    </div>
  );
}

export const PET_RIG_CSS = `
.pawly-rig { display: inline-block; line-height: 0; vertical-align: bottom; }
.pawly-street-pet img { filter: drop-shadow(0 2px 0 rgba(8,6,16,0.45)); image-rendering: pixelated; }
.pawly-stroll { position: absolute; pointer-events: none; z-index: 4; }
.pawly-stroll-0 { bottom: 14%; animation: pawly-patrol 14s linear infinite; }
.pawly-stroll-1 { bottom: 11%; animation: pawly-patrol 18s linear infinite reverse; animation-delay: -5s; }
.pawly-stroll-2 { bottom: 17%; animation: pawly-patrol 12s linear infinite; animation-delay: -3s; }
.pawly-stroll-3 { bottom: 10%; animation: pawly-patrol 16s linear infinite reverse; animation-delay: -8s; }
@keyframes pawly-patrol {
  0% { left: 8%; transform: scaleX(1); }
  49% { left: 72%; transform: scaleX(1); }
  50% { left: 72%; transform: scaleX(-1); }
  99% { left: 8%; transform: scaleX(-1); }
  100% { left: 8%; transform: scaleX(1); }
}
`;
