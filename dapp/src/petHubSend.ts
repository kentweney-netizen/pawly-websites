async function sponsorBroadcast(signed: VersionedTransaction, feePawly: number) {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => { try { ctrl.abort(); } catch { /* ignore */ } }, 20000);
  try {
    const r = await fetch(SUPABASE_URL + "/functions/v1/sponsor-dapp-tx", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + SUPABASE_KEY, apikey: SUPABASE_KEY },
      body: JSON.stringify({ transaction: txToB64(signed), feePawly: Math.max(1, feePawly || 1), mode: "send" }),
      signal: ctrl.signal,
    });
    const d = await r.json().catch(() => ({})) as { signature?: string; error?: string };
    if (r.ok && d.signature) return String(d.signature);
    throw new Error(String(d.error || ("Sponsor HTTP " + r.status)));
  } catch (e) {
    if (String((e as { name?: string })?.name || "") === "AbortError") throw new Error("Sponsor timeout / 代付超时，请再试一次（已签名勿连点）");
    throw e;
  } finally { window.clearTimeout(timer); }
}
export const sponsorSignedTx = sponsorBroadcast;
