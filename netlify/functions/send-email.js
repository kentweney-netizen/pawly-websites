import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || "PAWLY Pets <onboarding@resend.dev>";
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

function stripDataUrl(s) {
  const v = String(s || "");
  const i = v.indexOf("base64,");
  return i >= 0 ? v.slice(i + 7) : v.replace(/\s+/g, "");
}
function certHtml(body) {
  const emoji = body.emoji || "🐾";
  const title = body.title || "PAWLY Pet Hub";
  const amount = body.amount != null ? String(body.amount) : "";
  const sig = body.sig || "";
  return `<!doctype html><html><body style="margin:0;background:#07110c;color:#e8eef7;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:24px auto;padding:24px;background:#10281c;border:1px solid #00ff9d;border-radius:16px;text-align:center">
    <div style="font-size:72px">${emoji}</div>
    <h1 style="color:#00ff9d">PAWLY Certificate</h1>
    <p>${title}</p>
    <p>${amount} PAWLY · on-chain</p>
    <p style="word-break:break-all;font-size:11px;color:#9aa">${sig}</p>
    <p>Certificate and pet photo are attached when size allows.</p>
  </div></body></html>`;
}

async function handle(req) {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers });
  if (!process.env.RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY missing on Netlify" }), { status: 500, headers });
  }
  const body = await req.json();
  const email = String(body.email || "").trim();
  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ error: "Missing email" }), { status: 400, headers });
  }
  const payload = {
    from: FROM,
    to: [email],
    subject: body.subject || ("PAWLY certificate · " + (body.title || "pet")),
    html: body.html || certHtml(body),
    text: [body.title || "PAWLY certificate", String(body.amount || ""), String(body.sig || "")].join("\n"),
    attachments: [],
  };
  const cert = stripDataUrl(body.certPng || body.certificate);
  const photo = stripDataUrl(body.photoPng || body.photo);
  if (cert && cert.length > 80 && cert.length < 900000) payload.attachments.push({ filename: "pawly-certificate.jpg", content: cert });
  if (photo && photo.length > 80 && photo.length < 900000) payload.attachments.push({ filename: "pawly-pet-photo.jpg", content: photo });
  let { data, error } = await resend.emails.send(payload);
  if (error && payload.attachments.length) {
    payload.attachments = [];
    const retry = await resend.emails.send(payload);
    data = retry.data; error = retry.error;
    if (!error) {
      return new Response(JSON.stringify({ success: true, messageId: data?.id || null, attached: 0, note: "sent without images" }), { status: 200, headers });
    }
  }
  if (error) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500, headers });
  }
  return new Response(JSON.stringify({ success: true, messageId: data?.id || null, attached: payload.attachments.length }), { status: 200, headers });
}

export default handle;
export const handler = async (event) => {
  const req = new Request("https://local" + (event.path || "/"), {
    method: event.httpMethod || "POST",
    headers: event.headers || {},
    body: event.body || null,
  });
  const res = await handle(req);
  return { statusCode: res.status, headers, body: await res.text() };
};
