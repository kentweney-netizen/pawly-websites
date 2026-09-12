/**
 * PAWLY Pet Hub v0.5 live street — dapp/src/petHub.tsx
 * CSS motion always on. JPG is optional overlay if public files exist.
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

function LivingStreet({ scene, onEnter }: { scene: SceneId; onEnter: (id: SceneId) => void }) {
  const sky =
    scene === "park"
      ? "linear-gradient(#3a1548 0%, #e07a3a 45%, #5aa0c8 70%)"
      : scene === "hospital"
      ? "linear-gradient(#06141c,#0b2430)"
      : "linear-gradient(#1a1038 0%, #6b2d6e 40%, #0b1220 70%)";
  return (
    <div style={{ position: "relative", height: 320, overflow: "hidden", background: sky }}>
      <style>{`
        @keyframes pawlyWalk { from { transform: translateX(-40px); } to { transform: translateX(360px); } }
        @keyframes pawlyWalkBack { from { transform: translateX(360px) scaleX(-1); } to { transform: translateX(-40px) scaleX(-1); } }
        @keyframes pawlyBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes pawlyRunIn { from { transform: translate(140px, 40px) scale(.4); opacity: 0; } to { transform: translate(0,0) scale(1); opacity: 1; } }
        @keyframes pawlyWag { 0%,100% { transform: rotate(-12deg); } 50% { transform: rotate(12deg); } }
        @keyframes pawlyBlink { 0%,20%,100% { opacity: 1; } 10% { opacity: .35; } }
        .ph-actor { position:absolute; font-size:26px; line-height:1; animation: pawlyWalk 9s linear infinite; }
        .ph-actor.rev { animation: pawlyWalkBack 11s linear infinite; }
        .ph-pet { display:inline-block; animation: pawlyBounce .6s ease-in-out infinite; }
        .ph-run { animation: pawlyRunIn .7s ease-out both; }
        .ph-shop { animation: pawlyBlink 3.4s ease-in-out infinite; }
      `}</style>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(#fff6 1px, transparent 1px)", backgroundSize: "18px 18px", opacity: 0.12 }} />
      {scene === "street" || scene === "shop" || scene === "shelter" || scene === "hotel" || scene === "groom" ? (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 78, display: "flex", gap: 6, padding: "0 6px" }}>
            {SHOPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className="ph-shop"
                onClick={() => onEnter(s.id)}
                style={{
                  flex: 1,
                  height: 88,
                  border: "1px solid #00ff9d",
                  borderRadius: 8,
                  background: "linear-gradient(#123,#0a1c16)",
                  color: "#9fffd6",
                  fontSize: 11,
                  fontWeight: 800,
                  animationDelay: i * 0.4 + "s",
                }}
              >
                {s.emoji}
                <br />
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 168, height: 36, background: "#2a3142" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 204, height: 70, background: "#151920" }} />
          <div className="ph-actor" style={{ top: 176 }}>🚶‍♂️<span className="ph-pet">🐕</span></div>
          <div className="ph-actor rev" style={{ top: 188, animationDelay: "-4s" }}>🚶‍♀️<span className="ph-pet">🐈</span></div>
          <div className="ph-actor" style={{ top: 230, animationDuration: "13s", fontSize: 22 }}>🚶‍♀️<span className="ph-pet">🐩</span></div>
        </>
      ) : null}
      {scene === "hospital" ? (
        <>
          <div style={{ position: "absolute", left: 12, top: 70, width: 120, height: 90, background: "#0d2a32", border: "1px solid #3ee0c0", borderRadius: 8, color: "#9ff", padding: 8, fontSize: 12 }}>👩‍⚕️ Dr.Tan</div>
          <div className="ph-run" style={{ position: "absolute", left: 150, top: 120, fontSize: 42 }}>🐶</div>
          <div className="ph-run" style={{ position: "absolute", left: 210, top: 128, fontSize: 36, animationDelay: ".15s" }}>🐱</div>
        </>
      ) : null}
      {scene === "park" ? (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120, background: "linear-gradient(#2d7a3a,#16351c)" }} />
          <div className="ph-actor" style={{ top: 180, fontSize: 34 }}>🧑‍🦱<span className="ph-pet">🐕</span></div>
          <div style={{ position: "absolute", right: 24, top: 90, fontSize: 22 }}>🦆🦆🦆</div>
        </>
      ) : null}
      <div className="ph-run" style={{ position: "absolute", left: "42%", bottom: 18, fontSize: 40 }}>
        <span style={{ display: "inline-block", animation: "pawlyWag .35s ease-in-out infinite" }}>🐾</span>
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
