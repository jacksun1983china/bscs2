/**
 * Backpack.tsx — 背包页面
 * 严格还原蓝湖 lanhu_beibao 设计稿
 * 布局：TopNav → PlayerInfoCard → 操作按钮行 → 筛选排序行 → 道具列表 → BottomNav
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/';

const BB = {
  // 页面背景
  pageBg: CDN + '865881086c8e42fdb565ab88ac0ef070_*.png',
  // 背包标题图
  titleImg: CDN + 'ccf4cb97381efacab90c9d344feb1496_c632e754.png',
  // 关闭/返回按钮
  closeBtn: CDN + '20ff4689b6231b9ac2323b9564f688df_*.png',
  // 标签栏背景（全部/枪械/饰品）
  tabBg: CDN + '009e8d412a7d3bff55bd0a9e7711ce02_*.png',
  // 分解按钮
  decomposeIcon: CDN + 'b400f59987e35b6feab1e589f258d441_d52bf2e6.png',
  // 提货保护图标
  protectIcon: CDN + '97de6f517430fe6063bab8e92561260d_*.png',
  // 提货按钮
  deliverBtn: CDN + '426e41da3ba763c4a3dedee2d8088c21_*.png',
  // 价格排序图标
  priceSort: CDN + '1b8ac55424ce8ab7ad80daf188f581b2_*.png',
  // 时间排序图标
  timeSort: CDN + '33a88881278b4762a2a00c211315bb2a_*.png',
  // 道具卡片背景（大）
  itemCardBig: CDN + 'e0c8e2812ccd231c8ec0d8ab6943e2c8_c6692eb4.png',
  // 道具卡片背景（小）
  itemCardSmall1: CDN + '1e3be3fe75fa0c0adbe07e1bffaab34d_*.png',
  itemCardSmall2: CDN + 'df439a558f645fbe12c17b4f785e20aa_c882b199.png',
  // 道具图片（示例枪械）
  itemGun1: CDN + 'd00316c512a6f938b2a058ba1a46f653_08213462.png',
  itemGun2: CDN + 'e0c8e2812ccd231c8ec0d8ab6943e2c8_c6692eb4.png',
  itemGun3: CDN + '1e3be3fe75fa0c0adbe07e1bffaab34d_*.png',
  itemGun4: CDN + 'df439a558f645fbe12c17b4f785e20aa_c882b199.png',
  // 金币图标
  coinIcon: CDN + 'e3896d873cf738587ae50f74b2720a8b_1d38293a.png',
  coinIcon2: CDN + 'f2ccd58cecc1e8ae1b16202fab94fd4f_c3913bf0.png',
  // 加载更多按钮
  loadMore: CDN + '097f9471937fdb90867e6497e283bdfd_*.png',
  // 背包大图（顶部装饰）
  headerBg: CDN + '865881086c8e42fdb565ab88ac0ef070_*.png',
};

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// 道具数据类型
interface BackpackItem {
  id: number;
  name: string;
  quality: string;
  price: number;
  image: string;
}

// 模拟道具数据
const MOCK_ITEMS: BackpackItem[] = [
  { id: 1, name: 'M4A1 消音型 | 氧化处理', quality: '崭新出厂', price: 123.08, image: CDN + 'd00316c512a6f938b2a058ba1a46f653_08213462.png' },
  { id: 2, name: 'M4A1 消音型 | 氧化处理', quality: '崭新出厂', price: 123.08, image: CDN + 'e0c8e2812ccd231c8ec0d8ab6943e2c8_c6692eb4.png' },
  { id: 3, name: 'M4A1 消音型 | 氧化处理', quality: '崭新出厂', price: 123.08, image: CDN + 'd00316c512a6f938b2a058ba1a46f653_08213462.png' },
  { id: 4, name: 'M4A1 消音型 | 氧化处理', quality: '崭新出厂', price: 123.08, image: CDN + 'e0c8e2812ccd231c8ec0d8ab6943e2c8_c6692eb4.png' },
  { id: 5, name: 'M4A1 消音型 | 氧化处理', quality: '崭新出厂', price: 123.08, image: CDN + 'd00316c512a6f938b2a058ba1a46f653_08213462.png' },
];

type SortType = 'price' | 'time';
type TabType = 'all' | 'gun' | 'skin';

export default function Backpack() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortBy, setSortBy] = useState<SortType>('price');
  const [searchText, setSearchText] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const { data: player } = trpc.player.me.useQuery();
  const { data: backpackData } = trpc.player.inventory.useQuery({ page: 1, limit: 50 });
  const items: BackpackItem[] = (backpackData as any)?.items ?? MOCK_ITEMS;

  const toggleSelect = (id: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabs = [
    { key: 'all' as TabType, label: '全部' },
    { key: 'gun' as TabType, label: '枪械' },
    { key: 'skin' as TabType, label: '饰品' },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        containerType: 'inline-size',
        background: '#0d0621',
      }}
    >
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
          paddingBottom: q(120),
        }}
      >
        {/* 顶部导航 */}
        <TopNav showLogo={false} />

        {/* 标题行：背包 + 两个图标 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: `${q(10)} ${q(30)} 0`,
            gap: q(16),
          }}
        >
          <span style={{ color: '#fff', fontSize: q(34), fontWeight: 700, letterSpacing: 1 }}>背包</span>
          <img src={BB.titleImg} alt="背包" style={{ height: q(36), objectFit: 'contain' }} />
          <img src={BB.closeBtn} alt="关闭" style={{ width: q(36), height: q(36), objectFit: 'contain', marginLeft: 'auto', cursor: 'pointer' }} />
        </div>

        {/* 玩家信息卡 */}
        <div style={{ padding: `${q(10)} ${q(30)} 0` }}>
          <PlayerInfoCard />
        </div>

        {/* 操作按钮行：分解 + 提货保护 + 提货 + VIP1 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: `${q(16)} ${q(30)} 0`,
            gap: q(16),
          }}
        >
          {/* 分解 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: q(8),
              background: 'rgba(80,40,160,0.4)',
              borderRadius: q(20),
              padding: `${q(10)} ${q(20)}`,
              cursor: 'pointer',
              border: '1px solid rgba(120,60,220,0.4)',
            }}
          >
            <img src={BB.decomposeIcon} alt="分解" style={{ width: q(36), height: q(36), objectFit: 'contain' }} />
            <span style={{ color: '#fff', fontSize: q(24), fontWeight: 500 }}>分解</span>
          </div>

          {/* 提货保护 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: q(8),
              background: 'rgba(80,40,160,0.4)',
              borderRadius: q(20),
              padding: `${q(10)} ${q(20)}`,
              cursor: 'pointer',
              border: '1px solid rgba(120,60,220,0.4)',
            }}
          >
            <img src={BB.protectIcon} alt="提货保护" style={{ width: q(36), height: q(36), objectFit: 'contain' }} />
            <span style={{ color: '#fff', fontSize: q(24), fontWeight: 500 }}>提货保护</span>
          </div>

          {/* 用户信息小卡 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              background: 'rgba(5,4,18,0.7)',
              borderRadius: q(16),
              padding: `${q(10)} ${q(20)}`,
              border: '1px solid rgba(120,60,220,0.3)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: q(8) }}>
              <span style={{ color: '#fff', fontSize: q(22), fontWeight: 500 }}>
                {player?.nickname ?? '天启时时川'}
              </span>
            </div>
            <span style={{ color: 'rgba(153,128,204,1)', fontSize: q(20), marginTop: q(4) }}>
              ID：{player?.id ?? '5456415'}
            </span>
            {/* 提货按钮 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: q(8),
                marginTop: q(8),
                cursor: 'pointer',
              }}
            >
              <img src={BB.deliverBtn} alt="提货" style={{ width: q(36), height: q(36), objectFit: 'contain' }} />
              <span style={{ color: '#fff', fontSize: q(22) }}>提货</span>
            </div>
          </div>

          {/* VIP标签 */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f5a623 0%, #e8750a 100%)',
              borderRadius: q(8),
              padding: `${q(4)} ${q(16)}`,
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#fff', fontSize: q(22), fontWeight: 700 }}>
              VIP{player?.vipLevel ?? 1}
            </span>
          </div>
        </div>

        {/* 今日可赠送提示 */}
        <div
          style={{
            margin: `${q(12)} ${q(30)} 0`,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: q(8),
          }}
        >
          <span style={{ color: '#fff', fontSize: q(22) }}>
            当前VIP{player?.vipLevel ?? 1},今日可赠送
          </span>
          <span style={{ color: 'rgba(58,255,255,1)', fontSize: q(26), fontWeight: 700 }}>0</span>
          <span style={{ color: '#fff', fontSize: q(22) }}>次</span>
        </div>

        {/* 标签栏 */}
        <div
          style={{
            margin: `${q(16)} ${q(30)} 0`,
            display: 'flex',
            flexDirection: 'row',
            gap: q(8),
          }}
        >
          {tabs.map(tab => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: `${q(12)} ${q(28)}`,
                borderRadius: q(20),
                background: activeTab === tab.key
                  ? 'linear-gradient(135deg, rgba(120,40,200,0.9), rgba(60,20,120,0.9))'
                  : 'rgba(5,4,18,0.7)',
                border: activeTab === tab.key
                  ? '1px solid rgba(180,80,255,0.6)'
                  : '1px solid rgba(80,40,160,0.3)',
                cursor: 'pointer',
              }}
            >
              <span style={{ color: '#fff', fontSize: q(24), fontWeight: activeTab === tab.key ? 700 : 400 }}>
                {tab.label}
              </span>
            </div>
          ))}
        </div>

        {/* 筛选排序行 */}
        <div
          style={{
            margin: `${q(12)} ${q(30)} 0`,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: q(16),
          }}
        >
          {/* 共N件 */}
          <span style={{ color: '#fff', fontSize: q(24), flexShrink: 0 }}>共{items.length}件</span>

          {/* 搜索框 */}
          <div
            style={{
              flex: 1,
              background: 'rgba(5,4,18,0.7)',
              borderRadius: q(20),
              border: '1px solid rgba(80,40,160,0.4)',
              padding: `${q(10)} ${q(20)}`,
            }}
          >
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="请输入关键词搜索"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: q(22),
              }}
            />
          </div>

          {/* 价格排序 */}
          <div
            onClick={() => setSortBy('price')}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: q(6),
              cursor: 'pointer',
              opacity: sortBy === 'price' ? 1 : 0.6,
            }}
          >
            <img src={BB.priceSort} alt="价格" style={{ width: q(28), height: q(28), objectFit: 'contain' }} />
            <span style={{ color: '#fff', fontSize: q(22) }}>价格</span>
          </div>

          {/* 时间排序 */}
          <div
            onClick={() => setSortBy('time')}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: q(6),
              cursor: 'pointer',
              opacity: sortBy === 'time' ? 1 : 0.6,
            }}
          >
            <img src={BB.timeSort} alt="时间" style={{ width: q(28), height: q(28), objectFit: 'contain' }} />
            <span style={{ color: '#fff', fontSize: q(22) }}>时间</span>
          </div>
        </div>

        {/* 道具列表：第一行大卡+小卡，后续两列小卡 */}
        <div style={{ padding: `${q(12)} ${q(30)} 0` }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: q(26), padding: `${q(60)} 0` }}>
              背包空空如也
            </div>
          ) : (
            <>
              {/* 第一行：1大 + 1小（竖排） */}
              {items.length >= 1 && (
                <div style={{ display: 'flex', flexDirection: 'row', gap: q(14), marginBottom: q(14) }}>
                  {/* 大卡 */}
                  <ItemCard item={items[0]} isSelected={selectedItems.has(items[0].id)} onToggle={toggleSelect} size="big" />
                  {/* 右侧小卡列 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: q(14), flex: 1 }}>
                    {items.slice(1, 3).map(item => (
                      <ItemCard key={item.id} item={item} isSelected={selectedItems.has(item.id)} onToggle={toggleSelect} size="small" />
                    ))}
                  </div>
                </div>
              )}
              {/* 后续行：两列小卡 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: q(14) }}>
                {items.slice(3).map(item => (
                  <ItemCard key={item.id} item={item} isSelected={selectedItems.has(item.id)} onToggle={toggleSelect} size="small" />
                ))}
              </div>
            </>
          )}
        </div>

        {/* 加载更多 */}
        {items.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: `${q(24)} 0` }}>
            <div
              style={{
                background: 'rgba(80,40,160,0.4)',
                borderRadius: q(30),
                padding: `${q(16)} ${q(60)}`,
                border: '1px solid rgba(120,60,220,0.4)',
                cursor: 'pointer',
              }}
            >
              <span style={{ color: '#fff', fontSize: q(24) }}>加载更多</span>
            </div>
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <BottomNav active="beibao" />
      </div>
    </div>
  );
}

// 道具卡片子组件
function ItemCard({ item, isSelected, onToggle, size }: {
  item: BackpackItem;
  isSelected: boolean;
  onToggle: (id: number) => void;
  size: 'big' | 'small';
}) {
  const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/';
  const coinIcon = CDN + 'e3896d873cf738587ae50f74b2720a8b_1d38293a.png';
  const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

  return (
    <div
      onClick={() => onToggle(item.id)}
      style={{
        position: 'relative',
        background: isSelected
          ? 'linear-gradient(135deg, rgba(120,40,200,0.6), rgba(40,10,80,0.9))'
          : 'rgba(5,4,18,0.85)',
        borderRadius: q(16),
        border: isSelected ? '1.5px solid rgba(180,80,255,0.8)' : '1px solid rgba(80,40,160,0.3)',
        overflow: 'hidden',
        cursor: 'pointer',
        flex: size === 'big' ? '0 0 55%' : undefined,
      }}
    >
      {/* 道具图片 */}
      <div style={{ padding: q(12), paddingBottom: 0 }}>
        <img
          src={item.image}
          alt={item.name}
          style={{
            width: '100%',
            aspectRatio: '1',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
      {/* 道具名称 */}
      <div style={{ padding: `${q(8)} ${q(12)}` }}>
        <div style={{ color: '#fff', fontSize: q(20), fontWeight: 500, lineHeight: 1.3, marginBottom: q(6) }}>
          {item.name}
        </div>
        {/* 品质标签 */}
        <div
          style={{
            display: 'inline-block',
            background: 'rgba(58,255,255,0.15)',
            borderRadius: q(6),
            padding: `${q(2)} ${q(10)}`,
            marginBottom: q(6),
          }}
        >
          <span style={{ color: 'rgba(58,255,255,1)', fontSize: q(18) }}>{item.quality}</span>
        </div>
        {/* 价格行 */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: q(6) }}>
          <img src={coinIcon} alt="金币" style={{ width: q(24), height: q(24), objectFit: 'contain' }} />
          <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(22), fontWeight: 700 }}>{item.price}</span>
        </div>
      </div>
      {/* 选中角标 */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: q(8),
            right: q(8),
            width: q(28),
            height: q(28),
            borderRadius: '50%',
            background: 'rgba(120,40,200,1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#fff', fontSize: q(18), fontWeight: 700 }}>✓</span>
        </div>
      )}
    </div>
  );
}
