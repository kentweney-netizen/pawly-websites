#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
old = '''async function queueCertMail(opts: { email: string; job: CertJob; wallet: string }) {
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
    certPng: opts.job.certPng || "",
    photoPng: opts.job.photoPng || "",
  };
  try {
    let r = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + SUPABASE_KEY,
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify(body),
    });
    if (r.ok) return "sent";
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
  }
  saveLedger(opts.wallet, { t: Date.now(), title: "cert-queue " + opts.job.title, email: body.email, sig: opts.job.sig });
  return "queued";
}'''
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
  const post = async (body: typeof full | typeof light) => {
    const r = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = (await r.json().catch(() => ({}))) as { error?: string; success?: boolean };
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
      throw e2 instanceof Error ? e2 : e1;
    }
  }
}'''
if old in t:
    t = t.replace(old, new, 1)
# mail note after send
t = t.replace(
    'setMailNote(st === "sent" ? "Sent to " + email.trim() : "Mail backend did not send yet. Check Resend domain / RESEND_API_KEY.");',
    '''try {
                const st = await queueCertMail({ email: email.trim(), job: cert, wallet: addr });
                setMailNote(st === "sent" ? "Sent to " + email.trim() : st);
              } catch (err) {
                setMailNote(String((err as { message?: string })?.message || err));
              }''',
)
# if the replace duplicated the call, leave as-is and instead patch the button handler more carefully later

# add download buttons near Later
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
p.write_text(t)
print("download", "Download photo" in t)
print("throw", "Mail HTTP" in t)
print("old queued msg", "did not send yet" in t)
'''
