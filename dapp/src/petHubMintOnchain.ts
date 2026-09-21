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
import { createMasterEditionV3Ix, createMetadataV3Ix, nftUri, publishNftMeta } from "./petHubMeta";

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

export async function mintHubNft(opts: {
  owner: PublicKey;
  label: string;
  paySig: string;
  species?: string;
  source?: "studio" | "breed";
  image?: string;
  wallet?: HubWallet | null;
  signTransaction?: HubSign;
}): Promise<{ mint: string; sig: string; uri: string }> {
  const conn = new Connection(RPC, "confirmed");
  const sponsor = new PublicKey(SPONSOR);
  const mintKp = Keypair.generate();
  const mint = mintKp.publicKey;
  const uri = nftUri(mint.toBase58());
  await publishNftMeta({
    mint: mint.toBase58(),
    name: opts.label.slice(0, 32),
    species: opts.species || opts.label,
    source: opts.source || "studio",
    owner: opts.owner.toBase58(),
    image: opts.image,
  });
  const rent = await getMinimumBalanceForRentExemptMint(conn);
  const ata = await getAssociatedTokenAddress(mint, opts.owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const ixs = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
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
    createMetadataV3Ix({
      mint,
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
      mint,
      updateAuthority: opts.owner,
      mintAuthority: opts.owner,
      payer: sponsor,
    }),
    memoIx("PAWLY|" + opts.label.slice(0, 24) + "|" + opts.paySig.slice(0, 16)),
  ];
  const tx = new VersionedTransaction(new TransactionMessage({
    payerKey: sponsor,
    recentBlockhash: blockhash,
    instructions: ixs,
  }).compileToV0Message());
  tx.sign([mintKp]);
  const signed = await userPartialSign(tx, opts.wallet, opts.signTransaction);
  signed.sign([mintKp]);
  const sig = await sponsorSignedTx(signed, 1);
  return { mint: mint.toBase58(), sig, uri };
}

export const mintStudioToken = mintHubNft;
