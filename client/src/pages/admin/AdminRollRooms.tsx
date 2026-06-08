/**
 * AdminRollRooms.tsx — 对战房管理组件
 */
import { useEffect, useRef, useState } from 'react';
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
const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  background: '#1a0840',
  color: '#fff',
  appearance: 'auto' as const,
  WebkitAppearance: 'menulist' as const,
  MozAppearance: 'menulist' as const,
};
const selectOptionStyle = {
  background: '#1a0840',
  color: '#fff',
};
const labelStyle = { color: 'rgba(180,150,255,0.7)', fontSize: 12, marginBottom: 4, display: 'block' as const };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };
const modalStyle: React.CSSProperties = { background: 'linear-gradient(135deg,#1a0840,#0d0621)', border: '1px solid rgba(120,60,220,0.5)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 680, maxHeight: '80vh', overflow: 'auto' };
const BEIJING_TIME_ZONE = 'Asia/Shanghai';

function formatBeijingDateTime(value?: string | Date | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function toBeijingIsoString(value: string) {
  if (!value) return value;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) return value;
  return `${value}:00+08:00`;
}

function RoomRosterModal({ roomId, status, onClose, t, lang }: { roomId: number; status: string; onClose: () => void; t: I18nT; lang: 'zh' | 'en' }) {
  const { data, isLoading } = trpc.admin.rollRoomDetail.useQuery({ id: roomId });
  const isEnded = status === 'ended';
  const subtitle = isEnded
    ? (lang === 'zh' ? '显示中奖人员名单' : 'Showing winners')
    : (lang === 'zh' ? '显示参与人员名单' : 'Showing participants');

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 760 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{t.winnerDetail} (#{roomId})</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(180,150,255,0.7)', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ color: 'rgba(180,150,255,0.55)', fontSize: 12, marginBottom: 18 }}>{subtitle}</div>
        {isLoading ? <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.5)' }}>{t.loading}</div> : (
          isEnded ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(123,47,255,0.12)' }}>
                  {['记录ID', '用户ID', '昵称', '奖品', '金额', '时间'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.7)', fontSize: 12, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.winners ?? []).length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'rgba(180,150,255,0.3)' }}>暂无中奖记录</td></tr>
                ) : (data?.winners ?? []).map((w: any) => (
                  <tr key={w.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                    <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>{w.id}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{w.playerId || '-'}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{w.player?.nickname ?? w.nicknameSnapshot ?? '-'}</td>
                    <td style={{ padding: '10px 12px', color: '#a78bfa', fontSize: 13 }}>{w.prize?.name ?? '-'}</td>
                    <td style={{ padding: '10px 12px', color: '#ffd700', fontSize: 13 }}>¥{parseFloat(w.prize?.amount ?? '0').toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>{formatBeijingDateTime(w.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(123,47,255,0.12)' }}>
                  {['记录ID', '用户ID', '昵称', '类型', '参与时间'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.7)', fontSize: 12, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.participants ?? []).length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'rgba(180,150,255,0.3)' }}>暂无参与记录</td></tr>
                ) : (data?.participants ?? []).map((participant: any) => (
                  <tr key={participant.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                    <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>{participant.id}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{participant.isBot ? '-' : (participant.playerId || '-')}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{participant.isBot ? (participant.botNickname || '机器人') : (participant.nickname || '-')}</td>
                    <td style={{ padding: '10px 12px', color: participant.isBot ? '#f59e0b' : '#06b6d4', fontSize: 12 }}>{participant.isBot ? '机器人' : '玩家'}</td>
                    <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>{formatBeijingDateTime(participant.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}

function EditRollRoomWinnersModal({ roomId, onClose, onSuccess, t, lang }: { roomId: number; onClose: () => void; onSuccess: () => void; t: I18nT; lang: 'zh' | 'en' }) {
  const utils = trpc.useUtils();
  const { data: detail, isLoading } = trpc.admin.rollRoomDetail.useQuery({ id: roomId });
  const { data: designatedIds, isLoading: isIdsLoading } = trpc.admin.rollRoomDesignatedWinners.useQuery({ roomId });
  const [winnerIds, setWinnerIds] = useState<string[]>(['']);

  useEffect(() => {
    if (designatedIds) {
      setWinnerIds(designatedIds.length > 0 ? designatedIds.map(String) : ['']);
    }
  }, [designatedIds]);

  const updateMutation = trpc.admin.updateRollRoomDesignatedWinners.useMutation({
    onSuccess: async () => {
      toast.success(lang === 'zh' ? '指定中奖名单已更新' : 'Winner list updated');
      await utils.admin.rollRoomList.invalidate();
      await utils.admin.rollRoomDetail.invalidate({ id: roomId });
      await utils.admin.rollRoomDesignatedWinners.invalidate({ roomId });
      onSuccess();
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  const participantRows = (detail?.participants ?? []).filter((item: any) => !item.isBot && item.playerId);

  const handleSubmit = () => {
    const ids = winnerIds
      .map(value => parseInt(String(value).trim(), 10))
      .filter(value => Number.isInteger(value) && value > 0);
    updateMutation.mutate({ roomId, winnerIds: [...new Set(ids)] });
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxWidth: 760 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{lang === 'zh' ? '编辑指定中奖名单' : 'Edit Winner List'} (#{roomId})</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(180,150,255,0.7)', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ color: 'rgba(180,150,255,0.55)', fontSize: 12, marginBottom: 18 }}>
          {lang === 'zh' ? '仅待开奖房间支持编辑。这里保存的是指定中奖用户ID列表，开奖时会优先按填写顺序分配奖品。' : 'Pending rooms only. Saved user IDs will be prioritized during draw.'}
        </div>

        {(isLoading || isIdsLoading) ? <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.5)' }}>{t.loading}</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
              <div>
                <label style={labelStyle}>{t.roomName}</label>
                <div style={{ ...inputStyle, minHeight: 38, display: 'flex', alignItems: 'center' }}>{detail?.room?.title ?? '-'}</div>
              </div>
              <div>
                <label style={labelStyle}>{t.roomStatus}</label>
                <div style={{ ...inputStyle, minHeight: 38, display: 'flex', alignItems: 'center' }}>{detail?.room?.status === 'ended' ? (lang === 'zh' ? '已结束' : 'Ended') : (lang === 'zh' ? '待开奖' : 'Pending')}</div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={{ ...labelStyle, marginBottom: 0, fontSize: 14, color: '#a78bfa' }}>{t.winnerList}（可选，指定中奖用户ID）</label>
                <button onClick={() => setWinnerIds(prev => [...prev, ''])} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'rgba(123,47,255,0.2)', color: '#a78bfa', border: '1px solid rgba(123,47,255,0.35)' }}>
                  + {lang === 'zh' ? '增加' : 'Add'}
                </button>
              </div>
              {winnerIds.map((value, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input style={{ ...inputStyle, flex: 1 }} type="number" inputMode="numeric" value={value} onChange={e => setWinnerIds(list => list.map((item, i) => i === idx ? e.target.value : item))} placeholder={t.winnerPhone} />
                  {winnerIds.length > 1 && (
                    <button onClick={() => setWinnerIds(list => list.filter((_, i) => i !== idx))} style={{ padding: '7px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label style={{ ...labelStyle, fontSize: 14, color: '#a78bfa' }}>{lang === 'zh' ? '当前参与玩家' : 'Current Participants'}</label>
              <div style={{ border: '1px solid rgba(120,60,220,0.2)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(123,47,255,0.12)' }}>
                      {['用户ID', '昵称', '参与时间'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.7)', fontSize: 12, textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {participantRows.length === 0 ? (
                      <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: 'rgba(180,150,255,0.3)' }}>{lang === 'zh' ? '当前暂无真实玩家参与' : 'No real participants yet'}</td></tr>
                    ) : participantRows.map((participant: any) => (
                      <tr key={participant.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                        <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{participant.playerId}</td>
                        <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{participant.nickname || '-'}</td>
                        <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>{formatBeijingDateTime(participant.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: 'rgba(180,150,255,0.7)', border: '1px solid rgba(120,60,220,0.25)' }}>{lang === 'zh' ? '取消' : 'Cancel'}</button>
              <button onClick={handleSubmit} disabled={updateMutation.isPending} style={{ padding: '10px 28px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#7b2fff,#06b6d4)', color: '#fff', border: 'none', opacity: updateMutation.isPending ? 0.6 : 1 }}>
                {updateMutation.isPending ? (lang === 'zh' ? '保存中...' : 'Saving...') : (lang === 'zh' ? '保存修改' : 'Save')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CreateRollRoomModal({ onClose, onSuccess, t }: { onClose: () => void; onSuccess: () => void; t: I18nT }) {
  const [form, setForm] = useState({
    name: '', avatarUrl: '', prizeFirstAmount: '', parentId: '',
    startTime: '', endTime: '', threshold: '',
    exchangeType: 'mall_coin', botCount: '0',
  });
  const [prizes, setPrizes] = useState([{ name: '', amount: '', quantity: '1', imageUrl: '' }]);
  const [winners, setWinners] = useState(['']);
  const [uploading, setUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const createMutation = trpc.admin.createRollRoom.useMutation({
    onSuccess: () => { toast.success('对战房创建成功'); onSuccess(); onClose(); },
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
        try {
          const base64 = (ev.target?.result as string).split(',')[1];
          const result = await uploadMutation.mutateAsync({ base64, filename: file.name, mimeType: file.type });
          setForm(f => ({ ...f, avatarUrl: result.url }));
        } catch (error: any) {
          toast.error(error?.message || '图片上传失败');
        } finally {
          setUploading(false);
        }
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
        try {
          const base64 = (ev.target?.result as string).split(',')[1];
          const result = await uploadMutation.mutateAsync({ base64, filename: file.name, mimeType: file.type });
          setPrizes(ps => ps.map((p, i) => i === idx ? { ...p, imageUrl: result.url } : p));
        } catch (error: any) {
          toast.error(error?.message || '奖品图片上传失败');
        }
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
    const designatedWinnerIds = winners
      .map(value => parseInt(String(value).trim(), 10))
      .filter(value => Number.isInteger(value) && value > 0);
    createMutation.mutate({
      title: form.name,
      avatarBase64: undefined,
      avatarUrl: form.avatarUrl || undefined,
      ownerId: form.parentId ? parseInt(form.parentId) : undefined,
      startAt: toBeijingIsoString(form.startTime),
      endAt: toBeijingIsoString(form.endTime),
      threshold: parseFloat(form.threshold),
      maxParticipants: 0,
      designatedWinnerIds: [...new Set(designatedWinnerIds)],
      prizes: validPrizes.map(p => ({ name: p.name, value: parseFloat(p.amount), quantity: parseInt(p.quantity) || 1, coinType: (form.exchangeType === 'gold' ? 'gold' : 'shopCoin') as 'shopCoin' | 'gold', imageBase64: undefined, imageUrl: p.imageUrl || undefined, prizeType: 'coin' as const, itemCategory: 'roll' })),
    });
  };

  const createOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' };
  const createModalStyle: React.CSSProperties = { background: 'linear-gradient(135deg,#1a0840,#0d0621)', border: '1px solid rgba(120,60,220,0.5)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 680, marginTop: 20, marginBottom: 20 };

  return (
    <div style={createOverlayStyle}>
      <div style={createModalStyle} onClick={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{t.createRollRoom}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(180,150,255,0.7)', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1/3' }}>
            <label style={labelStyle}>{t.roomName} *</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="请输入房间名称" />
          </div>
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
          <div>
            <label style={labelStyle}>{t.prizeFirst}</label>
            <input style={inputStyle} type="number" value={form.prizeFirstAmount} onChange={e => setForm(f => ({ ...f, prizeFirstAmount: e.target.value }))} placeholder="0.00" />
          </div>
          <div>
            <label style={labelStyle}>{t.parentId}</label>
            <input style={inputStyle} type="number" value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))} placeholder="请输入上级ID（可选）" />
          </div>
          <div>
            <label style={labelStyle}>{t.startTime} *</label>
            <input style={inputStyle} type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>{t.endTime} *</label>
            <input style={inputStyle} type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>{t.threshold} * (¥)</label>
            <input style={inputStyle} type="number" value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))} placeholder="0.00" />
          </div>
          <div>
            <label style={labelStyle}>{t.exchangeType}</label>
            <select style={selectStyle} value={form.exchangeType} onChange={e => setForm(f => ({ ...f, exchangeType: e.target.value }))}>
              <option value="gold" style={selectOptionStyle}>平台币</option>
              <option value="mall_coin" style={selectOptionStyle}>商城币</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t.botCount}</label>
            <input style={inputStyle} type="number" value={form.botCount} onChange={e => setForm(f => ({ ...f, botCount: e.target.value }))} min="0" />
          </div>
        </div>

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

        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0, fontSize: 14, color: '#a78bfa' }}>{t.winnerList}（可选，指定中奖用户ID）</label>
            <button onClick={() => setWinners(ws => [...ws, ''])} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'rgba(123,47,255,0.2)', color: '#a78bfa', border: '1px solid rgba(123,47,255,0.35)' }}>
              + 增加
            </button>
          </div>
          {winners.map((w, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} type="number" inputMode="numeric" value={w} onChange={e => setWinners(ws => ws.map((v, i) => i === idx ? e.target.value : v))} placeholder={t.winnerPhone} />
              {winners.length > 1 && (
                <button onClick={() => setWinners(ws => ws.filter((_, i) => i !== idx))} style={{ padding: '7px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>✕</button>
              )}
            </div>
          ))}
        </div>

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

export function AdminRollRooms({ lang, t }: { lang: 'zh' | 'en'; t: I18nT }) {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showRoster, setShowRoster] = useState<{ roomId: number; status: string } | null>(null);
  const [editRoomId, setEditRoomId] = useState<number | null>(null);

  const { data, isLoading } = trpc.admin.rollRoomList.useQuery({ page, limit: 15 });
  const drawMutation = trpc.admin.drawRollRoom.useMutation({
    onSuccess: async () => {
      toast.success(lang === 'zh' ? '开奖成功' : 'Draw success');
      await utils.admin.rollRoomList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteRollRoom.useMutation({
    onSuccess: async () => {
      toast.success(lang === 'zh' ? '已删除' : 'Deleted');
      await utils.admin.rollRoomList.invalidate();
    },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{t.rollRooms}</div>
        <button onClick={() => setShowCreate(true)} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'linear-gradient(135deg,#7b2fff,#06b6d4)', color: '#fff', border: 'none' }}>
          + {t.createRollRoom}
        </button>
      </div>

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
                <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: 'rgba(180,150,255,0.3)' }}>暂无对战房</td></tr>
              ) : (data?.list ?? []).map((room: any) => (
                <tr key={room.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                  <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.6)', fontSize: 12 }}>{room.id}</td>
                  <td style={{ padding: '10px 14px', color: '#fff', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {room.avatarUrl && <img src={room.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />}
                      {room.title}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.5)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    <div>{formatBeijingDateTime(room.startAt)}</div>
                    <div>{formatBeijingDateTime(room.endAt)}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${statusColor(room.status)}22`, color: statusColor(room.status), border: `1px solid ${statusColor(room.status)}44` }}>
                      {statusLabel(room.status)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>{room.ownerId ?? '-'}</td>
                  <td style={{ padding: '10px 14px', color: '#7df9ff', fontSize: 13 }}>{room.participantCount ?? 0}</td>
                  <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>{room.botCount ?? 0}</td>
                  <td style={{ padding: '10px 14px', color: '#ffd700', fontSize: 13 }}>¥{parseFloat(room.totalValue ?? '0').toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', color: '#a78bfa', fontSize: 12 }}>{room.totalPrizes ?? 0}</td>
                  <td style={{ padding: '10px 14px', color: '#f59e0b', fontSize: 13 }}>¥{parseFloat(room.threshold ?? '0').toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', color: '#10b981', fontSize: 13 }}>¥{parseFloat(room.actualPaidValue ?? '0').toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', color: '#06b6d4', fontSize: 12 }}>{room.actualPaidCount ?? 0}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button onClick={() => setShowRoster({ roomId: room.id, status: room.status })} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
                        {t.winnerDetail}
                      </button>
                      {room.status !== 'ended' && (
                        <button onClick={() => setEditRoomId(room.id)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(123,47,255,0.18)', color: '#a78bfa', border: '1px solid rgba(123,47,255,0.35)' }}>
                          {lang === 'zh' ? '编辑' : 'Edit'}
                        </button>
                      )}
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
      {showRoster && <RoomRosterModal roomId={showRoster.roomId} status={showRoster.status} onClose={() => setShowRoster(null)} t={t} lang={lang} />}
      {editRoomId !== null && <EditRollRoomWinnersModal roomId={editRoomId} onClose={() => setEditRoomId(null)} onSuccess={() => utils.admin.rollRoomList.invalidate()} t={t} lang={lang} />}
    </div>
  );
}
