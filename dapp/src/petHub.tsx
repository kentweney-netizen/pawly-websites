/**
 * PAWLY Pet Hub v0.3.2 GameFi - cartoon keeper + pet body sprites + SVG pad.
 * Real Tampines street-walk / room clips as plate. Canvas draws keeper + Lv1+ pets.
 * USDC/USDT/SOL market-swap to PAWLY, then PAWLY to shop till BPFiVa5.
 * Adopt + Rescue share 10 slots. Lv0 HUD heads only. Lv1+ follow on street.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { usePawlyWallet } from "./localWallet";
import { PetRig, PET_RIG_CSS } from "./petAvatar";
import {
  PET_SLOT_CAP, FEED_DAY_MAX, sgDay, feedsTodayOf, pickFeedPet,
  loadPets, savePets, mergePetLists, pullCloudPets, loadEmail, saveEmail,
  drawPetPhotoPng, drawCertPng, downloadDataUrl, asset, fetchHubPx, quoteCoin, payHub,
  COMPANIONS, RESCUES, FOODS, TITLE, CLIP, ghost, primary, rowBtn,
} from "./petHubLib";
import type { SceneId, PetRec, CartItem, CertJob, PayCoin } from "./petHubLib";
import { createPetHubWorld } from "./petHubWorld";
import type { HubWorld } from "./petHubWorld";

const VER = "v0.3.2";
const BGM_MP3 = asset("we-love-animals.mp3");
const BGM_WAV = asset("we-love-animals.wav");

export function PetHubPage() {
  const navigate = useNavigate();
  const wallet = usePawlyWallet() as { publicKey?: PublicKey | null; wallet?: unknown; adapter?: unknown; signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>; sendTransaction?: (tx: VersionedTransaction, conn: Connection) => Promise<string> };
  const addr = (wallet.publicKey && wallet.publicKey.toBase58()) || "";
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<HubWorld | null>(null);
  const [scene, setScene] = useState<SceneId>("street");
  const [near, setNear] = useState<SceneId | null>(null);
  const [shopView, setShopView] = useState<"home" | "adopt" | "food" | "desk">("home");
  const [focusId, setFocusId] = useState("");
  const [feedWarn, setFeedWarn] = useState(false);
  const [desk, setDesk] = useState(false);
  const [pets, setPets] = useState<PetRec[]>(() => loadPets(addr));
  const [cart, setCart] = useState<CartItem | null>(null);
  const [payCoin, setPayCoin] = useState<PayCoin>("PAWLY");
  const [px, setPx] = useState({ pawlyUsd: 0, solUsd: 0 });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [lastSig, setLastSig] = useState("");
  const [lastPaid, setLastPaid] = useState(0);
  const [lastTitle, setLastTitle] = useState("");
  const [cert, setCert] = useState<CertJob | null>(null);
  const [email, setEmail] = useState(() => loadEmail());
  const hint = useMemo(() => (addr ? addr.slice(0, 4) + "..." + addr.slice(-4) : "connect wallet"), [addr]);
  const todayFeeds = pets.reduce((n, p) => n + feedsTodayOf(p), 0);
  const quests = [
    { ok: pets.length > 0, label: "Own 1 pet" },
    { ok: todayFeeds >= 1, label: "Feed today  " + Math.min(todayFeeds, 3) + "/3" },
    { ok: scene === "park" || lastTitle.toLowerCase().indexOf("walk") >= 0, label: "Visit the park" },
  ];

  useEffect(() => { void fetchHubPx().then(setPx); const id = window.setInterval(() => { void fetchHubPx().then(setPx); }, 60000); return () => window.clearInterval(id); }, []);
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
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const world = createPetHubWorld(canvas, (e) => {
      if (e.type === "near") setNear(e.id);
      if (e.type === "enter") {
        setScene(e.id);
        setShopView(e.id === "shop" ? "desk" : "home");
        setDesk(true);
      }
      if (e.type === "tap-pet") { setFocusId(e.id); setFeedWarn(true); }
    });
    worldRef.current = world;
    world.setScene(scene);
    world.setPets(pets.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, species: p.species, level: Number(p.level || 0) })));
    return () => { world.destroy(); worldRef.current = null; };
  }, []);
  useEffect(() => { worldRef.current?.setScene(scene); }, [scene]);
  useEffect(() => {
    worldRef.current?.setPets(pets.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, species: p.species, level: Number(p.level || 0) })));
  }, [pets]);

  const setStick = (x: number, y: number) => { worldRef.current?.setStick(x, y); };
  const hold = (x: number, y: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setStick(x, y); },
    onPointerUp: () => setStick(0, 0),
    onPointerCancel: () => setStick(0, 0),
  });
  const goScene = (id: SceneId) => {
    setScene(id);
    setShopView(id === "shop" ? "desk" : "home");
    if (id !== "street") setDesk(true);
    else setDesk(false);
  };
  const pressA = () => {
    if (scene === "street" && near) goScene(near);
    else if (scene !== "street") setDesk(true);
  };
  const pressB = () => { setScene("street"); setDesk(false); setShopView("home"); };
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
    setBusy(true); setNote(payCoin === "PAWLY" ? "Paying PAWLY to till..." : "Swap " + payCoin + " to PAWLY, then till");
    try {
      const sig = await payHub({ from: wallet.publicKey, coin: payCoin, amount: payAmt.amount, signTransaction: wallet.signTransaction, sendTransaction: wallet.sendTransaction, wallet: wallet as never });
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
    } catch (e) { setNote(String((e as { message?: string }).message || e)); } finally { setBusy(false); }
  };
  const sep = " | ";
  const tri = (dir: "up" | "down" | "left" | "right") => {
    const pts = dir === "up" ? "12,3 21,19 3,19" : dir === "down" ? "3,5 21,5 12,21" : dir === "left" ? "19,3 19,21 3,12" : "5,3 21,12 5,21";
    return <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><polygon points={pts} fill="#00ff9d" /></svg>;
  };
  const arrowBtn = (left: number, top: number): React.CSSProperties => ({
    position: "absolute", left, top, width: 50, height: 50, borderRadius: 10,
    border: "1px solid rgba(0,255,157,0.55)", background: "rgba(8,20,16,0.72)",
    color: "#00ff9d", fontSize: 18, fontWeight: 800, touchAction: "none",
  });
  const focused = pets.find((p) => p.id === focusId) || pets[0];
  return (
    <div style={{ height: "100dvh", overflow: "hidden", background: "#070b10", color: "#e8eef7", display: "flex", flexDirection: "column", position: "relative", maxWidth: 430, margin: "0 auto" }}>
      <style>{PET_RIG_CSS}</style>
      <audio ref={bgmRef} autoPlay loop playsInline preload="auto" style={{ display: "none" }}>
        <source src={BGM_MP3} type="audio/mpeg" />
        <source src={BGM_WAV} type="audio/wav" />
      </audio>
      <div style={{ padding: "calc(env(safe-area-inset-top, 16px) + 10px) 10px 6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#00ff9d", fontWeight: 800 }}>{TITLE[scene]} {VER}</div>
          <div style={{ color: "#8aa", fontSize: 11 }}>{hint}{px.pawlyUsd ? sep + "$" + px.pawlyUsd.toFixed(4) : ""}{sep}{pets.length}/{PET_SLOT_CAP}</div>
        </div>
        <button type="button" style={{ ...ghost, fontSize: 10 }} onClick={() => navigate("/")}>Home</button>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "0 10px 6px", flexWrap: "wrap" }}>
        {quests.map((q) => (
          <span key={q.label} style={{ fontSize: 10, padding: "3px 6px", borderRadius: 8, border: "1px solid rgba(0,255,157,0.35)", color: q.ok ? "#00ff9d" : "#9aa" }}>{q.ok ? "OK " : "o "}{q.label}</span>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 260, position: "relative", background: "#081018", overflow: "hidden" }}>
        <video
          key={scene}
          src={asset(CLIP[scene])}
          autoPlay
          muted
          loop
          playsInline
          poster={asset(scene === "street" ? "pet-hub-street.jpg" : CLIP[scene].replace(".mp4", ".jpg"))}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
        />
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none", zIndex: 1, background: "transparent" }} />
        {scene === "street" ? (
          <div style={{ position: "absolute", left: 8, right: 8, top: 8, zIndex: 2, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(["shop","hospital","shelter","hotel","groom","park"] as SceneId[]).map((id) => (
              <button key={id} type="button" onClick={() => goScene(id)} style={{ ...ghost, fontSize: 10, padding: "4px 7px", background: near === id ? "rgba(0,255,157,0.22)" : "rgba(0,0,0,0.45)" }}>{TITLE[id]}</button>
            ))}
          </div>
        ) : null}
        <div style={{ position: "absolute", left: 10, bottom: 10, zIndex: 3, width: 118, height: 118, userSelect: "none" }}>
          <button type="button" {...hold(0, -1)} style={arrowBtn(34, 0)} aria-label="up">{tri("up")}</button>
          <button type="button" {...hold(-1, 0)} style={arrowBtn(0, 34)} aria-label="left">{tri("left")}</button>
          <button type="button" {...hold(1, 0)} style={arrowBtn(68, 34)} aria-label="right">{tri("right")}</button>
          <button type="button" {...hold(0, 1)} style={arrowBtn(34, 68)} aria-label="down">{tri("down")}</button>
        </div>
        <button type="button" onClick={pressA} style={{ position: "absolute", right: 14, bottom: 58, zIndex: 3, width: 54, height: 54, borderRadius: 27, border: "none", background: "#00ff9d", color: "#052015", fontWeight: 800 }}>A</button>
        <button type="button" onClick={pressB} style={{ position: "absolute", right: 72, bottom: 18, zIndex: 3, width: 44, height: 44, borderRadius: 22, border: "none", background: "#2a3a44", color: "#c8ffe8", fontWeight: 800 }}>B</button>
      </div>
      <div style={{ zIndex: 2, padding: "8px 8px 10px", background: "#070b10", maxHeight: "34dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
          {pets.length ? pets.map((p) => (
            <button key={p.id} type="button" onClick={() => { setFocusId(p.id); setFeedWarn(true); }} style={{ background: focusId === p.id ? "rgba(0,255,157,0.18)" : "transparent", border: "none", color: "#e8eef7", minWidth: 64 }}>
              <PetRig pet={{ species: p.species, level: Number(p.level || 0), emoji: p.emoji, name: p.name }} size={Number(p.level || 0) >= 1 ? 44 : 28} />
              <div style={{ fontSize: 10, fontWeight: 800 }}>{p.name}</div>
              <div style={{ fontSize: 9, color: "#9f8" }}>Lv{Number(p.level || 0)} {feedsTodayOf(p)}/3</div>
            </button>
          )) : <div style={{ color: "#8aa", fontSize: 12 }}>Walk into SHOP and adopt. Rescue stays rescued - both count in 10 slots.</div>}
        </div>
        {focused ? <div style={{ fontSize: 11, color: "#c8ffe8", marginBottom: 6 }}>{focused.name} | {focused.kind || "pet"} | {Number(focused.feedsTotal || 0)} feeds | hunger {Number(focused.hunger || 0)}</div> : null}
        {note ? <div style={{ color: "#ffb4b4", fontSize: 11, marginBottom: 6, wordBreak: "break-word" }}>{note}</div> : null}
        {lastSig ? (
          <div style={{ marginBottom: 8, padding: "8px 8px 6px", border: "1px solid rgba(0,255,157,0.35)", borderRadius: 10, background: "#0c1410" }}>
            <div style={{ color: "#00ff9d", fontSize: 12, fontWeight: 800 }}>Paid {lastPaid} PAWLY{sep}{lastTitle}</div>
            <div style={{ color: "#c8ffe8", fontSize: 10, lineHeight: 1.35, wordBreak: "break-all", margin: "4px 0 6px" }}>{lastSig}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" style={{ ...ghost, flex: 1 }} onClick={() => { try { navigator.clipboard.writeText(lastSig); } catch { /* ignore */ } }}>Copy sig</button>
              <button type="button" style={{ ...ghost, flex: 1 }} onClick={() => window.open("https://solscan.io/tx/" + lastSig, "_blank")}>Solscan</button>
            </div>
          </div>
        ) : null}
      </div>
      {desk ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end" }} onClick={() => setDesk(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxHeight: "72dvh", overflowY: "auto", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800 }}>{TITLE[scene]} desk</div>
            {scene === "shop" && shopView === "desk" && (
              <div style={{ marginTop: 10 }}>
                <button type="button" style={{ ...primary, width: "100%", marginBottom: 8 }} onClick={() => setShopView("adopt")}>Adopt companions</button>
                <button type="button" style={{ ...primary, width: "100%" }} onClick={() => setShopView("food")}>Buy food</button>
              </div>
            )}
            {scene === "shop" && shopView === "adopt" && (
              <div style={{ marginTop: 8 }}>
                <button type="button" style={{ ...ghost, marginBottom: 8 }} onClick={() => setShopView("desk")}>Back</button>
                {COMPANIONS.map((c) => (<button key={c.species} type="button" style={rowBtn} onClick={() => openCart({ title: "Adopt " + c.label, amount: c.pricePawly, kind: "adopt", species: c.species, emoji: c.emoji })}><span>{c.emoji} {c.label}</span><span>{c.pricePawly} PAWLY</span></button>))}
              </div>
            )}
            {scene === "shop" && shopView === "food" && (
              <div style={{ marginTop: 8 }}>
                <button type="button" style={{ ...ghost, marginBottom: 8 }} onClick={() => setShopView("desk")}>Back</button>
                {FOODS.map((c) => (<button key={c.id} type="button" style={rowBtn} onClick={() => openCart({ title: c.label, amount: c.pricePawly, kind: "food", emoji: c.emoji, petId: focusId || (pets[0] && pets[0].id) || undefined })}><span>{c.emoji} {c.label}</span><span>{c.pricePawly} PAWLY</span></button>))}
              </div>
            )}
            {scene === "shelter" && RESCUES.map((c) => (<button key={c.species} type="button" style={rowBtn} onClick={() => openCart({ title: "Rescue " + c.label, amount: c.pricePawly, kind: "rescue", species: c.species, emoji: c.emoji })}><span>{c.emoji} {c.label}</span><span>{c.pricePawly} PAWLY</span></button>))}
            {scene === "hospital" && <button type="button" style={{ ...primary, width: "100%", marginTop: 10 }} onClick={() => openCart({ title: "Hospital checkup", amount: 40, kind: "service" })}>Pay 40 PAWLY | checkup</button>}
            {scene === "park" && <button type="button" style={{ ...primary, width: "100%", marginTop: 10 }} onClick={() => openCart({ title: "Walk the dog", amount: 15, kind: "service" })}>Pay 15 PAWLY | walk</button>}
            {(scene === "hotel" || scene === "groom") && <button type="button" style={{ ...primary, width: "100%", marginTop: 10 }} onClick={() => openCart({ title: TITLE[scene], amount: scene === "hotel" ? 50 : 30, kind: "service" })}>Pay {scene === "hotel" ? 50 : 30} PAWLY</button>}
            <button type="button" style={{ ...ghost, width: "100%", marginTop: 10 }} onClick={() => setDesk(false)}>Close</button>
          </div>
        </div>
      ) : null}
      {feedWarn ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 6, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end" }} onClick={() => setFeedWarn(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800 }}>Feed this pet</div>
            <div style={{ fontSize: 13, margin: "8px 0 12px" }}>Max 3 feeds / day. 10 feeds = Lv1 body that follows you on the street.</div>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => { setFeedWarn(false); goScene("shop"); setShopView("food"); setDesk(true); }}>Go buy food</button>
            <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setFeedWarn(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
      {cart ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 7, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end" }} onClick={() => !busy && setCart(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800 }}>Pet Hub checkout</div>
            <div style={{ fontSize: 11, color: "#8aa", marginTop: 4 }}>USDC / USDT / SOL swap to PAWLY, then PAWLY to the shop till.</div>
            <div style={{ margin: "8px 0 4px" }}>{cart.emoji ? cart.emoji + " " : ""}{cart.title}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{cart.amount} PAWLY</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>{(["PAWLY", "USDC", "USDT", "SOL"] as PayCoin[]).map((c) => (<button key={c} type="button" onClick={() => setPayCoin(c)} style={{ ...ghost, borderColor: payCoin === c ? "#00ff9d" : "rgba(255,255,255,0.2)", color: payCoin === c ? "#00ff9d" : "#c8ffe8" }}>{c}</button>))}</div>
            <div style={{ fontSize: 14, color: "#c8ffe8", marginBottom: 10 }}>{quoteCoin(cart.amount, payCoin, px).label}{px.pawlyUsd ? sep + "$" + px.pawlyUsd.toFixed(4) : ""}</div>
            <button type="button" disabled={busy} style={{ ...primary, width: "100%", opacity: busy ? 0.6 : 1 }} onClick={() => void confirmPay()}>{busy ? "Paying..." : "Confirm | " + quoteCoin(cart.amount, payCoin, px).label}</button>
            <button type="button" disabled={busy} style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setCart(null)}>Cancel</button>
          </div>
        </div>
      ) : null}
      {cert ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 8, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 16 }}>Certificate + photo</div>
            <div style={{ margin: "10px 0", padding: 10, borderRadius: 12, background: "#0b1610", border: "1px solid rgba(0,255,157,0.35)", textAlign: "center" }}>
              {cert.photoPng ? <img alt="pet" src={cert.photoPng} onClick={() => downloadDataUrl("pawly-pet.png", cert.photoPng || "")} style={{ width: "46%", borderRadius: 10, marginRight: 6 }} /> : <div style={{ fontSize: 52 }}>{cert.emoji}</div>}
              {cert.certPng ? <img alt="certificate" src={cert.certPng} onClick={() => downloadDataUrl("pawly-certificate.png", cert.certPng || "")} style={{ width: "46%", borderRadius: 10 }} /> : null}
              <div style={{ fontWeight: 800, marginTop: 8 }}>{cert.title}</div>
              <div style={{ fontSize: 12, color: "#c8ffe8" }}>{cert.amount} PAWLY{sep}on-chain</div>
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
