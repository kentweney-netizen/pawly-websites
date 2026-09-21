import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
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

const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SPONSOR = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function memoIx(text: string) {
  return new TransactionInstruction({
    programId: MEMO,
    keys: [],
    data: new TextEncoder().encode(text.slice(0, 120)),
  });
}

export async function mintStudioToken(opts: {
  owner: PublicKey;
  label: string;
  paySig: string;
  wallet?: HubWallet | null;
  signTransaction?: HubSign;
}): Promise<{ mint: string; sig: string }> {
  const conn = new Connection(RPC, "confirmed");
  const sponsor = new PublicKey(SPONSOR);
  const mintKp = Keypair.generate();
  const rent = await conn.getMinimumBalanceForRentExemptMint();
  const ata = await getAssociatedTokenAddress(mintKp.publicKey, opts.owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const ixs = [
    SystemProgram.createAccount({
      fromPubkey: sponsor,
      newAccountPubkey: mintKp.publicKey,
      lamports: rent || await getMinimumBalanceForRentExemptMint(conn),
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mintKp.publicKey, 0, opts.owner, null, TOKEN_PROGRAM_ID),
    createAssociatedTokenAccountIdempotentInstruction(sponsor, ata, opts.owner, mintKp.publicKey, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createMintToInstruction(mintKp.publicKey, ata, opts.owner, 1, [], TOKEN_PROGRAM_ID),
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
  return { mint: mintKp.publicKey.toBase58(), sig };
}
