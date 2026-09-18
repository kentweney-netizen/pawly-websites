/** Lv1+ body sprites. Adopt + Rescue both map to /pets/*.png. */
const SPRITE: Record<string, string> = {
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
  "stray-cat": "cat",
  "stray-dog": "dog",
  straycat: "cat",
  straydog: "dog",
  orangutan: "orangutan",
  sunbear: "sunbear",
  "sun-bear": "sunbear",
  "malayan-tiger": "malayan-tiger",
  tiger: "malayan-tiger",
  seaturtle: "seaturtle",
  "sea-turtle": "seaturtle",
  hornbill: "hornbill",
  "asian-elephant": "asian-elephant",
  elephant: "asian-elephant",
  pangolin: "pangolin",
  gibbon: "gibbon",
};

export function spriteKey(species: string): string | null {
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  return SPRITE[raw] || null;
}

export function spriteFor(species: string): string | null {
  const key = spriteKey(species);
  if (!key) return null;
  return "/pets/" + key + ".png";
}

export function spriteCandidates(species: string): string[] {
  const key = spriteKey(species);
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  const out: string[] = [];
  const add = (p: string) => { if (p && out.indexOf(p) < 0) out.push(p); };
  if (key) {
    add("/pets/" + key + ".png");
    add("/dapp/pets/" + key + ".png");
  }
  if (raw && raw !== key) {
    add("/pets/" + raw + ".png");
    add("/dapp/pets/" + raw + ".png");
  }
  return out;
}
