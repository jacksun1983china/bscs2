/**
 * Share.tsx — 分享推广页面
 * 严格还原蓝湖设计稿
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ASSETS } from '@/lib/assets';
import { getAvatarUrl } from '@/lib/assets';
import { toast } from 'sonner';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';

const IMG = {
  bg: `${CDN}/6f3f4f9ea30e716a5053d600b7117c41_26d0ef36.png`,
  backArrow: `${CDN}/3bc0742b84d7b4e7c8ec44a92613a4a6_ce48005e.png`,
  userCardBg: `${CDN}/630be222fa6506f0491dc5ee3de578d4_5e4a24b7.png`,
  goldIcon: `${CDN}/75fed2caf5a1839567925db0cf8d5c31_15cdfd31.png`,
  goldLabel: `${CDN}/747806985917308abfeb32ca097fadf6_0540e636.png`,
  diamondIcon: `${CDN}/bb2f4c51f7018ff894433990b8f78d81_95128c53.png`,
  diamondLabel: `${CDN}/5e7b0ac0770a98f000f9a1518141abe8_ffabe79f.png`,
  badge: `${CDN}/a3f362f5618fd1e413f25b6e4147b2f5_722379ab.png`,
  divider: `${CDN}/25b2325fa14ea90f94c9fc3f5ce40d62_23bc1528.png`,
  referralDivider: `${CDN}/1085edfbf6f34539391becf7d1e84e9f_f78f3a58.png`,
  avatarFrame: `${CDN}/19cbfd9ff86164d3ccfaaf4237493fcf_b8d7e27b.png`,
  copyBtn: `${CDN}/2e086404b095ab79c771f4408340ae3e_a62bedda.png`,
  explainBtn: `${CDN}/42e0db3a6d61f371a2a318096b52433d_c5f7dccb.png`,
  currentPeriodTab: `${CDN}/49d37573458f5acd166c0eb13a6123e5_a90c8173.png`,
  lastPeriodTab: `${CDN}/5c450dcc7c2a4c347cecd38c3c978117_2f74a38c.png`,
  tableHeaderBg: `${CDN}/5f0b48cce7ea6c29a81146a93d037ed8_2b3e22a7.png`,
  tableRowBg: `${CDN}/662c892202c3ced30794bc30977ad0b1_3fca9687.png`,
  withdrawBtn: `${CDN}/72b7cb6196a8827b4df51ffeed30adf8_7bc592dd.png`,
  inviteLinkBg: `${CDN}/997e76a1e73bb6c6a4e550396bb3da05_74924def.png`,
  qrCodeArea: `${CDN}/a78ff2c9eac44ab8bd216a324022bc2a_mergeImage_77f7787f.png`,
  shareLinkBg: `${CDN}/aef3445e30cf281efeb479716935aa06_b2309133.png`,
  referrerBg: `${CDN}/c92d35a635ab4f98e481e7c156714b26_1f855e5b.png`,
  tableRowAlt: `${CDN}/cbc9cd0619138d77156580db56afcea0_3c7dffc0.png`,
  vipBadge: `${CDN}/d6b4c51ef1fa8bc9fd27845c60568dbe_86eaee89.png`,
  periodSelector: `${CDN}/dcc29addfc45b374d2b76c3b79587291_0a011e6f.png`,
  navBg: `${CDN}/6e427840d43f612398e50388b82970c6_cda12438.png`,
  navWode: `${CDN}/3122f1229eddce45807b2d5fba849c8b_ae9637dd.png`,
  navFenxiang: `${CDN}/3fa18b2e3e2c283312bd26e1c624ec1e_e5b6087e.png`,
  navBeibao: `${CDN}/cdc98d58eea0f82317280d74789b0d89_67afd33b.png`,
  navChongzhi: `${CDN}/b4926f25ec6fdfc64ee5d1799d704fcc_36022a62.png`,
  navDatingCenter: `${CDN}/8e38cd263fceb711564aca38e5ad1bac_ac9e64aa.png`,
};



export default function Share() {
  const [, navigate] = useLocation();
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
    <div className="phone-container" style={{ background: '#0d0621', minHeight: '100vh', overflowY: 'auto', position: 'relative' }}>
      {/* 背景图 */}
      <img src={ASSETS.bg} alt="" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, paddingBottom: 100 }}>
        {/* 顶部导航 */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 14px 8px', height: 52 }}>
          <img src={IMG.backArrow} alt="返回" style={{ width: 18, height: 16, cursor: 'pointer' }} onClick={() => navigate('/')} />
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 600, flex: 1, textAlign: 'center', marginRight: 18 }}>分享</span>
        </div>

        {/* 用户信息卡 */}
        <div style={{ margin: '8px 14px 0', position: 'relative' }}>
          <div style={{ background: `url(${IMG.userCardBg}) center/100% 100% no-repeat`, borderRadius: 12, padding: '14px 14px 14px 80px', minHeight: 90, position: 'relative' }}>
            {/* 头像 */}
            <div style={{ position: 'absolute', left: -8, top: -10, width: 80, height: 90, background: `url(${IMG.avatarFrame}) center/100% 100% no-repeat` }}>
              <img src={avatarUrl} alt="头像" style={{ position: 'absolute', top: '12%', left: '12%', width: '76%', height: '76%', objectFit: 'cover', borderRadius: '50%' }} />
            </div>
            {/* 昵称 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{player?.nickname ?? '用户'}</span>
              <img src={IMG.badge} alt="" style={{ height: 18, objectFit: 'contain' }} />
            </div>
            <div style={{ color: '#9980cc', fontSize: 12, marginTop: 2 }}>ID：{player?.id ?? '---'}</div>
            {/* 金币 & 钻石 */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `url(${IMG.goldLabel}) center/100% 100% no-repeat`, padding: '2px 10px 2px 24px', position: 'relative', minWidth: 80, height: 28 }}>
                <img src={IMG.goldIcon} alt="" style={{ position: 'absolute', left: -8, top: -4, width: 28, height: 28 }} />
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{player?.gold ?? 0}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `url(${IMG.diamondLabel}) center/100% 100% no-repeat`, padding: '2px 10px 2px 24px', position: 'relative', minWidth: 80, height: 28 }}>
                <img src={IMG.diamondIcon} alt="" style={{ position: 'absolute', left: -8, top: -4, width: 28, height: 28 }} />
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{player?.diamond ?? 0}</span>
              </div>
            </div>
          </div>
          {/* VIP 标签 */}
          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #f5a623 0%, #e8750a 100%)', borderRadius: 4, padding: '2px 10px', fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 6, letterSpacing: 0.5 }}>
            VIP{player?.vipLevel ?? 1}
          </div>
        </div>

        {/* 邀请码区域 */}
        <div style={{ margin: '10px 14px 0', background: `url(${IMG.inviteLinkBg}) center/100% 100% no-repeat`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, minHeight: 56 }}>
          <span style={{ color: '#9980cc', fontSize: 13 }}>邀请码：</span>
          <span style={{ color: 'rgba(255,246,13,1)', fontSize: 18, fontWeight: 700, letterSpacing: 2, flex: 1 }}>
            {player?.inviteCode ?? '---'}
          </span>
          <div onClick={copyCode} style={{ background: `url(${IMG.copyBtn}) center/100% 100% no-repeat`, width: 56, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 12 }}>复制</span>
          </div>
          <div onClick={() => toast.info('说明功能即将上线')} style={{ background: `url(${IMG.explainBtn}) center/100% 100% no-repeat`, width: 56, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 12 }}>说明</span>
          </div>
        </div>

        {/* 分享链接 */}
        <div onClick={copyLink} style={{ margin: '6px 14px 0', background: `url(${IMG.shareLinkBg}) center/100% 100% no-repeat`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontSize: 13 }}>绑定邀请码-{player?.inviteCode ?? '---'}</span>
        </div>

        {/* 推荐人 & 佣金 */}
        <div style={{ margin: '6px 14px 0', background: `url(${IMG.referrerBg}) center/100% 100% no-repeat`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 72 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 14 }}>{player?.invitedBy ? `ID：${player.invitedBy}` : '暂无推荐人'}</div>
            <div style={{ color: 'rgba(249,178,255,1)', fontSize: 12, marginTop: 3 }}>推荐人</div>
          </div>
          <img src={IMG.referralDivider} alt="" style={{ width: 1, height: 50 }} />
          <div style={{ marginLeft: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span style={{ color: '#fff', fontSize: 12 }}>￥</span>
              <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{parseFloat(player?.commissionBalance ?? '0').toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <span style={{ color: '#fff', fontSize: 12 }}>佣金</span>
              <div onClick={() => withdrawMutation.mutate()} style={{ background: `url(${IMG.withdrawBtn}) center/100% 100% no-repeat`, width: 56, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 12 }}>提现</span>
              </div>
            </div>
          </div>
        </div>

        {/* 周期选择 */}
        <div style={{ margin: '10px 14px 0', background: `url(${IMG.periodSelector}) center/100% 100% no-repeat`, borderRadius: 8, height: 40, display: 'flex', alignItems: 'center' }}>
          <div onClick={() => setActivePeriod('current')} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ color: activePeriod === 'current' ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: activePeriod === 'current' ? 700 : 400 }}>当前周期</span>
          </div>
          <div onClick={() => setActivePeriod('last')} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ color: activePeriod === 'last' ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: activePeriod === 'last' ? 700 : 400 }}>上个周期</span>
          </div>
        </div>

        {/* 数据表格 */}
        <div style={{ margin: '0 14px' }}>
          {/* 表头 */}
          <div style={{ background: `url(${IMG.tableHeaderBg}) center/100% 100% no-repeat`, height: 40, display: 'flex', alignItems: 'center' }}>
            {['周期', '比例', '团队\n总人数', '单日\n推广人数', '团队充值\n总金额', '团队充值\n总流水'].map((h, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ color: '#fff', fontSize: 11, whiteSpace: 'pre-line', lineHeight: 1.2 }}>{h}</span>
              </div>
            ))}
          </div>
          {/* 数据行 */}
          <div style={{ background: `url(${IMG.tableRowBg}) center/100% 100% no-repeat`, height: 40, display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, textAlign: 'center' }}><span style={{ color: '#fff', fontSize: 11 }}>-</span></div>
            <div style={{ flex: 1, textAlign: 'center' }}><span style={{ color: '#fff', fontSize: 11 }}>4%</span></div>
            <div style={{ flex: 1, textAlign: 'center' }}><span style={{ color: '#fff', fontSize: 11 }}>{teamStats?.total ?? 0}</span></div>
            <div style={{ flex: 1, textAlign: 'center' }}><span style={{ color: '#fff', fontSize: 11 }}>{teamStats?.todayCount ?? 0}</span></div>
            <div style={{ flex: 1, textAlign: 'center' }}><span style={{ color: '#fff', fontSize: 11 }}>-</span></div>
            <div style={{ flex: 1, textAlign: 'center' }}><span style={{ color: '#fff', fontSize: 11 }}>-</span></div>
          </div>
        </div>

        {/* QR 码区域 */}
        <div style={{ margin: '10px 14px 0' }}>
          <img src={IMG.qrCodeArea} alt="二维码" style={{ width: '100%', height: 'auto', borderRadius: 10 }} />
        </div>
      </div>

      {/* 底部导航 */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, zIndex: 100 }}>
        <div style={{ position: 'relative', height: 56 }}>
          <img src={ASSETS.tucheng7} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
            {[
              { key: 'wode', icon: ASSETS.wode, label: '我的', route: '/profile' },
              { key: 'fenxiang', icon: IMG.navFenxiang, label: '分享', route: '/share' },
              { key: 'dating', icon: ASSETS.dating, label: '大厅', route: '/', isCenter: true },
              { key: 'beibao', icon: ASSETS.beibao, label: '背包', route: '/bag' },
              { key: 'chongzhi', icon: ASSETS.chongzhi, label: '充值', route: '/deposit' },
            ].map(tab => (
              <div key={tab.key} onClick={() => navigate(tab.route)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, paddingBottom: tab.isCenter ? 8 : 0, cursor: 'pointer' }}>
                {tab.isCenter ? (
                  <div style={{ marginTop: -22 }}>
                    <img src={tab.icon} alt={tab.label} style={{ width: 60, height: 50, objectFit: 'contain' }} />
                    <div style={{ color: '#aaa', fontSize: 11, textAlign: 'center', marginTop: 2 }}>{tab.label}</div>
                  </div>
                ) : (
                  <>
                    <img src={tab.icon} alt={tab.label} style={{ width: 26, height: 26, objectFit: 'contain' }} />
                    <span style={{ color: tab.key === 'fenxiang' ? '#c084fc' : '#888', fontSize: 10, fontWeight: tab.key === 'fenxiang' ? 700 : 400 }}>{tab.label}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
