import React, { useEffect, useRef } from "react";
import type { PetRec, SceneId } from "./petGame";

type Actor = { kind: "npc" | "dog" | "pig"; x: number; y: number; vx: number; face: 1 | -1; frame: number };

const HOUSES: { id: SceneId; x: number; y: number; w: number; h: number }[] = [
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

export function hitHouse(x: number, y: number): SceneId | null {
  const h = HOUSES.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  return h ? h.id : null;
}

function asset(name: string) {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/dapp/";
  return base.replace(/\/?$/, "/") + "game/" + name;
}

function loadImg(src: string) {
  const img = new Image();
  img.src = src;
  return img;
}

export function PetLiveWorld(props: { pets: PetRec[]; scene: SceneId; onEnter: (id: SceneId) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let live = true;
    let t = 0;
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

    const drawSheet = (sheet: HTMLImageElement, a: Actor, hop: number) => {
      if (!sheet.complete || !sheet.naturalWidth) return false;
      const fw = sheet.naturalWidth / 4;
      const fh = sheet.naturalHeight;
      const fr = Math.floor(a.frame) % 4;
      ctx.save();
      ctx.translate(a.x, a.y + hop);
      ctx.scale(a.face, 1);
      ctx.drawImage(sheet, fr * fw, 0, fw, fh, -22, -34, 44, 40);
      ctx.restore();
      return true;
    };

    const loop = () => {
      if (!live) return;
      t += 1;
      const w = (c.width = c.clientWidth * (window.devicePixelRatio || 1));
      const h = (c.height = c.clientHeight * (window.devicePixelRatio || 1));
      ctx.setTransform(w / 480, 0, 0, h / 420, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (town.complete && town.naturalWidth) ctx.drawImage(town, 0, 0, 480, 420);
      else {
        ctx.fillStyle = "#7ecbff";
        ctx.fillRect(0, 0, 480, 420);
        ctx.fillStyle = "#5d9e46";
        ctx.fillRect(0, 150, 480, 270);
      }
      ctx.fillStyle = "rgba(255,255,255," + (0.12 + 0.08 * Math.sin(t / 20)) + ")";
      ctx.fillRect(0, 12 + Math.sin(t / 30) * 4, 480, 8);
      actors.forEach((a) => {
        a.x += a.vx;
        a.frame += 0.12;
        if (a.x > 450) {
          a.x = 450;
          a.vx *= -1;
          a.face = -1;
        }
        if (a.x < 24) {
          a.x = 24;
          a.vx *= -1;
          a.face = 1;
        }
        const hop = Math.sin(t / 5 + a.x) * 1.4;
        const sheet = a.kind === "npc" ? npcSheet : a.kind === "dog" ? dogSheet : pigSheet;
        drawSheet(sheet, a, hop);
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => {
      live = false;
    };
  }, []);

  return (
    <canvas
      ref={ref}
      onClick={(e) => {
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
