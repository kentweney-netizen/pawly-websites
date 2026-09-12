#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
if "v0.9.2" in t and "pawlyStartBgm" in t and "/.netlify/functions/send-email" in t:
    print("already patched")
    raise SystemExit(0)
t = t.replace(
    " * PAWLY Pet Hub v0.9.1 — cert email popup + hug/snack greet on enter.",
    " * PAWLY Pet Hub v0.9.2 — Netlify cert mail + scene BGM.",
)
# mail path
old_fetch = 'const r = await fetch(SUPABASE_URL + "/functions/v1/send-pet-hub-mail", {'
if old_fetch in t:
    t = t.replace(
        old_fetch,
        'let r = await fetch("/.netlify/functions/send-email", {',
        1,
    )
    t = t.replace(
        """    if (r.ok) return "sent";
  } catch {
    /* edge not live */
  }""",
        """    if (r.ok) return "sent";
    r = await fetch(SUPABASE_URL + "/functions/v1/send-pet-hub-mail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + SUPABASE_KEY,
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify(body),
    });
    if (r.ok) return "sent";
  } catch {
    /* mail backend not live */
  }""",
        1,
    )
# BGM helpers after queueCertMail block
marker = "async function assertOnchainSuccess"
bgm = r'''
const BGM: Record<SceneId, { bpm: number; notes: number[]; wave: OscillatorType; vol: number }> = {
  street: { bpm: 108, notes: [523, 659, 784, 659], wave: "triangle", vol: 0.05 },
  shop: { bpm: 132, notes: [523, 587, 659, 784, 659, 587], wave: "square", vol: 0.035 },
  hospital: { bpm: 68, notes: [329, 311, 247, 294], wave: "sine", vol: 0.05 },
  shelter: { bpm: 76, notes: [220, 247, 196, 165], wave: "sine", vol: 0.05 },
  hotel: { bpm: 84, notes: [349, 392, 440, 392], wave: "triangle", vol: 0.045 },
  groom: { bpm: 144, notes: [784, 659, 880, 784], wave: "square", vol: 0.03 },
  park: { bpm: 100, notes: [523, 587, 698, 784], wave: "triangle", vol: 0.045 },
};
let bgmCtx: AudioContext | null = null;
let bgmTimer: number | null = null;
function pawlyStopBgm() {
  if (bgmTimer != null) {
    window.clearInterval(bgmTimer);
    bgmTimer = null;
  }
}
function pawlyStartBgm(scene: SceneId) {
  pawlyStopBgm();
  const spec = BGM[scene] || BGM.street;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!bgmCtx) bgmCtx = new AC();
  if (bgmCtx.state === "suspended") void bgmCtx.resume();
  const ctx = bgmCtx;
  let i = 0;
  const beat = Math.max(180, Math.round(60000 / spec.bpm));
  const tick = () => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.wave;
    osc.frequency.value = spec.notes[i % spec.notes.length];
    gain.gain.value = spec.vol;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + beat / 900);
    osc.stop(ctx.currentTime + beat / 800);
    i += 1;
  };
  tick();
  bgmTimer = window.setInterval(tick, beat);
}

'''
if "pawlyStartBgm" not in t and marker in t:
    t = t.replace(marker, bgm + marker, 1)
# state music
old_state = "  const [greet, setGreet] = useState(true);"
new_state = "  const [greet, setGreet] = useState(true);\n  const [music, setMusic] = useState(false);"
if old_state in t and "const [music, setMusic]" not in t:
    t = t.replace(old_state, new_state, 1)
effect = """  useEffect(() => {
    setGreet(true);
    const id = window.setTimeout(() => setGreet(false), 9000);
    return () => window.clearTimeout(id);
  }, [addr]);
"""
effect2 = """  useEffect(() => {
    setGreet(true);
    const id = window.setTimeout(() => setGreet(false), 9000);
    return () => window.clearTimeout(id);
  }, [addr]);
  useEffect(() => {
    if (music) pawlyStartBgm(scene);
    else pawlyStopBgm();
    return () => pawlyStopBgm();
  }, [music, scene]);
"""
if effect in t and "pawlyStartBgm(scene)" not in t:
    t = t.replace(effect, effect2, 1)
# music button near title
old_title = """        <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 15 }}>{TITLE[scene]}</div>
        <div style={{ color: "#8aa", fontSize: 11 }}>{hint}</div>"""
new_title = """        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 15 }}>{TITLE[scene]}</div>
          <button type="button" style={{ ...ghost, padding: "4px 8px" }} onClick={() => setMusic((v) => !v)}>
            {music ? "BGM on" : "BGM off"}
          </button>
        </div>
        <div style={{ color: "#8aa", fontSize: 11 }}>{hint}</div>"""
if old_title in t and "BGM on" not in t:
    t = t.replace(old_title, new_title, 1)
# mail note after send
t = t.replace(
    'setMailNote(st === "sent" ? "Sent to " + email.trim() : "Saved. Mail Edge will send this certificate + photo.");',
    'setMailNote(st === "sent" ? "Sent to " + email.trim() : "Mail backend did not send yet. Check Resend domain / RESEND_API_KEY.");',
)
p.write_text(t)
print("patched", p.stat().st_size)
for k in ["v0.9.2", "send-email", "pawlyStartBgm", "BGM on"]:
    print(k, k in t)
