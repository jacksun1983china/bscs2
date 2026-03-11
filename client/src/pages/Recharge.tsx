/**
 * Recharge.tsx — 充值页面
 * 1:1 还原设计稿：支付宝/微信 + 金额选择网格 + 充值按钮
 * 公共组件：PlayerInfoBar（用户信息）、BottomNav（底部导航）
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ASSETS } from '@/lib/assets';
import { toast } from 'sonner';
import PlayerInfoBar from '@/components/PlayerInfoBar';
import BottomNav from '@/components/BottomNav';
import TopNavComponent from '@/components/TopNav';
import SettingsModal from '@/components/SettingsModal';

type PayMethod = 'alipay' | 'wechat';

export default function Recharge() {
  const [, navigate] = useLocation();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>('alipay');
  const [selectedConfig, setSelectedConfig] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'recharge' | 'history'>('recharge');

  const { data: player } = trpc.player.me.useQuery();
  const { data: configs } = trpc.player.rechargeConfigs.useQuery();
  const { data: orders } = trpc.player.rechargeOrders.useQuery(
    { page: 1, limit: 20 },
    { enabled: activeTab === 'history' && !!player }
  );

  const selectedCfg = configs?.find((c: any) => c.id === selectedConfig);

  const handleRecharge = () => {
    if (!selectedConfig) { toast.error('请选择充值档位'); return; }
    toast.info('请联系客服完成充值，或等待支付功能上线');
  };

  if (!player) {
    return (
      <div className="phone-container" style={{ height: '100vh', background: '#0d0621', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative' }}>
        <div style={{ fontSize: 40 }}>💰</div>
        <div style={{ color: '#9980cc', fontSize: 14 }}>请先登录</div>
        <button onClick={() => navigate('/login')} style={{ padding: '10px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #c084fc)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>立即登录</button>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <BottomNav active="chongzhi" />
        </div>
      </div>
    );
  }

  return (
    <div className="phone-container" style={{ height: '100vh', position: 'relative', background: '#0d0621', overflow: 'hidden' }}>
      {/* 全局背景 */}
      <img src={ASSETS.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }} />

      {/* 主内容区 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 70, zIndex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', containerType: 'inline-size' }}>

        {/* ── 顶部导航（公共组件） ── */}
        <TopNavComponent showLogo={false} onBackClick={() => navigate('/')} onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />

        {/* ── 用户信息区（公共组件）── */}
        <PlayerInfoBar />

        {/* ── 支付方式 ── */}
        <div style={{ display: 'flex', gap: 10, padding: '8px 10px', flexShrink: 0 }}>
          <div
            onClick={() => setPayMethod('alipay')}
            style={{
              flex: 1, cursor: 'pointer', borderRadius: 10, overflow: 'hidden',
              border: payMethod === 'alipay' ? '2px solid rgba(0,160,255,0.8)' : '2px solid transparent',
              boxShadow: payMethod === 'alipay' ? '0 0 12px rgba(0,160,255,0.5)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <img src={ASSETS.cz_zhifubao} alt="支付宝" style={{ width: '100%', display: 'block' }} />
          </div>
          <div
            onClick={() => setPayMethod('wechat')}
            style={{
              flex: 1, cursor: 'pointer', borderRadius: 10, overflow: 'hidden',
              border: payMethod === 'wechat' ? '2px solid rgba(0,200,80,0.8)' : '2px solid transparent',
              boxShadow: payMethod === 'wechat' ? '0 0 12px rgba(0,200,80,0.5)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <img src={ASSETS.cz_weixin} alt="微信" style={{ width: '100%', display: 'block' }} />
          </div>
        </div>

        {/* ── 金额提示 ── */}
        <div style={{ padding: '4px 10px', color: '#e0d0ff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          Deposit Amount&nbsp;&nbsp;Min:&lt;100&nbsp;&nbsp;Max:&lt;50000
        </div>

        {/* ── 金额输入框（k1背景图）── */}
        <div style={{ margin: '4px 10px', position: 'relative', flexShrink: 0, borderRadius: 10, overflow: 'hidden' }}>
          <img src={ASSETS.cz_k1} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#ffd700', fontSize: 26, fontWeight: 900, letterSpacing: 2, textShadow: '0 0 12px rgba(255,215,0,0.6)' }}>
              {selectedCfg ? `¥ ${parseFloat(selectedCfg.amount || '0').toFixed(0)}` : '¥ 0'}
            </span>
          </div>
        </div>

        {/* ── 金额选择网格（4列）── */}
        <div style={{ padding: '6px 10px', flexShrink: 0 }}>
          {!configs?.length ? (
            <div style={{ textAlign: 'center', color: '#666', fontSize: 13, padding: '20px 0' }}>暂无充值档位</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {configs.map((cfg: any) => {
                const isSelected = selectedConfig === cfg.id;
                return (
                  <div key={cfg.id} onClick={() => setSelectedConfig(cfg.id)} style={{ position: 'relative', cursor: 'pointer' }}>
                    <div style={{
                      position: 'relative', borderRadius: 10, overflow: 'hidden',
                      border: isSelected ? '1.5px solid rgba(0,180,255,0.8)' : '1.5px solid transparent',
                      boxShadow: isSelected ? '0 0 10px rgba(0,180,255,0.4)' : 'none',
                      transition: 'all 0.15s',
                    }}>
                      <img src={isSelected ? ASSETS.cz_k4 : ASSETS.cz_k3} alt="" style={{ width: '100%', display: 'block' }} />
                      {/* 金额叠加 */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <span style={{ color: isSelected ? '#ffd700' : '#e0d0ff', fontSize: 15, fontWeight: 900, textShadow: isSelected ? '0 0 8px rgba(255,215,0,0.7)' : 'none' }}>
                          ¥{parseFloat(cfg.amount || '0').toFixed(0)}
                        </span>
                        {parseFloat(cfg.bonusDiamond || '0') > 0 && (
                          <span style={{ color: '#7df9ff', fontSize: 10 }}>+{parseFloat(cfg.bonusDiamond).toFixed(0)}钻</span>
                        )}
                      </div>
                    </div>
                    {/* 角标 */}
                    {cfg.tag && (
                      <div style={{ position: 'absolute', top: -6, right: -2, zIndex: 10 }}>
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={ASSETS.cz_icon1} alt="" style={{ height: 18, objectFit: 'contain' }} />
                          <span style={{ position: 'absolute', color: '#fff', fontSize: 9, fontWeight: 900 }}>{cfg.tag}</span>
                        </div>
                      </div>
                    )}
                    {cfg.isFirstRecharge === 1 && (
                      <div style={{ position: 'absolute', top: -6, left: -2, zIndex: 10, background: 'linear-gradient(135deg, #7c3aed, #c084fc)', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 700, color: '#fff' }}>首充</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 充值按钮（btn_chongzhi）── */}
        <div style={{ padding: '10px 10px 6px', flexShrink: 0 }}>
          <div onClick={handleRecharge} style={{ position: 'relative', cursor: selectedConfig ? 'pointer' : 'not-allowed', opacity: selectedConfig ? 1 : 0.5, borderRadius: 10, overflow: 'hidden', transition: 'opacity 0.2s' }}>
            <img src={ASSETS.cz_btn} alt="充值" style={{ width: '100%', display: 'block' }} />
          </div>
        </div>

        {/* ── 充值记录 Tab ── */}
        <div style={{ padding: '4px 10px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', background: 'rgba(20,8,50,0.6)', borderRadius: 10, padding: 3, border: '1px solid rgba(120,60,220,0.2)' }}>
            {(['recharge', 'history'] as const).map(tab => (
              <div key={tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: activeTab === tab ? 'linear-gradient(135deg, #7c3aed, #c084fc)' : 'transparent',
                color: activeTab === tab ? '#fff' : '#9980cc', transition: 'all 0.2s',
              }}>
                {tab === 'recharge' ? '充值' : '记录'}
              </div>
            ))}
          </div>
        </div>

        {/* ── 充值记录列表 ── */}
        {activeTab === 'history' && (
          <div style={{ padding: '8px 10px' }}>
            {!orders?.list?.length ? (
              <div style={{ textAlign: 'center', color: '#666', fontSize: 13, padding: '20px 0' }}>暂无充值记录</div>
            ) : (
              orders.list.map((order: any) => (
                <div key={order.id} style={{ marginBottom: 8, padding: '12px', borderRadius: 10, background: 'rgba(20,8,50,0.7)', border: '1px solid rgba(120,60,220,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#ffd700', fontSize: 14, fontWeight: 600 }}>+{parseFloat(order.gold || '0').toFixed(0)} 金币</div>
                      <div style={{ color: '#9980cc', fontSize: 11, marginTop: 2 }}>¥{parseFloat(order.amount || '0').toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: order.status === 'paid' ? '#7df9ff' : '#f97316', fontSize: 12, fontWeight: 600 }}>{order.status === 'paid' ? '已完成' : '待支付'}</div>
                      <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{new Date(order.createdAt).toLocaleDateString('zh-CN')}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div style={{ height: 12 }} />
      </div>

      {/* ── 底部导航（公共组件）── */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 }}>
        <BottomNav active="chongzhi" />
      </div>
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </div>
  );
}
