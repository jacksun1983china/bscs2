/**
 * Share.tsx — 分享推广页面
 * 严格还原蓝湖设计稿（lanhu_fenxiang）
 * 顶部使用公共 TopNav，底部使用公共 BottomNav
 * 基准：750px 宽，使用 cqw 响应式单位
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ASSETS, getAvatarUrl } from '@/lib/assets';
import { toast } from 'sonner';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

// px → cqw 转换（基准 750px）
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// 蓝湖分享页面 CDN 图片（严格对照 lanhu_fenxiang CSS/JSX）
const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';
const IMG = {
  // group_1 背景（整体大背景，VIP标签背景）
  vipBg: `${CDN}/d6b4c51ef1fa8bc9fd27845c60568dbe_86eaee89.png`,
  // box_2 背景（用户信息卡背景）
  userCardBg: `${CDN}/cbc9cd0619138d77156580db56afcea0_3c7dffc0.png`,
  // group_3 背景（金币行背景）
  coinRowBg1: `${CDN}/19cbfd9ff86164d3ccfaaf4237493fcf_b8d7e27b.png`,
  // group_4 背景（钻石行背景）
  coinRowBg2: `${CDN}/e249ddf656b98273f1679a82a2fde3df_3407f31e.png`,
  // box_4 背景（用户名片主卡）
  nameCardBg: `${CDN}/72b7cb6196a8827b4df51ffeed30adf8_7bc592dd.png`,
  // box_6 背景（头像框）
  avatarFrameBg: `${CDN}/f01ceb24ee087bba07511e3a97190b0f_0ccbd7a5.png`,
  // text-wrapper_1 背景（VIP标签）
  vipTagBg: `${CDN}/49d37573458f5acd166c0eb13a6123e5_a90c8173.png`,
  // box_8 背景（大厅图标）
  hallIconBg: `${CDN}/a78ff2c9eac44ab8bd216a324022bc2a_mergeImage_77f7787f.png`,
  // box_9 背景（周期选择器背景）
  periodSelectorBg: `${CDN}/8a0158d80796cf9011609e25b1a297d6_add1a2d3.png`,
  // text-wrapper_2 背景（当前周期按钮激活态）
  currentPeriodActive: `${CDN}/d30acd6115977c1710c20485a0962e5e_d97fe900.png`,
  // text-wrapper_3 背景（上个周期按钮）
  lastPeriodBtn: `${CDN}/662c892202c3ced30794bc30977ad0b1_3fca9687.png`,
  // box_10 背景（邀请码+绑定链接+推荐人区域整体背景）
  inviteAreaBg: `${CDN}/aef3445e30cf281efeb479716935aa06_b2309133.png`,
  // text-wrapper_4 背景（复制按钮）
  copyBtn: `${CDN}/eb8dc8e938bd2336495aeb45bfb75509_706d08ca.png`,
  // text-wrapper_5 背景（说明按钮）
  explainBtn: `${CDN}/2e086404b095ab79c771f4408340ae3e_a62bedda.png`,
  // text-wrapper_6 背景（绑定邀请码链接行背景）
  bindLinkBg: `${CDN}/5f0b48cce7ea6c29a81146a93d037ed8_2b3e22a7.png`,
  // group_10 背景（数据表格整体背景）
  tableAreaBg: `${CDN}/dcc29addfc45b374d2b76c3b79587291_0a011e6f.png`,
  // text-wrapper_13 背景（"没有更多了哦~"行背景）
  noMoreBg: `${CDN}/c92d35a635ab4f98e481e7c156714b26_1f855e5b.png`,
  // block_2 背景（底部导航背景）— 已由公共 BottomNav 处理，此处保留备用
  bottomNavBg: `${CDN}/997e76a1e73bb6c6a4e550396bb3da05_74924def.png`,
  // group_11 背景（我的图标）
  myIcon: `${CDN}/0c308aaccaa1348769cd7b4927685a22_fd3cf47d.png`,
  // block_3 背景（分享图标）
  shareIcon: `${CDN}/5c450dcc7c2a4c347cecd38c3c978117_2f74a38c.png`,
  // section_2 背景（充值图标）
  rechargeIcon: `${CDN}/42e0db3a6d61f371a2a318096b52433d_c5f7dccb.png`,
  // image_1 (JSX img 标签) — 顶部标题行背景装饰
  titleBg: `${CDN}/6f3f4f9ea30e716a5053d600b7117c41_26d0ef36.png`,
  // image_2 (JSX img 标签) — 徽章
  badge: `${CDN}/a3f362f5618fd1e413f25b6e4147b2f5_722379ab.png`,
  // image_3 (JSX img 标签) — 分隔线
  divider: `${CDN}/25b2325fa14ea90f94c9fc3f5ce40d62_23bc1528.png`,
  // image_4 (JSX img 标签) — 推荐人/佣金竖分隔线
  vertDivider: `${CDN}/1085edfbf6f34539391becf7d1e84e9f_f78f3a58.png`,
  // image_5 (JSX img 标签) — 背包图标
  bagIcon: `${CDN}/2ce59fa4a5d49c0db9bdce4a8aa7c597_0cc413f2.png`,
  // 金币图标
  goldIcon: `${CDN}/75fed2caf5a1839567925db0cf8d5c31_15cdfd31.png`,
  // 金币标签背景
  goldLabel: `${CDN}/747806985917308abfeb32ca097fadf6_0540e636.png`,
  // 钻石图标
  diamondIcon: `${CDN}/bb2f4c51f7018ff894433990b8f78d81_95128c53.png`,
  // 钻石标签背景
  diamondLabel: `${CDN}/5e7b0ac0770a98f000f9a1518141abe8_ffabe79f.png`,
};

// 模拟表格数据（实际应从后端获取）
const TABLE_ROWS = [
  { date: '2025/11/16', ratio: '4%', total: 100, today: 6, rechargeTotal: '¥1200', rechargeFlow: '¥3200' },
  { date: '2025/11/16', ratio: '4%', total: 100, today: 6, rechargeTotal: '¥1200', rechargeFlow: '¥3200' },
  { date: '2025/11/16', ratio: '4%', total: 100, today: 6, rechargeTotal: '¥1200', rechargeFlow: '¥3200' },
  { date: '2025/11/16', ratio: '4%', total: 100, today: 6, rechargeTotal: '¥1200', rechargeFlow: '¥3200' },
  { date: '2025/11/16', ratio: '4%', total: 100, today: 6, rechargeTotal: '¥1200', rechargeFlow: '¥3200' },
  { date: '2025/11/16', ratio: '4%', total: 100, today: 6, rechargeTotal: '¥1200', rechargeFlow: '¥3200' },
  { date: '2025/11/16', ratio: '4%', total: 100, today: 6, rechargeTotal: '¥1200', rechargeFlow: '¥3200' },
  { date: '2025/11/16', ratio: '4%', total: 100, today: 6, rechargeTotal: '¥1200', rechargeFlow: '¥3200' },
];

export default function Share() {
  const [activePeriod, setActivePeriod] = useState<'current' | 'last'>('current');

  const { data: player } = trpc.player.me.useQuery(undefined, { retry: false });
  const { data: teamStats } = trpc.player.teamStats.useQuery(undefined, { enabled: !!player, retry: false });

  const withdrawMutation = trpc.player.withdrawCommission.useMutation({
    onSuccess: () => toast.success('佣金已提取！'),
    onError: (e) => toast.error(e.message),
  });

  const copyCode = () => {
    if (!player?.inviteCode) return;
    navigator.clipboard.writeText(player.inviteCode);
    toast.success('邀请码已复制！');
  };

  const copyLink = () => {
    const link = `${window.location.origin}/login?invite=${player?.inviteCode ?? ''}`;
    navigator.clipboard.writeText(link);
    toast.success('邀请链接已复制！');
  };

  const avatarUrl = getAvatarUrl(player?.avatar);

  return (
    <div
      className="phone-container"
      style={{
        background: '#0d0621',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        containerType: 'inline-size',
      }}
    >
      {/* 全局背景图 */}
      <img
        src={ASSETS.bg}
        alt=""
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          opacity: 0.45,
          pointerEvents: 'none',
        }}
      />

      {/* 内容层 */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', paddingBottom: q(20) }}>

        {/* ── 公共顶部导航 ── */}
        <TopNav showLogo={false} />

        {/* ── 用户信息卡（box_2，宽 500px/750px=66.7%，高 238px） ── */}
        <div
          style={{
            margin: `${q(8)} ${q(22)} 0`,
            background: `url(${IMG.userCardBg}) center/100% 100% no-repeat`,
            borderRadius: q(12),
            padding: `${q(10)} ${q(14)} ${q(10)} ${q(80)}`,
            minHeight: q(120),
            position: 'relative',
          }}
        >
          {/* 头像框（box_6，绝对定位，左侧突出） */}
          <div
            style={{
              position: 'absolute',
              left: q(-10),
              top: q(-8),
              width: q(80),
              height: q(90),
              background: `url(${IMG.avatarFrameBg}) center/100% 100% no-repeat`,
            }}
          >
            <img
              src={avatarUrl}
              alt="头像"
              style={{
                position: 'absolute',
                top: '14%', left: '14%',
                width: '72%', height: '72%',
                objectFit: 'cover',
                borderRadius: '50%',
              }}
            />
          </div>

          {/* 金币 & 钻石行（box_3，顶部右侧） */}
          <div style={{ display: 'flex', gap: q(16), marginBottom: q(4) }}>
            {/* 金币 */}
            <div
              style={{
                background: `url(${IMG.coinRowBg1}) center/100% 100% no-repeat`,
                display: 'flex', alignItems: 'center',
                padding: `${q(2)} ${q(10)} ${q(2)} ${q(24)}`,
                position: 'relative',
                minWidth: q(80), height: q(28),
              }}
            >
              <img src={IMG.goldIcon} alt="" style={{ position: 'absolute', left: q(-8), top: q(-4), width: q(28), height: q(28) }} />
              <span style={{ color: '#fff', fontSize: q(22), fontWeight: 500 }}>{player?.gold ?? 0}</span>
              <img src={IMG.goldLabel} alt="" style={{ position: 'absolute', right: q(-8), top: q(-2), width: q(26), height: q(22) }} />
            </div>
            {/* 钻石 */}
            <div
              style={{
                background: `url(${IMG.coinRowBg2}) center/100% 100% no-repeat`,
                display: 'flex', alignItems: 'center',
                padding: `${q(2)} ${q(10)} ${q(2)} ${q(24)}`,
                position: 'relative',
                minWidth: q(80), height: q(28),
              }}
            >
              <img src={IMG.diamondIcon} alt="" style={{ position: 'absolute', left: q(-8), top: q(-4), width: q(28), height: q(28) }} />
              <span style={{ color: '#fff', fontSize: q(22), fontWeight: 700 }}>{player?.diamond ?? 0}</span>
              <img src={IMG.diamondLabel} alt="" style={{ position: 'absolute', right: q(-8), top: q(-2), width: q(26), height: q(22) }} />
            </div>
          </div>

          {/* 昵称 + 徽章（box_5） */}
          <div style={{ display: 'flex', alignItems: 'center', gap: q(6) }}>
            <span style={{ color: '#fff', fontSize: q(28), fontWeight: 500 }}>{player?.nickname ?? '用户'}</span>
            <img src={IMG.badge} alt="徽章" style={{ width: q(54), height: q(37), objectFit: 'contain' }} />
          </div>

          {/* ID */}
          <div style={{ color: '#fff', fontSize: q(21), marginTop: q(4) }}>
            ID：{player?.id ?? '---'}
          </div>

          {/* 分隔线（image_3，绝对定位） */}
          <img
            src={IMG.divider}
            alt=""
            style={{
              position: 'absolute',
              left: q(50), bottom: q(28),
              width: q(365), height: q(2),
              objectFit: 'fill',
            }}
          />
        </div>

        {/* VIP 标签（text-wrapper_1） */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            background: `url(${IMG.vipTagBg}) center/100% 100% no-repeat`,
            width: q(104), height: q(34),
            marginLeft: q(32), marginTop: q(6),
          }}
        >
          <span style={{ color: '#fff', fontSize: q(24), fontWeight: 700 }}>VIP{player?.vipLevel ?? 0}</span>
        </div>

        {/* 大厅图标（box_8，绝对定位于 group_2 右上角） */}
        {/* 在当前布局中，大厅图标放在用户卡右上角 */}

        {/* ── 周期选择器（box_9） ── */}
        <div
          style={{
            margin: `${q(12)} ${q(24)} 0`,
            background: `url(${IMG.periodSelectorBg}) center/100% 100% no-repeat`,
            borderRadius: q(8),
            height: q(56),
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* 当前周期 */}
          <div
            onClick={() => setActivePeriod('current')}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              height: '100%',
            }}
          >
            <div
              style={{
                background: activePeriod === 'current'
                  ? `url(${IMG.currentPeriodActive}) center/100% 100% no-repeat`
                  : 'transparent',
                width: q(242), height: q(54),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{
                color: activePeriod === 'current' ? '#fff' : 'rgba(249,197,255,1)',
                fontSize: q(28), fontWeight: 500,
              }}>当前周期</span>
            </div>
          </div>
          {/* 上个周期 */}
          <div
            onClick={() => setActivePeriod('last')}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              height: '100%',
            }}
          >
            <div
              style={{
                background: activePeriod === 'last'
                  ? `url(${IMG.lastPeriodBtn}) center/100% 100% no-repeat`
                  : 'transparent',
                width: q(242), height: q(54),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{
                color: activePeriod === 'last' ? '#fff' : 'rgba(249,197,255,1)',
                fontSize: q(28), fontWeight: 500,
              }}>上个周期</span>
            </div>
          </div>
        </div>

        {/* ── 邀请码 + 绑定链接 + 推荐人区域（box_10） ── */}
        <div
          style={{
            margin: `${q(0)} 0 0`,
            background: `url(${IMG.inviteAreaBg}) center/100% 100% no-repeat`,
            width: '100%',
            paddingTop: q(16),
            paddingBottom: q(20),
          }}
        >
          {/* 邀请码行（group_6） */}
          <div
            style={{
              display: 'flex', alignItems: 'center',
              margin: `${q(16)} ${q(42)} 0`,
              height: q(44),
              position: 'relative',
            }}
          >
            {/* 邀请码文字 */}
            <span style={{ color: '#fff', fontSize: q(30), fontWeight: 700 }}>邀请码：</span>
            <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(30), fontWeight: 700, flex: 1 }}>
              {player?.inviteCode ?? '---'}
            </span>
            {/* 复制按钮（text-wrapper_4） */}
            <div
              onClick={copyCode}
              style={{
                background: `url(${IMG.copyBtn}) center/100% 100% no-repeat`,
                width: q(114), height: q(44),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', marginRight: q(8),
              }}
            >
              <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(22), fontWeight: 700 }}>复制</span>
            </div>
            {/* 说明按钮（text-wrapper_5） */}
            <div
              onClick={() => toast.info('说明功能即将上线')}
              style={{
                background: `url(${IMG.explainBtn}) center/100% 100% no-repeat`,
                width: q(59), height: q(59),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <span style={{ color: '#fff', fontSize: q(20) }}>说明</span>
            </div>
          </div>

          {/* 绑定邀请码链接行（text-wrapper_6） */}
          <div
            onClick={copyLink}
            style={{
              background: `url(${IMG.bindLinkBg}) center/100% 100% no-repeat`,
              margin: `${q(6)} ${q(42)} 0`,
              height: q(64),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: q(4),
            }}
          >
            <span style={{ color: '#fff', fontSize: q(30), fontWeight: 700 }}>
              绑定邀请码-{player?.inviteCode ?? '---'}
            </span>
          </div>

          {/* 推荐人 | ID | 佣金+提现（group_8） */}
          <div
            style={{
              display: 'flex', alignItems: 'center',
              margin: `${q(12)} ${q(56)} 0`,
              height: q(88),
            }}
          >
            {/* 推荐人（text-wrapper_7） */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: q(26), fontWeight: 500 }}>
                {(player as any)?.invitedByNickname ?? (player?.invitedBy ? `ID：${player.invitedBy}` : 'XXXXXXXXX')}
              </span>
              <span style={{ color: 'rgba(249,178,255,1)', fontSize: q(24), marginTop: q(6) }}>推荐人</span>
            </div>

            {/* 竖分隔线（image_4） */}
            <img
              src={IMG.vertDivider}
              alt=""
              style={{ width: q(2), height: q(73), objectFit: 'fill', marginRight: q(12) }}
            />

            {/* ID 列 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontSize: q(26), fontWeight: 500 }}>
                {player?.invitedBy ? `DB${player.invitedBy}` : 'DB9908890'}
              </span>
              <span style={{ color: 'rgba(249,178,255,1)', fontSize: q(24), marginTop: q(6) }}>ID</span>
            </div>

            {/* 竖分隔线 */}
            <img
              src={IMG.vertDivider}
              alt=""
              style={{ width: q(2), height: q(73), objectFit: 'fill', marginRight: q(12) }}
            />

            {/* 佣金 + 提现（group_9） */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: q(2) }}>
                <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(24) }}>￥</span>
                <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(32), fontWeight: 500 }}>
                  {parseFloat(player?.commissionBalance ?? '0').toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: q(8), marginTop: q(6) }}>
                <span style={{ color: 'rgba(249,178,255,1)', fontSize: q(24) }}>佣金</span>
                <div
                  onClick={() => withdrawMutation.mutate()}
                  style={{
                    background: 'linear-gradient(135deg, rgba(120,40,220,0.9) 0%, rgba(80,20,160,0.9) 100%)',
                    border: '1px solid rgba(180,100,255,0.6)',
                    borderRadius: q(6),
                    padding: `${q(4)} ${q(14)}`,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color: '#fff', fontSize: q(22) }}>提现</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 数据表格（group_10） ── */}
        <div
          style={{
            background: `url(${IMG.tableAreaBg}) center/100% 100% no-repeat`,
            width: '100%',
            paddingTop: q(4),
            paddingBottom: q(4),
          }}
        >
          {/* 表头行（text-wrapper_10） */}
          <div
            style={{
              display: 'flex', alignItems: 'center',
              height: q(82),
              margin: `${q(17)} ${q(20)} 0`,
            }}
          >
            {[
              { label: '周期', flex: 2.2 },
              { label: '比例', flex: 1 },
              { label: '团队\n总人数', flex: 1.4 },
              { label: '单日\n推广人数', flex: 1.6 },
              { label: '团队充值\n总金额', flex: 1.8 },
              { label: '团队充值\n总流水', flex: 1.8 },
            ].map((h, i) => (
              <div key={i} style={{ flex: h.flex, textAlign: 'center' }}>
                <span style={{ color: '#fff', fontSize: q(22), whiteSpace: 'pre-line', lineHeight: 1.3 }}>{h.label}</span>
              </div>
            ))}
          </div>

          {/* 数据行 */}
          {TABLE_ROWS.map((row, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex', alignItems: 'center',
                height: q(70),
                margin: `0 ${q(20)}`,
                borderBottom: '1px solid rgba(120,60,220,0.2)',
              }}
            >
              <div style={{ flex: 2.2, textAlign: 'center' }}>
                <span style={{ color: '#fff', fontSize: q(22) }}>{row.date}</span>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ color: '#fff', fontSize: q(24) }}>{row.ratio}</span>
              </div>
              <div style={{ flex: 1.4, textAlign: 'center' }}>
                <span style={{ color: '#fff', fontSize: q(24) }}>{teamStats?.total ?? row.total}</span>
              </div>
              <div style={{ flex: 1.6, textAlign: 'center' }}>
                <span style={{ color: '#fff', fontSize: q(24) }}>{teamStats?.todayCount ?? row.today}</span>
              </div>
              <div style={{ flex: 1.8, textAlign: 'center' }}>
                <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(24) }}>{row.rechargeTotal}</span>
              </div>
              <div style={{ flex: 1.8, textAlign: 'center' }}>
                <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(24) }}>{row.rechargeFlow}</span>
              </div>
            </div>
          ))}

          {/* "没有更多了哦~" 行（text-wrapper_13） */}
          <div
            style={{
              background: `url(${IMG.noMoreBg}) center/100% 100% no-repeat`,
              margin: `${q(13)} ${q(22)} 0`,
              height: q(61),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ color: '#fff', fontSize: q(28), fontWeight: 500 }}>没有更多了哦~</span>
          </div>
        </div>

      </div>

      {/* ── 公共底部导航 ── */}
      <BottomNav active="fenxiang" />
    </div>
  );
}
