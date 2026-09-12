/**
 * PAWLY Pet Hub v0.6 video street — dapp/src/petHub.tsx
 * Street scene plays pet-hub-street.mp4 on loop (reference clip).
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePawlyWallet } from "./localWallet";

export const PET_SLOT_CAP = 10;
const STORE = "pawly_pet_hub_v1_";

type SceneId = "street" | "hospital" | "shelter" | "shop" | "hotel" | "groom" | "park";
type PetRec = {
  id: string;
  kind: string;
  species: string;
  name: string;
  emoji: string;
  hunger: number;
  health: number;
  streak: number;
  pricePawly?: number;
};

const COMPANIONS = [
  { species: "dog", label: "Dog", emoji: "🐶", pricePawly: 1000 },
  { species: "cat", label: "Cat", emoji: "🐱", pricePawly: 800 },
  { species: "rabbit", label: "Rabbit", emoji: "🐰", pricePawly: 600 },
];

const TITLE: Record<SceneId, string> = {
  street: "Tampines pet street",
  hospital: "Novena Pet Hospital",
  park: "East Coast dog park",
  shop: "Pet Shop",
  shelter: "Rescue Shelter",
  hotel: "Pet Hotel",
  groom: "Grooming Salon",
};

const SHOPS: { id: SceneId; label: string; emoji: string }[] = [
  { id: "shop", label: "Shop", emoji: "🛒" },
  { id: "hospital", label: "Hospital", emoji: "🏥" },
  { id: "shelter", label: "Rescue", emoji: "🏠" },
  { id: "hotel", label: "Hotel", emoji: "🌙" },
  { id: "groom", label: "Groom", emoji: "✂️" },
];

function loadPets(w: string): PetRec[] {
  try {
    const raw = localStorage.getItem(STORE + (w || "guest"));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as PetRec[]) : [];
  } catch {
    return [];
  }
}

const wrap: React.CSSProperties = { minHeight: "100vh", background: "#070b10", color: "#e8eef7" };
const ghost: React.CSSProperties = {
  background: "transparent",
  color: "#9ad7c2",
  border: "1px solid rgba(0,255,157,0.35)",
  borderRadius: 12,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
};
const primary: React.CSSProperties = {
  ...ghost,
  background: "linear-gradient(90deg,#00ff9d,#7cffc8)",
  color: "#052015",
  border: "none",
};

function asset(name: string) {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/dapp/";
  return (base.endsWith("/") ? base : base + "/") + name;
}

const SCENE_CLIP: Record<SceneId, string> = {
  street: "pet-hub-street.mp4",
  hospital: "pet-hub-hospital.mp4",
  park: "pet-hub-park.mp4",
  shop: "pet-hub-shop.mp4",
  shelter: "pet-hub-shelter.mp4",
  hotel: "pet-hub-hotel.mp4",
  groom: "pet-hub-groom.mp4",
};

function LivingStreet({ scene, onEnter }: { scene: SceneId; onEnter: (id: SceneId) => void }) {
  return (
    <div style={{ position: "relative", background: "#070b10" }}>
      <video
        key={scene}
        src={asset(SCENE_CLIP[scene])}
        autoPlay
        muted
        loop
        playsInline
        controls={false}
        style={{ width: "100%", height: "auto", display: "block", background: "#070b10" }}
      />
      <div style={{ display: "flex", gap: 6, padding: 8, overflowX: "auto" }}>
        {SHOPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onEnter(s.id)}
            style={{ ...ghost, flex: "0 0 auto", fontSize: 12, opacity: scene === s.id ? 1 : 0.75 }}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PetHubPage() {
  const navigate = useNavigate();
  const wallet = usePawlyWallet();
  const addr = (wallet.publicKey && wallet.publicKey.toString()) || "";
  const [scene, setScene] = useState<SceneId>("street");
  const [pets, setPets] = useState<PetRec[]>(() => loadPets(addr));
  const [pick, setPick] = useState("dog");
  const hint = useMemo(() => (addr ? addr.slice(0, 4) + "…" + addr.slice(-4) : "connect wallet"), [addr]);
  const spec = COMPANIONS.find((c) => c.species === pick) || COMPANIONS[0];

  const pay = (title: string, amount: number) => {
    const q = new URLSearchParams({ to: addr || "", token: "PAWLY", amount: String(amount), note: title });
    navigate("/payment?" + q.toString());
  };

  const adoptPay = () => {
    if (pets.length >= PET_SLOT_CAP) return;
    const next: PetRec[] = [
      ...pets,
      {
        id: "pet_" + Date.now(),
        kind: "adopted",
        species: spec.species,
        name: spec.label,
        emoji: spec.emoji,
        hunger: 70,
        health: 80,
        streak: 0,
        pricePawly: spec.pricePawly,
      },
    ];
    setPets(next);
    localStorage.setItem(STORE + (addr || "guest"), JSON.stringify(next));
    pay("Adopt " + spec.label, spec.pricePawly);
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 430, margin: "0 auto" }}>
        <div style={{ padding: "10px 12px 6px" }}>
          <div style={{ color: "#00ff9d", fontWeight: 800 }}>{TITLE[scene]}</div>
          <div style={{ color: "#89a", fontSize: 12 }}>Living street · tap a shop · {hint}</div>
        </div>
        <LivingStreet scene={scene} onEnter={setScene} />
        <div style={{ padding: 12 }}>
          {scene !== "street" ? (
            <button type="button" style={{ ...ghost, marginBottom: 10 }} onClick={() => setScene("street")}>
              Back to street
            </button>
          ) : (
            <button type="button" style={{ ...ghost, marginBottom: 10 }} onClick={() => setScene("park")}>
              Walk to park
            </button>
          )}
          {pets.length ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {pets.map((p) => (
                <span key={p.id} style={ghost}>
                  {p.emoji} {p.name}
                </span>
              ))}
            </div>
          ) : null}
          {scene === "shop" || scene === "street" ? (
            <div style={{ marginBottom: 12 }}>
              {COMPANIONS.map((c) => (
                <button key={c.species} type="button" style={{ ...ghost, margin: 4 }} onClick={() => setPick(c.species)}>
                  {c.emoji} {c.label} · {c.pricePawly}
                </button>
              ))}
              <button type="button" style={{ ...primary, display: "block", marginTop: 8 }} onClick={adoptPay}>
                Pay {spec.pricePawly} PAWLY to adopt {spec.label}
              </button>
            </div>
          ) : null}
          {scene === "hospital" ? (
            <button type="button" style={primary} onClick={() => pay("Hospital checkup", 120)}>
              Pay 120 PAWLY · checkup
            </button>
          ) : null}
          {scene === "park" ? (
            <button type="button" style={primary} onClick={() => pay("Walk the dog", 40)}>
              Pay 40 PAWLY · walk
            </button>
          ) : null}
          <div style={{ textAlign: "center", padding: "28px 0 32px" }}>
            <button type="button" style={{ ...ghost, minWidth: 220 }} onClick={() => navigate("/")}>
              ← Home / back to DApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
