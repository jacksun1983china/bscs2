/**
 * RollRoomDetail.tsx — Roll房详情页（奖池内页）
 * 严格按照蓝湖设计稿还原，接入动态数据（去掉硬编码）
 * 设计稿基准：750px宽
 */
import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { LANHU, getAvatarUrl } from '@/lib/assets';
import BottomNav from '@/components/BottomNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import TopNav from '@/components/TopNav';
import SettingsModal from '@/components/SettingsModal';
import { toast } from 'sonner';

// ── px → cqw 转换（基准 750px）──────────────────────────────────
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// ── CDN图片常量（Roll房内页专用）────────────────────────────────
const D = {
  bgSection1: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/88df65cfc94576368c6787e5bbb683ff_543148bd.png',
  navBack: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/ec1eedc0ad7624ad7da05a58dbd95a7b_872acc54.png',
  roomInfoBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/93accdb93cd63fd3985db2c5e9651ab1_74a6cf01.png',
  roomLogoBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/f0b887f4501f76329cad2c287e19b422_f90e8f4d.png',
  roomLogo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/3e42894d4a5f4af2d0589ed9d3d76ca4_f11141fb.png',
  divider: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/1b6c25e7b320b682bc2f6d7d9d3081a3_05a9677a.png',
  viewBtn: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/f173c8bcf24562af94caa3c10a81d01e_5021be09.png',
  tabPrizes: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/0e74f38df57d7f287c0e46df5f26a22a_d064efef.png',
  tabParticipants: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/33c5fd2d6d81a7ebd297281f6f7afacf_b89c08be.png',
  prizesBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/6a82df54388a30db7870f091a1f9cccf_b28062e3.png',
  bottomNavBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/91e975985dee09e36723842c40a27c2a_af4d31a8.png',
  joinBtnBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/acc04db4e1874485603cd958d7c1656d_5e242237.png',
  joinBtnInner: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/d684c4b1bee245aebb6dc8321f6982d2_mergeImage_ec453aa5.png',
  amountIcon: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/075966c6c6e6c594c35d716a297022da_f41cb886.png',
  qualityBg1: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/1df0333fae6b6c2a3ee5f951721cd235_629f1537.png',
  qualityInner1: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/f7860251e6ed990e12949260af8330cf_a67c4560.png',
  rechargeIcon: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/3197e6a1da089a70aa02cc0269240860_83951aac.png',
  diamondIcon: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/c7de8fd246bd7f77de5fc9ac69356793_d052f6ab.png',
  peopleIcon: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/250ed443581899ea816657665d5fb755_385592c8.png',
  sep1: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/47b8b2292229eae894379b32785ada1b_0b87bcfe.png',
  sep2: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/22ef60e60d2ecc63ecb46a31b4ecb0f6_a33777da.png',
  bgGroup9: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/49add6637276c2518f4049a76189ad1a_c4a39537.png',
  navWodeBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/0b216f1de3ab52b2b616cf4f42a8e9fd_f832ff54.png',
  navFenxiangBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/a011e2952242d21e80989148bbc47112_16f51317.png',
  navBeibao: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/abec180422788596ecfc3a399ed6e028_cdef515c.png',
  navChongzhiBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/3177f1620b210a8049b83899affd59a1_400d27c5.png',
  navDating: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/cc6a4e0101f19d3e5d2749cb06a2b333_1d5b1383.png',
  // 奖品默认图
  prizeDefault: [
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/11aaef12bec2cd411f3c8e9169c941ff_d29a152e.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/8e0911e13bc4d89a9318cf196dbeb792_0b0dea98.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/0dceb014b82e30cc28910f81f8549747_729d3f50.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/ab04c72eb9f6eda286b052953ed4e5e7_bf08957f.png',
  ],
};

// ── 倒计时 Hook ───────────────────────────────────────────────────
function useCountdown(endAt: Date | string | null) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!endAt) return;
    const update = () => {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('已截止'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endAt]);
  return remaining;
}

// ── 底部导航 ──────────────────────────────────────────────────────
// ── 奖品卡片（2列网格，蓝湖设计：340×260px） ─────────────────────
function PrizeCard({ prize, index }: { prize: any; index: number }) {
  const prizeImg = prize.imageUrl || D.prizeDefault[index % D.prizeDefault.length];
  const value = parseFloat(prize.value || '0').toFixed(2);
  const quality = prize.quality || '崭新出厂';

  return (
    <div style={{
      position: 'relative',
      width: q(340),
      height: q(260),
      backgroundColor: 'rgba(36,10,113,1)',
      borderRadius: q(15),
      border: `${q(3)} solid rgba(0,0,0,1)`,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* 奖品图片（212×153px, margin: 19px 0 0 62px） */}
      <img
        src={prizeImg}
        alt={prize.name}
        style={{ width: q(212), height: q(153), marginTop: q(19), marginLeft: q(62), objectFit: 'contain', display: 'block' }}
      />
      {/* 名称底部栏（backgroundColor: rgba(116,78,240,1), height: 85px） */}
      <div style={{
        backgroundColor: 'rgba(116,78,240,1)',
        height: q(85),
        width: q(334),
        margin: `${q(3)} 0 0 ${q(3)}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingLeft: q(25),
        paddingRight: q(10),
        gap: q(4),
      }}>
        <span style={{
          color: 'rgba(255,255,255,1)',
          fontSize: q(26),
          fontFamily: 'Alibaba-PuHuiTi-R, sans-serif',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: q(34),
        }}>{prize.name}</span>
        <span style={{
          color: 'rgba(255,246,13,1)',
          fontSize: q(22),
          fontFamily: 'Alibaba-PuHuiTi-M, sans-serif',
          fontWeight: 500,
          lineHeight: q(28),
        }}>¥{value}</span>
      </div>
      {/* 品质标签（absolute right:0 top:22, 131×41px） */}
      <div style={{
        position: 'absolute',
        right: 0,
        top: q(22),
        width: q(131),
        height: q(41),
        backgroundImage: `url(${D.qualityBg1})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: q(129),
          height: q(41),
          backgroundImage: `url(${D.qualityInner1})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            textShadow: '0px 3px 0px rgba(216,118,10,1)',
            color: 'rgba(255,255,255,1)',
            fontSize: q(19),
            fontFamily: 'Alibaba-PuHuiTi-H, sans-serif',
            fontWeight: 900,
            whiteSpace: 'nowrap',
            lineHeight: q(30),
          }}>{quality}</span>
        </div>
      </div>
    </div>
  );
}

// ── 参与者头像格子 ────────────────────────────────────────────────
function ParticipantAvatar({ p }: { p: any }) {
  const avatarSrc = p.isBot ? (p.botAvatar || getAvatarUrl(null)) : getAvatarUrl(p.avatar);
  const nickname = p.isBot ? (p.botNickname || `机器人`) : (p.nickname || `用户${p.playerId}`);
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: q(8),
      padding: `${q(12)} ${q(8)}`,
    }}>
      <div style={{
        width: q(80),
        height: q(80),
        borderRadius: '50%',
        overflow: 'hidden',
        border: `${q(2)} solid ${p.isBot ? 'rgba(100,100,100,0.4)' : 'rgba(120,60,220,0.5)'}`,
        background: 'rgba(50,20,100,0.5)',
        flexShrink: 0,
      }}>
        <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <span style={{
        color: p.isBot ? 'rgba(150,150,150,1)' : 'rgba(200,180,255,1)',
        fontSize: q(20),
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: q(100),
        textAlign: 'center',
      }}>{nickname}</span>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────
export default function RollRoomDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const roomId = parseInt(params.id || '0');
  const [activeTab, setActiveTab] = useState<'prizes' | 'participants'>('prizes');
  const [settingsVisible, setSettingsVisible] = useState(false);

  const { data, isLoading, refetch } = trpc.roll.detail.useQuery(
    { id: roomId },
    { enabled: !!roomId, refetchInterval: 15000 }
  );
  const { data: joinedData, refetch: refetchJoined } = trpc.roll.checkJoined.useQuery(
    { roomId },
    { enabled: !!roomId }
  );
  const { data: winnersData } = trpc.roll.winners.useQuery(
    { roomId },
    { enabled: !!roomId && (data?.room?.status === 'ended' || (data?.room?.status as string) === 'finished') }
  );

  const joinMutation = trpc.roll.join.useMutation({
    onSuccess: () => {
      toast.success('成功参与Roll房！');
      refetch();
      refetchJoined();
    },
    onError: (e) => toast.error(e.message),
  });

  const countdown = useCountdown(data?.room?.endAt || null);

  if (isLoading) {
    return (
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', height: '100vh', background: '#0d0621', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(133,102,255,1)', fontSize: 14 }}>加载中...</div>
      </div>
    );
  }

  if (!data?.room) {
    return (
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', height: '100vh', background: '#0d0621', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 40 }}>😕</div>
        <div style={{ color: 'rgba(133,102,255,1)', fontSize: 14 }}>Roll房不存在</div>
        <button onClick={() => navigate('/roll')} style={{ padding: '8px 20px', borderRadius: 8, background: 'rgba(120,60,220,0.3)', border: '1px solid rgba(120,60,220,0.5)', color: '#c084fc', cursor: 'pointer' }}>返回列表</button>
      </div>
    );
  }

  const { room, prizes, participants } = data;
  const isEnded = room.status === 'ended' || (room.status as string) === 'finished';
  const isJoined = joinedData?.joined;

  // 时间格式化
  const fmtTime = (t: Date | string) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const isFree = !room.threshold || parseFloat(room.threshold as string) === 0;
  const thresholdVal = parseFloat(room.threshold as string || '0').toFixed(0);

  return (
    <div
      className="phone-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: `url(${D.bgSection1})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top center',
        backgroundColor: '#0d0621',
        position: 'relative',
        containerType: 'inline-size',
        overflowX: 'hidden',
      }}
    >
      {/* 顶部固定区（不滚动）：导航栏 + 用户信息卡 */}
      <div style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
        <TopNav showLogo={false} onBackClick={() => navigate('/roll')}  onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
        {/* 用户信息卡 */}
        <PlayerInfoCard style={{ marginTop: q(18) }} />
      </div>

      {/* 内容层（flex:1，可滚动） */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>

        {/* ── section_1：顶部区域（房间信息区）── */}
        <div style={{ position: 'relative', width: '100%', flexShrink: 0 }}>

          {/* box_1：房间信息区（750×655px） */}
          <div style={{ position: 'relative', width: '100%', minHeight: q(380) }}>

            {/* 占位用（原来PlayerInfoCard的位置，现在已移到固定区） */}
            <div style={{ height: q(18) }} />

            {/* group_6：暗色背景分隔区（占位，确保容器高度足够） */}
            <div style={{ height: q(370) }} />

            {/* group_7：房间信息区（750×358px, absolute left:0 top:10） */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: q(10),
              width: '100%',
              height: q(358),
              backgroundImage: `url(${D.roomInfoBg})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
             
            }}>
              {/* block_3：房间头部信息（664×122px, margin: 41px 0 0 47px） */}
              <div style={{
                position: 'relative',
                width: q(664),
                height: q(122),
                marginTop: q(41),
                marginLeft: q(47),
              }}>
                {/* image-text_2：房间logo + 信息（494×122px, absolute left:0 top:0） */}
                <div style={{
                  position: 'absolute',
                  left: 0, top: 0,
                  width: q(494),
                  height: q(122),
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  {/* 房间logo（无背景框，放大显示） */}
                  <img
                    src={room.avatarUrl || D.roomLogo}
                    alt=""
                    style={{ width: q(160), height: q(160), objectFit: 'contain', flexShrink: 0 }}
                  />
                  {/* 房间名称 + 开奖时间（352×112px, margin-top:10） */}
                  <div style={{ width: q(352), marginTop: q(10), marginLeft: q(0) }}>
                    <span style={{
                      color: 'rgba(255,255,255,1)',
                      fontSize: q(26),
                      fontFamily: 'Alibaba-PuHuiTi-R, sans-serif',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                      lineHeight: q(34),
                    }}>{room.title}</span>
                    {/* 开奖时间（backgroundColor: rgba(86,12,150,1), height:36, margin-top:51） */}
                    <div style={{
                      backgroundColor: 'rgba(86,12,150,1)',
                      height: q(36),
                      marginTop: q(51),
                      width: q(304),
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: q(11),
                    }}>
                      <span style={{
                        color: 'rgba(255,246,13,1)',
                        fontSize: q(20),
                        fontFamily: 'Alibaba-PuHuiTi-R, sans-serif',
                        whiteSpace: 'nowrap',
                        lineHeight: q(34),
                      }}>开奖：{fmtTime(room.endAt)}</span>
                    </div>
                  </div>
                </div>

                {/* image-text_1：房间标识（110×28px, margin: 75px 0 0 146px） */}
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: q(75),
                  width: q(110),
                  height: q(28),
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: q(8),
                }}>
                  <div style={{
                    width: q(21), height: q(28),
                    backgroundImage: `url(${D.rechargeIcon})`,
                    backgroundPosition: `${q(-4)} ${q(-4)}`,
                    backgroundSize: `${q(29)} ${q(36)}`,
                    backgroundRepeat: 'no-repeat',
                  }} />
                  <span style={{
                    color: 'rgba(255,255,255,1)',
                    fontSize: q(26),
                    fontFamily: 'Alibaba-PuHuiTi-R, sans-serif',
                    whiteSpace: 'nowrap',
                    lineHeight: q(34),
                  }}>AGCS2</span>
                </div>

                {/* 查看按钮（114×44px, margin: 21px 0 0 294px） */}
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: q(21),
                  width: q(114),
                  height: q(44),
                  backgroundImage: `url(${D.viewBtn})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                  <span style={{
                    textShadow: '0px 1px 5px rgba(33,0,80,0.67)',
                    color: 'rgba(255,246,13,1)',
                    fontSize: q(22),
                    fontFamily: 'Alibaba-PuHuiTi-B, sans-serif',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    lineHeight: q(24),
                  }}>查看</span>
                </div>
              </div>

              {/* 分隔线（657×1px, margin: 25px 0 0 47px） */}
              <img src={D.divider} alt="" style={{ width: q(657), height: q(1), marginTop: q(25), marginLeft: q(47), display: 'block' }} />

              {/* block_5：充值时间+门槛（563×56px, margin: 15px 0 0 47px） */}
              <div style={{
                width: q(563),
                height: q(56),
                marginTop: q(15),
                marginLeft: q(47),
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: q(16),
              }}>
                {/* 充值标签（68×32px） */}
                <div style={{
                  backgroundColor: 'rgba(47,16,0,1)',
                  borderRadius: `${q(18)} 0px ${q(18)} 0px`,
                  height: q(32),
                  border: '1px solid rgba(255,255,255,1)',
                  width: q(68),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: q(6),
                }}>
                  <span style={{
                    color: 'rgba(255,246,13,1)',
                    fontSize: q(22),
                    fontFamily: 'Alibaba-PuHuiTi-B, sans-serif',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    lineHeight: q(34),
                  }}>充值</span>
                </div>
                {/* 时间 + 门槛 */}
                <div style={{ flex: 1 }}>
                  <span style={{
                    color: 'rgba(255,255,255,1)',
                    fontSize: q(24),
                    fontFamily: 'Alibaba-PuHuiTi-M, sans-serif',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    lineHeight: q(34),
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>{fmtTime(room.startAt)} -- {fmtTime(room.endAt)}</span>
                  <span style={{
                    color: 'rgba(80,225,255,1)',
                    fontSize: q(24),
                    fontFamily: 'Alibaba-PuHuiTi-M, sans-serif',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    lineHeight: q(34),
                    marginTop: q(9),
                    display: 'block',
                  }}>{isFree ? '无门槛' : `充值满${thresholdVal}金币`}</span>
                </div>
              </div>

              {/* block_6：统计数据（624×40px, margin: 43px 0 15px 62px） */}
              <div style={{
                width: q(624),
                height: q(40),
                marginTop: q(43),
                marginLeft: q(62),
                marginBottom: q(15),
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: q(20),
              }}>
                {/* 充值总额 */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: q(5) }}>
                  <img src={D.rechargeIcon} alt="" style={{ width: q(32), height: q(32) }} />
                  <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(26), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {parseFloat(room.totalValue as string || '0').toFixed(0)}
                  </span>
                </div>
                <img src={D.sep1} alt="" style={{ width: q(1), height: q(40) }} />
                {/* 钻石 */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: q(5) }}>
                  <img src={D.diamondIcon} alt="" style={{ width: q(32), height: q(32) }} />
                  <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(26), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {parseFloat(room.actualPaidValue as string || '0').toFixed(0)}
                  </span>
                </div>
                <img src={D.sep2} alt="" style={{ width: q(1), height: q(40) }} />
                {/* 人数 */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: q(5) }}>
                  <img src={D.peopleIcon} alt="" style={{ width: q(32), height: q(32) }} />
                  <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(26), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {room.participantCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* 背景图层：包裹 Tab栏 + 内容区，背景图拉伸到底部 */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundImage: `url(${D.prizesBg})`,
          backgroundPosition: 'center top',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          paddingBottom: q(120),
        }}>

        {/* group_10：Tab切换区 */}
        <div style={{ width: '100%', flexShrink: 0 }}>
          {/* section_2：Tab标签（750×62px） */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            height: q(62),
            backgroundColor: 'rgba(13,3,56,0.8)',
          }}>
            {/* 奖池物品 Tab */}
            <div
              onClick={() => setActiveTab('prizes')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backgroundImage: activeTab === 'prizes' ? `url(${D.tabPrizes})` : 'none',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <span style={{
                color: activeTab === 'prizes' ? 'rgba(255,246,13,1)' : 'rgba(133,102,255,1)',
                fontSize: q(28),
                fontFamily: 'Alibaba-PuHuiTi-M, sans-serif',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                lineHeight: q(34),
              }}>奖池物品</span>
            </div>
            {/* 参与人数 Tab */}
            <div
              onClick={() => setActiveTab('participants')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backgroundImage: activeTab === 'participants' ? `url(${D.tabParticipants})` : 'none',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <span style={{
                color: activeTab === 'participants' ? 'rgba(255,246,13,1)' : 'rgba(133,102,255,1)',
                fontSize: q(28),
                fontFamily: 'Alibaba-PuHuiTi-M, sans-serif',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                lineHeight: q(34),
              }}>参与人数</span>
            </div>
          </div>
        </div>

        {/* box_3：奖品/参与者内容区 */}
        <div style={{ position: 'relative', width: '100%' }}>
          {/* 奖池物品（2列网格） */}
          {activeTab === 'prizes' && (
            <div style={{
              width: q(707),
              marginLeft: q(15),
              marginTop: q(38),
              display: 'flex',
              flexWrap: 'wrap',
              gap: q(27),
            }}>
              {prizes?.length === 0 ? (
                <div style={{ width: '100%', textAlign: 'center', color: 'rgba(133,102,255,1)', fontSize: q(26), padding: `${q(60)} 0` }}>暂无奖品</div>
              ) : (
                prizes?.map((prize: any, i: number) => (
                  <PrizeCard key={prize.id} prize={prize} index={i} />
                ))
              )}
            </div>
          )}

          {/* 参与人数（网格头像） */}
          {activeTab === 'participants' && (
            <div style={{
              width: q(707),
              marginLeft: q(15),
              marginTop: q(38),
              display: 'flex',
              flexWrap: 'wrap',
            }}>
              {participants?.length === 0 ? (
                <div style={{ width: '100%', textAlign: 'center', color: 'rgba(133,102,255,1)', fontSize: q(26), padding: `${q(60)} 0` }}>暂无参与者</div>
              ) : (
                participants?.map((p: any) => (
                  <ParticipantAvatar key={p.id} p={p} />
                ))
              )}
            </div>
          )}

          {/* 中奖名单（已结束时显示） */}
          {isEnded && winnersData && winnersData.length > 0 && (
            <div style={{ width: q(707), marginLeft: q(15), marginTop: q(20) }}>
              <div style={{ color: 'rgba(255,246,13,1)', fontSize: q(28), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', marginBottom: q(16) }}>🏆 中奖名单</div>
              {winnersData.map((w: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: q(16), padding: `${q(12)} ${q(16)}`, marginBottom: q(8), borderRadius: q(10), background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}>
                  <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(26), fontWeight: 700 }}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'rgba(255,255,255,1)', fontSize: q(26), fontWeight: 600 }}>{w.nickname || `用户${w.playerId}`}</div>
                    <div style={{ color: 'rgba(133,102,255,1)', fontSize: q(22), marginTop: q(4) }}>获得：{w.prizeName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 参与按钮区（section_7/section_9 样式，position: relative，在奖品区下方） */}
        {!isEnded && (
          <div style={{
            position: 'relative',
            width: q(707),
            marginLeft: q(15),
            marginTop: q(72),
            marginBottom: q(20),
            display: 'flex',
            flexDirection: 'row',
            gap: q(27),
            flexWrap: 'wrap',
           
          }}>
            {/* 左侧参与按钮（340×62px） */}
            <div style={{
              width: q(340),
              height: q(62),
              backgroundImage: `url(${D.joinBtnBg})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              position: 'relative',
            }}>
              {/* 按钮内部（324×45px, margin: 9px 0 0 8px） */}
              <div
                onClick={() => !isJoined && !joinMutation.isPending && joinMutation.mutate({ roomId })}
                style={{
                  width: q(324),
                  height: q(45),
                  backgroundImage: `url(${D.joinBtnInner})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  margin: `${q(9)} 0 0 ${q(8)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isJoined ? 'default' : 'pointer',
                  opacity: isJoined ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: q(8) }}>
                  <img src={D.amountIcon} alt="" style={{ width: q(40), height: q(40) }} />
                  <span style={{
                    color: 'rgba(255,246,13,1)',
                    fontSize: q(28),
                    fontFamily: 'Alibaba-PuHuiTi-B, sans-serif',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    lineHeight: q(34),
                  }}>
                    {isJoined ? '已参与' : (joinMutation.isPending ? '参与中...' : '立即参与')}
                  </span>
                </div>
              </div>
            </div>

            {/* 右侧倒计时区（340×62px） */}
            <div style={{
              width: q(340),
              height: q(62),
              backgroundImage: `url(${D.joinBtnBg})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              position: 'relative',
            }}>
              <div style={{
                width: q(324),
                height: q(45),
                backgroundImage: `url(${D.joinBtnInner})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                margin: `${q(9)} 0 0 ${q(8)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{
                  color: 'rgba(255,246,13,1)',
                  fontSize: q(28),
                  fontFamily: 'Alibaba-PuHuiTi-B, sans-serif',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  lineHeight: q(34),
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: q(2),
                }}>{countdown || '计算中...'}</span>
              </div>
            </div>
          </div>
        )}

        {/* 已结束提示 */}
        {isEnded && (
          <div style={{ textAlign: 'center', color: 'rgba(133,102,255,1)', fontSize: q(26), padding: `${q(30)} 0` }}>该Roll房已结束</div>
        )}

        </div> {/* 背景图层结束 */}
      </div>

      {/* 底部导航 - absolute 定位盖在最顶层 */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        <BottomNav />
      </div>

      {/* 设置弹窗 */}
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </div>
  );
}
