#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
if "function downloadDataUrl" not in t:
    needle = "async function queueCertMail"
    i = t.find(needle)
    if i < 0:
        raise SystemExit("queueCertMail missing")
    j = t.find("\nconst BGM:", i)
    if j < 0:
        j = t.find("\nlet bgmCtx", i)
    if j < 0:
        raise SystemExit("end of queueCertMail missing")
    new = '''function downloadDataUrl(name: string, url: string) {
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}
async function queueCertMail(opts: { email: string; job: CertJob; wallet: string }) {
  const light = {
    email: opts.email.trim(),
    title: opts.job.title,
    amount: opts.job.amount,
    kind: opts.job.kind,
    species: opts.job.species || "",
    emoji: opts.job.emoji || "",
    sig: opts.job.sig,
    site: "https://www.pawlypets.online/dapp/pet",
  };
  const full = { ...light, certPng: opts.job.certPng || "", photoPng: opts.job.photoPng || "" };
  const post = async (body: Record<string, string | number>) => {
    const r = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    if (r.ok) return "sent";
    throw new Error(d.error || ("Mail HTTP " + r.status));
  };
  try {
    return await post(full);
  } catch (e1) {
    try {
      return await post(light);
    } catch (e2) {
      saveLedger(opts.wallet, { t: Date.now(), title: "cert-queue " + opts.job.title, email: light.email, sig: opts.job.sig });
      throw (e2 instanceof Error ? e2 : e1);
    }
  }
}
'''
    t = t[:i] + new + t[j:]

t = t.replace(
    'setMailNote(st === "sent" ? "Sent to " + email.trim() : "Mail backend did not send yet. Check Resend domain / RESEND_API_KEY.");',
    "setMailNote(st === \"sent\" ? \"Sent to \" + email.trim() : String(st));",
)

# wrap existing send click if it still awaits queueCertMail without try
if "Download photo" not in t:
    t = t.replace(
        '<button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setCert(null)}>Later</button>',
        '''<div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button type="button" style={{ ...ghost, flex: 1 }} onClick={() => downloadDataUrl("pawly-pet.jpg", cert.photoPng || "")}>Download photo</button>
              <button type="button" style={{ ...ghost, flex: 1 }} onClick={() => downloadDataUrl("pawly-certificate.jpg", cert.certPng || "")}>Download certificate</button>
            </div>
            <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setCert(null)}>Later</button>''',
        1,
    )

# make send button show thrown error
old_btn = '''onClick={async () => {
              if (!validEmail(email)) { setMailNote("Need a real email"); return; }
              saveEmail(email.trim());
              const st = await queueCertMail({ email: email.trim(), job: cert, wallet: addr });
              setMailNote(st === "sent" ? "Sent to " + email.trim() : String(st));
            }}'''
new_btn = '''onClick={async () => {
              if (!validEmail(email)) { setMailNote("Need a real email"); return; }
              saveEmail(email.trim());
              try {
                const st = await queueCertMail({ email: email.trim(), job: cert, wallet: addr });
                setMailNote(st === "sent" ? "Sent to " + email.trim() : String(st));
              } catch (err) {
                setMailNote(String((err as { message?: string })?.message || err));
              }
            }}'''
if old_btn in t:
    t = t.replace(old_btn, new_btn, 1)
else:
    # looser replace around queueCertMail call in button
    if "catch (err)" not in t[t.find("Send certificate"):t.find("Send certificate")+900]:
        t = t.replace(
            "const st = await queueCertMail({ email: email.trim(), job: cert, wallet: addr });",
            "try { const st = await queueCertMail({ email: email.trim(), job: cert, wallet: addr }); setMailNote(st === \"sent\" ? \"Sent to \" + email.trim() : String(st)); } catch (err) { setMailNote(String((err as { message?: string })?.message || err)); return; }",
            1,
        )

p.write_text(t)
print("ok", "downloadDataUrl" in t, "Download photo" in t, "API key" not in t)
