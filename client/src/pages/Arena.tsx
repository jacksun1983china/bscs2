/**
 * Arena.tsx — 竞技场房间列表页
 * 布局：顶部导航 → 玩家信息卡 → 创建房间按钮 → 房间列表（WebSocket实时刷新）→ 底部导航
 */
import { PageSlideIn } from '@/components/PageTransition';
import { useState, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import SettingsModal from '@/components/SettingsModal';
import { useArenaWS } from '@/hooks/useArenaWS';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';

// 品质颜色
const LEVEL_COLOR: Record<number, string> = {
  1: '#f5c842',  // 传说
  2: '#c084fc',  // 稀有
  3: '#9ca3af',  // 普通
  4: '#6b7280',  // 回收
};
const LEVEL_LABEL: Record<number, string> = { 1: '传说', 2: '稀有', 3: '普通', 4: '回收' };

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// ── 创建房间弹窗 ──────────────────────────────────────────────────────────

interface CreateRoomModalProps {
  onClose: () => void;
  onCreated: (roomId: number) => void;
}

function CreateRoomModal({ onClose, onCreated }: CreateRoomModalProps) {
  const [maxPlayers, setMaxPlayers] = useState(2);
  // 叠加选择：宝笱ID -> 数量
  const [boxCounts, setBoxCounts] = useState<Record<number, number>>({});
  const [error, setError] = useState('');

  // 转换为数组（每个 ID 重复 N 次）
  const selectedBoxIds = Object.entries(boxCounts).flatMap(
    ([id, cnt]) => Array(cnt).fill(Number(id))
  );
  const totalSelected = Object.values(boxCounts).reduce((s, c) => s + c, 0);

  // 获取玩家当前余额
  const { data: playerInfo } = trpc.player.me.useQuery(undefined, { staleTime: 30_000 });
  const myGold = parseFloat((playerInfo as any)?.gold ?? '0');

  const { data: categories } = trpc.sku.categoryList.useQuery(undefined, { staleTime: 60_000 });
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const { data: boxListData } = trpc.sku.boxList.useQuery(
    { categoryId: activeCat ?? undefined, page: 1, limit: 50 },
    { enabled: true, staleTime: 60_000 }
  );
  const boxList = { list: boxListData?.data };
  // 全量宝笱（不过滤分类），用于底部已选预览
  const { data: allBoxListData } = trpc.sku.boxList.useQuery(
    { page: 1, limit: 100 },
    { staleTime: 120_000 }
  );
  const allBoxes: any[] = allBoxListData?.data ?? [];
  // 已选宝笱详情（用于底部预览）
  const selectedBoxDetails = allBoxes.filter((b: any) => (boxCounts[b.id] ?? 0) > 0);

  const createRoom = trpc.arena.createRoom.useMutation({
    onSuccess: (data) => {
      onCreated(data.roomId);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // 点击宝笱：+1
  const addBox = (boxId: number) => {
    setBoxCounts(prev => {
      const cur = prev[boxId] ?? 0;
      if (totalSelected >= 10) return prev; // 最多 10 个
      return { ...prev, [boxId]: cur + 1 };
    });
  };
  // 减少宝笱：-1，为 0 时移除
  const removeBox = (boxId: number) => {
    setBoxCounts(prev => {
      const cur = prev[boxId] ?? 0;
      if (cur <= 1) {
        const next = { ...prev };
        delete next[boxId];
        return next;
      }
      return { ...prev, [boxId]: cur - 1 };
    });
  };

  const totalFee = boxList?.list
    ?.reduce((s: number, b: any) => s + parseFloat(b.price) * (boxCounts[b.id] ?? 0), 0) ?? 0;

  const insufficientGold = totalSelected > 0 && myGold < totalFee;

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: q(680), maxHeight: '80cqh',
          background: 'linear-gradient(160deg,#1a0a3a 0%,#0d0621 100%)',
          border: '1.5px solid rgba(120,60,220,0.6)',
          borderRadius: q(16),
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* 标题栏 */}
        <div style={{
          padding: `${q(20)} ${q(24)}`,
          borderBottom: '1px solid rgba(120,60,220,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#c084fc', fontSize: q(32), fontWeight: 700 }}>创建竞技场</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: q(32), cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: `${q(16)} ${q(24)}` }}>
          {/* 人数选择 */}
          <div style={{ marginBottom: q(20) }}>
            <div style={{ color: '#9ca3af', fontSize: q(24), marginBottom: q(12) }}>对战人数</div>
            <div style={{ display: 'flex', gap: q(16) }}>
              {[2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxPlayers(n)}
                  style={{
                    flex: 1, padding: `${q(14)} 0`,
                    background: maxPlayers === n ? 'linear-gradient(135deg,#7c3aed,#c084fc)' : 'rgba(120,60,220,0.15)',
                    border: `1.5px solid ${maxPlayers === n ? '#c084fc' : 'rgba(120,60,220,0.3)'}`,
                    borderRadius: q(10), color: maxPlayers === n ? '#fff' : '#9ca3af',
                    fontSize: q(28), fontWeight: maxPlayers === n ? 700 : 400, cursor: 'pointer',
                  }}
                >
                  {n}人对战
                </button>
              ))}
            </div>
          </div>

          {/* 分类Tab */}
          <div style={{ marginBottom: q(12) }}>
            <div style={{ color: '#9ca3af', fontSize: q(24), marginBottom: q(12) }}>选择宝笱（已选 <span style={{ color: '#c084fc', fontWeight: 700 }}>{totalSelected}</span> 个，最多 10 个）</div>
            <div style={{ display: 'flex', gap: q(10), overflowX: 'auto', paddingBottom: q(4) }}>
              <button
                onClick={() => setActiveCat(null)}
                style={{
                  flexShrink: 0, padding: `${q(8)} ${q(16)}`,
                  background: activeCat === null ? 'rgba(120,60,220,0.4)' : 'rgba(120,60,220,0.1)',
                  border: `1px solid ${activeCat === null ? '#c084fc' : 'rgba(120,60,220,0.3)'}`,
                  borderRadius: q(8), color: activeCat === null ? '#c084fc' : '#888',
                  fontSize: q(22), cursor: 'pointer',
                }}
              >全部</button>
              {categories?.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  style={{
                    flexShrink: 0, padding: `${q(8)} ${q(16)}`,
                    background: activeCat === cat.id ? 'rgba(120,60,220,0.4)' : 'rgba(120,60,220,0.1)',
                    border: `1px solid ${activeCat === cat.id ? '#c084fc' : 'rgba(120,60,220,0.3)'}`,
                    borderRadius: q(8), color: activeCat === cat.id ? '#c084fc' : '#888',
                    fontSize: q(22), cursor: 'pointer',
                  }}
                >{cat.name}</button>
              ))}
            </div>
          </div>

          {/* 宝箱网格 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: q(12) }}>
            {boxList?.list?.map((box: any) => {
              const count = boxCounts[box.id] ?? 0;
              const isSelected = count > 0;
              return (
                <div
                  key={box.id}
                  onClick={() => addBox(box.id)}
                  style={{
                    position: 'relative',
                    background: isSelected ? 'rgba(120,60,220,0.3)' : 'rgba(20,8,50,0.8)',
                    border: `1.5px solid ${isSelected ? '#c084fc' : 'rgba(120,60,220,0.25)'}`,
                    borderRadius: q(10), padding: q(10),
                    cursor: 'pointer', textAlign: 'center',
                    boxShadow: isSelected ? '0 0 12px rgba(192,132,252,0.4)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* 数量角标（右上角） */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: q(4), right: q(4),
                      minWidth: q(28), height: q(28), borderRadius: q(14),
                      background: 'linear-gradient(135deg,#7c3aed,#c084fc)',
                      color: '#fff', fontWeight: 800,
                      fontSize: q(18), display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: `0 ${q(6)}`,
                      boxShadow: '0 0 8px rgba(192,132,252,0.6)',
                      zIndex: 2,
                    }}>{count}</div>
                  )}
                  {/* 减少按鈕（左上角） */}
                  {isSelected && (
                    <div
                      onClick={e => { e.stopPropagation(); removeBox(box.id); }}
                      style={{
                        position: 'absolute', top: q(4), left: q(4),
                        width: q(28), height: q(28), borderRadius: '50%',
                        background: 'rgba(239,68,68,0.85)',
                        color: '#fff', fontWeight: 900,
                        fontSize: q(22), display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', zIndex: 2, lineHeight: 1,
                      }}
                    >−</div>
                  )}
                  <img
                    src={box.imageUrl || `${CDN}/a888e4d9c59e44cf49c0949345509ee4_32c3c37e.png`}
                    alt={box.name}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'contain' }}
                  />
                  <div style={{ color: '#e0d0ff', fontSize: q(20), marginTop: q(4), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{box.name}</div>
                  <div style={{ color: '#ffd700', fontSize: q(22), fontWeight: 600 }}>
                    <img src="/img/jinbi1.png" alt="" style={{ width: q(20), height: q(20), verticalAlign: 'middle', marginRight: q(4) }} />
                    {parseFloat(box.price).toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部操作 */}
        <div style={{
          padding: `${q(16)} ${q(24)}`,
          borderTop: '1px solid rgba(120,60,220,0.3)',
        }}>
          {/* 已选宝箱预览（跨分类可见） */}
          {selectedBoxDetails.length > 0 && (
            <div style={{
              display: 'flex', gap: q(8), flexWrap: 'wrap',
              marginBottom: q(10),
              padding: `${q(8)} ${q(10)}`,
              background: 'rgba(120,60,220,0.1)',
              borderRadius: q(8),
              border: '1px solid rgba(120,60,220,0.2)',
            }}>
              {selectedBoxDetails.map((b: any) => (
                <div key={b.id} style={{ position: 'relative', width: q(72), flexShrink: 0 }}>
                  <img
                    src={b.imageUrl || `${CDN}/a888e4d9c59e44cf49c0949345509ee4_32c3c37e.png`}
                    alt={b.name}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', borderRadius: q(6) }}
                  />
                  <div style={{
                    position: 'absolute', top: q(-4), right: q(-4),
                    minWidth: q(24), height: q(24), borderRadius: q(12),
                    background: 'linear-gradient(135deg,#7c3aed,#c084fc)',
                    color: '#fff', fontWeight: 800, fontSize: q(16),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: `0 ${q(4)}`,
                  }}>{boxCounts[b.id]}</div>
                  {/* 点击减少 */}
                  <div
                    onClick={() => removeBox(b.id)}
                    style={{
                      position: 'absolute', bottom: q(-4), right: q(-4),
                      width: q(22), height: q(22), borderRadius: '50%',
                      background: 'rgba(239,68,68,0.85)',
                      color: '#fff', fontWeight: 900, fontSize: q(18),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', lineHeight: 1,
                    }}
                  >−</div>
                </div>
              ))}
            </div>
          )}
          {/* 余额 vs 入场费 对比行 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: q(10) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: q(16) }}>
              <div style={{ color: '#9ca3af', fontSize: q(22) }}>
                当前余额：
                <span style={{ color: myGold >= totalFee ? '#ffd700' : '#f87171', fontWeight: 700 }}>
                  {myGold.toFixed(0)}
                </span> 金币
              </div>
              {totalSelected > 0 && (
                <div style={{ color: '#9ca3af', fontSize: q(22) }}>
                  已选 <span style={{ color: '#c084fc', fontWeight: 700 }}>{totalSelected}</span> 个，入场费：
                  <span style={{ color: '#ffd700', fontWeight: 700 }}>{totalFee.toFixed(0)}</span> 金币
                </div>
              )}
            </div>
            {insufficientGold && (
              <div style={{ color: '#f87171', fontSize: q(22), fontWeight: 600 }}>💰 余额不足</div>
            )}
          </div>
          {/* 错误提示 */}
          {error && <div style={{ color: '#f87171', fontSize: q(22), marginBottom: q(8) }}>{error}</div>}
          {/* 按钮行 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                if (totalSelected === 0) { setError('请至少选择1个宝笱'); return; }
                if (insufficientGold) { setError(`金币不足，需要 ${totalFee.toFixed(0)} 金币，当前 ${myGold.toFixed(0)} 金币`); return; }
                setError('');
                createRoom.mutate({ maxPlayers, boxIds: selectedBoxIds });
              }}
              disabled={createRoom.isPending || insufficientGold}
              style={{
                padding: `${q(14)} ${q(36)}`,
                background: insufficientGold
                  ? 'rgba(120,60,220,0.2)'
                  : 'linear-gradient(135deg,#7c3aed,#c084fc)',
                border: insufficientGold ? '1.5px solid rgba(120,60,220,0.3)' : 'none',
                borderRadius: q(10),
                color: insufficientGold ? '#6b7280' : '#fff',
                fontSize: q(28), fontWeight: 700,
                cursor: insufficientGold ? 'not-allowed' : 'pointer',
                opacity: createRoom.isPending ? 0.6 : 1,
              }}
            >
              {createRoom.isPending ? '创建中...' : insufficientGold ? '余额不足' : '创建房间'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 房间卡片 ──────────────────────────────────────────────────────────────

interface RoomCardProps {
  room: {
    id: number;
    roomNo: string;
    creatorNickname: string;
    creatorAvatar: string;
    maxPlayers: number;
    currentPlayers: number;
    rounds: number;
    entryFee: string;
    status: string;
  };
  onClick: () => void;
}

function RoomCard({ room, onClick }: RoomCardProps) {
  const isFull = room.currentPlayers >= room.maxPlayers;
  const statusColor = room.status === 'finished' ? '#60a5fa' : isFull ? '#ef4444' : '#22c55e';
  const statusBg = room.status === 'finished' ? 'rgba(96,165,250,0.15)' : isFull ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)';
  const statusText = room.status === 'finished' ? '已结束' : isFull ? '已满' : `${room.currentPlayers}/${room.maxPlayers}`;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'linear-gradient(160deg,rgba(30,10,65,0.95) 0%,rgba(15,5,40,0.98) 100%)',
        border: '1.5px solid rgba(120,60,220,0.4)',
        borderRadius: q(14),
        padding: q(14),
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(80,20,160,0.2)',
        transition: 'border-color 0.2s, transform 0.15s',
        display: 'flex', flexDirection: 'column', gap: q(10),
        minHeight: q(240),
      }}
    >
      {/* 顶部：头像 + 昵称 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: q(10) }}>
        <img
          src={`/img/avatars/${room.creatorAvatar}.png`}
          alt=""
          style={{
            width: q(48), height: q(48), borderRadius: '50%',
            border: '2px solid rgba(120,60,220,0.5)',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            color: '#e0d0ff', fontSize: q(24), fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{room.creatorNickname}</div>
          <div style={{ color: '#9980cc', fontSize: q(20) }}>#{room.roomNo}</div>
        </div>
      </div>

      {/* 中间：金额 + 状态标签 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#ffd700', fontSize: q(28), fontWeight: 700, display: 'flex', alignItems: 'center', gap: q(6) }}>
          <img src="/img/jinbi1.png" alt="" style={{ width: q(28), height: q(28), flexShrink: 0 }} />
          <span>{parseFloat(room.entryFee).toFixed(0)}</span>
        </div>
        <div style={{
          padding: `${q(3)} ${q(12)}`,
          background: statusBg,
          border: `1px solid ${statusColor}`,
          borderRadius: q(16), color: statusColor,
          fontSize: q(20), fontWeight: 600,
        }}>
          {statusText}
        </div>
      </div>

      {/* 底部：轮数 + 人数 */}
      <div style={{
        marginTop: 'auto', paddingTop: q(8),
        borderTop: '1px solid rgba(120,60,220,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#9ca3af', fontSize: q(20) }}>
          {room.rounds}轮
        </span>
        <span style={{ color: '#9ca3af', fontSize: q(20) }}>
          {room.maxPlayers}人场
        </span>
        {room.status === 'finished' ? (
          <span style={{ color: '#60a5fa', fontSize: q(20) }}>回放 ›</span>
        ) : (
          <span style={{ color: '#c084fc', fontSize: q(20) }}>
            {room.status === 'waiting' ? '加入 ›' : '观战 ›'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────

export default function Arena() {
  const [, navigate] = useLocation();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'waiting' | 'playing' | 'all'>('waiting');

  // 从服务器获取初始房间列表
  const { data: roomsData, refetch } = trpc.arena.getRooms.useQuery(
    {
      status: activeTab,
      page: 1,
      pageSize: 30,
    },
    {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    }
  );

  // 本地房间列表（WebSocket实时更新）
  const [liveRooms, setLiveRooms] = useState<typeof roomsData | null>(null);

  // WebSocket 消息处理
  const handleWsMessage = useCallback((msg: { type: string; [key: string]: unknown }) => {
    if (msg.type === 'room_list_update') {
      setLiveRooms(msg.rooms as typeof roomsData);
    } else if (msg.type === 'room_removed') {
      setLiveRooms((prev) => prev ? (prev as any[]).filter((r: any) => r.id !== msg.roomId) : prev);
    }
  }, []);

  const { subscribeList } = useArenaWS({
    onMessage: handleWsMessage,
    subscribeList: true,
  });

  const displayRooms = liveRooms ?? roomsData;

  // 点击房间卡片：直接进入房间页面（观战模式）
  // 玩家需在 ArenaRoom 内主动点击“加入”按钮占座（joinSeat）

  return (
<PageSlideIn>
        <div className="phone-container" style={{ display: 'flex', flexDirection: 'column', containerType: 'inline-size', position: 'relative', background: '#0d0621' }}>
      {/* 背景 */}
      <img
        src="https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/bg_98756154.png"
        alt=""
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }}
      />

      {/* 固定顶部 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <TopNav onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
        <PlayerInfoCard />
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${q(12)} ${q(20)}`, paddingBottom: q(80), position: 'relative', zIndex: 1 }}>
        {/* 页面标题 + 创建按鈕 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: q(16) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: q(12) }}>
            <img src="/img/jingjichangk.png" alt="" style={{ width: q(40), height: q(40), objectFit: 'contain' }} />
            <span style={{ color: '#c084fc', fontSize: q(36), fontWeight: 800, textShadow: '0 0 12px rgba(192,132,252,0.6)' }}>竞技场</span>
          </div>
          <div style={{ display: 'flex', gap: q(10) }}>
            <button
              onClick={() => navigate('/arena-history')}
              style={{
                padding: `${q(10)} ${q(20)}`,
                background: 'rgba(120,60,220,0.2)',
                border: '1.5px solid rgba(120,60,220,0.4)',
                borderRadius: q(16), color: '#c084fc',
                fontSize: q(22), fontWeight: 600, cursor: 'pointer',
              }}
            >
              🏆 我的记录
            </button>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: `${q(10)} ${q(24)}`,
                background: 'linear-gradient(135deg,#7c3aed,#c084fc)',
                border: 'none', borderRadius: q(16),
                color: '#fff', fontSize: q(24), fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(124,58,237,0.5)',
              }}
            >
              + 创建
            </button>
          </div>
        </div>

        {/* Tab切换 */}
        <div style={{ display: 'flex', gap: q(8), marginBottom: q(16) }}>
          {(['waiting', 'playing', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setLiveRooms(null); refetch(); }}
              style={{
                padding: `${q(10)} ${q(20)}`,
                background: activeTab === tab ? 'rgba(124,58,237,0.4)' : 'rgba(120,60,220,0.1)',
                border: `1px solid ${activeTab === tab ? '#c084fc' : 'rgba(120,60,220,0.3)'}`,
                borderRadius: q(20), color: activeTab === tab ? '#c084fc' : '#888',
                fontSize: q(24), cursor: 'pointer',
              }}
            >
              {tab === 'waiting' ? '等待中' : tab === 'playing' ? '进行中' : '全部'}
            </button>
          ))}
        </div>

        {/* 房间列表（每行2个卡片） */}
        {!displayRooms || (displayRooms as any[]).length === 0 ? (
          <div style={{ textAlign: 'center', padding: `${q(80)} 0`, color: '#6b7280', fontSize: q(28) }}>
            <div style={{ fontSize: q(60), marginBottom: q(16) }}>🏟️</div>
            暂无房间，快来创建一个吧！
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: q(12) }}>
            {(displayRooms as any[]).map((room: any) => (
              <RoomCard
                key={room.id}
                room={room}
                onClick={() => navigate(`/arena/${room.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 创建房间弹窗 */}
      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={(roomId) => {
            // 创建房间后跳转进入房间内部
            setShowCreate(false);
            navigate(`/arena/${roomId}`);
          }}
        />
      )}

      {/* 底部导航 */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <BottomNav />
      </div>

      {/* 设置弹窗 */}
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </div>
    </PageSlideIn>
  );
}
