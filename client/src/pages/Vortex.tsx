/**
 * Vortex.tsx — Turbo Games Vortex 游戏复刻
 * 同心圆轨道老虎机，3条元素轨道（火/土/水），每次旋转产生一个元素符号
 * 填满轨道触发 Bonus Cash Out，随时可 Cash Out
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useSound } from '@/hooks/useSound';

// ── CDN 素材 ──────────────────────────────────────────────────────────────────
const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';
const ASSETS = {
  bg: `${CDN}/background_f7445440.webp`,
  elementFire: `${CDN}/element-fire_23f47a9c.png`,
  elementEarth: `${CDN}/element-earth_ef6941d8.png`,
  elementWater: `${CDN}/element-water_bfce70a4.png`,
  elementWind: `${CDN}/element-wind_3ec84dc0.png`,
  elementSkull: `${CDN}/element-skull_b9001ddb.png`,
  elementBonus: `${CDN}/element-bonus_11bf7c8a.png`,
  logo: `${CDN}/logo_540c18cd.png`,
};

// ── 游戏常量 ──────────────────────────────────────────────────────────────────
const TRACK_MAX = 8;
// 每格对应的倍率（从第1格到第8格，第8格触发Bonus）
const TRACK_MULTIPLIERS = [1.55, 2.5, 3.9, 4.85, 7.5, 10, 16, 20.5];

type Element = 'fire' | 'earth' | 'water' | 'wind' | 'skull' | 'bonus';

interface TrackState {
  fire: number;
  earth: number;
  water: number;
}

// ── 元素配置 ──────────────────────────────────────────────────────────────────
const ELEMENT_CONFIG: Record<Element, { label: string; color: string; icon: string; bgColor: string }> = {
  fire:  { label: '火焰', color: '#ff6b35', bgColor: 'rgba(255,107,53,0.2)', icon: ASSETS.elementFire },
  earth: { label: '大地', color: '#4caf50', bgColor: 'rgba(76,175,80,0.2)',  icon: ASSETS.elementEarth },
  water: { label: '海浪', color: '#2196f3', bgColor: 'rgba(33,150,243,0.2)', icon: ASSETS.elementWater },
  wind:  { label: '风',   color: '#9e9e9e', bgColor: 'rgba(158,158,158,0.2)', icon: ASSETS.elementWind },
  skull: { label: '骷髅', color: '#f44336', bgColor: 'rgba(244,67,54,0.2)',  icon: ASSETS.elementSkull },
  bonus: { label: '奖励', color: '#ffd700', bgColor: 'rgba(255,215,0,0.2)',  icon: ASSETS.elementBonus },
};

// ── 同心圆轨道组件 ────────────────────────────────────────────────────────────
function OrbitTrack({
  trackState,
  spinningElement,
  isSpinning,
  bonusTriggered,
}: {
  trackState: TrackState;
  spinningElement: Element | null;
  isSpinning: boolean;
  bonusTriggered: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const rotationRef = useRef(0);
  // 弧形扫描动画进度：每个轨道的新增格子动画进度 0→1
  const arcAnimRef = useRef<{ fire: number; earth: number; water: number }>({ fire: 1, earth: 1, water: 1 });
  const prevTrackRef = useRef<TrackState>({ fire: 0, earth: 0, water: 0 });

  // 轨道颜色
  const TRACK_COLORS = {
    fire: '#ff6b35',
    earth: '#4caf50',
    water: '#2196f3',
  };

  // 当 trackState 变化时，检测新增格子并重置动画进度
  useEffect(() => {
    const prev = prevTrackRef.current;
    const keys: Array<'fire' | 'earth' | 'water'> = ['fire', 'earth', 'water'];
    keys.forEach(k => {
      if (trackState[k] > prev[k]) {
        // 新增了格子，重置该轨道的动画进度
        arcAnimRef.current[k] = 0;
      }
    });
    prevTrackRef.current = { ...trackState };
  }, [trackState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    // 5个同心圆的半径
    const radii = [W * 0.08, W * 0.17, W * 0.26, W * 0.35, W * 0.44];
    // 轨道对应：ring0=中心, ring1=水, ring2=土, ring3=火, ring4=外圈倍率
    const trackRadii = {
      water: radii[1],
      earth: radii[2],
      fire: radii[3],
    };
    const outerRadius = radii[4];

    // 弧形扫描动画缓动函数（easeOutCubic）
    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    function drawFrame() {
      ctx!.clearRect(0, 0, W, H);

      // 推进动画进度（每帧+0.045，大约400ms完成）
      const keys: Array<'fire' | 'earth' | 'water'> = ['fire', 'earth', 'water'];
      keys.forEach(k => {
        if (arcAnimRef.current[k] < 1) {
          arcAnimRef.current[k] = Math.min(1, arcAnimRef.current[k] + 0.045);
        }
      });

      // 外圈背景（深色）
      ctx!.beginPath();
      ctx!.arc(cx, cy, outerRadius + 8, 0, Math.PI * 2);
      ctx!.fillStyle = 'rgba(10,8,20,0.95)';
      ctx!.fill();

      // 绘制各圆环轨道
      const tracks: Array<{ key: 'fire' | 'earth' | 'water'; radius: number; color: string; filled: number }> = [
        { key: 'fire',  radius: trackRadii.fire,  color: TRACK_COLORS.fire,  filled: trackState.fire },
        { key: 'earth', radius: trackRadii.earth, color: TRACK_COLORS.earth, filled: trackState.earth },
        { key: 'water', radius: trackRadii.water, color: TRACK_COLORS.water, filled: trackState.water },
      ];

      tracks.forEach(({ key, radius, color, filled }) => {
        const trackWidth = 22;
        const segments = TRACK_MAX;
        const gap = 0.04; // 弧度间隙
        // 最新一格的动画进度（其他格子已经完成）
        const animProgress = easeOut(arcAnimRef.current[key]);

        for (let i = 0; i < segments; i++) {
          const startAngle = (i / segments) * Math.PI * 2 - Math.PI / 2 + gap / 2;
          const fullEndAngle = ((i + 1) / segments) * Math.PI * 2 - Math.PI / 2 - gap / 2;

          // 对最新一格（filled-1）应用扫描动画
          const isNewest = (i === filled - 1);
          const endAngle = isNewest
            ? startAngle + (fullEndAngle - startAngle) * animProgress
            : fullEndAngle;

          ctx!.beginPath();
          if (isNewest && animProgress < 1) {
            // 扫描展开动画：只画已展开的部分
            ctx!.arc(cx, cy, radius, startAngle, endAngle);
            ctx!.arc(cx, cy, radius - trackWidth, endAngle, startAngle, true);
          } else {
            ctx!.arc(cx, cy, radius, startAngle, fullEndAngle);
            ctx!.arc(cx, cy, radius - trackWidth, fullEndAngle, startAngle, true);
          }
          ctx!.closePath();

          if (i < filled) {
            // 已填充的格子
            const alpha = isNewest ? animProgress : 1;
            const hexAlpha = Math.round(alpha * 255).toString(16).padStart(2, '0');
            ctx!.fillStyle = color + hexAlpha;
            ctx!.shadowColor = color;
            ctx!.shadowBlur = isNewest ? 8 * animProgress : 8;
          } else {
            // 未填充的格子
            ctx!.fillStyle = 'rgba(60,50,80,0.6)';
            ctx!.shadowBlur = 0;
          }
          ctx!.fill();
          ctx!.shadowBlur = 0;
        }

        // 轨道边框
        ctx!.beginPath();
        ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx!.strokeStyle = `${color}44`;
        ctx!.lineWidth = 1;
        ctx!.stroke();

        ctx!.beginPath();
        ctx!.arc(cx, cy, radius - trackWidth, 0, Math.PI * 2);
        ctx!.strokeStyle = `${color}44`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      });

      // 外圈倍率文字
      const outerMultipliers = ['200X', '123X', '85X', '72.5X', '52X', '44X', '28X', '27.5X', '16X', '10X', '8.5X', '7.5X', '4.85X', '3.9X', '2.5X', '1.55X'];
      const outerCount = outerMultipliers.length;
      ctx!.font = `bold ${W * 0.025}px Arial`;
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';

      for (let i = 0; i < outerCount; i++) {
        const angle = (i / outerCount) * Math.PI * 2 - Math.PI / 2;
        const textR = outerRadius - 12;
        const tx = cx + textR * Math.cos(angle);
        const ty = cy + textR * Math.sin(angle);
        ctx!.fillStyle = '#ffffff88';
        ctx!.fillText(outerMultipliers[i], tx, ty);
      }

      // 内圈倍率标注
      const innerLabels = [
        { text: '+20.5X', angle: -Math.PI / 4, r: trackRadii.earth - 11, color: '#ffd700' },
        { text: '+7X',    angle: Math.PI / 4,  r: trackRadii.water - 11, color: '#aaffaa' },
        { text: '奖励',  angle: -Math.PI * 3 / 4, r: trackRadii.fire - 11, color: '#ff9900' },
      ];
      ctx!.font = `bold ${W * 0.022}px Arial`;
      innerLabels.forEach(({ text, angle, r, color }) => {
        const tx = cx + r * Math.cos(angle);
        const ty = cy + r * Math.sin(angle);
        ctx!.fillStyle = color;
        ctx!.fillText(text, tx, ty);
      });

      // 中心圆（显示当前旋转元素）
      const centerR = radii[0];
      ctx!.beginPath();
      ctx!.arc(cx, cy, centerR, 0, Math.PI * 2);
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, centerR);
      grad.addColorStop(0, '#3a1a6e');
      grad.addColorStop(1, '#1a0a3e');
      ctx!.fillStyle = grad;
      ctx!.fill();
      ctx!.strokeStyle = '#7c3aed44';
      ctx!.lineWidth = 2;
      ctx!.stroke();

      // 旋转动画（中心漩涡）
      if (isSpinning) {
        rotationRef.current += 0.05;
        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.rotate(rotationRef.current);
        // 漩涡效果
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2 + rotationRef.current;
          const r = centerR * 0.6;
          ctx!.beginPath();
          ctx!.arc(cx - cx + r * Math.cos(angle), cy - cy + r * Math.sin(angle), 3, 0, Math.PI * 2);
          ctx!.fillStyle = '#a855f7';
          ctx!.fill();
        }
        ctx!.restore();
      }

      // Bonus 触发特效
      if (bonusTriggered) {
        ctx!.beginPath();
        ctx!.arc(cx, cy, outerRadius + 4, 0, Math.PI * 2);
        ctx!.strokeStyle = '#ffd700';
        ctx!.lineWidth = 4;
        ctx!.shadowColor = '#ffd700';
        ctx!.shadowBlur = 20;
        ctx!.stroke();
        ctx!.shadowBlur = 0;
      }
    }

    function animate() {
      drawFrame();
      animRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [trackState, isSpinning, bonusTriggered]);

  return (
    <canvas
      ref={canvasRef}
      width={380}
      height={380}
      style={{ width: '100%', maxWidth: 380, display: 'block', margin: '0 auto' }}
    />
  );
}

// ── 主游戏组件 ────────────────────────────────────────────────────────────────
export default function Vortex() {
  const [, navigate] = useLocation();
  const [trackState, setTrackState] = useState<TrackState>({ fire: 0, earth: 0, water: 0 });
  const [betAmount, setBetAmount] = useState(1);
  const [currentMultiplier, setCurrentMultiplier] = useState(0);
  const [payout, setPayout] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [spinningElement, setSpinningElement] = useState<Element | null>(null);
  const [lastElement, setLastElement] = useState<Element | null>(null);
  const [bonusTriggered, setBonusTriggered] = useState(false);
  const [gameMessage, setGameMessage] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [gameStarted, setGameStarted] = useState(false); // 是否已开始（扣了投注）
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 音效
  const { playWin, playLose, playSpinStop, playClick, startBgm } = useSound();

  // tRPC hooks
  const playerQuery = trpc.player.me.useQuery();
  const configQuery = trpc.vortex.getConfig.useQuery();
  const spinMutation = trpc.vortex.spin.useMutation();
  const cashOutMutation = trpc.vortex.cashOut.useMutation();
  const historyQuery = trpc.vortex.getHistory.useQuery({ limit: 20 }, { enabled: showHistory });

  useEffect(() => {
    if (playerQuery.data) {
      setBalance(parseFloat(playerQuery.data.gold as string));
    }
  }, [playerQuery.data]);

  // 计算当前倍率
  const calcMultiplier = useCallback((track: TrackState): number => {
    const fm = track.fire > 0 ? TRACK_MULTIPLIERS[track.fire - 1] : 0;
    const em = track.earth > 0 ? TRACK_MULTIPLIERS[track.earth - 1] : 0;
    const wm = track.water > 0 ? TRACK_MULTIPLIERS[track.water - 1] : 0;
    return fm + em + wm;
  }, []);

  // 执行一次旋转
  const doSpin = useCallback(async () => {
    if (isSpinning) return;
    if (balance !== null && balance < betAmount) {
      setGameMessage('金币不足，请充值');
      return;
    }

    setIsSpinning(true);
    setBonusTriggered(false);
    setGameMessage('');

    try {
      const result = await spinMutation.mutateAsync({
        betAmount,
        trackState,
        currentMultiplier,
      });

      // 动画展示元素
      setSpinningElement(result.element as Element);
      setLastElement(result.element as Element);

      // 更新轨道状态
      const newTrack = result.newTrack as TrackState;
      setTrackState(newTrack);

      // 更新倍率
      const newMult = result.multiplier;
      setCurrentMultiplier(newMult);
      const newPayout = betAmount * newMult;
      setPayout(newPayout);

      // 处理特殊元素
      if (result.element === 'skull') {
        setGameMessage('💀 骷髅！所有轨道退后1格');
        playLose(); // 骷髅音效
      } else if (result.element === 'wind') {
        setGameMessage('💨 风，继续旋转...');
        playSpinStop(); // 风元素音效
      } else if (result.bonusTriggered) {
        setBonusTriggered(true);
        setGameMessage(`🎉 BONUS！获得 ${result.bonusMultiplier}x 奖励！`);
        playWin(); // Bonus 大奖音效
        // 自动触发 Cash Out
        setTimeout(() => {
          handleCashOut(false, newPayout, newTrack);
        }, 1500);
      } else {
        const elName = ELEMENT_CONFIG[result.element as Element]?.label || result.element;
        setGameMessage(`${elName} +${result.multiplier.toFixed(2)}x`);
        playSpinStop(); // 旋转停止音效
      }

      // 更新余额（扣除投注，不加赢额，赢额在CashOut时结算）
      if (!gameStarted) {
        setGameStarted(true);
        if (balance !== null) setBalance(prev => prev !== null ? prev - betAmount : prev);
      }

    } catch (err: any) {
      setGameMessage(err.message || '旋转失败');
    } finally {
      setIsSpinning(false);
      setSpinningElement(null);
    }
  }, [isSpinning, balance, betAmount, trackState, currentMultiplier, gameStarted, spinMutation]);

  // Cash Out
  const handleCashOut = useCallback(async (isPartial = false, overridePayout?: number, overrideTrack?: TrackState) => {
    const payoutToUse = overridePayout ?? payout;
    if (payoutToUse <= 0 && !isPartial) {
      setGameMessage('没有可提取的赢额');
      return;
    }

    try {
      const result = await cashOutMutation.mutateAsync({
        betAmount,
        multiplier: currentMultiplier,
        trackState: overrideTrack ?? trackState,
        isPartial,
        partialRatio: 0.5,
      });

      if (result.success) {
        setBalance(result.balanceAfter);
        playWin(); // Cash Out 赢錢音效
        if (isPartial) {
          setGameMessage(`💰 提取了 ${result.winAmount.toFixed(2)} 金币，继续游戏！`);
          // 部分提取后重置轨道
          setTrackState({ fire: 0, earth: 0, water: 0 });
          setCurrentMultiplier(0);
          setPayout(0);
          setGameStarted(false);
        } else {
          setGameMessage(`🎉 Cash Out！赢得 ${result.winAmount.toFixed(2)} 金币！`);
          // 重置游戏
          setTrackState({ fire: 0, earth: 0, water: 0 });
          setCurrentMultiplier(0);
          setPayout(0);
          setGameStarted(false);
          setBonusTriggered(false);
          setAutoMode(false);
        }
        playerQuery.refetch();
      }
    } catch (err: any) {
      setGameMessage(err.message || 'Cash Out 失败');
    }
  }, [payout, betAmount, currentMultiplier, trackState, cashOutMutation, playerQuery]);

  // 按住旋转按鈕
  const handleHoldStart = useCallback(() => {
    if (isSpinning) return;
    startBgm(); // 首次点击启动 BGM
    playClick(); // 按鈕点击音效
    setIsHolding(true);
    doSpin();
  }, [isSpinning, doSpin, startBgm, playClick]);

  const handleHoldEnd = useCallback(() => {
    setIsHolding(false);
    setAutoMode(false);
  }, []);

  // 自动模式
  useEffect(() => {
    if (autoMode && !isSpinning && !bonusTriggered) {
      autoTimerRef.current = setTimeout(() => {
        doSpin();
      }, 800);
    }
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [autoMode, isSpinning, bonusTriggered, doSpin]);

  // 调整投注金额
  const adjustBet = (delta: number) => {
    if (gameStarted) return; // 游戏进行中不能修改
    const config = configQuery.data;
    const minBet = config?.minBet ?? 1;
    const maxBet = config?.maxBet ?? 1000;
    setBetAmount(prev => Math.max(minBet, Math.min(maxBet, prev + delta)));
  };

  const isLoggedIn = !!playerQuery.data;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0814',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 背景图 */}
      <img src={ASSETS.bg} alt="" style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', opacity: 0.3, pointerEvents: 'none', zIndex: 0,
      }} />

      {/* 顶部导航 */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(10,8,20,0.8)',
        borderBottom: '1px solid rgba(124,58,237,0.3)',
      }}>
        {/* 返回 + 余额 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)',
              borderRadius: 8, padding: '6px 12px', color: '#c4b5fd', cursor: 'pointer', fontSize: 13,
            }}
          >
            ← 返回
          </button>
          <span style={{ color: '#e2d9f3', fontSize: 14 }}>
            余额: <strong style={{ color: '#ffd700' }}>
              {balance !== null ? `¥${balance.toFixed(2)}` : '---'}
            </strong>
          </span>
        </div>

        {/* 右侧按钮组 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowHowToPlay(true)}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', fontSize: 14,
            }}
          >?</button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              background: showHistory ? 'rgba(124,58,237,0.4)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8, padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: 12,
            }}
          >历史</button>
        </div>
      </div>

      {/* 主体内容 */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '8px 16px 16px',
        maxWidth: 480, margin: '0 auto', width: '100%',
      }}>
        {/* VORTEX 品牌标志 */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{
            fontSize: 28, fontWeight: 900, letterSpacing: 3,
            background: 'linear-gradient(135deg, #7c3aed, #a855f7, #c084fc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            textShadow: 'none',
          }}>VORTEX</div>
          <div style={{ fontSize: 10, color: '#7c3aed', letterSpacing: 4, marginTop: -4 }}>官方游戏</div>
        </div>

        {/* 同心圆轨道 */}
        <div style={{ width: '100%', position: 'relative' }}>
          <OrbitTrack
            trackState={trackState}
            spinningElement={spinningElement}
            isSpinning={isSpinning}
            bonusTriggered={bonusTriggered}
          />

          {/* 中心元素显示 */}
          {lastElement && (
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 56, height: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <img
                src={ELEMENT_CONFIG[lastElement].icon}
                alt={lastElement}
                style={{
                  width: 48, height: 48, objectFit: 'contain',
                  filter: `drop-shadow(0 0 8px ${ELEMENT_CONFIG[lastElement].color})`,
                  animation: isSpinning ? 'none' : 'elementPop 0.3s ease',
                }}
              />
            </div>
          )}
        </div>

        {/* 游戏消息 */}
        <div style={{
          minHeight: 28, textAlign: 'center',
          color: bonusTriggered ? '#ffd700' : '#c4b5fd',
          fontSize: 14, fontWeight: bonusTriggered ? 700 : 400,
          marginBottom: 4,
          transition: 'all 0.3s',
        }}>
          {gameMessage}
        </div>

        {/* 轨道进度条 */}
        <div style={{
          display: 'flex', gap: 8, width: '100%', marginBottom: 12,
        }}>
          {(['fire', 'earth', 'water'] as const).map(key => {
            const cfg = ELEMENT_CONFIG[key];
            const filled = trackState[key];
            const mult = filled > 0 ? TRACK_MULTIPLIERS[filled - 1] : 0;
            return (
              <div key={key} style={{ flex: 1 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 11, color: cfg.color, marginBottom: 3,
                }}>
                  <span>{cfg.label}</span>
                  <span>{mult > 0 ? `${mult}x` : '-'}</span>
                </div>
                <div style={{
                  height: 6, borderRadius: 3,
                  background: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(filled / TRACK_MAX) * 100}%`,
                    background: cfg.color,
                    borderRadius: 3,
                    boxShadow: `0 0 6px ${cfg.color}`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <div style={{ fontSize: 10, color: '#888', textAlign: 'right', marginTop: 1 }}>
                  {filled}/{TRACK_MAX}
                </div>
              </div>
            );
          })}
        </div>

        {/* 控制区 */}
        <div style={{
          width: '100%',
          background: 'rgba(20,15,40,0.9)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 16,
          padding: '14px 16px',
        }}>
          {/* 投注金额 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>投注金额</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ffd700' }}>¥{betAmount}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => adjustBet(-1)}
                disabled={gameStarted}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: gameStarted ? 'rgba(60,50,80,0.4)' : 'rgba(124,58,237,0.3)',
                  border: '1px solid rgba(124,58,237,0.4)',
                  color: '#c4b5fd', fontSize: 20, cursor: gameStarted ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <button
                onClick={() => adjustBet(1)}
                disabled={gameStarted}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: gameStarted ? 'rgba(60,50,80,0.4)' : 'rgba(124,58,237,0.3)',
                  border: '1px solid rgba(124,58,237,0.4)',
                  color: '#c4b5fd', fontSize: 20, cursor: gameStarted ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
          </div>

          {/* 三个主按钮 */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            {/* Cash Out */}
            <button
              onClick={() => handleCashOut(false)}
              disabled={payout <= 0 || isSpinning}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: payout > 0 ? 'rgba(60,50,80,0.9)' : 'rgba(40,35,60,0.5)',
                border: `2px solid ${payout > 0 ? 'rgba(124,58,237,0.8)' : 'rgba(60,50,80,0.4)'}`,
                color: payout > 0 ? '#c4b5fd' : '#555',
                cursor: payout > 0 ? 'pointer' : 'not-allowed',
                fontSize: 12, fontWeight: 700,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <span>提</span>
              <span>现</span>
            </button>

            {/* HOLD TO SPIN */}
            <button
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
              onClick={!isHolding ? doSpin : undefined}
              disabled={isSpinning || !isLoggedIn}
              style={{
                width: 100, height: 100, borderRadius: '50%',
                background: isSpinning
                  ? 'linear-gradient(135deg, #5b21b6, #7c3aed)'
                  : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                border: '3px solid rgba(168,85,247,0.6)',
                color: '#fff',
                cursor: isSpinning ? 'not-allowed' : 'pointer',
                fontSize: 11, fontWeight: 700,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2,
                boxShadow: isSpinning ? 'none' : '0 0 20px rgba(168,85,247,0.5)',
                transition: 'all 0.2s',
                animation: isSpinning ? 'spinPulse 0.5s infinite alternate' : 'none',
              }}
            >
              <span style={{ fontSize: 22 }}>🌀</span>
              <span style={{ fontSize: 10 }}>按住</span>
              <span style={{ fontSize: 10 }}>旋转</span>
            </button>

            {/* Part Payout */}
            <button
              onClick={() => handleCashOut(true)}
              disabled={payout <= 0 || isSpinning}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: payout > 0 ? 'rgba(60,50,80,0.9)' : 'rgba(40,35,60,0.5)',
                border: `2px solid ${payout > 0 ? 'rgba(124,58,237,0.8)' : 'rgba(60,50,80,0.4)'}`,
                color: payout > 0 ? '#c4b5fd' : '#555',
                cursor: payout > 0 ? 'pointer' : 'not-allowed',
                fontSize: 11, fontWeight: 700,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 18 }}>↩</span>
              <span>部分</span>
              <span>提现</span>
            </button>
          </div>

          {/* Payout 显示 */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 11, color: '#888' }}>奖励金额</div>
              <div style={{
                fontSize: 18, fontWeight: 700,
                color: payout > 0 ? '#ffd700' : '#666',
              }}>
                ¥{payout.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#888' }}>倍率</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#a855f7' }}>
                {currentMultiplier > 0 ? `${currentMultiplier.toFixed(2)}x` : '-'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => setAutoMode(!autoMode)}
                style={{
                  background: autoMode ? 'rgba(124,58,237,0.5)' : 'rgba(60,50,80,0.5)',
                  border: '1px solid rgba(124,58,237,0.4)',
                  borderRadius: 6, padding: '4px 10px',
                  color: autoMode ? '#c4b5fd' : '#888',
                  cursor: 'pointer', fontSize: 12,
                }}
              >
                自动 {autoMode ? '开' : '关'}
              </button>
            </div>
          </div>
        </div>

        {/* 未登录提示 */}
        {!isLoggedIn && (
          <div style={{
            marginTop: 12, padding: '10px 16px',
            background: 'rgba(124,58,237,0.15)',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 10, textAlign: 'center',
            color: '#c4b5fd', fontSize: 13,
          }}>
            请先登录后再游戏
          </div>
        )}

        {/* 历史记录 */}
        {showHistory && (
          <div style={{
            width: '100%', marginTop: 12,
            background: 'rgba(20,15,40,0.9)',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 12, padding: 12,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#c4b5fd', marginBottom: 8 }}>历史记录</div>
            {historyQuery.isLoading ? (
              <div style={{ color: '#888', textAlign: 'center', padding: 16 }}>加载中...</div>
            ) : historyQuery.data?.length === 0 ? (
              <div style={{ color: '#888', textAlign: 'center', padding: 16 }}>暂无记录</div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {historyQuery.data?.map(r => (
                  <div key={r.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontSize: 12,
                  }}>
                    <span style={{ color: '#888' }}>
                      {new Date(r.createdAt).toLocaleTimeString()}
                    </span>
                    <span style={{ color: '#c4b5fd' }}>投注 ¥{r.betAmount}</span>
                    <span style={{ color: r.isWin ? '#4caf50' : '#f44336' }}>
                      {r.isWin ? `+¥${r.winAmount.toFixed(2)}` : `-¥${r.betAmount.toFixed(2)}`}
                    </span>
                    <span style={{ color: '#a855f7' }}>{r.multiplier.toFixed(2)}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* How to Play 弹窗 */}
      {showHowToPlay && (
        <div
          onClick={() => setShowHowToPlay(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1a1030',
              border: '1px solid rgba(124,58,237,0.5)',
              borderRadius: 16, padding: 24,
              maxWidth: 400, width: '100%',
              maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: '#c4b5fd', marginBottom: 16, textAlign: 'center' }}>
              如何游玩？
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                { icon: '🌀', title: '旋转轮盘', desc: '用火、土、水元素提升倍率' },
                { icon: '💰', title: '提现', desc: '点击提取赢得的金额，或用「部分提现」取部分继续游戏' },
                { icon: '🎉', title: '奖励提现', desc: '填满任意元素的最后一格后，自动触发 20.5x 奖励' },
                { icon: '⚠️', title: '投注限制', desc: '只有在游戏区域清空时才能修改投注金额' },
              ].map(item => (
                <div key={item.title} style={{
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: 10, padding: 12, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
              <strong style={{ color: '#c4b5fd' }}>元素说明：</strong>
            </div>
            {Object.entries(ELEMENT_CONFIG).map(([key, cfg]) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 8, padding: '6px 10px',
                background: cfg.bgColor, borderRadius: 8,
              }}>
                <img src={cfg.icon} alt={key} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                <div>
                  <span style={{ color: cfg.color, fontWeight: 700, fontSize: 13 }}>{cfg.label}</span>
                  <span style={{ color: '#888', fontSize: 11, marginLeft: 8 }}>
                    {key === 'fire' && '填充火焰轨道，累积倍率'}
                    {key === 'earth' && '填充大地轨道，累积倍率'}
                    {key === 'water' && '填充海浪轨道，累积倍率'}
                    {key === 'wind' && '中性，不填充轨道'}
                    {key === 'skull' && '所有轨道退后1格'}
                    {key === 'bonus' && '直接触发 20.5x 奖励'}
                  </span>
                </div>
              </div>
            ))}
            <button
              onClick={() => setShowHowToPlay(false)}
              style={{
                width: '100%', marginTop: 16, padding: '12px 0',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                border: 'none', borderRadius: 10,
                color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}
            >
              开始游戏！
            </button>
          </div>
        </div>
      )}

      {/* 全局动画样式 */}
      <style>{`
        @keyframes elementPop {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spinPulse {
          0% { box-shadow: 0 0 20px rgba(168,85,247,0.5); }
          100% { box-shadow: 0 0 40px rgba(168,85,247,0.9); }
        }
      `}</style>
    </div>
  );
}
