/**
 * Recharge.tsx — 充值页面
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ASSETS } from '@/lib/assets';
import { toast } from 'sonner';

const TAB_ITEMS = [
  { key: 'wode',     icon: ASSETS.wode,     label: '我的',   route: '/profile' },
  { key: 'fenxiang', icon: ASSETS.fenxiang, label: '分享',   route: '/share' },
  { key: 'dating',   icon: ASSETS.dating,   label: '大厅',   route: '/',       isCenter: true },
  { key: 'beibao',   icon: ASSETS.beibao,   label: '背包',   route: '/bag' },
  { key: 'chongzhi', icon: ASSETS.chongzhi, label: '充值',   route: '/recharge' },
];

function BottomNav({ active }: { active: string }) {
  const [, navigate] = useLocation();
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
      <div style={{ position: 'relative' }}>
        <img src={ASSETS.tucheng7} alt="" style={{ width: '100%', display: 'block', height: 56 }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
          {TAB_ITEMS.map(tab => (
            <div key={tab.key} onClick={() => navigate(tab.route)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, paddingBottom: tab.isCenter ? 8 : 0, cursor: 'pointer' }}>
              {tab.isCenter ? (
                <div style={{ marginTop: -22 }}>
                  <img src={tab.icon} alt={tab.label} style={{ width: 60, height: 50, objectFit: 'contain' }} />
                  <div style={{ color: active === tab.key ? '#fff' : '#aaa', fontSize: 11, textAlign: 'center', marginTop: 2 }}>{tab.label}</div>
                </div>
              ) : (
                <>
                  <img src={tab.icon} alt={tab.label} style={{ width: 26, height: 26, objectFit: 'contain' }} />
                  <span style={{ color: active === tab.key ? '#c084fc' : '#888', fontSize: 10, fontWeight: active === tab.key ? 700 : 400 }}>{tab.label}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Recharge() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'recharge' | 'history'>('recharge');
  const [selectedConfig, setSelectedConfig] = useState<number | null>(null);

  const { data: player } = trpc.player.me.useQuery();
  const { data: configs } = trpc.player.rechargeConfigs.useQuery();
  const { data: orders } = trpc.player.rechargeOrders.useQuery(
    { page: 1, limit: 20 },
    { enabled: activeTab === 'history' && !!player }
  );

  if (!player) {
    return (
      <div className="phone-container" style={{ height: '100vh', background: '#0d0621', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative' }}>
        <div style={{ fontSize: 40 }}>💰</div>
        <div style={{ color: '#9980cc', fontSize: 14 }}>请先登录</div>
        <button onClick={() => navigate('/login')} style={{ padding: '10px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #c084fc)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>立即登录</button>
        <BottomNav active="chongzhi" />
      </div>
    );
  }

  return (
    <div className="phone-container" style={{ height: '100vh', position: 'relative', background: '#0d0621', overflow: 'hidden' }}>
      <img src={ASSETS.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 56, zIndex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 顶部 */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 52, flexShrink: 0, borderBottom: '1px solid rgba(120,60,220,0.2)' }}>
          <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, flex: 1 }}>充值</span>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', margin: '8px 10px', background: 'rgba(20,8,50,0.6)', borderRadius: 10, padding: 3, border: '1px solid rgba(120,60,220,0.2)', flexShrink: 0 }}>
          {[{ key: 'recharge', label: '充值' }, { key: 'history', label: '充值记录' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', background: activeTab === tab.key ? 'rgba(120,60,220,0.5)' : 'transparent', color: activeTab === tab.key ? '#fff' : '#9980cc', fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 400, cursor: 'pointer' }}>{tab.label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          {activeTab === 'recharge' && (
            <>
              {/* 当前余额 */}
              <div style={{ borderRadius: 12, background: 'linear-gradient(135deg, rgba(30,10,65,0.95), rgba(15,5,40,0.98))', border: '1.5px solid rgba(120,60,220,0.4)', padding: '14px', marginBottom: 12 }}>
                <div style={{ color: '#9980cc', fontSize: 12, marginBottom: 4 }}>当前金币余额</div>
                <div style={{ color: '#ffd700', fontSize: 24, fontWeight: 700 }}>{parseFloat(player.gold || '0').toFixed(0)} <span style={{ fontSize: 14, color: '#9980cc' }}>金币</span></div>
              </div>

              {/* 充值档位 */}
              <div style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>选择充值档位</div>
              {!configs?.length ? (
                <div style={{ textAlign: 'center', color: '#666', fontSize: 13, padding: '30px 0' }}>暂无充值档位</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {configs.map((cfg: any) => (
                    <div
                      key={cfg.id}
                      onClick={() => setSelectedConfig(cfg.id)}
                      style={{
                        padding: '14px 10px',
                        borderRadius: 10,
                        border: `1.5px solid ${selectedConfig === cfg.id ? '#c084fc' : 'rgba(120,60,220,0.3)'}`,
                        background: selectedConfig === cfg.id ? 'rgba(192,132,252,0.15)' : 'rgba(20,8,50,0.7)',
                        cursor: 'pointer',
                        position: 'relative',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {cfg.tag && (
                        <div style={{ position: 'absolute', top: -8, right: 6, background: 'linear-gradient(135deg, #f5a623, #e8750a)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700, color: '#fff' }}>{cfg.tag}</div>
                      )}
                      {cfg.isFirstRecharge === 1 && (
                        <div style={{ position: 'absolute', top: -8, left: 6, background: 'linear-gradient(135deg, #7c3aed, #c084fc)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700, color: '#fff' }}>首充</div>
                      )}
                      <div style={{ color: '#ffd700', fontSize: 20, fontWeight: 700 }}>{parseFloat(cfg.gold || '0').toFixed(0)}</div>
                      <div style={{ color: '#9980cc', fontSize: 11, marginTop: 2 }}>金币</div>
                      {parseFloat(cfg.bonusDiamond || '0') > 0 && (
                        <div style={{ color: '#7df9ff', fontSize: 11, marginTop: 2 }}>+{parseFloat(cfg.bonusDiamond).toFixed(0)}钻石</div>
                      )}
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginTop: 6 }}>¥{parseFloat(cfg.amount || '0').toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 充值按钮 */}
              <button
                onClick={() => {
                  if (!selectedConfig) { toast.error('请选择充值档位'); return; }
                  toast.info('请联系客服完成充值，或等待支付功能上线');
                }}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: selectedConfig ? 'linear-gradient(135deg, #7c3aed, #c084fc)' : 'rgba(80,80,80,0.3)', color: selectedConfig ? '#fff' : '#666', fontSize: 16, fontWeight: 700, cursor: selectedConfig ? 'pointer' : 'not-allowed', boxShadow: selectedConfig ? '0 0 20px rgba(120,60,220,0.5)' : 'none' }}
              >
                立即充值
              </button>

              <div style={{ textAlign: 'center', color: '#555', fontSize: 11, marginTop: 8 }}>如有问题请联系客服</div>
            </>
          )}

          {activeTab === 'history' && (
            <>
              {!orders?.list?.length ? (
                <div style={{ textAlign: 'center', color: '#666', fontSize: 13, padding: '40px 0' }}>暂无充值记录</div>
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
            </>
          )}

          <div style={{ height: 16 }} />
        </div>
      </div>

      <BottomNav active="chongzhi" />
    </div>
  );
}
