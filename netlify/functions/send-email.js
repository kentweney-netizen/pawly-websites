// PAWLY Pets email — Resend. Pet Hub certificate + photo card.
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || "PAWLY Pets <onboarding@resend.dev>";

function certHtml(body) {
  const emoji = body.emoji || "🐾";
  const title = body.title || "PAWLY Pet Hub";
  const amount = body.amount != null ? String(body.amount) : "";
  const sig = body.sig || "";
  const site = body.site || "https://www.pawlypets.online/dapp/pet";
  return `<!doctype html><html><body style="margin:0;background:#07110c;color:#e8eef7;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(180deg,#163524,#0b1610);border:1px solid #00ff9d;border-radius:16px;padding:24px;text-align:center">
      <div style="font-size:72px;line-height:1">${emoji}</div>
      <h1 style="color:#00ff9d;font-size:22px;margin:12px 0 6px">PAWLY Certificate</h1>
      <p style="margin:0 0 8px;font-size:16px">${title}</p>
      <p style="margin:0 0 12px;color:#c8ffe8">${amount} PAWLY · on-chain</p>
      <p style="word-break:break-all;font-size:11px;color:#9aa">${sig}</p>
      <p style="margin-top:16px"><a href="${site}" style="color:#00ff9d">Open Pet Hub</a></p>
    </div>
    <p style="font-size:12px;color:#8aa;text-align:center">Official CA 88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87</p>
  </div></body></html>`;
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const subject =
      body.subject ||
      "PAWLY Pet Hub certificate · " + (body.title || "your pet");
    const html = body.html || certHtml(body);
    const text =
      body.message ||
      [body.title || "PAWLY certificate", (body.amount || "") + " PAWLY", body.sig || ""].join("\n");
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject,
      text,
      html,
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message || "Resend failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, messageId: data?.id || null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err && err.message ? err.message : err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
