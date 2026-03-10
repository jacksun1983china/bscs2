/**
 * RollX.tsx — 幸运转盘游戏（赛博朋克风格）
 * 玩法：玩家设置倍率X，绿色扇区占比=1/X，停在绿色赢X倍，停在黑色输
 * 服务端决定结果，客户端只负责动画展示
 *
 * 布局：phone-container + cqw 响应式单位（基准 750px）
 * 结构：TopNav（不滚动）→ 内容区（可滚动）→ BottomNav（沉底）
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import { useLocation } from 'wouter';
import { LANHU } from '@/lib/assets';

// ── px → cqw 转换（基准 750px）──────────────────────────────────
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// ── 常量 ──────────────────────────────────────────────────────
const SPIN_DURATION = 3000; // 转盘动画时长 ms
const EXTRA_ROTATIONS = 5;  // 额外旋转圈数

// ── 绘制转盘（canvas 尺寸由外部传入）──────────────────────────
function drawWheel(
  ctx: CanvasRenderingContext2D,
  size: number,
  multiplier: number,
  currentAngle: number = 0
) {
  const center = size / 2;
  const radius = center - size * 0.04;

  const greenAngle = (Math.PI * 2) / multiplier;
  const blackAngle = Math.PI * 2 - greenAngle;

  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(currentAngle);

  // 黑色扇区
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, 0, blackAngle);
  ctx.closePath();
  const blackGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  blackGrad.addColorStop(0, '#1a0a2e');
  blackGrad.addColorStop(0.6, '#0d0621');
  blackGrad.addColorStop(1, '#1a0a2e');
  ctx.fillStyle = blackGrad;
  ctx.fill();

  // 黑色扇区纹理线条
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const angle = (blackAngle / 12) * i;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.stroke();
  }

  // 绿色扇区（赢区）
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, blackAngle, Math.PI * 2);
  ctx.closePath();
  const greenGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  greenGrad.addColorStop(0, '#00ff88');
  greenGrad.addColorStop(0.5, '#00cc66');
  greenGrad.addColorStop(1, '#009944');
  ctx.fillStyle = greenGrad;
  ctx.fill();

  // 绿色扇区发光边缘
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, blackAngle, Math.PI * 2);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 中心圆
  const cr = size * 0.06;
  ctx.beginPath();
  ctx.arc(0, 0, cr, 0, Math.PI * 2);
  const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, cr);
  centerGrad.addColorStop(0, '#c084fc');
  centerGrad.addColorStop(1, '#7c3aed');
  ctx.fillStyle = centerGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(192, 132, 252, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 中心X标志
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size * 0.045}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('X', 0, 0);

  ctx.restore();

  // 外圈装饰
  ctx.beginPath();
  ctx.arc(center, center, radius + 3, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 外圈光点
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 / 24) * i + currentAngle;
    const x = center + Math.cos(angle) * (radius + size * 0.03);
    const y = center + Math.sin(angle) * (radius + size * 0.03);
    ctx.beginPath();
    ctx.arc(x, y, size * 0.007, 0, Math.PI * 2);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(0, 255, 136, 0.8)' : 'rgba(139, 92, 246, 0.4)';
    ctx.fill();
  }

  // 指针（顶部三角，尖端朝下指向转盘）
  const pw = size * 0.03;
  const ph = size * 0.06;
  ctx.save();
  ctx.translate(center, 0);
  ctx.beginPath();
  ctx.moveTo(0, ph);
  ctx.lineTo(-pw, ph * 0.2);
  ctx.lineTo(pw, ph * 0.2);
  ctx.closePath();
  ctx.fillStyle = '#ff4444';
  ctx.fill();
  ctx.strokeStyle = '#ff8888';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// ── 主组件 ──────────────────────────────────────────────────────
export default function RollX() {
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const [multiplier, setMultiplier] = useState(2);
  const [betAmount, setBetAmount] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{ isWin: boolean; winAmount: number; netAmount: number; balanceAfter: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const currentAngleRef = useRef(0);

  // canvas 实际像素尺寸（由容器宽度决定）
  const [canvasSize, setCanvasSize] = useState(280);

  // 获取游戏设置
  const { data: settings } = trpc.rollx.getSettings.useQuery();
  // 获取玩家信息（余额）
  const { data: player, refetch: refetchPlayer } = trpc.player.me.useQuery();
  // 获取历史记录
  const { data: history, refetch: refetchHistory } = trpc.rollx.getHistory.useQuery({ limit: 10 });

  // 旋转 mutation
  const spinMutation = trpc.rollx.spin.useMutation();

  // 监听容器宽度，动态调整 canvas 尺寸
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      // canvas 占容器宽度的 75%，但最大 400px
      const size = Math.min(Math.round(w * 0.75), 400);
      setCanvasSize(size);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // 初始化/重绘转盘
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawWheel(ctx, canvasSize, multiplier, currentAngleRef.current);
  }, [multiplier, canvasSize]);

  // 执行旋转动画
  const animateSpin = useCallback((targetStopAngle: number, onComplete: () => void) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startAngle = currentAngleRef.current;
    const targetRotation = startAngle + EXTRA_ROTATIONS * Math.PI * 2 + (Math.PI * 2 - targetStopAngle * Math.PI / 180);
    const startTime = performance.now();

    function easeOut(t: number): number {
      return 1 - Math.pow(1 - t, 4);
    }

    function frame(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / SPIN_DURATION, 1);
      const angle = startAngle + (targetRotation - startAngle) * easeOut(progress);

      currentAngleRef.current = angle;
      drawWheel(ctx!, canvasSize, multiplier, angle);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(frame);
      } else {
        currentAngleRef.current = targetRotation % (Math.PI * 2);
        onComplete();
      }
    }

    animFrameRef.current = requestAnimationFrame(frame);
  }, [multiplier, canvasSize]);

  // 点击旋转
  const handleSpin = async () => {
    if (isSpinning) return;
    if (!player) { navigate('/login'); return; }
    const gold = parseFloat(player.gold);
    if (gold < betAmount) { alert('金币不足！'); return; }

    setIsSpinning(true);
    setShowResult(false);
    setResult(null);

    try {
      const res = await spinMutation.mutateAsync({ betAmount, multiplier });
      animateSpin(res.stopAngle, () => {
        setResult(res);
        setShowResult(true);
        setIsSpinning(false);
        refetchPlayer();
        refetchHistory();
      });
    } catch (err: any) {
      setIsSpinning(false);
      alert(err.message || '旋转失败，请重试');
    }
  };

  // 清理动画帧
  useEffect(() => {
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, []);

  const gold = player ? parseFloat(player.gold) : 0;
  const winChance = settings ? ((settings.rtp / 100) / multiplier * 100).toFixed(1) : '0';

  return (
    <div
      className="phone-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        containerType: 'inline-size',
        position: 'relative',
        background: '#0d0621',
      }}
      ref={containerRef}
    >
      {/* 全局背景 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${LANHU.pageBg})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'top center',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* ── 顶部导航（不滚动）── */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
        <TopNav showLogo={false} onBackClick={() => navigate('/')} />
      </div>

      {/* ── 内容区（可滚动）── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 页面标题 */}
        <div
          style={{
            textAlign: 'center',
            padding: `${q(12)} 0 ${q(4)}`,
            color: '#fff',
            fontSize: q(36),
            fontWeight: 700,
            textShadow: '0 0 16px rgba(139,92,246,0.8)',
            letterSpacing: 2,
            flexShrink: 0,
          }}
        >
          幸运转盘 ROLL-X
        </div>

        {/* 登录提示 */}
        {!player && (
          <div
            onClick={() => navigate('/login')}
            style={{
              margin: `${q(8)} ${q(24)}`,
              padding: `${q(16)} ${q(24)}`,
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.4)',
              borderRadius: q(16),
              color: '#c084fc',
              fontSize: q(26),
              textAlign: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            点击登录 / 注册
          </div>
        )}

        {/* 胜率信息 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: q(40),
            padding: `${q(8)} 0`,
            fontSize: q(24),
            flexShrink: 0,
          }}
        >
          <div style={{ color: '#9ca3af' }}>
            胜率: <span style={{ color: '#00ff88', fontWeight: 700 }}>{winChance}%</span>
          </div>
          <div style={{ color: '#9ca3af' }}>
            赔率: <span style={{ color: '#fde047', fontWeight: 700 }}>{multiplier.toFixed(2)}x</span>
          </div>
          <div style={{ color: '#9ca3af' }}>
            余额: <span style={{ color: '#c084fc', fontWeight: 700 }}>{gold.toFixed(2)}</span>
          </div>
        </div>

        {/* 转盘区域 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: `${q(16)} 0`,
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {/* 外圈光晕 */}
          <div
            style={{
              position: 'absolute',
              width: canvasSize + 40,
              height: canvasSize + 40,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
              animation: isSpinning ? 'rollx-pulse 1s ease-in-out infinite' : 'none',
            }}
          />
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            style={{
              borderRadius: '50%',
              boxShadow: '0 0 30px rgba(139,92,246,0.4), 0 0 60px rgba(139,92,246,0.2)',
              display: 'block',
            }}
          />
        </div>

        {/* 倍率选择 */}
        <div
          style={{
            margin: `0 ${q(24)} ${q(16)}`,
            background: 'rgba(20,8,50,0.9)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: q(20),
            padding: q(24),
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: q(10) }}>
            <span style={{ color: '#9ca3af', fontSize: q(24) }}>倍率 X</span>
            <span style={{ color: '#00ff88', fontSize: q(32), fontWeight: 700 }}>{multiplier.toFixed(2)}x</span>
          </div>
          {/* 倍率滑动条 */}
          <input
            type="range"
            min={1.01}
            max={Math.log10(settings?.maxMultiplier ?? 30000)}
            step={0.01}
            value={Math.log10(Math.max(multiplier, 1.01))}
            disabled={isSpinning}
            onChange={e => {
              const logVal = parseFloat(e.target.value);
              setMultiplier(parseFloat(Math.pow(10, logVal).toFixed(2)));
            }}
            style={{ width: '100%', accentColor: '#00ff88', cursor: isSpinning ? 'not-allowed' : 'pointer', height: 6 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: `${q(6)} 0 ${q(12)}` }}>
            <span style={{ color: '#6b7280', fontSize: q(20) }}>1.01x</span>
            <span style={{ color: '#6b7280', fontSize: q(20) }}>{(settings?.maxMultiplier ?? 30000).toLocaleString()}x</span>
          </div>
          {/* 快捷倍率按钮 */}
          <div style={{ display: 'flex', gap: q(8), flexWrap: 'wrap' }}>
            {[1.5, 2, 3, 5, 10, 25, 50, 100, 1000].map(m => (
              <button
                key={m}
                onClick={() => !isSpinning && setMultiplier(m)}
                style={{
                  padding: `${q(8)} ${q(14)}`,
                  borderRadius: q(10),
                  border: `1px solid ${Math.abs(multiplier - m) < 0.01 ? 'rgba(0,255,136,0.8)' : 'rgba(139,92,246,0.3)'}`,
                  background: Math.abs(multiplier - m) < 0.01 ? 'rgba(0,255,136,0.15)' : 'rgba(139,92,246,0.08)',
                  color: Math.abs(multiplier - m) < 0.01 ? '#00ff88' : '#c084fc',
                  cursor: isSpinning ? 'not-allowed' : 'pointer',
                  fontSize: q(22),
                  fontWeight: Math.abs(multiplier - m) < 0.01 ? 700 : 400,
                }}
              >
                {m}x
              </button>
            ))}
          </div>
        </div>

        {/* 投注金额 */}
        <div
          style={{
            margin: `0 ${q(24)} ${q(24)}`,
            background: 'rgba(20,8,50,0.9)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: q(20),
            padding: q(24),
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: q(10) }}>
            <span style={{ color: '#9ca3af', fontSize: q(24) }}>投注金额</span>
            <span style={{ color: '#fde047', fontSize: q(32), fontWeight: 700 }}>{betAmount.toLocaleString()}</span>
          </div>
          {/* 投注金额滑动条 */}
          <input
            type="range"
            min={1}
            max={Math.max(1, Math.min(Math.floor(gold), settings?.maxBet ?? 100000))}
            step={1}
            value={betAmount}
            disabled={isSpinning || gold < 1}
            onChange={e => setBetAmount(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#fde047', cursor: isSpinning ? 'not-allowed' : 'pointer', height: 6 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: `${q(6)} 0 ${q(12)}` }}>
            <span style={{ color: '#6b7280', fontSize: q(20) }}>1</span>
            <span style={{ color: '#6b7280', fontSize: q(20) }}>{Math.max(1, Math.min(Math.floor(gold), settings?.maxBet ?? 100000)).toLocaleString()}</span>
          </div>
          {/* 快捷金额按钮 */}
          <div style={{ display: 'flex', gap: q(8), marginBottom: q(12) }}>
            {[1, 10, 100, '1K', '10K'].map((label, i) => {
              const amt = [1, 10, 100, 1000, 10000][i];
              return (
                <button
                  key={label}
                  onClick={() => !isSpinning && setBetAmount(Math.min(amt, Math.floor(gold)))}
                  style={{
                    flex: 1,
                    padding: `${q(10)} 0`,
                    borderRadius: q(10),
                    border: `1px solid ${betAmount === amt ? 'rgba(253,224,71,0.8)' : 'rgba(139,92,246,0.3)'}`,
                    background: betAmount === amt ? 'rgba(253,224,71,0.15)' : 'rgba(139,92,246,0.08)',
                    color: betAmount === amt ? '#fde047' : '#c084fc',
                    cursor: isSpinning ? 'not-allowed' : 'pointer',
                    fontSize: q(22),
                    fontWeight: betAmount === amt ? 700 : 400,
                  }}
                >
                  {label}
                </button>
              );
            })}
            <button
              onClick={() => !isSpinning && setBetAmount(Math.max(1, Math.floor(gold / 2)))}
              style={{ flex: 1, padding: `${q(10)} 0`, borderRadius: q(10), border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)', color: '#c084fc', cursor: 'pointer', fontSize: q(22) }}
            >
              1/2
            </button>
            <button
              onClick={() => !isSpinning && setBetAmount(Math.max(1, Math.floor(gold)))}
              style={{ flex: 1, padding: `${q(10)} 0`, borderRadius: q(10), border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)', color: '#c084fc', cursor: 'pointer', fontSize: q(22) }}
            >
              全押
            </button>
          </div>
          <div style={{ color: '#6b7280', fontSize: q(22) }}>
            预期赢得: <span style={{ color: '#00ff88', fontWeight: 600 }}>{(betAmount * multiplier).toFixed(2)}</span> 金币
          </div>
        </div>

        {/* 旋转按钮 */}
        <button
          onClick={handleSpin}
          disabled={isSpinning}
          style={{
            margin: `0 ${q(24)} ${q(24)}`,
            padding: `${q(28)} 0`,
            borderRadius: q(20),
            border: 'none',
            background: isSpinning
              ? 'rgba(139,92,246,0.3)'
              : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)',
            color: '#fff',
            fontSize: q(32),
            fontWeight: 700,
            cursor: isSpinning ? 'not-allowed' : 'pointer',
            boxShadow: isSpinning ? 'none' : '0 0 20px rgba(139,92,246,0.6)',
            letterSpacing: 2,
            transition: 'all 0.3s',
            textShadow: '0 0 10px rgba(255,255,255,0.5)',
            flexShrink: 0,
          }}
        >
          {isSpinning ? '旋转中...' : '🎰 旋 转'}
        </button>

        {/* 历史记录 */}
        <div style={{ padding: `0 ${q(24)} ${q(24)}`, flexShrink: 0 }}>
          <div style={{ color: '#9ca3af', fontSize: q(24), marginBottom: q(12) }}>最近记录</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: q(8) }}>
            {(history || []).slice(0, 8).map(h => (
              <div
                key={h.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `${q(12)} ${q(16)}`,
                  background: 'rgba(20,8,50,0.6)',
                  border: `1px solid ${h.isWin ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,68,0.2)'}`,
                  borderRadius: q(10),
                  fontSize: q(22),
                }}
              >
                <span style={{ color: '#9ca3af' }}>{h.multiplier}x</span>
                <span style={{ color: '#9ca3af' }}>投注 {h.betAmount}</span>
                <span style={{ color: h.isWin ? '#00ff88' : '#ff4444', fontWeight: 700 }}>
                  {h.isWin ? `+${h.winAmount.toFixed(2)}` : `-${h.betAmount.toFixed(2)}`}
                </span>
                <span style={{ color: '#6b7280' }}>{new Date(h.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
            {(!history || history.length === 0) && (
              <div style={{ color: '#6b7280', fontSize: q(22), textAlign: 'center', padding: q(32) }}>暂无记录</div>
            )}
          </div>
        </div>
      </div>

      {/* ── 底部导航（沉底）── */}
      <BottomNav />

      {/* 结果弹窗 */}
      {showResult && result && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowResult(false)}
        >
          <div
            style={{
              background: result.isWin
                ? 'linear-gradient(135deg, rgba(0,100,50,0.95) 0%, rgba(0,50,25,0.98) 100%)'
                : 'linear-gradient(135deg, rgba(80,0,0,0.95) 0%, rgba(40,0,0,0.98) 100%)',
              border: `2px solid ${result.isWin ? 'rgba(0,255,136,0.6)' : 'rgba(255,68,68,0.6)'}`,
              borderRadius: 20,
              padding: '32px 40px',
              textAlign: 'center',
              boxShadow: result.isWin
                ? '0 0 40px rgba(0,255,136,0.4)'
                : '0 0 40px rgba(255,68,68,0.4)',
              minWidth: 240,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>
              {result.isWin ? '🎉' : '💀'}
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 900,
              color: result.isWin ? '#00ff88' : '#ff4444',
              textShadow: result.isWin ? '0 0 20px rgba(0,255,136,0.8)' : '0 0 20px rgba(255,68,68,0.8)',
              marginBottom: 8,
            }}>
              {result.isWin ? '恭喜获胜！' : '很遗憾...'}
            </div>
            <div style={{ color: '#fff', fontSize: 18, marginBottom: 4 }}>
              {result.isWin
                ? `赢得 ${result.winAmount.toFixed(2)} 金币`
                : `损失 ${(-result.netAmount).toFixed(2)} 金币`}
            </div>
            <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>
              余额: {result.balanceAfter.toFixed(2)}
            </div>
            <button
              onClick={() => setShowResult(false)}
              style={{
                padding: '10px 32px',
                borderRadius: 10,
                border: 'none',
                background: result.isWin ? 'rgba(0,255,136,0.3)' : 'rgba(255,68,68,0.3)',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              继续游戏
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes rollx-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
