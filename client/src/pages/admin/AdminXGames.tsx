/**
 * AdminXGames.tsx — X-Game 分类管理面板
 * 独立于竞技场和 Roll 房，管理 ROLL-X / DingDong / UncrossableRush / Vortex
 * 功能：RTP 设置、开关控制、投注范围配置、批量 RTP
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// ── 样式常量 ──────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(26,8,64,0.8) 0%, rgba(13,6,33,0.9) 100%)',
  border: '1px solid rgba(120,60,220,0.25)',
  borderRadius: 14,
  padding: '20px 24px',
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(180,150,255,0.7)',
  fontSize: 12,
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 14,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(120,60,220,0.3)',
  color: '#fff',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  background: 'linear-gradient(135deg, #7b2fff, #06b6d4)',
  color: '#fff',
  transition: 'all 0.2s',
};

const btnDangerStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'linear-gradient(135deg, #dc2626, #f97316)',
};

// ── 游戏图标映射 ──────────────────────────────────────────────────
const GAME_ICONS: Record<string, string> = {
  rollx: '🎰',
  rush: '🏃',
  dingdong: '🔔',
  vortex: '🌀',
};

const GAME_COLORS: Record<string, string> = {
  rollx: '#c084fc',
  rush: '#f97316',
  dingdong: '#22d3ee',
  vortex: '#a855f7',
};

// ── 开关组件 ──────────────────────────────────────────────────────
function ToggleSwitch({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 48,
        height: 26,
        borderRadius: 13,
        background: on
          ? 'linear-gradient(135deg, #22c55e, #06b6d4)'
          : 'rgba(255,255,255,0.1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        transition: 'all 0.3s',
        border: `1px solid ${on ? 'rgba(34,197,94,0.4)' : 'rgba(120,60,220,0.3)'}`,
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 2,
          left: on ? 25 : 3,
          transition: 'all 0.3s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
}

// ── 单个游戏卡片 ──────────────────────────────────────────────────
function XGameCard({ game, onSave }: {
  game: {
    id: number;
    gameKey: string;
    name: string;
    nameEn: string;
    rtp: number;
    minBet: number;
    maxBet: number;
    enabled: number;
    path: string;
  };
  onSave: () => void;
}) {
  const [rtp, setRtp] = useState(String(game.rtp));
  const [minBet, setMinBet] = useState(String(game.minBet));
  const [maxBet, setMaxBet] = useState(String(game.maxBet));
  const [enabled, setEnabled] = useState(game.enabled === 1);
  const [saving, setSaving] = useState(false);

  const updateMutation = trpc.admin.xgameUpdate.useMutation();

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        gameKey: game.gameKey,
        rtp: parseFloat(rtp),
        enabled: enabled ? 1 : 0,
        minBet: parseFloat(minBet),
        maxBet: parseFloat(maxBet),
      });
      toast.success(`${game.name} 配置已保存`);
      onSave();
    } catch (err: any) {
      toast.error(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (newEnabled: boolean) => {
    setEnabled(newEnabled);
    try {
      await updateMutation.mutateAsync({
        gameKey: game.gameKey,
        enabled: newEnabled ? 1 : 0,
      });
      toast.success(`${game.name} 已${newEnabled ? '开启' : '关闭'}`);
      onSave();
    } catch (err: any) {
      setEnabled(!newEnabled);
      toast.error(err.message || '操作失败');
    }
  };

  const accentColor = GAME_COLORS[game.gameKey] || '#c084fc';

  return (
    <div style={{
      ...cardStyle,
      borderLeft: `3px solid ${accentColor}`,
      opacity: enabled ? 1 : 0.6,
      transition: 'all 0.3s',
    }}>
      {/* 头部：游戏名称 + 开关 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{GAME_ICONS[game.gameKey] || '🎮'}</span>
          <div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{game.name}</div>
            <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>{game.nameEn} · {game.gameKey}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: enabled ? '#22c55e' : '#ef4444', fontSize: 12, fontWeight: 600 }}>
            {enabled ? '运行中' : '已关闭'}
          </span>
          <ToggleSwitch on={enabled} onChange={handleToggle} />
        </div>
      </div>

      {/* 配置表单 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={labelStyle}>RTP (%)</div>
          <input
            type="number"
            value={rtp}
            onChange={e => setRtp(e.target.value)}
            style={inputStyle}
            min={1}
            max={200}
            step={0.01}
          />
        </div>
        <div>
          <div style={labelStyle}>最小投注</div>
          <input
            type="number"
            value={minBet}
            onChange={e => setMinBet(e.target.value)}
            style={inputStyle}
            min={0}
            step={0.01}
          />
        </div>
        <div>
          <div style={labelStyle}>最大投注</div>
          <input
            type="number"
            value={maxBet}
            onChange={e => setMaxBet(e.target.value)}
            style={inputStyle}
            min={0}
            step={0.01}
          />
        </div>
      </div>

      {/* 保存按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...btnStyle,
            opacity: saving ? 0.6 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  );
}

// ── 主组件 ──────────────────────────────────────────────────────
export function AdminXGames() {
  const listQuery = trpc.admin.xgameList.useQuery();
  const batchRtpMutation = trpc.admin.xgameBatchRtp.useMutation();
  const [batchRtp, setBatchRtp] = useState('96');
  const [batchSaving, setBatchSaving] = useState(false);

  const handleBatchRtp = async () => {
    const val = parseFloat(batchRtp);
    if (isNaN(val) || val < 1 || val > 200) {
      toast.error('RTP 范围为 1~200');
      return;
    }
    setBatchSaving(true);
    try {
      await batchRtpMutation.mutateAsync({ rtp: val });
      toast.success(`所有 X-Game 的 RTP 已设为 ${val}%`);
      listQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || '批量设置失败');
    } finally {
      setBatchSaving(false);
    }
  };

  if (listQuery.isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.6)' }}>
        加载中...
      </div>
    );
  }

  const games = listQuery.data || [];

  return (
    <div>
      {/* 标题 + 批量操作 */}
      <div style={{
        ...cardStyle,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🎮</span>
            X-Game 分类管理
          </div>
          <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 12, marginTop: 4 }}>
            管理 ROLL-X、叮咚、不可能的冲刺、漩涡等小游戏的 RTP 和开关
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'rgba(180,150,255,0.7)', fontSize: 12 }}>批量RTP:</span>
          <input
            type="number"
            value={batchRtp}
            onChange={e => setBatchRtp(e.target.value)}
            style={{ ...inputStyle, width: 80 }}
            min={1}
            max={200}
            step={0.01}
          />
          <span style={{ color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>%</span>
          <button
            onClick={handleBatchRtp}
            disabled={batchSaving}
            style={{
              ...btnDangerStyle,
              opacity: batchSaving ? 0.6 : 1,
              cursor: batchSaving ? 'not-allowed' : 'pointer',
              fontSize: 12,
              padding: '6px 14px',
            }}
          >
            {batchSaving ? '设置中...' : '全部应用'}
          </button>
        </div>
      </div>

      {/* 统计概览 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: 16,
      }}>
        <div style={{
          ...cardStyle,
          textAlign: 'center',
          padding: '16px 12px',
          marginBottom: 0,
        }}>
          <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11, marginBottom: 4 }}>游戏总数</div>
          <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{games.length}</div>
        </div>
        <div style={{
          ...cardStyle,
          textAlign: 'center',
          padding: '16px 12px',
          marginBottom: 0,
        }}>
          <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11, marginBottom: 4 }}>已开启</div>
          <div style={{ color: '#22c55e', fontSize: 24, fontWeight: 700 }}>
            {games.filter(g => g.enabled === 1).length}
          </div>
        </div>
        <div style={{
          ...cardStyle,
          textAlign: 'center',
          padding: '16px 12px',
          marginBottom: 0,
        }}>
          <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11, marginBottom: 4 }}>已关闭</div>
          <div style={{ color: '#ef4444', fontSize: 24, fontWeight: 700 }}>
            {games.filter(g => g.enabled !== 1).length}
          </div>
        </div>
        <div style={{
          ...cardStyle,
          textAlign: 'center',
          padding: '16px 12px',
          marginBottom: 0,
        }}>
          <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11, marginBottom: 4 }}>平均RTP</div>
          <div style={{ color: '#c084fc', fontSize: 24, fontWeight: 700 }}>
            {games.length > 0 ? (games.reduce((s, g) => s + g.rtp, 0) / games.length).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* 游戏列表 */}
      {games.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: 'rgba(180,150,255,0.5)', padding: 40 }}>
          暂无 X-Game 配置数据
        </div>
      ) : (
        games.map(game => (
          <XGameCard
            key={game.gameKey}
            game={game}
            onSave={() => listQuery.refetch()}
          />
        ))
      )}
    </div>
  );
}
