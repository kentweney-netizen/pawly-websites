import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function SupabaseAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  const handleLogin = async () => {
    setLoading(true);
    setMessage('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage('登录失败: ' + error.message);
    else { setUser(data.user); setMessage('登录成功！'); }
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage('注册失败: ' + error.message);
    else setMessage('注册成功！请检查邮箱验证链接。');
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMessage('已登出');
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '24px', background: '#1a0033', borderRadius: '16px', border: '2px solid #00ff9d' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '24px' }}>Supabase 邮箱登录</h3>

      {!user ? (
        <>
          <input type="email" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px' }} />
          <input type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px' }} />

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleLogin} disabled={loading} style={{ flex: 1, padding: '12px', background: '#00ff9d', color: 'black', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>登录</button>
            <button onClick={handleRegister} disabled={loading} style={{ flex: 1, padding: '12px', background: '#555', color: 'white', border: 'none', borderRadius: '10px' }}>注册</button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <p>已登录: {user.email}</p>
          <button onClick={handleLogout} style={{ padding: '10px 30px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '10px' }}>登出</button>
        </div>
      )}

      {message && <p style={{ marginTop: '16px', color: '#ffaa00', textAlign: 'center' }}>{message}</p>}
    </div>
  );
}
