// @ts-nocheck
/**
 * PAWLY Local Key Wallet — v7.7.9
 * Path ③: import base58 secret key (or JSON byte array) → use all dApp features
 * without Phantom / Solflare / Trust.
 *
 * Rules:
 * - Key never leaves the device (sessionStorage only, optional)
 * - Server never receives the secret
 * - Strong UI warnings required
 *
 * Place file at: dapp/src/localWallet.tsx
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

/** Minimal base58 decode (no extra dep if bs58 missing) */
function b58decode(str: string): Uint8Array {
  const ALPH = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const c = ALPH.indexOf(str[i]);
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

function parseSecretInput(raw: string): Keypair {
  const s = String(raw || "").trim();
  if (!s) throw new Error("Empty secret / 私钥为空");

  // JSON array export e.g. [1,2,3,...,64]
  if (s.startsWith("[")) {
    const arr = JSON.parse(s);
    if (!Array.isArray(arr) || arr.length < 32) {
      throw new Error("Invalid secret key array / 私钥数组无效");
    }
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }

  // base58 secret key (64 bytes typical for Solana)
  const decoded = b58decode(s.replace(/\s+/g, ""));
  if (decoded.length !== 64 && decoded.length !== 32) {
    throw new Error(
      "Secret key length must be 32 or 64 bytes / 私钥长度须为 32 或 64 字节"
    );
  }
  return Keypair.fromSecretKey(decoded);
}

type LocalCtx = {
  connected: boolean;
  publicKey: PublicKey | null;
  importing: boolean;
  error: string;
  importSecret: (raw: string, persistSession: boolean) => Promise<void>;
  disconnect: () => void;
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

  // Restore session (tab refresh) — still device-local only
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const kp = parseSecretInput(saved);
        setKeypair(kp);
      }
    } catch (_) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const disconnect = useCallback(() => {
    setKeypair(null);
    setError("");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }, []);

  const importSecret = useCallback(async (raw: string, persistSession: boolean) => {
    setImporting(true);
    setError("");
    try {
      const kp = parseSecretInput(raw);
      setKeypair(kp);
      if (persistSession) {
        // Store only in sessionStorage (cleared when tab closes). Never localStorage by default.
        const cleaned = String(raw).trim();
        sessionStorage.setItem(STORAGE_KEY, cleaned);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
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
                // Used by walletSignAndSend prefer path
                const connection = new Connection(
                  // same default; App passes connection in sendTransaction path mainly
                  (typeof window !== "undefined" &&
                    (window as any).__PAWLY_RPC__) ||
                    "https://api.mainnet-beta.solana.com",
                  "confirmed"
                );
                // Prefer App's HELIUS via sendTransaction wrapper — sign only here
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
    importSecret,
    disconnect,
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
 * Use this instead of useWallet() in Payment / Transfer / Swap / Charity / Home.
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
      // flag for UI
      pawlyLocal: true as const,
    };
  }

  return {
    ...adapter,
    pawlyLocal: false as const,
  };
}

/** Modal UI — bilingual warnings */
function ImportKeyModal() {
  const {
    showImportModal,
    setShowImportModal,
    importSecret,
    importing,
    error,
    connected,
    publicKey,
    disconnect,
  } = useLocalKeyWallet();
  const [raw, setRaw] = useState("");
  const [persist, setPersist] = useState(true);
  const [ack, setAck] = useState(false);

  if (!showImportModal) return null;

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
          · Lost key = lost funds. We cannot recover it.
          <br />
          · Do not import on public / shared devices.
          <br />
          · Prefer hardware or Phantom for large balances.
          <br />
          · 私钥只留在本机；丢失无法找回；勿在公共设备导入。
        </div>

        {connected && publicKey ? (
          <div style={{ marginBottom: 12, fontSize: 13 }}>
            Active local wallet:
            <br />
            <code style={{ color: "#00ff9d", wordBreak: "break-all" }}>
              {publicKey.toString()}
            </code>
            <button
              type="button"
              onClick={disconnect}
              style={{
                marginTop: 8,
                display: "block",
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "none",
                background: "#333",
                color: "#fff",
              }}
            >
              Disconnect local key / 清除本地密钥
            </button>
          </div>
        ) : (
          <>
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
                color: "#ccc",
              }}
            >
              <input
                type="checkbox"
                checked={persist}
                onChange={(e) => setPersist(e.target.checked)}
              />
              Keep for this browser tab session only (sessionStorage)
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
          </>
        )}

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

/** Small entry buttons for Home */
export function LocalWalletEntryButtons() {
  const local = useLocalKeyWallet();
  const adapter = useWallet();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      {local.connected && local.publicKey ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(0,255,157,0.1)",
            border: "1px solid rgba(0,255,157,0.35)",
            fontSize: 13,
            color: "#c8ffe8",
          }}
        >
          <b style={{ color: "#00ff9d" }}>Local key active / 本地密钥已启用</b>
          <div style={{ wordBreak: "break-all", marginTop: 4, opacity: 0.9 }}>
            {local.publicKey.toString()}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => local.setShowImportModal(true)}
              style={btnSecondary}
            >
              Manage / 管理
            </button>
            <button type="button" onClick={local.disconnect} style={btnSecondary}>
              Clear key / 清除
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => local.setShowImportModal(true)}
          style={btnPrimary}
        >
          Import secret key (no Phantom) / 导入私钥（不连外部钱包）
        </button>
      )}
      <p style={{ margin: 0, fontSize: 11, color: "#888", lineHeight: 1.4 }}>
        Path ③ advanced. Default: connect wallet or email/Privy. Keys never uploaded.
        <br />
        高级路径。默认请连接钱包或邮箱登录。私钥不会上传服务器。
        {adapter.connected ? " · External wallet also connected (local key has priority when active)." : ""}
      </p>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
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
// @ts-nocheck
/**
 * PAWLY Local Key Wallet — v7.7.9
 * Path ③: import base58 secret key (or JSON byte array) → use all dApp features
 * without Phantom / Solflare / Trust.
 *
 * Rules:
 * - Key never leaves the device (sessionStorage only, optional)
 * - Server never receives the secret
 * - Strong UI warnings required
 *
 * Place file at: dapp/src/localWallet.tsx
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

/** Minimal base58 decode (no extra dep if bs58 missing) */
function b58decode(str: string): Uint8Array {
  const ALPH = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const c = ALPH.indexOf(str[i]);
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

function parseSecretInput(raw: string): Keypair {
  const s = String(raw || "").trim();
  if (!s) throw new Error("Empty secret / 私钥为空");

  // JSON array export e.g. [1,2,3,...,64]
  if (s.startsWith("[")) {
    const arr = JSON.parse(s);
    if (!Array.isArray(arr) || arr.length < 32) {
      throw new Error("Invalid secret key array / 私钥数组无效");
    }
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }

  // base58 secret key (64 bytes typical for Solana)
  const decoded = b58decode(s.replace(/\s+/g, ""));
  if (decoded.length !== 64 && decoded.length !== 32) {
    throw new Error(
      "Secret key length must be 32 or 64 bytes / 私钥长度须为 32 或 64 字节"
    );
  }
  return Keypair.fromSecretKey(decoded);
}

type LocalCtx = {
  connected: boolean;
  publicKey: PublicKey | null;
  importing: boolean;
  error: string;
  importSecret: (raw: string, persistSession: boolean) => Promise<void>;
  disconnect: () => void;
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

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const kp = parseSecretInput(saved);
        setKeypair(kp);
      }
    } catch (_) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const disconnect = useCallback(() => {
    setKeypair(null);
    setError("");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }, []);

  const importSecret = useCallback(async (raw: string, persistSession: boolean) => {
    setImporting(true);
    setError("");
    try {
      const kp = parseSecretInput(raw);
      setKeypair(kp);
      if (persistSession) {
        const cleaned = String(raw).trim();
        sessionStorage.setItem(STORAGE_KEY, cleaned);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
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
    importSecret,
    disconnect,
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
 * Use this instead of useWallet() in Payment / Transfer / Swap / Charity / Home.
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
    publicKey,
    disconnect,
  } = useLocalKeyWallet();
  const [raw, setRaw] = useState("");
  const [persist, setPersist] = useState(true);
  const [ack, setAck] = useState(false);

  if (!showImportModal) return null;

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
          · Lost key = lost funds. We cannot recover it.
          <br />
          · Do not import on public / shared devices.
          <br />
          · Prefer hardware or Phantom for large balances.
          <br />
          · 私钥只留在本机；丢失无法找回；勿在公共设备导入。
        </div>

        {connected && publicKey ? (
          <div style={{ marginBottom: 12, fontSize: 13 }}>
            Active local wallet:
            <br />
            <code style={{ color: "#00ff9d", wordBreak: "break-all" }}>
              {publicKey.toString()}
            </code>
            <button
              type="button"
              onClick={disconnect}
              style={{
                marginTop: 8,
                display: "block",
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "none",
                background: "#333",
                color: "#fff",
              }}
            >
              Disconnect local key / 清除本地密钥
            </button>
          </div>
        ) : (
          <>
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
                color: "#ccc",
              }}
            >
              <input
                type="checkbox"
                checked={persist}
                onChange={(e) => setPersist(e.target.checked)}
              />
              Keep for this browser tab session only (sessionStorage)
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
          </>
        )}

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

export function LocalWalletEntryButtons() {
  const local = useLocalKeyWallet();
  const adapter = useWallet();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      {local.connected && local.publicKey ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(0,255,157,0.1)",
            border: "1px solid rgba(0,255,157,0.35)",
            fontSize: 13,
            color: "#c8ffe8",
          }}
        >
          <b style={{ color: "#00ff9d" }}>Local key active / 本地密钥已启用</b>
          <div style={{ wordBreak: "break-all", marginTop: 4, opacity: 0.9 }}>
            {local.publicKey.toString()}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => local.setShowImportModal(true)}
              style={btnSecondary}
            >
              Manage / 管理
            </button>
            <button type="button" onClick={local.disconnect} style={btnSecondary}>
              Clear key / 清除
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => local.setShowImportModal(true)}
          style={btnPrimary}
        >
          Import secret key (no Phantom) / 导入私钥（不连外部钱包）
        </button>
      )}
      <p style={{ margin: 0, fontSize: 11, color: "#888", lineHeight: 1.4 }}>
        Path ③ advanced. Default: connect wallet or email/Privy. Keys never uploaded.
        <br />
        高级路径。默认请连接钱包或邮箱登录。私钥不会上传服务器。
        {adapter.connected ? " · External wallet also connected (local key has priority when active)." : ""}
      </p>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
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