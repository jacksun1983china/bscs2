/**
 * SteamSettings.tsx — STEAM 设置弹窗组件
 * 纯 CSS 赛博朋克风格，无 PNG 依赖
 */
import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

interface SteamSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SteamSettingsModal({ visible, onClose }: SteamSettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [mainUrl, setMainUrl] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [bindingCode, setBindingCode] = useState('');
  const utils = trpc.useUtils();

  const { data: steamData } = trpc.player.getSteam.useQuery(undefined, { enabled: visible });

  useEffect(() => {
    if (steamData) {
      setMainUrl(steamData.mainUrl || '');
      setSubUrl(steamData.subUrl || '');
      setBindingCode(steamData.bindingCode || '');
    }
  }, [steamData]);

  const updateSteam = trpc.player.updateSteam.useMutation({
    onSuccess: () => { toast.success('Steam设置已保存'); utils.player.getSteam.invalidate(); },
    onError: (err) => toast.error(err.message || '保存失败'),
  });

  const generateCode = trpc.player.generateBindingCode.useMutation({
    onSuccess: (data) => { setBindingCode(data.code); toast.success('绑定码已生成'); utils.player.getSteam.invalidate(); },
    onError: (err) => toast.error(err.message || '生成失败'),
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

  if (!mounted) return null;

  const handleGenerate = () => generateCode.mutate();
  const handleSave = () => updateSteam.mutate({ mainUrl, subUrl });
  const handleClose = () => { setAnimating(false); setTimeout(onClose, 300); };

  const handleCopyCode = () => {
    if (!bindingCode) return;
    navigator.clipboard.writeText(bindingCode)
      .then(() => toast.success('绑定码已复制到剪贴板'))
      .catch(() => {
        const el = document.createElement('textarea');
        el.value = bindingCode;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        toast.success('绑定码已复制');
      });
  };

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
          background: 'linear-gradient(180deg, #1a0b4b 0%, #0f0630 60%, #0a0420 100%)',
          borderTop: '2px solid rgba(120,60,255,0.7)',
          borderLeft: '1px solid rgba(80,40,200,0.4)',
          borderRight: '1px solid rgba(80,40,200,0.4)',
          boxShadow: '0 -8px 40px rgba(100,40,255,0.35), inset 0 1px 0 rgba(180,100,255,0.2)',
          maxHeight: '92%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 扫描线纹理 */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(120,60,255,0.03) 3px, rgba(120,60,255,0.03) 4px)',
          pointerEvents: 'none', zIndex: 0,
        }} />
        {/* 顶部光晕条 */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '80%', height: q(4),
          background: 'linear-gradient(90deg, transparent, rgba(160,80,255,0.8), rgba(80,200,255,0.8), transparent)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* ── 标题栏 ── */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `${q(36)} ${q(32)} ${q(24)}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: q(12) }}>
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
            }}>STEAM设置</span>
          </div>
          <CloseButton onClick={handleClose} />
        </div>

        {/* ── 可滚动内容区 ── */}
        <div style={{
          position: 'relative', zIndex: 2,
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: `0 ${q(28)} ${q(50)}`,
        }}>

          {/* ══ 主号设置区块 ══ */}
          <SectionCard title="主号设置">
            {/* 主号输入框 + 删除按钮 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: q(10), marginBottom: q(16) }}>
              <SteamInput
                value={mainUrl}
                onChange={setMainUrl}
                placeholder="请输入您的Steam交易链接"
                style={{ flex: 1 }}
              />
              <CyberButton
                onClick={() => setMainUrl('')}
                variant="danger"
                style={{ width: q(110), height: q(72), flexShrink: 0 }}
              >
                删除
              </CyberButton>
            </div>

            {/* 两个功能按钮 */}
            <div style={{ display: 'flex', gap: q(10) }}>
              <CyberButton
                onClick={() => window.open('https://steamcommunity.com/id/me/tradeoffers/privacy', '_blank')}
                variant="secondary"
                style={{ flex: 1, height: q(76) }}
              >
                点击获取STEAM链接
              </CyberButton>
              <CyberButton
                onClick={() => window.open('https://steamcommunity.com/my/edit/settings', '_blank')}
                variant="secondary"
                style={{ flex: 1.5, height: q(76) }}
              >
                点击将STEAM库存设置为公开
              </CyberButton>
            </div>
          </SectionCard>

          {/* ══ 添加副号 ══ */}
          <SectionTitle title="添加副号" />
          <p style={{
            color: 'rgba(200,180,255,0.7)', fontSize: q(26),
            margin: `${q(-4)} 0 ${q(16)} 0`, textAlign: 'center',
          }}>
            点击新增您的副号
          </p>
          <SteamInput
            value={subUrl}
            onChange={setSubUrl}
            placeholder="请输入副号Steam交易链接"
            style={{ marginBottom: q(16) }}
          />

          {/* 保存按钮 */}
          <CyberButton
            onClick={handleSave}
            variant="primary"
            disabled={updateSteam.isPending}
            style={{ width: '100%', height: q(80), marginBottom: q(24) }}
          >
            {updateSteam.isPending ? '保存中...' : '保存设置'}
          </CyberButton>

          {/* ══ 绑定我为副号区块 ══ */}
          <SectionCard title="绑定我为副号">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: q(26), fontWeight: 600, marginBottom: q(6) }}>
                  提货绑定码
                </div>
                <div style={{ color: 'rgba(200,180,255,0.6)', fontSize: q(22) }}>
                  新增提取饰品的副号时使用
                </div>
                {bindingCode && (
                  <div style={{ marginTop: q(12), display: 'flex', alignItems: 'center', gap: q(12), flexWrap: 'wrap' }}>
                    <span style={{
                      color: '#38bdf8', fontSize: q(30), fontWeight: 700,
                      letterSpacing: 3, textShadow: '0 0 8px rgba(56,189,248,0.6)',
                    }}>
                      {bindingCode}
                    </span>
                    <span
                      onClick={handleCopyCode}
                      style={{
                        color: '#38bdf8', fontSize: q(22),
                        background: 'rgba(56,189,248,0.15)',
                        border: '1px solid rgba(56,189,248,0.4)',
                        borderRadius: q(6),
                        padding: `${q(4)} ${q(14)}`,
                        cursor: 'pointer', flexShrink: 0, userSelect: 'none',
                      }}
                    >
                      复制
                    </span>
                  </div>
                )}
              </div>
              <CyberButton
                onClick={handleGenerate}
                variant="accent"
                disabled={generateCode.isPending}
                style={{ width: q(130), height: q(62), flexShrink: 0, marginLeft: q(16) }}
              >
                {generateCode.isPending ? '生成中...' : '生成'}
              </CyberButton>
            </div>
          </SectionCard>

          {/* 帮助链接 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: `${q(8)} ${q(4)}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: q(10) }}>
              {/* 警告图标 */}
              <div style={{
                width: q(32), height: q(32), borderRadius: '50%',
                background: 'rgba(239,68,68,0.2)',
                border: '1.5px solid rgba(239,68,68,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ color: '#ef4444', fontSize: q(20), fontWeight: 700, lineHeight: 1 }}>!</span>
              </div>
              <span style={{ color: 'rgba(200,180,255,0.8)', fontSize: q(22) }}>打不开Steam怎么办</span>
            </div>
            <span
              style={{ color: '#38bdf8', fontSize: q(22), cursor: 'pointer' }}
              onClick={() => window.open('https://store.steampowered.com/about/', '_blank')}
            >
              查看教程 »
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── 子组件 ── */

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: q(52), height: q(52), borderRadius: '50%',
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
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      marginBottom: q(16),
      position: 'relative',
    }}>
      {/* 左右延伸线 */}
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(120,60,255,0.5))' }} />
      <div style={{
        padding: `${q(8)} ${q(24)}`,
        background: 'linear-gradient(135deg, rgba(80,20,180,0.6), rgba(40,10,100,0.8))',
        border: '1px solid rgba(120,60,255,0.5)',
        borderRadius: q(6),
        margin: `0 ${q(12)}`,
        boxShadow: '0 0 12px rgba(100,40,200,0.3)',
      }}>
        <span style={{
          color: '#fff', fontSize: q(26), fontWeight: 700,
          textShadow: '0 0 8px rgba(168,85,247,0.6)',
          letterSpacing: '0.05em',
        }}>{title}</span>
      </div>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(120,60,255,0.5), transparent)' }} />
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      marginBottom: q(24),
      borderRadius: q(16),
      background: 'rgba(30,10,70,0.5)',
      border: '1px solid rgba(100,50,200,0.4)',
      boxShadow: 'inset 0 1px 0 rgba(180,100,255,0.1), 0 4px 20px rgba(0,0,0,0.3)',
      overflow: 'hidden',
    }}>
      {/* 区块标题 */}
      <SectionTitle title={title} />
      <div style={{ padding: `0 ${q(16)} ${q(20)}` }}>
        {children}
      </div>
    </div>
  );
}

function SteamInput({
  value, onChange, placeholder, style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      height: q(80),
      borderRadius: q(8),
      background: 'rgba(20,8,55,0.7)',
      border: '1px solid rgba(100,60,200,0.5)',
      position: 'relative',
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
      ...style,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(120,60,255,0.3), transparent)',
        pointerEvents: 'none',
      }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          background: 'transparent', border: 'none', outline: 'none',
          color: '#e8d5ff', fontSize: q(24),
          padding: `0 ${q(20)}`,
          boxSizing: 'border-box',
          caretColor: '#a855f7',
        }}
      />
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'accent';

function CyberButton({
  onClick, variant = 'primary', disabled, children, style,
}: {
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const configs: Record<ButtonVariant, { bg: string; border: string; shadow: string; color: string }> = {
    primary: {
      bg: disabled ? 'rgba(60,20,120,0.4)' : 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
      border: disabled ? 'rgba(80,40,160,0.3)' : 'rgba(168,85,247,0.6)',
      shadow: disabled ? 'none' : '0 0 16px rgba(120,60,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      color: disabled ? 'rgba(200,180,255,0.4)' : '#fff',
    },
    secondary: {
      bg: 'rgba(40,15,100,0.6)',
      border: 'rgba(100,60,200,0.5)',
      shadow: '0 0 8px rgba(80,40,160,0.3)',
      color: 'rgba(220,200,255,0.9)',
    },
    danger: {
      bg: 'rgba(120,20,40,0.5)',
      border: 'rgba(200,60,80,0.5)',
      shadow: '0 0 8px rgba(200,40,60,0.3)',
      color: 'rgba(255,150,160,0.95)',
    },
    accent: {
      bg: disabled ? 'rgba(40,20,80,0.4)' : 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
      border: disabled ? 'rgba(60,40,120,0.3)' : 'rgba(56,189,248,0.6)',
      shadow: disabled ? 'none' : '0 0 12px rgba(56,189,248,0.4)',
      color: disabled ? 'rgba(150,200,255,0.4)' : '#fff',
    },
  };

  const cfg = configs[variant];

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        borderRadius: q(8),
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        boxShadow: cfg.shadow,
        transition: 'all 0.2s',
        position: 'relative', overflow: 'hidden',
        ...style,
      }}
    >
      {/* 高光 */}
      {!disabled && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
      )}
      <span style={{
        color: cfg.color,
        fontSize: q(24), fontWeight: 700,
        textAlign: 'center', lineHeight: 1.3,
        position: 'relative', zIndex: 1,
        padding: `0 ${q(8)}`,
      }}>
        {children}
      </span>
    </div>
  );
}
