#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
for a,b in [
    (" * PAWLY Pet Hub v0.2.7 — Raydium wrapSol only for SOL; PAWLY then to till.",
     " * PAWLY Pet Hub v0.2 LOCK — PAWLY/USDC/USDT/SOL pay till directly."),
    (" * PAWLY Pet Hub v0.2.5 — same-origin Jupiter proxy, no USDC-to-till fallback.",
     " * PAWLY Pet Hub v0.2 LOCK — PAWLY/USDC/USDT/SOL pay till directly."),
]:
    t = t.replace(a,b)
old = '''  if (opts.coin !== "PAWLY") {
    return await swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction, pawlyList: opts.pawlyList });
  }'''
new = '''  /* v0.2 LOCK: do not swap in-hub. USDC/USDT/SOL transfer to till. */'''
if old not in t:
    old2 = '''  if (opts.coin !== "PAWLY") {
    return await swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction });
  }'''
    if old2 not in t:
        raise SystemExit("swap branch missing")
    t = t.replace(old2, new, 1)
else:
    t = t.replace(old, new, 1)
t = t.replace(
    "Pays the shop till on-chain. Live pool price. No price = use PAWLY.",
    "Pays the shop till in the token you pick. Live pool price. Swap-to-PAWLY stays on the Swap page.",
)
t = t.replace(
    "按官方池现价折算，拉不到价请用 PAWLY。",
    "按现价折算后直付店柜。要换 PAWLY 请用 dApp Swap。",
)
p.write_text(t)
print("ok", t.splitlines()[1])
print("swap branch gone", "return await swapCoinToTillPawly" not in t)
