#!/usr/bin/env python3
from pathlib import Path
import sys

cands = [Path("dapp/src/App.tsx"), Path(__file__).resolve().parent / "src" / "App.tsx"]
p = next((x for x in cands if x.exists()), None)
if not p:
    sys.exit("dapp/src/App.tsx not found")
text = p.read_text()
changed = False

old_lock = '''  const pawlyPair = fromToken === "PAWLY" || toToken === "PAWLY";
  const primary = !pawlyPair && venueIdOfQuote(best) === "jupiter" ? "jupiter" : "raydium";
  const order = pawlyPair
    ? ["raydium"]
    : primary === "jupiter"
      ? ["jupiter", "raydium"]
      : ["raydium", "jupiter"];
'''
new_lock = '''  const primary = venueIdOfQuote(best) === "jupiter" ? "jupiter" : "raydium";
  const order = primary === "jupiter" ? ["jupiter", "raydium"] : ["raydium", "jupiter"];
'''
if old_lock in text:
    text = text.replace(old_lock, new_lock, 1)
    changed = True
    print("flexi unlock ok")
else:
    print("flexi already unlocked or block missing")

old_fee = "body: JSON.stringify({ transaction: b64, feePawly: Number(feePawly) || 0 }),"
new_fee = "body: JSON.stringify({ transaction: b64, feePawly: Math.max(1, Number(feePawly) || 1) }),"
if old_fee in text:
    text = text.replace(old_fee, new_fee)
    changed = True
    print("sponsor fee floor ok")
else:
    print("sponsor fee line missing or already patched")

old_wrap = "const sig = await sponsorBroadcast(signed, 0);"
new_wrap = "const sig = await sponsorBroadcast(signed, 1);"
if old_wrap in text:
    text = text.replace(old_wrap, new_wrap)
    changed = True
    print("wrap fee floor ok")
else:
    print("wrap broadcast already >=1 or not found")

if not changed:
    sys.exit("nothing patched")
p.write_text(text)
print("wrote", p)
