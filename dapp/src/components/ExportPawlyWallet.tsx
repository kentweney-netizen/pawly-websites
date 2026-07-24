// @ts-nocheck
import { usePrivy } from '@privy-io/react-auth';
import { useExportWallet } from '@privy-io/react-auth/solana';

export default function ExportPawlyWallet() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { exportWallet } = useExportWallet();

  const handleExport = async () => {
    try {
      await exportWallet();
    } catch (e) {
      console.error(e);
      alert(
        '导出失败，请确认已用注册邮箱登录。\nExport failed. Please login with your registration email.'
      );
    }
  };

  if (!ready) {
    return <p style={{ color: '#888' }}>加载中... / Loading...</p>;
  }

  return (
    <div
      style={{
        maxWidth: 520,
        margin: '40px auto',
        padding: 24,
        background: '#1a0033',
        border: '1px solid #00ff9d',
        borderRadius: 16,
        color: '#eee',
        lineHeight: 1.7,
      }}
    >
      <h2 style={{ color: '#00ff9d', marginTop: 0 }}>
        导出我的 PAWLY 钱包 / Export My Wallet
      </h2>

      <div
        style={{
          background: 'rgba(255,170,0,0.12)',
          border: '1px solid #ffaa00',
          borderRadius: 12,
          padding: 14,
          marginBottom: 20,
          fontSize: 14,
        }}
      >
        <strong style={{ color: '#ffaa00' }}>⚠️ 安全提示 / Security</strong>
        <br />
        私钥 = 资产控制权。任何人拿到私钥都能转走资产。请勿截图发给他人，勿在公共设备导出。
        <br />
        <span style={{ color: '#aaa' }}>
          Private key = full control. Never share it. Do not export on public devices.
        </span>
      </div>

      {!authenticated ? (
        <>
          <p style={{ fontSize: 14, color: '#ccc' }}>
            请使用 <strong>注册 PAWLY 时的同一邮箱</strong> 登录，才能导出自动创建的 Solana 钱包。
            <br />
            <span style={{ color: '#888' }}>
              Use the same email you registered with on PAWLY.
            </span>
          </p>
          <button
            onClick={login}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 12,
              border: 'none',
              background: '#00ff9d',
              color: '#000',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            邮箱登录 Privy / Login with Email
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 14 }}>
            已登录 / Logged in:{' '}
            <span style={{ color: '#00ff9d' }}>
              {user?.email?.address || '—'}
            </span>
          </p>
          <button
            onClick={handleExport}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg,#8b5cf6,#10b981)',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            导出私钥 / Export Private Key
          </button>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 12,
              border: '1px solid #555',
              background: 'transparent',
              color: '#aaa',
              cursor: 'pointer',
            }}
          >
            退出登录 / Logout
          </button>
        </>
      )}

      <p style={{ marginTop: 20, fontSize: 13, color: '#888' }}>
        导出后：Phantom → 导入私钥 → 粘贴 Base58 字符串。
        <br />
        After export: Phantom → Import private key → paste Base58.
      </p>

      <p style={{ marginTop: 16, textAlign: 'center' }}>
        <a href="https://pawlypets.netlify.app" style={{ color: '#00ff9d' }}>
          ← 返回 PAWLY 主页 / Back to PAWLY
        </a>
      </p>
    </div>
  );
}
