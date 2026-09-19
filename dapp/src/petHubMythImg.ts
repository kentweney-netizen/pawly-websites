/** Live 16-bit portraits. Files unpacked to dapp/public/myth and served via /dapp/myth/*.jpg */
const BASE = "/dapp/myth/";
const V = "?v=3";
export const MYTH_IMG = {
  fox: BASE + "fox.jpg" + V,
  moth: BASE + "moth.jpg" + V,
  wyrm: BASE + "wyrm.jpg" + V,
  boar: BASE + "boar.jpg" + V,
  cat: BASE + "cat.jpg" + V,
  toad: BASE + "toad.jpg" + V,
  lynx: BASE + "lynx.jpg" + V,
  rose: BASE + "rose.jpg" + V,
} as const;
