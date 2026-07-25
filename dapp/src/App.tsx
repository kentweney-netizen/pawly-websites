// @ts-nocheck
/**
 * PAWLY DApp — 主页干净版 + 多功能路由
 * 25.07.2026
 * FIX: BrowserRouter basename="/dapp" 匹配 vite base，解决白屏
 */
import { useState, useEffect } from "react";
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

function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
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

function HomePage() {
  const wallet = useWallet();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showExport, setShowExport] = useState(false);
  const [verified, setVerified] = useState(false);
  const [pwaData, setPwaData] = useState({
    email: "",
    wallet: "",
    streak: "0",
    total_pawly: "0",
    points: "0",
  });

  const verifyWalletWithSupabase = async (connectedPubkey: any) => {
    if (!connectedPubkey) return;
    try {
      const { data, error } = await supabase
        .from("USERS")
        .select("*")
        .eq("wallet_address", connectedPubkey.toString())
        .single();
      if (error || !data) {
        console.log("未找到钱包对应的用户数据");
        return;
      }
      setVerified(true);
      setPwaData({
        email: data.email || "",
        wallet: data.wallet_address || "",
        streak: String(data.checkin_streak || 0),
        total_pawly: String(data.total_earnd || 0),
        points: String(data.pawly_points || 0),
      });
    } catch (err) {
      console.error("读取 Supabase 数据失败:", err);
    }
  };

  const refreshUserData = async () => {
    if (wallet.publicKey) await verifyWalletWithSupabase(wallet.publicKey);
    else if (pwaData.wallet)
      await verifyWalletWithSupabase({ toString: () => pwaData.wallet });
  };

  useEffect(() => {
    const walletFromUrl = searchParams.get("wallet");
    const emailFromUrl = searchParams.get("email");
    const streakFromUrl = searchParams.get("streak");
    const totalFromUrl = searchParams.get("total_pawly");
    const action = searchParams.get("action");

    if (walletFromUrl) {
      setPwaData({
        email: emailFromUrl || "",
        wallet: walletFromUrl,
        streak: streakFromUrl || "0",
        total_pawly: totalFromUrl || "0",
        points: "0",
      });
      setVerified(true);
      verifyWalletWithSupabase({ toString: () => walletFromUrl });
    }

    if (action === "staking") navigate("/staking");
    if (action === "payment") navigate("/payment");
    if (action === "transfer") navigate("/transfer");
    if (action === "swap") navigate("/swap");
    if (action === "charity") navigate("/charity");
  }, [searchParams]);

  useEffect(() => {
    if (wallet.publicKey) verifyWalletWithSupabase(wallet.publicKey);
  }, [wallet.publicKey]);

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
            <button onClick={refreshUserData} style={ghostBtn}>🔄 刷新</button>
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
  const [selectedToken, setSelectedToken] = useState<"USDC" | "SOL" | "USDT" | "PAWLY">("SOL");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [realBalance, setRealBalance] = useState(0);

  const TOKEN_MINTS = {
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  };
  const HELIUS_RPC =
    "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";

  const fetchBalance = async (token: typeof selectedToken) => {
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
      <PageHeader title="💰 质押 / Staking" subtitle="Stake USDC · SOL · USDT · PAWLY（合约上线后开放真实质押）" />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {(["USDC", "SOL", "USDT", "PAWLY"] as const).map((t) => (
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
            <div style={{ color: "#ffaa00", fontWeight: 700 }}>即将公布</div>
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
  return (
    <div style={pageWrap}>
      <PageHeader title="💳 宠物支付 / Pet Payment" subtitle="用 PAWLY 支付宠物相关消费 · 签名结算在 dApp 完成" />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <p style={{ color: "#bcc", lineHeight: 1.7, textAlign: "left" }}>
          <strong style={{ color: "#00ff9d" }}>中文：</strong>
          支付需要钱包签名。正式上线后，你可在此确认金额、商户收款地址，并完成链上转账。
          <br /><br />
          <strong style={{ color: "#00ff9d" }}>English：</strong>
          Payment requires wallet signature. After launch, confirm amount and merchant address here, then sign.
        </p>
        <button disabled style={{ ...neonBtn, background: "#333", color: "#888", cursor: "not-allowed", marginTop: 12 }}>
          即将开放 / Coming Soon
        </button>
      </div>
    </div>
  );
}

function TransferPage() {
  const { connected } = useWallet();
  const [token, setToken] = useState<"SOL" | "USDC" | "USDT">("SOL");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  const handleSend = () => {
    if (!connected) return alert("请先连接钱包\nPlease connect wallet");
    if (!to.trim() || !amount) return alert("请填写收款地址与金额");
    alert("转账功能 UI 已就绪。接入真实发送逻辑后即可签名上链。\nTransfer UI ready.");
  };

  return (
    <div style={pageWrap}>
      <PageHeader title="📤 转账 / Transfer" subtitle="发送 SOL / USDC / USDT 到任意 Solana 地址" />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["SOL", "USDC", "USDT"] as const).map((t) => (
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
          Token 与流动性池上线后开放兑换。
          <br />
          <span style={{ color: "#778" }}>Swap after CA & liquidity launch.</span>
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
      <PageHeader title="❤️ 慈善 / Charity" subtitle="支持马来西亚动物收容所与护生组织" />
      <div style={{ ...card, maxWidth: 720, margin: "0 auto" }}>
        <p style={{ color: "#bcc", lineHeight: 1.7, marginTop: 0 }}>
          可通过下列官方渠道支持收容所。以后可接链上转账捐款。
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shelters.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...ghostBtn, display: "block", textAlign: "center", textDecoration: "none", padding: 14 }}
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
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/staking" element={<StakingPage />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/transfer" element={<TransferPage />} />
      <Route path="/swap" element={<SwapPage />} />
      <Route path="/charity" element={<CharityPage />} />
    </Routes>
  );
}

function App() {
  const inner = (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* 必须与 vite.config base: '/dapp/' 一致，否则 /dapp 路径下路由匹配失败 → 白屏 */}
          <BrowserRouter basename="/dapp">
            <AppRoutes />
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
