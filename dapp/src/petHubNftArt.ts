/** Full-body myth portraits (standing creatures). Files live at /myth/*.jpg */
import { MYTH_KIND, MYTH_NAME } from "./petHubMythSprites";
import type { MythSprite } from "./petHubMythSprites";

export type MythKind = "sacred" | "weird";
export type MythSpec = { name: string; species: string; kind: MythKind; seed: number; sprite: MythSprite };

export const MYTH_IMG: Record<MythSprite, string> = {
  fox: "/myth/fox.jpg",
  moth: "/myth/moth.jpg",
  wyrm: "/myth/wyrm.jpg",
  boar: "/myth/boar.jpg",
  cat: "/myth/cat.jpg",
  toad: "/myth/toad.jpg",
  lynx: "/myth/lynx.jpg",
  rose: "/myth/rose.jpg",
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function spriteOf(seed: number): MythSprite {
  return MYTH_KIND[seed % MYTH_KIND.length];
}

export function mythicFrom(a: string, b: string, sig: string): MythSpec {
  const seed = hash((sig || "pawly") + "|" + String(a || "") + "|" + String(b || ""));
  const sprite = spriteOf(seed);
  const kind: MythKind = seed % 2 === 0 ? "sacred" : "weird";
  return { name: MYTH_NAME[sprite], species: kind + "-" + sprite, kind, seed, sprite };
}

function seedOf(n: { id?: string; name?: string; species?: string; breedSig?: string }) {
  return hash(String(n.breedSig || n.id || n.species || n.name || "pawly"));
}

export function nftSpriteOf(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite }): MythSprite {
  if (n.sprite && MYTH_KIND.indexOf(n.sprite) >= 0) return n.sprite;
  const species = String(n.species || "");
  for (const k of MYTH_KIND) {
    if (species === k || species.endsWith("-" + k) || species.indexOf(k) >= 0) return k;
  }
  const name = String(n.name || "");
  for (const k of MYTH_KIND) {
    if (name === MYTH_NAME[k] || name.toLowerCase().indexOf(k) >= 0) return k;
  }
  return spriteOf(seedOf(n));
}

export function nftSpriteName(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite }) {
  return MYTH_NAME[nftSpriteOf(n)];
}

export function mythArt(sprite: MythSprite) {
  return MYTH_IMG[sprite] || "";
}

export function nftPortrait(n: { id?: string; name?: string; species?: string; breedSig?: string; sprite?: MythSprite; kind?: string }) {
  return mythArt(nftSpriteOf(n));
}
