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

HELPER = """
const HUB_SLIPPAGE_BPS = 400;
const HUB_CU_SWAP = 700000;
const HUB_CU_TILL = 120000;
function errText(e: unknown) {
  if (!e) return "";
  if (e instanceof Error) return e.message + " " + String((e as { name?: string }).name || "");
  return String(e);
}
function isUserCancel(e: unknown) {
  const s = errText(e).toLowerCase();
  return s.includes("reject") || s.includes("cancel") || s.includes("denied") || s.includes("user declined");
}
function isExpiredTx(e: unknown) {
  const s = errText(e).toLowerCase();
  return s.includes("blockhash") || s.includes("expired") || s.includes("block height") || s.includes("nonce");
}
async function hubPriorityMicroLamports(conn: Connection) {
  try {
    const fees = await conn.getRecentPrioritizationFees();
    const vals = (fees || []).map((f) => Number(f.prioritizationFee || 0)).filter((n) => n > 0).sort((a, b) => a - b);
    const mid = vals.length ? vals[Math.floor(vals.length * 0.7)] : 0;
    return Math.max(200000, Math.min(1500000, Math.floor(mid * 1.4) || 250000));
  } catch {
    return 250000;
  }
}
function budgetIxs(units: number, microLamports: number): TransactionInstruction[] {
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports }),
  ];
}
async function tillPawlyIxs(opts: { from: PublicKey; till: PublicKey; payer: PublicKey; uiAmount: number }) {
  const mint = new PublicKey(PAWLY_MINT);
  const rawAmt = Math.round(opts.uiAmount * Math.pow(10, PAWLY_DECIMALS));
  if (rawAmt <= 0) throw new Error("Amount too small / 金额太小");
  const fromAta = await getAssociatedTokenAddress(mint, opts.from, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const toAta = await getAssociatedTokenAddress(mint, opts.till, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  return [
    createAssociatedTokenAccountIdempotentInstruction(opts.payer, toAta, opts.till, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(fromAta, mint, toAta, opts.from, rawAmt, PAWLY_DECIMALS, [], TOKEN_PROGRAM_ID),
  ];
}

"""
if "function tillPawlyIxs" not in t:
    t = t.replace("async function sendHubSwapTx(opts: {", HELPER + "async function sendHubSwapTx(opts: {", 1)

t = t.replace("&slippageBps=150&txVersion=V0\"", "&slippageBps=\" + HUB_SLIPPAGE_BPS + \"&txVersion=V0\"")
t = t.replace('computeUnitPriceMicroLamports: "100000",', 'computeUnitPriceMicroLamports: "400000",')
t = t.replace(
    'setNote("Paying in Pet Hub…");',
    'setNote(payCoin === "PAWLY" ? "Paying PAWLY to shop till…" : "Official pool → PAWLY → shop till…");',
)

if "extraIxs?" not in t:
    t = t.replace(
        "  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;\n}) {",
        "  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;\n  extraIxs?: TransactionInstruction[];\n}) {",
        1,
    )

t = t.replace("for (let attempt = 0; attempt < 2; attempt++) {", "for (let attempt = 0; attempt < 4; attempt++) {")

p.write_text(t)
print("patched", "v0.2.20" in t, "tillPawlyIxs" in t, "HUB_SLIPPAGE_BPS" in t)
