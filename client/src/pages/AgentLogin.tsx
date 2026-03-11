/**
 * AgentLogin.tsx — 客服坐席登录页（重新设计）
 * 现代化 UI，移动端友好，支持 PWA 安装引导
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

// 检测是否已以 PWA 独立模式运行
function isRunningAsPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

// 检测是否为 iOS 设备
function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// 检测是否为 Android 设备
function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

export default function AgentLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [isPWA, setIsPWA] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    setIsPWA(isRunningAsPWA());

    // 监听 beforeinstallprompt 事件（Android Chrome）
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android Chrome 原生安装提示
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // 显示手动安装指引
      setShowInstallGuide(true);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0f0c29 0%, #1a0a3d 40%, #24243e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* 顶部 Logo 区 */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 32px rgba(124,58,237,0.5)',
              fontSize: 32,
            }}
          >
            🎧
          </div>
          <h1
            style={{
              color: '#fff',
              fontSize: 22,
              fontWeight: 800,
              margin: 0,
              letterSpacing: 0.5,
            }}
          >
            坐席工作台
          </h1>
          <p style={{ color: 'rgba(180,150,255,0.6)', fontSize: 13, marginTop: 6 }}>
            YouMe 游戏平台客服系统
          </p>
          {/* PWA 已安装标识 */}
          {isPWA && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(74,222,128,0.12)',
                border: '1px solid rgba(74,222,128,0.3)',
                borderRadius: 20,
                padding: '3px 12px',
                marginTop: 8,
                color: '#4ade80',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              ✓ 已安装为应用
            </div>
          )}
        </div>

        {/* 登录表单 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '24px 20px',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* 账号输入 */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                color: 'rgba(200,180,255,0.7)',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                letterSpacing: 0.3,
              }}
            >
              账号
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="请输入坐席账号"
              autoComplete="username"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: '12px 16px',
                color: '#fff',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {/* 密码输入 */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                color: 'rgba(200,180,255,0.7)',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                letterSpacing: 0.3,
              }}
            >
              密码
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="请输入密码"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '12px 44px 12px 16px',
                  color: '#fff',
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(180,150,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: 4,
                }}
              >
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#fca5a5',
                fontSize: 13,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* 登录按钮 */}
          <button
            onClick={handleLogin}
            disabled={loginMutation.isPending}
            style={{
              width: '100%',
              background: loginMutation.isPending
                ? 'rgba(124,58,237,0.4)'
                : 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
              border: 'none',
              borderRadius: 14,
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              padding: '14px 0',
              cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
              letterSpacing: 0.5,
              boxShadow: loginMutation.isPending ? 'none' : '0 6px 24px rgba(124,58,237,0.4)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loginMutation.isPending ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                登录中...
              </>
            ) : (
              '登录工作台'
            )}
          </button>
        </div>

        {/* PWA 安装引导 */}
        {!isPWA && (
          <div
            style={{
              marginTop: 20,
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: 16,
              padding: '16px 20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: showInstallGuide ? 14 : 0,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                📲
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
                  安装到手机主屏幕
                </div>
                <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 12 }}>
                  安装后可接收推送通知，随时响应客服
                </div>
              </div>
              <button
                onClick={handleInstallClick}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
                }}
              >
                {deferredPrompt ? '立即安装' : '查看步骤'}
              </button>
            </div>

            {/* 安装步骤指引 */}
            {showInstallGuide && (
              <div
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginTop: 4,
                }}
              >
                {isIOS() ? (
                  <>
                    <div style={{ color: '#e0d0ff', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                      📱 iPhone / iPad 安装步骤：
                    </div>
                    <div style={{ color: 'rgba(200,180,255,0.8)', fontSize: 13, lineHeight: 2 }}>
                      <div>1. 点击底部工具栏的 <strong style={{ color: '#fff' }}>分享</strong> 按钮 (□↑)</div>
                      <div>2. 向下滚动，选择 <strong style={{ color: '#fff' }}>添加到主屏幕</strong></div>
                      <div>3. 点击右上角 <strong style={{ color: '#fff' }}>添加</strong> 确认</div>
                      <div>4. 从主屏幕打开即可使用推送通知</div>
                    </div>
                  </>
                ) : isAndroid() ? (
                  <>
                    <div style={{ color: '#e0d0ff', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                      📱 Android 安装步骤：
                    </div>
                    <div style={{ color: 'rgba(200,180,255,0.8)', fontSize: 13, lineHeight: 2 }}>
                      <div>1. 点击浏览器右上角 <strong style={{ color: '#fff' }}>⋮ 菜单</strong></div>
                      <div>2. 选择 <strong style={{ color: '#fff' }}>添加到主屏幕</strong> 或 <strong style={{ color: '#fff' }}>安装应用</strong></div>
                      <div>3. 点击 <strong style={{ color: '#fff' }}>安装</strong> 确认</div>
                      <div>4. 从主屏幕打开即可接收推送通知</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ color: '#e0d0ff', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                      💻 桌面端安装步骤：
                    </div>
                    <div style={{ color: 'rgba(200,180,255,0.8)', fontSize: 13, lineHeight: 2 }}>
                      <div>1. 点击地址栏右侧的 <strong style={{ color: '#fff' }}>安装图标</strong> (⊕)</div>
                      <div>2. 或点击浏览器菜单 → <strong style={{ color: '#fff' }}>安装 YouMe 坐席系统</strong></div>
                      <div>3. 点击 <strong style={{ color: '#fff' }}>安装</strong> 确认</div>
                    </div>
                  </>
                )}
                <button
                  onClick={() => setShowInstallGuide(false)}
                  style={{
                    marginTop: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: 'rgba(180,150,255,0.6)',
                    fontSize: 12,
                    padding: '6px 14px',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  收起
                </button>
              </div>
            )}
          </div>
        )}

        {/* 返回首页 */}
        <div
          onClick={() => navigate('/')}
          style={{
            textAlign: 'center',
            marginTop: 20,
            color: 'rgba(180,150,255,0.4)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ← 返回游戏首页
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: rgba(180,150,255,0.35); }
        input:focus {
          border-color: rgba(124,58,237,0.5) !important;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.15);
        }
      `}</style>
    </div>
  );
}
