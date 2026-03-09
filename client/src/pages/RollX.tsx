/**
 * RollX.tsx — 幸运转盘游戏（赛博朋克风格）
 * 玩法：玩家设置倍率X，绿色扇区占比=1/X，停在绿色赢X倍，停在黑色输
 * 服务端决定结果，客户端只负责动画展示
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import BottomNav from '@/components/BottomNav';
import PlayerInfoBar from '@/components/PlayerInfoBar';
import { useLocation } from 'wouter';

// ── 常量 ──────────────────────────────────────────────────────
const CANVAS_SIZE = 300;
const CENTER = CANVAS_SIZE / 2;
const RADIUS = CENTER - 10;
const SPIN_DURATION = 3000; // 转盘动画时长 ms
const EXTRA_ROTATIONS = 5; // 额外旋转圈数

// 倍率预设
const MULTIPLIER_PRESETS = [1.5, 2, 3, 5, 10, 25, 50, 100, 1000, 10000];

// ── 绘制转盘 ──────────────────────────────────────────────────
function drawWheel(
  ctx: CanvasRenderingContext2D,
  multiplier: number,
  currentAngle: number = 0
) {
  const greenAngle = (Math.PI * 2) / multiplier; // 绿色扇区弧度
  const blackAngle = Math.PI * 2 - greenAngle; // 黑色扇区弧度

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 外圈发光效果
  const glowGradient = ctx.createRadialGradient(CENTER, CENTER, RADIUS - 5, CENTER, CENTER, RADIUS + 5);
  glowGradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)');
  glowGradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

  // 绘制黑色扇区（大部分）
  ctx.save();
  ctx.translate(CENTER, CENTER);
  ctx.rotate(currentAngle);

  // 黑色/深色扇区
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, RADIUS, 0, blackAngle);
  ctx.closePath();
  const blackGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, RADIUS);
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
    ctx.lineTo(Math.cos(angle) * RADIUS, Math.sin(angle) * RADIUS);
    ctx.stroke();
  }

  // 绿色扇区（赢区）
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, RADIUS, blackAngle, Math.PI * 2);
  ctx.closePath();
  const greenGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, RADIUS);
  greenGrad.addColorStop(0, '#00ff88');
  greenGrad.addColorStop(0.5, '#00cc66');
  greenGrad.addColorStop(1, '#009944');
  ctx.fillStyle = greenGrad;
  ctx.fill();

  // 绿色扇区发光边缘
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, RADIUS, blackAngle, Math.PI * 2);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 中心圆
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
  centerGrad.addColorStop(0, '#c084fc');
  centerGrad.addColorStop(1, '#7c3aed');
  ctx.fillStyle = centerGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(192, 132, 252, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 中心X标志
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('X', 0, 0);

  ctx.restore();

  // 外圈装饰
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS + 3, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 外圈光点
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 / 24) * i + currentAngle;
    const x = CENTER + Math.cos(angle) * (RADIUS + 8);
    const y = CENTER + Math.sin(angle) * (RADIUS + 8);
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(0, 255, 136, 0.8)' : 'rgba(139, 92, 246, 0.4)';
    ctx.fill();
  }

  // 指针（顶部三角，尖端朝下指向转盘）
  ctx.save();
  ctx.translate(CENTER, 0);
  ctx.beginPath();
  ctx.moveTo(0, 22);   // 尖端朝下
  ctx.lineTo(-9, 4);
  ctx.lineTo(9, 4);
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
  const animFrameRef = useRef<number>(0);
  const [multiplier, setMultiplier] = useState(2);
  const [betAmount, setBetAmount] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{ isWin: boolean; winAmount: number; netAmount: number; balanceAfter: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const currentAngleRef = useRef(0);

  // 获取游戏设置
  const { data: settings } = trpc.rollx.getSettings.useQuery();
  // 获取玩家信息（余额）
  const { data: player, refetch: refetchPlayer } = trpc.player.me.useQuery();
  // 获取历史记录
  const { data: history, refetch: refetchHistory } = trpc.rollx.getHistory.useQuery({ limit: 10 });

  // 旋转 mutation
  const spinMutation = trpc.rollx.spin.useMutation();

  // 初始化绘制
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawWheel(ctx, multiplier, currentAngleRef.current);
  }, [multiplier]);

  // 执行旋转动画
  const animateSpin = useCallback((targetStopAngle: number, onComplete: () => void) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startAngle = currentAngleRef.current;
    // 目标角度：额外旋转N圈 + 停止角度（从顶部指针位置计算）
    // 指针在顶部（-π/2），绿色区从0度开始
    // 停止角度是从0度顺时针的角度，转盘需要旋转到让该角度对准顶部指针
    // 即转盘旋转角度 = -targetStopAngle + π/2（让targetStopAngle对准顶部）
    // 加上额外圈数确保有足够旋转
    const targetRotation = startAngle + EXTRA_ROTATIONS * Math.PI * 2 + (Math.PI * 2 - targetStopAngle * Math.PI / 180);
    const startTime = performance.now();

    function easeOut(t: number): number {
      return 1 - Math.pow(1 - t, 4);
    }

    function frame(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / SPIN_DURATION, 1);
      const easedProgress = easeOut(progress);
      const angle = startAngle + (targetRotation - startAngle) * easedProgress;

      currentAngleRef.current = angle;
      setCurrentAngle(angle);
      drawWheel(ctx!, multiplier, angle);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(frame);
      } else {
        currentAngleRef.current = targetRotation % (Math.PI * 2);
        onComplete();
      }
    }

    animFrameRef.current = requestAnimationFrame(frame);
  }, [multiplier]);

  // 点击旋转
  const handleSpin = async () => {
    if (isSpinning) return;
    if (!player) {
      navigate('/login');
      return;
    }
    const gold = parseFloat(player.gold);
    if (gold < betAmount) {
      alert('金币不足！');
      return;
    }

    setIsSpinning(true);
    setShowResult(false);
    setResult(null);

    try {
      const res = await spinMutation.mutateAsync({ betAmount, multiplier });
      // 开始动画，动画结束后显示结果
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
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const gold = player ? parseFloat(player.gold) : 0;
  const winChance = settings ? ((settings.rtp / 100) / multiplier * 100).toFixed(1) : '0';

  return (
    <div style={{ minHeight: '100vh', background: '#0d0621', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 全局背景 */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* 内容层 */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', paddingBottom: 56 }}>
        {/* 顶部导航 */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 8, padding: '6px 12px', color: '#c084fc', cursor: 'pointer', fontSize: 14 }}
          >
            ← 返回
          </button>
          <div style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 18, fontWeight: 700, textShadow: '0 0 12px rgba(139,92,246,0.8)' }}>
            幸运转盘 ROLL-X
          </div>
        </div>

        {/* 玩家信息 */}
        <PlayerInfoBar />

        {/* 主游戏区 */}
        <div style={{ padding: '12px 16px' }}>
          {/* 转盘容器 */}
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            {/* 外圈光晕 */}
            <div style={{
              position: 'absolute',
              width: CANVAS_SIZE + 40,
              height: CANVAS_SIZE + 40,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
              animation: isSpinning ? 'pulse 1s ease-in-out infinite' : 'none',
            }} />
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{ borderRadius: '50%', boxShadow: '0 0 30px rgba(139,92,246,0.4), 0 0 60px rgba(139,92,246,0.2)' }}
            />
          </div>

          {/* 胜率信息 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginBottom: 12,
            fontSize: 13,
          }}>
            <div style={{ color: '#9ca3af' }}>
              胜率: <span style={{ color: '#00ff88', fontWeight: 700 }}>{winChance}%</span>
            </div>
            <div style={{ color: '#9ca3af' }}>
              赔率: <span style={{ color: '#ffd700', fontWeight: 700 }}>{multiplier}x</span>
            </div>
            <div style={{ color: '#9ca3af' }}>
              余额: <span style={{ color: '#c084fc', fontWeight: 700 }}>{gold.toFixed(2)}</span>
            </div>
          </div>

          {/* 倍率选择 */}
          <div style={{
            background: 'rgba(20,8,50,0.9)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: 12,
            padding: '12px',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ color: '#9ca3af', fontSize: 12 }}>倍率 X</span>
              <span style={{ color: '#00ff88', fontSize: 18, fontWeight: 700 }}>{multiplier.toFixed(2)}x</span>
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
                const val = Math.pow(10, logVal);
                setMultiplier(parseFloat(val.toFixed(2)));
              }}
              style={{ width: '100%', accentColor: '#00ff88', cursor: isSpinning ? 'not-allowed' : 'pointer', height: 6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }}>
              <span style={{ color: '#6b7280', fontSize: 11 }}>1.01x</span>
              <span style={{ color: '#6b7280', fontSize: 11 }}>{(settings?.maxMultiplier ?? 30000).toLocaleString()}x</span>
            </div>
            {/* 快捷倍率按钮 */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[1.5, 2, 3, 5, 10, 25, 50, 100, 1000].map(m => (
                <button
                  key={m}
                  onClick={() => !isSpinning && setMultiplier(m)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: `1px solid ${Math.abs(multiplier - m) < 0.01 ? 'rgba(0,255,136,0.8)' : 'rgba(139,92,246,0.3)'}`,
                    background: Math.abs(multiplier - m) < 0.01 ? 'rgba(0,255,136,0.15)' : 'rgba(139,92,246,0.08)',
                    color: Math.abs(multiplier - m) < 0.01 ? '#00ff88' : '#c084fc',
                    cursor: isSpinning ? 'not-allowed' : 'pointer',
                    fontSize: 11,
                    fontWeight: Math.abs(multiplier - m) < 0.01 ? 700 : 400,
                  }}
                >
                  {m}x
                </button>
              ))}
            </div>
          </div>

          {/* 投注金额 */}
          <div style={{
            background: 'rgba(20,8,50,0.9)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: 12,
            padding: '12px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ color: '#9ca3af', fontSize: 12 }}>投注金额</span>
              <span style={{ color: '#fde047', fontSize: 18, fontWeight: 700 }}>{betAmount.toLocaleString()}</span>
            </div>
            {/* 投注金额滑动条 */}
            <input
              type="range"
              min={1}
              max={Math.min(Math.floor(gold), settings?.maxBet ?? 100000)}
              step={1}
              value={betAmount}
              disabled={isSpinning || gold < 1}
              onChange={e => setBetAmount(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#fde047', cursor: isSpinning ? 'not-allowed' : 'pointer', height: 6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }}>
              <span style={{ color: '#6b7280', fontSize: 11 }}>1</span>
              <span style={{ color: '#6b7280', fontSize: 11 }}>{Math.min(Math.floor(gold), settings?.maxBet ?? 100000).toLocaleString()}</span>
            </div>
            {/* 快捷金额按钮 */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[1, 10, 100, 1000, 10000].map(amt => (
                <button
                  key={amt}
                  onClick={() => !isSpinning && setBetAmount(Math.min(amt, Math.floor(gold)))}
                  style={{
                    flex: 1,
                    padding: '5px 4px',
                    borderRadius: 6,
                    border: `1px solid ${betAmount === amt ? 'rgba(253,224,71,0.8)' : 'rgba(139,92,246,0.3)'}`,
                    background: betAmount === amt ? 'rgba(253,224,71,0.15)' : 'rgba(139,92,246,0.08)',
                    color: betAmount === amt ? '#fde047' : '#c084fc',
                    cursor: isSpinning ? 'not-allowed' : 'pointer',
                    fontSize: 11,
                    fontWeight: betAmount === amt ? 700 : 400,
                  }}
                >
                  {amt >= 1000 ? `${amt/1000}K` : amt}
                </button>
              ))}
              <button
                onClick={() => !isSpinning && setBetAmount(Math.floor(gold / 2))}
                style={{ flex: 1, padding: '5px 4px', borderRadius: 6, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)', color: '#c084fc', cursor: 'pointer', fontSize: 11 }}
              >
                1/2
              </button>
              <button
                onClick={() => !isSpinning && setBetAmount(Math.floor(gold))}
                style={{ flex: 1, padding: '5px 4px', borderRadius: 6, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)', color: '#c084fc', cursor: 'pointer', fontSize: 11 }}
              >
                全押
              </button>
            </div>
            <div style={{ color: '#6b7280', fontSize: 11 }}>
              预期赢得: <span style={{ color: '#00ff88', fontWeight: 600 }}>{(betAmount * multiplier).toFixed(2)}</span> 金币
            </div>
          </div>

          {/* 旋转按钮 */}
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              border: 'none',
              background: isSpinning
                ? 'rgba(139,92,246,0.3)'
                : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)',
              color: '#fff',
              fontSize: 18,
              fontWeight: 700,
              cursor: isSpinning ? 'not-allowed' : 'pointer',
              boxShadow: isSpinning ? 'none' : '0 0 20px rgba(139,92,246,0.6)',
              letterSpacing: 2,
              transition: 'all 0.3s',
              textShadow: '0 0 10px rgba(255,255,255,0.5)',
            }}
          >
            {isSpinning ? '旋转中...' : '🎰 旋 转'}
          </button>
        </div>

        {/* 历史记录 */}
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8 }}>最近记录</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(history || []).slice(0, 8).map(h => (
              <div
                key={h.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(20,8,50,0.6)',
                  border: `1px solid ${h.isWin ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,68,0.2)'}`,
                  borderRadius: 6,
                  fontSize: 12,
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
              <div style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', padding: 16 }}>暂无记录</div>
            )}
          </div>
        </div>
      </div>

      {/* 底部导航 */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <BottomNav />
      </div>

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
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
