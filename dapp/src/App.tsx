// @ts-nocheck
/**
 * PAWLY DApp — 主页干净版 + 多功能路由
 * 25.07.2026 v2（数据持久化强化 + Payment 完整功能）
 * 基于 24.07.2026 完美版：Privy 导出 / Wallet Adapter / PWA 数据同步
 *
 * 修复：
 *   1. 用户数据提到 Context（路由切换不丢数据，返回主页立即显示）
 *   2. /payment 接入完整 Pet Payment（金额换算 + 支付方式 + 商户预留）
 *
 * 路由：
 *   /              主页（数据卡 + 功能按钮）
 *   /staking       质押
 *   /payment       宠物支付（完整功能）
 *   /transfer      转账
 *   /swap          交易
 *   /charity       慈善
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
  const { connected } = useWallet();
  const [token, setToken] = useState("SOL");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  const handleSend = () => {
    if (!connected) return alert("请先连接钱包\nPlease connect wallet");
    if (!to.trim() || !amount) return alert("请填写收款地址与金额");
    alert("转账功能 UI 已就绪。接入真实发送逻辑后即可签名上链。\nTransfer UI ready. On-chain send will be wired next.");
  };

  return (
    <div style={pageWrap}>
      <PageHeader title="📤 转账 / Transfer" subtitle="发送 SOL / USDC / USDT 到任意 Solana 地址 / Send SOL · USDC · USDT to any Solana address" />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["SOL", "USDC", "USDT"].map((t) => (
            <button
              key={t}
              onClick={() => setToken(t)}
              style={{
                flex: 1,
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
            margin: "8px 0 20px",
            background: "#12121f",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 14,
            color: "#fff",
            fontSize: "1.1rem",
          }}
        />
        <button onClick={handleSend} style={{ ...neonBtn, width: "100%" }}>
          发送 / Send {token}
        </button>
        <p style={{ color: "#667", fontSize: 12, marginTop: 14, textAlign: "center" }}>
          下一步将接入真实 System / SPL Token 转账签名，Next: real System / SPL Token transfer signing
        </p>
      </div>
    </div>
  );
}

function SwapPage() {
  return (
    <div style={pageWrap}>
      <PageHeader title="🔄 交易 / Swap" subtitle="PAWLY ↔ USDC（需 Token CA 与流动性池）" />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔄</div>
        <p style={{ color: "#bcc", lineHeight: 1.7 }}>
          Token 与流动性池上线后，这里将接入 Jupiter/Raydium 或自有池完成兑换。
          <br />
          <span style={{ color: "#778" }}>Swap will connect to Jupiter/Raydium or our pool after CA & liquidity launch.</span>
        </p>
        <button disabled style={{ ...neonBtn, background: "#333", color: "#888", cursor: "not-allowed" }}>
          即将开放 / Coming Soon
        </button>
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
