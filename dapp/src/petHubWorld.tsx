import React from "react";

export type RoomId = "street" | "shop" | "hospital" | "shelter" | "hotel" | "groom" | "park";
export type DeskId = "" | "nft" | "market" | "breed";

/** Percent boxes over pet-hub-street.mp4 (Tampines dusk plate). */
export const STREET_ZONES: { id: RoomId; left: string; top: string; width: string; height: string; label: string }[] = [
  { id: "hospital", left: "0%", top: "14%", width: "16%", height: "36%", label: "Hospital" },
  { id: "shelter", left: "16%", top: "12%", width: "22%", height: "38%", label: "Rescue" },
  { id: "hotel", left: "38%", top: "10%", width: "24%", height: "40%", label: "Hotel" },
  { id: "groom", left: "62%", top: "14%", width: "24%", height: "36%", label: "Groom" },
  { id: "shop", left: "2%", top: "58%", width: "22%", height: "22%", label: "Shop" },
  { id: "park", left: "78%", top: "58%", width: "20%", height: "24%", label: "Park" },
];

export function StreetHotspots(props: { onEnter: (id: RoomId) => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
      {STREET_ZONES.map((z) => (
        <button
          key={z.id}
          type="button"
          aria-label={z.label}
          onClick={() => props.onEnter(z.id)}
          style={{
            position: "absolute",
            left: z.left,
            top: z.top,
            width: z.width,
            height: z.height,
            background: "transparent",
            border: "0",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: "50%",
              top: 4,
              transform: "translateX(-50%)",
              background: "rgba(5,20,16,0.72)",
              color: "#b8ffe0",
              border: "1px solid rgba(0,255,157,0.35)",
              borderRadius: 8,
              fontSize: 9,
              fontWeight: 800,
              padding: "2px 6px",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {z.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export function GameHud(props: {
  hint: string;
  scene: RoomId;
  desk: DeskId;
  music: boolean;
  onMusic: () => void;
  onStreet: () => void;
  onDesk: (d: DeskId) => void;
  onHome: () => void;
}) {
  const tab = (id: DeskId, label: string) => (
    <button
      type="button"
      onClick={() => props.onDesk(props.desk === id ? "" : id)}
      style={{
        flex: 1,
        minHeight: 40,
        borderRadius: 12,
        border: "1px solid rgba(0,255,157,0.35)",
        background: props.desk === id ? "rgba(0,255,157,0.28)" : "rgba(0,0,0,0.45)",
        color: "#d8ffe8",
        fontWeight: 800,
        fontSize: 11,
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ padding: "6px 8px 8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 13 }}>{props.scene === "street" ? "Tampines overworld" : props.scene}</div>
          <div style={{ color: "#8aa", fontSize: 10 }}>{props.hint}</div>
        </div>
        <button type="button" onClick={props.onMusic} style={{ background: "rgba(0,0,0,0.45)", color: "#c8ffe8", border: "1px solid rgba(0,255,157,0.3)", borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 700 }}>
          {props.music ? "BGM" : "BGM off"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={props.onStreet} style={{ flex: 1, minHeight: 40, borderRadius: 12, border: "1px solid rgba(0,255,157,0.35)", background: props.scene === "street" && !props.desk ? "rgba(0,255,157,0.28)" : "rgba(0,0,0,0.45)", color: "#d8ffe8", fontWeight: 800, fontSize: 11 }}>Map</button>
        {tab("nft", "NFT")}
        {tab("market", "Market")}
        {tab("breed", "Breed")}
        <button type="button" onClick={props.onHome} style={{ flex: 1, minHeight: 40, borderRadius: 12, border: "1px solid rgba(0,255,157,0.35)", background: "rgba(0,0,0,0.45)", color: "#d8ffe8", fontWeight: 800, fontSize: 11 }}>Home</button>
      </div>
    </div>
  );
}
