/**
 * Bag.tsx — 背包页面（Roll房中奖物品）
 */
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ASSETS } from '@/lib/assets';
import TopNavComponent from '@/components/TopNav';
import BottomNavShared from '@/components/BottomNav';

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

export default function Bag() {
  const [, navigate] = useLocation();
  const { data: player } = trpc.player.me.useQuery();
  const { data, isLoading } = trpc.player.inventory.useQuery(
    { page: 1, limit: 50 },
    { enabled: !!player }
  );

  if (!player) {
    return (
      <div className="phone-container" style={{ height: '100vh', background: '#0d0621', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative' }}>
        <div style={{ fontSize: 40 }}>🎒</div>
        <div style={{ color: '#9980cc', fontSize: 14 }}>请先登录查看背包</div>
        <button onClick={() => navigate('/login')} style={{ padding: '10px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #c084fc)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>立即登录</button>
        <BottomNav active="beibao" />
      </div>
    );
  }

  return (
    <div className="phone-container" style={{ height: '100vh', position: 'relative', background: '#0d0621', overflow: 'hidden' }}>
      <img src={ASSETS.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 56, zIndex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', containerType: 'inline-size' }}>
        {/* 顶部导航（公共组件） */}
        <TopNavComponent showLogo={false} onBackClick={() => navigate('/')} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120, color: '#9980cc' }}>加载中...</div>
          ) : !data?.list?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
              <div style={{ fontSize: 48 }}>🎒</div>
              <div style={{ color: '#9980cc', fontSize: 14 }}>背包空空如也</div>
              <div style={{ color: '#666', fontSize: 12 }}>参与Roll房赢取奖品吧！</div>
              <button onClick={() => navigate('/roll')} style={{ padding: '8px 20px', borderRadius: 8, background: 'rgba(120,60,220,0.3)', border: '1px solid rgba(120,60,220,0.5)', color: '#c084fc', fontSize: 13, cursor: 'pointer' }}>去Roll房</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {data.list.map((item: any) => (
                <div key={item.id} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(120,60,220,0.3)', background: 'rgba(20,8,50,0.7)' }}>
                  <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', background: 'rgba(50,20,100,0.4)' }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🎁</div>
                    )}
                  </div>
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ color: '#e0d0ff', fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ color: '#ffd700', fontSize: 11, marginTop: 2 }}>¥{parseFloat(item.value || '0').toFixed(0)}</div>
                    <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>{new Date(item.wonAt || item.createdAt).toLocaleDateString('zh-CN')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav active="beibao" />
    </div>
  );
}
