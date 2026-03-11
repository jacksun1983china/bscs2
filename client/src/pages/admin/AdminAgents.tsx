/**
 * AdminAgents.tsx — 坐席管理页面
 * 功能：坐席列表、新增坐席、编辑显示名/重置密码、启用/停用、删除
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Agent {
  id: number;
  name: string;
  username: string;
  status: 'online' | 'busy' | 'offline';
  activeSessionCount: number;
  maxSessions: number;
  enabled: number;
  lastActiveAt: Date | null;
  createdAt: Date;
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  online: { label: '在线', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  busy: { label: '忙碌', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  offline: { label: '离线', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

interface Session {
  id: number;
  status: string;
  title: string;
  playerId: number | null;
  agentId: number | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  lang: 'zh' | 'en';
}

export function AdminAgents({ lang }: Props) {
  const isZh = lang === 'zh';

  // 列表
  const { data: agents = [], refetch } = trpc.cs.adminGetAgents.useQuery(undefined, {
    refetchInterval: 10000,
  });

  // 新增弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState('');

  // 编辑弹窗
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');

  // 删除确认
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // 历史会话弹窗
  const [historyAgent, setHistoryAgent] = useState<Agent | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const { data: historySessions = [], isLoading: historyLoading } = trpc.cs.adminGetAllSessions.useQuery(
    { agentId: historyAgent?.id, page: historyPage, limit: 15 },
    { enabled: !!historyAgent }
  );

  const createMutation = trpc.cs.adminCreateAgent.useMutation({
    onSuccess: () => {
      toast.success(isZh ? '坐席创建成功' : 'Agent created');
      setShowCreate(false);
      setNewName(''); setNewUsername(''); setNewPassword(''); setCreateError('');
      refetch();
    },
    onError: (e) => setCreateError(e.message),
  });

  const updateMutation = trpc.cs.adminUpdateAgent.useMutation({
    onSuccess: () => {
      toast.success(isZh ? '更新成功' : 'Updated');
      setEditAgent(null);
      setEditName(''); setEditPassword(''); setEditError('');
      refetch();
    },
    onError: (e) => setEditError(e.message),
  });

  const toggleMutation = trpc.cs.adminToggleAgent.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.enabled ? (isZh ? '已启用' : 'Enabled') : (isZh ? '已停用' : 'Disabled'));
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.cs.adminDeleteAgent.useMutation({
    onSuccess: () => {
      toast.success(isZh ? '已删除' : 'Deleted');
      setDeleteId(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    setCreateError('');
    if (!newName.trim()) { setCreateError(isZh ? '请输入显示名' : 'Name required'); return; }
    if (!newUsername.trim()) { setCreateError(isZh ? '请输入账号' : 'Username required'); return; }
    if (newPassword.length < 6) { setCreateError(isZh ? '密码至少6位' : 'Password min 6 chars'); return; }
    createMutation.mutate({ name: newName.trim(), username: newUsername.trim(), password: newPassword });
  };

  const handleUpdate = () => {
    if (!editAgent) return;
    setEditError('');
    if (!editName.trim()) { setEditError(isZh ? '请输入显示名' : 'Name required'); return; }
    if (editPassword && editPassword.length < 6) { setEditError(isZh ? '密码至少6位' : 'Password min 6 chars'); return; }
    updateMutation.mutate({
      id: editAgent.id,
      name: editName.trim(),
      password: editPassword || undefined,
    });
  };

  const openEdit = (agent: Agent) => {
    setEditAgent(agent);
    setEditName(agent.name);
    setEditPassword('');
    setEditError('');
  };

  const cellStyle: React.CSSProperties = {
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    color: '#e0d0ff',
    fontSize: 13,
    verticalAlign: 'middle',
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    color: 'rgba(180,150,255,0.6)',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'left',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.2)',
    whiteSpace: 'nowrap',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    padding: '9px 18px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
  };

  return (
    <div style={{ padding: '0 4px' }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>
            🎧 {isZh ? '坐席管理' : 'Agent Management'}
          </h2>
          <p style={{ color: 'rgba(180,150,255,0.5)', fontSize: 12, margin: '4px 0 0' }}>
            {isZh ? `共 ${agents.length} 个坐席账号` : `${agents.length} agents total`}
          </p>
        </div>
        <button style={btnPrimary} onClick={() => { setShowCreate(true); setCreateError(''); }}>
          + {isZh ? '新增坐席' : 'Add Agent'}
        </button>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: isZh ? '在线' : 'Online', count: agents.filter(a => a.status === 'online' && a.enabled).length, color: '#4ade80', icon: '🟢' },
          { label: isZh ? '忙碌' : 'Busy', count: agents.filter(a => a.status === 'busy' && a.enabled).length, color: '#f59e0b', icon: '🟡' },
          { label: isZh ? '已停用' : 'Disabled', count: agents.filter(a => !a.enabled).length, color: '#ef4444', icon: '🔴' },
        ].map(card => (
          <div key={card.label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>{card.icon}</span>
            <div>
              <div style={{ color: card.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{card.count}</div>
              <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 12, marginTop: 3 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 坐席列表 */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>{isZh ? '显示名' : 'Name'}</th>
                <th style={thStyle}>{isZh ? '账号' : 'Username'}</th>
                <th style={thStyle}>{isZh ? '状态' : 'Status'}</th>
                <th style={thStyle}>{isZh ? '接待中' : 'Sessions'}</th>
                <th style={thStyle}>{isZh ? '账号状态' : 'Enabled'}</th>
                <th style={thStyle}>{isZh ? '操作' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...cellStyle, textAlign: 'center', color: 'rgba(180,150,255,0.4)', padding: '40px 0' }}>
                    {isZh ? '暂无坐席，点击右上角新增' : 'No agents yet'}
                  </td>
                </tr>
              ) : agents.map((agent: Agent) => {
                const statusInfo = STATUS_LABEL[agent.status] || STATUS_LABEL.offline;
                const isEnabled = !!agent.enabled;
                return (
                  <tr key={agent.id} style={{ opacity: isEnabled ? 1 : 0.5 }}>
                    <td style={cellStyle}>
                      <span style={{ color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>#{agent.id}</span>
                    </td>
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{agent.name}</span>
                      </div>
                    </td>
                    <td style={cellStyle}>
                      <code style={{
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: 6,
                        padding: '2px 8px',
                        fontSize: 12,
                        color: '#c4b5fd',
                      }}>{agent.username}</code>
                    </td>
                    <td style={cellStyle}>
                      <span style={{
                        background: statusInfo.bg,
                        color: statusInfo.color,
                        borderRadius: 20,
                        padding: '3px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={cellStyle}>
                      <span style={{ color: agent.activeSessionCount > 0 ? '#f59e0b' : 'rgba(180,150,255,0.4)' }}>
                        {agent.activeSessionCount}
                      </span>
                    </td>
                    <td style={cellStyle}>
                      <button
                        onClick={() => toggleMutation.mutate({ id: agent.id, enabled: !isEnabled })}
                        style={{
                          background: isEnabled ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)',
                          border: `1px solid ${isEnabled ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
                          borderRadius: 20,
                          color: isEnabled ? '#4ade80' : '#f87171',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '4px 12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {isEnabled ? (isZh ? '✓ 启用中' : '✓ Active') : (isZh ? '✗ 已停用' : '✗ Disabled')}
                      </button>
                    </td>
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => openEdit(agent)}
                          style={{
                            background: 'rgba(124,58,237,0.15)',
                            border: '1px solid rgba(124,58,237,0.3)',
                            borderRadius: 8,
                            color: '#c4b5fd',
                            fontSize: 12,
                            padding: '5px 10px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          ✏️ {isZh ? '编辑' : 'Edit'}
                        </button>
                        <button
                          onClick={() => { setHistoryAgent(agent); setHistoryPage(1); }}
                          style={{
                            background: 'rgba(14,165,233,0.12)',
                            border: '1px solid rgba(14,165,233,0.3)',
                            borderRadius: 8,
                            color: '#7dd3fc',
                            fontSize: 12,
                            padding: '5px 10px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          📊 {isZh ? '历史' : 'History'}
                        </button>
                        <button
                          onClick={() => setDeleteId(agent.id)}
                          style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            borderRadius: 8,
                            color: '#fca5a5',
                            fontSize: 12,
                            padding: '5px 10px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          🗑️ {isZh ? '删除' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增坐席弹窗 */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 16,
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #1a0a3d 0%, #0f0c29 100%)',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 20,
            padding: '28px 24px',
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 20px' }}>
              🎧 {isZh ? '新增坐席' : 'Add Agent'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ color: 'rgba(180,150,255,0.7)', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  {isZh ? '显示名（坐席昵称）' : 'Display Name'}
                </label>
                <input
                  style={inputStyle}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={isZh ? '例：小明客服' : 'e.g. Support Agent 1'}
                />
              </div>
              <div>
                <label style={{ color: 'rgba(180,150,255,0.7)', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  {isZh ? '登录账号（字母/数字/下划线）' : 'Login Username'}
                </label>
                <input
                  style={inputStyle}
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value.toLowerCase())}
                  placeholder={isZh ? '例：agent01' : 'e.g. agent01'}
                  autoComplete="off"
                />
              </div>
              <div>
                <label style={{ color: 'rgba(180,150,255,0.7)', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  {isZh ? '登录密码（至少6位）' : 'Password (min 6 chars)'}
                </label>
                <input
                  style={inputStyle}
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {createError && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginTop: 14,
              }}>
                ⚠️ {createError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                style={{ ...btnPrimary, flex: 1, opacity: createMutation.isPending ? 0.6 : 1 }}
              >
                {createMutation.isPending ? (isZh ? '创建中...' : 'Creating...') : (isZh ? '确认创建' : 'Create')}
              </button>
              <button
                onClick={() => { setShowCreate(false); setCreateError(''); }}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: 'rgba(180,150,255,0.7)', fontSize: 13, fontWeight: 600, padding: '9px 18px', cursor: 'pointer',
                }}
              >
                {isZh ? '取消' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑坐席弹窗 */}
      {editAgent && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 16,
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #1a0a3d 0%, #0f0c29 100%)',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 20,
            padding: '28px 24px',
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>
              ✏️ {isZh ? '编辑坐席' : 'Edit Agent'}
            </h3>
            <p style={{ color: 'rgba(180,150,255,0.5)', fontSize: 12, margin: '0 0 20px' }}>
              {isZh ? `账号：${editAgent.username}` : `Username: ${editAgent.username}`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ color: 'rgba(180,150,255,0.7)', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  {isZh ? '显示名' : 'Display Name'}
                </label>
                <input
                  style={inputStyle}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ color: 'rgba(180,150,255,0.7)', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  {isZh ? '新密码（留空则不修改）' : 'New Password (leave blank to keep)'}
                </label>
                <input
                  style={inputStyle}
                  type="password"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder={isZh ? '留空则不修改' : 'Leave blank to keep current'}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {editError && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginTop: 14,
              }}>
                ⚠️ {editError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                style={{ ...btnPrimary, flex: 1, opacity: updateMutation.isPending ? 0.6 : 1 }}
              >
                {updateMutation.isPending ? (isZh ? '保存中...' : 'Saving...') : (isZh ? '保存修改' : 'Save')}
              </button>
              <button
                onClick={() => { setEditAgent(null); setEditError(''); }}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: 'rgba(180,150,255,0.7)', fontSize: 13, fontWeight: 600, padding: '9px 18px', cursor: 'pointer',
                }}
              >
                {isZh ? '取消' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 历史会话弹窗 */}
      {historyAgent && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 16,
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #0d1b2a 0%, #0f0c29 100%)',
            border: '1px solid rgba(14,165,233,0.3)',
            borderRadius: 20,
            padding: '24px',
            width: '100%',
            maxWidth: 600,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            {/* 弹窗标题 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 }}>
                  📊 {isZh ? `${historyAgent.name} 的历史会话` : `${historyAgent.name}'s History`}
                </h3>
                <p style={{ color: 'rgba(125,211,252,0.5)', fontSize: 12, margin: '4px 0 0' }}>
                  @{historyAgent.username}
                </p>
              </div>
              <button
                onClick={() => setHistoryAgent(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, color: 'rgba(180,150,255,0.7)', fontSize: 18, width: 36, height: 36,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* 会话列表 */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(125,211,252,0.4)', fontSize: 14 }}>
                  {isZh ? '加载中...' : 'Loading...'}
                </div>
              ) : (historySessions as Session[]).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(125,211,252,0.3)', fontSize: 14 }}>
                  {isZh ? '暂无历史会话记录' : 'No history sessions'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['ID', isZh ? '玩家' : 'Player', isZh ? '状态' : 'Status', isZh ? '最后消息' : 'Last Msg', isZh ? '时间' : 'Time'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', color: 'rgba(125,211,252,0.5)', fontSize: 11, fontWeight: 600, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(historySessions as Session[]).map(s => (
                      <tr key={s.id}>
                        <td style={{ padding: '10px', color: 'rgba(125,211,252,0.5)', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>#{s.id}</td>
                        <td style={{ padding: '10px', color: '#e0d0ff', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{s.title || `ID:${s.playerId}`}</td>
                        <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{
                            background: s.status === 'closed' ? 'rgba(107,114,128,0.15)' : s.status === 'active' ? 'rgba(74,222,128,0.12)' : 'rgba(245,158,11,0.12)',
                            color: s.status === 'closed' ? '#9ca3af' : s.status === 'active' ? '#4ade80' : '#f59e0b',
                            borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                          }}>
                            {s.status === 'closed' ? (isZh ? '已结束' : 'Closed') : s.status === 'active' ? (isZh ? '进行中' : 'Active') : (isZh ? '等待中' : 'Waiting')}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: 'rgba(180,150,255,0.6)', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.04)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.lastMessage || '-'}
                        </td>
                        <td style={{ padding: '10px', color: 'rgba(125,211,252,0.4)', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }}>
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 分页 */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8 }}>
              <button
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: historyPage === 1 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: historyPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}
              >
                {isZh ? '上一页' : 'Prev'}
              </button>
              <span style={{ color: 'rgba(125,211,252,0.5)', fontSize: 13 }}>{isZh ? `第 ${historyPage} 页` : `Page ${historyPage}`}</span>
              <button
                onClick={() => setHistoryPage(p => p + 1)}
                disabled={(historySessions as Session[]).length < 15}
                style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: (historySessions as Session[]).length < 15 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: (historySessions as Session[]).length < 15 ? 'not-allowed' : 'pointer', fontSize: 13 }}
              >
                {isZh ? '下一页' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteId !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 16,
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #1a0a3d 0%, #0f0c29 100%)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 20,
            padding: '28px 24px',
            width: '100%',
            maxWidth: 360,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: '0 0 8px' }}>
              {isZh ? '确认删除此坐席？' : 'Delete this agent?'}
            </h3>
            <p style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13, margin: '0 0 20px' }}>
              {isZh ? '删除后无法恢复，该坐席将无法登录' : 'This action cannot be undone'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => deleteMutation.mutate({ id: deleteId })}
                disabled={deleteMutation.isPending}
                style={{
                  flex: 1, background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700,
                  padding: '10px 0', cursor: 'pointer',
                }}
              >
                {deleteMutation.isPending ? (isZh ? '删除中...' : 'Deleting...') : (isZh ? '确认删除' : 'Delete')}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: 'rgba(180,150,255,0.7)', fontSize: 14, fontWeight: 600,
                  padding: '10px 0', cursor: 'pointer',
                }}
              >
                {isZh ? '取消' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
