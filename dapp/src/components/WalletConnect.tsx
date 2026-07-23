import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletMultiButton,
  useWalletModal,
} from "@solana/wallet-adapter-react-ui";
import { createClient } from "@supabase/supabase-js";

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
  const [syncStatus, setSyncStatus] = useState("");

  // 已连接时再点 → 断开并重新弹出选择钱包
  const handleReselectWallet = () => {
    if (connected) {
      disconnect();
      setTimeout(() => {
        setVisible(true);
      }, 250);
    } else {
      setVisible(true);
    }
  };

  const handleDisconnect = () => {
    if (!connected) return;
    disconnect();
  };

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
            console.error("同步钱包地址失败:", error);
            setSyncStatus("❌ 同步失败");
          } else {
            console.log("✅ 钱包已同步:", walletAddress);
            setSyncStatus("✅ 已同步");
          }
        } catch (err) {
          console.error("Supabase 出错:", err);
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
      {/* 官方按钮：首次连接用 */}
      <WalletMultiButton />

      {/* 已连接后：再点可重新选择钱包平台 */}
      {connected && (
        <button
          onClick={handleReselectWallet}
          style={{
            background: "linear-gradient(135deg, #7c3aed, #00ff9d)",
            color: "#000",
            border: "none",
            padding: "12px 28px",
            borderRadius: "12px",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: "600",
            width: "240px",
          }}
        >
          🔄 重新选择钱包 / Reselect Wallet
        </button>
      )}

      <button
        onClick={handleDisconnect}
        disabled={!connected}
        style={{
          background: "transparent",
          color: connected ? "#ff6b6b" : "#666",
          border: `1px solid ${connected ? "#ff6b6b" : "#444"}`,
          padding: "10px 24px",
          borderRadius: "10px",
          cursor: connected ? "pointer" : "not-allowed",
          fontSize: "15px",
          fontWeight: "500",
          width: "240px",
          opacity: connected ? 1 : 0.5,
        }}
      >
        断开连接 / Disconnect Wallet
      </button>

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
