/**
 * AdminDashboard.tsx — BDCS2 管理后台
 * 设计风格：国际化赛博朋克深色仪表盘
 * 功能：玩家列表（搜索、筛选、分页、封禁/解封、详情）
 */
import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import { getLoginUrl } from '@/const';

// ── 侧边栏菜单 ──────────────────────────────────────────────────
const MENU_ITEMS = [
  { key: 'players', icon: '👥', label: 'Players', labelCn: '玩家管理', active: true },
  { key: 'orders', icon: '📦', label: 'Orders', labelCn: '订单管理', active: false },
  { key: 'boxes', icon: '🎁', label: 'Boxes', labelCn: '箱子配置', active: false },
  { key: 'finance', icon: '💰', label: 'Finance', labelCn: '财务统计', active: false },
  { key: 'settings', icon: '⚙️', label: 'Settings', labelCn: '系统设置', active: false },
];

// ── 玩家详情弹窗 ────────────────────────────────────────────────
function PlayerDetailModal({ playerId, onClose }: { playerId: number; onClose: () => void }) {
  const { data: player, isLoading } = trpc.admin.playerDetail.useQuery({ id: playerId });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, #1a0840 0%, #0d0621 100%)',
        border: '1px solid rgba(120,60,220,0.5)',
        borderRadius: 16, padding: 24, width: '100%', maxWidth: 480,
        boxShadow: '0 20px 60px rgba(80,20,160,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Player Detail</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(180,150,255,0.7)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.6)' }}>Loading...</div>
        ) : player ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['ID', player.id],
              ['Phone', player.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')],
              ['Nickname', player.nickname],
              ['VIP Level', `VIP${player.vipLevel}`],
              ['Gold', parseFloat(player.gold || '0').toFixed(2)],
              ['Diamond', parseFloat(player.diamond || '0').toFixed(2)],
              ['Total Recharge', `¥${parseFloat(player.totalRecharge || '0').toFixed(2)}`],
              ['Total Win', `¥${parseFloat(player.totalWin || '0').toFixed(2)}`],
              ['Status', player.status === 1 ? '✅ Active' : '🚫 Banned'],
              ['Invite Code', player.inviteCode],
              ['Register IP', player.registerIp || '-'],
              ['Last IP', player.lastIp || '-'],
              ['Created At', player.createdAt ? new Date(player.createdAt).toLocaleString() : '-'],
              ['Last Login', player.lastLogin ? new Date(player.lastLogin).toLocaleString() : '-'],
            ].map(([label, value]) => (
              <div key={label as string} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px',
                border: '1px solid rgba(120,60,220,0.2)',
              }}>
                <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 11, marginBottom: 2 }}>{label as string}</div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{String(value)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,100,100,0.7)' }}>Player not found</div>
        )}
      </div>
    </div>
  );
}

// ── 主页面 ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [activeMenu, setActiveMenu] = useState('players');
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const utils = trpc.useUtils();

  // 玩家列表查询
  const { data, isLoading, error } = trpc.admin.playerList.useQuery(
    { page, limit: 15, keyword, status: statusFilter },
    { enabled: !!user && user.role === 'admin' }
  );

  // 更新玩家状态
  const updateStatusMutation = trpc.admin.updatePlayerStatus.useMutation({
    onSuccess: () => {
      toast.success('Status updated');
      utils.admin.playerList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSearch = () => {
    setKeyword(searchInput);
    setPage(1);
  };

  const handleBanToggle = (id: number, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const reason = newStatus === 0 ? 'Banned by admin' : '';
    updateStatusMutation.mutate({ id, status: newStatus, banReason: reason });
  };

  // 未登录
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0621', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(180,150,255,0.7)', fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0621', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>Admin Access Required</div>
        <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 14 }}>Please login with admin account</div>
        <a href={getLoginUrl()} style={{
          padding: '10px 24px', borderRadius: 8,
          background: 'linear-gradient(135deg, #7b2fff, #3b82f6)',
          color: '#fff', textDecoration: 'none', fontWeight: 600,
        }}>Login</a>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0621', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>Access Denied</div>
        <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 14 }}>You don't have admin privileges</div>
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / 15) : 1;

  return (
    <div style={{ minHeight: '100vh', background: '#080418', display: 'flex', fontFamily: "'Noto Sans SC', sans-serif" }}>

      {/* ── 侧边栏 ── */}
      <div style={{
        width: sidebarOpen ? 220 : 60,
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0d0621 0%, #120830 100%)',
        borderRight: '1px solid rgba(120,60,220,0.25)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid rgba(120,60,220,0.2)',
          display: 'flex', alignItems: 'center', gap: 10,
          overflow: 'hidden',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #7b2fff, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: '#fff',
          }}>B2</div>
          {sidebarOpen && (
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>BDCS2</div>
              <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 10 }}>Admin Console</div>
            </div>
          )}
        </div>

        {/* 菜单项 */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {MENU_ITEMS.map(item => (
            <div
              key={item.key}
              onClick={() => {
                setActiveMenu(item.key);
                if (!item.active && item.key !== 'players') toast.info('Feature coming soon');
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 10px',
                borderRadius: 8, marginBottom: 4,
                cursor: 'pointer',
                background: activeMenu === item.key
                  ? 'linear-gradient(135deg, rgba(123,47,255,0.25) 0%, rgba(59,130,246,0.15) 100%)'
                  : 'transparent',
                border: activeMenu === item.key ? '1px solid rgba(120,60,220,0.4)' : '1px solid transparent',
                transition: 'all 0.2s',
                overflow: 'hidden',
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && (
                <div>
                  <div style={{
                    color: activeMenu === item.key ? '#c084fc' : 'rgba(180,150,255,0.7)',
                    fontSize: 13, fontWeight: activeMenu === item.key ? 600 : 400,
                  }}>{item.label}</div>
                  <div style={{ color: 'rgba(180,150,255,0.4)', fontSize: 10 }}>{item.labelCn}</div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* 折叠按钮 */}
        <div
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            padding: '12px 16px', cursor: 'pointer',
            borderTop: '1px solid rgba(120,60,220,0.2)',
            color: 'rgba(180,150,255,0.5)', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-end' : 'center',
          }}
        >
          {sidebarOpen ? '◀ Collapse' : '▶'}
        </div>
      </div>

      {/* ── 主内容区 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 顶部栏 */}
        <div style={{
          height: 56, background: 'rgba(13,6,33,0.95)',
          borderBottom: '1px solid rgba(120,60,220,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13 }}>Admin Console</span>
            <span style={{ color: 'rgba(120,60,220,0.5)' }}>/</span>
            <span style={{ color: '#c084fc', fontSize: 13, fontWeight: 600 }}>
              {MENU_ITEMS.find(m => m.key === activeMenu)?.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px rgba(34,197,94,0.6)',
            }} />
            <span style={{ color: 'rgba(180,150,255,0.7)', fontSize: 13 }}>{user.name || user.email || 'Admin'}</span>
            <div style={{
              padding: '3px 8px', borderRadius: 4,
              background: 'linear-gradient(135deg, rgba(123,47,255,0.3), rgba(59,130,246,0.3))',
              border: '1px solid rgba(120,60,220,0.4)',
              color: '#c084fc', fontSize: 11, fontWeight: 600,
            }}>ADMIN</div>
          </div>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

          {/* 统计卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Players', value: data?.total ?? '-', color: '#c084fc', icon: '👥' },
              { label: 'Active Today', value: '-', color: '#22c55e', icon: '🟢' },
              { label: 'Total Recharge', value: '-', color: '#ffd700', icon: '💰' },
              { label: 'New Today', value: '-', color: '#06b6d4', icon: '✨' },
            ].map(card => (
              <div key={card.label} style={{
                background: 'linear-gradient(135deg, rgba(25,10,60,0.9) 0%, rgba(15,5,40,0.95) 100%)',
                border: '1px solid rgba(120,60,220,0.25)',
                borderRadius: 12, padding: '16px 20px',
                boxShadow: '0 4px 20px rgba(80,20,160,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'rgba(180,150,255,0.6)', fontSize: 12 }}>{card.label}</span>
                  <span style={{ fontSize: 18 }}>{card.icon}</span>
                </div>
                <div style={{ color: card.color, fontSize: 24, fontWeight: 700 }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* 玩家列表 */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(20,8,50,0.9) 0%, rgba(12,4,30,0.95) 100%)',
            border: '1px solid rgba(120,60,220,0.25)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {/* 列表头 */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(120,60,220,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Player Management</h2>
                <p style={{ color: 'rgba(180,150,255,0.5)', fontSize: 12, margin: '2px 0 0' }}>玩家管理</p>
              </div>

              {/* 搜索和筛选 */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(120,60,220,0.35)', overflow: 'hidden' }}>
                  <input
                    type="text"
                    placeholder="Search phone / nickname..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    style={{
                      background: 'transparent', border: 'none', outline: 'none',
                      color: '#fff', fontSize: 13, padding: '8px 12px', width: 200,
                    }}
                  />
                  <button
                    onClick={handleSearch}
                    style={{
                      background: 'linear-gradient(135deg, rgba(123,47,255,0.6), rgba(59,130,246,0.6))',
                      border: 'none', color: '#fff', fontSize: 13, padding: '8px 14px', cursor: 'pointer',
                    }}
                  >🔍</button>
                </div>

                <select
                  value={statusFilter ?? ''}
                  onChange={e => { setStatusFilter(e.target.value === '' ? undefined : Number(e.target.value)); setPage(1); }}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(120,60,220,0.35)',
                    borderRadius: 8, color: '#fff', fontSize: 13, padding: '8px 12px', cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="" style={{ background: '#1a0840' }}>All Status</option>
                  <option value="1" style={{ background: '#1a0840' }}>Active</option>
                  <option value="0" style={{ background: '#1a0840' }}>Banned</option>
                </select>
              </div>
            </div>

            {/* 表格 */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(120,60,220,0.1)' }}>
                    {['ID', 'Phone', 'Nickname', 'VIP', 'Gold', 'Diamond', 'Status', 'Registered', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left',
                        color: 'rgba(180,150,255,0.7)', fontSize: 12, fontWeight: 600,
                        borderBottom: '1px solid rgba(120,60,220,0.2)',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.5)' }}>
                        Loading players...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'rgba(255,100,100,0.7)' }}>
                        {error.message}
                      </td>
                    </tr>
                  ) : !data?.list?.length ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.5)' }}>
                        No players found. Register an account to see it here!
                      </td>
                    </tr>
                  ) : (
                    data.list.map((player, idx) => (
                      <tr
                        key={player.id}
                        style={{
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(120,60,220,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)')}
                      >
                        <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.6)', fontSize: 12, borderBottom: '1px solid rgba(120,60,220,0.1)' }}>#{player.id}</td>
                        <td style={{ padding: '10px 14px', color: '#fff', fontSize: 13, borderBottom: '1px solid rgba(120,60,220,0.1)', whiteSpace: 'nowrap' }}>
                          {player.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#e0d0ff', fontSize: 13, borderBottom: '1px solid rgba(120,60,220,0.1)' }}>{player.nickname}</td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                            background: player.vipLevel > 0 ? 'linear-gradient(135deg, rgba(245,166,35,0.3), rgba(232,117,10,0.3))' : 'rgba(255,255,255,0.08)',
                            color: player.vipLevel > 0 ? '#ffd700' : 'rgba(180,150,255,0.5)',
                            border: `1px solid ${player.vipLevel > 0 ? 'rgba(245,166,35,0.4)' : 'rgba(120,60,220,0.2)'}`,
                          }}>VIP{player.vipLevel}</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#ffd700', fontSize: 13, borderBottom: '1px solid rgba(120,60,220,0.1)', whiteSpace: 'nowrap' }}>
                          {parseFloat(player.gold || '0').toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#7df9ff', fontSize: 13, borderBottom: '1px solid rgba(120,60,220,0.1)', whiteSpace: 'nowrap' }}>
                          {parseFloat(player.diamond || '0').toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(120,60,220,0.1)' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: player.status === 1 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: player.status === 1 ? '#22c55e' : '#ef4444',
                            border: `1px solid ${player.status === 1 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                          }}>
                            {player.status === 1 ? '● Active' : '● Banned'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'rgba(180,150,255,0.5)', fontSize: 11, borderBottom: '1px solid rgba(120,60,220,0.1)', whiteSpace: 'nowrap' }}>
                          {new Date(player.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(120,60,220,0.1)', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => setDetailId(player.id)}
                              style={{
                                padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                                background: 'rgba(123,47,255,0.2)', border: '1px solid rgba(120,60,220,0.4)',
                                color: '#c084fc', fontWeight: 600,
                              }}
                            >Detail</button>
                            <button
                              onClick={() => handleBanToggle(player.id, player.status)}
                              style={{
                                padding: '4px 10px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                                background: player.status === 1 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                                border: `1px solid ${player.status === 1 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                                color: player.status === 1 ? '#ef4444' : '#22c55e',
                                fontWeight: 600,
                              }}
                            >
                              {player.status === 1 ? 'Ban' : 'Unban'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {data && data.total > 0 && (
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid rgba(120,60,220,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>
                  Total {data.total} players · Page {page} / {totalPages}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: page <= 1 ? 'not-allowed' : 'pointer',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(120,60,220,0.3)',
                      color: page <= 1 ? 'rgba(180,150,255,0.3)' : '#c084fc',
                    }}
                  >← Prev</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                          padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                          background: p === page ? 'linear-gradient(135deg, rgba(123,47,255,0.5), rgba(59,130,246,0.5))' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${p === page ? 'rgba(120,60,220,0.6)' : 'rgba(120,60,220,0.2)'}`,
                          color: p === page ? '#fff' : 'rgba(180,150,255,0.6)',
                          fontWeight: p === page ? 700 : 400,
                        }}
                      >{p}</button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(120,60,220,0.3)',
                      color: page >= totalPages ? 'rgba(180,150,255,0.3)' : '#c084fc',
                    }}
                  >Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 玩家详情弹窗 */}
      {detailId && (
        <PlayerDetailModal playerId={detailId} onClose={() => setDetailId(null)} />
      )}

      {/* 全局样式 */}
      <style>{`
        input::placeholder { color: rgba(180,150,255,0.35) !important; }
        input { caret-color: #a78bfa; }
        select option { background: #1a0840 !important; color: #fff; }
      `}</style>
    </div>
  );
}
