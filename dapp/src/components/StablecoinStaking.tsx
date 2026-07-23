import React, { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

interface StakingRecord {
  id: number;
  type: "Stake" | "Unstake";
  token: "USDC" | "USDT";
  amount: number;
  time: string;
  signature?: string;
}

const TOKEN_MINTS = {
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
};

export default function StablecoinStaking() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [selectedToken, setSelectedToken] = useState<"USDC" | "USDT">("USDC");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [realBalance, setRealBalance] = useState(0);

  const [tokenData, setTokenData] = useState({
    USDC: { tvl: 0, userStaked: 0 },
    USDT: { tvl: 0, userStaked: 0 },
  });

  const [stakingHistory, setStakingHistory] = useState<StakingRecord[]>([]);

  const current = tokenData[selectedToken];

  // ==================== 读取真实余额（已优化，增加容错） ====================
  const fetchRealTokenBalance = async (token: "USDC" | "USDT") => {
    if (!publicKey) {
      setRealBalance(0);
      return;
    }

    const heliusRpc =
      "https://mainnet.helius-rpc.com/?api-key=a0821dec-85d2-4ba6-b2e8-24ca0da547c2";
    const connection = new Connection(heliusRpc, "confirmed");

    try {
      const mintAddress = TOKEN_MINTS[token];
      const mint = new PublicKey(mintAddress);

      // 使用 getParsedTokenAccountsByOwner 比 getTokenAccountBalance 更稳定
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: mint }
      );

      if (tokenAccounts.value.length > 0) {
        const balance =
          tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        const uiAmount = balance || 0;

        setRealBalance(uiAmount);
        console.log(`✅ ${token} 余额读取成功:`, uiAmount);
      } else {
        // 用户没有这个代币的 ATA
        setRealBalance(0);
        console.log(`ℹ️ ${token} 余额为 0（未创建 ATA）`);
      }
    } catch (error: any) {
      console.error(`❌ 读取 ${token} 余额失败:`, error.message || error);
      setRealBalance(0);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      fetchRealTokenBalance(selectedToken);
    } else {
      setRealBalance(0);
    }
  }, [connected, publicKey, selectedToken]);

  const handleMax = () => {
    setAmount(realBalance.toString());
  };

  // ==================== Stake ====================
  const handleStake = async () => {
    if (!connected || !publicKey) {
      alert("请先连接钱包 / Please connect your wallet first");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert("请输入正确的质押金额 / Please enter a valid amount");
      return;
    }

    setLoading(true);
    setTxStatus("loading");
    setStatusMessage(
      "正在准备交易，请在钱包中确认... / Preparing transaction..."
    );

    try {
      alert(
        "目前 Staking 合约尚未在 Smithii 部署。\n\n" +
          "请先在 Smithii 创建 USDC 池子，拿到 Program ID 和 Pool Address 后，" +
          "再把真实交易逻辑替换到此函数中。\n\n" +
          "The Staking contract has not been deployed on Smithii yet.\n\n" +
          "Please create a USDC pool on Smithii first. Once you have the Program ID and Pool Address, " +
          "replace the real transaction logic in this function."
      );
    } catch (error: any) {
      console.error(error);
      setTxStatus("error");
      setStatusMessage("质押失败: " + (error.message || "未知错误"));
    } finally {
      setLoading(false);
    }
  };

  // ==================== Unstake ====================
  const handleUnstake = async () => {
    if (!connected || !publicKey) {
      alert("请先连接钱包 / Please connect your wallet first");
      return;
    }

    setLoading(true);
    setTxStatus("loading");
    setStatusMessage("正在准备赎回交易... / Preparing unstake transaction...");

    try {
      alert(
        "目前 Staking 合约尚未在 Smithii 部署。\n\n" +
          "请先在 Smithii 创建池子，拿到 Program ID 和 Pool Address 后，" +
          "再把真实赎回逻辑替换到此函数中。\n\n" +
          "The Staking contract has not been deployed on Smithii yet.\n\n" +
          "Please create a pool on Smithii first. Once you have the Program ID and Pool Address, " +
          "replace the real unstake logic in this function."
      );
    } catch (error: any) {
      setTxStatus("error");
      setStatusMessage("赎回失败: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#0f0f23",
        border: "2px solid #333",
        borderRadius: "20px",
        padding: "28px",
      }}
    >
      {/* 币种选择 */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        {(["USDC", "USDT"] as const).map((token) => (
          <button
            key={token}
            onClick={() => setSelectedToken(token)}
            style={{
              flex: 1,
              padding: "14px",
              background: selectedToken === token ? "#00ff9d" : "#1a1a2e",
              color: selectedToken === token ? "black" : "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {token}
          </button>
        ))}
      </div>

      {/* 数据展示 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "#1a1a2e",
            padding: "16px",
            borderRadius: "12px",
          }}
        >
          <div style={{ color: "#888", fontSize: "14px" }}>
            APY / 年化收益率
          </div>
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#ffaa00" }}
          >
            To be announced / 即将公布
          </div>
        </div>
        <div
          style={{
            background: "#1a1a2e",
            padding: "16px",
            borderRadius: "12px",
          }}
        >
          <div style={{ color: "#888", fontSize: "14px" }}>
            Total Value Locked / 总锁仓价值
          </div>
          <div style={{ fontSize: "22px", fontWeight: "bold" }}>
            ${current.tvl.toLocaleString()}
          </div>
        </div>
        <div
          style={{
            background: "#1a1a2e",
            padding: "16px",
            borderRadius: "12px",
          }}
        >
          <div style={{ color: "#888", fontSize: "14px" }}>
            Your Staked / 你的质押量
          </div>
          <div style={{ fontSize: "22px", fontWeight: "bold" }}>
            {current.userStaked} {selectedToken}
          </div>
        </div>
        <div
          style={{
            background: "#1a1a2e",
            padding: "16px",
            borderRadius: "12px",
          }}
        >
          <div style={{ color: "#888", fontSize: "14px" }}>
            Wallet Balance / 钱包余额（链上）
          </div>
          <div
            style={{ fontSize: "22px", fontWeight: "bold", color: "#00ff9d" }}
          >
            {realBalance.toFixed(2)} {selectedToken}
          </div>
        </div>
      </div>

      {/* 输入金额 + MAX */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span style={{ color: "#aaa" }}>Amount / 质押数量</span>
          <button
            onClick={handleMax}
            style={{
              background: "transparent",
              color: "#00ff9d",
              border: "1px solid #00ff9d",
              padding: "4px 14px",
              borderRadius: "6px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            MAX / 最大
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#1a1a2e",
            borderRadius: "12px",
            padding: "0 16px",
          }}
        >
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "white",
              fontSize: "22px",
              padding: "16px 0",
              outline: "none",
            }}
          />
          <span style={{ color: "#888", fontWeight: "bold" }}>
            {selectedToken}
          </span>
        </div>
      </div>

      {/* 奖励机制 */}
      <div
        style={{
          background: "#1a1a2e",
          padding: "14px 18px",
          borderRadius: "10px",
          marginBottom: "20px",
        }}
      >
        <div style={{ color: "#888", fontSize: "14px", marginBottom: "4px" }}>
          奖励机制 / Reward Mechanism
        </div>
        <div style={{ color: "#ffaa00", fontSize: "16px", fontWeight: "bold" }}>
          To be announced（将在 PAWLY Token 上线后公布）
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <button
          onClick={handleStake}
          disabled={loading || !amount}
          style={{
            flex: 1,
            background: "#00ff9d",
            color: "black",
            padding: "16px",
            border: "none",
            borderRadius: "14px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: loading || !amount ? "not-allowed" : "pointer",
            opacity: loading || !amount ? 0.6 : 1,
          }}
        >
          {loading && txStatus === "loading" ? "Processing..." : "Stake / 质押"}
        </button>

        <button
          onClick={handleUnstake}
          disabled={loading}
          style={{
            flex: 1,
            background: "transparent",
            color: "white",
            padding: "16px",
            border: "2px solid #555",
            borderRadius: "14px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Unstake / 赎回
        </button>
      </div>

      {/* 交易状态 */}
      {txStatus !== "idle" && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "16px",
            background:
              txStatus === "success"
                ? "#0a3d2e"
                : txStatus === "error"
                ? "#3d1a1a"
                : "#1a1a2e",
            color:
              txStatus === "success"
                ? "#00ff9d"
                : txStatus === "error"
                ? "#ff6b6b"
                : "#aaa",
            fontSize: "15px",
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* 历史记录 */}
      <div style={{ marginTop: "30px" }}>
        <h4 style={{ color: "#aaa", marginBottom: "12px", fontSize: "16px" }}>
          Staking History / 质押历史记录
        </h4>
        {stakingHistory.length > 0 ? (
          <div
            style={{
              background: "#1a1a2e",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            {stakingHistory.slice(0, 6).map((record, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  borderBottom:
                    index !== stakingHistory.length - 1
                      ? "1px solid #333"
                      : "none",
                }}
              >
                <div>
                  <span
                    style={{
                      color: record.type === "Stake" ? "#00ff9d" : "#ff6b6b",
                      fontWeight: "bold",
                    }}
                  >
                    {record.type}
                  </span>
                  <span style={{ color: "#ccc", marginLeft: "8px" }}>
                    {record.amount} {record.token}
                  </span>
                </div>
                <div style={{ color: "#888", fontSize: "13px" }}>
                  {record.time}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#666", fontSize: "14px" }}>
            No staking records yet / 暂无质押记录
          </p>
        )}
      </div>

      {/* 底部提示 */}
      <p
        style={{
          color: "#888",
          fontSize: "13px",
          textAlign: "center",
          marginTop: "24px",
          lineHeight: "1.6",
        }}
      >
        已上线真实链上质押简化版
        <br />
        Real on-chain staking (simplified version) is now live.
        <br />
        更多币种与 PAWLY 质押功能即将推出 / More tokens and PAWLY staking coming
        soon.
      </p>
    </div>
  );
}
