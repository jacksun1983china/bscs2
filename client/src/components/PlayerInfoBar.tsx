/**
 * PlayerInfoBar — 公共用户信息栏组件
 * 1:1 还原设计稿：头像框 + 名字 + 徽章 + ID + VIP标签 + 金币/钻石
 * 可在首页、充值页、背包页等多处复用
 *
 * 原型图尺寸参考（750px设计稿）：
 *  - 整体高度约 102px（k1背景图 739x102）
 *  - 头像框：touxiangk 171x179 → 显示 72x75
 *  - 头像内圆：约占头像框 68% 宽高，居中
 *  - 徽章：huizhang 67x46 → 显示 40x27
 *  - 加号：jiahao 35x35 → 显示 28x28
 *  - 金币图标：jinbi1/jinbi2 42x42 → 显示 26x26
 *  - 箭头：gengduo 10x19 → 显示 7x13
 *
 * 头像层叠关系（关键）：
 *  z-index 0: k1背景图
 *  z-index 1: 头像框图片（touxiangk，深紫色圆形背景+光效边框）
 *  z-index 2: 头像图片（圆形裁剪，覆盖头像框中心深色区域）
 *  z-index 3: 头像框光效边框（仅边框部分，用 mix-blend-mode: lighten）
 */
import { useLocation } from 'wouter';
import { ASSETS, getAvatarUrl } from '@/lib/assets';
import { trpc } from '@/lib/trpc';

interface PlayerInfoBarProps {
  /** 是否显示退出按钮（首页用），默认 false */
  showLogout?: boolean;
  /** 点击加号的回调 */
  onAddFriend?: () => void;
}

export default function PlayerInfoBar({ showLogout = false, onAddFriend }: PlayerInfoBarProps) {
  const [, navigate] = useLocation();
  const { data: player } = trpc.player.me.useQuery(undefined, { staleTime: 30_000 });
  const logoutMutation = trpc.player.logout.useMutation();
  const handleLogout = () => {
    logoutMutation.mutate();
    // 强制整页刷新跳转，避免 SPA 路由延迟
    window.location.href = '/login';
  };

  const vipGradients: Record<number, string> = {
    0: 'linear-gradient(135deg, #888 0%, #555 100%)',
    1: 'linear-gradient(135deg, #f5a623 0%, #e8750a 100%)',
    2: 'linear-gradient(135deg, #e8750a 0%, #c0392b 100%)',
    3: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
    4: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)',
    5: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
    6: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
    7: 'linear-gradient(135deg, #ffd700 0%, #f59e0b 100%)',
  };

  if (!player) {
    return (
      <div
        style={{
          position: 'relative',
          margin: '6px 10px',
          borderRadius: 12,
          overflow: 'hidden',
          cursor: 'pointer',
          minHeight: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(30,10,65,0.95) 0%, rgba(15,5,40,0.98) 100%)',
          border: '1px solid rgba(120,60,220,0.35)',
        }}
        onClick={() => navigate('/login')}
      >
        <span style={{ color: '#a78bfa', fontSize: 14, fontWeight: 600 }}>点击登录 / 注册</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        margin: '6px 10px',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* k1 背景图：739x102，铺满整个容器 */}
      <img
        src={ASSETS.k1}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          zIndex: 0,
        }}
      />

      {/* 内容层 */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '8px 10px 8px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {/* 上行：头像 + 名字区 + 加号 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* ── 头像区 ── */}
          {/*
           * 头像框 touxiangk: 171x179 → 显示 72x75
           * 内部圆形区域（深紫色背景）约占 68%，居中
           * 头像图片覆盖在头像框上方（z-index更高），圆形裁剪
           * 头像框再叠一层 mix-blend-mode:lighten 保留光效边框
           */}
          <div style={{ position: 'relative', width: 72, height: 75, flexShrink: 0 }}>
            {/* 层1：头像框底图（深紫色圆形背景） */}
            <img
              src={ASSETS.touxiangk}
              alt="头像框"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />
            {/* 层2：头像图片（圆形裁剪，覆盖头像框中心深色区域） */}
            {/* touxiangk 内圆约占整体的 68%，居中 → top/left 约 16%，宽高约 68% */}
            <div
              style={{
                position: 'absolute',
                top: '14%',
                left: '14%',
                width: '72%',
                height: '72%',
                borderRadius: '50%',
                overflow: 'hidden',
                zIndex: 2,
              }}
            >
              <img
                src={getAvatarUrl(player.avatar)}
                alt="头像"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {/* 层3：头像框光效叠加（lighten混合，深色透明，只保留亮色光效边框） */}
            <img
              src={ASSETS.touxiangk}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                zIndex: 3,
                mixBlendMode: 'lighten',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* ── 名字 + ID + VIP ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* 名字行：昵称 + 徽章 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  textShadow: '0 0 8px rgba(180,100,255,0.6)',
                  letterSpacing: 0.5,
                }}
              >
                {player.nickname}
              </span>
              {/* 徽章：huizhang 67x46 → 40x27 */}
              <img
                src={ASSETS.huizhang}
                alt="徽章"
                style={{ width: 40, height: 27, objectFit: 'contain' }}
              />
            </div>

            {/* ID行 */}
            <div style={{ color: '#b0a0d8', fontSize: 12 }}>
              ID：{player.id}
            </div>

            {/* VIP标签 */}
            <div
              style={{
                display: 'inline-flex',
                alignSelf: 'flex-start',
                background: vipGradients[player.vipLevel] ?? vipGradients[0],
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: 0.5,
                boxShadow: '0 1px 6px rgba(0,0,0,0.4)',
              }}
            >
              VIP{player.vipLevel}
            </div>
          </div>

          {/* ── 右侧按钮 ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {/* 加号：jiahao 35x35 → 28x28 */}
            <img
              src={ASSETS.jiahao}
              alt="加好友"
              style={{ width: 28, height: 28, objectFit: 'contain', cursor: 'pointer' }}
              onClick={onAddFriend}
            />
            {showLogout && (
              <div
                onClick={handleLogout}
                style={{
                  color: 'rgba(180,150,255,0.7)',
                  fontSize: 10,
                  cursor: 'pointer',
                  border: '1px solid rgba(120,60,220,0.4)',
                  borderRadius: 4,
                  padding: '1px 5px',
                }}
              >
                退出
              </div>
            )}
          </div>
        </div>

        {/* 分隔线 */}
        <div
          style={{
            height: 1,
            background: 'rgba(120,60,220,0.25)',
            margin: '6px 0 5px',
          }}
        />

        {/* 下行：金币 + 箭头 + 钻石 + 箭头 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 金币 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {/* jinbi1: 42x42 → 26x26 */}
            <img src={ASSETS.jinbi1} alt="金币" style={{ width: 26, height: 26 }} />
            <span style={{ color: '#ffd700', fontSize: 14, fontWeight: 700 }}>
              {parseFloat(player.gold || '0').toFixed(0)}
            </span>
          </div>
          {/* 箭头：gengduo 10x19 → 7x13 */}
          <img src={ASSETS.gengduo} alt=">" style={{ width: 7, height: 13, opacity: 0.7 }} />

          {/* 钻石 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <img src={ASSETS.jinbi2} alt="钻石" style={{ width: 26, height: 26 }} />
            <span style={{ color: '#7df9ff', fontSize: 14, fontWeight: 700 }}>
              {parseFloat(player.diamond || '0').toFixed(0)}
            </span>
          </div>
          <img src={ASSETS.gengduo} alt=">" style={{ width: 7, height: 13, opacity: 0.7 }} />
        </div>
      </div>
    </div>
  );
}
