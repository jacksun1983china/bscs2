/**
 * AdminVipConfigs.tsx — VIP 等级配置管理
 * 支持查看/编辑 VIP0-10 的升级阈值和充值返利比例
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const VIP_ICONS: Record<number, string> = {
  1: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/1@2x_544e8be4.png',
  2: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/2@2x_a0938465.png',
  3: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/3@2x_2347673a.png',
  4: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/4@2x_3ef4ca2d.png',
  5: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/5@2x_f850ddcf.png',
  6: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/6@2x_506a1d24.png',
  7: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/7@2x_a432c161.png',
  8: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/8@2x_c782b5ce.png',
  9: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/9@2x_cf5ebd49.png',
  10: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/10@2x_1cb51de9.png',
};

interface AdminVipConfigsProps {
  lang: 'zh' | 'en';
}

export function AdminVipConfigs({ lang }: AdminVipConfigsProps) {
  const utils = trpc.useUtils();
  const { data: configs = [], isLoading } = trpc.public.vipConfigs.useQuery(undefined, { staleTime: 30_000 });
  const updateMutation = trpc.admin.updateVipConfig.useMutation({
    onSuccess: () => {
      toast.success(lang === 'zh' ? 'VIP配置已保存' : 'VIP config saved');
      utils.public.vipConfigs.invalidate();
      setEditingLevel(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const [editingLevel, setEditingLevel] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ requiredPoints: 0, rechargeBonus: '0.00', privileges: '' });

  const startEdit = (config: typeof configs[0]) => {
    setEditingLevel(config.level);
    setEditForm({
      requiredPoints: config.requiredPoints,
      rechargeBonus: config.rechargeBonus,
      privileges: config.privileges || '',
    });
  };

  const saveEdit = () => {
    if (editingLevel === null) return;
    updateMutation.mutate({
      level: editingLevel,
      requiredPoints: editForm.requiredPoints,
      rechargeBonus: editForm.rechargeBonus,
      privileges: editForm.privileges,
    });
  };

  const cardStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(20,8,50,0.9) 0%, rgba(10,4,30,0.95) 100%)',
    border: '1px solid rgba(120,60,220,0.3)',
    borderRadius: 12,
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(120,60,220,0.4)',
    borderRadius: 8,
    padding: '6px 12px',
    color: '#fff',
    fontSize: 14,
    width: 120,
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>
          {lang === 'zh' ? '👑 VIP 等级配置' : '👑 VIP Level Config'}
        </h2>
        <p style={{ color: 'rgba(180,150,255,0.6)', fontSize: 13, marginTop: 6 }}>
          {lang === 'zh'
            ? '设置各VIP等级的升级所需充值金额和充值返利比例。玩家累计充值达到阈值后自动升级。'
            : 'Set required recharge amount and bonus rate for each VIP level. Players auto-upgrade when total recharge reaches threshold.'}
        </p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.6)' }}>
          {lang === 'zh' ? '加载中...' : 'Loading...'}
        </div>
      ) : (
        <div>
          {configs.map(config => {
            const isEditing = editingLevel === config.level;
            return (
              <div key={config.level} style={cardStyle}>
                {/* VIP 图标 */}
                <div style={{ width: 48, height: 48, flexShrink: 0 }}>
                  {config.level === 0 ? (
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'rgba(80,80,100,0.5)',
                      border: '2px solid #555',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#888', fontSize: 12, fontWeight: 700,
                    }}>
                      VIP0
                    </div>
                  ) : (
                    <img
                      src={VIP_ICONS[config.level]}
                      alt={`VIP${config.level}`}
                      style={{ width: 48, height: 48, objectFit: 'contain' }}
                    />
                  )}
                </div>

                {/* VIP 等级名 */}
                <div style={{ width: 60, flexShrink: 0 }}>
                  <span style={{ color: '#c084fc', fontSize: 16, fontWeight: 700, fontFamily: 'Orbitron, sans-serif' }}>
                    VIP {config.level}
                  </span>
                </div>

                {/* 配置项 */}
                {isEditing ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 11, marginBottom: 4 }}>
                        {lang === 'zh' ? '升级所需充值(¥)' : 'Required Recharge(¥)'}
                      </div>
                      <input
                        type="number"
                        value={editForm.requiredPoints}
                        onChange={e => setEditForm(f => ({ ...f, requiredPoints: parseInt(e.target.value) || 0 }))}
                        style={inputStyle}
                        disabled={config.level === 0}
                      />
                    </div>
                    <div>
                      <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 11, marginBottom: 4 }}>
                        {lang === 'zh' ? '充值返利(%)' : 'Recharge Bonus(%)'}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.rechargeBonus}
                        onChange={e => setEditForm(f => ({ ...f, rechargeBonus: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 11, marginBottom: 4 }}>
                        {lang === 'zh' ? '特权描述' : 'Privileges'}
                      </div>
                      <input
                        type="text"
                        value={editForm.privileges}
                        onChange={e => setEditForm(f => ({ ...f, privileges: e.target.value }))}
                        style={{ ...inputStyle, width: 200 }}
                        placeholder={lang === 'zh' ? '如：专属客服、优先提货' : 'e.g., VIP support'}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={saveEdit}
                        disabled={updateMutation.isPending}
                        style={{
                          background: 'linear-gradient(135deg, #7c3aed, #c084fc)',
                          border: 'none', borderRadius: 8, padding: '8px 16px',
                          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {updateMutation.isPending ? '...' : (lang === 'zh' ? '保存' : 'Save')}
                      </button>
                      <button
                        onClick={() => setEditingLevel(null)}
                        style={{
                          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: 8, padding: '8px 16px',
                          color: '#fff', fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        {lang === 'zh' ? '取消' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>
                        {lang === 'zh' ? '升级所需充值' : 'Required Recharge'}
                      </div>
                      <div style={{ color: '#7df9ff', fontSize: 15, fontWeight: 600 }}>
                        {config.level === 0 ? (lang === 'zh' ? '注册即享' : 'Free') : `¥${config.requiredPoints}`}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>
                        {lang === 'zh' ? '充值返利' : 'Recharge Bonus'}
                      </div>
                      <div style={{ color: parseFloat(config.rechargeBonus) > 0 ? '#ffd700' : '#666', fontSize: 15, fontWeight: 600 }}>
                        {parseFloat(config.rechargeBonus) > 0 ? `${config.rechargeBonus}%` : '-'}
                      </div>
                    </div>
                    {config.privileges && (
                      <div>
                        <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>
                          {lang === 'zh' ? '特权' : 'Privileges'}
                        </div>
                        <div style={{ color: '#c084fc', fontSize: 13 }}>{config.privileges}</div>
                      </div>
                    )}
                    <button
                      onClick={() => startEdit(config)}
                      style={{
                        marginLeft: 'auto',
                        background: 'rgba(120,60,220,0.2)',
                        border: '1px solid rgba(120,60,220,0.4)',
                        borderRadius: 8, padding: '6px 14px',
                        color: '#c084fc', fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      {lang === 'zh' ? '编辑' : 'Edit'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
