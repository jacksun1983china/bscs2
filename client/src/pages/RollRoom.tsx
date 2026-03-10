/**
 * RollRoom.tsx — Roll房列表页
 * 严格按照蓝湖设计稿还原，接入动态数据（去掉硬编码）
 * 设计稿基准：750px宽
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

import BottomNav from '@/components/BottomNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';

// ── px → cqw 转换（基准 750px）──────────────────────────────────
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// ── CDN图片常量（Roll房列表页专用）──────────────────────────────
const R = {
  bgSection1: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/57e6d6bc960ef24766946a5e67661922_2795af87.png',
  bgBox2: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/5ad45a3482cfe90f8fd66abc8406aa2f_1bde050c.png',
  bgBox5: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/6d6fd1627b710bef613a25b0db63ded9_935432f7.png',
  cardBg1: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/1b22267bfe6a17502e2c484561c43e27_d62ca7e1.png',
  cardBg2: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/fbdd6fb60042fe93b3c42739cbb296b5_3aaaf647.png',
  prizeBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/3fdfdf6a67b604f678818f7da3e78b57_ac350fcd.png',
  priceBars: [
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/2a1838e60faf7b76953fba18897792fc_5567c90e.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/08e7d66272b1be943bea9bfef80c6fe9_13e7af8b.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/1529a6687259c62846341fb9115364c4_a95ae60d.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/a1f2c3957240258ae2e120b113cd64c5_16cff28b.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/f2ba43aa1398213c53750251355c8413_3a60a65c.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/ee3a922a9a5c0a7f4136d5dadabdbaa9_afc7f756.png',
  ],
  statusActive: [
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/f7e7b0387980c2825a3e27298d7f629f_d0d9efbd.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/4b797e6fde7e6c645637129cdb424191_47624983.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/12afc4cd880f829cf368046789248a28_6e9e8e40.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/245a37d867f9d002e6b3aa10924992ab_04d133c9.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/f9423cb6649de14f1d54d45c16a23fdf_097f9365.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/b2e4c710e7393cccd1f5a102c4002109_aae14a6a.png',
  ],
  tagFree1: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/8882acb6c130459db455ffdbec30958d_fc3df7e9.png',
  tagFree2: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/dcdf4985224d0fdcc5ab700d99a7e9d1_d319d15b.png',
  divider: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/dc7dd5c45a9df592bb8584799f57b0cd_2a813d9c.png',
  peopleIcon1: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/2f37a686e4a75d6fcc74fdf5f1a8989a_a3536553.png',
  peopleIcon2: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/31b9222f96713fbeba7454db2cbf3197_6db410e4.png',
  backBtn: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/b40b369c064b23e0e2882a9d1656d992_544384e9.png',
  filterBar: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/6861b8159caed1c37eed49876cb37153_775f7b18.png',
  searchBox: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/0aa8eef3d299c97eac07e50d805ccdae_0ff43e63.png',
  bottomNavBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/056aba70d7ecd46af0ccc935b5958466_ae89e0e4.png',
  navWode: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/6036749b7ef0d0e15d62d535c24cb067_29e5f1df.png',
  navFenxiang: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/a76861fc5755fe6cab2794f8202987e1_6c7aa2a0.png',
  navBeibao: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/08a70db80b30ed00ccfba7b8ef5d9410_380ea30b.png',
  navChongzhi: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/f82d0089f7e7cbe7038744c6687bf14e_3809f591.png',
  navDating: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/cc6a4e0101f19d3e5d2749cb06a2b333_1d5b1383.png',
  navWodeBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/215fd9796802aae0e9486abda6e748a1_53c7f5a7.png',
  navFenxiangBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/b1b123b66ded7d8dee6a1cbbb53487f7_ff7c9710.png',
  navChongzhiBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/21d1f5243763d60c7ae65f9da234f7f8_62317a05.png',
  prizeImgs: [
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/a18e6e9f5096c00fcc4d2e25652515f7_42d2cc1c.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/c20c0396ebdf9ed79fa4a898ad425b67_689420ec.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/df05039dc8d8d8a90d9a86288e7379c5_f13f085b.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/a5ce0fa7cf1669681da0246aee4b6e73_13941638.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/5e419ff21581dadfbda4edff160600ef_260f206d.png',
    'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/30334c0758b43b3d8d6af7782a553acc_3a80b6da.png',
  ],
};

// ── 筛选标签 ──────────────────────────────────────────────────────
// （内联 BottomNav 已删除，使用公共组件 @/components/BottomNav）
const FILTERS = [
  { key: 'all',      label: '全部' },
  { key: 'joinable', label: '可参与' },
  { key: 'mine',     label: '我的' },
  { key: 'ended',    label: '已结束' },
] as const;

function RollCard({ room, index, onClick }: { room: any; index: number; onClick: () => void }) {
  const cardBg = index % 2 === 0 ? R.cardBg1 : R.cardBg2;
  const priceBar = R.priceBars[index % R.priceBars.length];
  const statusImg = R.statusActive[index % R.statusActive.length];
  const isFree = !room.threshold || parseFloat(room.threshold) === 0;
  const tagFreeImg = index % 2 === 0 ? R.tagFree1 : R.tagFree2;
  const isEnded = room.status === 'finished' || room.status === 'ended';

  // 获取第一个奖品图片（动态）
  const firstPrize = room.prizes?.[0];
  const prizeImg = firstPrize?.imageUrl || R.prizeImgs[index % R.prizeImgs.length];
  const prizeValue = firstPrize ? parseFloat(firstPrize.value || '0').toFixed(2) : '0.00';

  // 开奖时间格式化
  const endTime = room.endAt ? new Date(room.endAt) : null;
  const endTimeStr = endTime
    ? `${endTime.getFullYear()}-${String(endTime.getMonth()+1).padStart(2,'0')}-${String(endTime.getDate()).padStart(2,'0')} ${String(endTime.getHours()).padStart(2,'0')}:${String(endTime.getMinutes()).padStart(2,'0')}`
    : '';

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: q(704),
        marginLeft: q(24),
        marginBottom: q(14),
        cursor: 'pointer',
        opacity: isEnded ? 0.7 : 1,
        containerType: 'inline-size',
      }}
    >
      {/* 卡片主体（704×159px） */}
      <div style={{
        width: '100%',
        height: q(159),
        backgroundImage: `url(${cardBg})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
      }}>
        {/* 左侧奖品图区域（200×156px） */}
        <div style={{
          position: 'relative',
          width: q(200),
          height: q(156),
          marginTop: q(1),
          flexShrink: 0,
          backgroundImage: `url(${R.prizeBg})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}>
          {/* 奖品图片（154×111px, margin: 23px 0 0 23px） */}
          <img
            src={prizeImg}
            alt=""
            style={{ width: q(154), height: q(111), marginTop: q(23), marginLeft: q(23), objectFit: 'contain', display: 'block' }}
          />
          {/* 价格条（200×36px, absolute bottom:0） */}
          <div style={{
            position: 'absolute',
            left: 0, bottom: 0,
            width: q(200), height: q(36),
            backgroundImage: `url(${priceBar})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              color: 'rgba(255,246,13,1)',
              fontSize: q(26),
              fontFamily: 'Alibaba-PuHuiTi-B, sans-serif',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              lineHeight: q(34),
            }}>{prizeValue}</span>
          </div>
        </div>

        {/* 右侧信息区 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: `${q(11)} ${q(18)} 0 ${q(18)}` }}>
          {/* 房间名称 */}
          <span style={{
            color: 'rgba(255,255,255,1)',
            fontSize: q(26),
            fontFamily: 'Alibaba-PuHuiTi-R, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: q(34),
            display: 'block',
            maxWidth: q(352),
          }}>{room.title}</span>
          {/* 开奖时间（下方，margin-top: 48px） */}
          <span style={{
            color: 'rgba(255,255,255,1)',
            fontSize: q(20),
            fontFamily: 'Alibaba-PuHuiTi-R, sans-serif',
            whiteSpace: 'nowrap',
            lineHeight: q(34),
            marginTop: q(48),
            display: 'block',
          }}>{endTimeStr}</span>
          {/* 参与人数 + 门槛（与时间同行，margin-top: -34px） */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: q(-34), gap: q(8) }}>
            {/* 参与人数气泡 */}
            <div style={{
              backgroundColor: 'rgba(13,3,56,1)',
              height: q(24),
              minWidth: q(80),
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: q(22),
              paddingRight: q(8),
            }}>
              <span style={{
                color: 'rgba(255,246,13,1)',
                fontSize: q(20),
                fontFamily: 'Alibaba-PuHuiTi-M, sans-serif',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}>{room.participantCount || 0}</span>
              {/* 人数图标（absolute left:-12 top:-2） */}
              <img
                src={index % 2 === 0 ? R.peopleIcon1 : R.peopleIcon2}
                alt=""
                style={{ position: 'absolute', left: q(-12), top: q(-2), width: q(28), height: q(28), objectFit: 'contain' }}
              />
            </div>
            {/* 门槛标签 */}
            {isFree ? (
              <img src={tagFreeImg} alt="无门槛" style={{ height: q(35), objectFit: 'contain' }} />
            ) : (
              <span style={{ color: 'rgba(80,225,255,1)', fontSize: q(20), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }}>
                充值满{parseFloat(room.threshold).toFixed(0)}金币
              </span>
            )}
          </div>
        </div>

        {/* 状态标签（右上角，进行中） */}
        {!isEnded && (
          <img
            src={statusImg}
            alt="进行中"
            style={{
              position: 'absolute',
              right: q(-8),
              top: q(-2),
              height: q(35),
              objectFit: 'contain',
            }}
          />
        )}
      </div>

      {/* 下方统计行（group_11 区域） */}
      <div style={{
        background: 'linear-gradient(89deg, rgba(26,7,96,0.39) 0%, rgba(68,26,192,0.39) 50%, rgba(36,10,113,0.39) 100%)',
        borderRadius: `0 0 ${q(15)} ${q(15)}`,
        width: q(704),
        height: q(46),
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: q(89),
        gap: q(80),
      }}>
        {/* 参与人数 */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: q(8) }}>
          <div style={{
            width: q(31), height: q(22),
            backgroundImage: `url(${R.peopleIcon1})`,
            backgroundPosition: `${q(-4)} ${q(-4)}`,
            backgroundSize: `${q(39)} ${q(30)}`,
            backgroundRepeat: 'no-repeat',
          }} />
          <span style={{ color: 'rgba(133,102,255,1)', fontSize: q(26), fontFamily: 'Alibaba-PuHuiTi-R, sans-serif', lineHeight: q(34) }}>
            {room.participantCount || 0}
          </span>
        </div>
        {/* 分隔线 */}
        <img src={R.divider} alt="" style={{ width: q(1), height: q(40) }} />
        {/* 奖品数量 */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: q(8) }}>
          <div style={{
            width: q(31), height: q(25),
            backgroundImage: `url(${R.peopleIcon2})`,
            backgroundPosition: `${q(-4)} ${q(-4)}`,
            backgroundSize: `${q(39)} ${q(33)}`,
            backgroundRepeat: 'no-repeat',
          }} />
          <span style={{ color: 'rgba(133,102,255,1)', fontSize: q(26), fontFamily: 'Alibaba-PuHuiTi-R, sans-serif', lineHeight: q(34) }}>
            {room.prizeCount || room.prizes?.length || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────
export default function RollRoom() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<'all' | 'joinable' | 'mine' | 'ended'>('all');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.roll.list.useQuery(
    { page, limit: 10, filter, keyword },
    { refetchInterval: 30000 }
  );

  useEffect(() => { setPage(1); }, [filter, keyword]);

  const handleSearch = () => {
    setKeyword(searchInput);
    setPage(1);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        containerType: 'inline-size',
      }}
    >
      {/* 固定背景 */}
      <div style={{
        position: 'fixed',
        top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        height: '100vh',
        backgroundImage: `url(${R.bgSection1})`,
        backgroundPosition: 'center top',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      {/* 内容层 */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* 顶部导航区（750×146px） */}
        <div style={{ position: 'relative', width: '100%', containerType: 'inline-size', flexShrink: 0 }}>
          <div style={{ height: q(31) }} />
          {/* 导航栏（703×58px, margin: 53px 0 0 24px） */}
          <div style={{
            width: q(703),
            height: q(58),
            marginTop: q(53),
            marginLeft: q(24),
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            {/* 返回按钮 */}
            <img
              src={R.backBtn}
              alt="返回"
              onClick={() => navigate('/')}
              style={{ width: q(58), height: q(49), objectFit: 'contain', cursor: 'pointer', marginTop: q(4) }}
            />
            <div style={{ flex: 1 }} />
          </div>
        </div>

        {/* 内容背景区 */}
        <div style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          backgroundImage: `url(${R.bgBox2})`,
          backgroundPosition: 'center top',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          containerType: 'inline-size',
        }}>
          {/* 用户信息卡（公共组件 PlayerInfoCard） */}
          <PlayerInfoCard style={{ marginTop: q(18), marginLeft: q(38) }} />
          {/* 列表区（margin-top: 71px） */}
          <div style={{
            position: 'relative',
            width: '100%',
            marginTop: q(71),
            backgroundImage: `url(${R.bgBox5})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            paddingBottom: q(125),
            containerType: 'inline-size',
          }}>
            {/* 筛选栏（702×84px, margin-left: 24px） */}
            <div style={{
              width: q(702),
              height: q(84),
              marginLeft: q(24),
              backgroundImage: `url(${R.filterBar})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: `${q(9)} ${q(8)}`,
              gap: q(4),
            }}>
              {/* 筛选标签组 */}
              <div style={{ display: 'flex', flexDirection: 'row', height: q(50), marginTop: q(3) }}>
                {FILTERS.map((f, i) => (
                  <div
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    style={{
                      width: q(104),
                      height: q(50),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundImage: filter === f.key
                        ? 'linear-gradient(180deg, rgba(62,4,111,1) 0%, rgba(95,14,146,1) 100%)'
                        : 'none',
                      backgroundColor: filter === f.key ? 'transparent' : 'rgba(13,4,92,1)',
                      border: '2px solid rgba(105,51,0,1)',
                      marginLeft: i === 0 ? q(-2) : q(4),
                      marginTop: q(-2),
                    }}
                  >
                    <span style={{
                      WebkitTextStroke: filter === f.key ? '2px rgba(105,51,0,1)' : 'none',
                      color: 'rgba(255,255,255,1)',
                      fontSize: q(26),
                      fontFamily: filter === f.key ? 'Alibaba-PuHuiTi-M, sans-serif' : 'Alibaba-PuHuiTi-R, sans-serif',
                      fontWeight: filter === f.key ? 500 : 400,
                      whiteSpace: 'nowrap',
                    }}>{f.label}</span>
                  </div>
                ))}
              </div>
              {/* 搜索框 */}
              <div style={{
                flex: 1,
                height: q(48),
                backgroundImage: `url(${R.searchBox})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                display: 'flex',
                alignItems: 'center',
                marginTop: q(11),
                marginLeft: q(10),
                marginRight: q(6),
              }}>
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="请输入关键词搜索"
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'rgba(255,255,255,1)',
                    fontSize: q(22),
                    fontFamily: 'Alibaba-PuHuiTi-R, sans-serif',
                    padding: `0 ${q(19)}`,
                  }}
                />
              </div>
            </div>

            {/* 房间列表（margin-top: 65px） */}
            <div style={{ marginTop: q(65), paddingBottom: q(20) }}>
              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: q(200), color: 'rgba(133,102,255,1)', fontSize: q(26) }}>
                  加载中...
                </div>
              ) : !data?.list?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: q(300), gap: q(24) }}>
                  <div style={{ fontSize: q(80) }}>🎲</div>
                  <div style={{ color: 'rgba(133,102,255,1)', fontSize: q(26) }}>暂无Roll房</div>
                </div>
              ) : (
                <>
                  {data.list.map((room: any, i: number) => (
                    <RollCard
                      key={room.id}
                      room={room}
                      index={i}
                      onClick={() => navigate(`/roll/${room.id}`)}
                    />
                  ))}
                  {/* 分页 */}
                  {(data.total || 0) > 10 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: q(24), padding: `${q(10)} 0 ${q(16)}` }}>
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{ padding: `${q(12)} ${q(32)}`, borderRadius: q(16), border: '1px solid rgba(120,60,220,0.4)', background: page === 1 ? 'rgba(20,8,50,0.4)' : 'rgba(120,60,220,0.2)', color: page === 1 ? '#555' : 'rgba(133,102,255,1)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: q(26) }}
                      >上一页</button>
                      <span style={{ color: 'rgba(133,102,255,1)', fontSize: q(26), alignSelf: 'center' }}>
                        第{page}页 / 共{Math.ceil((data?.total || 0) / 10)}页
                      </span>
                      <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= Math.ceil((data?.total || 0) / 10)}
                        style={{ padding: `${q(12)} ${q(32)}`, borderRadius: q(16), border: '1px solid rgba(120,60,220,0.4)', background: page >= Math.ceil((data?.total || 0) / 10) ? 'rgba(20,8,50,0.4)' : 'rgba(120,60,220,0.2)', color: page >= Math.ceil((data?.total || 0) / 10) ? '#555' : 'rgba(133,102,255,1)', cursor: page >= Math.ceil((data?.total || 0) / 10) ? 'not-allowed' : 'pointer', fontSize: q(26) }}
                      >下一页</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* 底部导航 */}
        <div style={{ position: 'sticky', bottom: 0, zIndex: 100, width: '100%' }}>
          <BottomNav active="" />
        </div>
      </div>
    </div>
  );
}
