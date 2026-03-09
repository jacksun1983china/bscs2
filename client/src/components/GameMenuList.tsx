/**
 * GameMenuList.tsx — 游戏菜单列表组件
 *
 * 这个区域是唯一可滚动的区域，以后会加载邮件列表等其他内容。
 *
 * 关键设计：
 * - 外层大框使用 border-image 九宫格拉伸（切片 70px），四角圆角不变形，中间自由拉伸
 * - 左侧头像列 + 右侧游戏卡片列
 * - 与上方元素保持 16px 间距
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

const GAMES: GameItem[] = [
  {
    id: 'arena',
    bgImage: LANHU.gameCard1Bg,
    labelImage: LANHU.arenaLabel,
    labelText: '竞技场',
    avatarImage: LANHU.gameAvatar1,
    route: undefined,
  },
  {
    id: 'wheel',
    bgImage: LANHU.gameCard2Bg,
    labelImage: LANHU.wheelLabel,
    labelText: '幸运转盘',
    avatarImage: LANHU.gameAvatar2,
    route: '/rollx',
  },
  {
    id: 'rainbow',
    bgImage: LANHU.gameCard3Bg,
    labelImage: LANHU.rainbowLabel,
    labelText: '彩虹旋风',
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
    /* 可滚动外层容器 */
    <div
      style={{
        width: '100%',
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        containerType: 'inline-size' as React.CSSProperties['containerType'],
        background: 'transparent',
      }}
    >
      {/*
        游戏菜单外框：九宫格拉伸
        图片尺寸 689×839px，圆角约 70px
        border-image-slice: 70 fill → 四角各取 70px，中间 fill 填充
        border-image-width: 对应 cqw 值（70/750*100 ≈ 9.33cqw）
      */}
      <div
        style={{
          /* 与上方元素保持合理间距，左右各留边距 */
          margin: `${q(16)} ${q(29)} ${q(16)}`,
          /* 九宫格边框图 */
          borderStyle: 'solid',
          borderImageSource: `url(${LANHU.gameMenuBg})`,
          borderImageSlice: '70 70 70 70 fill',
          borderImageWidth: `${q(70)} ${q(70)} ${q(70)} ${q(70)}`,
          borderImageRepeat: 'stretch',
          /* 内边距：内容不贴边框 */
          padding: `${q(20)} ${q(20)}`,
          /* 布局 */
          display: 'flex',
          flexDirection: 'row',
          gap: q(12),
          /* 确保内容在边框图层之上 */
          position: 'relative',
        }}
      >
        {/* 左侧头像列 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: q(12),
            flexShrink: 0,
            width: q(122),
          }}
        >
          {GAMES.map((game) => (
            <img
              key={game.id}
              src={game.avatarImage}
              alt=""
              style={{
                width: q(122),
                height: q(122),
                objectFit: 'cover',
                borderRadius: q(10),
                flexShrink: 0,
                display: 'block',
              }}
            />
          ))}
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
                /* 保持卡片比例：原始约 468×180px */
                aspectRatio: '468 / 180',
                backgroundImage: `url(${game.bgImage})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                cursor: game.route ? 'pointer' : 'default',
                borderRadius: q(10),
                overflow: 'hidden',
              }}
              onClick={() => game.route && navigate(game.route)}
            >
              {game.labelImage && (
                <img
                  src={game.labelImage}
                  alt={game.labelText}
                  style={{
                    position: 'absolute',
                    right: '8%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '55%',
                    width: 'auto',
                    objectFit: 'contain',
                    maxWidth: '60%',
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
