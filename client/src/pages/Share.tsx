/**
 * Share.tsx — 分享推广页面
 */
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ASSETS } from '@/lib/assets';
import { toast } from 'sonner';
import TopNavComponent from '@/components/TopNav';
import BottomNavComponent from '@/components/BottomNav';

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

export default function Share() {
  const [, navigate] = useLocation();
  const { data: player } = trpc.player.me.useQuery();
  const { data: teamStats } = trpc.player.teamStats.useQuery(undefined, { enabled: !!player });

  const inviteLink = player?.inviteCode
    ? `${window.location.origin}/login?invite=${player.inviteCode}`
    : '';

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success('邀请链接已复制！');
  };

  const copyCode = () => {
    if (!player?.inviteCode) return;
    navigator.clipboard.writeText(player.inviteCode);
    toast.success('邀请码已复制！');
  };

  return (
    <div className="phone-container" style={{ height: '100vh', position: 'relative', background: '#0d0621', overflow: 'hidden' }}>
      <img src={ASSETS.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 56, zIndex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', containerType: 'inline-size' }}>
        {/* 顶部导航（公共组件） */}
        <TopNavComponent showLogo={false} onBackClick={() => navigate('/')} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {/* 邀请码卡片 */}
          <div style={{ borderRadius: 12, background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(6,182,212,0.2) 100%)', border: '1.5px solid rgba(120,60,220,0.5)', padding: '20px', marginBottom: 12, boxShadow: '0 0 30px rgba(100,40,200,0.3)', textAlign: 'center' }}>
            <div style={{ color: '#9980cc', fontSize: 13, marginBottom: 8 }}>我的邀请码</div>
            <div style={{ color: '#ffd700', fontSize: 32, fontWeight: 900, letterSpacing: 4, marginBottom: 16, textShadow: '0 0 20px rgba(255,215,0,0.5)' }}>
              {player?.inviteCode || '------'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyCode} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'rgba(120,60,220,0.3)', border: '1px solid rgba(120,60,220,0.5)', color: '#c084fc', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>复制邀请码</button>
              <button onClick={copyLink} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #c084fc)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>复制邀请链接</button>
            </div>
          </div>

          {/* 推广数据 */}
          <div style={{ borderRadius: 12, background: 'rgba(20,8,50,0.8)', border: '1px solid rgba(120,60,220,0.3)', padding: '14px', marginBottom: 12 }}>
            <div style={{ color: '#c084fc', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>推广数据</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: '邀请人数', value: teamStats?.total || 0, color: '#7df9ff' },
                { label: '今日新增', value: teamStats?.todayCount || 0, color: '#c084fc' },
                { label: '待提返佣', value: `¥${parseFloat(teamStats?.commissionBalance || '0').toFixed(0)}`, color: '#ffd700' },
              ].map(item => (
                <div key={item.label} style={{ padding: '10px 6px', background: 'rgba(20,8,50,0.5)', borderRadius: 8, border: '1px solid rgba(120,60,220,0.15)', textAlign: 'center' }}>
                  <div style={{ color: item.color, fontSize: 20, fontWeight: 700 }}>{item.value}</div>
                  <div style={{ color: '#9980cc', fontSize: 11, marginTop: 3 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 规则说明 */}
          <div style={{ borderRadius: 12, background: 'rgba(20,8,50,0.6)', border: '1px solid rgba(120,60,220,0.2)', padding: '14px' }}>
            <div style={{ color: '#c084fc', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>推广规则</div>
            <div style={{ color: '#9980cc', fontSize: 12, lineHeight: 2 }}>
              <div>🎯 邀请好友注册，成为你的下级</div>
              <div>💰 好友每次充值，你获得 <span style={{ color: '#ffd700', fontWeight: 700 }}>4%</span> 返佣</div>
              <div>⏰ 每日00:30自动计算前一日返佣</div>
              <div>🏆 返佣可提取为商城币，用于兑换奖品</div>
              <div>📈 招商/主播身份可享更高返佣比例</div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="fenxiang" />
    </div>
  );
}
