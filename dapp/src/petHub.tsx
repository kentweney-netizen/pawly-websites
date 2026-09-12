/**
 * PAWLY Pet Hub v0.7 compact — dapp/src/petHub.tsx
 * One screen. Scene box always painted. Video overlays if public mp4 exists.
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
  park: "East Coast park",
  shop: "Pet Shop",
  shelter: "Rescue",
  hotel: "Pet Hotel",
  groom: "Grooming",
};

const SHOPS: { id: SceneId; label: string }[] = [
  { id: "shop", label: "Shop" },
  { id: "hospital", label: "Hospital" },
  { id: "shelter", label: "Rescue" },
  { id: "hotel", label: "Hotel" },
  { id: "groom", label: "Groom" },
  { id: "park", label: "Park" },
];

const CLIP: Record<SceneId, string> = {
  street: "pet-hub-street.mp4",
  hospital: "pet-hub-hospital.mp4",
  park: "pet-hub-park.mp4",
  shop: "pet-hub-shop.mp4",
  shelter: "pet-hub-shelter.mp4",
  hotel: "pet-hub-hotel.mp4",
  groom: "pet-hub-groom.mp4",
};

const SKY: Record<SceneId, string> = {
  street: "linear-gradient(#2a1248 0%,#6b2d6e 38%,#12161e 70%)",
  hospital: "linear-gradient(#06141c,#0b2430)",
  park: "linear-gradient(#3a1548 0%,#e07a3a 50%,#2d7a3a 80%)",
  shop: "linear-gradient(#1a1030,#2a1848)",
  shelter: "linear-gradient(#0c1418,#152028)",
  hotel: "linear-gradient(#1a1230,#2a1840)",
  groom: "linear-gradient(#142028,#1c2a30)",
};

function loadPets(w: string): PetRec[] {
  try {
    const raw = localStorage.getItem(STORE + (w || "guest"));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as PetRec[]) : [];
  } catch {
    return [];
  }
}

function asset(name: string) {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/dapp/";
  return (base.endsWith("/") ? base : base + "/") + name;
}

const ghost: React.CSSProperties = {
  background: "rgba(0,0,0,0.45)",
  color: "#c8ffe8",
  border: "1px solid rgba(0,255,157,0.4)",
  borderRadius: 10,
  padding: "6px 8px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 11,
};
const primary: React.CSSProperties = {
  ...ghost,
  background: "linear-gradient(90deg,#00ff9d,#7cffc8)",
  color: "#052015",
  border: "none",
  fontSize: 13,
  padding: "10px 12px",
};

export function PetHubPage() {
  const navigate = useNavigate();
  const wallet = usePawlyWallet();
  const addr = (wallet.publicKey && wallet.publicKey.toString()) || "";
  const [scene, setScene] = useState<SceneId>("street");
  const [pets, setPets] = useState<PetRec[]>(() => loadPets(addr));
  const [pick, setPick] = useState("dog");
  const spec = COMPANIONS.find((c) => c.species === pick) || COMPANIONS[0];
  const hint = useMemo(() => (addr ? addr.slice(0, 4) + "…" + addr.slice(-4) : "wallet"), [addr]);

  const pay = (title: string, amount: number) => {
    navigate("/payment?" + new URLSearchParams({ to: addr || "", token: "PAWLY", amount: String(amount), note: title }).toString());
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
    <div
      style={{
        minHeight: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
        background: "#070b10",
        color: "#e8eef7",
        display: "flex",
        flexDirection: "column",
        maxWidth: 430,
        margin: "0 auto",
      }}
    >
      <div style={{ padding: "8px 10px 4px", flex: "0 0 auto" }}>
        <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 16 }}>{TITLE[scene]}</div>
        <div style={{ color: "#7a8a99", fontSize: 11 }}>{hint}</div>
      </div>

      <div style={{ position: "relative", flex: "1 1 auto", minHeight: 210, maxHeight: 280, background: SKY[scene], overflow: "hidden" }}>
        <style>{`
          @keyframes phWalk { from { transform: translateX(-30px); } to { transform: translateX(110%); } }
          .phw { position:absolute; bottom:18%; font-size:22px; animation: phWalk 8s linear infinite; }
        `}</style>
        {scene === "street" ? (
          <>
            <div style={{ position: "absolute", left: 6, right: 6, top: "22%", display: "flex", gap: 4 }}>
              {["SHOP", "HOSP", "RESC", "HOTEL", "GROOM"].map((t) => (
                <div key={t} style={{ flex: 1, height: 54, border: "1px solid #00ff9d", borderRadius: 6, background: "#0c1c16", color: "#9ff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {t}
                </div>
              ))}
            </div>
            <div className="phw">🚶🐕</div>
            <div className="phw" style={{ animationDelay: "-3s", bottom: "10%", fontSize: 18 }}>🚶🐈</div>
          </>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 }}>
            {scene === "hospital" ? "🏥🐶🐱" : scene === "park" ? "🌅🐕" : scene === "shop" ? "🛒🐾" : scene === "shelter" ? "🏠🐕" : scene === "hotel" ? "🌙🐾" : "✂️🐶"}
          </div>
        )}
        <video
          key={scene}
          src={asset(CLIP[scene])}
          autoPlay
          muted
          loop
          playsInline
          onError={(e) => {
            (e.currentTarget as HTMLVideoElement).style.display = "none";
          }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 6, display: "flex", gap: 4, padding: "0 6px", overflowX: "auto" }}>
          {SHOPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScene(s.id)}
              style={{ ...ghost, flex: "0 0 auto", background: scene === s.id ? "rgba(0,255,157,0.25)" : ghost.background }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: "0 0 auto", padding: "8px 10px 10px" }}>
        {pets.length ? (
          <div style={{ fontSize: 12, marginBottom: 6 }}>{pets.map((p) => p.emoji + p.name).join("  ")}</div>
        ) : null}
        {(scene === "street" || scene === "shop") && (
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            {COMPANIONS.map((c) => (
              <button key={c.species} type="button" style={{ ...ghost, flex: 1 }} onClick={() => setPick(c.species)}>
                {c.emoji} {c.pricePawly}
              </button>
            ))}
          </div>
        )}
        {(scene === "street" || scene === "shop") && (
          <button type="button" style={{ ...primary, width: "100%" }} onClick={adoptPay}>
            Pay {spec.pricePawly} PAWLY · adopt {spec.label}
          </button>
        )}
        {scene === "hospital" && (
          <button type="button" style={{ ...primary, width: "100%" }} onClick={() => pay("Hospital checkup", 120)}>
            Pay 120 PAWLY · checkup
          </button>
        )}
        {scene === "park" && (
          <button type="button" style={{ ...primary, width: "100%" }} onClick={() => pay("Walk the dog", 40)}>
            Pay 40 PAWLY · walk
          </button>
        )}
        {scene === "shelter" && (
          <button type="button" style={{ ...primary, width: "100%" }} onClick={() => pay("Rescue donate", 200)}>
            Pay 200 PAWLY · rescue
          </button>
        )}
        {(scene === "hotel" || scene === "groom") && (
          <button type="button" style={{ ...primary, width: "100%" }} onClick={() => pay(TITLE[scene], scene === "hotel" ? 180 : 90)}>
            Pay {scene === "hotel" ? 180 : 90} PAWLY
          </button>
        )}
        <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => navigate("/")}>
          ← Home
        </button>
      </div>
    </div>
  );
}

