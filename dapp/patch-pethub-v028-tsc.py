#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
old1 = 'new TransactionInstruction({ programId: TOKEN_PROGRAM_ID, keys: [{ pubkey: wsolAta, isSigner: false, isWritable: true }], data: Uint8Array.from([17]) }),'
new1 = 'new TransactionInstruction({ programId: TOKEN_PROGRAM_ID, keys: [{ pubkey: wsolAta, isSigner: false, isWritable: true }], data: Buffer.from([17]) }),'
if old1 not in t:
    raise SystemExit("ix data line missing")
t = t.replace(old1, new1, 1)
old2 = 'push(pack); push(pack && pack.data); if (Array.isArray(pack && pack.transactions)) pack.transactions.forEach(push);'
new2 = 'push(pack); push(pack && pack.data); const moreTx = pack.transactions; if (Array.isArray(moreTx)) moreTx.forEach(push);'
if old2 not in t:
    raise SystemExit("pack.transactions line missing")
t = t.replace(old2, new2, 1)
p.write_text(t)
print("ok buffer", "data: Buffer.from([17])" in t)
print("ok moreTx", "const moreTx = pack.transactions" in t)
