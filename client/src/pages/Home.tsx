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
import { LANHU, ASSETS, getAvatarUrl } from '@/lib/assets';
import { trpc } from '@/lib/trpc';
import GameMenuList from '@/components/GameMenuList';

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

        {/* ── section_1: 顶部导航 702×122px, margin: 13px 0 0 26px ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            width: q(702),
            height: q(122),
            marginTop: q(13),
            marginLeft: q(26),
          }}
        >
          {/* LOGO背景框 103×122px */}
          <div
            style={{
              width: q(103),
              height: q(122),
              backgroundImage: `url(${LANHU.logoBg})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src={ASSETS.bdcs2Logo}
              alt="LOGO"
              style={{ width: '80%', height: '80%', objectFit: 'contain' }}
            />
          </div>

          {/* 客服 79×80px */}
          <img src={LANHU.kefuIcon} alt="客服"
            style={{ width: q(79), height: q(80), marginTop: q(22), marginLeft: q(326), cursor: 'pointer', flexShrink: 0, objectFit: 'contain' }}
          />
          {/* VIP图标 79×80px */}
          <img src={LANHU.vipIcon} alt="VIP"
            style={{ width: q(79), height: q(80), marginTop: q(22), marginLeft: q(18), cursor: 'pointer', flexShrink: 0, objectFit: 'contain' }}
          />
          {/* 全部图标 79×80px */}
          <img src={LANHU.allGamesIcon} alt="全部"
            style={{ width: q(79), height: q(80), marginTop: q(22), marginLeft: q(18), cursor: 'pointer', flexShrink: 0, objectFit: 'contain' }}
          />
        </div>

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

        {/* ── section_2: 用户信息区 750×281px, margin-top: 53px ── */}
        <div style={{ position: 'relative', width: q(750), marginTop: q(53) }}>

          {/* block_1: 用户信息卡 663×281px, margin-left: 87px */}
          <div
            style={{
              position: 'relative',
              width: q(663),
              /* 设计稿原始高度 281px，固定高度确保背景图不拉伸 */
              height: q(281),
              overflow: 'visible',
              /* 防止 margin collapse：用 paddingTop 代替内部元素的 marginTop */
              paddingTop: q(50),
              marginLeft: q(87),
              backgroundImage: `url(${LANHU.userInfoBg})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* box_3: 广播栏 absolute left:-80px top:-64px, 739×102px */}
            <div
              style={{
                position: 'absolute',
                left: q(-80), top: q(-64),
                width: q(739), height: q(102),
                backgroundImage: `url(${LANHU.broadcastBg})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                overflow: 'hidden',
              }}
            >
              {/* 广播图标+文字行 489×32px, margin: 26px 0 0 47px */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: q(489),
                  height: q(32),
                  marginTop: q(26),
                  marginLeft: q(47),
                  overflow: 'hidden',
                }}
              >
                {/* 广播图标 31×32px */}
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
                {/* 广播文字 — 单条滚入，overflow hidden 防止多条重叠 */}
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
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      opacity: msgVisible ? 1 : 0,
                      transform: msgVisible ? 'translateY(0)' : 'translateY(100%)',
                      transition: 'opacity 0.3s ease, transform 0.3s ease',
                    }}
                  >
                    {messages[msgIndex]}
                  </span>
                </div>
              </div>
              {/* broadcastScroll 装饰图已移除，避免与动态文字重叠 */}
            </div>

            {/* 名字行 533×46px, marginLeft: 82px — marginTop 由 block_1 的 paddingTop 控制 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                width: q(533),
                marginTop: 0,
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

            {/* ID + 金币行 557×34px, margin: 8px 0 0 82px */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                width: q(557),
                marginTop: q(8),
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

              {/* 金币框 133×34px */}
              <div style={{ position: 'relative', width: q(133), height: q(34), backgroundImage: `url(${LANHU.coinBg1})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', marginLeft: q(60), display: 'flex', flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ color: 'rgba(255,255,255,1)', fontSize: q(26), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500, whiteSpace: 'nowrap', lineHeight: q(34), marginLeft: q(40) }}>
                  {parseFloat(player?.gold || '0').toFixed(0)}
                </span>
                <img src={LANHU.arrowIcon} alt="" style={{ width: q(10), height: q(19), marginLeft: 'auto', marginRight: q(10), objectFit: 'contain' }} />
                <img src={LANHU.coinArrow} alt="金币" style={{ position: 'absolute', left: q(-13), top: q(-4), width: q(42), height: q(42), objectFit: 'contain' }} />
              </div>

              {/* 钻石框 133×34px */}
              <div style={{ position: 'relative', width: q(133), height: q(34), backgroundImage: `url(${LANHU.coinBg2})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', marginLeft: q(20), display: 'flex', flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ color: 'rgba(255,255,255,1)', fontSize: q(26), fontFamily: 'Alibaba-PuHuiTi-B, sans-serif', fontWeight: 700, whiteSpace: 'nowrap', lineHeight: q(34), marginLeft: q(38) }}>
                  {parseFloat(player?.diamond || '0').toFixed(0)}
                </span>
                <img src={LANHU.arrowIcon} alt="" style={{ width: q(10), height: q(19), marginLeft: 'auto', marginRight: q(10), objectFit: 'contain' }} />
                <img src={LANHU.diamondArrow} alt="钻石" style={{ position: 'absolute', left: q(-21), top: q(-4), width: q(42), height: q(42), objectFit: 'contain' }} />
              </div>
            </div>

            {/* ── VIP标签：紧跟在 ID+金币行下方，margin: 8px 0 0 82px ── */}
            <div
              style={{
                width: q(184), height: q(46),
                backgroundImage: `url(${LANHU.vipTagBg})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                marginTop: q(8),
                marginLeft: q(82),
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  WebkitTextStroke: `${q(2)} rgba(105,51,0,1)`,
                  color: 'rgba(255,255,255,1)',
                  fontSize: q(24),
                  fontFamily: 'Alibaba-PuHuiTi-B, sans-serif',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                  marginLeft: q(55),
                }}
              >
                VIP{player?.vipLevel ?? 0}
              </span>
            </div>
          </div>

          {/* 头像框 absolute left:0 top:32px, 160×179px */}
          <div
            style={{
              position: 'absolute',
              left: 0, top: q(32),
              width: q(160), height: q(179),
              backgroundImage: `url(${LANHU.avatarFrame})`,
              backgroundPosition: `${q(-11)} 0px`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${q(171)} ${q(179)}`,
            }}
          >
            <img
              src={player ? getAvatarUrl(player.avatar) : LANHU.avatar}
              alt="头像"
              style={{ width: q(108), height: q(111), marginTop: q(24), marginLeft: q(32), borderRadius: '50%', objectFit: 'cover' }}
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          游戏菜单区（唯一可滚动区域）
          ══════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
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
    </div>
  );
}
