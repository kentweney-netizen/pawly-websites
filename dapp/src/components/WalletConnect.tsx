import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletMultiButton,
  useWalletModal,
} from "@solana/wallet-adapter-react-ui";
import { createClient } from "@supabase/supabase-js";

// ==================== Supabase 配置 ====================
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://iqmyiqjgzrlwthilkeos.supabase.co";

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function WalletConnect() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [syncStatus, setSyncStatus] = useState(""); // 同步状态提示

   // 断开连接：未连接时也可点（无操作提示）
  const handleDisconnect = () => {
    if (!connected) {
      alert("当前没有连接钱包\nNo wallet connected");
      return;
    }
    disconnect();
  };

  // 更换 / 选择钱包：未连接时直接弹出选择；已连接时先断开再弹出
  const handleChangeWallet = () => {
    if (connected) {
      disconnect();
      setTimeout(() => {
        setVisible(true);
      }, 250);
    } else {
      setVisible(true);
    }
  };

  const handleConnectOrReselect = () => {
    if (connected) {
      disconnect();
      setTimeout(() => {
        setVisible(true);
      }, 250);
    } else {
      setVisible(true);
    }
  };

  // ==================== 钱包连接成功后自动同步到 Supabase ====================
  useEffect(() => {
    const syncWalletToSupabase = async () => {
      if (connected && publicKey) {
        const walletAddress = publicKey.toString();

        try {
          const { error } = await supabase.from("USERS").upsert(
            {
              wallet_address: walletAddress,
              last_wallet_connected_at: new Date().toISOString(),
            },
            { onConflict: "wallet_address" }
          );

          if (error) {
            console.error("同步钱包地址到 Supabase 失败:", error);
            setSyncStatus("❌ 同步失败");
          } else {
            console.log("✅ 钱包地址已成功同步到 Supabase:", walletAddress);
            setSyncStatus("✅ 已同步");
          }
        } catch (err) {
          console.error("Supabase upsert 出错:", err);
          setSyncStatus("❌ 同步出错");
        }
      }
    };

    syncWalletToSupabase();
  }, [connected, publicKey]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        padding: "20px",
        background: "rgba(0, 255, 157, 0.06)",
        borderRadius: "16px",
        border: "1px solid #00ff9d",
      }}
    >
      {!connected && <WalletMultiButton />}

      {connected && (
        <button
          onClick={handleConnectOrReselect}
          style={{
            background: "#512da8",
            color: "#fff",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
            minWidth: "180px",
          }}
        >
          Connect
        </button>
      )}

      {/* 断开连接 - 亮红色 */}
<button
  onClick={handleDisconnect}
  style={{
    background: "linear-gradient(135deg, #ff4d4d, #ff1a1a)",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "700",
    width: "220px",
    boxShadow: "0 4px 15px rgba(255, 50, 50, 0.45)",
  }}
>
  断开连接 / Disconnect Wallet
</button>

{/* 更换钱包 - 亮绿色 */}
<button
  onClick={handleChangeWallet}
  style={{
    background: "linear-gradient(135deg, #00ff9d, #00c853)",
    color: "#000",
    border: "none",
    padding: "12px 24px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "700",
    width: "220px",
    boxShadow: "0 4px 15px rgba(0, 255, 157, 0.45)",
  }}
>
  更换钱包 / Change Wallet
</button>

      {/* 已连接时显示当前钱包地址 */}
      {connected && publicKey && (
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "0.85em",
            color: "#888",
            marginTop: "4px",
            wordBreak: "break-all",
            textAlign: "center",
          }}
        >
          {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-6)}
        </div>
      )}

      {/* 同步状态提示 */}
      {syncStatus && (
        <div
          style={{
            fontSize: "0.9rem",
            marginTop: "8px",
            color: syncStatus.includes("✅") ? "#00ff9d" : "#ff6b6b",
          }}
        >
          {syncStatus}
        </div>
      )}
    </div>
  );
}