function pickTx(body) {
  const out = [];
  const push = (x) => {
    if (!x) return;
    if (typeof x === "string" && x.length > 40) out.push(x);
    else if (x.transaction) push(x.transaction);
    else if (x.tx) push(x.tx);
  };
  if (!body) return "";
  if (typeof body === "string") push(body);
  if (Array.isArray(body)) body.forEach(push);
  if (body.transaction) push(body.transaction);
  if (Array.isArray(body.transactions)) body.transactions.forEach(push);
  if (Array.isArray(body.data)) body.data.forEach(push);
  else if (body.data) push(body.data);
  return out[0] || "";
}

const UA = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  Origin: "https://www.pawlypets.online",
  Referer: "https://www.pawlypets.online/",
};

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };
  try {
    const body = JSON.parse(event.body || "{}");
    const inputMint = String(body.inputMint || "");
    const outputMint = String(body.outputMint || "");
    const amount = String(body.amount || "");
    const userPublicKey = String(body.userPublicKey || "");
    if (!inputMint || !outputMint || !amount || !userPublicKey) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "missing fields" }) };
    }
    const qUrl =
      "https://transaction-v1.raydium.io/compute/swap-base-in" +
      "?inputMint=" +
      encodeURIComponent(inputMint) +
      "&outputMint=" +
      encodeURIComponent(outputMint) +
      "&amount=" +
      encodeURIComponent(amount) +
      "&slippageBps=150&txVersion=V0";
    const qr = await fetch(qUrl, { headers: UA });
    const quote = await qr.json();
    if (!qr.ok || !quote || quote.success === false || !quote.data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: (quote && (quote.msg || quote.message || quote.error)) || "Raydium no quote" }),
      };
    }
    const outAmount = String(quote.data.outputAmount || quote.data.otherAmountThreshold || "");
    const sr = await fetch("https://transaction-v1.raydium.io/transaction/swap-base-in", {
      method: "POST",
      headers: UA,
      body: JSON.stringify({
        computeUnitPriceMicroLamports: "100000",
        swapResponse: quote,
        txVersion: "V0",
        wallet: userPublicKey,
        wrapSol: true,
        unwrapSol: true,
      }),
    });
    const pack = await sr.json();
    const swapTransaction = pickTx(pack);
    if (!sr.ok || !swapTransaction) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: (pack && (pack.msg || pack.message || pack.error)) || "Raydium build failed" }),
      };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ swapTransaction, outAmount, venue: "raydium" }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String((e && e.message) || e) }) };
  }
};
