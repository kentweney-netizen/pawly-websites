/** Deterministic sacred/weird NFT portrait. Same seed always redraws the same art. */
export type MythKind = "sacred" | "weird";
export type MythSpec = { name: string; species: string; kind: MythKind; seed: number };

const PREFIX = ["Saint", "Void", "Lumen", "Hex", "Relic", "Aether", "Bloom", "Ash", "Moon", "Solar", "Oracle", "Rune"];
const FORM = ["Wisp", "Horn", "Scale", "Fox", "Boar", "Wyrm", "Pup", "Moth", "Seraph", "Chimera", "Lynx", "Toad"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function mythicFrom(a: string, b: string, sig: string): MythSpec {
  const seed = hash((sig || "pawly") + "|" + String(a || "") + "|" + String(b || ""));
  const name = PREFIX[seed % PREFIX.length] + FORM[(seed >>> 5) % FORM.length];
  const kind: MythKind = seed % 2 === 0 ? "sacred" : "weird";
  return { name, species: kind + "-" + name.toLowerCase(), kind, seed };
}

function pal(seed: number, kind: MythKind) {
  if (kind === "sacred") return { bg: ["#08140f", "#14301c"], ink: "#f6e27a", body: ["#7cffb2", "#e8ff6a", "#ffe29a"], glow: "rgba(255,220,90,0.55)" };
  const pack = [
    { bg: ["#12081a", "#2a1033"], ink: "#ff9be8", body: ["#c56bff", "#ff6ad5", "#6ee7ff"], glow: "rgba(200,90,255,0.5)" },
    { bg: ["#081018", "#102030"], ink: "#7ee0ff", body: ["#4ad6ff", "#7dffa8", "#dd00ff"], glow: "rgba(80,200,255,0.5)" },
    { bg: ["#1a0a08", "#30140c"], ink: "#ffb36b", body: ["#ff7a3a", "#ffd36b", "#ff4d6d"], glow: "rgba(255,120,50,0.5)" },
  ];
  return pack[seed % pack.length];
}

export function drawNftPng(opts: { seed: number; name: string; kind: MythKind; serial: string; size?: number }) {
  const size = opts.size || 320;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const g = c.getContext("2d");
  if (!g) return "";
  const p = pal(opts.seed, opts.kind);
  const grd = g.createLinearGradient(0, 0, size, size);
  grd.addColorStop(0, p.bg[0]); grd.addColorStop(1, p.bg[1]);
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  g.strokeStyle = p.ink; g.lineWidth = Math.max(4, size * 0.018);
  g.strokeRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92);
  g.fillStyle = p.glow;
  g.beginPath(); g.arc(size * 0.5, size * 0.46, size * 0.28, 0, Math.PI * 2); g.fill();
  const body = p.body[opts.seed % p.body.length];
  g.fillStyle = body;
  g.beginPath(); g.ellipse(size * 0.5, size * 0.54, size * 0.22, size * 0.18, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(size * 0.5, size * 0.36, size * 0.13, 0, Math.PI * 2); g.fill();
  if (opts.kind === "sacred") {
    g.strokeStyle = p.ink; g.lineWidth = 3;
    g.beginPath(); g.arc(size * 0.5, size * 0.22, size * 0.07, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(size * 0.5, size * 0.12); g.lineTo(size * 0.5, size * 0.18); g.stroke();
  } else {
    g.fillStyle = p.ink;
    g.beginPath(); g.moveTo(size * 0.38, size * 0.28); g.lineTo(size * 0.32, size * 0.12); g.lineTo(size * 0.44, size * 0.26); g.fill();
    g.beginPath(); g.moveTo(size * 0.62, size * 0.28); g.lineTo(size * 0.68, size * 0.12); g.lineTo(size * 0.56, size * 0.26); g.fill();
  }
  g.fillStyle = "#0b1210";
  g.beginPath(); g.arc(size * 0.45, size * 0.35, size * 0.018, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(size * 0.55, size * 0.35, size * 0.018, 0, Math.PI * 2); g.fill();
  if (opts.seed % 3 === 0) {
    g.beginPath(); g.arc(size * 0.5, size * 0.31, size * 0.014, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = p.ink;
  g.font = "bold " + Math.floor(size * 0.07) + "px sans-serif";
  g.textAlign = "center";
  g.fillText(opts.name, size * 0.5, size * 0.84);
  g.font = Math.floor(size * 0.04) + "px sans-serif";
  g.fillStyle = "#c8ffe8";
  g.fillText(opts.kind.toUpperCase() + "  " + opts.serial.slice(0, 8), size * 0.5, size * 0.91);
  return c.toDataURL("image/png");
}

export function nftPortrait(n: { id?: string; name?: string; species?: string; breedSig?: string; kind?: string }) {
  const seed = hash(String(n.breedSig || n.id || n.name || "pawly"));
  const kind: MythKind = n.kind === "sacred" || n.kind === "weird" ? n.kind : (seed % 2 === 0 ? "sacred" : "weird");
  const name = String(n.name || "RelicWisp");
  return drawNftPng({ seed, name, kind, serial: String(n.breedSig || n.id || "") });
}
