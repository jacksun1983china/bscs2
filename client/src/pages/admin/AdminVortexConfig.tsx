/**
 * AdminVortexConfig.tsx — Vortex 游戏后台配置面板
 * 功能：
 * - 查看/修改 RTP（返还率）
 * - 设置投注范围（最小/最大）
 * - 查看近期投注记录（管理员视角）
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(26,8,64,0.8) 0%, rgba(13,6,33,0.9) 100%)',
  border: '1px solid rgba(120,60,220,0.25)',
  borderRadius: 14,
  padding: '20px 24px',
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(180,150,255,0.7)',
  fontSize: 12,
  marginBottom: 6,
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
};

const btnStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  background: 'linear-gradient(135deg, #7b2fff, #06b6d4)',
  color: '#fff',
};

export function AdminVortexConfig() {
  const configQuery = trpc.vortex.getConfig.useQuery();
  const historyQuery = trpc.vortex.getHistory.useQuery({ limit: 50 });
  const updateConfig = trpc.admin.updateVortexConfig.useMutation({
    onSuccess: () => {
      toast.success('Vortex 配置已保存');
      configQuery.refetch();
    },
    onError: (e) => toast.error('保存失败：' + e.message),
  });

  const [rtp, setRtp] = useState<number | null>(null);
  const [minBet, setMinBet] = useState<number | null>(null);
  const [maxBet, setMaxBet] = useState<number | null>(null);

  // 初始化表单值
  const cfg = configQuery.data;
  const currentRtp = rtp ?? cfg?.rtp ?? 96;
  const currentMinBet = minBet ?? cfg?.minBet ?? 1;
  const currentMaxBet = maxBet ?? cfg?.maxBet ?? 1000;

  const handleSave = () => {
    updateConfig.mutate({
      rtp: currentRtp,
      minBet: currentMinBet,
      maxBet: currentMaxBet,
    });
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>🌀 Vortex 游戏配置</h2>
        <p style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13, marginTop: 4 }}>
          控制 Vortex 游戏的 RTP（返还率）、投注范围等参数
        </p>
      </div>

      {/* 配置卡片 */}
      <div style={cardStyle}>
        <h3 style={{ color: '#c4b5fd', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>游戏参数配置</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          {/* RTP */}
          <div>
            <div style={labelStyle}>RTP 返还率（%）</div>
            <input
              type="number"
              min={50}
              max={99}
              value={currentRtp}
              onChange={e => setRtp(Number(e.target.value))}
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: 'rgba(180,150,255,0.4)', marginTop: 4 }}>
              建议范围：85-98，默认 96
            </div>
          </div>

          {/* 最小投注 */}
          <div>
            <div style={labelStyle}>最小投注金额</div>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={currentMinBet}
              onChange={e => setMinBet(Number(e.target.value))}
              style={inputStyle}
            />
          </div>

          {/* 最大投注 */}
          <div>
            <div style={labelStyle}>最大投注金额</div>
            <input
              type="number"
              min={1}
              value={currentMaxBet}
              onChange={e => setMaxBet(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
        </div>

        {/* RTP 说明 */}
        <div style={{
          background: 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        }}>
          <div style={{ color: '#c4b5fd', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>RTP 说明</div>
          <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 12, lineHeight: 1.6 }}>
            RTP（Return to Player）是游戏的理论返还率。设置为 96 表示玩家平均每投注 100 金币，理论上可获得 96 金币的回报。
            <br />
            RTP 越高，玩家赢钱概率越大；RTP 越低，平台盈利越多。
            <br />
            <strong style={{ color: '#ffd700' }}>当前 RTP：{cfg?.rtp ?? 96}%</strong>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={updateConfig.isPending}
          style={btnStyle}
        >
          {updateConfig.isPending ? '保存中...' : '保存配置'}
        </button>
      </div>

      {/* 近期投注记录 */}
      <div style={cardStyle}>
        <h3 style={{ color: '#c4b5fd', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>近期投注记录</h3>

        {historyQuery.isLoading ? (
          <div style={{ color: '#888', textAlign: 'center', padding: 20 }}>加载中...</div>
        ) : !historyQuery.data?.length ? (
          <div style={{ color: '#888', textAlign: 'center', padding: 20 }}>暂无记录</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(120,60,220,0.1)' }}>
                  {['ID', '投注金额', '倍率', '赢得', '净收益', '余额', '时间'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: 'left',
                      color: 'rgba(180,150,255,0.7)', fontWeight: 600,
                      borderBottom: '1px solid rgba(120,60,220,0.2)',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyQuery.data.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                    <td style={{ padding: '8px 12px', color: '#888' }}>{r.id}</td>
                    <td style={{ padding: '8px 12px', color: '#fff' }}>¥{r.betAmount.toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', color: '#a855f7' }}>{r.multiplier.toFixed(2)}x</td>
                    <td style={{ padding: '8px 12px', color: r.isWin ? '#4caf50' : '#888' }}>
                      ¥{r.winAmount.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', color: r.netAmount >= 0 ? '#4caf50' : '#f44336' }}>
                      {r.netAmount >= 0 ? '+' : ''}{r.netAmount.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#ffd700' }}>¥{r.balanceAfter.toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', color: '#888', whiteSpace: 'nowrap' }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
