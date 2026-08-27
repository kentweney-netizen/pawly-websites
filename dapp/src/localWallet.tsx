// @ts-nocheck
/**
 * PAWLY Local Key Wallet — v7.7.12 manage-hide-key
 * Path ③: import base58 secret key (or JSON byte array) → use all dApp features
 * without Phantom / Solflare / Trust.
 *
 * Persistence (v7.7.11): localStorage on this device; Clear removes it.
 * UI (v7.7.12): home shows only Manage + Clear key.
 *   Secret / full address only inside Manage panel.
 *   Entry sits under green "PAWLY DApp" title, above My Data (App.tsx placement).
 *
 * Place file at: dapp/src/localWallet.tsx
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

const STORAGE_KEY = "pawly_local_sk_b58_v1";

const B58_ALPH = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Minimal base58 decode (no extra dep if bs58 missing) */
function b58decode(str: string): Uint8Array {
  const bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const c = B58_ALPH.indexOf(str[i]);
    if (c < 0) throw new Error("Invalid base58 character");
    let carry = c;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === "1"; i++) bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}

function b58encode(bytes: Uint8Array): string {
  if (!bytes || !bytes.length) return "";
  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let zeros = 0;
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) zeros++;
  return "1".repeat(zeros) + digits.reverse().map((d) => B58_ALPH[d]).join("");
}

function parseSecretInput(raw: string): Keypair {
  const s = String(raw || "").trim();
  if (!s) throw new Error("Empty secret / 私钥为空");

  if (s.startsWith("[")) {
    const arr = JSON.parse(s);
    if (!Array.isArray(arr) || arr.length < 32) {
      throw new Error("Invalid secret key array / 私钥数组无效");
    }
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }

  const decoded = b58decode(s.replace(/\s+/g, ""));
  if (decoded.length !== 64 && decoded.length !== 32) {
    throw new Error(
      "Secret key length must be 32 or 64 bytes / 私钥长度须为 32 或 64 字节"
    );
  }
  return Keypair.fromSecretKey(decoded);
}

function readPersistedSecret(): string | null {
  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls) return ls;
    const ss = sessionStorage.getItem(STORAGE_KEY);
    if (ss) {
      try {
        localStorage.setItem(STORAGE_KEY, ss);
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
      return ss;
    }
  } catch (_) {}
  return null;
}

function writePersistedSecret(b58: string | null) {
  try {
    if (b58) localStorage.setItem(STORAGE_KEY, b58);
    else localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

type LocalCtx = {
  connected: boolean;
  publicKey: PublicKey | null;
  importing: boolean;
  error: string;
  persistDevice: boolean;
  importSecret: (raw: string, persistDevice: boolean) => Promise<void>;
  disconnect: () => void;
  getSecretB58: () => string | null;
  sendTransaction: (
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: any
  ) => Promise<string>;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  walletStub: any;
  showImportModal: boolean;
  setShowImportModal: (v: boolean) => void;
};

const LocalWalletContext = createContext<LocalCtx | null>(null);

export function LocalWalletProvider({ children }: { children: React.ReactNode }) {
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [persistDevice, setPersistDevice] = useState(true);
  const secretRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const saved = readPersistedSecret();
      if (saved) {
        const kp = parseSecretInput(saved);
        secretRef.current = b58encode(kp.secretKey);
        setKeypair(kp);
        setPersistDevice(true);
      }
    } catch (_) {
      secretRef.current = null;
      writePersistedSecret(null);
    }
  }, []);

  const disconnect = useCallback(() => {
    setKeypair(null);
    setError("");
    secretRef.current = null;
    writePersistedSecret(null);
  }, []);

  const getSecretB58 = useCallback(() => secretRef.current, []);

  const importSecret = useCallback(async (raw: string, persist: boolean) => {
    setImporting(true);
    setError("");
    try {
      const kp = parseSecretInput(raw);
      const b58 = b58encode(kp.secretKey);
      secretRef.current = b58;
      setKeypair(kp);
      setPersistDevice(!!persist);
      if (persist) writePersistedSecret(b58);
      else writePersistedSecret(null);
      setShowImportModal(false);
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setImporting(false);
    }
  }, []);

  const signTransaction = useCallback(
    async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      if (!keypair) throw new Error("Local wallet not ready / 本地钱包未导入");
      if (tx instanceof VersionedTransaction) {
        tx.sign([keypair]);
        return tx;
      }
      (tx as Transaction).partialSign(keypair);
      return tx;
    },
    [keypair]
  );

  const sendTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction,
      connection: Connection,
      options?: any
    ) => {
      if (!keypair) throw new Error("Local wallet not ready / 本地钱包未导入");
      if (!connection) throw new Error("No connection");

      const signed = await signTransaction(transaction);
      const raw =
        signed instanceof VersionedTransaction
          ? signed.serialize()
          : signed.serialize();

      const sig = await connection.sendRawTransaction(raw, {
        skipPreflight: !!(options && options.skipPreflight),
        preflightCommitment: (options && options.preflightCommitment) || "confirmed",
        maxRetries: (options && options.maxRetries) || 3,
      });
      return sig;
    },
    [keypair, signTransaction]
  );

  const publicKey = keypair ? keypair.publicKey : null;
  const connected = !!keypair;

  const walletStub = useMemo(
    () =>
      keypair
        ? {
            adapter: {
              name: "PAWLY Local Key",
              publicKey: keypair.publicKey,
              connected: true,
              signTransaction,
              signAndSendTransaction: async (tx: any) => {
                const signed = await signTransaction(tx);
                return signed;
              },
            },
          }
        : null,
    [keypair, signTransaction]
  );

  const value: LocalCtx = {
    connected,
    publicKey,
    importing,
    error,
    persistDevice,
    importSecret,
    disconnect,
    getSecretB58,
    sendTransaction,
    signTransaction,
    walletStub,
    showImportModal,
    setShowImportModal,
  };

  return (
    <LocalWalletContext.Provider value={value}>
      {children}
      <ImportKeyModal />
    </LocalWalletContext.Provider>
  );
}

export function useLocalKeyWallet() {
  const ctx = useContext(LocalWalletContext);
  if (!ctx) {
    throw new Error("useLocalKeyWallet must be used within LocalWalletProvider");
  }
  return ctx;
}

/**
 * Unified wallet: Local key (③) wins when active, else adapter (①).
 */
export function usePawlyWallet() {
  const adapter = useWallet();
  const local = useLocalKeyWallet();

  if (local.connected && local.publicKey) {
    return {
      publicKey: local.publicKey,
      connected: true,
      connecting: false,
      disconnecting: false,
      sendTransaction: local.sendTransaction,
      signTransaction: local.signTransaction,
      wallet: local.walletStub,
      connect: async () => {},
      disconnect: local.disconnect,
      select: (_name?: any) => {},
      wallets: adapter.wallets || [],
      autoConnect: false,
      pawlyLocal: true as const,
    };
  }

  return {
    ...adapter,
    pawlyLocal: false as const,
  };
}

function ImportKeyModal() {
  const {
    showImportModal,
    setShowImportModal,
    importSecret,
    importing,
    error,
    connected,
  } = useLocalKeyWallet();
  const [raw, setRaw] = useState("");
  const [persist, setPersist] = useState(true);
  const [ack, setAck] = useState(false);

  if (!showImportModal) return null;
  if (connected) return null;

  const onSubmit = async () => {
    if (!ack) {
      alert("Please confirm you understand the risks / 请先勾选风险确认");
      return;
    }
    try {
      await importSecret(raw, persist);
      setRaw("");
      setAck(false);
    } catch (_) {}
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={() => !importing && setShowImportModal(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#12121a",
          border: "1px solid rgba(0,255,157,0.35)",
          borderRadius: 16,
          padding: 20,
          color: "#eee",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ margin: "0 0 8px", color: "#00ff9d", fontSize: 18 }}>
          Import key / 导入私钥（高级）
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.5, color: "#bbb" }}>
          Use this only if you already have a Solana secret key and want PAWLY dApp as
          your main UI — <b>no Phantom required</b>.
          <br />
          仅当你已有 Solana 私钥、希望在 PAWLY dApp 内直接使用全部功能时使用（可不连外部钱包）。
        </p>
        <div
          style={{
            background: "rgba(255,80,80,0.12)",
            border: "1px solid rgba(255,80,80,0.4)",
            borderRadius: 10,
            padding: 10,
            fontSize: 12,
            lineHeight: 1.45,
            marginBottom: 12,
            color: "#ffcdd2",
          }}
        >
          · PAWLY never stores your key on any server.
          <br />
          · Remember-on-device keeps the key in this phone/browser only.
          <br />
          · Lost key = lost funds. We cannot recover it.
          <br />
          · Do not import on public / shared devices.
          <br />
          · 私钥只留在本机；丢失无法找回；勿在公共设备导入。
        </div>

        <label style={{ fontSize: 12, color: "#aaa" }}>
          Secret key (base58) or JSON byte array
        </label>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste secret key only — never share this"
          rows={4}
          style={{
            width: "100%",
            marginTop: 6,
            marginBottom: 10,
            borderRadius: 10,
            border: "1px solid #333",
            background: "#0a0a10",
            color: "#eee",
            padding: 10,
            fontSize: 13,
            boxSizing: "border-box",
          }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            fontSize: 12,
            marginBottom: 8,
            color: "#c8ffe8",
          }}
        >
          <input
            type="checkbox"
            checked={persist}
            onChange={(e) => setPersist(e.target.checked)}
          />
          Remember on this device (reopen without pasting again)
          <br />
          本机记住，下次打开 dApp 不用再贴私钥
        </label>
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            fontSize: 12,
            marginBottom: 12,
            color: "#ffab91",
          }}
        >
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          I understand PAWLY cannot recover this key and I use import at my own
          risk. / 我了解无法找回且风险自负。
        </label>
        {error ? (
          <p style={{ color: "#ff5252", fontSize: 12, marginBottom: 8 }}>{error}</p>
        ) : null}
        <button
          type="button"
          disabled={importing || !raw.trim()}
          onClick={onSubmit}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "none",
            background: importing ? "#444" : "#00c853",
            color: "#000",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {importing ? "Importing…" : "Import & use in PAWLY / 导入并使用"}
        </button>

        <button
          type="button"
          onClick={() => setShowImportModal(false)}
          style={{
            marginTop: 10,
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #444",
            background: "transparent",
            color: "#aaa",
          }}
        >
          Close / 关闭
        </button>
      </div>
    </div>
  );
}

function copyText(label: string, value: string) {
  if (!value) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value);
      alert(label + " copied / 已复制");
      return;
    }
  } catch (_) {}
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    alert(label + " copied / 已复制");
  } catch (_) {
    alert("Copy failed / 复制失败");
  }
}

/**
 * Home entry: sits under green PAWLY DApp title, above My Data.
 * Connected: only Manage + Clear key. Secret is never shown on the home strip.
 */
export function LocalWalletEntryButtons() {
  const local = useLocalKeyWallet();
  const adapter = useWallet();
  const [manageOpen, setManageOpen] = useState(false);
  const [revealSecret, setRevealSecret] = useState(false);

  const closeManage = () => {
    setManageOpen(false);
    setRevealSecret(false);
  };

  const onClear = () => {
    if (
      !window.confirm(
        "Clear local key from this device? You will need to paste it again.\n清除本机私钥？之后需要重新粘贴。"
      )
    ) {
      return;
    }
    closeManage();
    local.disconnect();
  };

  const secret = manageOpen ? local.getSecretB58() || "" : "";
  const addr = local.publicKey ? local.publicKey.toString() : "";

  return (
    <div style={{ margin: "0 0 16px" }}>
      {local.connected && local.publicKey ? (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            background: "rgba(0,255,157,0.08)",
            border: "1px solid rgba(0,255,157,0.28)",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setManageOpen((v) => !v);
                setRevealSecret(false);
              }}
              style={btnSecondary}
            >
              {manageOpen ? "Close / 关闭" : "Manage / 管理"}
            </button>
            <button type="button" onClick={onClear} style={btnSecondary}>
              Clear key / 清除
            </button>
          </div>

          {manageOpen ? (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                background: "#0d0d14",
                border: "1px solid rgba(0,255,157,0.25)",
              }}
            >
              <div style={{ color: "#00ff9d", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                Local key / 本地私钥
              </div>
              <div style={{ fontSize: 11, color: "#9ad", marginBottom: 10 }}>
                {local.persistDevice
                  ? "Saved on this device / 本机已记住"
                  : "Not saved — leave and it unbinds / 未记住，离开后需重贴"}
              </div>

              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                Address / 地址
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "#c8ffe8",
                  wordBreak: "break-all",
                  marginBottom: 8,
                }}
              >
                {addr}
              </div>
              <button
                type="button"
                onClick={() => copyText("Address", addr)}
                style={btnTiny}
              >
                Copy address / 复制地址
              </button>

              <div style={{ fontSize: 11, color: "#888", margin: "12px 0 4px" }}>
                Secret key / 私钥（默认隐藏）
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: revealSecret ? "#ffccbc" : "#666",
                  wordBreak: "break-all",
                  marginBottom: 8,
                  minHeight: 36,
                }}
              >
                {revealSecret
                  ? secret || "(not available / 无法读取)"
                  : "••••••••••••••••••••••••••••••••"}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setRevealSecret((v) => !v)}
                  style={btnTiny}
                >
                  {revealSecret ? "Hide / 隐藏" : "Show secret / 显示私钥"}
                </button>
                <button
                  type="button"
                  onClick={() => copyText("Secret key", secret)}
                  style={btnTiny}
                >
                  Copy secret / 复制私钥
                </button>
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 11, color: "#f48", lineHeight: 1.4 }}>
                Never screenshot or share this key. Anyone with it controls the funds.
                <br />
                不要截图或分享私钥。拿到私钥等于控制资产。
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => local.setShowImportModal(true)}
          style={btnPrimary}
        >
          Import secret key / 导入私钥
        </button>
      )}
      {!local.connected ? (
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "#888", lineHeight: 1.4 }}>
          Advanced path. Default: connect wallet or email / Privy. Key stays on this device.
          <br />
          高级路径。默认请连接钱包或邮箱登录。私钥只留本机。
          {adapter.connected
            ? " · External wallet also connected (local key has priority when active)."
            : ""}
        </p>
      ) : null}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg,#00c853,#00ff9d)",
  color: "#04140c",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #444",
  background: "#1a1a22",
  color: "#ddd",
  fontSize: 12,
  cursor: "pointer",
};

const btnTiny: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #444",
  background: "#1a1a22",
  color: "#ddd",
  fontSize: 11,
  cursor: "pointer",
};

