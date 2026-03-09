/**
 * AdminRebate.tsx — 返佣配置管理组件
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface I18nT {
  [key: string]: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.35)',
  borderRadius: 8, padding: '8px 12px', color: '#e0d0ff', fontSize: 14, outline: 'none',
};
const labelStyle: React.CSSProperties = { color: 'rgba(180,150,255,0.8)', fontSize: 13, marginBottom: 4, display: 'block' };
const btnStyle = (color: string): React.CSSProperties => ({
  padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  background: color, color: '#fff', border: 'none',
});

export function AdminRebate({ lang, t }: { lang: 'zh' | 'en'; t: I18nT }) {
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [editForm, setEditForm] = useState({ identity: 'player', commissionRate: '4', commissionEnabled: '1' });

  const { data: players, isLoading } = trpc.admin.playerList.useQuery({ page: 1, limit: 20, keyword: '' });

  const updateIdentityMutation = trpc.admin.updatePlayerIdentity.useMutation({
    onSuccess: () => { toast.success('返佣配置已更新'); setSearchResult(null); setSearchId(''); },
    onError: (e) => toast.error(e.message),
  });

  const handleSearch = () => {
    if (!searchId.trim()) { toast.error('请输入玩家ID'); return; }
    const found = players?.list?.find((p: any) => String(p.id) === searchId.trim() || p.phone === searchId.trim());
    if (found) {
      setSearchResult(found);
      setEditForm({
        identity: found.identity || 'player',
        commissionRate: String(found.commissionRate || 4),
        commissionEnabled: String(found.commissionEnabled ?? 1),
      });
    } else {
      toast.error('未找到该玩家，请确认ID或手机号');
    }
  };

  const handleSave = () => {
    if (!searchResult) return;
    updateIdentityMutation.mutate({
      id: searchResult.id,
      identity: editForm.identity as 'player' | 'streamer' | 'merchant',
      commissionRate: parseFloat(editForm.commissionRate),
      commissionEnabled: parseInt(editForm.commissionEnabled),
    });
  };

  const cardStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(26,8,64,0.8) 0%, rgba(13,6,33,0.9) 100%)',
    border: '1px solid rgba(120,60,220,0.3)',
    borderRadius: 14, padding: 24, marginBottom: 20,
  };

  const identityLabels: Record<string, string> = {
    player: '普通玩家',
    streamer: '主播',
    merchant: '招商',
  };

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>返佣配置</h2>

      {/* 说明卡片 */}
      <div style={cardStyle}>
        <h3 style={{ color: '#c084fc', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>返佣规则说明</h3>
        <div style={{ color: 'rgba(180,150,255,0.8)', fontSize: 13, lineHeight: 1.8 }}>
          <p>• <strong style={{ color: '#e0d0ff' }}>三种身份</strong>：招商 / 主播 / 玩家（默认玩家）</p>
          <p>• <strong style={{ color: '#e0d0ff' }}>绑定方式</strong>：邀请链接 / 邀请码 / 后台手动修改</p>
          <p>• <strong style={{ color: '#e0d0ff' }}>返佣比例</strong>：默认 4%，可按玩家单独配置</p>
          <p>• <strong style={{ color: '#e0d0ff' }}>结算时间</strong>：每日 00:30 自动计算（充值总额 × 返佣比例）</p>
          <p>• <strong style={{ color: '#e0d0ff' }}>提取方式</strong>：玩家手动提取，提取为商城币，未提取累计叠加</p>
        </div>
      </div>

      {/* 玩家返佣配置 */}
      <div style={cardStyle}>
        <h3 style={{ color: '#c084fc', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>配置玩家返佣</h3>

        {/* 搜索玩家 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            placeholder="输入玩家ID或手机号搜索"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} style={btnStyle('linear-gradient(135deg,#7b2fff,#06b6d4)')}>
            搜索
          </button>
        </div>

        {/* 搜索结果 */}
        {searchResult && (
          <div style={{ background: 'rgba(120,60,220,0.1)', border: '1px solid rgba(120,60,220,0.3)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ color: '#e0d0ff', fontSize: 14, marginBottom: 12 }}>
              <strong>玩家：</strong>{searchResult.nickname}（ID: {searchResult.id}）
              &nbsp;|&nbsp;当前身份：<span style={{ color: '#c084fc' }}>{identityLabels[searchResult.identity] || '玩家'}</span>
              &nbsp;|&nbsp;返佣余额：<span style={{ color: '#ffd700' }}>¥{parseFloat(searchResult.commissionBalance || '0').toFixed(2)}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>身份</label>
                <select
                  style={{ ...inputStyle }}
                  value={editForm.identity}
                  onChange={e => setEditForm(f => ({ ...f, identity: e.target.value }))}
                >
                  <option value="player">普通玩家</option>
                  <option value="streamer">主播</option>
                  <option value="merchant">招商</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>返佣比例（%）</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editForm.commissionRate}
                  onChange={e => setEditForm(f => ({ ...f, commissionRate: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>返佣状态</label>
                <select
                  style={{ ...inputStyle }}
                  value={editForm.commissionEnabled}
                  onChange={e => setEditForm(f => ({ ...f, commissionEnabled: e.target.value }))}
                >
                  <option value="1">启用</option>
                  <option value="0">禁用</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSave} disabled={updateIdentityMutation.isPending} style={{ ...btnStyle('linear-gradient(135deg,#7b2fff,#06b6d4)'), opacity: updateIdentityMutation.isPending ? 0.6 : 1 }}>
                {updateIdentityMutation.isPending ? '保存中...' : '保存配置'}
              </button>
              <button onClick={() => { setSearchResult(null); setSearchId(''); }} style={btnStyle('rgba(255,255,255,0.1)')}>
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 返佣玩家列表 */}
      <div style={cardStyle}>
        <h3 style={{ color: '#c084fc', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>已开启返佣的玩家</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(120,60,220,0.3)' }}>
                {['ID', '昵称', '手机', '身份', '返佣比例', '返佣余额', '状态', '操作'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', color: 'rgba(180,150,255,0.7)', fontWeight: 600, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(players?.list || [])
                .filter((p: any) => p.identity !== 'player' || p.commissionEnabled)
                .map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                    <td style={{ padding: '8px 10px', color: 'rgba(180,150,255,0.6)' }}>{p.id}</td>
                    <td style={{ padding: '8px 10px', color: '#e0d0ff' }}>{p.nickname}</td>
                    <td style={{ padding: '8px 10px', color: 'rgba(180,150,255,0.6)' }}>{p.phone}</td>
                    <td style={{ padding: '8px 10px', color: '#c084fc' }}>{identityLabels[p.identity] || '玩家'}</td>
                    <td style={{ padding: '8px 10px', color: '#ffd700' }}>{parseFloat(p.commissionRate || '4').toFixed(1)}%</td>
                    <td style={{ padding: '8px 10px', color: '#ffd700' }}>¥{parseFloat(p.commissionBalance || '0').toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', color: p.commissionEnabled ? '#10b981' : '#ef4444' }}>
                      {p.commissionEnabled ? '启用' : '禁用'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <button
                        onClick={() => { setSearchId(String(p.id)); setSearchResult(p); setEditForm({ identity: p.identity || 'player', commissionRate: String(p.commissionRate || 4), commissionEnabled: String(p.commissionEnabled ?? 1) }); }}
                        style={{ ...btnStyle('rgba(120,60,220,0.4)'), padding: '4px 10px', fontSize: 12 }}
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
              {(!players?.list || players.list.length === 0) && (
                <tr><td colSpan={8} style={{ padding: '20px', color: 'rgba(180,150,255,0.4)', textAlign: 'center' }}>暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
