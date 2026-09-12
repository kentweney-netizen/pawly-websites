#!/usr/bin/env python3
from pathlib import Path
p = Path(__file__).resolve().parent / "src" / "App.tsx"
text = p.read_text()
old = '''  const pawlyPair = fromToken === "PAWLY" || toToken === "PAWLY";
  const primary = !pawlyPair && venueIdOfQuote(best) === "jupiter" ? "jupiter" : "raydium";
  const order = pawlyPair
    ? ["raydium"]
    : primary === "jupiter"
      ? ["jupiter", "raydium"]
      : ["raydium", "jupiter"];
'''
new = '''  const primary = venueIdOfQuote(best) === "jupiter" ? "jupiter" : "raydium";
  const order = primary === "jupiter" ? ["jupiter", "raydium"] : ["raydium", "jupiter"];
'''
if old not in text:
    if 'const order = primary === "jupiter" ? ["jupiter", "raydium"] : ["raydium", "jupiter"];' in text:
        print("already flexi")
        raise SystemExit(0)
    raise SystemExit("lock block not found")
p.write_text(text.replace(old, new, 1))
print("patched", p)
