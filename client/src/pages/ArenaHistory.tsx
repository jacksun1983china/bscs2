/**
 * ArenaHistory.tsx — 竞技场历史记录页
 * 展示玩家参与过的所有竞技场对战记录（胜负、获得物品价值、金币变化）
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import SettingsModal from '@/components/SettingsModal';

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';

// 状态标签
const STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  waiting:  { text: '等待中', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
  playing:  { text: '进行中', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  finished: { text: '已结束', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  cancelled:{ text: '已取消', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
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

function RecordCard({ record }: { record: RecordItem }) {
  const [, navigate] = useLocation();
  const room = record.room;
  if (!room) return null;

  const isWinner = record.isWinner === 1;
  const status = STATUS_LABEL[room.status] ?? STATUS_LABEL.finished;
  const totalValue = parseFloat(record.totalValue ?? '0');
  const entryFee = parseFloat(room.entryFee ?? '0');
  const profit = isWinner ? (totalValue - entryFee).toFixed(2) : (-entryFee).toFixed(2);
  const profitNum = parseFloat(profit);
  const createdAt = record.createdAt
    ? new Date(typeof record.createdAt === 'object' ? (record.createdAt as Date).getTime() : Number(record.createdAt))
    : null;
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
      {/* 胜利光晕 */}
      {isWinner && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: q(120), height: q(120),
          background: 'radial-gradient(circle, rgba(245,200,66,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* 顶部：房间号 + 状态 + 时间 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: q(12) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: q(10) }}>
          {isWinner && (
            <span style={{ fontSize: q(28) }}>👑</span>
          )}
          <span style={{ color: '#c084fc', fontSize: q(28), fontWeight: 700 }}>
            #{room.roomNo}
          </span>
          <span style={{
            background: status.bg,
            color: status.color,
            fontSize: q(18), borderRadius: q(6),
            padding: `${q(2)} ${q(10)}`,
          }}>
            {status.text}
          </span>
        </div>
        {createdAt && (
          <span style={{ color: '#6b7280', fontSize: q(18) }}>
            {createdAt.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
            {' '}
            {createdAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* 中部：对战信息 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: q(20), marginBottom: q(12) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: q(8) }}>
          <img
            src="/img/huizhang.png"
            alt=""
            style={{ width: q(32), height: q(32), objectFit: 'contain', opacity: 0.85 }}
          />
          <span style={{ color: '#9980cc', fontSize: q(22) }}>
            {room.maxPlayers}人对战 · {room.rounds}轮
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: q(6) }}>
          <span style={{ color: '#9ca3af', fontSize: q(22) }}>入场费</span>
          <span style={{ color: '#ffd700', fontSize: q(22), fontWeight: 600 }}>
            {entryFee.toFixed(0)} 金币
          </span>
        </div>
      </div>

      {/* 底部：开箱总价值 + 盈亏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            {profitNum >= 0 ? '+' : ''}{profit}
          </span>
          <span style={{ color: profitNum >= 0 ? '#22c55e' : '#ef4444', fontSize: q(18) }}>金币</span>
        </div>
      </div>

      {/* 胜利标签 */}
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

      {/* 操作按钮 */}
      <div
        style={{ display: 'flex', gap: q(12), marginTop: q(16) }}
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
      </div>
    </div>
  );
}

export default function ArenaHistory() {
  const [, navigate] = useLocation();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data: records, isLoading, error } = trpc.arena.getMyRecords.useQuery(
    { page, pageSize: PAGE_SIZE },
    { refetchOnWindowFocus: false }
  );

  const hasMore = (records?.length ?? 0) >= PAGE_SIZE;

  return (
    <div className="phone-container" style={{ display: 'flex', flexDirection: 'column', containerType: 'inline-size', position: 'relative', background: '#0d0621' }}>
      {/* 背景 */}
      <img
        src="https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/bg_98756154.png"
        alt=""
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }}
      />

      {/* 顶部导航 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <TopNav onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${q(16)} ${q(20)}`, paddingBottom: q(80), position: 'relative', zIndex: 1 }}>

        {/* 标题栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: q(16), marginBottom: q(24) }}>
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

        {/* 统计卡片 */}
        {records && records.length > 0 && (
          <div style={{
            display: 'flex', gap: q(12), marginBottom: q(24),
          }}>
            {[
              {
                label: '总场次',
                value: records.length,
                color: '#c084fc',
                suffix: '场',
              },
              {
                label: '胜场',
                value: records.filter((r) => r.isWinner === 1).length,
                color: '#f5c842',
                suffix: '场',
              },
              {
                label: '胜率',
                value: records.length > 0
                  ? Math.round((records.filter((r) => r.isWinner === 1).length / records.length) * 100)
                  : 0,
                color: '#22c55e',
                suffix: '%',
              },
            ].map((stat) => (
              <div key={stat.label} style={{
                flex: 1,
                background: 'rgba(20,8,50,0.85)',
                border: '1px solid rgba(120,60,220,0.3)',
                borderRadius: q(12), padding: `${q(12)} ${q(8)}`,
                textAlign: 'center',
              }}>
                <div style={{ color: '#9ca3af', fontSize: q(20), marginBottom: q(4) }}>{stat.label}</div>
                <div style={{ color: stat.color, fontSize: q(36), fontWeight: 800 }}>
                  {stat.value}<span style={{ fontSize: q(20) }}>{stat.suffix}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 加载中 */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: `${q(60)} 0`, color: '#9ca3af', fontSize: q(26) }}>
            <div style={{ fontSize: q(60), marginBottom: q(16), animation: 'pulse 1.5s ease-in-out infinite' }}>⏳</div>
            加载中...
          </div>
        )}

        {/* 错误 */}
        {error && (
          <div style={{
            textAlign: 'center', padding: `${q(40)} 0`,
            color: '#ef4444', fontSize: q(24),
          }}>
            {error.message.includes('UNAUTHORIZED') ? '请先登录' : '加载失败，请重试'}
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && !error && records?.length === 0 && (
          <div style={{ textAlign: 'center', padding: `${q(80)} 0` }}>
            <div style={{ fontSize: q(80), marginBottom: q(20) }}>🎮</div>
            <div style={{ color: '#9ca3af', fontSize: q(28) }}>暂无竞技场记录</div>
            <div style={{ color: '#6b7280', fontSize: q(22), marginTop: q(12) }}>快去挑战对手吧！</div>
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

        {/* 记录列表 */}
        {!isLoading && records && records.map((record) => (
          <RecordCard key={record.id} record={record as RecordItem} />
        ))}

        {/* 分页 */}
        {!isLoading && records && records.length > 0 && (
          <div style={{ display: 'flex', gap: q(12), justifyContent: 'center', marginTop: q(8) }}>
            {page > 1 && (
              <button
                onClick={() => setPage((p) => p - 1)}
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
                onClick={() => setPage((p) => p + 1)}
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

      {/* 底部导航 */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <BottomNav />
      </div>

      {/* 设置弹窗 */}
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
