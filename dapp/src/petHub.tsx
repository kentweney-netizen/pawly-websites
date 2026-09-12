/**
 * PAWLY Pet Hub v0.9 — confirmed-only adopt + shop/rescue catalogs.
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { usePawlyWallet } from "./localWallet";

export const PET_SLOT_CAP = 10;
const STORE = "pawly_pet_hub_v1_";
const LEDGER = "pawly_pet_hub_ledger_v1_";
const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const PAWLY_DECIMALS = 6;
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC =
  "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
const SPONSOR =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_PAWLY_GAS_SPONSOR?: string } }).env?.VITE_PAWLY_GAS_SPONSOR) ||
  SHOP_TILL;

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
  sig?: string;
};
type CartKind = "adopt" | "rescue" | "service";
type CartItem = {
  title: string;
  amount: number;
  kind: CartKind;
  species?: string;
  emoji?: string;
};

const COMPANIONS = [
  { species: "dog", label: "Dog", emoji: "🐶", pricePawly: 1000 },
  { species: "cat", label: "Cat", emoji: "🐱", pricePawly: 800 },
  { species: "rabbit", label: "Rabbit", emoji: "🐰", pricePawly: 600 },
  { species: "hamster", label: "Hamster", emoji: "🐹", pricePawly: 280 },
  { species: "parrot", label: "Parrot", emoji: "🦜", pricePawly: 520 },
  { species: "chicken", label: "Chicken", emoji: "🐔", pricePawly: 180 },
  { species: "duck", label: "Duck", emoji: "🦆", pricePawly: 180 },
  { species: "minipig", label: "Mini pig", emoji: "🐷", pricePawly: 420 },
  { species: "alpaca", label: "Alpaca", emoji: "🦙", pricePawly: 700 },
  { species: "lizard", label: "Lizard", emoji: "🦎", pricePawly: 220 },
  { species: "snake", label: "Snake", emoji: "🐍", pricePawly: 260 },
  { species: "gecko", label: "Gecko", emoji: "🦎", pricePawly: 200 },
  { species: "beetle", label: "Beetle", emoji: "🪲", pricePawly: 80 },
  { species: "tarantula", label: "Tarantula", emoji: "🕷", pricePawly: 90 },
  { species: "mantis", label: "Mantis", emoji: "🦗", pricePawly: 70 },
];

const RESCUES = [
  { species: "stray-cat", label: "Stray cat", emoji: "🐱", pricePawly: 10 },
  { species: "stray-dog", label: "Stray dog", emoji: "🐶", pricePawly: 10 },
  { species: "orangutan", label: "Orangutan", emoji: "🦧", pricePawly: 25 },
  { species: "sunbear", label: "Sun bear", emoji: "🐻", pricePawly: 25 },
  { species: "malayan-tiger", label: "Malayan tiger", emoji: "🐯", pricePawly: 30 },
  { species: "seaturtle", label: "Sea turtle", emoji: "🐢", pricePawly: 20 },
  { species: "hornbill", label: "Hornbill", emoji: "🦅", pricePawly: 20 },
  { species: "asian-elephant", label: "Asian elephant", emoji: "🐘", pricePawly: 30 },
  { species: "pangolin", label: "Pangolin", emoji: "🦔", pricePawly: 20 },
  { species: "gibbon", label: "Gibbon", emoji: "🐒", pricePawly: 20 },
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

function loadPets(w: string): PetRec[] {
  try {
    const raw = localStorage.getItem(STORE + (w || "guest"));
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return (list as PetRec[]).filter((p) => p && typeof p.sig === "string" && p.sig.length > 40);
  } catch {
    return [];
  }
}
function savePets(w: string, list: PetRec[]) {
  localStorage.setItem(STORE + (w || "guest"), JSON.stringify(list));
}
function saveLedger(w: string, row: Record<string, string | number>) {
  const key = LEDGER + (w || "guest");
  let prev: Record<string, string | number>[] = [];
  try {
    const raw = localStorage.getItem(key);
    prev = raw ? (JSON.parse(raw) as Record<string, string | number>[]) : [];
  } catch {
    prev = [];
  }
  prev.unshift(row);
  localStorage.setItem(key, JSON.stringify(prev.slice(0, 40)));
}
function asset(name: string) {
  return "/" + name.replace(/^\//, "");
}

async function assertOnchainSuccess(conn: Connection, sig: string) {
  const s = String(sig || "").trim();
  if (s.length < 64) throw new Error("No on-chain signature / 没有链上签名");
  let last = "";
  for (let i = 0; i < 10; i++) {
    const res = await conn.getSignatureStatuses([s], { searchTransactionHistory: true });
    const st = res?.value?.[0];
    if (st) {
      if (st.err) throw new Error("Transaction failed on-chain / 链上失败");
      if (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized") return;
    }
    last = st ? String(st.confirmationStatus || "") : "pending";
    await new Promise((r) => setTimeout(r, 700));
  }
  const tx = await conn.getTransaction(s, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (tx?.meta?.err) throw new Error("Transaction failed on-chain / 链上失败");
  if (!tx) throw new Error("Signature not confirmed / 签名未上链 " + last);
}

async function payPawlyInHub(opts: {
  from: PublicKey;
  amount: number;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}): Promise<string> {
  const mint = new PublicKey(PAWLY_MINT);
  const till = new PublicKey(SHOP_TILL);
  const payer = new PublicKey(SPONSOR);
  if (opts.from.equals(till)) throw new Error("Shop till is this wallet / 不能付给自己");
  const rawAmt = Math.round(opts.amount * Math.pow(10, PAWLY_DECIMALS));
  if (rawAmt <= 0) throw new Error("Invalid amount");
  const conn = new Connection(RPC, "confirmed");
  const fromAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const toAta = await getAssociatedTokenAddress(mint, till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const ixs = [
    createAssociatedTokenAccountIdempotentInstruction(payer, toAta, till, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(fromAta, mint, toAta, opts.from, rawAmt, PAWLY_DECIMALS, [], TOKEN_PROGRAM_ID),
  ];
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const msg = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message();
  const tx = new VersionedTransaction(msg);
  let sig = "";
  if (typeof opts.signTransaction === "function") {
    const signed = await opts.signTransaction(tx);
    const rawBytes = signed.serialize();
    let b64 = "";
    try {
      b64 = btoa(String.fromCharCode.apply(null, Array.from(rawBytes)));
    } catch {
      let s = "";
      for (let i = 0; i < rawBytes.length; i++) s += String.fromCharCode(rawBytes[i]);
      b64 = btoa(s);
    }
    const r = await fetch(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + SUPABASE_KEY,
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify({ transaction: b64, feePawly: 1 }),
    });
    const d = (await r.json().catch(() => ({}))) as { signature?: string; error?: string };
    if (r.ok && d.signature) sig = String(d.signature);
    else if (d.error) throw new Error(String(d.error));
  }
  if (!sig) sig = await opts.sendTransaction(tx, conn);
  await assertOnchainSuccess(conn, sig);
  return sig;
}

const ghost: React.CSSProperties = {
  background: "rgba(0,0,0,0.55)",
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
const rowBtn: React.CSSProperties = {
  ...ghost,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginBottom: 4,
  fontSize: 12,
  padding: "8px 10px",
};

export function PetHubPage() {
  const navigate = useNavigate();
  const wallet = usePawlyWallet() as {
    publicKey?: PublicKey | null;
    sendTransaction?: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
    signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  };
  const addr = (wallet.publicKey && wallet.publicKey.toString()) || "";
  const [scene, setScene] = useState<SceneId>("street");
  const [pets, setPets] = useState<PetRec[]>(() => loadPets(addr));
  const [cart, setCart] = useState<CartItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [lastSig, setLastSig] = useState("");
  const [lastPaid, setLastPaid] = useState(0);
  const [lastTitle, setLastTitle] = useState("");
  const hint = useMemo(() => (addr ? addr.slice(0, 4) + "…" + addr.slice(-4) : "connect wallet"), [addr]);

  const openCart = (item: CartItem) => {
    setNote("");
    setCart(item);
  };

  const grantAdopt = (item: CartItem, sig: string) => {
    if (item.kind !== "adopt") return;
    if (pets.length >= PET_SLOT_CAP) throw new Error("Max 10 pets / 最多 10 只");
    const next: PetRec[] = [
      ...pets,
      {
        id: "pet_" + Date.now(),
        kind: "adopted",
        species: item.species || "dog",
        name: item.title.replace(/^Adopt\s+/i, ""),
        emoji: item.emoji || "🐶",
        hunger: 70,
        health: 80,
        streak: 0,
        pricePawly: item.amount,
        sig,
      },
    ];
    setPets(next);
    savePets(addr, next);
  };

  const confirmPay = async () => {
    if (!cart) return;
    if (!wallet.publicKey || !wallet.sendTransaction) {
      setNote("Connect wallet in dApp first / 先在 dApp 连接钱包");
      return;
    }
    if (cart.kind === "adopt" && pets.length >= PET_SLOT_CAP) {
      setNote("Max 10 pets / 最多 10 只");
      return;
    }
    if (cart.kind === "rescue" && cart.amount < 10) {
      setNote("Rescue starts at 10 PAWLY");
      return;
    }
    setBusy(true);
    setNote("Paying in Pet Hub…");
    try {
      const sig = await payPawlyInHub({
        from: wallet.publicKey,
        amount: cart.amount,
        sendTransaction: wallet.sendTransaction,
        signTransaction: wallet.signTransaction,
      });
      saveLedger(addr, { t: Date.now(), title: cart.title, amount: cart.amount, sig, scene, kind: cart.kind });
      grantAdopt(cart, sig);
      setLastPaid(cart.amount);
      setLastSig(sig);
      setLastTitle(cart.title);
      setNote("");
      setCart(null);
    } catch (e) {
      setNote(String((e as { message?: string })?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ height: "100dvh", maxHeight: "100dvh", overflow: "hidden", background: "#070b10", color: "#e8eef7", display: "flex", flexDirection: "column", position: "relative", maxWidth: 430, margin: "0 auto", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div style={{ flex: "0 0 auto", padding: "6px 10px 4px" }}>
        <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 15 }}>{TITLE[scene]}</div>
        <div style={{ color: "#8aa", fontSize: 11 }}>{hint}</div>
      </div>
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", background: "#0a1016" }}>
        <video key={scene} src={asset(CLIP[scene])} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ flex: "0 0 auto", zIndex: 2, padding: "8px 8px 10px", background: "#070b10", maxHeight: "46dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 8 }}>
          {SHOPS.map((s) => (
            <button key={s.id} type="button" onClick={() => { setScene(s.id); setNote(""); }} style={{ ...ghost, flex: "0 0 auto", background: scene === s.id ? "rgba(0,255,157,0.28)" : ghost.background }}>
              {s.label}
            </button>
          ))}
        </div>
        {pets.length ? <div style={{ fontSize: 12, marginBottom: 6 }}>{pets.map((p) => p.emoji + p.name).join("  ")}</div> : null}

        {(scene === "street" || scene === "shop") && (
          <div>
            <div style={{ color: "#9aa", fontSize: 11, marginBottom: 4 }}>Pick a pet · pay PAWLY · max 10</div>
            {COMPANIONS.map((c) => (
              <button
                key={c.species}
                type="button"
                style={rowBtn}
                onClick={() => openCart({ title: "Adopt " + c.label, amount: c.pricePawly, kind: "adopt", species: c.species, emoji: c.emoji })}
              >
                <span>{c.emoji + " " + c.label}</span>
                <span>{c.pricePawly} PAWLY</span>
              </button>
            ))}
          </div>
        )}

        {scene === "shelter" && (
          <div>
            <div style={{ color: "#9aa", fontSize: 11, marginBottom: 4 }}>Pick who to rescue · from 10 PAWLY</div>
            {RESCUES.map((c) => (
              <button
                key={c.species}
                type="button"
                style={rowBtn}
                onClick={() => openCart({ title: "Rescue " + c.label, amount: c.pricePawly, kind: "rescue", species: c.species, emoji: c.emoji })}
              >
                <span>{c.emoji + " " + c.label}</span>
                <span>{c.pricePawly} PAWLY</span>
              </button>
            ))}
          </div>
        )}

        {scene === "hospital" && (
          <button type="button" style={{ ...primary, width: "100%" }} onClick={() => openCart({ title: "Hospital checkup", amount: 120, kind: "service" })}>
            Pay 120 PAWLY · checkup
          </button>
        )}
        {scene === "park" && (
          <button type="button" style={{ ...primary, width: "100%" }} onClick={() => openCart({ title: "Walk the dog", amount: 40, kind: "service" })}>
            Pay 40 PAWLY · walk
          </button>
        )}
        {(scene === "hotel" || scene === "groom") && (
          <button type="button" style={{ ...primary, width: "100%" }} onClick={() => openCart({ title: TITLE[scene], amount: scene === "hotel" ? 180 : 90, kind: "service" })}>
            Pay {scene === "hotel" ? 180 : 90} PAWLY
          </button>
        )}
        {note ? <div style={{ color: "#ffb4b4", fontSize: 11, marginTop: 6, wordBreak: "break-word" }}>{note}</div> : null}
        {lastSig ? (
          <div style={{ marginTop: 8, padding: "8px 8px 6px", border: "1px solid rgba(0,255,157,0.35)", borderRadius: 10, background: "#0c1410" }}>
            <div style={{ color: "#00ff9d", fontSize: 12, fontWeight: 800 }}>Paid {lastPaid} PAWLY · {lastTitle}</div>
            <div style={{ color: "#c8ffe8", fontSize: 10, lineHeight: 1.35, wordBreak: "break-all", margin: "4px 0 6px" }}>{lastSig}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" style={{ ...ghost, flex: 1 }} onClick={() => { try { navigator.clipboard.writeText(lastSig); } catch { /* ignore */ } }}>Copy sig</button>
              <button type="button" style={{ ...ghost, flex: 1 }} onClick={() => window.open("https://solscan.io/tx/" + lastSig, "_blank")}>Solscan</button>
            </div>
          </div>
        ) : null}
        <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => navigate("/")}>
          ← Home
        </button>
      </div>
      {cart ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => !busy && setCart(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#101820", borderTop: "1px solid rgba(0,255,157,0.4)", borderRadius: "16px 16px 0 0", padding: "16px 14px 18px" }}>
            <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 16 }}>Pet Hub checkout</div>
            <div style={{ margin: "8px 0 4px", fontSize: 14 }}>{cart.emoji ? cart.emoji + " " : ""}{cart.title}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{cart.amount} PAWLY</div>
            <div style={{ fontSize: 11, color: "#9aa", margin: "6px 0 12px" }}>
              Avatar unlocks only after Solscan success.<br />
              没链上成功签名，不会出现宠物头像。
            </div>
            <button type="button" disabled={busy} style={{ ...primary, width: "100%", opacity: busy ? 0.6 : 1 }} onClick={confirmPay}>
              {busy ? "Paying…" : "Confirm · pay " + cart.amount + " PAWLY"}
            </button>
            <button type="button" disabled={busy} style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setCart(null)}>Cancel</button>
            {note ? <div style={{ color: "#ffb4b4", fontSize: 11, marginTop: 8 }}>{note}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
