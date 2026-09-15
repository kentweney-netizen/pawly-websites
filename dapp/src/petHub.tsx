import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { usePawlyWallet } from "./localWallet";
import { PetRig, PET_RIG_CSS } from "./petAvatar";
import { ADOPT, BREED_LV, BREED_PAWLY, FEED_DAY_MAX, FOOD, LIST_FEE, MINT_LV, MINT_PAWLY, PAWLY_MINT, PayCoin, PetRec, RESCUE, SLOT_CAP, SceneId, SHOP_TILL, USDC_MINT, USDT_MINT, afterFeed, feedsTodayOf, loadPets, savePets } from "./petGame";
import { PetLiveWorld } from "./petLiveWorld";

const STORE_OLD = "pawly_pet_hub_v1_";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SPONSOR = SHOP_TILL;

function readAddr() {
  try {
    return sessionStorage.getItem("pawly_dapp_wallet") || "";
  } catch {
    return "";
  }
}
function bootPets(w: string): PetRec[] {
  const fresh = loadPets(w);
  if (fresh.length) return fresh;
  try {
    const raw = localStorage.getItem(STORE_OLD + w);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.map((p: PetRec) => ({ ...p, level: Number(p.level || Math.floor(Number(p.feedsTotal || 0) / 10)) }));
  } catch {
    return [];
  }
}
async function payTill(opts: { from: PublicKey; coin: PayCoin; amount: number; signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction> }) {
  if (typeof opts.signTransaction !== "function") throw new Error("Connect wallet in dApp first");
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

export function PetHubPage() {
  const navigate = useNavigate();
  const wallet = usePawlyWallet() as { publicKey?: PublicKey | null; signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction> };
  const addr = wallet.publicKey?.toBase58() || readAddr();
  const [scene, setScene] = useState<SceneId>("town");
  const [pets, setPets] = useState<PetRec[]>(() => bootPets(addr));
  const [focus, setFocus] = useState("");
  const [coin, setCoin] = useState<PayCoin>("PAWLY");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!addr) return;
    setPets(bootPets(addr));
  }, [addr]);

  const pay = async (title: string, amount: number) => {
    if (!wallet.publicKey) throw new Error("Open from dApp so wallet is read");
    setBusy(true);
    setNote(title + "…");
    try {
      const sig = await payTill({ from: wallet.publicKey, coin, amount, signTransaction: wallet.signTransaction });
      setNote(title + " ok " + sig.slice(0, 8));
      return sig;
    } catch (e) {
      setNote(String((e as { message?: string })?.message || e));
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const addPet = (p: PetRec) => {
    const next = [...pets, p].slice(0, SLOT_CAP);
    setPets(next);
    savePets(addr, next);
  };

  return (
    <div style={{ height: "100dvh", maxWidth: 430, margin: "0 auto", background: "#08140e", color: "#f4e1c1", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px", display: "flex", justifyContent: "space-between", zIndex: 2 }}>
        <b>PAWLY TOWN</b>
        <span>{pets.length}/{SLOT_CAP}</span>
        <button type="button" onClick={() => navigate("/")}>Home</button>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <PetLiveWorld pets={pets} scene={scene} onEnter={setScene} />
        {scene !== "town" && (
          <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, top: 10, background: "rgba(27,18,12,0.86)", border: "3px solid #c9844a", overflow: "auto", padding: 10 }}>
            <button type="button" onClick={() => setScene("town")}>back to town</button>
            <h3>{scene}</h3>
            {scene === "shop" && ADOPT.map((a) => (
              <button key={a.species} type="button" disabled={busy || pets.length >= SLOT_CAP} onClick={() => void pay("Adopt " + a.name, a.price).then((sig) => addPet({ id: "pet_" + Date.now(), kind: "adopted", species: a.species, name: a.name, emoji: a.emoji, level: 0, feedsTotal: 0, sig }))} style={{ display: "block", width: "100%", margin: "6px 0" }}>{a.emoji} {a.name} · {a.price} {coin}</button>
            ))}
            {scene === "shelter" && RESCUE.map((a) => (
              <button key={a.species} type="button" disabled={busy || pets.length >= SLOT_CAP} onClick={() => void pay("Rescue " + a.name, a.price).then((sig) => addPet({ id: "pet_" + Date.now(), kind: "rescued", species: a.species, name: a.name, emoji: a.emoji, level: 0, feedsTotal: 0, sig }))} style={{ display: "block", width: "100%", margin: "6px 0" }}>{a.emoji} {a.name} · {a.price} {coin}</button>
            ))}
            {(scene === "shop" || scene === "park") && FOOD.map((f) => (
              <button key={f.title} type="button" disabled={busy || !pets.length} onClick={() => {
                const pet = pets.find((p) => p.id === focus) || pets[0];
                if (feedsTodayOf(pet) >= FEED_DAY_MAX) { setNote("Fed 3/3 today"); return; }
                void pay("Feed " + pet.name, f.amount).then(() => {
                  const next = pets.map((p) => (p.id === pet.id ? afterFeed(p) : p));
                  setPets(next); savePets(addr, next);
                });
              }} style={{ display: "block", width: "100%", margin: "6px 0" }}>{f.title} · {f.amount} {coin}</button>
            ))}
            {scene === "hospital" && <button type="button" disabled={busy} onClick={() => void pay("Hospital", 60)}>Heal · 60 {coin}</button>}
            {scene === "hotel" && <button type="button" disabled={busy} onClick={() => void pay("Hotel", 180)}>Stay · 180 {coin}</button>}
            {scene === "groom" && <button type="button" disabled={busy} onClick={() => void pay("Groom", 90)}>Groom · 90 {coin}</button>}
            {scene === "nft" && pets.map((p) => (
              <button key={p.id} type="button" disabled={busy || p.level < MINT_LV} onClick={() => void pay("Mint " + p.name, MINT_PAWLY)} style={{ display: "block", width: "100%", margin: "6px 0" }}>Mint {p.name} Lv{p.level} · {MINT_PAWLY}</button>
            ))}
            {scene === "market" && <div>List fee {LIST_FEE} {coin}. Book next unlock.</div>}
            {scene === "breed" && <div>Two minted Lv{BREED_LV}+ · {BREED_PAWLY} {coin} · 48h.</div>}
          </div>
        )}
      </div>
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
        <div style={{ display: "flex", gap: 4, overflowX: "auto", padding: 6 }}>
        {Array.from({ length: SLOT_CAP }, (_, i) => pets[i] || null).map((p, i) => (
          <button key={p ? p.id : i} type="button" onClick={() => p && setFocus(p.id)} style={{ width: 48, height: 48 }}>{p ? p.emoji + "L" + p.level : "+"}</button>
        ))}
      </div>
      <div style={{ padding: 8, fontSize: 12 }}>
        <select value={coin} onChange={(e) => setCoin(e.target.value as PayCoin)}><option>PAWLY</option><option>USDC</option><option>USDT</option><option>SOL</option></select>
        <div>{addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "no wallet"}</div>
        <div>{note}</div>
      </div>
      <style>{PET_RIG_CSS}</style>
    </div>
  );
}
