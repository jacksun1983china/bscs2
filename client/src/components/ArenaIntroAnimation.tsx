/**
 * ArenaIntroAnimation.tsx — 竞技场开场碰撞动画
 *
 * 动画时序（总时长约 2.8s）：
 *  0.0s  双方头像从屏幕两侧飞入（带拖尾光效）
 *  0.8s  头像在中心碰撞，产生爆炸白光 + 冲击波
 *  0.9s  闪电链在两头像之间来回跳动（Canvas 绘制）
 *  1.4s  爆炸粒子四散
 *  2.2s  头像弹回各自位置，闪电消失
 *  2.8s  整个动画淡出，回调 onComplete
 *
 * 用法：
 *   <ArenaIntroAnimation
 *     players={[{ nickname, avatar }, { nickname, avatar }]}
 *     onComplete={() => setShowIntro(false)}
 *   />
 */
import { useEffect, useRef, useState } from 'react';
import { getAvatarUrl } from '@/lib/assets';

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// ── 闪电 Canvas ──────────────────────────────────────────────────────────────
function LightningCanvas({
  width, height, active,
  fromX, fromY, toX, toY,
}: {
  width: number; height: number; active: boolean;
  fromX: number; fromY: number; toX: number; toY: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!active) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    /** 生成锯齿闪电路径点 */
    function genLightning(x1: number, y1: number, x2: number, y2: number, segs: number): [number, number][] {
      const pts: [number, number][] = [[x1, y1]];
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        const mx = x1 + (x2 - x1) * t;
        const my = y1 + (y2 - y1) * t;
        const perp = (Math.random() - 0.5) * 60 * (1 - Math.abs(t - 0.5) * 1.5);
        pts.push([mx + perp, my + perp * 0.3]);
      }
      pts.push([x2, y2]);
      return pts;
    }

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // 主闪电（每2帧重新生成，模拟跳动）
      if (frame % 2 === 0) {
        const pts = genLightning(fromX, fromY, toX, toY, 12);
        // 外发光
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.strokeStyle = 'rgba(180,120,255,0.25)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // 中层
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.strokeStyle = 'rgba(200,150,255,0.7)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 核心白线
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 分支闪电（每4帧一次）
      if (frame % 4 === 0) {
        const branchCount = 2 + Math.floor(Math.random() * 2);
        for (let b = 0; b < branchCount; b++) {
          const t = 0.2 + Math.random() * 0.6;
          const bx = fromX + (toX - fromX) * t;
          const by = fromY + (toY - fromY) * t;
          const ex = bx + (Math.random() - 0.5) * 80;
          const ey = by + (Math.random() - 0.5) * 80;
          const bpts = genLightning(bx, by, ex, ey, 5);
          ctx.beginPath();
          ctx.moveTo(bpts[0][0], bpts[0][1]);
          for (let i = 1; i < bpts.length; i++) ctx.lineTo(bpts[i][0], bpts[i][1]);
          ctx.strokeStyle = 'rgba(220,180,255,0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active, fromX, fromY, toX, toY]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}

// ── 爆炸粒子 ─────────────────────────────────────────────────────────────────
interface Spark {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
}

function ExplosionCanvas({
  width, height, trigger, cx, cy,
}: {
  width: number; height: number; trigger: boolean; cx: number; cy: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const animRef = useRef<number>(0);
  const triggeredRef = useRef(false);

  const COLORS = ['#ffffff', '#c084fc', '#a855f7', '#fbbf24', '#60a5fa', '#f0abfc'];

  useEffect(() => {
    if (!trigger || triggeredRef.current) return;
    triggeredRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 生成爆炸粒子
    const sparks: Spark[] = [];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      sparks.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 30 + Math.random() * 30,
        size: 2 + Math.random() * 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    sparksRef.current = sparks;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const s of sparksRef.current) {
        if (s.life >= s.maxLife) continue;
        alive = true;
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.15; // 重力
        s.vx *= 0.97;
        s.life++;
        const alpha = 1 - s.life / s.maxLife;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (alive) animRef.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    draw();

    return () => cancelAnimationFrame(animRef.current);
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6 }}
    />
  );
}

// ── 主组件 ───────────────────────────────────────────────────────────────────

export interface ArenaIntroPlayer {
  nickname: string;
  avatar: string; // 系统头像ID 或 URL
}

interface ArenaIntroAnimationProps {
  players: ArenaIntroPlayer[];
  onComplete: () => void;
  /** 是否跳过（外部控制） */
  skip?: boolean;
}

type Phase =
  | 'fly-in'       // 0.0s 头像飞入
  | 'collision'    // 0.8s 碰撞白光
  | 'lightning'    // 0.9s 闪电跳动
  | 'explode'      // 1.4s 爆炸粒子
  | 'fly-back'     // 2.0s 头像弹回
  | 'fade-out'     // 2.5s 整体淡出
  | 'done';

export default function ArenaIntroAnimation({ players, onComplete, skip }: ArenaIntroAnimationProps) {
  const [phase, setPhase] = useState<Phase>('fly-in');
  const [containerSize, setContainerSize] = useState({ w: 375, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const p1 = players[0];
  const p2 = players[1];

  // 测量容器尺寸
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerSize({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    setContainerSize({ w: el.offsetWidth, h: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timerRefs.current.push(t);
  };

  // 时序控制
  useEffect(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    addTimer(() => setPhase('collision'), 800);
    addTimer(() => setPhase('lightning'), 900);
    addTimer(() => setPhase('explode'), 1400);
    addTimer(() => setPhase('fly-back'), 2000);
    addTimer(() => setPhase('fade-out'), 2500);
    addTimer(() => { setPhase('done'); onComplete(); }, 2900);

    return () => timerRefs.current.forEach(clearTimeout);
  }, []);

  // 外部跳过
  useEffect(() => {
    if (skip) {
      timerRefs.current.forEach(clearTimeout);
      setPhase('done');
      onComplete();
    }
  }, [skip]);

  if (phase === 'done') return null;

  const { w, h } = containerSize;
  const cx = w / 2;
  const cy = h * 0.42;
  const avatarSize = Math.min(w * 0.22, 90);
  const halfAvatar = avatarSize / 2;

  // 头像位置计算
  const flyInProgress = phase === 'fly-in' ? 0 : 1;
  // 飞入：从屏幕外 → 中心
  // 飞回：中心 → 各自位置（左1/4，右3/4）
  const p1FinalX = phase === 'fly-back' || phase === 'fade-out' ? w * 0.25 : cx;
  const p2FinalX = phase === 'fly-back' || phase === 'fade-out' ? w * 0.75 : cx;

  const p1StartX = -avatarSize;
  const p2StartX = w + avatarSize;

  const p1X = phase === 'fly-in' ? p1StartX : p1FinalX;
  const p2X = phase === 'fly-in' ? p2StartX : p2FinalX;

  const showLightning = phase === 'lightning' || phase === 'explode';
  const showCollisionFlash = phase === 'collision' || phase === 'lightning';
  const showExplosion = phase === 'explode' || phase === 'fly-back';

  // 整体透明度
  const containerAlpha = phase === 'fade-out' ? 0 : 1;

  const avatarTransition = phase === 'fly-in'
    ? 'left 0.75s cubic-bezier(0.22,1,0.36,1)'
    : phase === 'fly-back'
      ? 'left 0.5s cubic-bezier(0.34,1.56,0.64,1)'
      : phase === 'fade-out'
        ? 'left 0.3s ease, opacity 0.4s ease'
        : 'none';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        background: 'rgba(5,2,20,0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: containerAlpha,
        transition: phase === 'fade-out' ? 'opacity 0.4s ease' : 'none',
        overflow: 'hidden',
        containerType: 'inline-size',
      }}
    >
      {/* 背景放射光 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 50% 42%, rgba(120,40,220,0.35) 0%, transparent 65%)`,
        pointerEvents: 'none',
        zIndex: 1,
        opacity: showCollisionFlash ? 1 : 0.4,
        transition: 'opacity 0.2s ease',
      }} />

      {/* 碰撞白光爆闪 */}
      {showCollisionFlash && (
        <div style={{
          position: 'absolute',
          left: cx - 80,
          top: cy - 80,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(200,150,255,0.6) 40%, transparent 70%)',
          zIndex: 7,
          animation: 'arenaFlashPulse 0.15s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}

      {/* 冲击波圆环 */}
      {phase === 'collision' && (
        <div style={{
          position: 'absolute',
          left: cx - 10,
          top: cy - 10,
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '3px solid rgba(192,132,252,0.9)',
          zIndex: 7,
          animation: 'arenaShockwave 0.6s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}

      {/* 闪电 Canvas */}
      <LightningCanvas
        width={w}
        height={h}
        active={showLightning}
        fromX={cx - avatarSize * 0.6}
        fromY={cy}
        toX={cx + avatarSize * 0.6}
        toY={cy}
      />

      {/* 爆炸粒子 Canvas */}
      <ExplosionCanvas
        width={w}
        height={h}
        trigger={showExplosion}
        cx={cx}
        cy={cy}
      />

      {/* 玩家1 头像（左侧） */}
      <div style={{
        position: 'absolute',
        left: p1X - halfAvatar,
        top: cy - halfAvatar,
        width: avatarSize,
        height: avatarSize,
        zIndex: 10,
        transition: avatarTransition,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}>
        <div style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: '50%',
          border: '3px solid rgba(192,132,252,0.9)',
          boxShadow: '0 0 20px rgba(192,132,252,0.7), 0 0 40px rgba(139,92,246,0.4)',
          overflow: 'hidden',
          background: 'rgba(20,8,50,0.8)',
          flexShrink: 0,
        }}>
          <img
            src={getAvatarUrl(p1?.avatar)}
            alt={p1?.nickname}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <span style={{
          color: '#e0d0ff',
          fontSize: Math.max(avatarSize * 0.2, 11),
          fontWeight: 700,
          textShadow: '0 0 8px rgba(192,132,252,0.8)',
          whiteSpace: 'nowrap',
          maxWidth: avatarSize * 1.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {p1?.nickname || '玩家1'}
        </span>
      </div>

      {/* VS 文字（碰撞后出现） */}
      {(phase === 'lightning' || phase === 'explode' || phase === 'fly-back' || phase === 'fade-out') && (
        <div style={{
          position: 'absolute',
          left: cx,
          top: cy - avatarSize * 0.8,
          transform: 'translateX(-50%)',
          zIndex: 15,
          color: '#fbbf24',
          fontSize: Math.min(w * 0.12, 48),
          fontWeight: 900,
          textShadow: '0 0 20px rgba(251,191,36,0.9), 0 0 40px rgba(251,191,36,0.5)',
          letterSpacing: 4,
          animation: 'arenaVsBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}>
          VS
        </div>
      )}

      {/* 玩家2 头像（右侧） */}
      <div style={{
        position: 'absolute',
        left: p2X - halfAvatar,
        top: cy - halfAvatar,
        width: avatarSize,
        height: avatarSize,
        zIndex: 10,
        transition: avatarTransition,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}>
        <div style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: '50%',
          border: '3px solid rgba(251,191,36,0.9)',
          boxShadow: '0 0 20px rgba(251,191,36,0.7), 0 0 40px rgba(245,158,11,0.4)',
          overflow: 'hidden',
          background: 'rgba(20,8,50,0.8)',
          flexShrink: 0,
        }}>
          <img
            src={getAvatarUrl(p2?.avatar)}
            alt={p2?.nickname}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <span style={{
          color: '#fde68a',
          fontSize: Math.max(avatarSize * 0.2, 11),
          fontWeight: 700,
          textShadow: '0 0 8px rgba(251,191,36,0.8)',
          whiteSpace: 'nowrap',
          maxWidth: avatarSize * 1.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {p2?.nickname || '玩家2'}
        </span>
      </div>

      {/* 底部「点击跳过」提示 */}
      <div
        onClick={onComplete}
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.4)',
          fontSize: Math.max(w * 0.032, 12),
          cursor: 'pointer',
          zIndex: 20,
          letterSpacing: 1,
          userSelect: 'none',
        }}
      >
        点击跳过 ▶
      </div>

      {/* 动画关键帧 */}
      <style>{`
        @keyframes arenaFlashPulse {
          0%   { transform: scale(0.3); opacity: 1; }
          60%  { transform: scale(1.8); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes arenaShockwave {
          0%   { transform: scale(1); opacity: 0.9; border-width: 4px; }
          100% { transform: scale(12); opacity: 0; border-width: 1px; }
        }
        @keyframes arenaVsBounce {
          0%   { transform: translateX(-50%) scale(0); opacity: 0; }
          60%  { transform: translateX(-50%) scale(1.3); opacity: 1; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
