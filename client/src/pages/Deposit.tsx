/**
 * Deposit.tsx — 充值页面
 * 严格还原蓝湖 lanhu_deposit 设计稿
 * 布局：TopNav → PlayerInfoCard → 支付方式 → 金额输入框 → 金额网格 → 充值按钮 → BottomNav
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import SettingsModal from '@/components/SettingsModal';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/';

const CZ = {
  pageBg: CDN + 'k2_6aa5f651.png',
  inputBg: CDN + 'k1_2fbe4f3a.png',
  cardNormal: CDN + 'k3_0858706d.png',
  cardSelected: CDN + 'k4_d774f1b4.png',
  bonus1: CDN + 'icon1_7f3b5cbe.png',
  bonus2: CDN + 'icon2_093091dc.png',
  zhifubao: CDN + 'zhifubao_044b7086.png',
  weixin: CDN + 'weixin_e2f2fba1.png',
  btnChongzhi: CDN + 'btn_chongzhi_f8c2d4a0.png',
};

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

const DEFAULT_AMOUNTS = [
  { amount: 100, bonus: 37 },
  { amount: 200, bonus: 37 },
  { amount: 300, bonus: 37 },
  { amount: 400, bonus: 37 },
  { amount: 500, bonus: 37 },
  { amount: 600, bonus: 37 },
  { amount: 800, bonus: 37 },
  { amount: 1000, bonus: 37 },
  { amount: 2000, bonus: 37 },
  { amount: 3000, bonus: 37 },
  { amount: 5000, bonus: 37 },
  { amount: 10000, bonus: 37 },
];

type PayMethod = 'zhifubao' | 'weixin';

export default function Deposit() {
  const [selectedAmount, setSelectedAmount] = useState<number>(200);
  const [payMethod, setPayMethod] = useState<PayMethod>('zhifubao');
  const [settingsVisible, setSettingsVisible] = useState(false);

  const { data: configsData } = trpc.player.rechargeConfigs.useQuery();
  const amounts = (configsData && configsData.length > 0)
    ? configsData.map((c: any) => ({ amount: Number(c.amount), bonus: Number(c.bonusDiamond ?? 0), gold: Number(c.gold), tag: c.tag ?? '' }))
    : DEFAULT_AMOUNTS;

  return (
    <div
      className="phone-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        containerType: 'inline-size',
        position: 'relative',
      }}
    >
      <img
        src={CZ.pageBg}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

        {/* 顶部固定区：TopNav + PlayerInfoCard，不随内容滚动 */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
        <TopNav showLogo={false} onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
        <div style={{ padding: `0 ${q(30)}`, marginTop: q(8) }}>
          <PlayerInfoCard />
        </div>
      </div>
      {/* 内容滚动区 */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: q(120),
        }}
      >

        {/* 支付方式 */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: q(20), padding: `${q(24)} ${q(30)} 0` }}>
          <div
            onClick={() => setPayMethod('zhifubao')}
            style={{
              flex: 1, position: 'relative', cursor: 'pointer',
              opacity: payMethod === 'zhifubao' ? 1 : 0.6, transition: 'opacity 0.2s',
              border: payMethod === 'zhifubao' ? `${q(3)} solid #06b6d4` : `${q(3)} solid transparent`,
              borderRadius: q(12), overflow: 'hidden',
            }}
          >
            <img src={CZ.zhifubao} alt="支付宝" style={{ width: '100%', display: 'block', borderRadius: q(10) }} />
          </div>
          <div
            onClick={() => setPayMethod('weixin')}
            style={{
              flex: 1, position: 'relative', cursor: 'pointer',
              opacity: payMethod === 'weixin' ? 1 : 0.6, transition: 'opacity 0.2s',
              border: payMethod === 'weixin' ? `${q(3)} solid #22c55e` : `${q(3)} solid transparent`,
              borderRadius: q(12), overflow: 'hidden',
            }}
          >
            <img src={CZ.weixin} alt="微信支付" style={{ width: '100%', display: 'block', borderRadius: q(10) }} />
          </div>
        </div>

        {/* 金额提示 */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: `${q(20)} ${q(30)} 0`, gap: q(16) }}>
          <span style={{ color: '#fff', fontSize: q(28), fontWeight: 700, whiteSpace: 'nowrap' }}>Deposit Amount</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(22), whiteSpace: 'nowrap' }}>Min:¥100 Max:¥50000</span>
        </div>

        {/* 金额输入框 */}
        <div style={{ margin: `${q(12)} ${q(30)} 0`, position: 'relative', height: q(84) }}>
          <img src={CZ.inputBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(36), fontWeight: 700 }}>￥</span>
            <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(46), fontWeight: 700, marginLeft: q(4) }}>{selectedAmount}</span>
          </div>
        </div>

        {/* 金额网格 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: q(14), padding: `${q(20)} ${q(30)} 0` }}>
          {amounts.map((item, idx) => {
            const isSelected = selectedAmount === item.amount;
            return (
              <div key={idx} onClick={() => setSelectedAmount(item.amount)} style={{ position: 'relative', cursor: 'pointer', aspectRatio: '164/148' }}>
                <img src={isSelected ? CZ.cardSelected : CZ.cardNormal} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
                <img
                  src={idx % 2 === 0 ? CZ.bonus1 : CZ.bonus2}
                  alt={`+${item.bonus}`}
                  style={{ position: 'absolute', top: q(-4), left: '50%', transform: 'translateX(-50%)', width: '72%', objectFit: 'contain', zIndex: 2 }}
                />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', paddingBottom: '18%' }}>
                  <div>
                    <span style={{ color: '#fff', fontSize: q(20), fontWeight: 700 }}>￥</span>
                    <span style={{ color: '#fff', fontSize: q(26), fontWeight: 700 }}>{item.amount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 充值按钮 */}
        <div style={{ padding: `${q(30)} ${q(30)} 0` }}>
          <div
            style={{ position: 'relative', cursor: 'pointer', width: '100%' }}
            onClick={() => alert(`即将跳转${payMethod === 'zhifubao' ? '支付宝' : '微信'}支付 ¥${selectedAmount}`)}
          >
            <img src={CZ.btnChongzhi} alt="充值" style={{ width: '100%', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: q(34), fontWeight: 700, letterSpacing: 2, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                充值 ¥{selectedAmount}
              </span>
            </div>
          </div>
        </div>

        {/* 充值说明 */}
        <div style={{ padding: `${q(20)} ${q(30)} 0`, color: 'rgba(255,255,255,0.5)', fontSize: q(22), lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>• 充值金额将实时到账，如有问题请联系客服</p>
          <p style={{ margin: `${q(8)} 0 0` }}>• 最低充值 ¥100，最高单笔 ¥50000</p>
          <p style={{ margin: `${q(8)} 0 0` }}>• 充值奖励金币将在到账后自动发放</p>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <BottomNav active="chongzhi" />
      </div>
      {/* 设置弹窗：position:absolute，受 phone-container 约束 */}
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </div>
  );
}
