/**
 * SettingsModal.tsx — 设置弹窗
 * 由 TopNav 右上角「全部」按钮触发
 * 功能：关闭/开启音乐、关闭/开启音效、客服、关于我们、退出游戏（退出登录）
 * 风格：赛博朋克深紫蓝霓虹，与整体 UI 一致
 */
import { useState } from 'react';

import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useSound } from '@/hooks/useSound';

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const [, navigate] = useLocation();
  const [closing, setClosing] = useState(false);
  const { isMusicOn, isSfxOn, toggleMusic, toggleSfx } = useSound();

  const logoutMutation = trpc.player.logout.useMutation();

  const handleLogout = () => {
    // 立即关闭弹窗并强制跳转，不等待后端响应
    onClose();
    // 异步调后端清cookie，不阻塞
    logoutMutation.mutate();
    // 清除玩家相关的 localStorage 数据
    try {
      localStorage.removeItem('music_muted');
      localStorage.removeItem('sfx_muted');
      localStorage.removeItem('sound_muted');
      // 保留 theme 偏好（设备级别设置，非玩家数据）
      // 保留 sidebar_width（UI偏好，非玩家数据）
    } catch { /* 忽略 */ }
    // 使用 window.location.href 强制整页刷新跳转，避免 SPA 路由延迟
    window.location.href = '/login';
  };

  // 动画关闭
  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 250);
  };

  if (!visible && !closing) return null;

  const content = (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        containerType: 'inline-size',
      }}
      onClick={handleClose}
    >
      {/* 半透明遮罩 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          animation: closing ? 'fadeOut 0.25s ease forwards' : 'fadeIn 0.2s ease forwards',
        }}
      />

      {/* 弹窗主体：右上角弹出 */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1,
          marginTop: q(140),
          marginRight: q(24),
          width: q(320),
          background: 'linear-gradient(160deg, rgba(18,8,50,0.98) 0%, rgba(8,4,28,0.99) 100%)',
          border: '1.5px solid rgba(120,60,220,0.6)',
          borderRadius: q(24),
          boxShadow: '0 0 40px rgba(100,40,200,0.5), 0 8px 32px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          animation: closing ? 'slideOutRight 0.25s ease forwards' : 'slideInRight 0.2s ease forwards',
        }}
      >
        {/* 顶部发光条 */}
        <div
          style={{
            height: q(3),
            background: 'linear-gradient(90deg, transparent, rgba(180,80,255,0.8), rgba(0,200,255,0.8), transparent)',
          }}
        />

        {/* 标题 */}
        <div
          style={{
            padding: `${q(24)} ${q(28)} ${q(16)}`,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: q(28),
              fontWeight: 700,
              letterSpacing: 1,
              textShadow: '0 0 12px rgba(180,80,255,0.6)',
            }}
          >
            ⚙ 设置
          </span>
          {/* 关闭按钮 */}
          <div
            onClick={handleClose}
            style={{
              width: q(40),
              height: q(40),
              borderRadius: '50%',
              background: 'rgba(120,60,220,0.3)',
              border: '1px solid rgba(120,60,220,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <span style={{ color: '#fff', fontSize: q(22), lineHeight: 1 }}>✕</span>
          </div>
        </div>

        {/* 分隔线 */}
        <div style={{ height: 1, background: 'rgba(120,60,220,0.3)', margin: `0 ${q(20)}` }} />

        {/* 设置项列表 */}
        <div style={{ padding: `${q(12)} 0 ${q(20)}` }}>

          {/* 音乐开关 */}
          <SettingRow
            icon="🎵"
            label="背景音乐"
            right={
              <Toggle value={isMusicOn} onChange={toggleMusic} />
            }
          />

          {/* 音效开关 */}
          <SettingRow
            icon="🔊"
            label="游戏音效"
            right={
              <Toggle value={isSfxOn} onChange={toggleSfx} />
            }
          />

          {/* 分隔线 */}
          <div style={{ height: 1, background: 'rgba(120,60,220,0.2)', margin: `${q(8)} ${q(20)}` }} />

          {/* 客服 */}
          <SettingRow
            icon="💬"
            label="联系客服"
            right={<ArrowIcon />}
            onClick={() => { navigate('/kefu'); handleClose(); }}
          />

          {/* 关于我们 */}
          <SettingRow
            icon="ℹ️"
            label="关于我们"
            right={<ArrowIcon />}
            onClick={() => { alert('YouMe Game v1.0.0'); }}
          />

          {/* 分隔线 */}
          <div style={{ height: 1, background: 'rgba(120,60,220,0.2)', margin: `${q(8)} ${q(20)}` }} />

          {/* 退出游戏（退出登录） */}
          <div
            onClick={handleLogout}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: `${q(18)} ${q(28)}`,
              cursor: 'pointer',
              gap: q(16),
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,40,80,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: q(32), lineHeight: 1 }}>🚪</span>
            <span
              style={{
                flex: 1,
                color: 'rgba(255,80,100,1)',
                fontSize: q(26),
                fontWeight: 600,
              }}
            >
              退出游戏
            </span>
            <ArrowIcon color="rgba(255,80,100,0.7)" />
          </div>
        </div>

        {/* 底部版本号 */}
        <div
          style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.25)',
            fontSize: q(18),
            paddingBottom: q(16),
          }}
        >
          YouMe Game v1.0.0
        </div>
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes slideOutRight {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(20px) scale(0.95); }
        }
      `}</style>
    </div>
  );

  return content;
}

// 通用设置行
function SettingRow({
  icon,
  label,
  right,
  onClick,
}: {
  icon: string;
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: `${q(18)} ${q(28)}`,
        cursor: onClick ? 'pointer' : 'default',
        gap: q(16),
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = 'rgba(120,60,220,0.12)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontSize: q(32), lineHeight: 1 }}>{icon}</span>
      <span style={{ flex: 1, color: '#fff', fontSize: q(26), fontWeight: 500 }}>{label}</span>
      {right}
    </div>
  );
}

// 开关组件
function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;
  return (
    <div
      onClick={e => { e.stopPropagation(); onChange(); }}
      style={{
        width: q(80),
        height: q(40),
        borderRadius: q(20),
        background: value
          ? 'linear-gradient(90deg, rgba(120,40,200,0.9), rgba(0,180,255,0.9))'
          : 'rgba(60,60,80,0.7)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.3s',
        flexShrink: 0,
        border: value ? '1px solid rgba(180,80,255,0.5)' : '1px solid rgba(80,80,100,0.4)',
        boxShadow: value ? '0 0 8px rgba(120,40,200,0.4)' : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: q(4),
          left: value ? q(44) : q(4),
          width: q(30),
          height: q(30),
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.3s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
}

// 箭头图标
function ArrowIcon({ color = 'rgba(255,255,255,0.4)' }: { color?: string }) {
  const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;
  return (
    <svg width={q(16)} height={q(28)} viewBox="0 0 16 28" fill="none">
      <path d="M4 4L12 14L4 24" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
