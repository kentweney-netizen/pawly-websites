#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.5 — same-origin Jupiter proxy, no USDC-to-till fallback.",
    " * PAWLY Pet Hub v0.2.7 — Raydium wrapSol only for SOL; PAWLY then to till.",
)
t = t.replace(
    " * PAWLY Pet Hub v0.2.6 — Raydium swap then PAWLY to till.",
    " * PAWLY Pet Hub v0.2.7 — Raydium wrapSol only for SOL; PAWLY then to till.",
)
old = """  await assertOnchainSuccess(opts.conn, sig);
  return sig;
}
async function payHubToken"""
new = """  await assertOnchainSuccess(opts.conn, sig);
  const list = Number(opts.pawlyList || 0);
  if (list > 0) {
    return payHubToken({
      from: opts.from,
      pawlyList: list,
      coin: "PAWLY",
      coinAmount: list,
      sendTransaction: opts.sendTransaction,
      signTransaction: opts.signTransaction,
    });
  }
  return sig;
}
async function payHubToken"""
if old in t:
    t = t.replace(old, new, 1)
t = t.replace(
    "  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;\n}) {",
    "  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;\n  pawlyList?: number;\n}) {",
    1,
)
t = t.replace(
    "return await swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction });",
    "return await swapCoinToTillPawly({ from: opts.from, coin: opts.coin, coinAmount: opts.coinAmount, conn, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction, pawlyList: opts.pawlyList });",
)
p.write_text(t)
print("ok", t.splitlines()[1], "pawlyList: opts.pawlyList" in t, "coin: \"PAWLY\"" in t)
