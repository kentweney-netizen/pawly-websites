/**
 * PAWLY Pet Hub v0.1-SG — 复制到 dapp/src/petHub.tsx
 * 赛博 + Sunflower 卡通场景。新加坡五店。
 * 家宠/暗宠/飞禽可养；救助站选濒危或流浪；用品店含皮肤。
 * 进场动态：跑来、摇尾巴、讨抱/零食。CSS 动画，无游戏引擎。
 * 救助奖状邮件：无邮箱先弹窗。链上换币进池下一刀。
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePawlyWallet } from "./localWallet";

export const PET_SLOT_CAP = 10;
const STORE_PREFIX = "pawly_pet_hub_v1_";

const COMPANIONS = [
  { species: "cat", label: "Cat", emoji: "🐱", pricePawly: 800 },
  { species: "dog", label: "Dog", emoji: "🐶", pricePawly: 1000 },
  { species: "rabbit", label: "Rabbit", emoji: "🐰", pricePawly: 600 },
  { species: "hamster", label: "Hamster", emoji: "🐹", pricePawly: 280 },
  { species: "parrot", label: "Parrot", emoji: "🦜", pricePawly: 900 },
  { species: "chicken", label: "Chicken", emoji: "🐔", pricePawly: 350 },
  { species: "duck", label: "Duck", emoji: "🦆", pricePawly: 350 },
  { species: "pig", label: "Mini pig", emoji: "🐷", pricePawly: 1200 },
  { species: "alpaca", label: "Alpaca", emoji: "🦙", pricePawly: 1600 },
  { species: "lizard", label: "Lizard", emoji: "🦎", pricePawly: 500 },
  { species: "snake", label: "Snake", emoji: "🐍", pricePawly: 700 },
  { species: "gecko", label: "Gecko", emoji: "🦎", pricePawly: 420 },
  { species: "beetle", label: "Beetle", emoji: "🪲", pricePawly: 220 },
  { species: "spider", label: "Tarantula", emoji: "🕷️", pricePawly: 260 },
  { species: "mantis", label: "Mantis", emoji: "🦗", pricePawly: 200 },
];

const SKINS = [
  { id: "neon", label: "Neon cyber coat", pawly: 90 },
  { id: "forest", label: "Forest cape", pawly: 70 },
  { id: "street", label: "Street jacket", pawly: 80 },
  { id: "royal", label: "Royal ribbon", pawly: 110 },
  { id: "pixel", label: "Pixel hoodie", pawly: 75 },
];

const SHELTER_CAUSES = [
  { id: "stray-cat", label: "Stray cat", emoji: "🐈", pawly: 80, kind: "stray" },
  { id: "stray-dog", label: "Stray dog", emoji: "🐕", pawly: 80, kind: "stray" },
  { id: "orangutan", label: "Orangutan", emoji: "🦧", pawly: 200, kind: "endangered" },
  { id: "sunbear", label: "Sun bear", emoji: "🐻", pawly: 200, kind: "endangered" },
  { id: "tiger", label: "Malayan tiger", emoji: "🐯", pawly: 240, kind: "endangered" },
  { id: "turtle", label: "Sea turtle", emoji: "🐢", pawly: 160, kind: "endangered" },
  { id: "hornbill", label: "Hornbill", emoji: "🐦", pawly: 140, kind: "endangered" },
  { id: "elephant", label: "Asian elephant", emoji: "🐘", pawly: 240, kind: "endangered" },
  { id: "pangolin", label: "Pangolin", emoji: "🦔", pawly: 180, kind: "endangered" },
  { id: "gibbon", label: "Gibbon", emoji: "🐒", pawly: 180, kind: "endangered" },
];

const PLACES = [
  {
    id: "hospital",
    emoji: "🏥",
    name: "Pet Hospital",
    nameZh: "宠物医院",
    area: "Novena",
    npcs: ["Dr. Tan"],
    services: [
      { id: "checkup", label: "Checkup / 体检", pawly: 120, hunger: 0, health: 18 },
      { id: "vaccine", label: "Vaccine / 疫苗", pawly: 180, hunger: 0, health: 22 },
    ],
  },
  {
    id: "shelter",
    emoji: "🏡",
    name: "Rescue Shelter",
    nameZh: "救助站",
    area: "Sungei Tengah",
    npcs: ["Officer Mei"],
    services: [],
  },
  {
    id: "shop",
    emoji: "🛒",
    name: "Pet Supplies",
    nameZh: "用品店",
    area: "Tampines",
    npcs: ["Clerk Ben"],
    services: [
      { id: "food", label: "Food / 粮食", pawly: 80, hunger: 22, health: 4 },
      { id: "toy", label: "Toy / 玩具", pawly: 60, hunger: 4, health: 8 },
    ],
  },
  {
    id: "hotel",
    emoji: "🏨",
    name: "Pet Hotel",
    nameZh: "宠物酒店",
    area: "Changi",
    npcs: ["Front desk Aisha"],
    services: [{ id: "night", label: "One night / 过夜", pawly: 150, hunger: -6, health: 12 }],
  },
  {
    id: "groom",
    emoji: "✂️",
    name: "Grooming Salon",
    nameZh: "美容店",
    area: "Orchard",
    npcs: ["Clerk Sam", "Groomer Lina"],
    services: [
      { id: "bath", label: "Bath / 洗澡", pawly: 100, hunger: 0, health: 10 },
      { id: "style", label: "Style / 造型", pawly: 140, hunger: 0, health: 14 },
    ],
  },
];

function walletKey(w) {
  return (w && String(w)) || "guest";
}

function loadPets(w) {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + walletKey(w));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function savePets(w, list) {
  localStorage.setItem(STORE_PREFIX + walletKey(w), JSON.stringify(list.slice(0, PET_SLOT_CAP)));
}

function uid() {
  return "pet_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

const wrap = {
  minHeight: "100vh",
  background: "radial-gradient(1200px 600px at 20% 0%, #12382c 0%, #0b1020 45%, #070b14 100%)",
  color: "#e8eef7",
  padding: "18px 16px 40px",
};
const card = {
  background: "rgba(10,28,24,0.72)",
  border: "1px solid rgba(0,255,157,0.18)",
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 0 24px rgba(0,255,157,0.06)",
};
const ghost = {
  background: "transparent",
  color: "#9ad7c2",
  border: "1px solid rgba(0,255,157,0.35)",
  borderRadius: 12,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
};
const primary = {
  ...ghost,
  background: "linear-gradient(90deg,#00ff9d,#7cffc8)",
  color: "#052015",
  border: "none",
};


const MOTION = `
@keyframes pawRun { 0%{ transform: translateX(-70px) scale(0.7); opacity:0 } 55%{ transform: translateX(8px) scale(1.08); opacity:1 } 100%{ transform: translateX(0) scale(1); opacity:1 } }
@keyframes pawWag { 0%,100%{ transform: rotate(-14deg) } 50%{ transform: rotate(14deg) } }
@keyframes pawBounce { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-7px) } }
@keyframes pawPop { 0%{ transform: scale(.6); opacity:0 } 40%{ transform: scale(1.12); opacity:1 } 100%{ transform: scale(1); opacity:1 } }
`;

function AnimPet({ emoji, delay = 0, size = 36 }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: size,
        lineHeight: 1,
        animation: "pawRun 0.7s ease-out both, pawWag 0.55s ease-in-out 0.7s 4, pawBounce 1.1s ease-in-out 2.9s infinite",
        animationDelay: delay + "s, " + (0.7 + delay) + "s, " + (2.9 + delay) + "s",
      }}
    >
      {emoji}
    </span>
  );
}

function GreetingYard({ pets, onSnack, onHug }) {
  const list = (pets && pets.length ? pets : [{ id: "guest", emoji: "🐾", name: "Paw" }]).slice(0, 6);
  const lines = ["Wag wag!", "Pick me up!", "Snack please!", "Missed you!", "Treat?"];
  return (
    <div style={{
      ...card,
      marginBottom: 12,
      overflow: "hidden",
      background: "linear-gradient(180deg, rgba(0,40,32,0.9), rgba(10,28,24,0.8))",
    }}>
      <style>{MOTION}</style>
      <div style={{ fontSize: 12, color: "#9ad7c2", marginBottom: 8 }}>They saw you come in</div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", minHeight: 64, flexWrap: "wrap" }}>
        {list.map((p, i) => (
          <div key={p.id || i} style={{ textAlign: "center", position: "relative" }}>
            <AnimPet emoji={p.emoji || "🐾"} delay={i * 0.12} size={40} />
            <div style={{
              marginTop: 4,
              fontSize: 10,
              color: "#cde",
              animation: "pawPop 0.4s ease " + (0.55 + i * 0.12) + "s both",
            }}>
              {lines[i % lines.length]}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" style={primary} onClick={onHug}>Hug</button>
        <button type="button" style={ghost} onClick={onSnack}>Give snack</button>
      </div>
    </div>
  );
}

function Bar({ label, value, color }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#89a" }}>
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: color }} />
      </div>
    </div>
  );
}

export function PetHubPage() {
  const navigate = useNavigate();
  const wallet = usePawlyWallet();
  const addr = (wallet.publicKey && wallet.publicKey.toString()) || "";
  const [tab, setTab] = useState("map");
  const [pets, setPets] = useState(() => loadPets(addr));
  const [sel, setSel] = useState(null);
  const [placeId, setPlaceId] = useState("shop");
  const [panel, setPanel] = useState(null);
  const [pick, setPick] = useState(COMPANIONS[1].species);
  const [payNote, setPayNote] = useState(null);
  const [cause, setCause] = useState(SHELTER_CAUSES[0].id);
  const [emailModal, setEmailModal] = useState(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [skinName, setSkinName] = useState("My neon coat");
  const [yardKey, setYardKey] = useState(0);
  useEffect(() => { setYardKey((n) => n + 1); }, [addr]);

  const persist = (next) => {
    setPets(next);
    savePets(addr, next);
  };

  const selected = pets.find((p) => p.id === sel) || pets[0] || null;
  const place = PLACES.find((p) => p.id === placeId) || PLACES[0];
  const full = pets.length >= PET_SLOT_CAP;
  const hint = useMemo(() => (addr ? addr.slice(0, 4) + "…" + addr.slice(-4) : "any wallet"), [addr]);
  const causeObj = SHELTER_CAUSES.find((c) => c.id === cause) || SHELTER_CAUSES[0];

  const addPet = (kind) => {
    if (full) return;
    const spec = COMPANIONS.find((s) => s.species === pick) || COMPANIONS[1];
    persist([
      ...pets,
      {
        id: uid(),
        kind: "adopted",
        species: spec.species,
        name: spec.label,
        emoji: spec.emoji,
        hunger: 70,
        health: 80,
        streak: 0,
        minted: false,
        skin: "",
        pricePawly: spec.pricePawly,
      },
    ]);
    setPayNote({ title: "Adopt " + spec.label, pawly: spec.pricePawly });
    setPanel(null);
  };

  const wearSkin = (skin) => {
    if (!selected) {
      setPayNote({ title: skin.label, pawly: skin.pawly, needPet: true });
      return;
    }
    persist(pets.map((p) => (p.id === selected.id ? { ...p, skin: skin.label } : p)));
    setPayNote({ title: "Skin " + skin.label + " · " + selected.name, pawly: skin.pawly });
  };

  const applyService = (svc) => {
    if (!selected) {
      setPayNote({ title: svc.label, pawly: svc.pawly, needPet: true });
      return;
    }
    persist(
      pets.map((p) =>
        p.id === selected.id
          ? {
              ...p,
              hunger: Math.max(0, Math.min(100, (p.hunger || 0) + (svc.hunger || 0))),
              health: Math.max(0, Math.min(100, (p.health || 0) + (svc.health || 0))),
              streak: (p.streak || 0) + 1,
            }
          : p
      )
    );
    setPayNote({ title: svc.label + " · " + selected.name, pawly: svc.pawly });
  };

  const startAid = () => {
    setEmailModal(causeObj);
  };

  const confirmAid = () => {
    const mail = (emailDraft || "").trim();
    if (!mail || !mail.includes("@")) return;
    setPayNote({
      title: "Aid " + causeObj.label,
      pawly: causeObj.pawly,
      email: mail,
      award: true,
    });
    setEmailModal(null);
  };

  const hug = () => {
    if (!pets.length) return;
    const id = (selected && selected.id) || pets[0].id;
    persist(pets.map((p) => p.id === id
      ? { ...p, health: Math.min(100, (p.health || 0) + 4) }
      : p));
    setYardKey((n) => n + 1);
  };
  const snack = () => {
    if (!pets.length) {
      setTab("pets");
      setPanel("adopt");
      return;
    }
    const id = (selected && selected.id) || pets[0].id;
    persist(pets.map((p) => p.id === id
      ? { ...p, hunger: Math.min(100, (p.hunger || 0) + 10), streak: (p.streak || 0) + 1 }
      : p));
    setYardKey((n) => n + 1);
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button type="button" onClick={() => navigate("/")} style={{ ...ghost, marginBottom: 14 }}>
          ← Home
        </button>
        <h1 style={{ margin: "0 0 4px", color: "#00ff9d", fontSize: "1.55rem" }}>Pet Hub</h1>
        <p style={{ margin: "0 0 12px", color: "#8a9", fontSize: 13 }}>
          Cyber + cartoon town · Singapore · any Solana wallet
          <br />
          Slots {pets.length} / {PET_SLOT_CAP} · You {hint}
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button type="button" style={tab === "map" ? primary : ghost} onClick={() => setTab("map")}>
            Singapore
          </button>
          <button type="button" style={tab === "pets" ? primary : ghost} onClick={() => setTab("pets")}>
            My pets
          </button>
          <button type="button" style={ghost} onClick={() => navigate("/swap")}>
            Swap
          </button>
        </div>

        <div style={{ ...card, marginBottom: 12, fontSize: 13, color: "#9ad7c2", lineHeight: 1.45 }}>
          Pixel-cyber town (Sunflower-like). Pay USDC / USDT / SOL / PAWLY. Stables swap into the official pool.
          Leftover returns as PAWLY. Aid certificates need an email — wallet-only players can type one at the shelter.
        </div>

        <GreetingYard key={yardKey} pets={pets} onHug={hug} onSnack={snack} />

        {tab === "map" ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 12 }}>
              {PLACES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlaceId(p.id)}
                  style={{
                    ...card,
                    textAlign: "left",
                    cursor: "pointer",
                    borderColor: placeId === p.id ? "rgba(0,255,157,0.55)" : "rgba(255,255,255,0.08)",
                    color: "#e8eef7",
                  }}
                >
                  <div style={{ fontSize: 22 }}>{p.emoji}</div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{p.nameZh}</div>
                  <div style={{ color: "#89a", fontSize: 11 }}>{p.area}</div>
                </button>
              ))}
            </div>

            <div style={card}>
              <div style={{ fontWeight: 800 }}>
                {place.emoji} {place.nameZh} · {place.name}
              </div>
              <div style={{ color: "#89a", fontSize: 12, marginTop: 4 }}>{place.area}, Singapore · cyber cartoon</div>
              <div style={{ marginTop: 10, fontSize: 13 }}>NPC: {place.npcs.join(" · ")}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#667" }}>Players here: You {hint}</div>

              {placeId !== "shelter" ? (
                <>
                  <div style={{ marginTop: 12, fontSize: 12, color: "#89a" }}>Active pet</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {pets.length === 0 ? (
                      <span style={{ color: "#fbbf24", fontSize: 13 }}>Adopt first</span>
                    ) : (
                      pets.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSel(p.id)}
                          style={{
                            ...ghost,
                            color: "#e8eef7",
                            borderColor: selected && selected.id === p.id ? "#00ff9d" : "rgba(255,255,255,0.15)",
                          }}
                        >
                          {p.emoji} {p.name}
                          {p.skin ? " · " + p.skin : ""}
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : null}

              {placeId === "shelter" ? (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, color: "#9ad7c2", marginBottom: 8 }}>
                    Pick who you aid — strays and endangered species. Catalog grows; this is the first shelf.
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {SHELTER_CAUSES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCause(c.id)}
                        style={{
                          ...ghost,
                          color: "#e8eef7",
                          borderColor: cause === c.id ? "#fbbf24" : "rgba(255,255,255,0.15)",
                        }}
                      >
                        {c.emoji} {c.label} · {c.pawly}
                      </button>
                    ))}
                  </div>
                  <button type="button" style={{ ...primary, marginTop: 12 }} onClick={startAid}>
                    Aid {causeObj.label} · {causeObj.pawly} PAWLY
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                  {place.services.map((svc) => (
                    <div key={svc.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{svc.label}</div>
                        <div style={{ color: "#00ff9d", fontSize: 12 }}>{svc.pawly} PAWLY</div>
                      </div>
                      <button type="button" style={primary} onClick={() => applyService(svc)}>
                        Pay
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {placeId === "shop" ? (
              <div style={{ ...card, marginTop: 10 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Skins / 皮肤外套</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {SKINS.map((s) => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div>
                        <div>{s.label}</div>
                        <div style={{ color: "#00ff9d", fontSize: 12 }}>{s.pawly} PAWLY</div>
                      </div>
                      <button type="button" style={primary} onClick={() => wearSkin(s)}>
                        Wear
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: "#89a" }}>Design my own</div>
                <input
                  value={skinName}
                  onChange={(e) => setSkinName(e.target.value)}
                  style={{ width: "100%", marginTop: 6, padding: 8, borderRadius: 8, border: "1px solid #245", background: "#071016", color: "#e8eef7" }}
                />
                <button
                  type="button"
                  style={{ ...primary, marginTop: 8 }}
                  onClick={() => wearSkin({ id: "custom", label: skinName || "Custom coat", pawly: 130 })}
                >
                  Save design · 130 PAWLY
                </button>
                <div style={{ marginTop: 14, color: "#667", fontSize: 12 }}>
                  Open my stall — waitlist. Same PAWLY price + pool settle later.
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div style={{ display: "grid", gap: 10 }}>
              {pets.map((p) => (
                <div key={p.id} style={card}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ fontSize: 36 }}><AnimPet emoji={p.emoji} /></div>
                    <div style={{ flex: 1 }}>
                      <strong>{p.name}</strong>
                      {p.skin ? <div style={{ fontSize: 12, color: "#7dd3fc" }}>{p.skin}</div> : null}
                      <Bar label="Hunger" value={p.hunger} color="#00ff9d" />
                      <Bar label="Health" value={p.health} color="#7dd3fc" />
                    </div>
                    <button type="button" style={primary} onClick={() => { setSel(p.id); setTab("map"); }}>
                      Go out
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!full ? (
              <button type="button" style={{ ...ghost, marginTop: 12 }} onClick={() => { setPick(COMPANIONS[1].species); setPanel("adopt"); }}>
                + Adopt companion
              </button>
            ) : (
              <div style={{ ...card, marginTop: 12, color: "#fbbf24" }}>Slot cap reached (10)</div>
            )}
          </>
        )}

        {panel === "adopt" ? (
          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Adopt · house / farm / exotic</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 240, overflow: "auto" }}>
              {COMPANIONS.map((s) => (
                <button
                  key={s.species}
                  type="button"
                  onClick={() => setPick(s.species)}
                  style={{
                    ...ghost,
                    color: "#e8eef7",
                    borderColor: pick === s.species ? "#00ff9d" : "rgba(255,255,255,0.15)",
                  }}
                >
                  {s.emoji} {s.label} · {s.pricePawly}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" style={primary} onClick={() => addPet("adopt")}>
                Confirm
              </button>
              <button type="button" style={ghost} onClick={() => setPanel(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {emailModal ? (
          <div style={{ ...card, marginTop: 14, borderColor: "rgba(251,191,36,0.45)" }}>
            <div style={{ fontWeight: 800, color: "#fbbf24" }}>Email needed for the award</div>
            <p style={{ fontSize: 13, color: "#cde", lineHeight: 1.45 }}>
              After you pay to aid <b>{emailModal.label}</b>, Pet Hub will send a rescue certificate and a photo
              of that animal to your email. Wallet-only play is fine — add an inbox here just for the award.
            </p>
            <input
              placeholder="you@email.com"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #245", background: "#071016", color: "#e8eef7" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" style={primary} onClick={confirmAid}>
                Save email & continue
              </button>
              <button type="button" style={ghost} onClick={() => setEmailModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {payNote ? (
          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ fontWeight: 800 }}>{payNote.title}</div>
            {payNote.needPet ? (
              <p style={{ color: "#fbbf24", fontSize: 13 }}>Pick or adopt a pet first.</p>
            ) : (
              <>
                <p style={{ fontSize: 14 }}>
                  Price <b style={{ color: "#00ff9d" }}>{payNote.pawly} PAWLY</b>
                </p>
                {payNote.award ? (
                  <p style={{ color: "#9ad7c2", fontSize: 13 }}>
                    Certificate + photo will go to {payNote.email} after on-chain pay is live.
                  </p>
                ) : null}
                <p style={{ color: "#89a", fontSize: 13 }}>
                  Pay USDC / USDT / SOL / PAWLY. Stables swap into the official pool first. Change comes back as PAWLY.
                </p>
                <button type="button" style={ghost} onClick={() => navigate("/swap")}>
                  Open Swap
                </button>{" "}
                <button type="button" style={ghost} onClick={() => setPayNote(null)}>
                  Close
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
