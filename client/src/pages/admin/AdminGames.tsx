/**
 * AdminGames.tsx — 游戏列表管理
 * 支持：查看游戏列表、修改单个游戏 RTP、一键修改所有游戏 RTP、启用/禁用开关、删除、排序
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// RTP 预设选项
const RTP_OPTIONS = [50, 85, 92, 94, 96, 98, 120];

interface AdminGamesProps {
  lang: 'zh' | 'en';
}

const T = {
  zh: {
    title: '游戏管理',
    gameKey: '游戏标识',
    name: '游戏名称',
    path: '路由',
    rtp: 'RTP(%)',
    enabled: '显示',
    minBet: '最小投注',
    maxBet: '最大投注',
    sort: '排序',
    remark: '备注',
    actions: '操作',
    edit: '编辑',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    confirmDelete: '确认删除该游戏？此操作不可撤销。',
    batchRtp: '一键修改所有游戏 RTP',
    batchRtpBtn: '批量设置',
    selectRtp: '选择 RTP',
    loading: '加载中...',
    saveSuccess: '保存成功',
    saveFail: '保存失败',
    batchSuccess: '所有游戏 RTP 已更新',
    batchFail: '批量更新失败',
    deleteSuccess: '删除成功',
    deleteFail: '删除失败',
    rtpNote: 'RTP 越高，玩家获胜概率越大',
    visibleHint: '关闭后首页不显示该游戏',
  },
  en: {
    title: 'Game Management',
    gameKey: 'Game Key',
    name: 'Game Name',
    path: 'Route',
    rtp: 'RTP(%)',
    enabled: 'Visible',
    minBet: 'Min Bet',
    maxBet: 'Max Bet',
    sort: 'Sort',
    remark: 'Remark',
    actions: 'Actions',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirmDelete: 'Confirm delete this game? This cannot be undone.',
    batchRtp: 'Set RTP for All Games',
    batchRtpBtn: 'Batch Set',
    selectRtp: 'Select RTP',
    loading: 'Loading...',
    saveSuccess: 'Saved successfully',
    saveFail: 'Save failed',
    batchSuccess: 'All games RTP updated',
    batchFail: 'Batch update failed',
    deleteSuccess: 'Deleted successfully',
    deleteFail: 'Delete failed',
    rtpNote: 'Higher RTP = higher win probability for players',
    visibleHint: 'Hidden games won\'t appear on home page',
  },
};

type GameItem = {
  id: number;
  gameKey: string;
  name: string;
  nameEn: string;
  path: string;
  rtp: number;
  enabled: number;
  minBet: number;
  maxBet: number;
  sort: number;
  remark: string;
};

function EditRow({
  game,
  t,
  onSave,
  onCancel,
}: {
  game: GameItem;
  t: typeof T['zh'];
  onSave: (data: Partial<GameItem>) => void;
  onCancel: () => void;
}) {
  const [rtp, setRtp] = useState(game.rtp);
  const [minBet, setMinBet] = useState(game.minBet / 100);
  const [maxBet, setMaxBet] = useState(game.maxBet / 100);
  const [remark, setRemark] = useState(game.remark);

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(120,60,220,0.4)',
    borderRadius: 6,
    color: '#fff',
    padding: '4px 8px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
  };

  return (
    <tr style={{ background: 'rgba(123,47,255,0.08)' }}>
      <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.6)', fontSize: 12 }}>{game.gameKey}</td>
      <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{game.name}</td>
      <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.6)', fontSize: 12 }}>{game.path}</td>
      <td style={{ padding: '10px 12px' }}>
        <select value={rtp} onChange={e => setRtp(Number(e.target.value))} style={{ ...inputStyle, cursor: 'pointer' }}>
          {RTP_OPTIONS.map(v => (
            <option key={v} value={v} style={{ background: '#1a0840' }}>{v}%</option>
          ))}
        </select>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <input type="number" value={minBet} onChange={e => setMinBet(Number(e.target.value))} min={0.01} step={0.01} style={inputStyle} />
      </td>
      <td style={{ padding: '10px 12px' }}>
        <input type="number" value={maxBet} onChange={e => setMaxBet(Number(e.target.value))} min={1} step={1} style={inputStyle} />
      </td>
      <td style={{ padding: '10px 12px' }}>
        <input type="text" value={remark} onChange={e => setRemark(e.target.value)} style={inputStyle} />
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => onSave({ rtp, minBet: Math.round(minBet * 100), maxBet: Math.round(maxBet * 100), remark })}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'linear-gradient(135deg, #7b2fff, #06b6d4)', color: '#fff', border: 'none' }}
          >{t.save}</button>
          <button
            onClick={onCancel}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: 'rgba(180,150,255,0.8)', border: '1px solid rgba(120,60,220,0.3)' }}
          >{t.cancel}</button>
        </div>
      </td>
    </tr>
  );
}

// 显示开关组件
function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: enabled ? 'linear-gradient(135deg, #4ade80, #22c55e)' : 'rgba(255,255,255,0.12)',
        border: enabled ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(255,255,255,0.15)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.25s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2,
        left: enabled ? 22 : 2,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        transition: 'left 0.25s',
      }} />
    </div>
  );
}

export function AdminGames({ lang }: AdminGamesProps) {
  const t = T[lang];
  const [editId, setEditId] = useState<number | null>(null);
  const [batchRtp, setBatchRtp] = useState<number>(96);

  const utils = trpc.useUtils();
  const { data: games, isLoading } = trpc.admin.gameList.useQuery();

  const updateGame = trpc.admin.updateGame.useMutation({
    onSuccess: () => {
      toast.success(t.saveSuccess);
      setEditId(null);
      utils.admin.gameList.invalidate();
    },
    onError: (e) => toast.error(`${t.saveFail}: ${e.message}`),
  });

  const updateAllRtp = trpc.admin.updateAllRtp.useMutation({
    onSuccess: () => {
      toast.success(t.batchSuccess);
      utils.admin.gameList.invalidate();
    },
    onError: (e) => toast.error(`${t.batchFail}: ${e.message}`),
  });

  const deleteGame = trpc.admin.deleteGame.useMutation({
    onSuccess: () => {
      toast.success(t.deleteSuccess);
      utils.admin.gameList.invalidate();
    },
    onError: (e) => toast.error(`${t.deleteFail}: ${e.message}`),
  });

  const reorderGame = trpc.admin.reorderGame.useMutation({
    onSuccess: () => utils.admin.gameList.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const handleToggleEnabled = (game: GameItem) => {
    updateGame.mutate({ id: game.id, enabled: game.enabled === 1 ? 0 : 1 });
  };

  const handleDelete = (game: GameItem) => {
    if (!window.confirm(t.confirmDelete)) return;
    deleteGame.mutate({ id: game.id });
  };

  const cardStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(30,10,65,0.95) 0%, rgba(15,5,40,0.98) 100%)',
    border: '1px solid rgba(120,60,220,0.3)',
    borderRadius: 16,
    padding: 24,
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    color: 'rgba(180,150,255,0.6)',
    fontSize: 11,
    fontWeight: 600,
    textAlign: 'left',
    borderBottom: '1px solid rgba(120,60,220,0.2)',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* 批量修改 RTP */}
      <div style={cardStyle}>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
          🎯 {t.batchRtp}
        </div>
        <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 12, marginBottom: 16 }}>
          {t.rtpNote}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {RTP_OPTIONS.map(v => (
            <button
              key={v}
              onClick={() => setBatchRtp(v)}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: batchRtp === v ? 'linear-gradient(135deg, #7b2fff, #06b6d4)' : 'rgba(255,255,255,0.06)',
                color: batchRtp === v ? '#fff' : 'rgba(180,150,255,0.7)',
                border: batchRtp === v ? 'none' : '1px solid rgba(120,60,220,0.3)',
                boxShadow: batchRtp === v ? '0 4px 15px rgba(123,47,255,0.4)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              RTP {v}%
            </button>
          ))}
          <button
            onClick={() => updateAllRtp.mutate({ rtp: batchRtp })}
            disabled={updateAllRtp.isPending}
            style={{
              padding: '8px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              background: updateAllRtp.isPending ? 'rgba(255,150,0,0.3)' : 'linear-gradient(135deg, #f59e0b, #ef4444)',
              color: '#fff', border: 'none',
              boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {updateAllRtp.isPending ? '...' : `⚡ ${t.batchRtpBtn} (RTP ${batchRtp}%)`}
          </button>
        </div>
      </div>

      {/* 游戏列表 */}
      <div style={cardStyle}>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
          🎮 {t.title}
        </div>
        <div style={{ color: 'rgba(180,150,255,0.4)', fontSize: 12, marginBottom: 16 }}>
          {t.visibleHint}
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.5)' }}>{t.loading}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>{t.sort}</th>
                  <th style={thStyle}>{t.gameKey}</th>
                  <th style={thStyle}>{t.name}</th>
                  <th style={thStyle}>{t.path}</th>
                  <th style={thStyle}>{t.rtp}</th>
                  <th style={thStyle}>{t.minBet}</th>
                  <th style={thStyle}>{t.maxBet}</th>
                  <th style={thStyle}>{t.remark}</th>
                  <th style={thStyle}>{t.enabled}</th>
                  <th style={thStyle}>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {(games || []).map((game, idx) => {
                  if (editId === game.id) {
                    return (
                      <EditRow
                        key={game.id}
                        game={game as GameItem}
                        t={t}
                        onSave={(data) => updateGame.mutate({ id: game.id, ...data })}
                        onCancel={() => setEditId(null)}
                      />
                    );
                  }
                  return (
                    <tr key={game.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                      {/* 排序按钮 */}
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          <button
                            onClick={() => reorderGame.mutate({ id: game.id, direction: 'up' })}
                            disabled={idx === 0 || reorderGame.isPending}
                            style={{
                              width: 22, height: 18, borderRadius: 4, fontSize: 10, cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              background: idx === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(123,47,255,0.2)',
                              color: idx === 0 ? 'rgba(255,255,255,0.2)' : '#a78bfa',
                              border: '1px solid rgba(123,47,255,0.3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >▲</button>
                          <button
                            onClick={() => reorderGame.mutate({ id: game.id, direction: 'down' })}
                            disabled={idx === (games || []).length - 1 || reorderGame.isPending}
                            style={{
                              width: 22, height: 18, borderRadius: 4, fontSize: 10,
                              cursor: idx === (games || []).length - 1 ? 'not-allowed' : 'pointer',
                              background: idx === (games || []).length - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(123,47,255,0.2)',
                              color: idx === (games || []).length - 1 ? 'rgba(255,255,255,0.2)' : '#a78bfa',
                              border: '1px solid rgba(123,47,255,0.3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >▼</button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 12px', color: 'rgba(180,150,255,0.6)', fontSize: 12 }}>{game.gameKey}</td>
                      <td style={{ padding: '12px 12px', color: '#fff', fontSize: 13, fontWeight: 600 }}>{game.name}</td>
                      <td style={{ padding: '12px 12px', color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>{game.path}</td>
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700,
                          background: game.rtp >= 96 ? 'rgba(34,197,94,0.15)' : game.rtp >= 85 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                          color: game.rtp >= 96 ? '#4ade80' : game.rtp >= 85 ? '#fbbf24' : '#f87171',
                          border: `1px solid ${game.rtp >= 96 ? 'rgba(34,197,94,0.3)' : game.rtp >= 85 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        }}>
                          {game.rtp}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 12px', color: 'rgba(180,150,255,0.7)', fontSize: 13 }}>
                        {(game.minBet / 100).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 12px', color: 'rgba(180,150,255,0.7)', fontSize: 13 }}>
                        {(game.maxBet / 100).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 12px', color: 'rgba(180,150,255,0.5)', fontSize: 12, maxWidth: 200 }}>
                        {game.remark || '-'}
                      </td>
                      {/* 显示开关 */}
                      <td style={{ padding: '12px 12px' }}>
                        <ToggleSwitch
                          enabled={game.enabled === 1}
                          onChange={() => handleToggleEnabled(game as GameItem)}
                        />
                      </td>
                      {/* 操作按钮 */}
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setEditId(game.id)}
                            style={{
                              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              background: 'rgba(123,47,255,0.2)', color: '#a78bfa',
                              border: '1px solid rgba(123,47,255,0.4)',
                            }}
                          >{t.edit}</button>
                          <button
                            onClick={() => handleDelete(game as GameItem)}
                            disabled={deleteGame.isPending}
                            style={{
                              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              background: 'rgba(239,68,68,0.15)', color: '#f87171',
                              border: '1px solid rgba(239,68,68,0.3)',
                            }}
                          >{t.delete}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
