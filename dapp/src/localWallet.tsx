// @ts-nocheck
/**
 * PAWLY Local Key Wallet — v7.7.23 platform wallet export
 * Path ① adapter  ② PWA email → Privy auto  ③ optional local key
 * Import·Export: email login exports the PWA Privy Solana private key
 *
 * Persistence (v7.7.11): localStorage on this device; Clear removes it.
 * UI (v7.7.14): one button under title = Privy embedded export + local key.
 *   Click → Embedded / Import / Export. Home never shows the secret.
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
import { usePrivy } from "@privy-io/react-auth";

let usePrivySolanaWallets = function () {
  return { wallets: [], createWallet: null };
};
let usePrivySolanaSend = function () {
  return { sendTransaction: null };
};
let usePrivyExportSol = function () {
  return { exportWallet: null };
};
try {
  var solMod = require("@privy-io/react-auth/solana");
  if (solMod && solMod.useWallets) usePrivySolanaWallets = solMod.useWallets;
  if (solMod && solMod.useSendTransaction) usePrivySolanaSend = solMod.useSendTransaction;
  if (solMod && solMod.useExportWallet) usePrivyExportSol = solMod.useExportWallet;
} catch (_) {}

const privySignerRef = {
  ready: false,
  authed: false,
  user: null,
  login: null,
  wallets: [],
  createWallet: null,
  sendTransaction: null,
};

function emailFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    return (q.get("email") || "").trim();
  } catch (_) {
    return "";
  }
}

/** Must render under PrivyProvider. Restores email session and exposes Solana signer. */
export function PawlyPrivyBridge() {
  let ready = false;
  let authenticated = false;
  let user = null;
  let login = null;
  let createWalletFn = null;
  try {
    const p = usePrivy();
    ready = !!p.ready;
    authenticated = !!p.authenticated;
    user = p.user || null;
    login = p.login || null;
    createWalletFn = p.createWallet || p.createSolanaWallet || null;
  } catch (_) {}

  let wallets = [];
  let createFromSol = null;
  let sendFromSol = null;
  try {
    const w = usePrivySolanaWallets();
    wallets = (w && w.wallets) || [];
    createFromSol = w && w.createWallet;
  } catch (_) {}
  try {
    const st = usePrivySolanaSend();
    sendFromSol = st && st.sendTransaction;
  } catch (_) {}

  privySignerRef.ready = ready;
  privySignerRef.authed = authenticated;
  privySignerRef.user = user;
  privySignerRef.login = login;
  privySignerRef.wallets = wallets;
  privySignerRef.createWallet = createFromSol || createWalletFn;
  privySignerRef.sendTransaction = sendFromSol;

  useEffect(() => {
    let stop = false;
    (async () => {
      if (!ready || stop) return;
      if (!authenticated && typeof login === "function") {
        const email = emailFromUrl();
        try {
          if (email) await login({ prefill: { type: "email", value: email } });
          else await login();
        } catch (_) {}
        return;
      }
      if (authenticated && typeof (createFromSol || createWalletFn) === "function") {
        const hasSol = pickPrivySolanaWallet(user, wallets);
        if (!hasSol) {
          try {
            await (createFromSol || createWalletFn)({ createEthereumWallet: false });
          } catch (_) {
            try {
              await (createFromSol || createWalletFn)();
            } catch (_) {}
          }
        }
      }
    })();
    return () => {
      stop = true;
    };
  }, [ready, authenticated, login, user, wallets, createFromSol, createWalletFn]);

  return null;
}

function pickPrivySolanaWallet(user, extraWallets) {
  const list = [];
  const push = (w) => {
    if (!w) return;
    const addr = w.address || w.publicKey || w.walletClient?.address;
    if (!addr) return;
    const chain = String(w.chainType || w.chain_type || w.chain || w.type || "").toLowerCase();
    const client = String(w.walletClientType || w.clientType || w.connectorType || "").toLowerCase();
    const looksSol =
      chain.includes("sol") ||
      client.includes("sol") ||
      client === "privy" ||
      (typeof addr === "string" && addr.length >= 32 && addr.length <= 44 && !addr.startsWith("0x"));
    if (looksSol) list.push({ ...w, address: String(addr) });
  };
  (extraWallets || []).forEach(push);
  const accounts = (user && (user.linkedAccounts || user.linked_accounts)) || [];
  accounts.forEach(push);
  if (user && user.wallet) push(user.wallet);
  if (user && user.solanaWallet) push(user.solanaWallet);
  const uniq = [];
  const seen = {};
  list.forEach((w) => {
    if (seen[w.address]) return;
    seen[w.address] = true;
    uniq.push(w);
  });
  return uniq[0] || null;
}

function userEmail(user) {
  if (!user) return emailFromUrl();
  if (user.email && user.email.address) return String(user.email.address);
  const acc = user.linkedAccounts || user.linked_accounts || [];
  const em = acc.find((a) => a && (a.type === "email" || a.address && String(a.address).includes("@")));
  if (em) return String(em.address || em.email || "");
  return emailFromUrl();
}

/** Platform wallet panel: same email as PWA → export Privy Solana secret (base58). */
export function PlatformWalletPanel({ extra = null }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  let ready = false;
  let authenticated = false;
  let user = null;
  let login = null;
  try {
    const p = usePrivy();
    ready = !!p.ready;
    authenticated = !!p.authenticated;
    user = p.user || null;
    login = p.login || null;
  } catch (_) {}

  let wallets = [];
  try {
    const w = usePrivySolanaWallets();
    wallets = (w && w.wallets) || [];
  } catch (_) {}

  let exportWallet = null;
  try {
    const ex = usePrivyExportSol();
    exportWallet = ex && ex.exportWallet;
  } catch (_) {}
  try {
    if (!exportWallet) {
      const { useExportWallet } = require("@privy-io/react-auth");
      const ex2 = useExportWallet();
      exportWallet = ex2 && ex2.exportWallet;
    }
  } catch (_) {}

  const sol = pickPrivySolanaWallet(user, wallets);
  const addr = sol ? sol.address : "";
  const mail = userEmail(user);

  const onLogin = async () => {
    setErr("");
    setBusy("login");
    try {
      if (typeof login === "function") {
        if (mail) await login({ prefill: { type: "email", value: mail } });
        else await login();
      }
    } catch (e) {
      setErr((e && e.message) || "Login failed / 登录失败");
    } finally {
      setBusy("");
    }
  };

  const onExport = async () => {
    setErr("");
    if (!authenticated) {
      await onLogin();
      return;
    }
    if (typeof exportWallet !== "function") {
      setErr("Export is not available in this build / 此版本无法导出");
      return;
    }
    setBusy("export");
    try {
      if (addr) await exportWallet({ address: addr });
      else await exportWallet();
    } catch (e) {
      setErr((e && e.message) || "Export cancelled / 已取消导出");
    } finally {
      setBusy("");
    }
  };

  return (
    <div style={{ textAlign: "left" }}>
      <div
        style={{
          background: "linear-gradient(180deg, rgba(0,255,157,0.10), rgba(18,18,26,0.4))",
          border: "1px solid rgba(0,255,157,0.28)",
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ color: "#00ff9d", fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
          PAWLY Platform Wallet / 平台钱包
        </div>
        <div style={{ color: "#9aa", fontSize: 12, lineHeight: 1.45 }}>
          Sign in with the same email you used on the PWA. Then export the Privy Solana key (base58).
          <br />
          使用 PWA 注册邮箱登录，即可导出官方嵌入式钱包私钥。密钥只在本机显示，PAWLY 不托管。
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Email / 邮箱</div>
      <div style={{ fontFamily: "monospace", fontSize: 13, color: "#c8ffe8", marginBottom: 10, wordBreak: "break-all" }}>
        {mail || "—"}
      </div>

      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Status / 状态</div>
      <div style={{ fontSize: 13, color: authenticated ? "#00ff9d" : "#fbbf24", marginBottom: 10 }}>
        {!ready
          ? "Connecting… / 正在连接"
          : authenticated
            ? "Email wallet signed in / 邮箱钱包已登录"
            : "Sign in with email to manage this wallet / 请先用邮箱登录"}
      </div>

      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Solana address / 地址</div>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 12,
          color: addr ? "#c8ffe8" : "#666",
          wordBreak: "break-all",
          marginBottom: 12,
        }}
      >
        {addr || (authenticated ? "Creating embedded wallet… / 正在创建嵌入式钱包" : "Sign in first / 请先登录")}
      </div>

      {addr ? (
        <button
          type="button"
          onClick={() => copyText("Address", addr)}
          style={{
            width: "100%",
            marginBottom: 8,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #333",
            background: "#1a1a24",
            color: "#ddd",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Copy address / 复制地址
        </button>
      ) : null}

      {!authenticated ? (
        <button
          type="button"
          disabled={!!busy}
          onClick={onLogin}
          style={{
            width: "100%",
            marginBottom: 8,
            padding: "12px 14px",
            border: "none",
            borderRadius: 12,
            fontWeight: 800,
            cursor: "pointer",
            background: "linear-gradient(90deg,#00ff9d,#00c853)",
            color: "#04140c",
          }}
        >
          {busy === "login" ? "Opening email login…" : "Continue with email / 邮箱登录导出"}
        </button>
      ) : (
        <button
          type="button"
          disabled={!!busy}
          onClick={onExport}
          style={{
            width: "100%",
            marginBottom: 8,
            padding: "12px 14px",
            border: "none",
            borderRadius: 12,
            fontWeight: 800,
            cursor: "pointer",
            background: "linear-gradient(90deg,#00ff9d,#00c853)",
            color: "#04140c",
          }}
        >
          {busy === "export" ? "Opening export…" : "Export private key / 导出私钥"}
        </button>
      )}

      {err ? <p style={{ color: "#ff8a80", fontSize: 12, margin: "0 0 8px" }}>{err}</p> : null}

      <p style={{ margin: "8px 0 0", fontSize: 11, color: "#f48", lineHeight: 1.4 }}>
        Privy shows the key in its own secure window. Never screenshot or send it.
        <br />
        私钥在 Privy 安全窗口显示。不要截图、不要发给任何人。
      </p>
      {extra}
    </div>
  );
}

const STORAGE_KEY = "pawly_local_sk_b58_v1";

const B58_ALPH = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

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
  showKeyModal: boolean;
  setShowKeyModal: (v: boolean) => void;
};

const LocalWalletContext = createContext<LocalCtx | null>(null);

export function LocalWalletProvider({ children }: { children: React.ReactNode }) {
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);
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
    showKeyModal,
    setShowKeyModal,
  };

  return (
    <LocalWalletContext.Provider value={value}>
      {children}
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

export function usePawlyWallet() {
  const adapter = useWallet();
  const local = useLocalKeyWallet();
  let privyReady = !!privySignerRef.ready;
  let privyAuthed = !!privySignerRef.authed;
  let privyLogin = privySignerRef.login || (async (_opts?: any) => {});
  let privyUser: any = privySignerRef.user;
  let privyCreateWallet: any = privySignerRef.createWallet;
  try {
    const p = usePrivy();
    privyReady = !!p.ready;
    privyAuthed = !!p.authenticated;
    privyLogin = p.login || privyLogin;
    privyUser = p.user || privyUser;
    privyCreateWallet = p.createWallet || p.createSolanaWallet || privyCreateWallet;
  } catch (_) {}

  const privyWallet = pickPrivySolanaWallet(privyUser, privySignerRef.wallets || []);
  let privyPk: PublicKey | null = null;
  try {
    if (privyWallet && privyWallet.address) privyPk = new PublicKey(privyWallet.address);
  } catch (_) {
    privyPk = null;
  }

  const privySignTransaction = useCallback(
    async (tx: Transaction | VersionedTransaction) => {
      const w = pickPrivySolanaWallet(privyUser, []);
      if (!w) throw new Error("Email wallet not ready / 邮箱钱包未就绪");
      if (typeof w.signTransaction === "function") return await w.signTransaction(tx);
      if (w.walletClient && typeof w.walletClient.signTransaction === "function") {
        return await w.walletClient.signTransaction(tx);
      }
      throw new Error("Email wallet cannot sign / 邮箱钱包无法签名");
    },
    [privyUser]
  );

  const privySendTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction,
      connection: Connection,
      options?: any
    ) => {
      if (typeof privySignerRef.sendTransaction === "function") {
        const res = await privySignerRef.sendTransaction({ transaction, connection });
        return (res && (res.signature || res.hash || res)) || String(res);
      }
      const w = pickPrivySolanaWallet(privyUser, privySignerRef.wallets || []);
      if (!w) throw new Error("Email wallet not ready / 邮箱钱包未就绪");
      if (typeof w.signAndSendTransaction === "function") {
        const res = await w.signAndSendTransaction({ transaction, connection });
        return (res && (res.signature || res)) || String(res);
      }
      if (typeof w.sendTransaction === "function") {
        return await w.sendTransaction(transaction, connection, options);
      }
      if (w.walletClient && typeof w.walletClient.signAndSendTransaction === "function") {
        const res = await w.walletClient.signAndSendTransaction({ transaction, connection });
        return (res && (res.signature || res)) || String(res);
      }
      const signed = await privySignTransaction(transaction);
      const raw =
        signed instanceof VersionedTransaction ? signed.serialize() : signed.serialize();
      return await connection.sendRawTransaction(raw, {
        skipPreflight: !!(options && options.skipPreflight),
        preflightCommitment: (options && options.preflightCommitment) || "confirmed",
        maxRetries: (options && options.maxRetries) || 3,
      });
    },
    [privyUser, privySignTransaction]
  );

  const activateEmailWallet = useCallback(async () => {
    if (!privyReady) return false;
    if (!privyAuthed) {
      const email = emailFromUrl();
      try {
        if (email && typeof privyLogin === "function") {
          await privyLogin({ prefill: { type: "email", value: email } });
        } else if (typeof privyLogin === "function") {
          await privyLogin();
        }
      } catch (_) {}
      return false;
    }
    if (!privyPk && typeof privyCreateWallet === "function") {
      try {
        await privyCreateWallet({ createEthereumWallet: false });
      } catch (_) {
        try {
          await privyCreateWallet();
        } catch (_) {}
      }
    }
    return !!(privyPk || pickPrivySolanaWallet(privyUser, privySignerRef.wallets || []));
  }, [privyReady, privyAuthed, privyLogin, privyPk, privyCreateWallet, privyUser]);

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
      pawlyPrivy: false as const,
      privyReady,
      privyAuthed,
      activateEmailWallet,
    };
  }

  if (adapter.connected && adapter.publicKey && typeof adapter.sendTransaction === "function") {
    return {
      ...adapter,
      pawlyLocal: false as const,
      pawlyPrivy: false as const,
      privyReady,
      privyAuthed,
      activateEmailWallet,
    };
  }

  if (privyAuthed && privyPk) {
    return {
      publicKey: privyPk,
      connected: true,
      connecting: false,
      disconnecting: false,
      sendTransaction: privySendTransaction,
      signTransaction: privySignTransaction,
      wallet: {
        adapter: {
          name: "PAWLY Email Wallet",
          publicKey: privyPk,
          connected: true,
          signTransaction: privySignTransaction,
          signAndSendTransaction: async (tx: any) => {
            const signed = await privySignTransaction(tx);
            return signed;
          },
        },
      },
      connect: activateEmailWallet,
      disconnect: async () => {},
      select: (_name?: any) => {},
      wallets: adapter.wallets || [],
      autoConnect: false,
      pawlyLocal: false as const,
      pawlyPrivy: true as const,
      privyReady,
      privyAuthed,
      activateEmailWallet,
    };
  }

  return {
    ...adapter,
    pawlyLocal: false as const,
    pawlyPrivy: false as const,
    privyReady,
    privyAuthed,
    activateEmailWallet,
  };
}

function KeyVaultModal({ embeddedExport }) {
  const {
    showKeyModal,
    setShowKeyModal,
    importSecret,
    importing,
    error,
    connected,
    publicKey,
    persistDevice,
    disconnect,
    getSecretB58,
  } = useLocalKeyWallet();

  const hasEmbedded = true;
  const [tab, setTab] = useState("embedded");
  const [raw, setRaw] = useState("");
  const [persist, setPersist] = useState(true);
  const [ack, setAck] = useState(false);
  const [revealSecret, setRevealSecret] = useState(false);

  useEffect(() => {
    if (!showKeyModal) {
      setRevealSecret(false);
      setRaw("");
      setAck(false);
      return;
    }
    setTab(hasEmbedded ? "embedded" : connected ? "export" : "import");
  }, [showKeyModal, connected, hasEmbedded]);

  if (!showKeyModal) return null;

  const close = () => {
    if (importing) return;
    setShowKeyModal(false);
    setRevealSecret(false);
  };

  const onImport = async () => {
    if (!ack) {
      alert("Please confirm you understand the risks / 请先勾选风险确认");
      return;
    }
    try {
      await importSecret(raw, persist);
      setRaw("");
      setAck(false);
      setTab("export");
    } catch (_) {}
  };

  const onClear = () => {
    if (
      !window.confirm(
        "Clear local key from this device? You will need to paste it again.\n清除本机私钥？之后需要重新粘贴。"
      )
    ) {
      return;
    }
    disconnect();
    setRevealSecret(false);
    setTab("import");
  };

  const secret = getSecretB58() || "";
  const addr = publicKey ? publicKey.toString() : "";

  const tabBtn = (id, label) => (
    <button
      type="button"
      onClick={() => {
        setTab(id);
        setRevealSecret(false);
      }}
      style={{
        flex: 1,
        padding: "10px 8px",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 13,
        background: tab === id ? "linear-gradient(135deg,#00c853,#00ff9d)" : "#1a1a22",
        color: tab === id ? "#04140c" : "#bbb",
      }}
    >
      {label}
    </button>
  );

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
      onClick={close}
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
        <h2 style={{ margin: "0 0 6px", color: "#00ff9d", fontSize: 18 }}>
          Import · Export / 导入·导出
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: 12, lineHeight: 1.45, color: "#9aa" }}>
          Platform email wallet (PWA) or optional local secret — never uploaded to PAWLY.
          <br />
          平台邮箱钱包（PWA 同一把）或本机私钥。不会上传到 PAWLY 服务器。
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {tabBtn("embedded", "Platform / 平台钱包")}
          {tabBtn("import", "Import / 导入")}
          {tabBtn("export", "Local key / 本机密钥")}
        </div>

        {tab === "embedded" ? (
          <PlatformWalletPanel extra={embeddedExport} />
        ) : tab === "import" ? (
          <>
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
              · Lost key = lost funds. We cannot recover it.
              <br />
              · Do not import on public / shared devices.
              <br />
              · 私钥丢失无法找回；勿在公共设备导入。
            </div>
            {connected ? (
              <p style={{ fontSize: 12, color: "#fbbf24", marginTop: 0 }}>
                Importing a new key replaces the current local wallet.
                <br />
                导入新私钥会替换当前本机钱包。
              </p>
            ) : null}
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
              Remember on this device / 本机记住，下次不用再贴
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
              I use import at my own risk / 风险自负
            </label>
            {error ? (
              <p style={{ color: "#ff5252", fontSize: 12, marginBottom: 8 }}>{error}</p>
            ) : null}
            <button
              type="button"
              disabled={importing || !raw.trim()}
              onClick={onImport}
              style={btnPrimary}
            >
              {importing ? "Importing…" : "Import & use / 导入并使用"}
            </button>
          </>
        ) : connected ? (
          <>
            <div style={{ fontSize: 11, color: "#9ad", marginBottom: 10 }}>
              {persistDevice
                ? "Saved on this device / 本机已记住"
                : "Not saved — leave and it unbinds / 未记住，离开后需重贴"}
            </div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Address / 地址</div>
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
            <button type="button" onClick={() => copyText("Address", addr)} style={btnTiny}>
              Copy address / 复制地址
            </button>

            <div style={{ fontSize: 11, color: "#888", margin: "14px 0 4px" }}>
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
              {revealSecret ? secret || "(not available / 无法读取)" : "••••••••••••••••••••••••••••••••"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button type="button" onClick={() => setRevealSecret((v) => !v)} style={btnTiny}>
                {revealSecret ? "Hide / 隐藏" : "Show secret / 显示私钥"}
              </button>
              <button type="button" onClick={() => copyText("Secret key", secret)} style={btnTiny}>
                Copy secret / 复制私钥
              </button>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 11, color: "#f48", lineHeight: 1.4 }}>
              Never screenshot or share this key.
              <br />
              不要截图或分享私钥。
            </p>
            <button type="button" onClick={onClear} style={btnDanger}>
              Clear key / 清除本机密钥
            </button>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.5 }}>
            No local key yet. Switch to Import first.
            <br />
            还没有本机私钥，请先到「导入」。
          </p>
        )}

        <button type="button" onClick={close} style={btnGhost}>
          Close / 关闭
        </button>
      </div>
    </div>
  );
}

/**
 * One button under title / above My Data.
 * Combines Privy 「导出嵌入式钱包 / Export Wallet」 + local key import/export.
 */
export function LocalWalletEntryButtons({ embeddedExport = null }) {
  const local = useLocalKeyWallet();

  return (
    <div style={{ margin: "0 0 16px" }}>
      <button
        type="button"
        onClick={() => local.setShowKeyModal(true)}
        style={btnBar}
      >
        <span>Import · Export / 导入·导出</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: local.connected ? "#04140c" : "#8a9",
            background: local.connected ? "#00ff9d" : "rgba(255,255,255,0.08)",
            borderRadius: 999,
            padding: "3px 8px",
          }}
        >
          {local.connected ? "Local On" : "Keys"}
        </span>
      </button>
      <KeyVaultModal embeddedExport={embeddedExport} />
    </div>
  );
}

const btnBar: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(0,255,157,0.35)",
  background: "rgba(0,255,157,0.08)",
  color: "#e8fff4",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

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

const btnTiny: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #444",
  background: "#1a1a22",
  color: "#ddd",
  fontSize: 11,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,80,80,0.45)",
  background: "rgba(255,80,80,0.12)",
  color: "#ffcdd2",
  fontSize: 13,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  marginTop: 10,
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #444",
  background: "transparent",
  color: "#aaa",
  cursor: "pointer",
};

