/**
 * Backpack.tsx — 背包页面
 * 严格还原蓝湖设计稿，使用 CDN 图片资源
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';

const IMG = {
  bg: `${CDN}/66f8df24a63936b3d70aa867242db21b_4067f007.png`,
  userCardBg: `${CDN}/5b14973f8ab73f386b1182a2fc979e40_f3843b19.png`,
  goldBg: `${CDN}/fb10ef5bd83b2e1a7864cf24bb44a18c_70f1a944.png`,
  diamondBg: `${CDN}/cff71f0728fc2e0bff99983813acbb1f_315dc086.png`,
  giftCountBg: `${CDN}/366cc5965045f9551088d199b166e628_61a36078.png`,
  paginationBg: `${CDN}/097f9471937fdb90867e6497e283bdfd_e3a968ab.png`,
  priceSortIcon: `${CDN}/1b8ac55424ce8ab7ad80daf188f581b2_809096c5.png`,
  timeSortIcon: `${CDN}/33a88881278b4762a2a00c211315bb2a_7048c409.png`,
  priceTag: `${CDN}/55e32b342c543fe583d1f65de5e8f4fc_f30ce7fb.png`,
  priceIcon: `${CDN}/e3896d873cf738587ae50f74b2720a8b_086c3e61.png`,
  itemDetailBg: `${CDN}/5dac4a0abd2e4838b1aba8fa4d9a21d7_mergeImage_6a236096.png`,
  sendBtn: `${CDN}/56eab3ad79c143fc808aac18771961e2_mergeImage_1f4ed5ad.png`,
  itemCardBg: `${CDN}/5688d32a86417448b55164d4cb14fd9e_9db9b294.png`,
  itemCardBgSelected: `${CDN}/9a1ced6e492a0c8a9d8db2e2be0e921a_201d9a08.png`,
  // Sample item images
  item1: `${CDN}/e0c8e2812ccd231c8ec0d8ab6943e2c8_4060c0ad.png`,
  item2: `${CDN}/d00316c512a6f938b2a058ba1a46f653_8f86ea8b.png`,
  item3: `${CDN}/1e3be3fe75fa0c0adbe07e1bffaab34d_b2fca442.png`,
  item4: `${CDN}/df439a558f645fbe12c17b4f785e20aa_34f3f4e7.png`,
  // Top bar
  topBar: `${CDN}/941e19f2d0d635d58281e1f6cdad8f99_f0a6b9d2.png`,
  backArrow: `${CDN}/e33f16ef82fdededf3b2fe5e4890e46f_d2a3b4c5.png`,
  // Bottom nav
  bottomNavBg: `${CDN}/6e427840d43f612398e50388b82970c6_cda12438.png`,
  navWode: `${CDN}/3122f1229eddce45807b2d5fba849c8b_ae9637dd.png`,
  navFenxiang: `${CDN}/3fa18b2e3e2c283312bd26e1c624ec1e_e5b6087e.png`,
  navBeibao: `${CDN}/cdc98d58eea0f82317280d74789b0d89_67afd33b.png`,
  navChongzhi: `${CDN}/b4926f25ec6fdfc64ee5d1799d704fcc_36022a62.png`,
  navDatingCenter: `${CDN}/8e38cd263fceb711564aca38e5ad1bac_ac9e64aa.png`,
  // Avatar frame
  avatarFrame: `${CDN}/516e03effb9223801a6c3cd9bbf28cba_f5ce9b8d.png`,
  goldLabel: `${CDN}/671e04db9fa27be8982806a5ebc36cde_c9d0e1f2.png`,
  diamondLabel: `${CDN}/a4be45afba0fb4443a881cf262fbba8d_f5a6b7c8.png`,
};

interface InventoryItem {
  id: number;
  playerId: number;
  itemId: number;
  source: string;
  status: number;
  extractedAt: Date | null;
  recycleGold: string;
  createdAt: Date;
  // 以下为 join 后的 item 字段（可能为 undefined）
  name?: string;
  imageUrl?: string;
  price?: number;
  quality?: string;
}

export default function Backpack() {
  const [, navigate] = useLocation();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'time'>('time');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);

  // 查询用户信息
  const { data: userInfo } = trpc.player.me.useQuery(undefined, { retry: false });

  // 查询背包物品
  const { data: inventoryData, isLoading } = trpc.player.inventory.useQuery(
    { page, limit: 20 },
    { retry: false }
  );

  const items: InventoryItem[] = (inventoryData?.list ?? []) as unknown as InventoryItem[];
  const total = inventoryData?.total ?? 0;

  // 过滤和排序
  const filteredItems = items
    .filter(item => !searchKeyword || item.name?.toLowerCase().includes(searchKeyword.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'price') return (b.price ?? 0) - (a.price ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleSendItem = () => {
    toast.info('赠送功能即将上线，敬请期待');
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#0d0621',
        display: 'flex',
        justifyContent: 'center',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 750,
          position: 'relative',
          background: `url(${IMG.bg}) -675px -64px no-repeat`,
          backgroundSize: '1875px 3468px',
          minHeight: '100vh',
        }}
      >
        {/* 顶部装饰条 */}
        <img
          src={IMG.topBar}
          alt=""
          style={{ width: '87.6%', height: 'auto', margin: '31px 0 0 8.4%', display: 'block' }}
        />

        {/* 顶部导航 */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '52px 8.5% 0', height: 57 }}>
          <img
            src={IMG.backArrow}
            alt="返回"
            style={{ width: 18, height: 16, cursor: 'pointer', marginTop: 21 }}
            onClick={() => navigate('/')}
          />
          <span style={{
            color: '#fff',
            fontSize: 30,
            fontWeight: 500,
            fontFamily: 'Alibaba-PuHuiTi-M, PingFang SC, sans-serif',
            flex: 1,
            textAlign: 'center',
          }}>
            背包
          </span>
        </div>

        {/* 用户信息卡 */}
        <div style={{ margin: '54px 8.5% 0', position: 'relative' }}>
          <div style={{
            background: `url(${IMG.userCardBg}) 0px 0px no-repeat`,
            backgroundSize: '626px 119px',
            width: '100%',
            maxWidth: 625,
            height: 119,
            position: 'relative',
          }}>
            {/* 金币 */}
            <div style={{
              background: `url(${IMG.goldBg}) 100% no-repeat`,
              backgroundSize: '100% 100%',
              width: 133,
              height: 34,
              position: 'absolute',
              top: 20,
              right: 155,
              display: 'flex',
              alignItems: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 26, fontWeight: 500, marginLeft: 40 }}>
                {userInfo?.gold ?? 0}
              </span>
              <img src={`${CDN}/13987d2edf7fad42c5fd4db5eadd7563_b7c8d9e0.png`} alt="" style={{ width: 10, height: 19, margin: '0 12px 0 10px' }} />
              <img src={IMG.goldLabel} alt="" style={{ position: 'absolute', left: -13, top: -2, width: 41, height: 37 }} />
            </div>
            {/* 钻石 */}
            <div style={{
              background: `url(${IMG.diamondBg}) 100% no-repeat`,
              backgroundSize: '100% 100%',
              width: 133,
              height: 34,
              position: 'absolute',
              top: 20,
              right: 12,
              display: 'flex',
              alignItems: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 26, fontWeight: 700, marginLeft: 38 }}>
                {userInfo?.diamond ?? 0}
              </span>
              <img src={`${CDN}/8b31528f16c7cf8020e105129284d8f5_e3f4a5b6.png`} alt="" style={{ width: 10, height: 19, margin: '0 15px 0 10px' }} />
              <img src={IMG.diamondLabel} alt="" style={{ position: 'absolute', left: -20, top: -3, width: 40, height: 40 }} />
            </div>

            {/* 头像框 */}
            <div style={{
              position: 'absolute',
              left: -38,
              top: -57,
              width: 160,
              height: 179,
              background: `url(${IMG.avatarFrame}) -11px 0px no-repeat`,
              backgroundSize: '171px 179px',
            }}>
              <div style={{
                background: 'rgba(46,30,98,1)',
                borderRadius: '50%',
                width: 117,
                height: 117,
                border: '2px solid rgba(0,0,0,1)',
                margin: '20px 0 0 28px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {userInfo?.avatar ? (
                  <img src={userInfo.avatar} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#9980cc', fontSize: 40 }}>👤</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 赠送次数提示 */}
        <div style={{
          background: `url(${IMG.giftCountBg}) 100% no-repeat`,
          backgroundSize: '100% 100%',
          width: 625,
          height: 42,
          margin: '12px 0 0 62px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
        }}>
          <span style={{ color: '#fff', fontSize: 22 }}>
            当前VIP{userInfo?.vipLevel ?? 1}，今日可赠送
          </span>
          <span style={{ color: 'rgba(255,246,13,1)', fontSize: 22, fontWeight: 700, margin: '0 4px' }}>0</span>
          <span style={{ color: '#fff', fontSize: 22 }}>次</span>
        </div>

        {/* 选中物品详情 */}
        {selectedItem && (
          <div style={{
            background: `url(${IMG.itemDetailBg}) 100% no-repeat`,
            backgroundSize: '100% 100%',
            width: 625,
            height: 212,
            margin: '12px 0 0 62px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 20,
          }}>
                <img src={selectedItem.imageUrl || IMG.item1} alt={selectedItem.name ?? '物品'} style={{ width: 160, height: 160, objectFit: 'contain' }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 26, fontWeight: 500 }}>{selectedItem.name ?? `物品#${selectedItem.itemId}`}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <img src={IMG.priceIcon} alt="价格" style={{ width: 30, height: 30 }} />
                <span style={{ color: 'rgba(255,246,13,1)', fontSize: 28, fontWeight: 700 }}>{selectedItem.price?.toFixed(2) ?? selectedItem.recycleGold}</span>
              </div>
              <div style={{ color: 'rgba(249,178,255,1)', fontSize: 22, marginTop: 8 }}>{selectedItem.quality ?? '普通'}</div>
            </div>
            {/* 赠送按钮 */}
            <div
              onClick={handleSendItem}
              style={{
                background: `url(${IMG.sendBtn}) 100% no-repeat`,
                backgroundSize: '100% 100%',
                width: 120,
                height: 48,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>赠送</span>
            </div>
          </div>
        )}

        {/* 搜索和排序栏 */}
        <div style={{
          width: 625,
          margin: '12px 0 0 62px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ color: '#fff', fontSize: 22, flexShrink: 0 }}>共{total}件</span>
          <div style={{
            flex: 1,
            height: 52,
            background: 'rgba(20,8,50,0.7)',
            border: '1px solid rgba(120,60,220,0.3)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
          }}>
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="请输入关键词搜索"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: 22,
                width: '100%',
              }}
            />
          </div>
          <div
            onClick={() => setSortBy('price')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              opacity: sortBy === 'price' ? 1 : 0.6,
            }}
          >
            <img src={IMG.priceSortIcon} alt="价格" style={{ width: 30, height: 30 }} />
            <span style={{ color: sortBy === 'price' ? 'rgba(255,246,13,1)' : '#fff', fontSize: 22 }}>价格</span>
          </div>
          <div
            onClick={() => setSortBy('time')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              opacity: sortBy === 'time' ? 1 : 0.6,
            }}
          >
            <img src={IMG.timeSortIcon} alt="时间" style={{ width: 30, height: 30 }} />
            <span style={{ color: sortBy === 'time' ? 'rgba(255,246,13,1)' : '#fff', fontSize: 22 }}>时间</span>
          </div>
        </div>

        {/* 物品网格 */}
        <div style={{
          width: 625,
          margin: '12px 0 0 62px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {isLoading ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#9980cc', padding: '40px 0', fontSize: 22 }}>
              加载中...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#9980cc', padding: '40px 0', fontSize: 22 }}>
              背包空空如也
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                style={{
                  background: `url(${selectedItem?.id === item.id ? IMG.itemCardBgSelected : IMG.itemCardBg}) 100% no-repeat`,
                  backgroundSize: '100% 100%',
                  height: 200,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  borderRadius: 8,
                }}
              >
                <img
                  src={item.imageUrl || IMG.item1}
                  alt={item.name ?? '物品'}
                  style={{ width: '80%', height: 120, objectFit: 'contain' }}
                />
                <div style={{
                  color: '#fff',
                  fontSize: 18,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                  padding: '0 4px',
                  marginTop: 4,
                }}>
                  {item.name ?? `物品#${item.itemId}`}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <img src={IMG.priceIcon} alt="" style={{ width: 20, height: 20 }} />
                  <span style={{ color: 'rgba(255,246,13,1)', fontSize: 20, fontWeight: 700 }}>
                    {item.price?.toFixed(2) ?? item.recycleGold}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 分页 */}
        {total > 20 && (
          <div style={{
            background: `url(${IMG.paginationBg}) 100% no-repeat`,
            backgroundSize: '100% 100%',
            width: 625,
            height: 52,
            margin: '12px 0 0 62px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ background: 'transparent', border: 'none', color: page === 1 ? '#555' : '#fff', fontSize: 22, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              ‹
            </button>
            <span style={{ color: '#fff', fontSize: 22 }}>
              {page} / {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 20)}
              style={{ background: 'transparent', border: 'none', color: page >= Math.ceil(total / 20) ? '#555' : '#fff', fontSize: 22, cursor: page >= Math.ceil(total / 20) ? 'not-allowed' : 'pointer' }}
            >
              ›
            </button>
          </div>
        )}

        {/* 底部导航 */}
        <div style={{
          width: '100%',
          height: 125,
          background: `url(${IMG.bottomNavBg}) -52px 0px no-repeat`,
          backgroundSize: '854px 126px',
          marginTop: 32,
          display: 'flex',
          alignItems: 'center',
        }}>
          {/* 我的 */}
          <div
            onClick={() => navigate('/profile')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', width: 49, height: 80, margin: '37px 0 0 70px', cursor: 'pointer' }}
          >
            <div style={{
              width: 47, height: 48,
              background: `url(${IMG.navWode}) 100% no-repeat`,
              backgroundSize: '100% 100%',
              marginLeft: 1,
            }} />
            <span style={{ color: 'rgba(217,148,255,1)', fontSize: 26, fontWeight: 500, textShadow: '0px 1px 5px rgba(33,0,80,0.67)' }}>我的</span>
          </div>

          {/* 分享 */}
          <div
            onClick={() => navigate('/share')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', width: 55, height: 81, margin: '36px 0 0 82px', cursor: 'pointer' }}
          >
            <div style={{
              width: 51, height: 51,
              background: `url(${IMG.navFenxiang}) 100% no-repeat`,
              backgroundSize: '100% 100%',
              marginLeft: 4,
            }} />
            <span style={{ color: 'rgba(217,148,255,1)', fontSize: 26, fontWeight: 500, textShadow: '0px 1px 5px rgba(33,0,80,0.67)' }}>分享</span>
          </div>

          {/* 大厅（中间） */}
          <div
            onClick={() => navigate('/')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 80, margin: '0 0 0 70px', cursor: 'pointer', marginTop: -20 }}
          >
            <img src={IMG.navDatingCenter} alt="大厅" style={{ width: 80, height: 67 }} />
            <span style={{ color: 'rgba(217,148,255,1)', fontSize: 26, fontWeight: 500, textShadow: '0px 1px 5px rgba(33,0,80,0.67)' }}>大厅</span>
          </div>

          {/* 背包（激活） */}
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', width: 57, height: 82, margin: '35px 0 0 70px', cursor: 'pointer' }}
          >
            <img src={IMG.navBeibao} alt="背包" style={{ width: 57, height: 51 }} />
            <span style={{ color: 'rgba(250,107,209,1)', fontSize: 26, fontWeight: 700, textShadow: '0px 1px 5px rgba(33,0,80,0.67)', marginLeft: 3 }}>背包</span>
          </div>

          {/* 充值 */}
          <div
            onClick={() => navigate('/deposit')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', width: 51, height: 83, margin: '35px 61px 0 40px', cursor: 'pointer' }}
          >
            <div style={{
              width: 48, height: 51,
              background: `url(${IMG.navChongzhi}) 100% no-repeat`,
              backgroundSize: '100% 100%',
              marginLeft: 2,
            }} />
            <span style={{ color: 'rgba(217,148,255,1)', fontSize: 26, fontWeight: 500, textShadow: '0px 1px 5px rgba(33,0,80,0.67)', marginTop: 7 }}>充值</span>
          </div>
        </div>
      </div>
    </div>
  );
}
