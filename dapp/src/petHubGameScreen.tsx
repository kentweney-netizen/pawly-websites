import React, { useRef, useState } from "react";
import { PetRig } from "./petAvatar";
import { SCENES, clampCam } from "./petHubEngine";

export type GameScene = "street" | "hospital" | "shelter" | "shop" | "hotel" | "groom" | "park";

type PetLite = { id: string; species: string; name: string; emoji: string; level?: number };

export function PetHubGameScreen(props: {
  scene: GameScene;
  pets: PetLite[];
  onEnter: (id: GameScene) => void;
}) {
  const scene = SCENES[props.scene] || SCENES.street;
  const box = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [cam, setCam] = useState({ x: 80, y: 40 });

  const walkers = props.pets.filter((p) => Number(p.level || 0) >= 1).slice(0, 4);

  const start = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current || !box.current) return;
    const viewW = box.current.clientWidth;
    const viewH = box.current.clientHeight;
    const next = clampCam(scene, drag.current.cx - (e.clientX - drag.current.x), drag.current.cy - (e.clientY - drag.current.y), viewW, viewH);
    setCam(next);
  };
  const end = () => {
    drag.current = null;
  };

  return (
    <div
      ref={box}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      style={{ position: "absolute", inset: 0, overflow: "hidden", touchAction: "none", background: "#1b120c" }}
    >
      <div style={{ position: "absolute", left: -cam.x, top: -cam.y, width: scene.w, height: scene.h, background: scene.ground }}>
        {scene.props.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: p.x, top: p.y, width: p.w, height: p.h, background: p.color, boxShadow: "inset 0 0 0 2px #2a1810" }} />
        ))}
        {scene.portals.map((p) => (
          <button
            key={p.to + p.label}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => props.onEnter(p.to as GameScene)}
            style={{ position: "absolute", left: p.x, top: p.y, width: p.w, height: p.h, background: "rgba(0,0,0,0.15)", border: "2px solid #2a1810", color: "#f4e1c1", fontSize: 10, fontWeight: 900 }}
          >
            {p.label}
          </button>
        ))}
        {walkers.map((p, i) => (
          <div key={p.id} className={"pawly-stroll pawly-stroll-" + (i % 4)} style={{ position: "absolute", top: 220 + i * 12, left: 80 }}>
            <PetRig pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name }} size={48} moving />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 8, top: 8, background: "#c9844a", color: "#3a2214", border: "3px solid #3a2214", fontSize: 10, fontWeight: 900, padding: "3px 6px", pointerEvents: "none" }}>
        drag map · {props.scene}
      </div>
    </div>
  );
}
