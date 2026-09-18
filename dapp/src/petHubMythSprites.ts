export const MYTH_KIND = ["fox","moth","wyrm","boar","cat","toad","lynx","rose"] as const;
export type MythSprite = typeof MYTH_KIND[number];
export const MYTH_NAME: Record<MythSprite, string> = {
  fox: "LumenFox", moth: "HexMoth", wyrm: "AetherWyrm", boar: "AshBoar",
  cat: "MoonLynx", toad: "BloomToad", lynx: "RelicLynx", rose: "SaintRose",
};
