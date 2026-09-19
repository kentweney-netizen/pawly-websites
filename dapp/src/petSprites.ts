/** Lv1+ body sprites. Street walkers are side-view quadrupeds. NFT cards stay in stall. */
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

const MYTH_FALLBACK: Record<string, string> = {
  fox: "dog",
  toad: "minipig",
  rose: "minipig",
  cat: "cat",
  boar: "minipig",
  wyrm: "dog",
  moth: "cat",
  lynx: "cat",
};

export function mythKey(species: string): string | null {
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  const name = String(species || "").trim();
  for (const k of MYTH_KIND) {
    if (raw === k) return k;
    if (raw === "sacred-" + k || raw === "weird-" + k || raw === "myth-" + k) return k;
    if (name === MYTH_NAME[k] || raw === String(MYTH_NAME[k]).toLowerCase()) return k;
  }
  return null;
}

export function spriteKey(species: string): string | null {
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  const myth = mythKey(raw) || mythKey(String(species || ""));
  if (myth) return myth;
  return SPRITE[raw] || null;
}

export function spriteFor(species: string): string | null {
  const c = spriteCandidates(species);
  return c[0] || null;
}

export function spriteCandidates(species: string): string[] {
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  const myth = mythKey(raw) || mythKey(String(species || ""));
  const out: string[] = [];
  const add = (p: string) => { if (p && out.indexOf(p) < 0) out.push(p); };
  if (myth) {
    add("/dapp/pets/walk-" + myth + ".jpg?v=1");
    add("/pets/walk-" + myth + ".jpg?v=1");
    add("/dapp/game/walk-" + myth + ".jpg?v=1");
    const fb = MYTH_FALLBACK[myth];
    if (fb) {
      add("/pets/" + fb + ".png");
      add("/dapp/pets/" + fb + ".png");
    }
    return out;
  }
  const key = SPRITE[raw];
  if (key) {
    add("/pets/" + key + ".png");
    add("/dapp/pets/" + key + ".png");
  }
  return out;
}

export function isMythWalk(species: string) {
  return !!(mythKey(species) || mythKey(String(species || "").toLowerCase()));
}
