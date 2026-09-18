import fox from "./petHubMythFox";
import moth from "./petHubMythMoth";
import wyrm from "./petHubMythWyrm";
import boar from "./petHubMythBoar";
import cat from "./petHubMythCat";
import toad from "./petHubMythToad";
import lynx from "./petHubMythLynx";
import rose from "./petHubMythRose";

/** Full-body 16-bit portraits (myth-cards-v044). Species chosen by breedSig, not a gallery strip. */
export const MYTH_IMG = {
  fox,
  moth,
  wyrm,
  boar,
  cat,
  toad,
  lynx,
  rose,
} as const;
