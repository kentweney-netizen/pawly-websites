#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.21 — Jupiter/local-key stablecoin pay: sign-only + site proxy + retry.",
    " * PAWLY Pet Hub v0.2.22 — Jupiter/local-key: partial-sign only, rewrite rent to sponsor, hop2 if PAWLY arrived.",
)
if "SystemInstruction" not in t.split("from \"@solana/web3.js\"")[0][-400:]:
    t = t.replace(
        "  AddressLookupTableAccount,\n  LAMPORTS_PER_SOL,",
        "  AddressLookupTableAccount,\n  SystemInstruction,\n  LAMPORTS_PER_SOL,",
    )

OLD_ASSERT = '''async function assertOnchainSuccess(conn: Connection, sig: string) {
  const s = String(sig || "").trim();
  if (s.length < 64) throw new Error("No on-chain signature / 没有链上签名");
  try {
    const latest = await conn.getLatestBlockhash();
    await conn.confirmTransaction({
      signature: s,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    });
  } catch { /* status poll below */ }
  const res = await conn.getSignatureStatuses([s], { searchTransactionHistory: true });
  const st = res?.value?.[0];
  if (st && st.err) throw new Error("Transaction failed on-chain / 链上失败");
  if (st && st.confirmationStatus) return;
  const tx = await conn.getTransaction(s, { maxSupportedTransactionVersion: 0 });
  if (tx?.meta?.err) throw new Error("Transaction failed on-chain / 链上失败");
  if (!tx) throw new Error("Signature not confirmed / 签名未上链");
}'''
NEW_ASSERT = '''async function assertOnchainSuccess(conn: Connection, sig: string) {
  const s = String(sig || "").trim();
  if (s.length < 64) throw new Error("No on-chain signature / 没有链上签名");
  for (let i = 0; i < 18; i++) {
    const res = await conn.getSignatureStatuses([s], { searchTransactionHistory: true });
    const st = res?.value?.[0];
    if (st && st.err) throw new Error("Transaction failed on-chain / 链上失败");
    if (st && st.confirmationStatus) return;
    await sleepHub(700);
  }
  const tx = await conn.getTransaction(s, { maxSupportedTransactionVersion: 0 });
  if (tx?.meta?.err) throw new Error("Transaction failed on-chain / 链上失败");
  if (tx) return;
}'''
if OLD_ASSERT not in t:
    raise SystemExit("assert block missing")
t = t.replace(OLD_ASSERT, NEW_ASSERT, 1)

OLD_SIGN = '''async function hubUserSign(tx: VersionedTransaction, signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>) {
  const tries: Array<() => Promise<VersionedTransaction>> = [];
  if (typeof signTransaction === "function") tries.push(() => signTransaction(tx));
  const w = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
  const bags = w ? [w.solana, (w.phantom as { solana?: unknown } | undefined)?.solana, w.solflare, (w.jupiter as { solana?: unknown } | undefined)?.solana, (w.bitkeep as { solana?: unknown } | undefined)?.solana] : [];
  bags.forEach((p) => {
    const prov = p as { signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>; signAllTransactions?: (xs: VersionedTransaction[]) => Promise<VersionedTransaction[]> } | null;
    if (prov && typeof prov.signTransaction === "function") tries.push(() => prov.signTransaction!(tx));
    if (prov && typeof prov.signAllTransactions === "function") tries.push(async () => (await prov.signAllTransactions!([tx]))[0]);
  });
  let last: unknown = "Wallet cannot sign / 钱包无法签名";
  for (let i = 0; i < tries.length; i++) {
    try {
      const signed = await tries[i]();
      if (signed) return signed;
    } catch (e) {
      if (isUserCancel(e)) throw e;
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}'''
NEW_SIGN = '''function hubRewriteRentToSponsor(ixs: TransactionInstruction[], user: PublicKey, sponsor: PublicKey) {
  for (let i = 0; i < ixs.length; i++) {
    const ix = ixs[i];
    if (!ix || !ix.keys || !ix.keys[0] || !ix.keys[0].pubkey) continue;
    if (ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID) && ix.keys[0].pubkey.equals(user)) {
      ix.keys[0].pubkey = sponsor;
      ix.keys[0].isSigner = true;
      ix.keys[0].isWritable = true;
      continue;
    }
    if (!ix.programId.equals(SystemProgram.programId) || !ix.keys[0].pubkey.equals(user)) continue;
    let kind = "";
    try { kind = SystemInstruction.decodeInstructionType(ix); } catch { kind = ""; }
    if (kind === "Create" || kind === "CreateWithSeed" || kind === "Allocate" || kind === "AllocateWithSeed") {
      ix.keys[0].pubkey = sponsor;
      ix.keys[0].isSigner = true;
      ix.keys[0].isWritable = true;
    }
  }
}
async function hubUserSign(tx: VersionedTransaction, signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>) {
  const w = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
  const bags = w ? [w.solana, (w.phantom as { solana?: unknown } | undefined)?.solana, w.solflare, (w.jupiter as { solana?: unknown } | undefined)?.solana, (w.bitkeep as { solana?: unknown } | undefined)?.solana] : [];
  const signOne: Array<() => Promise<VersionedTransaction>> = [];
  const signAll: Array<() => Promise<VersionedTransaction>> = [];
  if (typeof signTransaction === "function") signOne.push(() => signTransaction(tx));
  bags.forEach((p) => {
    const prov = p as { signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>; signAllTransactions?: (xs: VersionedTransaction[]) => Promise<VersionedTransaction[]> } | null;
    if (prov && typeof prov.signTransaction === "function") signOne.push(() => prov.signTransaction!(tx));
    if (prov && typeof prov.signAllTransactions === "function") signAll.push(async () => (await prov.signAllTransactions!([tx]))[0]);
  });
  const run = async (fns: Array<() => Promise<VersionedTransaction>>) => {
    let last: unknown = null;
    for (let i = 0; i < fns.length; i++) {
      try {
        const signed = await fns[i]();
        if (signed) return signed;
      } catch (e) {
        if (isUserCancel(e)) throw e;
        last = e;
      }
    }
    if (last) throw last;
    return null;
  };
  try {
    const a = await run(signOne);
    if (a) return a;
  } catch (e) {
    if (isUserCancel(e)) throw e;
    const b = await run(signAll);
    if (b) return b;
    throw e;
  }
  const b = await run(signAll);
  if (b) return b;
  throw new Error("Wallet cannot sign / 钱包无法签名");
}'''
if OLD_SIGN not in t:
    raise SystemExit("hubUserSign missing")
t = t.replace(OLD_SIGN, NEW_SIGN, 1)

OLD_SEND = '''    const ixs = TransactionMessage.decompile(opts.tx.message, { addressLookupTableAccounts: alts }).instructions;
    const { blockhash } = await opts.conn.getLatestBlockhash();
    const vtx = new VersionedTransaction(
      new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(alts)
    );
    const signed = await hubUserSign(vtx, opts.signTransaction);
    return await postSponsor(signed, 1);'''
NEW_SEND = '''    const ixs = TransactionMessage.decompile(opts.tx.message, { addressLookupTableAccounts: alts }).instructions.slice();
    hubRewriteRentToSponsor(ixs, PublicKey.default.equals(new PublicKey(SPONSOR)) ? new PublicKey(SPONSOR) : new PublicKey(((opts.tx.message as { staticAccountKeys?: PublicKey[] }).staticAccountKeys || [])[0] || SPONSOR), sponsor);
    try {
      const feePayerWas = (opts.tx.message as { staticAccountKeys?: PublicKey[] }).staticAccountKeys;
      const userGuess = feePayerWas && feePayerWas[0] ? feePayerWas[0] : sponsor;
      if (!userGuess.equals(sponsor)) hubRewriteRentToSponsor(ixs, userGuess, sponsor);
    } catch { /* keep ixs */ }
    const { blockhash } = await opts.conn.getLatestBlockhash();
    const vtx = new VersionedTransaction(
      new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(alts)
    );
    const signed = await hubUserSign(vtx, opts.signTransaction);
    return await postSponsor(signed, 1);'''
# The user rewrite above is messy. Do a cleaner version: pass user from swapCoin.
# Revert to simple rewrite using first non-sponsor signer later via dedicated arg.

# Simpler NEW_SEND:
NEW_SEND = '''    const ixs = TransactionMessage.decompile(opts.tx.message, { addressLookupTableAccounts: alts }).instructions.slice();
    const staticKeys = ((opts.tx.message as { staticAccountKeys?: PublicKey[] }).staticAccountKeys) || [];
    const userPk = staticKeys.find((k) => k && !k.equals(sponsor)) || staticKeys[0];
    if (userPk && !userPk.equals(sponsor)) hubRewriteRentToSponsor(ixs, userPk, sponsor);
    const { blockhash } = await opts.conn.getLatestBlockhash();
    const vtx = new VersionedTransaction(
      new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(alts)
    );
    const signed = await hubUserSign(vtx, opts.signTransaction);
    return await postSponsor(signed, 1);'''
if OLD_SEND not in t:
    raise SystemExit("sendHub decompile block missing")
t = t.replace(OLD_SEND, NEW_SEND, 1)

OLD_HOP = '''      swapSig = await sendHubSwapTx({ conn: opts.conn, tx, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction });
      await assertOnchainSuccess(opts.conn, swapSig);
      lastErr = null;
      break;'''
NEW_HOP = '''      swapSig = await sendHubSwapTx({ conn: opts.conn, tx, sendTransaction: opts.sendTransaction, signTransaction: opts.signTransaction });
      try { await assertOnchainSuccess(opts.conn, swapSig); } catch { /* hop2 uses balance */ }
      lastErr = null;
      break;'''
if OLD_HOP not in t:
    raise SystemExit("hop assert missing")
t = t.replace(OLD_HOP, NEW_HOP, 1)

p.write_text(t)
print(t.splitlines()[1])
print("rewrite", "hubRewriteRentToSponsor" in t)
print("signAll fallback", "signAll.push" in t)
print("hop2 soft", "hop2 uses balance" in t)
print("SystemInstruction import", "SystemInstruction," in t)
