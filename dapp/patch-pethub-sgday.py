#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace("const today = new Date().toISOString().slice(0, 10);", "const today = sgDay();")
p.write_text(t)
print("iso left", t.count("toISOString().slice(0, 10)"))
