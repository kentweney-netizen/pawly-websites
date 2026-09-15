import React from "react";
import type { PetRec, SceneId } from "./petGame";

const DOORS: { id: SceneId; label: string }[] = [
  { id: "shop", label: "Shop" },
  { id: "shelter", label: "Rescue" },
  { id: "hospital", label: "Hospital" },
  { id: "hotel", label: "Hotel" },
  { id: "groom", label: "Groom" },
  { id: "park", label: "Park" },
  { id: "nft", label: "NFT" },
  { id: "market", label: "Market" },
  { id: "breed", label: "Breed" },
];

function asset(name: string) {
  const env = import.meta as unknown as { env?: { BASE_URL?: string } };
  const base = (env.env && env.env.BASE_URL) || "/dapp/";
  const prefix = base.endsWith("/") ? base : base + "/";
  return prefix + "game/" + name;
}

export function PetLiveWorld(props: {
  pets: PetRec[];
  scene: SceneId;
  onEnter: (id: SceneId) => void;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#12081a" }}>
      <video
        autoPlay
        muted
        loop
        playsInline
        poster={asset("town.jpg")}
        src={asset("street-walk.mp4")}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div style={{ position: "absolute", left: 8, top: 8, display: "flex", flexWrap: "wrap", gap: 4, maxWidth: "72%" }}>
        {DOORS.map(function (d) {
          return (
            <button
              key={d.id}
              type="button"n              onClick={function () {
                props.onEnter(d.id);
              }}
              style={{ background: "rgba(8,20,14,0.72)", color: "#f4e1c1", border: "1px solid #7dffb2", borderRadius: 8, padding: "4px 8px", fontSize: 11 }}
            >
              {d.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
