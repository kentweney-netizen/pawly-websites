#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.11 — swap preflight + sponsor fee-payer fallback + longer confirm.",
    " * PAWLY Pet Hub v0.2.12 — Hub swap sponsor-first like Payment (local key silent).",
)
OLD = '''  const tryUser = async () => {
    if (typeof opts.signTransaction === "function") {
      const signed = await opts.signTransaction(opts.tx);
      return await opts.conn.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 4,
      });
    }
    return await opts.sendTransaction(opts.tx, opts.conn);
  };
  try {
    return await tryUser();
  } catch (e1) {
    if (typeof opts.signTransaction !== "function") throw e1;
    const sponsor = new PublicKey(SPONSOR);
    const lookups = ((opts.tx.message as { addressTableLookups?: { accountKey?: PublicKey }[] }).addressTableLookups) || [];
    const alts: AddressLookupTableAccount[] = [];
    for (let i = 0; i < lookups.length; i++) {
      const key = lookups[i] && lookups[i].accountKey;
      if (!key) continue;
      const acc = await opts.conn.getAddressLookupTable(key);
      if (acc.value) alts.push(acc.value);
    }
    let ixs;
    try {
      ixs = TransactionMessage.decompile(opts.tx.message, { addressLookupTableAccounts: alts }).instructions;
    } catch {
      throw e1;
    }
    const { blockhash } = await opts.conn.getLatestBlockhash("confirmed");
    const vtx = new VersionedTransaction(
      new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(alts)
    );
    const signed = await opts.signTransaction(vtx);
    return await postSponsor(signed, 1);
  }'''
NEW = '''  const sponsorize = async () => {
    if (typeof opts.signTransaction !== "function") throw new Error("no signer");
    const sponsor = new PublicKey(SPONSOR);
    const lookups = ((opts.tx.message as { addressTableLookups?: { accountKey?: PublicKey }[] }).addressTableLookups) || [];
    const alts: AddressLookupTableAccount[] = [];
    for (let i = 0; i < lookups.length; i++) {
      const key = lookups[i] && lookups[i].accountKey;
      if (!key) continue;
      const acc = await opts.conn.getAddressLookupTable(key);
      if (acc.value) alts.push(acc.value);
    }
    const ixs = TransactionMessage.decompile(opts.tx.message, { addressLookupTableAccounts: alts }).instructions;
    const { blockhash } = await opts.conn.getLatestBlockhash("confirmed");
    const vtx = new VersionedTransaction(
      new TransactionMessage({ payerKey: sponsor, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(alts)
    );
    const signed = await opts.signTransaction(vtx);
    return await postSponsor(signed, 1);
  };
  if (typeof opts.signTransaction === "function") {
    try {
      return await sponsorize();
    } catch (e1) {
      try {
        const signed = await opts.signTransaction(opts.tx);
        return await opts.conn.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 4,
        });
      } catch {
        throw e1;
      }
    }
  }
  return await opts.sendTransaction(opts.tx, opts.conn);'''
if OLD not in t:
    raise SystemExit("sendHub body missing")
t = t.replace(OLD, NEW, 1)
p.write_text(t)
print("ok", t.splitlines()[1])
print("sponsorize", "const sponsorize" in t)
