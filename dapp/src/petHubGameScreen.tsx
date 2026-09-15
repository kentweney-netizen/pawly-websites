import React from "react";
import { PetRig } from "./petAvatar";

export type GameScene = "street" | "hospital" | "shelter" | "shop" | "hotel" | "groom" | "park";

type PetLite = { id: string; species: string; name: string; emoji: string; level?: number };

const BUILDINGS: { id: GameScene; x: number; y: number; w: number; h: number; roof: string; wall: string; label: string }[] = [
  { id: "hospital", x: 4, y: 6, w: 18, h: 16, roof: "#d9646a", wall: "#f2d6d8", label: "HOSP" },
  { id: "shelter", x: 26, y: 6, w: 18, h: 16, roof: "#5aa36a", wall: "#d7edd8", label: "RESC" },
  { id: "hotel", x: 48, y: 5, w: 20, h: 17, roof: "#6a7ad9", wall: "#d5dbf5", label: "HOTEL" },
  { id: "groom", x: 72, y: 6, w: 18, h: 16, roof: "#d9a85a", wall: "#f3e4c6", label: "GROOM" },
  { id: "shop", x: 8, y: 46, w: 20, h: 16, roof: "#c9844a", wall: "#f0d2b0", label: "SHOP" },
  { id: "park", x: 70, y: 46, w: 20, h: 16, roof: "#3d6b32", wall: "#b7d48a", label: "PARK" },
];

const ROOMS: Record<Exclude<GameScene, "street">, { floor: string; wall: string; props: { x: number; y: number; w: number; h: number; c: string }[] }> = {
  shop: { floor: "#c9a36a", wall: "#6b3e22", props: [{ x: 8, y: 18, w: 84, h: 10, c: "#8a4f28" }, { x: 12, y: 42, w: 16, h: 14, c: "#e8c48a" }, { x: 36, y: 42, w: 16, h: 14, c: "#e8c48a" }, { x: 60, y: 42, w: 16, h: 14, c: "#e8c48a" }] },
  hospital: { floor: "#e8eef4", wall: "#8fb7c9", props: [{ x: 10, y: 28, w: 28, h: 16, c: "#f7f7f7" }, { x: 52, y: 28, w: 28, h: 16, c: "#f7f7f7" }, { x: 40, y: 8, w: 20, h: 8, c: "#d9646a" }] },
  shelter: { floor: "#d7c4a0", wall: "#5a6b48", props: [{ x: 8, y: 24, w: 20, h: 22, c: "#8a7a60" }, { x: 34, y: 24, w: 20, h: 22, c: "#8a7a60" }, { x: 60, y: 24, w: 20, h: 22, c: "#8a7a60" }] },
  hotel: { floor: "#e6d4c0", wall: "#6a5a8a", props: [{ x: 12, y: 26, w: 30, h: 20, c: "#c9b4e0" }, { x: 52, y: 26, w: 30, h: 20, c: "#c9b4e0" }] },
  groom: { floor: "#f0e4d0", wall: "#c9a05a", props: [{ x: 14, y: 22, w: 22, h: 18, c: "#fff6e0" }, { x: 52, y: 30, w: 28, h: 10, c: "#8ab4d9" }] },
  park: { floor: "#6fbf5a", wall: "#3d6b32", props: [{ x: 10, y: 12, w: 10, h: 16, c: "#2f7a3a" }, { x: 70, y: 10, w: 12, h: 18, c: "#2f7a3a" }, { x: 30, y: 40, w: 40, h: 8, c: "#5aa34a" }] },
};

function House(b: (typeof BUILDINGS)[number], onEnter: (id: GameScene) => void) {
  return (
    <button key={b.id} type="button" onClick={() => onEnter(b.id)} style={{ position: "absolute", left: b.x + "%", top: b.y + "%", width: b.w + "%", height: b.h + "%", padding: 0, border: "2px solid #2a1810", background: "transparent", imageRendering: "pixelated" }}>
      <div style={{ position: "absolute", left: "8%", top: 0, width: "84%", height: "38%", background: b.roof }} />
      <div style={{ position: "absolute", left: "12%", top: "34%", width: "76%", height: "58%", background: b.wall }} />
      <div style={{ position: "absolute", left: "42%", top: "58%", width: "16%", height: "34%", background: "#3a2214" }} />
      <div style={{ position: "absolute", left: 0, bottom: -14, width: "100%", fontSize: 8, fontWeight: 900, color: "#f4e1c1", textShadow: "1px 1px 0 #2a1810" }}>{b.label}</div>
    </button>
  );
}

export function PetHubGameScreen(props: {
  scene: GameScene;
  pets: PetLite[];
  onEnter: (id: GameScene) => void;
}) {
  const walkers = props.pets.filter((p) => Number(p.level || 0) >= 1).slice(0, 4);
  const indoors = props.scene !== "street";
  const room = indoors ? ROOMS[props.scene] : null;

  return (
    <div className="pawly-game-cam" style={{ position: "absolute", inset: 0, overflow: "hidden", imageRendering: "pixelated" }}>
      {!indoors ? (
        <>
          <div style={{ position: "absolute", inset: 0, background: "#5d9e46" }} />
          <div style={{ position: "absolute", left: "6%", top: "28%", width: "88%", height: "16%", background: "#c9b48a" }} />
          <div style={{ position: "absolute", left: "6%", top: "30%", width: "88%", height: "4%", background: "#a89068" }} />
          <div style={{ position: "absolute", left: "18%", top: "28%", width: "10%", height: "36%", background: "#c9b48a" }} />
          <div style={{ position: "absolute", left: 8, top: 8, fontSize: 10, fontWeight: 900, color: "#204018" }}>PAWLY TOWN</div>
          {BUILDINGS.map((b) => House(b, props.onEnter))}
          {[0, 1, 2].map((i) => (
            <div key={"lock-" + i} style={{ position: "absolute", left: 28 + i * 16 + "%", top: "66%", width: "12%", height: "10%", background: "#6b5a48", border: "2px dashed #3a2214", fontSize: 8, color: "#efe6d6", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
              STALL
            </div>
          ))}
        </>
      ) : (
        <>
          <div style={{ position: "absolute", inset: 0, background: room!.wall }} />
          <div style={{ position: "absolute", left: "4%", top: "16%", width: "92%", height: "72%", background: room!.floor, boxShadow: "inset 0 0 0 4px #2a1810" }} />
          {room!.props.map((p, i) => (
            <div key={i} style={{ position: "absolute", left: p.x + "%", top: p.y + "%", width: p.w + "%", height: p.h + "%", background: p.c, border: "2px solid #2a1810" }} />
          ))}
          <button type="button" onClick={() => props.onEnter("street")} style={{ position: "absolute", left: "40%", bottom: "6%", width: "20%", height: "10%", background: "#3a2214", color: "#f4e1c1", border: "2px solid #1b120c", fontSize: 9, fontWeight: 900 }}>
            DOOR
          </button>
        </>
      )}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {walkers.map((p, i) => (
          <div key={p.id} className={"pawly-stroll pawly-stroll-" + (i % 4)} style={{ bottom: indoors ? 18 + i * 6 + "%" : undefined }}>
            <PetRig pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name }} size={indoors ? 48 : 56} moving />
          </div>
        ))}
      </div>
    </div>
  );
}
