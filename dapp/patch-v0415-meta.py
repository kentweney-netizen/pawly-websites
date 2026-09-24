#!/usr/bin/env python3
"""Unhook Pet Hub from live dApp. Keep petHub* source for later game."""
from pathlib import Path
root = Path(__file__).resolve().parent
src = root / "src"
if not src.exists():
    src = Path("dapp/src")

def patch_path(p: Path, pairs):
    if not p.exists():
        print("skip missing", p)
        return
    t = p.read_text()
    orig = t
    for a, b in pairs:
        t = t.replace(a, b)
    if t != orig:
        p.write_text(t)
        print("patched", p)
    else:
        print("no change", p)

patch_path(src / "App.tsx", [
    ('import { PetHubPage } from "./petHub";\n', ""),
    ("  useSearchParams,\n} from \"react-router-dom\";",
     "  useSearchParams,\n  Navigate,\n} from \"react-router-dom\";"),
    ('            onClick={() => navigate("/pet")}',
     "            onClick={undefined}"),
    ('            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/pet"); }}',
     "            onKeyDown={undefined}"),
    ('              alt="PAWLY Pet Hub"',
     '              alt="PAWLY DApp"'),
    ("              Pet Hub",
     "              PAWLY"),
    ('        <Route path="/pet" element={<PetHubPage />} />',
     '        <Route path="/pet" element={<Navigate to="/" replace />} />'),
])

print("Pet Hub unhooked from live dApp")
