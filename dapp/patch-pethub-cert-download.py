#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
if "function downloadDataUrl" not in t:
    t = t.replace(
        "async function queueCertMail",
        '''function downloadDataUrl(name: string, url: string) {
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
async function queueCertMail''',
        1,
    )
old = '''            <div style={{ fontSize: 12, color: "#c8ffe8", marginBottom: 8 }}>
              Enter email for the certificate and this pet photo. No PWA register needed.
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              inputMode="email"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,255,157,0.35)", background: "#0b1218", color: "#e8eef7", marginBottom: 8 }}
            />'''
# also match single-line versions
if "Enter email for the certificate" in t:
    start = t.find("            <div style={{ fontSize: 12, color: \"#c8ffe8\", marginBottom: 8 }}>")
    if start < 0:
        start = t.find("Enter email for the certificate")
        start = t.rfind("<div", 0, start)
    end = t.find("{mailNote ?", start)
    if start > 0 and end > start:
        t = t[:start] + '''            <div style={{ fontSize: 12, color: "#c8ffe8", margin: "0 0 8px" }}>Tap a picture to save. Long-press also works on phone.</div>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => downloadDataUrl("pawly-pet.jpg", cert.photoPng || "")}>Download pet photo</button>
            <button type="button" style={{ ...primary, width: "100%", marginTop: 8 }} onClick={() => downloadDataUrl("pawly-certificate.jpg", cert.certPng || "")}>Download certificate</button>
            <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setCert(null)}>Done</button>
            ''' + t[end:]
# images become tap-to-save
t = t.replace(
    '{cert.photoPng ? <img alt="pet" src={cert.photoPng} style={{ width: "46%", borderRadius: 10, marginRight: 6 }} />',
    '{cert.photoPng ? <img alt="pet" src={cert.photoPng} onClick={() => downloadDataUrl("pawly-pet.jpg", cert.photoPng || "")} style={{ width: "46%", borderRadius: 10, marginRight: 6, cursor: "pointer" }} />',
    1,
)
t = t.replace(
    '{cert.certPng ? <img alt="certificate" src={cert.certPng} style={{ width: "46%", borderRadius: 10 }} />',
    '{cert.certPng ? <img alt="certificate" src={cert.certPng} onClick={() => downloadDataUrl("pawly-certificate.jpg", cert.certPng || "")} style={{ width: "46%", borderRadius: 10, cursor: "pointer" }} />',
    1,
)
t = t.replace(
    " * PAWLY Pet Hub v0.10.1 — street pets only + shop buttons + food feed.",
    " * PAWLY Pet Hub v0.10.2 — cert/photo in-app download, no email send.",
)
p.write_text(t)
print("v", "v0.10.2" in t)
print("download photo btn", "Download pet photo" in t)
print("email prompt gone", "Enter email for the certificate" not in t)
print("Send certificate" in t)
