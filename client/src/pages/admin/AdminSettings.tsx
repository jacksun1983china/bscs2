/**
 * AdminSettings.tsx — 系统设置页面
 * 包含：平台基础配置（键值对）、广播管理
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface AdminSettingsProps {
  lang: 'zh' | 'en';
  t: any;
}

// 预设的系统设置项
const DEFAULT_SETTINGS = [
  { key: 'site_name', label: '平台名称', labelEn: 'Site Name', defaultValue: 'BDCS2', description: '平台显示名称' },
  { key: 'site_notice', label: '平台公告', labelEn: 'Site Notice', defaultValue: '', description: '首页公告内容' },
  { key: 'customer_service_url', label: '客服链接', labelEn: 'CS URL', defaultValue: '', description: '客服跳转地址' },
  { key: 'min_recharge', label: '最低充值金额', labelEn: 'Min Recharge', defaultValue: '1', description: '最低充值金额（元）' },
  { key: 'withdraw_enabled', label: '提现开关', labelEn: 'Withdraw Enabled', defaultValue: '1', description: '1=开启 0=关闭' },
  { key: 'register_bonus', label: '注册赠送金币', labelEn: 'Register Bonus', defaultValue: '0', description: '新用户注册赠送金币数量' },
];

export function AdminSettings({ lang, t }: AdminSettingsProps) {
  const [tab, setTab] = useState<'config' | 'broadcast'>('config');
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // 广播管理状态
  const [newBroadcast, setNewBroadcast] = useState('');
  const [newSort, setNewSort] = useState(0);

  const { data: settings, refetch: refetchSettings } = trpc.admin.getSiteSettings.useQuery();
  const { data: broadcasts, refetch: refetchBroadcasts } = trpc.admin.broadcastList.useQuery(undefined, { enabled: tab === 'broadcast' });

  const updateSetting = trpc.admin.updateSiteSetting.useMutation({
    onSuccess: () => { refetchSettings(); toast.success(lang === 'zh' ? '保存成功' : 'Saved'); setSaving(null); },
    onError: () => { toast.error(lang === 'zh' ? '保存失败' : 'Save failed'); setSaving(null); },
  });

  const createBroadcast = trpc.admin.createBroadcast.useMutation({
    onSuccess: () => { refetchBroadcasts(); setNewBroadcast(''); setNewSort(0); toast.success(lang === 'zh' ? '添加成功' : 'Added'); },
    onError: () => toast.error(lang === 'zh' ? '添加失败' : 'Failed'),
  });

  const updateBroadcast = trpc.admin.updateBroadcast.useMutation({
    onSuccess: () => { refetchBroadcasts(); toast.success(lang === 'zh' ? '更新成功' : 'Updated'); },
  });

  const deleteBroadcast = trpc.admin.deleteBroadcast.useMutation({
    onSuccess: () => { refetchBroadcasts(); toast.success(lang === 'zh' ? '删除成功' : 'Deleted'); },
  });

  const getSettingValue = (key: string, defaultVal: string) => {
    if (editValues[key] !== undefined) return editValues[key];
    const found = settings?.find(s => s.settingKey === key);
    return found?.value ?? defaultVal;
  };

  const handleSave = (key: string, description: string) => {
    setSaving(key);
    const value = getSettingValue(key, '');
    updateSetting.mutate({ key, value, description });
  };

  const tabStyle = (active: boolean) => ({
    padding: '7px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: active ? 'linear-gradient(135deg,#7b2fff,#06b6d4)' : 'rgba(255,255,255,0.06)',
    color: '#fff', border: '1px solid rgba(120,60,220,0.3)',
  });

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.3)',
    borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, flex: 1,
    outline: 'none',
  };

  return (
    <div style={{ color: '#fff' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>
          {lang === 'zh' ? '系统设置' : 'System Settings'}
        </h2>
      </div>

      {/* 标签切换 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle(tab === 'config')} onClick={() => setTab('config')}>
          {lang === 'zh' ? '基础配置' : 'Basic Config'}
        </button>
        <button style={tabStyle(tab === 'broadcast')} onClick={() => setTab('broadcast')}>
          {lang === 'zh' ? '广播管理' : 'Broadcasts'}
        </button>
      </div>

      {/* 基础配置 */}
      {tab === 'config' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(30,10,65,0.9) 0%, rgba(15,5,40,0.95) 100%)',
          border: '1px solid rgba(120,60,220,0.3)',
          borderRadius: 12, padding: 24,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {DEFAULT_SETTINGS.map(setting => (
              <div key={setting.key} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 10, border: '1px solid rgba(120,60,220,0.15)',
              }}>
                <div style={{ width: 160, flexShrink: 0 }}>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                    {lang === 'zh' ? setting.label : setting.labelEn}
                  </div>
                  <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11, marginTop: 2 }}>
                    {setting.key}
                  </div>
                </div>
                <input
                  style={inputStyle}
                  value={getSettingValue(setting.key, setting.defaultValue)}
                  onChange={e => setEditValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                  placeholder={setting.defaultValue}
                />
                <button
                  onClick={() => handleSave(setting.key, setting.description)}
                  disabled={saving === setting.key}
                  style={{
                    padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: saving === setting.key ? 'rgba(120,60,220,0.3)' : 'linear-gradient(135deg,#7b2fff,#06b6d4)',
                    color: '#fff', border: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {saving === setting.key ? (lang === 'zh' ? '保存中...' : 'Saving...') : (lang === 'zh' ? '保存' : 'Save')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 广播管理 */}
      {tab === 'broadcast' && (
        <div>
          {/* 添加广播 */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(30,10,65,0.9) 0%, rgba(15,5,40,0.95) 100%)',
            border: '1px solid rgba(120,60,220,0.3)',
            borderRadius: 12, padding: 20, marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#c084fc' }}>
              {lang === 'zh' ? '添加广播' : 'Add Broadcast'}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                style={{ ...inputStyle, minWidth: 300 }}
                value={newBroadcast}
                onChange={e => setNewBroadcast(e.target.value)}
                placeholder={lang === 'zh' ? '广播内容...' : 'Broadcast content...'}
              />
              <input
                type="number"
                style={{ ...inputStyle, width: 80, flex: 'none' }}
                value={newSort}
                onChange={e => setNewSort(Number(e.target.value))}
                placeholder={lang === 'zh' ? '排序' : 'Sort'}
              />
              <button
                onClick={() => {
                  if (!newBroadcast.trim()) return;
                  createBroadcast.mutate({ content: newBroadcast.trim(), sort: newSort });
                }}
                style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: 'linear-gradient(135deg,#7b2fff,#06b6d4)', color: '#fff', border: 'none',
                }}
              >
                {lang === 'zh' ? '添加' : 'Add'}
              </button>
            </div>
          </div>

          {/* 广播列表 */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(30,10,65,0.9) 0%, rgba(15,5,40,0.95) 100%)',
            border: '1px solid rgba(120,60,220,0.3)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(120,60,220,0.1)', borderBottom: '1px solid rgba(120,60,220,0.2)' }}>
                  {['ID', lang === 'zh' ? '内容' : 'Content', lang === 'zh' ? '排序' : 'Sort', lang === 'zh' ? '状态' : 'Status', lang === 'zh' ? '操作' : 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(180,150,255,0.8)', fontSize: 12, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(broadcasts ?? []).length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.5)' }}>
                    {lang === 'zh' ? '暂无广播' : 'No broadcasts'}
                  </td></tr>
                ) : (broadcasts ?? []).map(bc => (
                  <tr key={bc.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                    <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>{bc.id}</td>
                    <td style={{ padding: '10px 14px', color: '#fff', fontSize: 13 }}>{bc.content}</td>
                    <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.7)', fontSize: 13 }}>{bc.sort}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: bc.status === 1 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: bc.status === 1 ? '#10b981' : '#ef4444',
                        border: `1px solid ${bc.status === 1 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}>
                        {bc.status === 1 ? (lang === 'zh' ? '启用' : 'Enabled') : (lang === 'zh' ? '禁用' : 'Disabled')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => updateBroadcast.mutate({ id: bc.id, status: bc.status === 1 ? 0 : 1 })}
                          style={{
                            padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: bc.status === 1 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                            color: bc.status === 1 ? '#ef4444' : '#10b981',
                            border: `1px solid ${bc.status === 1 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                          }}
                        >
                          {bc.status === 1 ? (lang === 'zh' ? '禁用' : 'Disable') : (lang === 'zh' ? '启用' : 'Enable')}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(lang === 'zh' ? '确认删除？' : 'Confirm delete?')) {
                              deleteBroadcast.mutate({ id: bc.id });
                            }
                          }}
                          style={{
                            padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.3)',
                          }}
                        >
                          {lang === 'zh' ? '删除' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
