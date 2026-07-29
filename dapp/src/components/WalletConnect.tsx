import React, { useEffect, useState, useMemo, useCallback } from "react";
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

const DAPP_CANONICAL = "https://pawlypets.netlify.app/dapp";

function getCurrentDappUrl() {
  if (typeof window === "undefined") return DAPP_CANONICAL;
  const href = window.location.href.split("#")[0].split("?")[0];
  if (href.includes("/dapp")) return href.endsWith("/") ? href.slice(0, -1) : href;
  return DAPP_CANONICAL;
}

/** 与 App.tsx wallets 对齐的全平台深链 / 打开方式 */
function buildWalletOpenLinks(targetUrl: string) {
  const encoded = encodeURIComponent(targetUrl);
  const ref = encodeURIComponent("https://pawlypets.netlify.app");

  return [
    {
      id: "phantom",
      name: "Phantom",
      nameZh: "Phantom",
      emoji: "👻",
      color: "linear-gradient(135deg, #ab9ff2, #7c6fd6)",
      textColor: "#1a1030",
      // 官方 Universal Link：在 App 内置浏览器打开 dApp
      href: `https://phantom.app/ul/browse/${encoded}?ref=${ref}`,
      tip: "推荐 · Recommended",
    },
    {
      id: "solflare",
      name: "Solflare",
      nameZh: "Solflare",
      emoji: "☀️",
      color: "linear-gradient(135deg, #fc6, #f90)",
      textColor: "#1a1000",
      href: `https://solflare.com/ul/v1/browse/${encoded}`,
      tip: "",
    },
    {
      id: "trust",
      name: "Trust Wallet",
      nameZh: "Trust 钱包",
      emoji: "🛡️",
      color: "linear-gradient(135deg, #3375bb, #1a4a8a)",
      textColor: "#fff",
      // Trust：用内置浏览器打开 dApp（Solana coin_id=501）
      href: `https://link.trustwallet.com/open_url?coin_id=501&url=${encoded}`,
      tip: "",
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      nameZh: "Coinbase 钱包",
      emoji: "🔵",
      color: "linear-gradient(135deg, #0052ff, #0039b3)",
      textColor: "#fff",
      href: `https://go.cb-w.com/dapp?cb_url=${encoded}`,
      tip: "",
    },
  ];
}

function detectEnv() {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return {
      isAndroid: false,
      isIOS: false,
      isMobile: false,
      inPhantom: false,
      inSolflare: false,
      inTrust: false,
      inCoinbase: false,
      inWalletBrowser: false,
    };
  }
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isAndroid || isIOS || /Mobile/i.test(ua);

  const w = window as any;
  const sol = w.solana || w.phantom?.solana;
  const inPhantom =
    !!(sol && (sol.isPhantom || sol.provider?.isPhantom)) || /Phantom/i.test(ua);
  const inSolflare =
    !!w.solflare || !!(sol && sol.isSolflare) || /Solflare/i.test(ua);
  const inTrust = !!w.trustwallet || /Trust/i.test(ua);
  const inCoinbase =
    !!w.coinbaseSolana || !!w.coinbaseWalletExtension || /Coinbase/i.test(ua);
  const inWalletBrowser = inPhantom || inSolflare || inTrust || inCoinbase;

  return {
    isAndroid,
    isIOS,
    isMobile,
    inPhantom,
    inSolflare,
    inTrust,
    inCoinbase,
    inWalletBrowser,
  };
}

export default function WalletConnect() {
  const { publicKey, connected, disconnect, connecting, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [syncStatus, setSyncStatus] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showAllWallets, setShowAllWallets] = useState(true);

  const env = useMemo(() => detectEnv(), []);
  const walletLinks = useMemo(
    () => buildWalletOpenLinks(getCurrentDappUrl()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeof window !== "undefined" ? window.location.href : ""]
  );

  // Android / iOS 外站：优先深链进钱包 App，避免跳下载页
  const needsDeepLinkOpen =
    env.isMobile && !env.inWalletBrowser && !connected;

  const openLink = useCallback((href: string) => {
    try {
      window.location.href = href;
    } catch (_) {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleDisconnect = () => {
    if (!connected) {
      alert("当前没有连接签名钱包\nNo signing wallet connected");
      return;
    }
    disconnect();
    setSyncStatus("");
  };

  const handleChangeWallet = () => {
    if (needsDeepLinkOpen) {
      setShowAllWallets(true);
      return;
    }
    if (connected) {
      disconnect();
      setTimeout(() => setVisible(true), 280);
    } else {
      setVisible(true);
    }
  };

  const handleConnectModal = () => {
    if (needsDeepLinkOpen) {
      setShowAllWallets(true);
      return;
    }
    if (connected) {
      disconnect();
      setTimeout(() => setVisible(true), 280);
    } else {
      setVisible(true);
    }
  };

  // 软同步：不 upsert 空行，避免 RLS 导致「同步失败」
  useEffect(() => {
    const softSync = async () => {
      if (!connected || !publicKey) return;
      const walletAddress = publicKey.toString();
      try {
        const { data: row } = await supabase
          .from("USERS")
          .select("id")
          .eq("wallet_address", walletAddress)
          .maybeSingle();

        if (!row?.id) {
          setSyncStatus("✓ 签名钱包已连接 / Signing wallet connected");
          return;
        }

        const { error } = await supabase
          .from("USERS")
          .update({ last_wallet_connected_at: new Date().toISOString() })
          .eq("id", row.id);

        if (error) {
          console.warn("wallet soft-sync skipped:", error.message);
          setSyncStatus("✓ 签名钱包已连接 / Signing wallet connected");
        } else {
          setSyncStatus("✅ 已同步 / Synced");
        }
      } catch (e) {
        console.warn("wallet soft-sync error", e);
        setSyncStatus("✓ 签名钱包已连接 / Signing wallet connected");
      }
    };
    softSync();
  }, [connected, publicKey]);

  const envLabel = env.inPhantom
    ? "Phantom"
    : env.inSolflare
      ? "Solflare"
      : env.inTrust
        ? "Trust"
        : env.inCoinbase
          ? "Coinbase"
          : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: 18,
        background: "rgba(0, 255, 157, 0.06)",
        borderRadius: 16,
        border: "1px solid #00ff9d",
        width: "100%",
        maxWidth: 380,
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: 11, color: "#778", letterSpacing: 0.3 }}>
        {env.isAndroid ? "📱 Android" : env.isIOS ? "📱 iOS" : "💻 Desktop"}
        {envLabel ? ` · ${envLabel} 内` : ""}
        {connecting ? " · 连接中…" : ""}
        {connected && wallet?.adapter?.name ? ` · ${wallet.adapter.name}` : ""}
      </div>

      {/* ========== 手机外站：全平台「在钱包 App 内打开 dApp」 ========== */}
      {needsDeepLinkOpen && (
        <>
          <div
            style={{
              background: "rgba(255, 170, 0, 0.12)",
              border: "1px solid rgba(255, 170, 0, 0.4)",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 12,
              lineHeight: 1.5,
              color: "#ffcc80",
              textAlign: "left",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            ⚠️ 在 APK / 系统浏览器里直接 Connect，常会打开钱包<strong>官网下载页</strong>，而不是已安装的 App。
            <br />
            请先选你的钱包，在 <strong>App 内置浏览器</strong>打开本 dApp，再连接签名。
            <br />
            <span style={{ color: "#c9a06a" }}>
              On mobile, Connect often opens the wallet website. Open this dApp
              inside your wallet app first, then connect.
            </span>
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#9aa",
                marginBottom: 2,
                textAlign: "center",
              }}
            >
              选择钱包打开 dApp / Open dApp in wallet
            </div>

            {walletLinks.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => openLink(w.href)}
                style={{
                  background: w.color,
                  color: w.textColor,
                  border: "none",
                  padding: "13px 16px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 800,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 3px 12px rgba(0,0,0,0.25)",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span>
                  {w.emoji} {w.nameZh} / {w.name}
                </span>
                {w.tip ? (
                  <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>
                    {w.tip}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, opacity: 0.7 }}>打开 ↗</span>
                )}
              </button>
            ))}
          </div>

          {/* Mobile Wallet Adapter：系统钱包选择器（Seed Vault 等） */}
          <button
            type="button"
            onClick={() => setVisible(true)}
            style={{
              background: "linear-gradient(135deg, #00ff9d, #00c853)",
              color: "#04140c",
              border: "none",
              padding: "13px 16px",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 800,
              width: "100%",
              boxShadow: "0 3px 14px rgba(0,255,157,0.35)",
              touchAction: "manipulation",
            }}
          >
            📲 系统钱包 / Mobile Wallet Adapter
          </button>

          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "#889",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            支持：Phantom · Solflare · Trust · Coinbase · MWA
            <br />
            打开后若未自动连接，在钱包内再点一次 Connect。
            <br />
            After opening, tap Connect once inside the wallet if needed.
          </p>
        </>
      )}

      {/* ========== 已在钱包浏览器 / 桌面：正常连接 ========== */}
      {!needsDeepLinkOpen && (
        <>
          {!connected ? (
            <button
              type="button"
              onClick={handleConnectModal}
              disabled={connecting}
              style={{
                background: "linear-gradient(135deg, #512da8, #7c3aed)",
                color: "#fff",
                border: "none",
                padding: "14px 28px",
                borderRadius: 12,
                cursor: connecting ? "wait" : "pointer",
                fontSize: 16,
                fontWeight: 700,
                minWidth: 200,
                boxShadow: "0 4px 18px rgba(124, 58, 237, 0.4)",
                opacity: connecting ? 0.7 : 1,
                touchAction: "manipulation",
              }}
            >
              {connecting
                ? "连接中… / Connecting…"
                : "连接签名钱包 / Connect Wallet"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnectModal}
              style={{
                background: "#512da8",
                color: "#fff",
                border: "none",
                padding: "12px 24px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 600,
                minWidth: 180,
                touchAction: "manipulation",
              }}
            >
              重新选择 / Reselect
            </button>
          )}

          {!connected && (
            <div style={{ transform: "scale(0.92)", opacity: 0.95 }}>
              <WalletMultiButton />
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={handleDisconnect}
        style={{
          background: "linear-gradient(135deg, #ff4d4d, #ff1a1a)",
          color: "#fff",
          border: "none",
          padding: "12px 24px",
          borderRadius: 12,
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 700,
          width: 240,
          boxShadow: "0 4px 15px rgba(255, 50, 50, 0.45)",
          touchAction: "manipulation",
        }}
      >
        断开连接 / Disconnect
      </button>

      <button
        type="button"
        onClick={handleChangeWallet}
        style={{
          background: "linear-gradient(135deg, #00ff9d, #00c853)",
          color: "#000",
          border: "none",
          padding: "12px 24px",
          borderRadius: 12,
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 700,
          width: 240,
          boxShadow: "0 4px 15px rgba(0, 255, 157, 0.45)",
          touchAction: "manipulation",
        }}
      >
        更换钱包 / Change Wallet
      </button>

      {connected && publicKey && (
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "0.85em",
            color: "#888",
            wordBreak: "break-all",
            textAlign: "center",
          }}
        >
          {publicKey.toBase58().slice(0, 6)}...
          {publicKey.toBase58().slice(-6)}
        </div>
      )}

      {syncStatus && (
        <div
          style={{
            fontSize: "0.85rem",
            color: syncStatus.includes("❌") ? "#ff6b6b" : "#00ff9d",
          }}
        >
          {syncStatus}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowHelp((v) => !v)}
        style={{
          background: "transparent",
          border: "1px solid rgba(139, 92, 246, 0.4)",
          color: "#c4b5fd",
          borderRadius: 999,
          padding: "6px 14px",
          fontSize: 12,
          cursor: "pointer",
          touchAction: "manipulation",
        }}
      >
        {showHelp
          ? "收起说明 / Hide tips"
          : "连接说明 · 全平台 / All-wallet tips"}
      </button>

      {showHelp && (
        <div
          style={{
            marginTop: 4,
            padding: "12px 14px",
            background: "rgba(139, 92, 246, 0.12)",
            border: "1px solid rgba(139, 92, 246, 0.35)",
            borderRadius: 12,
            fontSize: 12,
            lineHeight: 1.55,
            color: "#c4b5fd",
            textAlign: "left",
            maxWidth: 340,
          }}
        >
          <strong style={{ color: "#e9ddff" }}>支持的钱包 / Supported</strong>
          <br />
          Phantom · Solflare · Trust Wallet · Coinbase Wallet · Mobile Wallet
          Adapter（系统钱包）
          <br />
          <br />
          <strong style={{ color: "#e9ddff" }}>Android / APK</strong>
          <br />
          请点对应按钮，在<strong>钱包 App 内</strong>打开本页，再 Connect。
          直接在系统浏览器点 Connect 容易进官网下载页。
          <br />
          <br />
          <strong style={{ color: "#e9ddff" }}>iOS</strong>
          <br />
          多数情况可直接 Connect；若跳转异常，同样可用「在钱包内打开」。
          <br />
          <br />
          <strong style={{ color: "#e9ddff" }}>Desktop</strong>
          <br />
          安装浏览器扩展后点 Connect 即可。
          <br />
          <br />
          <span style={{ color: "#a78bfa" }}>
            「我的数据」来自 PWA 邮箱绑定，无需连钱包也能查看。Connect
            只用于质押 / 转账 / 兑换等签名。
            <br />
            My Data is from PWA login. Connect is only for signing actions.
          </span>
        </div>
      )}
    </div>
  );
}
