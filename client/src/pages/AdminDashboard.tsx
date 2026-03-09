/**
 * AdminDashboard.tsx — BDCS2 管理后台
 * - 全屏布局（不嵌入手机框）
 * - 独立账号密码登录页
 * - 中英文切换（默认中文）
 */
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { AdminRollRooms } from './admin/AdminRollRooms';
import { AdminBanners } from './admin/AdminBanners';
import { AdminRebate } from './admin/AdminRebate';

// ── 国际化文本 ──────────────────────────────────────────────────
const I18N = {
  zh: {
    title: 'BDCS2 管理控制台',
    subtitle: '游戏平台管理系统',
    loginTitle: '管理员登录',
    loginSubtitle: '请输入管理员账号和密码',
    account: '账号',
    password: '密码',
    accountPlaceholder: '请输入管理员账号',
    passwordPlaceholder: '请输入密码',
    loginBtn: '登录',
    loggingIn: '登录中...',
    logout: '退出登录',
    players: '玩家管理',
    orders: '订单管理',
    boxes: '箱子配置',
    finance: '财务统计',
    settings: '系统设置',
    totalPlayers: '总玩家数',
    activeToday: '今日活跃',
    totalRecharge: '总充值',
    newToday: '今日新增',
    search: '搜索手机/昵称...',
    allStatus: '全部状态',
    active: '正常',
    banned: '封禁',
    id: 'ID',
    phone: '手机号',
    nickname: '昵称',
    vip: 'VIP',
    gold: '金币',
    diamond: '钻石',
    status: '状态',
    registered: '注册时间',
    actions: '操作',
    detail: '详情',
    ban: '封禁',
    unban: '解封',
    prev: '上一页',
    next: '下一页',
    playerDetail: '玩家详情',
    close: '关闭',
    totalRechargeLabel: '总充值',
    totalWinLabel: '总获奖',
    inviteCode: '邀请码',
    registerIp: '注册IP',
    lastIp: '最后IP',
    createdAt: '注册时间',
    lastLogin: '最后登录',
    featureSoon: '功能即将上线',
    loading: '加载中...',
    noPermission: '无管理员权限',
    collapse: '收起',
    expand: '展开',
    testHint: '测试账号：admin / admin123',
    loginError: '账号或密码错误',
    page: '页',
    total: '共',
    records: '条记录',
    // Roll房
    rollRooms: 'Roll房管理',
    createRollRoom: '创建Roll房',
    roomName: '房间名称',
    roomAvatar: '房间头像',
    prizeFirst: '一等奖金额',
    startTime: '开始时间',
    endTime: '结束时间',
    threshold: '门槛金额',
    maxPlayers: '最大人数',
    exchangeType: '兑换类型',
    botCount: '机器人数量',
    addPrize: '添加奖品',
    prizeName: '奖品名称',
    prizeAmount: '金额',
    prizeQty: '数量',
    prizeImage: '奖品图片',
    winnerList: '中奖名单',
    winnerPhone: '指定中奖手机号',
    roomStatus: '状态',
    roomTotal: 'Roll总额',
    participants: '参与人数',
    bots: '机器人',
    prizes: '奖品数',
    actualPrize: '实发金额',
    actualQty: '实发数量',
    winnerDetail: '中奖名单',
    draw: '开奖',
    deleteRoom: '删除',
    parentId: '上级ID',
    // Banner
    banners: 'Banner管理',
    uploadBanner: '上传Banner',
    bannerTitle: 'Banner标题',
    bannerLink: '跳转链接',
    bannerSort: '排序',
    bannerEnabled: '启用',
    bannerDisabled: '禁用',
    // 返佣
    rebate: '返佣配置',
    rebateRate: '返佣比例(%)',
    identityMerchant: '招商',
    identityAnchor: '主播',
    identityPlayer: '玩家',
    rebateHistory: '返佣记录',
    extractable: '可提取',
    extracted: '已提取',
    extract: '提取',
  },
  en: {
    title: 'BDCS2 Admin Console',
    subtitle: 'Game Platform Management',
    loginTitle: 'Admin Login',
    loginSubtitle: 'Enter your admin credentials',
    account: 'Account',
    password: 'Password',
    accountPlaceholder: 'Enter admin account',
    passwordPlaceholder: 'Enter password',
    loginBtn: 'Login',
    loggingIn: 'Logging in...',
    logout: 'Logout',
    players: 'Players',
    orders: 'Orders',
    boxes: 'Box Config',
    finance: 'Finance',
    settings: 'Settings',
    totalPlayers: 'Total Players',
    activeToday: 'Active Today',
    totalRecharge: 'Total Recharge',
    newToday: 'New Today',
    search: 'Search phone / nickname...',
    allStatus: 'All Status',
    active: 'Active',
    banned: 'Banned',
    id: 'ID',
    phone: 'Phone',
    nickname: 'Nickname',
    vip: 'VIP',
    gold: 'Gold',
    diamond: 'Diamond',
    status: 'Status',
    registered: 'Registered',
    actions: 'Actions',
    detail: 'Detail',
    ban: 'Ban',
    unban: 'Unban',
    prev: 'Prev',
    next: 'Next',
    playerDetail: 'Player Detail',
    close: 'Close',
    totalRechargeLabel: 'Total Recharge',
    totalWinLabel: 'Total Win',
    inviteCode: 'Invite Code',
    registerIp: 'Register IP',
    lastIp: 'Last IP',
    createdAt: 'Created At',
    lastLogin: 'Last Login',
    featureSoon: 'Feature coming soon',
    loading: 'Loading...',
    noPermission: 'No admin permission',
    collapse: 'Collapse',
    expand: 'Expand',
    testHint: 'Test: admin / admin123',
    loginError: 'Invalid account or password',
    page: 'Page',
    total: 'Total',
    records: 'records',
    rollRooms: 'Roll Rooms',
    createRollRoom: 'Create Roll Room',
    roomName: 'Room Name',
    roomAvatar: 'Room Avatar',
    prizeFirst: '1st Prize Amount',
    startTime: 'Start Time',
    endTime: 'End Time',
    threshold: 'Threshold',
    maxPlayers: 'Max Players',
    exchangeType: 'Exchange Type',
    botCount: 'Bot Count',
    addPrize: 'Add Prize',
    prizeName: 'Prize Name',
    prizeAmount: 'Amount',
    prizeQty: 'Qty',
    prizeImage: 'Prize Image',
    winnerList: 'Winner List',
    winnerPhone: 'Winner Phone',
    roomStatus: 'Status',
    roomTotal: 'Roll Total',
    participants: 'Participants',
    bots: 'Bots',
    prizes: 'Prizes',
    actualPrize: 'Actual Prize',
    actualQty: 'Actual Qty',
    winnerDetail: 'Winners',
    draw: 'Draw',
    deleteRoom: 'Delete',
    parentId: 'Parent ID',
    banners: 'Banner Mgmt',
    uploadBanner: 'Upload Banner',
    bannerTitle: 'Title',
    bannerLink: 'Link',
    bannerSort: 'Sort',
    bannerEnabled: 'Enabled',
    bannerDisabled: 'Disabled',
    rebate: 'Rebate Config',
    rebateRate: 'Rebate Rate(%)',
    identityMerchant: 'Merchant',
    identityAnchor: 'Anchor',
    identityPlayer: 'Player',
    rebateHistory: 'Rebate History',
    extractable: 'Extractable',
    extracted: 'Extracted',
    extract: 'Extract',
  },
};

// 管理员账号（模拟，后续可接数据库）
const ADMIN_ACCOUNTS = [
  { account: 'admin', password: 'admin123' },
];

// ── 玩家详情弹窗 ────────────────────────────────────────────────
function PlayerDetailModal({
  playerId, onClose, t,
}: { playerId: number; onClose: () => void; t: typeof I18N['zh'] }) {
  const { data: player, isLoading } = trpc.admin.playerDetail.useQuery({ id: playerId });

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a0840 0%, #0d0621 100%)',
          border: '1px solid rgba(120,60,220,0.5)',
          borderRadius: 16, padding: 28, width: '100%', maxWidth: 520,
          boxShadow: '0 20px 60px rgba(80,20,160,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{t.playerDetail}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(180,150,255,0.7)', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.6)' }}>{t.loading}</div>
        ) : player ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              [t.id, player.id],
              [t.phone, player.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')],
              [t.nickname, player.nickname],
              [t.vip, `VIP${player.vipLevel}`],
              [t.gold, parseFloat(player.gold || '0').toFixed(2)],
              [t.diamond, parseFloat(player.diamond || '0').toFixed(2)],
              [t.totalRechargeLabel, `¥${parseFloat(player.totalRecharge || '0').toFixed(2)}`],
              [t.totalWinLabel, `¥${parseFloat(player.totalWin || '0').toFixed(2)}`],
              [t.status, player.status === 1 ? `✅ ${t.active}` : `🚫 ${t.banned}`],
              [t.inviteCode, player.inviteCode],
              [t.registerIp, player.registerIp || '-'],
              [t.lastIp, player.lastIp || '-'],
              [t.createdAt, player.createdAt ? new Date(player.createdAt).toLocaleString() : '-'],
              [t.lastLogin, player.lastLogin ? new Date(player.lastLogin).toLocaleString() : '-'],
            ].map(([label, value]) => (
              <div key={label as string} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px',
                border: '1px solid rgba(120,60,220,0.2)',
              }}>
                <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 11, marginBottom: 2 }}>{label as string}</div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{String(value ?? '-')}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,100,100,0.7)' }}>Not found</div>
        )}
      </div>
    </div>
  );
}

// ── 登录页 ──────────────────────────────────────────────────────
function AdminLogin({ onLogin, t, lang, setLang }: {
  onLogin: (account: string) => void;
  t: typeof I18N['zh'];
  lang: 'zh' | 'en';
  setLang: (l: 'zh' | 'en') => void;
}) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleLogin = async () => {
    if (!account.trim() || !password.trim()) {
      toast.error(lang === 'zh' ? '请填写账号和密码' : 'Please fill in all fields');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const found = ADMIN_ACCOUNTS.find(a => a.account === account && a.password === password);
    if (found) {
      localStorage.setItem('bdcs2_admin_session', JSON.stringify({ account, loginAt: Date.now() }));
      onLogin(account);
      toast.success(lang === 'zh' ? '登录成功' : 'Login successful');
    } else {
      toast.error(t.loginError);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(120,40,220,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,180,255,0.1) 0%, transparent 50%), #080418',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Noto Sans SC', sans-serif",
      position: 'relative',
    }}>
      {/* 语言切换 */}
      <div style={{ position: 'absolute', top: 20, right: 24, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setLang('zh')}
          style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: lang === 'zh' ? 'linear-gradient(135deg,#7b2fff,#06b6d4)' : 'rgba(255,255,255,0.08)',
            color: '#fff', border: '1px solid rgba(120,60,220,0.3)',
          }}
        >中文</button>
        <button
          onClick={() => setLang('en')}
          style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: lang === 'en' ? 'linear-gradient(135deg,#7b2fff,#06b6d4)' : 'rgba(255,255,255,0.08)',
            color: '#fff', border: '1px solid rgba(120,60,220,0.3)',
          }}
        >EN</button>
      </div>

      {/* 背景装饰线 */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${10 + i * 15}%`, top: 0, bottom: 0,
            width: 1,
            background: `linear-gradient(180deg, transparent, rgba(120,60,220,${0.03 + i * 0.01}), transparent)`,
          }} />
        ))}
      </div>

      {/* Logo 区域 */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          fontSize: 48, fontWeight: 900, letterSpacing: 4,
          background: 'linear-gradient(135deg, #a855f7, #06b6d4, #f59e0b)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          textShadow: 'none',
          filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.5))',
          marginBottom: 8,
        }}>BDCS2</div>
        <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 13, letterSpacing: 3 }}>
          {t.subtitle.toUpperCase()}
        </div>
      </div>

      {/* 登录卡片 */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'linear-gradient(135deg, rgba(26,8,64,0.95) 0%, rgba(13,6,33,0.98) 100%)',
        border: '1px solid rgba(120,60,220,0.4)',
        borderRadius: 20, padding: 36,
        boxShadow: '0 30px 80px rgba(80,20,160,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        position: 'relative',
      }}>
        {/* 顶部光条 */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
          background: 'linear-gradient(90deg, transparent, #7b2fff, #06b6d4, transparent)',
          borderRadius: '0 0 4px 4px',
        }} />

        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 6px', textAlign: 'center' }}>
          {t.loginTitle}
        </h2>
        <p style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13, textAlign: 'center', margin: '0 0 28px' }}>
          {t.loginSubtitle}
        </p>

        {/* 账号输入 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(180,150,255,0.8)', fontSize: 13, display: 'block', marginBottom: 6 }}>
            {t.account}
          </label>
          <input
            type="text"
            value={account}
            onChange={e => setAccount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder={t.accountPlaceholder}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.35)',
              color: '#fff', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(120,60,220,0.8)'}
            onBlur={e => e.target.style.borderColor = 'rgba(120,60,220,0.35)'}
          />
        </div>

        {/* 密码输入 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: 'rgba(180,150,255,0.8)', fontSize: 13, display: 'block', marginBottom: 6 }}>
            {t.password}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder={t.passwordPlaceholder}
              style={{
                width: '100%', padding: '12px 44px 12px 14px', borderRadius: 10, fontSize: 14,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.35)',
                color: '#fff', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(120,60,220,0.8)'}
              onBlur={e => e.target.style.borderColor = 'rgba(120,60,220,0.35)'}
            />
            <button
              onClick={() => setShowPwd(!showPwd)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'rgba(180,150,255,0.5)',
                cursor: 'pointer', fontSize: 16, padding: 4,
              }}
            >{showPwd ? '🙈' : '👁'}</button>
          </div>
        </div>

        {/* 登录按钮 */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 700,
            background: loading ? 'rgba(120,60,220,0.4)' : 'linear-gradient(135deg, #7b2fff 0%, #06b6d4 100%)',
            color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(123,47,255,0.4)',
            transition: 'all 0.2s', letterSpacing: 1,
          }}
        >
          {loading ? t.loggingIn : t.loginBtn}
        </button>

        {/* 测试提示 */}
        <div style={{
          marginTop: 16, padding: '8px 12px', borderRadius: 8,
          background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.2)',
          color: 'rgba(255,200,100,0.7)', fontSize: 12, textAlign: 'center',
        }}>
          🔧 {t.testHint}
        </div>
      </div>

      {/* 底部版权 */}
      <div style={{ marginTop: 32, color: 'rgba(120,80,200,0.4)', fontSize: 12 }}>
        BDCS2 © 2025 · Admin Console
      </div>
    </div>
  );
}

// ── 主仪表盘 ────────────────────────────────────────────────────
const MENU_KEYS = ['players', 'rollRooms', 'banners', 'rebate', 'orders', 'boxes', 'finance', 'settings'] as const;
const MENU_ICONS: Record<string, string> = {
  players: '👥', rollRooms: '🎲', banners: '🖼️', rebate: '💸', orders: '📦', boxes: '🎁', finance: '💰', settings: '⚙️',
};

export default function AdminDashboard() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = I18N[lang];

  // 管理员登录状态（本地 session）
  const [adminAccount, setAdminAccount] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // 检查本地 session
  useEffect(() => {
    document.body.classList.add('admin-mode');
    try {
      const raw = localStorage.getItem('bdcs2_admin_session');
      if (raw) {
        const sess = JSON.parse(raw);
        // session 有效期 8 小时
        if (sess.loginAt && Date.now() - sess.loginAt < 8 * 3600 * 1000) {
          setAdminAccount(sess.account);
        } else {
          localStorage.removeItem('bdcs2_admin_session');
        }
      }
    } catch { /* ignore */ }
    setSessionChecked(true);
    return () => { document.body.classList.remove('admin-mode'); };
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('bdcs2_admin_session');
    setAdminAccount(null);
    toast.success(lang === 'zh' ? '已退出登录' : 'Logged out');
  }, [lang]);

  const [activeMenu, setActiveMenu] = useState<string>('players');
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.playerList.useQuery(
    { page, limit: 15, keyword, status: statusFilter },
    { enabled: !!adminAccount }
  );

  type PlayerItem = NonNullable<typeof data>['list'][number];

  const updateStatusMutation = trpc.admin.updatePlayerStatus.useMutation({
    onSuccess: () => {
      toast.success(lang === 'zh' ? '状态已更新' : 'Status updated');
      utils.admin.playerList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSearch = () => { setKeyword(searchInput); setPage(1); };
  const handleBanToggle = (id: number, currentStatus: number) => {
    updateStatusMutation.mutate({
      id, status: currentStatus === 1 ? 0 : 1,
      banReason: currentStatus === 1 ? '' : 'Banned by admin',
    });
  };

  // 未检查 session 时显示空白
  if (!sessionChecked) return null;

  // 未登录 → 显示登录页
  if (!adminAccount) {
    return <AdminLogin onLogin={setAdminAccount} t={t} lang={lang} setLang={setLang} />;
  }

  const totalPages = data ? Math.ceil(data.total / 15) : 1;

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: '#080418',
      display: 'flex',
      fontFamily: "'Noto Sans SC', sans-serif",
    }}>

      {/* ── 侧边栏 ── */}
      <div style={{
        width: sidebarOpen ? 220 : 64,
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0d0621 0%, #120830 100%)',
        borderRight: '1px solid rgba(120,60,220,0.2)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease',
        flexShrink: 0,
        position: 'relative', zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 14px 16px',
          borderBottom: '1px solid rgba(120,60,220,0.2)',
          display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #7b2fff, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: 0,
          }}>B2</div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: 1, whiteSpace: 'nowrap' }}>BDCS2</div>
              <div style={{ color: 'rgba(180,150,255,0.45)', fontSize: 10, whiteSpace: 'nowrap' }}>Admin Console</div>
            </div>
          )}
        </div>

        {/* 菜单 */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {MENU_KEYS.map(key => {
            const isActive = activeMenu === key;
            const label = t[key as keyof typeof t] as string;
            return (
              <div
                key={key}
                onClick={() => {
                  setActiveMenu(key);
                  if (!['players', 'rollRooms', 'banners', 'rebate'].includes(key)) toast.info(t.featureSoon);
                }}
                title={!sidebarOpen ? label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: sidebarOpen ? '10px 12px' : '10px 0',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  borderRadius: 10, marginBottom: 4, cursor: 'pointer',
                  background: isActive ? 'linear-gradient(135deg, rgba(123,47,255,0.25), rgba(6,182,212,0.15))' : 'transparent',
                  border: isActive ? '1px solid rgba(120,60,220,0.4)' : '1px solid transparent',
                  transition: 'all 0.2s',
                  color: isActive ? '#fff' : 'rgba(180,150,255,0.6)',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{MENU_ICONS[key]}</span>
                {sidebarOpen && (
                  <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        {/* 折叠按钮 */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(120,60,220,0.15)' }}>
          <div
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: sidebarOpen ? '8px 12px' : '8px 0',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              borderRadius: 8, cursor: 'pointer',
              color: 'rgba(180,150,255,0.4)',
              transition: 'color 0.2s',
            }}
          >
            <span style={{ fontSize: 16 }}>{sidebarOpen ? '◀' : '▶'}</span>
            {sidebarOpen && <span style={{ fontSize: 12 }}>{t.collapse}</span>}
          </div>
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
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>
            {t[activeMenu as keyof typeof t] as string}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* 语言切换 */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setLang('zh')}
                style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: lang === 'zh' ? 'linear-gradient(135deg,#7b2fff,#06b6d4)' : 'rgba(255,255,255,0.06)',
                  color: '#fff', border: '1px solid rgba(120,60,220,0.3)',
                }}
              >中文</button>
              <button
                onClick={() => setLang('en')}
                style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: lang === 'en' ? 'linear-gradient(135deg,#7b2fff,#06b6d4)' : 'rgba(255,255,255,0.06)',
                  color: '#fff', border: '1px solid rgba(120,60,220,0.3)',
                }}
              >EN</button>
            </div>
            {/* 管理员信息 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7b2fff, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
              }}>{adminAccount[0].toUpperCase()}</div>
              <span style={{ color: 'rgba(180,150,255,0.8)', fontSize: 13 }}>{adminAccount}</span>
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                background: 'rgba(123,47,255,0.3)', color: '#a78bfa', border: '1px solid rgba(123,47,255,0.4)',
              }}>ADMIN</span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: 'rgba(255,80,80,0.15)', color: 'rgba(255,120,120,0.9)',
                border: '1px solid rgba(255,80,80,0.3)',
              }}
            >{t.logout}</button>
          </div>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

          {/* Roll房管理 */}
          {activeMenu === 'rollRooms' && <AdminRollRooms lang={lang} t={t} />}

          {/* Banner管理 */}
          {activeMenu === 'banners' && <AdminBanners lang={lang} t={t} />}

          {/* 返佣配置 */}
          {activeMenu === 'rebate' && <AdminRebate lang={lang} t={t} />}

          {/* 玩家管理（默认） */}
          {activeMenu === 'players' && <>

          {/* 统计卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: t.totalPlayers, value: data?.total ?? '-', icon: '👥', color: '#7b2fff' },
              { label: t.activeToday, value: '-', icon: '🟢', color: '#10b981' },
              { label: t.totalRecharge, value: '-', icon: '💰', color: '#f59e0b' },
              { label: t.newToday, value: '-', icon: '✨', color: '#06b6d4' },
            ].map(card => (
              <div key={card.label} style={{
                background: 'linear-gradient(135deg, rgba(26,8,64,0.8) 0%, rgba(13,6,33,0.9) 100%)',
                border: `1px solid ${card.color}33`,
                borderRadius: 14, padding: '18px 20px',
                boxShadow: `0 4px 20px ${card.color}15`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 12, marginBottom: 8 }}>{card.label}</div>
                    <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{card.value}</div>
                  </div>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${card.color}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>{card.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 玩家列表 */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(26,8,64,0.7) 0%, rgba(13,6,33,0.85) 100%)',
            border: '1px solid rgba(120,60,220,0.25)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            {/* 列表头部 */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(120,60,220,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{lang === 'zh' ? '玩家管理' : 'Player Management'}</div>
                <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 12, marginTop: 2 }}>
                  {t.total} {data?.total ?? 0} {t.records}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder={t.search}
                    style={{
                      padding: '8px 36px 8px 12px', borderRadius: 8, fontSize: 13,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.3)',
                      color: '#fff', outline: 'none', width: 220,
                    }}
                  />
                  <button onClick={handleSearch} style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(180,150,255,0.6)', fontSize: 14,
                  }}>🔍</button>
                </div>
                <select
                  value={statusFilter ?? ''}
                  onChange={e => { setStatusFilter(e.target.value === '' ? undefined : Number(e.target.value)); setPage(1); }}
                  style={{
                    padding: '8px 12px', borderRadius: 8, fontSize: 13,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(120,60,220,0.3)',
                    color: '#fff', outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="" style={{ background: '#1a0840' }}>{t.allStatus}</option>
                  <option value="1" style={{ background: '#1a0840' }}>{t.active}</option>
                  <option value="0" style={{ background: '#1a0840' }}>{t.banned}</option>
                </select>
              </div>
            </div>

            {/* 表格 */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(120,60,220,0.1)' }}>
                    {[t.id, t.phone, t.nickname, t.vip, t.gold, t.diamond, t.status, t.registered, t.actions].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left', fontSize: 12,
                        color: 'rgba(180,150,255,0.7)', fontWeight: 600, whiteSpace: 'nowrap',
                        borderBottom: '1px solid rgba(120,60,220,0.2)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.5)' }}>{t.loading}</td></tr>
                  ) : !data?.list?.length ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'rgba(180,150,255,0.4)' }}>
                      {lang === 'zh' ? '暂无玩家数据' : 'No players found'}
                    </td></tr>
                  ) : (data?.list ?? []).map((p: PlayerItem, idx: number) => (
                    <tr key={p.id} style={{
                      borderBottom: '1px solid rgba(120,60,220,0.1)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(120,60,220,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)')}
                    >
                      <td style={{ padding: '12px 16px', color: 'rgba(180,150,255,0.6)', fontSize: 13 }}>#{p.id}</td>
                      <td style={{ padding: '12px 16px', color: '#e0d0ff', fontSize: 13 }}>
                        {p.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{p.nickname}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: p.vipLevel > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)',
                          color: p.vipLevel > 0 ? '#f59e0b' : 'rgba(180,150,255,0.5)',
                          border: `1px solid ${p.vipLevel > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(120,60,220,0.2)'}`,
                        }}>VIP{p.vipLevel}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#ffd700', fontSize: 13 }}>
                        {parseFloat(p.gold || '0').toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#7df9ff', fontSize: 13 }}>
                        {parseFloat(p.diamond || '0').toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: p.status === 1 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: p.status === 1 ? '#10b981' : '#ef4444',
                          border: `1px solid ${p.status === 1 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        }}>
                          {p.status === 1 ? `● ${t.active}` : `● ${t.banned}`}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'rgba(180,150,255,0.5)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setDetailId(p.id)}
                            style={{
                              padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              background: 'rgba(123,47,255,0.2)', color: '#a78bfa',
                              border: '1px solid rgba(123,47,255,0.35)',
                            }}
                          >{t.detail}</button>
                          <button
                            onClick={() => handleBanToggle(p.id, p.status)}
                            style={{
                              padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              background: p.status === 1 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                              color: p.status === 1 ? '#ef4444' : '#10b981',
                              border: `1px solid ${p.status === 1 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                            }}
                          >{p.status === 1 ? t.ban : t.unban}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {data && data.total > 0 && (
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid rgba(120,60,220,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ color: 'rgba(180,150,255,0.5)', fontSize: 13 }}>
                  {t.total} {data.total} {t.records} · {t.page} {page} / {totalPages}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    style={{
                      padding: '6px 14px', borderRadius: 7, fontSize: 13, cursor: page <= 1 ? 'not-allowed' : 'pointer',
                      background: 'rgba(255,255,255,0.06)', color: page <= 1 ? 'rgba(180,150,255,0.3)' : 'rgba(180,150,255,0.8)',
                      border: '1px solid rgba(120,60,220,0.25)',
                    }}
                  >{t.prev}</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <button key={p} onClick={() => setPage(p)} style={{
                        padding: '6px 12px', borderRadius: 7, fontSize: 13, cursor: 'pointer',
                        background: p === page ? 'linear-gradient(135deg,#7b2fff,#06b6d4)' : 'rgba(255,255,255,0.06)',
                        color: '#fff', border: '1px solid rgba(120,60,220,0.25)',
                        fontWeight: p === page ? 700 : 400,
                      }}>{p}</button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{
                      padding: '6px 14px', borderRadius: 7, fontSize: 13, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                      background: 'rgba(255,255,255,0.06)', color: page >= totalPages ? 'rgba(180,150,255,0.3)' : 'rgba(180,150,255,0.8)',
                      border: '1px solid rgba(120,60,220,0.25)',
                    }}
                  >{t.next}</button>
                </div>
              </div>
            )}
          </div>
          </>}
        </div>
      </div>

      {/* 玩家详情弹窗 */}
      {detailId !== null && (
        <PlayerDetailModal playerId={detailId} onClose={() => setDetailId(null)} t={t} />
      )}
    </div>
  );
}
