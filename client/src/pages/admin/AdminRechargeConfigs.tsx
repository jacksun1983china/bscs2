/**
 * AdminRechargeConfigs.tsx — 充值档位管理
 * 管理员可以增删改查充值档位（金额、金币、赠送钻石、标签、排序、状态）
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Props {
  lang: 'zh' | 'en';
}

const T = {
  zh: {
    title: '充值档位管理',
    add: '新增档位',
    amount: '充值金额(¥)',
    gold: '获得金币',
    bonusDiamond: '赠送钻石',
    tag: '标签',
    sort: '排序',
    status: '状态',
    actions: '操作',
    edit: '编辑',
    delete: '删除',
    save: '保存',
    cancel: '取消',
    enabled: '启用',
    disabled: '禁用',
    confirm_delete: '确认删除此档位？',
    no_data: '暂无充值档位，请点击「新增档位」添加',
    form_title_add: '新增充值档位',
    form_title_edit: '编辑充值档位',
  },
  en: {
    title: 'Recharge Config',
    add: 'Add Config',
    amount: 'Amount(¥)',
    gold: 'Gold',
    bonusDiamond: 'Bonus Diamond',
    tag: 'Tag',
    sort: 'Sort',
    status: 'Status',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    enabled: 'Enabled',
    disabled: 'Disabled',
    confirm_delete: 'Confirm delete?',
    no_data: 'No configs yet. Click "Add Config" to create one.',
    form_title_add: 'Add Recharge Config',
    form_title_edit: 'Edit Recharge Config',
  },
};

interface FormState {
  id?: number;
  amount: string;
  gold: string;
  bonusDiamond: string;
  tag: string;
  sort: string;
  status: number;
}

const defaultForm = (): FormState => ({
  amount: '',
  gold: '',
  bonusDiamond: '0',
  tag: '',
  sort: '0',
  status: 1,
});

export function AdminRechargeConfigs({ lang }: Props) {
  const t = T[lang];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm());

  const { data: configs, refetch } = trpc.admin.rechargeConfigList.useQuery();

  const createMutation = trpc.admin.createRechargeConfig.useMutation({
    onSuccess: () => { toast.success('创建成功'); refetch(); setShowForm(false); setForm(defaultForm()); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.admin.updateRechargeConfig.useMutation({
    onSuccess: () => { toast.success('更新成功'); refetch(); setShowForm(false); setForm(defaultForm()); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.admin.deleteRechargeConfig.useMutation({
    onSuccess: () => { toast.success('删除成功'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleEdit = (cfg: any) => {
    setForm({
      id: cfg.id,
      amount: String(cfg.amount),
      gold: String(cfg.gold),
      bonusDiamond: String(cfg.bonusDiamond ?? 0),
      tag: cfg.tag ?? '',
      sort: String(cfg.sort ?? 0),
      status: cfg.status ?? 1,
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm(t.confirm_delete)) return;
    deleteMutation.mutate({ id });
  };

  const handleSubmit = () => {
    const amount = parseFloat(form.amount);
    const gold = parseFloat(form.gold);
    const bonusDiamond = parseFloat(form.bonusDiamond || '0');
    const sort = parseInt(form.sort || '0', 10);
    if (isNaN(amount) || amount <= 0) { toast.error('请输入有效充值金额'); return; }
    if (isNaN(gold) || gold <= 0) { toast.error('请输入有效金币数量'); return; }

    if (form.id) {
      updateMutation.mutate({ id: form.id, amount, gold, bonusDiamond, tag: form.tag, sort, status: form.status });
    } else {
      createMutation.mutate({ amount, gold, bonusDiamond, tag: form.tag, sort });
    }
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(13,6,33,0.95)',
    border: '1px solid rgba(120,60,220,0.3)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(5,4,18,0.8)',
    border: '1px solid rgba(120,60,220,0.4)',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    color: 'rgba(180,150,255,0.8)',
    fontSize: 13,
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* 标题行 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>{t.title}</h2>
        <button
          onClick={() => { setForm(defaultForm()); setShowForm(true); }}
          style={{
            background: 'linear-gradient(135deg, #7b2fff, #06b6d4)',
            border: 'none',
            borderRadius: 8,
            padding: '8px 20px',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + {t.add}
        </button>
      </div>

      {/* 表单弹窗 */}
      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ color: '#c084fc', fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
            {form.id ? t.form_title_edit : t.form_title_add}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>{t.amount} *</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="例：100"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t.gold} *</label>
              <input
                type="number"
                value={form.gold}
                onChange={e => setForm(f => ({ ...f, gold: e.target.value }))}
                placeholder="例：100"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t.bonusDiamond}</label>
              <input
                type="number"
                value={form.bonusDiamond}
                onChange={e => setForm(f => ({ ...f, bonusDiamond: e.target.value }))}
                placeholder="例：37"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t.tag}</label>
              <input
                type="text"
                value={form.tag}
                onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                placeholder="例：最热门"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t.sort}</label>
              <input
                type="number"
                value={form.sort}
                onChange={e => setForm(f => ({ ...f, sort: e.target.value }))}
                placeholder="例：1"
                style={inputStyle}
              />
            </div>
            {form.id && (
              <div>
                <label style={labelStyle}>{t.status}</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: Number(e.target.value) }))}
                  style={{ ...inputStyle }}
                >
                  <option value={1}>{t.enabled}</option>
                  <option value={0}>{t.disabled}</option>
                </select>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              style={{
                background: 'linear-gradient(135deg, #7b2fff, #06b6d4)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 24px',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: (createMutation.isPending || updateMutation.isPending) ? 0.6 : 1,
              }}
            >
              {t.save}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(defaultForm()); }}
              style={{
                background: 'rgba(80,40,160,0.4)',
                border: '1px solid rgba(120,60,220,0.4)',
                borderRadius: 8,
                padding: '8px 24px',
                color: '#fff',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* 档位列表 */}
      {(!configs || configs.length === 0) ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '60px 0', fontSize: 14 }}>
          {t.no_data}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'rgba(120,60,220,0.15)' }}>
                {['ID', t.amount, t.gold, t.bonusDiamond, t.tag, t.sort, t.status, t.actions].map(h => (
                  <th key={h} style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.8)', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid rgba(120,60,220,0.2)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {configs.map((cfg: any) => (
                <tr key={cfg.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)' }}>{cfg.id}</td>
                  <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 700 }}>¥{Number(cfg.amount).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,246,13,1)', fontWeight: 600 }}>{Number(cfg.gold).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', color: 'rgba(58,255,255,1)' }}>{Number(cfg.bonusDiamond ?? 0).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', color: '#c084fc' }}>
                    {cfg.tag ? (
                      <span style={{ background: 'rgba(120,60,220,0.3)', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>
                        {cfg.tag}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.6)' }}>{cfg.sort}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: cfg.status === 1 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                      color: cfg.status === 1 ? '#4ade80' : '#f87171',
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      {cfg.status === 1 ? t.enabled : t.disabled}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleEdit(cfg)}
                        style={{
                          background: 'rgba(123,47,255,0.3)',
                          border: '1px solid rgba(120,60,220,0.4)',
                          borderRadius: 6,
                          padding: '4px 12px',
                          color: '#c084fc',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {t.edit}
                      </button>
                      <button
                        onClick={() => handleDelete(cfg.id)}
                        disabled={deleteMutation.isPending}
                        style={{
                          background: 'rgba(239,68,68,0.2)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 6,
                          padding: '4px 12px',
                          color: '#f87171',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {t.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
