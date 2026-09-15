/** Adopt shop companions only. Rescue / shelter species return null and keep emoji. */
const ADOPT: Record<string, string> = {
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
};

export function spriteFor(species: string): string | null {
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  const key = ADOPT[raw];
  if (!key) return null;
  return "/pets/" + key + ".png";
}
