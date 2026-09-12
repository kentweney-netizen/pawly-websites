#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
if "v0.9.1" in t and "queueCertMail" in t:
    print("already patched")
    raise SystemExit(0)
t = t.replace(
" * PAWLY Pet Hub v0.9 — confirmed-only adopt + shop/rescue catalogs.",
" * PAWLY Pet Hub v0.9.1 — cert email popup + hug/snack greet on enter."
)
t = t.replace('import React, { useMemo, useState } from "react";',
              'import React, { useEffect, useMemo, useState } from "react";')
if "EMAIL_KEY" not in t:
    t = t.replace('const LEDGER = "pawly_pet_hub_ledger_v1_";',
                  'const LEDGER = "pawly_pet_hub_ledger_v1_";\nconst EMAIL_KEY = "pawly_pet_hub_email_v1";')
if "type CertJob" not in t:
    t = t.replace(
"""type CartItem = {
  title: string;
  amount: number;
  kind: CartKind;
  species?: string;
  emoji?: string;
};
""",
"""type CartItem = {
  title: string;
  amount: number;
  kind: CartKind;
  species?: string;
  emoji?: string;
};
type CertJob = {
  title: string;
  amount: number;
  kind: CartKind;
  species?: string;
  emoji?: string;
  sig: string;
};
"""
)
old = '''function asset(name: string) {
  return "/" + name.replace(/^\\//, "");
}
'''
new = '''function asset(name: string) {
  return "/" + name.replace(/^\\//, "");
}
function loadEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) || "";
  } catch {
    return "";
  }
}
function saveEmail(v: string) {
  try {
    localStorage.setItem(EMAIL_KEY, v);
  } catch {
    /* ignore */
  }
}
function validEmail(v: string) {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v || "").trim());
}
async function queueCertMail(opts: { email: string; job: CertJob; wallet: string }) {
  const body = {
    email: opts.email.trim(),
    wallet: opts.wallet,
    title: opts.job.title,
    amount: opts.job.amount,
    kind: opts.job.kind,
    species: opts.job.species || "",
    emoji: opts.job.emoji || "",
    sig: opts.job.sig,
    site: "https://www.pawlypets.online/dapp/pet",
  };
  try {
    const r = await fetch(SUPABASE_URL + "/functions/v1/send-pet-hub-mail", {
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
    /* edge not live */
  }
  saveLedger(opts.wallet, { t: Date.now(), title: "cert-queue " + opts.job.title, email: body.email, sig: opts.job.sig });
  return "queued";
}
'''
if old not in t:
    raise SystemExit("asset block missing")
if "function loadEmail" not in t:
    t = t.replace(old, new, 1)
t = t.replace(
'''  const [lastTitle, setLastTitle] = useState("");
  const hint = useMemo(() => (addr ? addr.slice(0, 4) + "…" + addr.slice(-4) : "connect wallet"), [addr]);
''',
'''  const [lastTitle, setLastTitle] = useState("");
  const [cert, setCert] = useState<CertJob | null>(null);
  const [email, setEmail] = useState(() => loadEmail());
  const [mailNote, setMailNote] = useState("");
  const [greet, setGreet] = useState(true);
  const hint = useMemo(() => (addr ? addr.slice(0, 4) + "…" + addr.slice(-4) : "connect wallet"), [addr]);
  useEffect(() => {
    setGreet(true);
    const id = window.setTimeout(() => setGreet(false), 9000);
    return () => window.clearTimeout(id);
  }, [addr]);
'''
)
if "setCert({" not in t:
    t = t.replace(
'''      grantAdopt(cart, sig);
      setLastPaid(cart.amount);
      setLastSig(sig);
      setLastTitle(cart.title);
      setNote("");
      setCart(null);
''',
'''      grantAdopt(cart, sig);
      setLastPaid(cart.amount);
      setLastSig(sig);
      setLastTitle(cart.title);
      setNote("");
      setCart(null);
      if (cart.kind === "adopt" || cart.kind === "rescue") {
        setMailNote("");
        setCert({
          title: cart.title,
          amount: cart.amount,
          kind: cart.kind,
          species: cart.species,
          emoji: cart.emoji,
          sig,
        });
      }
'''
)
oldv = '''        <video key={scene} src={asset(CLIP[scene])} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
'''
newv = '''        <video key={scene} src={asset(CLIP[scene])} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        {greet && pets.length ? (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            {pets.slice(0, 4).map((p, i) => (
              <div key={p.id} className={"pawly-run pawly-run-" + (i % 3)} style={{ position: "absolute", bottom: 18 + i * 10, left: 8 + i * 18 }}>
                <div className="pawly-bubble">{i % 2 === 0 ? "Hug me!" : "Snack please!"}</div>
                <div className="pawly-pet">{p.emoji}</div>
                <div style={{ fontSize: 10, color: "#fff", textShadow: "0 1px 2px #000", textAlign: "center" }}>{p.name}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <style>{`
        .pawly-pet { font-size: 42px; line-height: 1; animation: pawly-wiggle 0.5s ease-in-out infinite alternate; }
        .pawly-bubble { background: #fff; color: #102018; font-size: 11px; font-weight: 800; border-radius: 10px; padding: 4px 8px; margin-bottom: 4px; width: max-content; }
        .pawly-run { animation: pawly-in 1.1s ease-out both; }
        .pawly-run-1 { animation-delay: 0.18s; }
        .pawly-run-2 { animation-delay: 0.36s; }
        @keyframes pawly-in { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pawly-wiggle { from { transform: rotate(-8deg) translateY(0); } to { transform: rotate(8deg) translateY(-6px); } }
      `}</style>
'''
if "pawly-wiggle" not in t:
    if oldv not in t:
        raise SystemExit("video block missing")
    t = t.replace(oldv, newv, 1)
cert_modal = r'''
      {cert ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 6, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ width: "100%", background: "#101820", borderTop: "1px solid rgba(0,255,157,0.4)", borderRadius: "16px 16px 0 0", padding: "16px 14px 18px" }}>
            <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 16 }}>Certificate + photo</div>
            <div style={{ margin: "10px 0", padding: 12, borderRadius: 12, background: "linear-gradient(180deg,#14301f,#0b1610)", border: "1px solid rgba(0,255,157,0.35)", textAlign: "center" }}>
              <div style={{ fontSize: 52, lineHeight: 1 }}>{cert.emoji || "🐾"}</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>{cert.title}</div>
              <div style={{ fontSize: 12, color: "#c8ffe8" }}>{cert.amount} PAWLY · on-chain</div>
              <div style={{ fontSize: 10, color: "#8aa", marginTop: 6, wordBreak: "break-all" }}>{cert.sig}</div>
            </div>
            <div style={{ fontSize: 12, color: "#c8ffe8", marginBottom: 8 }}>
              Enter email for the certificate and this pet photo. No PWA register needed.
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              inputMode="email"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,255,157,0.35)", background: "#0b1218", color: "#e8eef7", marginBottom: 8 }}
            />
            <button
              type="button"
              style={{ ...primary, width: "100%" }}
              onClick={async () => {
                if (!validEmail(email)) {
                  setMailNote("Need a real email / 请填有效邮箱");
                  return;
                }
                saveEmail(email.trim());
                const st = await queueCertMail({ email: email.trim(), job: cert, wallet: addr });
                setMailNote(st === "sent" ? "Sent to " + email.trim() : "Saved. Mail Edge will send this certificate + photo.");
                if (st === "sent") setTimeout(() => setCert(null), 900);
              }}
            >
              Send certificate + photo
            </button>
            <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setCert(null)}>
              Later
            </button>
            {mailNote ? <div style={{ color: "#9f8", fontSize: 11, marginTop: 8 }}>{mailNote}</div> : null}
          </div>
        </div>
      ) : null}
'''
needle = "      ) : null}\n    </div>\n  );\n}\n"
if "Certificate + photo" not in t:
    if t.count(needle) != 1:
        raise SystemExit("tail mismatch " + str(t.count(needle)))
    t = t.replace(needle, "      ) : null}\n" + cert_modal + "    </div>\n  );\n}\n", 1)
p.write_text(t)
print("patched", p.stat().st_size)
