/**
 * AdminRollRooms.tsx — Roll房管理组件
 */
import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type I18nT = {
  rollRooms: string; createRollRoom: string; roomName: string; roomAvatar: string;
  prizeFirst: string; startTime: string; endTime: string; threshold: string;
  maxPlayers: string; exchangeType: string; botCount: string; addPrize: string;
  prizeName: string; prizeAmount: string; prizeQty: string; prizeImage: string;
  winnerList: string; winnerPhone: string; roomStatus: string; roomTotal: string;
  participants: string; bots: string; prizes: string; actualPrize: string;
  actualQty: string; winnerDetail: string; draw: string; deleteRoom: string;
  parentId: string; loading: string; close: string; prev: string; next: string;
  page: string; total: string; records: string;
};

const cardStyle = {
  background: 'linear-gradient(135deg, rgba(26,8,64,0.7) 0%, rgba(13,6,33,0.85) 100%)',
  border: '1px solid rgba(120,60,220,0.25)', borderRadius: 16, overflow: 'hidden' as const,
};
const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.3)',
  color: '#fff', outline: 'none',
};
const labelStyle = { color: 'rgba(180,150,255,0.7)', fontSize: 12, marginBottom: 4, display: 'block' as const };

// ── 中奖名单弹窗 ──────────────────────────────────────────────────
function WinnersModal({ roomId, onClose, t }: { roomId: number; onClose: () => void; t: I18nT }) {
  const { data, isLoading } = trpc.admin.rollWinners.useQuery({ roomId });
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(135deg,#1a0840,#0d0621)', border: '1px solid rgba(120,60,220,0.5)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{t.winnerDetail} (#{roomId})</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(180,150,255,0.7)', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>
        {isLoading ? <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.5)' }}>{t.loading}</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(123,47,255,0.12)' }}>
                {['ID', '手机号', '昵称', '奖品', '金额', '时间'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.7)', fontSize: 12, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'rgba(180,150,255,0.3)' }}>暂无中奖记录</td></tr>
              ) : (data ?? []).map((w: any) => (
                <tr key={w.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                  <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>{w.playerId}</td>
                  <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{w.player?.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') ?? '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{w.player?.nickname ?? '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#a78bfa', fontSize: 13 }}>{w.prize?.name ?? '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#ffd700', fontSize: 13 }}>¥{parseFloat(w.prize?.amount ?? '0').toFixed(2)}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>{w.createdAt ? new Date(w.createdAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── 创建Roll房弹窗 ────────────────────────────────────────────────
function CreateRollRoomModal({ onClose, onSuccess, t }: { onClose: () => void; onSuccess: () => void; t: I18nT }) {
  const [form, setForm] = useState({
    name: '', avatarUrl: '', prizeFirstAmount: '', parentId: '',
    startTime: '', endTime: '', threshold: '', maxPlayers: '100',
    exchangeType: 'mall_coin', botCount: '0',
  });
  const [prizes, setPrizes] = useState([{ name: '', amount: '', quantity: '1', imageUrl: '' }]);
  const [winners, setWinners] = useState(['']);
  const [uploading, setUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const createMutation = trpc.admin.createRollRoom.useMutation({
    onSuccess: () => { toast.success('Roll房创建成功'); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const uploadMutation = trpc.admin.uploadFile.useMutation();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        const result = await uploadMutation.mutateAsync({ base64, filename: file.name, mimeType: file.type });
        setForm(f => ({ ...f, avatarUrl: result.url }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setUploading(false); }
  };

  const handlePrizeImageUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        const result = await uploadMutation.mutateAsync({ base64, filename: file.name, mimeType: file.type });
        setPrizes(ps => ps.map((p, i) => i === idx ? { ...p, imageUrl: result.url } : p));
      };
      reader.readAsDataURL(file);
    } catch { /* ignore */ }
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('请填写房间名称'); return; }
    if (!form.startTime || !form.endTime) { toast.error('请填写开始和结束时间'); return; }
    if (!form.threshold) { toast.error('请填写门槛金额'); return; }
    const validPrizes = prizes.filter(p => p.name.trim() && p.amount);
    if (validPrizes.length === 0) { toast.error('请至少添加一个奖品'); return; }
    createMutation.mutate({
      title: form.name,
      avatarBase64: undefined,
      ownerId: form.parentId ? parseInt(form.parentId) : undefined,
      startAt: form.startTime,
      endAt: form.endTime,
      threshold: parseFloat(form.threshold),
      maxParticipants: parseInt(form.maxPlayers) || 100,
      prizes: validPrizes.map(p => ({ name: p.name, value: parseFloat(p.amount), quantity: parseInt(p.quantity) || 1, coinType: (form.exchangeType === 'gold' ? 'gold' : 'shopCoin') as 'shopCoin' | 'gold', imageBase64: undefined })),
    });
  };

  const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' };
  const modalStyle: React.CSSProperties = { background: 'linear-gradient(135deg,#1a0840,#0d0621)', border: '1px solid rgba(120,60,220,0.5)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 680, marginTop: 20, marginBottom: 20 };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{t.createRollRoom}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(180,150,255,0.7)', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* 房间名称 */}
          <div style={{ gridColumn: '1/3' }}>
            <label style={labelStyle}>{t.roomName} *</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="请输入房间名称" />
          </div>
          {/* 房间头像 */}
          <div>
            <label style={labelStyle}>{t.roomAvatar}</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {form.avatarUrl && <img src={form.avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
              <button onClick={() => avatarRef.current?.click()} style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: 'rgba(123,47,255,0.2)', color: '#a78bfa', border: '1px solid rgba(123,47,255,0.35)' }}>
                {uploading ? '上传中...' : '选择图片'}
              </button>
              <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>
          </div>
          {/* 一等奖金额 */}
          <div>
            <label style={labelStyle}>{t.prizeFirst}</label>
            <input style={inputStyle} type="number" value={form.prizeFirstAmount} onChange={e => setForm(f => ({ ...f, prizeFirstAmount: e.target.value }))} placeholder="0.00" />
          </div>
          {/* 上级ID */}
          <div>
            <label style={labelStyle}>{t.parentId}</label>
            <input style={inputStyle} type="number" value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))} placeholder="可选" />
          </div>
          {/* 开始时间 */}
          <div>
            <label style={labelStyle}>{t.startTime} *</label>
            <input style={inputStyle} type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
          </div>
          {/* 结束时间 */}
          <div>
            <label style={labelStyle}>{t.endTime} *</label>
            <input style={inputStyle} type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
          </div>
          {/* 门槛金额 */}
          <div>
            <label style={labelStyle}>{t.threshold} * (¥)</label>
            <input style={inputStyle} type="number" value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))} placeholder="0.00" />
          </div>
          {/* 参与人数 */}
          <div>
            <label style={labelStyle}>{t.maxPlayers}</label>
            <input style={inputStyle} type="number" value={form.maxPlayers} onChange={e => setForm(f => ({ ...f, maxPlayers: e.target.value }))} />
          </div>
          {/* 兑换类型 */}
          <div>
            <label style={labelStyle}>{t.exchangeType}</label>
            <select style={{ ...inputStyle }} value={form.exchangeType} onChange={e => setForm(f => ({ ...f, exchangeType: e.target.value }))}>
              <option value="mall_coin">商城币</option>
              <option value="gold">金币</option>
              <option value="diamond">钻石</option>
            </select>
          </div>
          {/* 机器人数量 */}
          <div>
            <label style={labelStyle}>{t.botCount}</label>
            <input style={inputStyle} type="number" value={form.botCount} onChange={e => setForm(f => ({ ...f, botCount: e.target.value }))} min="0" />
          </div>
        </div>

        {/* 奖品列表 */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0, fontSize: 14, color: '#a78bfa' }}>奖品列表 *</label>
            <button onClick={() => setPrizes(ps => [...ps, { name: '', amount: '', quantity: '1', imageUrl: '' }])} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'rgba(123,47,255,0.2)', color: '#a78bfa', border: '1px solid rgba(123,47,255,0.35)' }}>
              + {t.addPrize}
            </button>
          </div>
          {prizes.map((prize, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr auto', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
              <div>
                {idx === 0 && <label style={labelStyle}>{t.prizeName}</label>}
                <input style={inputStyle} value={prize.name} onChange={e => setPrizes(ps => ps.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))} placeholder="奖品名称" />
              </div>
              <div>
                {idx === 0 && <label style={labelStyle}>{t.prizeAmount} (¥)</label>}
                <input style={inputStyle} type="number" value={prize.amount} onChange={e => setPrizes(ps => ps.map((p, i) => i === idx ? { ...p, amount: e.target.value } : p))} placeholder="0.00" />
              </div>
              <div>
                {idx === 0 && <label style={labelStyle}>{t.prizeQty}</label>}
                <input style={inputStyle} type="number" value={prize.quantity} onChange={e => setPrizes(ps => ps.map((p, i) => i === idx ? { ...p, quantity: e.target.value } : p))} min="1" />
              </div>
              <div>
                {idx === 0 && <label style={labelStyle}>{t.prizeImage}</label>}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {prize.imageUrl && <img src={prize.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />}
                  <label style={{ padding: '7px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: 'rgba(180,150,255,0.7)', border: '1px solid rgba(120,60,220,0.2)' }}>
                    上传
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePrizeImageUpload(idx, e)} />
                  </label>
                </div>
              </div>
              <div style={{ paddingBottom: 2 }}>
                {prizes.length > 1 && (
                  <button onClick={() => setPrizes(ps => ps.filter((_, i) => i !== idx))} style={{ padding: '7px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 中奖名单 */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0, fontSize: 14, color: '#a78bfa' }}>{t.winnerList}（可选，指定中奖手机号）</label>
            <button onClick={() => setWinners(ws => [...ws, ''])} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'rgba(123,47,255,0.2)', color: '#a78bfa', border: '1px solid rgba(123,47,255,0.35)' }}>
              + 增加
            </button>
          </div>
          {winners.map((w, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={w} onChange={e => setWinners(ws => ws.map((v, i) => i === idx ? e.target.value : v))} placeholder={t.winnerPhone} />
              {winners.length > 1 && (
                <button onClick={() => setWinners(ws => ws.filter((_, i) => i !== idx))} style={{ padding: '7px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>✕</button>
              )}
            </div>
          ))}
        </div>

        {/* 提交按钮 */}
        <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: 'rgba(180,150,255,0.7)', border: '1px solid rgba(120,60,220,0.25)' }}>取消</button>
          <button onClick={handleSubmit} disabled={createMutation.isPending} style={{ padding: '10px 28px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#7b2fff,#06b6d4)', color: '#fff', border: 'none', opacity: createMutation.isPending ? 0.6 : 1 }}>
            {createMutation.isPending ? '创建中...' : '确认创建'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────
export function AdminRollRooms({ lang, t }: { lang: 'zh' | 'en'; t: I18nT }) {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showWinners, setShowWinners] = useState<number | null>(null);

  const { data, isLoading } = trpc.admin.rollRoomList.useQuery({ page, limit: 15 });
  const drawMutation = trpc.admin.drawRollRoom.useMutation({
    onSuccess: () => { toast.success(lang === 'zh' ? '开奖成功' : 'Draw success'); utils.admin.rollRoomList.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteRollRoom.useMutation({
    onSuccess: () => { toast.success(lang === 'zh' ? '已删除' : 'Deleted'); utils.admin.rollRoomList.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const totalPages = data ? Math.ceil(data.total / 15) : 1;
  const statusColor = (s: string) => s === 'pending' ? '#f59e0b' : s === 'active' ? '#10b981' : '#6b7280';
  const statusLabel = (s: string) => {
    if (s === 'pending') return lang === 'zh' ? '待开奖' : 'Pending';
    if (s === 'active') return lang === 'zh' ? '进行中' : 'Active';
    return lang === 'zh' ? '已结束' : 'Ended';
  };

  return (
    <div>
      {/* 操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{t.rollRooms}</div>
        <button onClick={() => setShowCreate(true)} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'linear-gradient(135deg,#7b2fff,#06b6d4)', color: '#fff', border: 'none' }}>
          + {t.createRollRoom}
        </button>
      </div>

      {/* 表格 */}
      <div style={cardStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(123,47,255,0.12)', borderBottom: '1px solid rgba(120,60,220,0.2)' }}>
                {['ID', t.roomName, '开始/结束时间', t.roomStatus, t.parentId, t.participants, t.bots, t.roomTotal, t.prizes, t.threshold, t.actualPrize, t.actualQty, '操作'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', color: 'rgba(180,150,255,0.7)', fontSize: 12, fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: 'rgba(180,150,255,0.5)' }}>{t.loading}</td></tr>
              ) : (data?.list ?? []).length === 0 ? (
                <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: 'rgba(180,150,255,0.3)' }}>暂无Roll房</td></tr>
              ) : (data?.list ?? []).map((room: any) => (
                <tr key={room.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                  <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.6)', fontSize: 12 }}>{room.id}</td>
                  <td style={{ padding: '10px 14px', color: '#fff', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {room.avatarUrl && <img src={room.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />}
                      {room.name}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.5)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    <div>{room.startTime ? new Date(room.startTime).toLocaleString() : '-'}</div>
                    <div>{room.endTime ? new Date(room.endTime).toLocaleString() : '-'}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${statusColor(room.status)}22`, color: statusColor(room.status), border: `1px solid ${statusColor(room.status)}44` }}>
                      {statusLabel(room.status)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>{room.parentId ?? '-'}</td>
                  <td style={{ padding: '10px 14px', color: '#7df9ff', fontSize: 13 }}>{room.actualParticipants ?? 0}</td>
                  <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>{room.botCount ?? 0}</td>
                  <td style={{ padding: '10px 14px', color: '#ffd700', fontSize: 13 }}>¥{parseFloat(room.totalAmount ?? '0').toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', color: '#a78bfa', fontSize: 12 }}>{room.prizeCount ?? 0}</td>
                  <td style={{ padding: '10px 14px', color: '#f59e0b', fontSize: 13 }}>¥{parseFloat(room.threshold ?? '0').toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', color: '#10b981', fontSize: 13 }}>¥{parseFloat(room.actualPrizeAmount ?? '0').toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', color: '#06b6d4', fontSize: 12 }}>{room.actualPrizeCount ?? 0}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button onClick={() => setShowWinners(room.id)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
                        {t.winnerDetail}
                      </button>
                      {room.status !== 'ended' && (
                        <button onClick={() => { if (confirm('确认开奖？')) drawMutation.mutate({ roomId: room.id }); }} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                          {t.draw}
                        </button>
                      )}
                      <button onClick={() => { if (confirm('确认删除？')) deleteMutation.mutate({ id: room.id }); }} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                        {t.deleteRoom}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 分页 */}
        {data && data.total > 0 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(120,60,220,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13 }}>{t.total} {data.total} {t.records} · {t.page} {page} / {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 13, cursor: page <= 1 ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.06)', color: page <= 1 ? 'rgba(180,150,255,0.3)' : 'rgba(180,150,255,0.8)', border: '1px solid rgba(120,60,220,0.25)' }}>{t.prev}</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 13, cursor: page >= totalPages ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.06)', color: page >= totalPages ? 'rgba(180,150,255,0.3)' : 'rgba(180,150,255,0.8)', border: '1px solid rgba(120,60,220,0.25)' }}>{t.next}</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateRollRoomModal onClose={() => setShowCreate(false)} onSuccess={() => utils.admin.rollRoomList.invalidate()} t={t} />}
      {showWinners !== null && <WinnersModal roomId={showWinners} onClose={() => setShowWinners(null)} t={t} />}
    </div>
  );
}
