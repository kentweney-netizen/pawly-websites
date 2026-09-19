#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/App.tsx")
t = p.read_text()
old = """    if (fromToken === \"SOL\" && sponsorLive()) {
      const lamports = Number((pack && (pack.inputAmount || pack.inAmount)) || toRawAmount(uiAmount, \"SOL\"));
      await ensureUserWsolSponsored({
        publicKey,
        wallet,
        signTransaction,
        lamports: lamports,
      });
      if (pack) pack._prewrappedSol = true;
    }
    return await executeRaydiumSwap({
"""
new = """    return await executeRaydiumSwap({
"""
n = t.count(old)
if n:
    t = t.replace(old, new)
    print("removed prewrap block", n)
else:
    print("prewrap block already gone or pattern mismatch")
header_old = " * PAWLY DApp \u2014 09.09.2026 v7.7.41 pre-wrap SOL sponsored + SW-safe fetch. From v7.7.40."
header_new = " * PAWLY DApp \u2014 19.09.2026 v7.7.42 one-sign SOL swap (no separate pre-wrap). Flexi Jupiter\u2194Raydium."
if header_old in t:
    t = t.replace(header_old, header_new, 1)
    print("header bumped")
p.write_text(t)
print("await ensureUserWsolSponsored left", t.count("await ensureUserWsolSponsored"))
