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
t = t.replace("  const [swapQ, setSwapQ] = useState<{ outPawly: number; impact: number; poolId: string } | null>(null);\n", "")
swap_fx = """  useEffect(() => {
    if (!cart || payCoin === \"PAWLY\") { setSwapQ(null); return; }
    const coinAmt = quoteCoin(cart.amount, payCoin, px).amount;
    if (!(coinAmt > 0)) { setSwapQ(null); return; }
    let live = true;
    void quoteHubSwap(payCoin, coinAmt).then((q) => { if (live) setSwapQ(q.outPawly > 0 ? q : null); });
    return () => { live = false; };
  }, [cart, payCoin, px.pawlyUsd, px.solUsd]);
"""
t = t.replace(swap_fx, "")
t = t.replace(
    """    const payAmt = quoteCoin(cart.amount, payCoin, px);
    if (payCoin !== \"PAWLY\" && payAmt.amount <= 0) { setNote(\"No live price, use PAWLY\"); return; }
    setBusy(true); setNote(\"Sign \" + payCoin + \" like Payment\");
""",
    "    setBusy(true); setNote(\"Sign PAWLY to shop till\");\n",
)
t = t.replace("coin: payCoin, amount: payAmt.amount,", 'coin: "PAWLY", amount: cart.amount,')
t = t.replace(
    "Same as dApp Payment / Transfer. One signature. PAWLY / USDC / USDT / SOL goes to shop till BPFiVa5.",
    "Shop till accepts PAWLY only. One signature. Need other coins? Swap to PAWLY in dApp first.",
)
needle = '{(["PAWLY", "USDC", "USDT", "SOL"] as PayCoin[])'
i = t.find(needle)
if i >= 0:
    a = t.rfind("\n", 0, i) + 1
    b = t.find("\n", i)
    t = t[:a] + t[b + 1 :]
    print("removed hub coin picker")
t = t.replace(
    '{busy ? (note || "Paying...") : "Confirm - " + quoteCoin(cart.amount, payCoin, px).label}',
    '{busy ? (note || "Paying...") : "Confirm - " + cart.amount + " PAWLY"}',
)
k = t.find("{px.pawlyPerUsdc ?")
if k >= 0:
    a = t.rfind("\n", 0, k) + 1
    b = t.find("\n", t.find("\n", k) + 1)
    t = t[:a] + t[b + 1 :]
    print("removed usdc rate line")
k = t.find("{payCoin !== \"PAWLY\" ?")
if k >= 0:
    a = t.rfind("\n", 0, k) + 1
    end = t.find(": null}", k)
    end = t.find("\n", end)
    t = t[:a] + t[end + 1 :]
    print("removed other-coin hint")
hub.write_text(t)
print("hub v013", "v0.4.13" in t, "quoteHubSwap", t.count("quoteHubSwap"), "payAmt", t.count("payAmt"))

stalls = Path("dapp/src/petHubStalls.tsx")
s = stalls.read_text()
s = s.replace(
    'import { payHub, quoteCoin, ghost, primary, savePets } from "./petHubLib";',
    'import { payHub, ghost, primary, savePets } from "./petHubLib";',
)
s = s.replace(
    """    const payAmt = quoteCoin(STALL_PAWLY, props.payCoin, props.px);
    if (props.payCoin !== \"PAWLY\" && payAmt.amount <= 0) { props.setNote(\"No live price, use PAWLY\"); return; }
    props.setBusy(true); props.setNote(\"Opening stall...\");
    try {
      const sig = await payHub({ from: props.wallet.publicKey, coin: props.payCoin, amount: payAmt.amount, signTransaction: props.wallet.signTransaction, sendTransaction: props.wallet.sendTransaction, wallet: props.wallet as never });
""",
    """    props.setBusy(true); props.setNote(\"Opening stall with PAWLY...\");
    try {
      const sig = await payHub({ from: props.wallet.publicKey, coin: \"PAWLY\", amount: STALL_PAWLY, signTransaction: props.wallet.signTransaction, sendTransaction: props.wallet.sendTransaction, wallet: props.wallet as never });
""",
)
s = s.replace(
    """    const payAmt = quoteCoin(BREED_PAWLY, props.payCoin, props.px);
    if (props.payCoin !== \"PAWLY\" && payAmt.amount <= 0) { props.setNote(\"No live price, use PAWLY\"); return; }
    props.setBusy(true); props.setNote(\"Minting species NFT...\");
    try {
      const sig = await payHub({ from: props.wallet.publicKey, coin: props.payCoin, amount: payAmt.amount, signTransaction: props.wallet.signTransaction, sendTransaction: props.wallet.sendTransaction, wallet: props.wallet as never });
""",
    """    props.setBusy(true); props.setNote(\"Minting species NFT with PAWLY...\");
    try {
      const sig = await payHub({ from: props.wallet.publicKey, coin: \"PAWLY\", amount: BREED_PAWLY, signTransaction: props.wallet.signTransaction, sendTransaction: props.wallet.sendTransaction, wallet: props.wallet as never });
""",
)
j = s.find('{( ["PAWLY", "USDC", "USDT", "SOL"] as PayCoin[])'.replace(" {(", '{('))
j = s.find('{( ["PAWLY"'.replace(" ", ""))
if True:
    j = s.find('{(["PAWLY", "USDC", "USDT", "SOL"] as PayCoin[])')
if j >= 0:
    a = s.rfind("\n", 0, j) + 1
    k = s.find("))}", j)
    end = s.find("\n", k)
    s = s[:a] + s[end + 1 :]
    print("removed stall coin picker")
s = s.replace(
    '{marketPayHint(s.myStall ? "breed" : "stall", props.payCoin)}',
    '"Pay PAWLY only. Swap other coins in dApp Swap first."',
)
stalls.write_text(s)
print("stalls payCoin coin:", s.count("coin: props.payCoin"), "quoteCoin", s.count("quoteCoin"))

send = Path("dapp/src/petHubSend.ts")
u = send.read_text()
if "Pet Hub accepts PAWLY only" not in u:
    needle = '  if (!(opts.amount > 0)) throw new Error("Amount too small");\n'
    guard = '  if (opts.coin !== "PAWLY") throw new Error("Pet Hub accepts PAWLY only. Swap first in dApp.");\n'
    if needle not in u:
        raise SystemExit("send needle miss")
    u = u.replace(needle, needle + guard, 1)
    print("send guard added")
else:
    print("send guard already present")
send.write_text(u)
