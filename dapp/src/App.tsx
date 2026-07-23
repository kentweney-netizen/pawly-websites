// @ts-nocheck
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
  useConnection,
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
import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint = clusterApiUrl("mainnet-beta");

const wallets = [
  // 手机端 Mobile Wallet Adapter（已修复）
  new SolanaMobileWalletAdapter({
    addressSelector: createDefaultAddressSelector(),
    appIdentity: {
      name: "PAWLY DApp",
      uri: "https://pawlypets.netlify.app/dapp",
      icon: "https://pawlypets.netlify.app/pawly-logo-192.png", // 用已存在的图标
    },
    authorizationResultCache: createDefaultAuthorizationResultCache(),
    cluster: WalletAdapterNetwork.Mainnet,
    onWalletNotFound: createDefaultWalletNotFoundHandler(),
  }),

  // 电脑端扩展钱包
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new TrustWalletAdapter(),
  new CoinbaseWalletAdapter(),
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function AppContent() {
  const [showStakingModal, setShowStakingModal] = useState(false);
  const [stakeType, setStakeType] = useState<"stable" | "pawly">("stable");

  const wallet = useWallet();
  const [searchParams] = useSearchParams();

  const [verified, setVerified] = useState(false);
  const [pwaData, setPwaData] = useState({
    email: "",
    wallet: "",
    streak: "0",
    total_pawly: "0",
  });

  // 更健壮的验证函数
  const verifyWalletWithSupabase = async (connectedPubkey: any) => {
    if (!connectedPubkey) return;

    try {
      const { data, error } = await supabase
        .from("USERS")
        .select("*")
        .eq("wallet_address", connectedPubkey.toString())
        .single();

      if (error) {
        console.log("未找到钱包对应的用户数据");
        return;
      }

      if (data) {
        setVerified(true);
        setPwaData({
          email: data.email || "",
          wallet: data.wallet_address || "",
          streak: (data.checkin_streak || 0).toString(),
          total_pawly: (data.total_earnd || 0).toString(),
        });
      }
    } catch (err) {
      console.error("读取 Supabase 数据失败:", err);
    }
  };

  // 新增：刷新数据函数
  const refreshUserData = async () => {
    if (wallet.publicKey) {
      await verifyWalletWithSupabase(wallet.publicKey);
    } else if (pwaData.wallet) {
      await verifyWalletWithSupabase({ toString: () => pwaData.wallet });
    }
  };

  // 优先读取 URL 参数（PWA 跳转过来时自动加载）
  useEffect(() => {
    const walletFromUrl = searchParams.get("wallet");
    const emailFromUrl = searchParams.get("email");
    const streakFromUrl = searchParams.get("streak");
    const totalFromUrl = searchParams.get("total_pawly");

    if (walletFromUrl) {
      setPwaData({
        email: emailFromUrl || "",
        wallet: walletFromUrl,
        streak: streakFromUrl || "0",
        total_pawly: totalFromUrl || "0",
      });
      setVerified(true);
      verifyWalletWithSupabase({ toString: () => walletFromUrl });
    }
  }, [searchParams]);

  // 钱包连接时自动验证
  useEffect(() => {
    if (wallet.publicKey) {
      verifyWalletWithSupabase(wallet.publicKey);
    }
  }, [wallet.publicKey]);

  const openStakeModal = (type: "stable" | "pawly") => {
    setStakeType(type);
    setShowStakingModal(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0a0a, #1a0033)", color: "#00ff9d", padding: "20px" }}>
      
      {/* PWA 用户数据卡片（已加入刷新按钮） */}
      {verified && (
        <div style={{ maxWidth: "1100px", margin: "0 auto 40px", padding: "0 20px" }}>
          <div style={{ background: "linear-gradient(135deg, #1a0033, #2a0044)", border: "2px solid #00ff9d", borderRadius: "24px", padding: "32px", textAlign: "center", boxShadow: "0 10px 30px rgba(0, 255, 157, 0.15)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h3 style={{ color: "#00ff9d", margin: 0, fontSize: "1.4rem" }}>
                📥 来自 PWA 主站的用户数据<br />
                <span style={{ fontSize: "1.05rem", color: "#bbb" }}>Data from PWA Main Site</span>
              </h3>

              {/* 刷新按钮 */}
              <button 
                onClick={refreshUserData}
                style={{ 
                  background: "transparent", 
                  color: "#00ff9d", 
                  border: "1px solid #00ff9d", 
                  padding: "8px 20px", 
                  borderRadius: "9999px", 
                  fontSize: "0.9rem",
                  cursor: "pointer"
                }}
              >
                🔄 刷新/Refresh
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px", fontSize: "1.1rem" }}>
              {pwaData.wallet && (
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "12px" }}>
                  <strong>钱包地址 / Wallet Address</strong><br />
                  <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{pwaData.wallet.slice(0,6)}...{pwaData.wallet.slice(-6)}</span>
                </div>
              )}
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "12px" }}>
                <strong>连续签到 / Streak</strong><br />
                {pwaData.streak} 天 / {pwaData.streak} days
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "12px" }}>
                <strong>已赚取 PAWLY / Total Earned PAWLY</strong><br />
                {pwaData.total_pawly} PAWLY
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 20px 10px", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.6rem", marginBottom: "12px", fontWeight: "bold" }}>
          🐾 PAWLY DApp <span style={{ fontSize: "1.1rem", color: "#888" }}>Beta</span>
        </h1>
        <p style={{ fontSize: "1.15rem", color: "#ccc", lineHeight: "1.6", maxWidth: "720px", margin: "0 auto 12px" }}>
          为宠物而生的实用型加密应用 · 签到 · 质押<br />
          <span style={{ fontSize: "0.95rem", color: "#aaa" }}>A practical crypto app born for pets · Check-in · Staking</span>
        </p>
      </div>

      {/* Stablecoin 卡片 */}
      <div style={{ maxWidth: "1100px", margin: "40px auto", padding: "0 20px" }}>
        <div onClick={() => openStakeModal("stable")} style={{ background: "#1a0033", border: "2px solid #00ff9d", borderRadius: "20px", padding: "32px", cursor: "pointer", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>💰</div>
          <h2 style={{ fontSize: "1.6rem", color: "#fff" }}>Stake USDC / SOL / USDT</h2>
          <p style={{ color: "#00ff9d" }}>Solana Native + Stablecoins</p>
        </div>
      </div>

      {/* PAWLY 卡片 */}
      <div style={{ maxWidth: "1100px", margin: "30px auto", padding: "0 20px" }}>
        <div onClick={() => openStakeModal("pawly")} style={{ background: "#1a0033", border: "2px solid #00ff9d", borderRadius: "20px", padding: "32px", cursor: "pointer", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🐾</div>
          <h2 style={{ fontSize: "1.6rem", color: "#fff" }}>Stake PAWLY</h2>
          <p style={{ color: "#00ff9d" }}>PAWLY Token</p>
        </div>
      </div>

      {/* 钱包连接 */}
      <div style={{ display: "flex", justifyContent: "center", margin: "40px 0" }}>
        <WalletConnect />
      </div>

      {/* 质押弹窗 */}
      {showStakingModal && (
        <div onClick={() => setShowStakingModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#0f0f23", border: "2px solid #00ff9d", borderRadius: "20px", maxWidth: "920px", width: "95%", maxHeight: "92vh", overflow: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflow: "auto" }}>
              {stakeType === "stable" ? <StablecoinStaking /> : <PawlyStaking />}
            </div>
            <div style={{ padding: "20px", borderTop: "1px solid #333", background: "#0f0f23", textAlign: "center", position: "sticky", bottom: 0 }}>
              <button onClick={() => setShowStakingModal(false)} style={{ background: "#00ff9d", color: "#000", border: "none", borderRadius: "12px", padding: "14px 40px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", width: "100%", maxWidth: "320px", boxShadow: "0 4px 15px rgba(0, 255, 157, 0.3)" }}>
                ← 返回主页 / Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 返回 PWA 主页 */}
<div style={{ maxWidth: "1100px", margin: "40px auto 20px", padding: "0 20px", textAlign: "center" }}>
  <a
    href="https://pawlypets.netlify.app"
    style={{
      display: "inline-block",
      background: "transparent",
      color: "#00ff9d",
      border: "1px solid #00ff9d",
      padding: "12px 32px",
      borderRadius: "9999px",
      textDecoration: "none",
      fontSize: "0.95rem",
      fontWeight: 500,
    }}
  >
    ← 返回 PAWLY 主页 / Back to PAWLY PWA
  </a>
</div>

      {/* 底部声明 */}
      <div style={{ maxWidth: "1100px", margin: "60px auto 40px", padding: "0 20px" }}>
        <div style={{ background: "#1a0033", border: "1px solid #555", borderRadius: "16px", padding: "24px", fontSize: "0.95rem", color: "#aaa", lineHeight: "1.7" }}>
          本 DApp 目前为测试版本。合约审计进行中，正式版上线前将公布审计报告。<br />
          This DApp is currently in testing phase. Contract audit is in progress.
        </div>
      </div>
    </div>
  );
}

// StablecoinStaking 和 PawlyStaking 保持不变
function StablecoinStaking() {
  const { publicKey, connected } = useWallet();
  const { connection: walletConnection } = useConnection();
  const [selectedToken, setSelectedToken] = useState<'USDC' | 'SOL' | 'USDT'>('SOL');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [realBalance, setRealBalance] = useState(0);
  const [tokenData] = useState({ USDC: { tvl: 0, userStaked: 0 }, SOL: { tvl: 0, userStaked: 0 }, USDT: { tvl: 0, userStaked: 0 } });
  const [stakingHistory] = useState<any[]>([]);
  const current = tokenData[selectedToken];
  const TOKEN_MINTS = { USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' };
  const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";

  const fetchRealTokenBalance = async (token: 'USDC' | 'SOL' | 'USDT') => {
    if (!publicKey) return setRealBalance(0);
    const connection = new Connection(HELIUS_RPC, 'confirmed');
    try {
      if (token === 'SOL') {
        const balanceLamports = await connection.getBalance(publicKey);
        setRealBalance(balanceLamports / 1_000_000_000);
      } else {
        const mint = new PublicKey(TOKEN_MINTS[token]);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint });
        setRealBalance(tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount || 0);
      }
    } catch (error) {
      console.error(`Failed to fetch ${token} balance:`, error);
      setRealBalance(0);
    }
  };

  useEffect(() => {
    if (connected && publicKey) fetchRealTokenBalance(selectedToken);
    else setRealBalance(0);
  }, [connected, publicKey, selectedToken]);

  const handleMax = () => setAmount(realBalance.toString());

  const handleStake = async () => {
    if (!connected || !publicKey) return alert("请先连接钱包");
    if (!amount || parseFloat(amount) <= 0) return alert("请输入正确金额");
    setLoading(true);
    try {
      alert(`Staking 合约尚未部署，请先在 Smithii 创建 ${selectedToken} 池子后再替换逻辑。`);
    } catch (error: any) {
      alert("质押失败: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!connected || !publicKey) return alert("请先连接钱包");
    setLoading(true);
    try {
      alert("Staking 合约尚未部署，请先在 Smithii 创建池子后再替换逻辑。");
    } catch (error: any) {
      alert("赎回失败: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '28px' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {(['USDC', 'SOL', 'USDT'] as const).map((token) => (
          <button key={token} onClick={() => setSelectedToken(token)} style={{ flex: 1, padding: '14px', background: selectedToken === token ? '#00ff9d' : '#1a1a2e', color: selectedToken === token ? 'black' : 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            {token}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#1a1a2e', padding: '16px', borderRadius: '12px' }}>
          <div style={{ color: '#888', fontSize: '14px' }}>APY / 年化收益率</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffaa00' }}>To be announced / 即将公布</div>
        </div>
        <div style={{ background: '#1a1a2e', padding: '16px', borderRadius: '12px' }}>
          <div style={{ color: '#888', fontSize: '14px' }}>Total Value Locked / 总锁仓价值</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>${current.tvl.toLocaleString()}</div>
        </div>
        <div style={{ background: '#1a1a2e', padding: '16px', borderRadius: '12px' }}>
          <div style={{ color: '#888', fontSize: '14px' }}>Your Staked / 你的质押量</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{current.userStaked} {selectedToken}</div>
        </div>
        <div style={{ background: '#1a1a2e', padding: '16px', borderRadius: '12px' }}>
          <div style={{ color: '#888', fontSize: '14px' }}>Wallet Balance / 钱包余额（链上）</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#00ff9d' }}>
            {realBalance.toFixed(4)} {selectedToken}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#aaa' }}>Amount / 质押数量</span>
          <button onClick={handleMax} style={{ background: 'transparent', color: '#00ff9d', border: '1px solid #00ff9d', padding: '4px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
            MAX / 最大
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', background: '#1a1a2e', borderRadius: '12px', padding: '0 16px' }}>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            placeholder="0.00" 
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '22px', padding: '16px 0', outline: 'none' }} 
          />
          <span style={{ color: '#888', fontWeight: 'bold' }}>{selectedToken}</span>
        </div>
      </div>

      <div style={{ background: '#1a1a2e', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px' }}>
        <div style={{ color: '#888', fontSize: '14px', marginBottom: '4px' }}>奖励机制 / Reward Mechanism</div>
        <div style={{ color: '#ffaa00', fontSize: '16px', fontWeight: 'bold' }}>
          To be announced（将在 PAWLY Token 上线后公布） / To be announced (will be announced after PAWLY Token launch)
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button 
          onClick={handleStake} 
          disabled={loading || !amount} 
          style={{ 
            flex: 1, 
            background: '#00ff9d', 
            color: 'black', 
            padding: '16px', 
            border: 'none', 
            borderRadius: '14px', 
            fontWeight: 'bold', 
            fontSize: '16px', 
            cursor: loading || !amount ? 'not-allowed' : 'pointer', 
            opacity: loading || !amount ? 0.6 : 1 
          }}
        >
          {loading && txStatus === 'loading' ? 'Processing... / 处理中...' : 'Stake / 质押'}
        </button>
        <button 
          onClick={handleUnstake} 
          disabled={loading} 
          style={{ 
            flex: 1, 
            background: 'transparent', 
            color: 'white', 
            padding: '16px', 
            border: '2px solid #555', 
            borderRadius: '14px', 
            fontWeight: 'bold', 
            fontSize: '16px', 
            cursor: loading ? 'not-allowed' : 'pointer' 
          }}
        >
          Unstake / 赎回
        </button>
      </div>

      {txStatus !== 'idle' && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: '10px', 
          marginBottom: '16px', 
          background: txStatus === 'success' ? '#0a3d2e' : txStatus === 'error' ? '#3d1a1a' : '#1a1a2e', 
          color: txStatus === 'success' ? '#00ff9d' : txStatus === 'error' ? '#ff6b6b' : '#aaa' 
        }}>
          {statusMessage}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h4 style={{ color: '#aaa', marginBottom: '12px', fontSize: '16px' }}>Staking History / 质押历史记录</h4>
        {stakingHistory.length > 0 ? (
          <div style={{ background: '#1a1a2e', borderRadius: '12px', overflow: 'hidden' }}>
            {stakingHistory.slice(0, 6).map((record, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: index !== stakingHistory.length - 1 ? '1px solid #333' : 'none' }}>
                <div>
                  <span style={{ color: record.type === 'Stake' ? '#00ff9d' : '#ff6b6b', fontWeight: 'bold' }}>{record.type}</span>
                  <span style={{ color: '#ccc', marginLeft: '8px' }}>{record.amount} {record.token}</span>
                </div>
                <div style={{ color: '#888', fontSize: '13px' }}>{record.time}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', fontSize: '14px' }}>No staking records yet / 暂无质押记录</p>
        )}
      </div>

      <p style={{ color: '#888', fontSize: '13px', textAlign: 'center', marginTop: '24px', lineHeight: '1.6' }}>
        已支持 USDC / SOL / USDT 链上余额读取<br />Supports USDC / SOL / USDT on-chain balance reading
      </p>
    </div>
  );
}

function PawlyStaking() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ background: '#1a0033', border: '1px solid #00ff9d', borderRadius: '16px', padding: '32px' }}>
        <h3 style={{ color: '#00ff9d', marginBottom: '20px', fontSize: '1.8rem' }}>🐾 PAWLY Staking</h3>
        <div style={{ textAlign: 'left', lineHeight: '1.8', fontSize: '1.05rem' }}>
          <p><strong>中文：</strong>Staking 功能开发中...（已接入钱包，可扩展真实质押逻辑）</p>
          <p><strong>English：</strong>Staking feature is under development... (Wallet connected, ready for real staking logic expansion)</p>
        </div>
        <div style={{ marginTop: '40px' }}>
          <button disabled style={{ background: '#333', color: '#888', padding: '16px 60px', border: 'none', borderRadius: '14px', fontSize: '1.1em', cursor: 'not-allowed' }}>
            即将开放 / Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <AppContent />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </BrowserRouter>
  );
}

export default App;