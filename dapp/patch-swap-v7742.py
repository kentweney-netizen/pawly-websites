#!/usr/bin/env python3
import re
from pathlib import Path
p = Path("dapp/src/App.tsx")
t = p.read_text()
pat = re.compile(
    r"    if \(fromToken === \"SOL\" && sponsorLive\(\)\) \{[\s\S]*?if \(pack\) pack\._prewrappedSol = true;\n    \}\n",
    re.M,
)
nt, n = pat.subn("", t, count=1)
print("removed prewrap", n)
t = nt
header_old = "v7.7.41 pre-wrap SOL sponsored + SW-safe fetch. From v7.7.40."
header_new = "v7.7.42 one-sign SOL swap (no separate pre-wrap). Flexi Jupiter/Raydium."
if header_old in t:
    t = t.replace(header_old, header_new, 1)
    print("header bumped")
p.write_text(t)
print("await ensureUserWsolSponsored left", t.count("await ensureUserWsolSponsored"))
