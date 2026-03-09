/**
 * RollRoom.tsx — Roll房列表页
 * 赛博朋克风格，与首页保持一致
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ASSETS } from '@/lib/assets';
import { toast } from 'sonner';

// ── 底部导航（复用） ──────────────────────────────────────────────
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
                  <div style={{ color: active === tab.key ? '#fff' : '#aaa', fontSize: 11, textAlign: 'center', marginTop: 2, fontWeight: active === tab.key ? 700 : 400 }}>{tab.label}</div>
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

// ── 筛选标签 ──────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',      label: '全部' },
  { key: 'joinable', label: '可参与' },
  { key: 'mine',     label: '我的' },
  { key: 'ended',    label: '已结束' },
] as const;

// ── 状态标签 ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: '待开奖', color: '#7df9ff', bg: 'rgba(0,200,255,0.15)' },
    drawing:  { label: '开奖中', color: '#ffd700', bg: 'rgba(255,215,0,0.15)' },
    finished: { label: '已结束', color: '#888',    bg: 'rgba(100,100,100,0.2)' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, color: s.color, background: s.bg, border: `1px solid ${s.color}40`, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

// ── Roll房卡片 ────────────────────────────────────────────────────
function RollCard({ room, onClick }: { room: any; onClick: () => void }) {
  const isEnded = room.status === 'finished';
  const endTime = new Date(room.endAt);
  const now = new Date();
  const diffMs = endTime.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  const timeStr = diffMs > 0 ? (diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`) : '已截止';

  return (
    <div
      onClick={onClick}
      style={{
        margin: '0 10px 10px',
        borderRadius: 12,
        overflow: 'hidden',
        border: `1.5px solid ${isEnded ? 'rgba(100,100,100,0.3)' : 'rgba(120,60,220,0.5)'}`,
        boxShadow: isEnded ? 'none' : '0 0 15px rgba(100,40,200,0.3)',
        background: isEnded ? 'rgba(20,15,35,0.8)' : 'linear-gradient(135deg, rgba(30,10,65,0.95) 0%, rgba(15,5,40,0.98) 100%)',
        cursor: 'pointer',
        filter: isEnded ? 'grayscale(0.6)' : 'none',
        transition: 'transform 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: 10 }}>
        {/* 房间头像 */}
        <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(120,60,220,0.4)', background: 'rgba(50,20,100,0.5)' }}>
          {room.avatarUrl ? (
            <img src={room.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎲</div>
          )}
        </div>

        {/* 主信息 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.title}</span>
            <StatusBadge status={room.status} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: '#9980cc', fontSize: 11 }}>门槛：<span style={{ color: '#ffd700' }}>¥{parseFloat(room.threshold || '0').toFixed(0)}</span></span>
            <span style={{ color: '#9980cc', fontSize: 11 }}>人数：<span style={{ color: '#7df9ff' }}>{room.participantCount}/{room.maxParticipants || '∞'}</span></span>
            <span style={{ color: '#9980cc', fontSize: 11 }}>奖品：<span style={{ color: '#c084fc' }}>{room.prizeCount}件</span></span>
          </div>
        </div>

        {/* 时间 */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ color: diffMs > 0 ? '#7df9ff' : '#666', fontSize: 11, fontWeight: 600 }}>{timeStr}</div>
          <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>截止时间</div>
        </div>
      </div>

      {/* 奖品预览 */}
      {room.prizes && room.prizes.length > 0 && (
        <div style={{ padding: '0 12px 10px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {room.prizes.slice(0, 5).map((prize: any, i: number) => (
            <div key={i} style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(120,60,220,0.3)', background: 'rgba(50,20,100,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {prize.imageUrl ? (
                <img src={prize.imageUrl} alt={prize.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 10, color: '#c084fc', textAlign: 'center', padding: 2 }}>{prize.name.slice(0, 4)}</span>
              )}
            </div>
          ))}
          {room.prizes.length > 5 && (
            <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 8, border: '1px solid rgba(120,60,220,0.3)', background: 'rgba(50,20,100,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: '#9980cc' }}>+{room.prizes.length - 5}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────
export default function RollRoom() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<'all' | 'joinable' | 'mine' | 'ended'>('all');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = trpc.roll.list.useQuery(
    { page, limit: 10, filter, keyword },
    { refetchInterval: 30000 }
  );

  useEffect(() => { setPage(1); }, [filter, keyword]);

  const handleSearch = () => {
    setKeyword(searchInput);
    setPage(1);
  };

  return (
    <div className="phone-container" style={{ height: '100vh', position: 'relative', background: '#0d0621', overflow: 'hidden' }}>
      {/* 背景 */}
      <img src={ASSETS.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }} />

      {/* 内容区 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 56, zIndex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 顶部导航 */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 52, flexShrink: 0, borderBottom: '1px solid rgba(120,60,220,0.2)' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#c084fc', fontSize: 22, cursor: 'pointer', padding: '0 8px 0 0', lineHeight: 1 }}>‹</button>
          <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, flex: 1 }}>ROLL房</span>
          <button onClick={() => refetch()} style={{ background: 'none', border: 'none', color: '#9980cc', fontSize: 13, cursor: 'pointer' }}>刷新</button>
        </div>

        {/* 搜索框 */}
        <div style={{ padding: '8px 10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, background: 'rgba(20,8,50,0.8)', border: '1px solid rgba(120,60,220,0.3)', borderRadius: 8, overflow: 'hidden' }}>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="搜索房间名称..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e0d0ff', fontSize: 13, padding: '8px 12px' }}
            />
            <button onClick={handleSearch} style={{ background: 'rgba(120,60,220,0.4)', border: 'none', color: '#c084fc', padding: '0 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>搜索</button>
          </div>
        </div>

        {/* 筛选标签 */}
        <div style={{ display: 'flex', gap: 6, padding: '0 10px 8px', flexShrink: 0 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 8,
                border: `1px solid ${filter === f.key ? '#c084fc' : 'rgba(120,60,220,0.3)'}`,
                background: filter === f.key ? 'rgba(192,132,252,0.2)' : 'rgba(20,8,50,0.6)',
                color: filter === f.key ? '#c084fc' : '#9980cc',
                fontSize: 12,
                fontWeight: filter === f.key ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 房间列表 */}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 2 }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120, color: '#9980cc', fontSize: 14 }}>
              加载中...
            </div>
          ) : !data?.list?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 160, gap: 12 }}>
              <div style={{ fontSize: 40 }}>🎲</div>
              <div style={{ color: '#9980cc', fontSize: 14 }}>暂无Roll房</div>
            </div>
          ) : (
            <>
              {data.list.map((room: any) => (
                <RollCard key={room.id} room={room} onClick={() => navigate(`/roll/${room.id}`)} />
              ))}
              {/* 分页 */}
              {(data.total || 0) > 10 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '10px 0 16px' }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(120,60,220,0.4)', background: page === 1 ? 'rgba(20,8,50,0.4)' : 'rgba(120,60,220,0.2)', color: page === 1 ? '#555' : '#c084fc', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}
                  >上一页</button>
                    <span style={{ color: '#9980cc', fontSize: 13, alignSelf: 'center' }}>第{page}页 / 共{Math.ceil((data?.total || 0) / 10)}页</span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil((data?.total || 0) / 10)}
                    style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(120,60,220,0.4)', background: page >= Math.ceil((data?.total || 0) / 10) ? 'rgba(20,8,50,0.4)' : 'rgba(120,60,220,0.2)', color: page >= Math.ceil((data?.total || 0) / 10) ? '#555' : '#c084fc', cursor: page >= Math.ceil((data?.total || 0) / 10) ? 'not-allowed' : 'pointer', fontSize: 13 }}
                  >下一页</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 底部导航 */}
      <BottomNav active="" />

      <style>{`
        .phone-container ::-webkit-scrollbar { width: 3px; }
        .phone-container ::-webkit-scrollbar-track { background: transparent; }
        .phone-container ::-webkit-scrollbar-thumb { background: rgba(120,60,220,0.4); border-radius: 2px; }
      `}</style>
    </div>
  );
}
