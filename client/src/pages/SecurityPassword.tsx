/**
 * SecurityPassword.tsx — 安全密码设置弹窗组件
 * 纯 CSS 赛博朋克风格，无 PNG 依赖
 */
import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

interface SecurityPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SecurityPasswordModal({ visible, onClose }: SecurityPasswordModalProps) {
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [code, setCode] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: meData } = trpc.player.me.useQuery(undefined, { enabled: visible });
  const phone = meData?.phone ?? '';
  const maskedPhone = phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未绑定手机';

  const sendCodeMutation = trpc.player.sendSecurityCode.useMutation({
    onSuccess: () => {
      toast.success('验证码已发送，请查收短信');
      setCountdown(60);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (err) => toast.error(err.message || '发送失败，请稍后重试'),
  });

  const setPasswordMutation = trpc.player.setPassword.useMutation({
    onSuccess: () => {
      toast.success('安全密码设置成功');
      setTimeout(() => { setCode(''); setNewPwd(''); setConfirmPwd(''); onClose(); }, 1000);
    },
    onError: (err) => toast.error(err.message || '设置失败，请重试'),
  });

  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    } else {
      setAnimating(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible && timerRef.current) { clearInterval(timerRef.current); setCountdown(0); }
  }, [visible]);

  if (!mounted) return null;

  const handleSendCode = () => {
    if (countdown > 0) return;
    if (!phone) { toast.error('请先绑定手机号'); return; }
    sendCodeMutation.mutate();
  };

  const handleSubmit = () => {
    if (!code) { toast.error('请输入验证码'); return; }
    if (!newPwd) { toast.error('请输入新密码'); return; }
    if (newPwd.length < 6 || newPwd.length > 20) { toast.error('密码长度为6-20位'); return; }
    if (newPwd !== confirmPwd) { toast.error('两次密码不一致'); return; }
    setPasswordMutation.mutate({ code, password: newPwd });
  };

  const handleClose = () => { setAnimating(false); setTimeout(onClose, 300); };
  const submitting = setPasswordMutation.isPending;
  const sendingCode = sendCodeMutation.isPending;

  return (
    <>
      {/* ── 遮罩 ── */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 2000,
          opacity: animating ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* ── 弹窗主体 ── */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          zIndex: 2001,
          containerType: 'inline-size',
          transform: `translateY(${animating ? '0' : '100%'})`,
          transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
          borderRadius: `${q(28)} ${q(28)} 0 0`,
          overflow: 'hidden',
          /* 深紫蓝渐变背景 */
          background: 'linear-gradient(180deg, #1a0b4b 0%, #0f0630 60%, #0a0420 100%)',
          /* 顶部霓虹边框 */
          borderTop: '2px solid rgba(120,60,255,0.7)',
          borderLeft: '1px solid rgba(80,40,200,0.4)',
          borderRight: '1px solid rgba(80,40,200,0.4)',
          boxShadow: '0 -8px 40px rgba(100,40,255,0.35), inset 0 1px 0 rgba(180,100,255,0.2)',
        }}
      >
        {/* 顶部扫描线装饰 */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(120,60,255,0.03) 3px, rgba(120,60,255,0.03) 4px)',
          pointerEvents: 'none', zIndex: 0,
        }} />
        {/* 顶部光晕 */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '80%', height: q(4),
          background: 'linear-gradient(90deg, transparent, rgba(160,80,255,0.8), rgba(80,200,255,0.8), transparent)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* ── 内容层 ── */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', flexDirection: 'column',
          maxHeight: '90cqh', overflowY: 'auto',
          paddingBottom: q(50),
        }}>

          {/* 标题栏 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: `${q(36)} ${q(32)} ${q(24)}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: q(12) }}>
              {/* 标题左侧装饰竖条 */}
              <div style={{
                width: q(6), height: q(36),
                background: 'linear-gradient(180deg, #a855f7, #38bdf8)',
                borderRadius: q(3),
                boxShadow: '0 0 8px rgba(168,85,247,0.8)',
              }} />
              <span style={{
                color: '#fff', fontSize: q(34), fontWeight: 700,
                textShadow: '0 0 12px rgba(168,85,247,0.6)',
                letterSpacing: '0.05em',
              }}>安全密码</span>
            </div>
            {/* 关闭按钮 */}
            <div
              onClick={handleClose}
              style={{
                width: q(52), height: q(52),
                borderRadius: '50%',
                border: '1.5px solid rgba(120,60,255,0.5)',
                background: 'rgba(80,40,160,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 8px rgba(120,60,255,0.3)',
              }}
            >
              <svg width={q(22)} height={q(22)} viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="rgba(200,160,255,0.9)" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* 表单区域 */}
          <div style={{ padding: `0 ${q(32)}` }}>

            {/* ── 手机号 ── */}
            <FieldLabel label="手机号" />
            <DisplayField value={`+86-${maskedPhone}`} />

            {/* ── 验证码 ── */}
            <FieldLabel label="验证码" />
            <div style={{ display: 'flex', gap: q(16), marginBottom: q(24) }}>
              <InputField
                value={code}
                onChange={setCode}
                placeholder="手机验证码"
                maxLength={6}
                style={{ flex: 1 }}
              />
              {/* 获取验证码按钮 */}
              <div
                onClick={handleSendCode}
                style={{
                  flexShrink: 0,
                  width: q(210),
                  height: q(80),
                  borderRadius: q(8),
                  cursor: (countdown > 0 || sendingCode) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: (countdown > 0 || sendingCode)
                    ? 'rgba(60,30,120,0.5)'
                    : 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                  border: '1.5px solid',
                  borderColor: (countdown > 0 || sendingCode) ? 'rgba(100,60,200,0.3)' : 'rgba(180,100,255,0.7)',
                  boxShadow: (countdown > 0 || sendingCode) ? 'none' : '0 0 12px rgba(120,60,255,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  color: (countdown > 0 || sendingCode) ? 'rgba(200,180,255,0.5)' : '#fff',
                  fontSize: q(24), fontWeight: 700,
                  textShadow: (countdown > 0 || sendingCode) ? 'none' : '0 0 8px rgba(200,160,255,0.8)',
                }}>
                  {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                </span>
              </div>
            </div>

            {/* ── 新密码 ── */}
            <FieldLabel label="新密码" />
            <InputField
              type="password"
              value={newPwd}
              onChange={setNewPwd}
              placeholder="请输入您的安全密码"
              maxLength={20}
            />
            <p style={{
              color: '#38bdf8', fontSize: q(22),
              margin: `${q(-12)} 0 ${q(20)} ${q(4)}`,
              opacity: 0.85,
            }}>
              密码长度为6-20个字母和数字的组合
            </p>

            {/* ── 确认密码 ── */}
            <FieldLabel label="确认密码" />
            <InputField
              type="password"
              value={confirmPwd}
              onChange={setConfirmPwd}
              placeholder="再次输入您的密码"
              maxLength={20}
              style={{ marginBottom: q(40) }}
            />

            {/* ── 提交按钮 ── */}
            <div
              onClick={!submitting ? handleSubmit : undefined}
              style={{
                height: q(90),
                borderRadius: q(10),
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                background: submitting
                  ? 'rgba(80,40,0,0.5)'
                  : 'linear-gradient(135deg, #b45309 0%, #d97706 40%, #f59e0b 60%, #b45309 100%)',
                border: '2px solid',
                borderColor: submitting ? 'rgba(120,80,0,0.3)' : 'rgba(251,191,36,0.6)',
                boxShadow: submitting ? 'none' : '0 0 20px rgba(245,158,11,0.4), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                transition: 'all 0.2s',
              }}
            >
              {/* 按钮高光 */}
              {!submitting && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
                  pointerEvents: 'none',
                }} />
              )}
              <span style={{
                color: submitting ? 'rgba(255,200,100,0.5)' : '#fff',
                fontSize: q(32), fontWeight: 800,
                letterSpacing: '0.1em',
                textShadow: submitting ? 'none' : '0 1px 6px rgba(120,60,0,0.8), 0 0 12px rgba(255,200,80,0.4)',
                position: 'relative', zIndex: 1,
              }}>
                {submitting ? '提交中...' : '提交'}
              </span>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

/* ── 子组件 ── */

function FieldLabel({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: q(10),
      marginBottom: q(10),
    }}>
      {/* 左侧小装饰点 */}
      <div style={{
        width: q(8), height: q(8), borderRadius: '50%',
        background: 'linear-gradient(135deg, #a855f7, #38bdf8)',
        boxShadow: '0 0 6px rgba(168,85,247,0.8)',
        flexShrink: 0,
      }} />
      <span style={{
        color: 'rgba(220,200,255,0.95)',
        fontSize: q(28), fontWeight: 600,
        letterSpacing: '0.03em',
      }}>{label}</span>
      {/* 右侧延伸线 */}
      <div style={{
        flex: 1, height: '1px',
        background: 'linear-gradient(90deg, rgba(120,60,255,0.4), transparent)',
      }} />
    </div>
  );
}

function DisplayField({ value }: { value: string }) {
  return (
    <div style={{
      height: q(80), marginBottom: q(24),
      borderRadius: q(8),
      background: 'rgba(30,10,70,0.6)',
      border: '1px solid rgba(100,60,200,0.4)',
      display: 'flex', alignItems: 'center',
      paddingLeft: q(24),
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
    }}>
      <span style={{ color: 'rgba(200,180,255,0.8)', fontSize: q(28) }}>{value}</span>
    </div>
  );
}

interface InputFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
  style?: React.CSSProperties;
}

function InputField({ value, onChange, placeholder, maxLength, type = 'text', style }: InputFieldProps) {
  return (
    <div style={{
      height: q(80), marginBottom: q(24),
      borderRadius: q(8),
      background: 'rgba(20,8,55,0.7)',
      border: '1px solid rgba(100,60,200,0.5)',
      position: 'relative',
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
      transition: 'border-color 0.2s',
      ...style,
    }}>
      {/* 输入框内侧顶部高光 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(120,60,255,0.3), transparent)',
        pointerEvents: 'none',
      }} />
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          background: 'transparent',
          border: 'none', outline: 'none',
          color: '#e8d5ff',
          fontSize: q(28),
          padding: `0 ${q(24)}`,
          boxSizing: 'border-box',
          caretColor: '#a855f7',
        }}
      />
    </div>
  );
}
