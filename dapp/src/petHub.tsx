/**
 * PAWLY Pet Hub v0.4 map — dapp/src/components/petHub.tsx
 * No Phaser. Pixel scenes + tap doors. Pay goes to existing /payment.
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePawlyWallet } from "../localWallet";

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

const BG: Record<SceneId, string> = {
  street: "pet-hub-street.jpg",
  hospital: "pet-hub-hospital.jpg",
  park: "pet-hub-park.jpg",
  shop: "pet-hub-street.jpg",
  shelter: "pet-hub-street.jpg",
  hotel: "pet-hub-street.jpg",
  groom: "pet-hub-street.jpg",
};

const TITLE: Record<SceneId, string> = {
  street: "Tampines pet street",
  hospital: "Novena Pet Hospital",
  park: "East Coast dog park",
  shop: "Pet Supplies",
  shelter: "Rescue",
  hotel: "Pet Hotel",
  groom: "Grooming",
};

const DOORS: { id: SceneId; left: string; top: string; w: string; h: string; label: string }[] = [
  { id: "shop", left: "2%", top: "18%", w: "18%", h: "28%", label: "Shop" },
  { id: "hospital", left: "20%", top: "16%", w: "16%", h: "30%", label: "Hospital" },
  { id: "shelter", left: "37%", top: "18%", w: "16%", h: "28%", label: "Rescue" },
  { id: "hotel", left: "54%", top: "16%", w: "16%", h: "30%", label: "Hotel" },
  { id: "groom", left: "72%", top: "18%", w: "24%", h: "28%", label: "Groom" },
];

function asset(name: string) {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/dapp/";
  return (base.endsWith("/") ? base : base + "/") + name;
}

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
    const q = new URLSearchParams({
      to: addr || "",
      token: "PAWLY",
      amount: String(amount),
      note: title,
    });
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
          <div style={{ color: "#89a", fontSize: 12 }}>Tap a shop on the map · {hint}</div>
        </div>

        <div style={{ position: "relative", width: "100%", background: "#0b1020" }}>
          <img
            src={asset(BG[scene])}
            alt={TITLE[scene]}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
          {scene === "street"
            ? DOORS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setScene(d.id)}
                  style={{
                    position: "absolute",
                    left: d.left,
                    top: d.top,
                    width: d.w,
                    height: d.h,
                    background: "transparent",
                    border: "1px solid transparent",
                    cursor: "pointer",
                  }}
                  aria-label={d.label}
                />
              ))
            : null}
          {scene === "street" ? (
            <button
              type="button"
              onClick={() => setScene("park")}
              style={{ position: "absolute", right: 8, bottom: 12, ...ghost, fontSize: 12 }}
            >
              Park
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setScene("street")}
              style={{ position: "absolute", left: 8, bottom: 12, ...ghost, fontSize: 12 }}
            >
              Back to street
            </button>
          )}
        </div>

        <div style={{ padding: 12 }}>
          {pets.length ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {pets.map((p) => (
                <span key={p.id} style={ghost}>{p.emoji} {p.name}</span>
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
              <p style={{ color: "#89a", fontSize: 12 }}>Opens Payment. Token leaves the wallet only after you confirm the tx.</p>
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

          <div style={{ height: 36 }} />
          <div style={{ textAlign: "center", padding: "18px 0 28px" }}>
            <button type="button" style={{ ...ghost, minWidth: 220 }} onClick={() => navigate("/")}>
              ← Home / back to DApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


