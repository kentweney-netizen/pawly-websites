// @ts-nocheck
/**
 * PAWLY DApp — 25.07.2026 v3
 * 基于完美版 v2 + 本次：
 *   1. Swap 完整可计算框架（PAWLY↔USDC/USDT/SOL，CA 预留可插）
 *   2. Transfer 增加 PAWLY
 *   3. 全功能页：链上基础 Gas 估算（真实 Solana base fee）
 *   4. 全功能页：CA 未上线双语警告
 *   5. 全部中英双语
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
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
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
const HELIUS_RPC_GLOBAL =
  "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
const LAMPORTS_PER_SOL = 1e9;
const BASE_FEE_LAMPORTS = 5000;

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

/** 双语 CA 未上线警告条 */
function CaWarningBanner({ feature }) {
  return (
    <div
      style={{
        background: "rgba(255,136,0,0.12)",
        border: "1px solid rgba(255,136,0,0.45)",
        borderRadius: 14,
        padding: "12px 14px",
        marginBottom: 16,
        textAlign: "left",
        lineHeight: 1.55,
        fontSize: 13,
        color: "#ffcc80",
      }}
    >
      ⚠️ <strong>{feature || "本功能"}</strong>：PAWLY Token CA 尚未创建，状态为{" "}
      <strong>To Be Announced</strong>。界面与 Gas 为真实链上框架，正式兑换/转账将在 CA + 流动性池上线后开放。
      <br />
      <span style={{ color: "#c9a06a" }}>
        ⚠️ <strong>{feature || "This feature"}</strong>: PAWLY Token CA is not live yet (
        <strong>TBA</strong>). UI & gas estimates use real Solana base fees; full on-chain execution opens after CA & pool launch.
      </span>
    </div>
  );
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

const pageWrap = {
  minHeight: "100vh",
  background: "linear-gradient(160deg, #07070f 0%, #12001f 45%, #0a1a14 100%)",
  color: "#e8fff5",
  padding: "16px 16px 48px",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const card = {
  background: "linear-gradient(145deg, rgba(26,0,51,0.95), rgba(18,0,34,0.98))",
  border: "1px solid rgba(0,255,157,0.35)",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
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
    if (action === "transfer") navigate("/transfer", { replace: true });
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

  useEffect(() => {
    if (wallet.publicKey) {
      refreshUserData(wallet.publicKey);
    }
  }, [wallet.publicKey]);

  const onRefresh = () => {
    refreshUserData(wallet.publicKey || null);
  };

  const features = [
    { path: "/staking", icon: "💰", title: "质押 / Staking", desc: "USDC · SOL · USDT · PAWLY", color: "#7c3aed" },
    { path: "/payment", icon: "💳", title: "宠物支付 / Payment", desc: "PAWLY → 商户结算", color: "#2196f3" },
    { path: "/transfer", icon: "📤", title: "转账 / Transfer", desc: "SOL · USDC · USDT", color: "#00c853" },
    { path: "/swap", icon: "🔄", title: "交易 / Swap", desc: "PAWLY ↔ USDC", color: "#ff9ecd" },
    { path: "/charity", icon: "❤️", title: "慈善 / Charity", desc: "支持收容所与护生", color: "#ff5252" },
  ];

  return (
    <div style={pageWrap}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: "2.6rem", marginBottom: 6 }}>🐾</div>
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
              <div style={{ color: "#778", fontSize: "0.8rem", marginTop: 2 }}>与 PWA 主站同步 / Synced from PWA</div>
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
                <div style={{ color: "#778", fontSize: 12 }}>连续签到 / Streak</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4 }}>{pwaData.streak} 天</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#778", fontSize: 12 }}>Points</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4 }}>{pwaData.points || "—"}</div>
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

        <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 20px" }}>
          <WalletConnect />
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

  const TOKEN_MINTS = {
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  };
  const HELIUS_RPC =
    "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";

  const fetchBalance = async (token) => {
    if (!publicKey) return setRealBalance(0);
    if (token === "PAWLY") return setRealBalance(0);
    try {
      const connection = new Connection(HELIUS_RPC, "confirmed");
      if (token === "SOL") {
        const lamports = await connection.getBalance(publicKey);
        setRealBalance(lamports / 1e9);
      } else {
        const mint = new PublicKey(TOKEN_MINTS[token]);
        const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint });
        setRealBalance(accounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount || 0);
      }
    } catch {
      setRealBalance(0);
    }
  };

  useEffect(() => {
    if (connected && publicKey) fetchBalance(selectedToken);
    else setRealBalance(0);
  }, [connected, publicKey, selectedToken]);

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
  const [amount, setAmount] = useState("");
  const [usdcText, setUsdcText] = useState("0.00 USDC");
  const [myrText, setMyrText] = useState("RM 0.00");
  const [myrRate, setMyrRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [payMethod, setPayMethod] = useState("usdc");
  const PAWLY_PER_USDC = 5;

  const fetchRates = async () => {
    setRateLoading(true);
    try {
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      if (!res.ok) throw new Error("rate fail");
      const data = await res.json();
      if (!data.rates?.MYR) throw new Error("no MYR");
      setMyrRate(data.rates.MYR);
    } catch (e) {
      console.error(e);
      setMyrRate(null);
      setMyrText("汇率获取失败 / Rate failed");
    } finally {
      setRateLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  useEffect(() => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      setUsdcText("0.00 USDC");
      setMyrText(myrRate ? "RM 0.00" : rateLoading ? "汇率获取中..." : "—");
      return;
    }
    const usdc = amt / PAWLY_PER_USDC;
    setUsdcText(usdc.toFixed(2) + " USDC");
    if (myrRate) setMyrText("RM " + (usdc * myrRate).toFixed(2));
    else setMyrText(rateLoading ? "汇率获取中..." : "—");
  }, [amount, myrRate, rateLoading]);

  const confirm = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      alert("请输入有效金额\nPlease enter a valid amount");
      return;
    }
    if (!myrRate) {
      alert("汇率尚未获取，请稍后重试\nExchange rate not ready");
      return;
    }
    const usdc = (amt / PAWLY_PER_USDC).toFixed(2);
    const myr = (parseFloat(usdc) * myrRate).toFixed(2);
    alert(
      `✅ 支付确认（模拟）\n\n${amt} PAWLY ≈ ${usdc} USDC ≈ RM ${myr}\n支付方式: ${payMethod.toUpperCase()}\n\n正式链上支付将在 Token 上线后开放。\n\n✅ Simulated payment confirmed.\nOn-chain pay after token launch.`
    );
  };

  return (
    <div style={pageWrap}>
      <PageHeader
        title="💳 宠物支付 / Pet Payment"
        subtitle="输入 PAWLY 数量 · 查看 USDC / MYR 换算（模拟/Simulated）"
      />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <CaWarningBanner feature="宠物支付 / Pet Payment" />

        <label style={{ color: "#99a", fontSize: 13 }}>支付金额（PAWLY） / Amount</label>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="例如 25"
          style={{
            width: "100%",
            boxSizing: "border-box",
            margin: "8px 0 16px",
            background: "#12121f",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            color: "#fff",
            fontSize: "1.15rem",
          }}
        />
        <div style={{ background: "#12121f", borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#889" }}>≈ USDC</span>
            <span style={{ color: "#00ff9d", fontWeight: 700 }}>{usdcText}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#889" }}>≈ MYR（今日）</span>
            <span style={{ color: "#ffaa00", fontWeight: 700 }}>{myrText}</span>
          </div>
          <p style={{ color: "#667", fontSize: 12, margin: "12px 0 0", lineHeight: 1.5 }}>
            临时比例：5 PAWLY ≈ 1 USDC（上线后改用链上价格）
            <br />
            Temp: 5 PAWLY ≈ 1 USDC (Real price on Chain)
          </p>
        </div>

        <p style={{ color: "#99a", fontSize: 13, margin: "0 0 10px" }}>支付方式 / Payment Method</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "#e8fff5" }}>
            <input type="radio" name="payMethod" checked={payMethod === "usdc"} onChange={() => setPayMethod("usdc")} />
            <span>USDC（推荐 / Recommended）</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#667" }}>
            <input type="radio" name="payMethod" disabled />
            <span>USDT（即将开放 / Coming Soon）</span>
          </label>
        </div>

        
        <GasEstimateBox presetKey="payment" refreshKey={amount} />
<button onClick={confirm} style={{ ...neonBtn, width: "100%", marginBottom: 10 }}>
          确认支付（模拟） / Confirm (Simulated)
        </button>
        <button onClick={fetchRates} style={{ ...ghostBtn, width: "100%", boxSizing: "border-box" }}>
          🔄 刷新汇率 / Refresh Rate
        </button>

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

        <p style={{ color: "#667", fontSize: 12, marginTop: 14, textAlign: "center" }}>
          商户扫码与真实链上结算将在后续接入/Merchant QR & on-chain settlement coming later
        </p>
      </div>
    </div>
  );
}

function TransferPage() {
  const { connected, publicKey } = useWallet();
  const [token, setToken] = useState("SOL");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [gasKey, setGasKey] = useState(0);

  const isPawly = token === "PAWLY";
  const gasPreset =
    token === "SOL" ? "transfer_sol" : isPawly ? "transfer_pawly" : "transfer_token";

  const handleSend = () => {
    if (!connected) return alert("请先连接钱包\nPlease connect wallet");
    if (!to.trim() || !amount) return alert("请填写收款地址与金额\nEnter recipient & amount");
    if (isPawly && !PAWLY_MINT) {
      alert(
        "PAWLY Token CA 尚未创建（To Be Announced）。\n转账框架已就绪，CA 上线后即可签名上链。\n\nPAWLY Token CA is TBA.\nTransfer UI is ready; signing opens after CA launch."
      );
      return;
    }
    alert(
      `转账预览 / Transfer Preview\n\n代币 / Token: ${token}\n数量 / Amount: ${amount}\n收款 / To: ${to.slice(0, 8)}…${to.slice(-6)}\n\nCA 就绪后将发起真实 System / SPL 签名。\nReal System / SPL signing after CA is live.`
    );
  };

  return (
    <div style={pageWrap}>
      <PageHeader
        title="📤 转账 / Transfer"
        subtitle="发送 SOL · USDC · USDT · PAWLY 到任意 Solana 地址 / Send SOL · USDC · USDT · PAWLY to any Solana address"
      />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <CaWarningBanner feature="转账 / Transfer" />

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["SOL", "USDC", "USDT", "PAWLY"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setToken(t);
                setGasKey((k) => k + 1);
              }}
              style={{
                flex: 1,
                minWidth: 64,
                padding: 12,
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

        {isPawly && !PAWLY_MINT && (
          <p style={{ color: "#ffaa00", fontSize: 12, marginTop: -8, marginBottom: 12 }}>
            PAWLY mint：To Be Announced（创建后自动启用）
            <br />
            PAWLY mint: TBA — enabled after token create
          </p>
        )}

        <label style={{ color: "#99a", fontSize: 13 }}>收款地址 / To</label>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Solana wallet address"
          style={{
            width: "100%",
            boxSizing: "border-box",
            margin: "8px 0 16px",
            background: "#12121f",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 13,
          }}
        />
        <label style={{ color: "#99a", fontSize: 13 }}>数量 / Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={{
            width: "100%",
            boxSizing: "border-box",
            margin: "8px 0 12px",
            background: "#12121f",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            color: "#fff",
            fontSize: "1.1rem",
          }}
        />

        <GasEstimateBox presetKey={gasPreset} refreshKey={gasKey} />

        <button onClick={handleSend} style={{ ...neonBtn, width: "100%", marginTop: 8 }}>
          发送 / Send {token}
        </button>
        <p style={{ color: "#667", fontSize: 12, marginTop: 14, textAlign: "center", lineHeight: 1.5 }}>
          链上基础 Gas 已按 Solana 实时估算。PAWLY 转账在 CA 上线后开放真实签名。
          <br />
          Gas uses live Solana base fees. PAWLY transfer signing opens after CA launch.
        </p>
      </div>
    </div>
  );
}

function SwapPage() {
  const { connected } = useWallet();
  const [fromToken, setFromToken] = useState("SOL");
  const [toToken, setToToken] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState("0.00");
  const [rateText, setRateText] = useState("—");
  const [solUsd, setSolUsd] = useState(null);
  const [gasKey, setGasKey] = useState(0);

  const tokens = ["SOL", "USDC", "USDT", "PAWLY"];

  // 拉取 SOL/USD 便于真实换算 SOL↔稳定币
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
        // 该 API 无 SOL；用备用公开价
      } catch (_) {}
      try {
        const r = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        if (!r.ok) throw new Error("cg");
        const d = await r.json();
        if (alive && d?.solana?.usd) setSolUsd(d.solana.usd);
      } catch (_) {
        if (alive) setSolUsd(150); // 合理回退，仅用于预览
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0 || fromToken === toToken) {
      setQuote("0.00");
      setRateText(fromToken === toToken ? "相同代币 / Same token" : "—");
      return;
    }

    // 统一先换算到 USDC 价值，再换到目标
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
    if (out == null) {
      setQuote("—");
      return;
    }
    setQuote(out.toFixed(6).replace(/\.?0+$/, (m) => (m.includes(".") ? m.replace(/0+$/, "").replace(/\.$/, "") : m)) || out.toFixed(4));

    const one = fromUsdc(toToken, toUsdc(fromToken, 1));
    if (one != null) {
      setRateText(`1 ${fromToken} ≈ ${one.toFixed(6)} ${toToken}`);
    }
  }, [amount, fromToken, toToken, solUsd]);

  const flip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setGasKey((k) => k + 1);
  };

  const involvesPawly = fromToken === "PAWLY" || toToken === "PAWLY";

  const handleSwap = () => {
    if (!connected) return alert("请先连接钱包\nPlease connect wallet");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return alert("请输入有效数量\nEnter a valid amount");
    if (fromToken === toToken) return alert("请选择不同代币\nSelect different tokens");
    if (involvesPawly && !PAWLY_MINT) {
      alert(
        `兑换预览 / Swap Preview（模拟）\n\n${amt} ${fromToken} → ≈ ${quote} ${toToken}\n比率 / Rate: ${rateText}\n\nPAWLY CA 与流动性池尚未上线（To Be Announced）。\n框架已就绪，创建 CA 后可直接接入 Jupiter / Raydium。\n\nPAWLY CA & pool TBA. UI ready to wire Jupiter/Raydium after launch.`
      );
      return;
    }
    alert(
      `兑换预览 / Swap Preview\n\n${amt} ${fromToken} → ≈ ${quote} ${toToken}\n${rateText}\n\n将在接入路由后签名上链。\nWill sign on-chain after router is connected.`
    );
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
      }}
    >
      {tok}
    </button>
  );

  return (
    <div style={pageWrap}>
      <PageHeader
        title="🔄 交易 / Swap"
        subtitle="PAWLY · USDC · USDT · SOL 兑换（可计算预览） / Swap PAWLY · USDC · USDT · SOL (live quote preview)"
      />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <CaWarningBanner feature="交易 / Swap" />

        <label style={{ color: "#99a", fontSize: 13 }}>支付 / From</label>
        <div style={{ display: "flex", gap: 6, margin: "8px 0 12px", flexWrap: "wrap" }}>
          {tokens.map((t) =>
            tokBtn(t, fromToken === t, () => {
              setFromToken(t);
              if (t === toToken) setToToken(tokens.find((x) => x !== t) || "USDC");
              setGasKey((k) => k + 1);
            })
          )}
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
          <button
            onClick={flip}
            style={{
              ...ghostBtn,
              padding: "8px 18px",
              fontSize: 16,
            }}
            title="切换方向 / Flip"
          >
            ⇅
          </button>
        </div>

        <label style={{ color: "#99a", fontSize: 13 }}>获得 / To</label>
        <div style={{ display: "flex", gap: 6, margin: "8px 0 12px", flexWrap: "wrap" }}>
          {tokens.map((t) =>
            tokBtn(t, toToken === t, () => {
              setToToken(t);
              if (t === fromToken) setFromToken(tokens.find((x) => x !== t) || "SOL");
              setGasKey((k) => k + 1);
            })
          )}
        </div>

        <div
          style={{
            background: "#12121f",
            borderRadius: 14,
            padding: 16,
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#889" }}>预估获得 / Est. Receive</span>
            <span style={{ color: "#00ff9d", fontWeight: 700, fontSize: "1.1rem" }}>
              {quote} {toToken}
            </span>
          </div>
          <div style={{ color: "#667", fontSize: 12 }}>{rateText}</div>
          {involvesPawly && (
            <p style={{ color: "#ffaa00", fontSize: 11, margin: "10px 0 0", lineHeight: 1.45 }}>
              临时比例：{PAWLY_PER_USDC} PAWLY ≈ 1 USDC（池子上线后改用链上价格）
              <br />
              Temp: {PAWLY_PER_USDC} PAWLY ≈ 1 USDC (on-chain price after pool)
            </p>
          )}
          {solUsd && (fromToken === "SOL" || toToken === "SOL") && (
            <p style={{ color: "#556", fontSize: 11, margin: "6px 0 0" }}>
              SOL 参考价 / SOL ref: ${solUsd.toFixed(2)}
            </p>
          )}
        </div>

        <GasEstimateBox presetKey="swap" refreshKey={gasKey} />

        <button onClick={handleSwap} style={{ ...neonBtn, width: "100%", marginTop: 8 }}>
          交易 / Swap {fromToken} → {toToken}
        </button>
        <p style={{ color: "#667", fontSize: 12, marginTop: 14, textAlign: "center", lineHeight: 1.5 }}>
          支持 PAWLY↔USDC / USDT / SOL。CA 与池子上线后接入 Jupiter 或 Raydium 真实路由。
          <br />
          Supports PAWLY↔USDC / USDT / SOL. Real Jupiter/Raydium route after CA & pool launch.
        </p>
      </div>
    </div>
  );
}

function CharityPage() {
  const shelters = [
    { name: "SPCA Selangor", url: "https://www.spca.org.my/" },
    { name: "PAWS Animal Welfare Society", url: "https://www.paws.org.my/" },
    { name: "SPCA Penang", url: "https://spcapenang.org/" },
  ];

  return (
    <div style={pageWrap}>
      <PageHeader title="❤️ 慈善 / Charity" subtitle="支持全世界动物收容所与护生组织，从马来西亚开始/Supporting animal shelters & welfare organizations worldwide，started from Malaysia" />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <CaWarningBanner feature="慈善 / Charity" />

        <p style={{ color: "#bcc", lineHeight: 1.7, marginTop: 0 }}>
          PAWLY 计划将部分生态收益用于动物保护。你可先通过下列官方渠道直接支持收容所。/PAWLY plans to use part of ecosystem revenue for animal protection. You can support shelters directly via the official channels below.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
        <GasEstimateBox presetKey="charity" refreshKey={0} />
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
        <Route path="/transfer" element={<TransferPage />} />
        <Route path="/swap" element={<SwapPage />} />
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
