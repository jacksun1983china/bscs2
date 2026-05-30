/**
 * AdminMailbox.tsx — 站内信管理组件
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
  padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  background: color, color: '#fff', border: 'none',
});
const textareaStyle: React.CSSProperties = {
  ...inputStyle, minHeight: 120, resize: 'vertical', fontFamily: 'inherit',
};

export function AdminMailbox({ lang, t }: { lang: 'zh' | 'en'; t: I18nT }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showSend, setShowSend] = useState(false);
  const [form, setForm] = useState({
    targetType: 'all' as 'single' | 'all',
    playerId: '',
    title: '',
    content: '',
    type: 'system',
  });

  const { data, refetch } = trpc.admin.getMessages.useQuery({ page, limit: 20, search: search || undefined });
  const sendMutation = trpc.admin.sendMessage.useMutation({
    onSuccess: (data) => {
      toast.success(`发送成功，共发送 ${data.count} 条站内信`);
      setShowSend(false);
      setForm({ targetType: 'all', playerId: '', title: '', content: '', type: 'system' });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteMessage.useMutation({
    onSuccess: () => { toast.success('已删除'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const list = data?.list ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleSend = () => {
    if (!form.title.trim()) { toast.error('请输入标题'); return; }
    if (!form.content.trim()) { toast.error('请输入内容'); return; }
    if (form.targetType === 'single' && !form.playerId.trim()) { toast.error('请输入玩家ID'); return; }
    sendMutation.mutate({
      targetType: form.targetType,
      playerId: form.targetType === 'single' ? Number(form.playerId) : undefined,
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
    });
  };

  const typeLabels: Record<string, string> = {
    system: '系统通知',
    reward: '奖励通知',
    roll: 'Roll通知',
  };

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        📬 {lang === 'zh' ? '站内信管理' : 'Message Management'}
      </h2>
      <p style={{ color: 'rgba(180,150,255,0.6)', fontSize: 14, marginBottom: 20 }}>
        {lang === 'zh' ? '发送站内信给指定玩家或全服广播。' : 'Send messages to specific players or broadcast to all.'}
      </p>

      {/* 操作栏 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder={lang === 'zh' ? '搜索标题...' : 'Search title...'}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 240 }}
        />
        <button
          onClick={() => setShowSend(true)}
          style={{
            ...btnStyle('linear-gradient(135deg,#7c3aed,#2563eb)'),
            padding: '8px 20px', fontSize: 14,
          }}
        >
          + {lang === 'zh' ? '发送站内信' : 'Send Message'}
        </button>
      </div>

      {/* 列表 */}
      <div style={{
        background: 'rgba(20,10,50,0.6)', borderRadius: 12,
        border: '1px solid rgba(120,60,220,0.25)', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(120,60,220,0.15)' }}>
              {['ID', lang === 'zh' ? '玩家ID' : 'Player ID', lang === 'zh' ? '标题' : 'Title', lang === 'zh' ? '类型' : 'Type', lang === 'zh' ? '已读' : 'Read', lang === 'zh' ? '时间' : 'Time', lang === 'zh' ? '操作' : 'Actions'].map((h, i) => (
                <th key={i} style={{ padding: '10px 12px', color: '#a78bfa', fontSize: 13, fontWeight: 600, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((msg: any) => (
              <tr key={msg.id} style={{ borderTop: '1px solid rgba(120,60,220,0.15)' }}>
                <td style={{ padding: '10px 12px', color: '#e0d0ff', fontSize: 13 }}>{msg.id}</td>
                <td style={{ padding: '10px 12px', color: '#e0d0ff', fontSize: 13 }}>{msg.playerId}</td>
                <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.title}</td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 12,
                    background: msg.type === 'system' ? 'rgba(59,130,246,0.2)' : msg.type === 'reward' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                    color: msg.type === 'system' ? '#60a5fa' : msg.type === 'reward' ? '#fbbf24' : '#34d399',
                  }}>
                    {typeLabels[msg.type] || msg.type}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>
                  <span style={{ color: msg.isRead ? '#34d399' : '#f87171' }}>{msg.isRead ? '✓' : '✗'}</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.6)', fontSize: 12 }}>
                  {new Date(msg.createdAt).toLocaleString('zh-CN')}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <button
                    onClick={() => { if (confirm('确认删除？')) deleteMutation.mutate({ id: msg.id }); }}
                    style={btnStyle('rgba(220,38,38,0.7)')}
                  >
                    {lang === 'zh' ? '删除' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'rgba(180,150,255,0.4)', fontSize: 14 }}>
                  {lang === 'zh' ? '暂无站内信' : 'No messages'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ ...btnStyle('rgba(120,60,220,0.3)'), opacity: page === 1 ? 0.4 : 1 }}>
            ← {lang === 'zh' ? '上一页' : 'Prev'}
          </button>
          <span style={{ color: '#c0a0ff', fontSize: 13, lineHeight: '32px' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ ...btnStyle('rgba(120,60,220,0.3)'), opacity: page === totalPages ? 0.4 : 1 }}>
            {lang === 'zh' ? '下一页' : 'Next'} →
          </button>
        </div>
      )}

      {/* 发送弹窗 */}
      {showSend && (
        <div
          onClick={() => setShowSend(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg,#1a0840,#2d0f6b)',
              border: '1.5px solid rgba(160,80,255,0.6)',
              borderRadius: 16, padding: '28px 24px', width: '90%', maxWidth: 480,
              boxShadow: '0 0 40px rgba(120,40,220,0.5)',
            }}
          >
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>
              📨 {lang === 'zh' ? '发送站内信' : 'Send Message'}
            </h3>

            {/* 发送目标 */}
            <label style={labelStyle}>{lang === 'zh' ? '发送目标' : 'Target'}</label>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button
                onClick={() => setForm(f => ({ ...f, targetType: 'all' }))}
                style={{
                  ...btnStyle(form.targetType === 'all' ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'rgba(120,60,220,0.2)'),
                  flex: 1, padding: '10px 0',
                  border: form.targetType === 'all' ? 'none' : '1px solid rgba(120,60,220,0.4)',
                }}
              >
                🌐 {lang === 'zh' ? '全服广播' : 'All Players'}
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, targetType: 'single' }))}
                style={{
                  ...btnStyle(form.targetType === 'single' ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'rgba(120,60,220,0.2)'),
                  flex: 1, padding: '10px 0',
                  border: form.targetType === 'single' ? 'none' : '1px solid rgba(120,60,220,0.4)',
                }}
              >
                👤 {lang === 'zh' ? '指定玩家' : 'Single Player'}
              </button>
            </div>

            {/* 玩家ID（单发时显示） */}
            {form.targetType === 'single' && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{lang === 'zh' ? '玩家ID' : 'Player ID'}</label>
                <input
                  type="number"
                  value={form.playerId}
                  onChange={e => setForm(f => ({ ...f, playerId: e.target.value }))}
                  placeholder={lang === 'zh' ? '输入玩家ID' : 'Enter player ID'}
                  style={inputStyle}
                />
              </div>
            )}

            {/* 消息类型 */}
            <label style={labelStyle}>{lang === 'zh' ? '消息类型' : 'Type'}</label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 16 }}
            >
              <option value="system">{lang === 'zh' ? '系统通知' : 'System'}</option>
              <option value="reward">{lang === 'zh' ? '奖励通知' : 'Reward'}</option>
            </select>

            {/* 标题 */}
            <label style={labelStyle}>{lang === 'zh' ? '标题' : 'Title'}</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={lang === 'zh' ? '输入邮件标题' : 'Enter title'}
              maxLength={200}
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            {/* 内容 */}
            <label style={labelStyle}>{lang === 'zh' ? '内容' : 'Content'}</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder={lang === 'zh' ? '输入邮件内容...' : 'Enter message content...'}
              style={{ ...textareaStyle, marginBottom: 20 }}
            />

            {/* 按钮 */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowSend(false)}
                style={{ ...btnStyle('rgba(120,60,220,0.3)'), flex: 1, padding: '10px 0', border: '1px solid rgba(120,60,220,0.4)' }}
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleSend}
                disabled={sendMutation.isPending}
                style={{
                  ...btnStyle('linear-gradient(135deg,#7c3aed,#2563eb)'),
                  flex: 1, padding: '10px 0',
                  opacity: sendMutation.isPending ? 0.6 : 1,
                }}
              >
                {sendMutation.isPending
                  ? (lang === 'zh' ? '发送中...' : 'Sending...')
                  : (lang === 'zh' ? '确认发送' : 'Send')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
