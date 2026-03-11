/**
 * PlayerInfoCard — 用户信息卡公共组件（蓝湖设计稿 1:1 还原版）
 * 从首页 block_1 提取，可在在线客服、充值页、背包页等多处复用
 *
 * 设计稿尺寸（750px基准）：
 *  - 整体：663×281px，margin-left: 87px（留给左侧头像框）
 *  - 头像框：160×179px，absolute left:0 top:32px
 *  - VIP标签：196×73px，absolute left:-6 top:148
 *  - 名字行：533×46px，margin: 70px 0 0 82px
 *  - ID+金币行：557×34px，margin: 18px 0 0 82px
 */
import { LANHU, getAvatarUrl } from '@/lib/assets';
import { trpc } from '@/lib/trpc';

// px → cqw 转换（基准 750px）
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

interface PlayerInfoCardProps {
  /** 外层容器额外样式（可覆盖默认的 position:relative, width:750px, marginTop） */
  style?: React.CSSProperties;
}

export default function PlayerInfoCard({ style }: PlayerInfoCardProps) {
  const { data: player } = trpc.player.me.useQuery(undefined, { staleTime: 30_000 });

  return (
    <div
      style={{
        position: 'relative',
        width: q(750),
        ...style,
      }}
    >
      {/* block_1: 用户信息卡 663×281px, margin-left: 87px */}
      <div
        style={{
          position: 'relative',
          width: q(663),
          height: '28cqw',
          display: 'flow-root',
          marginLeft: q(87),
        }}
      >
        {/* 背景图固定尺寸，不随容器高度变化 */}
        <img
          src={LANHU.userInfoBg}
          alt=""
          style={{
            position: 'absolute',
            left: 0, top: 0,
            width: q(663), height: q(281),
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        {/* 名字行(box_1): 533×46px, 蓝湖原始 margin: 70px 0 0 82px */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: q(533),
            marginTop: q(70),
            marginLeft: q(82),
          }}
        >
          {/* 昵称 */}
          <span
            style={{
              color: 'rgba(255,255,255,1)',
              fontSize: q(28),
              fontFamily: 'Alibaba-PuHuiTi-M, sans-serif',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              lineHeight: q(40),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: q(200),
            }}
          >
            {player?.nickname || '加载中...'}
          </span>
          {/* 徽章 67×46px */}
          <img src={LANHU.badge} alt="徽章"
            style={{ width: q(67), height: q(46), marginLeft: q(12), objectFit: 'contain', flexShrink: 0 }}
          />
          {/* 加号 35×35px，推到右侧 */}
          <img src={LANHU.addFriend} alt="加好友"
            style={{ width: q(35), height: q(35), marginLeft: 'auto', objectFit: 'contain', cursor: 'pointer', flexShrink: 0 }}
          />
        </div>
        {/* ID + 金币行 557×34px, margin: 18px 0 0 82px */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: q(557),
            marginTop: q(18),
            marginLeft: q(82),
          }}
        >
          {/* ID */}
          <span
            style={{
              color: 'rgba(255,255,255,1)',
              fontSize: q(26),
              fontFamily: 'Alibaba-PuHuiTi-M, sans-serif',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              lineHeight: q(34),
              flexShrink: 0,
            }}
          >
            ID：{player?.id ?? ''}
          </span>
          {/* 金币框 170×34px */}
          <div style={{ position: 'relative', width: q(170), height: q(34), backgroundImage: `url(${LANHU.coinBg1})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', marginLeft: q(60), display: 'flex', flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ flex: 1, color: 'rgba(255,255,255,1)', fontSize: q(26), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500, whiteSpace: 'nowrap', lineHeight: q(34), textAlign: 'center', paddingLeft: q(28) }}>
              {parseFloat(player?.gold || '0').toFixed(0)}
            </span>
            <img src={LANHU.arrowIcon} alt="" style={{ width: q(10), height: q(19), marginLeft: 'auto', marginRight: q(10), objectFit: 'contain' }} />
            <img src={LANHU.coinArrow} alt="金币" style={{ position: 'absolute', left: q(-13), top: q(-4), width: q(42), height: q(42), objectFit: 'contain' }} />
          </div>
          {/* 钒石框 170×34px */}
          <div style={{ position: 'relative', width: q(170), height: q(34), backgroundImage: `url(${LANHU.coinBg2})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', marginLeft: q(50), display: 'flex', flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ flex: 1, color: 'rgba(255,255,255,1)', fontSize: q(26), fontFamily: 'Alibaba-PuHuiTi-B, sans-serif', fontWeight: 700, whiteSpace: 'nowrap', lineHeight: q(34), textAlign: 'center', paddingLeft: q(28) }}>
              {parseFloat(player?.diamond || '0').toFixed(0)}
            </span>
            <img src={LANHU.arrowIcon} alt="" style={{ width: q(10), height: q(19), marginLeft: 'auto', marginRight: q(10), objectFit: 'contain' }} />
            <img src={LANHU.diamondArrow} alt="钒石" style={{ position: 'absolute', left: q(-21), top: q(-4), width: q(42), height: q(42), objectFit: 'contain' }} />
          </div>
        </div>
      </div>
      {/* 头像框 absolute left:0 top:32px, 160×179px, z-index:1 */}
      <div
        style={{
          position: 'absolute',
          left: 0, top: q(32),
          width: q(160), height: q(179),
          backgroundImage: `url(${LANHU.avatarFrame})`,
          backgroundPosition: `${q(-11)} 0px`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${q(171)} ${q(179)}`,
          zIndex: 1,
        }}
      >
        {player && (
          <img
            src={getAvatarUrl(player.avatar)}
            alt="头像"
            style={{ width: q(108), height: q(111), marginTop: q(24), marginLeft: q(32), borderRadius: '50%', objectFit: 'cover' }}
          />
        )}
      </div>
      {/* VIP标签: 背景图196×73，实际内容区域居中 */}
      <div
        style={{
          position: 'absolute',
          left: q(-6), top: q(148),
          width: q(196), height: q(73),
          backgroundImage: `url(${LANHU.vipTagBg})`,
          backgroundPosition: 'left top',
          backgroundSize: `${q(196)} ${q(73)}`,
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            WebkitTextStroke: `2px rgba(80,30,0,0.9)`,
            paintOrder: 'stroke fill',
            color: 'rgba(255,255,255,1)',
            fontSize: q(26),
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 900,
            whiteSpace: 'nowrap',
            lineHeight: '1',
            letterSpacing: q(1),
            marginTop: q(-30),
          }}
        >
          VIP{player?.vipLevel ?? 0}
        </span>
      </div>
    </div>
  );
}
