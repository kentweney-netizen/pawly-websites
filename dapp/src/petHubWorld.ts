/**
 * PAWLY Pet Hub world v0.3.0 — canvas GameFi street.
 * No Phaser in this file (keeps dApp tsc / wallet browsers light).
 * No 3D mp4 overlay. Shared plate drawn in 2D. Lv1+ pets follow the keeper.
 */
import type { SceneId } from "./petHubLib";

export type WorldPet = { id: string; name: string; emoji: string; species: string; level: number };
export type WorldEvent =
  | { type: "near"; id: SceneId | null }
  | { type: "enter"; id: SceneId }
  | { type: "tap-pet"; id: string };

type Door = { id: SceneId; x: number; y: number; w: number; h: number; label: string; fill: string };

const STREET_DOORS: Door[] = [
  { id: "shop", x: 28, y: 118, w: 70, h: 78, label: "SHOP", fill: "#e45d8a" },
  { id: "hospital", x: 108, y: 110, w: 74, h: 86, label: "HOSP", fill: "#f4f0ea" },
  { id: "shelter", x: 192, y: 118, w: 70, h: 78, label: "RESCUE", fill: "#f0a14a" },
  { id: "hotel", x: 272, y: 112, w: 70, h: 84, label: "HOTEL", fill: "#4aa3e8" },
  { id: "groom", x: 352, y: 120, w: 66, h: 76, label: "GROOM", fill: "#b07cff" },
  { id: "park", x: 318, y: 268, w: 96, h: 64, label: "PARK", fill: "#2f8a4a" },
];

const ROOM: Record<Exclude<SceneId, "street">, { title: string; floor: string; wall: string }> = {
  shop: { title: "Pet Shop", floor: "#3a2418", wall: "#7a3a28" },
  hospital: { title: "Novena Hospital", floor: "#dce8f2", wall: "#f7f4ef" },
  shelter: { title: "Rescue", floor: "#3a2a18", wall: "#6a4420" },
  hotel: { title: "Pet Hotel", floor: "#1c2a44", wall: "#2a4a78" },
  groom: { title: "Grooming", floor: "#2a1a33", wall: "#5a3878" },
  park: { title: "East Coast Park", floor: "#1d4a28", wall: "#3d7a3a" },
};

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
  let px = 210;
  let py = 300;
  let facing = 1;
  let lastNear: SceneId | null = null;
  let raf = 0;
  let alive = true;
  let last = performance.now();
  const followers: { id: string; x: number; y: number }[] = [];
  const W = 430;
  const H = 520;

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(280, Math.floor(rect.width || W));
    const h = Math.max(280, Math.floor(rect.height || H));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function nearDoor(): Door | null {
    if (scene !== "street") return null;
    for (let i = 0; i < STREET_DOORS.length; i++) {
      const d = STREET_DOORS[i];
      const cx = d.x + d.w / 2;
      const cy = d.y + d.h;
      if (Math.abs(px - cx) < 36 && Math.abs(py - cy) < 34) return d;
    }
    return null;
  }

  function drawKeeper(g: CanvasRenderingContext2D, x: number, y: number, bounce: number) {
    g.save();
    g.translate(x, y + bounce);
    g.scale(facing, 1);
    g.fillStyle = "#1a120c";
    g.fillRect(-7, -4, 14, 10);
    g.fillStyle = "#ffd27a";
    g.fillRect(-6, -16, 12, 12);
    g.fillStyle = "#00ff9d";
    g.fillRect(-8, -20, 16, 6);
    g.fillStyle = "#163024";
    g.fillRect(-6, 6, 5, 10);
    g.fillRect(1, 6, 5, 10);
    g.restore();
  }

  function drawPet(g: CanvasRenderingContext2D, x: number, y: number, emoji: string, lv: number, bounce: number) {
    g.save();
    g.translate(x, y + bounce);
    g.fillStyle = lv >= 1 ? "#14301c" : "#102018";
    g.beginPath();
    g.ellipse(0, 8, lv >= 1 ? 12 : 8, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.font = (lv >= 1 ? 22 : 16) + "px serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(emoji || "\ud83d\udc3e", 0, lv >= 1 ? -2 : 0);
    g.restore();
  }

  function drawStreet(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#14305a");
    sky.addColorStop(0.42, "#6ec7ff");
    sky.addColorStop(0.43, "#2f6b32");
    sky.addColorStop(1, "#163018");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffe27a";
    g.beginPath();
    g.arc(w - 48, 46, 18, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#3d7a3a";
    g.fillRect(0, h * 0.46, w, h);
    g.fillStyle = "#4a4a52";
    g.fillRect(0, h * 0.58, w, 74);
    g.fillStyle = "#d8c25a";
    for (let x = 8; x < w; x += 36) g.fillRect(x, h * 0.58 + 34, 18, 4);
    STREET_DOORS.forEach((d) => {
      g.fillStyle = "#1a100c";
      g.fillRect(d.x + 6, d.y + d.h - 8, d.w - 12, 10);
      g.fillStyle = d.fill;
      g.fillRect(d.x, d.y, d.w, d.h - 10);
      g.fillStyle = "#0b0b0b";
      g.fillRect(d.x + d.w / 2 - 8, d.y + d.h - 28, 16, 18);
      g.fillStyle = "#08140e";
      g.fillRect(d.x + 6, d.y + 8, d.w - 12, 14);
      g.fillStyle = "#e8ffe8";
      g.font = "bold 9px sans-serif";
      g.textAlign = "center";
      g.fillText(d.label, d.x + d.w / 2, d.y + 18);
    });
    const near = nearDoor();
    if (near) {
      g.fillStyle = "rgba(0,255,157,0.85)";
      g.font = "bold 12px sans-serif";
      g.textAlign = "center";
      g.fillText("A  ENTER  " + near.label, near.x + near.w / 2, near.y - 8);
    }
    const bob = Math.sin(t / 140) * 2;
    const grown = pets.filter((p) => p.level >= 1).slice(0, 4);
    grown.forEach((p, i) => {
      let f = followers.find((x) => x.id === p.id);
      if (!f) {
        f = { id: p.id, x: px - 18 - i * 16, y: py + 6 };
        followers.push(f);
      }
      const tx = px - facing * (22 + i * 16);
      const ty = py + 8 + (i % 2) * 6;
      f.x += (tx - f.x) * 0.08;
      f.y += (ty - f.y) * 0.08;
      drawPet(g, f.x, f.y, p.emoji, p.level, Math.sin(t / 120 + i) * 2);
    });
    drawKeeper(g, px, py, bob);
  }

  function drawRoom(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
    const room = ROOM[scene as Exclude<SceneId, "street">];
    g.fillStyle = room.wall;
    g.fillRect(0, 0, w, h * 0.46);
    g.fillStyle = room.floor;
    g.fillRect(0, h * 0.46, w, h);
    g.fillStyle = "#111";
    g.fillRect(w / 2 - 70, h * 0.42, 140, 18);
    g.fillStyle = "#c8a06a";
    g.fillRect(w / 2 - 64, h * 0.34, 128, 16);
    g.fillStyle = "#00ff9d";
    g.font = "bold 16px sans-serif";
    g.textAlign = "center";
    g.fillText(room.title, w / 2, 36);
    g.fillStyle = "#e8eef7";
    g.font = "12px sans-serif";
    g.fillText("Walk to the counter  \u00b7  press A", w / 2, 56);
    g.fillStyle = "#ffd27a";
    g.beginPath();
    g.arc(w / 2, h * 0.34 - 10, 10, 0, Math.PI * 2);
    g.fill();
    const bob = Math.sin(t / 140) * 2;
    drawKeeper(g, px, py, bob);
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(w / 2 - 54, h - 46, 108, 22);
    g.fillStyle = "#c8ffe8";
    g.font = "bold 11px sans-serif";
    g.fillText("A  OPEN DESK   B  STREET", w / 2, h - 31);
  }

  function tick(now: number) {
    if (!alive) return;
    const dt = Math.min(32, now - last);
    last = now;
    const { w, h } = fit();
    const speed = 0.16 * dt;
    px += stickX * speed * 1.15;
    py += stickY * speed;
    if (stickX > 0.2) facing = 1;
    if (stickX < -0.2) facing = -1;
    px = Math.max(18, Math.min((w || W) - 18, px));
    py = Math.max(90, Math.min((h || H) - 28, py));
    const n = nearDoor();
    const nid = n ? n.id : (scene !== "street" && py > (h || H) * 0.62 ? scene : null);
    if (nid !== lastNear) {
      lastNear = nid;
      onEvent({ type: "near", id: nid });
    }
    ctx.imageSmoothingEnabled = false;
    if (scene === "street") drawStreet(ctx, w, h, now);
    else drawRoom(ctx, w, h, now);
    raf = window.requestAnimationFrame(tick);
  }

  function onClick(ev: MouseEvent | TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const p = "touches" in ev && ev.touches[0] ? ev.touches[0] : (ev as MouseEvent);
    const x = p.clientX - rect.left;
    const y = p.clientY - rect.top;
    const grown = pets.filter((pet) => pet.level >= 1).slice(0, 4);
    for (let i = 0; i < grown.length; i++) {
      const f = followers.find((z) => z.id === grown[i].id);
      if (!f) continue;
      if (Math.hypot(x - f.x, y - f.y) < 22) {
        onEvent({ type: "tap-pet", id: grown[i].id });
        return;
      }
    }
  }

  canvas.addEventListener("click", onClick);
  raf = window.requestAnimationFrame(tick);

  return {
    setScene(id: SceneId) {
      scene = id;
      if (id === "street") {
        px = 210;
        py = 300;
      } else {
        px = 210;
        py = 280;
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
