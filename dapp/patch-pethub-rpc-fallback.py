#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
old = '''const RPC =
  "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
'''
new = '''const RPC =
  "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const RPCS = [
  RPC,
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
];
async function openHubConn() {
  let last = "";
  for (const url of RPCS) {
    try {
      const conn = new Connection(url, "confirmed");
      await conn.getLatestBlockhash("confirmed");
      return conn;
    } catch (e) {
      last = String((e as { message?: string })?.message || e);
    }
  }
  throw new Error("RPC failed / 节点连不上 " + last);
}
'''
if "const RPCS" not in t:
    if old not in t:
        raise SystemExit("RPC block missing")
    t = t.replace(old, new, 1)
t = t.replace("const conn = new Connection(RPC, \"confirmed\");", "const conn = await openHubConn();")
t = t.replace(
    " * PAWLY Pet Hub v0.2 — checkout PAWLY / USDC / USDT / SOL.",
    " * PAWLY Pet Hub v0.2.1 — multi RPC fallback for checkout.",
)
p.write_text(t)
print("rpcs", t.count("openHubConn"), "conn await", t.count("await openHubConn"))
