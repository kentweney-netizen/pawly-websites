/** Pet Hub game kernel. New maps/characters are rows in these tables. */
export type SceneId = string;

export type Portal = { x: number; y: number; w: number; h: number; to: SceneId; label: string };
export type Prop = { x: number; y: number; w: number; h: number; color: string };
export type SceneDef = {
  id: SceneId;
  w: number;
  h: number;
  ground: string;
  props: Prop[];
  portals: Portal[];
};
export type Actor = {
  id: string;
  scene: SceneId;
  x: number;
  y: number;
  species?: string;
  name?: string;
  emoji?: string;
  level?: number;
  kind: "pet" | "npc";
};

export const SCENES: Record<string, SceneDef> = {
  street: {
    id: "street",
    w: 720,
    h: 480,
    ground: "#5d9e46",
    props: [
      { x: 0, y: 210, w: 720, h: 70, color: "#c9b48a" },
      { x: 0, y: 236, w: 720, h: 16, color: "#a89068" },
      { x: 40, y: 40, w: 110, h: 90, color: "#d9646a" },
      { x: 180, y: 40, w: 110, h: 90, color: "#5aa36a" },
      { x: 320, y: 36, w: 120, h: 96, color: "#6a7ad9" },
      { x: 470, y: 40, w: 110, h: 90, color: "#d9a85a" },
      { x: 60, y: 310, w: 120, h: 90, color: "#c9844a" },
      { x: 520, y: 310, w: 120, h: 90, color: "#3d6b32" },
      { x: 220, y: 330, w: 70, h: 56, color: "#6b5a48" },
      { x: 310, y: 330, w: 70, h: 56, color: "#6b5a48" },
      { x: 400, y: 330, w: 70, h: 56, color: "#6b5a48" },
    ],
    portals: [
      { x: 40, y: 40, w: 110, h: 90, to: "hospital", label: "HOSP" },
      { x: 180, y: 40, w: 110, h: 90, to: "shelter", label: "RESC" },
      { x: 320, y: 36, w: 120, h: 96, to: "hotel", label: "HOTEL" },
      { x: 470, y: 40, w: 110, h: 90, to: "groom", label: "GROOM" },
      { x: 60, y: 310, w: 120, h: 90, to: "shop", label: "SHOP" },
      { x: 520, y: 310, w: 120, h: 90, to: "park", label: "PARK" },
    ],
  },
  hospital: room("#8fb7c9", "#e8eef4", [{ x: 80, y: 140, w: 140, h: 80, color: "#f7f7f7" }, { x: 280, y: 140, w: 140, h: 80, color: "#f7f7f7" }]),
  shelter: room("#5a6b48", "#d7c4a0", [{ x: 60, y: 120, w: 90, h: 100, color: "#8a7a60" }, { x: 180, y: 120, w: 90, h: 100, color: "#8a7a60" }, { x: 300, y: 120, w: 90, h: 100, color: "#8a7a60" }]),
  shop: room("#6b3e22", "#c9a36a", [{ x: 40, y: 80, w: 400, h: 40, color: "#8a4f28" }, { x: 70, y: 180, w: 80, h: 70, color: "#e8c48a" }, { x: 200, y: 180, w: 80, h: 70, color: "#e8c48a" }]),
  hotel: room("#6a5a8a", "#e6d4c0", [{ x: 60, y: 130, w: 150, h: 90, color: "#c9b4e0" }, { x: 260, y: 130, w: 150, h: 90, color: "#c9b4e0" }]),
  groom: room("#c9a05a", "#f0e4d0", [{ x: 70, y: 110, w: 110, h: 80, color: "#fff6e0" }, { x: 250, y: 150, w: 140, h: 50, color: "#8ab4d9" }]),
  park: room("#3d6b32", "#6fbf5a", [{ x: 40, y: 50, w: 50, h: 80, color: "#2f7a3a" }, { x: 360, y: 40, w: 60, h: 90, color: "#2f7a3a" }]),
};

function room(wall: string, floor: string, extra: Prop[]): SceneDef {
  return {
    id: "",
    w: 480,
    h: 320,
    ground: wall,
    props: [{ x: 20, y: 40, w: 440, h: 240, color: floor }, ...extra],
    portals: [{ x: 190, y: 270, w: 100, h: 36, to: "street", label: "DOOR" }],
  };
}

export function clampCam(scene: SceneDef, camX: number, camY: number, viewW: number, viewH: number) {
  const maxX = Math.max(0, scene.w - viewW);
  const maxY = Math.max(0, scene.h - viewH);
  return {
    x: Math.min(maxX, Math.max(0, camX)),
    y: Math.min(maxY, Math.max(0, camY)),
  };
}
