#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.4 — in-hub swap, fallback direct till if SW blocks Jupiter.",
    " * PAWLY Pet Hub v0.2.5 — same-origin Jupiter proxy, no USDC-to-till fallback.",
)
old_fetch = '''  const qr = await fetch("https://quote-api.jup.ag/v6/quote?" + qs.toString());
  const quote = await qr.json() as { outAmount?: string; error?: string };
  if (!qr.ok || !quote.outAmount) throw new Error(String(quote.error || "No swap quote / 无法兑换，请用 PAWLY"));
  const till = new PublicKey(SHOP_TILL);
  const tillAta = await getAssociatedTokenAddress(new PublicKey(PAWLY_MINT), till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const sr = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: opts.from.toBase58(),
      destinationTokenAccount: tillAta.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
    }),
  });
  const pack = await sr.json() as { swapTransaction?: string; error?: string };
  if (!sr.ok || !pack.swapTransaction) throw new Error(String(pack.error || "Swap build failed / 兑换构造失败"));'''
new_fetch = '''  const till = new PublicKey(SHOP_TILL);
  const tillAta = await getAssociatedTokenAddress(new PublicKey(PAWLY_MINT), till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const sr = await fetch("/.netlify/functions/hub-jup-swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputMint,
      outputMint: PAWLY_MINT,
      amount: String(rawIn),
      userPublicKey: opts.from.toBase58(),
      destinationTokenAccount: tillAta.toBase58(),
    }),
  });
  const pack = await sr.json() as { swapTransaction?: string; error?: string; outAmount?: string };
  if (!sr.ok || !pack.swapTransaction) throw new Error(String(pack.error || "No swap quote / 无法兑换成 PAWLY"));'''
if old_fetch not in t:
    raise SystemExit("jup fetch block missing")
t = t.replace(old_fetch, new_fetch, 1)
old_fb = '''  if (opts.coin !== "PAWLY") {
    try {
      return await swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction });
    } catch {
      /* PWA SW often blocks quote-api.jup.ag — pay the till directly so checkout still works */
    }
  }'''
new_fb = '''  if (opts.coin !== "PAWLY") {
    return await swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction });
  }'''
if old_fb not in t:
    raise SystemExit("fallback block missing")
t = t.replace(old_fb, new_fb, 1)
# drop unused qs if still present above new_fetch
t = t.replace('''  const qs = new URLSearchParams({
    inputMint,
    outputMint: PAWLY_MINT,
    amount: String(rawIn),
    slippageBps: "150",
    onlyDirectRoutes: "false",
  });
''', "")
p.write_text(t)
print("ok", "hub-jup-swap" in t, "pay the till directly" not in t, "v0.2.5" in t)
