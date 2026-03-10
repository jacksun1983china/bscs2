/**
 * AdminShop.tsx — 商城管理
 * 商品列表实时从 cs2pifa API 读取（通过服务端代理）
 * 无需同步到数据库
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface Cs2Product {
  typeId: number;
  typeName: string;
  templateId: number;
  templateName: string;
  iconUrl: string;
  exteriorName: string;
  rarityName: string;
  referencePrice: number;
  minSellPrice: number;
  sellNum: number;
}

export default function AdminShop() {
  const [keyword, setKeyword] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>(undefined);
  const [pageNum, setPageNum] = useState(1);
  const [sortDesc, setSortDesc] = useState(false);

  const { data: categories = [], isLoading: catsLoading } = trpc.shop.getCategories.useQuery(undefined, {
    staleTime: 5 * 60_000,
    retry: 2,
  });

  const { data, isLoading, error } = trpc.shop.getProducts.useQuery({
    typeId: selectedTypeId,
    keyword: keyword || undefined,
    sortDesc,
    pageNum,
    pageSize: 20,
  }, { staleTime: 30_000, retry: 1 });

  const items: Cs2Product[] = (data?.items || []) as Cs2Product[];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      {/* 标题 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#e0d0ff', fontSize: 20, fontWeight: 700, margin: 0 }}>商城管理</h2>
        <p style={{ color: 'rgba(180,150,255,0.6)', fontSize: 13, marginTop: 4 }}>
          商品数据实时从 cs2pifa API 读取，无需同步到数据库。玩家购买后订单写入数据库。
        </p>
      </div>

      {/* 分类筛选 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          onClick={() => { setSelectedTypeId(undefined); setPageNum(1); }}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: `1px solid ${!selectedTypeId ? '#a855f7' : 'rgba(120,60,220,0.4)'}`,
            background: !selectedTypeId ? 'rgba(168,85,247,0.2)' : 'transparent',
            color: !selectedTypeId ? '#e0d0ff' : 'rgba(180,150,255,0.6)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          全部
        </button>
        {catsLoading ? (
          <span style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13, alignSelf: 'center' }}>加载分类...</span>
        ) : (
          categories.map((cat) => (
            <button
              key={cat.typeId}
              onClick={() => { setSelectedTypeId(cat.typeId); setPageNum(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${selectedTypeId === cat.typeId ? '#a855f7' : 'rgba(120,60,220,0.4)'}`,
                background: selectedTypeId === cat.typeId ? 'rgba(168,85,247,0.2)' : 'transparent',
                color: selectedTypeId === cat.typeId ? '#e0d0ff' : 'rgba(180,150,255,0.6)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {cat.typeName}
            </button>
          ))
        )}
      </div>

      {/* 搜索+排序 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          value={keyword}
          onChange={e => { setKeyword(e.target.value); setPageNum(1); }}
          placeholder="搜索商品名称..."
          style={{
            flex: 1,
            padding: '8px 14px',
            background: 'rgba(20,8,50,0.8)',
            border: '1px solid rgba(120,60,220,0.4)',
            borderRadius: 8,
            color: '#e0d0ff',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          onClick={() => { setSortDesc(v => !v); setPageNum(1); }}
          style={{
            padding: '8px 16px',
            background: 'rgba(120,60,220,0.2)',
            border: '1px solid rgba(120,60,220,0.4)',
            borderRadius: 8,
            color: '#e0d0ff',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          价格 {sortDesc ? '↓' : '↑'}
        </button>
      </div>

      {/* 商品统计 */}
      {!isLoading && !error && (
        <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 13, marginBottom: 12 }}>
          共 {total} 件商品，第 {pageNum} / {totalPages} 页
        </div>
      )}

      {/* 商品表格 */}
      <div style={{
        background: 'rgba(20,8,50,0.5)',
        border: '1px solid rgba(120,60,220,0.2)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'rgba(180,150,255,0.5)' }}>
            正在从 cs2pifa API 加载商品...
          </div>
        ) : error ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#ff6b6b' }}>
            <div style={{ marginBottom: 8 }}>⚠️ 加载失败</div>
            <div style={{ fontSize: 13, color: 'rgba(180,150,255,0.5)' }}>{error.message}</div>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'rgba(180,150,255,0.5)' }}>
            暂无商品数据
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(120,60,220,0.1)' }}>
                {['#', '图片', '商品名称', '分类', '磨损', '稀有度', '参考价格', '在售数量'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left',
                    color: 'rgba(180,150,255,0.7)', fontSize: 12, fontWeight: 600,
                    borderBottom: '1px solid rgba(120,60,220,0.2)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item: Cs2Product, idx: number) => (
                <tr key={item.templateId} style={{
                  borderBottom: '1px solid rgba(120,60,220,0.1)',
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(120,60,220,0.03)',
                }}>
                  <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>
                    {(pageNum - 1) * 20 + idx + 1}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <img
                      src={item.iconUrl || ''}
                      alt=""
                      style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, background: 'rgba(80,20,160,0.2)' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </td>
                  <td style={{ padding: '10px 12px', color: '#e0d0ff', fontSize: 13, maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.templateName}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.7)', fontSize: 12 }}>
                    {item.typeName}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.7)', fontSize: 12 }}>
                    {item.exteriorName || '-'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'rgba(120,60,220,0.2)',
                      color: '#c084fc',
                    }}>
                      {item.rarityName || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#ffd700', fontSize: 13, fontWeight: 600 }}>
                    ¥{item.referencePrice?.toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.6)', fontSize: 12 }}>
                    {item.sellNum ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button
            onClick={() => setPageNum(p => Math.max(1, p - 1))}
            disabled={pageNum <= 1}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid rgba(120,60,220,0.4)',
              background: pageNum <= 1 ? 'rgba(20,8,50,0.3)' : 'rgba(20,8,50,0.8)',
              color: pageNum <= 1 ? '#555' : '#9980cc',
              fontSize: 13,
              cursor: pageNum <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            上一页
          </button>
          <span style={{ color: '#9980cc', fontSize: 13, alignSelf: 'center' }}>
            {pageNum} / {totalPages}
          </span>
          <button
            onClick={() => setPageNum(p => Math.min(totalPages, p + 1))}
            disabled={pageNum >= totalPages}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid rgba(120,60,220,0.4)',
              background: pageNum >= totalPages ? 'rgba(20,8,50,0.3)' : 'rgba(20,8,50,0.8)',
              color: pageNum >= totalPages ? '#555' : '#9980cc',
              fontSize: 13,
              cursor: pageNum >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
