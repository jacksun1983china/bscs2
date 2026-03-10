/**
 * Login.tsx — bdcs2 游戏平台登录/注册页
 * 设计风格：赛博朋克深紫蓝霓虹，与首页同色系
 * 布局：女战士角色图（上半屏）+ 新LOGO + 登录表单（下半屏）
 * 功能：手机号 + 验证码登录 / 注册（接入真实 API）
 */
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const NEW_LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/bdcs2logo2026_753f0156.png';
const GIRL_WARRIOR = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/girl-warrior_b27c8502.png';

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
      await utils.player.me.invalidate();
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
        background: '#0a0418',
        overflow: 'hidden',
      }}
    >
      {/* ── 全局深色渐变背景 ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(80,20,160,0.45) 0%, rgba(10,4,24,0) 65%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* ── 底部渐变遮罩（让表单区域更清晰） ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '55%',
          background: 'linear-gradient(to top, rgba(10,4,24,1) 40%, rgba(10,4,24,0.85) 70%, rgba(10,4,24,0) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* ── 女战士角色图（上半屏，右侧偏移，底部渐变淡出） ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: '-5%',
          width: '90%',
          height: '62%',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <img
          src={GIRL_WARRIOR}
          alt="角色"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'top right',
            // 底部渐变淡出，与背景融合
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)',
          }}
        />
        {/* 角色身上的霓虹光晕 */}
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            left: '20%',
            width: '60%',
            height: '40%',
            background: 'radial-gradient(ellipse, rgba(0,180,255,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── 内容层 ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* LOGO 区域（左上角，不遮挡角色） */}
        <div
          style={{
            padding: '28px 20px 0 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          <img
            src={NEW_LOGO}
            alt="BDCS2"
            style={{
              width: 200,
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 16px rgba(180,80,255,0.5)) drop-shadow(0 0 32px rgba(0,180,255,0.25))',
            }}
          />
          <p
            style={{
              color: 'rgba(180,140,255,0.6)',
              fontSize: 11,
              letterSpacing: 3,
              marginTop: 4,
              textTransform: 'uppercase',
            }}
          >
            BATTLE · DESTINY · CYBER · SPACE
          </p>
        </div>

        {/* 弹性空间（把表单推到底部） */}
        <div style={{ flex: 1 }} />

        {/* 登录卡片（底部） */}
        <div
          style={{
            padding: '0 16px 24px 16px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              background: 'rgba(16,6,40,0.82)',
              border: '1px solid rgba(120,60,220,0.45)',
              borderRadius: 18,
              padding: '22px 18px 20px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 40px rgba(80,20,160,0.35), inset 0 1px 0 rgba(180,100,255,0.12)',
            }}
          >
            {/* 标题 */}
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 3 }}>
                手机号登录 / 注册
              </div>
              <div style={{ color: 'rgba(180,150,255,0.45)', fontSize: 11 }}>
                未注册手机号将自动创建账号
              </div>
            </div>

            {/* 手机号输入 */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: 'rgba(200,170,255,0.65)', fontSize: 11, display: 'block', marginBottom: 5 }}>
                手机号码
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(120,60,220,0.38)',
                  borderRadius: 10,
                  padding: '0 12px',
                  gap: 8,
                }}
              >
                <span style={{ color: 'rgba(200,170,255,0.55)', fontSize: 13, flexShrink: 0 }}>+86</span>
                <div style={{ width: 1, height: 16, background: 'rgba(120,60,220,0.35)' }} />
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
                    padding: '11px 0',
                  }}
                />
              </div>
            </div>

            {/* 验证码输入 */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: 'rgba(200,170,255,0.65)', fontSize: 11, display: 'block', marginBottom: 5 }}>
                验证码
              </label>
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(120,60,220,0.38)',
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
                      padding: '11px 0',
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
                    border: '1px solid rgba(120,60,220,0.45)',
                    background: countdown > 0
                      ? 'rgba(60,20,120,0.35)'
                      : 'linear-gradient(135deg, rgba(123,47,255,0.8) 0%, rgba(59,130,246,0.8) 100%)',
                    color: countdown > 0 ? 'rgba(180,150,255,0.45)' : '#fff',
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
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
              <div
                onClick={() => setAgree(!agree)}
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: 4,
                  border: `2px solid ${agree ? '#7b2fff' : 'rgba(120,60,220,0.45)'}`,
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
                  <svg width="10" height="8" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7L10 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{ color: 'rgba(180,150,255,0.55)', fontSize: 11, lineHeight: 1.5 }}>
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
                padding: '13px 0',
                borderRadius: 12,
                border: 'none',
                background: loginMutation.isPending
                  ? 'rgba(60,20,120,0.55)'
                  : 'linear-gradient(135deg, #7b2fff 0%, #3b82f6 50%, #06b6d4 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
                letterSpacing: 2,
                boxShadow: '0 4px 20px rgba(123,47,255,0.45), 0 0 30px rgba(0,180,255,0.12)',
                transition: 'all 0.2s',
              }}
            >
              {loginMutation.isPending ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 15, height: 15,
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
      </div>

      {/* 输入框占位符颜色 & 旋转动画 */}
      <style>{`
        input::placeholder { color: rgba(180,150,255,0.3) !important; }
        input { caret-color: #a78bfa; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
