import React, { useEffect, useMemo, useState } from "react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { payHub, ghost, primary, savePets } from "./petHubLib";
import type { PetRec, PayCoin } from "./petHubLib";
import {
  STALL_PAWLY, BREED_PAWLY, pullMarket, pushMarketRow, openStallRec,
  level1Pets, makeNft, nftAsPet, rankingOf, listedOf, marketPayHint, priceLabel,
  loadLocalNfts, saveLocalNfts, loadLocalStall, saveLocalStall,
} from "./petHubMarket";
import type { StallRec, NftRec } from "./petHubMarket";
import { payPeer } from "./petHubPeer";
import { nftPortrait, nftSpriteName, nftIdleKind, ensureIdleCss } from "./petHubNftArt";
import { StudioPanel } from "./petHubStudio";

type WalletBag = {
  publicKey?: PublicKey | null;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  sendTransaction?: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
};

type LayerProps = {
  where: "pins" | "tabs" | "panel";
  addr: string;
  wallet: WalletBag;
  pets: PetRec[];
  setPets: (p: PetRec[]) => void;
  payCoin: PayCoin;
  setPayCoin: (c: PayCoin) => void;
  px: { pawlyUsd: number; solUsd: number };
  busy: boolean;
  setBusy: (b: boolean) => void;
  setNote: (s: string) => void;
  setLastSig: (s: string) => void;
  setLastPaid: (n: number) => void;
  setLastTitle: (s: string) => void;
};

type Store = {
  tab: "play" | "stalls" | "rank";
  stalls: StallRec[];
  allNfts: NftRec[];
  myNfts: NftRec[];
  myStall: StallRec | null;
  pickA: string;
  pickB: string;
  listPrice: string;
  openStall: StallRec | null;
  zoom: NftRec | null;
};
const listeners = new Set<() => void>();
let store: Store = {
  tab: "play", stalls: [], allNfts: [], myNfts: [], myStall: null,
  pickA: "", pickB: "", listPrice: "200", openStall: null, zoom: null,
};
function setStore(patch: Partial<Store>) {
  store = { ...store, ...patch };
  listeners.forEach((fn) => fn());
}
function useStore() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return store;
}

export function setHubTab(tab: Store["tab"]) { setStore({ tab, zoom: null }); }

function NftLive({ n, size, onClick }: { n: NftRec; size: number; onClick?: (e: React.MouseEvent) => void }) {
  useEffect(() => { ensureIdleCss(); }, []);
  const src = useMemo(() => nftPortrait(n), [n.id, n.breedSig, n.name, n.species, n.art]);
  const idle = nftIdleKind(n);
  return (
    <img
      alt={nftSpriteName(n)}
      src={src}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        objectFit: "contain",
        borderRadius: 8,
        border: "1px solid rgba(0,255,157,0.35)",
        background: "#081018",
        imageRendering: "pixelated",
        animation: idle === "wing" ? "pawlyNftWing 0.9s ease-in-out infinite" : "pawlyNftBob 0.9s ease-in-out infinite",
        cursor: onClick ? "zoom-in" : "default",
      }}
    />
  );
}

function NftThumb({ n, size }: { n: NftRec; size: number }) {
  return (
    <NftLive
      n={n}
      size={size}
      onClick={(e) => { e.stopPropagation(); setStore({ zoom: store.zoom && store.zoom.id === n.id ? null : n }); }}
    />
  );
}

function ZoomCard({ n }: { n: NftRec }) {
  return (
    <button type="button" onClick={() => setStore({ zoom: null })} style={{ width: "100%", background: "transparent", border: "none", padding: 0, margin: "0 0 8px" }}>
      <div style={{ width: 160, height: 160, maxWidth: "48vw", margin: "0 auto" }}>
        <NftLive n={n} size={160} />
      </div>
      <div style={{ textAlign: "center", color: "#00ff9d", fontWeight: 800, fontSize: 13, marginTop: 4 }}>{nftSpriteName(n)}</div>
    </button>
  );
}

const card: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", marginBottom: 6, borderRadius: 10, border: "1px solid rgba(0,255,157,0.28)", background: "#0c1410", color: "#e8eef7", textAlign: "left" };
const tiny: React.CSSProperties = { ...ghost, padding: "4px 8px", fontSize: 11, flex: "0 0 auto" };

function pinOrder(stalls: StallRec[], addr: string) {
  const seen = new Set<string>();
  const out: StallRec[] = [];
  for (const st of stalls) {
    if (!st.wallet || seen.has(st.wallet)) continue;
    if (st.wallet === addr) { seen.add(st.wallet); out.push(st); }
  }
  const rest = stalls.filter((st) => st.wallet && st.wallet !== addr && !seen.has(st.wallet)).sort((a, b) => a.wallet.localeCompare(b.wallet));
  for (const st of rest) { seen.add(st.wallet); out.push(st); }
  return out;
}

function pinBox(i: number, count: number, mine: boolean): React.CSSProperties {
  const cols = count <= 2 ? 2 : 3;
  const col = i % cols;
  const row = Math.floor(i / cols);
  const gap = cols === 2 ? 52 : 30;
  return {
    position: "absolute",
    left: (6 + col * gap) + "%",
    bottom: (8 + row * 20) + "%",
    zIndex: mine ? 8 : 6,
    minWidth: 84,
    minHeight: 42,
    padding: "9px 12px",
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: 0.2,
    border: mine ? "2px solid #013322" : "2px solid #5a3a00",
    borderRadius: 10,
    background: mine ? "rgba(0,255,157,0.94)" : "rgba(255,210,80,0.94)",
    color: "#052015",
    boxShadow: "0 3px 10px rgba(0,0,0,0.5)",
    touchAction: "manipulation",
  };
}

export function StallLayer(props: LayerProps) {
  const s = useStore();
  const { addr } = props;
  useEffect(() => {
    if (props.where !== "panel") return;
    if (!addr) { setStore({ myNfts: [], myStall: null }); }
    else { setStore({ myNfts: loadLocalNfts(addr), myStall: loadLocalStall(addr) }); }
    let live = true;
    const tick = () => {
      void pullMarket().then((m) => {
        if (!live) return;
        const mine = addr ? m.nfts.filter((n) => n.owner === addr) : [];
        const cloudStall = addr ? m.stalls.find((x) => x.wallet === addr) || null : null;
        const keepArt = (list: NftRec[]) => list.map((n) => {
          const loc = store.myNfts.find((x) => x.id === n.id);
          return loc && loc.art && !n.art ? { ...n, art: loc.art } : n;
        });
        const nextMine = mine.length ? keepArt(mine) : store.myNfts;
        setStore({
          stalls: m.stalls,
          allNfts: keepArt(m.nfts),
          myNfts: nextMine,
          myStall: cloudStall || store.myStall,
        });
        if (addr && nextMine.length) saveLocalNfts(addr, nextMine);
        if (addr && cloudStall) saveLocalStall(addr, cloudStall);
      });
    };
    tick();
    const id = window.setInterval(tick, 20000);
    return () => { live = false; window.clearInterval(id); };
  }, [addr, props.where]);

  const flush = (nextStall: StallRec | null, nextNfts: NftRec[], dropIds?: string[]) => {
    if (!addr) return;
    saveLocalStall(addr, nextStall);
    saveLocalNfts(addr, nextNfts);
    setStore({ myStall: nextStall, myNfts: nextNfts });
    void pushMarketRow(addr, nextStall, nextNfts);
    const gone = new Set(dropIds || []);
    setStore({
      stalls: nextStall ? [...s.stalls.filter((x) => x.wallet !== addr), nextStall] : s.stalls.filter((x) => x.wallet !== addr),
      allNfts: [...s.allNfts.filter((n) => n.owner !== addr && !gone.has(n.id)), ...nextNfts],
    });
  };

  if (props.where === "pins") {
    const pins = pinOrder(s.stalls, addr);
    return (
      <>
        {pins.map((st, i) => (
          <button
            key={st.wallet}
            type="button"
            onClick={() => setStore({ openStall: st, tab: "stalls" })}
            style={pinBox(i, pins.length, st.wallet === addr)}
          >
            {st.wallet === addr ? "MY STALL" : "STALL"}
          </button>
        ))}
      </>
    );
  }

  if (props.where === "tabs") {
    return (
      <>
        <button type="button" onClick={() => setStore({ tab: s.tab === "stalls" ? "play" : "stalls", zoom: null, openStall: s.tab === "stalls" ? null : s.openStall })} style={{ ...ghost, flex: "0 0 auto", background: s.tab === "stalls" ? "rgba(0,255,157,0.28)" : ghost.background }}>Stalls</button>
        <button type="button" onClick={() => setStore({ tab: s.tab === "rank" ? "play" : "rank", zoom: null })} style={{ ...ghost, flex: "0 0 auto", background: s.tab === "rank" ? "rgba(0,255,157,0.28)" : ghost.background }}>Rank</button>
      </>
    );
  }

  if (s.tab === "play" && !s.zoom) return null;

  const ready = level1Pets(props.pets);
  const ranks = rankingOf(s.allNfts);
  const mineIds = new Set(s.myNfts.map((n) => n.id));
  const sales = listedOf(s.allNfts).filter((n) => n.owner !== addr && !mineIds.has(n.id));
  const sel = s.openStall && s.openStall.wallet !== addr ? sales.filter((n) => n.owner === s.openStall?.wallet) : sales;

  const payOpen = async () => {
    if (!props.wallet.publicKey) { props.setNote("Connect wallet in dApp first"); return; }
    if (s.myStall) { props.setNote("Stall already open"); return; }
    props.setBusy(true); props.setNote("Opening stall with PAWLY...");
    try {
      const sig = await payHub({ from: props.wallet.publicKey, coin: "PAWLY", amount: STALL_PAWLY, signTransaction: props.wallet.signTransaction, sendTransaction: props.wallet.sendTransaction, wallet: props.wallet as never });
      flush(openStallRec(addr, sig), s.myNfts);
      props.setLastSig(sig); props.setLastPaid(STALL_PAWLY); props.setLastTitle("Open stall"); props.setNote("");
    } catch (e) { props.setNote(String((e as { message?: string }).message || e)); } finally { props.setBusy(false); }
  };
  const payBreed = async () => {
    if (!props.wallet.publicKey) { props.setNote("Connect wallet in dApp first"); return; }
    if (!s.myStall) { props.setNote("Open a stall first (200 PAWLY)"); return; }
    const a = props.pets.find((p) => p.id === s.pickA);
    const b = props.pets.find((p) => p.id === s.pickB);
    if (!a || !b || a.id === b.id) { props.setNote("Pick two different Lv1 pets"); return; }
    if (Number(a.level || 0) < 1 || Number(b.level || 0) < 1) { props.setNote("Both pets must be Lv1+"); return; }
    props.setBusy(true); props.setNote("Minting species NFT with PAWLY...");
    try {
      const sig = await payHub({ from: props.wallet.publicKey, coin: "PAWLY", amount: BREED_PAWLY, signTransaction: props.wallet.signTransaction, sendTransaction: props.wallet.sendTransaction, wallet: props.wallet as never });
      const nft = makeNft({ owner: addr, a, b, sig });
      const nextPets = props.pets.filter((p) => p.id !== a.id && p.id !== b.id);
      props.setPets(nextPets); savePets(addr, nextPets);
      flush(s.myStall, [...s.myNfts, nft]);
      setStore({ pickA: "", pickB: "", zoom: null });
      props.setLastSig(sig); props.setLastPaid(BREED_PAWLY); props.setLastTitle("NFT " + nft.name); props.setNote("");
    } catch (e) { props.setNote(String((e as { message?: string }).message || e)); } finally { props.setBusy(false); }
  };
  const buyNft = async (n: NftRec) => {
    if (!props.wallet.publicKey) { props.setNote("Connect wallet in dApp first"); return; }
    if (n.owner === addr) { props.setNote("This is your NFT"); return; }
    if (!n.listed || !(Number(n.pricePawly) > 0)) { props.setNote("Not for sale"); return; }
    props.setBusy(true); props.setNote("P2P pay seller...");
    try {
      const sig = await payPeer({ from: props.wallet.publicKey, to: n.owner, amount: n.pricePawly, signTransaction: props.wallet.signTransaction, wallet: props.wallet as never });
      const sold = { ...n, owner: addr, listed: false, highPrice: Math.max(Number(n.highPrice || 0), n.pricePawly) };
      void pushMarketRow(n.owner, s.stalls.find((x) => x.wallet === n.owner) || null, s.allNfts.filter((x) => x.owner === n.owner && x.id !== n.id));
      flush(s.myStall, [...s.myNfts, sold], [n.id]);
      props.setLastSig(sig); props.setLastPaid(n.pricePawly); props.setLastTitle("Buy " + nftSpriteName(n)); props.setNote("");
    } catch (e) { props.setNote(String((e as { message?: string }).message || e)); } finally { props.setBusy(false); }
  };

  if (s.tab === "play" && s.zoom) {
    return <ZoomCard n={s.zoom} />;
  }

  return (
    <>
      {s.tab === "stalls" ? (
        <div style={{ width: "100%", marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 13 }}>{s.myStall ? "My stall" : "Open stall"}</div>
            <button type="button" style={tiny} onClick={() => setStore({ tab: "play", zoom: null, openStall: null })}>Close</button>
          </div>
          {s.zoom ? <ZoomCard n={s.zoom} /> : null}
          {!s.myStall ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              <button type="button" disabled={props.busy || !addr} style={{ ...primary, flex: 1, padding: "8px 10px", opacity: props.busy ? 0.6 : 1 }} onClick={() => void payOpen()}>{props.busy ? "Paying..." : "200 PAWLY"}</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <select value={s.pickA} onChange={(e) => setStore({ pickA: e.target.value })} style={{ flex: 1, background: "#0b1610", color: "#e8eef7", border: "1px solid rgba(0,255,157,0.35)", borderRadius: 8, padding: 6, fontSize: 12 }}>
                <option value="">Lv1 A</option>
                {ready.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
              <select value={s.pickB} onChange={(e) => setStore({ pickB: e.target.value })} style={{ flex: 1, background: "#0b1610", color: "#e8eef7", border: "1px solid rgba(0,255,157,0.35)", borderRadius: 8, padding: 6, fontSize: 12 }}>
                <option value="">Lv1 B</option>
                {ready.filter((p) => p.id !== s.pickA).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
              <button type="button" disabled={props.busy} style={{ ...primary, padding: "8px 10px", opacity: props.busy ? 0.6 : 1 }} onClick={() => void payBreed()}>{props.busy ? "..." : "Mint 80"}</button>
            </div>
          )}
          {s.myStall ? (
            <StudioPanel
              addr={addr}
              hasStall={!!s.myStall}
              busy={props.busy}
              wallet={props.wallet}
              setBusy={props.setBusy}
              setNote={props.setNote}
              setLastSig={props.setLastSig}
              setLastPaid={props.setLastPaid}
              setLastTitle={props.setLastTitle}
              onMinted={(nft) => {
                flush(s.myStall, [...s.myNfts, nft]);
                const next = [...props.pets.filter((p) => p.id !== nft.id), nftAsPet(nft)].slice(0, 10);
                props.setPets(next);
                savePets(addr, next);
              }}
            />
          ) : null}
          <div style={{ fontSize: 10, color: "#8aa", margin: "-4px 0 8px" }}>"Pay PAWLY only. Swap other coins in dApp Swap first."</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input value={s.listPrice} onChange={(e) => setStore({ listPrice: e.target.value })} placeholder="price" style={{ width: 88, padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(0,255,157,0.35)", background: "#0b1610", color: "#e8eef7", fontSize: 12 }} />
            <div style={{ fontSize: 11, color: "#8aa", alignSelf: "center" }}>your PAWLY price</div>
          </div>
          {s.myNfts.map((n) => (
            <div key={n.id} style={card}>
              <NftThumb n={n} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nftSpriteName(n)}</div>
                <div style={{ fontSize: 10, color: "#9f8" }}>{"g" + Number(n.gen || 1) + " \u00b7 " + priceLabel(n)}</div>
              </div>
              {n.listed
                ? <button type="button" style={tiny} onClick={() => flush(s.myStall, s.myNfts.map((x) => x.id === n.id ? { ...x, listed: false } : x))}>Unlist</button>
                : <button type="button" style={tiny} onClick={() => { if (!s.myStall) { props.setNote("Open a stall first (200 PAWLY)"); return; } const price = Number(s.listPrice); if (!(price > 0)) { props.setNote("Set your own PAWLY price"); return; } flush(s.myStall, s.myNfts.map((x) => x.id === n.id ? { ...x, listed: true, pricePawly: price, highPrice: Math.max(Number(x.highPrice || 0), price) } : x)); }}>{s.myStall ? "List" : "Need stall"}</button>}
            </div>
          ))}
          <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 13, margin: "10px 0 6px" }}>{s.openStall && s.openStall.wallet !== addr ? "This stall" : "Market"}</div>
          {sel.map((n) => (
            <div key={n.id} style={card}>
              <NftThumb n={n} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{nftSpriteName(n)}</div>
                <div style={{ fontSize: 10, color: "#9f8" }}>{n.owner.slice(0, 4) + "... \u00b7 " + priceLabel(n)}</div>
              </div>
              <button type="button" style={{ ...tiny, borderColor: "#00ff9d", color: "#00ff9d" }} disabled={props.busy} onClick={() => void buyNft(n)}>Buy</button>
            </div>
          ))}
          {!sel.length ? <div style={{ fontSize: 12, color: "#8aa", marginBottom: 8 }}>No listed NFT to buy yet.</div> : null}
        </div>
      ) : null}
      {s.tab === "rank" ? (
        <div style={{ width: "100%", marginTop: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 13 }}>Highest user price</div>
            <button type="button" style={tiny} onClick={() => setStore({ tab: "play", zoom: null })}>Close</button>
          </div>
          {ranks.map((r, i) => (
            <div key={r.wallet} style={card}>
              <div style={{ width: 28, fontWeight: 800, color: "#00ff9d" }}>#{i + 1}</div>
              <div style={{ flex: 1 }}>{r.name === "Mini-Stray" || String(r.name).indexOf("hybrid") >= 0 ? r.species : r.name}</div>
              <div style={{ color: "#c8ffe8", fontSize: 12 }}>{r.highPrice}</div>
            </div>
          ))}
          {!ranks.length ? <div style={{ fontSize: 12, color: "#8aa" }}>No priced NFT yet.</div> : null}
        </div>
      ) : null}
    </>
  );
}
