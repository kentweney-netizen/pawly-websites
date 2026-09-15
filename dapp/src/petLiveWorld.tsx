import React, { useEffect, useRef } from "react";
import type { PetRec, SceneId } from "./petGame";

type Actor = { kind: "npc" | "pet"; x: number; y: number; vx: number; face: 1 | -1; emoji: string; bob: number };

const HOUSES: { id: SceneId; x: number; y: number; w: number; h: number; roof: string; label: string }[] = [
  { id: "hospital", x: 36, y: 78, w: 88, h: 70, roof: "#d9646a", label: "HOSP" },
  { id: "shelter", x: 140, y: 78, w: 88, h: 70, roof: "#5aa36a", label: "RESC" },
  { id: "hotel", x: 244, y: 72, w: 96, h: 76, roof: "#6a7ad9", label: "HOTEL" },
  { id: "groom", x: 356, y: 78, w: 88, h: 70, roof: "#d9a85a", label: "GROOM" },
  { id: "shop", x: 40, y: 268, w: 96, h: 74, roof: "#c9844a", label: "SHOP" },
  { id: "park", x: 360, y: 268, w: 96, h: 74, roof: "#3d6b32", label: "PARK" },
  { id: "nft", x: 160, y: 268, w: 56, h: 56, roof: "#8a6ad9", label: "NFT" },
  { id: "market", x: 228, y: 268, w: 56, h: 56, roof: "#c9a05a", label: "MKT" },
  { id: "breed", x: 296, y: 268, w: 56, h: 56, roof: "#d98aa0", label: "BREED" },
];

export function hitHouse(x: number, y: number): SceneId | null {
  const h = HOUSES.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h + 16);
  return h ? h.id : null;
}

export function PetLiveWorld(props: { pets: PetRec[]; scene: SceneId; onEnter: (id: SceneId) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const petsRef = useRef(props.pets);
  petsRef.current = props.pets;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let live = true;
    let t = 0;
    const actors: Actor[] = [
      { kind: "npc", x: 80, y: 210, vx: 0.35, face: 1, emoji: "\ud83d\udc68\u200d\ud83c\udf3e", bob: 0 },
      { kind: "npc", x: 300, y: 218, vx: -0.28, face: -1, emoji: "\ud83d\udc69\u200d\ud83d\udc3e", bob: 1 },
      { kind: "npc", x: 420, y: 206, vx: 0.22, face: 1, emoji: "\ud83d\udc67", bob: 2 },
    ];
    const clouds = [
      { x: 20, y: 28, s: 0.12, w: 70 },
      { x: 180, y: 18, s: 0.08, w: 90 },
      { x: 340, y: 36, s: 0.16, w: 60 },
    ];

    const loop = () => {
      if (!live) return;
      t += 1;
      const w = (c.width = c.clientWidth * (window.devicePixelRatio || 1));
      const h = (c.height = c.clientHeight * (window.devicePixelRatio || 1));
      ctx.setTransform(w / 480, 0, 0, h / 420, 0, 0);

      const sky = ctx.createLinearGradient(0, 0, 0, 160);
      sky.addColorStop(0, "#7ecbff");
      sky.addColorStop(1, "#d7f4c2");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 480, 420);
      ctx.fillStyle = "#ffe27a";
      ctx.beginPath();
      ctx.arc(410, 42, 22 + Math.sin(t / 40) * 1.5, 0, Math.PI * 2);
      ctx.fill();

      clouds.forEach((cl) => {
        cl.x += cl.s;
        if (cl.x > 520) cl.x = -90;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.ellipse(cl.x, cl.y, cl.w / 2, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = "#5d9e46";
      ctx.fillRect(0, 150, 480, 270);
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = i % 2 ? "#56943f" : "#64a84c";
        ctx.fillRect((i * 22 + Math.floor(t / 8)) % 500 - 20, 150, 20, 18);
      }
      ctx.fillStyle = "#c9b48a";
      ctx.fillRect(0, 198, 480, 36);
      ctx.fillStyle = "#a89068";
      ctx.fillRect(0, 212, 480, 8);

      HOUSES.forEach((b) => {
        ctx.fillStyle = b.roof;
        ctx.fillRect(b.x, b.y, b.w, 18);
        ctx.fillStyle = "#f3e4c6";
        ctx.fillRect(b.x + 6, b.y + 16, b.w - 12, b.h - 16);
        ctx.fillStyle = "#3a2214";
        ctx.fillRect(b.x + b.w / 2 - 7, b.y + b.h - 22, 14, 22);
        ctx.fillStyle = t % 80 < 40 ? "#fff6c8" : "#ffe27a";
        ctx.fillRect(b.x + 10, b.y + 24, 10, 10);
        ctx.fillStyle = "#2a1810";
        ctx.font = "9px sans-serif";
        ctx.fillText(b.label, b.x + 8, b.y - 4);
      });

      for (let i = 0; i < 6; i++) {
        const tx = 30 + i * 80;
        const sway = Math.sin(t / 18 + i) * 3;
        ctx.fillStyle = "#6b3e22";
        ctx.fillRect(tx, 168, 6, 22);
        ctx.fillStyle = "#2f7a3a";
        ctx.beginPath();
        ctx.ellipse(tx + 3 + sway, 160, 16, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const grown = petsRef.current.filter((p) => Number(p.level || 0) >= 1).slice(0, 4);
      while (actors.filter((a) => a.kind === "pet").length < grown.length) {
        const p = grown[actors.filter((a) => a.kind === "pet").length];
        actors.push({ kind: "pet", x: 70 + Math.random() * 300, y: 214, vx: 0.4 + Math.random() * 0.3, face: 1, emoji: p.emoji, bob: Math.random() * 6 });
      }
      actors.forEach((a) => {
        a.x += a.vx;
        if (a.x > 460) {
          a.x = 460;
          a.vx *= -1;
          a.face = -1;
        }
        if (a.x < 20) {
          a.x = 20;
          a.vx *= -1;
          a.face = 1;
        }
        const hop = Math.sin(t / 6 + a.bob) * (a.kind === "pet" ? 3 : 2);
        ctx.save();
        ctx.translate(a.x, a.y + hop);
        ctx.scale(a.face, 1);
        ctx.font = a.kind === "pet" ? "22px serif" : "20px serif";
        ctx.textAlign = "center";
        ctx.fillText(a.emoji, 0, 0);
        ctx.restore();
      });

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(40 + ((t * 1.4) % 400), 188, 8, 3);
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
