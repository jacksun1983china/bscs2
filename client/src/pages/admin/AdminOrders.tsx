/**
 * AdminOrders.tsx — 订单管理页面
 * 包含：提取记录列表（分页+筛选+搜索）、统计卡片
 * 状态：0=待处理(背包中) 1=已提取 2=已回收
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: '待处理', color: '#f59e0b' },
  1: { label: '已提取', color: '#10b981' },
  2: { label: '已回收', color: '#6b7280' },
};

const SOURCE_MAP: Record<string, { label: string; color: string }> = {
  box: { label: '开箱', color: '#8b5cf6' },
  roll: { label: 'Roll房', color: '#3b82f6' },
  admin: { label: '管理员', color: '#ef4444' },
  reward: { label: '奖励', color: '#f59e0b' },
  shop: { label: '商城', color: '#10b981' },
  arena: { label: '竞技场', color: '#ec4899' },
};

const QUALITY_MAP: Record<string, { label: string; color: string }> = {
  common: { label: '普通', color: '#9ca3af' },
  rare: { label: '稀有', color: '#3b82f6' },
  epic: { label: '史诗', color: '#8b5cf6' },
  legendary: { label: '传说', color: '#f59e0b' },
  '消费级': { label: '消费级', color: '#9ca3af' },
  '工业级': { label: '工业级', color: '#60a5fa' },
  '军规级': { label: '军规级', color: '#3b82f6' },
  '受限': { label: '受限', color: '#8b5cf6' },
  '保密': { label: '保密', color: '#d946ef' },
  '隐秘': { label: '隐秘', color: '#ef4444' },
  '违禁': { label: '违禁', color: '#f59e0b' },
  '★': { label: '★', color: '#fbbf24' },
};

interface AdminOrdersProps {
  lang: 'zh' | 'en';
}

export function AdminOrders({ lang }: AdminOrdersProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [searchKw, setSearchKw] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const limit = 20;

  const { data: stats, isLoading: statsLoading } = trpc.admin.extractStats.useQuery();
  const { data: ordersData, isLoading: ordersLoading } = trpc.admin.extractOrders.useQuery(
    { page, limit, status: statusFilter, keyword: searchKw, startDate: startDate || undefined, endDate: endDate || undefined },
  );

  const totalPages = ordersData ? Math.ceil(ordersData.total / limit) : 1;

  const cardStyle = (color: string): React.CSSProperties => ({
    background: `linear-gradient(135deg, ${color}22, ${color}11)`,
    border: `1px solid ${color}44`,
    borderRadius: 12,
    padding: '16px 20px',
    textAlign: 'center' as const,
  });

  const tableHeaderStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(180,150,255,0.7)',
    borderBottom: '1px solid rgba(120,60,220,0.2)',
    whiteSpace: 'nowrap',
  };

  const tableCellStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 13,
    color: '#e0d0ff',
    borderBottom: '1px solid rgba(120,60,220,0.1)',
    whiteSpace: 'nowrap',
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
        📦 {lang === 'zh' ? '订单管理' : 'Order Management'}
      </h2>

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={cardStyle('#8b5cf6')}>
          <div style={{ fontSize: 12, color: 'rgba(180,150,255,0.7)', marginBottom: 4 }}>总物品数</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#c4b5fd' }}>
            {statsLoading ? '...' : (stats?.total ?? 0)}
          </div>
        </div>
        <div style={cardStyle('#f59e0b')}>
          <div style={{ fontSize: 12, color: 'rgba(180,150,255,0.7)', marginBottom: 4 }}>待处理</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fbbf24' }}>
            {statsLoading ? '...' : (stats?.pending ?? 0)}
          </div>
        </div>
        <div style={cardStyle('#10b981')}>
          <div style={{ fontSize: 12, color: 'rgba(180,150,255,0.7)', marginBottom: 4 }}>已提取</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#34d399' }}>
            {statsLoading ? '...' : (stats?.extracted ?? 0)}
          </div>
        </div>
        <div style={cardStyle('#6b7280')}>
          <div style={{ fontSize: 12, color: 'rgba(180,150,255,0.7)', marginBottom: 4 }}>已回收</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#9ca3af' }}>
            {statsLoading ? '...' : (stats?.recycled ?? 0)}
          </div>
        </div>
        <div style={cardStyle('#3b82f6')}>
          <div style={{ fontSize: 12, color: 'rgba(180,150,255,0.7)', marginBottom: 4 }}>提取总价值</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#60a5fa' }}>
            ¥{statsLoading ? '...' : (stats?.totalValue?.toFixed(2) ?? '0.00')}
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap',
        background: 'rgba(120,60,220,0.08)', borderRadius: 10, padding: '12px 16px',
        border: '1px solid rgba(120,60,220,0.15)',
      }}>
        {/* 状态筛选 */}
        <select
          value={statusFilter ?? ''}
          onChange={e => { setStatusFilter(e.target.value === '' ? undefined : Number(e.target.value)); setPage(1); }}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.3)',
            borderRadius: 8, padding: '6px 12px', color: '#e0d0ff', fontSize: 13, outline: 'none',
          }}
        >
          <option value="">全部状态</option>
          <option value="0">待处理</option>
          <option value="1">已提取</option>
          <option value="2">已回收</option>
        </select>

        {/* 日期筛选 */}
        <input
          type="date"
          value={startDate}
          onChange={e => { setStartDate(e.target.value); setPage(1); }}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.3)',
            borderRadius: 8, padding: '6px 12px', color: '#e0d0ff', fontSize: 13, outline: 'none',
          }}
          placeholder="开始日期"
        />
        <span style={{ color: 'rgba(180,150,255,0.5)' }}>→</span>
        <input
          type="date"
          value={endDate}
          onChange={e => { setEndDate(e.target.value); setPage(1); }}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.3)',
            borderRadius: 8, padding: '6px 12px', color: '#e0d0ff', fontSize: 13, outline: 'none',
          }}
          placeholder="结束日期"
        />

        {/* 搜索 */}
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setSearchKw(keyword); setPage(1); } }}
          placeholder="搜索昵称/手机号/订单号..."
          style={{
            flex: 1, minWidth: 180,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.3)',
            borderRadius: 8, padding: '6px 12px', color: '#e0d0ff', fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={() => { setSearchKw(keyword); setPage(1); }}
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            border: 'none', borderRadius: 8, padding: '6px 16px',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          搜索
        </button>
        {(searchKw || statusFilter !== undefined || startDate || endDate) && (
          <button
            onClick={() => { setKeyword(''); setSearchKw(''); setStatusFilter(undefined); setStartDate(''); setEndDate(''); setPage(1); }}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.3)',
              borderRadius: 8, padding: '6px 12px', color: '#e0d0ff', fontSize: 13, cursor: 'pointer',
            }}
          >
            重置
          </button>
        )}
      </div>

      {/* 表格 */}
      <div style={{
        background: 'rgba(120,60,220,0.06)', borderRadius: 12,
        border: '1px solid rgba(120,60,220,0.15)', overflow: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>ID</th>
              <th style={tableHeaderStyle}>玩家</th>
              <th style={tableHeaderStyle}>物品</th>
              <th style={tableHeaderStyle}>品质</th>
              <th style={tableHeaderStyle}>价值</th>
              <th style={tableHeaderStyle}>来源</th>
              <th style={tableHeaderStyle}>状态</th>
              <th style={tableHeaderStyle}>cs2pifa订单号</th>
              <th style={tableHeaderStyle}>回收金币</th>
              <th style={tableHeaderStyle}>获得时间</th>
              <th style={tableHeaderStyle}>提取时间</th>
            </tr>
          </thead>
          <tbody>
            {ordersLoading ? (
              <tr><td colSpan={11} style={{ ...tableCellStyle, textAlign: 'center', padding: 40 }}>加载中...</td></tr>
            ) : !ordersData?.list?.length ? (
              <tr><td colSpan={11} style={{ ...tableCellStyle, textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.4)' }}>暂无数据</td></tr>
            ) : ordersData.list.map((item: any) => {
              const statusInfo = STATUS_MAP[item.status] || { label: '未知', color: '#6b7280' };
              const sourceInfo = SOURCE_MAP[item.source] || { label: item.source, color: '#6b7280' };
              const qualityInfo = QUALITY_MAP[item.itemQuality] || { label: item.itemQuality || '-', color: '#9ca3af' };
              return (
                <tr key={item.id} style={{ transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(120,60,220,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tableCellStyle}>{item.id}</td>
                  <td style={tableCellStyle}>
                    <div style={{ fontWeight: 600, color: '#c4b5fd' }}>{item.playerNickname || '-'}</div>
                    <div style={{ fontSize: 11, color: 'rgba(180,150,255,0.5)' }}>{item.playerPhone || ''}</div>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.itemImageUrl && (
                        <img src={item.itemImageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', background: 'rgba(0,0,0,0.2)' }} />
                      )}
                      <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.itemName || `物品#${item.itemId}`}
                      </span>
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: `${qualityInfo.color}22`, color: qualityInfo.color, border: `1px solid ${qualityInfo.color}44`,
                    }}>
                      {qualityInfo.label}
                    </span>
                  </td>
                  <td style={{ ...tableCellStyle, color: '#fbbf24', fontWeight: 600 }}>
                    ¥{item.itemValue?.toFixed(2) ?? '0.00'}
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: `${sourceInfo.color}22`, color: sourceInfo.color, border: `1px solid ${sourceInfo.color}44`,
                    }}>
                      {sourceInfo.label}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: `${statusInfo.color}22`, color: statusInfo.color, border: `1px solid ${statusInfo.color}44`,
                    }}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td style={{ ...tableCellStyle, fontSize: 11, color: 'rgba(180,150,255,0.6)' }}>
                    {item.csOrderNo || '-'}
                  </td>
                  <td style={{ ...tableCellStyle, color: item.recycleGold > 0 ? '#34d399' : 'rgba(180,150,255,0.4)' }}>
                    {item.recycleGold > 0 ? `+${item.recycleGold.toFixed(2)}` : '-'}
                  </td>
                  <td style={{ ...tableCellStyle, fontSize: 12, color: 'rgba(180,150,255,0.6)' }}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '-'}
                  </td>
                  <td style={{ ...tableCellStyle, fontSize: 12, color: 'rgba(180,150,255,0.6)' }}>
                    {item.extractedAt ? new Date(item.extractedAt).toLocaleString('zh-CN') : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <div style={{ fontSize: 13, color: 'rgba(180,150,255,0.6)' }}>
          共 {ordersData?.total ?? 0} 条记录，第 {page}/{totalPages} 页
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{
              background: page <= 1 ? 'rgba(255,255,255,0.03)' : 'rgba(120,60,220,0.15)',
              border: '1px solid rgba(120,60,220,0.3)', borderRadius: 8, padding: '6px 14px',
              color: page <= 1 ? 'rgba(180,150,255,0.3)' : '#e0d0ff', fontSize: 13, cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            上一页
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{
              background: page >= totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(120,60,220,0.15)',
              border: '1px solid rgba(120,60,220,0.3)', borderRadius: 8, padding: '6px 14px',
              color: page >= totalPages ? 'rgba(180,150,255,0.3)' : '#e0d0ff', fontSize: 13, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
