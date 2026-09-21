import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from "@solana/spl-token";
import { sponsorSignedTx } from "./petHubSend";
import type { HubSign, HubWallet } from "./petHubSend";
import {
  createMasterEditionV3Ix,
  createMetadataV3Ix,
  metadataPda,
  nftImageOf,
  nftUri,
  publishNftMeta,
} from "./petHubMeta";

const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SPONSOR = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function memoIx(text: string) {
  return new TransactionInstruction({
    programId: MEMO,
    keys: [],
    data: Buffer.from(text.slice(0, 120), "utf8"),
  });
}

function openConn() {
  return new Connection(RPC, "confirmed");
}

export async function mintAccountLive(mint: string): Promise<boolean> {
  if (!mint) return false;
  try {
    const info = await openConn().getAccountInfo(new PublicKey(mint), "confirmed");
    return !!(info && info.data && info.data.length >= MINT_SIZE);
  } catch {
    return false;
  }
}

export async function metadataAccountLive(mint: string): Promise<boolean> {
  if (!mint) return false;
  try {
    const info = await openConn().getAccountInfo(metadataPda(new PublicKey(mint)), "confirmed");
    return !!(info && info.data && info.data.length > 10);
  } catch {
    return false;
  }
}

export async function findOwnedZeroDec(owner: PublicKey): Promise<string[]> {
  try {
    const res = await openConn().getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }, "confirmed");
    const out: string[] = [];
    for (const row of res.value || []) {
      const info = row.account.data.parsed && row.account.data.parsed.info;
      if (!info) continue;
      const amt = info.tokenAmount || {};
      if (Number(amt.decimals) === 0 && Number(amt.uiAmount || 0) === 1 && info.mint) out.push(String(info.mint));
    }
    return out;
  } catch {
    return [];
  }
}

function keyList(tx: { transaction?: { message?: { accountKeys?: unknown } } }) {
  const raw = tx.transaction && tx.transaction.message && tx.transaction.message.accountKeys;
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((a) => (typeof a === "string" ? a : String((a as { pubkey?: string }).pubkey || a)));
}

async function assertPaidTill(conn: Connection, owner: PublicKey, paySig: string) {
  if (!paySig || paySig.length < 32) throw new Error("Need the 80 PAWLY payment signature first");
  const tx = await conn.getParsedTransaction(paySig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
  if (!tx) throw new Error("Payment signature not found on-chain");
  if (tx.meta && tx.meta.err) throw new Error("Payment signature failed on-chain");
  const keys = keyList(tx as never);
  if (keys.indexOf(owner.toBase58()) < 0) throw new Error("Payment is not from this wallet");
  if (keys.indexOf(SPONSOR) < 0) throw new Error("Payment did not go to Pet Hub till");
}

async function sendSponsorOnly(opts: {
  conn: Connection;
  sponsor: PublicKey;
  ixs: TransactionInstruction[];
  extra?: Keypair[];
}): Promise<string> {
  const { blockhash } = await opts.conn.getLatestBlockhash("confirmed");
  const tx = new VersionedTransaction(new TransactionMessage({
    payerKey: opts.sponsor,
    recentBlockhash: blockhash,
    instructions: opts.ixs,
  }).compileToV0Message());
  if (opts.extra && opts.extra.length) tx.sign(opts.extra);
  return sponsorSignedTx(tx, 1);
}

export async function attachHubMetadata(opts: {
  owner: PublicKey;
  mint: PublicKey;
  label: string;
  species?: string;
  source?: string;
  image?: string;
  wallet?: HubWallet | null;
  signTransaction?: HubSign;
}): Promise<string> {
  const conn = openConn();
  const sponsor = new PublicKey(SPONSOR);
  const uri = nftUri(opts.mint.toBase58());
  const metaIx = createMetadataV3Ix({
    mint: opts.mint,
    mintAuthority: sponsor,
    payer: sponsor,
    updateAuthority: sponsor,
    name: opts.label.slice(0, 32),
    symbol: "PHUB",
    uri,
    sellerFeeBasisPoints: 0,
    creators: [{ address: opts.owner, verified: false, share: 100 }],
  });
  const sig = await sendSponsorOnly({
    conn,
    sponsor,
    ixs: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 250000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
      metaIx,
    ],
  });
  try {
    await sendSponsorOnly({
      conn,
      sponsor,
      ixs: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 250000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
        createMasterEditionV3Ix({
          mint: opts.mint,
          updateAuthority: sponsor,
          mintAuthority: sponsor,
          payer: sponsor,
        }),
      ],
    });
  } catch { /* metadata name is enough for Solscan / most indexes */ }
  return sig;
}

async function publishAndAttach(opts: {
  owner: PublicKey;
  mint: PublicKey;
  label: string;
  species?: string;
  source?: string;
  image?: string;
}) {
  await publishNftMeta({
    mint: opts.mint.toBase58(),
    name: opts.label.slice(0, 32),
    species: opts.species || opts.label,
    source: opts.source || "studio",
    owner: opts.owner.toBase58(),
    image: opts.image || nftImageOf(opts.species, opts.label),
  });
  if (await metadataAccountLive(opts.mint.toBase58())) return "";
  return attachHubMetadata(opts);
}

export async function mintHubNft(opts: {
  owner: PublicKey;
  label: string;
  paySig: string;
  species?: string;
  source?: "studio" | "breed";
  image?: string;
  wallet?: HubWallet | null;
  signTransaction?: HubSign;
}): Promise<{ mint: string; sig: string; uri: string; metaSig?: string }> {
  const conn = openConn();
  const sponsor = new PublicKey(SPONSOR);
  await assertPaidTill(conn, opts.owner, opts.paySig);

  const owned = await findOwnedZeroDec(opts.owner);
  for (const existing of owned) {
    const live = await mintAccountLive(existing);
    if (!live) continue;
    const mint = new PublicKey(existing);
    let metaSig = "";
    try {
      metaSig = await publishAndAttach({
        owner: opts.owner,
        mint,
        label: opts.label,
        species: opts.species,
        source: opts.source,
        image: opts.image,
      });
    } catch (e) {
      const msg = String((e as { message?: string }).message || e);
      throw Object.assign(new Error("Mint live " + existing + ". Metadata later: " + msg), {
        mint: existing,
        sig: opts.paySig,
        uri: nftUri(existing),
      });
    }
    return { mint: existing, sig: opts.paySig, uri: nftUri(existing), metaSig };
  }

  const mintKp = Keypair.generate();
  const mint = mintKp.publicKey;
  const rent = await getMinimumBalanceForRentExemptMint(conn);
  const ata = await getAssociatedTokenAddress(mint, opts.owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const baseIxs = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
    SystemProgram.createAccount({
      fromPubkey: sponsor,
      newAccountPubkey: mint,
      lamports: rent,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mint, 0, sponsor, null, TOKEN_PROGRAM_ID),
    createAssociatedTokenAccountIdempotentInstruction(sponsor, ata, opts.owner, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createMintToInstruction(mint, ata, sponsor, 1, [], TOKEN_PROGRAM_ID),
    memoIx("PAWLY|" + opts.label.slice(0, 24) + "|" + opts.paySig.slice(0, 16)),
  ];
  const sig = await sendSponsorOnly({ conn, sponsor, ixs: baseIxs, extra: [mintKp] });
  const live = await mintAccountLive(mint.toBase58());
  if (!live) throw new Error("Mint did not land on-chain / 铸币未上链");
  const uri = nftUri(mint.toBase58());
  let metaSig = "";
  try {
    metaSig = await publishAndAttach({
      owner: opts.owner,
      mint,
      label: opts.label,
      species: opts.species,
      source: opts.source,
      image: opts.image,
    });
  } catch (e) {
    const msg = String((e as { message?: string }).message || e);
    throw Object.assign(new Error("Mint live " + mint.toBase58() + ". Metadata later: " + msg), {
      mint: mint.toBase58(),
      sig,
      uri,
    });
  }
  return { mint: mint.toBase58(), sig, uri, metaSig };
}

export const mintStudioToken = mintHubNft;
