/**
 * Login.tsx — bdcs2 游戏平台登录/注册页
 * 设计风格：赛博朋克深紫蓝霓虹，与首页同色系
 * 功能：手机号 + 验证码登录 / 注册（接入真实 API）
 */
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { ASSETS } from '@/lib/assets';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Login() {
  const [, navigate] = useLocation();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [agree, setAgree] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 检查是否已登录
  const { data: playerMe } = trpc.player.me.useQuery();
  useEffect(() => {
    if (playerMe) navigate('/');
  }, [playerMe]);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => setCountdown((c) => c - 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  // 发送验证码 API
  const sendCodeMutation = trpc.player.sendCode.useMutation({
    onSuccess: () => {
      toast.success('验证码已发送（模拟：123456）');
      setCountdown(60);
    },
    onError: (e) => toast.error(e.message),
  });

  const utils = trpc.useUtils();

  // 登录 API
  const loginMutation = trpc.player.login.useMutation({
    onSuccess: async (data) => {
      toast.success(data.isNew ? '注册成功，欢迎加入 BDCS2！' : '登录成功！');
      // 先刷新玩家信息缓存，确保 cookie 已写入再跳转
      await utils.player.me.invalidate();
      // 延迟一小段确保跳转后首页能读到 cookie
      setTimeout(() => navigate('/'), 100);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSendCode = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error('请输入正确的11位手机号');
      return;
    }
    sendCodeMutation.mutate({ phone, purpose: 'login' });
  };

  const handleSubmit = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { toast.error('请输入正确的手机号'); return; }
    if (code.length !== 6) { toast.error('请输入6位验证码'); return; }
    if (!agree) { toast.error('请先同意用户协议'); return; }
    loginMutation.mutate({ phone, code });
  };

  return (
    <div
      className="phone-container"
      style={{
        height: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0621',
        overflow: 'hidden',
      }}
    >
      {/* 背景图 */}
      <img
        src={ASSETS.loginBg}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          opacity: 0.7,
        }}
      />

      {/* 背景遮罩渐变 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(13,6,33,0.3) 0%, rgba(13,6,33,0.55) 50%, rgba(13,6,33,0.92) 75%, rgba(13,6,33,1) 100%)',
          zIndex: 1,
        }}
      />

      {/* 内容层 */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0 20px',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* LOGO 区域 */}
        <div
          style={{
            marginTop: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
          }}
        >
          <img
            src={ASSETS.bdcs2Logo}
            alt="BDCS2"
            style={{
              width: 260,
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 20px rgba(180,80,255,0.6)) drop-shadow(0 0 40px rgba(0,229,255,0.3))',
            }}
          />
          <p
            style={{
              color: 'rgba(200,170,255,0.7)',
              fontSize: 12,
              letterSpacing: 3,
              marginTop: -4,
              textTransform: 'uppercase',
            }}
          >
            BATTLE · DESTINY · CYBER · SPACE
          </p>
        </div>

        {/* 登录卡片 */}
        <div
          style={{
            width: '100%',
            marginTop: 32,
            background: 'rgba(20,8,50,0.85)',
            border: '1px solid rgba(120,60,220,0.5)',
            borderRadius: 16,
            padding: '24px 20px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 40px rgba(80,20,160,0.4), inset 0 1px 0 rgba(180,100,255,0.15)',
          }}
        >
          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ color: '#fff', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
              手机号登录 / 注册
            </div>
            <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>
              未注册手机号将自动创建账号
            </div>
          </div>

          {/* 手机号输入 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: 'rgba(200,170,255,0.7)', fontSize: 12, display: 'block', marginBottom: 6 }}>
              手机号码
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(120,60,220,0.4)',
                borderRadius: 10,
                padding: '0 14px',
                gap: 8,
              }}
            >
              <span style={{ color: 'rgba(200,170,255,0.6)', fontSize: 14, flexShrink: 0 }}>+86</span>
              <div style={{ width: 1, height: 18, background: 'rgba(120,60,220,0.4)' }} />
              <input
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                maxLength={11}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: 15,
                  padding: '12px 0',
                }}
              />
            </div>
          </div>

          {/* 验证码输入 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: 'rgba(200,170,255,0.7)', fontSize: 12, display: 'block', marginBottom: 6 }}>
              验证码
            </label>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(120,60,220,0.4)',
                  borderRadius: 10,
                  padding: '0 12px',
                }}
              >
                <input
                  type="text"
                  placeholder="请输入验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: 18,
                    padding: '12px 0',
                    letterSpacing: 4,
                    textAlign: 'center',
                  }}
                />
              </div>
              <button
                onClick={handleSendCode}
                disabled={countdown > 0 || phone.length < 11 || sendCodeMutation.isPending}
                style={{
                  flexShrink: 0,
                  width: 90,
                  padding: '0 8px',
                  borderRadius: 10,
                  border: '1px solid rgba(120,60,220,0.5)',
                  background: countdown > 0
                    ? 'rgba(60,20,120,0.4)'
                    : 'linear-gradient(135deg, rgba(123,47,255,0.8) 0%, rgba(59,130,246,0.8) 100%)',
                  color: countdown > 0 ? 'rgba(180,150,255,0.5)' : '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
              >
                {sendCodeMutation.isPending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>

          </div>

          {/* 用户协议 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 20 }}>
            <div
              onClick={() => setAgree(!agree)}
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: `2px solid ${agree ? '#7b2fff' : 'rgba(120,60,220,0.5)'}`,
                background: agree ? 'linear-gradient(135deg, #7b2fff, #3b82f6)' : 'transparent',
                flexShrink: 0,
                marginTop: 1,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {agree && (
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path d="M1 4L4 7L10 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span style={{ color: 'rgba(180,150,255,0.6)', fontSize: 12, lineHeight: 1.5 }}>
              我已阅读并同意
              <span style={{ color: '#a78bfa', cursor: 'pointer' }}>《用户服务协议》</span>
              和
              <span style={{ color: '#a78bfa', cursor: 'pointer' }}>《隐私政策》</span>
            </span>
          </div>

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={loginMutation.isPending}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 12,
              border: 'none',
              background: loginMutation.isPending
                ? 'rgba(60,20,120,0.6)'
                : 'linear-gradient(135deg, #7b2fff 0%, #3b82f6 50%, #06b6d4 100%)',
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
              letterSpacing: 2,
              boxShadow: '0 4px 20px rgba(123,47,255,0.5), 0 0 40px rgba(0,229,255,0.15)',
              transition: 'all 0.2s',
            }}
          >
            {loginMutation.isPending ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{
                  width: 16, height: 16,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  display: 'inline-block',
                }} />
                登录中...
              </span>
            ) : '立即登录 / 注册'}
          </button>
        </div>


      </div>

      {/* 输入框占位符颜色 & 旋转动画 */}
      <style>{`
        input::placeholder { color: rgba(180,150,255,0.35) !important; }
        input { caret-color: #a78bfa; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
