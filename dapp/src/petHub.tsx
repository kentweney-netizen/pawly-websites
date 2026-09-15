/**
 * PAWLY Pet Hub v0.2.23b — click-to-feed, live quote, lower prices, full rescue.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { usePawlyWallet } from "./localWallet";
import { PetRig, PET_RIG_CSS } from "./petAvatar";

export const PET_SLOT_CAP = 10;
export const FEED_DAY_MAX = 3;
function sgDay() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}
function feedsTodayOf(p?: { feedDay?: string; feedsToday?: number } | null) {
  if (!p) return 0;
  return String(p.feedDay || "") === sgDay() ? Number(p.feedsToday || 0) : 0;
}
function pickFeedPet(list: PetRec[], id?: string) {
  return list.find((x) => x.id === id) || list[0];
}

const STORE = "pawly_pet_hub_v1_";
const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
type PayCoin = "PAWLY" | "USDC" | "USDT" | "SOL";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const OFFICIAL_POOL = "6n8wjFK3mLxrw25q2k6oejt8oYupzWoBPdZqrcHDVwJ";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
const SPONSOR = SHOP_TILL;

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
  feedsTotal?: number;
  feedsToday?: number;
  feedDay?: string;
  level?: number;
};
type CartKind = "adopt" | "rescue" | "service" | "food";
type CartItem = { title: string; amount: number; kind: CartKind; species?: string; emoji?: string; petId?: string };

const COMPANIONS = [
  { species: "dog", label: "Dog", emoji: "\ud83d\udc36", pricePawly: 200 },
  { species: "cat", label: "Cat", emoji: "\ud83d\udc31", pricePawly: 180 },
  { species: "rabbit", label: "Rabbit", emoji: "\ud83d\udc30", pricePawly: 160 },
  { species: "hamster", label: "Hamster", emoji: "\ud83d\udc39", pricePawly: 80 },
  { species: "parrot", label: "Parrot", emoji: "\ud83e\udd9c", pricePawly: 140 },
  { species: "chicken", label: "Chicken", emoji: "\ud83d\udc14", pricePawly: 50 },
  { species: "duck", label: "Duck", emoji: "\ud83e\udd86", pricePawly: 50 },
  { species: "minipig", label: "Mini pig", emoji: "\ud83d\udc37", pricePawly: 120 },
  { species: "alpaca", label: "Alpaca", emoji: "\ud83e\udd99", pricePawly: 180 },
  { species: "lizard", label: "Lizard", emoji: "\ud83e\udd8e", pricePawly: 60 },
  { species: "snake", label: "Snake", emoji: "\ud83d\udc0d", pricePawly: 70 },
  { species: "gecko", label: "Gecko", emoji: "\ud83e\udd8e", pricePawly: 55 },
  { species: "beetle", label: "Beetle", emoji: "\ud83e\udeb2", pricePawly: 25 },
  { species: "tarantula", label: "Tarantula", emoji: "\ud83d\udd77", pricePawly: 30 },
  { species: "mantis", label: "Mantis", emoji: "\ud83e\udd97", pricePawly: 25 },
];
const RESCUES = [
  { species: "stray-cat", label: "Stray cat", emoji: "\ud83d\udc31", pricePawly: 8 },
  { species: "stray-dog", label: "Stray dog", emoji: "\ud83d\udc36", pricePawly: 8 },
  { species: "orangutan", label: "Orangutan", emoji: "\ud83e\udda7", pricePawly: 18 },
  { species: "sunbear", label: "Sun bear", emoji: "\ud83d\udc3b", pricePawly: 18 },
  { species: "malayan-tiger", label: "Malayan tiger", emoji: "\ud83d\udc2f", pricePawly: 22 },
  { species: "seaturtle", label: "Sea turtle", emoji: "\ud83d\udc22", pricePawly: 15 },
  { species: "hornbill", label: "Hornbill", emoji: "\ud83e\udd85", pricePawly: 15 },
  { species: "asian-elephant", label: "Asian elephant", emoji: "\ud83d\udc18", pricePawly: 22 },
  { species: "pangolin", label: "Pangolin", emoji: "\ud83e\udd94", pricePawly: 15 },
  { species: "gibbon", label: "Gibbon", emoji: "\ud83d\udc12", pricePawly: 15 },
];
const FOODS = [
  { id: "snack", label: "Treat / snack", emoji: "\ud83c\udf6a", pricePawly: 6 },
  { id: "catfood", label: "Cat food", emoji: "\ud83d\udc1f", pricePawly: 10 },
  { id: "dogfood", label: "Dog food", emoji: "\ud83e\uddb4", pricePawly: 10 },
  { id: "seed", label: "Bird / farm feed", emoji: "\ud83c\udf3e", pricePawly: 8 },
  { id: "veg", label: "Herbivore mix", emoji: "\ud83e\udd6c", pricePawly: 8 },
  { id: "bug", label: "Insect / reptile feed", emoji: "\ud83c\udf47", pricePawly: 8 },
  { id: "deluxe", label: "Deluxe bowl", emoji: "\ud83c\udf71", pricePawly: 18 },
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
  street: "pet-hub-street-walk.mp4",
  hospital: "pet-hub-hospital.mp4",
  park: "pet-hub-park.mp4",
  shop: "pet-hub-shop.mp4",
  shelter: "pet-hub-shelter.mp4",
  hotel: "pet-hub-hotel.mp4",
  groom: "pet-hub-groom.mp4",
};
const SERVICE: Record<"hospital" | "park" | "hotel" | "groom", number> = {
  hospital: 40,
  park: 15,
  hotel: 60,
  groom: 30,
};

function loadPets(w: string): PetRec[] {
  if (!w) return [];
  try {
    const raw = localStorage.getItem(STORE + w);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return (list as PetRec[]).filter((p) => p && p.id);
  } catch {
    return [];
  }
}
function savePets(w: string, list: PetRec[]) {
  if (!w) return;
  try {
    localStorage.setItem(STORE + w, JSON.stringify(list.slice(0, PET_SLOT_CAP)));
  } catch {
    /* ignore */
  }
}
function asset(name: string) {
  return "/" + name.replace(/^\//, "");
}

async function fetchHubPx(): Promise<{ pawlyUsd: number; solUsd: number }> {
  let pawlyUsd = 0;
  let solUsd = 0;
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/pairs/solana/" + OFFICIAL_POOL);
    const d = (await r.json()) as { pair?: { priceUsd?: string } };
    pawlyUsd = Number(d.pair?.priceUsd || 0);
  } catch {
    /* ignore */
  }
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112");
    const d = (await r.json()) as { pairs?: { chainId?: string; priceUsd?: string; quoteToken?: { symbol?: string } }[] };
    const p = (d.pairs || []).find((x) => x.chainId === "solana" && String(x.quoteToken?.symbol || "").includes("USD"));
    solUsd = Number(p?.priceUsd || 0);
  } catch {
    /* ignore */
  }
  return { pawlyUsd, solUsd };
}
function quoteCoin(pawlyAmt: number, coin: PayCoin, px: { pawlyUsd: number; solUsd: number }) {
  const usd = pawlyAmt * (px.pawlyUsd > 0 ? px.pawlyUsd : 0);
  if (coin === "PAWLY") return { amount: pawlyAmt, label: pawlyAmt.toFixed(2) + " PAWLY", usd };
  if (coin === "SOL") {
    const v = px.solUsd > 0 && usd > 0 ? usd / px.solUsd : 0;
    return { amount: v, label: v.toFixed(6) + " SOL", usd };
  }
  return { amount: usd, label: usd.toFixed(4) + " " + coin, usd };
}

async function payHub(opts: {
  from: PublicKey;
  coin: PayCoin;
  amount: number;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}) {
  if (typeof opts.signTransaction !== "function") throw new Error("Connect wallet in dApp first / 先连钱包");
  const till = new PublicKey(SHOP_TILL);
  const sponsor = new PublicKey(SPONSOR);
  const conn = new Connection(RPC, "confirmed");
  const { blockhash } = await conn.getLatestBlockhash();
  let ixs;
  if (opts.coin === "SOL") {
    ixs = [SystemProgram.transfer({ fromPubkey: opts.from, toPubkey: till, lamports: Math.max(1, Math.round(opts.amount * LAMPORTS_PER_SOL)) })];
  } else {
    const mintStr = opts.coin === "USDC" ? USDC_MINT : opts.coin === "USDT" ? USDT_MINT : PAWLY_MINT;
    const mint = new PublicKey(mintStr);
    const rawAmt = Math.round(opts.amount * 1e6);
    const fromAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const toAta = await getAssociatedTokenAddress(mint, till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    ixs = [
      createAssociatedTokenAccountIdempotentInstruction(sponsor, toAta, till, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
      createTransferCheckedInstruction(fromAta, mint, toAta, opts.from, rawAmt, 6, [], TOKEN_PROGRAM_ID),
    ];
  }
  const tx = new VersionedTransaction(new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message());
  const signed = await opts.signTransaction(tx);
  const raw = signed.serialize();
  const b64 = btoa(String.fromCharCode.apply(null, Array.from(raw)));
  const r = await fetch(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
    body: JSON.stringify({ transaction: b64, feePawly: 1 }),
  });
  const d = (await r.json().catch(() => ({}))) as { signature?: string; error?: string };
  if (!r.ok || !d.signature) throw new Error(String(d.error || "Sponsor pay failed"));
  return d.signature;
}

function PetFace(props: { emoji: string; size?: number }) {
  const size = props.size || 88;
  return <div style={{ fontSize: size * 0.72, lineHeight: 1, textAlign: "center" }}>{props.emoji || "\ud83d\udc3e"}</div>;
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
const primary: React.CSSProperties = { ...ghost, background: "linear-gradient(90deg,#00ff9d,#7cffc8)", color: "#052015", border: "none", fontSize: 13, padding: "10px 12px" };
const rowBtn: React.CSSProperties = { ...ghost, display: "flex", justifyContent: "space-between", width: "100%", marginBottom: 4, fontSize: 12, padding: "8px 10px" };

export function PetHubPage() {
  const navigate = useNavigate();
  const wallet = usePawlyWallet() as {
    publicKey?: PublicKey | null;
    signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  };
  const addr = (wallet.publicKey && wallet.publicKey.toBase58()) || "";
  const [scene, setScene] = useState<SceneId>("street");
  const [shopView, setShopView] = useState<"home" | "adopt" | "food">("home");
  const [focusId, setFocusId] = useState("");
  const [feedWarn, setFeedWarn] = useState(false);
  const [pets, setPets] = useState<PetRec[]>(() => loadPets(addr));
  const [cart, setCart] = useState<CartItem | null>(null);
  const [payCoin, setPayCoin] = useState<PayCoin>("PAWLY");
  const [px, setPx] = useState({ pawlyUsd: 0, solUsd: 0 });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [lastSig, setLastSig] = useState("");
  const hint = useMemo(() => (addr ? addr.slice(0, 4) + "\u2026" + addr.slice(-4) : "connect wallet"), [addr]);
  const q = cart ? quoteCoin(cart.amount, payCoin, px) : null;

  useEffect(() => {
    void fetchHubPx().then(setPx);
    const id = window.setInterval(() => { void fetchHubPx().then(setPx); }, 60000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!addr) {
      setPets([]);
      return;
    }
    setPets(loadPets(addr));
  }, [addr]);

  const openCart = (item: CartItem) => {
    setNote("");
    if (item.kind === "food") {
      const pet = pickFeedPet(pets, item.petId || focusId);
      if (!pet) {
        setNote("Adopt a pet first / 先领养");
        return;
      }
      if (feedsTodayOf(pet) >= FEED_DAY_MAX) {
        setNote(pet.name + " already fed 3/3 today");
        return;
      }
    }
    setCart(item);
  };

  const confirmPay = async () => {
    if (!cart) return;
    if (!wallet.publicKey) {
      setNote("Connect wallet in dApp first / 先连钱包");
      return;
    }
    if (cart.kind === "adopt" && pets.length >= PET_SLOT_CAP) {
      setNote("Max 10 pets / 最多 10 只");
      return;
    }
    const payAmt = quoteCoin(cart.amount, payCoin, px);
    if (payCoin !== "PAWLY" && payAmt.amount <= 0) {
      setNote("No live price / 拉不到价，改用 PAWLY");
      return;
    }
    setBusy(true);
    setNote("Paying in Pet Hub\u2026");
    try {
      const sig = await payHub({ from: wallet.publicKey, coin: payCoin, amount: payAmt.amount, signTransaction: wallet.signTransaction });
      if (cart.kind === "adopt" || cart.kind === "rescue") {
        const next: PetRec[] = [
          ...pets,
          {
            id: "pet_" + Date.now(),
            kind: cart.kind === "rescue" ? "rescued" : "adopted",
            species: cart.species || "dog",
            name: cart.title.replace(/^(Adopt|Rescue)\s+/i, ""),
            emoji: cart.emoji || "\ud83d\udc3e",
            hunger: 70,
            health: 80,
            streak: 0,
            pricePawly: cart.amount,
            sig,
            feedsTotal: 0,
            level: 0,
          },
        ].slice(0, PET_SLOT_CAP);
        setPets(next);
        savePets(addr, next);
      }
      if (cart.kind === "food") {
        const id = cart.petId || focusId || (pets[0] && pets[0].id) || "";
        const next = pets.map((p) => {
          if (p.id !== id) return p;
          const total = Number(p.feedsTotal || 0) + 1;
          const today = sgDay();
          const same = String(p.feedDay || "") === today;
          const todayN = same ? Number(p.feedsToday || 0) + 1 : 1;
          return { ...p, feedsTotal: total, feedsToday: todayN, feedDay: today, level: Math.floor(total / 10) };
        });
        setPets(next);
        savePets(addr, next);
      }
      setLastSig(sig);
      setNote("");
      setCart(null);
    } catch (e) {
      setNote(String((e as { message?: string }).message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ height: "100dvh", overflow: "hidden", background: "#070b10", color: "#e8eef7", display: "flex", flexDirection: "column", position: "relative", maxWidth: 430, margin: "0 auto" }}>
      <div style={{ padding: "calc(env(safe-area-inset-top, 16px) + 18px) 10px 8px" }}>
        <div style={{ color: "#00ff9d", fontWeight: 800 }}>{TITLE[scene]} · v0.2.23</div>
        <div style={{ color: "#8aa", fontSize: 11 }}>{hint}{px.pawlyUsd ? " · PAWLY $" + px.pawlyUsd.toFixed(4) : ""}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#0a1016" }}>
        <video key={scene} src={asset(CLIP[scene])} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ zIndex: 2, padding: "8px 8px 10px", background: "#070b10", maxHeight: "46dvh", overflowY: "auto" }}>
        {scene === "street" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", padding: "6px 0 10px" }}>
            {pets.length ? pets.map((p) => (
              <button key={p.id} type="button" onClick={() => { setFocusId(p.id); setFeedWarn(true); }} style={{ background: focusId === p.id ? "rgba(0,255,157,0.18)" : "transparent", border: "none", color: "#e8eef7" }}>
                <PetFace emoji={p.emoji} size={88} />
                <div style={{ fontSize: 11, fontWeight: 800 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "#9f8" }}>{"Lv" + Number(p.level || 0) + " · today " + feedsTodayOf(p) + "/3"}</div>
                <div style={{ fontSize: 10, color: "#8aa" }}>tap to feed</div>
              </button>
            )) : <div style={{ color: "#8aa", fontSize: 12 }}>Adopt in Shop to see your pet here.</div>}
          </div>
        )}
                {scene === "street" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", padding: "6px 0 10px" }}>
            {pets.length ? pets.map((p) => (
              <div key={p.id} style={{ textAlign: "center" }}>
                <PetRig pet={{ species: p.species, level: Number((p as { level?: number }).level || 0), emoji: p.emoji }} size={88} />
                <div style={{ fontSize: 11, fontWeight: 800 }}>{p.name}</div>
              </div>
            )) : <div style={{ color: "#8aa", fontSize: 12 }}>Adopt in Shop to see your 3D pet here.</div>}
          </div>
        )}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 8 }}>
          <button type="button" onClick={() => { setScene("street"); setShopView("home"); }} style={{ ...ghost, flex: "0 0 auto", background: scene === "street" ? "rgba(0,255,157,0.28)" : ghost.background }}>Street</button>
          {SHOPS.map((s) => (
            <button key={s.id} type="button" onClick={() => { setScene(s.id); setShopView("home"); }} style={{ ...ghost, flex: "0 0 auto", background: scene === s.id ? "rgba(0,255,157,0.28)" : ghost.background }}>{s.label}</button>
          ))}
        </div>
        {scene === "shop" && shopView === "home" && (
          <div>
            <button type="button" style={{ ...primary, width: "100%", marginBottom: 8 }} onClick={() => setShopView("adopt")}>Choose your pets</button>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => setShopView("food")}>Pets food</button>
          </div>
        )}
        {scene === "shop" && shopView === "adopt" && (
          <div>
            <button type="button" style={{ ...ghost, marginBottom: 8 }} onClick={() => setShopView("home")}>← Shop</button>
            {COMPANIONS.map((c) => (
              <button key={c.species} type="button" style={rowBtn} onClick={() => openCart({ title: "Adopt " + c.label, amount: c.pricePawly, kind: "adopt", species: c.species, emoji: c.emoji })}>
                <span>{c.emoji + " " + c.label}</span><span>{c.pricePawly} PAWLY</span>
              </button>
            ))}
          </div>
        )}
        {scene === "shop" && shopView === "food" && (
          <div>
            <button type="button" style={{ ...ghost, marginBottom: 8 }} onClick={() => setShopView("home")}>← Shop</button>
            <div style={{ color: "#9aa", fontSize: 11, marginBottom: 4 }}>Feed {pickFeedPet(pets, focusId)?.name || "a pet"} · today {feedsTodayOf(pickFeedPet(pets, focusId))}/{FEED_DAY_MAX}</div>
            {FOODS.map((c) => (
              <button key={c.id} type="button" style={rowBtn} onClick={() => openCart({ title: c.label, amount: c.pricePawly, kind: "food", emoji: c.emoji, petId: focusId || (pets[0] && pets[0].id) })}>
                <span>{c.emoji + " " + c.label}</span><span>{c.pricePawly} PAWLY</span>
              </button>
            ))}
          </div>
        )}
        {scene === "shelter" && RESCUES.map((c) => (
          <button key={c.species} type="button" style={rowBtn} onClick={() => openCart({ title: "Rescue " + c.label, amount: c.pricePawly, kind: "rescue", species: c.species, emoji: c.emoji })}>
            <span>{c.emoji + " " + c.label}</span><span>{c.pricePawly} PAWLY</span>
          </button>
        ))}
        {scene === "hospital" && <button type="button" style={{ ...primary, width: "100%" }} onClick={() => openCart({ title: "Hospital checkup", amount: SERVICE.hospital, kind: "service" })}>Pay {SERVICE.hospital} PAWLY · checkup</button>}
        {scene === "park" && <button type="button" style={{ ...primary, width: "100%" }} onClick={() => openCart({ title: "Walk the dog", amount: SERVICE.park, kind: "service" })}>Pay {SERVICE.park} PAWLY · walk</button>}
        {(scene === "hotel" || scene === "groom") && (
          <button type="button" style={{ ...primary, width: "100%" }} onClick={() => openCart({ title: TITLE[scene], amount: SERVICE[scene], kind: "service" })}>
            Pay {SERVICE[scene]} PAWLY
          </button>
        )}
        {note ? <div style={{ color: "#ffb4b4", fontSize: 11, marginTop: 6 }}>{note}</div> : null}
        {lastSig ? <div style={{ color: "#00ff9d", fontSize: 10, marginTop: 6, wordBreak: "break-all" }}>{lastSig}</div> : null}
        <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => navigate("/")}>← Home</button>
      </div>
      {feedWarn ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end" }} onClick={() => setFeedWarn(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800 }}>Feed this pet</div>
            <div style={{ fontSize: 13, margin: "8px 0 12px" }}>Max 3 feeds per day. 10 feeds = 1 level.</div>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => { setFeedWarn(false); setScene("shop"); setShopView("food"); }}>Go to Pets food</button>
            <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setFeedWarn(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
      {cart ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 6, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end" }} onClick={() => !busy && setCart(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800 }}>Pet Hub checkout</div>
            <div style={{ margin: "8px 0 4px" }}>{cart.emoji} {cart.title}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{cart.amount} PAWLY</div>
            <div style={{ fontSize: 14, color: "#c8ffe8", margin: "4px 0 8px" }}>{q ? q.label : ""}{px.pawlyUsd ? " · live $" + px.pawlyUsd.toFixed(4) : ""}</div>
            <div style={{ display: "flex", gap: 6, margin: "8px 0" }}>
              {(["PAWLY", "USDC", "USDT", "SOL"] as PayCoin[]).map((c) => (
                <button key={c} type="button" onClick={() => setPayCoin(c)} style={{ ...ghost, borderColor: payCoin === c ? "#00ff9d" : "rgba(255,255,255,0.2)" }}>{c}</button>
              ))}
            </div>
            <button type="button" disabled={busy} style={{ ...primary, width: "100%", opacity: busy ? 0.6 : 1 }} onClick={() => void confirmPay()}>{busy ? "Paying\u2026" : "Confirm · " + (q ? q.label : "")}</button>
            <button type="button" disabled={busy} style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setCart(null)}>Cancel</button>
          </div>
        </div>
      ) : null}
      <style>{PET_RIG_CSS}</style>
    </div>
  );
}
