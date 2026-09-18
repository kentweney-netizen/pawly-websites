/** Pocket-monster style species art. Original PAWLY creatures, not real animals. */
import { MYTH_KIND, MYTH_NAME, MYTH_IMG } from "./petHubMythSprites";
import type { MythSprite } from "./petHubMythSprites";

export type MythKind = "sacred" | "weird";
export type MythSpec = { name: string; species: string; kind: MythKind; seed: number; sprite: MythSprite };

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
  const name = MYTH_NAME[sprite];
  const kind: MythKind = seed % 2 === 0 ? "sacred" : "weird";
  return { name, species: kind + "-" + sprite, kind, seed, sprite };
}

export function nftPortrait(n: { id?: string; name?: string; species?: string; breedSig?: string; kind?: string }) {
  const seed = hash(String(n.breedSig || n.id || n.name || "pawly"));
  return MYTH_IMG[spriteOf(seed)];
}

export function nftSpriteName(n: { id?: string; name?: string; breedSig?: string }) {
  const seed = hash(String(n.breedSig || n.id || n.name || "pawly"));
  return MYTH_NAME[spriteOf(seed)];
}
