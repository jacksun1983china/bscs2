/**
 * ParticleCanvas.tsx
 * 赛博朋克风格粒子背景：漂浮光点 + 流星划过
 * 使用 Canvas 绘制，性能友好，不影响交互层
 */
import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  alphaDir: number;
  color: string;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  alpha: number;
  life: number;
  maxLife: number;
}

const COLORS = [
  'rgba(192,132,252,',  // 紫
  'rgba(139,92,246,',   // 深紫
  'rgba(125,211,252,',  // 青蓝
  'rgba(167,243,208,',  // 翠绿
  'rgba(251,191,36,',   // 金黄
];

export default function ParticleCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: Particle[] = [];
    const meteors: Meteor[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // 初始化粒子
    const initParticles = () => {
      particles.length = 0;
      const count = Math.floor((canvas.width * canvas.height) / 6000);
      for (let i = 0; i < count; i++) {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.6 + 0.2,
          alphaDir: Math.random() > 0.5 ? 1 : -1,
          color,
        });
      }
    };
    initParticles();

    // 生成流星
    const spawnMeteor = () => {
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
      const speed = 4 + Math.random() * 4;
      meteors.push({
        x: Math.random() * canvas.width * 1.5 - canvas.width * 0.25,
        y: -20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 60 + Math.random() * 80,
        alpha: 0.8 + Math.random() * 0.2,
        life: 0,
        maxLife: 60 + Math.random() * 40,
      });
    };

    let meteorTimer = 0;
    const METEOR_INTERVAL = 120; // frames

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制粒子
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.alphaDir * 0.005;
        if (p.alpha > 0.8) p.alphaDir = -1;
        if (p.alpha < 0.1) p.alphaDir = 1;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha.toFixed(2)})`;
        ctx.fill();

        // 光晕
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        grd.addColorStop(0, `${p.color}${(p.alpha * 0.4).toFixed(2)})`);
        grd.addColorStop(1, `${p.color}0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // 流星计时
      meteorTimer++;
      if (meteorTimer >= METEOR_INTERVAL) {
        meteorTimer = 0;
        spawnMeteor();
        if (Math.random() > 0.6) spawnMeteor(); // 偶尔双流星
      }

      // 绘制流星
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        m.life++;
        const progress = m.life / m.maxLife;
        const alpha = m.alpha * (1 - progress);

        const tailX = m.x - m.vx * (m.length / Math.hypot(m.vx, m.vy));
        const tailY = m.y - m.vy * (m.length / Math.hypot(m.vx, m.vy));

        const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(0.7, `rgba(200,160,255,${(alpha * 0.5).toFixed(2)})`);
        grad.addColorStop(1, `rgba(255,255,255,${alpha.toFixed(2)})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 流星头部光点
        ctx.beginPath();
        ctx.arc(m.x, m.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        ctx.fill();

        if (m.life >= m.maxLife || m.y > canvas.height + 50) {
          meteors.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
