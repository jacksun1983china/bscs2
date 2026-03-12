/**
 * Deposit.tsx — 充值页面
 * 调整内容：
 * 1. K3/K4图片替换为新版（k3@2x / k4@2x）
 * 2. 橙色赠送框移到右上角，缩小宽度
 * 3. 框内金额文字放大居中
 * 4. 赠送为0时不显示橙色框
 * 5. 去掉闪烁硬编码
 * 6. 汉化英文文字
 * 7. 最小/最大金额从后台读取
 */
import { PageSlideIn } from '@/components/PageTransition';
import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import SettingsModal from '@/components/SettingsModal';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/';

const CZ = {
  pageBg: CDN + 'k2_6aa5f651.png',
  inputBg: CDN + 'k1_2fbe4f3a.png',
  // 新版卡片图片（k3@2x=普通, k4@2x=选中）
  cardNormal: CDN + 'k3@2x_d574964f.png',
  cardSelected: CDN + 'k4@2x_d4d6b720.png',
  zhifubao: CDN + 'zhifubao_044b7086.png',
  weixin: CDN + 'weixin_e2f2fba1.png',
  btnChongzhi: CDN + 'btn_chongzhi_f8c2d4a0.png',
};

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

const DEFAULT_AMOUNTS = [
  { amount: 100, bonus: 37, gold: 100 },
  { amount: 200, bonus: 37, gold: 200 },
  { amount: 300, bonus: 37, gold: 300 },
  { amount: 400, bonus: 37, gold: 400 },
  { amount: 500, bonus: 37, gold: 500 },
  { amount: 600, bonus: 37, gold: 600 },
  { amount: 800, bonus: 37, gold: 800 },
  { amount: 1000, bonus: 37, gold: 1000 },
  { amount: 2000, bonus: 0, gold: 2000 },
  { amount: 3000, bonus: 0, gold: 3000 },
  { amount: 5000, bonus: 0, gold: 5000 },
  { amount: 10000, bonus: 0, gold: 10000 },
];

type PayMethod = 'zhifubao' | 'weixin';

export default function Deposit() {
  const [selectedAmount, setSelectedAmount] = useState<number>(200);
  const [payMethod, setPayMethod] = useState<PayMethod>('zhifubao');
  const [settingsVisible, setSettingsVisible] = useState(false);

  const { data: configsData } = trpc.player.rechargeConfigs.useQuery();
  const [orderResult, setOrderResult] = useState<{ orderNo: string; amount: number; gold: number } | null>(null);

  const createOrderMut = trpc.player.createRechargeOrder.useMutation({
    onSuccess: (data) => {
      setOrderResult(data);
      toast.success(`订单创建成功！订单号: ${data.orderNo}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const amounts = useMemo(() => {
    if (configsData && configsData.length > 0) {
      return configsData.map((c: any) => ({
        amount: Number(c.amount),
        bonus: Number(c.bonusDiamond ?? 0),
        gold: Number(c.gold),
        tag: c.tag ?? '',
      }));
    }
    return DEFAULT_AMOUNTS;
  }, [configsData]);

  // 从档位中动态计算最小/最大金额
  const minAmount = useMemo(() => {
    if (amounts.length === 0) return 100;
    return Math.min(...amounts.map(a => a.amount));
  }, [amounts]);

  const maxAmount = useMemo(() => {
    if (amounts.length === 0) return 50000;
    return Math.max(...amounts.map(a => a.amount));
  }, [amounts]);

  return (
<PageSlideIn>
        <div
      className="phone-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        containerType: 'inline-size',
        position: 'relative',
        background: '#0d0621',
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

      {/* 顶部固定区：TopNav + PlayerInfoCard */}
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

        {/* 充值金额提示（汉化） */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: `${q(20)} ${q(30)} 0`, gap: q(16) }}>
          <span style={{ color: '#fff', fontSize: q(28), fontWeight: 700, whiteSpace: 'nowrap' }}>充值金额</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(22), whiteSpace: 'nowrap' }}>
            最低：¥{minAmount}&nbsp;&nbsp;最高：¥{maxAmount}
          </span>
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
            const hasBonus = item.bonus > 0;
            return (
              <div
                key={idx}
                onClick={() => setSelectedAmount(item.amount)}
                style={{ position: 'relative', cursor: 'pointer', aspectRatio: '164/148' }}
              >
                {/* 卡片背景图 */}
                <img
                  src={isSelected ? CZ.cardSelected : CZ.cardNormal}
                  alt=""
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
                />

                {/* 右上角赠送角标（bonus>0才显示） */}
                {hasBonus && (
                  <div
                    style={{
                      position: 'absolute',
                      top: q(-6),
                      right: q(-6),
                      zIndex: 3,
                      background: 'linear-gradient(135deg, #ff8c00 0%, #ff4500 100%)',
                      borderRadius: q(20),
                      padding: `${q(3)} ${q(8)}`,
                      minWidth: q(44),
                      textAlign: 'center',
                      boxShadow: '0 2px 6px rgba(255,80,0,0.5)',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: q(18), fontWeight: 700, whiteSpace: 'nowrap' }}>
                      +{item.bonus}
                    </span>
                  </div>
                )}

                {/* 卡片内容：金额居中放大 */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: q(2) }}>
                    <span style={{ color: isSelected ? '#ffe066' : '#fff', fontSize: q(20), fontWeight: 700 }}>¥</span>
                    <span style={{ color: isSelected ? '#ffe066' : '#fff', fontSize: q(30), fontWeight: 900 }}>
                      {item.amount >= 1000 ? `${item.amount / 1000}k` : item.amount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 充値按鈕 */}
        <div style={{ padding: `${q(30)} ${q(30)} 0` }}>
          <div
            style={{ position: 'relative', cursor: createOrderMut.isPending ? 'not-allowed' : 'pointer', width: '100%', opacity: createOrderMut.isPending ? 0.7 : 1 }}
            onClick={() => {
              if (createOrderMut.isPending) return;
              // 找到对应的充値配置 ID
              const config = configsData?.find((c: any) => Number(c.amount) === selectedAmount);
              if (!config) {
                toast.error('请先选择充値金额');
                return;
              }
              createOrderMut.mutate({
                configId: config.id,
                payMethod: payMethod === 'zhifubao' ? 'alipay' : 'wechat',
              });
            }}
          >
            <img src={CZ.btnChongzhi} alt="充値" style={{ width: '100%', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: q(34), fontWeight: 700, letterSpacing: 2, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {createOrderMut.isPending ? '提交中...' : `充値 ¥${selectedAmount}`}
              </span>
            </div>
          </div>
        </div>

        {/* 订单创建成功提示 */}
        {orderResult && (
          <div style={{ margin: `${q(20)} ${q(30)} 0`, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: q(12), padding: q(20) }}>
            <div style={{ color: '#10b981', fontSize: q(26), fontWeight: 700, marginBottom: q(8) }}>✓ 订单已提交，等待审批</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(22) }}>订单号：{orderResult.orderNo}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(22), marginTop: q(4) }}>充値金额：¥{orderResult.amount} （将获得 {orderResult.gold} 金币）</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: q(20), marginTop: q(8) }}>管理员审批后金币将自动到账</div>
            <button
              onClick={() => setOrderResult(null)}
              style={{ marginTop: q(12), padding: `${q(8)} ${q(20)}`, borderRadius: q(8), background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: q(22) }}
            >继续充値</button>
          </div>
        )}

        {/* 充值说明 */}
        <div style={{ padding: `${q(20)} ${q(30)} 0`, color: 'rgba(255,255,255,0.5)', fontSize: q(22), lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>• 充值金额将实时到账，如有问题请联系客服</p>
          <p style={{ margin: `${q(8)} 0 0` }}>• 最低充值 ¥{minAmount}，最高单笔 ¥{maxAmount}</p>
          <p style={{ margin: `${q(8)} 0 0` }}>• 充值奖励金币将在到账后自动发放</p>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <BottomNav active="chongzhi" />
      </div>
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </div>
    </PageSlideIn>
  );
}
