/**
 * BottomNav — 公共底部导航组件（最终版，与首页完全一致）
 * 所有游戏页面共用，1:1 还原蓝湖设计稿
 * 基准：750px 宽，使用 cqw 响应式单位
 * 永远沉底（父容器为 phone-container flex column，本组件 flexShrink:0 沉底）
 * 注意：不在自身设置 containerType，依赖父容器（phone-container 内的 flex 容器）的 containerType: inline-size
 */
import { useLocation } from 'wouter';
import { LANHU } from '@/lib/assets';
import { useSound } from '@/hooks/useSound';

// px → cqw 转换（基准 750px）
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

interface BottomNavProps {
  /** 当前激活的 tab key（暂未使用高亮，保留接口兼容性） */
  active?: string;
}

export default function BottomNav({ active: _active }: BottomNavProps) {
  const [, navigate] = useLocation();
  const { playClick } = useSound();

  const go = (path: string) => {
    playClick();
    navigate(path);
  };

  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        width: '100%',
        height: q(90),
        zIndex: 100,
        backgroundImage: `url(${LANHU.bottomNavBg})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        /* 不设置 containerType，依赖父容器的 containerType: inline-size 来计算 cqw */
      }}
    >
      {/* 我的 */}
      <div
        onClick={() => go('/profile')}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: q(60), marginLeft: q(65), cursor: 'pointer', flexShrink: 0, gap: q(4),
        }}
      >
        <img src={LANHU.myIcon} alt="我的" style={{ width: q(60), height: q(60), objectFit: 'contain' }} />
        <span style={{
          textShadow: '0px 1px 5px rgba(33,0,80,0.67)', color: 'rgba(217,148,255,1)',
          fontSize: q(22), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500,
          whiteSpace: 'nowrap', lineHeight: 1,
        }}>我的</span>
      </div>

      {/* 分享 */}
      <div
        onClick={() => go('/share')}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: q(60), marginLeft: q(76), cursor: 'pointer', flexShrink: 0, gap: q(4),
        }}
      >
        <img src={LANHU.shareIcon} alt="分享" style={{ width: q(60), height: q(60), objectFit: 'contain' }} />
        <span style={{
          textShadow: '0px 1px 5px rgba(33,0,80,0.67)', color: 'rgba(217,148,255,1)',
          fontSize: q(22), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500,
          whiteSpace: 'nowrap', lineHeight: 1,
        }}>分享</span>
      </div>

      {/* 背包（跳过大厅中心位置） */}
      <div
        onClick={() => go('/backpack')}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: q(60), marginLeft: q(244), cursor: 'pointer', flexShrink: 0, gap: q(4),
        }}
      >
        <img src={LANHU.bagIcon} alt="背包" style={{ width: q(60), height: q(60), objectFit: 'contain' }} />
        <span style={{
          textShadow: '0px 1px 5px rgba(33,0,80,0.67)', color: 'rgba(217,148,255,1)',
          fontSize: q(22), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500,
          whiteSpace: 'nowrap', lineHeight: 1,
        }}>背包</span>
      </div>

      {/* 充值 */}
      <div
        onClick={() => go('/recharge')}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: q(60), marginLeft: q(69), cursor: 'pointer', flexShrink: 0, gap: q(4),
        }}
      >
        <img src={LANHU.rechargeIcon} alt="充值" style={{ width: q(60), height: q(60), objectFit: 'contain' }} />
        <span style={{
          textShadow: '0px 1px 5px rgba(33,0,80,0.67)', color: 'rgba(217,148,255,1)',
          fontSize: q(22), fontFamily: 'Alibaba-PuHuiTi-M, sans-serif', fontWeight: 500,
          whiteSpace: 'nowrap', lineHeight: 1,
        }}>充值</span>
      </div>

      {/* 大厅中心图标 absolute */}
      <img
        src={LANHU.hallIcon}
        alt="大厅"
        onClick={() => go('/')}
        style={{
          position: 'absolute', left: q(300), top: q(-37),
          width: q(151), height: q(124), objectFit: 'contain', cursor: 'pointer',
        }}
      />
    </div>
  );
}
