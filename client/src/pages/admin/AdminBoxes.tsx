/**
 * AdminBoxes.tsx — 宝箱管理组件
 * 对应 bdcs2.com 后台的「宝箱管理」页面
 * 支持：列表查看、分类筛选、搜索、编辑状态、查看商品详情
 */
import { useState, useMemo } from 'react';
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

// 商品详情弹窗
function BoxGoodsModal({ boxId, boxName, onClose }: { boxId: number; boxName: string; onClose: () => void }) {
  const { data, isLoading } = trpc.sku.boxDetail.useQuery({ id: boxId });

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
          maxWidth: 800,
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(80,20,160,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ color: '#e0d0ff', fontSize: 18, fontWeight: 700, margin: 0 }}>
              {boxName} — 商品列表
            </h3>
            {data && (
              <p style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13, margin: '4px 0 0' }}>
                共 {data.goods.length} 件商品
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ ...btnStyle('rgba(255,255,255,0.08)'), border: '1px solid rgba(120,60,220,0.3)' }}>
            关闭
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.4)' }}>加载中...</div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.4)' }}>加载失败</div>
        ) : (
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

            {/* 商品列表 */}
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
        />
      )}
    </div>
  );
}
