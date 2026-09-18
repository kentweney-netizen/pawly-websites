import type React from "react";
/**
 * PAWLY Pet Hub pay — dual-sign + 12s sponsor cap. Signature = done; never re-pay after sig.
 * Fee payer always hot wallet BPFiVa5. No user-SOL fallback.
 * USDC/USDT/SOL: market swap to PAWLY (official pool route), then PAWLY to till.
 */
import { AddressLookupTableAccount, ComputeBudgetProgram, Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
export { quoteRaydiumOut, quoteHubSwap, fetchHubPx, HUB_POOL } from "./petHubQuote";
export type { HubPx } from "./petHubQuote";
export const PET_SLOT_CAP = 10;
export const FEED_DAY_MAX = 3;
export function sgDay() { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }); }
export function feedsTodayOf(p?: { feedDay?: string; feedsToday?: number } | null) {
  if (!p) return 0;
  return String(p.feedDay || "") === sgDay() ? Number(p.feedsToday || 0) : 0;
}
export function pickFeedPet(list: PetRec[], id?: string) { return list.find((x) => x.id === id) || list[0]; }
const STORE = "pawly_pet_hub_v1_";
const EMAIL_KEY = "pawly_pet_hub_email_v1";
const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
export type PayCoin = "PAWLY" | "USDC" | "USDT" | "SOL";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const OFFICIAL_POOL = "6n8wjFK3mLxrw25q2k6oejt8oYupzWoBPdZqrcHDVwJ";
const SHOP_TILL = "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3VR4C7Z";
const RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
const SPONSOR = SHOP_TILL;
export type SceneId = "street" | "hospital" | "shelter" | "shop" | "hotel" | "groom" | "park";
export type PetRec = { id: string; kind: string; species: string; name: string; emoji: string; hunger: number; health: number; streak: number; pricePawly?: number; sig?: string; feedsTotal?: number; feedsToday?: number; feedDay?: string; level?: number };
export type CartKind = "adopt" | "rescue" | "service" | "food";
export type CertJob = { title: string; amount: number; kind: CartKind; species?: string; emoji?: string; sig: string; certPng?: string; photoPng?: string };
export type CartItem = { title: string; amount: number; kind: CartKind; species?: string; emoji?: string; petId?: string };
