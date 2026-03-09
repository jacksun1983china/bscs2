/**
 * Home.tsx — bdcs2 游戏平台首页
 * 设计风格：赛博朋克深紫蓝霓虹，严格还原设计稿切图
 * 布局：顶部导航 → Banner → 广播 → 用户信息 → 游戏菜单 → 底部导航
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ASSETS } from '@/lib/assets';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// ──────────────────────────────────────────────
// 广播消息数据
// ──────────────────────────────────────────────
const BROADCASTS = [
  '2494271 赢得竞技场五连胜，获得极品枪',
  '8831024 在幸运转盘获得稀有道具 ×3',
  '5567890 彩虹旋风连续中奖，获得金币 ×500',
  '3312456 ROLL房获得限定皮肤，价值 ¥888',
  '7723190 竞技场排名第一，获得传说装备',
];

// ──────────────────────────────────────────────
// 游戏菜单数据
// ──────────────────────────────────────────────
const GAMES = [
  {
    id: 'arena',
    bg: ASSETS.jingjichangk,
    label: ASSETS.jingjichang,
    labelText: '竞技场',
    avatar: ASSETS.touxiang1,
  },
  {
    id: 'wheel',
    bg: ASSETS.xingyunzhuanpank,
    label: ASSETS.xingyunzhuanpan,
    labelText: '幸运转盘',
    avatar: ASSETS.touxiang2,
  },
  {
    id: 'rainbow',
    bg: ASSETS.caihongxuanfengk,
    label: null,
    labelText: '彩虹旋风',
    avatar: ASSETS.touxiang3,
  },
  {
    id: 'roll',
    bg: ASSETS.rollk,
    label: ASSETS.roll,
    labelText: 'ROLL房',
    avatar: ASSETS.touxiang4,
  },
];

// ──────────────────────────────────────────────
// 顶部导航
// ──────────────────────────────────────────────
function TopNav() {
  return (
    <div
      style={{
        position: 'relative',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        zIndex: 10,
      }}
    >
      {/* LOGO — 纯 CSS 霍光文字效果 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 3,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #e879f9 0%, #a855f7 35%, #3b82f6 65%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.8)) drop-shadow(0 0 16px rgba(59,130,246,0.5))',
            fontFamily: "'Noto Sans SC', sans-serif",
            textTransform: 'uppercase',
          }}
        >
          BDCS2
        </div>
        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: 'rgba(168,85,247,0.6)',
            fontWeight: 500,
            marginTop: 1,
            textTransform: 'uppercase',
          }}
        >
          BATTLE·CYBER
        </div>
      </div>

      {/* 右侧图标组 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <img src={ASSETS.kefu} alt="客服" style={{ width: 40, height: 40, objectFit: 'contain', cursor: 'pointer' }} onClick={() => toast.info('客服功能即将上线')} />
        <img src={ASSETS.vip} alt="VIP" style={{ width: 40, height: 40, objectFit: 'contain', cursor: 'pointer' }} onClick={() => toast.info('VIP功能即将上线')} />
        <img src={ASSETS.quanbu} alt="全部" style={{ width: 40, height: 40, objectFit: 'contain', cursor: 'pointer' }} onClick={() => toast.info('全部游戏即将上线')} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Banner 区域
// ──────────────────────────────────────────────
function BannerSection() {
  return (
    <div style={{ padding: '0 10px', marginTop: 4 }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1.5px solid rgba(120,60,220,0.6)',
          boxShadow: '0 0 20px rgba(100,40,200,0.4), inset 0 0 30px rgba(0,0,0,0.3)',
        }}
      >
        <img
          src={ASSETS.bannerk}
          alt="banner"
          style={{ width: '100%', display: 'block', borderRadius: 10 }}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 广播滚动条
// ──────────────────────────────────────────────
function BroadcastBar() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % BROADCASTS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        margin: '8px 10px',
        background: 'rgba(20,8,50,0.85)',
        border: '1px solid rgba(100,50,200,0.4)',
        borderRadius: 8,
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflow: 'hidden',
      }}
    >
      <img src={ASSETS.guangbo} alt="广播" style={{ width: 22, height: 22, flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          key={msgIndex}
          style={{
            color: '#e0d0ff',
            fontSize: 12,
            whiteSpace: 'nowrap',
            animation: 'slideInBroadcast 0.4s ease',
          }}
        >
          {BROADCASTS[msgIndex]}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 用户信息区（接入真实数据）
// ──────────────────────────────────────────────
function UserInfoSection({ player }: { player: any }) {
  const [, navigate] = useLocation();
  const logoutMutation = trpc.player.logout.useMutation({
    onSuccess: () => { navigate('/login'); },
  });

  if (!player) {
    return (
      <div
        style={{
          margin: '6px 10px',
          background: 'linear-gradient(135deg, rgba(30,10,65,0.95) 0%, rgba(15,5,40,0.98) 100%)',
          border: '1px solid rgba(120,60,220,0.35)',
          borderRadius: 12,
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/login')}
      >
        <span style={{ color: '#a78bfa', fontSize: 14, fontWeight: 600 }}>点击登录 / 注册</span>
      </div>
    );
  }

  const vipColors: Record<number, string> = {
    0: '#888', 1: '#f5a623', 2: '#e8750a', 3: '#ff6b6b',
    4: '#c084fc', 5: '#7c3aed', 6: '#06b6d4', 7: '#ffd700',
  };

  return (
    <div
      style={{
        margin: '6px 10px',
        background: 'linear-gradient(135deg, rgba(30,10,65,0.95) 0%, rgba(15,5,40,0.98) 100%)',
        border: '1px solid rgba(120,60,220,0.35)',
        borderRadius: 12,
        padding: '10px 12px',
        boxShadow: '0 4px 20px rgba(80,20,160,0.25)',
      }}
    >
      {/* 上行：头像 + 名字 + 徽章 + 退出 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* 头像框 */}
        <div style={{ position: 'relative', width: 56, height: 58, flexShrink: 0 }}>
          <img
            src={ASSETS.touxiangk}
            alt="头像框"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }}
          />
          <img
            src={player.avatar || ASSETS.touxiang5}
            alt="头像"
            style={{
              position: 'absolute',
              top: '8%', left: '8%',
              width: '84%', height: '84%',
              objectFit: 'cover',
              borderRadius: '50%',
              zIndex: 1,
            }}
          />
        </div>

        {/* 名字 + ID */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{player.nickname}</span>
            <img src={ASSETS.huizhang} alt="徽章" style={{ height: 18, objectFit: 'contain' }} />
          </div>
          <div style={{ color: '#9980cc', fontSize: 12, marginTop: 2 }}>ID：{player.id}</div>
          {/* VIP 标签 */}
          <div
            style={{
              display: 'inline-block',
              background: `linear-gradient(135deg, ${vipColors[player.vipLevel] || '#888'} 0%, rgba(0,0,0,0.3) 100%)`,
              borderRadius: 4,
              padding: '1px 7px',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              marginTop: 4,
              letterSpacing: 0.5,
            }}
          >
            VIP{player.vipLevel}
          </div>
        </div>

        {/* 退出按钮 */}
        <div
          onClick={() => logoutMutation.mutate()}
          style={{
            width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, border: '1px solid rgba(120,60,220,0.4)',
            color: 'rgba(180,150,255,0.7)', fontSize: 10,
          }}
        >
          退出
        </div>
      </div>

      {/* 下行：金币 + 钻石 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid rgba(120,60,220,0.2)',
        }}
      >
        {/* 金币 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <img src={ASSETS.jinbi1} alt="金币" style={{ width: 22, height: 22 }} />
          <span style={{ color: '#ffd700', fontSize: 14, fontWeight: 600 }}>{parseFloat(player.gold || '0').toFixed(0)}</span>
        </div>
        <img src={ASSETS.gengduo} alt=">" style={{ width: 8, opacity: 0.6 }} />
        {/* 钻石 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <img src={ASSETS.jinbi2} alt="钻石" style={{ width: 22, height: 22 }} />
          <span style={{ color: '#7df9ff', fontSize: 14, fontWeight: 600 }}>{parseFloat(player.diamond || '0').toFixed(0)}</span>
        </div>
        <img src={ASSETS.gengduo} alt=">" style={{ width: 8, opacity: 0.6 }} />
        {/* 手机号（脱敏） */}
        <span style={{ color: 'rgba(160,140,200,0.6)', fontSize: 11, marginLeft: 'auto' }}>
          {player.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 游戏菜单区
// ──────────────────────────────────────────────
function GameMenuSection() {
  return (
    <div
      style={{
        margin: '8px 10px',
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1.5px solid rgba(120,60,220,0.45)',
        boxShadow: '0 0 30px rgba(80,20,160,0.3)',
      }}
    >
      {/* 大背景框 */}
      <img
        src={ASSETS.k4}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
      />

      {/* 内容层 */}
      <div style={{ position: 'relative', zIndex: 1, padding: '12px 10px 12px 8px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* 左侧头像列 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 46, flexShrink: 0 }}>
            {GAMES.map((g) => (
              <div
                key={g.id}
                style={{
                  width: 46, height: 46,
                  borderRadius: 10, overflow: 'hidden',
                  border: '1.5px solid rgba(120,60,220,0.5)',
                  boxShadow: '0 0 8px rgba(100,40,200,0.4)',
                  flexShrink: 0,
                }}
              >
                <img src={g.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>

          {/* 右侧游戏卡片列 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {GAMES.map((g) => (
              <div
                key={g.id}
                className="game-card"
                onClick={() => toast.info(`${g.labelText} 即将上线，敬请期待！`)}
                style={{
                  position: 'relative',
                  borderRadius: 10, overflow: 'hidden',
                  border: '1px solid rgba(120,60,220,0.4)',
                  boxShadow: '0 2px 12px rgba(80,20,160,0.3)',
                  height: 80,
                }}
              >
                <img
                  src={g.bg}
                  alt={g.labelText}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  {g.label ? (
                    <img src={g.label} alt={g.labelText} style={{ height: 28, objectFit: 'contain' }} />
                  ) : (
                    <span
                      style={{
                        color: '#fff', fontSize: 18, fontWeight: 900,
                        textShadow: '0 0 12px rgba(180,80,255,0.9), 0 2px 4px rgba(0,0,0,0.8)',
                        letterSpacing: 1,
                      }}
                    >
                      {g.labelText}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 底部导航
// ──────────────────────────────────────────────
const TAB_ITEMS = [
  { key: 'wode', icon: ASSETS.wode, label: '我的' },
  { key: 'fenxiang', icon: ASSETS.fenxiang, label: '分享' },
  { key: 'dating', icon: ASSETS.dating, label: '大厅', isCenter: true },
  { key: 'beibao', icon: ASSETS.beibao, label: '背包' },
  { key: 'chongzhi', icon: ASSETS.chongzhi, label: '充值' },
];

function BottomNav() {
  const [active, setActive] = useState('dating');

  const handleTabClick = (key: string) => {
    setActive(key);
    if (key !== 'dating') toast.info('功能即将上线');
  };

  return (
    <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
      <div style={{ position: 'relative' }}>
        <img
          src={ASSETS.tucheng7}
          alt=""
          style={{ width: '100%', display: 'block', height: 56 }}
        />
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center',
          }}
        >
          {TAB_ITEMS.map((tab) => (
            <div
              key={tab.key}
              className={`tab-item ${active === tab.key ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.key)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 2,
                paddingBottom: tab.isCenter ? 8 : 0,
              }}
            >
              {tab.isCenter ? (
                <div style={{ marginTop: -22 }}>
                  <img src={tab.icon} alt={tab.label} style={{ width: 60, height: 50, objectFit: 'contain' }} />
                  <div style={{
                    color: active === tab.key ? '#fff' : '#aaa',
                    fontSize: 11, textAlign: 'center', marginTop: 2,
                    fontWeight: active === tab.key ? 700 : 400,
                  }}>
                    {tab.label}
                  </div>
                </div>
              ) : (
                <>
                  <img src={tab.icon} alt={tab.label} style={{ width: 26, height: 26, objectFit: 'contain' }} />
                  <span style={{
                    color: active === tab.key ? '#c084fc' : '#888',
                    fontSize: 10,
                    fontWeight: active === tab.key ? 700 : 400,
                  }}>
                    {tab.label}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 首页主体
// ──────────────────────────────────────────────
export default function Home() {
  const [, navigate] = useLocation();
  const { data: player, isLoading, isFetching } = trpc.player.me.useQuery(
    undefined,
    {
      // 刷新页面时重新查询，确保登录后 cookie 能被读到
      refetchOnWindowFocus: true,
      staleTime: 0,
    }
  );

  // 未登录跳转登录页（必须等加载完成且不在请求中）
  useEffect(() => {
    if (!isLoading && !isFetching && !player) {
      navigate('/login');
    }
  }, [player, isLoading, isFetching]);

  return (
    <div
      className="phone-container"
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0621',
      }}
    >
      {/* 全局背景图 */}
      <img
        src={ASSETS.bg}
        alt=""
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          opacity: 0.55,
          pointerEvents: 'none',
        }}
      />

      {/* 内容层 */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', paddingBottom: 56 }}>
        <TopNav />
        <BannerSection />
        <BroadcastBar />
        <UserInfoSection player={player} />
        <GameMenuSection />
      </div>

      {/* 底部导航 */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <BottomNav />
      </div>

      {/* 广播动画样式 */}
      <style>{`
        @keyframes slideInBroadcast {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
