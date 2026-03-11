/**
 * Shop.tsx — 商城页面
 * 商品列表实时从 cs2pifa API 读取，不存数据库
 * 玩家购买时扣除 shopCoin，写入 shopOrders 订单表
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import SettingsModal from '@/components/SettingsModal';
import { toast } from 'sonner';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';
const S = {
  pageBg:       `${CDN}/66f8df24a63936b3d70aa867242db21b_02819819.png`,
  searchBarBg:  `${CDN}/29f82e47f68c4a388031776b987b74d2_948e677d.png`,
  searchInputBg:`${CDN}/fae0a187b50cc09e38fec1ea7d891cc6_9a485d37.png`,
  sortPriceIcon:`${CDN}/1b8ac55424ce8ab7ad80daf188f581b2_444e5a5f.png`,
  listAreaBg:   `${CDN}/dd9d606dbac17e485789e175b46e7609_4b3836d8.png`,
  priceIcon:    `${CDN}/e3896d873cf738587ae50f74b2720a8b_0be27e5d.png`,
};

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// 稀有度颜色映射
const RARITY_COLOR: Record<string, string> = {
  '传说': 'linear-gradient(135deg,#c8860a,#f5c842)',
  '史诗': 'linear-gradient(135deg,#6a0dad,#c084fc)',
  '稀有': 'linear-gradient(135deg,#1a4fa8,#60a5fa)',
  '普通': 'linear-gradient(135deg,#4a4a4a,#9a9a9a)',
  '军规': 'linear-gradient(135deg,#1a4fa8,#60a5fa)',
  '受限': 'linear-gradient(135deg,#6a0dad,#c084fc)',
  '保密': 'linear-gradient(135deg,#c8860a,#f5c842)',
  '隐秘': 'linear-gradient(135deg,#8b0000,#ff4444)',
};

function getRarityColor(rarityName: string) {
  for (const [key, val] of Object.entries(RARITY_COLOR)) {
    if (rarityName?.includes(key)) return val;
  }
  return 'linear-gradient(135deg,#4a4a4a,#9a9a9a)';
}

interface Cs2Product {
  typeId: number;
  typeName: string;
  templateId: number;
  templateHashName: string;
  templateName: string;
  iconUrl: string;
  exteriorName: string;
  rarityName: string;
  referencePrice: number;
  minSellPrice: number;
  sellNum: number;
}

// ── 商品卡片 ──────────────────────────────────────────────────────────────────
function ShopItemCard({ item, onBuy }: { item: Cs2Product; onBuy: () => void }) {
  return (
    <div
      onClick={onBuy}
      style={{
        position: 'relative',
        borderRadius: q(16),
        overflow: 'hidden',
        background: 'linear-gradient(160deg,rgba(30,10,65,0.95) 0%,rgba(15,5,40,0.98) 100%)',
        border: '1px solid rgba(120,60,220,0.35)',
        boxShadow: '0 2px 12px rgba(80,20,160,0.25)',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(168,85,247,0.4)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(80,20,160,0.25)';
      }}
    >
      {/* 稀有度色条 */}
      <div style={{
        height: q(6),
        background: getRarityColor(item.rarityName || ''),
      }} />

      {/* 商品图片 */}
      <div style={{
        padding: `${q(12)} ${q(12)} 0`,
        display: 'flex',
        justifyContent: 'center',
      }}>
        <img
          src={item.iconUrl}
          alt={item.templateName}
          style={{
            width: q(180),
            height: q(140),
            objectFit: 'contain',
          }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
        />
      </div>

      {/* 商品信息 */}
      <div style={{ padding: `${q(8)} ${q(12)} ${q(12)}` }}>
        {/* 名称 */}
        <div style={{
          color: '#e0d0ff',
          fontSize: q(22),
          fontWeight: 600,
          lineHeight: 1.3,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          minHeight: q(58),
        }}>
          {item.templateName}
        </div>
        {/* 磨损 */}
        {item.exteriorName && (
          <div style={{
            color: '#9980cc',
            fontSize: q(20),
            marginTop: q(4),
          }}>
            {item.exteriorName}
          </div>
        )}
        {/* 价格 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: q(6),
          marginTop: q(8),
        }}>
          <img src={S.priceIcon} alt="" style={{ width: q(28), height: q(28) }} />
          <span style={{
            color: '#ffd700',
            fontSize: q(28),
            fontWeight: 700,
          }}>
            {item.referencePrice.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 购买确认弹窗 ──────────────────────────────────────────────────────────────
function BuyModal({
  item,
  balance,
  onConfirm,
  onCancel,
  loading,
}: {
  item: Cs2Product;
  balance: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const canAfford = balance >= item.referencePrice;
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 200,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'flex-end',
    }}>
      <div style={{
        width: '100%',
        background: 'linear-gradient(180deg,rgba(25,8,60,0.98) 0%,rgba(10,3,30,1) 100%)',
        border: '1px solid rgba(120,60,220,0.5)',
        borderRadius: `${q(24)} ${q(24)} 0 0`,
        padding: `${q(32)} ${q(24)} ${q(48)}`,
      }}>
        <div style={{ textAlign: 'center', color: '#e0d0ff', fontSize: q(32), fontWeight: 700, marginBottom: q(24) }}>
          确认购买
        </div>
        <div style={{ display: 'flex', gap: q(20), alignItems: 'center', marginBottom: q(24) }}>
          <img src={item.iconUrl} alt="" style={{ width: q(140), height: q(110), objectFit: 'contain' }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#e0d0ff', fontSize: q(26), fontWeight: 600, lineHeight: 1.4 }}>
              {item.templateName}
            </div>
            {item.exteriorName && (
              <div style={{ color: '#9980cc', fontSize: q(22), marginTop: q(6) }}>{item.exteriorName}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: q(6), marginTop: q(10) }}>
              <img src={S.priceIcon} alt="" style={{ width: q(28), height: q(28) }} />
              <span style={{ color: '#ffd700', fontSize: q(32), fontWeight: 700 }}>
                {item.referencePrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        {/* 余额提示 */}
        <div style={{
          background: 'rgba(120,60,220,0.15)',
          border: '1px solid rgba(120,60,220,0.3)',
          borderRadius: q(12),
          padding: `${q(12)} ${q(16)}`,
          marginBottom: q(24),
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ color: '#9980cc', fontSize: q(24) }}>当前余额</span>
          <span style={{ color: canAfford ? '#ffd700' : '#ff4444', fontSize: q(28), fontWeight: 700 }}>
            {balance.toFixed(2)} 商城币
          </span>
        </div>
        {!canAfford && (
          <div style={{ color: '#ff4444', fontSize: q(22), textAlign: 'center', marginBottom: q(16) }}>
            余额不足，请先充值商城币
          </div>
        )}
        <div style={{ display: 'flex', gap: q(16) }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: q(24),
              borderRadius: q(12),
              border: '1px solid rgba(120,60,220,0.4)',
              background: 'rgba(20,8,50,0.8)',
              color: '#9980cc',
              fontSize: q(28),
              cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!canAfford || loading}
            style={{
              flex: 2,
              padding: q(24),
              borderRadius: q(12),
              border: 'none',
              background: canAfford
                ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                : 'rgba(80,40,120,0.4)',
              color: canAfford ? '#fff' : '#666',
              fontSize: q(28),
              fontWeight: 700,
              cursor: canAfford && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? '处理中...' : '确认购买'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function Shop() {
  const [searchText, setSearchText] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>(undefined);
  const [sortDesc, setSortDesc] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [buyItem, setBuyItem] = useState<Cs2Product | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);

  const { data: playerData } = trpc.player.me.useQuery(undefined, { staleTime: 30_000 });

  // 获取分类（一次性加载）
  const { data: categories = [], isLoading: catsLoading } = trpc.shop.getCategories.useQuery(undefined, {
    staleTime: 5 * 60_000,
    retry: 2,
  });

  // 获取商品列表（实时API）
  const { data, isLoading, error } = trpc.shop.getProducts.useQuery({
    typeId: selectedTypeId,
    keyword: searchText || undefined,
    sortDesc,
    pageNum,
    pageSize: 20,
  }, {
    staleTime: 30_000,
    retry: 1,
  });

  const buyMutation = trpc.shop.buyProduct.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || '购买成功');
      setBuyItem(null);
      setBuyLoading(false);
    },
    onError: (err) => {
      toast.error(err.message || '购买失败');
      setBuyLoading(false);
    },
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const balance = parseFloat(playerData?.shopCoin || '0');

  const handleBuy = () => {
    if (!buyItem) return;
    if (!playerData) { toast.error('请先登录'); return; }
    setBuyLoading(true);
    buyMutation.mutate({
      templateId: buyItem.templateId,
      templateName: buyItem.templateName,
      iconUrl: buyItem.iconUrl,
      referencePrice: buyItem.referencePrice,
    });
  };

  return (
    <div
      className="phone-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        containerType: 'inline-size',
        position: 'relative',
      }}
    >
        {/* 背景图 */}
        <img
          src={S.pageBg}
          alt=""
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />

        {/* 内容层 */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', paddingBottom: q(100) }}>
          {/* 顶部导航 */}
          <TopNav onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
          {/* 个人信息卡 */}
          <PlayerInfoCard style={{ marginTop: q(10) }} />

          {/* 页面标题 */}
          <div style={{
            margin: `${q(16)} ${q(20)} ${q(8)}`,
            color: '#e0d0ff',
            fontSize: q(32),
            fontWeight: 700,
            letterSpacing: 1,
          }}>
            🛒 商城
          </div>

          {/* 分类标签栏 */}
          <div style={{
            display: 'flex',
            gap: q(12),
            padding: `${q(4)} ${q(20)} ${q(8)}`,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}>
            <button
              onClick={() => { setSelectedTypeId(undefined); setPageNum(1); }}
              style={{
                flexShrink: 0,
                padding: `${q(8)} ${q(20)}`,
                borderRadius: q(20),
                border: `1px solid ${!selectedTypeId ? '#a855f7' : 'rgba(120,60,220,0.4)'}`,
                background: !selectedTypeId ? 'rgba(168,85,247,0.25)' : 'rgba(20,8,50,0.7)',
                color: !selectedTypeId ? '#e0d0ff' : '#9980cc',
                fontSize: q(24),
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              全部
            </button>
            {catsLoading ? (
              <span style={{ color: '#9980cc', fontSize: q(22), alignSelf: 'center' }}>加载分类...</span>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.typeId}
                  onClick={() => { setSelectedTypeId(cat.typeId); setPageNum(1); }}
                  style={{
                    flexShrink: 0,
                    padding: `${q(8)} ${q(20)}`,
                    borderRadius: q(20),
                    border: `1px solid ${selectedTypeId === cat.typeId ? '#a855f7' : 'rgba(120,60,220,0.4)'}`,
                    background: selectedTypeId === cat.typeId ? 'rgba(168,85,247,0.25)' : 'rgba(20,8,50,0.7)',
                    color: selectedTypeId === cat.typeId ? '#e0d0ff' : '#9980cc',
                    fontSize: q(24),
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.typeName}
                </button>
              ))
            )}
          </div>

          {/* 搜索+排序栏 */}
          <div
            style={{
              margin: `${q(8)} ${q(20)}`,
              backgroundImage: `url(${S.searchBarBg})`,
              backgroundSize: '100% 100%',
              padding: `${q(12)} ${q(16)}`,
              display: 'flex',
              alignItems: 'center',
              gap: q(12),
              borderRadius: q(12),
            }}
          >
            <div style={{
              flex: 1,
              backgroundImage: `url(${S.searchInputBg})`,
              backgroundSize: '100% 100%',
              borderRadius: q(8),
              padding: `${q(8)} ${q(16)}`,
              display: 'flex',
              alignItems: 'center',
            }}>
              <input
                value={searchText}
                onChange={e => { setSearchText(e.target.value); setPageNum(1); }}
                placeholder="请输入关键词搜索"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#e0d0ff',
                  fontSize: q(24),
                  width: '100%',
                }}
              />
            </div>
            <button
              onClick={() => { setSortDesc(v => !v); setPageNum(1); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: q(4),
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#9980cc',
                fontSize: q(22),
              }}
            >
              <img src={S.sortPriceIcon} alt="" style={{ width: q(24), height: q(24) }} />
              价格{sortDesc ? '↓' : '↑'}
            </button>
          </div>

          {/* 商品列表区域 */}
          <div
            style={{
              margin: `0 ${q(20)}`,
              backgroundImage: `url(${S.listAreaBg})`,
              backgroundSize: '100% 100%',
              borderRadius: q(16),
              padding: q(16),
              minHeight: q(400),
            }}
          >
            {isLoading ? (
              <div style={{ textAlign: 'center', color: '#9980cc', padding: q(80), fontSize: q(28) }}>
                <div style={{ fontSize: q(48), marginBottom: q(16) }}>⏳</div>
                正在加载商品...
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: q(80), fontSize: q(26) }}>
                {error.message?.includes('RATE_LIMITED') ? (
                  <>
                    <div style={{ fontSize: q(56), marginBottom: q(16) }}>🕐</div>
                    <div style={{ color: '#e0d0ff', fontWeight: 700, fontSize: q(28), marginBottom: q(12) }}>
                      商城正在繁忙，请稍后重试
                    </div>
                    <div style={{ color: '#9980cc', fontSize: q(22), marginBottom: q(24) }}>
                      服务器请求频率限制，约1分钟后自动恢复
                    </div>
                    <button
                      onClick={() => window.location.reload()}
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        border: 'none',
                        borderRadius: q(12),
                        color: '#fff',
                        fontSize: q(26),
                        fontWeight: 700,
                        padding: `${q(14)} ${q(40)}`,
                        cursor: 'pointer',
                      }}
                    >
                      点击重试
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: q(48), marginBottom: q(16) }}>⚠️</div>
                    <div style={{ color: '#ff6b6b' }}>加载失败，请稍后重试</div>
                    <div style={{ color: '#9980cc', fontSize: q(22), marginTop: q(8) }}>
                      {error.message}
                    </div>
                    <button
                      onClick={() => window.location.reload()}
                      style={{
                        marginTop: q(20),
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        border: 'none',
                        borderRadius: q(12),
                        color: '#fff',
                        fontSize: q(26),
                        fontWeight: 700,
                        padding: `${q(14)} ${q(40)}`,
                        cursor: 'pointer',
                      }}
                    >
                      点击重试
                    </button>
                  </>
                )}
              </div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9980cc', padding: q(80), fontSize: q(28) }}>
                <div style={{ fontSize: q(48), marginBottom: q(16) }}>🔍</div>
                暂无相关商品
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: q(16),
              }}>
                {items.map((item) => (
                  <ShopItemCard
                    key={item.templateId}
                    item={item as Cs2Product}
                    onBuy={() => setBuyItem(item as Cs2Product)}
                  />
                ))}
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: q(16),
                marginTop: q(24),
                paddingBottom: q(8),
              }}>
                <button
                  onClick={() => setPageNum(p => Math.max(1, p - 1))}
                  disabled={pageNum <= 1}
                  style={{
                    padding: `${q(8)} ${q(20)}`,
                    borderRadius: q(8),
                    border: '1px solid rgba(120,60,220,0.4)',
                    background: pageNum <= 1 ? 'rgba(20,8,50,0.4)' : 'rgba(20,8,50,0.8)',
                    color: pageNum <= 1 ? '#555' : '#9980cc',
                    fontSize: q(24),
                    cursor: pageNum <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  上一页
                </button>
                <span style={{ color: '#9980cc', fontSize: q(24) }}>
                  {pageNum} / {totalPages}
                </span>
                <button
                  onClick={() => setPageNum(p => Math.min(totalPages, p + 1))}
                  disabled={pageNum >= totalPages}
                  style={{
                    padding: `${q(8)} ${q(20)}`,
                    borderRadius: q(8),
                    border: '1px solid rgba(120,60,220,0.4)',
                    background: pageNum >= totalPages ? 'rgba(20,8,50,0.4)' : 'rgba(20,8,50,0.8)',
                    color: pageNum >= totalPages ? '#555' : '#9980cc',
                    fontSize: q(24),
                    cursor: pageNum >= totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 底部导航 */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <BottomNav active="shop" />
        </div>

        {/* 购买弹窗 */}
        {buyItem && (
          <BuyModal
            item={buyItem}
            balance={balance}
            onConfirm={handleBuy}
            onCancel={() => setBuyItem(null)}
            loading={buyLoading}
          />
        )}

        {/* 设置弹窗 */}
        {settingsVisible && (
          <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
        )}
    </div>
  );
}
