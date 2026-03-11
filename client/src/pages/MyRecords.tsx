/**
 * MyRecords.tsx — 我的记录页面
 * 按蓝湖 lanhu_wodejilu 设计稿还原
 * 功能：余额记录/充值记录/提货记录/赠送记录，支持时间筛选
 */
import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/';

const IMG = {
  pageBg: CDN + 'd176e24b1329d3450f319b45d73c127b_75728039.png',           // 页面背景
  topBg: CDN + 'e154fc9ac76095f08b11f3f5d4931f32_ae70ab3f.png',           // 顶部区域背景
  headerBg: CDN + '88118f04ca60d3cc8e1d136d7125a033_3794480e.png',        // 顶部装饰条
  userCardBg: CDN + 'a44836dbe23b154a1c1ff11630b23212_bd92cef9.png',      // 用户信息卡背景
  coinIcon: CDN + 'c74811dde316ca4ba03d46a6c6521941_dcfa808c.png',        // 金币图标
  goldAmount: CDN + 'ed808bba230122a1c0d91135e66bbdfb_499ca214.png',      // 金币数量装饰
  diamondAmount: CDN + 'a78497d0f3ab49ea2d691df553b74e3c_2231c256.png',   // 钻石数量装饰
  avatarFrame: CDN + '63cbd30a83a44f3e855419cfe3562782_26be1549.png',     // 头像框
  vipBadge: CDN + '43b13d1dd207e04fecd26d8efa991e15_b07d2c9e.png',       // VIP徽章
  emptyIcon: CDN + '92c2e27270cc22237cdca509548f6896_258b737f.png',       // 空状态图标
  filterIcon: CDN + 'f5d593d2de8d1479e33169eeb3a46f42_ac395dd5.png',     // 筛选图标
  // 底部导航图标
  wodeIcon: CDN + '70a010556d0b085b97b7a8364f82ec49_955ed7d8.png',
  fenxiangIcon: CDN + '7349f6e93f71cae2fd8ce8e852139767_385e9979.png',
  beibaoIcon: CDN + '34f37744a86ca81df3f38bdc7dd3ed28.png',
  chongzhiIcon: CDN + '800404e2d9a35567c23c70490a11d2ee_12faf682.png',
  // 顶部tab图标
  tabIcons: [
    CDN + 'acbc6140e8db4138997a78b2db522d75_mergeImage_a87bfba8.png',
    CDN + 'd7c0097aac2d4628bbf7a1fe260b1eee_mergeImage_c8cfedc4.png',
    CDN + 'fb2fdfcc7b624930b831f26ac3f6edb9_mergeImage_b4bf1556.png',
  ],
};

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

const RECORD_TABS = ['余额记录', '充值记录', '提货记录', '赠送记录'];
const TIME_FILTERS = ['全部', '今日', '昨日', '近7日'];

export default function MyRecords() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const [timeFilter, setTimeFilter] = useState(0);

  const { data: playerData } = trpc.player.me.useQuery();
  const { data: rechargeData } = trpc.player.rechargeOrders.useQuery({ page: 1, limit: 50 });

  const gold = parseFloat(playerData?.gold ?? '0').toFixed(2);
  const diamond = parseFloat(playerData?.diamond ?? '0').toFixed(2);
  const username = playerData?.nickname ?? '未登录';
  const playerId = playerData?.id ?? 0;

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
    <div
      className="phone-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        containerType: 'inline-size',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 页面背景 */}
      <img
        src={IMG.pageBg}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* 内容层 */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* 顶部装饰条 */}
        <img src={IMG.headerBg} alt="" style={{ width: '100%', display: 'block', height: q(26), objectFit: 'fill' }} />

        {/* 顶部区域（用户信息 + tab切换） */}
        <div style={{ position: 'relative', width: '100%' }}>
          <img src={IMG.topBg} alt="" style={{ width: '100%', display: 'block', objectFit: 'fill' }} />
          <div style={{ position: 'absolute', inset: 0 }}>
            {/* Tab图标行 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: `${q(20)} ${q(30)} 0` }}>
              {IMG.tabIcons.map((icon, i) => (
                <img key={i} src={icon} alt="" style={{ width: q(57), height: q(58), objectFit: 'contain', marginLeft: q(15) }} />
              ))}
            </div>

            {/* 用户信息卡 */}
            <div style={{ margin: `${q(10)} ${q(30)} 0`, position: 'relative' }}>
              <img src={IMG.userCardBg} alt="" style={{ width: '100%', display: 'block', objectFit: 'fill' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: `${q(20)} ${q(20)}` }}>
                {/* 用户名行 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: q(10) }}>
                    <img src={IMG.avatarFrame} alt="" style={{ width: q(36), height: q(36), objectFit: 'contain' }} />
                    <span style={{ color: '#fff', fontSize: q(26), fontWeight: 700 }}>{username}</span>
                  </div>
                  <img src={IMG.vipBadge} alt="" style={{ width: q(57), height: q(58), objectFit: 'contain' }} />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: q(22), marginTop: q(4) }}>
                  ID：{playerId}
                </div>
                {/* 金币钻石行 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: q(20), marginTop: q(10) }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: q(8) }}>
                    <img src={IMG.coinIcon} alt="" style={{ width: q(35), height: q(35), objectFit: 'contain' }} />
                    <span style={{ color: '#ffd700', fontSize: q(26), fontWeight: 700 }}>{gold}</span>
                    <img src={IMG.goldAmount} alt="" style={{ width: q(10), height: q(19), objectFit: 'contain' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: q(8) }}>
                    <span style={{ color: '#7df9ff', fontSize: q(26), fontWeight: 700 }}>{diamond}</span>
                    <img src={IMG.diamondAmount} alt="" style={{ width: q(10), height: q(19), objectFit: 'contain' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 记录类型 Tab */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(10,5,30,0.9)',
            borderBottom: '1px solid rgba(120,60,220,0.3)',
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
        <div style={{ background: 'rgba(10,5,30,0.85)', padding: `${q(16)} ${q(20)}` }}>
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
            <span style={{ flex: 1.5, color: 'rgba(255,255,255,0.6)', fontSize: q(22), textAlign: 'center' }}>全部</span>
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

        {/* 底部导航 */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(5,4,18,0.95)',
            borderTop: '1px solid rgba(120,60,220,0.3)',
            padding: `${q(10)} 0 ${q(20)}`,
          }}
        >
          {[
            { icon: IMG.wodeIcon, label: '我的', path: '/profile' },
            { icon: IMG.fenxiangIcon, label: '分享', path: '/share' },
            { icon: IMG.beibaoIcon, label: '背包', path: '/backpack' },
            { icon: IMG.chongzhiIcon, label: '充值', path: '/recharge' },
          ].map((item, i) => (
            <div
              key={i}
              onClick={() => navigate(item.path)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: q(6),
                cursor: 'pointer',
              }}
            >
              <img src={item.icon} alt={item.label} style={{ width: q(40), height: q(40), objectFit: 'contain' }} />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(20) }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
