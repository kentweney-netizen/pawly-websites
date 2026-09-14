#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.10 — extract Raydium data[] txs; SOL wrapSol no prewrap.",
    " * PAWLY Pet Hub v0.2.11 — swap preflight + sponsor fee-payer fallback + longer confirm.",
)
t = t.replace(
    "  TransactionInstruction,\n  LAMPORTS_PER_SOL,\n} from \"@solana/web3.js\";",
    "  TransactionInstruction,\n  AddressLookupTableAccount,\n  LAMPORTS_PER_SOL,\n} from \"@solana/web3.js\";",
)
OLD_ASSERT = '''async function assertOnchainSuccess(conn: Connection, sig: string) {
  const s = String(sig || "").trim();
  if (s.length < 64) throw new Error("No on-chain signature / 没有链上签名");
  let last = "";
  for (let i = 0; i < 10; i++) {
    const res = await conn.getSignatureStatuses([s], { searchTransactionHistory: true });
    const st = res?.value?.[0];
    if (st) {
      if (st.err) throw new Error("Transaction failed on-chain / 链上失败");
      if (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized") return;
    }
    last = st ? String(st.confirmationStatus || "") : "pending";
    await new Promise((r) => setTimeout(r, 700));
  }
  const tx = await conn.getTransaction(s, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (tx?.meta?.err) throw new Error("Transaction failed on-chain / 链上失败");
  if (!tx) throw new Error("Signature not confirmed / 签名未上链 " + last);
}'''
NEW_ASSERT = '''async function assertOnchainSuccess(conn: Connection, sig: string) {
  const s = String(sig || "").trim();
  if (s.length < 64) throw new Error("No on-chain signature / 没有链上签名");
  let last = "";
  for (let i = 0; i < 24; i++) {
    const res = await conn.getSignatureStatuses([s], { searchTransactionHistory: true });
    const st = res?.value?.[0];
    if (st) {
      if (st.err) throw new Error("Transaction failed on-chain / 链上失败");
      if (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized" || st.confirmationStatus === "processed") {
        if (st.confirmationStatus !== "processed") return;
        last = "processed";
      } else last = String(st.confirmationStatus || "");
    } else last = "pending";
    await new Promise((r) => setTimeout(r, 900));
  }
  let tx = await conn.getTransaction(s, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx) tx = await conn.getTransaction(s, { commitment: "processed", maxSupportedTransactionVersion: 0 } as never);
  if (tx?.meta?.err) throw new Error("Transaction failed on-chain / 链上失败");
  if (!tx && last !== "processed") throw new Error("Signature not confirmed / 签名未上链 " + last);
}

async function sendHubSwapTx(opts: {
  conn: Connection;
  tx: VersionedTransaction;
  sendTransaction: (tx: VersionedTransaction, conn: Connection) => Promise<string>;
  signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}) {
  const tryUser = async () => {
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
  }
}'''
if OLD_ASSERT not in t:
    raise SystemExit("assert block missing")
t = t.replace(OLD_ASSERT, NEW_ASSERT, 1)
OLD_SEND = '''  const tx = VersionedTransaction.deserialize(b64ToBytes(bag[0]));
  let sig = "";
  if (typeof opts.signTransaction === "function") {
    const signed = await opts.signTransaction(tx);
    try {
      sig = await opts.conn.sendRawTransaction(signed.serialize(), { skipPreflight: true, maxRetries: 3 });
    } catch {
      sig = await opts.sendTransaction(signed, opts.conn);
    }
  } else {
    sig = await opts.sendTransaction(tx, opts.conn);
  }
  await assertOnchainSuccess(opts.conn, sig);'''
NEW_SEND = '''  const tx = VersionedTransaction.deserialize(b64ToBytes(bag[0]));
  const sig = await sendHubSwapTx({
    conn: opts.conn,
    tx,
    sendTransaction: opts.sendTransaction,
    signTransaction: opts.signTransaction,
  });
  await assertOnchainSuccess(opts.conn, sig);'''
if OLD_SEND not in t:
    raise SystemExit("send block missing")
t = t.replace(OLD_SEND, NEW_SEND, 1)
p.write_text(t)
print("ok", t.splitlines()[1])
print("sendHub", "sendHubSwapTx" in t)
print("no skip true", "skipPreflight: true" not in t.split("async function swapCoinToTillPawly")[1][:2500] if "async function swapCoinToTillPawly" in t else "?")
