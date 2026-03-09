/**
 * BottomNav — 公共底部导航组件
 * 所有游戏页面共用，1:1 还原设计稿
 * 图标尺寸：普通 38x38，大厅中央 90x74（突出导航栏上方）
 */
import { useLocation } from 'wouter';
import { ASSETS } from '@/lib/assets';

const TAB_ITEMS: Array<{ key: string; icon: string; label: string; route: string; isCenter?: boolean }> = [
  { key: 'wode',     icon: ASSETS.wode,     label: '我的',   route: '/profile' },
  { key: 'fenxiang', icon: ASSETS.fenxiang, label: '分享',   route: '/share' },
  { key: 'dating',   icon: ASSETS.dating,   label: '大厅',   route: '/',       isCenter: true },
  { key: 'beibao',   icon: ASSETS.beibao,   label: '背包',   route: '/bag' },
  { key: 'chongzhi', icon: ASSETS.chongzhi, label: '充值',   route: '/recharge' },
];

interface BottomNavProps {
  /** 当前激活的 tab key，默认 'dating' */
  active?: string;
}

export default function BottomNav({ active = 'dating' }: BottomNavProps) {
  const [, navigate] = useLocation();

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 导航栏背景：高度 70px，与原版比例一致 */}
      <img
        src={ASSETS.tucheng7}
        alt=""
        style={{ width: '100%', display: 'block', height: 70 }}
      />
      {/* 图标层 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {TAB_ITEMS.map(tab => (
          <div
            key={tab.key}
            onClick={() => navigate(tab.route)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              cursor: 'pointer',
              paddingBottom: tab.isCenter ? 0 : 4,
            }}
          >
            {tab.isCenter ? (
              /* 大厅：大型徽章图标，突出于导航栏上方 */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginTop: -36,
                }}
              >
                <img
                  src={tab.icon}
                  alt={tab.label}
                  style={{
                    width: 90,
                    height: 74,
                    objectFit: 'contain',
                    filter:
                      active === tab.key
                        ? 'drop-shadow(0 0 8px rgba(192,132,252,0.8))'
                        : 'none',
                  }}
                />
              </div>
            ) : (
              <>
                <img
                  src={tab.icon}
                  alt={tab.label}
                  style={{
                    width: 38,
                    height: 38,
                    objectFit: 'contain',
                    filter:
                      active === tab.key
                        ? 'drop-shadow(0 0 6px rgba(192,132,252,0.9)) brightness(1.2)'
                        : 'brightness(0.7)',
                  }}
                />
                <span
                  style={{
                    color: active === tab.key ? '#c084fc' : '#666',
                    fontSize: 11,
                    fontWeight: active === tab.key ? 700 : 400,
                  }}
                >
                  {tab.label}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
