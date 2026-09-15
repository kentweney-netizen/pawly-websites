/** Adopt shop only. Rescue / shelter species return null and keep emoji. */
import { PIXEL_PART as A } from "./pixelSpritesA";
import { PIXEL_PART as B } from "./pixelSpritesB";
import { PIXEL_PART as C } from "./pixelSpritesC";

const PIXEL_SPRITES: Record<string, string> = { ...A, ...B, ...C };

const ADOPT: Record<string, string> = {
  dog: "dog",
  cat: "cat",
  rabbit: "rabbit",
  hamster: "hamster",
  parrot: "parrot",
  chicken: "chicken",
  duck: "duck",
  minipig: "minipig",
  pig: "minipig",
  "mini-pig": "minipig",
  alpaca: "alpaca",
  lizard: "lizard",
  snake: "snake",
  gecko: "gecko",
  beetle: "beetle",
  tarantula: "tarantula",
  mantis: "mantis",
};

function keyOf(species: string): string | null {
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  return ADOPT[raw] || null;
}

/** Street overlay: side-view pixel sprite fused onto pet-hub-street.mp4. */
export function pixelFor(species: string): string | null {
  const key = keyOf(species);
  if (!key) return null;
  return PIXEL_SPRITES[key] || null;
}

/** Lv0 shop card: circular 3D face avatar */
export function headFor(species: string): string | null {
  const key = keyOf(species);
  if (!key) return null;
  return "/pets/heads/" + key + ".png";
}

/** Lv1+ shop / profile: looping 3D full-body clip */
export function grownMp4For(species: string): string | null {
  const key = keyOf(species);
  if (!key) return null;
  return "/pets/grown/" + key + ".mp4";
}

/** @deprecated */
export function spriteFor(species: string): string | null {
  return pixelFor(species) || headFor(species);
}
