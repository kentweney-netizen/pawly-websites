#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
if "v0.9.3" in t and "drawPetPhotoPng" in t and "safe-area-inset-top" in t and "leadHz" in t:
    print("already patched")
    raise SystemExit(0)
t = t.replace(
    " * PAWLY Pet Hub v0.9.2 — Netlify cert mail + scene BGM.",
    " * PAWLY Pet Hub v0.9.3 — lower BGM tap + generated cert/photo + layered BGM.",
)

# header padding + BGM on its own row for PWA notch
old_h = '''      <div style={{ flex: "0 0 auto", padding: "6px 10px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 15 }}>{TITLE[scene]}</div>
          <button type="button" style={{ ...ghost, padding: "4px 8px" }} onClick={() => setMusic((v) => !v)}>
            {music ? "BGM on" : "BGM off"}
          </button>
        </div>
        <div style={{ color: "#8aa", fontSize: 11 }}>{hint}</div>
      </div>'''
new_h = '''      <div style={{ flex: "0 0 auto", padding: "calc(env(safe-area-inset-top, 16px) + 22px) 10px 8px" }}>
        <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 15 }}>{TITLE[scene]}</div>
        <div style={{ color: "#8aa", fontSize: 11, margin: "2px 0 8px" }}>{hint}</div>
        <button type="button" style={{ ...ghost, width: "100%", minHeight: 42, fontSize: 13 }} onClick={() => setMusic((v) => !v)}>
          {music ? "BGM on · tap to mute" : "BGM off · tap for scene music"}
        </button>
      </div>'''
if old_h in t:
    t = t.replace(old_h, new_h, 1)
elif "calc(env(safe-area-inset-top" not in t:
    t = t.replace('padding: "6px 10px 4px"', 'padding: "calc(env(safe-area-inset-top, 16px) + 22px) 10px 8px"', 1)

# richer BGM replace function pawlyStartBgm body if present
old_start = "function pawlyStartBgm(scene: SceneId) {"
if old_start in t and "leadHz" not in t:
    start = t.find(old_start)
    end = t.find("async function assertOnchainSuccess", start)
    if start < 0 or end < 0:
        raise SystemExit("bgm block bounds missing")
    new_bgm = r'''function midiHz(n: number) {
  return 440 * Math.pow(2, (n - 69) / 12);
}
const SONG: Record<SceneId, { bpm: number; root: number; bass: number[]; lead: number[]; arp: number[] }> = {
  street: { bpm: 112, root: 60, bass: [0, 0, 7, 7, 5, 5, 7, 4], lead: [4, 7, 9, 7, 12, 9, 7, 4], arp: [0, 4, 7, 12, 7, 4] },
  shop: { bpm: 126, root: 62, bass: [0, 0, 5, 5, 7, 7, 5, 4], lead: [7, 9, 12, 9, 7, 5, 4, 5], arp: [0, 4, 7, 11, 12, 7] },
  hospital: { bpm: 70, root: 57, bass: [0, 0, 3, 3, -2, -2, 0, 0], lead: [3, 2, 0, -2, 0, 3, 5, 3], arp: [0, 3, 7, 10, 7, 3] },
  shelter: { bpm: 76, root: 55, bass: [0, 0, -2, -2, -4, -4, 0, 0], lead: [3, 0, -2, 0, 3, 5, 3, 0], arp: [0, 3, 7, 3] },
  hotel: { bpm: 86, root: 65, bass: [0, 0, 4, 4, 5, 5, 4, 0], lead: [4, 5, 7, 9, 7, 5, 4, 2], arp: [0, 4, 9, 4] },
  groom: { bpm: 138, root: 67, bass: [0, 7, 5, 7, 0, 7, 9, 7], lead: [12, 9, 7, 12, 16, 12, 9, 7], arp: [0, 4, 7, 12, 16, 12] },
  park: { bpm: 104, root: 60, bass: [0, 0, 5, 4, 2, 2, 7, 5], lead: [7, 9, 12, 11, 9, 7, 4, 5], arp: [0, 5, 9, 12, 9, 5] },
};
function pawlyStartBgm(scene: SceneId) {
  pawlyStopBgm();
  const spec = SONG[scene] || SONG.street;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!bgmCtx) bgmCtx = new AC();
  if (bgmCtx.state === "suspended") void bgmCtx.resume();
  const ctx = bgmCtx;
  let step = 0;
  const beat = Math.max(140, Math.round(60000 / spec.bpm / 2));
  const beep = (hz: number, dur: number, type: OscillatorType, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = type === "square" ? 1400 : 2200;
    osc.type = type;
    osc.frequency.value = hz;
    gain.gain.value = vol;
    osc.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur + 0.02);
  };
  const hat = () => {
    const n = ctx.createBuffer(1, 2200, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = n;
    g.gain.value = 0.03;
    src.connect(g);
    g.connect(ctx.destination);
    src.start();
  };
  const tick = () => {
    const b = spec.bass[step % spec.bass.length];
    const l = spec.lead[step % spec.lead.length];
    const a = spec.arp[step % spec.arp.length];
    const root = spec.root;
    beep(midiHz(root + b - 12), 0.28, "triangle", 0.05);
    beep(midiHz(root + l), 0.18, "square", 0.028);
    beep(midiHz(root + a + 12), 0.12, "sine", 0.02);
    if (step % 2 === 0) hat();
    step += 1;
  };
  tick();
  bgmTimer = window.setInterval(tick, beat);
}

'''
    t = t[:start] + new_bgm + t[end:]

# image helpers after validEmail
img_fn = r'''
function drawRound(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function drawPetPhotoPng(emoji: string, name: string) {
  const c = document.createElement("canvas");
  c.width = 720;
  c.height = 720;
  const g = c.getContext("2d");
  if (!g) return "";
  const sky = g.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(0, "#7ecbff");
  sky.addColorStop(0.55, "#d7f4c2");
  sky.addColorStop(1, "#3d7a3a");
  g.fillStyle = sky;
  g.fillRect(0, 0, 720, 720);
  g.fillStyle = "#ffe27a";
  g.beginPath();
  g.arc(560, 120, 70, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#2f6b32";
  g.fillRect(0, 520, 720, 200);
  g.font = "280px serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(emoji || "🐾", 360, 340);
  g.font = "bold 36px sans-serif";
  g.fillStyle = "#08200f";
  g.fillText(name || "PAWLY friend", 360, 640);
  return c.toDataURL("image/png");
}
function drawCertPng(job: CertJob) {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 800;
  const g = c.getContext("2d");
  if (!g) return "";
  g.fillStyle = "#08140e";
  g.fillRect(0, 0, 1200, 800);
  g.strokeStyle = "#00ff9d";
  g.lineWidth = 8;
  drawRound(g, 40, 40, 1120, 720, 28);
  g.stroke();
  g.fillStyle = "#10281c";
  drawRound(g, 70, 70, 1060, 660, 22);
  g.fill();
  g.textAlign = "center";
  g.fillStyle = "#00ff9d";
  g.font = "bold 42px sans-serif";
  g.fillText("PAWLY PETS CERTIFICATE", 600, 150);
  g.font = "160px serif";
  g.fillText(job.emoji || "🐾", 600, 330);
  g.fillStyle = "#e8eef7";
  g.font = "bold 40px sans-serif";
  g.fillText(job.title, 600, 460);
  g.font = "28px sans-serif";
  g.fillStyle = "#c8ffe8";
  g.fillText(job.amount + " PAWLY  ·  on-chain", 600, 520);
  g.font = "16px monospace";
  g.fillStyle = "#9aa";
  const sig = String(job.sig || "");
  g.fillText(sig.slice(0, 44), 600, 590);
  g.fillText(sig.slice(44), 600, 616);
  g.font = "18px sans-serif";
  g.fillStyle = "#00ff9d";
  g.fillText("www.pawlypets.online", 600, 680);
  return c.toDataURL("image/png");
}
'''
if "function drawPetPhotoPng" not in t:
    t = t.replace("async function queueCertMail", img_fn + "async function queueCertMail", 1)

# add png fields to mail body
if "certPng" not in t:
    t = t.replace(
        "    site: \"https://www.pawlypets.online/dapp/pet\",",
        "    site: \"https://www.pawlypets.online/dapp/pet\",\n    certPng: opts.job.certPng || \"\",\n    photoPng: opts.job.photoPng || \"\",",
        1,
    )

# extend CertJob type
if "certPng?:" not in t:
    t = t.replace(
        "  sig: string;\n};",
        "  sig: string;\n  certPng?: string;\n  photoPng?: string;\n};",
        1,
    )

# when opening cert, generate images
old_set = '''        setCert({
          title: cart.title,
          amount: cart.amount,
          kind: cart.kind,
          species: cart.species,
          emoji: cart.emoji,
          sig,
        });'''
new_set = '''        {
          const job: CertJob = {
            title: cart.title,
            amount: cart.amount,
            kind: cart.kind,
            species: cart.species,
            emoji: cart.emoji,
            sig,
          };
          job.photoPng = drawPetPhotoPng(job.emoji || "🐾", job.title);
          job.certPng = drawCertPng(job);
          setCert(job);
        }'''
if old_set in t:
    t = t.replace(old_set, new_set, 1)

# show images in modal
old_card = '''            <div style={{ margin: "10px 0", padding: 12, borderRadius: 12, background: "linear-gradient(180deg,#14301f,#0b1610)", border: "1px solid rgba(0,255,157,0.35)", textAlign: "center" }}>
              <div style={{ fontSize: 52, lineHeight: 1 }}>{cert.emoji || "🐾"}</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>{cert.title}</div>
              <div style={{ fontSize: 12, color: "#c8ffe8" }}>{cert.amount} PAWLY · on-chain</div>
              <div style={{ fontSize: 10, color: "#8aa", marginTop: 6, wordBreak: "break-all" }}>{cert.sig}</div>
            </div>'''
new_card = '''            <div style={{ margin: "10px 0", padding: 10, borderRadius: 12, background: "#0b1610", border: "1px solid rgba(0,255,157,0.35)", textAlign: "center" }}>
              {cert.photoPng ? <img alt="pet" src={cert.photoPng} style={{ width: "46%", borderRadius: 10, marginRight: 6 }} /> : <div style={{ fontSize: 52 }}>{cert.emoji}</div>}
              {cert.certPng ? <img alt="certificate" src={cert.certPng} style={{ width: "46%", borderRadius: 10 }} /> : null}
              <div style={{ fontWeight: 800, marginTop: 8 }}>{cert.title}</div>
              <div style={{ fontSize: 12, color: "#c8ffe8" }}>{cert.amount} PAWLY · generated certificate + photo</div>
              <div style={{ fontSize: 10, color: "#8aa", marginTop: 6, wordBreak: "break-all" }}>{cert.sig}</div>
            </div>'''
if old_card in t:
    t = t.replace(old_card, new_card, 1)

p.write_text(t)
print("patched", p.stat().st_size)
for k in ["v0.9.3", "drawPetPhotoPng", "safe-area-inset-top", "leadHz", "certPng"]:
    print(k, k in t)
