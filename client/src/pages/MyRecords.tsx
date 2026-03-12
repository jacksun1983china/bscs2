/**
 * MyRecords.tsx — 我的记录页面
 * 按蓝湖 lanhu_wodejilu 设计稿还原
 * 功能：余额记录/充值记录/提货记录/赠送记录，支持时间筛选
 * 使用公共组件：TopNav（顶部）、PlayerInfoCard（个人卡片）、BottomNav（底部导航）
 */
import { PageSlideIn } from '@/components/PageTransition';
import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { LANHU } from '@/lib/assets';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import SettingsModal from '@/components/SettingsModal';

// CDN 资源
const BTN1_CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/btn1@2x_16b5b512.png';  // 选中状态tab背景
const BTN2_CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/btn2@2x_7a36328b.png';  // 未选中状态tab背景
const EMPTY_ICON = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/pic1@2x_b3c200a7.png'; // 空状态图标

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

const RECORD_TABS = ['余额记录', '充值记录', '提货记录', '赠送记录'];
const TIME_FILTERS = ['全部', '今日', '昨日', '近7日'];
const TIME_RANGE_MAP = ['all', 'today', 'yesterday', 'week7'] as const;

// 金额颜色：正数绿色，负数红色
function amountColor(amount: number) {
  if (amount > 0) return '#4ade80';
  if (amount < 0) return '#f87171';
  return '#fff';
}

// 金额格式化：正数显示+，负数显示-
function formatAmount(amount: number) {
  if (amount > 0) return `+${amount.toFixed(2)}`;
  return amount.toFixed(2);
}

// 类型标签中文映射
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

export default function MyRecords() {
  const [activeTab, setActiveTab] = useState(0);
  const [timeFilter, setTimeFilter] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);

  // 余额记录（金币流水）
  const { data: goldLogsData, isLoading: goldLogsLoading } = trpc.player.goldLogs.useQuery(
    {
      page: 1,
      limit: 50,
      timeRange: TIME_RANGE_MAP[timeFilter],
    },
    { enabled: activeTab === 0 }
  );

  // 充值记录
  const { data: rechargeData, isLoading: rechargeLoading } = trpc.player.rechargeOrders.useQuery(
    { page: 1, limit: 50 },
    { enabled: activeTab === 1 }
  );

  // 充值记录按时间筛选
  const rechargeList = useMemo(() => {
    if (!rechargeData?.list) return [];
    const now = Date.now();
    const list = rechargeData.list;
    if (timeFilter === 0) return list;
    const cutoff = timeFilter === 1 ? now - 86400000
      : timeFilter === 2 ? now - 172800000
      : now - 7 * 86400000;
    return list.filter((r: any) => new Date(r.createdAt).getTime() > cutoff);
  }, [rechargeData, timeFilter]);

  const goldLogsList = goldLogsData?.list ?? [];

  const isLoading = activeTab === 0 ? goldLogsLoading : (activeTab === 1 ? rechargeLoading : false);

  return (
    <PageSlideIn>
      <div
        className="phone-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          containerType: 'inline-size',
        }}
      >
        {/* 全局背景层 */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${LANHU.pageBg})`,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top center',
          }} />
        </div>

        {/* 内容层 */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* 顶部固定区（不滚动）：公共顶部导航 + 公共个人卡片 */}
          <div style={{ position: 'relative', width: '100%', flexShrink: 0 }}>
            <TopNav
              showLogo={false}
              onSettingsOpen={() => setSettingsVisible(true)}
              settingsOpen={settingsVisible}
            />
            <PlayerInfoCard style={{ marginTop: q(18) }} />
          </div>

          {/* 可滚动内容区 */}
          <div style={{
            position: 'relative',
            width: '100%',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            paddingBottom: q(90),
          }}>
            {/* 记录类型 Tab — 使用 btn1/btn2 图片作为背景 */}
            <div
              style={{
                display: 'flex',
                padding: `${q(20)} ${q(10)} ${q(10)}`,
                gap: q(8),
                background: 'rgba(10,5,30,0.9)',
                flexShrink: 0,
              }}
            >
              {RECORD_TABS.map((tab, i) => (
                <div
                  key={i}
                  onClick={() => setActiveTab(i)}
                  style={{
                    flex: 1,
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: q(72),
                  }}
                >
                  {/* Tab 背景图 */}
                  <img
                    src={activeTab === i ? BTN1_CDN : BTN2_CDN}
                    alt=""
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'fill',
                    }}
                  />
                  {/* Tab 文字 */}
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      color: activeTab === i ? '#fff' : 'rgba(255,255,255,0.7)',
                      fontSize: q(22),
                      fontWeight: activeTab === i ? 700 : 400,
                      textShadow: activeTab === i ? '0 0 8px rgba(180,100,255,0.8)' : 'none',
                      letterSpacing: 0.5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab}
                  </span>
                </div>
              ))}
            </div>

            {/* 时间筛选 + 表头 */}
            <div style={{ background: 'rgba(10,5,30,0.85)', padding: `${q(16)} ${q(20)}`, flexShrink: 0 }}>
              {/* 时间筛选行 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: q(12), marginBottom: q(16) }}>
                {TIME_FILTERS.map((f, i) => (
                  <div
                    key={i}
                    onClick={() => setTimeFilter(i)}
                    style={{
                      padding: `${q(6)} ${q(20)}`,
                      borderRadius: q(20),
                      background: timeFilter === i ? 'rgba(192,132,252,0.3)' : 'rgba(255,255,255,0.1)',
                      color: timeFilter === i ? '#c084fc' : 'rgba(255,255,255,0.7)',
                      fontSize: q(22),
                      cursor: 'pointer',
                      border: timeFilter === i ? '1px solid #c084fc' : '1px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    {f}
                  </div>
                ))}
              </div>

              {/* 表头 */}
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
                /* 加载状态 */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${q(80)} 0` }}>
                  <div style={{
                    width: q(60), height: q(60),
                    border: `${q(4)} solid rgba(192,132,252,0.3)`,
                    borderTop: `${q(4)} solid #c084fc`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: q(24), marginTop: q(20) }}>加载中...</span>
                </div>
              ) : activeTab === 0 && goldLogsList.length > 0 ? (
                /* 余额记录 */
                goldLogsList.map((r: any, i: number) => (
                  <div
                    key={r.id ?? i}
                    onClick={() => setDetailRecord(r)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: `${q(16)} ${q(20)}`,
                      borderBottom: '1px solid rgba(120,60,220,0.15)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* 主行：时间 + 类型 + 金额 + 余额 */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ flex: 2, color: 'rgba(255,255,255,0.7)', fontSize: q(20) }}>
                        {new Date(r.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ flex: 1.5, color: '#c084fc', fontSize: q(20), textAlign: 'center' }}>
                        {getTypeLabel(r.type)}
                      </span>
                      <span style={{ flex: 1.5, color: amountColor(r.amount), fontSize: q(22), textAlign: 'center', fontWeight: 600 }}>
                        {formatAmount(r.amount)}
                      </span>
                      <span style={{ flex: 1, color: '#ffd700', fontSize: q(20), textAlign: 'right' }}>
                        {Number(r.balance).toFixed(0)}
                      </span>
                    </div>
                    {/* 备注行（如果有description） */}
                    {r.description ? (
                      <div style={{ marginTop: q(6), color: 'rgba(255,255,255,0.4)', fontSize: q(18), paddingLeft: q(2) }}>
                        {r.description}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : activeTab === 1 && rechargeList.length > 0 ? (
                /* 充值记录 */
                rechargeList.map((r: any, i: number) => (
                  <div
                    key={r.id ?? i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: `${q(20)} ${q(20)}`,
                      borderBottom: '1px solid rgba(120,60,220,0.15)',
                    }}
                  >
                    <span style={{ flex: 2, color: 'rgba(255,255,255,0.7)', fontSize: q(20) }}>
                      {new Date(r.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{ flex: 1.5, color: '#c084fc', fontSize: q(22), textAlign: 'center' }}>充值</span>
                    <span style={{ flex: 1.5, color: '#4ade80', fontSize: q(22), textAlign: 'center', fontWeight: 600 }}>
                      +¥{Number(r.amount).toFixed(2)}
                    </span>
                    <span style={{ flex: 1, color: '#ffd700', fontSize: q(20), textAlign: 'right' }}>
                      {Number(r.gold).toFixed(0)}
                    </span>
                  </div>
                ))
              ) : (
                /* 空状态 */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${q(80)} 0` }}>
                  <img src={EMPTY_ICON} alt="" style={{ width: q(200), height: q(200), objectFit: 'contain' }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: q(26), marginTop: q(20) }}>暂无记录！</span>
                </div>
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

        {/* 旋转动画 */}
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
