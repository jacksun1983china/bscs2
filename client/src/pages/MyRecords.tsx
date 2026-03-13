/**
 * MyRecords.tsx — 我的记录页面
 * 按蓝湖 lanhu_wodejilu 设计稿还原
 * 功能：余额记录/充值记录/提货记录/赠送记录，支持时间筛选
 * 优化：无限滚动、余额/充值记录详情弹窗、提货/赠送记录真实数据
 */
import { PageSlideIn } from '@/components/PageTransition';
import { useState, useRef, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { LANHU } from '@/lib/assets';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import SettingsModal from '@/components/SettingsModal';
import { useLocation } from 'wouter';

// CDN 资源
const BTN1_CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/btn1@2x_16b5b512.png';
const BTN2_CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/btn2@2x_7a36328b.png';
const EMPTY_ICON = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/pic1@2x_b3c200a7.png';

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

const RECORD_TABS = ['余额记录', '充值记录', '提货记录', '赠送记录'];
const TIME_FILTERS = ['全部', '今日', '昨日', '近7日'];
const TIME_RANGE_MAP = ['all', 'today', 'yesterday', 'week7'] as const;

const PAGE_SIZE = 20;

function amountColor(amount: number) {
  if (amount > 0) return '#4ade80';
  if (amount < 0) return '#f87171';
  return '#fff';
}

function formatAmount(amount: number) {
  if (amount > 0) return `+${amount.toFixed(2)}`;
  return amount.toFixed(2);
}

const TYPE_LABELS: Record<string, string> = {
  arena: '竞技场',
  rollx: 'ROLL-X',
  vortex: 'Vortex',
  dingdong: '丁咚大作战',
  rush: '过马路',
  recycle: '回收道具',
  recharge: '充值',
  admin: '管理员',
  refund: '退款',
  roll: 'ROLL房',
  gift: '赠送',
  extract: '提货',
};

function getTypeLabel(type: string) {
  return TYPE_LABELS[type] || type;
}

const RECHARGE_STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: '待审核', color: '#f59e0b' },
  1: { label: '已完成', color: '#4ade80' },
  2: { label: '已拒绝', color: '#f87171' },
};

const QUALITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: '传说', color: '#f5c842' },
  2: { label: '稀有', color: '#c084fc' },
  3: { label: '普通', color: '#9ca3af' },
  4: { label: '回收', color: '#6b7280' },
};

// 底部详情弹窗通用容器
function DetailModal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'linear-gradient(180deg, #1a0840 0%, #0d0621 100%)',
          borderRadius: `${q(24)} ${q(24)} 0 0`,
          border: '1px solid rgba(120,60,220,0.4)',
          borderBottom: 'none',
          padding: `${q(32)} ${q(32)} ${q(60)}`,
          boxShadow: '0 -8px 40px rgba(80,20,160,0.5)',
        }}
      >
        {/* 顶部拖拽条 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: q(24) }}>
          <div style={{ width: q(80), height: q(8), borderRadius: q(4), background: 'rgba(255,255,255,0.2)' }} />
        </div>
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: q(32) }}>
          <span style={{ color: '#c084fc', fontSize: q(30), fontWeight: 700 }}>{title}</span>
        </div>
        {children}
        {/* 关闭按钮 */}
        <div
          onClick={onClose}
          style={{
            marginTop: q(40),
            padding: `${q(22)} 0`,
            borderRadius: q(40),
            background: 'rgba(120,60,220,0.25)',
            border: '1px solid rgba(120,60,220,0.4)',
            color: '#c084fc',
            fontSize: q(28),
            fontWeight: 600,
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          关闭
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: `${q(18)} 0`,
      borderBottom: '1px solid rgba(120,60,220,0.1)',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: q(24) }}>{label}</span>
      <span style={{ color: valueColor ?? '#fff', fontSize: q(24), fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

// 余额记录详情弹窗
function GoldLogDetailModal({ record, onClose }: { record: any; onClose: () => void }) {
  if (!record) return null;
  const amount = Number(record.amount);
  const balance = Number(record.balance);
  const date = new Date(record.createdAt);
  return (
    <DetailModal onClose={onClose} title="流水详情">
      {/* 金额 */}
      <div style={{
        textAlign: 'center',
        marginBottom: q(36),
        padding: `${q(24)} 0`,
        borderBottom: '1px solid rgba(120,60,220,0.2)',
      }}>
        <div style={{ color: amountColor(amount), fontSize: q(56), fontWeight: 900, lineHeight: 1.1 }}>
          {formatAmount(amount)}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: q(22), marginTop: q(8) }}>金币</div>
      </div>
      <DetailRow label="类型" value={getTypeLabel(record.type)} />
      <DetailRow label="余额" value={`${balance.toFixed(2)} 金币`} />
      <DetailRow label="时间" value={date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
      {record.description && <DetailRow label="备注" value={record.description} />}
      {record.refId && <DetailRow label="流水号" value={String(record.refId)} />}
    </DetailModal>
  );
}

// 充值记录详情弹窗
function RechargeDetailModal({ record, onClose }: { record: any; onClose: () => void }) {
  if (!record) return null;
  const amount = Number(record.amount);
  const gold = Number(record.gold);
  const bonusDiamond = Number(record.bonusDiamond ?? 0);
  const date = new Date(record.createdAt);
  const statusInfo = RECHARGE_STATUS_LABELS[record.status as number] ?? { label: '未知', color: '#fff' };
  const PAY_METHOD_LABELS: Record<string, string> = { alipay: '支付宝', wechat: '微信支付', manual: '人工充值' };
  return (
    <DetailModal onClose={onClose} title="充值详情">
      {/* 金额 */}
      <div style={{
        textAlign: 'center',
        marginBottom: q(36),
        padding: `${q(24)} 0`,
        borderBottom: '1px solid rgba(120,60,220,0.2)',
      }}>
        <div style={{ color: '#4ade80', fontSize: q(56), fontWeight: 900, lineHeight: 1.1 }}>
          ¥{amount.toFixed(2)}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: q(22), marginTop: q(8) }}>充值金额</div>
      </div>
      <DetailRow label="获得金币" value={`${gold.toFixed(0)} 金币`} valueColor="#ffd700" />
      {bonusDiamond > 0 && <DetailRow label="赠送钻石" value={`${bonusDiamond.toFixed(0)} 钻石`} valueColor="#7df9ff" />}
      <DetailRow label="支付方式" value={PAY_METHOD_LABELS[record.payMethod] ?? record.payMethod ?? '—'} />
      <DetailRow label="状态" value={statusInfo.label} valueColor={statusInfo.color} />
      <DetailRow label="订单号" value={record.orderNo ?? '—'} />
      <DetailRow label="时间" value={date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
      {record.remark && <DetailRow label="备注" value={record.remark} />}
    </DetailModal>
  );
}

// 提货记录详情弹窗
function ExtractDetailModal({ record, onClose }: { record: any; onClose: () => void }) {
  if (!record) return null;
  const quality = record.itemQuality ?? 3;
  const qualityInfo = QUALITY_LABELS[quality] ?? { label: '普通', color: '#9ca3af' };
  const extractedAt = record.extractedAt ? new Date(record.extractedAt) : null;
  const createdAt = new Date(record.createdAt);
  const SOURCE_LABELS: Record<string, string> = { box: '宝箱', arena: '竞技场', roll: 'ROLL房', admin: '管理员' };
  return (
    <DetailModal onClose={onClose} title="提货详情">
      {/* 物品图片 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: q(32) }}>
        <div style={{
          width: q(160),
          height: q(160),
          borderRadius: q(16),
          background: 'rgba(120,60,220,0.2)',
          border: `2px solid ${qualityInfo.color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {record.itemImageUrl ? (
            <img src={record.itemImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: q(24) }}>无图</span>
          )}
        </div>
      </div>
      <DetailRow label="物品名称" value={record.itemName ?? '未知物品'} />
      <DetailRow label="品质" value={qualityInfo.label} valueColor={qualityInfo.color} />
      <DetailRow label="价值" value={`${Number(record.itemValue ?? 0).toFixed(2)} 金币`} valueColor="#ffd700" />
      <DetailRow label="来源" value={SOURCE_LABELS[record.source] ?? record.source ?? '—'} />
      <DetailRow label="获得时间" value={createdAt.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} />
      {extractedAt && <DetailRow label="提货时间" value={extractedAt.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} />}
    </DetailModal>
  );
}

export default function MyRecords() {
  const [activeTab, setActiveTab] = useState(0);
  const [timeFilter, setTimeFilter] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [detailType, setDetailType] = useState<'gold' | 'recharge' | 'extract' | null>(null);
  const [, navigate] = useLocation();

  // 余额记录无限滚动状态
  const [goldPage, setGoldPage] = useState(1);
  const [goldList, setGoldList] = useState<any[]>([]);
  const [goldHasMore, setGoldHasMore] = useState(true);
  const [goldLoadingMore, setGoldLoadingMore] = useState(false);

  // 充值记录无限滚动状态
  const [rechargePage, setRechargePage] = useState(1);
  const [rechargeList, setRechargeList] = useState<any[]>([]);
  const [rechargeHasMore, setRechargeHasMore] = useState(true);
  const [rechargeLoadingMore, setRechargeLoadingMore] = useState(false);

  // 提货记录无限滚动状态
  const [extractPage, setExtractPage] = useState(1);
  const [extractList, setExtractList] = useState<any[]>([]);
  const [extractHasMore, setExtractHasMore] = useState(true);
  const [extractLoadingMore, setExtractLoadingMore] = useState(false);

  // 赠送记录无限滚动状态
  const [giftPage, setGiftPage] = useState(1);
  const [giftList, setGiftList] = useState<any[]>([]);
  const [giftHasMore, setGiftHasMore] = useState(true);
  const [giftLoadingMore, setGiftLoadingMore] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 切换 tab 或时间筛选时重置分页
  const prevTabRef = useRef(activeTab);
  const prevTimeRef = useRef(timeFilter);
  useEffect(() => {
    if (prevTabRef.current !== activeTab || prevTimeRef.current !== timeFilter) {
      setGoldPage(1); setGoldList([]); setGoldHasMore(true);
      setRechargePage(1); setRechargeList([]); setRechargeHasMore(true);
      setExtractPage(1); setExtractList([]); setExtractHasMore(true);
      setGiftPage(1); setGiftList([]); setGiftHasMore(true);
      prevTabRef.current = activeTab;
      prevTimeRef.current = timeFilter;
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [activeTab, timeFilter]);

  // 余额记录查询
  const { data: goldLogsData, isLoading: goldLogsLoading } = trpc.player.goldLogs.useQuery(
    { page: goldPage, limit: PAGE_SIZE, timeRange: TIME_RANGE_MAP[timeFilter] },
    { enabled: activeTab === 0, staleTime: 10_000 }
  );
  useEffect(() => {
    if (!goldLogsData) return;
    const newItems = goldLogsData.list ?? [];
    if (goldPage === 1) setGoldList(newItems);
    else setGoldList(prev => [...prev, ...newItems]);
    setGoldHasMore(newItems.length >= PAGE_SIZE);
    setGoldLoadingMore(false);
  }, [goldLogsData, goldPage]);

  // 充值记录查询
  const rechargeTimeRange = TIME_RANGE_MAP[timeFilter];
  const { data: rechargeData, isLoading: rechargeLoading } = trpc.player.rechargeOrders.useQuery(
    { page: rechargePage, limit: PAGE_SIZE },
    { enabled: activeTab === 1, staleTime: 10_000 }
  );
  useEffect(() => {
    if (!rechargeData) return;
    let newItems = rechargeData.list ?? [];
    if (rechargeTimeRange !== 'all') {
      const now = Date.now();
      const cutoff = rechargeTimeRange === 'today' ? now - 86400000
        : rechargeTimeRange === 'yesterday' ? now - 172800000
        : now - 7 * 86400000;
      newItems = newItems.filter((r: any) => new Date(r.createdAt).getTime() > cutoff);
    }
    if (rechargePage === 1) setRechargeList(newItems);
    else setRechargeList(prev => [...prev, ...newItems]);
    setRechargeHasMore((rechargeData.list ?? []).length >= PAGE_SIZE);
    setRechargeLoadingMore(false);
  }, [rechargeData, rechargePage, rechargeTimeRange]);

  // 提货记录查询
  const { data: extractData, isLoading: extractLoading } = trpc.player.extractLogs.useQuery(
    { page: extractPage, limit: PAGE_SIZE },
    { enabled: activeTab === 2, staleTime: 10_000 }
  );
  useEffect(() => {
    if (!extractData) return;
    const newItems = extractData.list ?? [];
    if (extractPage === 1) setExtractList(newItems);
    else setExtractList(prev => [...prev, ...newItems]);
    setExtractHasMore(newItems.length >= PAGE_SIZE);
    setExtractLoadingMore(false);
  }, [extractData, extractPage]);

  // 赠送记录查询
  const { data: giftData, isLoading: giftLoading } = trpc.player.giftLogs.useQuery(
    { page: giftPage, limit: PAGE_SIZE },
    { enabled: activeTab === 3, staleTime: 10_000 }
  );
  useEffect(() => {
    if (!giftData) return;
    const newItems = giftData.list ?? [];
    if (giftPage === 1) setGiftList(newItems);
    else setGiftList(prev => [...prev, ...newItems]);
    setGiftHasMore(newItems.length >= PAGE_SIZE);
    setGiftLoadingMore(false);
  }, [giftData, giftPage]);

  const isLoading = activeTab === 0
    ? (goldLogsLoading && goldPage === 1)
    : activeTab === 1
    ? (rechargeLoading && rechargePage === 1)
    : activeTab === 2
    ? (extractLoading && extractPage === 1)
    : (giftLoading && giftPage === 1);

  // 滚动监听
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 80;
    if (!nearBottom) return;

    if (activeTab === 0 && goldHasMore && !goldLoadingMore && !goldLogsLoading) {
      setGoldLoadingMore(true);
      setGoldPage(prev => prev + 1);
    } else if (activeTab === 1 && rechargeHasMore && !rechargeLoadingMore && !rechargeLoading) {
      setRechargeLoadingMore(true);
      setRechargePage(prev => prev + 1);
    } else if (activeTab === 2 && extractHasMore && !extractLoadingMore && !extractLoading) {
      setExtractLoadingMore(true);
      setExtractPage(prev => prev + 1);
    } else if (activeTab === 3 && giftHasMore && !giftLoadingMore && !giftLoading) {
      setGiftLoadingMore(true);
      setGiftPage(prev => prev + 1);
    }
  }, [activeTab, goldHasMore, goldLoadingMore, goldLogsLoading, rechargeHasMore, rechargeLoadingMore, rechargeLoading, extractHasMore, extractLoadingMore, extractLoading, giftHasMore, giftLoadingMore, giftLoading]);

  // 空状态引导
  const EmptyState = ({ tab }: { tab: number }) => {
    const configs: Record<number, { hint: string; btnLabel: string; btnPath: string }> = {
      0: { hint: '暂无余额记录', btnLabel: '去游戏', btnPath: '/' },
      1: { hint: '暂无充值记录', btnLabel: '去充值', btnPath: '/deposit' },
      2: { hint: '暂无提货记录', btnLabel: '去背包', btnPath: '/backpack' },
      3: { hint: '暂无赠送记录', btnLabel: '去背包', btnPath: '/backpack' },
    };
    const { hint, btnLabel, btnPath } = configs[tab] ?? { hint: '暂无记录', btnLabel: '', btnPath: '' };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${q(80)} 0` }}>
        <img src={EMPTY_ICON} alt="" style={{ width: q(200), height: q(200), objectFit: 'contain' }} />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: q(26), marginTop: q(20) }}>{hint}</span>
        {btnLabel && (
          <div
            onClick={() => navigate(btnPath)}
            style={{
              marginTop: q(28),
              padding: `${q(16)} ${q(60)}`,
              borderRadius: q(40),
              background: 'linear-gradient(135deg, #7c3aed, #c084fc)',
              color: '#fff',
              fontSize: q(26),
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(120,60,220,0.5)',
              letterSpacing: 1,
            }}
          >
            {btnLabel}
          </div>
        )}
      </div>
    );
  };

  // 加载更多 / 已加载全部 提示
  const LoadMoreHint = ({ loading, hasMore, count }: { loading: boolean; hasMore: boolean; count: number }) => {
    if (loading) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${q(30)} 0` }}>
        <div style={{ width: q(36), height: q(36), border: `${q(3)} solid rgba(192,132,252,0.3)`, borderTop: `${q(3)} solid #c084fc`, borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: q(12) }} />
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: q(22) }}>加载更多...</span>
      </div>
    );
    if (!hasMore && count > 0) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${q(30)} 0` }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: q(22) }}>— 已加载全部记录 —</span>
      </div>
    );
    return null;
  };

  // 充值状态标签
  const RechargeStatusBadge = ({ status }: { status: number }) => {
    const info = RECHARGE_STATUS_LABELS[status] ?? { label: '未知', color: '#fff' };
    return (
      <span style={{
        fontSize: q(18),
        color: info.color,
        background: `${info.color}20`,
        border: `1px solid ${info.color}60`,
        borderRadius: q(8),
        padding: `${q(2)} ${q(10)}`,
        whiteSpace: 'nowrap',
      }}>
        {info.label}
      </span>
    );
  };

  return (
    <PageSlideIn>
      <div
        className="phone-container"
        style={{ display: 'flex', flexDirection: 'column', position: 'relative', containerType: 'inline-size', background: '#0d0621' }}
      >
        {/* 全局背景层 */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${LANHU.pageBg})`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'top center' }} />
        </div>

        {/* 内容层 */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* 顶部固定区 */}
          <div style={{ position: 'relative', width: '100%', flexShrink: 0 }}>
            <TopNav showLogo={false} onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
            <PlayerInfoCard style={{ marginTop: q(18) }} />
          </div>

          {/* 可滚动内容区 */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: q(90), background: '#0d0621' }}
          >
            {/* Tab 栏 */}
            <div style={{ display: 'flex', padding: `${q(20)} ${q(10)} ${q(10)}`, gap: q(8), background: 'rgba(10,5,30,0.9)', flexShrink: 0 }}>
              {RECORD_TABS.map((tab, i) => (
                <div key={i} onClick={() => setActiveTab(i)} style={{ flex: 1, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: q(72) }}>
                  <img src={activeTab === i ? BTN1_CDN : BTN2_CDN} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
                  <span style={{ position: 'relative', zIndex: 1, color: activeTab === i ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: q(22), fontWeight: activeTab === i ? 700 : 400, textShadow: activeTab === i ? '0 0 8px rgba(180,100,255,0.8)' : 'none', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                    {tab}
                  </span>
                </div>
              ))}
            </div>

            {/* 时间筛选 + 表头（余额/充值记录显示，提货/赠送不显示时间筛选） */}
            <div style={{ background: 'rgba(10,5,30,0.85)', padding: `${q(16)} ${q(20)}`, flexShrink: 0 }}>
              {(activeTab === 0 || activeTab === 1) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: q(12), marginBottom: q(16) }}>
                  {TIME_FILTERS.map((f, i) => (
                    <div key={i} onClick={() => setTimeFilter(i)} style={{ padding: `${q(6)} ${q(20)}`, borderRadius: q(20), background: timeFilter === i ? 'rgba(192,132,252,0.3)' : 'rgba(255,255,255,0.1)', color: timeFilter === i ? '#c084fc' : 'rgba(255,255,255,0.7)', fontSize: q(22), cursor: 'pointer', border: timeFilter === i ? '1px solid #c084fc' : '1px solid transparent', transition: 'all 0.2s' }}>
                      {f}
                    </div>
                  ))}
                </div>
              )}

              {/* 表头 */}
              {activeTab === 0 && (
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(120,60,220,0.3)', paddingBottom: q(12) }}>
                  <span style={{ flex: 2, color: 'rgba(255,255,255,0.6)', fontSize: q(22) }}>时间</span>
                  <span style={{ flex: 1.5, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'center' }}>类型</span>
                  <span style={{ flex: 1.5, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'center' }}>金额</span>
                  <span style={{ flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'right' }}>余额</span>
                </div>
              )}
              {activeTab === 1 && (
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(120,60,220,0.3)', paddingBottom: q(12) }}>
                  <span style={{ flex: 2, color: 'rgba(255,255,255,0.6)', fontSize: q(22) }}>时间</span>
                  <span style={{ flex: 1.5, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'center' }}>金额</span>
                  <span style={{ flex: 1.5, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'center' }}>金币</span>
                  <span style={{ flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'right' }}>状态</span>
                </div>
              )}
              {activeTab === 2 && (
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(120,60,220,0.3)', paddingBottom: q(12) }}>
                  <span style={{ flex: 2, color: 'rgba(255,255,255,0.6)', fontSize: q(22) }}>提货时间</span>
                  <span style={{ flex: 2, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'center' }}>物品名称</span>
                  <span style={{ flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'right' }}>价值</span>
                </div>
              )}
              {activeTab === 3 && (
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(120,60,220,0.3)', paddingBottom: q(12) }}>
                  <span style={{ flex: 2, color: 'rgba(255,255,255,0.6)', fontSize: q(22) }}>时间</span>
                  <span style={{ flex: 2, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'center' }}>物品名称</span>
                  <span style={{ flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'right' }}>价值</span>
                </div>
              )}
            </div>

            {/* 记录列表 */}
            <div style={{ flex: 1, background: 'rgba(10,5,30,0.85)', minHeight: q(400) }}>
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${q(80)} 0` }}>
                  <div style={{ width: q(60), height: q(60), border: `${q(4)} solid rgba(192,132,252,0.3)`, borderTop: `${q(4)} solid #c084fc`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: q(24), marginTop: q(20) }}>加载中...</span>
                </div>
              ) : activeTab === 0 && goldList.length > 0 ? (
                <>
                  {goldList.map((r: any, i: number) => (
                    <div
                      key={r.id ?? i}
                      onClick={() => { setDetailRecord(r); setDetailType('gold'); }}
                      style={{ display: 'flex', flexDirection: 'column', padding: `${q(16)} ${q(20)}`, borderBottom: '1px solid rgba(120,60,220,0.15)', cursor: 'pointer', transition: 'background 0.15s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ flex: 2, color: 'rgba(255,255,255,0.7)', fontSize: q(20) }}>
                          {new Date(r.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ flex: 1.5, color: '#c084fc', fontSize: q(20), textAlign: 'center' }}>{getTypeLabel(r.type)}</span>
                        <span style={{ flex: 1.5, color: amountColor(r.amount), fontSize: q(22), textAlign: 'center', fontWeight: 600 }}>{formatAmount(r.amount)}</span>
                        <span style={{ flex: 1, color: '#ffd700', fontSize: q(20), textAlign: 'right' }}>{Number(r.balance).toFixed(0)}</span>
                      </div>
                      {r.description && (
                        <div style={{ marginTop: q(6), color: 'rgba(255,255,255,0.4)', fontSize: q(18), paddingLeft: q(2) }}>{r.description}</div>
                      )}
                    </div>
                  ))}
                  <LoadMoreHint loading={goldLoadingMore} hasMore={goldHasMore} count={goldList.length} />
                </>
              ) : activeTab === 1 && rechargeList.length > 0 ? (
                <>
                  {rechargeList.map((r: any, i: number) => (
                    <div
                      key={r.id ?? i}
                      onClick={() => { setDetailRecord(r); setDetailType('recharge'); }}
                      style={{ display: 'flex', alignItems: 'center', padding: `${q(20)} ${q(20)}`, borderBottom: '1px solid rgba(120,60,220,0.15)', cursor: 'pointer' }}
                    >
                      <span style={{ flex: 2, color: 'rgba(255,255,255,0.7)', fontSize: q(20) }}>
                        {new Date(r.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ flex: 1.5, color: '#4ade80', fontSize: q(22), textAlign: 'center', fontWeight: 600 }}>¥{Number(r.amount).toFixed(2)}</span>
                      <span style={{ flex: 1.5, color: '#ffd700', fontSize: q(20), textAlign: 'center' }}>{Number(r.gold).toFixed(0)}</span>
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <RechargeStatusBadge status={r.status} />
                      </div>
                    </div>
                  ))}
                  <LoadMoreHint loading={rechargeLoadingMore} hasMore={rechargeHasMore} count={rechargeList.length} />
                </>
              ) : activeTab === 2 && extractList.length > 0 ? (
                <>
                  {extractList.map((r: any, i: number) => {
                    const quality = r.itemQuality ?? 3;
                    const qualityInfo = QUALITY_LABELS[quality] ?? { label: '普通', color: '#9ca3af' };
                    return (
                      <div
                        key={r.id ?? i}
                        onClick={() => { setDetailRecord(r); setDetailType('extract'); }}
                        style={{ display: 'flex', alignItems: 'center', padding: `${q(16)} ${q(20)}`, borderBottom: '1px solid rgba(120,60,220,0.15)', cursor: 'pointer', gap: q(8) }}
                      >
                        {/* 物品缩略图 */}
                        <div style={{ width: q(60), height: q(60), borderRadius: q(8), background: 'rgba(120,60,220,0.2)', border: `1px solid ${qualityInfo.color}40`, overflow: 'hidden', flexShrink: 0 }}>
                          {r.itemImageUrl ? (
                            <img src={r.itemImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : null}
                        </div>
                        <span style={{ flex: 2, color: 'rgba(255,255,255,0.7)', fontSize: q(20) }}>
                          {r.extractedAt ? new Date(r.extractedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                        <span style={{ flex: 2, color: qualityInfo.color, fontSize: q(20), textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.itemName ?? '未知物品'}
                        </span>
                        <span style={{ flex: 1, color: '#ffd700', fontSize: q(20), textAlign: 'right' }}>
                          {Number(r.itemValue ?? 0).toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
                  <LoadMoreHint loading={extractLoadingMore} hasMore={extractHasMore} count={extractList.length} />
                </>
              ) : activeTab === 3 && giftList.length > 0 ? (
                <>
                  {giftList.map((r: any, i: number) => {
                    const quality = r.itemQuality ?? 3;
                    const qualityInfo = QUALITY_LABELS[quality] ?? { label: '普通', color: '#9ca3af' };
                    return (
                      <div
                        key={r.id ?? i}
                        onClick={() => { setDetailRecord(r); setDetailType('extract'); }}
                        style={{ display: 'flex', alignItems: 'center', padding: `${q(16)} ${q(20)}`, borderBottom: '1px solid rgba(120,60,220,0.15)', cursor: 'pointer', gap: q(8) }}
                      >
                        {/* 物品缩略图 */}
                        <div style={{ width: q(60), height: q(60), borderRadius: q(8), background: 'rgba(120,60,220,0.2)', border: `1px solid ${qualityInfo.color}40`, overflow: 'hidden', flexShrink: 0 }}>
                          {r.itemImageUrl ? (
                            <img src={r.itemImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : null}
                        </div>
                        <span style={{ flex: 2, color: 'rgba(255,255,255,0.7)', fontSize: q(20) }}>
                          {new Date(r.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ flex: 2, color: qualityInfo.color, fontSize: q(20), textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.itemName ?? '未知物品'}
                        </span>
                        <span style={{ flex: 1, color: '#ffd700', fontSize: q(20), textAlign: 'right' }}>
                          {Number(r.itemValue ?? 0).toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
                  <LoadMoreHint loading={giftLoadingMore} hasMore={giftHasMore} count={giftList.length} />
                </>
              ) : (
                <EmptyState tab={activeTab} />
              )}
            </div>
          </div>
        </div>

        {/* 公共底部导航 */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
          <BottomNav active="wode" />
        </div>

        {/* 设置弹窗 */}
        <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

        {/* 详情弹窗 */}
        {detailRecord && detailType === 'gold' && (
          <GoldLogDetailModal record={detailRecord} onClose={() => { setDetailRecord(null); setDetailType(null); }} />
        )}
        {detailRecord && detailType === 'recharge' && (
          <RechargeDetailModal record={detailRecord} onClose={() => { setDetailRecord(null); setDetailType(null); }} />
        )}
        {detailRecord && detailType === 'extract' && (
          <ExtractDetailModal record={detailRecord} onClose={() => { setDetailRecord(null); setDetailType(null); }} />
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </PageSlideIn>
  );
}
