#!/usr/bin/env python3
"""PetHub v0.2.20 — official pool swap + PAWLY till + sponsored gas, more reliable landing."""
from pathlib import Path

p = Path("dapp/src/petHub.tsx")
t = p.read_text()
if "v0.2.20" in t and "tillPawlyIxs" in t:
    print("already v0.2.20")
    raise SystemExit(0)

t = t.replace(
    " * PAWLY Pet Hub v0.2.19 — cache RPC, skip heavy recover when roster exists, faster videos.",
    " * PAWLY Pet Hub v0.2.20 — official-pool swap + till in one sponsored tx; dynamic priority fee; more land retries.",
)
if "ComputeBudgetProgram," not in t:
    t = t.replace(
        "  LAMPORTS_PER_SOL,\n} from \"@solana/web3.js\";",
        "  LAMPORTS_PER_SOL,\n  ComputeBudgetProgram,\n} from \"@solana/web3.js\";",
    )

print("run this on a checkout of dapp/src/petHub.tsx")
print("full patch is applied in repo file dapp/src after python3 dapp/patch-pethub-v0220-land.py")
