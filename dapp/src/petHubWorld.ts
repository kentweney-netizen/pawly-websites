/**
 * PAWLY Pet Hub world v0.3.1 — transparent actor layer over real street/room clips.
 * Canvas never paints fake block buildings. Plate = HTML video. Actors = keeper + Lv1+.
 */
import type { SceneId } from "./petHubLib";

export type WorldPet = { id: string; name: string; emoji: string; species: string; level: number };
export type WorldEvent =
  | { type: "near"; id: SceneId | null }
  | { type: "enter"; id: SceneId }
  | { type: "tap-pet"; id: string };

type Door = { id: SceneId; x: number; y: number; w: number; h: number; label: string };

const STREET_DOORS: Door[] = [
  { id: "shop", x: 0.04, y: 0.18, w: 0.15, h: 0.22, label: "SHOP" },
  { id: "hospital", x: 0.21, y: 0.16, w: 0.16, h: 0.24, label: "HOSP" },
  { id: "shelter", x: 0.39, y: 0.18, w: 0.15, h: 0.22, label: "RESCUE" },
  { id: "hotel", x: 0.56, y: 0.16, w: 0.15, h: 0.24, label: "HOTEL" },
  { id: "groom", x: 0.73, y: 0.18, w: 0.14, h: 0.22, label: "GROOM" },
  { id: "park", x: 0.68, y: 0.46, w: 0.26, h: 0.16, label: "PARK" },
];

export type HubWorld = {
  setScene: (id: SceneId) => void;
  setPets: (pets: WorldPet[]) => void;
  setStick: (x: number, y: number) => void;
  destroy: () => void;
};

export function createPetHubWorld(canvas: HTMLCanvasElement, onEvent: (e: WorldEvent) => void): HubWorld {
  const raw = canvas.getContext("2d");
  if (!raw) {
    return { setScene() {}, setPets() {}, setStick() {}, destroy() {} };
  }
  const ctx: CanvasRenderingContext2D = raw;
  let scene: SceneId = "street";
  let pets: WorldPet[] = [];
  let stickX = 0;
  let stickY = 0;
  let px = 0.48;
  let py = 0.72;
  let facing = 1;
  let lastNear: SceneId | null = null;
  let raf = 0;
  let alive = true;
  let last = performance.now();
  const followers: { id: string; x: number; y: number }[] = [];

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(280, Math.floor(rect.width || 430));
    const h = Math.max(280, Math.floor(rect.height || 520));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function doors(w: number, h: number): Array<Door & { ax: number; ay: number; aw: number; ah: number }> {
    return STREET_DOORS.map((d) => ({ ...d, ax: d.x * w, ay: d.y * h, aw: d.w * w, ah: d.h * h }));
  }

  function nearDoor(w: number, h: number) {
    if (scene !== "street") return null;
    const x = px * w;
    const y = py * h;
    const list = doors(w, h);
    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      const cx = d.ax + d.aw / 2;
      const cy = d.ay + d.ah;
      if (Math.abs(x - cx) < Math.max(28, d.aw * 0.45) && Math.abs(y - cy) < Math.max(28, d.ah * 0.55)) return d;
    }
    return null;
  }

  function drawKeeper(g: CanvasRenderingContext2D, x: number, y: number, bounce: number) {
    g.save();
    g.translate(x, y + bounce);
    g.scale(facing, 1);
    g.fillStyle = "rgba(0,0,0,0.28)";
    g.beginPath();
    g.ellipse(0, 14, 10, 4, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#163024";
    g.fillRect(-7, 2, 6, 12);
    g.fillRect(1, 2, 6, 12);
    g.fillStyle = "#00c87a";
    g.fillRect(-9, -10, 18, 14);
    g.fillStyle = "#ffd27a";
    g.fillRect(-7, -22, 14, 13);
    g.fillStyle = "#0b1c14";
    g.fillRect(-8, -26, 16, 6);
    g.fillStyle = "#102018";
    g.fillRect(-5, -18, 3, 3);
    g.fillRect(2, -18, 3, 3);
    g.restore();
  }

  function drawPet(g: CanvasRenderingContext2D, x: number, y: number, emoji: string, lv: number, bounce: number) {
    g.save();
    g.translate(x, y + bounce);
    g.fillStyle = "rgba(0,0,0,0.28)";
    g.beginPath();
    g.ellipse(0, 10, lv >= 1 ? 11 : 7, 4, 0, 0, Math.PI * 2);
    g.fill();
    g.font = (lv >= 1 ? 24 : 16) + "px serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(emoji || "\ud83d\udc3e", 0, lv >= 1 ? -4 : 0);
    g.restore();
  }

  function tick(now: number) {
    if (!alive) return;
    const dt = Math.min(32, now - last);
    last = now;
    const { w, h } = fit();
    const speed = 0.00032 * dt;
    px += stickX * speed * 1.2;
    py += stickY * speed;
    if (stickX > 0.2) facing = 1;
    if (stickX < -0.2) facing = -1;
    px = Math.max(0.08, Math.min(0.92, px));
    py = Math.max(0.42, Math.min(0.88, py));
    const n = nearDoor(w, h);
    const nid = n ? n.id : null;
    if (nid !== lastNear) {
      lastNear = nid;
      onEvent({ type: "near", id: nid });
    }
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    if (scene === "street") {
      const bob = Math.sin(now / 140) * 2;
      const grown = pets.filter((p) => p.level >= 1).slice(0, 4);
      grown.forEach((p, i) => {
        let f = followers.find((x) => x.id === p.id);
        if (!f) {
          f = { id: p.id, x: px * w - 18 - i * 16, y: py * h + 6 };
          followers.push(f);
        }
        const tx = px * w - facing * (22 + i * 16);
        const ty = py * h + 8 + (i % 2) * 6;
        f.x += (tx - f.x) * 0.08;
        f.y += (ty - f.y) * 0.08;
        drawPet(ctx, f.x, f.y, p.emoji, p.level, Math.sin(now / 120 + i) * 2);
      });
      drawKeeper(ctx, px * w, py * h, bob);
      if (n) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(n.ax, n.ay - 18, n.aw, 16);
        ctx.fillStyle = "#00ff9d";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("A  ENTER  " + n.label, n.ax + n.aw / 2, n.ay - 6);
      }
    } else {
      const bob = Math.sin(now / 140) * 2;
      drawKeeper(ctx, w * 0.5, h * 0.72, bob);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(w / 2 - 70, h - 36, 140, 22);
      ctx.fillStyle = "#c8ffe8";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("A  OPEN DESK   B  STREET", w / 2, h - 21);
    }
    raf = window.requestAnimationFrame(tick);
  }

  function onClick(ev: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const grown = pets.filter((pet) => pet.level >= 1).slice(0, 4);
    for (let i = 0; i < grown.length; i++) {
      const f = followers.find((z) => z.id === grown[i].id);
      if (!f) continue;
      if (Math.hypot(x - f.x, y - f.y) < 22) {
        onEvent({ type: "tap-pet", id: grown[i].id });
        return;
      }
    }
    if (scene === "street") {
      const { w, h } = { w: rect.width, h: rect.height };
      const list = doors(w, h);
      for (let i = 0; i < list.length; i++) {
        const d = list[i];
        if (x >= d.ax && x <= d.ax + d.aw && y >= d.ay && y <= d.ay + d.ah) {
          onEvent({ type: "enter", id: d.id });
          return;
        }
      }
    }
  }

  canvas.addEventListener("click", onClick);
  raf = window.requestAnimationFrame(tick);

  return {
    setScene(id: SceneId) {
      scene = id;
      if (id === "street") {
        px = 0.48;
        py = 0.72;
      }
      lastNear = null;
    },
    setPets(next: WorldPet[]) {
      pets = next || [];
    },
    setStick(x: number, y: number) {
      stickX = Math.max(-1, Math.min(1, x));
      stickY = Math.max(-1, Math.min(1, y));
    },
    destroy() {
      alive = false;
      window.cancelAnimationFrame(raf);
      canvas.removeEventListener("click", onClick);
    },
  };
}
