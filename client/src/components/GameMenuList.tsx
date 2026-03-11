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

// px → cqw 转换（基准 750px）
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

interface GameItem {
  id: string;
  bgImage: string;
  labelImage: string | null;
  labelText: string;
  avatarImage: string;
  route?: string;
}

// 左侧功能按钮标签（叠加在头像图标上）
const FUNC_LABELS = [
  { id: 'shop',    label: '商城', route: '/shop'   },
  { id: 'welfare', label: '福利', route: undefined },
  { id: 'event',   label: '活动', route: undefined },
  { id: 'mail',    label: '邮件', route: undefined },
  { id: 'records', label: '记录', route: '/my-records' },
  { id: 'vortex',  label: 'Vortex', route: '/vortex' },
];

const GAMES: GameItem[] = [
  {
    id: 'arena',
    bgImage: LANHU.gameCard1Bg,
    labelImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/jingjichang_3e232529.png',
    labelText: '竞技场',
    avatarImage: LANHU.gameAvatar1,
    route: '/arena',
  },
  {
    id: 'wheel',
    bgImage: LANHU.gameCard2Bg,
    labelImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/rollx_929893a6.png',
    labelText: 'ROLL-X',
    avatarImage: LANHU.gameAvatar2,
    route: '/rollx',
  },
  {
    id: 'dingdong',
    bgImage: LANHU.gameCard3Bg,
    labelImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/caihongzhuanpan_197b930b.png',
    labelText: '丁咚',
    avatarImage: LANHU.gameAvatar3,
    route: '/dingdong',
  },
  {
    id: 'roll',
    bgImage: LANHU.gameCard4Bg,
    labelImage: LANHU.rollLabel,
    labelText: 'ROLL房',
    avatarImage: LANHU.gameAvatar4,
    route: '/roll',
  },
  {
    id: 'rush',
    bgImage: LANHU.gameCard1Bg,
    labelImage: null,
    labelText: '过马路',
    avatarImage: LANHU.gameAvatar5,
    route: '/rush',
  },
  {
    id: 'vortex',
    bgImage: LANHU.gameCard2Bg,
    labelImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/logo_540c18cd.png',
    labelText: 'VORTEX',
    avatarImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/element-water_7f78c667.png',
    route: '/vortex',
  },
];

export default function GameMenuList() {
  const [, navigate] = useLocation();

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
      <div
        style={{
          margin: `0 ${q(29)} ${q(8)} ${q(29)}`,
          borderStyle: 'solid',
          borderImageSource: `url(${LANHU.gameMenuBg})`,
          borderImageSlice: '70 70 70 70 fill',
          borderImageWidth: `${q(70)} ${q(70)} ${q(70)} ${q(70)}`,
          borderImageRepeat: 'stretch',
          padding: `${q(20)} ${q(20)}`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: q(12),
          position: 'relative',
        }}
      >
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
          {GAMES.map((game, idx) => {
            const funcLabel = FUNC_LABELS[idx];
            return (
              <div
                key={game.id}
                className={`fx-slide-in-${idx} fx-float-${idx} fx-card-hover`}
                style={{
                  position: 'relative',
                  width: q(122),
                  height: q(122),
                  borderRadius: q(10),
                  overflow: 'hidden',
                  flexShrink: 0,
                  cursor: funcLabel?.route ? 'pointer' : 'default',
                }}
                onClick={() => funcLabel?.route && navigate(funcLabel.route)}
              >
                <img
                  src={game.avatarImage}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {funcLabel && (
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
                      {funcLabel.label}
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
          {GAMES.map((game, idx) => (
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
