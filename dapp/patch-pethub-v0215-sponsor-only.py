#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.14 — Hub USDC/USDT/SOL = dApp Swap then Payment to till.",
    " * PAWLY Pet Hub v0.2.15 — both hops fee payer = hot wallet only; no user-SOL fallback.",
)
OLD_PAY = '''  try {
    const tx = await compile(sponsor);
    if (typeof opts.signTransaction !== "function") throw new Error("Wallet cannot sign / 钱包无法签名");
    const signed = await opts.signTransaction(tx);
    const sig = await postSponsor(signed, 1);
    await assertOnchainSuccess(conn, sig);
    return sig;
  } catch {
    const tx = await compile(opts.from);
    const sig = await opts.sendTransaction(tx, conn);
    await assertOnchainSuccess(conn, sig);
    return sig;
  }'''
NEW_PAY = '''  if (typeof opts.signTransaction !== "function") throw new Error("Wallet cannot sign / 钱包无法签名");
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { blockhash: bh } = await conn.getLatestBlockhash();
      const ixs = await ixsFor(sponsor);
      const tx = new VersionedTransaction(
        new TransactionMessage({ payerKey: sponsor, recentBlockhash: bh, instructions: ixs }).compileToV0Message()
      );
      const signed = await opts.signTransaction(tx);
      const sig = await postSponsor(signed, 1);
      await assertOnchainSuccess(conn, sig);
      return sig;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || "Sponsor pay failed / 代付失败"));'''
if OLD_PAY not in t:
    if "Sponsor pay failed" not in t:
        raise SystemExit("payHub catch block missing")
else:
    t = t.replace(OLD_PAY, NEW_PAY, 1)
t = t.replace("  const { blockhash } = await conn.getLatestBlockhash();\n  const ixsFor = async (ataPayer: PublicKey) => {", "  const ixsFor = async (ataPayer: PublicKey) => {", 1)
OLD_COMP = '''  const compile = async (payerKey: PublicKey) => {
    const ixs = await ixsFor(payerKey);
    const msg = new TransactionMessage({ payerKey, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message();
    return new VersionedTransaction(msg);
  };\n'''
t = t.replace(OLD_COMP, "")
OLD_SW = '''      const key = lookups[i] && lookups[i].accountKey;
      if (!key) continue;
      let acc: { value: AddressLookupTableAccount | null } = { value: null };
      try { acc = await opts.conn.getAddressLookupTable(key); } catch { acc = { value: null }; }'''
NEW_SW = '''      const rawKey = lookups[i] && lookups[i].accountKey;
      if (!rawKey) continue;
      let key: PublicKey;
      try { key = rawKey instanceof PublicKey ? rawKey : new PublicKey(String(rawKey)); } catch { continue; }
      let acc: { value: AddressLookupTableAccount | null } = { value: null };
      try { acc = await opts.conn.getAddressLookupTable(key); } catch { acc = { value: null }; }'''
if OLD_SW in t:
    t = t.replace(OLD_SW, NEW_SW, 1)
OLD_FB = '''  if (typeof opts.signTransaction === "function") {
    try {
      return await sponsorize();
    } catch (e1) {
      try {
        return await opts.sendTransaction(opts.tx, opts.conn);
      } catch (e2) {
        try {
          const signed = await opts.signTransaction(opts.tx);
          return await opts.conn.sendRawTransaction(signed.serialize(), { maxRetries: 4 });
        } catch {
          throw e1;
        }
      }
    }
  }
  return await opts.sendTransaction(opts.tx, opts.conn);'''
NEW_FB = '''  if (typeof opts.signTransaction !== "function") {
    throw new Error("Wallet cannot sign / 钱包无法签名");
  }
  return await sponsorize();'''
if OLD_FB in t:
    t = t.replace(OLD_FB, NEW_FB, 1)
OLD_P2 = '''    if (r.ok && d.signature) sig = String(d.signature);
    else if (d.error) throw new Error(String(d.error));
  }
  if (!sig) sig = await opts.sendTransaction(tx, conn);'''
NEW_P2 = '''    if (r.ok && d.signature) sig = String(d.signature);
    else throw new Error(String(d.error || ("Sponsor HTTP " + r.status)));
  }
  if (!sig) throw new Error("Sponsor pay failed / 代付失败");'''
if OLD_P2 in t:
    t = t.replace(OLD_P2, NEW_P2, 1)
p.write_text(t)
print(t.splitlines()[1])
print("compile(opts.from)", "compile(opts.from)" in t)
print("sendTx fallback", "return await opts.sendTransaction(opts.tx" in t)
