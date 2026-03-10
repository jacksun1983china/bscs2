/**
 * Home.tsx — 严格按蓝湖设计稿 1:1 还原 + 炫酷特效
 *
 * 特效层次（z-index 从低到高）：
 *  z=0  背景图
 *  z=1  粒子 Canvas（ParticleCanvas）
 *  z=2  全局扫光条（fx-sweep-bar）
 *  z=3+ 内容层
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { LANHU, ASSETS } from '@/lib/assets';
import { trpc } from '@/lib/trpc';
import GameMenuList from '@/components/GameMenuList';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import TopNav from '@/components/TopNav';
import SettingsModal from '@/components/SettingsModal';
import ParticleCanvas from '@/components/ParticleCanvas';

// px → cqw 转换（基准 750px）
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// ─────────────────────────────────────────────
// 广播消息（fallback）
// ─────────────────────────────────────────────
const BROADCASTS = [
  '2494271赢得竞技场五连胜，获得极品枪',
  '8831024在幸运转盘获得稀有道具 ×3',
  '5567890彩虹旋风连续中奖，获得金币 ×500',
  '3312456ROLL房获得限定皮肤，价值 ¥888',
  '7723190竞技场排名第一，获得传说装备',
];

// 底部导航配置
const NAV_ITEMS = [
  { key: 'profile',  icon: () => LANHU.myIcon,       label: '我的',  route: '/profile',  ml: 65  },
  { key: 'share',    icon: () => LANHU.shareIcon,     label: '分享',  route: '/share',    ml: 76  },
  { key: 'backpack', icon: () => LANHU.bagIcon,       label: '背包',  route: '/backpack', ml: 244 },
  { key: 'recharge', icon: () => LANHU.rechargeIcon,  label: '充值',  route: '/recharge', ml: 69  },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [activeNav, setActiveNav] = useState('home');
  const [settingsVisible, setSettingsVisible] = useState(false);

  const { data: player, isLoading, isFetching } = trpc.player.me.useQuery(undefined, {
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const { data: bannerList } = trpc.public.banners.useQuery();
  const { data: broadcastList } = trpc.public.broadcasts.useQuery();

  const [bannerIndex, setBannerIndex] = useState(0);
  const [prevBannerIndex, setPrevBannerIndex] = useState<number | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);
  // 每次 bannerIndex 变化时切换 Ken Burns 动画 key
  const [kbKey, setKbKey] = useState(0);

  const banners = (bannerList && bannerList.length > 0)
    ? bannerList
    : [{ id: 0, imageUrl: LANHU.banner, linkUrl: '', title: '' }];

  const messages = (broadcastList && broadcastList.length > 0)
    ? broadcastList.map((b: { content: string }) => b.content)
    : BROADCASTS;

  const goNextBanner = useCallback(() => {
    setBannerIndex(i => {
      const next = (i + 1) % banners.length;
      setPrevBannerIndex(i);
      setKbKey(k => k + 1);
      return next;
    });
  }, [banners.length]);

  useEffect(() => {
    if (!isLoading && !isFetching && !player) {
      navigate('/login');
    }
  }, [player, isLoading, isFetching]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(goNextBanner, 5000);
    return () => clearInterval(t);
  }, [goNextBanner, banners.length]);

  // 广播切换：先淡出，再切换消息，再淡入
  useEffect(() => {
    const t = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % messages.length);
        setMsgVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(t);
  }, [messages.length]);

  const handleBannerClick = () => {
    const b = banners[bannerIndex];
    if (b?.linkUrl) window.open(b.linkUrl, '_blank');
  };

  const handleNavClick = (key: string, route: string) => {
    setActiveNav(key);
    navigate(route);
  };

  return (
    <div
      className="phone-container"
      style={{ display: 'flex', flexDirection: 'column', containerType: 'inline-size', position: 'relative', overflow: 'hidden' }}
    >
      {/* ── z=0 全局背景图 ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${LANHU.pageBg})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'top center',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* ── z=1 粒子 Canvas ── */}
      <ParticleCanvas />

      {/* ── z=2 全局扫光条 ── */}
      <div className="fx-sweep-bar" />

      {/* ══════════════════════════════════════════════════════
          顶部固定区（不滚动）
          ══════════════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 10, width: '100%' }}>

        {/* ── section_1: 顶部导航 ── */}
        <TopNav showLogo={true} onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />

        {/* ── Banner 750×340px ── */}
        <div
          style={{
            width: q(750),
            height: q(340),
            marginTop: q(1),
            position: 'relative',
            cursor: banners[bannerIndex]?.linkUrl ? 'pointer' : 'default',
          }}
          onClick={handleBannerClick}
        >
          {/* 底层：霏虹边框图（701b6ae6...png）作为底框装饰 */}
          <img
            src="/img/701b6ae6376947b76d1b867bdd8e2d0d.png"
            alt=""
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              top: 0,
              left: 0,
              objectFit: 'fill',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />

          {/* 中间层：Banner图片，用蒙版PNG裁剪成圆角，显示在边框内部 */}
          <div
            style={{
              position: 'absolute',
              // 内缩一小圈，让边框图的外框能显示出来
              top: '6%',
              left: '2.5%',
              width: '95%',
              height: '88%',
              // 使用蒙版图的Alpha通道裁剪内容
              WebkitMaskImage: `url(/img/banner-mask.png)`,
              WebkitMaskSize: '100% 100%',
              WebkitMaskRepeat: 'no-repeat',
              maskImage: `url(/img/banner-mask.png)`,
              maskSize: '100% 100%',
              maskRepeat: 'no-repeat',
              overflow: 'hidden',
              zIndex: 1,
            }}
          >
            {banners.map((b, i) => (
              <img
                key={`${b.id}-${kbKey}-${i}`}
                src={b.imageUrl}
                alt={b.title || 'banner'}
                className={i === bannerIndex ? `fx-ken-burns-${kbKey % 2}` : ''}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  top: 0,
                  left: 0,
                  objectFit: 'cover',
                  opacity: i === bannerIndex ? 1 : 0,
                  transition: 'opacity 0.7s ease',
                  transformOrigin: 'center center',
                }}
              />
            ))}
          </div>

          {banners.length > 1 && (
            <div style={{ position: 'absolute', bottom: q(16), left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: q(6), zIndex: 5 }}>
              {banners.map((_, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); setBannerIndex(i); setKbKey(k => k + 1); }}
                  style={{
                    width: i === bannerIndex ? q(20) : q(8),
                    height: q(8),
                    borderRadius: q(4),
                    background: i === bannerIndex ? '#c084fc' : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    boxShadow: i === bannerIndex ? '0 0 6px rgba(192,132,252,0.8)' : 'none',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── section_2: 用户信息区 ── */}
        <div style={{ position: 'relative', width: q(750), marginTop: '8.6667cqw' }}>

          {/* 广播栏 */}
          <div
            className="fx-broadcast-pulse"
            style={{
              position: 'absolute',
              left: q(7), top: q(-64),
              width: q(739), height: q(102),
              backgroundImage: `url(${LANHU.broadcastBg})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              zIndex: 2,
              borderRadius: q(8),
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                left: q(47),
                right: q(20),
              }}
            >
              <div
                style={{
                  width: q(31), height: q(32),
                  backgroundImage: `url(${LANHU.broadcastIcon})`,
                  backgroundPosition: `${q(-12)} ${q(-9)}`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${q(56)} ${q(57)}`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, height: q(32), overflow: 'hidden', marginLeft: q(11) }}>
                <span
                  key={msgIndex}
                  style={{
                    display: 'block',
                    color: 'rgba(255,255,255,1)',
                    fontSize: q(24),
                    fontFamily: 'Alibaba-PuHuiTi-M, sans-serif',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    lineHeight: q(32),
                    opacity: msgVisible ? 1 : 0,
                    transform: msgVisible ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                  }}
                >
                  {messages[msgIndex]}
                </span>
              </div>
            </div>
          </div>

          {/* 玩家信息卡 */}
          <PlayerInfoCard />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          游戏菜单区（唯一可滚动区域）
          ══════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, paddingTop: 2, paddingBottom: 2 }}>
        <GameMenuList />
      </div>

      {/* ══════════════════════════════════════════════════════
          底部导航 — 永远沉底
          ══════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'relative',
          flexShrink: 0,
          width: '100%',
          height: q(90),
          zIndex: 100,
          backgroundImage: `url(${LANHU.bottomNavBg})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          containerType: 'inline-size',
        }}
      >
        {NAV_ITEMS.map((item, idx) => (
          <div
            key={item.key}
            onClick={() => handleNavClick(item.key, item.route)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: q(60),
              marginLeft: q(item.ml),
              cursor: 'pointer',
              flexShrink: 0,
              gap: q(4),
            }}
          >
            <img
              src={item.icon()}
              alt={item.label}
              className={activeNav === item.key ? 'fx-nav-active' : ''}
              style={{
                width: q(60),
                height: q(60),
                objectFit: 'contain',
                transition: 'filter 0.3s ease',
              }}
            />
            <span style={{
              textShadow: '0px 1px 5px rgba(33,0,80,0.67)',
              color: activeNav === item.key ? 'rgba(255,200,255,1)' : 'rgba(217,148,255,1)',
              fontSize: q(22),
              fontFamily: 'Alibaba-PuHuiTi-M, sans-serif',
              fontWeight: activeNav === item.key ? 700 : 500,
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}>
              {item.label}
            </span>
          </div>
        ))}

        {/* 大厅中心图标 */}
        <img
          src={LANHU.hallIcon}
          alt="大厅"
          onClick={() => { setActiveNav('home'); navigate('/'); }}
          className={activeNav === 'home' ? 'fx-nav-active' : ''}
          style={{
            position: 'absolute',
            left: q(300),
            top: q(-37),
            width: q(151),
            height: q(124),
            objectFit: 'contain',
            cursor: 'pointer',
            transition: 'filter 0.3s ease',
          }}
        />
      </div>

      {/* 设置弹窗 */}
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </div>
  );
}
