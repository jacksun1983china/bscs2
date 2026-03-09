/**
 * AgentLogin.tsx — 客服坐席登录页
 * 独立于玩家登录系统，使用坐席账号密码登录
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

export default function AgentLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = trpc.cs.agentLogin.useMutation({
    onSuccess: () => navigate('/agent'),
    onError: (e) => setError(e.message),
  });

  const handleLogin = () => {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('请输入账号和密码');
      return;
    }
    loginMutation.mutate({ username: username.trim(), password: password.trim() });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0d0621 0%, #1a0a3d 50%, #0d0621 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'linear-gradient(135deg, rgba(30,10,65,0.95) 0%, rgba(15,5,40,0.98) 100%)',
          border: '1.5px solid rgba(120,60,220,0.5)',
          borderRadius: 20,
          padding: '40px 32px',
          boxShadow: '0 0 40px rgba(80,20,160,0.4), inset 0 0 30px rgba(0,0,0,0.3)',
        }}
      >
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              background: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            客服坐席系统
          </div>
          <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13 }}>BDCS2 Customer Service</div>
        </div>

        {/* 账号输入 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'rgba(180,150,255,0.7)', fontSize: 12, marginBottom: 6 }}>坐席账号</div>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="请输入坐席账号"
            style={{
              width: '100%',
              background: 'rgba(20,8,50,0.8)',
              border: '1.5px solid rgba(120,60,220,0.4)',
              borderRadius: 10,
              padding: '12px 14px',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 密码输入 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: 'rgba(180,150,255,0.7)', fontSize: 12, marginBottom: 6 }}>坐席密码</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="请输入密码"
            style={{
              width: '100%',
              background: 'rgba(20,8,50,0.8)',
              border: '1.5px solid rgba(120,60,220,0.4)',
              borderRadius: 10,
              padding: '12px 14px',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div
            style={{
              background: 'rgba(220,38,38,0.15)',
              border: '1px solid rgba(220,38,38,0.4)',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#f87171',
              fontSize: 13,
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* 登录按钮 */}
        <button
          onClick={handleLogin}
          disabled={loginMutation.isPending}
          style={{
            width: '100%',
            padding: '14px',
            background: loginMutation.isPending
              ? 'rgba(60,30,100,0.5)'
              : 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
            border: '1.5px solid rgba(124,58,237,0.7)',
            borderRadius: 12,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
            letterSpacing: 1,
            boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            transition: 'all 0.2s',
          }}
        >
          {loginMutation.isPending ? '登录中...' : '登录坐席系统'}
        </button>

        {/* 返回首页 */}
        <div
          onClick={() => navigate('/')}
          style={{
            textAlign: 'center',
            marginTop: 20,
            color: 'rgba(180,150,255,0.5)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          返回游戏首页
        </div>
      </div>
    </div>
  );
}
