/**
 * GameMenuList.tsx — 游戏菜单列表组件（含炫酷特效）
 *
 * 特效：
 * - 卡片入场：页面加载时从下方依次滑入（stagger）
 * - 卡片漂浮：每张卡片轻微上下漂浮（不同相位）
 * - 卡片悬停：霓虹光晕 + 上浮 + 扫光
 */
import React from 'react';
import { useLocation } from 'wouter';
import { LANHU } from '@/lib/assets';
import { trpc } from '@/lib/trpc';

// px → cqw 转换（基准 750px）
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

interface LeftMenuItem {
  id: string;
  label: string;
  avatarImage: string;
  route?: string;
}

interface GameItem {
  id: string;
  bgImage: string;
  labelImage: string | null;
  labelText: string;
  route?: string;
}

const LEFT_MENU_ITEMS: LeftMenuItem[] = [
  { id: 'welfare', label: '福利', avatarImage: LANHU.gameAvatar2, route: '/welfare' },
  { id: 'roll', label: 'ROLL', avatarImage: LANHU.gameAvatar3, route: '/roll' },
  { id: 'shop', label: '商城', avatarImage: LANHU.gameAvatar1, route: '/shop' },
  { id: 'mail', label: '邮件', avatarImage: LANHU.gameAvatar4, route: '/mailbox' },
  { id: 'records', label: '记录', avatarImage: LANHU.gameAvatar5, route: '/my-records' },
];

const RIGHT_GAME_ITEMS: GameItem[] = [
  {
    id: 'arena',
    bgImage: LANHU.gameCard1Bg,
    labelImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/jingjichang_3e232529.png',
    labelText: '竞技场',
    route: '/arena',
  },
  {
    id: 'wheel',
    bgImage: LANHU.gameCard2Bg,
    labelImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/rollx_929893a6.png',
    labelText: 'ROLL-X',
    route: '/rollx',
  },
  {
    id: 'dingdong',
    bgImage: LANHU.gameCard3Bg,
    labelImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/caihongzhuanpan_197b930b.png',
    labelText: '彩虹转盘',
    route: '/dingdong',
  },
];

export default function GameMenuList() {
  const [, navigate] = useLocation();
  const { data: unreadMailData } = trpc.player.unreadMessageCount.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    staleTime: 0,
    retry: 1,
  });
  const unreadMailCount = unreadMailData?.unreadCount ?? 0;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        containerType: 'inline-size' as React.CSSProperties['containerType'],
        background: 'transparent',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
      }}
      className="hide-scrollbar"
    >
      <style>{`
        @keyframes mailUnreadPulse {
          0%, 100% { transform: scale(1); opacity: 0.92; }
          50% { transform: scale(1.18); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          margin: `0 ${q(29)} 0 ${q(29)}`,
          minHeight: '100%',
          boxSizing: 'border-box',
          borderStyle: 'solid',
          borderImageSource: `url(${LANHU.gameMenuBg})`,
          borderImageSlice: '70 70 70 70 fill',
          borderImageWidth: `${q(70)} ${q(70)} ${q(70)} ${q(70)}`,
          borderImageRepeat: 'stretch',
          padding: `${q(20)} ${q(20)} ${q(118)}`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: q(12),
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: q(140),
            right: q(24),
            bottom: q(18),
            height: q(116),
            borderRadius: q(24),
            background: 'linear-gradient(180deg, rgba(255,120,255,0.02) 0%, rgba(255,120,255,0.18) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 0 24px rgba(220,110,255,0.14)',
            pointerEvents: 'none',
          }}
        />

        {/* 左侧功能按钮列 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: q(12),
            flexShrink: 0,
            width: q(122),
          }}
        >
          {LEFT_MENU_ITEMS.map((item, idx) => {
            return (
              <div
                key={item.id}
                className={`fx-slide-in-${idx} fx-float-${idx} fx-card-hover`}
                style={{
                  position: 'relative',
                  width: q(122),
                  height: q(122),
                  borderRadius: q(10),
                  overflow: 'hidden',
                  flexShrink: 0,
                  cursor: item.route ? 'pointer' : 'default',
                }}
                onClick={() => item.route && navigate(item.route)}
              >
                <img
                  src={item.avatarImage}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {item.id === 'mail' && unreadMailCount > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: q(10),
                      right: q(10),
                      width: q(22),
                      height: q(22),
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 30% 30%, #ff9aa8 0%, #ff2d55 45%, #d70022 100%)',
                      boxShadow: '0 0 10px rgba(255, 59, 92, 0.85)',
                      border: `${q(2)} solid rgba(255,255,255,0.92)`,
                      zIndex: 3,
                      animation: 'mailUnreadPulse 1.4s ease-in-out infinite',
                    }}
                  />
                )}
                {item && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.0) 100%)',
                      padding: `${q(6)} 0 ${q(8)} 0`,
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        color: '#ffffff',
                        fontSize: q(24),
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                        lineHeight: 1,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 右侧游戏卡片列 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: q(12),
            flex: 1,
            minWidth: 0,
          }}
        >
          {RIGHT_GAME_ITEMS.map((game, idx) => (
            <div
              key={game.id}
              className={`fx-slide-in-${idx} fx-float-${idx} fx-card-hover`}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '468 / 180',
                backgroundImage: `url(${game.bgImage})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                cursor: game.route ? 'pointer' : 'default',
                borderRadius: q(10),
                overflow: 'hidden',
                flexShrink: 0,
              }}
              onClick={() => game.route && navigate(game.route)}
            >
              {game.labelImage ? (
                <img
                  src={game.labelImage}
                  alt={game.labelText}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    height: '42%',
                    width: 'auto',
                    objectFit: 'contain',
                    maxWidth: '55%',
                    filter: 'drop-shadow(0 0 8px rgba(192,132,252,0.6))',
                  }}
                />
              ) : (
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#fff',
                  fontSize: q(40),
                  fontWeight: 900,
                  letterSpacing: 2,
                  textShadow: '0 0 12px rgba(192,132,252,0.9), 0 2px 4px rgba(0,0,0,0.8)',
                  whiteSpace: 'nowrap',
                }}>
                  {game.labelText}
                </div>
              )}
              {/* 卡片底部渐变遮罩增强 */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '40%',
                  background: 'linear-gradient(to top, rgba(20,5,50,0.5) 0%, transparent 100%)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
