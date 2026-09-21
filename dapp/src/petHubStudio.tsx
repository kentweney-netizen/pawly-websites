import React, { useEffect, useMemo, useRef, useState } from "react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { payHub, requireHubPaySuccess, ghost, primary } from "./petHubLib";
import { BREED_PAWLY, makeStudioNft } from "./petHubMarket";
import type { NftRec } from "./petHubMarket";
import { mintStudioToken } from "./petHubMintOnchain";
import {
  STUDIO_ACC, STUDIO_BODIES, STUDIO_COLORS, STUDIO_PATTERNS,
  cleanStudioName, paintStudioFinal, renderStudioCard,
} from "./petHubStudioArt";
import type { StudioAcc, StudioBody, StudioDraft, StudioPattern } from "./petHubStudioArt";

type WalletBag = {
  publicKey?: PublicKey | null;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  sendTransaction?: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
};

const chip: React.CSSProperties = {
  ...ghost, padding: "4px 7px", fontSize: 10, flex: "0 0 auto",
};

export function StudioPanel(props: {
  addr: string;
  hasStall: boolean;
  busy: boolean;
  wallet: WalletBag;
  setBusy: (b: boolean) => void;
  setNote: (s: string) => void;
  setLastSig: (s: string) => void;
  setLastPaid: (n: number) => void;
  setLastTitle: (s: string) => void;
  onMinted: (n: NftRec) => void;
}) {
  const doodleRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [body, setBody] = useState<StudioBody>("fox");
  const [colorA, setColorA] = useState(STUDIO_COLORS[0]);
  const [colorB, setColorB] = useState(STUDIO_COLORS[1]);
  const [pattern, setPattern] = useState<StudioPattern>("none");
  const [acc, setAcc] = useState<StudioAcc>("none");
  const [name, setName] = useState("My Pet");
  const [preview, setPreview] = useState("");

  const draft: StudioDraft = useMemo(
    () => ({ body, colorA, colorB, pattern, acc, name }),
    [body, colorA, colorB, pattern, acc, name],
  );

  useEffect(() => {
    try { setPreview(renderStudioCard(draft)); } catch { setPreview(""); }
  }, [draft]);

  const ink = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = doodleRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * c.width;
    const y = ((e.clientY - r.top) / r.height) * c.height;
    ctx.strokeStyle = "#e8eef7";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (!drawing.current) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      drawing.current = true;
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const clearDoodle = () => {
    const c = doodleRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
  };

  const payCreate = async () => {
    if (!props.wallet.publicKey) { props.setNote("Connect wallet in dApp first"); return; }
    if (!props.hasStall) { props.setNote("Open a stall first (200 PAWLY)"); return; }
    const label = cleanStudioName(name) || "My Pet";
    props.setBusy(true);
    props.setNote("Paying 80 PAWLY to mint studio NFT...");
    try {
      const sig = await payHub({
        from: props.wallet.publicKey,
        coin: "PAWLY",
        amount: BREED_PAWLY,
        signTransaction: props.wallet.signTransaction,
        sendTransaction: props.wallet.sendTransaction,
        wallet: props.wallet as never,
      });
      props.setNote("Checking on-chain...");
      await requireHubPaySuccess(sig, BREED_PAWLY);
      const doodle = doodleRef.current ? doodleRef.current.toDataURL("image/png") : "";
      const art = await paintStudioFinal({ ...draft, name: label }, doodle);
      let mint = "";
      let memoSig = "";
      try {
        props.setNote("Signing on-chain 0-dec mint...");
        const on = await mintStudioToken({
          owner: props.wallet.publicKey,
          label,
          paySig: sig,
          wallet: props.wallet as never,
          signTransaction: props.wallet.signTransaction,
        });
        mint = on.mint;
        memoSig = on.sig;
      } catch {
        memoSig = "";
      }
      const nft = makeStudioNft({
        owner: props.addr,
        body,
        name: label,
        art,
        paySig: sig,
        mint,
        memoSig,
      });
      props.onMinted(nft);
      props.setLastSig(memoSig || sig);
      props.setLastPaid(BREED_PAWLY);
      props.setLastTitle("Studio " + label);
      props.setNote(mint ? "Studio NFT minted on-chain" : "Studio NFT saved (chain mint skipped)");
    } catch (e) {
      props.setNote(String((e as { message?: string }).message || e));
    } finally {
      props.setBusy(false);
    }
  };

  return (
    <div style={{ width: "100%", margin: "0 0 10px", padding: 8, borderRadius: 10, border: "1px solid rgba(0,255,157,0.28)", background: "#0c1410" }}>
      <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Studio / 创作</div>
      <div style={{ fontSize: 10, color: "#8aa", marginBottom: 6 }}>Pick parts, doodle on the lineart, pay 80 PAWLY. On-chain 0-dec mint + memo when wallet can sign.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
        {STUDIO_BODIES.map((b) => (
          <button key={b} type="button" style={{ ...chip, background: body === b ? "rgba(0,255,157,0.28)" : chip.background }} onClick={() => setBody(b)}>{b}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
        {STUDIO_COLORS.map((c) => (
          <button key={"a" + c} type="button" onClick={() => setColorA(c)} style={{ width: 18, height: 18, borderRadius: 9, border: colorA === c ? "2px solid #00ff9d" : "1px solid #345", background: c }} />
        ))}
        <span style={{ fontSize: 10, color: "#8aa", alignSelf: "center" }}>A</span>
        {STUDIO_COLORS.map((c) => (
          <button key={"b" + c} type="button" onClick={() => setColorB(c)} style={{ width: 18, height: 18, borderRadius: 9, border: colorB === c ? "2px solid #00ff9d" : "1px solid #345", background: c }} />
        ))}
        <span style={{ fontSize: 10, color: "#8aa", alignSelf: "center" }}>B</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
        {STUDIO_PATTERNS.map((p) => (
          <button key={p} type="button" style={{ ...chip, background: pattern === p ? "rgba(0,255,157,0.28)" : chip.background }} onClick={() => setPattern(p)}>{p}</button>
        ))}
        {STUDIO_ACC.map((a) => (
          <button key={a} type="button" style={{ ...chip, background: acc === a ? "rgba(0,255,157,0.28)" : chip.background }} onClick={() => setAcc(a)}>{a}</button>
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(cleanStudioName(e.target.value))}
        placeholder="name"
        maxLength={16}
        style={{ width: "100%", marginBottom: 8, padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(0,255,157,0.35)", background: "#0b1610", color: "#e8eef7", fontSize: 12 }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <div style={{ position: "relative", width: 160, height: 160, flex: "0 0 auto" }}>
          {preview ? <img alt="preview" src={preview} style={{ position: "absolute", inset: 0, width: 160, height: 160, imageRendering: "pixelated", borderRadius: 10 }} /> : null}
          <canvas
            ref={doodleRef}
            width={160}
            height={160}
            onPointerDown={(e) => { (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); drawing.current = false; ink(e); }}
            onPointerMove={(e) => { if (e.buttons) ink(e); }}
            onPointerUp={() => { drawing.current = false; }}
            style={{ position: "absolute", inset: 0, width: 160, height: 160, touchAction: "none", borderRadius: 10 }}
          />
        </div>
        <div style={{ flex: 1, fontSize: 10, color: "#8aa" }}>Draw on the card. Clear doodle if you only want parts.</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" style={ghost} onClick={clearDoodle}>Clear doodle</button>
        <button
          type="button"
          disabled={props.busy || !props.addr}
          style={{ ...primary, flex: 1, opacity: props.busy ? 0.6 : 1 }}
          onClick={() => void payCreate()}
        >{props.busy ? "Paying..." : "Create 80 PAWLY"}</button>
      </div>
    </div>
  );
}
