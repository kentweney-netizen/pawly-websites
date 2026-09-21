export const STUDIO_BODIES = ["fox", "cat", "dog", "boar", "moth", "wyrm", "toad", "rose"] as const;
export const STUDIO_COLORS = ["#f4c56d", "#7ad0ff", "#ff8ab8", "#9dffb0", "#d7b3ff", "#ffd36a", "#8aa4ff", "#ffffff"] as const;
export const STUDIO_PATTERNS = ["none", "spots", "stripes"] as const;
export const STUDIO_ACC = ["none", "bow", "scarf", "lantern", "horn"] as const;
export type StudioBody = (typeof STUDIO_BODIES)[number];
export type StudioPattern = (typeof STUDIO_PATTERNS)[number];
export type StudioAcc = (typeof STUDIO_ACC)[number];
export type StudioDraft = {
  body: StudioBody;
  colorA: string;
  colorB: string;
  pattern: StudioPattern;
  acc: StudioAcc;
  name: string;
  doodle?: string;
};

export function cleanStudioName(raw: string) {
  return String(raw || "").replace(/[^A-Za-z0-9 ]+/g, "").trim().slice(0, 16);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBody(ctx: CanvasRenderingContext2D, body: StudioBody, a: string, b: string) {
  ctx.fillStyle = a;
  if (body === "fox" || body === "cat" || body === "dog") {
    ctx.beginPath();
    ctx.ellipse(80, 98, 38, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(80, 58, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(58, 42); ctx.lineTo(52, 18); ctx.lineTo(70, 36);
    ctx.moveTo(102, 42); ctx.lineTo(108, 18); ctx.lineTo(90, 36);
    ctx.fill();
    ctx.fillStyle = "#1a2030";
    ctx.beginPath(); ctx.arc(70, 56, 4, 0, Math.PI * 2); ctx.arc(90, 56, 4, 0, Math.PI * 2); ctx.fill();
  } else if (body === "boar") {
    ctx.beginPath(); ctx.ellipse(80, 96, 42, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(80, 62, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = b; ctx.fillRect(68, 70, 24, 10);
  } else if (body === "moth") {
    ctx.fillStyle = b;
    ctx.beginPath(); ctx.ellipse(52, 80, 28, 18, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(108, 80, 28, 18, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = a;
    ctx.beginPath(); ctx.ellipse(80, 88, 14, 28, 0, 0, Math.PI * 2); ctx.fill();
  } else if (body === "wyrm") {
    ctx.beginPath(); ctx.moveTo(30, 110); ctx.quadraticCurveTo(80, 20, 130, 110); ctx.quadraticCurveTo(80, 70, 30, 110); ctx.fill();
  } else if (body === "toad") {
    ctx.beginPath(); ctx.ellipse(80, 100, 40, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(62, 78, 14, 0, Math.PI * 2); ctx.arc(98, 78, 14, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(80, 88, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = a; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(80, 54); ctx.lineTo(80, 28); ctx.stroke();
    ctx.fillStyle = b; ctx.beginPath(); ctx.arc(80, 24, 8, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPattern(ctx: CanvasRenderingContext2D, pattern: StudioPattern, color: string) {
  ctx.fillStyle = color;
  if (pattern === "spots") {
    [[48, 90], [96, 86], [70, 112], [110, 108]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    });
  }
  if (pattern === "stripes") {
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 5; i++) ctx.fillRect(40 + i * 16, 70, 7, 50);
    ctx.globalAlpha = 1;
  }
}

function drawAcc(ctx: CanvasRenderingContext2D, acc: StudioAcc, color: string) {
  ctx.fillStyle = color;
  if (acc === "bow") {
    ctx.beginPath(); ctx.moveTo(80, 36); ctx.lineTo(66, 24); ctx.lineTo(66, 48); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(80, 36); ctx.lineTo(94, 24); ctx.lineTo(94, 48); ctx.closePath(); ctx.fill();
  }
  if (acc === "scarf") { ctx.fillRect(58, 78, 44, 8); }
  if (acc === "lantern") {
    ctx.fillRect(118, 88, 14, 18); ctx.fillStyle = "#ffd36a"; ctx.fillRect(120, 90, 10, 10);
  }
  if (acc === "horn") {
    ctx.beginPath(); ctx.moveTo(80, 18); ctx.lineTo(74, 40); ctx.lineTo(86, 40); ctx.closePath(); ctx.fill();
  }
}

export function renderStudioCard(draft: StudioDraft): string {
  const canvas = document.createElement("canvas");
  canvas.width = 160; canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#081018";
  ctx.fillRect(0, 0, 160, 160);
  ctx.fillStyle = "#0e1a14";
  roundRect(ctx, 8, 8, 144, 144, 16);
  ctx.fill();
  drawBody(ctx, draft.body, draft.colorA, draft.colorB);
  drawPattern(ctx, draft.pattern, draft.colorB);
  drawAcc(ctx, draft.acc, draft.colorB);
  if (draft.doodle) {
    const img = new Image();
    img.src = draft.doodle;
    try {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(img, 0, 0, 160, 160);
      ctx.globalAlpha = 1;
    } catch { /* preview rerender */ }
  }
  ctx.fillStyle = "#00ff9d";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(cleanStudioName(draft.name) || "My Pet", 80, 150);
  return canvas.toDataURL("image/png");
}

export function studioSpecies(body: StudioBody) {
  if (body === "boar") return "AshBoar";
  if (body === "cat") return "MoonLynx";
  if (body === "dog" || body === "fox") return "LumenFox";
  if (body === "moth") return "HexMoth";
  if (body === "wyrm") return "AetherWyrm";
  if (body === "toad") return "BloomToad";
  return "SaintRose";
}
