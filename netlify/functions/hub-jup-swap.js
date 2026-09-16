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

const WSOL = "So11111111111111111111111111111111111111112";
const UA = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  Origin: "https://www.pawlypets.online",
  Referer: "https://www.pawlypets.online/",
};

function ok(headers, extra) {
  return { statusCode: 200, headers, body: JSON.stringify(extra) };
}
function fail(headers, status, error) {
  return { statusCode: status, headers, body: JSON.stringify({ error }) };
}

async function tryJupiter(body) {
  const inputMint = String(body.inputMint || "");
  const outputMint = String(body.outputMint || "");
  const amount = String(body.amount || "");
  const userPublicKey = String(body.userPublicKey || "");
  const dest = String(body.destinationTokenAccount || body.outputAccount || "");
  const slippageBps = String(body.slippageBps || 400);
  const quoteUrls = [
    "https://lite-api.jup.ag/swap/v1/quote?inputMint=" + encodeURIComponent(inputMint) + "&outputMint=" + encodeURIComponent(outputMint) + "&amount=" + encodeURIComponent(amount) + "&slippageBps=" + encodeURIComponent(slippageBps) + "&restrictIntermediateTokens=true",
    "https://quote-api.jup.ag/v6/quote?inputMint=" + encodeURIComponent(inputMint) + "&outputMint=" + encodeURIComponent(outputMint) + "&amount=" + encodeURIComponent(amount) + "&slippageBps=" + encodeURIComponent(slippageBps),
  ];
  let quote = null;
  let last = "Jupiter no quote";
  for (const qUrl of quoteUrls) {
    try {
      const qr = await fetch(qUrl, { headers: UA });
      const q = await qr.json();
      if (qr.ok && q && (q.outAmount || (q.data && q.data.outAmount))) {
        quote = q.outAmount ? q : q.data;
        break;
      }
      last = (q && (q.error || q.message || q.msg)) || last;
    } catch (e) {
      last = String((e && e.message) || e);
    }
  }
  if (!quote || !quote.outAmount) throw new Error(last);
  const swapUrls = ["https://lite-api.jup.ag/swap/v1/swap", "https://quote-api.jup.ag/v6/swap"];
  const payload = {
    quoteResponse: quote,
    userPublicKey,
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: "auto",
  };
  if (dest) payload.destinationTokenAccount = dest;
  let lastBuild = "Jupiter build failed";
  for (const sUrl of swapUrls) {
    try {
      const sr = await fetch(sUrl, { method: "POST", headers: UA, body: JSON.stringify(payload) });
      const pack = await sr.json();
      const tx = pack && (pack.swapTransaction || pickTx(pack));
      if (tx) {
        return {
          swapTransaction: tx,
          outAmount: String(quote.outAmount || ""),
          minOut: String(quote.otherAmountThreshold || quote.outAmount || ""),
          venue: "jupiter",
          destMode: dest ? "till" : "user",
        };
      }
      lastBuild = (pack && (pack.error || pack.message || pack.msg)) || lastBuild;
    } catch (e) {
      lastBuild = String((e && e.message) || e);
    }
  }
  throw new Error(lastBuild);
}

async function tryRaydium(body) {
  const inputMint = String(body.inputMint || "");
  const outputMint = String(body.outputMint || "");
  const amount = String(body.amount || "");
  const userPublicKey = String(body.userPublicKey || "");
  const inputAccount = String(body.inputAccount || "");
  const outputAccount = String(body.outputAccount || body.destinationTokenAccount || "");
  const isSolIn = inputMint === WSOL;
  const qUrl =
    "https://transaction-v1.raydium.io/compute/swap-base-in" +
    "?inputMint=" +
    encodeURIComponent(inputMint) +
    "&outputMint=" +
    encodeURIComponent(outputMint) +
    "&amount=" +
    encodeURIComponent(amount) +
    "&slippageBps=" +
    encodeURIComponent(String(body.slippageBps || 400)) +
    "&txVersion=V0";
  const qr = await fetch(qUrl, { headers: UA });
  const quote = await qr.json();
  if (!qr.ok || !quote || quote.success === false || !quote.data) {
    throw new Error((quote && (quote.msg || quote.message || quote.error)) || "Raydium no quote");
  }
  const outAmount = String(quote.data.outputAmount || quote.data.otherAmountThreshold || "");
  const minOut = String(quote.data.otherAmountThreshold || quote.data.outputAmount || "");
  const payloads = [quote, quote.data];
  const wraps = isSolIn ? [true, false] : [false];
  const destModes = outputAccount ? ["till", "user"] : ["user"];
  let lastErr = "Raydium build failed";
  for (const destMode of destModes) {
    for (const wrapSol of wraps) {
      for (const swapResponse of payloads) {
        const payload = {
          computeUnitPriceMicroLamports: "400000",
          swapResponse,
          txVersion: "V0",
          wallet: userPublicKey,
          wrapSol,
          unwrapSol: false,
        };
        if (inputAccount) payload.inputAccount = inputAccount;
        if (destMode === "till" && outputAccount) payload.outputAccount = outputAccount;
        const sr = await fetch("https://transaction-v1.raydium.io/transaction/swap-base-in", {
          method: "POST",
          headers: UA,
          body: JSON.stringify(payload),
        });
        const pack = await sr.json();
        const tx = pickTx(pack);
        const many = Array.isArray(pack && pack.data) ? pack.data.length : Array.isArray(pack && pack.transactions) ? pack.transactions.length : 1;
        if (tx && many <= 1) {
          return { swapTransaction: tx, outAmount, minOut, venue: "raydium", destMode };
        }
        lastErr = (pack && (pack.msg || pack.message || pack.error)) || lastErr;
      }
    }
  }
  throw new Error(lastErr);
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return fail(headers, 405, "POST only");
  try {
    const body = JSON.parse(event.body || "{}");
    const inputMint = String(body.inputMint || "");
    const outputMint = String(body.outputMint || "");
    const amount = String(body.amount || "");
    const userPublicKey = String(body.userPublicKey || "");
    if (!inputMint || !outputMint || !amount || !userPublicKey) {
      return fail(headers, 400, "missing fields");
    }
    const errors = [];
    try {
      return ok(headers, await tryJupiter(body));
    } catch (e) {
      errors.push("jup:" + String((e && e.message) || e));
    }
    try {
      return ok(headers, await tryRaydium(body));
    } catch (e) {
      errors.push("ray:" + String((e && e.message) || e));
    }
    return fail(headers, 400, errors.join(" | ") || "swap proxy failed");
  } catch (e) {
    return fail(headers, 500, String((e && e.message) || e));
  }
};
