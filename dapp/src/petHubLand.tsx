import React from "react";
import { PetRig } from "./petAvatar";

export type RoomId = "street" | "shop" | "hospital" | "shelter" | "hotel" | "groom" | "park";

const WOOD = {
  bg: "#2b1d14",
  panel: "#c9844a",
  slot: "#1b120c",
  cream: "#f4e1c1",
};

export const PLOT: { id: RoomId; left: string; top: string; label: string }[] = [
  { id: "hospital", left: "3%", top: "16%", label: "Hospital" },
  { id: "shelter", left: "22%", top: "14%", label: "Rescue" },
  { id: "hotel", left: "44%", top: "12%", label: "Hotel" },
  { id: "groom", left: "66%", top: "16%", label: "Groom" },
  { id: "shop", left: "8%", top: "62%", label: "Pet Shop" },
  { id: "park", left: "76%", top: "62%", label: "Park" },
];

const LOCKED_PLOTS = [
  { left: "30%", top: "64%", label: "Stall A" },
  { left: "46%", top: "66%", label: "Stall B" },
  { left: "60%", top: "64%", label: "Stall C" },
];

const plaque: React.CSSProperties = {
  background: WOOD.panel,
  color: "#3a2214",
  border: "3px solid #3a2214",
  boxShadow: "2px 2px 0 #1b120c",
  borderRadius: 0,
  fontWeight: 900,
  fontSize: 10,
  padding: "3px 6px",
  lineHeight: 1.1,
};

export function LandPlots(props: { onEnter: (id: RoomId) => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
      {PLOT.map((z) => (
        <button key={z.id} type="button" onClick={() => props.onEnter(z.id)} style={{ position: "absolute", left: z.left, top: z.top, background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>
          <span style={plaque}>{z.label}</span>
        </button>
      ))}
      {LOCKED_PLOTS.map((z) => (
        <div key={z.label} style={{ position: "absolute", left: z.left, top: z.top, opacity: 0.75, pointerEvents: "none" }}>
          <span style={{ ...plaque, background: "#6b5a48", color: "#efe6d6" }}>{z.label} locked</span>
        </div>
      ))}
    </div>
  );
}

export function LandHud(props: {
  hint: string;
  slots: number;
  cap: number;
  minted: number;
  music: boolean;
  onMusic: () => void;
  onMap: () => void;
  onHome: () => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 8px 6px", background: WOOD.bg }}>
      <div style={{ ...plaque, display: "flex", gap: 8, alignItems: "center" }}>
        <span>PAWLY TOWN</span>
        <span style={{ fontSize: 9 }}>{props.hint}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <span style={plaque}>{props.slots}/{props.cap} pets</span>
        <span style={plaque}>{props.minted} NFT</span>
        <button type="button" onClick={props.onMusic} style={plaque}>{props.music ? "BGM" : "MUTE"}</button>
        <button type="button" onClick={props.onMap} style={plaque}>MAP</button>
        <button type="button" onClick={props.onHome} style={plaque}>HOME</button>
      </div>
    </div>
  );
}

export function LandHotbar(props: {
  pets: { id: string; species: string; name: string; emoji: string; level?: number }[];
  focusId: string;
  onFocus: (id: string) => void;
}) {
  const cells = Array.from({ length: 10 }, (_, i) => props.pets[i] || null);
  return (
    <div style={{ display: "flex", gap: 4, padding: "6px 6px 8px", background: WOOD.bg, overflowX: "auto" }}>
      {cells.map((p, i) => (
        <button
          key={p ? p.id : "empty-" + i}
          type="button"
          disabled={!p}
          onClick={() => p && props.onFocus(p.id)}
          style={{
            width: 52,
            height: 52,
            flex: "0 0 auto",
            background: WOOD.slot,
            border: props.focusId && p && p.id === props.focusId ? "3px solid #f0d060" : "3px solid #3a2214",
            padding: 0,
          }}
        >
          {p ? (
            <>
              <PetRig pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name }} size={36} />
              <div style={{ fontSize: 8, color: WOOD.cream, marginTop: -2 }}>Lv{Number(p.level || 0)}</div>
            </>
          ) : (
            <span style={{ color: "#5a4030", fontSize: 10 }}>+</span>
          )}
        </button>
      ))}
    </div>
  );
}
