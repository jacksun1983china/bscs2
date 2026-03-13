/**
 * ArenaIntroAnimation.tsx — 竞技场开场动画（支持 2-3 人）
 *
 * 2人场：左右头像从两侧飞入，中间 VS 弹出
 * 3人场：左右头像从两侧飞入，中间头像从上方落下，VS 弹出
 *
 * 关键设计：
 *   - onComplete 通过 ref 存储，避免 useCallback 引用变化导致计时器被重置
 *   - 计时器只依赖 skip，不依赖 onComplete
 */
import { useEffect, useRef, useState } from 'react';
import { getAvatarUrl } from '@/lib/assets';

export interface ArenaIntroPlayer {
  nickname: string;
  avatar: string;
}

interface ArenaIntroAnimationProps {
  players: ArenaIntroPlayer[];
  onComplete: () => void;
  skip?: boolean;
}

type Phase = 'idle' | 'flying' | 'vs' | 'fadeout' | 'done';

export default function ArenaIntroAnimation({ players, onComplete, skip }: ArenaIntroAnimationProps) {
  const [phase, setPhase] = useState<Phase>('idle');

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const is3Player = players.length >= 3;

  useEffect(() => {
    if (skip) {
      onCompleteRef.current();
      return;
    }

    const t1 = setTimeout(() => setPhase('flying'), 50);
    const t2 = setTimeout(() => setPhase('vs'), 900);
    const t3 = setTimeout(() => setPhase('fadeout'), 2600);
    const t4 = setTimeout(() => {
      setPhase('done');
      onCompleteRef.current();
    }, 3100);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, [skip]);

  if (phase === 'done') return null;

  const flyIn = phase === 'flying' || phase === 'vs' || phase === 'fadeout';
  const vsShow = phase === 'vs' || phase === 'fadeout';
  const fading = phase === 'fadeout';

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(6, 2, 18, 0.93)',
      backdropFilter: 'blur(6px)',
      opacity: fading ? 0 : 1,
      transition: fading ? 'opacity 0.5s ease' : 'none',
      pointerEvents: fading ? 'none' : 'auto',
    }}>
      {/* 背景放射光 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(100,30,220,0.3) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* 横向扫光线 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '50%', height: 1,
        transform: 'translateY(-50%)',
        background: 'linear-gradient(90deg, transparent 0%, rgba(180,80,255,0.5) 30%, rgba(0,200,255,0.5) 70%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {is3Player ? (
        /* ── 3 人场布局 ── */
        <div style={{ position: 'relative', width: '100%', padding: '0 12px', boxSizing: 'border-box' }}>
          {/* 上方：中间玩家从天而降 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              transform: flyIn ? 'translateY(0)' : 'translateY(-120px)',
              opacity: flyIn ? 1 : 0,
              transition: 'transform 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                border: '3px solid rgba(34,211,238,0.9)',
                boxShadow: '0 0 18px rgba(34,211,238,0.7), 0 0 36px rgba(34,211,238,0.35)',
              }}>
                <img src={getAvatarUrl(players[1]?.avatar)} alt={players[1]?.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{
                color: '#a5f3fc', fontSize: 11, fontWeight: 700,
                textShadow: '0 0 10px rgba(34,211,238,0.9)',
                maxWidth: 80, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{players[1]?.nickname || '玩家2'}</span>
            </div>
          </div>

          {/* 下方：左右玩家 + VS */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            {/* 左侧玩家1 */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              transform: flyIn ? 'translateX(0)' : 'translateX(-110vw)',
              opacity: flyIn ? 1 : 0,
              transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
                border: '3px solid rgba(192,132,252,0.9)',
                boxShadow: '0 0 18px rgba(192,132,252,0.7), 0 0 36px rgba(139,92,246,0.35)',
              }}>
                <img src={getAvatarUrl(players[0]?.avatar)} alt={players[0]?.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{ color: '#e0d0ff', fontSize: 12, fontWeight: 700, textShadow: '0 0 10px rgba(192,132,252,0.9)', maxWidth: 80, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {players[0]?.nickname || '玩家1'}
              </span>
            </div>

            {/* VS */}
            <div style={{
              flexShrink: 0, width: 70, overflow: 'visible',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              transform: vsShow ? 'scale(1)' : 'scale(0)',
              opacity: vsShow ? 1 : 0,
              transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
            }}>
              <span style={{
                fontSize: 36, fontWeight: 900, fontStyle: 'italic',
                background: 'linear-gradient(135deg, #c084fc 0%, #60a5fa 50%, #22d3ee 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                filter: 'drop-shadow(0 0 14px rgba(180,80,255,0.9))',
                lineHeight: 1.2, letterSpacing: 2,
              }}>VS</span>
              <div style={{ width: 40, height: 3, borderRadius: 2, marginTop: 6, background: 'linear-gradient(90deg, rgba(192,132,252,0.8), rgba(34,211,238,0.8))', boxShadow: '0 0 10px rgba(192,132,252,0.6)' }} />
            </div>

            {/* 右侧玩家3 */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              transform: flyIn ? 'translateX(0)' : 'translateX(110vw)',
              opacity: flyIn ? 1 : 0,
              transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
                border: '3px solid rgba(251,191,36,0.9)',
                boxShadow: '0 0 18px rgba(251,191,36,0.7), 0 0 36px rgba(245,158,11,0.35)',
              }}>
                <img src={getAvatarUrl(players[2]?.avatar)} alt={players[2]?.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{ color: '#fde68a', fontSize: 12, fontWeight: 700, textShadow: '0 0 10px rgba(251,191,36,0.9)', maxWidth: 80, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {players[2]?.nickname || '玩家3'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ── 2 人场布局（原版） ── */
        <div style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', padding: '0 16px', boxSizing: 'border-box',
        }}>
          {/* 左侧玩家 */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            transform: flyIn ? 'translateX(0)' : 'translateX(-110vw)',
            opacity: flyIn ? 1 : 0,
            transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease',
          }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(192,132,252,0.9)', boxShadow: '0 0 18px rgba(192,132,252,0.7), 0 0 36px rgba(139,92,246,0.35)' }}>
              <img src={getAvatarUrl(players[0]?.avatar)} alt={players[0]?.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ color: '#e0d0ff', fontSize: 13, fontWeight: 700, textShadow: '0 0 10px rgba(192,132,252,0.9)', maxWidth: 100, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {players[0]?.nickname || '玩家1'}
            </span>
          </div>

          {/* 中间 VS */}
          <div style={{
            flexShrink: 0, width: 80, overflow: 'visible', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            transform: vsShow ? 'scale(1)' : 'scale(0)',
            opacity: vsShow ? 1 : 0,
            transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
          }}>
            <span style={{
              fontSize: 44, fontWeight: 900, fontStyle: 'italic',
              background: 'linear-gradient(135deg, #c084fc 0%, #60a5fa 50%, #22d3ee 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              filter: 'drop-shadow(0 0 14px rgba(180,80,255,0.9)) drop-shadow(0 0 28px rgba(0,200,255,0.5))',
              lineHeight: 1.2, letterSpacing: 2,
            }}>VS</span>
            <div style={{ width: 48, height: 4, borderRadius: 2, marginTop: 8, background: 'linear-gradient(90deg, rgba(192,132,252,0.8), rgba(34,211,238,0.8))', boxShadow: '0 0 10px rgba(192,132,252,0.6)' }} />
          </div>

          {/* 右侧玩家 */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            transform: flyIn ? 'translateX(0)' : 'translateX(110vw)',
            opacity: flyIn ? 1 : 0,
            transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease',
          }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(251,191,36,0.9)', boxShadow: '0 0 18px rgba(251,191,36,0.7), 0 0 36px rgba(245,158,11,0.35)' }}>
              <img src={getAvatarUrl(players[1]?.avatar)} alt={players[1]?.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ color: '#fde68a', fontSize: 13, fontWeight: 700, textShadow: '0 0 10px rgba(251,191,36,0.9)', maxWidth: 100, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {players[1]?.nickname || '玩家2'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
