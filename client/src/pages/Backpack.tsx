/**
 * Backpack.tsx — 背包页面（蓝湖 lanhu_beibao 设计稿还原）
 * 布局：公共顶部导航 → 个人信息卡（悬停） → 操作按钮行 → 赠送提示栏 → 搜索排序栏 → 物品2列网格 → 底部操作栏 → 底部导航
 */
import { PageSlideIn } from '@/components/PageTransition';
import { useState, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import SettingsModal from '@/components/SettingsModal';
import { toast } from 'sonner';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';
const B = {
  // 页面背景
  pageBg:          `${CDN}/66f8df24a63936b3d70aa867242db21b_02819819.png`,
  // 操作栏背景（三按钮行）
  actionBarBg:         `${CDN}/a1c5c21f376aab93e300ed064501e957_9723c289.png`,
  // 分解按钮背景
  decomposeBtn:        `${CDN}/8b82a0f1b0eb8732c1fba806be0e2e7a_3123f506.png`,
  // 分解图标（未选中）
  decomposeIconOff:    `${CDN}/b400f59987e35b6feab1e589f258d441_711b5c26.png`,
  // 分解图标（选中）
  decomposeIconOn:     `${CDN}/3bb6e8a2fd9db1d488cfe3821090fc12_a7b57fad.png`,
  // 提货按钮背景
  pickupBtn:           `${CDN}/5688d32a86417448b55164d4cb14fd9e_c0d36ef4.png`,
  // 提货图标（未选中）
  pickupIconOff:       `${CDN}/426e41da3ba763c4a3dedee2d8088c21_02dafe77.png`,
  // 提货图标（选中）
  pickupIconOn:        `${CDN}/424b4a7980c3bfdb5f0e8c56c995376a_9bd1fa56.png`,
  // 提货保护按钮背景
  protectBtn:          `${CDN}/4b4347a608aefc62a0e9822e249126de_67ffa359.png`,
  // 提货保护图标（未选中）
  protectIconOff:      `${CDN}/97de6f517430fe6063bab8e92561260d_d76a16f3.png`,
  // 提货保护图标（选中）
  protectIconOn:       `${CDN}/69681f88ade804a3620928ce1ff33026_023c2c8e.png`,
  // 赠送提示栏背景
  giftBarBg:       `${CDN}/69829e1d03e954f76a5ac4f267381039_4742e319.png`,
  // 赠送图标
  giftIcon:        `${CDN}/366cc5965045f9551088d199b166e628_07b23c8e.png`,
  // 物品列表区域背景
  listAreaBg:      `${CDN}/dd9d606dbac17e485789e175b46e7609_4b3836d8.png`,
  // 搜索栏背景
  searchBarBg:     `${CDN}/29f82e47f68c4a388031776b987b74d2_948e677d.png`,
  // 搜索框背景
  searchInputBg:   `${CDN}/fae0a187b50cc09e38fec1ea7d891cc6_9a485d37.png`,
  // 价格排序图标
  sortPriceIcon:   `${CDN}/1b8ac55424ce8ab7ad80daf188f581b2_444e5a5f.png`,
  // 时间排序图标
  sortTimeIcon:    `${CDN}/33a88881278b4762a2a00c211315bb2a_67028761.png`,
  // 物品卡片右列背景（带图案）
  itemCardRightBg: `${CDN}/f5f3916961d37c09df77616e98eb20e2_bc4beea7.png`,
  // 价格图标（金币小图标）
  priceIcon:       `${CDN}/e3896d873cf738587ae50f74b2720a8b_0be27e5d.png`,
  // 物品图片占位
  itemPlaceholder: `${CDN}/11f43e39a89c331ac16535f6f751fee0_a3b3092d.png`,
  // 底部操作栏背景
  bottomBarBg:     `${CDN}/dfe7a3cb9a070644f55991fb9fa753e3_e5bef7d9.png`,
  // 全选图标
  selectAllIcon:   `${CDN}/d6bb95790f2471ba856d7857e4bcc97f_25e79769.png`,
  // 底部金币图标
  bottomGoldIcon:  `${CDN}/ba79a45c197279a95d465f78e94e5502_500955b8.png`,
  // 赠送按钮背景
  giftBtnBg:       `${CDN}/ea5349b516a062ff448e844526b7f857_327ab89d.png`,
  // 分解按钮背景（底部）
  decomposeBtnBg:  `${CDN}/ae45c8c3cff0e2f74fedde5a322a6c8e_2cc4698f.png`,
};

// 750px 基准转换为 cqw
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// 品质颜色
const QUALITY_BG: Record<string, string> = {
  legendary: 'linear-gradient(135deg,#c8860a,#f5c842)',
  epic:      'linear-gradient(135deg,#6a0dad,#c084fc)',
  rare:      'linear-gradient(135deg,#1a4fa8,#60a5fa)',
  common:    'linear-gradient(135deg,#4a4a4a,#9a9a9a)',
};
const QUALITY_LABELS: Record<string, string> = {
  legendary: '传说',
  epic:      '史诗',
  rare:      '稀有',
  common:    '普通',
};

interface InventoryItem {
  id: number;
  itemName: string | null;
  itemImageUrl: string | null;
  itemQuality: number | null;
  itemValue: string | null;
  source: string;
  status: number;
  createdAt: Date;
}

export default function Backpack() {
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'time'>('time');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'box' | 'arena' | 'roll'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [settingsVisible, setSettingsVisible] = useState(false);
  // 弹窗状态
  const [confirmModal, setConfirmModal] = useState<{ type: 'extract' | 'recycle' | null }>({ type: null });
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  // 无限滚动状态
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  const { data: player } = trpc.player.me.useQuery(undefined, { staleTime: 30_000 });
  const utils = trpc.useUtils();
  const { data: inventoryData, isLoading } = trpc.player.inventory.useQuery(
    { page, limit: PAGE_SIZE },
    { staleTime: 10_000 }
  );

  // 追加新数据
  useEffect(() => {
    if (!inventoryData) return;
    const newItems = (inventoryData.list ?? []) as InventoryItem[];
    if (page === 1) {
      setAllItems(newItems);
    } else {
      setAllItems(prev => [...prev, ...newItems]);
    }
    setHasMore(newItems.length >= PAGE_SIZE);
    setLoadingMore(false);
  }, [inventoryData, page]);

  // 搜索/筛选/排序变化时重置
  const prevSearchRef = useRef(searchText);
  const prevSourceRef = useRef(sourceFilter);
  const prevSortRef = useRef(sortBy);
  useEffect(() => {
    if (prevSearchRef.current !== searchText || prevSourceRef.current !== sourceFilter || prevSortRef.current !== sortBy) {
      setPage(1);
      setAllItems([]);
      setHasMore(true);
      prevSearchRef.current = searchText;
      prevSourceRef.current = sourceFilter;
      prevSortRef.current = sortBy;
    }
  }, [searchText, sourceFilter, sortBy]);

  // 滚动监听
  const handleScroll = useCallback(() => {
    if (!hasMore || loadingMore || isLoading) return;
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      setLoadingMore(true);
      setPage(prev => prev + 1);
    }
  }, [hasMore, loadingMore, isLoading]);

  const extractMutation = trpc.player.extractItem.useMutation({
    onSuccess: (data) => {
      toast.success(`成功提取 ${data.count} 件道具`);
      setSelectedIds(new Set());
      setConfirmModal({ type: null });
      utils.player.inventory.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const recycleMutation = trpc.player.recycleItem.useMutation({
    onSuccess: (data) => {
      toast.success(`成功回收 ${data.count} 件道具，获得 ${data.goldReturned} 金币`);
      setSelectedIds(new Set());
      setConfirmModal({ type: null });
      utils.player.inventory.invalidate();
      utils.player.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const total = inventoryData?.total ?? 0;

  const filteredItems = allItems
    .filter(item => !searchText || (item.itemName ?? '').includes(searchText))
    .filter(item => {
      if (sourceFilter === 'all') return true;
      if (sourceFilter === 'box') return item.source === 'box' || item.source === 'unbox';
      if (sourceFilter === 'arena') return item.source === 'arena';
      if (sourceFilter === 'roll') return item.source === 'roll';
      return true;
    })
    .sort((a, b) =>
      sortBy === 'price'
        ? Number(b.itemValue ?? 0) - Number(a.itemValue ?? 0)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === filteredItems.length
        ? new Set()
        : new Set(filteredItems.map(i => i.id))
    );
  }, [filteredItems]);

  const selectedValue = filteredItems
    .filter(i => selectedIds.has(i.id))
    .reduce((s, i) => s + Number(i.itemValue ?? 0), 0);

  const hasSelected = selectedIds.size > 0;

  const handleDecompose = useCallback(() => {
    if (!hasSelected) return;
    setConfirmModal({ type: 'recycle' });
  }, [hasSelected]);

  const handlePickup = useCallback(() => {
    if (!hasSelected) return;
    setConfirmModal({ type: 'extract' });
  }, [hasSelected]);

  const handleProtect = useCallback(() => {
    if (!hasSelected) return;
    toast.info('提货保护功能即将上线');
  }, [hasSelected]);

  const handleGift = useCallback(() => {
    if (!hasSelected) return;
    toast.info('赠送功能即将上线');
  }, [hasSelected]);

  const handleConfirmAction = () => {
    const ids = Array.from(selectedIds);
    if (confirmModal.type === 'extract') {
      extractMutation.mutate({ ids });
    } else if (confirmModal.type === 'recycle') {
      recycleMutation.mutate({ ids });
    }
  };

  return (
<PageSlideIn>
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
      {/* 全局背景 */}
      <img
        src={B.pageBg}
        alt=""
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100cqw',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          opacity: 0.65,
          pointerEvents: 'none',
        }}
      />

      {/* 内容层 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          overflowY: 'auto',
          paddingBottom: q(160),
        }}
      >
        {/* ── 公共顶部导航 ── */}
        <TopNav
          showLogo={false}
          onSettingsOpen={() => setSettingsVisible(true)}
          settingsOpen={settingsVisible}
        />

        {/* ── 个人信息卡（悬停，负 margin-top让卡片压在内容区上方） ── */}
        <PlayerInfoCard
          style={{
            marginTop: q(-10),
            position: 'relative',
            zIndex: 1,
          }}
        />
        {/* ── 操作按钮行（分解 / 提货 / 提货保护），三态图 ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 5,
            width: q(750),
            height: q(113),
            backgroundImage: `url(${B.actionBarBg})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: q(12),
            marginTop: q(-8),
            padding: `0 ${q(10)}`,
            boxSizing: 'border-box',
          }}
        >
          {/* 分解按钮 */}
          <div
            onClick={handleDecompose}
            style={{
              flex: 1,
              height: q(81),
              maxWidth: q(230),
              backgroundImage: `url(${B.decomposeBtn})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: hasSelected ? 'pointer' : 'not-allowed',
              gap: q(8),
              opacity: hasSelected ? 1 : 0.6,
              position: 'relative',
              zIndex: 30,
            }}
          >
            <img src={hasSelected ? B.decomposeIconOn : B.decomposeIconOff} alt="" style={{ width: q(40), height: q(40) }} />
            <span style={{ color: '#fff', fontSize: q(26), fontWeight: 500 }}>
              分解
            </span>
          </div>

          {/* 提货按钮 */}
          <div
            onClick={handlePickup}
            style={{
              flex: 1,
              height: q(81),
              maxWidth: q(230),
              backgroundImage: `url(${B.pickupBtn})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: hasSelected ? 'pointer' : 'not-allowed',
              gap: q(8),
              opacity: hasSelected ? 1 : 0.6,
              position: 'relative',
              zIndex: 30,
            }}
          >
            <img src={hasSelected ? B.pickupIconOn : B.pickupIconOff} alt="" style={{ width: q(40), height: q(40) }} />
            <span style={{ color: '#fff', fontSize: q(26), fontWeight: 500 }}>
              提货
            </span>
          </div>

          {/* 提货保护按钮 */}
          <div
            onClick={handleProtect}
            style={{
              flex: 1,
              height: q(81),
              maxWidth: q(230),
              backgroundImage: `url(${B.protectBtn})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: hasSelected ? 'pointer' : 'not-allowed',
              gap: q(8),
              opacity: hasSelected ? 1 : 0.6,
              position: 'relative',
              zIndex: 30,
            }}
          >
            <img src={hasSelected ? B.protectIconOn : B.protectIconOff} alt="" style={{ width: q(40), height: q(40) }} />
            <span style={{ color: 'rgba(249,197,255,1)', fontSize: q(26), fontWeight: 500 }}>
              提货保护
            </span>
          </div>
        </div>

        {/* ── 物品列表区域 ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 5,
            width: q(750),
            backgroundImage: `url(${B.listAreaBg})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            paddingBottom: q(220),
          }}
        >
          {/* 赠送提示栏 */}
          <div
            style={{
              width: q(750),
              height: q(62),
              backgroundImage: `url(${B.giftBarBg})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              marginTop: q(20),
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                margin: `${q(15)} 0 0 ${q(215)}`,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                fontSize: q(26),
                fontWeight: 700,
                lineHeight: q(34),
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: '#fff' }}>当前VIP{player?.vipLevel ?? 0},今日可赠送</span>
              <span style={{ color: 'rgba(255,246,13,1)' }}>0</span>
              <span style={{ color: '#fff' }}>次</span>
            </div>
            <img
              src={B.giftIcon}
              alt=""
              style={{ width: q(24), height: q(32), margin: `${q(15)} ${q(69)} 0 ${q(122)}` }}
            />
          </div>

          {/* 来源筛选 Tab */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: q(12),
              margin: `${q(12)} 0 0 ${q(24)}`,
              width: q(702),
            }}
          >
            {(['all', 'box', 'arena', 'roll'] as const).map(src => {
              const labels = { all: '全部', box: '开筱', arena: '竞技场', roll: 'Roll房' };
              const isActive = sourceFilter === src;
              return (
                <div
                  key={src}
                  onClick={() => { setSourceFilter(src); setSelectedIds(new Set()); }}
                  style={{
                    flex: 1,
                    height: q(52),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: q(10),
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(120,40,200,0.9), rgba(180,80,255,0.9))'
                      : 'rgba(30,10,70,0.7)',
                    border: isActive
                      ? '1.5px solid rgba(180,80,255,0.8)'
                      : '1px solid rgba(120,60,200,0.3)',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 0 10px rgba(180,80,255,0.4)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{
                    color: isActive ? '#fff' : 'rgba(180,150,255,0.7)',
                    fontSize: q(22),
                    fontWeight: isActive ? 700 : 400,
                    whiteSpace: 'nowrap',
                  }}>
                    {labels[src]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 搜索+排序栏 */}
          <div
            style={{
              position: 'relative',
              width: q(702),
              height: q(84),
              backgroundImage: `url(${B.searchBarBg})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              margin: `${q(20)} 0 0 ${q(24)}`,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: q(26),
                fontWeight: 500,
                margin: `${q(31)} 0 0 ${q(24)}`,
                whiteSpace: 'nowrap',
                }}
            >
              共{total}件
            </span>
            {/* 搜索框 */}
            <div
              style={{
                height: q(48),
                backgroundImage: `url(${B.searchInputBg})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                width: q(310),
                margin: `${q(19)} 0 0 ${q(16)}`,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <input
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="请输入关键词搜索"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: q(22),
                  lineHeight: q(34),
                  marginLeft: q(24),
                  width: '80%',
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
                gap: q(4),
                margin: `${q(30)} 0 0 ${q(23)}`,
                cursor: 'pointer',
                opacity: sortBy === 'price' ? 1 : 0.55,
              }}
            >
              <img src={B.sortPriceIcon} alt="" style={{ width: q(24), height: q(26), flexShrink: 0 }} />
              <span style={{ color: '#fff', fontSize: q(24), whiteSpace: 'nowrap' }}>价格</span>
            </div>
            {/* 时间排序 */}
            <div
              onClick={() => setSortBy('time')}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: q(4),
                margin: `${q(25)} ${q(23)} 0 ${q(21)}`,
                cursor: 'pointer',
                opacity: sortBy === 'time' ? 1 : 0.55,
              }}
            >
              <img src={B.sortTimeIcon} alt="" style={{ width: q(36), height: q(36), flexShrink: 0 }} />
              <span style={{ color: '#fff', fontSize: q(24), whiteSpace: 'nowrap' }}>时间</span>
            </div>
          </div>

          {/* 物品网格 */}
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: q(300),
                color: 'rgba(180,150,255,0.7)',
                fontSize: q(28),
              }}
            >
              加载中...
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: q(400),
                gap: q(20),
              }}
            >
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/pic1@2x_b3c200a7.png" alt="" style={{ width: q(280), height: q(280), objectFit: 'contain' }} />
              <span style={{ color: 'rgba(180,150,255,0.6)', fontSize: q(26) }}>背包空空如也</span>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(2, ${q(340)})`,
                gap: `${q(22)} ${q(27)}`,
                margin: `${q(20)} 0 0 ${q(22)}`,
              }}
            >
              {/* 加载更多 / 全部加载完毕 提示 */}
              {loadingMore && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${q(24)} 0`, gridColumn: '1 / -1' }}>
                  <div style={{ width: q(36), height: q(36), border: `${q(3)} solid rgba(192,132,252,0.3)`, borderTop: `${q(3)} solid #c084fc`, borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: q(10) }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: q(22) }}>加载更多...</span>
                </div>
              )}
              {!hasMore && allItems.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${q(24)} 0`, gridColumn: '1 / -1' }}>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: q(20) }}>— 已加载全部物品 —</span>
                </div>
              )}
              {filteredItems.map((item, idx) => {
                const isSelected = selectedIds.has(item.id);
                const isRightCol = idx % 2 === 1;
                const value = Number(item.itemValue ?? 0);
                const quality = item.itemQuality ?? 'common';

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    style={{
                      position: 'relative',
                      width: q(340),
                      height: q(260),
                      backgroundImage: isRightCol ? `url(${B.itemCardRightBg})` : 'none',
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundColor: isRightCol ? 'transparent' : 'rgba(36,10,113,1)',
                      borderRadius: q(15),
                      border: isSelected
                        ? `${q(3)} solid rgba(180,80,255,1)`
                        : `${q(3)} solid rgba(0,0,0,1)`,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      boxShadow: isSelected ? '0 0 14px rgba(180,80,255,0.7)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* 物品图片 */}
                    <img
                      src={item.itemImageUrl || B.itemPlaceholder}
                      alt={item.itemName ?? ''}
                      style={{
                        width: q(212),
                        height: q(153),
                        margin: `${q(19)} 0 0 ${q(62)}`,
                        objectFit: 'contain',
                      }}
                      onError={e => { (e.target as HTMLImageElement).src = B.itemPlaceholder; }}
                    />
                    {/* 名称+价格底栏 */}
                    <div
                      style={{
                        backgroundColor: 'rgba(116,78,240,1)',
                        flex: 1,
                        width: q(334),
                        margin: `${q(3)} 0 ${q(8)} ${q(3)}`,
                        padding: `${q(5)} ${q(25)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: q(4),
                      }}
                    >
                      <span
                        style={{
                          color: '#fff',
                          fontSize: q(22),
                          lineHeight: q(30),
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.itemName ?? '未知物品'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: q(6) }}>
                        <img src={B.priceIcon} alt="" style={{ width: q(26), height: q(26) }} />
                        <span
                          style={{
                            color: 'rgba(255,246,13,1)',
                            fontSize: q(24),
                            fontWeight: 700,
                            lineHeight: q(30),
                          }}
                        >
                          {value.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* 品质标签 */}
                    <div
                      style={{
                        position: 'absolute',
                        top: q(8),
                        right: q(8),
                        background: QUALITY_BG[quality] ?? QUALITY_BG.common,
                        borderRadius: q(6),
                        padding: `${q(2)} ${q(10)}`,
                      }}
                    >
                      <span
                        style={{
                          color: '#fff',
                          fontSize: q(18),
                          fontWeight: 700,
                          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {QUALITY_LABELS[quality] ?? '普通'}
                      </span>
                    </div>

                    {/* 选中标记 */}
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: q(8),
                          left: q(8),
                          width: q(32),
                          height: q(32),
                          borderRadius: '50%',
                          backgroundColor: 'rgba(180,80,255,1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span style={{ color: '#fff', fontSize: q(20), lineHeight: 1 }}>✓</span>
                      </div>
                    )}

                    {/* 详情按鈕（左下角） */}
                    <div
                      onClick={e => { e.stopPropagation(); setDetailItem(item); }}
                      style={{
                        position: 'absolute',
                        bottom: q(50),
                        left: q(8),
                        background: 'rgba(0,0,0,0.55)',
                        borderRadius: q(8),
                        padding: `${q(2)} ${q(10)}`,
                        cursor: 'pointer',
                        zIndex: 10,
                      }}
                    >
                      <span style={{ color: 'rgba(200,170,255,1)', fontSize: q(18), fontWeight: 600 }}>详情</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 底部操作栏（全选/赠送/分解） ── */}
          <div
            style={{
              position: 'sticky',
              bottom: q(90),
              left: 0,
              width: q(750),
              height: q(191),
              backgroundImage: `url(${B.bottomBarBg})`,
              backgroundSize: '750px 192px',
              backgroundRepeat: 'no-repeat',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {/* 全选 */}
            <div
              onClick={toggleSelectAll}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: q(6),
                margin: `${q(21)} 0 0 ${q(23)}`,
                cursor: 'pointer',
              }}
            >
              <img src={B.selectAllIcon} alt="" style={{ width: q(42), height: q(42) }} />
              <span
                style={{
                  color: 'rgba(251,244,255,1)',
                  fontSize: q(24),
                  fontWeight: 500,
                  lineHeight: q(34),
                  marginTop: q(10),
                  textShadow: '0 1px 5px rgba(33,0,80,0.67)',
                  whiteSpace: 'nowrap',
                }}
              >
                全选
              </span>
            </div>

            {/* 已选数量 */}
            <span
              style={{
                color: 'rgba(251,244,255,1)',
                fontSize: q(22),
                fontWeight: 500,
                lineHeight: q(34),
                margin: `${q(31)} 0 0 ${q(11)}`,
                textShadow: '0 1px 5px rgba(33,0,80,0.67)',
                whiteSpace: 'nowrap',
              }}
            >
              |&nbsp;{selectedIds.size}/{Math.min(50, filteredItems.length)}件
            </span>

            {/* 金币图标 + 总价值 */}
            <img
              src={B.bottomGoldIcon}
              alt=""
              style={{ width: q(40), height: q(40), margin: `${q(22)} 0 0 ${q(29)}` }}
            />
            <span
              style={{
                color: 'rgba(255,246,13,1)',
                fontSize: q(28),
                fontWeight: 700,
                lineHeight: q(34),
                margin: `${q(32)} 0 0 ${q(11)}`,
                whiteSpace: 'nowrap',
              }}
            >
              {selectedValue.toFixed(0)}
            </span>

            {/* 赠送按钮 */}
            <div
              onClick={handleGift}
              style={{
                height: q(62),
                backgroundImage: `url(${B.giftBtnBg})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                width: q(163),
                margin: `${q(10)} 0 0 ${q(72)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: hasSelected ? 'pointer' : 'not-allowed',
              }}
            >
              <span
                style={{
                  color: 'rgba(251,244,255,1)',
                  fontSize: q(26),
                  fontWeight: 700,
                  lineHeight: q(34),
                  textShadow: '0 1px 5px rgba(33,0,80,0.67)',
                  whiteSpace: 'nowrap',
                }}
              >
                赠送
              </span>
            </div>

            {/* 分解按钮 */}
            <div
              onClick={handleDecompose}
              style={{
                height: q(62),
                backgroundImage: `url(${B.decomposeBtnBg})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                width: q(163),
                margin: `${q(10)} ${q(24)} 0 ${q(14)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: hasSelected ? 'pointer' : 'not-allowed',
              }}
            >
              <span
                style={{
                  color: 'rgba(251,244,255,1)',
                  fontSize: q(26),
                  fontWeight: 700,
                  lineHeight: q(34),
                  textShadow: '0 1px 5px rgba(33,0,80,0.67)',
                  whiteSpace: 'nowrap',
                }}
              >
                分解
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部导航 */}
      <BottomNav active="beibao" />

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      {/* 提取/回收确认弹窗 */}
      {confirmModal.type && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setConfirmModal({ type: null })}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg,#1a0840,#2d0f6b)',
              border: '1.5px solid rgba(160,80,255,0.6)',
              borderRadius: 16,
              padding: '28px 24px',
              width: '80%',
              maxWidth: 320,
              boxShadow: '0 0 40px rgba(120,40,220,0.5)',
            }}
          >
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
              {confirmModal.type === 'extract' ? '确认提货' : '确认分解'}
            </div>
            <div style={{ color: '#c0a0ff', fontSize: 14, marginBottom: 8, textAlign: 'center' }}>
              {confirmModal.type === 'extract'
                ? `确认提取已选的 ${selectedIds.size} 件道具？`
                : `确认分解已选的 ${selectedIds.size} 件道具？`
              }
            </div>
            {confirmModal.type === 'recycle' && (
              <div style={{ color: '#ffd700', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
                将获得 {selectedValue.toFixed(0)} 金币
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => setConfirmModal({ type: null })}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ccc', fontSize: 15, cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={extractMutation.isPending || recycleMutation.isPending}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  background: 'linear-gradient(135deg,#8b2be2,#c084fc)',
                  border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', opacity: (extractMutation.isPending || recycleMutation.isPending) ? 0.6 : 1,
                }}
              >
                {(extractMutation.isPending || recycleMutation.isPending) ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 道具详情弹窗 */}
      {detailItem && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setDetailItem(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg,#1a0840,#2d0f6b)',
              border: '1.5px solid rgba(160,80,255,0.6)',
              borderRadius: 16,
              padding: '24px',
              width: '80%',
              maxWidth: 320,
              boxShadow: '0 0 40px rgba(120,40,220,0.5)',
              textAlign: 'center',
            }}
          >
            <img
              src={detailItem.itemImageUrl ?? B.itemPlaceholder}
              alt={detailItem.itemName ?? ''}
              style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 12, marginBottom: 12 }}
            />
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              {detailItem.itemName ?? '未知道具'}
            </div>
            <div style={{ color: '#ffd700', fontSize: 14, marginBottom: 6 }}>
              价値：{Number(detailItem.itemValue ?? 0).toFixed(0)} 金币
            </div>
            <div style={{ color: '#c0a0ff', fontSize: 12, marginBottom: 6 }}>
              来源：{detailItem.source === 'arena' ? '竞技场' : detailItem.source === 'roll' ? 'Roll房' : '开箱'}
            </div>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
              状态：{detailItem.status === 0 ? '待处理' : detailItem.status === 1 ? '已提取' : '已回收'}
            </div>
            <button
              onClick={() => setDetailItem(null)}
              style={{
                padding: '10px 40px', borderRadius: 8,
                background: 'linear-gradient(135deg,#8b2be2,#c084fc)',
                border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
    <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
    </PageSlideIn>
  );
}
