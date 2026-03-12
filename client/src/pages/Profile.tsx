/**
 * Profile.tsx — 「我的」页面
 * 严格还原蓝湖 lanhu_wode 设计稿
 * 布局：TopNav → PlayerInfoCard → VIP卡片 → 分享招募行 → 功能菜单列表 → 实名认证 → 音乐音效 → 退出登录 → BottomNav
 */
import { PageSlideIn } from '@/components/PageTransition';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';
import SettingsModal from '@/components/SettingsModal';
import SteamSettingsModal from '@/pages/SteamSettings';
import SecurityPasswordModal from '@/pages/SecurityPassword';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/';

// 我的页面专用切图
const WD = {
  // 页面背景（深紫色渐变）
  pageBg: CDN + '74d18b69057e89f0807e0d0ca7575514_57d00e7e.png',
  // 分享招募行背景
  shareRowBg: CDN + 'a61d46d78194157d311c32389d39cc3f_42336295.png',
  // 分享招募图标
  shareIcon: CDN + '600229944aa9c04afae9c035a316a6fe_a6634b70.png',
  // 箭头
  arrowRight: CDN + 'e0603ba4213d69b29db5d8db9a605a18_c4f9020a.png',
  // 菜单行背景1（我的记录）
  menuBg0: CDN + '659da56cf73308bfb4208365e6a2f88b_614cd7ce.png',
  // 菜单行背景2（STEAM）
  menuBg1: CDN + 'c71a92adbb8c056890154d48e83c0453_6c640253.png',
  // 菜单行背景3（安全密码）
  menuBg2: CDN + 'ae227e4a7db0fcf751dd2f770c69d4d9_f620672e.png',
  // 菜单图标1（我的记录）
  menuIcon0: CDN + '7f10c3bf7f42170b236350c03d14ce63_c6f293b5.png',
  // 菜单图标2（STEAM）
  menuIcon1: CDN + 'eb9ac6eabb1be862754eb31989971610_c0bb2029.png',
  // 菜单图标（安全密码）
  menuIcon2: CDN + '26e359d4a3780056f0401f0b6aacdf7b_143406fd.png',
  // 实名认证行背景
  realNameBg: CDN + '62dd1bc1b4fe3b2408cd114ae3166526_10ff2ed8.png',
  // 音乐音效行背景
  musicBg: CDN + 'f922b7b76b2da590622724e36208846c_4cdc7d0a.png',
  // 音乐图标
  musicIcon: CDN + 'dbbea9d72fb9c298e2ab017e7cb1247e_435ef4d7.png',
  // 音乐开关-开
  musicOn: CDN + 'cd980fd99599a03db61ebff862b15d73_65db3b8c.png',
  // 音乐开关-关
  musicOff: CDN + '1608392f7755887cc5fec3c7e9f6f52a_0a9092c2.png',
  // 退出登录左装饰
  logoutLeft: CDN + 'dc610d9243ec14bd0142f1a11ef46d9b_25331e88.png',
  // 退出登录右装饰
  logoutRight: CDN + '57d2b35cf93f3bbc485d643558f35d3b_1910808a.png',
  // VIP进度图
  vipProgress: CDN + 'd18c3f329695c8e72ef4bb3a42a92dce_0e011fd6.png',
  // 推荐人信息背景
  referrerBg: CDN + 'b3202758ce3be964ef044a6b0d7e249d_0646f668.png',
};

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

export default function Profile() {
  const [, navigate] = useLocation();
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [steamVisible, setSteamVisible] = useState(false);
  const [securityPwdVisible, setSecurityPwdVisible] = useState(false);

  const { data: player } = trpc.player.me.useQuery();
  const logoutMutation = trpc.player.logout.useMutation({
    onSuccess: () => navigate('/login'),
  });

  const menuItems = [
    { icon: WD.menuIcon0, bg: WD.menuBg0, label: '我的记录', sub: '资产明细', onClick: () => navigate('/my-records') },
    { icon: WD.menuIcon1, bg: WD.menuBg1, label: 'STEAM', sub: '已绑定', onClick: () => setSteamVisible(true) },
    { icon: WD.menuIcon2, bg: WD.menuBg2, label: '安全密码', sub: '已设置', onClick: () => setSecurityPwdVisible(true) },
    { icon: WD.menuIcon0, bg: WD.menuBg1, label: '邮件', sub: '站内信', onClick: () => navigate('/mailbox') },
  ];

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
      {/* 背景 */}
      <img
        src={WD.pageBg}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* 顶部固定区：TopNav + PlayerInfoCard，不随内容滚动 */}
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

        {/* 推荐人信息 */}
        {player?.invitedByNickname && (
          <div
            style={{
              margin: `${q(8)} ${q(30)} 0`,
              padding: `${q(16)} ${q(24)}`,
              background: 'rgba(5,4,18,0.6)',
              borderRadius: q(16),
              border: '1px solid rgba(120,60,220,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: q(8),
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: q(22) }}>
              推荐人：{player.invitedByNickname}
            </span>
          </div>
        )}

        {/* VIP 进度卡片 */}
        <div
          style={{
            margin: `${q(16)} ${q(30)} 0`,
            background: 'rgba(5,4,18,0.85)',
            borderRadius: q(44),
            border: '1px solid rgba(0,0,0,0.8)',
            padding: `${q(28)} ${q(30)}`,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* VIP 大字 */}
            <div style={{ position: 'relative', height: q(73), marginBottom: q(10) }}>
              <span style={{
                position: 'absolute',
                left: 0, top: 0,
                color: 'rgba(0,45,96,1)',
                fontSize: q(105),
                fontWeight: 700,
                lineHeight: q(34),
                WebkitTextStroke: `1px rgba(130,0,238,1)`,
              }}>
                VIP{player?.vipLevel ?? 0}
              </span>
              <span style={{
                position: 'absolute',
                left: 0, top: 0,
                color: 'rgba(248,254,255,1)',
                fontSize: q(105),
                fontWeight: 700,
                lineHeight: q(34),
                WebkitTextStroke: `2px rgba(9,254,255,1)`,
              }}>
                VIP{player?.vipLevel ?? 0}
              </span>
            </div>
            <span style={{ color: 'rgba(58,255,255,1)', fontSize: q(20), fontWeight: 500, display: 'block', marginTop: q(50) }}>
              距VIP{(player?.vipLevel ?? 0) + 1}还差200积分
            </span>
          </div>
          <img src={WD.vipProgress} alt="VIP进度" style={{ width: q(173), height: q(171), objectFit: 'contain' }} />
        </div>

        {/* 分享招募行 */}
        <div
          style={{
            margin: `${q(12)} ${q(30)} 0`,
            position: 'relative',
            height: q(100),
            cursor: 'pointer',
            borderRadius: q(20),
            overflow: 'hidden',
          }}
          onClick={() => navigate('/share')}
        >
          <img src={WD.menuBg0} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', height: '100%', padding: `0 ${q(25)}` }}>
            <img src={WD.shareIcon} alt="分享" style={{ width: q(72), height: q(72), objectFit: 'contain' }} />
            <span style={{ color: '#fff', fontSize: q(26), fontWeight: 500, marginLeft: q(20) }}>分享招募</span>
            <span style={{ color: 'rgba(249,178,255,1)', fontSize: q(24), marginLeft: 'auto' }}>
              收益：0
            </span>
            <img src={WD.arrowRight} alt=">" style={{ width: q(10), height: q(19), marginLeft: q(39), objectFit: 'contain' }} />
          </div>
        </div>

        {/* 功能菜单列表 */}
        <div style={{ margin: `${q(11)} ${q(30)} 0`, display: 'flex', flexDirection: 'column', gap: q(11) }}>
          {menuItems.map((item, idx) => (
            <div
              key={idx}
              style={{ position: 'relative', height: q(100), cursor: 'pointer', borderRadius: q(20), overflow: 'hidden' }}
              onClick={item.onClick}
            >
              <img src={item.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', height: '100%', padding: `0 ${q(25)}` }}>
                <img src={item.icon} alt={item.label} style={{ width: q(72), height: q(72), objectFit: 'contain' }} />
                <span style={{ color: '#fff', fontSize: q(26), fontWeight: 500, marginLeft: q(20) }}>{item.label}</span>
                <span style={{ color: 'rgba(249,178,255,1)', fontSize: q(24), marginLeft: 'auto' }}>{item.sub}</span>
                <img src={WD.arrowRight} alt=">" style={{ width: q(10), height: q(19), marginLeft: q(31), objectFit: 'contain' }} />
              </div>
            </div>
          ))}
        </div>

        {/* 实名认证行 */}
        <div
          style={{
            margin: `${q(11)} ${q(30)} 0`,
            position: 'relative',
            height: q(100),
            cursor: 'pointer',
            borderRadius: q(20),
            overflow: 'hidden',
          }}
        >
          <img src={WD.menuBg0} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', height: '100%', padding: `0 ${q(25)}` }}>
            <img src={WD.menuIcon2} alt="实名认证" style={{ width: q(72), height: q(72), objectFit: 'contain' }} />
            <span style={{ color: '#fff', fontSize: q(26), fontWeight: 500, marginLeft: q(20) }}>实名认证</span>
            <span style={{ color: 'rgba(249,178,255,1)', fontSize: q(22), marginLeft: 'auto' }}>
              {player?.phone ? `${player.phone.slice(0, 3)}****${player.phone.slice(-4)}` : '未认证'}
            </span>
            <img src={WD.arrowRight} alt=">" style={{ width: q(10), height: q(19), marginLeft: q(31), objectFit: 'contain' }} />
          </div>
        </div>

        {/* 音乐音效行 */}
        <div
          style={{
            margin: `${q(11)} ${q(30)} 0`,
            position: 'relative',
            height: q(100),
          }}
        >
          <img src={WD.musicBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', height: '100%', padding: `0 ${q(25)}` }}>
          <img src={WD.musicIcon} alt="音乐" style={{ width: q(72), height: q(72), objectFit: 'contain' }} />
          <span style={{ color: '#fff', fontSize: q(26), fontWeight: 500, marginLeft: q(16) }}>音乐</span>
          {/* 音乐开关 */}
          <div
            onClick={() => setMusicOn(v => !v)}
            style={{
              marginLeft: q(20),
              width: q(80),
              height: q(40),
              borderRadius: q(20),
              background: musicOn ? 'linear-gradient(90deg, #7c3aed, #06b6d4)' : 'rgba(80,80,80,0.6)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute',
              top: q(4),
              left: musicOn ? q(44) : q(4),
              width: q(32),
              height: q(32),
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.3s',
            }} />
          </div>

          {/* 音效 */}
          <span style={{ color: '#fff', fontSize: q(26), fontWeight: 500, marginLeft: q(30) }}>音效</span>
          <div
            onClick={() => setSfxOn(v => !v)}
            style={{
              marginLeft: q(20),
              width: q(80),
              height: q(40),
              borderRadius: q(20),
              background: sfxOn ? 'linear-gradient(90deg, #7c3aed, #06b6d4)' : 'rgba(80,80,80,0.6)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute',
              top: q(4),
              left: sfxOn ? q(44) : q(4),
              width: q(32),
              height: q(32),
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.3s',
            }} />
          </div>
          </div>
        </div>

        {/* 退出登录 */}
        <div
          style={{
            margin: `${q(20)} ${q(30)} 0`,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => logoutMutation.mutate()}
        >
          <img src={WD.logoutLeft} alt="" style={{ height: q(2), flex: 1, objectFit: 'fill', opacity: 0.6 }} />
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(120,40,200,0.8), rgba(200,40,120,0.8))',
              borderRadius: q(50),
              padding: `${q(20)} ${q(60)}`,
              margin: `0 ${q(20)}`,
            }}
          >
            <span style={{ color: '#fff', fontSize: q(28), fontWeight: 700, letterSpacing: 2 }}>退出登录</span>
          </div>
          <img src={WD.logoutLeft} alt="" style={{ height: q(2), flex: 1, objectFit: 'fill', opacity: 0.6, transform: 'scaleX(-1)' }} />
        </div>
      </div>

      {/* 底部导航 */}
      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <BottomNav active="wode" />
      </div>
      {/* 设置弹窗：position:absolute，受 phone-container 约束 */}
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      <SteamSettingsModal visible={steamVisible} onClose={() => setSteamVisible(false)} />
      <SecurityPasswordModal visible={securityPwdVisible} onClose={() => setSecurityPwdVisible(false)} />
    </div>
    </PageSlideIn>
  );
}
