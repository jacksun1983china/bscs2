/**
 * Login.tsx — bdcs2 游戏平台登录/注册页
 * 设计风格：赛博朋克深紫蓝霓虹，与首页同色系
 * 布局：新角色图（居中偏上）+ LOGO + 登录表单
 * 背景：丰富的赛博朋克元素贯穿整个画面（网格、光线、粒子、霓虹）
 */
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const NEW_LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/bdcs2logo2026_753f0156.png';
const CHARACTER_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/login_character_compressed_9e8bf725.webp';

// ── 浮动粒子组件 ──
function FloatingParticles() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2 }}>
      {Array.from({ length: 22 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1.5,
            height: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1.5,
            borderRadius: '50%',
            background: i % 4 === 0 ? '#7b2fff' : i % 4 === 1 ? '#00b4ff' : i % 4 === 2 ? '#ff2d95' : '#06b6d4',
            left: `${(i * 13 + 3) % 95}%`,
            top: `${(i * 19 + 5) % 95}%`,
            animation: `floatParticle${i % 4} ${4 + (i % 5)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.3) % 3}s`,
            opacity: 0.5 + (i % 3) * 0.15,
            boxShadow: `0 0 8px currentColor`,
          }}
        />
      ))}
    </div>
  );
}

export default function Login() {
  const [, navigate] = useLocation();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [agree, setAgree] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 入场动画
  useEffect(() => {
    const t1 = setTimeout(() => setLogoLoaded(true), 200);
    const t2 = setTimeout(() => setFormVisible(true), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // 检查是否已登录
  const { data: playerMe } = trpc.player.me.useQuery(undefined, { staleTime: 30_000 });
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

  const sendCodeMutation = trpc.player.sendCode.useMutation({
    onSuccess: () => { toast.success('验证码已发送（模拟：123456）'); setCountdown(60); },
    onError: (e) => toast.error(e.message),
  });

  const utils = trpc.useUtils();

  const loginMutation = trpc.player.login.useMutation({
    onSuccess: async (data) => {
      toast.success(data.isNew ? '注册成功，欢迎加入 BDCS2！' : '登录成功！');
      await utils.player.me.refetch();
      navigate('/');
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSendCode = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { toast.error('请输入正确的11位手机号'); return; }
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
      {/* ── 层1：赛博朋克透视网格背景（贯穿全屏） ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          linear-gradient(180deg, 
            rgba(10,4,24,0.3) 0%, 
            rgba(20,8,50,0.6) 30%, 
            rgba(10,4,24,0.8) 60%, 
            rgba(10,4,24,0.95) 100%
          )
        `,
      }}>
        {/* 透视网格线 */}
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.12 }}>
          {/* 水平线 */}
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={`${i * 5}%`} x2="100%" y2={`${i * 5}%`}
              stroke="url(#gridGrad)" strokeWidth="0.5" />
          ))}
          {/* 垂直线 */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`v${i}`} x1={`${i * 8.33}%`} y1="0" x2={`${i * 8.33}%`} y2="100%"
              stroke="url(#gridGrad)" strokeWidth="0.5" />
          ))}
          <defs>
            <linearGradient id="gridGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7b2fff" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#00b4ff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7b2fff" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── 层2：多层径向光晕（贯穿全屏） ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 80% 40% at 50% 15%, rgba(123,47,255,0.35) 0%, transparent 70%),
          radial-gradient(ellipse 60% 30% at 20% 50%, rgba(0,100,200,0.2) 0%, transparent 60%),
          radial-gradient(ellipse 60% 30% at 80% 70%, rgba(180,40,120,0.15) 0%, transparent 60%),
          radial-gradient(ellipse 100% 50% at 50% 90%, rgba(123,47,255,0.2) 0%, transparent 50%)
        `,
      }} />

      {/* ── 层3：对角光线条纹 ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: 0.06,
        background: `repeating-linear-gradient(
          -45deg,
          transparent,
          transparent 30px,
          rgba(123,47,255,0.5) 30px,
          rgba(123,47,255,0.5) 31px
        )`,
      }} />

      {/* ── 层4：扫描线特效 ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(120,60,220,0.03) 2px, rgba(120,60,220,0.03) 4px)',
        animation: 'scanlines 8s linear infinite',
      }} />

      {/* ── 层5：顶部和底部霓虹光带 ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(to right, transparent, #7b2fff, #00b4ff, #ff2d95, transparent)',
        zIndex: 5, opacity: 0.8,
        boxShadow: '0 0 20px rgba(123,47,255,0.6), 0 0 40px rgba(0,180,255,0.3)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(to right, transparent, #ff2d95, #00b4ff, #7b2fff, transparent)',
        zIndex: 5, opacity: 0.6,
        boxShadow: '0 0 15px rgba(255,45,149,0.4), 0 0 30px rgba(0,180,255,0.2)',
      }} />

      {/* ── 层6：左右两侧霓虹竖线 ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 1,
        background: 'linear-gradient(to bottom, transparent 10%, rgba(123,47,255,0.4) 30%, rgba(0,180,255,0.3) 70%, transparent 90%)',
        zIndex: 3, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 1,
        background: 'linear-gradient(to bottom, transparent 10%, rgba(0,180,255,0.3) 30%, rgba(123,47,255,0.4) 70%, transparent 90%)',
        zIndex: 3, pointerEvents: 'none',
      }} />

      {/* ── 浮动粒子 ── */}
      <FloatingParticles />

      {/* ── 角色图（居中偏上，四边渐变淡出） ── */}
      <div style={{
        position: 'absolute',
        top: '-5%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        height: '62%',
        zIndex: 3,
        pointerEvents: 'none',
      }}>
        <img
          src={CHARACTER_IMG}
          alt="角色"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center top',
            WebkitMaskImage: `
              linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 8%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 80%, rgba(0,0,0,0.5) 92%, rgba(0,0,0,0) 100%),
              linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)
            `,
            WebkitMaskComposite: 'destination-in',
            maskImage: `
              linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 8%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 80%, rgba(0,0,0,0.5) 92%, rgba(0,0,0,0) 100%),
              linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)
            `,
            maskComposite: 'intersect',
          }}
        />
        {/* 角色身上的霓虹光晕 */}
        <div style={{
          position: 'absolute', bottom: '10%', left: '15%',
          width: '70%', height: '40%',
          background: 'radial-gradient(ellipse, rgba(123,47,255,0.15) 0%, transparent 70%)',
          animation: 'neonPulse 3s ease-in-out infinite',
        }} />
      </div>

      {/* ── 底部渐变遮罩（让角色底部自然融入背景） ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
        background: 'linear-gradient(to top, rgba(10,4,24,1) 30%, rgba(10,4,24,0.95) 50%, rgba(10,4,24,0) 100%)',
        zIndex: 3, pointerEvents: 'none',
      }} />

      {/* ── 内容层 ── */}
      <div style={{
        position: 'relative', zIndex: 4, flex: 1,
        display: 'flex', flexDirection: 'column', width: '100%',
        minHeight: 0,
      }}>
        {/* LOGO 区域（左上角） */}
        <div style={{
          padding: '24px 20px 0 20px',
          opacity: logoLoaded ? 1 : 0,
          transform: logoLoaded ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          <img
            src={NEW_LOGO}
            alt="BDCS2"
            style={{
              width: 180,
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 16px rgba(180,80,255,0.6)) drop-shadow(0 0 32px rgba(0,180,255,0.3))',
              animation: 'logoPulse 4s ease-in-out infinite',
            }}
          />
          <p style={{
            color: 'rgba(180,140,255,0.55)', fontSize: 10,
            letterSpacing: 3, marginTop: 3, textTransform: 'uppercase',
          }}>
            BATTLE · DESTINY · CYBER · SPACE · 2026
          </p>
        </div>

        {/* ── 登录卡片 ── */}
        <div style={{
          position: 'absolute',
          top: '38%',
          left: 0,
          right: 0,
          padding: '0 16px',
          opacity: formVisible ? 1 : 0,
          transform: formVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          {/* 卡片顶部霓虹线 */}
          <div style={{
            height: 1,
            background: 'linear-gradient(to right, transparent, rgba(123,47,255,0.8), rgba(0,180,255,0.8), transparent)',
            marginBottom: 0,
            animation: 'neonLine 3s ease-in-out infinite',
          }} />

          <div style={{
            background: 'rgba(12,4,32,0.88)',
            border: '1px solid rgba(120,60,220,0.4)',
            borderTop: 'none',
            borderRadius: '0 0 18px 18px',
            padding: '18px 18px 16px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(80,20,160,0.4), inset 0 0 30px rgba(80,20,160,0.05)',
          }}>
            {/* 标题 */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>
                手机号登录 / 注册
              </div>
              <div style={{ color: 'rgba(180,150,255,0.4)', fontSize: 10, marginTop: 2 }}>
                未注册手机号将自动创建账号
              </div>
            </div>

            {/* 手机号输入 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(120,60,220,0.35)',
                borderRadius: 10, padding: '0 12px', gap: 8,
                transition: 'border-color 0.2s',
              }}>
                <span style={{ color: 'rgba(200,170,255,0.5)', fontSize: 13, flexShrink: 0 }}>+86</span>
                <div style={{ width: 1, height: 14, background: 'rgba(120,60,220,0.3)' }} />
                <input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  maxLength={11}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#fff', fontSize: 15, padding: '10px 0',
                  }}
                />
              </div>
            </div>

            {/* 验证码输入 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  flex: 1, minWidth: 0, display: 'flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(120,60,220,0.35)',
                  borderRadius: 10, padding: '0 12px',
                }}>
                  <input
                    type="text"
                    placeholder="验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    style={{
                      flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
                      color: '#fff', fontSize: 18, padding: '10px 0',
                      letterSpacing: 4, textAlign: 'center',
                    }}
                  />
                </div>
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0 || phone.length < 11 || sendCodeMutation.isPending}
                  style={{
                    flexShrink: 0, width: 88, padding: '0 6px', borderRadius: 10,
                    border: '1px solid rgba(120,60,220,0.4)',
                    background: countdown > 0
                      ? 'rgba(40,15,90,0.5)'
                      : 'linear-gradient(135deg, rgba(123,47,255,0.85) 0%, rgba(59,130,246,0.85) 100%)',
                    color: countdown > 0 ? 'rgba(180,150,255,0.4)' : '#fff',
                    fontSize: 11, fontWeight: 600,
                    cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap', transition: 'all 0.2s',
                    boxShadow: countdown > 0 ? 'none' : '0 0 12px rgba(123,47,255,0.4)',
                  }}
                >
                  {sendCodeMutation.isPending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            </div>

            {/* 用户协议 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
              <div
                onClick={() => setAgree(!agree)}
                style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                  border: `2px solid ${agree ? '#7b2fff' : 'rgba(120,60,220,0.4)'}`,
                  background: agree ? 'linear-gradient(135deg, #7b2fff, #3b82f6)' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: agree ? '0 0 8px rgba(123,47,255,0.6)' : 'none',
                }}
              >
                {agree && (
                  <svg width="9" height="7" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7L10 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{ color: 'rgba(180,150,255,0.5)', fontSize: 10, lineHeight: 1.5 }}>
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
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                background: loginMutation.isPending
                  ? 'rgba(60,20,120,0.5)'
                  : 'linear-gradient(135deg, #7b2fff 0%, #3b82f6 50%, #06b6d4 100%)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
                letterSpacing: 2,
                boxShadow: loginMutation.isPending ? 'none' : '0 4px 20px rgba(123,47,255,0.5), 0 0 30px rgba(0,180,255,0.15)',
                transition: 'all 0.2s',
                animation: loginMutation.isPending ? 'none' : 'btnPulse 3s ease-in-out infinite',
              }}
            >
              {loginMutation.isPending ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 14, height: 14,
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block',
                  }} />
                  登录中...
                </span>
              ) : '立即登录 / 注册'}
            </button>
          </div>

          {/* ── 底部装饰：霓虹分隔线 + 版权 ── */}
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            {/* 装饰线组 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(123,47,255,0.4))' }} />
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: i === 1 ? 6 : 3, height: i === 1 ? 6 : 3,
                    borderRadius: '50%',
                    background: i === 1 ? '#7b2fff' : 'rgba(123,47,255,0.4)',
                    boxShadow: i === 1 ? '0 0 8px #7b2fff' : 'none',
                    animation: i === 1 ? 'dotPulse 2s ease-in-out infinite' : 'none',
                  }} />
                ))}
              </div>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(0,180,255,0.4))' }} />
            </div>

            {/* 底部标语 */}
            <div style={{
              color: 'rgba(180,150,255,0.3)', fontSize: 9,
              letterSpacing: 2, textTransform: 'uppercase',
            }}>
              BATTLE · DESTINY · CYBER · SPACE · 2026
            </div>
          </div>
        </div>
      </div>

      {/* ── 全局动画样式 ── */}
      <style>{`
        input::placeholder { color: rgba(180,150,255,0.28) !important; }
        input { caret-color: #a78bfa; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes logoPulse {
          0%, 100% { filter: drop-shadow(0 0 16px rgba(180,80,255,0.6)) drop-shadow(0 0 32px rgba(0,180,255,0.3)); }
          50% { filter: drop-shadow(0 0 24px rgba(180,80,255,0.9)) drop-shadow(0 0 48px rgba(0,180,255,0.5)); }
        }

        @keyframes neonPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        @keyframes neonLine {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(123,47,255,0.5), 0 0 30px rgba(0,180,255,0.15); }
          50% { box-shadow: 0 4px 28px rgba(123,47,255,0.75), 0 0 45px rgba(0,180,255,0.3); }
        }

        @keyframes dotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }

        @keyframes scanlines {
          0% { background-position: 0 0; }
          100% { background-position: 0 100px; }
        }

        @keyframes floatParticle0 {
          0%, 100% { transform: translate(0, 0); opacity: 0.6; }
          33% { transform: translate(8px, -12px); opacity: 0.9; }
          66% { transform: translate(-5px, -6px); opacity: 0.7; }
        }
        @keyframes floatParticle1 {
          0%, 100% { transform: translate(0, 0); opacity: 0.5; }
          40% { transform: translate(-10px, -8px); opacity: 0.85; }
          70% { transform: translate(6px, -14px); opacity: 0.65; }
        }
        @keyframes floatParticle2 {
          0%, 100% { transform: translate(0, 0); opacity: 0.7; }
          30% { transform: translate(12px, -10px); opacity: 1; }
          60% { transform: translate(-8px, -5px); opacity: 0.6; }
        }
        @keyframes floatParticle3 {
          0%, 100% { transform: translate(0, 0); opacity: 0.55; }
          50% { transform: translate(-6px, -16px); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
