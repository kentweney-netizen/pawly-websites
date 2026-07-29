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

/** 与 App.tsx wallets 对齐 */
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
      href: `https://phantom.app/ul/browse/${encoded}?ref=${ref}`,
    },
    {
      id: "solflare",
      name: "Solflare",
      nameZh: "Solflare",
      emoji: "☀️",
      color: "linear-gradient(135deg, #fc6, #f90)",
      textColor: "#1a1000",
      href: `https://solflare.com/ul/v1/browse/${encoded}`,
    },
    {
      id: "trust",
      name: "Trust Wallet",
      nameZh: "Trust 钱包",
      emoji: "🛡️",
      color: "linear-gradient(135deg, #3375bb, #1a4a8a)",
      textColor: "#fff",
      href: `https://link.trustwallet.com/open_url?coin_id=501&url=${encoded}`,
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      nameZh: "Coinbase 钱包",
      emoji: "🔵",
      color: "linear-gradient(135deg, #0052ff, #0039b3)",
      textColor: "#fff",
      href: `https://go.cb-w.com/dapp?cb_url=${encoded}`,
    },
  ];
}

function detectEnv() {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return {
      isAndroid: false,
      isIOS: false,
      isMobile: false,
      inWalletBrowser: false,
      envLabel: null as string | null,
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
  const envLabel = inPhantom
    ? "Phantom"
    : inSolflare
      ? "Solflare"
      : inTrust
        ? "Trust"
        : inCoinbase
          ? "Coinbase"
          : null;
  return { isAndroid, isIOS, isMobile, inWalletBrowser, envLabel };
}

export default function WalletConnect() {
  const { publicKey, connected, disconnect, connecting, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [syncStatus, setSyncStatus] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const env = useMemo(() => detectEnv(), []);
  const walletLinks = useMemo(
    () => buildWalletOpenLinks(getCurrentDappUrl()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeof window !== "undefined" ? window.location.href : ""]
  );

  /** 手机 + 不在钱包内 → 用弹窗深链；否则用官方 modal */
  const useDeepLinkFlow = env.isMobile && !env.inWalletBrowser;

  const openLink = useCallback((href: string) => {
    setShowPicker(false);
    try {
      window.location.href = href;
    } catch (_) {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }, []);

  /** 断开：始终可点 */
  const handleDisconnect = () => {
    setShowPicker(false);
    if (!connected) {
      alert(
        "当前没有连接签名钱包\n可点「请选择您的钱包平台」重新连接\n\nNo signing wallet connected.\nTap “Choose your wallet platform” to connect."
      );
      return;
    }
    disconnect();
    setSyncStatus("");
  };

  /** 更换钱包：始终可点 —— 先断开再打开选择 */
  const handleChangeWallet = () => {
    if (connected) {
      disconnect();
      setSyncStatus("");
      setTimeout(() => {
        if (useDeepLinkFlow) {
          setShowPicker(true);
        } else {
          setVisible(true);
        }
      }, 280);
      return;
    }
    // 未连接：直接打开选择
    if (useDeepLinkFlow) {
      setShowPicker(true);
    } else {
      setVisible(true);
    }
  };

  /** 主按钮：选择平台 */
  const handleChoosePlatform = () => {
    if (useDeepLinkFlow) {
      setShowPicker(true);
      return;
    }
    // 已在钱包内 / 桌面
    if (connected) {
      disconnect();
      setTimeout(() => setVisible(true), 280);
    } else {
      setVisible(true);
    }
  };

  /** 弹窗内：系统钱包 MWA */
  const handleMwa = () => {
    setShowPicker(false);
    setVisible(true);
  };

  // 软同步
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
          setSyncStatus("✓ 签名钱包已连接 / Signing wallet connected");
        } else {
          setSyncStatus("✅ 已同步 / Synced");
        }
      } catch (_) {
        setSyncStatus("✓ 签名钱包已连接 / Signing wallet connected");
      }
    };
    softSync();
  }, [connected, publicKey]);

  const btnBase: React.CSSProperties = {
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };

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
        position: "relative",
      }}
    >
      <div style={{ fontSize: 11, color: "#778", letterSpacing: 0.3 }}>
        {env.isAndroid ? "📱 Android" : env.isIOS ? "📱 iOS" : "💻 Desktop"}
        {env.envLabel ? ` · ${env.envLabel}` : ""}
        {connecting ? " · 连接中… / Connecting…" : ""}
        {connected && wallet?.adapter?.name ? ` · ${wallet.adapter.name}` : ""}
      </div>

      {/* ===== 主按钮：只显示一个「请选择您的钱包平台」 ===== */}
      <button
        type="button"
        onClick={handleChoosePlatform}
        disabled={connecting}
        style={{
          ...btnBase,
          background: connecting
            ? "#444"
            : "linear-gradient(135deg, #512da8, #7c3aed)",
          color: "#fff",
          padding: "14px 20px",
          fontSize: 15,
          width: "100%",
          maxWidth: 300,
          boxShadow: "0 4px 18px rgba(124, 58, 237, 0.4)",
          opacity: connecting ? 0.75 : 1,
          lineHeight: 1.35,
        }}
      >
        {connecting
          ? "连接中… / Connecting…"
          : connected
            ? "重新选择平台 / Reselect platform"
            : "请选择您的钱包平台\nPlease choose your wallet platform"}
      </button>

      {/* 桌面 / 已在钱包内：备用官方 MultiButton（小） */}
      {!useDeepLinkFlow && !connected && (
        <div style={{ transform: "scale(0.88)", opacity: 0.9 }}>
          <WalletMultiButton />
        </div>
      )}

      {/* ===== 断开：始终可点 ===== */}
      <button
        type="button"
        onClick={handleDisconnect}
        style={{
          ...btnBase,
          background: "linear-gradient(135deg, #ff4d4d, #ff1a1a)",
          color: "#fff",
          padding: "12px 24px",
          fontSize: 15,
          width: 240,
          boxShadow: "0 4px 15px rgba(255, 50, 50, 0.45)",
        }}
      >
        断开连接 / Disconnect
      </button>

      {/* ===== 更换：始终可点（Phantom ↔ Solflare 等） ===== */}
      <button
        type="button"
        onClick={handleChangeWallet}
        style={{
          ...btnBase,
          background: "linear-gradient(135deg, #00ff9d, #00c853)",
          color: "#000",
          padding: "12px 24px",
          fontSize: 15,
          width: 240,
          boxShadow: "0 4px 15px rgba(0, 255, 157, 0.45)",
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
        <div style={{ fontSize: "0.85rem", color: "#00ff9d" }}>{syncStatus}</div>
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
          <strong style={{ color: "#e9ddff" }}>支持的钱包 / Supported wallets</strong>
          <br />
          Phantom · Solflare · Trust Wallet · Coinbase Wallet · Mobile Wallet
          Adapter（系统钱包）
          <br />
          <br />
          <strong style={{ color: "#e9ddff" }}>Android / APK</strong>
          <br />
          请先点「请选择您的钱包平台」，在弹出列表中选你的钱包。将在{" "}
          <strong>钱包 App 内</strong>打开本 dApp，再连接即可。直接在系统浏览器点
          Connect 容易跳到官网下载页。
          <br />
          Tap “Choose your wallet platform”, pick your wallet. The dApp opens
          inside the wallet app — then connect. Direct Connect in system browser
          often opens the download page instead.
          <br />
          <br />
          <strong style={{ color: "#e9ddff" }}>更换平台 / Switch wallet</strong>
          <br />
          点「更换钱包」可断开当前连接并重新选择（例如从 Phantom 换到 Solflare
          再转账）。
          <br />
          Use “Change Wallet” to disconnect and pick another platform (e.g.
          Phantom → Solflare to transfer).
          <br />
          <br />
          <strong style={{ color: "#e9ddff" }}>iOS / Desktop</strong>
          <br />
          多数情况可直接选择平台连接。桌面请先安装对应浏览器扩展。
          <br />
          Usually connect directly. On desktop, install the browser extension
          first.
          <br />
          <br />
          <span style={{ color: "#a78bfa" }}>
            「我的数据」来自 PWA 邮箱绑定，无需连钱包也能查看。Connect
            仅用于质押 / 转账 / 兑换等签名操作。
            <br />
            My Data comes from PWA login — no wallet needed to view. Connect is
            only required for signing (stake / transfer / swap).
          </span>
        </div>
      )}

      {/* ========== 平台选择弹窗（默认收起，点主按钮才出现） ========== */}
      {showPicker && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "16px 12px 28px",
            boxSizing: "border-box",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPicker(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              background: "linear-gradient(165deg, #1a1030, #0d0d18)",
              border: "1px solid rgba(0,255,157,0.35)",
              borderRadius: 20,
              padding: "18px 16px 20px",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div>
                <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 16 }}>
                  选择钱包平台
                </div>
                <div style={{ color: "#889", fontSize: 12, marginTop: 2 }}>
                  Choose your wallet platform
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "#ccc",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  fontSize: 18,
                  cursor: "pointer",
                  touchAction: "manipulation",
                }}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                margin: "0 0 12px",
                fontSize: 12,
                color: "#9aa",
                lineHeight: 1.45,
              }}
            >
              将在对应钱包 App 内打开本 dApp，避免跳到下载页。
              <br />
              Opens this dApp inside the wallet app (avoids download pages).
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {walletLinks.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => openLink(w.href)}
                  style={{
                    ...btnBase,
                    background: w.color,
                    color: w.textColor,
                    padding: "13px 16px",
                    fontSize: 14,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: "0 3px 12px rgba(0,0,0,0.25)",
                  }}
                >
                  <span>
                    {w.emoji} {w.nameZh} / {w.name}
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.75 }}>打开 ↗</span>
                </button>
              ))}

              <button
                type="button"
                onClick={handleMwa}
                style={{
                  ...btnBase,
                  background: "linear-gradient(135deg, #00ff9d, #00c853)",
                  color: "#04140c",
                  padding: "13px 16px",
                  fontSize: 14,
                  width: "100%",
                  boxShadow: "0 3px 14px rgba(0,255,157,0.3)",
                }}
              >
                📲 系统钱包 / Mobile Wallet Adapter
              </button>
            </div>

            <p
              style={{
                margin: "14px 0 0",
                fontSize: 11,
                color: "#667",
                textAlign: "center",
                lineHeight: 1.45,
              }}
            >
              打开后若未自动连接，在钱包内再点一次 Connect 即可。
              <br />
              After opening, tap Connect once inside the wallet if needed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

