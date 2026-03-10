/**
 * TopNav — 公共顶部导航组件
 * 两种模式：
 *   - showLogo=true（默认，首页）：左侧显示 BDCS2 LOGO
 *   - showLogo=false（子页面）：左侧显示蓝紫色菱形返回按钮
 * 右侧固定显示：客服、VIP、全部 三个图标
 * 布局：左右两端对齐（space-between），互不影响
 *
 * 基准：750px 宽，使用 cqw 响应式单位
 * 依赖父容器的 containerType: inline-size 来计算 cqw
 */
import { useLocation } from 'wouter';
import { LANHU, ASSETS } from '@/lib/assets';

// px → cqw 转换（基准 750px）
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

interface TopNavProps {
  /** true = 首页模式（显示LOGO），false = 子页面模式（显示返回按钮）。默认 false */
  showLogo?: boolean;
  /** 返回按钮点击回调，不传则默认 navigate(-1) */
  onBackClick?: () => void;
  /** 额外的容器样式 */
  style?: React.CSSProperties;
}

export default function TopNav({ showLogo = false, onBackClick, style }: TopNavProps) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      window.history.back();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: q(122),
        marginTop: q(13),
        paddingLeft: q(26),
        paddingRight: q(24),
        boxSizing: 'border-box',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* 左侧：LOGO 或 返回按钮 */}
      {showLogo ? (
        <img
          src={ASSETS.bdcs2Logo}
          alt="LOGO"
          style={{ height: q(110), width: 'auto', objectFit: 'contain', flexShrink: 0 }}
        />
      ) : (
        <img
          src={LANHU.backBtn}
          alt="返回"
          onClick={handleBack}
          style={{ width: q(58), height: q(58), objectFit: 'contain', flexShrink: 0, cursor: 'pointer' }}
        />
      )}

      {/* 右侧图标组，固定靠右，不受左侧影响 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: q(18), flexShrink: 0, marginTop: q(22) }}>
        <img
          src={LANHU.kefuIcon}
          alt="客服"
          onClick={() => navigate('/kefu')}
          style={{ width: q(79), height: q(80), cursor: 'pointer', objectFit: 'contain' }}
        />
        <img
          src={LANHU.vipIcon}
          alt="VIP"
          style={{ width: q(79), height: q(80), cursor: 'pointer', objectFit: 'contain' }}
        />
        <img
          src={LANHU.allGamesIcon}
          alt="全部"
          style={{ width: q(79), height: q(80), cursor: 'pointer', objectFit: 'contain' }}
        />
      </div>
    </div>
  );
}
