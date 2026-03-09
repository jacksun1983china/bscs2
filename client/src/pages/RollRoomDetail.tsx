/**
 * RollRoomDetail.tsx — Roll房详情页
 * 展示房间信息、奖品列表、参与者、倒计时，支持参与操作
 */
import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ASSETS } from '@/lib/assets';
import { toast } from 'sonner';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: '待开奖', color: '#7df9ff', bg: 'rgba(0,200,255,0.15)' },
    drawing:  { label: '开奖中', color: '#ffd700', bg: 'rgba(255,215,0,0.15)' },
    finished: { label: '已结束', color: '#888',    bg: 'rgba(100,100,100,0.2)' },
    ended:    { label: '已结束', color: '#888',    bg: 'rgba(100,100,100,0.2)' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, color: s.color, background: s.bg, border: `1px solid ${s.color}40`, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

// 倒计时 Hook
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
      setRemaining(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endAt]);
  return remaining;
}

export default function RollRoomDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const roomId = parseInt(params.id || '0');
  const [activeTab, setActiveTab] = useState<'prizes' | 'participants' | 'winners'>('prizes');

  const { data, isLoading, refetch } = trpc.roll.detail.useQuery({ id: roomId }, { enabled: !!roomId, refetchInterval: 15000 });
  const { data: joinedData, refetch: refetchJoined } = trpc.roll.checkJoined.useQuery({ roomId }, { enabled: !!roomId });
  const { data: winnersData } = trpc.roll.winners.useQuery({ roomId }, { enabled: !!roomId && data?.room?.status === 'ended' });

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
      <div className="phone-container" style={{ height: '100vh', background: '#0d0621', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9980cc', fontSize: 14 }}>加载中...</div>
      </div>
    );
  }

  if (!data?.room) {
    return (
      <div className="phone-container" style={{ height: '100vh', background: '#0d0621', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 40 }}>😕</div>
        <div style={{ color: '#9980cc', fontSize: 14 }}>Roll房不存在</div>
        <button onClick={() => navigate('/roll')} style={{ padding: '8px 20px', borderRadius: 8, background: 'rgba(120,60,220,0.3)', border: '1px solid rgba(120,60,220,0.5)', color: '#c084fc', cursor: 'pointer' }}>返回列表</button>
      </div>
    );
  }

  const { room, prizes, participants } = data;
  const isEnded = room.status === 'ended';
  const isJoined = joinedData?.joined;
  const canJoin = !isEnded && !isJoined;

  return (
    <div className="phone-container" style={{ height: '100vh', position: 'relative', background: '#0d0621', overflow: 'hidden' }}>
      {/* 背景 */}
      <img src={ASSETS.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 顶部导航 */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 52, flexShrink: 0, borderBottom: '1px solid rgba(120,60,220,0.2)' }}>
          <button onClick={() => navigate('/roll')} style={{ background: 'none', border: 'none', color: '#c084fc', fontSize: 22, cursor: 'pointer', padding: '0 8px 0 0', lineHeight: 1 }}>‹</button>
          <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, flex: 1 }}>Roll房详情</span>
          <StatusBadge status={room.status} />
        </div>

        {/* 滚动内容 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* 房间头部信息 */}
          <div style={{ margin: '10px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(30,10,65,0.95) 0%, rgba(15,5,40,0.98) 100%)', border: '1.5px solid rgba(120,60,220,0.4)', padding: '14px', boxShadow: '0 0 20px rgba(100,40,200,0.3)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {/* 头像 */}
              <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(120,60,220,0.5)', background: 'rgba(50,20,100,0.5)' }}>
                {room.avatarUrl ? (
                  <img src={room.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎲</div>
                )}
              </div>
              {/* 信息 */}
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{room.title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                  <span style={{ color: '#9980cc', fontSize: 11 }}>门槛：<span style={{ color: '#ffd700' }}>¥{parseFloat(room.threshold || '0').toFixed(0)}</span></span>
                  <span style={{ color: '#9980cc', fontSize: 11 }}>人数：<span style={{ color: '#7df9ff' }}>{room.participantCount}/{room.maxParticipants || '∞'}</span></span>
                  <span style={{ color: '#9980cc', fontSize: 11 }}>奖品：<span style={{ color: '#c084fc' }}>{prizes?.length || 0}件</span></span>
                  <span style={{ color: '#9980cc', fontSize: 11 }}>ID：<span style={{ color: '#aaa' }}>#{room.id}</span></span>
                </div>
              </div>
            </div>

            {/* 倒计时 */}
            {!isEnded && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(0,200,255,0.08)', borderRadius: 8, border: '1px solid rgba(0,200,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#9980cc', fontSize: 12 }}>距截止</span>
                <span style={{ color: '#7df9ff', fontSize: 18, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 2 }}>{countdown}</span>
              </div>
            )}

            {/* 时间信息 */}
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666', fontSize: 11 }}>开始：{new Date(room.startAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span style={{ color: '#666', fontSize: 11 }}>截止：{new Date(room.endAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Tab切换 */}
          <div style={{ display: 'flex', margin: '0 10px 8px', background: 'rgba(20,8,50,0.6)', borderRadius: 10, padding: 3, border: '1px solid rgba(120,60,220,0.2)' }}>
            {[
              { key: 'prizes', label: `奖品(${prizes?.length || 0})` },
              { key: 'participants', label: `参与者(${room.participantCount || 0})` },
              ...(isEnded ? [{ key: 'winners' as const, label: '中奖名单' }] : []),
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
                  background: activeTab === tab.key ? 'rgba(120,60,220,0.5)' : 'transparent',
                  color: activeTab === tab.key ? '#fff' : '#9980cc',
                  fontSize: 12, fontWeight: activeTab === tab.key ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >{tab.label}</button>
            ))}
          </div>

          {/* 奖品列表 */}
          {activeTab === 'prizes' && (
            <div style={{ padding: '0 10px' }}>
              {prizes?.map((prize: any, i: number) => (
                <div key={prize.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 8, borderRadius: 10, background: 'rgba(20,8,50,0.7)', border: '1px solid rgba(120,60,220,0.25)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(120,60,220,0.3)', background: 'rgba(50,20,100,0.4)' }}>
                    {prize.imageUrl ? (
                      <img src={prize.imageUrl} alt={prize.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎁</div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{prize.name}</div>
                    <div style={{ color: '#9980cc', fontSize: 11, marginTop: 2 }}>
                      价值：<span style={{ color: '#ffd700' }}>¥{parseFloat(prize.value || '0').toFixed(0)}</span>
                      {' · '}数量：<span style={{ color: '#7df9ff' }}>{prize.quantity}件</span>
                    </div>
                  </div>
                  <div style={{ color: '#c084fc', fontSize: 11, fontWeight: 600 }}>#{i + 1}</div>
                </div>
              ))}
            </div>
          )}

          {/* 参与者列表 */}
          {activeTab === 'participants' && (
            <div style={{ padding: '0 10px' }}>
              {participants?.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', fontSize: 13, padding: '30px 0' }}>暂无参与者</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {participants?.map((p: any) => (
                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 8, background: p.isBot ? 'rgba(50,50,50,0.4)' : 'rgba(30,10,65,0.6)', border: `1px solid ${p.isBot ? 'rgba(100,100,100,0.2)' : 'rgba(120,60,220,0.2)'}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: `1.5px solid ${p.isBot ? '#555' : 'rgba(120,60,220,0.4)'}`, background: 'rgba(50,20,100,0.5)' }}>
                        {p.avatar ? (
                          <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{p.isBot ? '🤖' : '👤'}</div>
                        )}
                      </div>
                      <span style={{ color: p.isBot ? '#666' : '#ccc', fontSize: 10, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                        {p.nickname || `用户${p.playerId}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 中奖名单 */}
          {activeTab === 'winners' && (
            <div style={{ padding: '0 10px' }}>
              {!winnersData?.length ? (
                <div style={{ textAlign: 'center', color: '#666', fontSize: 13, padding: '30px 0' }}>暂无中奖记录</div>
              ) : (
                winnersData.map((w: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 8, borderRadius: 10, background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)' }}>
                    <div style={{ fontSize: 20 }}>🏆</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#ffd700', fontSize: 13, fontWeight: 600 }}>{w.nickname || `用户${w.playerId}`}</div>
                      <div style={{ color: '#9980cc', fontSize: 11, marginTop: 2 }}>获得：{w.prizeName}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div style={{ height: 16 }} />
        </div>

        {/* 底部参与按钮 */}
        <div style={{ padding: '10px 12px', flexShrink: 0, borderTop: '1px solid rgba(120,60,220,0.2)', background: 'rgba(13,6,33,0.95)' }}>
          {isEnded ? (
            <div style={{ textAlign: 'center', color: '#666', fontSize: 13, padding: '8px 0' }}>该Roll房已结束</div>
          ) : isJoined ? (
            <div style={{ textAlign: 'center', padding: '10px 0', color: '#7df9ff', fontSize: 14, fontWeight: 600 }}>✓ 已参与，等待开奖</div>
          ) : (
            <button
              onClick={() => joinMutation.mutate({ roomId })}
              disabled={joinMutation.isPending}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                background: joinMutation.isPending ? 'rgba(120,60,220,0.3)' : 'linear-gradient(135deg, #7c3aed 0%, #c084fc 50%, #06b6d4 100%)',
                color: '#fff', fontSize: 16, fontWeight: 700, cursor: joinMutation.isPending ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 20px rgba(120,60,220,0.5)',
                letterSpacing: 1,
              }}
            >
              {joinMutation.isPending ? '参与中...' : '立即参与'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .phone-container ::-webkit-scrollbar { width: 3px; }
        .phone-container ::-webkit-scrollbar-track { background: transparent; }
        .phone-container ::-webkit-scrollbar-thumb { background: rgba(120,60,220,0.4); border-radius: 2px; }
      `}</style>
    </div>
  );
}
