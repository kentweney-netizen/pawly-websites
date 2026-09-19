/**
 * PAWLY Pet Hub v0.4.12 — checkout uses dApp Payment/Transfer sign path.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { usePawlyWallet } from "./localWallet";
import { PetRig, PET_RIG_CSS } from "./petAvatar";
import {
  PET_SLOT_CAP, FEED_DAY_MAX, sgDay, feedsTodayOf, pickFeedPet,
  loadPets, savePets, mergePetLists, pullCloudPets, loadEmail, saveEmail,
  drawPetPhotoPng, drawCertPng, downloadDataUrl, asset, fetchHubPx, quoteCoin, quoteHubSwap, payHub, requireHubPaySuccess, HUB_POOL,
  COMPANIONS, RESCUES, FOODS, TITLE, SHOPS, CLIP, ghost, primary, rowBtn,
} from "./petHubLib";
import type { SceneId, PetRec, CartItem, CertJob, PayCoin } from "./petHubLib";
import { StallLayer } from "./petHubStalls";

const VER = "v0.4.12";
const BGM_MP3 = asset("we-love-animals.mp3");
const BGM_WAV = asset("we-love-animals.wav");

export function PetHubPage() {
  const navigate = useNavigate();
  const wallet = usePawlyWallet() as { publicKey?: PublicKey | null; wallet?: unknown; adapter?: unknown; signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>; sendTransaction?: (tx: VersionedTransaction, conn: Connection) => Promise<string> };
  const addr = (wallet.publicKey && wallet.publicKey.toBase58()) || "";
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const [scene, setScene] = useState<SceneId>("street");
  const [shopView, setShopView] = useState<"home" | "adopt" | "food">("home");
  const [focusId, setFocusId] = useState("");
  const [feedWarn, setFeedWarn] = useState(false);
  const [pets, setPets] = useState<PetRec[]>(() => loadPets(addr));
  const [cart, setCart] = useState<CartItem | null>(null);
  const [payCoin, setPayCoin] = useState<PayCoin>("PAWLY");
  const [px, setPx] = useState({ pawlyUsd: 0, solUsd: 0, pawlyPerUsdc: 0, src: "" });
  const [swapQ, setSwapQ] = useState<{ outPawly: number; impact: number; poolId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [lastSig, setLastSig] = useState("");
  const [lastPaid, setLastPaid] = useState(0);
  const [lastTitle, setLastTitle] = useState("");
  const [cert, setCert] = useState<CertJob | null>(null);
  const [email, setEmail] = useState(() => loadEmail());
  const hint = useMemo(() => (addr ? addr.slice(0, 4) + "..." + addr.slice(-4) : "connect wallet"), [addr]);
  useEffect(() => { void fetchHubPx().then(setPx); const id = window.setInterval(() => { void fetchHubPx().then(setPx); }, 45000); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    if (!cart || payCoin === "PAWLY") { setSwapQ(null); return; }
    const coinAmt = quoteCoin(cart.amount, payCoin, px).amount;
    if (!(coinAmt > 0)) { setSwapQ(null); return; }
    let live = true;
    void quoteHubSwap(payCoin, coinAmt).then((q) => { if (live) setSwapQ(q.outPawly > 0 ? q : null); });
    return () => { live = false; };
  }, [cart, payCoin, px.pawlyUsd, px.solUsd]);
  useEffect(() => {
    if (!addr) { setPets([]); return; }
    setPets(loadPets(addr));
    let live = true;
    void pullCloudPets(addr).then((cloud) => {
      if (!live) return;
      setPets((prev) => { const next = mergePetLists(prev, cloud); savePets(addr, next); return next; });
    });
    return () => { live = false; };
  }, [addr]);
  useEffect(() => {
    const el = bgmRef.current;
    if (!el) return;
    el.loop = true;
    el.volume = 0.34;
    const kick = () => { if (el.paused) void el.play().catch(() => {}); };
    void el.play().catch(() => {});
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    document.addEventListener("pointerdown", kick, opts);
    document.addEventListener("touchstart", kick, opts);
    document.addEventListener("click", kick, opts);
    return () => {
      document.removeEventListener("pointerdown", kick, opts);
      document.removeEventListener("touchstart", kick, opts);
      document.removeEventListener("click", kick, opts);
      el.pause();
    };
  }, []);
  const openCart = (item: CartItem) => {
    setNote("");
    if (item.kind === "food") {
      const pet = pickFeedPet(pets, item.petId || focusId);
      if (!pet) { setNote("Adopt a pet first"); return; }
      if (feedsTodayOf(pet) >= FEED_DAY_MAX) { setNote(pet.name + " already fed 3/3 today"); return; }
    }
    setCart(item);
  };
  const confirmPay = async () => {
    if (!cart) return;
    if (!wallet.publicKey) { setNote("Connect wallet in dApp first"); return; }
    if ((cart.kind === "adopt" || cart.kind === "rescue") && pets.length >= PET_SLOT_CAP) { setNote("Max 10 pets"); return; }
    const payAmt = quoteCoin(cart.amount, payCoin, px);
    if (payCoin !== "PAWLY" && payAmt.amount <= 0) { setNote("No live price, use PAWLY"); return; }
    setBusy(true); setNote("Sign " + payCoin + " like Payment");
    const watchdog = window.setTimeout(() => {
      setBusy(false);
      setNote("Network slow / 网络慢。若钱包已签名请到 Solscan 核对，勿连点付款。");
    }, 28000);
    try {
      const sig = await payHub({
        from: wallet.publicKey, coin: payCoin, amount: payAmt.amount, listPawly: cart.amount,
        signTransaction: wallet.signTransaction, sendTransaction: wallet.sendTransaction, wallet: wallet as never,
        onPhase: (_p, label) => setNote(label),
      });
      setNote("Checking on-chain...");
      await requireHubPaySuccess(sig, cart.amount);
      if (cart.kind === "adopt" || cart.kind === "rescue") {
        const next: PetRec[] = [...pets, { id: "pet_" + Date.now(), kind: cart.kind === "rescue" ? "rescued" : "adopted", species: cart.species || "dog", name: cart.title.replace(/^(Adopt|Rescue)\s+/i, ""), emoji: cart.emoji || "\ud83d\udc3e", hunger: 70, health: 80, streak: 0, pricePawly: cart.amount, sig, feedsTotal: 0, level: 0 }].slice(0, PET_SLOT_CAP);
        setPets(next); savePets(addr, next);
      }
      if (cart.kind === "food") {
        const id = cart.petId || focusId || (pets[0] && pets[0].id) || "";
        const next = pets.map((p) => {
          if (p.id !== id) return p;
          const total = Number(p.feedsTotal || 0) + 1; const today = sgDay();
          const todayN = String(p.feedDay || "") === today ? Number(p.feedsToday || 0) + 1 : 1;
          return { ...p, feedsTotal: total, feedsToday: todayN, feedDay: today, level: Math.floor(total / 10) };
        });
        setPets(next); savePets(addr, next);
      }
      setLastSig(sig); setLastPaid(cart.amount); setLastTitle(cart.title); setNote(""); setCart(null);
      if (cart.kind === "adopt" || cart.kind === "rescue") {
        const job: CertJob = { title: cart.title, amount: cart.amount, kind: cart.kind, species: cart.species, emoji: cart.emoji, sig };
        job.photoPng = drawPetPhotoPng(job.emoji || "\ud83d\udc3e", job.title); job.certPng = drawCertPng(job); setCert(job);
      }
    } catch (e) { setNote(String((e as { message?: string }).message || e)); } finally { window.clearTimeout(watchdog); setBusy(false); }
  };
  const walkers = pets.filter((p) => Number(p.level || 0) >= 1).slice(0, PET_SLOT_CAP);
  const sep = " - ";
  const stallProps = { addr, wallet: wallet as never, pets, setPets: setPets as never, payCoin, setPayCoin, px, busy, setBusy, setNote, setLastSig, setLastPaid, setLastTitle };
  return (
    <div style={{ height: "100dvh", overflow: "hidden", background: "#070b10", color: "#e8eef7", display: "flex", flexDirection: "column", position: "relative", maxWidth: 430, margin: "0 auto" }}>
      <style>{PET_RIG_CSS}</style>
      <audio ref={bgmRef} autoPlay loop playsInline preload="auto" style={{ display: "none" }}>
        <source src={BGM_MP3} type="audio/mpeg" />
        <source src={BGM_WAV} type="audio/wav" />
      </audio>
      <div style={{ padding: "calc(env(safe-area-inset-top, 16px) + 18px) 10px 8px" }}>
        <div style={{ color: "#00ff9d", fontWeight: 800 }}>{TITLE[scene] + sep + VER}</div>
        <div style={{ color: "#8aa", fontSize: 11 }}>{hint}{px.pawlyUsd ? sep + "PAWLY $" + px.pawlyUsd.toFixed(4) : ""}{sep}stalls</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#0a1016" }}>
        <video key={scene} src={asset(CLIP[scene])} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        {scene === "street" ? <StallLayer where="pins" {...stallProps} /> : null}
        {scene === "street" && walkers.map((p, i) => (
          <button key={p.id} type="button" className={"pawly-stroll pawly-stroll-" + (i % 10)} onClick={() => { setFocusId(p.id); setFeedWarn(true); }}>
            <PetRig pet={{ species: p.species, level: Math.max(1, Number(p.level || 1)), emoji: p.emoji, name: p.name }} size={64} moving />
          </button>
        ))}
      </div>
      <div style={{ zIndex: 2, padding: "8px 8px 10px", background: "#070b10", maxHeight: "46dvh", overflowY: "auto" }}>
        {scene === "street" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", padding: "6px 0 10px" }}>
            {pets.length ? pets.map((p) => (
              <button key={p.id} type="button" onClick={() => { setFocusId(p.id); setFeedWarn(true); }} style={{ background: focusId === p.id ? "rgba(0,255,157,0.18)" : "transparent", border: "none", color: "#e8eef7" }}>
                <PetRig pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name }} size={Number(p.level || 0) >= 1 ? 56 : 32} />
                <div style={{ fontSize: 11, fontWeight: 800 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "#9f8" }}>{"Lv" + Number(p.level || 0) + sep + Number(p.feedsTotal || 0) + " feeds" + sep + "today " + feedsTodayOf(p) + "/3"}</div>
              </button>
            )) : <div style={{ color: "#8aa", fontSize: 12 }}>Adopt in Shop to see your pet here.</div>}
          </div>
        )}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 8 }}>
          <button type="button" onClick={() => { setScene("street"); setShopView("home"); }} style={{ ...ghost, flex: "0 0 auto", background: scene === "street" ? "rgba(0,255,157,0.28)" : ghost.background }}>Street</button>
          {SHOPS.map((s) => (<button key={s.id} type="button" onClick={() => { setScene(s.id); setShopView("home"); }} style={{ ...ghost, flex: "0 0 auto", background: scene === s.id ? "rgba(0,255,157,0.28)" : ghost.background }}>{s.label}</button>))}
          <StallLayer where="tabs" {...stallProps} />
        </div>
        <StallLayer where="panel" {...stallProps} />
        {scene === "shop" && shopView === "home" && (<div><button type="button" style={{ ...primary, width: "100%", marginBottom: 8 }} onClick={() => setShopView("adopt")}>Choose your pets</button><button type="button" style={{ ...primary, width: "100%" }} onClick={() => setShopView("food")}>Pets food</button></div>)}
        {scene === "shop" && shopView === "adopt" && (<div><button type="button" style={{ ...ghost, marginBottom: 8 }} onClick={() => setShopView("home")}>Back to Shop</button>{COMPANIONS.map((c) => (<button key={c.species} type="button" style={rowBtn} onClick={() => openCart({ title: "Adopt " + c.label, amount: c.pricePawly, kind: "adopt", species: c.species, emoji: c.emoji })}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><PetRig pet={{ species: c.species, level: 1, emoji: c.emoji, name: c.label }} size={28} />{c.label}</span><span>{c.pricePawly} PAWLY</span></button>))}</div>)}
        {scene === "shop" && shopView === "food" && (<div><button type="button" style={{ ...ghost, marginBottom: 8 }} onClick={() => setShopView("home")}>Back to Shop</button>{FOODS.map((c) => (<button key={c.id} type="button" style={rowBtn} onClick={() => openCart({ title: c.label, amount: c.pricePawly, kind: "food", emoji: c.emoji, petId: focusId || (pets[0] && pets[0].id) || undefined })}><span>{c.emoji + " " + c.label}</span><span>{c.pricePawly} PAWLY</span></button>))}</div>)}
        {scene === "shelter" && RESCUES.map((c) => (<button key={c.species} type="button" style={rowBtn} onClick={() => openCart({ title: "Rescue " + c.label, amount: c.pricePawly, kind: "rescue", species: c.species, emoji: c.emoji })}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><PetRig pet={{ species: c.species, level: 1, emoji: c.emoji, name: c.label }} size={28} />{c.label}</span><span>{c.pricePawly} PAWLY</span></button>))}
        {scene === "hospital" && <button type="button" style={{ ...primary, width: "100%" }} onClick={() => openCart({ title: "Hospital checkup", amount: 40, kind: "service" })}>Pay 40 PAWLY - checkup</button>}
        {scene === "park" && <button type="button" style={{ ...primary, width: "100%" }} onClick={() => openCart({ title: "Walk the dog", amount: 15, kind: "service" })}>Pay 15 PAWLY - walk</button>}
        {(scene === "hotel" || scene === "groom") && <button type="button" style={{ ...primary, width: "100%" }} onClick={() => openCart({ title: TITLE[scene], amount: scene === "hotel" ? 50 : 30, kind: "service" })}>Pay {scene === "hotel" ? 50 : 30} PAWLY</button>}
        {note ? <div style={{ color: "#ffb4b4", fontSize: 11, marginTop: 6, wordBreak: "break-word" }}>{note}</div> : null}
        {lastSig ? (
          <div style={{ marginTop: 8, padding: "8px 8px 6px", border: "1px solid rgba(0,255,157,0.35)", borderRadius: 10, background: "#0c1410" }}>
            <div style={{ color: "#00ff9d", fontSize: 12, fontWeight: 800 }}>Paid {lastPaid} PAWLY{sep}{lastTitle}</div>
            <div style={{ color: "#c8ffe8", fontSize: 10, lineHeight: 1.35, wordBreak: "break-all", margin: "4px 0 6px" }}>{lastSig}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" style={{ ...ghost, flex: 1 }} onClick={() => { try { navigator.clipboard.writeText(lastSig); } catch { /* ignore */ } }}>Copy sig</button>
              <button type="button" style={{ ...ghost, flex: 1 }} onClick={() => window.open("https://solscan.io/tx/" + lastSig, "_blank")}>Solscan</button>
            </div>
          </div>
        ) : null}
        <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => navigate("/")}>Home</button>
      </div>
      {feedWarn ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end" }} onClick={() => setFeedWarn(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800 }}>Feed this pet</div>
            <div style={{ fontSize: 13, margin: "8px 0 12px" }}>Max 3 feeds per day. 10 feeds = Lv1 full body on the street.</div>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => { setFeedWarn(false); setScene("shop"); setShopView("food"); }}>Go to Pets food</button>
            <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setFeedWarn(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
      {cart ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 6, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end" }} onClick={() => !busy && setCart(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800 }}>Pet Hub checkout</div>
            <div style={{ fontSize: 11, color: "#8aa", marginTop: 4 }}>Same as dApp Payment / Transfer. One signature. PAWLY / USDC / USDT / SOL goes to shop till BPFiVa5.</div>
            <div style={{ margin: "8px 0 4px" }}>{cart.emoji ? cart.emoji + " " : ""}{cart.title}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{cart.amount} PAWLY</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>{(["PAWLY", "USDC", "USDT", "SOL"] as PayCoin[]).map((c) => (<button key={c} type="button" onClick={() => setPayCoin(c)} style={{ ...ghost, borderColor: payCoin === c ? "#00ff9d" : "rgba(255,255,255,0.2)", color: payCoin === c ? "#00ff9d" : "#c8ffe8" }}>{c}</button>))}</div>
            <div style={{ fontSize: 14, color: "#c8ffe8", marginBottom: 6 }}>{quoteCoin(cart.amount, payCoin, px).label}{px.pawlyUsd ? sep + "PAWLY $" + px.pawlyUsd.toFixed(4) : ""}{px.src ? sep + px.src : ""}</div>
            {px.pawlyPerUsdc ? <div style={{ fontSize: 11, color: "#9f8", marginBottom: 4 }}>{"1 USDC ≈ " + px.pawlyPerUsdc.toFixed(2) + " PAWLY on-chain"}</div> : null}
            {payCoin !== "PAWLY" ? (
              <div style={{ fontSize: 11, color: "#c8ffe8", marginBottom: 8, lineHeight: 1.35 }}>
                {"Pay " + payCoin + " direct to shop till — same as Payment page."}
              </div>
            ) : null}
            <button type="button" disabled={busy} style={{ ...primary, width: "100%", opacity: busy ? 0.6 : 1 }} onClick={() => void confirmPay()}>{busy ? (note || "Paying...") : "Confirm - " + quoteCoin(cart.amount, payCoin, px).label}</button>
            {busy ? <div style={{ fontSize: 11, color: "#c8ffe8", marginTop: 8 }}>Sign once in wallet. Do not tap twice.</div> : null}
            <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => { setBusy(false); setCart(null); }}>{busy ? "Unlock / 解锁" : "Cancel"}</button>
          </div>
        </div>
      ) : null}
      {cert ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 7, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 16 }}>Certificate + photo</div>
            <div style={{ margin: "10px 0", padding: 10, borderRadius: 12, background: "#0b1610", border: "1px solid rgba(0,255,157,0.35)", textAlign: "center" }}>
              {cert.photoPng ? <img alt="pet" src={cert.photoPng} onClick={() => downloadDataUrl("pawly-pet.png", cert.photoPng || "")} style={{ width: "46%", borderRadius: 10, marginRight: 6 }} /> : <div style={{ fontSize: 52 }}>{cert.emoji}</div>}
              {cert.certPng ? <img alt="certificate" src={cert.certPng} onClick={() => downloadDataUrl("pawly-certificate.png", cert.certPng || "")} style={{ width: "46%", borderRadius: 10 }} /> : null}
              <div style={{ fontWeight: 800, marginTop: 8 }}>{cert.title}</div>
              <div style={{ fontSize: 12, color: "#c8ffe8" }}>{cert.amount} PAWLY{sep}generated certificate + photo</div>
              <div style={{ fontSize: 10, color: "#8aa", marginTop: 6, wordBreak: "break-all" }}>{cert.sig}</div>
            </div>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => downloadDataUrl("pawly-pet.png", cert.photoPng || "")}>Download pet photo</button>
            <button type="button" style={{ ...primary, width: "100%", marginTop: 8 }} onClick={() => downloadDataUrl("pawly-certificate.png", cert.certPng || "")}>Download certificate</button>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email for certificate (optional)" style={{ width: "100%", marginTop: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,255,157,0.35)", background: "#0b1610", color: "#e8eef7" }} />
            <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => { saveEmail(email); setCert(null); }}>Done</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
