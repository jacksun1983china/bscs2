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

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/';

const IMG = {
  emptyIcon: CDN + '92c2e27270cc22237cdca509548f6896_258b737f.png',       // 空状态图标
  filterIcon: CDN + 'f5d593d2de8d1479e33169eeb3a46f42_ac395dd5.png',     // 筛选图标
};

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

const RECORD_TABS = ['余额记录', '充值记录', '提货记录', '赠送记录'];
const TIME_FILTERS = ['全部', '今日', '昨日', '近7日'];

export default function MyRecords() {
  const [activeTab, setActiveTab] = useState(0);
  const [timeFilter, setTimeFilter] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const { data: rechargeData } = trpc.player.rechargeOrders.useQuery({ page: 1, limit: 50 });

  // 充值记录列表（根据时间筛选）
  const rechargeList = useMemo(() => {
    if (!rechargeData?.list) return [];
    const now = Date.now();
    const list = rechargeData.list;
    if (timeFilter === 0) return list; // 全部
    const cutoff = timeFilter === 1 ? now - 86400000
      : timeFilter === 2 ? now - 172800000
      : now - 7 * 86400000;
    return list.filter((r: any) => new Date(r.createdAt).getTime() > cutoff);
  }, [rechargeData, timeFilter]);

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
            paddingBottom: q(90), // 为底部导航留空间
          }}>
            {/* 记录类型 Tab */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(10,5,30,0.9)',
                borderBottom: '1px solid rgba(120,60,220,0.3)',
                flexShrink: 0,
              }}
            >
              {RECORD_TABS.map((tab, i) => (
                <div
                  key={i}
                  onClick={() => setActiveTab(i)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: `${q(20)} 0`,
                    color: activeTab === i ? '#c084fc' : 'rgba(255,255,255,0.6)',
                    fontSize: q(26),
                    fontWeight: activeTab === i ? 700 : 400,
                    borderBottom: activeTab === i ? `${q(4)} solid #c084fc` : `${q(4)} solid transparent`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab}
                </div>
              ))}
            </div>

            {/* 时间筛选 + 表头 */}
            <div style={{ background: 'rgba(10,5,30,0.85)', padding: `${q(16)} ${q(20)}`, flexShrink: 0 }}>
              {/* 时间筛选行 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: q(12), marginBottom: q(16) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: q(8), cursor: 'pointer' }}>
                  <span style={{ color: '#fff', fontSize: q(24) }}>全部</span>
                  <img src={IMG.filterIcon} alt="" style={{ width: q(18), height: q(18), objectFit: 'contain' }} />
                </div>
                {TIME_FILTERS.slice(1).map((f, i) => (
                  <div
                    key={i}
                    onClick={() => setTimeFilter(i + 1 === timeFilter ? 0 : i + 1)}
                    style={{
                      padding: `${q(6)} ${q(20)}`,
                      borderRadius: q(20),
                      background: timeFilter === i + 1 ? 'rgba(192,132,252,0.3)' : 'rgba(255,255,255,0.1)',
                      color: timeFilter === i + 1 ? '#c084fc' : 'rgba(255,255,255,0.7)',
                      fontSize: q(22),
                      cursor: 'pointer',
                      border: timeFilter === i + 1 ? '1px solid #c084fc' : '1px solid transparent',
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
              {activeTab === 1 && rechargeList.length > 0 ? (
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
                    <span style={{ flex: 1.5, color: '#ffd700', fontSize: q(22), textAlign: 'center' }}>+¥{Number(r.amount).toFixed(2)}</span>
                    <span style={{ flex: 1, color: '#fff', fontSize: q(22), textAlign: 'right' }}>{Number(r.gold).toFixed(0)}</span>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${q(80)} 0` }}>
                  <img src={IMG.emptyIcon} alt="" style={{ width: q(120), height: q(120), objectFit: 'contain', opacity: 0.6 }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: q(26), marginTop: q(20) }}>暂无记录!</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 公共底部导航 - absolute 悬浮在背景图上，与背景图叠加无接缝 */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
          <BottomNav active="wode" />
        </div>

        {/* 设置弹窗 */}
        <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      </div>
    </PageSlideIn>
  );
}
