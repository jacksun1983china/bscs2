/**
 * VipPage.tsx — VIP 等级界面
 * 点击顶部 VIP 图标进入
 * VIP 0-10 共 11 级，按充值金额升级
 * VIP0 显示灰色原型图标，VIP1-10 使用提供的图标
 */
import { PageSlideIn } from '@/components/PageTransition';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

// VIP 图标 CDN URLs（VIP1-10）
const VIP_ICONS: Record<number, string> = {
  1: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/1@2x_544e8be4.png',
  2: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/2@2x_a0938465.png',
  3: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/3@2x_2347673a.png',
  4: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/4@2x_3ef4ca2d.png',
  5: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/5@2x_f850ddcf.png',
  6: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/6@2x_506a1d24.png',
  7: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/7@2x_a432c161.png',
  8: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/8@2x_c782b5ce.png',
  9: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/9@2x_cf5ebd49.png',
  10: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/10@2x_1cb51de9.png',
};

// VIP0 灰色图标（SVG 原型）
function Vip0Icon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="38" stroke="#555" strokeWidth="2" fill="rgba(40,40,60,0.8)" />
      <text x="40" y="46" textAnchor="middle" fill="#888" fontSize="18" fontWeight="bold" fontFamily="Orbitron, sans-serif">VIP</text>
      <text x="40" y="62" textAnchor="middle" fill="#666" fontSize="12" fontFamily="Orbitron, sans-serif">0</text>
    </svg>
  );
}

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

export default function VipPage() {
  const [, navigate] = useLocation();
  const { data: player } = trpc.player.me.useQuery(undefined, { staleTime: 30_000 });
  const { data: vipConfigs = [] } = trpc.public.vipConfigs.useQuery(undefined, { staleTime: 60_000 });

  const currentLevel = player?.vipLevel ?? 0;
  const totalRecharge = parseFloat(player?.totalRecharge || '0');

  // 找到当前等级配置和下一等级配置
  const currentConfig = vipConfigs.find(c => c.level === currentLevel);
  const nextConfig = vipConfigs.find(c => c.level === currentLevel + 1);

  // 计算进度条
  const currentRequired = currentConfig?.requiredPoints ?? 0;
  const nextRequired = nextConfig?.requiredPoints ?? currentRequired;
  const progress = nextRequired > currentRequired
    ? Math.min(100, ((totalRecharge - currentRequired) / (nextRequired - currentRequired)) * 100)
    : 100;

  return (
    <PageSlideIn>
    <div
      className="phone-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        containerType: 'inline-size',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0d0621 0%, #1a0a3a 40%, #0d0621 100%)',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* 背景装饰 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '-20%',
          width: '80%', height: '60%',
          background: 'radial-gradient(ellipse, rgba(120,40,220,0.15) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', top: '20%', right: '-20%',
          width: '70%', height: '50%',
          background: 'radial-gradient(ellipse, rgba(40,120,220,0.1) 0%, transparent 70%)',
        }} />
      </div>

      {/* 顶部导航 */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center',
        padding: `${q(20)} ${q(24)}`,
        borderBottom: '1px solid rgba(120,60,220,0.2)',
      }}>
        <button
          onClick={() => navigate('/profile')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#c084fc', fontSize: q(28), padding: `0 ${q(8)}`,
            display: 'flex', alignItems: 'center',
          }}
        >
          ‹
        </button>
        <span style={{
          flex: 1, textAlign: 'center',
          color: '#fff', fontSize: q(32), fontWeight: 700,
          fontFamily: '"Orbitron", sans-serif',
          background: 'linear-gradient(90deg, #c084fc, #7df9ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          VIP 特权
        </span>
        <div style={{ width: q(44) }} />
      </div>

      {/* 当前VIP状态卡片 */}
      <div style={{
        margin: `${q(24)} ${q(20)}`,
        background: 'linear-gradient(135deg, rgba(30,10,65,0.95) 0%, rgba(15,5,40,0.98) 100%)',
        border: '1.5px solid rgba(120,60,220,0.5)',
        borderRadius: q(20),
        padding: `${q(32)} ${q(28)}`,
        boxShadow: '0 0 30px rgba(120,40,220,0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 卡片光效 */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(192,132,252,0.8), transparent)',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: q(24) }}>
          {/* VIP 图标 */}
          <div style={{ flexShrink: 0 }}>
            {currentLevel === 0 ? (
              <Vip0Icon size={parseInt(q(100))} />
            ) : (
              <img
                src={VIP_ICONS[currentLevel]}
                alt={`VIP${currentLevel}`}
                style={{ width: q(100), height: q(100), objectFit: 'contain' }}
              />
            )}
          </div>

          {/* VIP 信息 */}
          <div style={{ flex: 1 }}>
            <div style={{
              color: '#fff', fontSize: q(36), fontWeight: 900,
              fontFamily: '"Orbitron", sans-serif',
              textShadow: currentLevel > 0 ? '0 0 20px rgba(192,132,252,0.8)' : 'none',
            }}>
              VIP {currentLevel}
            </div>
            <div style={{ color: '#9980cc', fontSize: q(24), marginTop: q(8) }}>
              {player?.nickname || '未登录'}
            </div>
            <div style={{ color: '#7df9ff', fontSize: q(22), marginTop: q(4) }}>
              累计充值：¥{totalRecharge.toFixed(2)}
            </div>
          </div>
        </div>

        {/* 升级进度条 */}
        {currentLevel < 10 && nextConfig && (
          <div style={{ marginTop: q(28) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: q(10) }}>
              <span style={{ color: '#9980cc', fontSize: q(22) }}>
                距 VIP{currentLevel + 1}
              </span>
              <span style={{ color: '#c084fc', fontSize: q(22) }}>
                ¥{Math.max(0, nextRequired - totalRecharge).toFixed(0)} / ¥{nextRequired}
              </span>
            </div>
            <div style={{
              height: q(12), background: 'rgba(255,255,255,0.1)',
              borderRadius: q(6), overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #7c3aed, #c084fc, #7df9ff)',
                borderRadius: q(6),
                transition: 'width 0.5s ease',
                boxShadow: '0 0 8px rgba(192,132,252,0.6)',
              }} />
            </div>
          </div>
        )}
        {currentLevel >= 10 && (
          <div style={{
            marginTop: q(20), textAlign: 'center',
            color: '#ffd700', fontSize: q(26), fontWeight: 700,
          }}>
            🏆 已达最高等级 VIP10
          </div>
        )}
      </div>

      {/* VIP 等级列表 */}
      <div style={{ padding: `0 ${q(20)} ${q(40)}` }}>
        <div style={{ color: '#c084fc', fontSize: q(28), fontWeight: 700, marginBottom: q(20) }}>
          等级一览
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: q(16) }}>
          {Array.from({ length: 11 }, (_, i) => i).map(level => {
            const config = vipConfigs.find(c => c.level === level);
            const required = config?.requiredPoints ?? (level === 0 ? 0 : level * 1000);
            const bonus = config?.rechargeBonus ?? '0.00';
            const isCurrentLevel = level === currentLevel;
            const isUnlocked = level <= currentLevel;

            return (
              <div
                key={level}
                style={{
                  background: isCurrentLevel
                    ? 'linear-gradient(135deg, rgba(120,40,220,0.4) 0%, rgba(40,10,80,0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(20,8,50,0.8) 0%, rgba(10,4,30,0.9) 100%)',
                  border: isCurrentLevel
                    ? '1.5px solid rgba(192,132,252,0.8)'
                    : '1px solid rgba(80,40,160,0.3)',
                  borderRadius: q(16),
                  padding: `${q(20)} ${q(24)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: q(20),
                  boxShadow: isCurrentLevel ? '0 0 20px rgba(120,40,220,0.4)' : 'none',
                  opacity: isUnlocked ? 1 : 0.6,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* 当前等级标记 */}
                {isCurrentLevel && (
                  <div style={{
                    position: 'absolute', top: 0, right: 0,
                    background: 'linear-gradient(135deg, #c084fc, #7df9ff)',
                    color: '#0d0621', fontSize: q(18), fontWeight: 700,
                    padding: `${q(4)} ${q(12)}`,
                    borderBottomLeftRadius: q(10),
                  }}>
                    当前
                  </div>
                )}

                {/* VIP 图标 */}
                <div style={{ flexShrink: 0, width: q(64), height: q(64) }}>
                  {level === 0 ? (
                    <Vip0Icon size={parseInt(q(64))} />
                  ) : (
                    <img
                      src={VIP_ICONS[level]}
                      alt={`VIP${level}`}
                      style={{
                        width: q(64), height: q(64),
                        objectFit: 'contain',
                        filter: isUnlocked ? 'none' : 'grayscale(80%)',
                      }}
                    />
                  )}
                </div>

                {/* 等级信息 */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    color: isCurrentLevel ? '#c084fc' : isUnlocked ? '#fff' : '#666',
                    fontSize: q(28), fontWeight: 700,
                    fontFamily: '"Orbitron", sans-serif',
                  }}>
                    VIP {level}
                  </div>
                  <div style={{ color: '#9980cc', fontSize: q(22), marginTop: q(4) }}>
                    {level === 0 ? '注册即享' : `累计充值 ¥${required}`}
                  </div>
                </div>

                {/* 特权信息 */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {parseFloat(bonus) > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #f5a623, #e8750a)',
                      borderRadius: q(8),
                      padding: `${q(4)} ${q(12)}`,
                      color: '#fff', fontSize: q(20), fontWeight: 700,
                    }}>
                      充值返 {bonus}%
                    </div>
                  )}
                  {isUnlocked && level > 0 && (
                    <div style={{ color: '#7df9ff', fontSize: q(20), marginTop: q(6) }}>
                      ✓ 已解锁
                    </div>
                  )}
                  {!isUnlocked && (
                    <div style={{ color: '#555', fontSize: q(20), marginTop: q(6) }}>
                      🔒 未解锁
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes vipGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(120,40,220,0.4); }
          50% { box-shadow: 0 0 40px rgba(192,132,252,0.6); }
        }
      `}</style>
    </div>
    </PageSlideIn>
  );
}
