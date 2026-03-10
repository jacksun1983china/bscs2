/**
 * AdminArena.tsx — 后台竞技场管理
 * 功能：查看竞技场房间记录、查看每局详情
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

const LEVEL_LABEL: Record<number, string> = { 1: '传说', 2: '稀有', 3: '普通', 4: '回收' };
const LEVEL_COLOR: Record<number, string> = {
  1: '#f5c842', 2: '#c084fc', 3: '#60a5fa', 4: '#9ca3af',
};

const STATUS_LABEL: Record<string, string> = {
  waiting: '等待中', playing: '进行中', finished: '已结束', cancelled: '已取消',
};
const STATUS_COLOR: Record<string, string> = {
  waiting: '#22c55e', playing: '#f59e0b', finished: '#6b7280', cancelled: '#ef4444',
};

interface AdminArenaProps {
  lang?: 'zh' | 'en';
}

export function AdminArena({ lang = 'zh' }: AdminArenaProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'waiting' | 'playing' | 'finished' | 'all'>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const { data: rooms, isLoading } = trpc.arena.getRooms.useQuery({
    status: statusFilter,
    page,
    pageSize: 20,
  });

  const { data: roomDetail } = trpc.arena.getRoomDetail.useQuery(
    { roomId: selectedRoomId! },
    { enabled: selectedRoomId !== null }
  );

  return (
    <div style={{ color: '#e0d0ff', fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#c084fc', marginBottom: 20 }}>
        🏟️ 竞技场管理
      </div>

      {/* 筛选栏 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {(['all', 'waiting', 'playing', 'finished'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{
              padding: '6px 16px',
              background: statusFilter === s ? 'rgba(124,58,237,0.4)' : 'rgba(120,60,220,0.1)',
              border: `1px solid ${statusFilter === s ? '#c084fc' : 'rgba(120,60,220,0.3)'}`,
              borderRadius: 8, color: statusFilter === s ? '#c084fc' : '#888',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            {s === 'all' ? '全部' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* 房间列表 */}
      <div style={{
        background: 'rgba(13,6,33,0.8)',
        border: '1px solid rgba(120,60,220,0.25)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(120,60,220,0.15)', color: '#9ca3af' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>房间号</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>创建者</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>人数</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>轮数</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>入场费</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>状态</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>创建时间</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>加载中...</td></tr>
            ) : !rooms || (rooms as any[]).length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>暂无数据</td></tr>
            ) : (
              (rooms as any[]).map((room: any) => (
                <tr
                  key={room.id}
                  style={{
                    borderTop: '1px solid rgba(120,60,220,0.1)',
                    background: selectedRoomId === room.id ? 'rgba(124,58,237,0.1)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '10px 16px', color: '#9980cc' }}>{room.id}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#e0d0ff' }}>{room.roomNo}</td>
                  <td style={{ padding: '10px 16px', color: '#e0d0ff' }}>{room.creatorNickname}</td>
                  <td style={{ padding: '10px 16px', color: '#9ca3af' }}>{room.currentPlayers}/{room.maxPlayers}</td>
                  <td style={{ padding: '10px 16px', color: '#9ca3af' }}>{room.rounds}</td>
                  <td style={{ padding: '10px 16px', color: '#ffd700' }}>{parseFloat(room.entryFee).toFixed(0)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 10px',
                      background: `${STATUS_COLOR[room.status]}22`,
                      border: `1px solid ${STATUS_COLOR[room.status]}`,
                      borderRadius: 10, color: STATUS_COLOR[room.status],
                      fontSize: 12,
                    }}>
                      {STATUS_LABEL[room.status] ?? room.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12 }}>
                    {new Date(room.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button
                      onClick={() => setSelectedRoomId(selectedRoomId === room.id ? null : room.id)}
                      style={{
                        padding: '4px 12px',
                        background: 'rgba(124,58,237,0.2)',
                        border: '1px solid rgba(124,58,237,0.5)',
                        borderRadius: 6, color: '#c084fc',
                        fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      {selectedRoomId === room.id ? '收起' : '详情'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{
            padding: '6px 14px', background: 'rgba(120,60,220,0.15)',
            border: '1px solid rgba(120,60,220,0.3)', borderRadius: 6,
            color: page === 1 ? '#6b7280' : '#c084fc', cursor: page === 1 ? 'not-allowed' : 'pointer',
          }}
        >上一页</button>
        <span style={{ padding: '6px 12px', color: '#9ca3af', fontSize: 13 }}>第 {page} 页</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!rooms || (rooms as any[]).length < 20}
          style={{
            padding: '6px 14px', background: 'rgba(120,60,220,0.15)',
            border: '1px solid rgba(120,60,220,0.3)', borderRadius: 6,
            color: (!rooms || (rooms as any[]).length < 20) ? '#6b7280' : '#c084fc',
            cursor: (!rooms || (rooms as any[]).length < 20) ? 'not-allowed' : 'pointer',
          }}
        >下一页</button>
      </div>

      {/* 房间详情面板 */}
      {selectedRoomId && roomDetail && (
        <div style={{
          marginTop: 24,
          background: 'rgba(13,6,33,0.9)',
          border: '1px solid rgba(120,60,220,0.4)',
          borderRadius: 12, padding: 20,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#c084fc', marginBottom: 16 }}>
            房间 #{roomDetail.room.roomNo} 详情
          </div>

          {/* 参与者 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8 }}>参与者</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {(roomDetail.players as any[]).map((p: any) => (
                <div key={p.id} style={{
                  background: p.isWinner ? 'rgba(245,200,66,0.1)' : 'rgba(120,60,220,0.1)',
                  border: `1px solid ${p.isWinner ? '#f5c842' : 'rgba(120,60,220,0.3)'}`,
                  borderRadius: 8, padding: '10px 16px', textAlign: 'center',
                }}>
                  {p.isWinner ? <div style={{ color: '#f5c842', fontSize: 12 }}>👑 胜利</div> : null}
                  <div style={{ color: '#e0d0ff', fontSize: 14, fontWeight: 600 }}>{p.nickname}</div>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>座位 {p.seatNo}</div>
                  <div style={{ color: '#ffd700', fontSize: 14, fontWeight: 700 }}>¥{parseFloat(p.totalValue).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 轮次结果 */}
          {(roomDetail.roundResults as any[]).length > 0 && (
            <div>
              <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8 }}>开箱记录</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* 按轮次分组 */}
                {Array.from(new Set((roomDetail.roundResults as any[]).map((r: any) => r.roundNo))).sort().map((roundNo) => {
                  const results = (roomDetail.roundResults as any[]).filter((r: any) => r.roundNo === roundNo);
                  return (
                    <div key={roundNo} style={{
                      background: 'rgba(20,8,50,0.7)',
                      border: '1px solid rgba(120,60,220,0.2)',
                      borderRadius: 8, padding: '10px 14px',
                    }}>
                      <div style={{ color: '#c084fc', fontSize: 13, marginBottom: 8 }}>第 {roundNo} 轮 — {results[0]?.boxName}</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {results.map((r: any) => {
                          const p = (roomDetail.players as any[]).find((pl: any) => pl.playerId === r.playerId);
                          return (
                            <div key={r.id} style={{
                              background: 'rgba(30,10,65,0.8)',
                              border: `1px solid ${LEVEL_COLOR[r.goodsLevel]}44`,
                              borderRadius: 6, padding: '8px 12px',
                              minWidth: 140,
                            }}>
                              <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>{p?.nickname ?? `玩家${r.playerId}`}</div>
                              <div style={{ color: LEVEL_COLOR[r.goodsLevel], fontSize: 11, marginBottom: 2 }}>
                                {LEVEL_LABEL[r.goodsLevel]}
                              </div>
                              <div style={{ color: '#e0d0ff', fontSize: 12, fontWeight: 600 }}>{r.goodsName}</div>
                              <div style={{ color: '#ffd700', fontSize: 12 }}>¥{parseFloat(r.goodsValue).toFixed(2)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
