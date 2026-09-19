/** Lv1+ body sprites. Adopt + Rescue both map to /pets/*.png. Myth NFTs use /dapp/myth. */
import { MYTH_IMG } from "./petHubMythImg";
import { MYTH_KIND, MYTH_NAME } from "./petHubMythSprites";

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

function mythKey(species: string): keyof typeof MYTH_IMG | null {
  const raw = String(species || "").trim().toLowerCase();
  for (const k of MYTH_KIND) {
    if (raw === k || raw.endsWith("-" + k) || raw.indexOf(k) >= 0) return k;
    if (raw === String(MYTH_NAME[k]).toLowerCase()) return k;
  }
  return null;
}

export function spriteKey(species: string): string | null {
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  const myth = mythKey(raw);
  if (myth) return myth;
  return SPRITE[raw] || null;
}

export function spriteFor(species: string): string | null {
  const myth = mythKey(species);
  if (myth) return MYTH_IMG[myth];
  const key = spriteKey(species);
  if (!key) return null;
  return "/pets/" + key + ".png";
}

export function spriteCandidates(species: string): string[] {
  const myth = mythKey(species);
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  const out: string[] = [];
  const add = (p: string) => { if (p && out.indexOf(p) < 0) out.push(p); };
  if (myth) add(MYTH_IMG[myth]);
  const key = SPRITE[raw];
  if (key) {
    add("/pets/" + key + ".png");
    add("/dapp/pets/" + key + ".png");
  }
  return out;
}
