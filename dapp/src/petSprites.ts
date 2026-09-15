/** Adopt shop only. Rescue / shelter species return null and keep emoji. */
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

/** Lv0: circular 3D face avatar */
export function headFor(species: string): string | null {
  const key = keyOf(species);
  if (!key) return null;
  return "/pets/heads/" + key + ".png";
}

/** Lv1+: looping 3D full-body clip */
export function grownMp4For(species: string): string | null {
  const key = keyOf(species);
  if (!key) return null;
  return "/pets/grown/" + key + ".mp4";
}

/** @deprecated side-view PNG crop — kept so old calls do not crash */
export function spriteFor(species: string): string | null {
  return headFor(species);
}
