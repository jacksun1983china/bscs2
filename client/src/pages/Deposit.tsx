/**
 * Deposit.tsx — 充值页面
 * 支持支付宝（第三方支付）和 USDT（OxaPay）两种支付方式
 */
import { PageSlideIn } from '@/components/PageTransition';
import { useState, useMemo, useEffect } from 'react';
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
  cardNormal: CDN + 'k3@2x_d574964f.png',
  cardSelected: CDN + 'k4@2x_d4d6b720.png',
  btnChongzhi: CDN + 'btn_chongzhi_f8c2d4a0.png',
};

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

type PayMethod = 'alipay' | 'usdt';

/* 支付宝图标 (内联SVG) */
const AlipayIcon = ({ size }: { size: string }) => (
  <svg viewBox="0 0 64 64" style={{ width: size, height: size, flexShrink: 0 }}>
    <rect width="64" height="64" rx="14" fill="#1677FF" />
    <text x="32" y="42" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="bold" fontFamily="Arial">支</text>
  </svg>
);

/* USDT图标 (内联SVG) */
const UsdtIcon = ({ size }: { size: string }) => (
  <svg viewBox="0 0 64 64" style={{ width: size, height: size, flexShrink: 0 }}>
    <circle cx="32" cy="32" r="30" fill="#26A17B" />
    <path d="M36.2 28.8v-4.6h8.6v-6.4H19.2v6.4h8.6v4.6c-7.5.3-13.2 2-13.2 4s5.7 3.7 13.2 4v14.4h8.4V36.8c7.5-.3 13.1-2 13.1-4s-5.6-3.7-13.1-4zm0 6.6v0c-.2 0-1.2.1-4.1.1-2.4 0-3.7-.1-4.3-.1v0c-6.6-.3-11.6-1.5-11.6-3s5-2.7 11.6-3v4.8c.6 0 2 .1 4.3.1 2.8 0 3.9-.1 4.1-.1v-4.8c6.6.3 11.5 1.5 11.5 3s-4.9 2.7-11.5 3z" fill="#fff"/>
  </svg>
);

export default function Deposit() {
  const [selectedAmount, setSelectedAmount] = useState<number>(200);
  const [payMethod, setPayMethod] = useState<PayMethod>('alipay');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: configsData, isLoading: configsLoading } = trpc.player.rechargeConfigs.useQuery();

  useEffect(() => {
    if (configsData && configsData.length > 0) {
      setSelectedAmount(Number(configsData[0].amount));
    }
  }, [configsData]);

  const createOrderMut = trpc.player.createRechargeOrder.useMutation();

  const amounts = useMemo(() => {
    if (configsData && configsData.length > 0) {
      return configsData.map((c: any) => ({
        amount: Number(c.amount),
        bonus: Number(c.bonusDiamond ?? 0),
        gold: Number(c.gold),
        tag: c.tag ?? '',
      }));
    }
    return [];
  }, [configsData]);

  const minAmount = useMemo(() => {
    if (amounts.length === 0) return 100;
    return Math.min(...amounts.map(a => a.amount));
  }, [amounts]);

  const maxAmount = useMemo(() => {
    if (amounts.length === 0) return 50000;
    return Math.max(...amounts.map(a => a.amount));
  }, [amounts]);

  // 处理充值点击
  const handleRecharge = async () => {
    if (isSubmitting) return;
    const config = configsData?.find((c: any) => Number(c.amount) === selectedAmount);
    if (!config) {
      toast.error('请先选择充值金额');
      return;
    }

    // USDT暂未开放提示
    if (payMethod === 'usdt') {
      toast.error('USDT支付通道即将开放，敬请期待');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createOrderMut.mutateAsync({
        configId: config.id,
        payMethod: payMethod === 'alipay' ? 'alipay' : 'usdt',
      });
      if (result.success && result.payUrl) {
        toast.success('正在跳转支付页面...');
        window.location.href = result.payUrl;
      } else if (result.success) {
        toast.success(`订单创建成功！订单号: ${result.orderNo}`);
      } else {
        toast.error('创建订单失败，请重试');
      }
    } catch (err: any) {
      const msg = err?.message || err?.data?.message || '支付服务暂时不可用，请稍后重试';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* 支付方式按钮样式 */
  const payBtnStyle = (active: boolean, color: string): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: q(10),
    padding: `${q(18)} ${q(12)}`,
    cursor: 'pointer',
    borderRadius: q(14),
    background: active
      ? `linear-gradient(135deg, ${color}30 0%, ${color}18 100%)`
      : 'rgba(255,255,255,0.05)',
    border: active
      ? `${q(2)} solid ${color}cc`
      : `${q(2)} solid rgba(255,255,255,0.1)`,
    transition: 'all 0.25s ease',
    boxShadow: active ? `0 0 16px ${color}40` : 'none',
  });

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

        {/* 顶部固定区 */}
        <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
          <TopNav showLogo={false} onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
          <PlayerInfoCard style={{ marginTop: q(8) }} />
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
          {/* 支付方式 - 两个小按钮并排 */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: q(16), padding: `${q(24)} ${q(30)} 0` }}>
            {/* 支付宝按钮 */}
            <div
              onClick={() => setPayMethod('alipay')}
              style={payBtnStyle(payMethod === 'alipay', '#1677FF')}
            >
              <AlipayIcon size={q(40)} />
              <span style={{
                color: payMethod === 'alipay' ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: q(26),
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                支付宝
              </span>
            </div>

            {/* USDT按钮 */}
            <div
              onClick={() => setPayMethod('usdt')}
              style={payBtnStyle(payMethod === 'usdt', '#26A17B')}
            >
              <UsdtIcon size={q(40)} />
              <span style={{
                color: payMethod === 'usdt' ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: q(26),
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                USDT
              </span>
            </div>
          </div>

          {/* 充值金额提示 */}
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
              <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(36), fontWeight: 700 }}>
                {payMethod === 'usdt' ? '$' : '￥'}
              </span>
              <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(46), fontWeight: 700, marginLeft: q(4) }}>
                {selectedAmount}
              </span>
            </div>
          </div>

          {/* 金额网格 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: q(14), padding: `${q(20)} ${q(30)} 0` }}>
            {configsLoading && Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                style={{
                  position: 'relative',
                  aspectRatio: '164/148',
                  borderRadius: q(12),
                  background: 'rgba(120,60,220,0.15)',
                  border: '1px solid rgba(120,60,220,0.25)',
                  animation: 'skeletonPulse 1.4s ease-in-out infinite',
                }}
              />
            ))}
            {!configsLoading && amounts.map((item, idx) => {
              const isSelected = selectedAmount === item.amount;
              const hasBonus = item.bonus > 0;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedAmount(item.amount)}
                  style={{ position: 'relative', cursor: 'pointer', aspectRatio: '164/148' }}
                >
                  <img
                    src={isSelected ? CZ.cardSelected : CZ.cardNormal}
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
                  />
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

          {/* 充值按钮 */}
          <div style={{ padding: `${q(30)} ${q(30)} 0` }}>
            <div
              style={{ position: 'relative', cursor: isSubmitting ? 'not-allowed' : 'pointer', width: '100%', opacity: isSubmitting ? 0.7 : 1 }}
              onClick={handleRecharge}
            >
              <img src={CZ.btnChongzhi} alt="充值" style={{ width: '100%', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: q(34), fontWeight: 700, letterSpacing: 2, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {isSubmitting ? '提交中...' : `充值 ${payMethod === 'usdt' ? '$' : '¥'}${selectedAmount}`}
                </span>
              </div>
            </div>
          </div>

          {/* 充值说明 */}
          <div style={{ padding: `${q(20)} ${q(30)} 0`, color: 'rgba(255,255,255,0.5)', fontSize: q(22), lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>• 充值金额将实时到账，如有问题请联系客服</p>
            <p style={{ margin: `${q(8)} 0 0` }}>• 最低充值 ¥{minAmount}，最高单笔 ¥{maxAmount}</p>
            <p style={{ margin: `${q(8)} 0 0` }}>• 充值奖励金币将在到账后自动发放</p>
            {payMethod === 'usdt' && (
              <p style={{ margin: `${q(8)} 0 0`, color: 'rgba(38,161,123,0.9)' }}>• USDT支付将跳转至加密货币支付页面完成付款</p>
            )}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
          <BottomNav active="chongzhi" />
        </div>
        <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
        <style>{`
          @keyframes skeletonPulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.9; }
          }
        `}</style>
      </div>
    </PageSlideIn>
  );
}
