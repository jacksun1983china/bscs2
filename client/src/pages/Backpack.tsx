/**
 * Backpack.tsx — 背包页面（蓝湖 lanhu_beibao 设计稿还原）
 * 布局：顶部返回+标题 → 个人信息卡(用户卡+金币/钻石+操作按钮) → 赠送提示栏 → 搜索排序栏 → 物品2列网格 → 底部操作栏 → 底部导航
 */
import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import BottomNav from '@/components/BottomNav';
import SettingsModal from '@/components/SettingsModal';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';
const B = {
  // 页面背景
  pageBg:          `${CDN}/66f8df24a63936b3d70aa867242db21b_02819819.png`,
  // 顶部装饰线
  topLine:         `${CDN}/865881086c8e42fdb565ab88ac0ef070_29355356.png`,
  // 金币背景按钮
  goldBg:          `${CDN}/fb10ef5bd83b2e1a7864cf24bb44a18c_18295927.png`,
  // 金币小箭头
  goldArrow:       `${CDN}/3a6e9188d633c1cd21593ed8408133ac_ea9ac85e.png`,
  // 金币图标（左侧突出）
  goldIcon:        `${CDN}/68d06572b4e879a9acfe7460f8439bf3_1573815c.png`,
  // 钻石背景按钮
  diamondBg:       `${CDN}/cff71f0728fc2e0bff99983813acbb1f_15ac454b.png`,
  // 钻石小箭头
  diamondArrow:    `${CDN}/e8630520d5bfdf8213ff84c3595f73d4_63d7acdc.png`,
  // 钻石图标（左侧突出）
  diamondIcon:     `${CDN}/9fb72832b51833b2da1905142fd086f6_ed828fea.png`,
  // 操作栏背景（分解+提货保护）
  actionBarBg:     `${CDN}/a1c5c21f376aab93e300ed064501e957_9723c289.png`,
  // 分解按钮背景
  decomposeBtn:    `${CDN}/8b82a0f1b0eb8732c1fba806be0e2e7a_3123f506.png`,
  // 分解图标
  decomposeIcon:   `${CDN}/b400f59987e35b6feab1e589f258d441_711b5c26.png`,
  // 提货保护按钮背景
  protectBtn:      `${CDN}/4b4347a608aefc62a0e9822e249126de_67ffa359.png`,
  // 提货保护图标
  protectIcon:     `${CDN}/97de6f517430fe6063bab8e92561260d_d76a16f3.png`,
  // 用户信息卡背景
  userCardBg:      `${CDN}/b4173b907690ed51e12a772ecbfd5cb5_0a3f6831.png`,
  // 徽章
  badge:           `${CDN}/8a5e64a15da16b7f306028bf0963d5cf_83551751.png`,
  // 分割线
  divider:         `${CDN}/5df230a2c95e6ab12bdc6b77da771414_a32ecef0.png`,
  // 提货按钮背景
  extractBtn:      `${CDN}/5688d32a86417448b55164d4cb14fd9e_c0d36ef4.png`,
  // 提货图标
  extractIcon:     `${CDN}/426e41da3ba763c4a3dedee2d8088c21_02dafe77.png`,
  // VIP标签背景
  vipTagBg:        `${CDN}/8116c7a7702a34b92537d1a8a6ed31f2_839e49b5.png`,
  // 右侧tab图标1
  tabIcon1:        `${CDN}/69681f88ade804a3620928ce1ff33026_023c2c8e.png`,
  // 右侧tab图标2
  tabIcon2:        `${CDN}/3bb6e8a2fd9db1d488cfe3821090fc12_a7b57fad.png`,
  // 右侧tab图标3（设置）
  tabIcon3:        `${CDN}/424b4a7980c3bfdb5f0e8c56c995376a_9bd1fa56.png`,
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
  // 返回按钮
  backBtn:         `${CDN}/9a1ced6e492a0c8a9d8db2e2be0e921a_1beb4fa6.png`,
};

// 750px 基准转换为 cqw
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// 品质颜色
const QUALITY_COLORS: Record<string, string> = {
  legendary: '#f5c842',
  epic:      '#c084fc',
  rare:      '#60a5fa',
  common:    '#9ca3af',
};
const QUALITY_LABELS: Record<string, string> = {
  legendary: '传说',
  epic:      '史诗',
  rare:      '稀有',
  common:    '普通',
};
const QUALITY_BG: Record<string, string> = {
  legendary: 'linear-gradient(135deg,#c8860a,#f5c842)',
  epic:      'linear-gradient(135deg,#6a0dad,#c084fc)',
  rare:      'linear-gradient(135deg,#1a4fa8,#60a5fa)',
  common:    'linear-gradient(135deg,#4a4a4a,#9a9a9a)',
};

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
  const [, navigate] = useLocation();
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'time'>('time');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [settingsVisible, setSettingsVisible] = useState(false);

  const { data: player } = trpc.player.me.useQuery(undefined, { staleTime: 30_000 });
  const { data: inventoryData, isLoading } = trpc.player.inventory.useQuery(
    { page: 1, limit: 50 },
    { staleTime: 10_000 }
  );

  const rawItems: InventoryItem[] = (inventoryData?.list ?? []) as InventoryItem[];
  const total = inventoryData?.total ?? 0;

  const filteredItems = rawItems
    .filter(item => !searchText || (item.itemName ?? '').includes(searchText))
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

  const gold = Number(player?.gold ?? 0);
  const diamond = Number(player?.diamond ?? 0);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0621',
        containerType: 'inline-size',
        overflow: 'hidden',
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
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          overflowY: 'auto',
          paddingBottom: q(160),
        }}
      >
        {/* ── 顶部装饰线 ── */}
        <img
          src={B.topLine}
          alt=""
          style={{ width: q(657), height: q(26), marginTop: q(31), marginLeft: q(63), display: 'block' }}
        />

        {/* ── 顶部区域（相对定位容器，高度 468px） ── */}
        <div style={{ position: 'relative', width: q(750), height: q(468) }}>

          {/* 返回按钮 */}
          <img
            src={B.backBtn}
            alt="返回"
            onClick={() => navigate('/')}
            style={{
              position: 'absolute',
              left: q(24),
              top: q(51),
              width: q(50),
              height: q(50),
              cursor: 'pointer',
              zIndex: 10,
            }}
          />

          {/* 标题 + 右侧图标 */}
          <div
            style={{
              position: 'absolute',
              top: q(51),
              left: q(347),
              width: q(378),
              height: q(59),
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: q(30),
                fontWeight: 500,
                lineHeight: q(34),
                marginTop: q(16),
                whiteSpace: 'nowrap',
              }}
            >
              背包
            </span>
            <img src={B.tabIcon1} alt="" style={{ width: q(59), height: q(59), marginLeft: q(190) }} />
            <img src={B.tabIcon2} alt="" style={{ width: q(59), height: q(59), marginLeft: q(13) }} />
          </div>

          {/* 金币/钻石栏 */}
          <div
            style={{
              position: 'absolute',
              top: q(51 + 59 + 53),
              left: q(125),
              width: q(625),
              height: q(119),
              backgroundImage: `url(${B.searchInputBg})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* 设置图标 */}
            <img
              src={B.tabIcon3}
              alt=""
              onClick={() => setSettingsVisible(true)}
              style={{
                width: q(35),
                height: q(35),
                position: 'absolute',
                top: q(20),
                left: q(542),
                cursor: 'pointer',
              }}
            />
            {/* 金币 + 钻石 */}
            <div
              style={{
                position: 'absolute',
                top: q(20 + 35 + 20),
                left: q(308),
                width: q(293),
                height: q(34),
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              {/* 金币按钮 */}
              <div
                style={{
                  position: 'relative',
                  width: q(133),
                  height: q(34),
                  backgroundImage: `url(${B.goldBg})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    color: '#fff',
                    fontSize: q(24),
                    fontWeight: 500,
                    lineHeight: q(34),
                    marginLeft: q(40),
                    whiteSpace: 'nowrap',
                  }}
                >
                  {Math.floor(gold)}
                </span>
                <img src={B.goldArrow} alt="" style={{ width: q(10), height: q(19), marginLeft: q(8) }} />
                <img
                  src={B.goldIcon}
                  alt=""
                  style={{ position: 'absolute', left: q(-13), top: q(-2), width: q(41), height: q(37) }}
                />
              </div>
              {/* 钻石按钮 */}
              <div
                style={{
                  position: 'relative',
                  width: q(133),
                  height: q(34),
                  backgroundImage: `url(${B.diamondBg})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    color: '#fff',
                    fontSize: q(24),
                    fontWeight: 700,
                    lineHeight: q(34),
                    marginLeft: q(38),
                    whiteSpace: 'nowrap',
                  }}
                >
                  {Math.floor(diamond)}
                </span>
                <img src={B.diamondArrow} alt="" style={{ width: q(10), height: q(19), marginLeft: q(8) }} />
                <img
                  src={B.diamondIcon}
                  alt=""
                  style={{ position: 'absolute', left: q(-20), top: q(-3), width: q(40), height: q(40) }}
                />
              </div>
            </div>
          </div>

          {/* 操作按钮行（分解 + 提货保护） */}
          <div
            style={{
              position: 'absolute',
              top: q(51 + 59 + 53 + 119 + 30),
              left: 0,
              width: q(750),
              height: q(113),
              backgroundImage: `url(${B.actionBarBg})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {/* 分解按钮 */}
            <div
              style={{
                width: q(240),
                height: q(81),
                backgroundImage: `url(${B.decomposeBtn})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                margin: `${q(15)} 0 0 ${q(31)}`,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                gap: q(8),
              }}
            >
              <img src={B.decomposeIcon} alt="" style={{ width: q(40), height: q(40) }} />
              <span style={{ color: '#fff', fontSize: q(28), fontWeight: 500, WebkitTextStroke: `${q(2)} rgba(105,51,0,1)` }}>
                分解
              </span>
            </div>

            {/* 提货保护按钮 */}
            <div
              style={{
                width: q(221),
                height: q(81),
                backgroundImage: `url(${B.protectBtn})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                margin: `${q(15)} 0 0 ${q(258)}`,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                gap: q(8),
              }}
            >
              <img src={B.protectIcon} alt="" style={{ width: q(40), height: q(40) }} />
              <span style={{ color: 'rgba(249,197,255,1)', fontSize: q(28), fontWeight: 500, WebkitTextStroke: `${q(2)} rgba(69,8,113,1)` }}>
                提货保护
              </span>
            </div>

            {/* 用户信息卡（绝对定位，叠在操作栏上方） */}
            <div
              style={{
                position: 'absolute',
                left: q(87),
                top: q(-206),
                width: q(450),
                height: q(281),
                backgroundImage: `url(${B.userCardBg})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* 名字行 */}
              <div
                style={{
                  position: 'absolute',
                  top: q(70),
                  left: q(82),
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: q(8),
                }}
              >
                <span
                  style={{
                    color: '#fff',
                    fontSize: q(28),
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: q(150),
                  }}
                >
                  {player?.nickname ?? '未登录'}
                </span>
                <img src={B.badge} alt="" style={{ width: q(67), height: q(46) }} />
              </div>
              {/* ID行 */}
              <span
                style={{
                  position: 'absolute',
                  top: q(120),
                  left: q(82),
                  color: '#fff',
                  fontSize: q(26),
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                ID：{player?.id ?? '---'}
              </span>
              {/* 分割线 */}
              <img
                src={B.divider}
                alt=""
                style={{ position: 'absolute', left: q(249), top: q(121), width: q(365), height: q(1) }}
              />
              {/* 头像圆形 */}
              <div
                style={{
                  position: 'absolute',
                  left: q(-87),
                  top: q(32),
                  backgroundColor: 'rgba(46,30,98,1)',
                  borderRadius: '50%',
                  width: q(117),
                  height: q(117),
                  border: `${q(2)} solid rgba(0,0,0,1)`,
                  overflow: 'hidden',
                }}
              >
                <img
                  src={player?.avatar ?? '/img/avatars/001.png'}
                  alt="头像"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).src = '/img/avatars/001.png'; }}
                />
              </div>
              {/* 提货按钮 */}
              <div
                style={{
                  position: 'absolute',
                  left: q(193),
                  top: q(221),
                  width: q(240),
                  height: q(81),
                  backgroundImage: `url(${B.extractBtn})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  gap: q(8),
                }}
              >
                <img src={B.extractIcon} alt="" style={{ width: q(40), height: q(40) }} />
                <span style={{ color: 'rgba(249,197,255,1)', fontSize: q(28), fontWeight: 500, WebkitTextStroke: `${q(2)} rgba(69,8,113,1)` }}>
                  提货
                </span>
              </div>
            </div>

            {/* VIP标签 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: q(-56),
                height: q(73),
                width: q(184),
                backgroundImage: `url(${B.vipTagBg})`,
                backgroundSize: '196px 73px',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: '-12px 0px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  color: '#fff',
                  fontSize: q(24),
                  fontWeight: 700,
                  lineHeight: q(34),
                  marginTop: q(13),
                  marginLeft: q(60),
                  WebkitTextStroke: `${q(2)} rgba(105,51,0,1)`,
                  whiteSpace: 'nowrap',
                }}
              >
                VIP{player?.vipLevel ?? 1}
              </span>
            </div>
          </div>
        </div>

        {/* ── 物品列表区域 ── */}
        <div
          style={{
            position: 'relative',
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
              marginTop: q(72),
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
              <span style={{ color: '#fff' }}>当前VIP{player?.vipLevel ?? 1},今日可赠送</span>
              <span style={{ color: 'rgba(255,246,13,1)' }}>0</span>
              <span style={{ color: '#fff' }}>次</span>
            </div>
            <img
              src={B.giftIcon}
              alt=""
              style={{ width: q(24), height: q(32), margin: `${q(15)} ${q(69)} 0 ${q(122)}` }}
            />
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
                WebkitTextStroke: `${q(2)} rgba(105,51,0,1)`,
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
                width: q(370),
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
              <img src={B.sortPriceIcon} alt="" style={{ width: q(24), height: q(26) }} />
              <span style={{ color: '#fff', fontSize: q(24) }}>价格</span>
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
              <img src={B.sortTimeIcon} alt="" style={{ width: q(36), height: q(36) }} />
              <span style={{ color: '#fff', fontSize: q(24) }}>时间</span>
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
              <img src={B.itemPlaceholder} alt="" style={{ width: q(280), height: q(220), opacity: 0.4 }} />
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
                cursor: 'pointer',
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
                cursor: 'pointer',
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
    </div>
  );
}
