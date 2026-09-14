#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.5 — same-origin Jupiter proxy, no USDC-to-till fallback.",
    " * PAWLY Pet Hub v0.2.6 — Raydium swap then PAWLY to till.",
)
t = t.replace(
    "  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;\n}) {",
    "  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;\n  pawlyList?: number;\n}) {",
    1,
)
t = t.replace(
    "  await assertOnchainSuccess(opts.conn, sig);\n  return sig;\n}\nasync function payHubToken",
    "  await assertOnchainSuccess(opts.conn, sig);\n  const list = Number(opts.pawlyList || 0);\n  if (list > 0) {\n    return payHubToken({
      from: opts.from,\n      pawlyList: list,\n      coin: \"PAWLY\",\n      coinAmount: list,\n      sendTransaction: opts.sendTransaction,\n      signTransaction: opts.signTransaction,\n    });\n  }\n  return sig;\n}\nasync function payHubToken",
)
t = t.replace(
    "return await swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction });",
    "return await swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction, pawlyList: opts.pawlyList });",
)
p.write_text(t)
print("ok", "v0.2.6" in t, "pawlyList: opts.pawlyList" in t)
