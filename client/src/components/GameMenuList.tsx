/**
 * GameMenuList.tsx — 游戏菜单列表组件
 *
 * 布局要求：
 * - 外层容器占满父级 flex:1 的空间，支持上下滚动
 * - 支持任意数量游戏卡片（4个、7个、8个均可）
 * - 左侧功能按钮列（头像+文字标签）+ 右侧游戏卡片列，顶部对齐
 * - 隐藏滚动条但保留滚动功能
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
    id: 'rainbow',
    bgImage: LANHU.gameCard3Bg,
    labelImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/caihongzhuanpan_197b930b.png',
    labelText: '彩虹转盘',
    avatarImage: LANHU.gameAvatar3,
    route: undefined,
  },
  {
    id: 'roll',
    bgImage: LANHU.gameCard4Bg,
    labelImage: LANHU.rollLabel,
    labelText: 'ROLL房',
    avatarImage: LANHU.gameAvatar4,
    route: '/roll',
  },
];

export default function GameMenuList() {
  const [, navigate] = useLocation();

  return (
    /*
      外层：撑满父级空间，containerType 让 cqw 基于自身宽度计算
      overflowY: auto 允许上下滚动，隐藏滚动条保持视觉干净
    */
    <div
      style={{
        width: '100%',
        height: '100%',
        containerType: 'inline-size' as React.CSSProperties['containerType'],
        background: 'transparent',
        overflowY: 'auto',
        overflowX: 'hidden',
        /* 隐藏滚动条（Firefox） */
        scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
      }}
      /* 隐藏滚动条（WebKit/Chrome） */
      className="hide-scrollbar"
    >
      {/*
        游戏菜单外框：九宫格拉伸
        - 左右留 29px 边距
        - 高度自适应内容（不设固定高度），内容多时自然撑开
        - 底部留 8px 间距，避免最后一张卡片贴边
      */}
      <div
        style={{
          margin: `0 ${q(29)} ${q(8)} ${q(29)}`,
          /* 九宫格边框图 */
          borderStyle: 'solid',
          borderImageSource: `url(${LANHU.gameMenuBg})`,
          borderImageSlice: '70 70 70 70 fill',
          borderImageWidth: `${q(70)} ${q(70)} ${q(70)} ${q(70)}`,
          borderImageRepeat: 'stretch',
          /* 内边距 */
          padding: `${q(20)} ${q(20)}`,
          /* 布局：横排，内容顶部对齐 */
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: q(12),
          position: 'relative',
        }}
      >
        {/* 左侧功能按钮列（头像图标 + 文字标签叠加） */}
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
                {/* 头像背景图 */}
                <img
                  src={game.avatarImage}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                {/* 底部渐变遮罩 + 功能文字标签 */}
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
          {GAMES.map((game) => (
            <div
              key={game.id}
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
              {game.labelImage && (
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
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
