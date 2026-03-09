/**
 * AdminBanners.tsx — Banner管理组件
 */
import { useState, useRef } from 'react';
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

export function AdminBanners({ lang, t }: { lang: 'zh' | 'en'; t: I18nT }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', linkUrl: '', sort: '0', imageBase64: '' });
  const [previewUrl, setPreviewUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: banners, refetch } = trpc.admin.bannerList.useQuery();

  const createMutation = trpc.admin.createBanner.useMutation({
    onSuccess: () => { toast.success('Banner创建成功'); setShowAdd(false); setForm({ title: '', linkUrl: '', sort: '0', imageBase64: '' }); setPreviewUrl(''); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.admin.updateBanner.useMutation({
    onSuccess: () => { toast.success('更新成功'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.admin.deleteBanner.useMutation({
    onSuccess: () => { toast.success('已删除'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(',')[1];
      setForm(f => ({ ...f, imageBase64: base64 }));
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.imageBase64) { toast.error('请上传Banner图片'); return; }
    createMutation.mutate({
      imageBase64: form.imageBase64,
      title: form.title,
      linkUrl: form.linkUrl,
      sort: parseInt(form.sort) || 0,
    });
  };

  const cardStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(26,8,64,0.8) 0%, rgba(13,6,33,0.9) 100%)',
    border: '1px solid rgba(120,60,220,0.3)',
    borderRadius: 12, padding: 16,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>Banner管理</h2>
        <button onClick={() => setShowAdd(true)} style={btnStyle('linear-gradient(135deg,#7b2fff,#06b6d4)')}>
          + 添加Banner
        </button>
      </div>

      {/* Banner列表 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {(banners || []).map(banner => (
          <div key={banner.id} style={cardStyle}>
            <img
              src={banner.imageUrl}
              alt={banner.title || 'Banner'}
              style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }}
            />
            <div style={{ color: '#e0d0ff', fontSize: 14, marginBottom: 6 }}>
              {banner.title || '（无标题）'}
            </div>
            <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 12, marginBottom: 10 }}>
              排序: {banner.sort} | 状态: {banner.status === 1 ? '✅ 启用' : '❌ 禁用'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => updateMutation.mutate({ id: banner.id, status: banner.status === 1 ? 0 : 1 })}
                style={btnStyle(banner.status === 1 ? 'rgba(255,100,100,0.3)' : 'rgba(100,255,100,0.3)')}
              >
                {banner.status === 1 ? '禁用' : '启用'}
              </button>
              <button
                onClick={() => { if (confirm('确定删除此Banner？')) deleteMutation.mutate({ id: banner.id }); }}
                style={btnStyle('rgba(255,60,60,0.4)')}
              >
                删除
              </button>
            </div>
          </div>
        ))}
        {(!banners || banners.length === 0) && (
          <div style={{ color: 'rgba(180,150,255,0.5)', textAlign: 'center', padding: 40, gridColumn: '1/-1' }}>
            暂无Banner，点击"添加Banner"上传
          </div>
        )}
      </div>

      {/* 添加Banner弹窗 */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg,#1a0840,#0d0621)', border: '1px solid rgba(120,60,220,0.5)', borderRadius: 16, padding: 28, width: 480, maxWidth: '95vw' }}>
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>添加Banner</h3>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Banner图片 *</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '100%', height: 120, border: '2px dashed rgba(120,60,220,0.5)', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.03)', overflow: 'hidden',
                }}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13 }}>点击上传图片（建议 750×300）</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>标题（可选）</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Banner标题" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>跳转链接（可选）</label>
              <input style={inputStyle} value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} placeholder="https://..." />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>排序（数字越小越靠前）</label>
              <input style={inputStyle} type="number" value={form.sort} onChange={e => setForm(f => ({ ...f, sort: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAdd(false); setPreviewUrl(''); setForm({ title: '', linkUrl: '', sort: '0', imageBase64: '' }); }} style={btnStyle('rgba(255,255,255,0.1)')}>取消</button>
              <button onClick={handleSubmit} disabled={createMutation.isPending} style={{ ...btnStyle('linear-gradient(135deg,#7b2fff,#06b6d4)'), opacity: createMutation.isPending ? 0.6 : 1 }}>
                {createMutation.isPending ? '上传中...' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
