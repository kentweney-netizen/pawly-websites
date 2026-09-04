// @ts-nocheck
/**
 * PAWLY DApp — 31.08.2026 v7.7.25 no forced Privy login. Sign with adapter or local key only. PWA email/wallet for data. Built from v7.7.21 + live price.
 * Phantom / Solflare / Trust / Coinbase / Bitget / Jupiter / MWA:
 *  1) local simulateTransaction(sigVerify:false)
 *  2) prefer adapter.signAndSendTransaction
 *  3) fallback sendTransaction (+ optional skipPreflight retry)
 *  4) Versioned then legacy
 *  5) Guest wallet (no PWA register): still show on-chain SOL/USDC/USDT + address
 *  6) Gallery/screenshot QR: no capture= on album; multi-decoder fallback
 *  7) Fiat input → auto USDC settle
 *  8) Practical QR pay payload
 *  9) Non-custodial fiat settle: local order → redirect MoonPay Sell / Transak SELL / Ramp OFFRAMP
 * ATA getAccountInfo; Jupiter v0; appIdentity www.pawlypets.online
 *
 * iOS Tx Error "Can't find variable: Buffer" fix:
 *  wallet WebView has no Node Buffer; @solana/web3.js serialize needs it.
 */

/* ===== iOS + Android 钱包 WebView：Buffer / process（App 内兜底；入口 index.tsx 必须更早注入） ===== */
import { Buffer as BufPoly } from "buffer";
(function ensureBuffer() {
  try {
    var g = typeof globalThis !== "undefined" ? globalThis : undefined;
    if (!g && typeof window !== "undefined") g = window;
    if (!g && typeof self !== "undefined") g = self;
    if (!g) return;
    if (!g.Buffer) g.Buffer = BufPoly;
    if (typeof window !== "undefined" && !window.Buffer) window.Buffer = BufPoly;
    if (typeof self !== "undefined" && !self.Buffer) self.Buffer = BufPoly;
    // 部分依赖写 global.Buffer
    try {
      if (typeof global !== "undefined" && !global.Buffer) global.Buffer = BufPoly;
    } catch (_) {}
  } catch (e) {
    console.error("[PAWLY] Buffer polyfill failed — run: npm i buffer", e);
  }
})();
(function ensureProcess() {
  try {
    var stub = {
      env: {},
      browser: true,
      version: "",
      nextTick: function (fn) {
        setTimeout(fn, 0);
      },
    };
    if (typeof globalThis !== "undefined" && typeof globalThis.process === "undefined") {
      globalThis.process = stub;
    }
    if (typeof window !== "undefined" && typeof window.process === "undefined") {
      window.process = globalThis.process || stub;
    }
  } catch (_) {}
})();
/* ===== end polyfill ===== */


import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
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
import { WalletModalProvider, useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  LocalWalletProvider,
  usePawlyWallet,
  LocalWalletEntryButtons,
} from "./localWallet";
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
  Keypair,
  Transaction,
  TransactionMessage,
  SystemProgram,
  VersionedTransaction,
  LAMPORTS_PER_SOL as WEB3_LAMPORTS,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  createTransferCheckedInstruction,
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
      uri: "https://www.pawlypets.online",
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


/** 确认交易在链上无 err（有签名仍可能 Failed） */
async function assertTxSuccess(sig, retries = 8) {
  if (!sig) throw new Error("Missing transaction signature");
  const connection = getConnection();
  let lastErr = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await connection.getSignatureStatuses([sig], {
        searchTransactionHistory: true,
      });
      const st = res?.value?.[0];
      if (st) {
        if (st.err) {
          const msg =
            typeof st.err === "object" ? JSON.stringify(st.err) : String(st.err);
          throw new Error("Transaction failed on-chain: " + msg);
        }
        // processed / confirmed / finalized 且无 err
        if (
          st.confirmationStatus === "confirmed" ||
          st.confirmationStatus === "finalized" ||
          st.confirmations === null ||
          (typeof st.confirmations === "number" && st.confirmations >= 0)
        ) {
          return true;
        }
      }
    } catch (e) {
      if (String(e?.message || e).includes("failed on-chain")) throw e;
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 900));
  }
  // 最后再查一次 transaction meta
  try {
    const tx = await connection.getTransaction(sig, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (tx?.meta?.err) {
      throw new Error(
        "Transaction failed on-chain: " + JSON.stringify(tx.meta.err)
      );
    }
    if (tx) return true;
  } catch (e) {
    if (String(e?.message || e).includes("failed on-chain")) throw e;
    lastErr = e;
  }
  throw new Error(
    "Could not confirm transaction success / 无法确认链上成功: " +
      (lastErr?.message || String(lastErr || ""))
  );
}

/** dApp 上链事件 → Supabase（先 pending；Edge 用 RPC 同步 success/failed；统计只认 success） */
async function logDappOnchainEvent(payload) {
  try {
    if (!payload?.tx_sig || !payload?.wallet) return;
    const status = payload.status || "success";
    const { error } = await supabase.from("dapp_onchain_events").insert({
      wallet: String(payload.wallet),
      event_type: payload.event_type || "unknown",
      token: payload.token ?? null,
      amount: payload.amount != null ? Number(payload.amount) : null,
      counterparty: payload.counterparty ?? null,
      tx_sig: String(payload.tx_sig),
      source: "dapp",
      status,
    });
    if (error) console.warn("logDappOnchainEvent", error.message || error);
  } catch (e) {
    console.warn("logDappOnchainEvent failed", e);
  }
}


/* ========== Token / CA 配置（上线后只改这里） ========== */
/** Official PAWLY CA — 11.08.2026 (v2 + metadata). Old GnUEP... abandoned. */
const PAWLY_MINT = "88cCF4cDTayhz36fWndgRfPfgVSLhNZe3ndYS8MdWn87";
const PAWLY_DECIMALS = 6;
/** 仅报价全失败时的最后兜底，不再用于 Payment/Transfer/Charity 主路径。
 *  旧预览 5 PAWLY≈1 USDC（1 PAWLY=0.20 USDC）已废弃。
 *  现价以官方池金库 reserve 为准（约 1 PAWLY ≈ 0.0029 USDC，随池变动）。 */
const PAWLY_PER_USDC = 5;
/** 官方 Raydium CPMM 池金库（与 PAWLY_POOL_ID 对应，Deposit 后仍是这对） */
const PAWLY_VAULT_PAWLY = "cFCT1uq9uRGCnGipuo5nXtfJxb52n48Z7Bk7r2SYhnf";
const PAWLY_VAULT_USDC = "8zUBHzXfokN4De9Smqo5JivGDs3jiHfPZ654mzTJRUWG";

/** 池已上线：2026-08-19 10:00 +08 — Raydium CPMM PAWLY/USDC */
const PAWLY_POOL_LIVE = true;
/** Pool account */
const PAWLY_POOL_ID = "6n8wjFK3mLxrw25q2k6oejt8oYupzWoBPdZqrcHDVwJ";
/** LP mint（Streamflow 锁的是这个） */
const PAWLY_LP_MINT = "Eb8vGh4wXi9StTD1ZvGv1C225kBQNPUFsJMm8PxWwNad";
/** Streamflow LP lock contract */
const PAWLY_LP_LOCK_ID = "89j2DH3hHEGuvxtwY9qRiQjShdWpPdjmsgYafeBKPw5e";

const PAWLY_POOL_PENDING_MSG =
  "流动性池尚未创建。目前仅可查看钱包中的 PAWLY 余额，暂不能用于支付/转账/Swap/质押/慈善。\n池子上线后将自动开放。\n\nLiquidity pool not live yet. On-chain PAWLY balance is visible only; Payment / Transfer / Swap / Staking / Charity with PAWLY is pending.\nWill open after the pool launches.";
function ensurePawlyPoolLive() {
  if (PAWLY_POOL_LIVE) return true;
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pawly-pool-pending", { detail: { msg: PAWLY_POOL_PENDING_MSG } }));
    }
  } catch (_) {}
  try {
    alert(PAWLY_POOL_PENDING_MSG);
  } catch (_) {}
  return false;
}

/** 页面内双语弹窗（钱包内置浏览器有时会拦 alert） */
function PawlyPoolPendingModal() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(PAWLY_POOL_PENDING_MSG);
  useEffect(() => {
    const onEvt = (e) => {
      setMsg((e && e.detail && e.detail.msg) || PAWLY_POOL_PENDING_MSG);
      setOpen(true);
    };
    window.addEventListener("pawly-pool-pending", onEvt);
    return () => window.removeEventListener("pawly-pool-pending", onEvt);
  }, []);
  if (!open) return null;
  const parts = String(msg).split(/\n/).filter(Boolean);
  return (
    <div
      role="dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          background: "#1a0033",
          border: "2px solid #fbbf24",
          borderRadius: 16,
          padding: 22,
          color: "#eee",
          lineHeight: 1.55,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: "1.05rem", marginBottom: 12 }}>
          重要提醒 / Important Notice
        </div>
        {parts.map((line, idx) => (
          <p key={idx} style={{ margin: "0 0 8px", fontSize: 14, color: idx === 0 ? "#fff" : "#ccc" }}>
            {line}
          </p>
        ))}
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "12px 16px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(90deg,#00ff9d,#00c853)",
            color: "#041",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          知道了 / OK
        </button>
      </div>
    </div>
  );
}
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
/** v7.7.26 代付：填热钱包公钥后 Payment/Charity 可由平台垫 SOL，用户用 PAWLY 付手续费 */
const PAWLY_GAS_SPONSOR = String(
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_PAWLY_GAS_SPONSOR) ||
    ""
).trim();
const SPONSOR_FN = "/functions/v1/sponsor-dapp-tx";
function sponsorLive() {
  return PAWLY_GAS_SPONSOR.length >= 32;
}

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

async function estimatePawlyGasFeeUi() {
  let solUsd = 150;
  let pawlyUsd = 0;
  try {
    const s = await fetchSolUsdPrice();
    if (s && Number(s.usd) > 0) solUsd = Number(s.usd);
  } catch (_) {}
  try {
    const p = await fetchPawlyUsdPrice();
    if (p && Number(p.usd) > 0) pawlyUsd = Number(p.usd);
  } catch (_) {}
  const solCost = 0.00002;
  if (!(pawlyUsd > 0)) return { ui: 2, solUsd, pawlyUsd: null, source: "fallback" };
  const raw = (solCost * solUsd) / pawlyUsd;
  const ui = Math.max(1, Math.ceil(raw * 2.5 * 100) / 100);
  return { ui, solUsd, pawlyUsd, source: "live" };
}

async function sponsorBroadcast(signedTx, feePawly) {
  const base = SUPABASE_URL.replace(/\/$/, "");
  const raw =
    signedTx instanceof VersionedTransaction
      ? signedTx.serialize()
      : signedTx.serialize();
  let b64 = "";
  try {
    b64 = btoa(String.fromCharCode.apply(null, Array.from(raw)));
  } catch (_) {
    let s = "";
    for (let i = 0; i < raw.length; i++) s += String.fromCharCode(raw[i]);
    b64 = btoa(s);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, 60000);
  let r;
  try {
    r = await fetch(base + SPONSOR_FN, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + SUPABASE_KEY,
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify({ transaction: b64, feePawly: Number(feePawly) || 0 }),
    });
  } catch (e) {
    throw new Error(
      "Sponsor request dropped / 代付通道中断（EarlyDrop）。请等 3 秒再试一笔，勿连点。 " +
        String((e && e.message) || e)
    );
  } finally {
    clearTimeout(timer);
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.signature) {
    throw new Error(d.error || "sponsor broadcast failed / 代付广播失败");
  }
  return d.signature;
}

async function userPartialSign(transaction, wallet, signTransaction) {
  if (typeof signTransaction === "function") {
    return await signTransaction(transaction);
  }
  const adapter = wallet && (wallet.adapter || wallet);
  if (adapter && typeof adapter.signTransaction === "function") {
    return await adapter.signTransaction(transaction);
  }
  throw new Error("Wallet cannot partial-sign / 钱包无法单独签名（代付需要 signTransaction）");
}



/**
 * Multi-wallet unified sign+send (reduce red simulation / risk false positives)
 * Phantom, Solflare, Trust, Coinbase, Bitget, Jupiter, MWA, Wallet-Standard adapters
 */
async function walletSignAndSend({
  connection,
  transaction,
  sendTransaction,
  wallet,
  allowSkipPreflightFallback = true,
}) {
  if (!transaction) throw new Error("No transaction");
  if (!connection) throw new Error("No connection");

  // 1) Local simulation without signature verify — surface build errors before wallet UI
  try {
    const isV0 =
      (typeof transaction.version === "number") ||
      (transaction.message != null && typeof transaction.serialize === "function" && !transaction.instructions);
    if (transaction instanceof VersionedTransaction || isV0) {
      const sim = await connection.simulateTransaction(transaction, {
        sigVerify: false,
        replaceRecentBlockhash: true,
      });
      if (sim?.value?.err) {
        console.warn("[PAWLY] pre-sim err (continue to wallet):", JSON.stringify(sim.value.err));
      }
    } else {
      const sim = await connection.simulateTransaction(transaction);
      if (sim?.value?.err) {
        console.warn("[PAWLY] pre-sim err (continue to wallet):", JSON.stringify(sim.value.err));
      }
    }
  } catch (e) {
    console.warn("[PAWLY] pre-sim soft fail:", e?.message || e);
  }

  const pickSig = (res) => {
    if (!res) return "";
    if (typeof res === "string") return res;
    if (res.signature) return res.signature;
    if (res.txid) return res.txid;
    return String(res);
  };

  // 2) Prefer signAndSendTransaction when adapter supports it (all major wallets that implement it)
  const adapter = wallet?.adapter || wallet;
  if (adapter && typeof adapter.signAndSendTransaction === "function") {
    try {
      const res = await adapter.signAndSendTransaction(transaction);
      const sig = pickSig(res);
      if (sig && sig !== "[object Object]") return sig;
    } catch (e) {
      console.warn("[PAWLY] signAndSendTransaction fallback:", e?.message || e);
    }
  }

  // Also try window provider signAndSendTransaction (Phantom/Bitget/Jupiter injected)
  try {
    const prov =
      (typeof window !== "undefined" &&
        (window.phantom?.solana ||
          window.solflare ||
          window.coinbaseSolana ||
          window.solana)) ||
      null;
    if (prov && typeof prov.signAndSendTransaction === "function" && adapter?.publicKey) {
      // only if connected provider matches
      try {
        const res = await prov.signAndSendTransaction(transaction);
        const sig = pickSig(res);
        if (sig && sig !== "[object Object]") return sig;
      } catch (_) {}
    }
  } catch (_) {}

  if (typeof sendTransaction !== "function") {
    throw new Error("Wallet cannot sign / 钱包无法签名");
  }

  const trySend = (skipPreflight) =>
    sendTransaction(transaction, connection, {
      skipPreflight: !!skipPreflight,
      preflightCommitment: "confirmed",
      maxRetries: 3,
    });

  try {
    return await trySend(false);
  } catch (e1) {
    if (!allowSkipPreflightFallback) throw e1;
    try {
      return await trySend(true);
    } catch (e2) {
      throw new Error(
        (e1?.message || String(e1)) + " | retry: " + (e2?.message || String(e2))
      );
    }
  }
}


/** Resolve mint owner (Token vs Token-2022) — plain JS, no BigInt literals */
async function resolveTokenProgramId(connection, mint) {
  try {
    const info = await connection.getAccountInfo(mint, "confirmed");
    if (info && info.owner) {
      return info.owner;
    }
  } catch (_) {}
  return TOKEN_PROGRAM_ID;
}

/**
 * 真实 SOL / SPL 转账 v7.7.6 iOS-safe
 * - 无 BigInt(0) / 无数字分隔符（旧 WebView 直接 SyntaxError）
 * - TransferChecked + mint program resolve
 * - 发送方 ATA 失败则扫描同 mint 账户
 * - 收款方无 ATA 同笔创建 + SOL 租金预检
 * - Versioned → legacy 回退
 */
async function sendTokenTransfer({ publicKey, sendTransaction, wallet, signTransaction, token, toAddress, uiAmount }) {
  if (!publicKey || !sendTransaction) {
    throw new Error("Wallet not connected / 请先连接钱包");
  }
  let toPubkey;
  try {
    toPubkey = new PublicKey(String(toAddress).trim());
  } catch (_) {
    throw new Error("Invalid recipient address / 收款地址无效");
  }
  if (toPubkey.equals(publicKey)) {
    throw new Error("Cannot transfer to the same wallet / 不能转给自己同一地址");
  }
  const raw = toRawAmount(uiAmount, token);
  if (raw == null || raw <= 0) {
    throw new Error("Invalid amount / 数量无效");
  }

  const connection = getConnection();
  const ixs = [];
  const useSponsor = sponsorLive() && token !== "SOL";
  let sponsorPkEarly = null;
  if (useSponsor) {
    try {
      sponsorPkEarly = new PublicKey(PAWLY_GAS_SPONSOR);
    } catch (_) {
      sponsorPkEarly = null;
    }
  }

  if (token === "SOL") {
    ixs.push(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: toPubkey,
        lamports: raw,
      })
    );
  } else {
    const mintStr = TOKEN_MINTS[token];
    if (!mintStr) {
      throw new Error(token + " mint not configured / 尚未配置合约地址");
    }
    const mint = new PublicKey(mintStr);
    const decimals = TOKEN_DECIMALS[token] != null ? TOKEN_DECIMALS[token] : 6;
    const tokenProgramId = await resolveTokenProgramId(connection, mint);

    const fromAta = await getAssociatedTokenAddress(
      mint,
      publicKey,
      false,
      tokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const toAta = await getAssociatedTokenAddress(
      mint,
      toPubkey,
      false,
      tokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // 发送方：先标准 ATA，失败再扫描该 mint 全部 token account
    let sourceAta = fromAta;
    let sourceAmount = null;
    try {
      const acc = await getAccount(connection, fromAta, "confirmed", tokenProgramId);
      sourceAmount = Number(acc.amount.toString());
      sourceAta = fromAta;
    } catch (_) {
      try {
        const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          mint: mint,
          programId: tokenProgramId,
        });
        let best = null;
        let bestAmt = -1;
        const list = (accounts && accounts.value) ? accounts.value : [];
        for (let i = 0; i < list.length; i++) {
          const a = list[i];
          const amtStr =
            a &&
            a.account &&
            a.account.data &&
            a.account.data.parsed &&
            a.account.data.parsed.info &&
            a.account.data.parsed.info.tokenAmount &&
            a.account.data.parsed.info.tokenAmount.amount
              ? a.account.data.parsed.info.tokenAmount.amount
              : "0";
          const amt = Number(amtStr);
          if (amt > bestAmt) {
            bestAmt = amt;
            best = a;
          }
        }
        if (!best || bestAmt < raw) {
          throw new Error(
            "No " + token + " balance / 钱包没有足够 " + token + "。请确认持有官方 CA（非同名假币）。"
          );
        }
        sourceAta = new PublicKey(best.pubkey);
        sourceAmount = bestAmt;
      } catch (e2) {
        const m2 = String((e2 && e2.message) || e2);
        if (m2.indexOf("No ") >= 0 || m2.indexOf("没有") >= 0) throw e2;
        throw new Error(
          "No " + token + " token account / 没有 " + token + " 代币账户。请确认钱包已有 " + token + "（可先 Swap）。"
        );
      }
    }

    if (sourceAmount != null && sourceAmount < raw) {
      const uiHave = sourceAmount / Math.pow(10, decimals);
      throw new Error(
        "Insufficient " + token + " / " + token + " 余额不足（链上 " + uiHave + "，需要 " + uiAmount + "）"
      );
    }

    // 收款方无 ATA：同笔创建。代付开启时租金由热钱包出，不检查用户 SOL。
    const toAtaInfo = await connection.getAccountInfo(toAta, "confirmed");
    if (!toAtaInfo) {
      if (useSponsor && sponsorPkEarly) {
        ixs.push(
          createAssociatedTokenAccountInstruction(
            sponsorPkEarly,
            toAta,
            toPubkey,
            mint,
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      } else {
        const solLamports = await connection.getBalance(publicKey, "confirmed");
        const need = 2500000;
        if (solLamports < need) {
          throw new Error(
            "SOL 不足：对方首次接收 " + token + " 需新建代币账户（约 0.002 SOL 租金）+ 手续费。请至少保留 0.01 SOL。\n" +
              "Not enough SOL: first-time " + token + " receive needs ~0.002 SOL rent + fees. Keep >= 0.01 SOL."
          );
        }
        ixs.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
            toAta,
            toPubkey,
            mint,
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }
    }

    // TransferChecked（decimals 明确，钱包模拟更稳）；失败回退普通 Transfer
    // 金额：Checked 用 BigInt() 构造函数（勿写 BigInt(0) 字面量）；普通 Transfer 用 number
    try {
      ixs.push(
        createTransferCheckedInstruction(
          sourceAta,
          mint,
          toAta,
          publicKey,
          BigInt(raw),
          decimals,
          [],
          tokenProgramId
        )
      );
    } catch (_) {
      ixs.push(
        createTransferInstruction(
          sourceAta,
          toAta,
          publicKey,
          raw,
          [],
          tokenProgramId
        )
      );
    }
  }

  let feePawlyUi = 0;
  let payerKey = publicKey;
  const wantSponsor = sponsorLive() && token !== "SOL";
  if (wantSponsor) {
    try {
      const feeQuote = await estimatePawlyGasFeeUi();
      feePawlyUi = feeQuote.ui;
      const sponsorPk = new PublicKey(PAWLY_GAS_SPONSOR);
      const pawlyMint = new PublicKey(TOKEN_MINTS.PAWLY);
      const pawlyProg = await resolveTokenProgramId(connection, pawlyMint);
      const userPawlyAta = await getAssociatedTokenAddress(
        pawlyMint, publicKey, false, pawlyProg, ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const treasPawlyAta = await getAssociatedTokenAddress(
        pawlyMint, sponsorPk, false, pawlyProg, ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const feeRaw = toRawAmount(feePawlyUi, "PAWLY");
      if (feeRaw == null || feeRaw <= 0) throw new Error("fee quote invalid");
      const treasInfo = await connection.getAccountInfo(treasPawlyAta, "confirmed");
      if (!treasInfo) {
        ixs.unshift(
          createAssociatedTokenAccountInstruction(
            sponsorPk, treasPawlyAta, sponsorPk, pawlyMint, pawlyProg, ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }
      // rewrite ATA-create payer to sponsor if we added one for recipient
      for (let i = 0; i < ixs.length; i++) {
        const ix = ixs[i];
        if (
          ix &&
          ix.programId &&
          ix.programId.equals &&
          ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID) &&
          ix.keys &&
          ix.keys[0] &&
          ix.keys[0].pubkey &&
          ix.keys[0].pubkey.equals(publicKey)
        ) {
          ix.keys[0].pubkey = sponsorPk;
        }
      }
      try {
        ixs.push(
          createTransferCheckedInstruction(
            userPawlyAta, pawlyMint, treasPawlyAta, publicKey,
            BigInt(feeRaw), TOKEN_DECIMALS.PAWLY, [], pawlyProg
          )
        );
      } catch (_) {
        ixs.push(
          createTransferInstruction(
            userPawlyAta, treasPawlyAta, publicKey, feeRaw, [], pawlyProg
          )
        );
      }
      payerKey = sponsorPk;
    } catch (eFee) {
      console.warn("[PAWLY] sponsor quote/build skip:", eFee && eFee.message);
      feePawlyUi = 0;
      payerKey = publicKey;
    }
  }

  const latest = await connection.getLatestBlockhash("confirmed");
  const blockhash = latest.blockhash;
  const lastValidBlockHeight = latest.lastValidBlockHeight;

  const messageV0 = new TransactionMessage({
    payerKey: payerKey,
    recentBlockhash: blockhash,
    instructions: ixs,
  }).compileToV0Message();
  const vtx = new VersionedTransaction(messageV0);

  let sig;
  try {
    if (payerKey !== publicKey && feePawlyUi > 0) {
      const signed = await userPartialSign(vtx, wallet, signTransaction);
      sig = await sponsorBroadcast(signed, feePawlyUi);
    } else {
      sig = await walletSignAndSend({
        connection: connection,
        transaction: vtx,
        sendTransaction: sendTransaction,
        wallet: wallet,
        allowSkipPreflightFallback: true,
      });
    }
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (payerKey !== publicKey && feePawlyUi > 0) {
      throw new Error(
        msg +
          "\n代付未上链，未改回用户自付 SOL（避免出现有签名但 Solscan 空白）。请稍后重试。"
      );
    }
    try {
      const legacy = new Transaction();
      legacy.recentBlockhash = blockhash;
      legacy.feePayer = publicKey;
      for (let k = 0; k < ixs.length; k++) {
        legacy.add(ixs[k]);
      }
      sig = await walletSignAndSend({
        connection: connection,
        transaction: legacy,
        sendTransaction: sendTransaction,
        wallet: wallet,
        allowSkipPreflightFallback: true,
      });
    } catch (e2) {
      throw new Error((msg || "sign failed") + " | legacy: " + String((e2 && e2.message) || e2));
    }
  }

  if (!sig || sig === "[object Object]") {
    throw new Error("No signature returned from wallet / 钱包未返回签名");
  }

  try {
    await connection.confirmTransaction(
      { signature: sig, blockhash: blockhash, lastValidBlockHeight: lastValidBlockHeight },
      "confirmed"
    );
  } catch (_) {}
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

  const buildResult = (data) => {
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

  // 1) 优先 Supabase Edge 代理（服务端访问 Jupiter，绕过浏览器拦截）
  try {
    const { data, error } = await supabase.functions.invoke("get-jupiter-quote", {
      body: {
        inputMint: inMint,
        outputMint: outMint,
        amount: String(raw),
        slippageBps,
      },
    });
    if (!error && data?.outAmount) return buildResult(data);
  } catch (_) {}

  try {
    const base = SUPABASE_URL.replace(/\/$/, "");
    const r = await fetchWithTimeout(`${base}/functions/v1/get-jupiter-quote`, 18000);
    // Edge 需 POST
  } catch (_) {}

  try {
    const base = SUPABASE_URL.replace(/\/$/, "");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 18000);
    try {
      const r = await fetch(`${base}/functions/v1/get-jupiter-quote`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({
          inputMint: inMint,
          outputMint: outMint,
          amount: String(raw),
          slippageBps,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data?.outAmount) return buildResult(data);
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (_) {}

  // 2) 浏览器直连备用（部分网络可用）
  const qs =
    `inputMint=${inMint}&outputMint=${outMint}&amount=${raw}&slippageBps=${slippageBps}`;
  const urls = [
    `https://quote-api.jup.ag/v6/quote?${qs}`,
    `https://lite-api.jup.ag/swap/v1/quote?${qs}`,
  ];
  let lastErr = "Jupiter quote failed";
  for (const url of urls) {
    try {
      const r = await fetchWithTimeout(url, 12000);
      if (!r.ok) {
        lastErr = `HTTP ${r.status}`;
        continue;
      }
      const data = await r.json();
      if (data?.outAmount) return buildResult(data);
      lastErr = data?.error || "no outAmount";
    } catch (e) {
      lastErr = e?.message || String(e);
    }
  }
  throw new Error(lastErr);
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
async function executeJupiterSwap({ publicKey, sendTransaction, wallet, quoteResponse }) {
  if (!publicKey || !sendTransaction) throw new Error("Wallet not connected");

  let swapTransaction = null;

  // 1) Edge 代理获取 swap 交易
  try {
    const { data, error } = await supabase.functions.invoke("get-jupiter-swap", {
      body: {
        quoteResponse,
        userPublicKey: publicKey.toString(),
      },
    });
    if (!error && data?.swapTransaction) swapTransaction = data.swapTransaction;
  } catch (_) {}

  if (!swapTransaction) {
    try {
      const base = SUPABASE_URL.replace(/\/$/, "");
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      try {
        const r = await fetch(`${base}/functions/v1/get-jupiter-swap`, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
            apikey: SUPABASE_KEY,
          },
          body: JSON.stringify({
            quoteResponse,
            userPublicKey: publicKey.toString(),
          }),
        });
        if (r.ok) {
          const data = await r.json();
          if (data?.swapTransaction) swapTransaction = data.swapTransaction;
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (_) {}
  }

  // 2) 浏览器直连备用
  if (!swapTransaction) {
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
      swapTransaction = swapJson.swapTransaction;
    } finally {
      clearTimeout(timer);
    }
  }

  if (!swapTransaction) throw new Error("No swapTransaction from Jupiter / Edge");

  const raw = Uint8Array.from(atob(swapTransaction), (c) => c.charCodeAt(0));
  const vtx = VersionedTransaction.deserialize(raw);
  const connection = getConnection();
  const sig = await walletSignAndSend({
    connection,
    transaction: vtx,
    sendTransaction,
    wallet,
  });
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
    "confirmed"
  );
  return sig;
}

/** Raydium 执行兑换（可能多笔交易） */
async function executeRaydiumSwap({ publicKey, sendTransaction, wallet, computeData }) {
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
        sig = await walletSignAndSend({ connection, transaction: vtx, sendTransaction, wallet });
      } catch (_) {
        const tx = Transaction.from(raw);
        sig = await walletSignAndSend({ connection, transaction: tx, sendTransaction, wallet });
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
async function executeSwapRoute({ publicKey, sendTransaction, wallet, best, fromToken, toToken, uiAmount }) {
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
      wallet,
      quoteResponse: jup,
    });
  } catch (e1) {
    // 最后一次宽滑点 Jupiter
    try {
      const q2 = await jupiterQuoteOnce(fromToken, toToken, uiAmount, 250);
      return await executeJupiterSwap({
        publicKey,
        sendTransaction,
        wallet,
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
/** 打开第三方官方入金页（预填钱包；用户在对方站完成合规） */
function openOnrampPlatform(platform, walletAddress, crypto) {
  if (!walletAddress) throw new Error("Connect wallet first / 请先连接钱包");
  const addr = String(walletAddress);
  const c = crypto === "USDC" ? "USDC" : crypto === "USDT" ? "USDT" : "SOL";
  let url = "";

  if (platform === "moonpay") {
    const code = c === "USDC" ? "usdc_sol" : c === "USDT" ? "usdt_sol" : "sol";
    const params = new URLSearchParams({
      currencyCode: code,
      walletAddress: addr,
      baseCurrencyCode: "usd",
      colorCode: "00ff9d",
    });
    if (MOONPAY_API_KEY) params.set("apiKey", MOONPAY_API_KEY);
    url = `https://buy.moonpay.com/?${params.toString()}`;
  } else if (platform === "ramp") {
    // Ramp Network 官方买币（用户自助）
    const params = new URLSearchParams({
      hostAppName: "PAWLY",
      hostLogoUrl: "https://www.pawlypets.online/pawly-token-helps.png",
      swapAsset: c === "SOL" ? "SOLANA_SOL" : c === "USDC" ? "SOLANA_USDC" : "SOLANA_USDT",
      userAddress: addr,
      defaultAsset: c === "SOL" ? "SOLANA_SOL" : c === "USDC" ? "SOLANA_USDC" : "SOLANA_USDT",
    });
    url = `https://app.ramp.network/?${params.toString()}`;
  } else if (platform === "mercuryo") {
    const params = new URLSearchParams({
      currency: c === "SOL" ? "SOL" : c,
      address: addr,
      network: "SOLANA",
      type: "buy",
    });
    url = `https://exchange.mercuryo.io/?${params.toString()}`;
  } else if (platform === "alchemy") {
    const params = new URLSearchParams({
      crypto: c === "SOL" ? "SOL" : c,
      network: "SOL",
      address: addr,
    });
    url = "https://ramp.alchemypay.org/?" + params.toString();
  } else if (platform === "luno") {
    url = "https://www.luno.com/wallet/buy";
  } else if (platform === "changenow") {
    const params = new URLSearchParams({
      from: "usd",
      to: c === "SOL" ? "sol" : c.toLowerCase(),
    });
    url = "https://changenow.io/?" + params.toString();
  } else if (platform === "wallet") {

    // 引导用户使用已安装钱包 App 内的买入（无第三方网页）
    url = "";
    alert(
      "请在已安装的钱包 App（如 Phantom / Solflare）内使用「买入 / Buy」功能购买 " +
        c +
        "，完成后返回本 dApp。\n\n" +
        "Use Buy inside your wallet app (Phantom / Solflare), then return to this dApp."
    );
    return null;
  } else {
    throw new Error("Unknown on-ramp platform");
  }

  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w && url) window.location.href = url;
  return url;
}


/**
 * 不托管法币结算 / Off-ramp（用户钱包加密 → 持牌方法币）
 * PAWLY 只生成订单号并跳转；资金不经过 PAWLY。
 */
function createSettleOrderId() {
  return (
    "PS" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

function saveSettleOrder(order) {
  try {
    const key = "pawly_settle_orders";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    list.unshift(order);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
  } catch (_) {}
}

function openOfframpPlatform(platform, walletAddress, crypto, amount, fiatCode) {
  if (!walletAddress) throw new Error("请先连接钱包 / Connect wallet first");
  const addr = String(walletAddress).trim();
  const c = (crypto || "USDC").toUpperCase();
  if (!["USDC", "USDT", "SOL"].includes(c)) {
    throw new Error("结算币仅支持 USDC / USDT / SOL");
  }
  const amt = amount && Number(amount) > 0 ? String(amount) : "";
  const fiat = (fiatCode || "MYR").toUpperCase();
  const orderId = createSettleOrderId();

  saveSettleOrder({
    id: orderId,
    platform,
    wallet: addr,
    crypto: c,
    amount: amt || null,
    fiat,
    status: "redirected",
    createdAt: new Date().toISOString(),
  });

  let url = "";

  if (platform === "moonpay_sell") {
    const params = new URLSearchParams({
      baseCurrencyCode: c.toLowerCase() === "sol" ? "sol" : c.toLowerCase(),
      refundWalletAddress: addr,
      externalCustomerId: orderId,
    });
    if (amt) params.set("baseCurrencyAmount", amt);
    if (fiat) params.set("quoteCurrencyCode", fiat.toLowerCase());
    if (typeof MOONPAY_API_KEY === "string" && MOONPAY_API_KEY) {
      params.set("apiKey", MOONPAY_API_KEY);
    }
    url = "https://sell.moonpay.com?" + params.toString();
  } else if (platform === "transak_sell") {
    const params = new URLSearchParams({
      productsAvailed: "SELL",
      cryptoCurrencyCode: c === "SOL" ? "SOL" : c,
      network: "solana",
      walletAddress: addr,
      partnerOrderId: orderId,
      disableWalletAddressForm: "true",
    });
    if (amt) params.set("cryptoAmount", amt);
    if (fiat) params.set("fiatCurrency", fiat);
    if (typeof TRANSAK_API_KEY === "string" && TRANSAK_API_KEY) {
      params.set("apiKey", TRANSAK_API_KEY);
    }
    url = "https://global.transak.com?" + params.toString();
  } else if (platform === "ramp_sell") {
    const params = new URLSearchParams({
      swapAsset:
        c === "SOL" ? "SOLANA_SOL" : c === "USDC" ? "SOLANA_USDC" : "SOLANA_USDT",
      userAddress: addr,
      enabledFlows: "OFFRAMP",
      defaultFlow: "OFFRAMP",
      hostAppName: "PAWLY",
      hostLogoUrl: "https://www.pawlypets.online/pawly-token-helps.png",
    });
    if (amt) params.set("swapAmount", amt);
    if (fiat) params.set("fiatCurrency", fiat);
    url = "https://app.ramp.network/?" + params.toString();
  } else if (platform === "alchemy_sell") {
    const params = new URLSearchParams({
      crypto: c === "SOL" ? "SOL" : c,
      network: "SOL",
      address: addr,
      type: "sell",
    });
    if (amt) params.set("amount", amt);
    url = "https://ramp.alchemypay.org/?" + params.toString();
  } else if (platform === "luno_sell") {
    url = "https://www.luno.com/wallet/sell";
  } else if (platform === "changenow_sell") {
    const params = new URLSearchParams({
      from: c === "SOL" ? "sol" : c.toLowerCase(),
      to: (fiat || "myr").toLowerCase(),
    });
    if (amt) params.set("amount", amt);
    url = "https://changenow.io/?" + params.toString();
  } else if (platform === "wallet_sell") {
    alert(
      "请在钱包 App 内使用「卖出 / Sell / Cash out」将 " +
        c +
        " 换成法币。\nUse Sell inside your wallet app.\n\n订单号 / Order: " +
        orderId
    );
    return orderId;
  } else {
    throw new Error("Unknown off-ramp platform");
  }

  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w && url) window.location.href = url;
  return orderId;
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

/** PAWLY 多法币计价列表（链上仍结算 USDC/USDT/SOL） */
const PAWLY_FIATS = [
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

/** 法币金额 → 需支付的加密数量（USD≈USDC） */
function fiatToCryptoAmount(fiatAmt, fiatCode, rates, payToken, solUsd, pawlyUsd) {
  const fa = Number(fiatAmt);
  if (!Number.isFinite(fa) || fa <= 0) return null;
  const rate = rates?.[fiatCode];
  if (rate == null || !(rate > 0)) return null;
  const usd = fa / rate; // 1 USD = rate units of fiat
  if (payToken === "USDC" || payToken === "USDT") return usd;
  if (payToken === "SOL") {
    if (!solUsd || !(solUsd > 0)) return null;
    return usd / solUsd;
  }
  if (payToken === "PAWLY") {
    if (!pawlyUsd || !(pawlyUsd > 0)) return null;
    return usd / pawlyUsd;
  }
  return usd;
}

function isSanePawlyUsd(p) {
  const n = Number(p);
  return Number.isFinite(n) && n > 0.0000001 && n < 5;
}

const PAWLY_PX_CACHE_KEY = "pawly_live_px_v1";

function packPawlyPx(usd, source) {
  return { usd: Number(usd), pawlyPerUsdc: 1 / Number(usd), source: source || "Official pool", ts: Date.now() };
}

function readCachedPawlyPx() {
  try {
    const raw = localStorage.getItem(PAWLY_PX_CACHE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw);
    // 只接受曾经成功拉到的活价（ts>0）；拒绝源码写死数字
    if (isSanePawlyUsd(j?.usd) && Number(j.ts) > 0) return j;
  } catch (_) {}
  return null;
}

function writeCachedPawlyPx(px) {
  try {
    if (px && isSanePawlyUsd(px.usd)) localStorage.setItem(PAWLY_PX_CACHE_KEY, JSON.stringify(px));
  } catch (_) {}
  return px;
}

async function jsonRpcTokenUiAmount(rpcUrl, tokenAccount) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, 7000);
  try {
    const r = await fetch(rpcUrl, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountBalance",
        params: [tokenAccount, { commitment: "confirmed" }],
      }),
    });
    if (!r.ok) return 0;
    const d = await r.json();
    const v = d?.result?.value;
    const n = parseFloat(v?.uiAmountString ?? v?.uiAmount);
    return Number.isFinite(n) ? n : 0;
  } finally {
    clearTimeout(timer);
  }
}

async function pawlyPxFromVaults(rpcUrl) {
  const pair = await Promise.all([
    jsonRpcTokenUiAmount(rpcUrl, PAWLY_VAULT_PAWLY),
    jsonRpcTokenUiAmount(rpcUrl, PAWLY_VAULT_USDC),
  ]);
  const pawlyAmt = pair[0];
  const usdcAmt = pair[1];
  if (pawlyAmt > 0 && usdcAmt > 0) {
    const usd = usdcAmt / pawlyAmt;
    if (isSanePawlyUsd(usd)) return packPawlyPx(usd, "Official pool (on-chain)");
  }
  return null;
}

/**
 * PAWLY 现价：官方池金库优先，多源接力；成功写入本机。
 * 瞬时全失败只用上次成功的真实报价，绝不回退 0.20，不对用户报失败。
 */
async function fetchPawlyUsdPrice() {
  const cached = readCachedPawlyPx();
  const tryOne = async function (fn) {
    try { return await fn(); } catch (_) { return null; }
  };

  const rpcList = [];
  try { if (HELIUS_RPC_GLOBAL) rpcList.push(HELIUS_RPC_GLOBAL); } catch (_) {}
  rpcList.push("https://api.mainnet-beta.solana.com");
  rpcList.push("https://solana-rpc.publicnode.com");

  for (let i = 0; i < rpcList.length; i++) {
    const onchain = await tryOne(function () { return pawlyPxFromVaults(rpcList[i]); });
    if (onchain) return writeCachedPawlyPx(onchain);
  }

  const viaConn = await tryOne(async function () {
    const connection = getConnection();
    const pawlyAcc = await connection.getTokenAccountBalance(new PublicKey(PAWLY_VAULT_PAWLY), "confirmed");
    const usdcAcc = await connection.getTokenAccountBalance(new PublicKey(PAWLY_VAULT_USDC), "confirmed");
    const pawlyAmt = parseFloat(pawlyAcc?.value?.uiAmountString ?? pawlyAcc?.value?.uiAmount);
    const usdcAmt = parseFloat(usdcAcc?.value?.uiAmountString ?? usdcAcc?.value?.uiAmount);
    if (pawlyAmt > 0 && usdcAmt > 0) {
      const usd = usdcAmt / pawlyAmt;
      if (isSanePawlyUsd(usd)) return packPawlyPx(usd, "Official pool (on-chain)");
    }
    return null;
  });
  if (viaConn) return writeCachedPawlyPx(viaConn);

  const dexPair = await tryOne(async function () {
    const r = await fetchWithTimeout("https://api.dexscreener.com/latest/dex/pairs/solana/" + PAWLY_POOL_ID, 8000);
    if (!r || !r.ok) return null;
    const d = await r.json();
    const pair = d?.pair || (d?.pairs && d.pairs[0]);
    const px = parseFloat(pair?.priceUsd);
    return isSanePawlyUsd(px) ? packPawlyPx(px, "DexScreener") : null;
  });
  if (dexPair) return writeCachedPawlyPx(dexPair);

  const dexTok = await tryOne(async function () {
    const r = await fetchWithTimeout("https://api.dexscreener.com/latest/dex/tokens/" + PAWLY_MINT, 8000);
    if (!r || !r.ok) return null;
    const d = await r.json();
    const pairs = (d?.pairs || []).filter(function (x) { return x && x.priceUsd; });
    const official = pairs.find(function (x) { return String(x.pairAddress) === PAWLY_POOL_ID; }) || pairs[0];
    const px = parseFloat(official?.priceUsd);
    return isSanePawlyUsd(px) ? packPawlyPx(px, "DexScreener") : null;
  });
  if (dexTok) return writeCachedPawlyPx(dexTok);

  const gt = await tryOne(async function () {
    const r = await fetchWithTimeout("https://api.geckoterminal.com/api/v2/networks/solana/pools/" + PAWLY_POOL_ID, 8000);
    if (!r || !r.ok) return null;
    const d = await r.json();
    const px = parseFloat(d?.data?.attributes?.base_token_price_usd);
    return isSanePawlyUsd(px) ? packPawlyPx(px, "GeckoTerminal") : null;
  });
  if (gt) return writeCachedPawlyPx(gt);

  const ray = await tryOne(async function () {
    const r = await fetchWithTimeout("https://api-v3.raydium.io/pools/info/ids?ids=" + PAWLY_POOL_ID, 8000);
    if (!r || !r.ok) return null;
    const d = await r.json();
    const info = Array.isArray(d?.data) ? d.data[0] : d?.data;
    const a = parseFloat(info?.mintAmountA);
    const b = parseFloat(info?.mintAmountB);
    if (a > 0 && b > 0) {
      const usd = b / a;
      if (isSanePawlyUsd(usd)) return packPawlyPx(usd, "Raydium");
    }
    const px = parseFloat(info?.price);
    return isSanePawlyUsd(px) ? packPawlyPx(px, "Raydium") : null;
  });
  if (ray) return writeCachedPawlyPx(ray);

  const jupPx = await tryOne(async function () {
    const urls = [
      "https://lite-api.jup.ag/price/v2?ids=" + PAWLY_MINT,
      "https://api.jup.ag/price/v2?ids=" + PAWLY_MINT,
    ];
    for (let i = 0; i < urls.length; i++) {
      try {
        const r = await fetchWithTimeout(urls[i], 8000);
        if (!r || !r.ok) continue;
        const d = await r.json();
        const row = d?.data ? d.data[PAWLY_MINT] : null;
        const px = parseFloat(row?.price);
        if (isSanePawlyUsd(px)) return packPawlyPx(px, "Jupiter");
      } catch (_) {}
    }
    return null;
  });
  if (jupPx) return writeCachedPawlyPx(jupPx);

  const jupQ = await tryOne(async function () {
    const q = await jupiterQuoteOnce("USDC", "PAWLY", 1, 150);
    const out = Number(q && q.outUi);
    if (out > 0) {
      const usd = 1 / out;
      if (isSanePawlyUsd(usd)) return packPawlyPx(usd, "Jupiter");
    }
    return null;
  });
  if (jupQ) return writeCachedPawlyPx(jupQ);

  if (cached && isSanePawlyUsd(cached.usd)) {
    return Object.assign({}, cached, { source: (cached.source || "Official pool") + " · last quote" });
  }
  return cached || null;
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
              <strong>{feature || "本功能"}</strong>：官方 PAWLY CA 已上线{" "}
              <code style={{ fontSize: 11 }}>88cCF4cD…MdWn87</code>。
              转账/支付可用 PAWLY；质押合约与流动性池仍按路线图开放。请只认官网与 @pawlypetslover 公布的 CA。
            </p>
            <p style={{ margin: 0, color: "#c9a06a" }}>
              <strong>{feature || "This feature"}</strong>: Official PAWLY CA is live{" "}
              <code style={{ fontSize: 11 }}>88cCF4cD…MdWn87</code>.
              Transfer/payment with PAWLY is enabled; staking contract & LP follow the roadmap. Trust only CA from the official site and @pawlypetslover.
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

/**
 * Gas 提示盒：不写死具体 SOL 数字（网络费/优先费/租金会变）
 * 仅双语说明 + 建议预留；实际费用以钱包确认页为准
 */
function GasEstimateBox({ presetKey, refreshKey }) {
  const [open, setOpen] = useState(false);
  const label = (GAS_PRESETS[presetKey] && GAS_PRESETS[presetKey].label) || presetKey || "";
  return (
    <div
      style={{
        background: "rgba(0,255,157,0.06)",
        border: "1px solid rgba(0,255,157,0.25)",
        borderRadius: 12,
        padding: "10px 14px",
        marginTop: 14,
        marginBottom: 8,
        fontSize: 13,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <span style={{ color: "#00ff9d", fontWeight: 700 }}>
          ⛽ 费用说明 / Fee notes {open ? "▾" : "▸"}
        </span>
        <span style={{ color: "#889", fontSize: 11 }}>{label}</span>
      </button>
      {open ? (
        <div style={{ color: "#c8e6d9", fontSize: 12, lineHeight: 1.55, marginTop: 10 }}>
          · 网络手续费与优先费随拥堵变化，以钱包确认页显示为准。
          <br />
          · Network & priority fees vary; trust the amount shown in your wallet.
          <br />
          · Payment / Charity 代付开启时：网络费和首次收款账户租金都由平台热钱包出，用户只扣 PAWLY。
          <br />
          · With sponsor on, rent + network fee come from the hot wallet; you only spend PAWLY.
          <br />
          · Swap 仍可能需要用户钱包里的 SOL。
          <br />
          · Swap may still need SOL in the user wallet.
          <br />
          {sponsorLive()
            ? "· Payment / Charity 已开 PAWLY 代付（含 ATA 租金）。"
            : "· 未配置热钱包时，首次收款仍可能提示保留少量 SOL。"}
          <br />
          {sponsorLive()
            ? "· Payment / Charity sponsor includes ATA rent."
            : "· Without a sponsor wallet, first-time receive may still ask for a little SOL."}
        </div>
      ) : null}
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

const sheetOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(0,0,0,0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 12px calc(12px + env(safe-area-inset-bottom, 0px))",
};

const sheetPanel = {
  maxWidth: 420,
  width: "100%",
  maxHeight: "min(76dvh, 520px)",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
  margin: "0 auto",
  borderRadius: 18,
  padding: "14px 16px 16px",
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
        // 未注册 PWA：仍写入钱包地址，便于显示链上余额（积分/签到为 0）
        console.log("未找到钱包对应的用户数据 — guest on-chain mode");
        applyUser({
          email: "",
          wallet: addr,
          streak: "0",
          total_pawly: "0",
          points: "0",
          guest: true,
        });
        return;
      }
      const next = {
        email: data.email || "",
        wallet: data.wallet_address || addr,
        streak: String(data.checkin_streak || 0),
        total_pawly: String(data.total_earnd || 0),
        points: String(data.pawly_points || 0),
        guest: false,
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
  return (
    <div style={{ maxWidth: 720, margin: "0 auto 24px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.75rem", color: "#00ff9d" }}>{title}</h1>
      {subtitle && (
        <p style={{ margin: 0, color: "#9aa", fontSize: "0.95rem", lineHeight: 1.5 }}>{subtitle}</p>
      )}
    </div>
  );
}

/** 各功能页底部返回主页 */
function PageFooterNav() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 720, margin: "28px auto 8px", textAlign: "center" }}>
      <button type="button" onClick={() => navigate("/")} style={{ ...ghostBtn, minWidth: 200 }}>
        ← 返回主页 / Home
      </button>
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
  const wallet = usePawlyWallet();
  const navigate = useNavigate();
  const { pwaData, verified, refreshUserData } = useUserData();
  const [balSol, setBalSol] = useState(null);
  const [balUsdc, setBalUsdc] = useState(null);
  const [balUsdt, setBalUsdt] = useState(null);
  const [balPawly, setBalPawly] = useState(null);
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
      setBalPawly(null);
      return;
    }
    setBalLoading(true);
    try {
      const [sol, usdc, usdt, pawly] = await Promise.all([
        fetchTokenBalance(addr, "SOL"),
        fetchTokenBalance(addr, "USDC"),
        fetchTokenBalance(addr, "USDT"),
        fetchTokenBalance(addr, "PAWLY"),
      ]);
      setBalSol(sol);
      setBalUsdc(usdc);
      setBalUsdt(usdt);
      setBalPawly(pawly);
    } catch (_) {
      setBalSol(null);
      setBalUsdc(null);
      setBalUsdt(null);
      setBalPawly(null);
    } finally {
      setBalLoading(false);
    }
  }, [wallet.publicKey, pwaData.wallet]);

  useEffect(() => {
    if (wallet.publicKey) {
      // 立刻写入地址，不等待 Supabase，避免未注册用户空白
      const addr = wallet.publicKey.toString();
      if (!pwaData.wallet || pwaData.wallet !== addr) {
        // keep existing email/points if same wallet registered; refreshUserData will overwrite from DB
      }
      refreshUserData(wallet.publicKey);
      loadChainBalances();
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
    { path: "/charity", icon: "❤️", title: "慈善捐赠 / Charity", desc: "链上捐赠·真转账 / On-chain donate", color: "#ff5252" },
    { path: "/swap", icon: "🔄", title: "交易 / Swap", desc: "Jupiter 实时聚合 / Live Jupiter route", color: "#ff9ecd" },
    { path: "/buy", icon: "💵", title: "买入·入金 / Buy·Deposit", desc: "SOL · USDC · USDT", color: "#ffc107" },
    { path: "/cashout", icon: "🏦", title: "卖出·出金 / Sell·Cash out", desc: "USDC · USDT · SOL → 法币", color: "#42a5f5" },
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

        <LocalWalletEntryButtons embeddedExport={<ExportPawlyWallet />} />


        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ color: "#00ff9d", fontWeight: 700, fontSize: "1.05rem" }}>我的数据 / My Data</div>
              <div style={{ color: "#778", fontSize: "0.8rem", marginTop: 2 }}>链上余额优先 · PWA 可选 / On-chain first · PWA optional</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={onRefresh} style={ghostBtn}>🔄 刷新</button>
              <button type="button" onClick={() => navigate("/chart")} style={ghostBtn}>📈 Chart</button>
            </div>
          </div>

          {(wallet.publicKey || verified || pwaData.wallet) ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#778", fontSize: 12 }}>钱包 / Wallet</div>
                <div style={{ fontFamily: "monospace", fontSize: 13, marginTop: 4, wordBreak: "break-all" }}>
                  {(() => {
                    const w = (wallet.publicKey && wallet.publicKey.toString()) || pwaData.wallet || "";
                    return w ? `${w.slice(0, 4)}…${w.slice(-4)}` : "—";
                  })()}
                </div>
                {pwaData.guest || (!pwaData.email && wallet.publicKey) ? (
                  <div style={{ color: "#fbbf24", fontSize: 11, marginTop: 6 }}>
                    未注册 PWA · 仅链上余额 / Guest · on-chain only
                  </div>
                ) : null}
              </div>
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
                <div style={{ color: "#778", fontSize: 12 }}>PAWLY（链上 / On-chain）</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 4, color: "#00ff9d" }}>
                  {balLoading ? "…" : fmtBal(balPawly)} PAWLY
                </div>
                <div style={{ fontSize: 12, color: "#889", marginTop: 4 }}>
                  {!pwaData.guest && pwaData.email
                    ? `Early credit: ${pwaData.total_pawly || "0"} · Points: ${pwaData.points || "0"}`
                    : "Official mint balance"}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: "#889", margin: 0, fontSize: "0.9rem", lineHeight: 1.6 }}>
              请先连接钱包。无需 PWA 注册也可查看 SOL / USDC / USDT 链上余额。
              <br />
              <span style={{ color: "#667" }}>Connect any wallet to load on-chain balances. PWA registration is optional.</span>
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
          <a href="https://www.pawlypets.online" style={{ ...ghostBtn, display: "inline-block", textDecoration: "none" }}>
            ← 返回 PAWLY 主站 / Back to PWA
          </a>
        </div>


      </div>
    </div>
  );
}

function StakingPage() {
  const { publicKey, connected } = usePawlyWallet();
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
    if (selectedToken === "PAWLY" && !ensurePawlyPoolLive()) return;
    if (!connected) return alert("请先连接钱包\nPlease connect wallet");
    if (!amount || parseFloat(amount) <= 0) return alert("请输入金额\nEnter amount");
    setLoading(true);
    setTimeout(() => {
      alert("Staking 合约尚未部署，真实质押与 APY 待合约上线。\nStaking contract not deployed yet.");
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
          Token / 流动性池已上线；Staking 合约尚未部署，真实 APY 待合约上线。
          <br />
          Token & LP pool are live; staking contract not deployed yet — real APY later.
        </p>
      </div>
      <PageFooterNav />
    </div>
  );
}



const PAY_DRAFT_KEY = "pawly_payment_draft_v1";
const CHARITY_DRAFT_KEY = "pawly_charity_draft_v1";
function saveDraft(key, partial) {
  try {
    const prev = JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key) || "{}");
    const next = { ...prev, ...partial, ts: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(next));
    localStorage.setItem(key, JSON.stringify(next));
  } catch (_) {}
}
function loadDraft(key) {
  try {
    const s = sessionStorage.getItem(key) || localStorage.getItem(key) || "{}";
    return JSON.parse(s);
  } catch (_) {
    return {};
  }
}
function savePayDraft(partial) {
  saveDraft(PAY_DRAFT_KEY, partial);
}
function loadPayDraft() {
  return loadDraft(PAY_DRAFT_KEY);
}
function saveCharityDraft(partial) {
  saveDraft(CHARITY_DRAFT_KEY, partial);
}
function loadCharityDraft() {
  return loadDraft(CHARITY_DRAFT_KEY);
}

/** 从扫码/粘贴文本提取 Solana 地址 */
function extractSolanaAddress(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  const m1 = s.match(/solana:([1-9A-HJ-NP-Za-km-z]{32,44})/i);
  if (m1) return m1[1];
  const m2 = s.match(/pawly:([1-9A-HJ-NP-Za-km-z]{32,44})/i);
  if (m2) return m2[1];
  try {
    if (/^pawly:\/\//i.test(s)) {
      const u = new URL(s.replace(/^pawly:/i, "https://pawly.local"));
      const to = u.searchParams.get("to") || u.searchParams.get("address");
      if (to && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(to)) return to;
    }
  } catch (_) {}
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return s;
  const m3 = s.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  if (m3) {
    try {
      new PublicKey(m3[0]);
      return m3[0];
    } catch (_) {}
  }
  return "";
}

/** 可落地付款码解析：地址 + 币种 + 数量/法币 */
function parsePawlyPayPayload(raw) {
  const out = {
    address: "",
    token: "",
    amount: "",
    fiat: "",
    fiatAmount: "",
    raw: String(raw || "").trim(),
  };
  if (!out.raw) return out;
  try {
    if (out.raw.startsWith("{")) {
      const j = JSON.parse(out.raw);
      out.address = extractSolanaAddress(j.to || j.address || j.wallet || "");
      out.token = String(j.token || j.asset || "").toUpperCase();
      if (j.amount != null) out.amount = String(j.amount);
      if (j.fiat) out.fiat = String(j.fiat).toUpperCase();
      if (j.fiatAmount != null) out.fiatAmount = String(j.fiatAmount);
      if (out.address) return out;
    }
  } catch (_) {}
  try {
    let s = out.raw;
    if (/^pawly:\/\//i.test(s)) s = s.replace(/^pawly:/i, "https://pawly.local");
    if (/^solana:/i.test(out.raw) || /^https?:\/\//i.test(s) || s.includes("://")) {
      const u = new URL(/^solana:/i.test(out.raw) ? out.raw.replace(/^solana:/i, "https://solana.local/") : s);
      const toParam = u.searchParams.get("to") || u.searchParams.get("address") || u.searchParams.get("recipient");
      if (toParam) out.address = extractSolanaAddress(toParam);
      else {
        const pathAddr = (u.pathname || "").replace(/^\//, "");
        out.address = extractSolanaAddress(pathAddr || out.raw);
      }
      out.token = String(u.searchParams.get("token") || u.searchParams.get("spl-token") || "").toUpperCase();
      if (u.searchParams.get("amount")) out.amount = u.searchParams.get("amount");
      if (u.searchParams.get("fiat")) out.fiat = u.searchParams.get("fiat").toUpperCase();
      if (u.searchParams.get("fiatAmount")) out.fiatAmount = u.searchParams.get("fiatAmount");
      if (out.address) return out;
    }
  } catch (_) {}
  out.address = extractSolanaAddress(out.raw);
  return out;
}

function buildPawlyPayPayload({ address, token, amount, fiat, fiatAmount }) {
  if (!address) return "";
  const q = new URLSearchParams();
  q.set("to", address);
  if (token) q.set("token", token);
  if (amount) q.set("amount", String(amount));
  if (fiat && fiatAmount) {
    q.set("fiat", fiat);
    q.set("fiatAmount", String(fiatAmount));
  }
  return "pawly://pay?" + q.toString();
}

function qrCodeImageUrl(data, size = 240) {
  return (
    "https://api.qrserver.com/v1/create-qr-code/?size=" +
    size +
    "x" +
    size +
    "&margin=8&data=" +
    encodeURIComponent(data)
  );
}

function MyQrModal({ address, onClose }) {
  const [fiatCode, setFiatCode] = useState("MYR");
  const [fiatAmount, setFiatAmount] = useState("");
  const [token, setToken] = useState("USDC");
  if (!address) return null;

  const payload = buildPawlyPayPayload({
    address,
    token,
    fiat: fiatAmount ? fiatCode : "",
    fiatAmount: fiatAmount || "",
  });
  const img = qrCodeImageUrl(payload || address, 260);

  const copy = async () => {
    const text = payload || address;
    try {
      await navigator.clipboard.writeText(text);
      alert("已复制付款码 / Pay code copied");
    } catch (_) {
      alert(text);
    }
  };

  return (
    <div
      role="dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          background: "linear-gradient(165deg, #1a1030, #0d0d18)",
          border: "1px solid rgba(0,255,157,0.35)",
          borderRadius: 18,
          padding: 20,
          color: "#e8fff5",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <strong style={{ fontSize: 16 }}>收款码 / Receive QR</strong>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "#ccc",
              width: 32,
              height: 32,
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ color: "#889", fontSize: 12, marginTop: 0, lineHeight: 1.45, textAlign: "left" }}>
          填写应收法币 → 生成可付码。对方扫码后自动带入地址与金额，确认后链上转账（USDC/USDT/SOL）。
          <br />
          Set fiat due → scannable code. Scan auto-fills → confirm → real on-chain transfer.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <select
            value={fiatCode}
            onChange={(e) => setFiatCode(e.target.value)}
            style={{
              flex: 1,
              minWidth: 90,
              background: "#12121f",
              border: "1px solid #333",
              borderRadius: 10,
              padding: 8,
              color: "#fff",
            }}
          >
            {(typeof PAWLY_FIATS !== "undefined" ? PAWLY_FIATS : [{ code: "MYR" }, { code: "SGD" }, { code: "JPY" }]).map((f) => (
              <option key={f.code} value={f.code}>
                {f.code}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            value={fiatAmount}
            onChange={(e) => setFiatAmount(e.target.value)}
            placeholder="应收法币 / Fiat due"
            style={{
              flex: 1,
              minWidth: 100,
              background: "#12121f",
              border: "1px solid #333",
              borderRadius: 10,
              padding: 8,
              color: "#fff",
            }}
          />
          <select
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{
              minWidth: 88,
              background: "#12121f",
              border: "1px solid #333",
              borderRadius: 10,
              padding: 8,
              color: "#fff",
            }}
          >
            {["USDC", "USDT", "SOL", "PAWLY"].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
        <img
          src={img}
          alt="Receive QR"
          width={260}
          height={260}
          style={{
            width: 260,
            height: 260,
            maxWidth: "100%",
            borderRadius: 12,
            background: "#fff",
            margin: "8px auto",
            display: "block",
          }}
        />
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            wordBreak: "break-all",
            color: "#b8f5d8",
            margin: "10px 0",
            textAlign: "left",
          }}
        >
          {payload}
        </p>
        <button type="button" onClick={copy} style={{ ...neonBtn, width: "100%", marginBottom: 8 }}>
          复制付款码 / Copy Pay Code
        </button>
        <p style={{ color: "#667", fontSize: 11, margin: 0, lineHeight: 1.45, textAlign: "left" }}>
          对方若只有 SOL，可先 Swap 成 USDC 再扫码支付。不填法币则为纯地址码。
          <br />
          Payer can Swap to USDC first. Empty fiat = address-only code.
        </p>
      </div>
    </div>
  );
}



/** 扫码环境检测：用于提示文案（不改变签名逻辑） */
function detectScanEnv() {
  if (typeof navigator === "undefined") {
    return { isIOS: false, isAndroid: false, inWalletBrowser: false, label: "browser" };
  }
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const inWalletBrowser =
    /Phantom/i.test(ua) ||
    /Solflare/i.test(ua) ||
    /Trust/i.test(ua) ||
    /Coinbase/i.test(ua) ||
    /cbwallet/i.test(ua) ||
    /WebView/i.test(ua);
  let label = isIOS ? "iOS" : isAndroid ? "Android" : "Desktop";
  if (inWalletBrowser) {
    if (/Phantom/i.test(ua)) label += " · Phantom in-app";
    else if (/Solflare/i.test(ua)) label += " · Solflare in-app";
    else if (/Trust/i.test(ua)) label += " · Trust in-app";
    else if (/Coinbase|cbwallet/i.test(ua)) label += " · Coinbase in-app";
    else label += " · Wallet WebView";
  }
  return { isIOS, isAndroid, inWalletBrowser, label };
}

function cameraFailMessage(kind, detail) {
  const env = detectScanEnv();
  const d = detail ? "\n" + detail : "";
  if (kind === "permission") {
    if (env.isIOS) {
      return (
        "相机权限被拒绝。请到「设置 → Safari（或当前浏览器）→ 相机」允许后重试；或使用相册/粘贴地址。\n" +
        "Camera denied. Settings → Browser → Camera → Allow; or use Gallery / Paste." +
        d
      );
    }
    if (env.isAndroid) {
      return (
        "相机权限被拒绝。请在系统设置里允许浏览器/钱包的相机权限，或改用相册/粘贴地址。\n" +
        "Camera denied. Allow camera for this app in Android settings; or use Gallery / Paste." +
        d
      );
    }
    return (
      "相机权限被拒绝，请允许后重试，或使用相册/粘贴地址。\nCamera permission denied. Allow access or use Gallery / Paste." +
      d
    );
  }
  if (kind === "notfound") {
    return (
      "未找到可用摄像头。请改用「相册」识别二维码或「粘贴地址」。\n" +
      "No camera found. Use Gallery or Paste address." +
      d
    );
  }
  // generic start failure
  if (env.inWalletBrowser) {
    return (
      "当前在钱包内置浏览器中，摄像头常被系统限制（" +
      env.label +
      "）。\n请优先使用「相册」或「粘贴地址」；完整摄像头请用系统浏览器（Chrome/Safari）打开 https://www.pawlypets.online/dapp 再连接钱包。\n\n" +
      "In-wallet browser often blocks camera (" +
      env.label +
      "). Prefer Gallery or Paste. For live camera, open the dApp in Chrome/Safari, then connect your wallet." +
      d
    );
  }
  if (env.isIOS) {
    return (
      "无法启动摄像头。请用 Safari 打开本站并允许相机，或改用相册/粘贴。\n" +
      "Cannot start camera. Open in Safari and allow camera, or use Gallery / Paste." +
      d
    );
  }
  if (env.isAndroid) {
    return (
      "无法启动摄像头。请用 Chrome 打开本站并允许相机，或改用相册/粘贴。\n" +
      "Cannot start camera. Open in Chrome and allow camera, or use Gallery / Paste." +
      d
    );
  }
  return (
    "无法启动摄像头，请改用相册识别或粘贴地址。\nCannot start camera. Use Gallery or Paste." +
    d
  );
}

function loadHtml5QrcodeLib() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.Html5Qrcode) {
      resolve(window.Html5Qrcode);
      return;
    }
    const existing = document.querySelector("script[data-pawly-html5-qrcode]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Html5Qrcode));
      existing.addEventListener("error", () => reject(new Error("html5-qrcode load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js";
    s.async = true;
    s.dataset.pawlyHtml5Qrcode = "1";
    s.onload = () => {
      if (window.Html5Qrcode) resolve(window.Html5Qrcode);
      else reject(new Error("Html5Qrcode missing after load"));
    };
    s.onerror = () => reject(new Error("Failed to load html5-qrcode from CDN"));
    document.head.appendChild(s);
  });
}


/** 从图片文件解码二维码（截图/相册）——多路径回退，不依赖实时摄像头 */
async function loadJsQRLib() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.jsQR) {
      resolve(window.jsQR);
      return;
    }
    const existing = document.querySelector("script[data-pawly-jsqr]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.jsQR));
      existing.addEventListener("error", () => reject(new Error("jsQR load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    s.async = true;
    s.dataset.pawlyJsqr = "1";
    s.onload = () => {
      if (window.jsQR) resolve(window.jsQR);
      else reject(new Error("jsQR missing"));
    };
    s.onerror = () => reject(new Error("Failed to load jsQR"));
    document.head.appendChild(s);
  });
}

function fileToImageBitmap(file) {
  return new Promise(async (resolve, reject) => {
    try {
      if (typeof createImageBitmap === "function") {
        const bmp = await createImageBitmap(file);
        resolve(bmp);
        return;
      }
    } catch (_) {}
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Cannot read image"));
    };
    img.src = url;
  });
}

async function decodeQrWithCanvas(file) {
  const img = await fileToImageBitmap(file);
  const w = img.width || img.naturalWidth || 0;
  const h = img.height || img.naturalHeight || 0;
  if (!w || !h) throw new Error("Empty image");

  // 截图里二维码可能偏小：多尺度尝试
  const scales = [1, 1.5, 2, 0.75, 0.5];
  const jsQR = await loadJsQRLib();

  for (const scale of scales) {
    const cw = Math.max(32, Math.round(w * scale));
    const ch = Math.max(32, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;
    ctx.drawImage(img, 0, 0, cw, ch);
    const imageData = ctx.getImageData(0, 0, cw, ch);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    if (result?.data) return result.data;
  }
  throw new Error("jsQR no QR found");
}

async function decodeQrWithBarcodeDetector(file) {
  if (typeof window === "undefined" || typeof window.BarcodeDetector !== "function") {
    throw new Error("BarcodeDetector not supported");
  }
  const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
  const bmp = await fileToImageBitmap(file);
  const codes = await detector.detect(bmp);
  if (codes && codes.length && codes[0].rawValue) return codes[0].rawValue;
  throw new Error("BarcodeDetector no QR");
}

async function decodeQrFromImageFile(file) {
  if (!file) throw new Error("No file");
  const errors = [];

  // 1) Chrome/Android 原生 BarcodeDetector（对截图较稳）
  try {
    return await decodeQrWithBarcodeDetector(file);
  } catch (e) {
    errors.push("BD:" + (e?.message || e));
  }

  // 2) html5-qrcode scanFile（showImage=false，避免部分 WebView 白屏）
  try {
    const Html5Qrcode = await loadHtml5QrcodeLib();
    const tempId = "pawly-qr-file-" + Date.now();
    let host = document.getElementById(tempId);
    if (!host) {
      host = document.createElement("div");
      host.id = tempId;
      host.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden;";
      document.body.appendChild(host);
    }
    const scanner = new Html5Qrcode(tempId);
    try {
      const text = await scanner.scanFile(file, false);
      try {
        await scanner.clear();
      } catch (_) {}
      try {
        host.remove();
      } catch (_) {}
      if (text) return text;
    } catch (e) {
      try {
        await scanner.clear();
      } catch (_) {}
      try {
        host.remove();
      } catch (_) {}
      throw e;
    }
  } catch (e) {
    errors.push("H5:" + (e?.message || e));
  }

  // 3) jsQR + canvas 多尺度（截图兜底）
  try {
    return await decodeQrWithCanvas(file);
  } catch (e) {
    errors.push("JS:" + (e?.message || e));
  }

  throw new Error(
    "无法从图片识别二维码 / Cannot decode QR from image\n" + errors.slice(0, 3).join(" | ")
  );
}

function ScanQrModal({ onDetected, onClose }) {
  const [manual, setManual] = useState("");
  const [camErr, setCamErr] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loadingLib, setLoadingLib] = useState(false);
  const scannerRef = useRef(null);
  const readerId = "pawly-qr-reader";

  const stopCam = async () => {
    try {
      if (scannerRef.current) {
        const sc = scannerRef.current;
        scannerRef.current = null;
        if (sc.isScanning) await sc.stop();
        try {
          sc.clear();
        } catch (_) {}
      }
    } catch (_) {}
    setScanning(false);
  };

  const finish = async (text) => {
    const parsed = parsePawlyPayPayload(text);
    const addr = parsed.address || extractSolanaAddress(text);
    if (!addr) {
      alert("未识别到有效 Solana 地址或付款码\nNo valid Solana address / pay code");
      return;
    }
    try {
      new PublicKey(addr);
    } catch (_) {
      alert("地址无效 / Invalid address");
      return;
    }
    await stopCam();
    if (typeof onDetected === "function") {
      try {
        onDetected({
          address: addr,
          token: parsed.token,
          amount: parsed.amount,
          fiat: parsed.fiat,
          fiatAmount: parsed.fiatAmount,
          raw: text,
        });
      } catch (_) {
        onDetected(addr);
      }
    }
    onClose();
  };

  useEffect(() => {
    return () => {
      stopCam();
    };
  }, []);

  const startCam = async () => {
    setCamErr("");
    setLoadingLib(true);
    try {
      // 1) iOS Safari：必须在用户点击手势里先申请相机，才会弹出系统权限框
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "此浏览器不支持相机 API / Camera API not supported"
        );
      }
      let preStream = null;
      try {
        preStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (permErr) {
        // 再试一次不带 facingMode（部分 iOS 更稳）
        try {
          preStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        } catch (permErr2) {
          const m = permErr2?.name || permErr?.name || "";
          const msg = permErr2?.message || permErr?.message || String(permErr2);
          if (/NotAllowedError|Permission|Denied/i.test(m + msg)) {
            throw new Error(cameraFailMessage("permission"));
          }
          if (/NotFoundError|DevicesNotFound/i.test(m + msg)) {
            throw new Error(cameraFailMessage("notfound"));
          }
          throw permErr2 || permErr;
        }
      }
      // 2) 立刻释放预申请的轨道，再交给 html5-qrcode 正式占用
      if (preStream) {
        preStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch (_) {}
        });
        preStream = null;
      }

      // 3) 加载库并开始扫描
      const Html5Qrcode = await loadHtml5QrcodeLib();
      await stopCam();
      const scanner = new Html5Qrcode(readerId);
      scannerRef.current = scanner;
      setScanning(true);

      // iOS：优先 environment；失败则枚举摄像头选后置
      const tryStart = async (config) => {
        await scanner.start(
          config,
          { fps: 8, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          async (decodedText) => {
            await finish(decodedText);
          },
          () => {}
        );
      };

      try {
        await tryStart({ facingMode: "environment" });
      } catch (startErr) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length) {
            // 选最后一个常为后置
            const camId = cameras[cameras.length - 1].id;
            await tryStart(camId);
          } else {
            await tryStart({ facingMode: "user" });
          }
        } catch (startErr2) {
          throw startErr2 || startErr;
        }
      }
    } catch (e) {
      setScanning(false);
      const msg = e?.message || String(e);
      if (/NotAllowedError|Permission|denied|拒绝/i.test(msg)) {
        setCamErr(cameraFailMessage("permission", msg));
      } else if (/NotFoundError|no camera|Requested device|未找到/i.test(msg)) {
        setCamErr(cameraFailMessage("notfound", msg));
      } else {
        setCamErr(cameraFailMessage("generic", msg));
      }
    } finally {
      setLoadingLib(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCamErr("");
    setLoadingLib(true);
    try {
      await stopCam();
      // 截图 / 相册：多解码器回退（BarcodeDetector → html5-qrcode → jsQR）
      const decoded = await decodeQrFromImageFile(file);
      await finish(decoded);
    } catch (err) {
      setCamErr(
        "相册/截图识别失败。请选清晰、完整的二维码图，或改用粘贴地址。\n" +
          "Gallery/screenshot decode failed. Use a clear full QR or paste address.\n" +
          (err?.message || String(err))
      );
    } finally {
      setLoadingLib(false);
      try {
        e.target.value = "";
      } catch (_) {}
    }
  };

  return (
    <div
      role="dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCam();
          onClose();
        }
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          background: "linear-gradient(165deg, #1a1030, #0d0d18)",
          border: "1px solid rgba(0,255,157,0.35)",
          borderRadius: 18,
          padding: 20,
          color: "#e8fff5",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <strong style={{ fontSize: 16 }}>扫码 / Scan QR</strong>
          <button
            type="button"
            onClick={() => {
              stopCam();
              onClose();
            }}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "#ccc",
              width: 32,
              height: 32,
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div
          id={readerId}
          style={{
            width: "100%",
            minHeight: scanning ? 240 : 0,
            marginBottom: scanning ? 10 : 0,
            borderRadius: 12,
            overflow: "hidden",
            background: scanning ? "#000" : "transparent",
          }}
        />

        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={loadingLib}
            onClick={scanning ? () => stopCam() : startCam}
            style={{ ...ghostBtn, flex: 1, minWidth: 120, opacity: loadingLib ? 0.6 : 1 }}
          >
            {loadingLib
              ? "加载中… / Loading…"
              : scanning
                ? "停止摄像头 / Stop"
                : "摄像头扫码 / Camera"}
          </button>
          <label
            style={{
              ...ghostBtn,
              flex: 1,
              minWidth: 120,
              textAlign: "center",
              cursor: "pointer",
              boxSizing: "border-box",
              opacity: loadingLib ? 0.6 : 1,
            }}
          >
            相册/截图 / Gallery
            {/* 不要加 capture：capture 会强制打开相机，导致无法选相册截图 */}
            <input
              type="file"
              accept="image/*,image/png,image/jpeg,image/jpg,image/webp,image/heic"
              onChange={onFile}
              style={{ display: "none" }}
              disabled={loadingLib}
            />
          </label>
        </div>
        {camErr ? (
          <p style={{ color: "#ff8a80", fontSize: 12, marginTop: 0, lineHeight: 1.45 }}>{camErr}</p>
        ) : (
          <p style={{ color: "#667", fontSize: 11, marginTop: 0, lineHeight: 1.45 }}>
            {detectScanEnv().inWalletBrowser
              ? "检测到钱包内浏览器：实时摄像头可能不可用，请优先「相册」或「粘贴地址」。\nIn-wallet browser detected — prefer Gallery or Paste."
              : "系统浏览器下可点摄像头；首次请允许权限。失败时请用相册/粘贴。\nIn system browser, allow camera when prompted; else use Gallery / Paste."}
          </p>
        )}

        <p style={{ color: "#99a", fontSize: 13, margin: "8px 0" }}>
          或粘贴地址 / Or paste address
        </p>
        <input
          type="text"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Solana address"
          style={{
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 10,
            background: "#12121f",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 12,
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 13,
          }}
        />
        <button type="button" onClick={() => finish(manual)} style={{ ...neonBtn, width: "100%" }}>
          确认填入 / Use Address
        </button>
      </div>
    </div>
  );
}

function PaymentPage() {
  const { publicKey, connected, sendTransaction, wallet, signTransaction, activateEmailWallet } = usePawlyWallet();
  const { pwaData } = useUserData();
  const [payToken, setPayToken] = useState("USDC");
  const [toAddress, setToAddress] = useState(() => loadPayDraft().toAddress || "");
  const [amount, setAmount] = useState(() => loadPayDraft().amount || "");
  const [realBalance, setRealBalance] = useState(0);
  const [fiatRates, setFiatRates] = useState(null);
  const [solUsd, setSolUsd] = useState(null);
  const [solSource, setSolSource] = useState("");
  const [pawlyUsd, setPawlyUsd] = useState(function () {
    const c = readCachedPawlyPx();
    return c && c.usd ? c.usd : null;
  });
  const [pawlySource, setPawlySource] = useState(function () {
    const c = readCachedPawlyPx();
    return c && c.source ? c.source : "";
  });
  const [rateLoading, setRateLoading] = useState(true);
  const [showRates, setShowRates] = useState(false);
  const [fiatCode, setFiatCode] = useState("MYR");
  const [fiatAmount, setFiatAmount] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [lastSig, setLastSig] = useState("");
  const [txError, setTxError] = useState("");
  const [showMyQr, setShowMyQr] = useState(false);
  const [showScanQr, setShowScanQr] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [lastSettleOrder, setLastSettleOrder] = useState("");
  const { setVisible: setWalletModalVisible } = useWalletModal();

  useEffect(() => {
    savePayDraft({ toAddress, amount, payToken });
  }, [toAddress, amount, payToken]);

  const FIATS = PAWLY_FIATS;

  const maxPawly = parseFloat(pwaData?.total_pawly) || 0;
  const payWalletAddr =
    (publicKey && publicKey.toString()) || pwaData?.wallet || "";

  useEffect(() => {
    let alive = true;
    (async () => {
      
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

  // 法币金额 → 自动换算链上支付数量
  useEffect(() => {
    const cryptoAmt = fiatToCryptoAmount(fiatAmount, fiatCode, fiatRates, payToken, solUsd, pawlyUsd);
    if (cryptoAmt == null) return;
    const decimals = payToken === "SOL" ? 6 : payToken === "PAWLY" ? 2 : 4;
    setAmount(Number(cryptoAmt.toFixed(decimals)).toString());
  }, [fiatAmount, fiatCode, fiatRates, payToken, solUsd, pawlyUsd]);

  const fetchRates = async () => {
    setRateLoading(true);
    try {
      const results = await Promise.allSettled([
        fetchFiatRatesUsd(),
        fetchSolUsdPrice(),
        fetchPawlyUsdPrice(),
      ]);
      const fiat = results[0].status === "fulfilled" ? results[0].value : null;
      const sol = results[1].status === "fulfilled" ? results[1].value : null;
      const pawly = results[2].status === "fulfilled" ? results[2].value : null;
      if (fiat?.rates) setFiatRates(fiat.rates);
      else setFiatRates(null);
      if (sol?.usd) {
        setSolUsd(sol.usd);
        setSolSource(sol.source || "");
      } else {
        setSolUsd(null);
        setSolSource("");
      }
      if (pawly?.usd) {
        setPawlyUsd(pawly.usd);
        setPawlySource(pawly.source || "Official pool");
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
    const t = setInterval(fetchRates, 45000);
    return () => clearInterval(t);
  }, []);

  const toUsdcValue = (tok, n) => {
    if (!n || n <= 0) return 0;
    if (tok === "USDC" || tok === "USDT") return n;
    if (tok === "PAWLY") return pawlyUsd ? n * pawlyUsd : 0;
    if (tok === "SOL") return solUsd ? n * solUsd : 0;
    return 0;
  };

  const amt = parseFloat(amount) || 0;
  const usdcEq = toUsdcValue(payToken, amt);
  const fiatRate = fiatRates?.[fiatCode];
  const fiatEq = fiatRate != null ? usdcEq * fiatRate : null;
  const fiatMeta = FIATS.find((f) => f.code === fiatCode) || FIATS[0];

  const ensureSigningWallet = async () => {
    if (connected && publicKey && typeof sendTransaction === "function") return true;
    savePayDraft({ toAddress, amount, payToken });
    alert(
      "请连接 Phantom / Solflare，或使用本机已导入的密钥。\n不会要求登录 Privy。\n\nConnect Phantom / Solflare, or use a key already saved on this device. No Privy login."
    );
    try {
      setWalletModalVisible(true);
    } catch (_) {}
    return false;
  };

  const confirm = async () => {
    // 选 PAWLY 点确认 → 立刻弹窗（不依赖地址/金额）
    if (payToken === "PAWLY" && !ensurePawlyPoolLive()) return;
    if (!toAddress.trim()) {
      alert("请输入收款钱包地址\nPlease enter recipient wallet address");
      return;
    }
    if (!ensureSigningWallet()) return;
    if (!amt || amt <= 0) {
      alert("请输入有效金额\nPlease enter a valid amount");
      return;
    }
    if (amt > realBalance + 1e-12) {
      alert("余额不足\nInsufficient balance");
      return;
    }
    if (sponsorLive() && payToken === "PAWLY") {
      try {
        const feeQ = await estimatePawlyGasFeeUi();
        if (amt + (feeQ.ui || 0) > realBalance + 1e-12) {
          alert(
            "PAWLY 余额需覆盖货款 + 代付手续费约 " +
              feeQ.ui +
              " PAWLY\nNeed extra ~" +
              feeQ.ui +
              " PAWLY for sponsored gas"
          );
          return;
        }
      } catch (_) {}
    }
    setTxLoading(true);
    setLastSig("");
    setTxError("");
    try {
      const sig = await sendTokenTransfer({
        publicKey,
        sendTransaction,
        wallet,
        signTransaction,
        token: payToken,
        toAddress,
        uiAmount: amt,
      });
      setLastSig(sig);
      // 先记 pending，由 Edge/RPC 同步为 success|failed（以链为准）
      await logDappOnchainEvent({
        wallet: publicKey.toString(),
        event_type: "payment",
        token: payToken,
        amount: amt,
        counterparty: toAddress.trim(),
        tx_sig: sig,
        status: "pending",
      });
      await assertTxSuccess(sig);
      alert(
        `✅ 链上成功 / On-chain success\n\n${amt} ${payToken}\n→ ${toAddress.slice(0, 8)}…${toAddress.slice(-6)}\n\nTx: ${sig}\n\nhttps://solscan.io/tx/${sig}`
      );
      const bal = await fetchTokenBalance(publicKey, payToken);
      setRealBalance(bal);
      setAmount("");
    } catch (e) {
      console.error(e);
      const em = e?.message || String(e);
      setTxError(em);
      try {
        alert(`交易失败 / Transaction failed\n\n${em}`);
      } catch (_) {}
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div style={pageWrap}>
      <PageHeader
        title="💳 支付·转账 / Payment·Transfer"
        subtitle="法币计价 · 稳定币结算 · 扫码直付 / Fiat price · stablecoin settle · scan to pay"
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
                opacity: 1,
              }}
            >
              {t}
              
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

        <div
          style={{
            background: "rgba(0,255,157,0.06)",
            border: "1px solid rgba(0,255,157,0.25)",
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <details style={{ marginBottom: 8 }}>
            <summary style={{ color: "#00ff9d", fontWeight: 700, fontSize: 13, cursor: "pointer", listStyle: "none" }}>
              法币计价 / Fiat pricing ▸
            </summary>
            <p style={{ color: "#889", fontSize: 11, margin: "8px 0 0", lineHeight: 1.45 }}>
              输入对方要的法币金额，系统按今日汇率算出应付 USDC/USDT（或 SOL）。实际链上转的是加密资产。
              <br />
              Enter the fiat amount requested → auto crypto amount. On-chain settlement stays USDC/USDT/SOL.
            </p>
          </details>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <select
              value={fiatCode}
              onChange={(e) => setFiatCode(e.target.value)}
              style={{
                flex: 1,
                minWidth: 120,
                background: "#12121f",
                border: "1px solid #333",
                borderRadius: 10,
                padding: 10,
                color: "#fff",
              }}
            >
              {FIATS.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.symbol} {f.code} — {f.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={fiatAmount}
              onChange={(e) => setFiatAmount(e.target.value)}
              placeholder={`金额 / Amount (${fiatCode})`}
              style={{
                flex: 1,
                minWidth: 120,
                background: "#12121f",
                border: "1px solid #333",
                borderRadius: 10,
                padding: 10,
                color: "#fff",
                fontSize: "1.05rem",
              }}
            />
          </div>
          <div style={{ color: "#b8f5d8", fontSize: 12, lineHeight: 1.5 }}>
            {fiatRates?.[fiatCode]
              ? `今日 / Today: 1 USD ≈ ${Number(fiatRates[fiatCode]).toFixed(4)} ${fiatCode}`
              : rateLoading
                ? "汇率加载中… / Loading rates…"
                : "请点「刷新汇率」/ Refresh rates"}
            {fiatAmount && fiatRates?.[fiatCode] ? (
              <>
                <br />
                {fiatAmount} {fiatCode} ≈{" "}
                <strong style={{ color: "#00ff9d" }}>
                  {(Number(fiatAmount) / Number(fiatRates[fiatCode])).toFixed(4)} USDC
                </strong>
                {" "}（将写入下方支付数量 / fills amount below）
              </>
            ) : null}
          </div>
          {(payToken === "SOL" || payToken === "PAWLY") && (
            <p style={{ color: "#fbbf24", fontSize: 11, margin: "8px 0 0", lineHeight: 1.45 }}>
              提示：商户常用 USDC/USDT。若余额只有 SOL/PAWLY，可先到「交易/Swap」换成 USDC 再付。
              <br />
              Tip: prefer USDC/USDT. If you only hold SOL/PAWLY, Swap first.
            </p>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ color: "#99a", fontSize: 13 }}>支付数量 / Amount ({payToken})</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#667", fontSize: 12 }}>
              可用 / Avail: {fmtBal(realBalance)} {payToken}
            </span>
            <button
              type="button"
              onClick={() => {
                setFiatAmount("");
                setAmount(String(realBalance || 0));
              }}
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
          onChange={(e) => {
            setFiatAmount("");
            setAmount(e.target.value);
          }}
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
            <div style={{ color: "#667", fontSize: 12, marginBottom: 8, lineHeight: 1.45 }}>
              {pawlyUsd
                ? `PAWLY ≈ $${Number(pawlyUsd).toFixed(6)} USDC · ${pawlySource || "Official pool"}`
                : "Reading official PAWLY/USDC pool…"}
            </div>
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
          onClick={() => {
            if (!payWalletAddr) {
              alert("请先连接钱包\nConnect wallet first");
              try {
                setWalletModalVisible(true);
              } catch (_) {}
              return;
            }
            setShowSettle(true);
          }}
          style={{
            ...ghostBtn,
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 12,
            padding: "12px 16px",
          }}
        >
          法币结算（不托管）/ Fiat settle
        </button>
        {lastSettleOrder ? (
          <p style={{ color: "#90caf9", fontSize: 11, margin: "-4px 0 12px", textAlign: "center" }}>
            最近订单 / Last order: {lastSettleOrder}
          </p>
        ) : null}


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
        <p
          style={{
            color: connected && publicKey && sendTransaction ? "#00c853" : "#ffb74d",
            fontSize: 12,
            margin: "8px 0 4px",
            textAlign: "center",
          }}
        >
          {connected && publicKey && sendTransaction
            ? "✓ 签名钱包已连接 — 点确认将向当前钱包请求签名 / Signing wallet ready (any platform)"
            : "⚠ 未连接 — 点确认将打开多钱包选择（地址已保留） / Tap Confirm to open multi-wallet selector"}
        </p>
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

        <div style={{ display: "flex", gap: 10, marginTop: 12, marginBottom: 4 }}>
          <button
            type="button"
            onClick={() => {
              if (!payWalletAddr) {
                alert("请先连接钱包\nPlease connect wallet first");
                return;
              }
              setShowMyQr(true);
            }}
            style={{ ...ghostBtn, flex: 1, boxSizing: "border-box" }}
          >
            我的二维码 / My QR
          </button>
          <button
            type="button"
            onClick={() => setShowScanQr(true)}
            style={{ ...ghostBtn, flex: 1, boxSizing: "border-box" }}
          >
            扫码 / Scan QR
          </button>
        </div>

        {showMyQr && (
          <MyQrModal address={payWalletAddr} onClose={() => setShowMyQr(false)} />
        )}
        {showScanQr && (
          <ScanQrModal
            onDetected={(payload) => {
              const p = typeof payload === "string" ? { address: payload } : payload || {};
              if (p.address) setToAddress(p.address);
              if (p.token && ["SOL", "USDC", "USDT", "PAWLY"].includes(p.token)) {
                if (typeof setPayToken === "function") setPayToken(p.token);
                else if (typeof setToken === "function") setToken(p.token);
              }
              if (p.fiat && typeof setFiatCode === "function") setFiatCode(p.fiat);
              if (p.fiatAmount && typeof setFiatAmount === "function") {
                setFiatAmount(String(p.fiatAmount));
              } else if (p.amount && typeof setAmount === "function") {
                if (typeof setFiatAmount === "function") setFiatAmount("");
                setAmount(String(p.amount));
              }
            }}
            onClose={() => setShowScanQr(false)}
          />
        )}

        {txError && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "12px 14px",
              background: "rgba(244,67,54,0.12)",
              border: "1px solid rgba(244,67,54,0.55)",
              borderRadius: 12,
              color: "#ffcdd2",
              fontSize: 13,
              lineHeight: 1.5,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            <div style={{ color: "#ff8a80", fontWeight: 800, marginBottom: 6 }}>交易错误 / Tx Error</div>
            {txError}
            <button
              type="button"
              onClick={() => setTxError("")}
              style={{
                marginTop: 10,
                display: "block",
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#eee",
                cursor: "pointer",
              }}
            >
              关闭 / Dismiss
            </button>
          </div>
        )}

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
          SOL / USDC / USDT / PAWLY 为真实链上转账（官方 CA 已接入）。汇率仅供参考。
          <br />
          SOL / USDC / USDT / PAWLY are live on-chain transfers (official CA integrated). Rates are reference only.
        </p>
      </div>

      
        {showSettle && (
          <div
            role="dialog"
            style={sheetOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowSettle(false);
            }}
          >
            <div
              style={{
                ...sheetPanel,
                background: "linear-gradient(165deg,#0d1b2a,#0d0d18)",
                border: "1px solid rgba(66,165,245,0.4)",
                color: "#e3f2fd",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <strong style={{ fontSize: 16 }}>选择结算通道 / Off-ramp</strong>
                <button type="button" onClick={() => setShowSettle(false)} style={{ ...ghostBtn, padding: "4px 10px" }}>
                  ✕
                </button>
              </div>
              <p style={{ color: "#90a4ae", fontSize: 12, lineHeight: 1.5, marginTop: 0 }}>
                将钱包内 USDC/USDT/SOL 通过第三方通道换成银行/电子钱包法币。将打开第三方页面；你在对方完成卖出/出金。PAWLY 只下单并跳转，资金不经过 PAWLY。
                <br />
                Sell crypto via a third-party channel. A third-party page will open; you complete the sell there. PAWLY only creates an order and redirects — no custody.
              </p>
              <p style={{ color: "#bbb", fontSize: 12, marginBottom: 10 }}>
                预计 / From: <strong>{amount || "—"} {payToken}</strong>
                {fiatAmount ? (
                  <>
                    {" "}
                    · 法币参考 / Fiat ref: {fiatAmount} {fiatCode}
                  </>
                ) : null}
              </p>
              {[
                { id: "moonpay_sell", label: "MoonPay Sell", sub: "Card / bank payout (where available)" },
                { id: "transak_sell", label: "Transak Sell", sub: "SELL · Solana USDC/USDT/SOL" },
                { id: "ramp_sell", label: "Ramp Off-ramp", sub: "OFFRAMP flow" },
                { id: "alchemy_sell", label: "Alchemy Pay", sub: "Sell / ramp" },
                { id: "luno_sell", label: "Luno", sub: "MY/SEA exchange" },
                { id: "changenow_sell", label: "ChangeNOW", sub: "Crypto → fiat gateway" },
                { id: "wallet_sell", label: "Wallet App Sell", sub: "Phantom / Solflare 内卖出" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    try {
                      const settleToken = ["USDC", "USDT", "SOL"].includes(payToken)
                        ? payToken
                        : "USDC";
                      if (payToken === "PAWLY") {
                        alert(
                          "请先 Swap PAWLY→USDC，再用法币结算。\nSwap PAWLY to USDC first, then settle."
                        );
                        return;
                      }
                      const oid = openOfframpPlatform(
                        p.id,
                        payWalletAddr,
                        settleToken,
                        amount,
                        fiatCode
                      );
                      if (oid) setLastSettleOrder(oid);
                      setShowSettle(false);
                    } catch (err) {
                      alert(err?.message || String(err));
                    }
                  }}
                  style={{
                    ...ghostBtn,
                    width: "100%",
                    boxSizing: "border-box",
                    marginBottom: 8,
                    textAlign: "left",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#e3f2fd" }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: "#789" }}>{p.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

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
      <PageFooterNav />
    </div>
  );
}

function SwapPage() {
  const { connected, publicKey, sendTransaction, wallet } = usePawlyWallet();
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
  const [txError, setTxError] = useState("");

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
      // 池未上线：仅固定比例估算，不可兑换
      if (!PAWLY_POOL_LIVE) {
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
          setBestQuote(null);
          setQuoteLoading(false);
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
        if (one != null) setRateText(`1 ${fromToken} ≈ ${one.toFixed(6)} ${toToken} (预览/preview)`);
        setBestQuote(null);
        setQuoteLoading(false);
        return;
      }

      // 池已上线：与 SOL/USDC 相同 — Jupiter 实时报价写入 bestQuote
      setQuoteLoading(true);
      const tPawly = setTimeout(async () => {
        try {
          const q = await getBestSwapQuote(fromToken, toToken, amt);
          if (!alive) return;
          setBestQuote(q);
          setRouteSource(q.source || "Jupiter");
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
          setRateText(`报价失败 / Quote failed: ${(e?.message || String(e)).slice(0, 100)}`);
        } finally {
          if (alive) setQuoteLoading(false);
        }
      }, 450);
      return () => {
        alive = false;
        clearTimeout(tPawly);
      };
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
    if ((fromToken === "PAWLY" || toToken === "PAWLY") && !ensurePawlyPoolLive()) return;
    if (!connected || !publicKey || !sendTransaction) {
      return alert("请先连接可签名的钱包\nPlease connect a signing wallet");
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return alert("请输入有效数量\nEnter a valid amount");
    if (fromToken === toToken) return alert("请选择不同代币\nSelect different tokens");
    if (quoteLoading) {
      return alert("报价加载中，请稍候再点兑换\nQuote loading — try again in a moment");
    }
    if (!bestQuote) {
      return alert(
        "暂无可用实时报价（Jupiter）。请确认金额后稍候，或稍后重试。\nNo live Jupiter quote yet. Wait a moment after entering amount, then retry."
      );
    }
    if (amt > realBalance + 1e-12) {
      return alert("余额不足\nInsufficient balance");
    }
    setTxLoading(true);
    setLastSig("");
    setTxError("");
    try {
      const sig = await executeSwapRoute({
        publicKey,
        sendTransaction,
        wallet,
        best: bestQuote,
        fromToken,
        toToken,
        uiAmount: amt,
      });
      setLastSig(sig);
      await logDappOnchainEvent({
        wallet: publicKey.toString(),
        event_type: "swap",
        token: `${fromToken}->${toToken}`,
        amount: amt,
        counterparty: null,
        tx_sig: sig,
        status: "pending",
      });
      await assertTxSuccess(sig);
      alert(
        `✅ 兑换成功 / Swap success\n\n${amt} ${fromToken} → ≈ ${quote} ${toToken}\n路由 / Route: ${bestQuote.source}\n\nTx: ${sig}\nhttps://solscan.io/tx/${sig}`
      );
      const bal = await fetchTokenBalance(publicKey, fromToken);
      setRealBalance(bal);
      setAmount("");
      setBestQuote(null);
    } catch (e) {
      console.error(e);
      const em = e?.message || String(e);
      setTxError(em);
      try {
        alert(`兑换失败 / Swap failed\n\n${em}`);
      } catch (_) {}
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
        opacity: 1,
      }}
    >
      {tok}
      
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
          {involvesPawly && !PAWLY_POOL_LIVE && (
            <p style={{ color: "#ffaa00", fontSize: 11, margin: "10px 0 0", lineHeight: 1.45 }}>
              PAWLY 为预览比例，CA + 池上线后开放真实兑换。
              <br />
              PAWLY pool is live — real Jupiter / on-chain routes preferred.
            </p>
          )}
          {involvesPawly && PAWLY_POOL_LIVE && (
            <p style={{ color: "#00c853", fontSize: 11, margin: "10px 0 0", lineHeight: 1.45 }}>
              PAWLY 池已上线，优先 Jupiter / 链上真实路由。
              <br />
              PAWLY pool is live — real Jupiter / on-chain routes preferred.
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
          disabled={txLoading || (quoteLoading && fromToken !== "PAWLY" && toToken !== "PAWLY")}
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
        {txError && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "12px 14px",
              background: "rgba(244,67,54,0.12)",
              border: "1px solid rgba(244,67,54,0.55)",
              borderRadius: 12,
              color: "#ffcdd2",
              fontSize: 13,
              lineHeight: 1.5,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            <div style={{ color: "#ff8a80", fontWeight: 800, marginBottom: 6 }}>交易错误 / Tx Error</div>
            {txError}
            <button
              type="button"
              onClick={() => setTxError("")}
              style={{
                marginTop: 10,
                display: "block",
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#eee",
                cursor: "pointer",
              }}
            >
              关闭 / Dismiss
            </button>
          </div>
        )}

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
          询价与上链均为 Jupiter 加强通道。PAWLY 官方 CA 已接入。
          <br />
          Quote & swap use hardened Jupiter only. Official PAWLY CA integrated.
        </p>
      </div>
      <PageFooterNav />
    </div>
  );
}

function BuyPage() {
  const navigate = useNavigate();
  const { publicKey, connected } = usePawlyWallet();
  const { pwaData } = useUserData();
  const [crypto, setCrypto] = useState("SOL");
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const addr =
    (publicKey && publicKey.toString()) || pwaData?.wallet || "";

  const platforms = [
    { id: "moonpay", label: "MoonPay", sub: "Card / local methods" },
    { id: "ramp", label: "Ramp Network", sub: "Card / bank" },
    { id: "mercuryo", label: "Mercuryo", sub: "Card / Apple Pay*" },
    { id: "alchemy", label: "Alchemy Pay", sub: "Global on-ramp" },
    { id: "luno", label: "Luno", sub: "MY/SEA exchange · 自行提币" },
    { id: "changenow", label: "ChangeNOW", sub: "Swap / buy gateway" },
    { id: "wallet", label: "Wallet App Buy", sub: "Phantom / Solflare 内买入" },
  ];

  const pick = (id) => {
    if (!addr) {
      alert("请先连接钱包\nPlease connect wallet first");
      return;
    }
    try {
      openOnrampPlatform(id, addr, crypto);
      setShowPlatforms(false);
    } catch (e) {
      alert(e?.message || String(e));
    }
  };

  return (
    <div style={pageWrap}>
      <PageHeader
        title="💵 买入·入金 / Buy·Deposit"
        subtitle="SOL · USDC · USDT · 跳转合规通道自行入金 / Self-serve on-ramp"
      />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <p style={{ color: "#99a", fontSize: 13, margin: "0 0 8px" }}>购买代币 / Asset</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["SOL", "USDC", "USDT"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCrypto(t)}
              style={{
                flex: 1,
                minWidth: 72,
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
          onClick={() => setShowPlatforms(true)}
          style={{
            ...neonBtn,
            width: "100%",
            marginBottom: 10,
            background: "linear-gradient(135deg, #ffc107, #ff9800)",
            color: "#1a1200",
          }}
        >
          入金 / Deposit
        </button>

        <button
          type="button"
          onClick={() => setShowNotes(true)}
          style={{
            display: "block",
            width: "100%",
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

        {showPlatforms && (
          <div
            role="dialog"
            style={sheetOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowPlatforms(false);
            }}
          >
            <div
              style={{
                ...sheetPanel,
                background: "linear-gradient(165deg, #1a1030, #0d0d18)",
                border: "1px solid rgba(0,255,157,0.35)",
                color: "#e8fff5",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 16 }}>选择入金通道 / Choose channel</strong>
              </div>
              <p style={{ color: "#889", fontSize: 12, marginTop: 0, marginBottom: 12 }}>
                购买 {crypto} · 将打开第三方页面 / Buy {crypto} · opens third-party page
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pick(p.id)}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #333",
                      background: "#12121f",
                      color: "#e8fff5",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{p.label}</div>
                    <div style={{ color: "#889", fontSize: 12, marginTop: 4 }}>{p.sub}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlatforms(false);
                    navigate("/");
                  }}
                  style={{ ...ghostBtn, width: "100%", boxSizing: "border-box", marginTop: 6, minHeight: 44 }}
                >
                  ← 返回主页 / Home
                </button>
              </div>
            </div>
          </div>
        )}

        {showNotes && (
          <div
            role="dialog"
            style={sheetOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNotes(false);
            }}
          >
            <div
              style={{
                ...sheetPanel,
                background: "linear-gradient(165deg, #1a1030, #0d0d18)",
                border: "1px solid rgba(255,193,7,0.4)",
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
                  }}
                >
                  ✕
                </button>
              </div>
              <p style={{ margin: "0 0 10px" }}>
                · 连接钱包后，点「入金 / Deposit」选择通道；在第三方合规页面完成验证与支付，代币进入你自己的钱包。PAWLY 不托管资金。
                <br />
                · After connecting, tap Deposit, choose a channel, complete KYC & pay on the third-party site; crypto goes to your wallet. PAWLY does not custody funds.
              </p>
              <p style={{ margin: "0 0 10px" }}>
                · 代币进入上方显示的钱包地址。
                <br />
                · Crypto is sent to the wallet address shown above.
              </p>
              <p style={{ margin: "0 0 10px" }}>
                · 也可在钱包 App 内直接买入后返回本 dApp。
                <br />
                · Or buy inside your wallet app, then return here.
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
      <PageFooterNav />
    </div>
  );
}

function CharityPage() {
  const { connected, publicKey, sendTransaction, wallet, signTransaction, activateEmailWallet } = usePawlyWallet();
  const { pwaData } = useUserData();
  const [token, setToken] = useState("USDC");
  const [toAddress, setToAddress] = useState(() => loadCharityDraft().toAddress || "");
  const [amount, setAmount] = useState(() => loadCharityDraft().amount || "");
  const [realBalance, setRealBalance] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [lastSig, setLastSig] = useState("");
  const [txError, setTxError] = useState("");
  const [showMyQr, setShowMyQr] = useState(false);
  const [showScanQr, setShowScanQr] = useState(false);
  const [fiatRates, setFiatRates] = useState(null);
  const [solUsd, setSolUsd] = useState(null);
  const [pawlyUsd, setPawlyUsd] = useState(function () {
    const c = readCachedPawlyPx();
    return c && c.usd ? c.usd : null;
  });
  const [rateLoading, setRateLoading] = useState(true);
  const [fiatCode, setFiatCode] = useState("MYR");
  const [fiatAmount, setFiatAmount] = useState("");
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const FIATS = PAWLY_FIATS;

  useEffect(() => {
    saveCharityDraft({ toAddress, amount, token });
  }, [toAddress, amount, token]);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const results = await Promise.allSettled([fetchFiatRatesUsd(), fetchSolUsdPrice(), fetchPawlyUsdPrice()]);
        if (!alive) return;
        const fiat = results[0].status === "fulfilled" ? results[0].value : null;
        const sol = results[1].status === "fulfilled" ? results[1].value : null;
        const pawly = results[2].status === "fulfilled" ? results[2].value : null;
        if (fiat?.rates) setFiatRates(fiat.rates);
        if (sol?.usd) setSolUsd(sol.usd);
        if (pawly?.usd) setPawlyUsd(pawly.usd);
      } finally {
        if (alive) setRateLoading(false);
      }
    };
    setRateLoading(true);
    pull();
    const t = setInterval(pull, 45000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const cryptoAmt = fiatToCryptoAmount(fiatAmount, fiatCode, fiatRates, token, solUsd, pawlyUsd);
    if (cryptoAmt == null) return;
    const decimals = token === "SOL" ? 6 : token === "PAWLY" ? 2 : 4;
    setAmount(Number(cryptoAmt.toFixed(decimals)).toString());
  }, [fiatAmount, fiatCode, fiatRates, token, solUsd, pawlyUsd]);

  const shelters = [
    { name: "SPCA Selangor", url: "https://www.spca.org.my/" },
    { name: "PAWS Animal Welfare Society", url: "https://www.paws.org.my/" },
    { name: "SPCA Penang", url: "https://spcapenang.org/" },
  ];

  const charityAddr =
    (publicKey && publicKey.toString()) || pwaData?.wallet || "";
  const maxPawly = parseFloat(pwaData?.total_pawly) || 0;

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

  const handleDonate = async () => {
    if (token === "PAWLY" && !ensurePawlyPoolLive()) return;
    if (!toAddress.trim()) {
      return alert(
        "请粘贴慈善机构的 Solana 钱包地址\nPlease paste the charity Solana wallet address"
      );
    }
    if (!connected || !publicKey || typeof sendTransaction !== "function") {
      saveCharityDraft({ toAddress, amount, token });
      alert(
        "请连接 Phantom / Solflare，或使用本机已导入的密钥。不会要求登录 Privy。\nConnect Phantom / Solflare or use a saved local key. No Privy login."
      );
      try { setWalletModalVisible(true); } catch (_) {}
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      return alert("请输入捐赠数量\nEnter donation amount");
    }
        if (amt > realBalance + 1e-12) {
      return alert("余额不足\nInsufficient balance");
    }
    setTxLoading(true);
    setLastSig("");
    setTxError("");
    try {
      const sig = await sendTokenTransfer({
        publicKey,
        sendTransaction,
        wallet,
        signTransaction,
        token,
        toAddress,
        uiAmount: amt,
      });
      setLastSig(sig);
      await logDappOnchainEvent({
        wallet: publicKey.toString(),
        event_type: "donate",
        token,
        amount: amt,
        counterparty: toAddress.trim(),
        tx_sig: sig,
        status: "pending",
      });
      await assertTxSuccess(sig);
      alert(
        `✅ 捐赠成功 / Donation success\n\n${amt} ${token}\n→ ${toAddress.slice(0, 8)}…${toAddress.slice(-6)}\n\nTx: ${sig}\n\nhttps://solscan.io/tx/${sig}`
      );
      const bal = await fetchTokenBalance(publicKey, token);
      setRealBalance(bal);
      setAmount("");
    } catch (e) {
      console.error(e);
      const em = e?.message || String(e);
      setTxError(em);
      try {
        alert(`捐赠失败 / Donation failed\n\n${em}`);
      } catch (_) {}
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div style={pageWrap}>
      <PageHeader
        title="❤️ 慈善捐赠 / Charity Donate"
        subtitle="真实链上捐赠 · 粘贴机构钱包 · SOL/USDC/USDT / Live on-chain donate to any Solana address"
      />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <CaWarningBanner feature="慈善 / Charity" />

        <p style={{ color: "#bcc", lineHeight: 1.7, marginTop: 0 }}>
          捐赠本质即转账。填写机构官方公布的 Solana 地址，选择代币与数量，签名后即上链到账。请务必核对地址，错误地址无法追回。
          <br />
          A donation is a transfer. Paste the shelter’s official Solana address, choose token & amount, then sign. Double-check the address — funds cannot be recovered if wrong.
        </p>

        <p style={{ color: "#99a", fontSize: 13, margin: "0 0 8px" }}>
          参考机构官网（自行查证其钱包）/ Shelter sites (verify wallet yourself)
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

        <label style={{ color: "#99a", fontSize: 13 }}>
          机构 Solana 钱包地址 / Charity wallet address
        </label>
        <input
          type="text"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          placeholder="粘贴机构钱包 / Paste Solana address"
          style={{
            width: "100%",
            boxSizing: "border-box",
            margin: "8px 0 16px",
            background: "#12121f",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            color: "#fff",
            fontSize: 14,
            fontFamily: "monospace",
          }}
        />

        <p style={{ color: "#99a", fontSize: 13, margin: "0 0 8px" }}>捐赠代币 / Token</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {["SOL", "USDC", "USDT", "PAWLY"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setToken(t);
                setAmount("");
              }}
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
                opacity: 1,
              }}
            >
              {t}
              
            </button>
          ))}
        </div>

        <div
          style={{
            background: "rgba(255,82,82,0.08)",
            border: "1px solid rgba(255,82,82,0.3)",
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div style={{ color: "#ff8a80", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
            法币计价捐赠 / Fiat-priced donate ▸
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <select
              value={fiatCode}
              onChange={(e) => setFiatCode(e.target.value)}
              style={{
                flex: 1,
                minWidth: 110,
                background: "#12121f",
                border: "1px solid #333",
                borderRadius: 10,
                padding: 10,
                color: "#fff",
              }}
            >
              {FIATS.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.symbol} {f.code}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={fiatAmount}
              onChange={(e) => setFiatAmount(e.target.value)}
              placeholder={`法币金额 / Fiat (${fiatCode})`}
              style={{
                flex: 1,
                minWidth: 110,
                background: "#12121f",
                border: "1px solid #333",
                borderRadius: 10,
                padding: 10,
                color: "#fff",
              }}
            />
          </div>
          <div style={{ color: "#ccc", fontSize: 12, lineHeight: 1.45 }}>
            {fiatRates?.[fiatCode]
              ? `1 USD ≈ ${Number(fiatRates[fiatCode]).toFixed(4)} ${fiatCode}`
              : rateLoading
                ? "Loading rates…"
                : "Rates unavailable"}
            {fiatAmount && fiatRates?.[fiatCode] ? (
              <>
                <br />
                {fiatAmount} {fiatCode} ≈{" "}
                <strong style={{ color: "#00ff9d" }}>
                  {(Number(fiatAmount) / Number(fiatRates[fiatCode])).toFixed(4)} USDC
                </strong>
              </>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span style={{ color: "#99a", fontSize: 13 }}>数量 / Amount ({token})</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#667", fontSize: 12 }}>
              余额 / Bal: {fmtBal(realBalance)} {token}
            </span>
            <button
              type="button"
              onClick={() => {
                setFiatAmount("");
                setAmount(String(realBalance || 0));
              }}
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
          onChange={(e) => {
            setFiatAmount("");
            setAmount(e.target.value);
          }}
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
            fontSize: "1.15rem",
          }}
        />
        <GasEstimateBox presetKey="charity" refreshKey={token + toAddress} />

        <div style={{ display: "flex", gap: 10, marginTop: 12, marginBottom: 4 }}>
          <button
            type="button"
            onClick={() => {
              if (!charityAddr) {
                alert("请先连接钱包\nPlease connect wallet first");
                return;
              }
              setShowMyQr(true);
            }}
            style={{ ...ghostBtn, flex: 1, boxSizing: "border-box" }}
          >
            我的二维码 / My QR
          </button>
          <button
            type="button"
            onClick={() => setShowScanQr(true)}
            style={{ ...ghostBtn, flex: 1, boxSizing: "border-box" }}
          >
            扫码 / Scan QR
          </button>
        </div>

        {showMyQr && (
          <MyQrModal address={charityAddr} onClose={() => setShowMyQr(false)} />
        )}
        {showScanQr && (
          <ScanQrModal
            onDetected={(payload) => {
              const p = typeof payload === "string" ? { address: payload } : payload || {};
              if (p.address) setToAddress(p.address);
              if (p.token && ["SOL", "USDC", "USDT", "PAWLY"].includes(p.token)) {
                if (typeof setPayToken === "function") setPayToken(p.token);
                else if (typeof setToken === "function") setToken(p.token);
              }
              if (p.fiat && typeof setFiatCode === "function") setFiatCode(p.fiat);
              if (p.fiatAmount && typeof setFiatAmount === "function") {
                setFiatAmount(String(p.fiatAmount));
              } else if (p.amount && typeof setAmount === "function") {
                if (typeof setFiatAmount === "function") setFiatAmount("");
                setAmount(String(p.amount));
              }
            }}
            onClose={() => setShowScanQr(false)}
          />
        )}

        <button
          type="button"
          onClick={handleDonate}
          disabled={txLoading}
          style={{
            ...neonBtn,
            width: "100%",
            marginTop: 8,
            opacity: txLoading ? 0.65 : 1,
          }}
        >
          {txLoading
            ? "链上捐赠中… / Donating…"
            : "确认捐赠 / Confirm Donate"}
        </button>
        {txError && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "12px 14px",
              background: "rgba(244,67,54,0.12)",
              border: "1px solid rgba(244,67,54,0.55)",
              borderRadius: 12,
              color: "#ffcdd2",
              fontSize: 13,
              lineHeight: 1.5,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            <div style={{ color: "#ff8a80", fontWeight: 800, marginBottom: 6 }}>交易错误 / Tx Error</div>
            {txError}
            <button
              type="button"
              onClick={() => setTxError("")}
              style={{
                marginTop: 10,
                display: "block",
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#eee",
                cursor: "pointer",
              }}
            >
              关闭 / Dismiss
            </button>
          </div>
        )}

        {lastSig && (
          <p
            style={{
              color: "#00ff9d",
              fontSize: 12,
              marginTop: 12,
              wordBreak: "break-all",
              textAlign: "center",
            }}
          >
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
        <p
          style={{
            color: "#667",
            fontSize: 12,
            marginTop: 12,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          请仅向机构官方公布的地址捐赠。PAWLY 不托管善款。
          <br />
          Donate only to official published addresses. PAWLY never custodies donations.
        </p>
      </div>
      <PageFooterNav />
    </div>
  );
}


function CashOutPage() {
  const navigate = useNavigate();
  const { publicKey, connected } = usePawlyWallet();
  const { pwaData } = useUserData();
  const [crypto, setCrypto] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [fiatCode, setFiatCode] = useState("MYR");
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [lastOrder, setLastOrder] = useState("");
  const [realBalance, setRealBalance] = useState(0);
  const [balLoading, setBalLoading] = useState(false);
  const addr =
    (publicKey && publicKey.toString()) || pwaData?.wallet || "";

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!addr) {
        if (alive) setRealBalance(0);
        return;
      }
      setBalLoading(true);
      try {
        const bal = await fetchTokenBalance(addr, crypto);
        if (alive) setRealBalance(Number(bal) || 0);
      } catch (_) {
        if (alive) setRealBalance(0);
      } finally {
        if (alive) setBalLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [addr, crypto]);

  const platforms = [
    { id: "moonpay_sell", label: "MoonPay Sell", sub: "Sell to card/bank (where available)" },
    { id: "transak_sell", label: "Transak Sell", sub: "SELL · Solana" },
    { id: "ramp_sell", label: "Ramp Off-ramp", sub: "OFFRAMP flow" },
    { id: "alchemy_sell", label: "Alchemy Pay", sub: "Sell / ramp" },
    { id: "luno_sell", label: "Luno", sub: "MY/SEA · sell on exchange" },
    { id: "changenow_sell", label: "ChangeNOW", sub: "Crypto → fiat gateway" },
    { id: "wallet_sell", label: "Wallet App Sell", sub: "Phantom / Solflare 内卖出" },
  ];

  const pick = (id) => {
    if (!addr) {
      alert("请先连接钱包\nPlease connect wallet first");
      return;
    }
    try {
      const oid = openOfframpPlatform(id, addr, crypto, amount, fiatCode);
      if (oid) setLastOrder(String(oid));
      setShowPlatforms(false);
    } catch (e) {
      alert(e?.message || String(e));
    }
  };

  return (
    <div style={pageWrap}>
      <PageHeader
        title="🏦 卖出·出金 / Sell·Cash out"
        subtitle="USDC · USDT · SOL → 法币 · 不托管跳转 / Non-custodial off-ramp"
      />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
<div style={{ color: "#889", marginBottom: 6, marginTop: 16 }}>出金币种 / Crypto</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {["USDC", "USDT", "SOL"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCrypto(c)}
              style={{
                flex: 1,
                minWidth: 72,
                padding: 12,
                borderRadius: 12,
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: crypto === c ? "#42a5f5" : "#1a1a2e",
                color: crypto === c ? "#000" : "#fff",
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ color: "#889", marginBottom: 6 }}>数量（可选）/ Amount</div>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#12121f",
                border: "1px solid #333",
                borderRadius: 12,
                padding: 12,
                color: "#fff",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ color: "#889", marginBottom: 6 }}>目标法币 / Fiat</div>
            <select
              value={fiatCode}
              onChange={(e) => setFiatCode(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#12121f",
                border: "1px solid #333",
                borderRadius: 12,
                padding: 12,
                color: "#fff",
              }}
            >
              {["MYR", "SGD", "USD", "CNY", "JPY", "THB", "IDR", "HKD", "TWD", "KRW"].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span style={{ color: "#889", fontSize: 13 }}>
            钱包余额 / Wallet bal:{" "}
            <strong style={{ color: "#b8f5d8" }}>
              {balLoading ? "…" : (Number(realBalance) || 0).toFixed(6)} {crypto}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => setAmount(String(realBalance || 0))}
            disabled={!addr || balLoading || !(realBalance > 0)}
            style={{
              ...ghostBtn,
              padding: "6px 14px",
              fontSize: 12,
              opacity: !addr || balLoading || !(realBalance > 0) ? 0.5 : 1,
            }}
          >
            MAX
          </button>
        </div>
        <div style={{ background: "#12121f", borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <div style={{ color: "#889", marginBottom: 6 }}>钱包 / Wallet</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", color: "#b8f5d8" }}>
            {addr || (connected ? "…" : "未连接 / Not connected")}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPlatforms(true)}
          style={{
            ...neonBtn,
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 10,
            background: "linear-gradient(90deg,#1565c0,#42a5f5)",
          }}
        >
          出金 / Cash out
        </button>
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          style={{ ...ghostBtn, width: "100%", boxSizing: "border-box", marginBottom: 8 }}
        >
          📋 出金说明 / Off-ramp Notes
        </button>
        {lastOrder ? (
          <p style={{ color: "#90caf9", fontSize: 12, textAlign: "center" }}>
            最近订单 / Last order: {lastOrder}
          </p>
        ) : null}
        {showPlatforms && (
          <div
            role="dialog"
            style={sheetOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowPlatforms(false);
            }}
          >
            <div
              style={{
                ...sheetPanel,
                background: "linear-gradient(165deg,#0d1b2a,#0d0d18)",
                border: "1px solid rgba(66,165,245,0.4)",
                color: "#e3f2fd",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: 10 }}>
                <strong style={{ fontSize: 16 }}>选择出金通道 / Choose channel</strong>
              </div>
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p.id)}
                  style={{
                    ...ghostBtn,
                    width: "100%",
                    boxSizing: "border-box",
                    marginBottom: 8,
                    textAlign: "left",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: "#789" }}>{p.sub}</div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setShowPlatforms(false);
                  navigate("/");
                }}
                style={{ ...ghostBtn, width: "100%", boxSizing: "border-box", marginTop: 4, minHeight: 44 }}
              >
                ← 返回主页 / Home
              </button>
            </div>
          </div>
        )}
        {showNotes && (
          <div
            role="dialog"
            style={sheetOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNotes(false);
            }}
          >
            <div
              style={{
                ...sheetPanel,
                background: "#12121f",
                border: "1px solid #333",
                color: "#ddd",
                fontSize: 13,
                lineHeight: 1.55,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <strong>📋 出金说明 / Off-ramp Notes</strong>
                <button type="button" onClick={() => setShowNotes(false)} style={{ ...ghostBtn, padding: "4px 10px" }}>
                  ✕
                </button>
              </div>
              <p style={{ margin: "0 0 8px" }}>
                · 将钱包内稳定币/SOL 通过第三方通道换成法币。点「出金」后选择通道，在对方页面完成卖出/提现。PAWLY 只跳转，不托管资金。
                <br />
                · Sell crypto via third-party channels. Tap Cash out, complete sell on their site. PAWLY only redirects — no custody.
              </p>
              <p style={{ margin: "0 0 8px" }}>
                · PAWLY 不托管资金；KYC/限额以对方为准。
                <br />
                · PAWLY does not custody funds.
              </p>
              <p style={{ margin: 0 }}>
                · Luno / ChangeNOW 请确认 Solana 网络与提现地址。
                <br />
                · Confirm Solana network on exchanges.
              </p>
            </div>
          </div>
        )}
      </div>
      <PageFooterNav />
    </div>
  );
}


function ChartPage() {
  const POOL_PAWLY_USDC = PAWLY_POOL_ID;
  const POOL_SOL_USDC = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
  const POOL_SOL_USDT = "7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX";
  const POOL_USDC_USDT = "3NeUgARDmFgnKtkJLqUcEUNCfknFCcGsFfMJCtx6bAgx";

  const pairPool = {
    "PAWLY-USDC": { pool: POOL_PAWLY_USDC, note: "Official Raydium pool / 官方池" },
    "USDC-PAWLY": { pool: POOL_PAWLY_USDC, note: "Official Raydium pool / 官方池" },
    "SOL-USDC": { pool: POOL_SOL_USDC, note: "Raydium SOL/USDC" },
    "USDC-SOL": { pool: POOL_SOL_USDC, note: "Raydium SOL/USDC" },
    "SOL-USDT": { pool: POOL_SOL_USDT, note: "Raydium SOL/USDT" },
    "USDT-SOL": { pool: POOL_SOL_USDT, note: "Raydium SOL/USDT" },
    "USDC-USDT": { pool: POOL_USDC_USDT, note: "Raydium USDC/USDT" },
    "USDT-USDC": { pool: POOL_USDC_USDT, note: "Raydium USDC/USDT" },
    "PAWLY-SOL": {
      pool: POOL_PAWLY_USDC,
      note: "No direct PAWLY/SOL pool yet — showing official PAWLY/USDC. Swap SOL↔PAWLY via Jupiter.",
    },
    "SOL-PAWLY": {
      pool: POOL_PAWLY_USDC,
      note: "暂无独立 PAWLY/SOL 池，先看官方 PAWLY/USDC。兑换走 Jupiter。",
    },
    "PAWLY-USDT": {
      pool: POOL_PAWLY_USDC,
      note: "No direct PAWLY/USDT pool yet — showing official PAWLY/USDC. Swap USDT↔PAWLY via Jupiter.",
    },
    "USDT-PAWLY": {
      pool: POOL_PAWLY_USDC,
      note: "暂无独立 PAWLY/USDT 池，先看官方 PAWLY/USDC。兑换走 Jupiter。",
    },
  };

  const quotesOf = {
    PAWLY: ["USDC", "SOL", "USDT"],
    SOL: ["PAWLY", "USDC", "USDT"],
    USDC: ["PAWLY", "SOL", "USDT"],
    USDT: ["SOL", "PAWLY", "USDC"],
  };

  const [base, setBase] = useState("PAWLY");
  const [quote, setQuote] = useState("USDC");

  const pickBase = (b) => {
    setBase(b);
    setQuote(quotesOf[b][0]);
  };

  const key = base + "-" + quote;
  const meta = pairPool[key] || pairPool["PAWLY-USDC"];
  const src =
    "https://www.geckoterminal.com/solana/pools/" +
    meta.pool +
    "?embed=1&info=0&swaps=0&light_chart=0&resolution=15m&bg_color=07070f";
  const openUrl = "https://www.geckoterminal.com/solana/pools/" + meta.pool;

  return (
    <div style={pageWrap}>
      <PageHeader title="📈 Onchain Chart" subtitle="Each token vs PAWLY · SOL · USDC · USDT" />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <div style={{ color: "#889", fontSize: 12, marginBottom: 8 }}>Base / 主币</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {["PAWLY", "SOL", "USDC", "USDT"].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => pickBase(k)}
              style={{
                flex: 1,
                minWidth: 70,
                padding: "10px 8px",
                borderRadius: 12,
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: base === k ? "#00ff9d" : "#1a1a2e",
                color: base === k ? "#04140c" : "#fff",
              }}
            >
              {k}
            </button>
          ))}
        </div>
        <div style={{ color: "#889", fontSize: 12, marginBottom: 8 }}>Pair / 对照</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {quotesOf[base].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setQuote(k)}
              style={{
                flex: 1,
                minWidth: 70,
                padding: "10px 8px",
                borderRadius: 12,
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: quote === k ? "#42a5f5" : "#1a1a2e",
                color: quote === k ? "#041018" : "#fff",
              }}
            >
              {base}/{k}
            </button>
          ))}
        </div>
        <div style={{ color: "#c8ffe8", fontSize: 13, marginBottom: 8, fontWeight: 700 }}>
          {base} / {quote}
        </div>
        <p style={{ color: "#889", fontSize: 11, margin: "0 0 10px", lineHeight: 1.45 }}>
          {meta.note}
        </p>
        <div
          style={{
            width: "100%",
            height: "min(58vh, 500px)",
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(0,255,157,0.28)",
            background: "#07070f",
          }}
        >
          <iframe
            title={base + "/" + quote + " chart"}
            src={src}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="clipboard-write"
          />
        </div>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            marginTop: 12,
            textAlign: "center",
            color: "#00ff9d",
            fontSize: 13,
          }}
        >
          Open full chart / 打开完整行情 ↗
        </a>
      </div>
      <PageFooterNav />
    </div>
  );
}

function AppRoutes() {
  return (
    <>
      <PawlyPoolPendingModal />
      <SyncFromUrl />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/staking" element={<StakingPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/swap" element={<SwapPage />} />
        <Route path="/buy" element={<BuyPage />} />
        <Route path="/cashout" element={<CashOutPage />} />
        <Route path="/charity" element={<CharityPage />} />
        <Route path="/chart" element={<ChartPage />} />
      </Routes>
    </>
  );
}

function App() {
  const inner = (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <LocalWalletProvider>
            <BrowserRouter basename="/dapp">
              <UserDataProvider>
                <AppRoutes />
              </UserDataProvider>
            </BrowserRouter>
          </LocalWalletProvider>
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

























