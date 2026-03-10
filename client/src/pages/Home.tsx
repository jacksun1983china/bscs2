/**
 * Home.tsx — 严格按蓝湖设计稿 1:1 还原
 * 设计稿：750px × 1624px
 * 转换规则：所有 px 值 / 750 * 100 = cqw（容器查询宽度单位）
 *
 * 布局结构（flex column，高度 = 100vh）：
 * ┌─────────────────────────────────┐
 * │  顶部固定区（不滚动）              │  flex-shrink: 0
 * │  - section_1: 顶部导航           │
 * │  - image-wrapper_1: Banner       │
 * │  - section_2: 用户信息区 + VIP   │
 * ├─────────────────────────────────┤
 * │  游戏菜单区（可滚动）              │  flex: 1, overflow-y: auto
 * │  → <GameMenuList /> 组件         │
 * ├─────────────────────────────────┤
 * │  底部导航（永远沉底）              │  flex-shrink: 0
 * └─────────────────────────────────┘
 */
import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { LANHU, ASSETS } from '@/lib/assets';
import { trpc } from '@/lib/trpc';
import GameMenuList from '@/components/GameMenuList';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import TopNav from '@/components/TopNav';
import SettingsModal from '@/components/SettingsModal';

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

export default function Home() {
  const [, navigate] = useLocation();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const { data: player, isLoading, isFetching } = trpc.player.me.useQuery(undefined, {
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const { data: bannerList } = trpc.public.banners.useQuery();
  const { data: broadcastList } = trpc.public.broadcasts.useQuery();

  const [bannerIndex, setBannerIndex] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);

  const banners = (bannerList && bannerList.length > 0)
    ? bannerList
    : [{ id: 0, imageUrl: LANHU.banner, linkUrl: '', title: '' }];

  const messages = (broadcastList && broadcastList.length > 0)
    ? broadcastList.map((b: { content: string }) => b.content)
    : BROADCASTS;

  const goNextBanner = useCallback(() => {
    setBannerIndex(i => (i + 1) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (!isLoading && !isFetching && !player) {
      navigate('/login');
    }
  }, [player, isLoading, isFetching]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(goNextBanner, 4000);
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

  return (
    <div
      className="phone-container"
      style={{ display: 'flex', flexDirection: 'column', containerType: 'inline-size', position: 'relative' }}
    >
      {/* ══════════════════════════════════════════════════════
          全局背景图：position: absolute; inset: 0
          backgroundSize: cover 确保铺满整个容器，不截断
          ══════════════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════════════
          顶部固定区（不滚动）
          ══════════════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 1, width: '100%' }}>

        {/* ── section_1: 顶部导航（公共组件） ── */}
        <TopNav showLogo={true} onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />

        {/* ── Banner 750×340px, margin-top: 1px ── */}
        <div
          style={{
            width: q(750),
            height: q(340),
            backgroundImage: `url(${LANHU.bannerBg})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            marginTop: q(1),
            position: 'relative',
            overflow: 'hidden',
            cursor: banners[bannerIndex]?.linkUrl ? 'pointer' : 'default',
          }}
          onClick={handleBannerClick}
        >
          {banners.map((b, i) => (
            <img
              key={b.id}
              src={b.imageUrl}
              alt={b.title || 'banner'}
              style={{
                position: 'absolute',
                width: q(679), height: q(313),
                top: q(12), left: q(38),
                objectFit: 'cover',
                borderRadius: q(12),
                opacity: i === bannerIndex ? 1 : 0,
                transition: 'opacity 0.6s ease',
              }}
            />
          ))}
          {banners.length > 1 && (
            <div style={{ position: 'absolute', bottom: q(16), left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: q(6), zIndex: 5 }}>
              {banners.map((_, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); setBannerIndex(i); }}
                  style={{ width: i === bannerIndex ? q(20) : q(8), height: q(8), borderRadius: q(4), background: i === bannerIndex ? '#c084fc' : 'rgba(255,255,255,0.4)', transition: 'all 0.3s ease', cursor: 'pointer' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── section_2: 用户信息区 750×281px, margin-top: 8.6667cqw ── */}
        <div style={{ position: 'relative', width: q(750), marginTop: '8.6667cqw' }}>

          {/* box_3: 广播栏 absolute，相对section_2: left=87-80=7px, top=-64px, 739×102px */}
          <div
            style={{
              position: 'absolute',
              left: q(7), top: q(-64),
              width: q(739), height: q(102),
              backgroundImage: `url(${LANHU.broadcastBg})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              zIndex: 2,
            }}
          >
            {/* 广播内容行：垂直居中于102px容器 */}
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
              {/* 广播喇叭图标 31×32px */}
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
              {/* 广播文字，单条淡入淡出 */}
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

          {/* block_1 + 头像框 + VIP标签 → 提取为 PlayerInfoCard 公共组件 */}
          <PlayerInfoCard />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          游戏菜单区（唯一可滚动区域）
          ══════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, paddingTop: 2, paddingBottom: 2 }}>
        <GameMenuList />
      </div>

      {/* ══════════════════════════════════════════════════════
          底部导航 - 永远沉底（flex-shrink: 0）
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
        {/* 我的 */}
        <div onClick={() => navigate('/profile')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: q(60), marginLeft: q(65), cursor: 'pointer', flexShrink: 0, gap: q(4) }}>
          <img src={LANHU.myIcon} alt="我的" style={{ width: q(60), height: q(60), objectFit: 'contain' }} />
          <span style={{ textShadow: '0px 1px 5px rgba(33,0,80,0.67)', color: 'rgba(217,148,255,1)', fontSize: q(22), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500, whiteSpace: 'nowrap', lineHeight: 1 }}>我的</span>
        </div>

        {/* 分享 */}
        <div onClick={() => navigate('/share')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: q(60), marginLeft: q(76), cursor: 'pointer', flexShrink: 0, gap: q(4) }}>
          <img src={LANHU.shareIcon} alt="分享" style={{ width: q(60), height: q(60), objectFit: 'contain' }} />
          <span style={{ textShadow: '0px 1px 5px rgba(33,0,80,0.67)', color: 'rgba(217,148,255,1)', fontSize: q(22), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500, whiteSpace: 'nowrap', lineHeight: 1 }}>分享</span>
        </div>

        {/* 背包（跳过大厅中心位置） */}
        <div onClick={() => navigate('/bag')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: q(60), marginLeft: q(244), cursor: 'pointer', flexShrink: 0, gap: q(4) }}>
          <img src={LANHU.bagIcon} alt="背包" style={{ width: q(60), height: q(60), objectFit: 'contain' }} />
          <span style={{ textShadow: '0px 1px 5px rgba(33,0,80,0.67)', color: 'rgba(217,148,255,1)', fontSize: q(22), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500, whiteSpace: 'nowrap', lineHeight: 1 }}>背包</span>
        </div>

        {/* 充值 */}
        <div onClick={() => navigate('/recharge')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: q(60), marginLeft: q(69), cursor: 'pointer', flexShrink: 0, gap: q(4) }}>
          <img src={LANHU.rechargeIcon} alt="充值" style={{ width: q(60), height: q(60), objectFit: 'contain' }} />
          <span style={{ textShadow: '0px 1px 5px rgba(33,0,80,0.67)', color: 'rgba(217,148,255,1)', fontSize: q(22), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500, whiteSpace: 'nowrap', lineHeight: 1 }}>充值</span>
        </div>

        {/* 大厅中心图标 absolute */}
        <img src={LANHU.hallIcon} alt="大厅" onClick={() => navigate('/')}
          style={{ position: 'absolute', left: q(300), top: q(-37), width: q(151), height: q(124), objectFit: 'contain', cursor: 'pointer' }}
        />
      </div>
      {/* 设置弹窗：position:absolute，受 phone-container 约束 */}
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </div>
  );
}
