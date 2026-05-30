/**
 * AdminBoxes.tsx — 宝箱管理组件
 * 对应 bdcs2.com 后台的「宝箱管理」页面
 * 支持：列表查看、分类筛选、搜索、编辑状态、查看/编辑商品详情
 */
import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface I18nT {
  [key: string]: string;
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(120,60,220,0.35)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#e0d0ff',
  fontSize: 14,
  outline: 'none',
};

const btnStyle = (color: string, extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 7,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  background: color,
  color: '#fff',
  border: 'none',
  ...extra,
});

const LEVEL_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: '传说', color: '#ff4d4d', bg: 'rgba(255,77,77,0.15)' },
  2: { label: '稀有', color: '#ff9900', bg: 'rgba(255,153,0,0.15)' },
  3: { label: '普通', color: '#9b59b6', bg: 'rgba(155,89,182,0.15)' },
  4: { label: '基础', color: '#3498db', bg: 'rgba(52,152,219,0.15)' },
};

interface EditGood {
  name: string;
  imageUrl: string;
  level: number;
  price: number;
  probability: number;
}

// 商品详情弹窗（支持查看和编辑）
function BoxGoodsModal({ boxId, boxName, onClose, onSaved }: {
  boxId: number;
  boxName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data, isLoading, refetch } = trpc.sku.boxDetail.useQuery({ id: boxId });
  const [editing, setEditing] = useState(false);
  const [editGoods, setEditGoods] = useState<EditGood[]>([]);
  const [editBoxName, setEditBoxName] = useState('');
  const [editBoxPrice, setEditBoxPrice] = useState(0);
  const [saving, setSaving] = useState(false);

  const updateBoxMutation = trpc.sku.updateBox.useMutation();
  const updateGoodsMutation = trpc.sku.updateBoxGoods.useMutation();
  const uploadMutation = trpc.admin.uploadFile.useMutation();

  // 进入编辑模式时初始化数据
  useEffect(() => {
    if (editing && data) {
      setEditBoxName(data.name);
      setEditBoxPrice(Number(data.price));
      setEditGoods(data.goods.map(g => ({
        name: g.name,
        imageUrl: g.imageUrl,
        level: g.level,
        price: Number(g.price),
        probability: Number(g.probability),
      })));
    }
  }, [editing, data]);

  const handleGoodChange = (index: number, field: keyof EditGood, value: any) => {
    setEditGoods(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddGood = () => {
    setEditGoods(prev => [...prev, {
      name: '新商品',
      imageUrl: '',
      level: 3,
      price: 0,
      probability: 1,
    }]);
  };

  const handleRemoveGood = (index: number) => {
    setEditGoods(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await uploadMutation.mutateAsync({
          filename: file.name,
          base64,
          mimeType: file.type || 'image/png',
        });
        handleGoodChange(index, 'imageUrl', result.url);
        toast.success('图片上传成功');
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      toast.error('图片上传失败: ' + e.message);
    }
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      // 更新宝箱基本信息
      if (editBoxName !== data.name || editBoxPrice !== Number(data.price)) {
        await updateBoxMutation.mutateAsync({
          id: boxId,
          name: editBoxName,
          price: editBoxPrice,
        });
      }
      // 更新商品列表（全量替换）
      await updateGoodsMutation.mutateAsync({
        boxId,
        goods: editGoods.map(g => ({
          name: g.name,
          imageUrl: g.imageUrl,
          level: g.level,
          price: g.price,
          probability: g.probability,
        })),
      });
      toast.success('保存成功');
      setEditing(false);
      refetch();
      onSaved();
    } catch (e: any) {
      toast.error('保存失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditGoods([]);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'linear-gradient(135deg, #1a0840 0%, #0d0621 100%)',
          border: '1px solid rgba(120,60,220,0.5)',
          borderRadius: 16,
          padding: 24,
          width: '90%',
          maxWidth: 900,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(80,20,160,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ color: '#e0d0ff', fontSize: 18, fontWeight: 700, margin: 0 }}>
              {editing ? '编辑宝箱' : `${boxName} — 商品列表`}
            </h3>
            {data && !editing && (
              <p style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13, margin: '4px 0 0' }}>
                共 {data.goods.length} 件商品
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                style={btnStyle('linear-gradient(135deg,#7b2fff,#06b6d4)')}
              >
                编辑
              </button>
            )}
            {editing && (
              <>
                <button onClick={handleCancelEdit} style={{ ...btnStyle('rgba(255,255,255,0.08)'), border: '1px solid rgba(120,60,220,0.3)' }}>
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={btnStyle('linear-gradient(135deg,#10b981,#06b6d4)')}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </>
            )}
            <button onClick={onClose} style={{ ...btnStyle('rgba(255,255,255,0.08)'), border: '1px solid rgba(120,60,220,0.3)' }}>
              关闭
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.4)' }}>加载中...</div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.4)' }}>加载失败</div>
        ) : editing ? (
          /* ========== 编辑模式 ========== */
          <>
            {/* 宝箱基本信息编辑 */}
            <div style={{
              display: 'flex', gap: 16, marginBottom: 20, padding: 16,
              background: 'rgba(120,60,220,0.1)', borderRadius: 12,
              border: '1px solid rgba(120,60,220,0.2)', flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 11, marginBottom: 6 }}>宝箱名称</div>
                <input
                  value={editBoxName}
                  onChange={e => setEditBoxName(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>
              <div style={{ width: 150 }}>
                <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 11, marginBottom: 6 }}>价格 (¥)</div>
                <input
                  type="number"
                  value={editBoxPrice}
                  onChange={e => setEditBoxPrice(Number(e.target.value))}
                  style={{ ...inputStyle, width: '100%' }}
                  step="0.01"
                />
              </div>
              <div style={{ width: 120 }}>
                <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 11, marginBottom: 6 }}>分类</div>
                <div style={{ color: '#e0d0ff', fontSize: 14, padding: '8px 12px' }}>{data.category}</div>
              </div>
            </div>

            {/* 商品编辑列表 */}
            <div style={{
              background: 'rgba(13,6,33,0.6)',
              border: '1px solid rgba(120,60,220,0.2)',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              {/* 表头 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '40px 70px 1fr 90px 100px 100px 60px',
                padding: '10px 16px',
                background: 'rgba(120,60,220,0.15)',
                borderBottom: '1px solid rgba(120,60,220,0.2)',
                gap: 8,
              }}>
                {['#', '图片', '商品名称', '等级', '价格(¥)', '概率', '操作'].map(h => (
                  <div key={h} style={{ color: 'rgba(180,150,255,0.7)', fontSize: 12, fontWeight: 600 }}>{h}</div>
                ))}
              </div>

              {editGoods.map((g, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 70px 1fr 90px 100px 100px 60px',
                  padding: '8px 16px',
                  borderBottom: i < editGoods.length - 1 ? '1px solid rgba(120,60,220,0.08)' : 'none',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  {/* 序号 */}
                  <div style={{ color: 'rgba(180,150,255,0.4)', fontSize: 12 }}>{i + 1}</div>

                  {/* 图片 */}
                  <div style={{ position: 'relative' }}>
                    {g.imageUrl ? (
                      <img src={g.imageUrl} alt="" style={{ width: 48, height: 36, objectFit: 'contain', borderRadius: 4, cursor: 'pointer' }} />
                    ) : (
                      <div style={{ width: 48, height: 36, background: 'rgba(120,60,220,0.1)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(180,150,255,0.3)', fontSize: 10 }}>
                        无图
                      </div>
                    )}
                    <label style={{
                      position: 'absolute', inset: 0, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)',
                      borderRadius: 4, opacity: 0, transition: 'opacity 0.2s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                    >
                      <span style={{ color: '#fff', fontSize: 10 }}>换图</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(i, f); }}
                      />
                    </label>
                  </div>

                  {/* 名称 */}
                  <input
                    value={g.name}
                    onChange={e => handleGoodChange(i, 'name', e.target.value)}
                    style={{ ...inputStyle, padding: '4px 8px', fontSize: 12, width: '100%' }}
                  />

                  {/* 等级 */}
                  <select
                    value={g.level}
                    onChange={e => handleGoodChange(i, 'level', Number(e.target.value))}
                    style={{ ...inputStyle, padding: '4px 6px', fontSize: 12 }}
                  >
                    <option value={1}>传说</option>
                    <option value={2}>稀有</option>
                    <option value={3}>普通</option>
                    <option value={4}>基础</option>
                  </select>

                  {/* 价格 */}
                  <input
                    type="number"
                    value={g.price}
                    onChange={e => handleGoodChange(i, 'price', Number(e.target.value))}
                    style={{ ...inputStyle, padding: '4px 8px', fontSize: 12, width: '100%' }}
                    step="0.01"
                  />

                  {/* 概率 */}
                  <input
                    type="number"
                    value={g.probability}
                    onChange={e => handleGoodChange(i, 'probability', Number(e.target.value))}
                    style={{ ...inputStyle, padding: '4px 8px', fontSize: 12, width: '100%' }}
                    step="0.01"
                  />

                  {/* 删除 */}
                  <button
                    onClick={() => handleRemoveGood(i)}
                    style={{
                      ...btnStyle('rgba(239,68,68,0.15)', {
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444', fontSize: 11, padding: '4px 8px',
                      }),
                    }}
                  >
                    删除
                  </button>
                </div>
              ))}

              {/* 添加商品按钮 */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(120,60,220,0.1)' }}>
                <button onClick={handleAddGood} style={btnStyle('linear-gradient(135deg,#7b2fff,#06b6d4)', { width: '100%' })}>
                  + 添加商品
                </button>
              </div>
            </div>

            {/* 概率统计 */}
            <div style={{
              marginTop: 12, padding: '8px 16px', background: 'rgba(120,60,220,0.08)',
              borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: 'rgba(180,150,255,0.6)', fontSize: 12 }}>
                商品总数: {editGoods.length}
              </span>
              <span style={{
                color: '#e0d0ff',
                fontSize: 12, fontWeight: 600,
              }}>
                概率权重总和: {editGoods.reduce((s, g) => s + g.probability, 0).toFixed(4)}
              </span>
            </div>
          </>
        ) : (
          /* ========== 查看模式 ========== */
          <>
            {/* 宝箱封面预览 */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, padding: 16, background: 'rgba(120,60,220,0.1)', borderRadius: 12, border: '1px solid rgba(120,60,220,0.2)' }}>
              <div>
                <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 11, marginBottom: 6 }}>封面背景图</div>
                {data.imageUrl ? (
                  <img src={data.imageUrl} alt="封面" style={{ height: 80, width: 80, objectFit: 'contain', borderRadius: 8, border: '1px solid rgba(120,60,220,0.3)' }} />
                ) : <div style={{ height: 80, width: 80, background: 'rgba(120,60,220,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(180,150,255,0.3)', fontSize: 12 }}>无图</div>}
              </div>
              <div>
                <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 11, marginBottom: 6 }}>商品背景图</div>
                {data.goodsBgUrl ? (
                  <img src={data.goodsBgUrl} alt="商品背景" style={{ height: 80, width: 80, objectFit: 'contain', borderRadius: 8, border: '1px solid rgba(120,60,220,0.3)' }} />
                ) : <div style={{ height: 80, width: 80, background: 'rgba(120,60,220,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(180,150,255,0.3)', fontSize: 12 }}>无图</div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>宝箱名称</div>
                    <div style={{ color: '#e0d0ff', fontSize: 14, fontWeight: 600 }}>{data.name}</div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>价格</div>
                    <div style={{ color: '#ffd700', fontSize: 14, fontWeight: 600 }}>¥{data.price}</div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>分类</div>
                    <div style={{ color: '#e0d0ff', fontSize: 13 }}>{data.category}</div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>状态</div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: 11,
                      background: data.status === 1 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: data.status === 1 ? '#10b981' : '#ef4444',
                    }}>
                      {data.status === 1 ? '上架' : '下架'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 商品列表（只读） */}
            <div style={{
              background: 'rgba(13,6,33,0.6)',
              border: '1px solid rgba(120,60,220,0.2)',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              {/* 表头 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '50px 80px 1fr 80px 100px 100px',
                padding: '10px 16px',
                background: 'rgba(120,60,220,0.15)',
                borderBottom: '1px solid rgba(120,60,220,0.2)',
              }}>
                {['#', '图片', '商品名称', '等级', '价格', '概率'].map(h => (
                  <div key={h} style={{ color: 'rgba(180,150,255,0.7)', fontSize: 12, fontWeight: 600 }}>{h}</div>
                ))}
              </div>

              {data.goods.map((g, i) => {
                const levelInfo = LEVEL_LABELS[g.level] || LEVEL_LABELS[3];
                return (
                  <div key={g.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '50px 80px 1fr 80px 100px 100px',
                    padding: '10px 16px',
                    borderBottom: i < data.goods.length - 1 ? '1px solid rgba(120,60,220,0.08)' : 'none',
                    alignItems: 'center',
                  }}>
                    <div style={{ color: 'rgba(180,150,255,0.4)', fontSize: 12 }}>{i + 1}</div>
                    <div>
                      {g.imageUrl ? (
                        <img src={g.imageUrl} alt="" style={{ width: 48, height: 36, objectFit: 'contain', borderRadius: 4 }} />
                      ) : (
                        <div style={{ width: 48, height: 36, background: 'rgba(120,60,220,0.1)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(180,150,255,0.3)', fontSize: 10 }}>无图</div>
                      )}
                    </div>
                    <div style={{ color: '#e0d0ff', fontSize: 13 }}>{g.name}</div>
                    <div>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: levelInfo.bg, color: levelInfo.color,
                      }}>
                        {levelInfo.label}
                      </span>
                    </div>
                    <div style={{ color: '#ffd700', fontSize: 13 }}>¥{Number(g.price).toFixed(2)}</div>
                    <div style={{ color: 'rgba(180,150,255,0.7)', fontSize: 13 }}>
                      {(Number(g.probability) * 100).toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function AdminBoxes({ lang, t }: { lang: 'zh' | 'en'; t: I18nT }) {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [viewBoxId, setViewBoxId] = useState<number | null>(null);
  const [viewBoxName, setViewBoxName] = useState('');

  const { data: categories } = trpc.sku.categoryList.useQuery();
  const { data, refetch } = trpc.sku.boxList.useQuery({
    page,
    limit: 20,
    categoryId,
    keyword: keyword || undefined,
  });

  const updateMutation = trpc.sku.updateBox.useMutation({
    onSuccess: () => { toast.success('更新成功'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.sku.deleteBox.useMutation({
    onSuccess: () => { toast.success('已删除'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSearch = () => {
    setKeyword(searchInput);
    setPage(1);
  };

  const handleToggleStatus = (id: number, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    updateMutation.mutate({ id, status: newStatus });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`确认删除宝箱「${name}」？此操作不可撤销。`)) return;
    deleteMutation.mutate({ id });
  };

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ color: '#e0d0ff', fontSize: 20, fontWeight: 700, margin: 0 }}>宝箱管理</h2>
          <p style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13, margin: '4px 0 0' }}>
            共 {data?.total ?? 0} 个宝箱
          </p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        {/* 分类筛选 */}
        <select
          value={categoryId ?? ''}
          onChange={e => { setCategoryId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          style={{ ...inputStyle, width: 140 }}
        >
          <option value="">全部分类</option>
          {categories?.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {/* 搜索 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...inputStyle, width: 220 }}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索宝箱名称..."
          />
          <button onClick={handleSearch} style={btnStyle('linear-gradient(135deg,#7b2fff,#06b6d4)')}>
            搜索
          </button>
          {(keyword || categoryId) && (
            <button
              onClick={() => { setKeyword(''); setSearchInput(''); setCategoryId(undefined); setPage(1); }}
              style={{ ...btnStyle('rgba(255,255,255,0.08)'), border: '1px solid rgba(120,60,220,0.3)' }}
            >
              重置
            </button>
          )}
        </div>

        {/* 分类标签快选 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories?.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setCategoryId(categoryId === cat.id ? undefined : cat.id); setPage(1); }}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: categoryId === cat.id ? 'linear-gradient(135deg,#7b2fff,#06b6d4)' : 'rgba(120,60,220,0.1)',
                color: categoryId === cat.id ? '#fff' : 'rgba(180,150,255,0.7)',
                border: `1px solid ${categoryId === cat.id ? 'transparent' : 'rgba(120,60,220,0.25)'}`,
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 宝箱卡片网格 */}
      {!data ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(180,150,255,0.4)' }}>加载中...</div>
      ) : data.data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(180,150,255,0.4)' }}>暂无宝箱数据</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {data.data.map(box => (
            <div
              key={box.id}
              style={{
                background: 'linear-gradient(135deg, rgba(26,8,64,0.8) 0%, rgba(13,6,33,0.9) 100%)',
                border: `1px solid ${box.status === 1 ? 'rgba(120,60,220,0.4)' : 'rgba(120,60,220,0.15)'}`,
                borderRadius: 14,
                overflow: 'hidden',
                opacity: box.status === 1 ? 1 : 0.6,
                transition: 'all 0.2s',
              }}
            >
              {/* 封面图 */}
              <div style={{ position: 'relative', height: 120, background: 'rgba(13,6,33,0.8)', overflow: 'hidden' }}>
                {box.imageUrl ? (
                  <img
                    src={box.imageUrl}
                    alt={box.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                    📦
                  </div>
                )}
                {/* 状态标签 */}
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                  background: box.status === 1 ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
                  color: '#fff',
                }}>
                  {box.status === 1 ? '上架' : '下架'}
                </div>
                {/* 分类标签 */}
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                  background: 'rgba(123,47,255,0.8)', color: '#fff',
                }}>
                  {box.category}
                </div>
              </div>

              {/* 信息区 */}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ color: '#e0d0ff', fontSize: 14, fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {box.name}
                </div>
                <div style={{ color: '#ffd700', fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
                  ¥{Number(box.price).toFixed(2)}
                </div>

                {/* 操作按钮 */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { setViewBoxId(box.id); setViewBoxName(box.name); }}
                    style={{ flex: 1, ...btnStyle('rgba(6,182,212,0.15)', { border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', fontSize: 12, padding: '5px 0' }) }}
                  >
                    查看商品
                  </button>
                  <button
                    onClick={() => handleToggleStatus(box.id, box.status)}
                    disabled={updateMutation.isPending}
                    style={{
                      flex: 1,
                      ...btnStyle(
                        box.status === 1 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                        {
                          border: `1px solid ${box.status === 1 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                          color: box.status === 1 ? '#ef4444' : '#10b981',
                          fontSize: 12,
                          padding: '5px 0',
                        }
                      ),
                    }}
                  >
                    {box.status === 1 ? '下架' : '上架'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ ...btnStyle('rgba(255,255,255,0.06)', { border: '1px solid rgba(120,60,220,0.25)' }), color: page <= 1 ? 'rgba(180,150,255,0.3)' : 'rgba(180,150,255,0.8)' }}
          >
            上一页
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let p = i + 1;
            if (totalPages > 7) {
              if (page <= 4) p = i + 1;
              else if (page >= totalPages - 3) p = totalPages - 6 + i;
              else p = page - 3 + i;
            }
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: '6px 12px', borderRadius: 7, fontSize: 13, cursor: 'pointer',
                  background: p === page ? 'linear-gradient(135deg,#7b2fff,#06b6d4)' : 'rgba(255,255,255,0.06)',
                  color: '#fff', border: '1px solid rgba(120,60,220,0.25)',
                  fontWeight: p === page ? 700 : 400,
                }}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ ...btnStyle('rgba(255,255,255,0.06)', { border: '1px solid rgba(120,60,220,0.25)' }), color: page >= totalPages ? 'rgba(180,150,255,0.3)' : 'rgba(180,150,255,0.8)' }}
          >
            下一页
          </button>
        </div>
      )}

      {/* 商品详情弹窗 */}
      {viewBoxId !== null && (
        <BoxGoodsModal
          boxId={viewBoxId}
          boxName={viewBoxName}
          onClose={() => setViewBoxId(null)}
          onSaved={() => refetch()}
        />
      )}
    </div>
  );
}
