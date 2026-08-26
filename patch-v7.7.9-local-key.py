#!/usr/bin/env python3
"""
Patch dapp/src/App.tsx (v7.7.8 baseline) for local key wallet v7.7.9.
Run inside repo root or dapp folder after placing localWallet.tsx at dapp/src/localWallet.tsx

  python3 patch-v7.7.9-local-key.py dapp/src/App.tsx
"""
import re
import sys
from pathlib import Path

def patch(path: Path) -> None:
    s = path.read_text(encoding="utf-8")
    orig = s

    if "from \"./localWallet\"" in s or "from './localWallet'" in s:
        print("Already has localWallet import — skip import inject")
    else:
        # After wallet-adapter-react import block, add localWallet import
        needle = 'import { WalletModalProvider, useWalletModal } from "@solana/wallet-adapter-react-ui";'
        insert = needle + "\nimport {\n  LocalWalletProvider,\n  usePawlyWallet,\n  LocalWalletEntryButtons,\n} from \"./localWallet\";"
        if needle in s:
            s = s.replace(needle, insert, 1)
        else:
            print("WARN: WalletModalProvider import not found")

    # Ensure Keypair in web3 import
    if "Keypair" not in s.split("@solana/web3.js")[0][-200:] if "@solana/web3.js" in s else True:
        s = s.replace(
            "  PublicKey,\n  Transaction,",
            "  PublicKey,\n  Keypair,\n  Transaction,",
            1,
        )

    # Replace useWallet() in feature pages — careful: keep useWallet for modal-only if needed
    # Broad replace of common destructuring patterns to usePawlyWallet
    patterns = [
        (
            r"const \{ publicKey, connected, sendTransaction, wallet \} = useWallet\(\);",
            "const { publicKey, connected, sendTransaction, wallet } = usePawlyWallet();",
        ),
        (
            r"const \{ connected, publicKey, sendTransaction, wallet \} = useWallet\(\);",
            "const { connected, publicKey, sendTransaction, wallet } = usePawlyWallet();",
        ),
        (
            r"const \{ publicKey, connected \} = useWallet\(\);",
            "const { publicKey, connected } = usePawlyWallet();",
        ),
        (
            r"const wallet = useWallet\(\);",
            "const wallet = usePawlyWallet();",
        ),
    ]
    for a, b in patterns:
        s, n = re.subn(a, b, s)
        print(f"replace {a[:40]}... → {n} times")

    # Wrap LocalWalletProvider inside WalletModalProvider
    if "<LocalWalletProvider>" not in s:
        s = s.replace(
            """        <WalletModalProvider>
          <BrowserRouter basename="/dapp">
            <UserDataProvider>
              <AppRoutes />
            </UserDataProvider>
          </BrowserRouter>
        </WalletModalProvider>""",
            """        <WalletModalProvider>
          <LocalWalletProvider>
            <BrowserRouter basename="/dapp">
              <UserDataProvider>
                <AppRoutes />
              </UserDataProvider>
            </BrowserRouter>
          </LocalWalletProvider>
        </WalletModalProvider>""",
            1,
        )
        print("Wrapped LocalWalletProvider")
    else:
        print("LocalWalletProvider already present")

    # Inject LocalWalletEntryButtons into HomePage — after first features or refresh area
    if "LocalWalletEntryButtons" not in s or s.count("LocalWalletEntryButtons") < 2:
        # After onRefresh definition block, inside return — find a stable anchor near wallet UI
        anchor = "      <div style={{ maxWidth: 720, margin: \"0 auto\" }}>"
        if anchor in s and "<LocalWalletEntryButtons />" not in s:
            s = s.replace(
                anchor,
                anchor + "\n        <LocalWalletEntryButtons />",
                1,
            )
            print("Injected LocalWalletEntryButtons on Home")
        else:
            print("WARN: could not inject LocalWalletEntryButtons automatically — add manually")

    if s == orig:
        print("No changes written (already patched or anchors mismatch)")
        return

    path.write_text(s, encoding="utf-8")
    print("OK wrote", path)

if __name__ == "__main__":
    p = Path(sys.argv[1] if len(sys.argv) > 1 else "dapp/src/App.tsx")
    if not p.exists():
        print("File not found:", p)
        sys.exit(1)
    patch(p)
