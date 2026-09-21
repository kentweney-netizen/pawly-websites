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
import { userPartialSign, sponsorSignedTx } from "./petHubSend";
import type { HubSign, HubWallet } from "./petHubSend";
import { createMasterEditionV3Ix, createMetadataV3Ix, nftImageOf, nftUri, publishNftMeta } from "./petHubMeta";

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

async function sendSponsored(opts: {
  conn: Connection;
  sponsor: PublicKey;
  ixs: TransactionInstruction[];
  extra?: Keypair[];
  wallet?: HubWallet | null;
  signTransaction?: HubSign;
}): Promise<string> {
  const { blockhash } = await opts.conn.getLatestBlockhash("confirmed");
  const tx = new VersionedTransaction(new TransactionMessage({
    payerKey: opts.sponsor,
    recentBlockhash: blockhash,
    instructions: opts.ixs,
  }).compileToV0Message());
  const extra = opts.extra || [];
  if (extra.length) tx.sign(extra);
  const signed = await userPartialSign(tx, opts.wallet, opts.signTransaction);
  if (extra.length) signed.sign(extra);
  return sponsorSignedTx(signed, 1);
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
  const ixs = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
    createMetadataV3Ix({
      mint: opts.mint,
      mintAuthority: opts.owner,
      payer: sponsor,
      updateAuthority: opts.owner,
      name: opts.label.slice(0, 32),
      symbol: "PHUB",
      uri,
      sellerFeeBasisPoints: 0,
      creators: [{ address: opts.owner, verified: true, share: 100 }],
    }),
    createMasterEditionV3Ix({
      mint: opts.mint,
      updateAuthority: opts.owner,
      mintAuthority: opts.owner,
      payer: sponsor,
    }),
  ];
  return sendSponsored({ conn, sponsor, ixs, wallet: opts.wallet, signTransaction: opts.signTransaction });
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
    createInitializeMintInstruction(mint, 0, opts.owner, null, TOKEN_PROGRAM_ID),
    createAssociatedTokenAccountIdempotentInstruction(sponsor, ata, opts.owner, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createMintToInstruction(mint, ata, opts.owner, 1, [], TOKEN_PROGRAM_ID),
    memoIx("PAWLY|" + opts.label.slice(0, 24) + "|" + opts.paySig.slice(0, 16)),
  ];
  const sig = await sendSponsored({
    conn,
    sponsor,
    ixs: baseIxs,
    extra: [mintKp],
    wallet: opts.wallet,
    signTransaction: opts.signTransaction,
  });
  const live = await mintAccountLive(mint.toBase58());
  if (!live) throw new Error("Mint did not land on-chain / 铸币未上链");
  const uri = nftUri(mint.toBase58());
  await publishNftMeta({
    mint: mint.toBase58(),
    name: opts.label.slice(0, 32),
    species: opts.species || opts.label,
    source: opts.source || "studio",
    owner: opts.owner.toBase58(),
    image: opts.image || nftImageOf(opts.species, opts.label),
  });
  let metaSig = "";
  try {
    metaSig = await attachHubMetadata({
      owner: opts.owner,
      mint,
      label: opts.label,
      species: opts.species,
      source: opts.source,
      image: opts.image,
      wallet: opts.wallet,
      signTransaction: opts.signTransaction,
    });
  } catch (e) {
    const msg = String((e as { message?: string }).message || e);
    throw Object.assign(new Error("Mint live. Metadata needs one more sign: " + msg), {
      mint: mint.toBase58(),
      sig,
      uri,
    });
  }
  return { mint: mint.toBase58(), sig, uri, metaSig };
}

export const mintStudioToken = mintHubNft;
