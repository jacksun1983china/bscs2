/**
 * AdminGoldLogs.tsx — 管理后台金币流水查询页面
 * 功能：按玩家ID/时间/类型筛选金币变动记录，分页展示
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

const TYPE_LABELS: Record<string, string> = {
  arena: '竞技场',
  rollx: 'ROLL-X',
  rush: '过马路',
  dingdong: '丁和大作',
  vortex: 'Vortex',
  recycle: '回收道具',
  recharge: '充值',
  admin: '管理员调整',
  other: '其他',
};

const TIME_OPTIONS = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'week7', label: '近7日' },
  { value: 'month', label: '本月' },
] as const;

interface AdminGoldLogsProps {
  lang?: 'zh' | 'en';
}

export function AdminGoldLogs({ lang = 'zh' }: AdminGoldLogsProps) {
  const [playerIdInput, setPlayerIdInput] = useState('');
  const [searchPlayerId, setSearchPlayerId] = useState<number | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'yesterday' | 'week7' | 'month'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data, isLoading } = trpc.admin.adminGoldLogs.useQuery(
    { playerId: searchPlayerId, type: typeFilter, timeRange, page, limit: PAGE_SIZE },
    { refetchOnWindowFocus: false }
  );

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const handleSearch = () => {
    const id = parseInt(playerIdInput.trim());
    setSearchPlayerId(isNaN(id) ? undefined : id);
    setPage(1);
  };

  const handleReset = () => {
    setPlayerIdInput('');
    setSearchPlayerId(undefined);
    setTypeFilter(undefined);
    setTimeRange('all');
    setPage(1);
  };

  const t = lang === 'zh' ? {
    title: '金币流水',
    playerIdPlaceholder: '输入玩家ID搜索',
    search: '搜索',
    reset: '重置',
    allType: '全部类型',
    time: '时间范围',
    type: '类型',
    playerId: '玩家ID',
    nickname: '昵称',
    phone: '手机号',
    amount: '变动金额',
    balance: '变动后余额',
    description: '备注',
    createdAt: '时间',
    noData: '暂无数据',
    loading: '加载中...',
    total: '共',
    records: '条记录',
    prev: '上一页',
    next: '下一页',
  } : {
    title: 'Gold Logs',
    playerIdPlaceholder: 'Search by Player ID',
    search: 'Search',
    reset: 'Reset',
    allType: 'All Types',
    time: 'Time Range',
    type: 'Type',
    playerId: 'Player ID',
    nickname: 'Nickname',
    phone: 'Phone',
    amount: 'Amount',
    balance: 'Balance After',
    description: 'Note',
    createdAt: 'Time',
    noData: 'No data',
    loading: 'Loading...',
    total: 'Total',
    records: 'records',
    prev: 'Prev',
    next: 'Next',
  };

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      {/* 筛选区 */}
      <div style={{
        background: 'rgba(30,10,60,0.6)',
        border: '1px solid rgba(120,60,220,0.3)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 16,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'flex-end',
      }}>
        {/* 玩家ID搜索 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>{t.playerId}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="number"
              value={playerIdInput}
              onChange={(e) => setPlayerIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t.playerIdPlaceholder}
              style={{
                background: 'rgba(15,5,40,0.8)',
                border: '1px solid rgba(120,60,220,0.4)',
                borderRadius: 6,
                color: '#e0d0ff',
                padding: '6px 12px',
                fontSize: 13,
                width: 160,
                outline: 'none',
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                background: 'rgba(120,60,220,0.5)',
                border: '1px solid rgba(120,60,220,0.6)',
                borderRadius: 6,
                color: '#e0d0ff',
                padding: '6px 14px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {t.search}
            </button>
          </div>
        </div>

        {/* 类型筛选 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>{t.type}</span>
          <select
            value={typeFilter ?? ''}
            onChange={(e) => { setTypeFilter(e.target.value || undefined); setPage(1); }}
            style={{
              background: 'rgba(15,5,40,0.8)',
              border: '1px solid rgba(120,60,220,0.4)',
              borderRadius: 6,
              color: '#e0d0ff',
              padding: '6px 12px',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">{t.allType}</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* 时间范围 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>{t.time}</span>
          <select
            value={timeRange}
            onChange={(e) => { setTimeRange(e.target.value as typeof timeRange); setPage(1); }}
            style={{
              background: 'rgba(15,5,40,0.8)',
              border: '1px solid rgba(120,60,220,0.4)',
              borderRadius: 6,
              color: '#e0d0ff',
              padding: '6px 12px',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {TIME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* 重置 */}
        <button
          onClick={handleReset}
          style={{
            background: 'rgba(60,20,100,0.4)',
            border: '1px solid rgba(120,60,220,0.3)',
            borderRadius: 6,
            color: '#9ca3af',
            padding: '6px 14px',
            fontSize: 13,
            cursor: 'pointer',
            alignSelf: 'flex-end',
          }}
        >
          {t.reset}
        </button>

        {/* 总计 */}
        {data && (
          <div style={{ color: '#9ca3af', fontSize: 13, alignSelf: 'flex-end', marginLeft: 'auto' }}>
            {t.total} <span style={{ color: '#c084fc', fontWeight: 700 }}>{data.total}</span> {t.records}
          </div>
        )}
      </div>

      {/* 数据表格 */}
      <div style={{
        background: 'rgba(20,8,50,0.7)',
        border: '1px solid rgba(120,60,220,0.3)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {/* 表头 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '80px 80px 100px 80px 100px 100px 1fr 140px',
          background: 'rgba(120,60,220,0.15)',
          borderBottom: '1px solid rgba(120,60,220,0.3)',
          padding: '10px 16px',
          gap: 8,
        }}>
          {[t.playerId, t.nickname, t.phone, t.type, t.amount, t.balance, t.description, t.createdAt].map((h, i) => (
            <div key={i} style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600 }}>{h}</div>
          ))}
        </div>

        {/* 数据行 */}
        {isLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>{t.loading}</div>
        ) : !data?.list?.length ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>{t.noData}</div>
        ) : (
          (data.list as any[]).map((row: any, idx: number) => {
            const isPositive = row.amount >= 0;
            return (
              <div
                key={row.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 80px 100px 80px 100px 100px 1fr 140px',
                  padding: '10px 16px',
                  gap: 8,
                  borderBottom: '1px solid rgba(120,60,220,0.1)',
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(120,60,220,0.04)',
                  alignItems: 'center',
                }}
              >
                <div style={{ color: '#c084fc', fontSize: 13 }}>{row.playerId}</div>
                <div style={{ color: '#e0d0ff', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.playerNickname || '-'}
                </div>
                <div style={{ color: '#9ca3af', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.playerPhone || '-'}
                </div>
                <div>
                  <span style={{
                    background: 'rgba(120,60,220,0.2)',
                    border: '1px solid rgba(120,60,220,0.4)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 11,
                    color: '#c084fc',
                  }}>
                    {TYPE_LABELS[row.type] || row.type}
                  </span>
                </div>
                <div style={{
                  color: isPositive ? '#4ade80' : '#f87171',
                  fontSize: 14,
                  fontWeight: 700,
                }}>
                  {isPositive ? '+' : ''}{row.amount.toFixed(2)}
                </div>
                <div style={{ color: '#ffd700', fontSize: 13, fontWeight: 600 }}>
                  {row.balance.toFixed(2)}
                </div>
                <div style={{ color: '#9ca3af', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.description || '-'}
                </div>
                <div style={{ color: '#6b7280', fontSize: 11 }}>
                  {new Date(row.createdAt).toLocaleString()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              background: page <= 1 ? 'rgba(60,20,100,0.2)' : 'rgba(120,60,220,0.3)',
              border: '1px solid rgba(120,60,220,0.4)',
              borderRadius: 6,
              color: page <= 1 ? '#6b7280' : '#e0d0ff',
              padding: '6px 16px',
              fontSize: 13,
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            {t.prev}
          </button>
          <span style={{ color: '#9ca3af', fontSize: 13, lineHeight: '32px' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              background: page >= totalPages ? 'rgba(60,20,100,0.2)' : 'rgba(120,60,220,0.3)',
              border: '1px solid rgba(120,60,220,0.4)',
              borderRadius: 6,
              color: page >= totalPages ? '#6b7280' : '#e0d0ff',
              padding: '6px 16px',
              fontSize: 13,
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            {t.next}
          </button>
        </div>
      )}
    </div>
  );
}
