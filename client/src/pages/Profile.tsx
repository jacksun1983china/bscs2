/**
 * Profile.tsx — 我的页面
 * 个人信息、返佣、推广数据
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

export default function Profile() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'info' | 'commission' | 'messages'>('info');
  const [inviteInput, setInviteInput] = useState('');

  const { data: player, refetch } = trpc.player.me.useQuery();
  const { data: teamStats } = trpc.player.teamStats.useQuery(undefined, { enabled: !!player });
  const { data: messages } = trpc.player.messages.useQuery({ page: 1, limit: 20 }, { enabled: activeTab === 'messages' });

  const bindMutation = trpc.player.bindInviteCode.useMutation({
    onSuccess: (d) => { toast.success(`成功绑定上级：${d.inviterNickname}`); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const withdrawMutation = trpc.player.withdrawCommission.useMutation({
    onSuccess: () => { toast.success('返佣已提取到商城币！'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const logoutMutation = trpc.player.logout.useMutation({
    onSuccess: () => navigate('/login'),
  });

  if (!player) {
    return (
      <div className="phone-container" style={{ height: '100vh', background: '#0d0621', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 40 }}>👤</div>
        <div style={{ color: '#9980cc', fontSize: 14 }}>请先登录</div>
        <button onClick={() => navigate('/login')} style={{ padding: '10px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #c084fc)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>立即登录</button>
        <BottomNav active="wode" />
      </div>
    );
  }

  const identityMap: Record<string, string> = { player: '玩家', streamer: '主播', merchant: '招商' };

  return (
    <div className="phone-container" style={{ height: '100vh', position: 'relative', background: '#0d0621', overflow: 'hidden' }}>
      <img src={ASSETS.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 56, zIndex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 顶部 */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 52, flexShrink: 0, borderBottom: '1px solid rgba(120,60,220,0.2)' }}>
          <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, flex: 1 }}>我的</span>
          <button onClick={() => logoutMutation.mutate()} style={{ background: 'none', border: '1px solid rgba(120,60,220,0.4)', color: '#9980cc', fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer' }}>退出</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* 用户信息卡 */}
          <div style={{ margin: '10px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(30,10,65,0.95) 0%, rgba(15,5,40,0.98) 100%)', border: '1.5px solid rgba(120,60,220,0.4)', padding: '14px', boxShadow: '0 0 20px rgba(100,40,200,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(120,60,220,0.5)', background: 'rgba(50,20,100,0.5)', flexShrink: 0 }}>
                {player.avatar ? (
                  <img src={player.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>👤</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{player.nickname}</div>
                <div style={{ color: '#9980cc', fontSize: 12, marginTop: 2 }}>ID：{player.id}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <span style={{ background: 'linear-gradient(135deg, #f5a623, #e8750a)', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700, color: '#fff' }}>VIP{player.vipLevel}</span>
                  <span style={{ background: 'rgba(120,60,220,0.3)', borderRadius: 4, padding: '1px 7px', fontSize: 11, color: '#c084fc', border: '1px solid rgba(120,60,220,0.4)' }}>{identityMap[player.identity || 'player']}</span>
                </div>
              </div>
            </div>

            {/* 资产 */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(120,60,220,0.2)' }}>
              {[
                { label: '金币', value: parseFloat(player.gold || '0').toFixed(0), color: '#ffd700' },
                { label: '钻石', value: parseFloat(player.diamond || '0').toFixed(0), color: '#7df9ff' },
                { label: '商城币', value: parseFloat(player.shopCoin || '0').toFixed(0), color: '#c084fc' },
              ].map(item => (
                <div key={item.label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: 'rgba(20,8,50,0.5)', borderRadius: 8, border: '1px solid rgba(120,60,220,0.2)' }}>
                  <div style={{ color: item.color, fontSize: 16, fontWeight: 700 }}>{item.value}</div>
                  <div style={{ color: '#9980cc', fontSize: 11, marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* 手机号 */}
            <div style={{ marginTop: 10, color: '#666', fontSize: 12, textAlign: 'right' }}>
              {player.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
            </div>
          </div>

          {/* Tab切换 */}
          <div style={{ display: 'flex', margin: '0 10px 8px', background: 'rgba(20,8,50,0.6)', borderRadius: 10, padding: 3, border: '1px solid rgba(120,60,220,0.2)' }}>
            {[
              { key: 'info', label: '账号信息' },
              { key: 'commission', label: '返佣推广' },
              { key: 'messages', label: '站内信' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', background: activeTab === tab.key ? 'rgba(120,60,220,0.5)' : 'transparent', color: activeTab === tab.key ? '#fff' : '#9980cc', fontSize: 12, fontWeight: activeTab === tab.key ? 700 : 400, cursor: 'pointer' }}>{tab.label}</button>
            ))}
          </div>

          {/* 账号信息 */}
          {activeTab === 'info' && (
            <div style={{ padding: '0 10px' }}>
              {/* 绑定上级 */}
              {!player.invitedBy && (
                <div style={{ marginBottom: 10, padding: '12px', borderRadius: 10, background: 'rgba(20,8,50,0.7)', border: '1px solid rgba(120,60,220,0.25)' }}>
                  <div style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>绑定上级邀请码</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={inviteInput} onChange={e => setInviteInput(e.target.value)} placeholder="输入邀请码" style={{ flex: 1, background: 'rgba(20,8,50,0.8)', border: '1px solid rgba(120,60,220,0.3)', borderRadius: 6, padding: '7px 10px', color: '#e0d0ff', fontSize: 13, outline: 'none' }} />
                    <button onClick={() => bindMutation.mutate({ inviteCode: inviteInput })} disabled={!inviteInput || bindMutation.isPending} style={{ padding: '7px 14px', borderRadius: 6, background: 'rgba(120,60,220,0.4)', border: '1px solid rgba(120,60,220,0.5)', color: '#c084fc', fontSize: 13, cursor: 'pointer' }}>绑定</button>
                  </div>
                </div>
              )}

              {/* 我的邀请码 */}
              <div style={{ marginBottom: 10, padding: '12px', borderRadius: 10, background: 'rgba(20,8,50,0.7)', border: '1px solid rgba(120,60,220,0.25)' }}>
                <div style={{ color: '#9980cc', fontSize: 12, marginBottom: 6 }}>我的邀请码</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#ffd700', fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>{player.inviteCode}</span>
                  <button onClick={() => { navigator.clipboard.writeText(player.inviteCode || ''); toast.success('邀请码已复制'); }} style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(120,60,220,0.3)', border: '1px solid rgba(120,60,220,0.4)', color: '#c084fc', fontSize: 12, cursor: 'pointer' }}>复制</button>
                </div>
              </div>

              {/* 充值记录入口 */}
              <div onClick={() => navigate('/recharge')} style={{ marginBottom: 10, padding: '12px', borderRadius: 10, background: 'rgba(20,8,50,0.7)', border: '1px solid rgba(120,60,220,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ color: '#e0d0ff', fontSize: 13 }}>充值记录</span>
                <span style={{ color: '#9980cc', fontSize: 16 }}>›</span>
              </div>

              {/* 总充值 */}
              <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(20,8,50,0.7)', border: '1px solid rgba(120,60,220,0.25)' }}>
                <div style={{ color: '#9980cc', fontSize: 12 }}>累计充值</div>
                <div style={{ color: '#ffd700', fontSize: 18, fontWeight: 700, marginTop: 4 }}>¥{parseFloat(player.totalRecharge || '0').toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* 返佣推广 */}
          {activeTab === 'commission' && (
            <div style={{ padding: '0 10px' }}>
              {/* 返佣余额 */}
              <div style={{ marginBottom: 10, padding: '14px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(30,10,65,0.95), rgba(15,5,40,0.98))', border: '1.5px solid rgba(120,60,220,0.4)' }}>
                <div style={{ color: '#9980cc', fontSize: 12 }}>待提取返佣</div>
                <div style={{ color: '#ffd700', fontSize: 24, fontWeight: 700, margin: '6px 0' }}>¥{parseFloat(player.commissionBalance || '0').toFixed(2)}</div>
                <button
                  onClick={() => withdrawMutation.mutate()}
                  disabled={parseFloat(player.commissionBalance || '0') <= 0 || withdrawMutation.isPending}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: parseFloat(player.commissionBalance || '0') > 0 ? 'linear-gradient(135deg, #7c3aed, #c084fc)' : 'rgba(80,80,80,0.3)', color: parseFloat(player.commissionBalance || '0') > 0 ? '#fff' : '#666', fontSize: 14, fontWeight: 700, cursor: parseFloat(player.commissionBalance || '0') > 0 ? 'pointer' : 'not-allowed', marginTop: 8 }}
                >
                  {withdrawMutation.isPending ? '提取中...' : '提取到商城币'}
                </button>
              </div>

              {/* 推广数据 */}
              {teamStats && (
                <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(20,8,50,0.7)', border: '1px solid rgba(120,60,220,0.25)' }}>
                  <div style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>推广数据</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: '直属人数', value: teamStats.total || 0, color: '#7df9ff' },
                      { label: '今日新增', value: teamStats.todayCount || 0, color: '#c084fc' },
                      { label: '待提返佣', value: `¥${parseFloat(teamStats.commissionBalance || '0').toFixed(0)}`, color: '#ffd700' },
                      { label: '我的返佣', value: `¥${parseFloat(player.commissionBalance || '0').toFixed(0)}`, color: '#f97316' },
                    ].map(item => (
                      <div key={item.label} style={{ padding: '10px', background: 'rgba(20,8,50,0.5)', borderRadius: 8, border: '1px solid rgba(120,60,220,0.15)' }}>
                        <div style={{ color: item.color, fontSize: 18, fontWeight: 700 }}>{item.value}</div>
                        <div style={{ color: '#9980cc', fontSize: 11, marginTop: 2 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 返佣说明 */}
              <div style={{ marginTop: 10, padding: '12px', borderRadius: 10, background: 'rgba(20,8,50,0.5)', border: '1px solid rgba(120,60,220,0.15)' }}>
                <div style={{ color: '#9980cc', fontSize: 11, lineHeight: 1.8 }}>
                  <div>• 每日00:30自动计算前一日返佣</div>
                  <div>• 默认返佣比例：4%（充值总额×4%）</div>
                  <div>• 返佣提取后转入商城币，可用于兑换奖品</div>
                  <div>• 未提取返佣累计叠加，不会清零</div>
                </div>
              </div>
            </div>
          )}

          {/* 站内信 */}
          {activeTab === 'messages' && (
            <div style={{ padding: '0 10px' }}>
              {!messages?.list?.length ? (
                <div style={{ textAlign: 'center', color: '#666', fontSize: 13, padding: '40px 0' }}>暂无消息</div>
              ) : (
                messages.list.map((msg: any) => (
                  <div key={msg.id} style={{ marginBottom: 8, padding: '12px', borderRadius: 10, background: msg.isRead ? 'rgba(20,8,50,0.5)' : 'rgba(30,10,65,0.8)', border: `1px solid ${msg.isRead ? 'rgba(120,60,220,0.15)' : 'rgba(120,60,220,0.4)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: msg.isRead ? '#9980cc' : '#c084fc', fontSize: 13, fontWeight: msg.isRead ? 400 : 700 }}>{msg.title}</span>
                      {!msg.isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c084fc', flexShrink: 0, marginTop: 4 }} />}
                    </div>
                    <div style={{ color: '#aaa', fontSize: 12, lineHeight: 1.5 }}>{msg.content}</div>
                    <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>{new Date(msg.createdAt).toLocaleString('zh-CN')}</div>
                  </div>
                ))
              )}
            </div>
          )}

          <div style={{ height: 16 }} />
        </div>
      </div>

      <BottomNav active="wode" />
    </div>
  );
}
