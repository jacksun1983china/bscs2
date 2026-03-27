/**
 * AdminFinance.tsx — 财务统计页面
 * 包含：总览数据卡片、充值订单列表（分页+筛选）、充值排行榜
 * 状态：0=待支付, 1=充值成功(回调成功), 2=已取消, 3=回调中, 4=回调失败
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

const STATUS_MAP: Record<number, { label: string; labelEn: string; color: string }> = {
  0: { label: '待支付', labelEn: 'Pending', color: '#f59e0b' },
  1: { label: '充值成功', labelEn: 'Success', color: '#10b981' },
  2: { label: '已取消', labelEn: 'Cancelled', color: '#6b7280' },
  3: { label: '回调中', labelEn: 'Processing', color: '#3b82f6' },
  4: { label: '回调失败', labelEn: 'Callback Failed', color: '#ef4444' },
};

const PAY_METHOD_MAP: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信',
  manual: '手动',
};

interface AdminFinanceProps {
  lang: 'zh' | 'en';
}

export function AdminFinance({ lang }: AdminFinanceProps) {
  const [tab, setTab] = useState<'overview' | 'orders' | 'ranking'>('overview');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [searchKw, setSearchKw] = useState('');

  const { data: stats, isLoading: statsLoading } = trpc.admin.financeStats.useQuery();
  const { data: ordersData, isLoading: ordersLoading } = trpc.admin.financeOrders.useQuery(
    { page, limit: 15, status: statusFilter, keyword: searchKw },
    { enabled: tab === 'orders' }
  );

  const totalPages = ordersData ? Math.ceil(ordersData.total / 15) : 1;

  const t = lang === 'zh' ? {
    title: '财务统计',
    overview: '数据总览',
    orders: '充值流水',
    ranking: '充值排行',
    totalRecharge: '累计充值',
    todayRecharge: '今日充值',
    totalOrders: '累计订单',
    todayOrders: '今日订单',
    orderNo: '订单号',
    player: '玩家',
    amount: '金额',
    gold: '金币',
    diamond: '钻石',
    payMethod: '支付方式',
    status: '状态',
    time: '时间',
    platformOrderNo: '平台订单号',
    allStatus: '全部状态',
    search: '搜索订单号...',
    searchBtn: '搜索',
    prev: '上一页',
    next: '下一页',
    rank: '排名',
    nickname: '昵称',
    phone: '手机号',
    vip: 'VIP',
    totalRechargePl: '累计充值',
    noData: '暂无数据',
    loading: '加载中...',
  } : {
    title: 'Finance',
    overview: 'Overview',
    orders: 'Orders',
    ranking: 'Top Players',
    totalRecharge: 'Total Recharge',
    todayRecharge: "Today's Recharge",
    totalOrders: 'Total Orders',
    todayOrders: "Today's Orders",
    orderNo: 'Order No.',
    player: 'Player',
    amount: 'Amount',
    gold: 'Gold',
    diamond: 'Diamond',
    payMethod: 'Pay Method',
    status: 'Status',
    time: 'Time',
    platformOrderNo: 'Platform Order',
    allStatus: 'All Status',
    search: 'Search order no...',
    searchBtn: 'Search',
    prev: 'Prev',
    next: 'Next',
    rank: 'Rank',
    nickname: 'Nickname',
    phone: 'Phone',
    vip: 'VIP',
    totalRechargePl: 'Total Recharge',
    noData: 'No data',
    loading: 'Loading...',
  };

  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(30,10,65,0.9) 0%, rgba(15,5,40,0.95) 100%)',
    border: '1px solid rgba(120,60,220,0.3)',
    borderRadius: 12,
    padding: '20px 24px',
    flex: 1,
    minWidth: 160,
  };

  const tabStyle = (active: boolean) => ({
    padding: '7px 20px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    background: active ? 'linear-gradient(135deg,#7b2fff,#06b6d4)' : 'rgba(255,255,255,0.06)',
    color: '#fff',
    border: '1px solid rgba(120,60,220,0.3)',
  });

  return (
    <div style={{ color: '#fff' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>{t.title}</h2>
      </div>

      {/* 标签切换 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle(tab === 'overview')} onClick={() => setTab('overview')}>{t.overview}</button>
        <button style={tabStyle(tab === 'orders')} onClick={() => setTab('orders')}>{t.orders}</button>
        <button style={tabStyle(tab === 'ranking')} onClick={() => setTab('ranking')}>{t.ranking}</button>
      </div>

      {/* 总览 */}
      {tab === 'overview' && (
        <div>
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'rgba(180,150,255,0.6)' }}>{t.loading}</div>
          ) : (
            <>
              {/* 数据卡片 */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                {[
                  { label: t.totalRecharge, value: `¥${(stats?.totalRecharge ?? 0).toFixed(2)}`, color: '#7b2fff' },
                  { label: t.todayRecharge, value: `¥${(stats?.todayRecharge ?? 0).toFixed(2)}`, color: '#06b6d4' },
                  { label: t.totalOrders, value: String(stats?.totalOrders ?? 0), color: '#10b981' },
                  { label: t.todayOrders, value: String(stats?.todayOrders ?? 0), color: '#f59e0b' },
                ].map(card => (
                  <div key={card.label} style={cardStyle}>
                    <div style={{ color: 'rgba(180,150,255,0.7)', fontSize: 12, marginBottom: 8 }}>{card.label}</div>
                    <div style={{ color: card.color, fontSize: 26, fontWeight: 800 }}>{card.value}</div>
                  </div>
                ))}
              </div>

              {/* 充值排行（嵌在总览里也显示 top5） */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30,10,65,0.9) 0%, rgba(15,5,40,0.95) 100%)',
                border: '1px solid rgba(120,60,220,0.3)',
                borderRadius: 12,
                padding: 20,
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: '#c084fc' }}>
                  {lang === 'zh' ? '充值 Top 10 玩家' : 'Top 10 Recharge Players'}
                </div>
                {(stats?.topPlayers ?? []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: 'rgba(180,150,255,0.5)' }}>{t.noData}</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(120,60,220,0.2)' }}>
                        {[t.rank, t.nickname, t.phone, t.vip, t.totalRechargePl].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'rgba(180,150,255,0.7)', fontSize: 12, fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(stats?.topPlayers ?? []).map((p, i) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 24, height: 24, borderRadius: '50%', fontSize: 12, fontWeight: 700,
                              background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c3f' : 'rgba(120,60,220,0.3)',
                              color: i < 3 ? '#fff' : 'rgba(180,150,255,0.8)',
                            }}>{i + 1}</span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{p.nickname}</td>
                          <td style={{ padding: '10px 12px', color: 'rgba(180,150,255,0.7)', fontSize: 12 }}>{p.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                              VIP{p.vipLevel}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#10b981', fontSize: 14, fontWeight: 700 }}>¥{p.totalRecharge.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 充值流水 */}
      {tab === 'orders' && (
        <div>
          {/* 筛选栏 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select
              value={statusFilter ?? ''}
              onChange={e => { setStatusFilter(e.target.value === '' ? undefined : Number(e.target.value)); setPage(1); }}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.3)',
                borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 13, cursor: 'pointer',
              }}
            >
              <option value="">{t.allStatus}</option>
              <option value="0">{lang === 'zh' ? '待支付' : 'Pending'}</option>
              <option value="1">{lang === 'zh' ? '充值成功' : 'Success'}</option>
              <option value="3">{lang === 'zh' ? '回调中' : 'Processing'}</option>
              <option value="4">{lang === 'zh' ? '回调失败' : 'Callback Failed'}</option>
              <option value="2">{lang === 'zh' ? '已取消' : 'Cancelled'}</option>
            </select>
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearchKw(keyword); setPage(1); } }}
              placeholder={t.search}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.3)',
                borderRadius: 8, padding: '7px 14px', color: '#fff', fontSize: 13, width: 220,
              }}
            />
            <button
              onClick={() => { setSearchKw(keyword); setPage(1); }}
              style={{
                padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: 'linear-gradient(135deg,#7b2fff,#06b6d4)', color: '#fff', border: 'none',
              }}
            >{t.searchBtn}</button>
          </div>

          {/* 订单表格 */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(30,10,65,0.9) 0%, rgba(15,5,40,0.95) 100%)',
            border: '1px solid rgba(120,60,220,0.3)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'rgba(180,150,255,0.6)' }}>{t.loading}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                  <thead>
                    <tr style={{ background: 'rgba(120,60,220,0.1)', borderBottom: '1px solid rgba(120,60,220,0.2)' }}>
                      {[t.orderNo, t.player, t.amount, t.gold, t.payMethod, t.status, t.platformOrderNo, t.time].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(180,150,255,0.8)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(ordersData?.list ?? []).length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.5)' }}>{t.noData}</td></tr>
                    ) : (ordersData?.list ?? []).map(order => (
                      <tr key={order.id} style={{ borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                        <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.7)', fontSize: 11, fontFamily: 'monospace' }}>{order.orderNo}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ color: '#fff', fontSize: 13 }}>{order.playerNickname ?? '-'}</div>
                          <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11 }}>{order.playerPhone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</div>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#10b981', fontWeight: 700, fontSize: 14 }}>¥{order.amount.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px', color: '#ffd700', fontSize: 13 }}>{order.gold.toFixed(0)}</td>
                        <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.7)', fontSize: 12 }}>{PAY_METHOD_MAP[order.payMethod] ?? order.payMethod}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: `${STATUS_MAP[order.status]?.color ?? '#888'}22`,
                            color: STATUS_MAP[order.status]?.color ?? '#888',
                            border: `1px solid ${STATUS_MAP[order.status]?.color ?? '#888'}44`,
                          }}>
                            {lang === 'zh' ? STATUS_MAP[order.status]?.label : STATUS_MAP[order.status]?.labelEn}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.5)', fontSize: 10, fontFamily: 'monospace' }}>
                          {(order as any).platformOrderNo || '-'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.6)', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {new Date(order.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 分页 */}
          {ordersData && ordersData.total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <span style={{ color: 'rgba(180,150,255,0.6)', fontSize: 13 }}>
                {lang === 'zh' ? `共 ${ordersData.total} 条` : `Total ${ordersData.total} records`}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer',
                    background: page === 1 ? 'rgba(255,255,255,0.04)' : 'rgba(120,60,220,0.2)',
                    color: page === 1 ? 'rgba(180,150,255,0.3)' : '#c084fc',
                    border: '1px solid rgba(120,60,220,0.3)',
                  }}
                >{t.prev}</button>
                <span style={{ color: 'rgba(180,150,255,0.7)', fontSize: 13 }}>{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    background: page >= totalPages ? 'rgba(255,255,255,0.04)' : 'rgba(120,60,220,0.2)',
                    color: page >= totalPages ? 'rgba(180,150,255,0.3)' : '#c084fc',
                    border: '1px solid rgba(120,60,220,0.3)',
                  }}
                >{t.next}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 充值排行 */}
      {tab === 'ranking' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(30,10,65,0.9) 0%, rgba(15,5,40,0.95) 100%)',
          border: '1px solid rgba(120,60,220,0.3)',
          borderRadius: 12, padding: 20,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: '#c084fc' }}>
            {lang === 'zh' ? '充值 Top 10 玩家' : 'Top 10 Recharge Players'}
          </div>
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'rgba(180,150,255,0.6)' }}>{t.loading}</div>
          ) : (stats?.topPlayers ?? []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.5)' }}>{t.noData}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(stats?.topPlayers ?? []).map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                  padding: '12px 16px', border: '1px solid rgba(120,60,220,0.15)',
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: '50%', fontSize: 14, fontWeight: 800,
                    background: i === 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : i === 1 ? 'linear-gradient(135deg,#94a3b8,#64748b)' : i === 2 ? 'linear-gradient(135deg,#cd7c3f,#a16207)' : 'rgba(120,60,220,0.3)',
                    color: '#fff', flexShrink: 0,
                  }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{p.nickname}</div>
                    <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 11, marginTop: 2 }}>{p.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                    VIP{p.vipLevel}
                  </span>
                  <div style={{ color: '#10b981', fontSize: 18, fontWeight: 800, minWidth: 80, textAlign: 'right' }}>
                    ¥{p.totalRecharge.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
