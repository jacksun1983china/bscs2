/**
 * AdminCategories.tsx — SKU分类管理组件
 * 对应 bdcs2.com 后台的「分类管理」页面
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface I18nT {
  [key: string]: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(120,60,220,0.35)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#e0d0ff',
  fontSize: 14,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(180,150,255,0.8)',
  fontSize: 13,
  marginBottom: 4,
  display: 'block',
};

const btnStyle = (color: string): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 7,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  background: color,
  color: '#fff',
  border: 'none',
});

const LEVEL_COLORS: Record<number, string> = {
  1: '#ff4d4d',   // 红色 - 最高级
  2: '#ff9900',   // 橙色 - 高级
  3: '#9b59b6',   // 紫色 - 中级
  4: '#3498db',   // 蓝色 - 普通
};

export function AdminCategories({ lang, t }: { lang: 'zh' | 'en'; t: I18nT }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', iconUrl: '', sort: '0' });

  const { data: categories, refetch } = trpc.sku.categoryList.useQuery();

  const createMutation = trpc.sku.createCategory.useMutation({
    onSuccess: () => {
      toast.success('分类创建成功');
      setShowAdd(false);
      setForm({ name: '', iconUrl: '', sort: '0' });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.sku.updateCategory.useMutation({
    onSuccess: () => {
      toast.success('更新成功');
      setEditId(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.sku.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success('已删除');
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error('请输入分类名称');
    if (editId !== null) {
      updateMutation.mutate({ id: editId, name: form.name, iconUrl: form.iconUrl, sort: Number(form.sort) });
    } else {
      createMutation.mutate({ name: form.name, iconUrl: form.iconUrl, sort: Number(form.sort) });
    }
  };

  const handleEdit = (cat: { id: number; name: string; iconUrl: string; sort: number }) => {
    setEditId(cat.id);
    setForm({ name: cat.name, iconUrl: cat.iconUrl, sort: String(cat.sort) });
    setShowAdd(true);
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`确认删除分类「${name}」？删除后该分类下的宝箱将失去分类关联。`)) return;
    deleteMutation.mutate({ id });
  };

  return (
    <div>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ color: '#e0d0ff', fontSize: 20, fontWeight: 700, margin: 0 }}>分类管理</h2>
          <p style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13, margin: '4px 0 0' }}>
            管理宝箱分类，共 {categories?.length ?? 0} 个分类
          </p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm({ name: '', iconUrl: '', sort: '0' }); setShowAdd(true); }}
          style={btnStyle('linear-gradient(135deg,#7b2fff,#06b6d4)')}
        >
          + 新增分类
        </button>
      </div>

      {/* 新增/编辑表单 */}
      {showAdd && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(26,8,64,0.9) 0%, rgba(13,6,33,0.95) 100%)',
          border: '1px solid rgba(120,60,220,0.4)',
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}>
          <h3 style={{ color: '#e0d0ff', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            {editId !== null ? '编辑分类' : '新增分类'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>分类名称 *</label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="如：赤火、龙炎、冰封..."
              />
            </div>
            <div>
              <label style={labelStyle}>图标URL（可选）</label>
              <input
                style={inputStyle}
                value={form.iconUrl}
                onChange={e => setForm(f => ({ ...f, iconUrl: e.target.value }))}
                placeholder="https://... 或 /img/..."
              />
            </div>
            <div>
              <label style={labelStyle}>排序</label>
              <input
                style={inputStyle}
                type="number"
                value={form.sort}
                onChange={e => setForm(f => ({ ...f, sort: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              style={btnStyle('linear-gradient(135deg,#7b2fff,#06b6d4)')}
            >
              {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setEditId(null); }}
              style={{ ...btnStyle('rgba(255,255,255,0.08)'), border: '1px solid rgba(120,60,220,0.3)' }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 分类列表 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(26,8,64,0.8) 0%, rgba(13,6,33,0.9) 100%)',
        border: '1px solid rgba(120,60,220,0.3)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        {/* 表头 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 200px 80px 80px 120px',
          padding: '12px 20px',
          background: 'rgba(120,60,220,0.15)',
          borderBottom: '1px solid rgba(120,60,220,0.2)',
        }}>
          {['ID', '分类名称', '图标', '排序', '状态', '操作'].map(h => (
            <div key={h} style={{ color: 'rgba(180,150,255,0.7)', fontSize: 12, fontWeight: 600 }}>{h}</div>
          ))}
        </div>

        {/* 数据行 */}
        {!categories ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(180,150,255,0.4)' }}>加载中...</div>
        ) : categories.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(180,150,255,0.4)' }}>暂无分类数据</div>
        ) : (
          categories.map((cat, idx) => (
            <div
              key={cat.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 200px 80px 80px 120px',
                padding: '14px 20px',
                borderBottom: idx < categories.length - 1 ? '1px solid rgba(120,60,220,0.1)' : 'none',
                alignItems: 'center',
              }}
            >
              <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13 }}>{cat.id}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg,#7b2fff33,#06b6d433)',
                  border: '1px solid rgba(120,60,220,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>
                  🎁
                </div>
                <span style={{ color: '#e0d0ff', fontSize: 15, fontWeight: 600 }}>{cat.name}</span>
              </div>
              <div>
                {cat.iconUrl ? (
                  <img src={cat.iconUrl} alt="" style={{ height: 28, objectFit: 'contain', borderRadius: 4 }} />
                ) : (
                  <span style={{ color: 'rgba(180,150,255,0.3)', fontSize: 12 }}>无图标</span>
                )}
              </div>
              <div style={{ color: 'rgba(180,150,255,0.7)', fontSize: 13 }}>{cat.sort}</div>
              <div>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: cat.status === 1 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: cat.status === 1 ? '#10b981' : '#ef4444',
                  border: `1px solid ${cat.status === 1 ? '#10b98133' : '#ef444433'}`,
                }}>
                  {cat.status === 1 ? '启用' : '禁用'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleEdit({ id: cat.id, name: cat.name, iconUrl: cat.iconUrl, sort: cat.sort })}
                  style={{ ...btnStyle('rgba(123,47,255,0.2)'), border: '1px solid rgba(123,47,255,0.4)', fontSize: 12, padding: '4px 10px' }}
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  style={{ ...btnStyle('rgba(239,68,68,0.15)'), border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, padding: '4px 10px', color: '#ef4444' }}
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
