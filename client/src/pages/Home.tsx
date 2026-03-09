/**
 * Home.tsx — bdcs2 游戏平台首页
 * 设计风格：赛博朋克深紫蓝霓虹，严格还原设计稿切图
 * 布局：顶部导航 → Banner轮播 → 广播 → 用户信息（公共组件）→ 游戏菜单 → 底部导航（公共组件）
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { ASSETS } from '@/lib/assets';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import PlayerInfoBar from '@/components/PlayerInfoBar';
import BottomNav from '@/components/BottomNav';

// ──────────────────────────────────────────────
// 游戏菜单数据
// ──────────────────────────────────────────────
const GAMES = [
  { id: 'arena',   bg: ASSETS.jingjichangk,    label: ASSETS.jingjichang,   labelText: '竞技场',   avatar: ASSETS.touxiang1, route: null },
  { id: 'wheel',   bg: ASSETS.xingyunzhuanpank, label: ASSETS.xingyunzhuanpan, labelText: '幸运转盘', avatar: ASSETS.touxiang2, route: '/rollx' },
  { id: 'rainbow', bg: ASSETS.caihongxuanfengk, label: null,                 labelText: '彩虹旋风', avatar: ASSETS.touxiang3, route: null },
  { id: 'roll',    bg: ASSETS.rollk,            label: ASSETS.roll,          labelText: 'ROLL房',   avatar: ASSETS.touxiang4, route: '/roll' },
];

// ──────────────────────────────────────────────
// 顶部导航
// ──────────────────────────────────────────────
function TopNav() {
  return (
    <div style={{ position: 'relative', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', zIndex: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, lineHeight: 1, background: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 50%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          BATTLE·CYBER
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <img src={ASSETS.kefu}   alt="客服" style={{ width: 40, height: 40, objectFit: 'contain', cursor: 'pointer' }} onClick={() => toast.info('客服功能即将上线')} />
        <img src={ASSETS.vip}    alt="VIP"  style={{ width: 40, height: 40, objectFit: 'contain', cursor: 'pointer' }} onClick={() => toast.info('VIP功能即将上线')} />
        <img src={ASSETS.quanbu} alt="全部" style={{ width: 40, height: 40, objectFit: 'contain', cursor: 'pointer' }} onClick={() => toast.info('全部游戏即将上线')} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Banner 轮播区域（接入真实API）
// ──────────────────────────────────────────────
function BannerSection() {
  const { data: bannerList } = trpc.public.banners.useQuery();
  const [currentIndex, setCurrentIndex] = useState(0);
  const banners = (bannerList && bannerList.length > 0)
    ? bannerList
    : [{ id: 0, imageUrl: ASSETS.bannerk, linkUrl: '', title: '' }];
  const goNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % banners.length);
  }, [banners.length]);
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(goNext, 4000);
    return () => clearInterval(timer);
  }, [goNext, banners.length]);
  const handleClick = () => {
    const banner = banners[currentIndex];
    if (banner?.linkUrl) window.open(banner.linkUrl, '_blank');
  };
  return (
    <div style={{ padding: '0 10px', marginTop: 4 }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1.5px solid rgba(120,60,220,0.6)',
          boxShadow: '0 0 20px rgba(100,40,200,0.4), inset 0 0 30px rgba(0,0,0,0.3)',
          cursor: banners[currentIndex]?.linkUrl ? 'pointer' : 'default',
        }}
        onClick={handleClick}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/7', overflow: 'hidden' }}>
          {banners.map((b, i) => (
            <img
              key={b.id}
              src={b.imageUrl}
              alt={b.title || 'banner'}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 10,
                opacity: i === currentIndex ? 1 : 0,
                transition: 'opacity 0.6s ease',
              }}
            />
          ))}
        </div>
        {banners.length > 1 && (
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 5 }}>
            {banners.map((_, i) => (
              <div
                key={i}
                onClick={e => { e.stopPropagation(); setCurrentIndex(i); }}
                style={{
                  width: i === currentIndex ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === currentIndex ? '#c084fc' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 广播滚动条（接入真实API）
// ──────────────────────────────────────────────
const DEFAULT_BROADCASTS = [
  '2494271 赢得竞技场五连胜，获得极品枪',
  '8831024 在幸运转盘获得稀有道具 ×3',
  '5567890 彩虹旋风连续中奖，获得金币 ×500',
  '3312456 ROLL房获得限定皮肤，价值 ¥888',
  '7723190 竞技场排名第一，获得传说装备',
];
function BroadcastBar() {
  const { data: broadcastList } = trpc.public.broadcasts.useQuery();
  const messages = (broadcastList && broadcastList.length > 0)
    ? broadcastList.map(b => b.content)
    : DEFAULT_BROADCASTS;
  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex(i => (i + 1) % messages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [messages.length]);
  return (
    <div style={{ margin: '8px 10px', background: 'rgba(20,8,50,0.85)', border: '1px solid rgba(100,50,200,0.4)', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
      <img src={ASSETS.guangbo} alt="广播" style={{ width: 22, height: 22, flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div key={msgIndex} style={{ color: '#e0d0ff', fontSize: 12, whiteSpace: 'nowrap', animation: 'slideInBroadcast 0.4s ease' }}>
          {messages[msgIndex]}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 游戏菜单区
// ──────────────────────────────────────────────
function GameMenuSection() {
  const [, navigate] = useLocation();
  const handleGameClick = (game: typeof GAMES[0]) => {
    if (game.route) {
      navigate(game.route);
    } else {
      toast.info(`${game.labelText} 即将上线，敬请期待！`);
    }
  };
  return (
    <div
      style={{
        margin: '8px 10px',
        flex: 1,
        minHeight: 0,
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
      <div style={{ position: 'relative', zIndex: 1, padding: '12px 10px 12px 8px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
          {/* 左侧头像列 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 46, flexShrink: 0 }}>
            {GAMES.map(g => (
              <div
                key={g.id}
                style={{
                  flex: 1,
                  minHeight: 0,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1.5px solid rgba(120,60,220,0.5)',
                  boxShadow: '0 0 8px rgba(100,40,200,0.4)',
                }}
              >
                <img src={g.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
          {/* 右侧游戏卡片列 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {GAMES.map(g => (
              <div
                key={g.id}
                onClick={() => handleGameClick(g)}
                style={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(120,60,220,0.4)', boxShadow: '0 2px 12px rgba(80,20,160,0.3)', cursor: 'pointer' }}
              >
                <img src={g.bg} alt={g.labelText} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                  {g.label ? (
                    <img src={g.label} alt={g.labelText} style={{ height: 28, objectFit: 'contain' }} />
                  ) : (
                    <span style={{ color: '#fff', fontSize: 18, fontWeight: 900, textShadow: '0 0 12px rgba(180,80,255,0.9), 0 2px 4px rgba(0,0,0,0.8)', letterSpacing: 1 }}>
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
// 首页主体
// ──────────────────────────────────────────────
export default function Home() {
  const [, navigate] = useLocation();
  const { data: player, isLoading, isFetching } = trpc.player.me.useQuery(undefined, { refetchOnWindowFocus: true, staleTime: 0 });

  useEffect(() => {
    if (!isLoading && !isFetching && !player) {
      navigate('/login');
    }
  }, [player, isLoading, isFetching]);

  return (
    <div className="phone-container" style={{ height: '100vh', position: 'relative', background: '#0d0621', overflow: 'hidden' }}>
      {/* 全局背景图 */}
      <img src={ASSETS.bg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.55, pointerEvents: 'none' }} />

      {/* 内容区：flex布局，GameMenuSection自动填充剩余空间 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 70, zIndex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        <TopNav />
        <BannerSection />
        <BroadcastBar />
        {/* 用户信息区：公共组件，首页显示退出按钮 */}
        <PlayerInfoBar showLogout={true} />
        <GameMenuSection />
      </div>

      {/* 底部导航：公共组件，固定在底部，大厅高亮 */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 }}>
        <BottomNav active="dating" />
      </div>

      {/* 广播动画 */}
      <style>{`
        @keyframes slideInBroadcast {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
