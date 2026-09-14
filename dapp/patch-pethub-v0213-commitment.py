#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.2.12 — Hub swap sponsor-first like Payment (local key silent).",
    " * PAWLY Pet Hub v0.2.13 — do not re-pass confirmed; Connection already confirmed.",
)
n = t.count('getLatestBlockhash("confirmed")')
t = t.replace('getLatestBlockhash("confirmed")', 'getLatestBlockhash()')
t = t.replace('getAccountInfo(ata, "confirmed")', 'getAccountInfo(ata)')
t = t.replace(
    'getTransaction(s, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })',
    'getTransaction(s, { maxSupportedTransactionVersion: 0 })',
)
t = t.replace(
    'getTransaction(s, { commitment: "processed", maxSupportedTransactionVersion: 0 } as never)',
    'getTransaction(s, { maxSupportedTransactionVersion: 0 })',
)
old = 'const acc = await opts.conn.getAddressLookupTable(key);'
new = 'let acc: { value: AddressLookupTableAccount | null } = { value: null };\n      try { acc = await opts.conn.getAddressLookupTable(key); } catch { acc = { value: null }; }'
if old in t:
    t = t.replace(old, new, 1)
p.write_text(t)
print("replaced blockhash", n)
print("left confirmed blockhash", t.count('getLatestBlockhash("confirmed")'))
print("header", t.splitlines()[1])
