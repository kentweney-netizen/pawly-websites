#!/usr/bin/env python3
"""Wire dApp hero -> Pet Hub game station with the current wallet."""
from pathlib import Path

app = Path(__file__).resolve().parent / "src" / "App.tsx"
hub = Path(__file__).resolve().parent / "src" / "petHub.tsx"

a = app.read_text()
old_click = 'onClick={() => navigate("/pet")}\n            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/pet"); }}'
new_click = '''onClick={() => {
              const w = (wallet.publicKey && wallet.publicKey.toString()) || pwaData.wallet || "";
              try { if (w) sessionStorage.setItem("pawly_pet_hub_session_wallet", w); } catch (_) {}
              navigate("/pet", { state: { wallet: w, from: "dapp" } });
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              const w = (wallet.publicKey && wallet.publicKey.toString()) || pwaData.wallet || "";
              try { if (w) sessionStorage.setItem("pawly_pet_hub_session_wallet", w); } catch (_) {}
              navigate("/pet", { state: { wallet: w, from: "dapp" } });
            }}'''
if old_click in a:
    a = a.replace(old_click, new_click, 1)
    print("app hero door patched")
elif "pawly_pet_hub_session_wallet" in a:
    print("app hero door already patched")
else:
    print("app hero target missing")
app.write_text(a)

h = hub.read_text()
if "useLocation" not in h:
    h = h.replace(
        'import { useNavigate } from "react-router-dom";',
        'import { useLocation, useNavigate } from "react-router-dom";',
        1,
    )
    print("hub import location")
if "const location = useLocation()" not in h:
    h = h.replace(
        "  const navigate = useNavigate();\n  const wallet = usePawlyWallet()",
        "  const navigate = useNavigate();\n  const location = useLocation() as { state?: { wallet?: string } };\n  const wallet = usePawlyWallet()",
        1,
    )
    print("hub location hook")
old_addr = '  const addr = (wallet.publicKey && wallet.publicKey.toString()) || "";'
new_addr = '''  const handed = String((location.state && location.state.wallet) || "");
  let sessionW = "";
  try { sessionW = sessionStorage.getItem("pawly_pet_hub_session_wallet") || ""; } catch {}
  const live = (wallet.publicKey && wallet.publicKey.toString()) || "";
  const addr = live || handed || sessionW || "";
  useEffect(() => {
    if (live) {
      try { sessionStorage.setItem("pawly_pet_hub_session_wallet", live); } catch {}
    }
  }, [live]);'''
if old_addr in h:
    h = h.replace(old_addr, new_addr, 1)
    print("hub addr from dApp wallet")
elif "pawly_pet_hub_session_wallet" in h:
    print("hub addr already patched")
else:
    print("hub addr target missing")
hub.write_text(h)
print("ok game door")
