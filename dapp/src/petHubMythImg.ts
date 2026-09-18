import fox from "./petHubMythFox";
import wyrm from "./petHubMythWyrm";
import boar from "./petHubMythBoar";

/** Painted moth/cat/toad/lynx/rose modules are not in repo yet. Barrel stays compile-safe. Portraits are seed-drawn in petHubNftArt. */
export const MYTH_IMG = {
  fox,
  moth: fox,
  wyrm,
  boar,
  cat: fox,
  toad: boar,
  lynx: boar,
  rose: wyrm,
} as const;
