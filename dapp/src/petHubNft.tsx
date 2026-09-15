import React, { useEffect, useMemo, useState } from "react";
import { PetRig } from "./petAvatar";
import {
  BREED_PAWLY,
  LIST_FEE_PAWLY,
  MINT_PAWLY,
  MarketRow,
  HubNft,
  canBreed,
  canMint,
  genesFor,
  loadMarket,
  loadNfts,
  rarityFor,
  saveMarket,
  saveNfts,
} from "./petHubGameFi";

type PetLite = {
  id: string;
  species: string;
  name: string;
  emoji: string;
  level?: number;
  feedsTotal?: number;
  sig?: string;
};

const ghost: React.CSSProperties = {
  background: "rgba(0,0,0,0.55)",
  color: "#c8ffe8",
  border: "1px solid rgba(0,255,157,0.4)",
  borderRadius: 10,
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
};
const primary: React.CSSProperties = {
  ...ghost,
  background: "linear-gradient(90deg,#00ff9d,#7cffc8)",
  color: "#052015",
  border: "none",
};

export function PetHubGameFiDock(props: {
  desk: "nft" | "market" | "breed";
  addr: string;
  pets: PetLite[];
  busy?: boolean;
  onMint: (pet: PetLite, cost: number) => Promise<string>;
  onList: (nft: HubNft, price: number, fee: number) => Promise<string>;
  onBuy: (row: MarketRow) => Promise<string>;
  onBreed: (a: HubNft, b: HubNft, cost: number) => Promise<string>;
}) {
  const [nfts, setNfts] = useState<HubNft[]>(() => loadNfts(props.addr));
  const [book, setBook] = useState<MarketRow[]>(() => loadMarket());
  const [pick, setPick] = useState("");
  const [pickB, setPickB] = useState("");
  const [price, setPrice] = useState("200");
  const [note, setNote] = useState("");

  useEffect(() => {
    setNfts(loadNfts(props.addr));
    setBook(loadMarket());
  }, [props.addr]);

  const mine = useMemo(() => nfts.filter((n) => n.owner === props.addr), [nfts, props.addr]);
  const listed = book.filter((r) => r.listed && r.pricePawly > 0);

  const refresh = (nextN: HubNft[], nextM?: MarketRow[]) => {
    setNfts(nextN);
    saveNfts(props.addr, nextN);
    if (nextM) {
      setBook(nextM);
      saveMarket(nextM);
    }
  };

  const mintPet = async (pet: PetLite) => {
    const exists = nfts.find((n) => n.petId === pet.id);
    const err = canMint(Number(pet.level || 0), exists);
    if (err) {
      setNote(err);
      return;
    }
    setNote("Minting NFT…");
    try {
      const sig = await props.onMint(pet, MINT_PAWLY);
      const genes = genesFor(pet.id, pet.species, sig || pet.sig || pet.id);
      const nft: HubNft = {
        id: "nft_" + (sig || pet.id).slice(0, 16),
        petId: pet.id,
        species: pet.species,
        name: pet.name,
        emoji: pet.emoji,
        level: Number(pet.level || 0),
        feeds: Number(pet.feedsTotal || 0),
        rarity: rarityFor(genes),
        genes,
        owner: props.addr,
        mintSig: sig,
        mintedAt: Date.now(),
      };
      refresh([nft, ...nfts.filter((n) => n.petId !== pet.id)]);
      setNote("Minted · " + nft.rarity + " · " + sig.slice(0, 8));
    } catch (e) {
      setNote(String((e as { message?: string })?.message || e));
    }
  };

  const listNft = async (nft: HubNft) => {
    const p = Number(price);
    if (!(p >= 50)) {
      setNote("List at least 50 PAWLY / 上架至少 50");
      return;
    }
    setNote("Listing…");
    try {
      await props.onList(nft, p, LIST_FEE_PAWLY);
      const row: MarketRow = { ...nft, pricePawly: p, listedAt: Date.now(), listed: p };
      const nextN = nfts.map((n) => (n.id === nft.id ? { ...n, listed: p } : n));
      refresh(nextN, [row, ...book.filter((b) => b.id !== nft.id)]);
      setNote("Listed at " + p + " PAWLY");
    } catch (e) {
      setNote(String((e as { message?: string })?.message || e));
    }
  };

  const buyRow = async (row: MarketRow) => {
    if (row.owner === props.addr) {
      setNote("That is your listing / 不能买自己的");
      return;
    }
    setNote("Buying…");
    try {
      const sig = await props.onBuy(row);
      const nextM = book.filter((b) => b.id !== row.id);
      const got: HubNft = { ...row, owner: props.addr, listed: undefined, mintSig: sig || row.mintSig };
      refresh([got, ...nfts.filter((n) => n.id !== row.id)], nextM);
      setNote("Bought · " + row.name);
    } catch (e) {
      setNote(String((e as { message?: string })?.message || e));
    }
  };

  const breedNow = async () => {
    const a = mine.find((n) => n.id === pick);
    const b = mine.find((n) => n.id === pickB);
    const err = canBreed(a, b);
    if (err || !a || !b) {
      setNote(err || "Pick two pets");
      return;
    }
    setNote("Breeding…");
    try {
      const sig = await props.onBreed(a, b, BREED_PAWLY);
      const now = Date.now();
      refresh(
        nfts.map((n) => (n.id === a.id || n.id === b.id ? { ...n, lastBreedAt: now } : n)),
      );
      setNote("Egg paid · offspring is Lv0 in Street · " + sig.slice(0, 8));
    } catch (e) {
      setNote(String((e as { message?: string })?.message || e));
    }
  };

  return (
    <div style={{ fontSize: 12 }}>
      {props.desk === "nft" && (
        <>
          <div style={{ color: "#00ff9d", fontWeight: 800, marginBottom: 6 }}>Mint NFT / 银造</div>
          <div style={{ color: "#8aa", marginBottom: 8 }}>
            Lv1+ companion → {MINT_PAWLY} PAWLY. Dynamic card, not a new token.
          </div>
          {props.pets.length ? props.pets.map((p) => {
            const have = nfts.find((n) => n.petId === p.id);
            return (
              <div key={p.id} style={{ ...ghost, marginBottom: 6, display: "flex", gap: 8, alignItems: "center" }}>
                <PetRig pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name }} size={42} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>{p.name}</div>
                  <div style={{ color: "#8aa" }}>
                    Lv{Number(p.level || 0)} · {have ? have.rarity + " NFT" : "not minted"}
                  </div>
                </div>
                <button type="button" disabled={props.busy || !!have} style={primary} onClick={() => void mintPet(p)}>
                  {have ? "Minted" : "Mint " + MINT_PAWLY}
                </button>
              </div>
            );
          }) : <div style={{ color: "#8aa" }}>Adopt on Street first.</div>}
        </>
      )}
      {props.desk === "market" && (
        <>
          <div style={{ color: "#00ff9d", fontWeight: 800, marginBottom: 6 }}>Market / 市场</div>
          <div style={{ color: "#8aa", marginBottom: 8 }}>Only minted pets. List fee {LIST_FEE_PAWLY} PAWLY.</div>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="price PAWLY" style={{ ...ghost, width: "100%", marginBottom: 8 }} />
          {mine.map((n) => (
            <button key={n.id} type="button" style={{ ...ghost, width: "100%", marginBottom: 6, textAlign: "left" }} onClick={() => void listNft(n)}>
              {n.emoji} {n.name} · {n.rarity} · {n.listed ? "relist" : "list"}
            </button>
          ))}
          <div style={{ color: "#9f8", fontWeight: 800, margin: "8px 0 4px" }}>Book</div>
          {listed.length ? listed.map((r) => (
            <button key={r.id} type="button" style={{ ...ghost, width: "100%", marginBottom: 6, textAlign: "left" }} onClick={() => void buyRow(r)}>
              {r.emoji} {r.name} · {r.rarity} · {r.pricePawly} PAWLY
            </button>
          )) : <div style={{ color: "#8aa" }}>No listings yet.</div>}
        </>
      )}
      {props.desk === "breed" && (
        <>
          <div style={{ color: "#00ff9d", fontWeight: 800, marginBottom: 6 }}>Breed / 有限繁殖</div>
          <div style={{ color: "#8aa", marginBottom: 8 }}>
            Two minted Lv2+ parents · {BREED_PAWLY} PAWLY · 48h cooldown · baby is Lv0, not pre-minted.
          </div>
          <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ ...ghost, width: "100%", marginBottom: 6 }}>
            <option value="">Parent A</option>
            {mine.map((n) => <option key={n.id} value={n.id}>{n.name} · Lv{n.level}</option>)}
          </select>
          <select value={pickB} onChange={(e) => setPickB(e.target.value)} style={{ ...ghost, width: "100%", marginBottom: 8 }}>
            <option value="">Parent B</option>
            {mine.map((n) => <option key={n.id} value={n.id}>{n.name} · Lv{n.level}</option>)}
          </select>
          <button type="button" style={{ ...primary, width: "100%" }} disabled={props.busy} onClick={() => void breedNow()}>
            Breed · {BREED_PAWLY} PAWLY
          </button>
        </>
      )}
      {note ? <div style={{ color: "#ffd", marginTop: 8 }}>{note}</div> : null}
    </div>
  );
}
