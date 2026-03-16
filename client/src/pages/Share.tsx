/**
 * Share.tsx — 分享推广页面
 * 严格还原蓝湖设计稿（lanhu_fenxiang）
 * 顶部：公共 TopNav 组件（固定不滚动）
 * 个人卡片：公共 PlayerInfoCard 组件（固定不滚动）
 * 底部：公共 BottomNav 组件
 * 背景图：absolute 覆盖整个容器（参考首页写法）
 * 基准：750px 宽，使用 cqw 响应式单位
 */
import { PageSlideIn } from '@/components/PageTransition';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { LANHU } from '@/lib/assets';
import { toast } from 'sonner';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import SettingsModal from '@/components/SettingsModal';

// px → cqw 转换（基准 750px）
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// 蓝湖分享页面 CDN 图片（严格对照 lanhu_fenxiang CSS/JSX）
const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';
const IMG = {
  // box_9 背景（周期选择器背景）
  periodSelectorBg: `${CDN}/8a0158d80796cf9011609e25b1a297d6_add1a2d3.png`,
  // text-wrapper_2 背景（当前周期按钮激活态）
  currentPeriodActive: `${CDN}/d30acd6115977c1710c20485a0962e5e_d97fe900.png`,
  // text-wrapper_3 背景（上个周期按钮激活态）
  lastPeriodActive: `${CDN}/662c892202c3ced30794bc30977ad0b1_3fca9687.png`,
  // box_10 背景（邀请码+绑定链接+推荐人区域整体背景）
  inviteAreaBg: `${CDN}/aef3445e30cf281efeb479716935aa06_b2309133.png`,
  // text-wrapper_4 背景（复制按钮）
  copyBtn: `${CDN}/eb8dc8e938bd2336495aeb45bfb75509_706d08ca.png`,
  // text-wrapper_5 背景（说明按钮，圆形图标）
  explainBtn: `${CDN}/2e086404b095ab79c771f4408340ae3e_a62bedda.png`,
  // text-wrapper_6 背景（绑定邀请码链接行背景）
  bindLinkBg: `${CDN}/5f0b48cce7ea6c29a81146a93d037ed8_2b3e22a7.png`,
  // group_10 背景（数据表格整体背景）
  tableAreaBg: `${CDN}/dcc29addfc45b374d2b76c3b79587291_0a011e6f.png`,
  // text-wrapper_13 背景（"没有更多了哦~"行背景）
  noMoreBg: `${CDN}/c92d35a635ab4f98e481e7c156714b26_1f855e5b.png`,
  // image_4 (JSX img 标签) — 推荐人/佣金竖分隔线
  vertDivider: `${CDN}/1085edfbf6f34539391becf7d1e84e9f_f78f3a58.png`,
  // VIP标签背景
  vipTagBg: `${CDN}/49d37573458f5acd166c0eb13a6123e5_a90c8173.png`,
};

export default function Share() {
  const [activePeriod, setActivePeriod] = useState<'current' | 'last'>('current');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  const { data: player } = trpc.player.me.useQuery(undefined, { retry: false, staleTime: 30_000 });
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

  // 根据周期过滤数据
  const weeklyStats = teamStats?.weeklyStats ?? [];
  const now = new Date();
  const currentWeekStart = (() => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const displayRows = activePeriod === 'current'
    ? weeklyStats.filter(r => r.weekStart >= currentWeekStart)
    : weeklyStats.filter(r => r.weekStart < currentWeekStart);

  return (
<PageSlideIn>
        <div
      className="phone-container"
      style={{
        background: '#0d0621',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        containerType: 'inline-size',
      }}
    >
      {/* ══════════════════════════════════════════════════════
          全局背景图：position: absolute; inset: 0（参考首页写法）
          ══════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${LANHU.pageBg})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'top center',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* ══════════════════════════════════════════════════════
          顶部固定区（不随内容滚动）：TopNav + PlayerInfoCard + VIP标签
          ══════════════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
        {/* 公共顶部导航 */}
        <TopNav showLogo={false} onSettingsOpen={() => setSettingsVisible(true)} />
        {/* 公共个人信息卡（与首页/Roll房完全一致） */}
        <PlayerInfoCard style={{ marginTop: q(8) }} />

      </div>

      {/* ══════════════════════════════════════════════════════
          可滚动内容区
          ══════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', paddingBottom: q(20) }}>

        {/* ── 周期选择器（box_9，750×56px，margin: 12px 24px 0） ── */}
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
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', height: '100%' }}
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
              <span style={{ color: '#fff', fontSize: q(28), fontWeight: 500 }}>当前周期</span>
            </div>
          </div>
          {/* 上个周期 */}
          <div
            onClick={() => setActivePeriod('last')}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', height: '100%' }}
          >
            <div
              style={{
                background: activePeriod === 'last'
                  ? `url(${IMG.lastPeriodActive}) center/100% 100% no-repeat`
                  : 'transparent',
                width: q(242), height: q(54),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{ color: activePeriod === 'last' ? '#fff' : 'rgba(249,197,255,1)', fontSize: q(28), fontWeight: 500 }}>上个周期</span>
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
          {/* 邀请码行（group_6）：邀请码文字 + 复制按钮 + 说明图标 */}
          <div
            style={{
              display: 'flex', alignItems: 'center',
              margin: `${q(16)} ${q(42)} 0`,
              height: q(52),
              gap: q(8),
            }}
          >
            {/* 邀请码文字（flex: 1，overflow hidden 防止溢出） */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden', minWidth: 0 }}>
              <span style={{ color: '#fff', fontSize: q(28), fontWeight: 700, whiteSpace: 'nowrap' }}>邀请码：</span>
              <span style={{
                color: 'rgba(255,246,13,1)', fontSize: q(28), fontWeight: 700,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {player?.inviteCode ?? '---'}
              </span>
            </div>
            {/* 复制网址按钮 */}
            <div
              onClick={copyLink}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)',
                border: '1px solid rgba(168,85,247,0.7)',
                borderRadius: q(8),
                width: q(160), height: q(48),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: q(6),
                cursor: 'pointer', flexShrink: 0,
                boxShadow: '0 0 12px rgba(168,85,247,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <span style={{ fontSize: q(22), lineHeight: 1 }}>📋</span>
              <span style={{ color: '#fff', fontSize: q(22), fontWeight: 700, textShadow: '0 0 8px rgba(168,85,247,0.8)' }}>复制网址</span>
            </div>
            {/* 说明按钮 */}
            <div
              onClick={() => setShowExplain(true)}
              style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1e40af 100%)',
                border: '1px solid rgba(59,130,246,0.7)',
                borderRadius: q(8),
                width: q(80), height: q(48),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: q(4),
                cursor: 'pointer', flexShrink: 0,
                boxShadow: '0 0 12px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <span style={{ fontSize: q(20), lineHeight: 1 }}>📖</span>
              <span style={{ color: '#fff', fontSize: q(20), fontWeight: 700, textShadow: '0 0 8px rgba(59,130,246,0.8)' }}>说明</span>
            </div>
          </div>

          {/* 绑定邀请码链接行（text-wrapper_6，蓝色背景，点击复制链接） */}
          <div
            onClick={copyLink}
            style={{
              background: `url(${IMG.bindLinkBg}) center/100% 100% no-repeat`,
              margin: `${q(6)} ${q(42)} 0`,
              height: q(64),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: q(4),
              overflow: 'hidden',
              padding: `0 ${q(12)}`,
            }}
          >
            <span style={{
              color: '#fff', fontSize: q(28), fontWeight: 700,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              绑定邀请码-{player?.inviteCode ?? '---'}
            </span>
          </div>

          {/* 推荐人 | ID | 佣金+提现（group_8，三列） */}
          <div
            style={{
              display: 'flex', alignItems: 'center',
              margin: `${q(12)} ${q(42)} 0`,
              height: q(88),
            }}
          >
            {/* 推荐人 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
              <span style={{
                color: '#fff', fontSize: q(24), fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {(player as any)?.invitedByNickname ?? (player?.invitedBy ? `ID:${player.invitedBy}` : 'XXXXXXXXX')}
              </span>
              <span style={{ color: 'rgba(249,178,255,1)', fontSize: q(22), marginTop: q(6) }}>推荐人</span>
            </div>

            {/* 竖分隔线 */}
            <img src={IMG.vertDivider} alt="" style={{ width: q(2), height: q(73), objectFit: 'fill', margin: `0 ${q(8)}`, flexShrink: 0 }} />

            {/* ID 列 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
              <span style={{
                color: '#fff', fontSize: q(24), fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {player?.invitedBy ? `DB${player.invitedBy}` : 'DB9908890'}
              </span>
              <span style={{ color: 'rgba(249,178,255,1)', fontSize: q(22), marginTop: q(6) }}>ID</span>
            </div>

            {/* 竖分隔线 */}
            <img src={IMG.vertDivider} alt="" style={{ width: q(2), height: q(73), objectFit: 'fill', margin: `0 ${q(8)}`, flexShrink: 0 }} />

            {/* 佣金 + 提现 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: q(2) }}>
                <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(22) }}>￥</span>
                <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(30), fontWeight: 500 }}>
                  {parseFloat(String(player?.commissionBalance ?? '0')).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: q(8), marginTop: q(6) }}>
                <span style={{ color: 'rgba(249,178,255,1)', fontSize: q(22) }}>佣金</span>
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

        {/* ── 数据表格（group_10，真实数据来自 teamStats.weeklyStats） ── */}
        <div
          style={{
            background: `url(${IMG.tableAreaBg}) center/100% 100% no-repeat`,
            width: '100%',
            paddingTop: q(4),
            paddingBottom: q(4),
          }}
        >
          {/* 表头行 */}
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

          {/* 数据行（真实数据） */}
          {displayRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: `${q(30)} 0`, color: 'rgba(249,178,255,0.6)', fontSize: q(24) }}>
              暂无数据
            </div>
          ) : (
            displayRows.map((row, idx) => (
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
                  <span style={{ color: '#fff', fontSize: q(20) }}>{row.weekStart}</span>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ color: '#fff', fontSize: q(22) }}>{parseFloat(String(row.commissionRate)).toFixed(0)}%</span>
                </div>
                <div style={{ flex: 1.4, textAlign: 'center' }}>
                  <span style={{ color: '#fff', fontSize: q(22) }}>{row.totalMembers}</span>
                </div>
                <div style={{ flex: 1.6, textAlign: 'center' }}>
                  <span style={{ color: '#fff', fontSize: q(22) }}>{row.newMembers}</span>
                </div>
                <div style={{ flex: 1.8, textAlign: 'center' }}>
                  <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(22) }}>¥{parseFloat(String(row.totalRecharge)).toFixed(0)}</span>
                </div>
                <div style={{ flex: 1.8, textAlign: 'center' }}>
                  <span style={{ color: 'rgba(255,246,13,1)', fontSize: q(22) }}>¥{parseFloat(String(row.totalFlow)).toFixed(0)}</span>
                </div>
              </div>
            ))
          )}

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

      {/* ── 公共底部导航（永远沉底） ── */}
      <BottomNav active="fenxiang" />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      {/* ══════════════════════════════════════════════════════
          推广说明弹窗
          ══════════════════════════════════════════════════════ */}
      {showExplain && (
        <div
          onClick={() => setShowExplain(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: q(40),
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: q(670),
              maxHeight: '80vh',
              background: 'linear-gradient(180deg, #1a0a3e 0%, #0d0621 100%)',
              border: '1px solid rgba(150,80,255,0.5)',
              borderRadius: q(20),
              padding: `${q(32)} ${q(28)}`,
              overflowY: 'auto',
              boxShadow: '0 0 40px rgba(120,40,220,0.4)',
            }}
          >
            {/* 标题 */}
            <div style={{
              textAlign: 'center', marginBottom: q(24),
              fontSize: q(34), fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              推广说明
            </div>

            {/* 分隔线 */}
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(150,80,255,0.6), transparent)', marginBottom: q(20) }} />

            {/* 推广规则 */}
            <div style={{ marginBottom: q(20) }}>
              <div style={{ color: '#ffd700', fontSize: q(26), fontWeight: 700, marginBottom: q(12) }}>一、推广方式</div>
              <div style={{ color: 'rgba(230,210,255,0.9)', fontSize: q(22), lineHeight: 1.8 }}>
                分享您的专属邀请码或邀请链接给好友，好友通过您的邀请码注册即成为您的下级成员。您可以点击上方「复制网址」按钮快速复制邀请链接分享给好友。
              </div>
            </div>

            {/* 佣金说明 */}
            <div style={{ marginBottom: q(20) }}>
              <div style={{ color: '#ffd700', fontSize: q(26), fontWeight: 700, marginBottom: q(12) }}>二、佣金规则</div>
              <div style={{ color: 'rgba(230,210,255,0.9)', fontSize: q(22), lineHeight: 1.8 }}>
                您的下级成员每次充值，系统将按照当前佣金比例自动计算佣金并累计到您的佣金余额中。佣金比例根据您的团队规模和活跃度动态调整，团队越大、越活跃，佣金比例越高。
              </div>
            </div>

            {/* 佣金比例表 */}
            <div style={{ marginBottom: q(20) }}>
              <div style={{ color: '#ffd700', fontSize: q(26), fontWeight: 700, marginBottom: q(12) }}>三、佣金比例</div>
              <div style={{
                border: '1px solid rgba(150,80,255,0.3)',
                borderRadius: q(10),
                overflow: 'hidden',
              }}>
                {/* 表头 */}
                <div style={{
                  display: 'flex',
                  background: 'rgba(120,40,220,0.3)',
                  padding: `${q(10)} 0`,
                }}>
                  <div style={{ flex: 1, textAlign: 'center', color: '#ffd700', fontSize: q(22), fontWeight: 700 }}>团队人数</div>
                  <div style={{ flex: 1, textAlign: 'center', color: '#ffd700', fontSize: q(22), fontWeight: 700 }}>佣金比例</div>
                </div>
                {/* 数据行 */}
                {[
                  { range: '1 ~ 10 人', rate: '4%' },
                  { range: '11 ~ 50 人', rate: '6%' },
                  { range: '51 ~ 200 人', rate: '8%' },
                  { range: '201 ~ 500 人', rate: '10%' },
                  { range: '500 人以上', rate: '12%' },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    padding: `${q(10)} 0`,
                    borderTop: '1px solid rgba(150,80,255,0.15)',
                    background: i % 2 === 0 ? 'rgba(120,40,220,0.08)' : 'transparent',
                  }}>
                    <div style={{ flex: 1, textAlign: 'center', color: 'rgba(230,210,255,0.9)', fontSize: q(22) }}>{row.range}</div>
                    <div style={{ flex: 1, textAlign: 'center', color: 'rgba(255,246,13,1)', fontSize: q(22), fontWeight: 700 }}>{row.rate}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 提现说明 */}
            <div style={{ marginBottom: q(20) }}>
              <div style={{ color: '#ffd700', fontSize: q(26), fontWeight: 700, marginBottom: q(12) }}>四、佣金提现</div>
              <div style={{ color: 'rgba(230,210,255,0.9)', fontSize: q(22), lineHeight: 1.8 }}>
                佣金余额达到最低提现额度后，可点击「提现」按钮将佣金转入游戏余额。佣金按周结算，每周一自动统计上周数据。
              </div>
            </div>

            {/* 注意事项 */}
            <div style={{ marginBottom: q(20) }}>
              <div style={{ color: '#ffd700', fontSize: q(26), fontWeight: 700, marginBottom: q(12) }}>五、注意事项</div>
              <div style={{ color: 'rgba(230,210,255,0.9)', fontSize: q(22), lineHeight: 1.8 }}>
                1. 每位用户只能绑定一个推荐人，绑定后不可更改。<br/>
                2. 禁止通过虚假注册、刷单等方式骗取佣金，一经发现将冻结账户。<br/>
                3. 平台保留对推广活动的最终解释权。<br/>
                4. 如有疑问请联系在线客服。
              </div>
            </div>

            {/* 关闭按钮 */}
            <div
              onClick={() => setShowExplain(false)}
              style={{
                margin: `${q(10)} auto 0`,
                width: q(300), height: q(60),
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                borderRadius: q(30),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(120,40,220,0.5)',
              }}
            >
              <span style={{ color: '#fff', fontSize: q(28), fontWeight: 700 }}>我知道了</span>
            </div>
          </div>
        </div>
      )}
    </div>
    </PageSlideIn>
  );
}
