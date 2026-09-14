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
    const destinationTokenAccount = String(body.destinationTokenAccount || "");
    if (!inputMint || !outputMint || !amount || !userPublicKey || !destinationTokenAccount) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "missing fields" }) };
    }
    const qs = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      slippageBps: "150",
      onlyDirectRoutes: "false",
    });
    const qr = await fetch("https://quote-api.jup.ag/v6/quote?" + qs.toString());
    const quote = await qr.json();
    if (!qr.ok || !quote || !quote.outAmount) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: quote && quote.error ? quote.error : "no quote" }) };
    }
    const sr = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        destinationTokenAccount,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
      }),
    });
    const pack = await sr.json();
    if (!sr.ok || !pack || !pack.swapTransaction) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: pack && pack.error ? pack.error : "swap build failed" }) };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ swapTransaction: pack.swapTransaction, outAmount: quote.outAmount }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String((e && e.message) || e) }) };
  }
};
