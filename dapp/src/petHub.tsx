/**
 * PAWLY Pet Hub — copy to dapp/src/petHub.tsx
 * Engine lives in petHubGame.ts (Phaser 3). Add cities there later.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePawlyWallet } from "./localWallet";
import { goScene, nudgePlayer, startPetHubGame, type HubSceneId } from "./petHubGame";
import type Phaser from "phaser";

export const PET_SLOT_CAP = 10;
const STORE_PREFIX = "pawly_pet_hub_v1_";

type PetRec = {
  id: string; kind: string; species: string; name: string; emoji: string;
  hunger: number; health: number; streak: number; minted?: boolean; skin?: string; pricePawly?: number;
};
type Svc = { id: string; label: string; pawly: number; hunger?: number; health?: number };
type PayNote = { title: string; pawly?: number; needPet?: boolean; email?: string; award?: boolean };
type ShelterCause = { id: string; label: string; emoji: string; pawly: number; kind: string };

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
const SHELTER_CAUSES: ShelterCause[] = [
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
const SERVICES: Record<string, Svc[]> = {
  hospital: [
    { id: "checkup", label: "Checkup", pawly: 120, hunger: 0, health: 18 },
    { id: "vaccine", label: "Vaccine", pawly: 180, hunger: 0, health: 22 },
  ],
  shop: [
    { id: "food", label: "Food", pawly: 80, hunger: 22, health: 4 },
    { id: "toy", label: "Toy", pawly: 60, hunger: 4, health: 8 },
  ],
  hotel: [{ id: "night", label: "One night", pawly: 150, hunger: -6, health: 12 }],
  groom: [
    { id: "bath", label: "Bath", pawly: 100, hunger: 0, health: 10 },
    { id: "style", label: "Style", pawly: 140, hunger: 0, health: 14 },
  ],
  park: [{ id: "walk", label: "Walk the dog", pawly: 40, hunger: 8, health: 10 }],
};

function walletKey(w: string) { return (w && String(w)) || "guest"; }
function loadPets(w: string): PetRec[] {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + walletKey(w));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as PetRec[]) : [];
  } catch { return []; }
}
function savePets(w: string, list: PetRec[]) {
  localStorage.setItem(STORE_PREFIX + walletKey(w), JSON.stringify(list.slice(0, PET_SLOT_CAP)));
}
function uid() { return "pet_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

const wrap: React.CSSProperties = { minHeight: "100vh", background: "#070b10", color: "#e8eef7" };
const card: React.CSSProperties = { background: "rgba(10,28,24,0.9)", border: "1px solid rgba(0,255,157,0.18)", borderRadius: 16, padding: 14 };
const ghost: React.CSSProperties = { background: "transparent", color: "#9ad7c2", border: "1px solid rgba(0,255,157,0.35)", borderRadius: 12, padding: "8px 12px", cursor: "pointer", fontWeight: 700 };
const primary: React.CSSProperties = { ...ghost, background: "linear-gradient(90deg,#00ff9d,#7cffc8)", color: "#052015", border: "none" };

export function PetHubPage() {
  const navigate = useNavigate();
  const wallet = usePawlyWallet();
  const addr = (wallet.publicKey && wallet.publicKey.toString()) || "";
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [scene, setScene] = useState<HubSceneId>("street");
  const [near, setNear] = useState<HubSceneId | null>(null);
  const [pets, setPets] = useState<PetRec[]>(() => loadPets(addr));
  const [sel, setSel] = useState<string | null>(null);
  const [panel, setPanel] = useState<string | null>(null);
  const [pick, setPick] = useState(COMPANIONS[1].species);
  const [payNote, setPayNote] = useState<PayNote | null>(null);
  const [cause, setCause] = useState(SHELTER_CAUSES[0].id);
  const [emailModal, setEmailModal] = useState<ShelterCause | null>(null);
  const [emailDraft, setEmailDraft] = useState("");

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const bus = {
      emit: (e: { type: string; id: HubSceneId | null }) => {
        if (e.type === "scene" && e.id) setScene(e.id);
        if (e.type === "near") setNear(e.id);
      },
    };
    const game = startPetHubGame(el, bus);
    gameRef.current = game;
    return () => { game.destroy(true); gameRef.current = null; };
  }, []);

  const persist = (next: PetRec[]) => { setPets(next); savePets(addr, next); };
  const selected = pets.find((p: PetRec) => p.id === sel) || pets[0] || null;
  const hint = useMemo(() => (addr ? addr.slice(0, 4) + "…" + addr.slice(-4) : "any wallet"), [addr]);
  const causeObj = SHELTER_CAUSES.find((c) => c.id === cause) || SHELTER_CAUSES[0];
  const svcs = SERVICES[scene] || [];

  const travel = (id: HubSceneId) => {
    const g = gameRef.current;
    if (!g) return;
    goScene(g, id, { emit: () => undefined });
    setScene(id);
    setNear(null);
  };

  const applyService = (svc: Svc) => {
    if (!selected) { setPayNote({ title: svc.label, pawly: svc.pawly, needPet: true }); return; }
    persist(pets.map((p: PetRec) => p.id === selected.id ? {
      ...p,
      hunger: Math.max(0, Math.min(100, (p.hunger || 0) + (svc.hunger || 0))),
      health: Math.max(0, Math.min(100, (p.health || 0) + (svc.health || 0))),
      streak: (p.streak || 0) + 1,
    } : p));
    setPayNote({ title: svc.label + " · " + selected.name, pawly: svc.pawly });
  };

  const addPet = () => {
    if (pets.length >= PET_SLOT_CAP) return;
    const spec = COMPANIONS.find((s) => s.species === pick) || COMPANIONS[1];
    persist([...pets, { id: uid(), kind: "adopted", species: spec.species, name: spec.label, emoji: spec.emoji, hunger: 70, health: 80, streak: 0, skin: "", pricePawly: spec.pricePawly }]);
    setPayNote({ title: "Adopt " + spec.label, pawly: spec.pricePawly });
    setPanel(null);
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ padding: "10px 12px 4px" }}>
          <div style={{ color: "#00ff9d", fontWeight: 800 }}>Pet Hub · {scene}</div>
          <div style={{ color: "#89a", fontSize: 12 }}>Phaser engine · WASD / arrows · {hint}</div>
        </div>
        <div ref={hostRef} style={{ width: 360, height: 420, margin: "0 auto", background: "#0b1020" }} />
        <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: 10, flexWrap: "wrap" }}>
          <button type="button" style={ghost} onClick={() => gameRef.current && nudgePlayer(gameRef.current, 0, -24)}>↑</button>
          <button type="button" style={ghost} onClick={() => gameRef.current && nudgePlayer(gameRef.current, -24, 0)}>←</button>
          <button type="button" style={ghost} onClick={() => gameRef.current && nudgePlayer(gameRef.current, 24, 0)}>→</button>
          <button type="button" style={ghost} onClick={() => gameRef.current && nudgePlayer(gameRef.current, 0, 24)}>↓</button>
          {near && near !== scene ? <button type="button" style={primary} onClick={() => travel(near)}>Enter {near}</button> : null}
          {scene !== "street" ? <button type="button" style={ghost} onClick={() => travel("street")}>Exit to street</button> : null}
        </div>
        <div style={{ padding: "0 12px 12px" }}>
          {pets.length ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {pets.map((p: PetRec) => (
                <button key={p.id} type="button" style={ghost} onClick={() => setSel(p.id)}>{p.emoji} {p.name}</button>
              ))}
            </div>
          ) : (
            <button type="button" style={{ ...primary, marginBottom: 10 }} onClick={() => setPanel("adopt")}>Adopt first</button>
          )}
          {svcs.length ? (
            <div style={card}>
              {svcs.map((svc) => (
                <div key={svc.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>{svc.label} · {svc.pawly} PAWLY</span>
                  <button type="button" style={primary} onClick={() => applyService(svc)}>Do</button>
                </div>
              ))}
            </div>
          ) : null}
          {scene === "shelter" ? (
            <div style={{ ...card, marginTop: 10 }}>
              {SHELTER_CAUSES.map((c) => (
                <button key={c.id} type="button" style={{ ...ghost, margin: 4 }} onClick={() => setCause(c.id)}>{c.emoji} {c.label}</button>
              ))}
              <button type="button" style={{ ...primary, display: "block", marginTop: 8 }} onClick={() => setEmailModal(causeObj)}>Aid {causeObj.label}</button>
            </div>
          ) : null}
          {panel === "adopt" ? (
            <div style={{ ...card, marginTop: 10 }}>
              {COMPANIONS.map((s) => (
                <button key={s.species} type="button" style={{ ...ghost, margin: 3 }} onClick={() => setPick(s.species)}>{s.emoji} {s.label}</button>
              ))}
              <button type="button" style={{ ...primary, marginTop: 8 }} onClick={addPet}>Confirm</button>
            </div>
          ) : null}
          {emailModal ? (
            <div style={{ ...card, marginTop: 10 }}>
              Email for award
              <input value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="you@email.com" style={{ width: "100%", margin: "8px 0", padding: 8, background: "#071016", color: "#fff" }} />
              <button type="button" style={primary} onClick={() => {
                if (!emailDraft.includes("@")) return;
                setPayNote({ title: "Aid " + emailModal.label, pawly: emailModal.pawly, email: emailDraft, award: true });
                setEmailModal(null);
              }}>Save</button>
            </div>
          ) : null}
          {payNote ? (
            <div style={{ ...card, marginTop: 10 }}>
              <b>{payNote.title}</b>
              <div>{payNote.needPet ? "Adopt first" : String(payNote.pawly) + " PAWLY"}</div>
              <button type="button" style={ghost} onClick={() => setPayNote(null)}>Close</button>
            </div>
          ) : null}
          <div style={{ height: 28 }} />
          <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
            <button type="button" style={{ ...ghost, minWidth: 220 }} onClick={() => navigate("/")}>← Home / back to DApp</button>
          </div>
        </div>
      </div>
    </div>
  );
}


