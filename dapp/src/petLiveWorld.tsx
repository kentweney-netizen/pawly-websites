import React, { useEffect, useRef } from "react";
import type { PetRec, SceneId } from "./petGame";

type ActorKind = "npc" | "dog" | "pig";
type Actor = {
  kind: ActorKind;
  x: number;
  y: number;
  vx: number;
  face: number;
  frame: number;
};
type House = {
  id: SceneId;
  x: number;
  y: number;
  w: number;
  h: number;
};

const HOUSES: House[] = [
  { id: "hospital", x: 28, y: 70, w: 90, h: 78 },
  { id: "shelter", x: 150, y: 70, w: 90, h: 78 },
  { id: "hotel", x: 310, y: 62, w: 100, h: 84 },
  { id: "groom", x: 28, y: 250, w: 100, h: 86 },
  { id: "shop", x: 176, y: 250, w: 100, h: 86 },
  { id: "park", x: 330, y: 248, w: 100, h: 90 },
  { id: "nft", x: 150, y: 175, w: 50, h: 40 },
  { id: "market", x: 220, y: 175, w: 50, h: 40 },
  { id: "breed", x: 290, y: 175, w: 50, h: 40 },
];

export function hitHouse(px: number, py: number) {
  const found = HOUSES.find(function (b) {
    return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  });
  return found ? found.id : undefined;
}

function asset(name: string) {
  const env = import.meta as unknown as { env?: { BASE_URL?: string } };
  const base = (env.env && env.env.BASE_URL) || "/dapp/";
  const prefix = base.endsWith("/") ? base : base + "/";
  return prefix + "game/" + name;
}

function loadImg(src: string) {
  const img = new Image();
  img.src = src;
  return img;
}

export function PetLiveWorld(props: {
  pets: PetRec[];
  scene: SceneId;
  onEnter: (id: SceneId) => void;
}) {
  const ref = useRef(null as HTMLCanvasElement | null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let live = true;
    let tick = 0;
    const town = loadImg(asset("town.jpg"));
    const npcSheet = loadImg(asset("npc.png"));
    const dogSheet = loadImg(asset("dog.png"));
    const pigSheet = loadImg(asset("pig.png"));
    const actors: Actor[] = [
      { kind: "npc", x: 70, y: 200, vx: 0.45, face: 1, frame: 0 },
      { kind: "npc", x: 360, y: 208, vx: -0.32, face: -1, frame: 1 },
      { kind: "dog", x: 140, y: 216, vx: 0.55, face: 1, frame: 0 },
      { kind: "pig", x: 280, y: 218, vx: -0.4, face: -1, frame: 2 },
    ];

    function drawSheet(sheet: HTMLImageElement, a: Actor, hop: number) {
      if (!sheet.complete || !sheet.naturalWidth) return;
      const fw = sheet.naturalWidth / 4;
      const fh = sheet.naturalHeight;
      const fr = Math.floor(a.frame) % 4;
      ctx.save();
      ctx.translate(a.x, a.y + hop);
      ctx.scale(a.face, 1);
      ctx.drawImage(sheet, fr * fw, 0, fw, fh, -22, -34, 44, 40);
      ctx.restore();
    }

    function loop() {
      if (!live) return;
      tick += 1;
      const w = c.clientWidth * (window.devicePixelRatio || 1);
      const h = c.clientHeight * (window.devicePixelRatio || 1);
      c.width = w;
      c.height = h;
      ctx.setTransform(w / 480, 0, 0, h / 420, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (town.complete && town.naturalWidth) {
        ctx.drawImage(town, 0, 0, 480, 420);
      } else {
        ctx.fillStyle = "#7ecbff";
        ctx.fillRect(0, 0, 480, 420);
        ctx.fillStyle = "#5d9e46";
        ctx.fillRect(0, 150, 480, 270);
      }
      let i = 0;
      while (i < actors.length) {
        const a = actors[i];
        a.x += a.vx;
        a.frame += 0.12;
        if (a.x > 450) {
          a.x = 450;
          a.vx = -Math.abs(a.vx);
          a.face = -1;
        }
        if (a.x < 24) {
          a.x = 24;
          a.vx = Math.abs(a.vx);
          a.face = 1;
        }
        const hop = Math.sin(tick / 5 + a.x) * 1.4;
        const sheet = a.kind === "npc" ? npcSheet : a.kind === "dog" ? dogSheet : pigSheet;
        drawSheet(sheet, a, hop);
        i += 1;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    return function () {
      live = false;
    };
  }, []);

  return (
    <canvas
      ref={ref}
      onClick={function (e) {
        const box = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const x = ((e.clientX - box.left) / box.width) * 480;
        const y = ((e.clientY - box.top) / box.height) * 420;
        const id = hitHouse(x, y);
        if (id) props.onEnter(id);
      }}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }}
    />
  );
}
