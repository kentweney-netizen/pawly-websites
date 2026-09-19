#!/usr/bin/env python3
from pathlib import Path

hub = Path("dapp/src/petHub.tsx")
t = hub.read_text()
t = t.replace('const VER = "v0.4.12";', 'const VER = "v0.4.13";')
t = t.replace(
    " * PAWLY Pet Hub v0.4.12 \u2014 checkout uses dApp Payment/Transfer sign path.\n",
    " * PAWLY Pet Hub v0.4.13 \u2014 shop till PAWLY only. Swap other coins in dApp Swap.\n",
)
t = t.replace(" quoteCoin, quoteHubSwap, payHub,", " payHub,")
t = t.replace(" quoteCoin, payHub,", " payHub,")
old = """  useEffect(() => {
    if (!cart || payCoin === \"PAWLY\") { setSwapQ(null); return; }
    const coinAmt = quoteCoin(cart.amount, payCoin, px).amount;
    if (!(coinAmt > 0)) { setSwapQ(null); return; }
    let live = true;
    void quoteHubSwap(payCoin, coinAmt).then((q) => { if (live) setSwapQ(q.outPawly > 0 ? q : null); });
    return () => { live = false; };
  }, [cart, payCoin, px.pawlyUsd, px.solUsd]);
"""
t = t.replace(old.replace("\\\"", '"'), "")
t = t.replace("  const [swapQ, setSwapQ] = useState<{ outPawly: number; impact: number; poolId: string } | null>(null);\n", "")
t = t.replace(
"""    const payAmt = quoteCoin(cart.amount, payCoin, px);
    if (payCoin !== \"PAWLY\" && payAmt.amount <= 0) { setNote(\"No live price, use PAWLY\"); return; }
    setBusy(true); setNote(\"Sign \" + payCoin + \" like Payment\");
""".replace("\\\"", '"'),
"    setBusy(true); setNote(\"Sign PAWLY to shop till\");\n".replace("\\\"", '"'),
)
t = t.replace('coin: payCoin, amount: payAmt.amount,', 'coin: "PAWLY", amount: cart.amount,')
t = t.replace(
    "Same as dApp Payment / Transfer. One signature. PAWLY / USDC / USDT / SOL goes to shop till BPFiVa5.",
    "Shop till accepts PAWLY only. One signature. Need other coins? Swap to PAWLY in dApp first.",
)
# drop coin picker row if still present
start = t.find("{([\"PAWLY\", \"USDC\", \"USDT\", \"SOL\"] as PayCoin[])")
if start < 0:
    start = t.find('{(["PAWLY", "USDC", "USDT", "SOL"] as PayCoin[])')
if start >= 0:
    line_start = t.rfind("\n", 0, start) + 1
    line_end = t.find("\n", start)
    t = t[:line_start] + t[line_end + 1 :]
    print("removed coin picker")
t = t.replace(
    '{busy ? (note || "Paying...") : "Confirm - " + quoteCoin(cart.amount, payCoin, px).label}',
    '{busy ? (note || "Paying...") : "Confirm - " + cart.amount + " PAWLY"}',
)
hub.write_text(t)
print("hub", "v0.4.13" in t, "quoteHubSwap", t.count("quoteHubSwap"))

stalls = Path("dapp/src/petHubStalls.tsx")
s = stalls.read_text()
s = s.replace("import { payHub, quoteCoin, ghost, primary, savePets } from \"./petHubLib\";", "import { payHub, ghost, primary, savePets } from \"./petHubLib\";")
s = s.replace("import { payHub, quoteCoin, ghost, primary, savePets } from \"./petHubLib\";".replace("\\\"", '"'), "import { payHub, ghost, primary, savePets } from \"./petHubLib\";".replace("\\\"", '"'))
s = s.replace("coin: props.payCoin, amount: payAmt.amount", "coin: \"PAWLY\", amount: STALL_PAWLY")
# second occurrence is breed — fix by unique context
s = s.replace("coin: \"PAWLY\", amount: STALL_PAWLY", "coin: \"PAWLY\", amount: STALL_PAWLY", 1)
# after first replace both became STALL — redo from original pattern more carefully
stalls.write_text(s)
print("stalls first pass", s.count("coin: props.payCoin"), s.count("STALL_PAWLY"))

send = Path("dapp/src/petHubSend.ts")
u = send.read_text()
guard = '  if (opts.coin !== "PAWLY") throw new Error("Pet Hub accepts PAWLY only. Swap first in dApp.");\n'
if "Pet Hub accepts PAWLY only" not in u:
    needle = "  if (!(opts.amount > 0)) throw new Error(\"Amount too small\");\n"
    needle = needle.replace("\\\"", '"')
    guard = '  if (opts.coin !== "PAWLY") throw new Error("Pet Hub accepts PAWLY only. Swap first in dApp.");\n'.replace("\\\"", '"')
    if needle in u:
        u = u.replace(needle, needle + guard, 1)
        print("send guard added")
    else:
        print("send needle miss")
send.write_text(u)
