/**
 * Backpack.tsx — 背包页面
 * 严格还原蓝湖 lanhu_beibao 设计稿
 * 布局：TopNav → PlayerInfoCard → 操作按钮行 → 筛选排序行 → 道具列表 → BottomNav
 * 数据：从数据库读取（trpc.player.inventory）
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import SettingsModal from '@/components/SettingsModal';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/';

const BB = {
  pageBg: CDN + '74d18b69057e89f0807e0d0ca7575514_57d00e7e.png',
  decomposeIcon: CDN + 'b400f59987e35b6feab1e589f258d441_d52bf2e6.png',
  protectIcon: CDN + '97de6f517430fe6063bab8e92561260d_3b6c2b2b.png',
  priceSort: CDN + '1b8ac55424ce8ab7ad80daf188f581b2_7e0d6e1a.png',
  timeSort: CDN + '33a88881278b4762a2a00c211315bb2a_b6e7e3c1.png',
  coinIcon: CDN + 'e3896d873cf738587ae50f74b2720a8b_1d38293a.png',
};

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

const QUALITY_COLORS: Record<string, string> = {
  common: 'rgba(180,180,180,1)',
  rare: 'rgba(58,130,255,1)',
  epic: 'rgba(160,80,255,1)',
  legendary: 'rgba(255,180,0,1)',
};

const QUALITY_LABELS: Record<string, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

type SortType = 'price' | 'time';
type TabType = 'all' | 'gun' | 'skin';

interface InventoryItem {
  id: number;
  itemName: string | null;
  itemImageUrl: string | null;
  itemQuality: string | null;
  itemValue: string | null;
  itemType: string | null;
  source: string;
  createdAt: Date;
}

export default function Backpack() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortBy, setSortBy] = useState<SortType>('price');
  const [searchText, setSearchText] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [settingsVisible, setSettingsVisible] = useState(false);

  const { data: player } = trpc.player.me.useQuery();
  const { data: backpackData, isLoading } = trpc.player.inventory.useQuery({ page: 1, limit: 50 });

  const rawItems: InventoryItem[] = (backpackData?.list ?? []) as InventoryItem[];

  const filteredItems = rawItems.filter(item => {
    if (searchText && !(item.itemName ?? '').includes(searchText)) return false;
    if (activeTab === 'gun' && item.itemType !== 'weapon') return false;
    if (activeTab === 'skin' && item.itemType !== 'skin') return false;
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'price') return Number(b.itemValue ?? 0) - Number(a.itemValue ?? 0);
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });

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
      className="phone-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        containerType: 'inline-size',
        position: 'relative',
        background: '#0d0621',
      }}
    >
      <img
        src={BB.pageBg}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* 顶部固定区 */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
        <TopNav showLogo={false} onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
        <div style={{ padding: `0 ${q(30)}`, marginTop: q(8) }}>
          <PlayerInfoCard />
        </div>
      </div>

      {/* 内容滚动区 */}
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
        {/* 操作按钮行 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: `${q(16)} ${q(30)} 0`,
            gap: q(16),
          }}
        >
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

          <div
            style={{
              background: 'linear-gradient(135deg, #f5a623 0%, #e8750a 100%)',
              borderRadius: q(8),
              padding: `${q(4)} ${q(16)}`,
              flexShrink: 0,
              marginLeft: 'auto',
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
          <span style={{ color: '#fff', fontSize: q(24), flexShrink: 0 }}>共{sortedItems.length}件</span>

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
            <span style={{ color: sortBy === 'price' ? 'rgba(255,246,13,1)' : '#fff', fontSize: q(22) }}>价格</span>
          </div>

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
            <span style={{ color: sortBy === 'time' ? 'rgba(255,246,13,1)' : '#fff', fontSize: q(22) }}>时间</span>
          </div>
        </div>

        {/* 道具列表 */}
        <div style={{ padding: `${q(12)} ${q(30)} 0` }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: q(26), padding: `${q(60)} 0` }}>
              加载中...
            </div>
          ) : sortedItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: q(26), padding: `${q(60)} 0` }}>
              背包空空如也，去 Roll 房赢取奖品吧！
            </div>
          ) : (
            <>
              {sortedItems.length >= 1 && (
                <div style={{ display: 'flex', flexDirection: 'row', gap: q(14), marginBottom: q(14) }}>
                  <ItemCard
                    item={sortedItems[0]}
                    isSelected={selectedItems.has(sortedItems[0].id)}
                    onToggle={toggleSelect}
                    size="big"
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: q(14), flex: 1 }}>
                    {sortedItems.slice(1, 3).map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        isSelected={selectedItems.has(item.id)}
                        onToggle={toggleSelect}
                        size="small"
                      />
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: q(14) }}>
                {sortedItems.slice(3).map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.has(item.id)}
                    onToggle={toggleSelect}
                    size="small"
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {sortedItems.length > 0 && (
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

      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <BottomNav active="beibao" />
      </div>
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </div>
  );
}

function ItemCard({
  item,
  isSelected,
  onToggle,
  size,
}: {
  item: InventoryItem;
  isSelected: boolean;
  onToggle: (id: number) => void;
  size: 'big' | 'small';
}) {
  const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/';
  const coinIcon = CDN + 'e3896d873cf738587ae50f74b2720a8b_1d38293a.png';
  const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

  const qualityKey = item.itemQuality ?? 'common';
  const qualityColor = QUALITY_COLORS[qualityKey] ?? 'rgba(180,180,180,1)';
  const qualityLabel = QUALITY_LABELS[qualityKey] ?? '普通';

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
      <div style={{ padding: q(12), paddingBottom: 0 }}>
        <img
          src={item.itemImageUrl ?? ''}
          alt={item.itemName ?? ''}
          style={{
            width: '100%',
            aspectRatio: '1',
            objectFit: 'contain',
            display: 'block',
          }}
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
        />
      </div>
      <div style={{ padding: `${q(8)} ${q(12)}` }}>
        <div style={{ color: '#fff', fontSize: q(20), fontWeight: 500, lineHeight: 1.3, marginBottom: q(6) }}>
          {item.itemName ?? '未知道具'}
        </div>
        <div
          style={{
            display: 'inline-block',
            background: `${qualityColor}22`,
            borderRadius: q(6),
            padding: `${q(2)} ${q(10)}`,
            marginBottom: q(6),
            border: `1px solid ${qualityColor}55`,
          }}
        >
          <span style={{ color: qualityColor, fontSize: q(18) }}>{qualityLabel}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: q(6) }}>
          <img src={coinIcon} alt="金币" style={{ width: q(24), height: q(24), objectFit: 'contain' }} />
          <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(22), fontWeight: 700 }}>
            {Number(item.itemValue ?? 0).toFixed(2)}
          </span>
        </div>
      </div>
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
