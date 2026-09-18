import React, { useEffect, useState } from "react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { payHub, quoteCoin, ghost, primary, rowBtn, savePets } from "./petHubLib";
import type { PetRec, PayCoin } from "./petHubLib";
import {
  STALL_PAWLY, BREED_PAWLY, pullMarket, pushMarketRow, openStallRec,
  level1Pets, makeNft, rankingOf, listedOf, stallLabel, marketPayHint,
  loadLocalNfts, saveLocalNfts, loadLocalStall, saveLocalStall,
} from "./petHubMarket";
import type { StallRec, NftRec } from "./petHubMarket";
import { payPeer } from "./petHubPeer";

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
};
const listeners = new Set<() => void>();
let store: Store = {
  tab: "play", stalls: [], allNfts: [], myNfts: [], myStall: null,
  pickA: "", pickB: "", listPrice: "200", openStall: null,
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
        setStore({
          stalls: m.stalls,
          allNfts: m.nfts,
          myNfts: mine.length ? mine : store.myNfts,
          myStall: cloudStall || store.myStall,
        });
        if (addr && mine.length) saveLocalNfts(addr, mine);
        if (addr && cloudStall) saveLocalStall(addr, cloudStall);
      });
    };
    tick();
    const id = window.setInterval(tick, 20000);
    return () => { live = false; window.clearInterval(id); };
  }, [addr, props.where]);

  const flush = (nextStall: StallRec | null, nextNfts: NftRec[]) => {
    if (!addr) return;
    saveLocalStall(addr, nextStall);
    saveLocalNfts(addr, nextNfts);
    setStore({ myStall: nextStall, myNfts: nextNfts });
    void pushMarketRow(addr, nextStall, nextNfts);
    setStore({
      stalls: nextStall ? [...s.stalls.filter((x) => x.wallet !== addr), nextStall] : s.stalls.filter((x) => x.wallet !== addr),
      allNfts: [...s.allNfts.filter((n) => n.owner !== addr), ...nextNfts],
    });
  };

  if (props.where === "pins") {
    return (
      <>
        {s.stalls.map((st) => (
          <button key={st.wallet} type="button" onClick={() => setStore({ openStall: st, tab: "stalls" })} style={{ position: "absolute", left: (8 + st.slot * 11) + "%", bottom: (28 + (st.slot % 3) * 6) + "%", zIndex: 5, background: st.wallet === addr ? "rgba(0,255,157,0.85)" : "rgba(255,210,80,0.9)", color: "#052015", border: "none", borderRadius: 8, padding: "4px 6px", fontSize: 10, fontWeight: 800 }}>
            {st.wallet === addr ? "MY STALL" : "STALL"}
          </button>
        ))}
      </>
    );
  }

  if (props.where === "tabs") {
    return (
      <>
        <button type="button" onClick={() => setStore({ tab: "stalls" })} style={{ ...ghost, flex: "0 0 auto", background: s.tab === "stalls" ? "rgba(0,255,157,0.28)" : ghost.background }}>Stalls</button>
        <button type="button" onClick={() => setStore({ tab: "rank" })} style={{ ...ghost, flex: "0 0 auto", background: s.tab === "rank" ? "rgba(0,255,157,0.28)" : ghost.background }}>Rank</button>
      </>
    );
  }

  const ready = level1Pets(props.pets);
  const ranks = rankingOf(s.allNfts);
  const sales = listedOf(s.allNfts);
  const sep = " - ";

  const payOpen = async () => {
    if (!props.wallet.publicKey) { props.setNote("Connect wallet in dApp first"); return; }
    if (s.myStall) { props.setNote("Stall already open"); return; }
    const payAmt = quoteCoin(STALL_PAWLY, props.payCoin, props.px);
    if (props.payCoin !== "PAWLY" && payAmt.amount <= 0) { props.setNote("No live price, use PAWLY"); return; }
    props.setBusy(true); props.setNote("Opening stall...");
    try {
      const sig = await payHub({ from: props.wallet.publicKey, coin: props.payCoin, amount: payAmt.amount, signTransaction: props.wallet.signTransaction, sendTransaction: props.wallet.sendTransaction, wallet: props.wallet as never });
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
    const payAmt = quoteCoin(BREED_PAWLY, props.payCoin, props.px);
    if (props.payCoin !== "PAWLY" && payAmt.amount <= 0) { props.setNote("No live price, use PAWLY"); return; }
    props.setBusy(true); props.setNote("Breeding new species...");
    try {
      const sig = await payHub({ from: props.wallet.publicKey, coin: props.payCoin, amount: payAmt.amount, signTransaction: props.wallet.signTransaction, sendTransaction: props.wallet.sendTransaction, wallet: props.wallet as never });
      const nft = makeNft({ owner: addr, a, b, sig });
      const nextPets = props.pets.filter((p) => p.id !== a.id && p.id !== b.id);
      props.setPets(nextPets); savePets(addr, nextPets);
      flush(s.myStall, [...s.myNfts, nft]);
      setStore({ pickA: "", pickB: "" });
      props.setLastSig(sig); props.setLastPaid(BREED_PAWLY); props.setLastTitle("Breed " + nft.name); props.setNote("");
    } catch (e) { props.setNote(String((e as { message?: string }).message || e)); } finally { props.setBusy(false); }
  };
  const buyNft = async (n: NftRec) => {
    if (!props.wallet.publicKey) { props.setNote("Connect wallet in dApp first"); return; }
    if (n.owner === addr) { props.setNote("This is your NFT"); return; }
    if (!n.listed || !(n.pricePawly > 0)) { props.setNote("Not for sale"); return; }
    props.setBusy(true); props.setNote("P2P pay seller...");
    try {
      const sig = await payPeer({ from: props.wallet.publicKey, to: n.owner, amount: n.pricePawly, signTransaction: props.wallet.signTransaction, wallet: props.wallet as never });
      const sold = { ...n, owner: addr, listed: false, highPrice: Math.max(Number(n.highPrice || 0), n.pricePawly) };
      void pushMarketRow(n.owner, s.stalls.find((x) => x.wallet === n.owner) || null, s.allNfts.filter((x) => x.owner === n.owner && x.id !== n.id));
      flush(s.myStall, [...s.myNfts, sold]);
      props.setLastSig(sig); props.setLastPaid(n.pricePawly); props.setLastTitle("Buy " + n.name); props.setNote("");
    } catch (e) { props.setNote(String((e as { message?: string }).message || e)); } finally { props.setBusy(false); }
  };

  return (
    <>
      {s.tab === "stalls" ? (
        <div style={{ width: "100%", marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "#8aa", marginBottom: 8 }}>Any wallet in Pet Hub sees live stalls. Open stall {STALL_PAWLY} PAWLY to till, appears at once.</div>
          {s.myStall ? <div style={{ color: "#00ff9d", fontSize: 12, marginBottom: 8 }}>Your stall is live{sep}{s.myStall.sig.slice(0, 16)}...</div> : (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>{(["PAWLY", "USDC", "USDT", "SOL"] as PayCoin[]).map((c) => (<button key={c} type="button" onClick={() => props.setPayCoin(c)} style={{ ...ghost, borderColor: props.payCoin === c ? "#00ff9d" : "rgba(255,255,255,0.2)", color: props.payCoin === c ? "#00ff9d" : "#c8ffe8" }}>{c}</button>))}</div>
              <div style={{ fontSize: 11, color: "#8aa", marginBottom: 6 }}>{marketPayHint("stall", props.payCoin)}{sep}{quoteCoin(STALL_PAWLY, props.payCoin, props.px).label}</div>
              <button type="button" disabled={props.busy || !addr} style={{ ...primary, width: "100%", opacity: props.busy ? 0.6 : 1 }} onClick={() => void payOpen()}>{props.busy ? "Paying..." : "Open stall - " + quoteCoin(STALL_PAWLY, props.payCoin, props.px).label}</button>
            </div>
          )}
          <div style={{ color: "#00ff9d", fontWeight: 800, margin: "8px 0 6px" }}>Breed new species NFT</div>
          <div style={{ fontSize: 11, color: "#8aa", marginBottom: 6 }}>Need 2 Lv1 + open stall. Combine {BREED_PAWLY} PAWLY to till.</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <select value={s.pickA} onChange={(e) => setStore({ pickA: e.target.value })} style={{ flex: 1, background: "#0b1610", color: "#e8eef7", border: "1px solid rgba(0,255,157,0.35)", borderRadius: 8, padding: 6 }}>
              <option value="">Pet A</option>
              {ready.map((p) => (<option key={p.id} value={p.id}>{p.name} Lv{Number(p.level || 0)}</option>))}
            </select>
            <select value={s.pickB} onChange={(e) => setStore({ pickB: e.target.value })} style={{ flex: 1, background: "#0b1610", color: "#e8eef7", border: "1px solid rgba(0,255,157,0.35)", borderRadius: 8, padding: 6 }}>
              <option value="">Pet B</option>
              {ready.filter((p) => p.id !== s.pickA).map((p) => (<option key={p.id} value={p.id}>{p.name} Lv{Number(p.level || 0)}</option>))}
            </select>
          </div>
          <button type="button" disabled={props.busy || !s.myStall} style={{ ...primary, width: "100%", opacity: props.busy || !s.myStall ? 0.6 : 1 }} onClick={() => void payBreed()}>{props.busy ? "Paying..." : "Breed - " + quoteCoin(BREED_PAWLY, props.payCoin, props.px).label}</button>
          <div style={{ color: "#00ff9d", fontWeight: 800, margin: "12px 0 6px" }}>My NFT</div>
          <input value={s.listPrice} onChange={(e) => setStore({ listPrice: e.target.value })} placeholder="your PAWLY price" style={{ width: "100%", marginBottom: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,255,157,0.35)", background: "#0b1610", color: "#e8eef7" }} />
          {s.myNfts.length ? s.myNfts.map((n) => (
            <div key={n.id} style={{ ...rowBtn, display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>{n.emoji} {n.name}</span><span>gen{n.gen}</span></div>
              <div style={{ fontSize: 10, color: "#8aa" }}>{n.species}{sep}{n.listed ? n.pricePawly + " PAWLY" : "not listed"}</div>
              {n.listed
                ? <button type="button" style={{ ...ghost, width: "100%", marginTop: 4 }} onClick={() => flush(s.myStall, s.myNfts.map((x) => x.id === n.id ? { ...x, listed: false } : x))}>Unlist</button>
                : <button type="button" style={{ ...ghost, width: "100%", marginTop: 4 }} onClick={() => { const price = Number(s.listPrice); if (!(price > 0)) { props.setNote("Set your own PAWLY price"); return; } flush(s.myStall, s.myNfts.map((x) => x.id === n.id ? { ...x, listed: true, pricePawly: price, highPrice: Math.max(Number(x.highPrice || 0), price) } : x)); }}>List at {s.listPrice} PAWLY</button>}
            </div>
          )) : <div style={{ fontSize: 12, color: "#8aa" }}>No NFT yet. Breed two Lv1 pets.</div>}
          <div style={{ color: "#00ff9d", fontWeight: 800, margin: "12px 0 6px" }}>{s.openStall ? stallLabel(s.openStall, addr) : "All stalls"}</div>
          {(s.openStall ? sales.filter((n) => n.owner === s.openStall?.wallet) : sales).map((n) => (
            <button key={n.id} type="button" style={rowBtn} onClick={() => void buyNft(n)}>
              <span>{n.emoji} {n.name}{sep}{n.owner.slice(0, 4)}...</span>
              <span>{n.pricePawly} PAWLY</span>
            </button>
          ))}
          {!sales.length ? <div style={{ fontSize: 12, color: "#8aa" }}>No listings yet.</div> : null}
        </div>
      ) : null}
      {s.tab === "rank" ? (
        <div style={{ width: "100%", marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "#8aa", marginBottom: 8 }}>Team ranking only. Highest user-set NFT price.</div>
          {ranks.length ? ranks.map((r, i) => (
            <div key={r.wallet} style={{ ...rowBtn }}>
              <span>#{i + 1} {r.name}{sep}{r.wallet.slice(0, 4)}...</span>
              <span>{r.highPrice} PAWLY</span>
            </div>
          )) : <div style={{ fontSize: 12, color: "#8aa" }}>No priced NFT yet.</div>}
        </div>
      ) : null}
    </>
  );
}
