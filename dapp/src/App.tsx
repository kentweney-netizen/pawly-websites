// @ts-nocheck
/**
 * PAWLY DApp — 31.07.2026 v7.1.4（Swap 询价+执行纯 Jupiter 加强版）
 * v7 + 本次：
 *   1. Swap 双路由：Jupiter（主）+ Raydium（备），实时市价
 *   2. 买入/入金 On-ramp：MoonPay + Transak 生产环境（SOL/USDC）
 *   3. 支付·转账真实链上 + 汇率保留
 */
import { useState, useEffect, useCallback, createContext, useContext } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { PrivyProvider } from "@privy-io/react-auth";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TrustWalletAdapter,
  CoinbaseWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  SolanaMobileWalletAdapter,
  createDefaultAuthorizationResultCache,
  createDefaultAddressSelector,
  createDefaultWalletNotFoundHandler,
} from "@solana-mobile/wallet-adapter-mobile";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  VersionedTransaction,
  LAMPORTS_PER_SOL as WEB3_LAMPORTS,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { createClient } from "@supabase/supabase-js";
import WalletConnect from "./components/WalletConnect";
import ExportPawlyWallet from "./components/ExportPawlyWallet";
import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint = clusterApiUrl("mainnet-beta");

const wallets = [
  new SolanaMobileWalletAdapter({
    addressSelector: createDefaultAddressSelector(),
    appIdentity: {
      name: "PAWLY DApp",
      uri: "https://pawlypets.netlify.app",
      icon: "/pawly-token-helps.png",
    },
    authorizationResultCache: createDefaultAuthorizationResultCache(),
    cluster: WalletAdapterNetwork.Mainnet,
    onWalletNotFound: createDefaultWalletNotFoundHandler(),
  }),
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new TrustWalletAdapter(),
  new CoinbaseWalletAdapter(),
];

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "";
const PAWLY_DAPP_USER_KEY = "pawly_dapp_user_v1";

/* ========== Token / CA 配置（上线后只改这里） ========== */
const PAWLY_MINT = null; // TODO: 创建后填入 PAWLY Token CA
const PAWLY_DECIMALS = 9;
const PAWLY_PER_USDC = 5; // 临时比例，池子上线后改用链上报价
const TOKEN_MINTS = {
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  SOL: "So11111111111111111111111111111111111111112",
  PAWLY: PAWLY_MINT,
};
const TOKEN_DECIMALS = { SOL: 9, USDC: 6, USDT: 6, PAWLY: PAWLY_DECIMALS };
const HELIUS_RPC_GLOBAL =
  "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const LAMPORTS_PER_SOL = 1e9;
const BASE_FEE_LAMPORTS = 5000;

/** 读取钱包某代币余额（主网，有地址即可） */
async function fetchTokenBalance(owner, token) {
  if (!owner) return 0;
  try {
    const pubkey =
      typeof owner === "string"
        ? new PublicKey(owner)
        : owner instanceof PublicKey
          ? owner
          : new PublicKey(owner.toString());
    const connection = new Connection(HELIUS_RPC_GLOBAL, "confirmed");
    if (token === "SOL") {
      const lamports = await connection.getBalance(pubkey);
      return lamports / LAMPORTS_PER_SOL;
    }
    const mintStr = TOKEN_MINTS[token];
    if (!mintStr) return 0;
    const mint = new PublicKey(mintStr);
    const accounts = await connection.getParsedTokenAccountsByOwner(pubkey, { mint });
    return accounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount || 0;
  } catch (_) {
    return 0;
  }
}

function fmtBal(n, digits = 4) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n === 0) return "0";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return Number(n).toFixed(digits).replace(/\.?0+$/, (m) => (m.includes(".") ? m.replace(/0+$/, "").replace(/\.$/, "") : m));
}

function toRawAmount(uiAmount, token) {
  const d = TOKEN_DECIMALS[token] ?? 9;
  const n = Number(uiAmount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * Math.pow(10, d));
}

function getConnection() {
  return new Connection(HELIUS_RPC_GLOBAL, "confirmed");
}

/** 真实 SOL / SPL 转账（需已连接可签名钱包） */
async function sendTokenTransfer({ publicKey, sendTransaction, token, toAddress, uiAmount }) {
  if (!publicKey || !sendTransaction) throw new Error("Wallet not connected");
  let toPubkey;
  try {
    toPubkey = new PublicKey(toAddress.trim());
  } catch {
    throw new Error("Invalid recipient address / 收款地址无效");
  }
  const raw = toRawAmount(uiAmount, token);
  if (raw == null || raw <= 0) throw new Error("Invalid amount / 数量无效");

  const connection = getConnection();
  const tx = new Transaction();

  if (token === "SOL") {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey,
        lamports: raw,
      })
    );
  } else {
    const mintStr = TOKEN_MINTS[token];
    if (!mintStr) throw new Error(`${token} mint not available`);
    const mint = new PublicKey(mintStr);
    const fromAta = await getAssociatedTokenAddress(mint, publicKey);
    const toAta = await getAssociatedTokenAddress(mint, toPubkey);

    // ensure sender ATA has balance path exists
    try {
      await getAccount(connection, fromAta);
    } catch {
      throw new Error(`No ${token} token account / 没有 ${token} 代币账户`);
    }

    let needCreate = false;
    try {
      await getAccount(connection, toAta);
    } catch {
      needCreate = true;
    }
    if (needCreate) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          publicKey,
          toAta,
          toPubkey,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }
    tx.add(
      createTransferInstruction(
        fromAta,
        toAta,
        publicKey,
        raw,
        [],
        TOKEN_PROGRAM_ID
      )
    );
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = publicKey;

  const sig = await sendTransaction(tx, connection, { skipPreflight: false });
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  return sig;
}

/** Jupiter v6：SOL/USDC/USDT 真实兑换报价 */
/** Jupiter 单次报价 */
async function jupiterQuoteOnce(fromToken, toToken, uiAmount, slippageBps = 100) {
  const inMint = TOKEN_MINTS[fromToken];
  const outMint = TOKEN_MINTS[toToken];
  if (!inMint || !outMint) throw new Error("Unsupported pair");
  const raw = toRawAmount(uiAmount, fromToken);
  if (raw == null) throw new Error("Invalid amount");
  const qs =
    `inputMint=${inMint}&outputMint=${outMint}&amount=${raw}&slippageBps=${slippageBps}`;
  const urls = [
    `https://quote-api.jup.ag/v6/quote?${qs}`,
    `https://lite-api.jup.ag/swap/v1/quote?${qs}`,
  ];
  const tryUrl = async (url) => {
    const r = await fetchWithTimeout(url, 15000);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (data?.error || !data?.outAmount) throw new Error(data?.error || "no outAmount");
    const outUi = Number(data.outAmount) / Math.pow(10, TOKEN_DECIMALS[toToken] || 6);
    return {
      source: "Jupiter",
      slippageBps,
      outAmount: data.outAmount,
      outUi,
      inAmount: data.inAmount,
      priceImpactPct: data.priceImpactPct,
      raw: data,
    };
  };
  return await new Promise((resolve, reject) => {
    let pending = urls.length;
    let lastErr = "Jupiter no route";
    let done = false;
    urls.forEach((url) => {
      tryUrl(url)
        .then((q) => {
          if (!done) {
            done = true;
            resolve(q);
          }
        })
        .catch((e) => {
          lastErr = e?.message || String(e);
          pending -= 1;
          if (pending === 0 && !done) reject(new Error(lastErr));
        });
    });
  });
}

async function raydiumQuoteOnce(fromToken, toToken, uiAmount, slippageBps = 100) {
  const inMint = TOKEN_MINTS[fromToken];
  const outMint = TOKEN_MINTS[toToken];
  if (!inMint || !outMint) throw new Error("Unsupported pair");
  const raw = toRawAmount(uiAmount, fromToken);
  if (raw == null) throw new Error("Invalid amount");
  const url =
    `https://transaction-v1.raydium.io/compute/swap-base-in` +
    `?inputMint=${inMint}&outputMint=${outMint}&amount=${raw}` +
    `&slippageBps=${slippageBps}&txVersion=V0`;
  const r = await fetchWithTimeout(url, 12000);
  if (!r.ok) throw new Error(`Raydium quote failed (${r.status})`);
  const data = await r.json();
  if (data?.success === false || !data?.data) {
    throw new Error(data?.msg || data?.message || "Raydium no route");
  }
  const d = data.data;
  const outAmt = d.outputAmount || d.otherAmountThreshold || d.amountOut;
  if (!outAmt) throw new Error("Raydium empty outAmount");
  const outUi = Number(outAmt) / Math.pow(10, TOKEN_DECIMALS[toToken] || 6);
  return {
    source: "Raydium",
    slippageBps,
    outAmount: String(outAmt),
    outUi,
    inAmount: String(raw),
    priceImpactPct: d.priceImpactPct ?? d.priceImpact,
    raw: d,
  };
}

/**
 * 双路由实时报价：Jupiter 主 → Raydium 备 → Jupiter 宽滑点再试
 * 返回最优 outUi，并带上可执行 raw
 */
async function getBestSwapQuote(fromToken, toToken, uiAmount) {
  const errors = [];
  for (const slip of [50, 100, 150, 300]) {
    try {
      const q = await jupiterQuoteOnce(fromToken, toToken, uiAmount, slip);
      q.source = slip <= 100 ? "Jupiter" : `Jupiter (${(slip / 100).toFixed(1)}% slip)`;
      return q;
    } catch (e) {
      errors.push(`@${slip}bps: ${e?.message || e}`);
    }
  }
  throw new Error(
    "Jupiter 报价暂时不可用，请稍后重试 / Jupiter quote unavailable, retry shortly. " +
      errors.slice(0, 2).join(" | ")
  );
}

/** Jupiter 执行兑换 */
async function executeJupiterSwap({ publicKey, sendTransaction, quoteResponse }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Jupiter swap failed: ${t.slice(0, 220)}`);
    }
    const swapJson = await res.json();
    const { swapTransaction } = swapJson;
    if (!swapTransaction) throw new Error("No swapTransaction from Jupiter");
    const raw = Uint8Array.from(atob(swapTransaction), (c) => c.charCodeAt(0));
    const vtx = VersionedTransaction.deserialize(raw);
    const connection = getConnection();
    const sig = await sendTransaction(vtx, connection, { skipPreflight: false });
    const latest = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
      "confirmed"
    );
    return sig;
  } finally {
    clearTimeout(timer);
  }
}

/** Raydium 执行兑换（可能多笔交易） */
async function executeRaydiumSwap({ publicKey, sendTransaction, computeData }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch("https://transaction-v1.raydium.io/transaction/swap-base-in", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        computeUnitPriceMicroLamports: String(computeData?.computeUnitPriceMicroLamports || "100000"),
        swapResponse: computeData,
        txVersion: "V0",
        wallet: publicKey.toString(),
        wrapSol: true,
        unwrapSol: true,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Raydium swap tx failed: ${t.slice(0, 220)}`);
    }
    const body = await res.json();
    const list = body?.data || body?.transactions || [];
    const txs = Array.isArray(list) ? list : [];
    if (!txs.length) throw new Error("Raydium returned no transactions");
    const connection = getConnection();
    let lastSig = "";
    for (const item of txs) {
      const b64 = typeof item === "string" ? item : item?.transaction || item?.tx;
      if (!b64) continue;
      const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      let sig;
      try {
        const vtx = VersionedTransaction.deserialize(raw);
        sig = await sendTransaction(vtx, connection, { skipPreflight: false });
      } catch (_) {
        const tx = Transaction.from(raw);
        sig = await sendTransaction(tx, connection, { skipPreflight: false });
      }
      const latest = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction(
        { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
        "confirmed"
      );
      lastSig = sig;
    }
    if (!lastSig) throw new Error("Raydium: failed to send any tx");
    return lastSig;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 执行兑换：始终优先 Jupiter 真实交易（避免 Raydium 空 tx）
 * 若当前 best 不是 Jupiter，会重新拉 Jupiter 报价再执行
 */
async function executeSwapRoute({ publicKey, sendTransaction, best, fromToken, toToken, uiAmount }) {
  if (!publicKey || !sendTransaction) throw new Error("Wallet not connected");
  if (!best) throw new Error("No quote");

  let jup = null;
  const src = (best.source || "").toLowerCase();
  if (src.includes("jupiter") && best.raw) {
    jup = best.raw;
  } else {
    // Raydium 仅作参考价；真正上链用 Jupiter
    const q = await jupiterQuoteOnce(fromToken, toToken, uiAmount, 100);
    jup = q.raw;
  }
  try {
    return await executeJupiterSwap({
      publicKey,
      sendTransaction,
      quoteResponse: jup,
    });
  } catch (e1) {
    // 最后一次宽滑点 Jupiter
    try {
      const q2 = await jupiterQuoteOnce(fromToken, toToken, uiAmount, 250);
      return await executeJupiterSwap({
        publicKey,
        sendTransaction,
        quoteResponse: q2.raw,
      });
    } catch (e2) {
      throw new Error(
        (e1?.message || String(e1)) + " | retry: " + (e2?.message || String(e2))
      );
    }
  }
}

/* ========== 法币入金 On-ramp（生产环境） ========== */
const MOONPAY_API_KEY = import.meta.env.VITE_MOONPAY_API_KEY || "";
const TRANSAK_API_KEY = import.meta.env.VITE_TRANSAK_API_KEY || "";

/**
 * 跳转 MoonPay / Transak 官方合规站点，用户自行完成 KYC 与入金。
 * 预填钱包地址；不依赖商户 Live API（有 key 则附带，无 key 也可打开官方页）
 */
function openMoonPayBuy(walletAddress, crypto) {
  if (!walletAddress) throw new Error("Connect wallet first / 请先连接钱包");
  const code = crypto === "USDC" ? "usdc_sol" : crypto === "USDT" ? "usdt_sol" : "sol";
  const params = new URLSearchParams({
    currencyCode: code,
    walletAddress: String(walletAddress),
    baseCurrencyCode: "usd",
    colorCode: "00ff9d",
  });
  if (MOONPAY_API_KEY) params.set("apiKey", MOONPAY_API_KEY);
  const url = `https://buy.moonpay.com/?${params.toString()}`;
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    // 弹窗被拦时直接跳转
    window.location.href = url;
  }
  return url;
}

function openTransakBuy(walletAddress, crypto) {
  if (!walletAddress) throw new Error("Connect wallet first / 请先连接钱包");
  const code = crypto === "USDC" ? "USDC" : crypto === "USDT" ? "USDT" : "SOL";
  // Transak 官方买币页：优先 global widget 参数；无 key 时仍打开官网买币入口
  const params = new URLSearchParams({
    walletAddress: String(walletAddress),
    cryptoCurrencyCode: code,
    defaultCryptoCurrency: code,
    network: "solana",
    productsAvailed: "BUY",
    colorMode: "DARK",
    themeColor: "00ff9d",
    disableWalletAddressForm: "true",
  });
  if (TRANSAK_API_KEY) params.set("apiKey", TRANSAK_API_KEY);
  // 官方域名（生产）
  const url = `https://global.transak.com?${params.toString()}`;
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    // 备用：Transak 主站买币（用户可自选 SOL）
    window.location.href = `https://transak.com/buy/${code.toLowerCase()}?walletAddress=${encodeURIComponent(walletAddress)}`;
  }
  return url;
}

/** 带超时的 fetch，避免一直 Loading */
async function fetchWithTimeout(url, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** 价格合理性：当前市价约 $70–80，拒绝异常解析值 */
function isSaneSolUsd(p) {
  return Number.isFinite(p) && p >= 15 && p <= 400;
}

/**
 * 拉取真实 SOL/USD
 * 1) 优先 Supabase Edge get-sol-price（服务端，无 CORS）
 * 2) 浏览器备用：Jupiter / DexScreener / Binance…
 */
async function fetchSolUsdPrice() {
  // —— 1) Edge Function（推荐，部署后即用真实 Binance/CoinGecko）——
  try {
    const { data, error } = await supabase.functions.invoke("get-sol-price", {
      method: "GET",
    });
    if (!error && data?.usd != null) {
      const p = parseFloat(data.usd);
      if (isSaneSolUsd(p)) {
        return { usd: p, source: data.source || "Edge", usdc: data.usdc ?? p };
      }
    }
  } catch (_) {}

  // 也可用匿名 REST 直调（若 function 允许 no-verify-jwt）
  try {
    const base = SUPABASE_URL.replace(/\/$/, "");
    const r = await fetchWithTimeout(`${base}/functions/v1/get-sol-price`, 9000);
    if (r.ok) {
      const d = await r.json();
      const p = parseFloat(d?.usd);
      if (isSaneSolUsd(p)) {
        return { usd: p, source: d.source || "Edge", usdc: d.usdc ?? p };
      }
    }
  } catch (_) {}

  // —— 2) Jupiter ——
  try {
    const r = await fetchWithTimeout("https://price.jup.ag/v6/price?ids=SOL", 7000);
    if (r.ok) {
      const d = await r.json();
      const p = parseFloat(d?.data?.SOL?.price ?? d?.SOL?.price);
      if (isSaneSolUsd(p)) return { usd: p, source: "Jupiter" };
    }
  } catch (_) {}

  // —— 3) DexScreener（取流动性最高的 pair）——
  try {
    const r = await fetchWithTimeout(
      "https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112",
      7000
    );
    if (r.ok) {
      const d = await r.json();
      const pairs = (d?.pairs || [])
        .filter((x) => x?.priceUsd && (x?.quoteToken?.symbol === "USDC" || x?.quoteToken?.symbol === "USDT" || x?.quoteToken?.symbol === "USD"))
        .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
      const pair = pairs[0] || (d?.pairs || []).find((x) => x?.priceUsd);
      const p = parseFloat(pair?.priceUsd);
      if (isSaneSolUsd(p)) return { usd: p, source: "DexScreener" };
    }
  } catch (_) {}

  // —— 4) Binance ——
  try {
    const r = await fetchWithTimeout(
      "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT",
      7000
    );
    if (r.ok) {
      const d = await r.json();
      const p = parseFloat(d?.price);
      if (isSaneSolUsd(p)) return { usd: p, source: "Binance" };
    }
  } catch (_) {}

  // —— 5) Coinbase ——
  try {
    const r = await fetchWithTimeout(
      "https://api.coinbase.com/v2/prices/SOL-USD/spot",
      7000
    );
    if (r.ok) {
      const d = await r.json();
      const p = parseFloat(d?.data?.amount);
      if (isSaneSolUsd(p)) return { usd: p, source: "Coinbase" };
    }
  } catch (_) {}

  // —— 6) CoinGecko ——
  try {
    const r = await fetchWithTimeout(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      7000
    );
    if (r.ok) {
      const d = await r.json();
      const p = d?.solana?.usd;
      if (isSaneSolUsd(p)) return { usd: p, source: "CoinGecko" };
    }
  } catch (_) {}

  return null;
}

/** 多源拉取法币汇率（USD 基准） */
async function fetchFiatRatesUsd() {
  try {
    const res = await fetchWithTimeout("https://open.er-api.com/v6/latest/USD", 8000);
    if (res.ok) {
      const data = await res.json();
      if (data?.rates && (data.result === "success" || data.rates.MYR)) {
        return { rates: data.rates, source: "open.er-api" };
      }
    }
  } catch (_) {}
  try {
    const res = await fetchWithTimeout(
      "https://api.exchangerate-api.com/v4/latest/USD",
      8000
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.rates) return { rates: data.rates, source: "exchangerate-api" };
    }
  } catch (_) {}
  try {
    const res = await fetchWithTimeout(
      "https://api.frankfurter.app/latest?from=USD",
      8000
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.rates) return { rates: data.rates, source: "Frankfurter" };
    }
  } catch (_) {}
  return null;
}

/** 各操作预估计算单元 / 签名费（Solana 基础费用，真实区间） */
const GAS_PRESETS = {
  transfer_sol: { label: "SOL 转账 / SOL Transfer", sigs: 1, cu: 300, extraLamports: 0 },
  transfer_token: { label: "代币转账 / Token Transfer", sigs: 1, cu: 40000, extraLamports: 0 },
  transfer_pawly: { label: "PAWLY 转账 / PAWLY Transfer", sigs: 1, cu: 40000, extraLamports: 0 },
  swap: { label: "兑换 / Swap", sigs: 1, cu: 200000, extraLamports: 0 },
  stake: { label: "质押 / Stake", sigs: 1, cu: 150000, extraLamports: 0 },
  payment: { label: "支付 / Payment", sigs: 1, cu: 120000, extraLamports: 0 },
  charity: { label: "慈善捐赠 / Charity", sigs: 1, cu: 40000, extraLamports: 0 },
};

function formatSol(lamports) {
  return (lamports / LAMPORTS_PER_SOL).toFixed(6);
}

/**
 * 估算 Gas：base signature fee + 可选 priority fee
 * 不依赖 PAWLY CA，用当前主网基础费用
 */
async function estimateSolanaGas(presetKey = "transfer_sol") {
  const preset = GAS_PRESETS[presetKey] || GAS_PRESETS.transfer_sol;
  let priorityMicroLamports = 0;
  try {
    const connection = new Connection(HELIUS_RPC_GLOBAL, "confirmed");
    const fees = await connection.getRecentPrioritizationFees?.();
    if (fees && fees.length) {
      const sorted = fees.map((f) => f.prioritizationFee || 0).sort((a, b) => a - b);
      priorityMicroLamports = sorted[Math.floor(sorted.length * 0.5)] || 0;
    }
  } catch (_) {}
  const baseLamports = BASE_FEE_LAMPORTS * (preset.sigs || 1);
  const cu = preset.cu || 200000;
  const priorityLamports = Math.ceil((priorityMicroLamports * cu) / 1e6);
  const total = baseLamports + priorityLamports + (preset.extraLamports || 0);
  return {
    preset: preset.label,
    baseLamports,
    priorityLamports,
    totalLamports: total,
    totalSol: formatSol(total),
    note:
      priorityLamports > 0
        ? "含当前网络优先费中位数 / Includes median priority fee"
        : "仅基础签名费（网络空闲）/ Base signature fee only (network idle)",
  };
}

/** 重要提醒按钮 + 弹窗（节省页面空间） */
function ImportantNotice({ feature }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "block",
          width: "100%",
          marginBottom: 16,
          padding: "12px 16px",
          borderRadius: 12,
          border: "1px solid rgba(255,136,0,0.5)",
          background: "rgba(255,136,0,0.12)",
          color: "#ffcc80",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        ⚠️ 重要提醒 / Important Notice
      </button>
      {open && (
        <div
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              background: "linear-gradient(165deg, #1a1030, #0d0d18)",
              border: "1px solid rgba(255,136,0,0.45)",
              borderRadius: 18,
              padding: 20,
              color: "#ffcc80",
              lineHeight: 1.6,
              fontSize: 13,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong style={{ fontSize: 15 }}>⚠️ 重要提醒 / Important Notice</strong>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "#ccc",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: "0 0 10px" }}>
              <strong>{feature || "本功能"}</strong>：PAWLY Token CA 尚未创建，状态为{" "}
              <strong>To Be Announced</strong>。界面与 Gas 为真实链上框架，正式功能将在 CA + 流动性池上线后开放。
            </p>
            <p style={{ margin: 0, color: "#c9a06a" }}>
              <strong>{feature || "This feature"}</strong>: PAWLY Token CA is not live yet (
              <strong>TBA</strong>). UI & gas use real Solana base fees; full on-chain execution opens after CA & pool launch.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                marginTop: 16,
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #00ff9d, #00c853)",
                color: "#04140c",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              知道了 / Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function CaWarningBanner({ feature }) {
  return <ImportantNotice feature={feature} />;
}

/** Gas 估算展示盒 */
function GasEstimateBox({ presetKey, refreshKey }) {
  const [gas, setGas] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    estimateSolanaGas(presetKey)
      .then((g) => {
        if (alive) setGas(g);
      })
      .catch(() => {
        if (alive)
          setGas({
            preset: GAS_PRESETS[presetKey]?.label || presetKey,
            totalSol: formatSol(BASE_FEE_LAMPORTS),
            totalLamports: BASE_FEE_LAMPORTS,
            note: "基础签名费 / Base fee only",
          });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [presetKey, refreshKey]);

  return (
    <div
      style={{
        background: "rgba(0,255,157,0.06)",
        border: "1px solid rgba(0,255,157,0.25)",
        borderRadius: 12,
        padding: 14,
        marginTop: 14,
        marginBottom: 8,
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ color: "#00ff9d", fontWeight: 700 }}>⛽ 预估 Gas / Est. Gas</span>
        <span style={{ color: "#889", fontSize: 11 }}>{gas?.preset || "…"}</span>
      </div>
      {loading ? (
        <div style={{ color: "#889" }}>计算中… / Calculating…</div>
      ) : (
        <>
          <div style={{ color: "#e8fff5", fontWeight: 700, fontSize: "1.05rem" }}>
            ≈ {gas?.totalSol} SOL
            <span style={{ color: "#667", fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
              ({gas?.totalLamports?.toLocaleString()} lamports)
            </span>
          </div>
          <div style={{ color: "#667", fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>{gas?.note}</div>
        </>
      )}
    </div>
  );
}


function loadSavedUser() {
  try {
    const raw = localStorage.getItem(PAWLY_DAPP_USER_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && (o.wallet || o.email)) return o;
  } catch (_) {}
  return null;
}

function saveUser(data) {
  try {
    localStorage.setItem(PAWLY_DAPP_USER_KEY, JSON.stringify(data));
  } catch (_) {}
}

const HERO_IMG = "/pawly-token-helps.png"; // 与 PWA 主站同图（站点根目录）

const pageWrap = {
  minHeight: "100vh",
  backgroundColor: "#07070f",
  backgroundImage:
    "linear-gradient(160deg, rgba(7,7,15,0.78) 0%, rgba(18,0,34,0.82) 45%, rgba(10,26,20,0.88) 100%), url(" +
    HERO_IMG +
    ")",
  backgroundSize: "cover",
  backgroundPosition: "center center",
  backgroundAttachment: "fixed",
  backgroundRepeat: "no-repeat",
  color: "#e8fff5",
  padding: "16px 16px 48px",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const card = {
  background: "linear-gradient(145deg, rgba(26,0,51,0.88), rgba(18,0,34,0.92))",
  border: "1px solid rgba(0,255,157,0.35)",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

const neonBtn = {
  background: "linear-gradient(135deg, #00ff9d, #00c853)",
  color: "#04140c",
  border: "none",
  borderRadius: 14,
  padding: "14px 22px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.95rem",
};

const ghostBtn = {
  background: "transparent",
  color: "#00ff9d",
  border: "1px solid rgba(0,255,157,0.5)",
  borderRadius: 9999,
  padding: "10px 20px",
  cursor: "pointer",
  fontSize: "0.9rem",
};

const UserDataContext = createContext(null);

function useUserData() {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData must be used within UserDataProvider");
  return ctx;
}

function UserDataProvider({ children }) {
  const saved0 = loadSavedUser();
  const [verified, setVerified] = useState(!!(saved0 && (saved0.wallet || saved0.email)));
  const [pwaData, setPwaData] = useState(
    saved0 || { email: "", wallet: "", streak: "0", total_pawly: "0", points: "0" }
  );

  const applyUser = useCallback((next) => {
    setPwaData(next);
    saveUser(next);
    setVerified(true);
  }, []);

  const verifyWalletWithSupabase = useCallback(async (connectedPubkey) => {
    if (!connectedPubkey) return;
    try {
      const addr =
        typeof connectedPubkey.toString === "function"
          ? connectedPubkey.toString()
          : String(connectedPubkey);
      const { data, error } = await supabase
        .from("USERS")
        .select("*")
        .eq("wallet_address", addr)
        .single();
      if (error || !data) {
        console.log("未找到钱包对应的用户数据");
        return;
      }
      const next = {
        email: data.email || "",
        wallet: data.wallet_address || addr,
        streak: String(data.checkin_streak || 0),
        total_pawly: String(data.total_earnd || 0),
        points: String(data.pawly_points || 0),
      };
      applyUser(next);
    } catch (err) {
      console.error("读取 Supabase 数据失败:", err);
    }
  }, [applyUser]);

  const refreshUserData = useCallback(
    async (publicKey) => {
      if (publicKey) {
        await verifyWalletWithSupabase(publicKey);
        return;
      }
      const saved = loadSavedUser();
      if (saved && saved.wallet) {
        applyUser(saved);
        await verifyWalletWithSupabase({ toString: () => saved.wallet });
        return;
      }
      if (pwaData.wallet) {
        await verifyWalletWithSupabase({ toString: () => pwaData.wallet });
      }
    },
    [verifyWalletWithSupabase, applyUser, pwaData.wallet]
  );

  const value = {
    pwaData,
    verified,
    applyUser,
    refreshUserData,
    verifyWalletWithSupabase,
    setPwaData,
    setVerified,
  };

  return (
    <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>
  );
}

function PageHeader({ title, subtitle }) {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 720, margin: "0 auto 24px" }}>
      <button onClick={() => navigate("/")} style={{ ...ghostBtn, marginBottom: 16 }}>
        ← 返回主页 / Home
      </button>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.75rem", color: "#00ff9d" }}>{title}</h1>
      {subtitle && (
        <p style={{ margin: 0, color: "#9aa", fontSize: "0.95rem", lineHeight: 1.5 }}>{subtitle}</p>
      )}
    </div>
  );
}

function SyncFromUrl() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { applyUser, verifyWalletWithSupabase } = useUserData();

  useEffect(() => {
    const walletFromUrl = searchParams.get("wallet");
    const emailFromUrl = searchParams.get("email");
    const streakFromUrl = searchParams.get("streak");
    const totalFromUrl = searchParams.get("total_pawly");
    const action = searchParams.get("action");

    if (walletFromUrl) {
      const next = {
        email: emailFromUrl || "",
        wallet: walletFromUrl,
        streak: streakFromUrl || "0",
        total_pawly: totalFromUrl || "0",
        points: "0",
      };
      applyUser(next);
      verifyWalletWithSupabase({ toString: () => walletFromUrl });
    } else {
      const saved = loadSavedUser();
      if (saved && (saved.wallet || saved.email)) {
        applyUser(saved);
        if (saved.wallet) verifyWalletWithSupabase({ toString: () => saved.wallet });
      }
    }

    if (action === "staking") navigate("/staking", { replace: true });
    if (action === "payment") navigate("/payment", { replace: true });
    if (action === "transfer") navigate("/payment", { replace: true });
    if (action === "swap") navigate("/swap", { replace: true });
    if (action === "charity") navigate("/charity", { replace: true });
  }, [searchParams]);

  return null;
}

function HomePage() {
  const wallet = useWallet();
  const navigate = useNavigate();
  const { pwaData, verified, refreshUserData } = useUserData();
  const [showExport, setShowExport] = useState(false);
  const [balSol, setBalSol] = useState(null);
  const [balUsdc, setBalUsdc] = useState(null);
  const [balUsdt, setBalUsdt] = useState(null);
  const [balLoading, setBalLoading] = useState(false);

  const loadChainBalances = useCallback(async () => {
    const addr =
      (wallet.publicKey && wallet.publicKey.toString()) ||
      pwaData.wallet ||
      "";
    if (!addr) {
      setBalSol(null);
      setBalUsdc(null);
      setBalUsdt(null);
      return;
    }
    setBalLoading(true);
    try {
      const [sol, usdc, usdt] = await Promise.all([
        fetchTokenBalance(addr, "SOL"),
        fetchTokenBalance(addr, "USDC"),
        fetchTokenBalance(addr, "USDT"),
      ]);
      setBalSol(sol);
      setBalUsdc(usdc);
      setBalUsdt(usdt);
    } catch (_) {
      setBalSol(null);
      setBalUsdc(null);
      setBalUsdt(null);
    } finally {
      setBalLoading(false);
    }
  }, [wallet.publicKey, pwaData.wallet]);

  useEffect(() => {
    if (wallet.publicKey) {
      refreshUserData(wallet.publicKey);
    }
  }, [wallet.publicKey]);

  useEffect(() => {
    loadChainBalances();
  }, [loadChainBalances]);

  const onRefresh = () => {
    refreshUserData(wallet.publicKey || null);
    loadChainBalances();
  };

  const features = [
    { path: "/staking", icon: "💰", title: "质押 / Staking", desc: "USDC · SOL · USDT · PAWLY", color: "#7c3aed" },
    { path: "/payment", icon: "💳", title: "支付·转账 / Payment·Transfer", desc: "PAWLY · SOL · USDC · USDT", color: "#2196f3" },
    { path: "/swap", icon: "🔄", title: "交易 / Swap", desc: "Jupiter 实时聚合", color: "#ff9ecd" },
    { path: "/buy", icon: "💵", title: "买入·入金 / Buy", desc: "MoonPay · Transak · SOL/USDC", color: "#ffc107" },
    { path: "/charity", icon: "❤️", title: "慈善 / Charity", desc: "支持收容所与护生", color: "#ff5252" },
  ];

  return (
    <div style={pageWrap}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              margin: "0 auto 16px",
              maxWidth: 420,
              borderRadius: 20,
              overflow: "hidden",
              border: "3px solid rgba(255,158,205,0.55)",
              boxShadow: "0 12px 36px rgba(255,158,205,0.25)",
            }}
          >
            <img
              src={HERO_IMG}
              alt="PAWLY"
              style={{ width: "100%", height: "auto", display: "block", verticalAlign: "middle" }}
            />
          </div>
          <h1 style={{ margin: 0, fontSize: "1.85rem", color: "#00ff9d", fontWeight: 800 }}>PAWLY DApp</h1>
          <p style={{ margin: "8px 0 0", color: "#8a9", fontSize: "0.95rem" }}>
            钱包 · 质押 · 支付 · 转账 · 交易
            <br />
            <span style={{ color: "#667" }}>Wallet · Stake · Pay · Transfer · Swap</span>
          </p>
        </div>

        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ color: "#00ff9d", fontWeight: 700, fontSize: "1.05rem" }}>我的数据 / My Data</div>
              <div style={{ color: "#778", fontSize: "0.8rem", marginTop: 2 }}>PWA 同步 · 链上余额 / PWA sync · on-chain balances</div>
            </div>
            <button onClick={onRefresh} style={ghostBtn}>🔄 刷新</button>
          </div>

          {verified || pwaData.wallet ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              {pwaData.wallet && (
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14 }}>
                  <div style={{ color: "#778", fontSize: 12 }}>钱包 / Wallet</div>
                  <div style={{ fontFamily: "monospace", fontSize: 13, marginTop: 4, wordBreak: "break-all" }}>
                    {pwaData.wallet.slice(0, 4)}…{pwaData.wallet.slice(-4)}
                  </div>
                </div>
              )}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#778", fontSize: 12 }}>USDC / USDT</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: 4, color: "#00ff9d" }}>
                  {balLoading ? "…" : fmtBal(balUsdc)} USDC
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: 4, color: "#a5b4fc" }}>
                  {balLoading ? "…" : fmtBal(balUsdt)} USDT
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#778", fontSize: 12 }}>SOL</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4, color: "#ffaa00" }}>
                  {balLoading ? "…" : fmtBal(balSol, 6)} SOL
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#778", fontSize: 12 }}>Total PAWLY</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4, color: "#00ff9d" }}>{pwaData.total_pawly}</div>
              </div>
            </div>
          ) : (
            <p style={{ color: "#889", margin: 0, fontSize: "0.9rem", lineHeight: 1.6 }}>
              连接钱包或从 PWA 跳转后，这里会显示你的签到与积分数据。
              <br />
              <span style={{ color: "#667" }}>Connect wallet or open from PWA to load your data.</span>
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "8px 0 20px", gap: 10 }}>
          <WalletConnect />
          <p style={{ margin: 0, color: "#778", fontSize: 12, lineHeight: 1.5, textAlign: "center", maxWidth: 420 }}>
            Android：若先打开网页，请再点「打开应用」。已安装钱包时第二次即可进入确认。
            <br />
            Android: If a webpage opens first, tap Open in App again.
          </p>
        </div>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <button onClick={() => setShowExport(!showExport)} style={ghostBtn}>
            {showExport ? "收起导出 / Hide" : "导出嵌入式钱包 / Export Wallet"}
          </button>
          {showExport && (
            <div style={{ marginTop: 16, textAlign: "left" }}>
              <ExportPawlyWallet />
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 28 }}>
          {features.map((f) => (
            <button
              key={f.path}
              onClick={() => navigate(f.path)}
              style={{
                ...card,
                padding: "20px 14px",
                cursor: "pointer",
                textAlign: "center",
                borderColor: `${f.color}66`,
              }}
            >
              <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>{f.title}</div>
              <div style={{ color: "#889", fontSize: "0.75rem", marginTop: 6 }}>{f.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <a href="https://pawlypets.netlify.app" style={{ ...ghostBtn, display: "inline-block", textDecoration: "none" }}>
            ← 返回 PAWLY 主站 / Back to PWA
          </a>
        </div>

        <div style={{ ...card, borderColor: "#333", fontSize: "0.85rem", color: "#778", lineHeight: 1.65, textAlign: "center" }}>
          测试版 · 合约审计进行中 · 正式功能将在 Token 上线后开放
          <br />
          Beta · Audit in progress · Full features after token launch
        </div>
      </div>
    </div>
  );
}

function StakingPage() {
  const { publicKey, connected } = useWallet();
  const [selectedToken, setSelectedToken] = useState("SOL");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [realBalance, setRealBalance] = useState(0);

  const { pwaData: stakePwa } = useUserData();
  const walletAddr =
    (publicKey && publicKey.toString()) || stakePwa?.wallet || "";

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!walletAddr) {
        if (alive) setRealBalance(0);
        return;
      }
      const bal = await fetchTokenBalance(walletAddr, selectedToken);
      if (alive) setRealBalance(bal);
    })();
    return () => {
      alive = false;
    };
  }, [walletAddr, selectedToken]);

  const handleStake = () => {
    if (!connected) return alert("请先连接钱包\nPlease connect wallet");
    if (!amount || parseFloat(amount) <= 0) return alert("请输入金额\nEnter amount");
    setLoading(true);
    setTimeout(() => {
      alert("Staking 合约尚未部署。Token / 池子上线后将开放真实质押。\nStaking contract not deployed yet.");
      setLoading(false);
    }, 400);
  };

  return (
    <div style={pageWrap}>
      <PageHeader title="💰 质押 / Staking" subtitle="Stake USDC · SOL · USDT · PAWLY（合约上线后开放真实质押/Staking Will Realeaased With Real CA）" />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <CaWarningBanner feature="质押 / Staking" />

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {["USDC", "SOL", "USDT", "PAWLY"].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedToken(t)}
              style={{
                flex: 1,
                minWidth: 70,
                padding: "12px 8px",
                borderRadius: 12,
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: selectedToken === t ? "#00ff9d" : "#1a1a2e",
                color: selectedToken === t ? "#000" : "#fff",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "#12121f", borderRadius: 12, padding: 14 }}>
            <div style={{ color: "#778", fontSize: 12 }}>APY</div>
            <div style={{ color: "#ffaa00", fontWeight: 700 }}>即将公布/To be announced</div>
          </div>
          <div style={{ background: "#12121f", borderRadius: 12, padding: 14 }}>
            <div style={{ color: "#778", fontSize: 12 }}>钱包余额 / Balance</div>
            <div style={{ color: "#00ff9d", fontWeight: 700 }}>
              {realBalance.toFixed(4)} {selectedToken}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#99a" }}>数量 / Amount</span>
            <button onClick={() => setAmount(String(realBalance))} style={{ ...ghostBtn, padding: "4px 12px", fontSize: 12 }}>MAX</button>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#12121f",
              border: "1px solid #333",
              borderRadius: 12,
              padding: "14px 16px",
              color: "#fff",
              fontSize: "1.2rem",
              outline: "none",
            }}
          />
        </div>
        
        <GasEstimateBox presetKey="stake" refreshKey={selectedToken} />
<button onClick={handleStake} disabled={loading} style={{ ...neonBtn, width: "100%", opacity: loading ? 0.6 : 1 }}>
          {loading ? "处理中..." : "Stake / 质押"}
        </button>
        <p style={{ color: "#667", fontSize: 13, marginTop: 16, lineHeight: 1.5, textAlign: "center" }}>
          真实质押将在 PAWLY Token 与池子上线后开放。
          <br />
          Real staking opens after token & pool launch.
        </p>
      </div>
    </div>
  );
}

function PaymentPage() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { pwaData } = useUserData();
  const [payToken, setPayToken] = useState("SOL");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [realBalance, setRealBalance] = useState(0);
  const [fiatRates, setFiatRates] = useState(null);
  const [solUsd, setSolUsd] = useState(null);
  const [solSource, setSolSource] = useState("");
  const [rateLoading, setRateLoading] = useState(true);
  const [showRates, setShowRates] = useState(false);
  const [fiatCode, setFiatCode] = useState("MYR");
  const [txLoading, setTxLoading] = useState(false);
  const [lastSig, setLastSig] = useState("");

  const FIATS = [
    { code: "MYR", name: "马来西亚 / Malaysia", symbol: "RM" },
    { code: "SGD", name: "新加坡 / Singapore", symbol: "S$" },
    { code: "CNY", name: "中国 / China", symbol: "¥" },
    { code: "JPY", name: "日本 / Japan", symbol: "¥" },
    { code: "KRW", name: "韩国 / Korea", symbol: "₩" },
    { code: "IDR", name: "印尼 / Indonesia", symbol: "Rp" },
    { code: "THB", name: "泰国 / Thailand", symbol: "฿" },
    { code: "HKD", name: "香港 / Hong Kong", symbol: "HK$" },
    { code: "MOP", name: "澳门 / Macau", symbol: "MOP$" },
    { code: "TWD", name: "台湾 / Taiwan", symbol: "NT$" },
  ];

  const maxPawly = parseFloat(pwaData?.total_pawly) || 0;
  const payWalletAddr =
    (publicKey && publicKey.toString()) || pwaData?.wallet || "";

  useEffect(() => {
    let alive = true;
    (async () => {
      if (payToken === "PAWLY") {
        if (alive) setRealBalance(maxPawly);
        return;
      }
      if (!payWalletAddr) {
        if (alive) setRealBalance(0);
        return;
      }
      const bal = await fetchTokenBalance(payWalletAddr, payToken);
      if (alive) setRealBalance(bal);
    })();
    return () => {
      alive = false;
    };
  }, [payWalletAddr, payToken, maxPawly]);

  const fetchRates = async () => {
    setRateLoading(true);
    try {
      const results = await Promise.allSettled([
        fetchFiatRatesUsd(),
        fetchSolUsdPrice(),
      ]);
      const fiat = results[0].status === "fulfilled" ? results[0].value : null;
      const sol = results[1].status === "fulfilled" ? results[1].value : null;
      if (fiat?.rates) setFiatRates(fiat.rates);
      else setFiatRates(null);
      if (sol?.usd) {
        setSolUsd(sol.usd);
        setSolSource(sol.source || "");
      } else {
        setSolUsd(null);
        setSolSource("");
      }
    } catch (e) {
      console.error(e);
      setFiatRates(null);
      setSolUsd(null);
      setSolSource("");
    } finally {
      setRateLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const toUsdcValue = (tok, n) => {
    if (!n || n <= 0) return 0;
    if (tok === "USDC" || tok === "USDT") return n;
    if (tok === "PAWLY") return n / PAWLY_PER_USDC;
    if (tok === "SOL") return solUsd ? n * solUsd : 0;
    return 0;
  };

  const amt = parseFloat(amount) || 0;
  const usdcEq = toUsdcValue(payToken, amt);
  const fiatRate = fiatRates?.[fiatCode];
  const fiatEq = fiatRate != null ? usdcEq * fiatRate : null;
  const fiatMeta = FIATS.find((f) => f.code === fiatCode) || FIATS[0];

  const confirm = async () => {
    if (!connected || !publicKey || !sendTransaction) {
      alert("请先连接可签名的钱包\nPlease connect a signing wallet first");
      return;
    }
    if (!toAddress.trim()) {
      alert("请输入收款钱包地址\nPlease enter recipient wallet address");
      return;
    }
    if (!amt || amt <= 0) {
      alert("请输入有效金额\nPlease enter a valid amount");
      return;
    }
    if (payToken === "PAWLY") {
      alert(
        "PAWLY Token CA 尚未创建（TBA）。请先使用 SOL / USDC / USDT。\nPAWLY CA is TBA. Use SOL / USDC / USDT for now."
      );
      return;
    }
    if (amt > realBalance + 1e-12) {
      alert("余额不足\nInsufficient balance");
      return;
    }
    setTxLoading(true);
    setLastSig("");
    try {
      const sig = await sendTokenTransfer({
        publicKey,
        sendTransaction,
        token: payToken,
        toAddress,
        uiAmount: amt,
      });
      setLastSig(sig);
      alert(
        `✅ 链上成功 / On-chain success\n\n${amt} ${payToken}\n→ ${toAddress.slice(0, 8)}…${toAddress.slice(-6)}\n\nTx: ${sig}\n\nhttps://solscan.io/tx/${sig}`
      );
      const bal = await fetchTokenBalance(publicKey, payToken);
      setRealBalance(bal);
      setAmount("");
    } catch (e) {
      console.error(e);
      alert(
        `交易失败 / Transaction failed\n\n${e?.message || String(e)}`
      );
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div style={pageWrap}>
      <PageHeader
        title="💳 支付·转账 / Payment·Transfer"
        subtitle="真实链上转账 SOL · USDC · USDT · 多国汇率 / Live on-chain transfer + multi-currency rates"
      />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <CaWarningBanner feature="支付·转账 / Payment·Transfer" />

        <p style={{ color: "#99a", fontSize: 13, margin: "0 0 8px" }}>代币 / Token</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["SOL", "USDC", "USDT", "PAWLY"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setPayToken(t);
                setAmount("");
              }}
              style={{
                flex: 1,
                minWidth: 64,
                padding: 12,
                borderRadius: 12,
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: payToken === t ? "#00ff9d" : "#1a1a2e",
                color: payToken === t ? "#000" : "#fff",
                opacity: t === "PAWLY" && !PAWLY_MINT ? 0.75 : 1,
              }}
            >
              {t}
              {t === "PAWLY" && !PAWLY_MINT ? " · TBA" : ""}
            </button>
          ))}
        </div>

        <label style={{ color: "#99a", fontSize: 13, display: "block", marginBottom: 8 }}>
          请输入钱包地址 / Please insert wallet address
        </label>
        <input
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          placeholder="Solana wallet address"
          style={{
            width: "100%",
            boxSizing: "border-box",
            margin: "0 0 14px",
            background: "#12121f",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 13,
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ color: "#99a", fontSize: 13 }}>支付数量 / Amount ({payToken})</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#667", fontSize: 12 }}>
              可用 / Avail: {fmtBal(realBalance)} {payToken}
            </span>
            <button
              type="button"
              onClick={() => setAmount(String(realBalance || 0))}
              style={{ ...ghostBtn, padding: "4px 12px", fontSize: 12 }}
            >
              MAX
            </button>
          </div>
        </div>
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={{
            width: "100%",
            boxSizing: "border-box",
            margin: "0 0 14px",
            background: "#12121f",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            color: "#fff",
            fontSize: "1.15rem",
          }}
        />

        <div style={{ background: "#12121f", borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#889" }}>≈ USDC</span>
            <span style={{ color: "#00ff9d", fontWeight: 700 }}>
              {amt > 0 ? usdcEq.toFixed(4) : "0.00"} USDC
            </span>
          </div>
          {payToken === "SOL" && (
            <div style={{ color: "#667", fontSize: 12, marginBottom: 8 }}>
              {solUsd
                ? `SOL ≈ $${solUsd.toFixed(2)} USD ≈ ${solUsd.toFixed(2)} USDC${solSource ? ` · ${solSource}` : ""}`
                : rateLoading
                  ? "SOL 价格加载中… / Loading SOL price…"
                  : "SOL 价格暂不可用 / SOL price unavailable"}
            </div>
          )}
          {payToken === "PAWLY" && (
            <p style={{ color: "#667", fontSize: 12, margin: "0 0 8px", lineHeight: 1.45 }}>
              临时比例：{PAWLY_PER_USDC} PAWLY ≈ 1 USDC（CA 上线后开放真实支付）
              <br />
              Temp: {PAWLY_PER_USDC} PAWLY ≈ 1 USDC (live pay after CA)
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#889" }}>
              ≈ {fiatMeta.symbol} {fiatCode}
            </span>
            <span style={{ color: "#ffaa00", fontWeight: 700 }}>
              {amt > 0 && fiatEq != null
                ? `${fiatMeta.symbol}${fiatEq.toFixed(2)}`
                : rateLoading
                  ? "…"
                  : "—"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowRates(true)}
          style={{
            ...ghostBtn,
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 12,
            padding: "12px 16px",
          }}
        >
          🌍 今日汇率 / Today Currencies
        </button>

        <GasEstimateBox
          presetKey={payToken === "SOL" ? "transfer_sol" : "transfer_token"}
          refreshKey={amount + payToken}
        />
        <button
          onClick={confirm}
          disabled={txLoading}
          style={{
            ...neonBtn,
            width: "100%",
            marginBottom: 10,
            marginTop: 4,
            opacity: txLoading ? 0.65 : 1,
          }}
        >
          {txLoading ? "链上确认中… / Confirming…" : "确认 / Confirm"}
        </button>
        <button onClick={fetchRates} style={{ ...ghostBtn, width: "100%", boxSizing: "border-box" }}>
          🔄 刷新汇率 / Refresh Rate
        </button>

        {lastSig && (
          <p style={{ color: "#00ff9d", fontSize: 12, marginTop: 12, wordBreak: "break-all", textAlign: "center" }}>
            最近交易 / Last tx:{" "}
            <a
              href={`https://solscan.io/tx/${lastSig}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#7dd3fc" }}
            >
              {lastSig.slice(0, 16)}…
            </a>
          </p>
        )}

        <div style={{ marginTop: 20, padding: 16, background: "rgba(33,150,243,0.08)", border: "1px solid rgba(33,150,243,0.3)", borderRadius: 14 }}>
          <p style={{ color: "#64b5f6", fontWeight: 700, margin: "0 0 10px" }}>商户合作 / For Merchants</p>
          <button
            onClick={() =>
              alert("商户扫码收款功能即将开放\nMerchant QR payment feature coming soon")
            }
            style={{ ...ghostBtn, width: "100%", boxSizing: "border-box" }}
          >
            📷 商户扫码收款（预留） / Merchant QR (Coming Soon)
          </button>
        </div>

        <p style={{ color: "#667", fontSize: 12, marginTop: 14, textAlign: "center", lineHeight: 1.5 }}>
          SOL / USDC / USDT 为真实链上转账。PAWLY 待 CA 上线。汇率仅供参考。
          <br />
          SOL / USDC / USDT are live on-chain transfers. PAWLY awaits CA. Rates are reference only.
        </p>
      </div>

      {showRates && (
        <div
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "12px 12px 24px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRates(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              maxHeight: "80vh",
              overflowY: "auto",
              background: "linear-gradient(165deg, #1a1030, #0d0d18)",
              border: "1px solid rgba(0,255,157,0.35)",
              borderRadius: 20,
              padding: "18px 16px 20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 16 }}>今日汇率</div>
                <div style={{ color: "#889", fontSize: 12 }}>Today Currencies · vs USD</div>
              </div>
              <button
                type="button"
                onClick={() => setShowRates(false)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "#ccc",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#9aa", lineHeight: 1.45 }}>
              选择法币查看当前支付金额换算。
              <br />
              Pick a fiat to convert your pay amount.
            </p>
            {rateLoading && (
              <p style={{ color: "#889", textAlign: "center" }}>加载中… / Loading…</p>
            )}
            {!rateLoading && !fiatRates && (
              <p style={{ color: "#ff9f43", textAlign: "center", fontSize: 13, lineHeight: 1.5 }}>
                汇率接口暂时不可用，请点「刷新汇率」重试。
                <br />
                Rates unavailable. Tap Refresh Rate to retry.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {FIATS.map((f) => {
                const r = fiatRates?.[f.code];
                const val = r != null && amt > 0 ? usdcEq * r : null;
                const selected = fiatCode === f.code;
                return (
                  <button
                    key={f.code}
                    type="button"
                    onClick={() => setFiatCode(f.code)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: selected ? "1px solid #00ff9d" : "1px solid #333",
                      background: selected ? "rgba(0,255,157,0.12)" : "#12121f",
                      color: "#e8fff5",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>
                      <strong>{f.code}</strong>
                      <span style={{ color: "#889", fontSize: 12, marginLeft: 8 }}>{f.name}</span>
                    </span>
                    <span style={{ color: selected ? "#00ff9d" : "#ffaa00", fontWeight: 700, fontSize: 13 }}>
                      {val != null
                        ? `${f.symbol}${val.toFixed(2)}`
                        : r != null
                          ? `1 USD = ${r.toFixed(2)}`
                          : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowRates(false)}
              style={{
                ...neonBtn,
                width: "100%",
                marginTop: 14,
                boxSizing: "border-box",
              }}
            >
              使用 {fiatCode} / Use {fiatCode}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SwapPage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const [fromToken, setFromToken] = useState("SOL");
  const [toToken, setToToken] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState("0.00");
  const [rateText, setRateText] = useState("—");
  const [routeSource, setRouteSource] = useState("");
  const [solUsd, setSolUsd] = useState(null);
  const [gasKey, setGasKey] = useState(0);
  const [realBalance, setRealBalance] = useState(0);
  const [bestQuote, setBestQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [lastSig, setLastSig] = useState("");

  const tokens = ["SOL", "USDC", "USDT", "PAWLY"];
  const livePair =
    fromToken !== "PAWLY" &&
    toToken !== "PAWLY" &&
    fromToken !== toToken &&
    ["SOL", "USDC", "USDT"].includes(fromToken) &&
    ["SOL", "USDC", "USDT"].includes(toToken);

  const { pwaData: swapPwa } = useUserData();
  const swapAddr =
    (publicKey && publicKey.toString()) || swapPwa?.wallet || "";

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!swapAddr) {
        if (alive) setRealBalance(0);
        return;
      }
      const bal = await fetchTokenBalance(swapAddr, fromToken);
      if (alive) setRealBalance(bal);
    })();
    return () => {
      alive = false;
    };
  }, [swapAddr, fromToken]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const sol = await fetchSolUsdPrice();
      if (!alive) return;
      if (sol?.usd) setSolUsd(sol.usd);
      else setSolUsd(null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const amt = parseFloat(amount) || 0;
    setBestQuote(null);
    setRouteSource("");

    if (amt <= 0 || fromToken === toToken) {
      setQuote("0.00");
      setRateText(fromToken === toToken ? "相同代币 / Same token" : "—");
      setQuoteLoading(false);
      return;
    }

    if (fromToken === "PAWLY" || toToken === "PAWLY") {
      const toUsdc = (tok, n) => {
        if (tok === "USDC" || tok === "USDT") return n;
        if (tok === "PAWLY") return n / PAWLY_PER_USDC;
        if (tok === "SOL") return solUsd ? n * solUsd : null;
        return null;
      };
      const fromUsdc = (tok, usdc) => {
        if (tok === "USDC" || tok === "USDT") return usdc;
        if (tok === "PAWLY") return usdc * PAWLY_PER_USDC;
        if (tok === "SOL") return solUsd ? usdc / solUsd : null;
        return null;
      };
      const mid = toUsdc(fromToken, amt);
      if (mid == null) {
        setQuote("—");
        setRateText("汇率加载中… / Rate loading…");
        return;
      }
      const out = fromUsdc(toToken, mid);
      setQuote(
        out == null
          ? "—"
          : out
              .toFixed(6)
              .replace(/\.?0+$/, (m) =>
                m.includes(".") ? m.replace(/0+$/, "").replace(/\.$/, "") : m
              )
      );
      const one = fromUsdc(toToken, toUsdc(fromToken, 1));
      if (one != null) setRateText(`1 ${fromToken} ≈ ${one.toFixed(6)} ${toToken} (TBA preview)`);
      setQuoteLoading(false);
      return;
    }

    if (!livePair) {
      setQuote("—");
      setRateText("—");
      return;
    }

    setQuoteLoading(true);
    const t = setTimeout(async () => {
      try {
        const q = await getBestSwapQuote(fromToken, toToken, amt);
        if (!alive) return;
        setBestQuote(q);
        setRouteSource(q.source || "");
        setQuote(
          q.outUi
            .toFixed(6)
            .replace(/\.?0+$/, (m) =>
              m.includes(".") ? m.replace(/0+$/, "").replace(/\.$/, "") : m
            )
        );
        const rate = q.outUi / amt;
        const impact =
          q.priceImpactPct != null && q.priceImpactPct !== ""
            ? ` · impact ${Number(q.priceImpactPct).toFixed(3)}%`
            : "";
        setRateText(`1 ${fromToken} ≈ ${rate.toFixed(6)} ${toToken} · ${q.source}${impact}`);
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setBestQuote(null);
        setQuote("—");
        setRouteSource("");
        setRateText(`报价失败 / Quote failed: ${(e?.message || "").slice(0, 80)}`);
      } finally {
        if (alive) setQuoteLoading(false);
      }
    }, 450);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [amount, fromToken, toToken, solUsd, livePair]);

  const flip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setGasKey((k) => k + 1);
    setBestQuote(null);
  };

  const involvesPawly = fromToken === "PAWLY" || toToken === "PAWLY";

  const handleSwap = async () => {
    if (!connected || !publicKey || !sendTransaction) {
      return alert("请先连接可签名的钱包\nPlease connect a signing wallet");
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return alert("请输入有效数量\nEnter a valid amount");
    if (fromToken === toToken) return alert("请选择不同代币\nSelect different tokens");
    if (involvesPawly) {
      alert(
        "PAWLY Token CA 与流动性池尚未上线（TBA）。\n请先使用 SOL / USDC / USDT 兑换。\n\nPAWLY CA & pool TBA. Swap SOL / USDC / USDT for now."
      );
      return;
    }
    if (!bestQuote) {
      return alert("请等待实时报价完成（Jupiter / Raydium）\nWait for live quote (Jupiter / Raydium)");
    }
    if (amt > realBalance + 1e-12) {
      return alert("余额不足\nInsufficient balance");
    }
    setTxLoading(true);
    setLastSig("");
    try {
      const sig = await executeSwapRoute({
        publicKey,
        sendTransaction,
        best: bestQuote,
        fromToken,
        toToken,
        uiAmount: amt,
      });
      setLastSig(sig);
      alert(
        `✅ 兑换成功 / Swap success\n\n${amt} ${fromToken} → ≈ ${quote} ${toToken}\n路由 / Route: ${bestQuote.source}\n\nTx: ${sig}\nhttps://solscan.io/tx/${sig}`
      );
      const bal = await fetchTokenBalance(publicKey, fromToken);
      setRealBalance(bal);
      setAmount("");
      setBestQuote(null);
    } catch (e) {
      console.error(e);
      alert(`兑换失败 / Swap failed\n\n${e?.message || String(e)}`);
    } finally {
      setTxLoading(false);
    }
  };

  const tokBtn = (tok, selected, onClick) => (
    <button
      key={tok}
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 56,
        padding: "10px 6px",
        borderRadius: 10,
        border: "none",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        background: selected ? "#00ff9d" : "#1a1a2e",
        color: selected ? "#000" : "#fff",
        opacity: tok === "PAWLY" && !PAWLY_MINT ? 0.75 : 1,
      }}
    >
      {tok}
      {tok === "PAWLY" && !PAWLY_MINT ? "·TBA" : ""}
    </button>
  );

  return (
    <div style={pageWrap}>
      <PageHeader
        title="🔄 交易 / Swap"
        subtitle="实时市价 · Jupiter 聚合 / Live market · Jupiter"
      />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <CaWarningBanner feature="交易 / Swap" />

        <label style={{ color: "#99a", fontSize: 13 }}>支付 / From</label>
        <div style={{ display: "flex", gap: 6, margin: "8px 0 12px", flexWrap: "wrap" }}>
          {tokens.map((t) =>
            tokBtn(t, fromToken === t, () => {
              setFromToken(t);
              if (t === toToken) setToToken(tokens.find((x) => x !== t && x !== "PAWLY") || "USDC");
              setGasKey((k) => k + 1);
            })
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ color: "#99a", fontSize: 13 }}>数量 / Amount</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#667", fontSize: 12 }}>
              余额 / Bal: {fmtBal(realBalance)} {fromToken}
            </span>
            <button
              type="button"
              onClick={() => setAmount(String(realBalance || 0))}
              style={{ ...ghostBtn, padding: "4px 12px", fontSize: 12 }}
            >
              MAX
            </button>
          </div>
        </div>
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`数量 / Amount (${fromToken})`}
          style={{
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 12,
            background: "#12121f",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            color: "#fff",
            fontSize: "1.15rem",
          }}
        />

        <div style={{ textAlign: "center", margin: "4px 0 12px" }}>
          <button onClick={flip} style={{ ...ghostBtn, padding: "8px 18px", fontSize: 16 }} title="切换方向 / Flip">
            ⇅
          </button>
        </div>

        <label style={{ color: "#99a", fontSize: 13 }}>获得 / To</label>
        <div style={{ display: "flex", gap: 6, margin: "8px 0 12px", flexWrap: "wrap" }}>
          {tokens.map((t) =>
            tokBtn(t, toToken === t, () => {
              setToToken(t);
              if (t === fromToken) setFromToken(tokens.find((x) => x !== t && x !== "PAWLY") || "SOL");
              setGasKey((k) => k + 1);
            })
          )}
        </div>

        <div style={{ background: "#12121f", borderRadius: 14, padding: 16, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#889" }}>
              {quoteLoading ? "多路由询价中… / Routing…" : "预估获得 / Est. Receive"}
            </span>
            <span style={{ color: "#00ff9d", fontWeight: 700, fontSize: "1.1rem" }}>
              {quote} {toToken}
            </span>
          </div>
          <div style={{ color: "#667", fontSize: 12 }}>{rateText}</div>
          {routeSource && (
            <p style={{ color: "#00c853", fontSize: 12, margin: "8px 0 0" }}>
              当前路由 / Route: <strong>{routeSource}</strong>
            </p>
          )}
          {involvesPawly && (
            <p style={{ color: "#ffaa00", fontSize: 11, margin: "10px 0 0", lineHeight: 1.45 }}>
              PAWLY 为预览比例，CA + 池上线后开放真实兑换。
              <br />
              PAWLY is preview only until CA & pool launch.
            </p>
          )}
          {livePair && (
            <p style={{ color: "#556", fontSize: 11, margin: "6px 0 0" }}>
              纯 Jupiter 聚合路由（已含各池深度）/ Jupiter-only aggregated route
            </p>
          )}
        </div>

        <GasEstimateBox presetKey="swap" refreshKey={gasKey} />

        <button
          onClick={handleSwap}
          disabled={txLoading || quoteLoading}
          style={{
            ...neonBtn,
            width: "100%",
            marginTop: 8,
            opacity: txLoading || quoteLoading ? 0.65 : 1,
          }}
        >
          {txLoading
            ? "链上兑换中… / Swapping…"
            : `交易 / Swap ${fromToken} → ${toToken}`}
        </button>
        {lastSig && (
          <p style={{ color: "#00ff9d", fontSize: 12, marginTop: 12, wordBreak: "break-all", textAlign: "center" }}>
            <a
              href={`https://solscan.io/tx/${lastSig}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#7dd3fc" }}
            >
              Solscan: {lastSig.slice(0, 20)}…
            </a>
          </p>
        )}
        <p style={{ color: "#667", fontSize: 12, marginTop: 14, textAlign: "center", lineHeight: 1.5 }}>
          询价与上链均为 Jupiter 加强通道。PAWLY 待 CA。
          <br />
          Quote & swap use hardened Jupiter only. PAWLY awaits CA.
        </p>
      </div>
    </div>
  );
}

function BuyPage() {
  const { publicKey, connected } = useWallet();
  const { pwaData } = useUserData();
  const [crypto, setCrypto] = useState("SOL");
  const [showNotes, setShowNotes] = useState(false);
  const addr =
    (publicKey && publicKey.toString()) || pwaData?.wallet || "";

  const openProvider = (name) => {
    if (!addr) {
      alert("请先连接钱包，入金地址将使用该钱包\nConnect wallet first — funds go to that address");
      return;
    }
    try {
      if (name === "moonpay") {
        openMoonPayBuy(addr, crypto);
      } else {
        openTransakBuy(addr, crypto);
      }
    } catch (e) {
      alert(e?.message || String(e));
    }
  };

  return (
    <div style={pageWrap}>
      <PageHeader
        title="💵 买入·入金 / Buy · On-ramp"
        subtitle="跳转官方站自行入金 SOL / USDC · Official MoonPay / Transak pages"
      />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <p style={{ color: "#bcc", lineHeight: 1.65, marginTop: 0 }}>
          连接钱包后，点击下方按钮将打开 <strong>MoonPay / Transak 官方网站</strong>，在对方页面完成验证与支付。
          <br />
          Connect wallet, then open official MoonPay / Transak to complete KYC & payment there.
        </p>

        <p style={{ color: "#99a", fontSize: 13, margin: "0 0 8px" }}>购买代币 / Asset</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["SOL", "USDC"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCrypto(t)}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: crypto === t ? "#00ff9d" : "#1a1a2e",
                color: crypto === t ? "#000" : "#fff",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div
          style={{
            background: "#12121f",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            fontSize: 13,
            wordBreak: "break-all",
          }}
        >
          <div style={{ color: "#889", marginBottom: 6 }}>收款钱包 / Deposit wallet</div>
          <div style={{ color: "#e8fff5", fontFamily: "monospace" }}>
            {addr || (connected ? "—" : "未连接 / Not connected")}
          </div>
        </div>

        <button
          type="button"
          onClick={() => openProvider("moonpay")}
          style={{
            ...neonBtn,
            width: "100%",
            marginBottom: 10,
            background: "linear-gradient(135deg, #7c4dff, #651fff)",
            color: "#fff",
          }}
        >
          MoonPay 购买 {crypto} / Buy {crypto} with MoonPay
        </button>
        <button
          type="button"
          onClick={() => openProvider("transak")}
          style={{
            ...neonBtn,
            width: "100%",
            marginBottom: 10,
            background: "linear-gradient(135deg, #00bcd4, #0097a7)",
            color: "#04140c",
          }}
        >
          Transak 购买 {crypto} / Buy {crypto} with Transak
        </button>

        <button
          type="button"
          onClick={() => setShowNotes(true)}
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            marginBottom: 8,
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid rgba(255,193,7,0.45)",
            background: "rgba(255,193,7,0.12)",
            color: "#ffe082",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          📋 入金说明 / On-ramp Notes
        </button>

        {showNotes && (
          <div
            role="dialog"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNotes(false);
            }}
          >
            <div
              style={{
                maxWidth: 420,
                width: "100%",
                background: "linear-gradient(165deg, #1a1030, #0d0d18)",
                border: "1px solid rgba(255,193,7,0.4)",
                borderRadius: 18,
                padding: 20,
                color: "#ffe082",
                lineHeight: 1.6,
                fontSize: 13,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <strong style={{ fontSize: 15 }}>📋 入金说明 / On-ramp Notes</strong>
                <button
                  type="button"
                  onClick={() => setShowNotes(false)}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    color: "#ccc",
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ✕
                </button>
              </div>
              <p style={{ margin: "0 0 10px" }}>
                · 点击后跳转 <strong>MoonPay / Transak 官方站</strong>，由你在对方平台完成合规与付款。
                <br />
                · Buttons open official sites; you complete compliance & payment there.
              </p>
              <p style={{ margin: "0 0 10px" }}>
                · 代币进入上方显示的钱包地址。
                <br />
                · Crypto is sent to the wallet address shown above.
              </p>
              <p style={{ margin: "0 0 10px" }}>
                · 也可在 Phantom / Solflare App 内使用「买入」后返回本 dApp。
                <br />
                · Or buy inside Phantom / Solflare, then return here.
              </p>
              <p style={{ margin: 0, color: "#c9a06a" }}>
                · PAWLY 不托管资金、不保存银行卡信息。
                <br />
                · PAWLY never custodies funds or card data.
              </p>
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                style={{
                  marginTop: 16,
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #00ff9d, #00c853)",
                  color: "#04140c",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                知道了 / Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CharityPage() {
  const { connected, publicKey } = useWallet();
  const [token, setToken] = useState("SOL");
  const [amount, setAmount] = useState("");
  const [realBalance, setRealBalance] = useState(0);

  const shelters = [
    { name: "SPCA Selangor", url: "https://www.spca.org.my/" },
    { name: "PAWS Animal Welfare Society", url: "https://www.paws.org.my/" },
    { name: "SPCA Penang", url: "https://spcapenang.org/" },
  ];

  const { pwaData: charityPwa } = useUserData();
  const charityAddr =
    (publicKey && publicKey.toString()) || charityPwa?.wallet || "";

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!charityAddr) {
        if (alive) setRealBalance(0);
        return;
      }
      const bal = await fetchTokenBalance(charityAddr, token);
      if (alive) setRealBalance(bal);
    })();
    return () => {
      alive = false;
    };
  }, [charityAddr, token]);

  const handleDonate = () => {
    if (!connected) return alert("请先连接钱包\nPlease connect wallet");
    if (!amount || parseFloat(amount) <= 0) return alert("请输入捐赠数量\nEnter donation amount");
    alert(
      `捐赠预览 / Donation Preview\n\n${amount} ${token}\n\n链上捐赠将在金库地址确定后开放真实签名。\nOn-chain donate after treasury address is set.`
    );
  };

  return (
    <div style={pageWrap}>
      <PageHeader title="❤️ 慈善 / Charity" subtitle="支持全世界动物收容所与护生组织，从马来西亚开始/Supporting animal shelters & welfare organizations worldwide，started from Malaysia" />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <CaWarningBanner feature="慈善 / Charity" />

        <p style={{ color: "#bcc", lineHeight: 1.7, marginTop: 0 }}>
          PAWLY 计划将部分生态收益用于动物保护。你可先通过下列官方渠道直接支持收容所。/PAWLY plans to use part of ecosystem revenue for animal protection. You can support shelters directly via the official channels below.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {shelters.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...ghostBtn,
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                padding: 14,
              }}
            >
              {s.name} ↗
            </a>
          ))}
        </div>

        <p style={{ color: "#99a", fontSize: 13, margin: "0 0 8px" }}>链上捐赠预览 / On-chain donate (preview)</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {["SOL", "USDC", "USDT", "PAWLY"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setToken(t)}
              style={{
                flex: 1,
                minWidth: 64,
                padding: 10,
                borderRadius: 12,
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: token === t ? "#00ff9d" : "#1a1a2e",
                color: token === t ? "#000" : "#fff",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ color: "#99a", fontSize: 13 }}>数量 / Amount</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#667", fontSize: 12 }}>
              余额 / Bal: {fmtBal(realBalance)} {token}
            </span>
            <button
              type="button"
              onClick={() => setAmount(String(realBalance || 0))}
              style={{ ...ghostBtn, padding: "4px 12px", fontSize: 12 }}
            >
              MAX
            </button>
          </div>
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={{
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 12,
            background: "#12121f",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            color: "#fff",
            fontSize: "1.1rem",
          }}
        />
        <GasEstimateBox presetKey="charity" refreshKey={token} />
        <button type="button" onClick={handleDonate} style={{ ...neonBtn, width: "100%", marginTop: 8 }}>
          捐赠预览 / Donate (Preview)
        </button>
        <p style={{ color: "#667", fontSize: 12, marginTop: 12, textAlign: "center", lineHeight: 1.5 }}>
          链上捐赠路由将在 PAWLY CA 与金库地址确定后接入。上方为 Solana 基础 Gas 参考。
          <br />
          On-chain donation route after PAWLY CA & treasury address. Gas above is Solana base fee reference.
        </p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <>
      <SyncFromUrl />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/staking" element={<StakingPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/swap" element={<SwapPage />} />
        <Route path="/buy" element={<BuyPage />} />
        <Route path="/charity" element={<CharityPage />} />
      </Routes>
    </>
  );
}

function App() {
  const inner = (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BrowserRouter basename="/dapp">
            <UserDataProvider>
              <AppRoutes />
            </UserDataProvider>
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );

  if (PRIVY_APP_ID) {
    return (
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          appearance: { theme: "dark", accentColor: "#00ff9d" },
          embeddedWallets: {
            solana: { createOnLogin: "users-without-wallets" },
          },
        }}
      >
        {inner}
      </PrivyProvider>
    );
  }

  return inner;
}

export default App;
