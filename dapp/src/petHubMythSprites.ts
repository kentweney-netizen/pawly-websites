import { PACK as A } from "./petHubMythA";
import { PACK as B } from "./petHubMythB";
export const MYTH_KIND = ["fox","moth","wyrm","boar","cat","toad","lynx","rose"] as const;
export type MythSprite = typeof MYTH_KIND[number];
export const MYTH_NAME: Record<MythSprite, string> = {
  fox: "LumenFox", moth: "HexMoth", wyrm: "AetherWyrm", boar: "AshBoar",
  cat: "MoonLynx", toad: "BloomToad", lynx: "RelicLynx", rose: "SaintRose",
};
export const MYTH_IMG: Record<MythSprite, string> = { ...A, ...B };
