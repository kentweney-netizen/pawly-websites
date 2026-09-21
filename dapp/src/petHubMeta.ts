import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
export const NFT_META_BASE = "https://www.pawlypets.online/nft/";
export const NFT_EXTERNAL = "https://www.pawlypets.online/dapp/pet";
export const NFT_SYMBOL = "PHUB";
export const NFT_COLLECTION_NAME = "PAWLY Pet Hub";
export const NFT_IMAGE_FALLBACK = "https://www.pawlypets.online/pawly-token-helps.png";
export const MYTH_IMAGE: Record<string, string> = {
  fox: "https://www.pawlypets.online/dapp/myth/fox.jpg",
  moth: "https://www.pawlypets.online/dapp/myth/moth.jpg",
  wyrm: "https://www.pawlypets.online/dapp/myth/wyrm.jpg",
  boar: "https://www.pawlypets.online/dapp/myth/boar.jpg",
  cat: "https://www.pawlypets.online/dapp/myth/cat.jpg",
  toad: "https://www.pawlypets.online/dapp/myth/toad.jpg",
  lynx: "https://www.pawlypets.online/dapp/myth/lynx.jpg",
  rose: "https://www.pawlypets.online/dapp/myth/rose.jpg",
  dog: "https://www.pawlypets.online/dapp/myth/fox.jpg",
};

const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";

export function metadataPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  )[0];
}

export function editionPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer(), Buffer.from("edition")],
    TOKEN_METADATA_PROGRAM_ID,
  )[0];
}

export function nftUri(mint: string) {
  return NFT_META_BASE + mint + ".json";
}

export function nftImageOf(species?: string, body?: string) {
  const key = String(body || species || "").toLowerCase();
  for (const k of Object.keys(MYTH_IMAGE)) {
    if (key === k || key.indexOf(k) >= 0) return MYTH_IMAGE[k];
  }
  return NFT_IMAGE_FALLBACK;
}

function borshString(s: string) {
  const raw = Buffer.from(s, "utf8");
  const out = Buffer.alloc(4 + raw.length);
  out.writeUInt32LE(raw.length, 0);
  raw.copy(out, 4);
  return out;
}

export function createMetadataV3Ix(opts: {
  mint: PublicKey;
  mintAuthority: PublicKey;
  payer: PublicKey;
  updateAuthority: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints?: number;
  creators: { address: PublicKey; verified: boolean; share: number }[];
}): TransactionInstruction {
  const metadata = metadataPda(opts.mint);
  const creators = opts.creators || [];
  const chunks: Buffer[] = [Buffer.from([33]), borshString(opts.name.slice(0, 32)), borshString(opts.symbol.slice(0, 10)), borshString(opts.uri.slice(0, 200))];
  const fee = Buffer.alloc(2);
  fee.writeUInt16LE(opts.sellerFeeBasisPoints || 0, 0);
  chunks.push(fee);
  if (creators.length) {
    const n = Buffer.alloc(4);
    n.writeUInt32LE(creators.length, 0);
    chunks.push(Buffer.from([1]), n);
    for (const c of creators) {
      chunks.push(Buffer.from(c.address.toBytes()), Buffer.from([c.verified ? 1 : 0, c.share & 255]));
    }
  } else {
    chunks.push(Buffer.from([0]));
  }
  chunks.push(Buffer.from([0, 0, 0, 0]));
  return new TransactionInstruction({
    programId: TOKEN_METADATA_PROGRAM_ID,
    keys: [
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: opts.mint, isSigner: false, isWritable: false },
      { pubkey: opts.mintAuthority, isSigner: true, isWritable: false },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: opts.updateAuthority, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat(chunks),
  });
}

export function createMasterEditionV3Ix(opts: {
  mint: PublicKey;
  updateAuthority: PublicKey;
  mintAuthority: PublicKey;
  payer: PublicKey;
}): TransactionInstruction {
  const data = Buffer.alloc(10);
  data[0] = 17;
  data[1] = 1;
  data.writeBigUInt64LE(0n, 2);
  return new TransactionInstruction({
    programId: TOKEN_METADATA_PROGRAM_ID,
    keys: [
      { pubkey: editionPda(opts.mint), isSigner: false, isWritable: true },
      { pubkey: opts.mint, isSigner: false, isWritable: true },
      { pubkey: opts.updateAuthority, isSigner: true, isWritable: false },
      { pubkey: opts.mintAuthority, isSigner: true, isWritable: false },
      { pubkey: opts.payer, isSigner: true, isWritable: true },
      { pubkey: metadataPda(opts.mint), isSigner: false, isWritable: true },
      { pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export type HubNftMeta = {
  mint: string;
  name: string;
  symbol?: string;
  description?: string;
  image?: string;
  species?: string;
  source?: string;
  owner?: string;
  attributes?: { trait_type: string; value: string }[];
};

export function metaplexJson(row: HubNftMeta) {
  const name = row.name || NFT_COLLECTION_NAME;
  const image = row.image || nftImageOf(row.species);
  return {
    name,
    symbol: row.symbol || NFT_SYMBOL,
    description: row.description || (name + " is a 1/1 PAWLY Pet Hub card. Official site www.pawlypets.online"),
    image,
    external_url: NFT_EXTERNAL,
    animation_url: "",
    seller_fee_basis_points: 0,
    properties: {
      category: "image",
      files: [{ uri: image, type: "image/jpeg" }],
      creators: row.owner ? [{ address: row.owner, share: 100 }] : [],
    },
    attributes: row.attributes || [
      { trait_type: "Collection", value: NFT_COLLECTION_NAME },
      { trait_type: "Species", value: row.species || "studio" },
      { trait_type: "Source", value: row.source || "studio" },
    ],
    collection: { name: NFT_COLLECTION_NAME, family: "PAWLY PETS" },
  };
}

export async function publishNftMeta(row: HubNftMeta) {
  if (!row.mint) return;
  try {
    await fetch(SUPABASE_URL + "/rest/v1/pet_hub_nft_meta", {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        mint: row.mint,
        name: row.name,
        symbol: row.symbol || NFT_SYMBOL,
        description: row.description || "",
        image: row.image || nftImageOf(row.species),
        species: row.species || "",
        source: row.source || "",
        owner: row.owner || "",
        attributes: row.attributes || [],
        updated_at: new Date().toISOString(),
      }),
    });
  } catch { /* URI still has generic fallback */ }
}

export function marketLinks(mint: string) {
  if (!mint) return [];
  return [
    { label: "Solscan", href: "https://solscan.io/token/" + mint },
    { label: "Magic Eden", href: "https://magiceden.io/item-details/" + mint },
    { label: "Tensor", href: "https://www.tensor.trade/item/" + mint },
  ];
}
