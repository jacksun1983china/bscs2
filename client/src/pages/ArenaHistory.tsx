/**
 * ArenaHistory.tsx — 竞技场历史记录页
 * 支持：我的记录 / 全服记录、金额区间筛选、最大增长、最佳欧皇、复制对局
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import SettingsModal from '@/components/SettingsModal';

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

type ViewMode = 'mine' | 'global';
type AmountRange = 'all' | '1-200' | '201-800' | '800+';
type SortMode = 'latest' | 'maxGrowth' | 'bestLuck';

const RANGE_OPTIONS: Array<{ key: AmountRange; label: string }> = [
  { key: 'all', label: '全部' },
  { key: '1-200', label: '1-200' },
  { key: '201-800', label: '201-800' },
  { key: '800+', label: '800+' },
];

const SORT_OPTIONS: Array<{ key: SortMode; label: string; desc: string }> = [
  { key: 'latest', label: '最新对局', desc: '按时间倒序' },
  { key: 'maxGrowth', label: '最大增长', desc: '总价值 - 入场费' },
  { key: 'bestLuck', label: '最佳欧皇', desc: '总价值 / 入场费' },
];

// 状态标签
const STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  waiting: { text: '等待中', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
  playing: { text: '进行中', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  finished: { text: '已结束', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  cancelled: { text: '已取消', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

interface RecordItem {
  id: number;
  roomId: number;
  playerId: number;
  nickname: string;
  seatNo: number;
  totalValue: string | null;
  isWinner: number;
  createdAt: Date | string | number | null;
  room?: {
    id: number;
    roomNo: string;
    maxPlayers: number;
    rounds: number;
    entryFee: string;
    status: string;
    winnerId: number | null;
    creatorNickname: string;
  } | null;
}

function toDate(value: Date | string | number | null) {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value as any);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function getProfit(record: RecordItem) {
  const room = record.room;
  if (!room) return 0;
  return parseFloat(record.totalValue ?? '0') - parseFloat(room.entryFee ?? '0');
}

function getLuckRatio(record: RecordItem) {
  const room = record.room;
  if (!room) return 0;
  const fee = parseFloat(room.entryFee ?? '0');
  const totalValue = parseFloat(record.totalValue ?? '0');
  return fee > 0 ? totalValue / fee : 0;
}

function formatDateLabel(value: Date | string | number | null) {
  const date = toDate(value);
  if (!date) return '';
  return `${date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
}

function StatCard({ label, value, suffix, color }: { label: string; value: string | number; suffix?: string; color: string }) {
  return (
    <div style={{
      flex: 1,
      background: 'rgba(20,8,50,0.85)',
      border: '1px solid rgba(120,60,220,0.3)',
      borderRadius: q(12),
      padding: `${q(12)} ${q(8)}`,
      textAlign: 'center',
    }}>
      <div style={{ color: '#9ca3af', fontSize: q(20), marginBottom: q(4) }}>{label}</div>
      <div style={{ color, fontSize: q(34), fontWeight: 800, lineHeight: 1.15 }}>
        {value}
        {suffix ? <span style={{ fontSize: q(18), marginLeft: q(2) }}>{suffix}</span> : null}
      </div>
    </div>
  );
}

function RecordCard({ record, showPlayer, onCopy }: { record: RecordItem; showPlayer: boolean; onCopy: (roomId: number) => void }) {
  const [, navigate] = useLocation();
  const room = record.room;
  if (!room) return null;

  const isWinner = record.isWinner === 1;
  const status = STATUS_LABEL[room.status] ?? STATUS_LABEL.finished;
  const totalValue = parseFloat(record.totalValue ?? '0');
  const entryFee = parseFloat(room.entryFee ?? '0');
  const profitNum = getProfit(record);
  const luckRatio = getLuckRatio(record);
  const createdAtLabel = formatDateLabel(record.createdAt);
  const isFinished = room.status === 'finished';

  return (
    <div
      onClick={() => navigate(`/arena/${record.roomId}`)}
      style={{
        background: isWinner
          ? 'linear-gradient(135deg,rgba(245,200,66,0.12),rgba(200,134,10,0.08))'
          : 'rgba(20,8,50,0.85)',
        border: `1.5px solid ${isWinner ? 'rgba(245,200,66,0.5)' : 'rgba(120,60,220,0.3)'}`,
        borderRadius: q(16),
        padding: `${q(16)} ${q(20)}`,
        marginBottom: q(16),
        cursor: 'pointer',
        boxShadow: isWinner ? '0 0 20px rgba(245,200,66,0.15)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isWinner && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: q(120), height: q(120),
          background: 'radial-gradient(circle, rgba(245,200,66,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: q(12), gap: q(12) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: q(10), minWidth: 0, flexWrap: 'wrap' }}>
          {isWinner && <span style={{ fontSize: q(28) }}>👑</span>}
          <span style={{ color: '#c084fc', fontSize: q(28), fontWeight: 700 }}>#{room.roomNo}</span>
          <span style={{
            background: status.bg,
            color: status.color,
            fontSize: q(18),
            borderRadius: q(6),
            padding: `${q(2)} ${q(10)}`,
          }}>
            {status.text}
          </span>
          {showPlayer && (
            <span style={{
              color: '#e9d5ff',
              fontSize: q(18),
              background: 'rgba(120,60,220,0.15)',
              border: '1px solid rgba(192,132,252,0.3)',
              borderRadius: q(999),
              padding: `${q(2)} ${q(10)}`,
            }}>
              玩家 {record.nickname}
            </span>
          )}
        </div>
        {createdAtLabel && (
          <span style={{ color: '#6b7280', fontSize: q(18), flexShrink: 0 }}>
            {createdAtLabel}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: q(10), marginBottom: q(12) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: q(20), flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: q(8) }}>
            <img
              src="/img/huizhang.png"
              alt=""
              style={{ width: q(32), height: q(32), objectFit: 'contain', opacity: 0.85 }}
            />
            <span style={{ color: '#9980cc', fontSize: q(22) }}>
              {room.maxPlayers}人对战 · {room.rounds}轮 · {record.seatNo}号位
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: q(6) }}>
            <span style={{ color: '#9ca3af', fontSize: q(22) }}>入场费</span>
            <span style={{ color: '#ffd700', fontSize: q(22), fontWeight: 600 }}>
              {entryFee.toFixed(0)} 金币
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: q(8), flexWrap: 'wrap' }}>
          <span style={{
            color: '#22c55e',
            fontSize: q(18),
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.28)',
            borderRadius: q(999),
            padding: `${q(3)} ${q(12)}`,
          }}>
            最大增长 {profitNum >= 0 ? '+' : ''}{profitNum.toFixed(2)}
          </span>
          <span style={{
            color: '#60a5fa',
            fontSize: q(18),
            background: 'rgba(96,165,250,0.12)',
            border: '1px solid rgba(96,165,250,0.28)',
            borderRadius: q(999),
            padding: `${q(3)} ${q(12)}`,
          }}>
            欧皇倍率 {luckRatio.toFixed(2)}x
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: q(16), flexWrap: 'wrap' }}>
        <div>
          <span style={{ color: '#9ca3af', fontSize: q(20) }}>开箱总价值 </span>
          <span style={{ color: '#e0d0ff', fontSize: q(24), fontWeight: 600 }}>
            ¥{totalValue.toFixed(2)}
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: q(6),
          background: profitNum >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${profitNum >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          borderRadius: q(8), padding: `${q(4)} ${q(12)}`,
        }}>
          <span style={{ color: profitNum >= 0 ? '#22c55e' : '#ef4444', fontSize: q(22), fontWeight: 700 }}>
            {profitNum >= 0 ? '+' : ''}{profitNum.toFixed(2)}
          </span>
          <span style={{ color: profitNum >= 0 ? '#22c55e' : '#ef4444', fontSize: q(18) }}>金币</span>
        </div>
      </div>

      {isWinner && (
        <div style={{
          position: 'absolute', top: q(12), right: q(16),
          background: 'linear-gradient(135deg,#f5c842,#c8860a)',
          borderRadius: q(8), padding: `${q(4)} ${q(14)}`,
          color: '#fff', fontSize: q(20), fontWeight: 700,
          boxShadow: '0 2px 8px rgba(245,200,66,0.4)',
        }}>
          胜利
        </div>
      )}

      <div
        style={{ display: 'flex', gap: q(10), marginTop: q(16) }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => navigate(`/arena/${record.roomId}`)}
          style={{
            flex: 1,
            padding: `${q(10)} 0`,
            background: 'rgba(120,60,220,0.2)',
            border: '1px solid rgba(120,60,220,0.4)',
            borderRadius: q(10), color: '#c084fc',
            fontSize: q(22), cursor: 'pointer',
          }}
        >
          查看结果
        </button>
        {isFinished && (
          <button
            onClick={() => navigate(`/arena/${record.roomId}?replay=1`)}
            style={{
              flex: 1,
              padding: `${q(10)} 0`,
              background: isWinner
                ? 'linear-gradient(135deg,rgba(245,200,66,0.25),rgba(200,134,10,0.15))'
                : 'rgba(96,165,250,0.15)',
              border: `1px solid ${isWinner ? 'rgba(245,200,66,0.5)' : 'rgba(96,165,250,0.4)'}`,
              borderRadius: q(10),
              color: isWinner ? '#f5c842' : '#60a5fa',
              fontSize: q(22), fontWeight: 700, cursor: 'pointer',
            }}
          >
            ▶ 回放
          </button>
        )}
        <button
          onClick={() => onCopy(record.roomId)}
          style={{
            flex: 1,
            padding: `${q(10)} 0`,
            background: 'rgba(34,197,94,0.16)',
            border: '1px solid rgba(34,197,94,0.35)',
            borderRadius: q(10),
            color: '#4ade80',
            fontSize: q(22),
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          复制对局
        </button>
      </div>
    </div>
  );
}

export default function ArenaHistory() {
  const [, navigate] = useLocation();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('mine');
  const [amountRange, setAmountRange] = useState<AmountRange>('all');
  const [sortBy, setSortBy] = useState<SortMode>('latest');
  const [page, setPage] = useState(1);

  const pageSize = viewMode === 'global' ? 6 : 10;
  const queryInput = { page, pageSize, amountRange, sortBy };

  const myQuery = trpc.arena.getMyRecords.useQuery(queryInput, {
    enabled: viewMode === 'mine',
    refetchOnWindowFocus: false,
  });

  const globalQuery = trpc.arena.getGlobalRecords.useQuery(queryInput, {
    enabled: viewMode === 'global',
    refetchOnWindowFocus: false,
  });

  const activeQuery = viewMode === 'global' ? globalQuery : myQuery;
  const records = (activeQuery.data ?? []) as RecordItem[];
  const isLoading = activeQuery.isLoading;
  const error = activeQuery.error;
  const hasMore = records.length >= pageSize;

  const winCount = records.filter((record) => record.isWinner === 1).length;
  const topGrowth = records.length > 0
    ? Math.max(...records.map((record) => getProfit(record)))
    : 0;
  const topLuck = records.length > 0
    ? Math.max(...records.map((record) => getLuckRatio(record)))
    : 0;

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setPage(1);
  };

  const handleAmountRangeChange = (range: AmountRange) => {
    setAmountRange(range);
    setPage(1);
  };

  const handleSortChange = (sort: SortMode) => {
    setSortBy(sort);
    setPage(1);
  };

  const handleCopyRoom = (roomId: number) => {
    navigate(`/arena?copyRoomId=${roomId}`);
  };

  return (
    <div className="phone-container" style={{ display: 'flex', flexDirection: 'column', containerType: 'inline-size', position: 'relative', background: '#0d0621' }}>
      <img
        src="https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/bg_98756154.png"
        alt=""
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }}
      />

      <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <TopNav onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: `${q(16)} ${q(20)}`, paddingBottom: q(100), position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: q(16), marginBottom: q(20) }}>
          <button
            onClick={() => navigate('/arena')}
            style={{
              background: 'rgba(120,60,220,0.2)', border: '1.5px solid rgba(120,60,220,0.4)',
              borderRadius: q(10), padding: `${q(8)} ${q(16)}`,
              color: '#c084fc', fontSize: q(24), cursor: 'pointer',
            }}
          >
            ← 返回
          </button>
          <div style={{ color: '#fff', fontSize: q(32), fontWeight: 800 }}>
            🏆 竞技场记录
          </div>
        </div>

        <div style={{
          background: 'rgba(20,8,50,0.78)',
          border: '1px solid rgba(120,60,220,0.28)',
          borderRadius: q(16),
          padding: q(14),
          marginBottom: q(20),
        }}>
          <div style={{ display: 'flex', gap: q(10), marginBottom: q(12) }}>
            {([
              { key: 'global', label: '全服记录' },
              { key: 'mine', label: '我的记录' },
            ] as Array<{ key: ViewMode; label: string }>).map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleModeChange(tab.key)}
                style={{
                  flex: 1,
                  padding: `${q(12)} 0`,
                  background: viewMode === tab.key ? 'linear-gradient(135deg,#7c3aed,#c084fc)' : 'rgba(120,60,220,0.12)',
                  border: `1px solid ${viewMode === tab.key ? 'rgba(216,180,254,0.9)' : 'rgba(120,60,220,0.25)'}`,
                  borderRadius: q(12),
                  color: viewMode === tab.key ? '#fff' : '#b794f4',
                  fontSize: q(24),
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ color: '#9ca3af', fontSize: q(20), marginBottom: q(10) }}>
            金额区间筛选
          </div>
          <div style={{ display: 'flex', gap: q(8), flexWrap: 'wrap', marginBottom: q(14) }}>
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => handleAmountRangeChange(option.key)}
                style={{
                  padding: `${q(8)} ${q(16)}`,
                  background: amountRange === option.key ? 'rgba(124,58,237,0.38)' : 'rgba(120,60,220,0.1)',
                  border: `1px solid ${amountRange === option.key ? '#c084fc' : 'rgba(120,60,220,0.25)'}`,
                  borderRadius: q(20),
                  color: amountRange === option.key ? '#e9d5ff' : '#9980cc',
                  fontSize: q(20),
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div style={{ color: '#9ca3af', fontSize: q(20), marginBottom: q(10) }}>
            记录榜单与排序
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: q(10) }}>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => handleSortChange(option.key)}
                style={{
                  padding: `${q(12)} ${q(8)}`,
                  background: sortBy === option.key ? 'rgba(255,255,255,0.08)' : 'rgba(120,60,220,0.08)',
                  border: `1px solid ${sortBy === option.key ? 'rgba(245,200,66,0.6)' : 'rgba(120,60,220,0.25)'}`,
                  borderRadius: q(12),
                  color: sortBy === option.key ? '#fef3c7' : '#e9d5ff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: q(22), fontWeight: 700 }}>{option.label}</div>
                <div style={{ marginTop: q(6), fontSize: q(16), color: sortBy === option.key ? '#fde68a' : '#9980cc' }}>
                  {option.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {records.length > 0 && (
          <div style={{ display: 'flex', gap: q(12), marginBottom: q(20) }}>
            {viewMode === 'mine' ? (
              <>
                <StatCard label="当前页场次" value={records.length} suffix="场" color="#c084fc" />
                <StatCard label="当前页胜场" value={winCount} suffix="场" color="#f5c842" />
                <StatCard label="胜率" value={records.length > 0 ? Math.round((winCount / records.length) * 100) : 0} suffix="%" color="#22c55e" />
              </>
            ) : (
              <>
                <StatCard label="当前展示" value={records.length} suffix="条" color="#c084fc" />
                <StatCard label="最高增长" value={topGrowth >= 0 ? `+${topGrowth.toFixed(0)}` : topGrowth.toFixed(0)} suffix="金币" color="#22c55e" />
                <StatCard label="最佳欧皇" value={topLuck.toFixed(2)} suffix="x" color="#60a5fa" />
              </>
            )}
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: 'center', padding: `${q(60)} 0`, color: '#9ca3af', fontSize: q(26) }}>
            <div style={{ fontSize: q(60), marginBottom: q(16), animation: 'pulse 1.5s ease-in-out infinite' }}>⏳</div>
            记录加载中...
          </div>
        )}

        {error && (
          <div style={{
            textAlign: 'center', padding: `${q(40)} 0`,
            color: '#ef4444', fontSize: q(24),
          }}>
            {error.message.includes('UNAUTHORIZED') ? '请先登录后查看我的记录' : '加载失败，请稍后重试'}
          </div>
        )}

        {!isLoading && !error && records.length === 0 && (
          <div style={{ textAlign: 'center', padding: `${q(80)} 0` }}>
            <div style={{ fontSize: q(80), marginBottom: q(20) }}>🎮</div>
            <div style={{ color: '#9ca3af', fontSize: q(28) }}>
              {viewMode === 'global' ? '当前筛选下暂无全服记录' : '暂无竞技场记录'}
            </div>
            <div style={{ color: '#6b7280', fontSize: q(22), marginTop: q(12) }}>
              {viewMode === 'global'
                ? '可以尝试切换金额区间或排序方式'
                : '快去挑战对手吧！'}
            </div>
            <button
              onClick={() => navigate('/arena')}
              style={{
                marginTop: q(30),
                padding: `${q(16)} ${q(40)}`,
                background: 'linear-gradient(135deg,#7c3aed,#c084fc)',
                border: 'none', borderRadius: q(12),
                color: '#fff', fontSize: q(28), fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.5)',
              }}
            >
              进入竞技场
            </button>
          </div>
        )}

        {!isLoading && records.map((record) => (
          <RecordCard
            key={`${viewMode}-${record.id}`}
            record={record}
            showPlayer={viewMode === 'global'}
            onCopy={handleCopyRoom}
          />
        ))}

        {!isLoading && records.length > 0 && (
          <div style={{ display: 'flex', gap: q(12), justifyContent: 'center', marginTop: q(8) }}>
            {page > 1 && (
              <button
                onClick={() => setPage((prev) => prev - 1)}
                style={{
                  padding: `${q(12)} ${q(28)}`,
                  background: 'rgba(120,60,220,0.2)',
                  border: '1.5px solid rgba(120,60,220,0.4)',
                  borderRadius: q(10), color: '#c084fc',
                  fontSize: q(24), cursor: 'pointer',
                }}
              >
                上一页
              </button>
            )}
            <span style={{ color: '#9ca3af', fontSize: q(22), alignSelf: 'center' }}>第 {page} 页</span>
            {hasMore && (
              <button
                onClick={() => setPage((prev) => prev + 1)}
                style={{
                  padding: `${q(12)} ${q(28)}`,
                  background: 'rgba(120,60,220,0.2)',
                  border: '1.5px solid rgba(120,60,220,0.4)',
                  borderRadius: q(10), color: '#c084fc',
                  fontSize: q(24), cursor: 'pointer',
                }}
              >
                下一页
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <BottomNav />
      </div>

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
