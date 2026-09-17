/**
 * PAWLY Pet Hub world v0.3.2 — actors match plate style.
 * Transparent canvas over street/room clips.
 * Keeper = painted cartoon (hoodie), pets = /pets/*.png body sprites.
 * No 8-bit block person. No fused 3D heads.
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

const PET_FILE: Record<string, string> = {
  dog: "dog", cat: "cat", rabbit: "rabbit", hamster: "hamster", parrot: "parrot",
  chicken: "chicken", duck: "duck", minipig: "minipig", pig: "minipig", "mini-pig": "minipig",
  alpaca: "alpaca", lizard: "lizard", snake: "snake", gecko: "gecko", beetle: "beetle",
  tarantula: "tarantula", mantis: "mantis", "stray-dog": "dog", "stray-cat": "cat",
};

const imgCache: Record<string, HTMLImageElement> = {};
function petImg(species: string): HTMLImageElement | null {
  const raw = String(species || "").trim().toLowerCase().replace(/\s+/g, "-");
  const key = PET_FILE[raw];
  if (!key) return null;
  const src = "/pets/" + key + ".png";
  if (!imgCache[src]) {
    const im = new Image();
    im.src = src;
    imgCache[src] = im;
  }
  return imgCache[src];
}

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
  let px = 0.62;
  let py = 0.78;
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

  function doors(w: number, h: number) {
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

  function drawKeeper(g: CanvasRenderingContext2D, x: number, y: number, bounce: number, walk: number) {
    g.save();
    g.translate(x, y + bounce);
    g.scale(facing, 1);
    g.fillStyle = "rgba(0,0,0,0.28)";
    g.beginPath();
    g.ellipse(0, 18, 16, 5, 0, 0, Math.PI * 2);
    g.fill();
    const swing = Math.sin(walk) * 7;
    g.fillStyle = "#1d2430";
    g.fillRect(-11, 4, 9, 16);
    g.fillRect(2, 4, 9, 16);
    g.fillStyle = "#2b3340";
    g.fillRect(-12 + swing * 0.15, 18, 10, 6);
    g.fillRect(3 - swing * 0.15, 18, 10, 6);
    g.fillStyle = "#1fae78";
    g.fillRect(-16, -16, 32, 24);
    g.fillStyle = "#168a5e";
    g.fillRect(-16, -2, 32, 10);
    g.fillStyle = "#f3c7a0";
    g.beginPath();
    g.ellipse(-18, -2 + swing * 0.2, 5, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(18, -2 - swing * 0.2, 5, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f3c7a0";
    g.beginPath();
    g.ellipse(0, -28, 13, 15, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2a1c14";
    g.beginPath();
    g.ellipse(1, -36, 14, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.fillRect(-12, -34, 6, 12);
    g.fillRect(6, -34, 8, 14);
    g.fillStyle = "#fff";
    g.beginPath();
    g.ellipse(-5, -28, 3.2, 3.6, 0, 0, Math.PI * 2);
    g.ellipse(5, -28, 3.2, 3.6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1a120c";
    g.beginPath();
    g.ellipse(-4.4, -27.6, 1.5, 1.8, 0, 0, Math.PI * 2);
    g.ellipse(5.6, -27.6, 1.5, 1.8, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#c98464";
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(0, -24, 5, 0.15, Math.PI - 0.15);
    g.stroke();
    g.restore();
  }

  function drawPet(g: CanvasRenderingContext2D, x: number, y: number, pet: WorldPet, bounce: number) {
    g.save();
    g.translate(x, y + bounce);
    g.scale(facing, 1);
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.beginPath();
    g.ellipse(0, 16, 22, 6, 0, 0, Math.PI * 2);
    g.fill();
    const im = petImg(pet.species);
    if (im && im.complete && im.naturalWidth > 0) {
      const h = pet.level >= 1 ? 70 : 48;
      const w = h * (im.naturalWidth / im.naturalHeight);
      g.drawImage(im, -w / 2, -h + 16, w, h);
    } else {
      g.font = (pet.level >= 1 ? 44 : 30) + "px serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(pet.emoji || "\ud83d\udc3e", 0, -8);
    }
    g.restore();
  }

  function tick(now: number) {
    if (!alive) return;
    const dt = Math.min(32, now - last);
    last = now;
    const { w, h } = fit();
    const moving = Math.abs(stickX) + Math.abs(stickY) > 0.08;
    const speed = 0.00028 * dt;
    px += stickX * speed * 1.2;
    py += stickY * speed;
    if (stickX > 0.2) facing = 1;
    if (stickX < -0.2) facing = -1;
    px = Math.max(0.1, Math.min(0.9, px));
    py = Math.max(0.58, Math.min(0.9, py));
    const n = nearDoor(w, h);
    const nid = n ? n.id : null;
    if (nid !== lastNear) {
      lastNear = nid;
      onEvent({ type: "near", id: nid });
    }
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    if (scene === "street") {
      const bob = moving ? Math.sin(now / 90) * 3 : Math.sin(now / 280) * 1;
      const grown = pets.filter((p) => p.level >= 1).slice(0, 4);
      grown.forEach((p, i) => {
        petImg(p.species);
        let f = followers.find((x) => x.id === p.id);
        if (!f) {
          f = { id: p.id, x: px * w - 40 - i * 36, y: py * h + 8 };
          followers.push(f);
        }
        const tx = px * w - facing * (48 + i * 38);
        const ty = py * h + 6 + (i % 2) * 8;
        f.x += (tx - f.x) * 0.09;
        f.y += (ty - f.y) * 0.09;
        drawPet(ctx, f.x, f.y, p, Math.sin(now / 110 + i) * 2);
      });
      drawKeeper(ctx, px * w, py * h, bob, now / 90);
      if (n) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(n.ax, Math.max(8, n.ay - 18), n.aw, 16);
        ctx.fillStyle = "#00ff9d";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("A  ENTER  " + n.label, n.ax + n.aw / 2, Math.max(20, n.ay - 6));
      }
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
      if (Math.hypot(x - f.x, y - f.y) < 36) {
        onEvent({ type: "tap-pet", id: grown[i].id });
        return;
      }
    }
    if (scene === "street") {
      const list = doors(rect.width, rect.height);
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
        px = 0.62;
        py = 0.78;
      }
      lastNear = null;
    },
    setPets(next: WorldPet[]) {
      pets = next || [];
      pets.forEach((p) => petImg(p.species));
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
