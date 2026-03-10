/**
 * ArenaIntroAnimation.tsx — 竞技场开场动画
 *
 * 2人版：双方头像同时从两侧飞入 → 碰撞白光 → 闪电链 → 爆炸粒子 → 弹回各自位置
 * 3人版：三方头像从三个方向飞入 → 量子纠缠闪电链（三角形） → 爆炸 → 弹回三角布局
 *
 * 关键修复：
 *  - 等待两个玩家数据都存在后再触发动画
 *  - 用 requestAnimationFrame 双帧延迟确保 CSS transition 正确触发
 *  - 两个头像同时从两侧飞入，不会出现只有一个的情况
 */
import { useEffect, useRef, useState } from 'react';
import { getAvatarUrl } from '@/lib/assets';

// ── 闪电 Canvas（支持多条闪电链） ─────────────────────────────────────────────
interface LightningLink {
  fromX: number; fromY: number;
  toX: number; toY: number;
  color?: string;
}

function LightningCanvas({
  width, height, active, links,
}: {
  width: number; height: number; active: boolean;
  links: LightningLink[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!active || links.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animRef.current);
      return;
    }

    function genLightning(x1: number, y1: number, x2: number, y2: number, segs: number): [number, number][] {
      const pts: [number, number][] = [[x1, y1]];
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        const mx = x1 + (x2 - x1) * t;
        const my = y1 + (y2 - y1) * t;
        const perp = (Math.random() - 0.5) * 55 * (1 - Math.abs(t - 0.5) * 1.5);
        pts.push([mx + perp, my + perp * 0.3]);
      }
      pts.push([x2, y2]);
      return pts;
    }

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (const link of links) {
        const { fromX, fromY, toX, toY, color = 'rgba(180,120,255,0.25)' } = link;

        if (frame % 2 === 0) {
          const pts = genLightning(fromX, fromY, toX, toY, 12);

          // 外发光
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.strokeStyle = color;
          ctx.lineWidth = 10;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // 中层
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.strokeStyle = 'rgba(200,150,255,0.7)';
          ctx.lineWidth = 3;
          ctx.stroke();

          // 核心白线
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // 分支闪电
        if (frame % 3 === 0) {
          const t = 0.2 + Math.random() * 0.6;
          const bx = fromX + (toX - fromX) * t;
          const by = fromY + (toY - fromY) * t;
          const ex = bx + (Math.random() - 0.5) * 70;
          const ey = by + (Math.random() - 0.5) * 70;
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
  }, [active, links]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}
    />
  );
}

// ── 爆炸粒子 Canvas ───────────────────────────────────────────────────────────
interface Spark {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
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

  const COLORS = ['#ffffff', '#c084fc', '#a855f7', '#fbbf24', '#60a5fa', '#f0abfc', '#34d399'];

  useEffect(() => {
    if (!trigger || triggeredRef.current) return;
    triggeredRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sparks: Spark[] = [];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 10;
      sparks.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 30 + Math.random() * 40,
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
        s.vy += 0.15;
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
  avatar: string;
}

interface ArenaIntroAnimationProps {
  players: ArenaIntroPlayer[];
  onComplete: () => void;
  skip?: boolean;
}

type Phase =
  | 'wait'        // 等待数据就绪
  | 'init'        // 初始位置（屏幕外），等待一帧后触发飞入
  | 'fly-in'      // 头像飞入
  | 'collision'   // 碰撞白光
  | 'lightning'   // 闪电跳动（3人：量子纠缠三角形）
  | 'explode'     // 爆炸粒子
  | 'fly-back'    // 头像弹回各自位置
  | 'fade-out'    // 整体淡出
  | 'done';

export default function ArenaIntroAnimation({ players, onComplete, skip }: ArenaIntroAnimationProps) {
  const [phase, setPhase] = useState<Phase>('wait');
  const [containerSize, setContainerSize] = useState({ w: 375, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const is3Player = players.length >= 3;
  const p1 = players[0];
  const p2 = players[1];
  const p3 = players[2]; // 3人版

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
    return t;
  };

  const clearAllTimers = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  };

  // 等待所有玩家数据就绪后启动动画
  // 关键修复：必须等到 p1 和 p2（以及3人时的p3）都有数据才开始
  useEffect(() => {
    const requiredCount = is3Player ? 3 : 2;
    const readyCount = players.filter(p => p && p.nickname).length;

    if (readyCount < requiredCount) return;
    if (phase !== 'wait') return;

    // 先设为 init（头像在屏幕外），等一帧后触发飞入 transition
    setPhase('init');
  }, [players, phase, is3Player]);

  // init → fly-in：双帧延迟确保浏览器先渲染初始位置
  useEffect(() => {
    if (phase !== 'init') return;

    let raf1: number;
    let raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setPhase('fly-in');
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [phase]);

  // fly-in → 后续时序
  useEffect(() => {
    if (phase !== 'fly-in') return;
    clearAllTimers();

    addTimer(() => setPhase('collision'), 800);
    addTimer(() => setPhase('lightning'), 950);
    addTimer(() => setPhase('explode'), 1500);
    addTimer(() => setPhase('fly-back'), 2100);
    addTimer(() => setPhase('fade-out'), 2600);
    addTimer(() => { setPhase('done'); onComplete(); }, 3000);

    return clearAllTimers;
  }, [phase]);

  // 外部跳过
  useEffect(() => {
    if (skip) {
      clearAllTimers();
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

  // ── 2人版位置计算 ──
  // init阶段：头像在屏幕外
  // fly-in阶段：头像飞向中心
  // fly-back阶段：头像弹回各自位置
  const p1TargetX = cx; // 飞入目标：中心
  const p2TargetX = cx;
  const p1FinalX = w * 0.25; // 弹回位置：左1/4
  const p2FinalX = w * 0.75; // 弹回位置：右3/4

  let p1X: number, p2X: number;
  if (phase === 'init') {
    p1X = -avatarSize - 20;
    p2X = w + avatarSize + 20;
  } else if (phase === 'fly-in' || phase === 'collision' || phase === 'lightning' || phase === 'explode') {
    p1X = p1TargetX;
    p2X = p2TargetX;
  } else {
    // fly-back, fade-out
    p1X = p1FinalX;
    p2X = p2FinalX;
  }

  // ── 3人版位置计算（三角形布局） ──
  // 三个头像从三个方向飞入（左下、右下、上方）
  const triRadius = Math.min(w, h) * 0.28;
  // 三角形顶点（相对于中心）
  const triPositions = [
    { x: cx - triRadius * 0.87, y: cy + triRadius * 0.5 },  // 左下
    { x: cx + triRadius * 0.87, y: cy + triRadius * 0.5 },  // 右下
    { x: cx,                    y: cy - triRadius },          // 上方
  ];
  // 飞入起始位置（从屏幕外对应方向）
  const triStartPositions = [
    { x: -avatarSize - 20, y: h + avatarSize },  // 左下角外
    { x: w + avatarSize + 20, y: h + avatarSize }, // 右下角外
    { x: cx, y: -avatarSize - 20 },               // 上方外
  ];

  let tri3X: number[] = [], tri3Y: number[] = [];
  if (!is3Player) {
    tri3X = []; tri3Y = [];
  } else if (phase === 'init') {
    tri3X = triStartPositions.map(p => p.x);
    tri3Y = triStartPositions.map(p => p.y);
  } else if (phase === 'fly-in' || phase === 'collision' || phase === 'lightning' || phase === 'explode') {
    // 飞入中心
    tri3X = [cx, cx, cx];
    tri3Y = [cy, cy, cy];
  } else {
    // fly-back：弹回三角形顶点
    tri3X = triPositions.map(p => p.x);
    tri3Y = triPositions.map(p => p.y);
  }

  const showLightning = phase === 'lightning' || phase === 'explode';
  const showCollisionFlash = phase === 'collision' || phase === 'lightning';
  const showExplosion = phase === 'explode' || phase === 'fly-back';
  const containerAlpha = phase === 'fade-out' ? 0 : 1;

  const avatarTransition = (() => {
    if (phase === 'init') return 'none';
    if (phase === 'fly-in') return 'left 0.75s cubic-bezier(0.22,1,0.36,1), top 0.75s cubic-bezier(0.22,1,0.36,1)';
    if (phase === 'fly-back') return 'left 0.5s cubic-bezier(0.34,1.56,0.64,1), top 0.5s cubic-bezier(0.34,1.56,0.64,1)';
    if (phase === 'fade-out') return 'left 0.3s ease, top 0.3s ease, opacity 0.4s ease';
    return 'none';
  })();

  // 3人版闪电链：三条边（三角形）
  const lightningLinks3: LightningLink[] = showLightning && is3Player ? [
    { fromX: tri3X[0], fromY: tri3Y[0], toX: tri3X[1], toY: tri3Y[1], color: 'rgba(100,200,255,0.3)' },
    { fromX: tri3X[1], fromY: tri3Y[1], toX: tri3X[2], toY: tri3Y[2], color: 'rgba(180,100,255,0.3)' },
    { fromX: tri3X[2], fromY: tri3Y[2], toX: tri3X[0], toY: tri3Y[0], color: 'rgba(100,255,200,0.3)' },
  ] : [];

  // 2人版闪电链
  const lightningLinks2: LightningLink[] = showLightning && !is3Player ? [
    {
      fromX: p1X + halfAvatar,
      fromY: cy,
      toX: p2X - halfAvatar,
      toY: cy,
      color: 'rgba(180,120,255,0.25)',
    },
  ] : [];

  const lightningLinks = is3Player ? lightningLinks3 : lightningLinks2;

  // 头像颜色（2人：紫/金；3人：紫/金/青）
  const avatarColors = [
    { border: 'rgba(192,132,252,0.9)', shadow: 'rgba(192,132,252,0.7), 0 0 40px rgba(139,92,246,0.4)', nameColor: '#e0d0ff', nameShadow: 'rgba(192,132,252,0.8)' },
    { border: 'rgba(251,191,36,0.9)',  shadow: 'rgba(251,191,36,0.7), 0 0 40px rgba(245,158,11,0.4)',  nameColor: '#fde68a', nameShadow: 'rgba(251,191,36,0.8)' },
    { border: 'rgba(52,211,153,0.9)',  shadow: 'rgba(52,211,153,0.7), 0 0 40px rgba(16,185,129,0.4)',  nameColor: '#a7f3d0', nameShadow: 'rgba(52,211,153,0.8)' },
  ];

  const renderAvatar = (player: ArenaIntroPlayer | undefined, idx: number, left: number, top: number) => {
    const color = avatarColors[idx] || avatarColors[0];
    return (
      <div
        key={idx}
        style={{
          position: 'absolute',
          left: left - halfAvatar,
          top: top - halfAvatar,
          width: avatarSize,
          height: avatarSize,
          zIndex: 10,
          transition: avatarTransition,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: '50%',
          border: `3px solid ${color.border}`,
          boxShadow: `0 0 20px ${color.shadow}`,
          overflow: 'hidden',
          background: 'rgba(20,8,50,0.8)',
          flexShrink: 0,
        }}>
          <img
            src={getAvatarUrl(player?.avatar)}
            alt={player?.nickname}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <span style={{
          color: color.nameColor,
          fontSize: Math.max(avatarSize * 0.2, 11),
          fontWeight: 700,
          textShadow: `0 0 8px ${color.nameShadow}`,
          whiteSpace: 'nowrap',
          maxWidth: avatarSize * 1.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {player?.nickname || `玩家${idx + 1}`}
        </span>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onClick={onComplete}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        background: 'rgba(5,2,20,0.93)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: containerAlpha,
        transition: phase === 'fade-out' ? 'opacity 0.4s ease' : 'none',
        cursor: 'pointer',
        containerType: 'inline-size',
      }}
    >
      {/* 背景放射光 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: is3Player
          ? `radial-gradient(ellipse at 50% 42%, rgba(80,200,255,0.2) 0%, rgba(120,40,220,0.25) 40%, transparent 70%)`
          : `radial-gradient(ellipse at 50% 42%, rgba(120,40,220,0.35) 0%, transparent 65%)`,
        pointerEvents: 'none',
        zIndex: 1,
        opacity: showCollisionFlash ? 1 : 0.4,
        transition: 'opacity 0.2s ease',
      }} />

      {/* 3人版：量子纠缠背景光圈 */}
      {is3Player && showLightning && (
        <div style={{
          position: 'absolute',
          left: cx - 100,
          top: cy - 100,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(100,200,255,0.15) 0%, rgba(80,40,200,0.1) 50%, transparent 70%)',
          zIndex: 2,
          animation: 'quantumPulse 0.8s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }} />
      )}

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
        links={lightningLinks}
      />

      {/* 爆炸粒子 Canvas */}
      <ExplosionCanvas
        width={w}
        height={h}
        trigger={showExplosion}
        cx={cx}
        cy={cy}
      />

      {/* 渲染头像 */}
      {is3Player ? (
        <>
          {renderAvatar(p1, 0, tri3X[0], tri3Y[0])}
          {renderAvatar(p2, 1, tri3X[1], tri3Y[1])}
          {renderAvatar(p3, 2, tri3X[2], tri3Y[2])}
        </>
      ) : (
        <>
          {renderAvatar(p1, 0, p1X, cy)}
          {renderAvatar(p2, 1, p2X, cy)}
        </>
      )}

      {/* VS / 量子纠缠文字（碰撞后出现） */}
      {(phase === 'lightning' || phase === 'explode' || phase === 'fly-back' || phase === 'fade-out') && (
        <div style={{
          position: 'absolute',
          left: cx,
          top: cy - avatarSize * (is3Player ? 0.5 : 0.8),
          transform: 'translateX(-50%)',
          zIndex: 15,
          color: is3Player ? '#67e8f9' : '#fbbf24',
          fontSize: Math.min(w * 0.1, 42),
          fontWeight: 900,
          textShadow: is3Player
            ? '0 0 20px rgba(103,232,249,0.9), 0 0 40px rgba(6,182,212,0.5)'
            : '0 0 20px rgba(251,191,36,0.9), 0 0 40px rgba(251,191,36,0.5)',
          letterSpacing: is3Player ? 2 : 4,
          animation: 'arenaVsBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
          pointerEvents: 'none',
        }}>
          {is3Player ? '量子纠缠' : 'VS'}
        </div>
      )}

      {/* 底部「点击跳过」提示 */}
      <div style={{
        position: 'absolute',
        bottom: '8%',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.35)',
        fontSize: Math.max(w * 0.032, 12),
        cursor: 'pointer',
        zIndex: 20,
        letterSpacing: 1,
        userSelect: 'none',
        pointerEvents: 'none',
      }}>
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
          100% { transform: scale(14); opacity: 0; border-width: 1px; }
        }
        @keyframes arenaVsBounce {
          0%   { transform: translateX(-50%) scale(0); opacity: 0; }
          60%  { transform: translateX(-50%) scale(1.3); opacity: 1; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes quantumPulse {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
