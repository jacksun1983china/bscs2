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
import { useSound } from '@/hooks/useSound';

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
  // 入场动画状态
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const { playClick } = useSound();

  // 入场动画：1.5秒后淡出
  useEffect(() => {
    const t1 = setTimeout(() => setSplashFading(true), 1500);
    const t2 = setTimeout(() => setSplashVisible(false), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const { data: player, isLoading, isFetching, fetchStatus } = trpc.player.me.useQuery(undefined, {
    refetchOnWindowFocus: false, // 禁用窗口焦点切换时自动重请，避免频繁触发 429
    staleTime: 30 * 1000, // 30秒内不重复请求，避免频繁刷新
  });
  const { data: bannerList } = trpc.public.banners.useQuery(undefined, { staleTime: 5 * 60_000 }); // Banner 5分钟内不重请
  const { data: broadcastList } = trpc.public.broadcasts.useQuery(undefined, { staleTime: 5 * 60_000 }); // 广播 5分钟内不重请

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

  // 只有在查询真正完成（非加载中、非后台刷新）且确认无用户时才跳转
  // fetchStatus === 'idle' 表示请求已完成且当前没有进行中的请求
  // 这样可以避免 invalidate 后短暂 data=undefined 的竞态条件误触发跳转
  useEffect(() => {
    if (!isLoading && fetchStatus === 'idle' && !player) {
      navigate('/login');
    }
  }, [player, isLoading, fetchStatus]);

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

  // 首次登录欢迎弹窗
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (!player) return;
    const key = `welcome_shown_${player.id}`;
    if (!localStorage.getItem(key)) {
      // 延迟 600ms 等入场动画结束
      const timer = setTimeout(() => setShowWelcome(true), 600);
      return () => clearTimeout(timer);
    }
  }, [player?.id]);
  const handleCloseWelcome = () => {
    if (player) localStorage.setItem(`welcome_shown_${player.id}`, '1');
    setShowWelcome(false);
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

      {/* ── 入场动画递层（z=100）── */}
      {splashVisible && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(160deg, #0d0621 0%, #1a0840 50%, #0d0621 100%)',
            opacity: splashFading ? 0 : 1,
            transition: 'opacity 0.6s ease',
            pointerEvents: splashFading ? 'none' : 'auto',
          }}
        >
          {/* LOGO */}
          <img
            src={ASSETS.bdcs2Logo}
            alt="logo"
            style={{
              width: '45%',
              objectFit: 'contain',
              animation: 'splashLogoIn 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards',
              filter: 'drop-shadow(0 0 24px rgba(160,80,255,0.8))',
            }}
          />
          {/* 光晕动画 */}
          <div
            style={{
              marginTop: q(40),
              width: q(120),
              height: q(4),
              borderRadius: q(2),
              background: 'rgba(120,60,220,0.3)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #7c3aed, #22d3ee)',
                animation: 'splashProgress 1.4s ease forwards',
                borderRadius: q(2),
              }}
            />
          </div>
          <div
            style={{
              marginTop: q(20),
              color: 'rgba(160,80,255,0.7)',
              fontSize: q(22),
              letterSpacing: 3,
              animation: 'splashTextIn 0.6s 0.3s ease forwards',
              opacity: 0,
            }}
          >
            加载中...
          </div>
        </div>
      )}

      <style>{`
        @keyframes splashLogoIn {
          from { opacity: 0; transform: scale(0.6) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes splashTextIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

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
          {/* 底层：Banner图片，用蒙版PNG裁剪成圆角，全尺寸充满 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
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

      {/* 首次登录欢迎弹窗 */}
      {showWelcome && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'welcomeFadeIn 0.4s ease',
          }}
          onClick={handleCloseWelcome}
        >
          <div
            style={{
              width: q(580), borderRadius: q(24),
              background: 'linear-gradient(145deg, #1a0840 0%, #0d0621 60%, #1a0840 100%)',
              border: '1.5px solid rgba(160,80,255,0.6)',
              boxShadow: '0 0 60px rgba(120,40,220,0.6), 0 0 120px rgba(80,20,160,0.3)',
              padding: `${q(32)} ${q(28)} ${q(28)}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              animation: 'welcomeSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 标题 */}
            <div style={{
              fontSize: q(32), fontWeight: 900, color: '#fff',
              textShadow: '0 0 20px rgba(160,80,255,0.8)',
              marginBottom: q(8), letterSpacing: 2,
            }}>&#x1F389; 欢迎加入 YouMe!</div>
            <div style={{ color: 'rgba(180,150,255,0.7)', fontSize: q(22), marginBottom: q(24) }}>您的新手礼包已就绪</div>

            {/* 金币展示区 */}
            <div style={{
              width: '100%', borderRadius: q(16),
              background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.05) 100%)',
              border: '1px solid rgba(251,191,36,0.4)',
              padding: `${q(20)} ${q(24)}`,
              display: 'flex', alignItems: 'center', gap: q(16),
              marginBottom: q(24),
            }}>
              <div style={{ fontSize: q(48) }}>&#x1F4B0;</div>
              <div>
                <div style={{ color: 'rgba(251,191,36,0.7)', fontSize: q(20), marginBottom: q(4) }}>新手専属金币大礼包</div>
                <div style={{
                  fontSize: q(44), fontWeight: 900,
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  lineHeight: 1,
                }}>1,000,000</div>
                <div style={{ color: 'rgba(251,191,36,0.6)', fontSize: q(18), marginTop: q(2) }}>金币已自动入账</div>
              </div>
            </div>

            {/* 提示文字 */}
            <div style={{
              color: 'rgba(180,150,255,0.5)', fontSize: q(18), textAlign: 'center',
              marginBottom: q(20), lineHeight: 1.6,
            }}>
              去竞技场、ROLL房、幸运转盘中展身手，赢取更多大奖！
            </div>

            {/* 确认按鈕 */}
            <button
              onClick={handleCloseWelcome}
              style={{
                width: '100%', padding: `${q(16)} 0`, borderRadius: q(12),
                fontSize: q(26), fontWeight: 800, cursor: 'pointer', border: 'none',
                background: 'linear-gradient(135deg, #7b2fff 0%, #06b6d4 100%)',
                color: '#fff', letterSpacing: 2,
                boxShadow: '0 4px 20px rgba(123,47,255,0.5)',
              }}
            >
              开始游戏 &#x1F3AE;
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes welcomeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes welcomeSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
