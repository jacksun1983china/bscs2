/**
 * MyRecords.tsx — 我的记录页面
 * 按蓝湖 lanhu_wodejilu 设计稿还原
 * 功能：余额记录/充值记录/提货记录/赠送记录，支持时间筛选
 * 优化：无限滚动（余额/充值记录均支持）、余额记录详情弹窗、空状态引导按钮
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
  dingdong: '丁和大作',
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

// 余额记录详情弹窗
function GoldLogDetailModal({ record, onClose }: { record: any; onClose: () => void }) {
  if (!record) return null;
  const amount = Number(record.amount);
  const balance = Number(record.balance);
  const date = new Date(record.createdAt);

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
          <span style={{ color: '#c084fc', fontSize: q(30), fontWeight: 700 }}>流水详情</span>
        </div>

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

        {/* 详情列表 */}
        {[
          { label: '类型', value: getTypeLabel(record.type) },
          { label: '余额', value: `${balance.toFixed(2)} 金币` },
          { label: '时间', value: date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
          ...(record.description ? [{ label: '备注', value: record.description }] : []),
          ...(record.refId ? [{ label: '流水号', value: String(record.refId) }] : []),
        ].map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: `${q(18)} 0`,
              borderBottom: '1px solid rgba(120,60,220,0.1)',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: q(24) }}>{item.label}</span>
            <span style={{ color: '#fff', fontSize: q(24), fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{item.value}</span>
          </div>
        ))}

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

export default function MyRecords() {
  const [activeTab, setActiveTab] = useState(0);
  const [timeFilter, setTimeFilter] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);
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

  const scrollRef = useRef<HTMLDivElement>(null);

  // 切换 tab 或时间筛选时重置分页
  const prevTabRef = useRef(activeTab);
  const prevTimeRef = useRef(timeFilter);
  useEffect(() => {
    if (prevTabRef.current !== activeTab || prevTimeRef.current !== timeFilter) {
      setGoldPage(1);
      setGoldList([]);
      setGoldHasMore(true);
      setRechargePage(1);
      setRechargeList([]);
      setRechargeHasMore(true);
      prevTabRef.current = activeTab;
      prevTimeRef.current = timeFilter;
      // 重置滚动位置
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
    if (goldPage === 1) {
      setGoldList(newItems);
    } else {
      setGoldList(prev => [...prev, ...newItems]);
    }
    setGoldHasMore(newItems.length >= PAGE_SIZE);
    setGoldLoadingMore(false);
  }, [goldLogsData, goldPage]);

  // 充值记录查询（带时间筛选）
  const rechargeTimeRange = TIME_RANGE_MAP[timeFilter];
  const { data: rechargeData, isLoading: rechargeLoading } = trpc.player.rechargeOrders.useQuery(
    { page: rechargePage, limit: PAGE_SIZE },
    { enabled: activeTab === 1, staleTime: 10_000 }
  );

  useEffect(() => {
    if (!rechargeData) return;
    let newItems = rechargeData.list ?? [];
    // 前端按时间筛选
    if (rechargeTimeRange !== 'all') {
      const now = Date.now();
      const cutoff = rechargeTimeRange === 'today' ? now - 86400000
        : rechargeTimeRange === 'yesterday' ? now - 172800000
        : now - 7 * 86400000;
      newItems = newItems.filter((r: any) => new Date(r.createdAt).getTime() > cutoff);
    }
    if (rechargePage === 1) {
      setRechargeList(newItems);
    } else {
      setRechargeList(prev => [...prev, ...newItems]);
    }
    setRechargeHasMore((rechargeData.list ?? []).length >= PAGE_SIZE);
    setRechargeLoadingMore(false);
  }, [rechargeData, rechargePage, rechargeTimeRange]);

  const isLoading = activeTab === 0
    ? (goldLogsLoading && goldPage === 1)
    : activeTab === 1
    ? (rechargeLoading && rechargePage === 1)
    : false;

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
    }
  }, [activeTab, goldHasMore, goldLoadingMore, goldLogsLoading, rechargeHasMore, rechargeLoadingMore, rechargeLoading]);

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

            {/* 时间筛选 + 表头 */}
            <div style={{ background: 'rgba(10,5,30,0.85)', padding: `${q(16)} ${q(20)}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: q(12), marginBottom: q(16) }}>
                {TIME_FILTERS.map((f, i) => (
                  <div key={i} onClick={() => setTimeFilter(i)} style={{ padding: `${q(6)} ${q(20)}`, borderRadius: q(20), background: timeFilter === i ? 'rgba(192,132,252,0.3)' : 'rgba(255,255,255,0.1)', color: timeFilter === i ? '#c084fc' : 'rgba(255,255,255,0.7)', fontSize: q(22), cursor: 'pointer', border: timeFilter === i ? '1px solid #c084fc' : '1px solid transparent', transition: 'all 0.2s' }}>
                    {f}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(120,60,220,0.3)', paddingBottom: q(12) }}>
                <span style={{ flex: 2, color: 'rgba(255,255,255,0.6)', fontSize: q(22) }}>时间</span>
                <span style={{ flex: 1.5, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'center' }}>类型</span>
                <span style={{ flex: 1.5, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'center' }}>金额</span>
                <span style={{ flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'right' }}>余额</span>
              </div>
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
                      onClick={() => setDetailRecord(r)}
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
                    <div key={r.id ?? i} style={{ display: 'flex', alignItems: 'center', padding: `${q(20)} ${q(20)}`, borderBottom: '1px solid rgba(120,60,220,0.15)' }}>
                      <span style={{ flex: 2, color: 'rgba(255,255,255,0.7)', fontSize: q(20) }}>
                        {new Date(r.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ flex: 1.5, color: '#c084fc', fontSize: q(22), textAlign: 'center' }}>充值</span>
                      <span style={{ flex: 1.5, color: '#4ade80', fontSize: q(22), textAlign: 'center', fontWeight: 600 }}>+¥{Number(r.amount).toFixed(2)}</span>
                      <span style={{ flex: 1, color: '#ffd700', fontSize: q(20), textAlign: 'right' }}>{Number(r.gold).toFixed(0)}</span>
                    </div>
                  ))}
                  <LoadMoreHint loading={rechargeLoadingMore} hasMore={rechargeHasMore} count={rechargeList.length} />
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

        {/* 余额记录详情弹窗 */}
        {detailRecord && (
          <GoldLogDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
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
