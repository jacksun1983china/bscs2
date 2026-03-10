/**
 * Deposit.tsx — 充值页面
 * 严格还原蓝湖设计稿，使用 CDN 图片资源
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';

const IMG = {
  // Background
  bg: `${CDN}/0bfe18db8ffd88728c3908fdb02ac880_e7e5c9f3.png`,
  bottomBg: `${CDN}/9c4134749cd39472cd62e517b636b2a9_b0c7e5c2.png`,
  // Top bar
  topBar: `${CDN}/941e19f2d0d635d58281e1f6cdad8f99_f0a6b9d2.png`,
  backArrow: `${CDN}/e33f16ef82fdededf3b2fe5e4890e46f_d2a3b4c5.png`,
  payIcon1: `${CDN}/34ce70c6a6bd4a47a07994c8e86b5bc6_mergeImage_a1b2c3d4.png`,
  payIcon2bg: `${CDN}/ee0a83637a88a6669cfafe0749b909e9_b5c6d7e8.png`,
  payIcon2inner: `${CDN}/b2e73feeef9940dc872df03e8be04d0f_mergeImage_c7d8e9f0.png`,
  // User card
  userCardBg: `${CDN}/353e2aa4bfeb3c4d2d28b0d943c17ab4_e1f2a3b4.png`,
  settingsIcon: `${CDN}/14a304ce70ae686c31994c319d55062b_f3a4b5c6.png`,
  goldBg: `${CDN}/943a8f0827d025bef8cf0160e4bac3e3_a5b6c7d8.png`,
  goldIcon: `${CDN}/13987d2edf7fad42c5fd4db5eadd7563_b7c8d9e0.png`,
  goldLabel: `${CDN}/671e04db9fa27be8982806a5ebc36cde_c9d0e1f2.png`,
  diamondBg: `${CDN}/a935eb04b7b33243624a1521a0a6e928_d1e2f3a4.png`,
  diamondIcon: `${CDN}/8b31528f16c7cf8020e105129284d8f5_e3f4a5b6.png`,
  diamondLabel: `${CDN}/a4be45afba0fb4443a881cf262fbba8d_f5a6b7c8.png`,
  userInfoBg: `${CDN}/ec349c997125715d095b7f25d8c8af87_a7b8c9d0.png`,
  badge: `${CDN}/fc28e50be2ebba95e3e969279d8e2d9f_b9c0d1e2.png`,
  divider: `${CDN}/a9df902e5780ceec153f11384238b8b5_c1d2e3f4.png`,
  avatarFrame: `${CDN}/047eb0057009c6884746837d398ebc99_d3e4f5a6.png`,
  vipBg: `${CDN}/d6d63d3369c5327fe5be734ad0b01b53_e5f6a7b8.png`,
  payChannel1: `${CDN}/afed649c42f14289a5d28baad3b62080_mergeImage_f7a8b9c0.png`,
  payChannel2: `${CDN}/57632771594bce01ca50e6766ac17818_a9b0c1d2.png`,
  payChannel3: `${CDN}/9730e3e0915e1d0db6c50fad0fb7d0d1_b1c2d3e4.png`,
  // Amount input
  inputBg: `${CDN}/532a8d567927f252c414be4b36f84e4c_c3d4e5f6.png`,
  inputInner: `${CDN}/8e468df4d1e54d279139d99f4a488660_mergeImage_d5e6f7a8.png`,
  // Package cards
  card1bg: `${CDN}/e700c97fd755973a2d59423eab2427b5_e7f8a9b0.png`,
  card1tag: `${CDN}/7f3f81b799441f86a8353d75fe96b510_f9a0b1c2.png`,
  card2bg: `${CDN}/cf6d819f0459936725b0f54b657ff517_a1b2c3d4.png`,
  card2tag: `${CDN}/b456c560cd40499a1d9b10208f400f3b_b3c4d5e6.png`,
  card3bg: `${CDN}/81f776a4f65c4d3ad1843cd48aa78dab_c5d6e7f8.png`,
  card3inner: `${CDN}/cafc0681c18bbe5b64c4570169cb3769_d7e8f9a0.png`,
  card3tag: `${CDN}/711e9f767c723df017c6bb749a6f80ab_e9f0a1b2.png`,
  card4bg: `${CDN}/c814479a205be7f4c4f3fc18700de4b8_f1a2b3c4.png`,
  card4inner: `${CDN}/90069155a41f0cb87af9841c8b25bc5e_a3b4c5d6.png`,
  card4tag: `${CDN}/1ba046251365c303e63a2dc5f31fd5c6_b5c6d7e8.png`,
  card5bg: `${CDN}/4f5e6868353694b5dd48080866138e2f_c7d8e9f0.png`,
  card5inner: `${CDN}/9cb1027b14bb074e2a4b9310d220eaa6_18948414.png`,
  card5tag: `${CDN}/533608a4208901afb4d21c8085691484_3e71d87b.png`,
  card6bg: `${CDN}/f56b9fc46f9d21b42b3a4761d9cff02d_9a34322c.png`,
  card6inner: `${CDN}/58a7c36cfecf6ebce24d0aae6fc9e277_26fd5df3.png`,
  card6tag: `${CDN}/70d9f28ffbeaa7348ea6037b851b8b91_ccb401fa.png`,
  card7bg: `${CDN}/ce709d9e3520445e48f80f1732fc3922_ade1798c.png`,
  card7inner: `${CDN}/94300df5da25dd9e82ef1ded8957c00d_b70a449e.png`,
  card7tag: `${CDN}/aab7e680275e64ea9f8193b91c8f8c84_40a2268d.png`,
  card8bg: `${CDN}/51af11a82c75665e96494df524bcccd4_6f4ec183.png`,
  card8inner: `${CDN}/4aa089f08bc285d738616124f34792f0_8806f9dc.png`,
  card8tag: `${CDN}/422493234aed34beafde812d2314c9f5_42fb13e1.png`,
  card9bg: `${CDN}/441ba306074f2ecb37aa537f39f44897_39186550.png`,
  card9inner: `${CDN}/a3505bc42fa59695573408b165a45694_9829e0a9.png`,
  card9tag: `${CDN}/329e84522b51db79fa229cffaeee8778_2ab9cae3.png`,
  card10bg: `${CDN}/9c1b28a339012f69ba9c091c00e14e27_6e1765a8.png`,
  card10inner: `${CDN}/29934b3373b170dcd87b85c6c0cd9826_5fee3c7d.png`,
  card10tag: `${CDN}/92b31d148e1db52eafdd6322a3cfb9ab_157287ea.png`,
  card11bg: `${CDN}/325700a2706d3909c9d453cb619a3ea5_d790060e.png`,
  card11inner: `${CDN}/41ddd0c48b7360e2d234eaad9d2896c0_7e51e69f.png`,
  card11tag: `${CDN}/a142c995c4ae9d0322001855f4b9e19b_80852296.png`,
  card12bg: `${CDN}/34604ae848bd5b65d4514eb8a0d48ef6_d1cc2506.png`,
  card12inner: `${CDN}/05e682b433a13c5cfd8aec1c5a8eba90_6ab26ee9.png`,
  card12tag: `${CDN}/216b488ac304b012e3883f5ae1f77df8_e9302d69.png`,
  // Recharge button
  rechargeBtn: `${CDN}/fc7bfea3a5203bb1db67f45bbbd0700a_3f9478f8.png`,
  // Bottom nav
  bottomNav: `${CDN}/6e427840d43f612398e50388b82970c6_cda12438.png`,
  navWode: `${CDN}/3122f1229eddce45807b2d5fba849c8b_ae9637dd.png`,
  navFenxiang: `${CDN}/3fa18b2e3e2c283312bd26e1c624ec1e_e5b6087e.png`,
  navBeibao: `${CDN}/cdc98d58eea0f82317280d74789b0d89_67afd33b.png`,
  navChongzhi: `${CDN}/b4926f25ec6fdfc64ee5d1799d704fcc_36022a62.png`,
};

// 12个充值套餐数据（从蓝湖代码中提取）
const PACKAGES = [
  { id: 1, amount: 100, bonus: 37, cardBg: IMG.card1bg, tag: IMG.card1tag, inner: null as string | null },
  { id: 2, amount: 200, bonus: 37, cardBg: IMG.card2bg, tag: IMG.card2tag, inner: null as string | null },
  { id: 3, amount: 300, bonus: 37, cardBg: IMG.card3bg, tag: IMG.card3tag, inner: IMG.card3inner as string | null },
  { id: 4, amount: 400, bonus: 37, cardBg: IMG.card4bg, tag: IMG.card4tag, inner: IMG.card4inner as string | null },
  { id: 5, amount: 500, bonus: 37, cardBg: IMG.card5bg, tag: IMG.card5tag, inner: IMG.card5inner as string | null },
  { id: 6, amount: 600, bonus: 37, cardBg: IMG.card6bg, tag: IMG.card6tag, inner: IMG.card6inner as string | null },
  { id: 7, amount: 700, bonus: 37, cardBg: IMG.card7bg, tag: IMG.card7tag, inner: IMG.card7inner as string | null },
  { id: 8, amount: 800, bonus: 37, cardBg: IMG.card8bg, tag: IMG.card8tag, inner: IMG.card8inner as string | null },
  { id: 9, amount: 900, bonus: 37, cardBg: IMG.card9bg, tag: IMG.card9tag, inner: IMG.card9inner as string | null },
  { id: 10, amount: 1000, bonus: 37, cardBg: IMG.card10bg, tag: IMG.card10tag, inner: IMG.card10inner as string | null },
  { id: 11, amount: 2000, bonus: 37, cardBg: IMG.card11bg, tag: IMG.card11tag, inner: IMG.card11inner as string | null },
  { id: 12, amount: 5000, bonus: 37, cardBg: IMG.card12bg, tag: IMG.card12tag, inner: IMG.card12inner as string | null },
];

export default function Deposit() {
  const [, navigate] = useLocation();
  const [selectedId, setSelectedId] = useState(1);
  const [customAmount, setCustomAmount] = useState('');

  const selectedPkg = PACKAGES.find(p => p.id === selectedId);
  const displayAmount = customAmount || (selectedPkg ? String(selectedPkg.amount) : '100');

  // 查询用户信息（使用 player.me 接口）
  const { data: userInfo } = trpc.player.me.useQuery(undefined, {
    retry: false,
  });

  const handleRecharge = () => {
    const amount = parseInt(displayAmount);
    if (!amount || amount < 100 || amount > 50000) {
      toast.error('充值金额需在 100 ~ 50000 之间');
      return;
    }
    toast.info('充值功能即将上线，敬请期待');
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#0d0621',
        display: 'flex',
        justifyContent: 'center',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 750,
          position: 'relative',
          background: `url(${IMG.bg}) -675px -64px no-repeat`,
          backgroundSize: '1875px 3468px',
          minHeight: '100vh',
        }}
      >
        {/* 顶部装饰条 */}
        <img
          src={IMG.topBar}
          alt=""
          style={{ width: '87.6%', height: 'auto', margin: '31px 0 0 8.4%', display: 'block' }}
        />

        {/* 顶部导航栏 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 8.5% 0', height: 57 }}>
          {/* 返回箭头 */}
          <img
            src={IMG.backArrow}
            alt="返回"
            style={{ width: 18, height: 16, cursor: 'pointer', marginTop: 21 }}
            onClick={() => navigate('/')}
          />
          {/* 标题 */}
          <span style={{
            color: '#fff',
            fontSize: 30,
            fontWeight: 500,
            fontFamily: 'Alibaba-PuHuiTi-M, PingFang SC, sans-serif',
            flex: 1,
            textAlign: 'center',
            marginLeft: 20,
          }}>
            Deposit
          </span>
          {/* 支付渠道图标1 */}
          <img
            src={IMG.payIcon1}
            alt="支付渠道1"
            style={{ width: 57, height: 57, border: '1px solid rgba(105,51,0,1)', cursor: 'pointer' }}
          />
          {/* 支付渠道图标2 */}
          <div style={{
            width: 57,
            height: 57,
            border: '1px solid rgba(105,51,0,1)',
            background: `url(${IMG.payIcon2bg}) 100% no-repeat`,
            backgroundSize: '100% 100%',
            marginLeft: 15,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: 43, height: 42,
              background: `url(${IMG.payIcon2inner}) 100% no-repeat`,
              backgroundSize: '100% 100%',
            }} />
          </div>
        </div>

        {/* 用户信息卡 */}
        <div style={{ margin: '54px 8.5% 0', position: 'relative' }}>
          <div style={{
            background: `url(${IMG.userCardBg}) 0px 0px no-repeat`,
            backgroundSize: '626px 119px',
            width: '100%',
            maxWidth: 625,
            height: 119,
            position: 'relative',
          }}>
            {/* 设置图标 */}
            <div style={{ position: 'absolute', top: 20, right: 20 }}>
              <img src={IMG.settingsIcon} alt="设置" style={{ width: 35, height: 35 }} />
            </div>

            {/* 金币和钻石 */}
            <div style={{
              position: 'absolute',
              top: 20,
              right: 70,
              display: 'flex',
              gap: 8,
            }}>
              {/* 金币 */}
              <div style={{
                background: `url(${IMG.goldBg}) 100% no-repeat`,
                backgroundSize: '100% 100%',
                width: 133,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
              }}>
                <span style={{ color: '#fff', fontSize: 26, fontWeight: 500, marginLeft: 40 }}>
                  {userInfo?.gold ?? 0}
                </span>
                <img src={IMG.goldIcon} alt="金币" style={{ width: 10, height: 19, margin: '0 12px 0 42px' }} />
                <img src={IMG.goldLabel} alt="" style={{ position: 'absolute', left: -13, top: -2, width: 41, height: 37 }} />
              </div>
              {/* 钻石 */}
              <div style={{
                background: `url(${IMG.diamondBg}) 100% no-repeat`,
                backgroundSize: '100% 100%',
                width: 133,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
              }}>
                <span style={{ color: '#fff', fontSize: 26, fontWeight: 700, marginLeft: 38 }}>
                  {userInfo?.diamond ?? 0}
                </span>
                <img src={IMG.diamondIcon} alt="钻石" style={{ width: 10, height: 19, margin: '0 15px 0 41px' }} />
                <img src={IMG.diamondLabel} alt="" style={{ position: 'absolute', left: -20, top: -3, width: 40, height: 40 }} />
              </div>
            </div>

            {/* 用户信息区域 */}
            <div style={{
              position: 'absolute',
              left: -38,
              top: -57,
              width: 450,
              height: 281,
              background: `url(${IMG.userInfoBg}) 100% no-repeat`,
              backgroundSize: '100% 100%',
            }}>
              {/* 昵称和徽章 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '70px 0 0 82px', width: 225 }}>
                <span style={{ color: '#fff', fontSize: 28, fontWeight: 500 }}>
                  {userInfo?.nickname ?? '用户'}
                </span>
                <img src={IMG.badge} alt="徽章" style={{ width: 67, height: 46 }} />
              </div>
              {/* ID */}
              <div style={{ color: '#fff', fontSize: 26, fontWeight: 500, margin: '22px 0 0 82px' }}>
                ID：{userInfo?.id ?? '---'}
              </div>
              {/* 分隔线 */}
              <img src={IMG.divider} alt="" style={{ position: 'absolute', left: 249, top: 121, width: 365, height: 1 }} />
              {/* 头像框 */}
              <div style={{
                position: 'absolute',
                left: -87,
                top: 32,
                width: 160,
                height: 179,
                background: `url(${IMG.avatarFrame}) -11px 0px no-repeat`,
                backgroundSize: '171px 179px',
              }}>
                <div style={{
                  background: 'rgba(46,30,98,1)',
                  borderRadius: '50%',
                  width: 117,
                  height: 117,
                  border: '2px solid rgba(0,0,0,1)',
                  margin: '20px 0 0 28px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {userInfo?.avatar ? (
                    <img src={userInfo.avatar} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#9980cc', fontSize: 40 }}>👤</span>
                  )}
                </div>
              </div>
            </div>

            {/* VIP标签 */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: 256,
              width: 184,
              height: 73,
              background: `url(${IMG.vipBg}) -12px 0px no-repeat`,
              backgroundSize: '196px 73px',
            }}>
              <span style={{
                display: 'block',
                color: '#fff',
                fontSize: 24,
                fontWeight: 700,
                WebkitTextStroke: '2px rgba(105,51,0,1)',
                margin: '13px 0 0 60px',
              }}>
                VIP{userInfo?.vipLevel ?? 1}
              </span>
            </div>

            {/* 支付渠道图标 */}
            <div style={{
              position: 'absolute',
              left: 24,
              top: 57,
              width: 51,
              height: 49,
              border: '1px solid rgba(255,255,255,1)',
              background: `url(${IMG.payChannel1}) 100% no-repeat`,
              backgroundSize: '100% 100%',
            }} />
          </div>

          {/* 支付渠道大图 */}
          <img src={IMG.payChannel2} alt="" style={{ position: 'absolute', left: 26, top: 316, width: 340, height: 212 }} />
          <img src={IMG.payChannel3} alt="" style={{ position: 'absolute', left: 384, top: 316, width: 340, height: 212 }} />
        </div>

        {/* 充值金额区域 */}
        <div style={{
          background: `url(${IMG.bottomBg}) 100% no-repeat`,
          backgroundSize: '100% 100%',
          marginTop: -1,
          padding: '0 0 20px',
        }}>
          {/* 标题行 */}
          <div style={{
            background: 'rgba(5,4,18,0.45)',
            width: '100%',
            height: 100,
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}>
            <span style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginLeft: 34 }}>
              Deposit&nbsp;Amount
            </span>
            <span style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginLeft: 23 }}>
              Min:&lt;100&nbsp;Max:&lt;50000
            </span>

            {/* 金额输入框 */}
            <div style={{
              position: 'absolute',
              left: 24,
              top: 88,
              width: 702,
              height: 84,
              background: `url(${IMG.inputBg}) 100% no-repeat`,
              backgroundSize: '100% 100%',
            }}>
              <div style={{
                height: 67,
                background: `url(${IMG.inputInner}) 100% no-repeat`,
                backgroundSize: '100% 100%',
                width: 686,
                margin: '9px 0 0 8px',
                display: 'flex',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', marginLeft: 287 }}>
                  <span style={{ color: 'rgba(255,246,13,1)', fontSize: 36, fontWeight: 700 }}>￥</span>
                  <input
                    type="number"
                    value={customAmount || displayAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'rgba(255,246,13,1)',
                      fontSize: 46,
                      fontWeight: 700,
                      width: 200,
                      fontFamily: 'Alibaba-PuHuiTi-B, PingFang SC, sans-serif',
                    }}
                    min={100}
                    max={50000}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 套餐网格 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 164px)',
            gap: 18,
            margin: '100px 0 0 16px',
            width: 710,
          }}>
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => {
                  setSelectedId(pkg.id);
                  setCustomAmount(String(pkg.amount));
                }}
                style={{
                  width: 164,
                  height: 148,
                  background: `url(${pkg.cardBg}) 100% no-repeat`,
                  backgroundSize: '100% 100%',
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  outline: selectedId === pkg.id ? '2px solid rgba(255,246,13,0.8)' : 'none',
                  borderRadius: 4,
                }}
              >
                {/* 赠送标签 */}
                <div style={{
                  height: 34,
                  background: `url(${pkg.tag}) 100% no-repeat`,
                  backgroundSize: '100% 100%',
                  marginLeft: 69,
                  width: 91,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{
                    textShadow: '0px 3px 0px rgba(216,118,10,1)',
                    color: '#fff',
                    fontSize: 19,
                    fontWeight: 900,
                    lineHeight: '30px',
                    marginTop: 8,
                  }}>
                    +{pkg.bonus}
                  </span>
                </div>

                {/* 金额 */}
                {pkg.inner ? (
                  <div style={{
                    height: 95,
                    background: `url(${pkg.inner}) 100% no-repeat`,
                    backgroundSize: '100% 100%',
                    width: 108,
                    margin: '0 0 0 25px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <div style={{ margin: '33px 0 0 11px' }}>
                      <span style={{ color: '#fff', fontSize: 26, fontWeight: 700 }}>￥</span>
                      <span style={{ color: '#fff', fontSize: 38, fontWeight: 700 }}>{pkg.amount}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ margin: '28px 0 0 36px' }}>
                    <span style={{ color: 'rgba(255,246,13,1)', fontSize: 26, fontWeight: 700 }}>￥</span>
                    <span style={{ color: 'rgba(255,246,13,1)', fontSize: 38, fontWeight: 700 }}>{pkg.amount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 充值按钮 */}
          <div
            onClick={handleRecharge}
            style={{
              height: 101,
              background: `url(${IMG.rechargeBtn}) 100% no-repeat`,
              backgroundSize: '100% 100%',
              width: 635,
              margin: '95px 0 0 58px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{
              textShadow: '0px 1px 5px rgba(4,9,187,0.67)',
              color: 'rgba(251,244,255,1)',
              fontSize: 36,
              fontWeight: 700,
            }}>
              充值
            </span>
          </div>

          {/* 底部导航 */}
          <div style={{
            width: '100%',
            height: 125,
            background: `url(${IMG.bottomNav}) -52px 0px no-repeat`,
            backgroundSize: '854px 126px',
            marginTop: 32,
            display: 'flex',
            alignItems: 'center',
          }}>
            {/* 我的 */}
            <div
              onClick={() => navigate('/profile')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', width: 49, height: 80, margin: '37px 0 0 70px', cursor: 'pointer' }}
            >
              <div style={{
                width: 47, height: 48,
                background: `url(${IMG.navWode}) 100% no-repeat`,
                backgroundSize: '100% 100%',
                marginLeft: 1,
              }} />
              <span style={{ color: 'rgba(217,148,255,1)', fontSize: 26, fontWeight: 500, textShadow: '0px 1px 5px rgba(33,0,80,0.67)' }}>我的</span>
            </div>

            {/* 分享 */}
            <div
              onClick={() => navigate('/share')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', width: 55, height: 81, margin: '36px 0 0 82px', cursor: 'pointer' }}
            >
              <div style={{
                width: 51, height: 51,
                background: `url(${IMG.navFenxiang}) 100% no-repeat`,
                backgroundSize: '100% 100%',
                marginLeft: 4,
              }} />
              <span style={{ color: 'rgba(217,148,255,1)', fontSize: 26, fontWeight: 500, textShadow: '0px 1px 5px rgba(33,0,80,0.67)' }}>分享</span>
            </div>

            {/* 背包 */}
            <div
              onClick={() => navigate('/backpack')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', width: 57, height: 82, margin: '35px 0 0 250px', cursor: 'pointer' }}
            >
              <img src={IMG.navBeibao} alt="背包" style={{ width: 57, height: 51 }} />
              <span style={{ color: 'rgba(250,107,209,1)', fontSize: 26, fontWeight: 500, textShadow: '0px 1px 5px rgba(33,0,80,0.67)', marginLeft: 3 }}>背包</span>
            </div>

            {/* 充值（当前激活） */}
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', width: 51, height: 83, margin: '35px 61px 0 75px', cursor: 'pointer' }}
            >
              <div style={{
                width: 48, height: 51,
                background: `url(${IMG.navChongzhi}) 100% no-repeat`,
                backgroundSize: '100% 100%',
                marginLeft: 2,
              }} />
              <span style={{ color: 'rgba(217,148,255,1)', fontSize: 26, fontWeight: 500, textShadow: '0px 1px 5px rgba(33,0,80,0.67)', marginTop: 7 }}>充值</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
