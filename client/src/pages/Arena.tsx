/**
 * Arena.tsx — 竞技场房间列表页
 * 布局：顶部导航 → 玩家信息卡 → 创建房间按钮 → 房间列表（WebSocket实时刷新）→ 底部导航
 */
import { PageSlideIn } from '@/components/PageTransition';
import { useState, useCallback, useRef, useEffect } from 'react';
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

type GoldFilterTab = 'all' | '1-200' | '201-800' | '800+';

const GOLD_FILTER_OPTIONS: Array<{ key: GoldFilterTab; label: string }> = [
  { key: 'all', label: '全部' },
  { key: '1-200', label: '1-200' },
  { key: '201-800', label: '201-800' },
  { key: '800+', label: '800+' },
];

function buildBoxCounts(boxIds: number[]) {
  return boxIds.reduce<Record<number, number>>((acc, boxId) => {
    acc[boxId] = (acc[boxId] ?? 0) + 1;
    return acc;
  }, {});
}

function formatBoxProbability(probability: string | number) {
  const parsed = Number(probability);
  if (!Number.isFinite(parsed)) return `${probability}`;
  const normalized = parsed % 1 === 0 ? parsed.toFixed(0) : parsed.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  return `${normalized}%`;
}

function formatBoxPrice(price: string | number) {
  const parsed = Number(price);
  if (!Number.isFinite(parsed)) return `${price}`;
  return parsed.toFixed(0);
}

// ── 创建房间弹窗 ──────────────────────────────────────────────────────────

interface CreateRoomPreset {
  maxPlayers: number;
  boxIds: number[];
  sourceRoomNo?: string;
}

interface CreateRoomModalProps {
  onClose: () => void;
  onCreated: (roomId: number) => void;
  preset?: CreateRoomPreset | null;
}

function CreateRoomModal({ onClose, onCreated, preset }: CreateRoomModalProps) {
  const presetBoxKey = (preset?.boxIds ?? []).join(',');
  const [maxPlayers, setMaxPlayers] = useState(preset?.maxPlayers ?? 2);
  // 叠加选择：宝笱ID -> 数量
  const [boxCounts, setBoxCounts] = useState<Record<number, number>>(() => buildBoxCounts(preset?.boxIds ?? []));
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
  const [detailBoxId, setDetailBoxId] = useState<number | null>(null);
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
  const { data: detailBoxData, isLoading: detailLoading } = trpc.sku.boxDetail.useQuery(
    { id: detailBoxId ?? 0 },
    { enabled: detailBoxId !== null, staleTime: 60_000 }
  );
  const detailBoxMeta = (boxList?.list?.find((b: any) => b.id === detailBoxId)
    ?? allBoxes.find((b: any) => b.id === detailBoxId)
    ?? null) as any;

  const createRoom = trpc.arena.createRoom.useMutation({
    onSuccess: (data) => {
      onCreated(data.roomId);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  useEffect(() => {
    setMaxPlayers(preset?.maxPlayers ?? 2);
    setBoxCounts(buildBoxCounts(preset?.boxIds ?? []));
    setError('');
  }, [preset?.maxPlayers, presetBoxKey]);

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

  const totalFee = allBoxes.reduce((sum: number, box: any) => {
    return sum + parseFloat(box.price ?? '0') * (boxCounts[box.id] ?? 0);
  }, 0);

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
          {preset?.boxIds?.length ? (
            <div style={{
              marginBottom: q(16),
              padding: `${q(10)} ${q(14)}`,
              borderRadius: q(10),
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.28)',
              color: '#86efac',
              fontSize: q(20),
              lineHeight: 1.5,
            }}>
              已按对局 {preset.sourceRoomNo ? `#${preset.sourceRoomNo}` : ''} 预选相同的宝箱顺序与对战人数，你可以继续手动调整。
            </div>
          ) : null}
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
            <div style={{ color: '#9ca3af', fontSize: q(24), marginBottom: q(12) }}>选择宝箱（已选 <span style={{ color: '#c084fc', fontWeight: 700 }}>{totalSelected}</span> 个，最多 10 个）</div>
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
                  <button
                    onClick={e => { e.stopPropagation(); setDetailBoxId(box.id); }}
                    style={{
                      marginTop: q(8),
                      width: '100%',
                      padding: `${q(6)} 0`,
                      background: 'rgba(120,60,220,0.18)',
                      border: '1px solid rgba(192,132,252,0.45)',
                      borderRadius: q(8),
                      color: '#d8b4fe',
                      fontSize: q(18),
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    详情
                  </button>
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

      {detailBoxId !== null && (
        <div
          onClick={() => setDetailBoxId(null)}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 220,
            background: 'rgba(0,0,0,0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: q(20),
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: q(620),
              maxHeight: '72cqh',
              background: 'linear-gradient(160deg,#1a0a3a 0%,#0d0621 100%)',
              border: '1.5px solid rgba(120,60,220,0.6)',
              borderRadius: q(16),
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            }}
          >
            <div style={{
              padding: `${q(18)} ${q(20)}`,
              borderBottom: '1px solid rgba(120,60,220,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: q(12),
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#e9d5ff', fontSize: q(30), fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {detailBoxData?.name || detailBoxMeta?.name || '宝箱详情'}
                </div>
                <div style={{ marginTop: q(6), color: '#fcd34d', fontSize: q(22), display: 'flex', alignItems: 'center', gap: q(6) }}>
                  <img src="/img/jinbi1.png" alt="" style={{ width: q(22), height: q(22) }} />
                  <span>{formatBoxPrice(detailBoxData?.price ?? detailBoxMeta?.price ?? 0)}</span>
                  <span style={{ color: '#9980cc', fontSize: q(20) }}>箱内物品与概率</span>
                </div>
              </div>
              <button
                onClick={() => setDetailBoxId(null)}
                style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: q(30), cursor: 'pointer', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: q(16), overflowY: 'auto', flex: 1 }}>
              {detailLoading ? (
                <div style={{ color: '#9980cc', fontSize: q(24), textAlign: 'center', padding: `${q(60)} 0` }}>正在加载宝箱详情...</div>
              ) : (detailBoxData?.goods?.length ?? 0) === 0 ? (
                <div style={{ color: '#9980cc', fontSize: q(24), textAlign: 'center', padding: `${q(60)} 0` }}>当前宝箱暂无物品数据</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: q(10) }}>
                  {(detailBoxData?.goods ?? []).map((goods: any) => (
                    <div
                      key={goods.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `${q(84)} 1fr auto`,
                        gap: q(12),
                        alignItems: 'center',
                        padding: q(10),
                        borderRadius: q(12),
                        background: 'rgba(20,8,50,0.78)',
                        border: `1px solid ${LEVEL_COLOR[goods.level ?? 3] ?? 'rgba(120,60,220,0.3)'}`,
                      }}
                    >
                      <img
                        src={goods.imageUrl || `${CDN}/a888e4d9c59e44cf49c0949345509ee4_32c3c37e.png`}
                        alt={goods.name}
                        style={{ width: q(84), height: q(84), objectFit: 'contain', borderRadius: q(10), background: 'rgba(255,255,255,0.03)' }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#f3e8ff', fontSize: q(22), fontWeight: 600, lineHeight: 1.35 }}>{goods.name}</div>
                        <div style={{ marginTop: q(8), display: 'flex', alignItems: 'center', gap: q(8), flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: `${q(2)} ${q(10)}`,
                            borderRadius: q(999),
                            color: LEVEL_COLOR[goods.level ?? 3] ?? '#9ca3af',
                            border: `1px solid ${LEVEL_COLOR[goods.level ?? 3] ?? '#9ca3af'}`,
                            fontSize: q(18),
                            fontWeight: 600,
                          }}>
                            {LEVEL_LABEL[goods.level ?? 3] ?? '普通'}
                          </span>
                          <span style={{ color: '#9980cc', fontSize: q(18) }}>概率 {formatBoxProbability(goods.probability ?? 0)}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ color: '#9980cc', fontSize: q(18), marginBottom: q(6) }}>参考价</div>
                        <div style={{ color: '#fcd34d', fontSize: q(22), fontWeight: 700, display: 'flex', alignItems: 'center', gap: q(4) }}>
                          <img src="/img/jinbi1.png" alt="" style={{ width: q(18), height: q(18) }} />
                          <span>{formatBoxPrice(goods.price ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
  const [createPreset, setCreatePreset] = useState<CreateRoomPreset | null>(null);
  const [activeTab, setActiveTab] = useState<'waiting' | 'playing' | 'all'>('waiting');
  const [activeGoldFilter, setActiveGoldFilter] = useState<GoldFilterTab>('all');
  const copyRoomId = typeof window !== 'undefined'
    ? Number(new URLSearchParams(window.location.search).get('copyRoomId') ?? '0')
    : 0;

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
  const filteredRooms = (displayRooms as any[] | undefined)?.filter((room: any) => {
    const entryFee = Number(room.entryFee ?? 0);
    if (!Number.isFinite(entryFee) || entryFee <= 0) {
      return activeGoldFilter === 'all';
    }
    if (activeGoldFilter === '1-200') return entryFee >= 1 && entryFee <= 200;
    if (activeGoldFilter === '201-800') return entryFee >= 201 && entryFee <= 800;
    if (activeGoldFilter === '800+') return entryFee > 800;
    return true;
  }) ?? [];

  const copyRoomQuery = trpc.arena.getRoomDetail.useQuery(
    { roomId: copyRoomId },
    { enabled: copyRoomId > 0, staleTime: 30_000 }
  );
  const copyPrefillRef = useRef(0);

  useEffect(() => {
    if (copyRoomId <= 0 || !copyRoomQuery.data) return;
    if (copyPrefillRef.current === copyRoomId) return;
    copyPrefillRef.current = copyRoomId;
    setCreatePreset({
      maxPlayers: copyRoomQuery.data.room.maxPlayers,
      boxIds: (copyRoomQuery.data.boxList ?? []).map((box: any) => box.id),
      sourceRoomNo: copyRoomQuery.data.room.roomNo,
    });
    setShowCreate(true);
  }, [copyRoomId, copyRoomQuery.data]);

  const closeCreateModal = () => {
    setShowCreate(false);
    setCreatePreset(null);
    copyPrefillRef.current = 0;
    if (copyRoomId > 0) {
      navigate('/arena');
    }
  };

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
              onClick={() => {
                setCreatePreset(null);
                setShowCreate(true);
              }}
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

        <div style={{ marginBottom: q(18) }}>
          <div style={{ color: 'rgba(224,208,255,0.86)', fontSize: q(22), marginBottom: q(10) }}>金币区间筛选</div>
          <div style={{ display: 'flex', gap: q(10), flexWrap: 'wrap' }}>
            {GOLD_FILTER_OPTIONS.map((option) => {
              const isActive = activeGoldFilter === option.key;
              return (
                <button
                  key={option.key}
                  onClick={() => setActiveGoldFilter(option.key)}
                  style={{
                    padding: `${q(10)} ${q(18)}`,
                    background: isActive ? 'rgba(124,58,237,0.4)' : 'rgba(120,60,220,0.1)',
                    border: `1px solid ${isActive ? '#c084fc' : 'rgba(120,60,220,0.3)'}`,
                    borderRadius: q(18),
                    color: isActive ? '#f5d0fe' : '#9980cc',
                    fontSize: q(22),
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 0 12px rgba(192,132,252,0.25)' : 'none',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 房间列表（每行2个卡片） */}
        {!displayRooms || (displayRooms as any[]).length === 0 ? (
          <div style={{ textAlign: 'center', padding: `${q(80)} 0`, color: '#6b7280', fontSize: q(28) }}>
            <div style={{ fontSize: q(60), marginBottom: q(16) }}>🏟️</div>
            暂无房间，快来创建一个吧！
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: `${q(60)} 0`, color: '#9980cc', fontSize: q(24) }}>
            当前金币区间暂无房间
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: q(12) }}>
            {filteredRooms.map((room: any) => (
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
          preset={createPreset}
          onClose={closeCreateModal}
          onCreated={(roomId) => {
            // 创建房间后跳转进入房间内部
            setShowCreate(false);
            setCreatePreset(null);
            copyPrefillRef.current = 0;
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
