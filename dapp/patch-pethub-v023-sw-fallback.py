#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.3 — stables/SOL swap to PAWLY till in-hub.",
    " * PAWLY Pet Hub v0.2.4 — in-hub swap, fallback direct till if SW blocks Jupiter.",
)
old = '''  if (opts.coin !== "PAWLY") {
    return swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction });
  }'''
new = '''  if (opts.coin !== "PAWLY") {
    try {
      return await swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction });
    } catch {
      /* PWA SW often blocks quote-api.jup.ag — pay the till directly so checkout still works */
    }
  }'''
if old not in t:
    raise SystemExit("early return missing")
t = t.replace(old, new, 1)
p.write_text(t)
print("ok", "v0.2.4" in t, "pay the till directly" in t)
