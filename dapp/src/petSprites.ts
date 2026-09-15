const KNOWN = ["minipig", "rabbit", "dog", "cat", "hamster", "duck"] as const;

export function spriteFor(species: string): string | null {
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  const key =
    raw === "pig" || raw === "mini-pig" || raw === "minipig" ? "minipig" :
    raw === "stray-dog" ? "dog" :
    raw === "stray-cat" ? "cat" :
    raw === "chicken" || raw === "parrot" || raw === "hornbill" ? "duck" :
    raw;
  if ((KNOWN as readonly string[]).includes(key)) return "/pets/" + key + ".png";
  return null;
}
