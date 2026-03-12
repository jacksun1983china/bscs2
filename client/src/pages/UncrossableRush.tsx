/**
 * UncrossableRush.tsx — 过马路游戏（竖屏）
 *
 * 玩法：
 * - 投注后，小鸡从底部出发，每点击"前进"过一条车道
 * - 每过一条车道，倍率递增（1.4x → 1.6x → 1.7x → 2.0x → 2.5x → 3.0x → 4.0x → 8.0x）
 * - 玩家可随时点击"收手"结算
 * - 若该车道判定死亡，小鸡被车撞死，输掉投注
 * - 服务端预生成每条车道的死亡结果（laneResults），前端按序展示
 *
 * 布局：phone-container + cqw 响应式单位（基准 750px）
 * 配色：赛博朋克深紫蓝霓虹风格
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import SettingsModal from '@/components/SettingsModal';
import { useGameAlert } from '@/components/GameAlert';
import { useLocation } from 'wouter';
import { useSound } from '@/hooks/useSound';

// ── px → cqw 转换（基准 750px）──────────────────────────────────
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// ── 赛博朋克配色常量 ─────────────────────────────────────────────
const CYBER = {
  bg: '#0d0621',
  bgCard: 'rgba(20,8,50,0.92)',
  border: 'rgba(120,60,220,0.45)',
  borderGlow: 'rgba(160,80,255,0.7)',
  accent: '#c084fc',
  accentCyan: '#22d3ee',
  win: '#00f5a0',
  winGlow: 'rgba(0,245,160,0.5)',
  lose: '#ff4d6d',
  loseGlow: 'rgba(255,77,109,0.5)',
  textPrimary: '#f0e6ff',
  textSecondary: '#9980cc',
  textMuted: '#5a4a7a',
  road: '#1a1030',
  roadLine: 'rgba(255,255,255,0.15)',
  car1: '#ff4d6d',
  car2: '#f59e0b',
  car3: '#22d3ee',
  car4: '#a855f7',
  safeZone: 'rgba(0,245,160,0.12)',
  dangerZone: 'rgba(255,77,109,0.12)',
};

// ── 每条车道对应的倍率 ────────────────────────────────────────────
const LANE_MULTIPLIERS = [1.4, 1.6, 1.7, 2.0, 2.5, 3.0, 4.0, 8.0];

// ── 投注档位 ─────────────────────────────────────────────────────
const BET_VALUES = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

// ── 车道颜色 ─────────────────────────────────────────────────────
const CAR_COLORS = [CYBER.car1, CYBER.car2, CYBER.car3, CYBER.car4, '#10b981', '#f97316'];

// ── 游戏状态 ─────────────────────────────────────────────────────
type GamePhase = 'idle' | 'playing' | 'dead' | 'cashed';

// ── 车辆动画数据 ─────────────────────────────────────────────────
interface CarAnim {
  id: number;
  laneIdx: number;
  color: string;
  posX: number; // 0~100 百分比
  speed: number; // px/frame
  direction: 1 | -1;
}

export default function UncrossableRush() {
  const [, navigate] = useLocation();
  const { showAlert } = useGameAlert();
  const { playClick, playWin, playLose, playSpinStop, isMuted, toggleMute } = useSound();

  // ── 游戏状态 ─────────────────────────────────────────────────
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [betAmount, setBetAmount] = useState(10);
  const [betIdx, setBetIdx] = useState(3);
  const [currentLane, setCurrentLane] = useState(0); // 当前在第几条车道（0=起点）
  const [laneResults, setLaneResults] = useState<boolean[]>([]); // true=存活
  const [currentMultiplier, setCurrentMultiplier] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null); // 服务端会话ID
  const [balance, setBalance] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{ win: boolean; amount: number; multiplier: number } | null>(null);

  // ── 车辆动画 ─────────────────────────────────────────────────
  const [cars, setCars] = useState<CarAnim[]>([]);
  const animFrameRef = useRef<number>(0);
  const carsRef = useRef<CarAnim[]>([]);

  // ── tRPC ─────────────────────────────────────────────────────
  const { data: playerData, refetch: refetchPlayer } = trpc.player.me.useQuery();
  const { data: settings } = trpc.rush.getSettings.useQuery();
  const startGameMut = trpc.rush.startGame.useMutation();
  const endGameMut = trpc.rush.endGame.useMutation();

  useEffect(() => {
    if (playerData?.gold) setBalance(parseFloat(playerData.gold));
  }, [playerData]);

  // ── 初始化车辆动画 ────────────────────────────────────────────
  const initCars = useCallback(() => {
    const newCars: CarAnim[] = [];
    for (let lane = 0; lane < 8; lane++) {
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const dir = Math.random() > 0.5 ? 1 : -1;
        newCars.push({
          id: lane * 10 + i,
          laneIdx: lane,
          color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
          posX: Math.random() * 100,
          speed: 0.3 + Math.random() * 0.4,
          direction: dir as 1 | -1,
        });
      }
    }
    carsRef.current = newCars;
    setCars([...newCars]);
  }, []);

  // ── 车辆动画循环 ─────────────────────────────────────────────
  const animateCars = useCallback(() => {
    carsRef.current = carsRef.current.map(car => {
      let newX = car.posX + car.speed * car.direction;
      if (newX > 110) newX = -10;
      if (newX < -10) newX = 110;
      return { ...car, posX: newX };
    });
    setCars([...carsRef.current]);
    animFrameRef.current = requestAnimationFrame(animateCars);
  }, []);

  useEffect(() => {
    initCars();
    animFrameRef.current = requestAnimationFrame(animateCars);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [initCars, animateCars]);

  // ── 开始游戏 ─────────────────────────────────────────────────
  const handleStart = async () => {
    if (!playerData) { showAlert('请先登录'); return; }
    if (balance !== null && balance < betAmount) { showAlert('金币不足'); return; }
    try {
      const result = await startGameMut.mutateAsync({ betAmount });
      setLaneResults(result.laneResults);
      setBalance(result.balanceAfter);
      setCurrentLane(0);
      setCurrentMultiplier(0);
      setSessionId(result.sessionId); // 存储服务端会话ID
      setPhase('playing');
      setLastResult(null);
    } catch (e: any) {
      showAlert(e.message || '开始游戏失败');
    }
  };

  // ── 前进一格 ─────────────────────────────────────────────────
  const handleAdvance = async () => {
    if (phase !== 'playing') return;
    const nextLane = currentLane; // 0-indexed，第一次点击进入第0条车道
    const survived = laneResults[nextLane];
    const newLane = currentLane + 1;
    const multiplier = LANE_MULTIPLIERS[nextLane] || 0;

    if (!survived) {
      // 死亡
      setCurrentLane(newLane);
      setCurrentMultiplier(0);
      setPhase('dead');
      playLose(); // 死亡音效
      try {
        if (sessionId) {
          const result = await endGameMut.mutateAsync({
            sessionId,
            lanesReached: newLane,
            isDead: true,
          });
          setBalance(result.balanceAfter);
        }
        setLastResult({ win: false, amount: -betAmount, multiplier: 0 });
      } catch {}
    } else {
      // 存活，过道音效
      playSpinStop();
      setCurrentLane(newLane);
      setCurrentMultiplier(multiplier);
      if (newLane >= 8) {
        // 过完所有车道，自动收手
        await handleCashOut(newLane, multiplier);
      }
    }
  };

  // ── 收手 ─────────────────────────────────────────────────────
  const handleCashOut = async (lanes?: number, mult?: number) => {
    if (phase !== 'playing') return;
    const lanesReached = lanes ?? currentLane;
    const finalMultiplier = mult ?? currentMultiplier;
    if (lanesReached === 0) {
      showAlert('还没过任何车道，无法收手');
      return;
    }
    setPhase('cashed');
    try {
      if (!sessionId) { showAlert('游戏会话丢失，请重新开始'); return; }
      const result = await endGameMut.mutateAsync({
        sessionId,
        lanesReached,
        isDead: false,
      });
      setBalance(result.balanceAfter);
      setLastResult({ win: true, amount: result.winAmount, multiplier: result.finalMultiplier });
      playWin(); // 收手中奖音效
      await refetchPlayer();
    } catch (e: any) {
      showAlert(e.message || '结算失败');
    }
  };

  // ── 重置游戏 ─────────────────────────────────────────────────
  const handleReset = () => {
    setPhase('idle');
    setCurrentLane(0);
    setCurrentMultiplier(0);
    setLaneResults([]);
    setLastResult(null);
    refetchPlayer();
  };

  // ── 投注金额控制 ─────────────────────────────────────────────
  const handleBetChange = (dir: 1 | -1) => {
    const newIdx = Math.max(0, Math.min(BET_VALUES.length - 1, betIdx + dir));
    setBetIdx(newIdx);
    setBetAmount(BET_VALUES[newIdx]);
  };

  // ── 渲染车道 ─────────────────────────────────────────────────
  const renderLanes = () => {
    const lanes = [];
    for (let i = 7; i >= 0; i--) {
      const isCurrentTarget = phase === 'playing' && currentLane === i;
      const isPassed = currentLane > i;
      const isDead = phase === 'dead' && currentLane - 1 === i;
      const multiplier = LANE_MULTIPLIERS[i];
      const laneCars = cars.filter(c => c.laneIdx === i);

      lanes.push(
        <div
          key={i}
          style={{
            position: 'relative',
            height: q(72),
            background: isDead
              ? CYBER.dangerZone
              : isPassed
              ? CYBER.safeZone
              : isCurrentTarget
              ? 'rgba(192,132,252,0.08)'
              : CYBER.road,
            borderBottom: `1px solid ${CYBER.roadLine}`,
            overflow: 'hidden',
            transition: 'background 0.3s',
          }}
        >
          {/* 车道虚线 */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 1,
            background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0, rgba(255,255,255,0.1) 20px, transparent 20px, transparent 40px)',
            transform: 'translateY(-50%)',
          }} />

          {/* 倍率标签 */}
          <div style={{
            position: 'absolute',
            right: q(12),
            top: '50%',
            transform: 'translateY(-50%)',
            color: isPassed ? CYBER.win : isCurrentTarget ? CYBER.accent : CYBER.textMuted,
            fontSize: q(22),
            fontWeight: 700,
            fontFamily: 'monospace',
            zIndex: 2,
            textShadow: isPassed ? `0 0 8px ${CYBER.winGlow}` : 'none',
          }}>
            {multiplier}x
          </div>

          {/* 车辆 */}
          {laneCars.map(car => (
            <div
              key={car.id}
              style={{
                position: 'absolute',
                top: '50%',
                left: `${car.posX}%`,
                transform: `translateY(-50%) scaleX(${car.direction})`,
                width: q(80),
                height: q(44),
                background: car.color,
                borderRadius: q(8),
                boxShadow: `0 0 10px ${car.color}88`,
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: q(24),
              }}
            >
              🚗
            </div>
          ))}

          {/* 通过标记 */}
          {isPassed && !isDead && (
            <div style={{
              position: 'absolute',
              left: q(12),
              top: '50%',
              transform: 'translateY(-50%)',
              color: CYBER.win,
              fontSize: q(28),
              zIndex: 3,
            }}>✓</div>
          )}

          {/* 死亡标记 */}
          {isDead && (
            <div style={{
              position: 'absolute',
              left: q(12),
              top: '50%',
              transform: 'translateY(-50%)',
              color: CYBER.lose,
              fontSize: q(28),
              zIndex: 3,
            }}>💥</div>
          )}
        </div>
      );
    }
    return lanes;
  };

  return (
    <div
      className="phone-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        containerType: 'inline-size',
        position: 'relative',
        background: CYBER.bg,
        minHeight: '100vh',
      }}
    >
      {/* 全局背景光晕 */}
      <div style={{
        position: 'fixed',
        top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', height: '100%',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(120,40,220,0.18) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ── 顶部导航 ── */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
        <TopNav showLogo={false} onBackClick={() => navigate('/')}  onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
      </div>

      {/* ── 静音按钮（右上角悬浮）── */}
      <button
        onClick={toggleMute}
        style={{
          position: 'absolute',
          top: q(60),
          right: q(20),
          zIndex: 10,
          width: q(60),
          height: q(60),
          borderRadius: '50%',
          background: 'rgba(20,8,50,0.85)',
          border: '1px solid rgba(120,60,220,0.5)',
          color: '#fff',
          fontSize: q(28),
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {/* ── 内容区 ── */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1, paddingBottom: q(120) }}>

        {/* 标题 */}
        <div style={{
          textAlign: 'center',
          padding: `${q(16)} 0 ${q(8)}`,
          color: CYBER.textPrimary,
          fontSize: q(32),
          fontWeight: 900,
          letterSpacing: 2,
          textShadow: `0 0 20px ${CYBER.borderGlow}`,
        }}>
          🐔 过马路
        </div>

        {/* 余额显示 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: q(8),
          marginBottom: q(12),
        }}>
          <span style={{ color: CYBER.textSecondary, fontSize: q(22) }}>余额：</span>
          <span style={{ color: '#ffd700', fontSize: q(28), fontWeight: 700 }}>
            {balance !== null ? balance.toFixed(2) : '--'}
          </span>
        </div>

        {/* 当前倍率显示 */}
        {phase === 'playing' && currentLane > 0 && (
          <div style={{
            textAlign: 'center',
            marginBottom: q(8),
            color: CYBER.win,
            fontSize: q(36),
            fontWeight: 900,
            textShadow: `0 0 16px ${CYBER.winGlow}`,
            animation: 'pulse 1s infinite',
          }}>
            当前：{currentMultiplier}x
          </div>
        )}

        {/* 结果弹窗 */}
        {(phase === 'dead' || phase === 'cashed') && lastResult && (
          <div style={{
            margin: `0 ${q(24)} ${q(16)}`,
            padding: q(20),
            background: lastResult.win
              ? 'linear-gradient(135deg, rgba(0,80,40,0.9), rgba(0,40,20,0.95))'
              : 'linear-gradient(135deg, rgba(80,0,20,0.9), rgba(40,0,10,0.95))',
            border: `1.5px solid ${lastResult.win ? CYBER.win : CYBER.lose}`,
            borderRadius: q(16),
            textAlign: 'center',
            boxShadow: `0 0 20px ${lastResult.win ? CYBER.winGlow : CYBER.loseGlow}`,
          }}>
            <div style={{ fontSize: q(40), marginBottom: q(8) }}>
              {lastResult.win ? '🎉' : '💀'}
            </div>
            <div style={{
              color: lastResult.win ? CYBER.win : CYBER.lose,
              fontSize: q(32),
              fontWeight: 900,
              marginBottom: q(4),
            }}>
              {lastResult.win ? `赢得 ${lastResult.amount.toFixed(2)} 金币` : `输掉 ${betAmount} 金币`}
            </div>
            {lastResult.win && (
              <div style={{ color: CYBER.textSecondary, fontSize: q(22) }}>
                倍率：{lastResult.multiplier}x
              </div>
            )}
          </div>
        )}

        {/* 小鸡位置指示 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: q(8),
          marginBottom: q(8),
          fontSize: q(22),
          color: CYBER.textSecondary,
        }}>
          {phase === 'playing' && (
            <>
              <span>第 {currentLane} 条车道</span>
              <span style={{ color: CYBER.accent }}>→</span>
              <span>目标：{LANE_MULTIPLIERS[currentLane] || '终点'}x</span>
            </>
          )}
          {phase === 'idle' && <span>准备出发！</span>}
        </div>

        {/* 道路区域 */}
        <div style={{
          margin: `0 ${q(16)}`,
          borderRadius: q(12),
          overflow: 'hidden',
          border: `1.5px solid ${CYBER.border}`,
          boxShadow: `0 0 20px rgba(80,20,160,0.3)`,
        }}>
          {/* 终点线 */}
          <div style={{
            height: q(36),
            background: 'repeating-linear-gradient(90deg, #ffd700 0, #ffd700 20px, #1a1030 20px, #1a1030 40px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ color: '#1a1030', fontSize: q(20), fontWeight: 900, background: '#ffd700', padding: `0 ${q(12)}` }}>
              🏁 终点 8.0x
            </span>
          </div>

          {/* 8条车道（从上到下：第8条→第1条，视觉上小鸡从底部向上走） */}
          {renderLanes()}

          {/* 起点 */}
          <div style={{
            height: q(56),
            background: 'rgba(192,132,252,0.1)',
            borderTop: `1px solid ${CYBER.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: q(12),
          }}>
            <span style={{ fontSize: q(36) }}>
              {phase === 'dead' ? '💀' : phase === 'cashed' ? '🎉' : '🐔'}
            </span>
            <span style={{ color: CYBER.textSecondary, fontSize: q(22) }}>
              {phase === 'idle' ? '起点' : phase === 'playing' ? `已过 ${currentLane} 条` : '结束'}
            </span>
          </div>
        </div>

        {/* 投注区域 */}
        <div style={{
          margin: `${q(16)} ${q(16)} 0`,
          padding: q(16),
          background: CYBER.bgCard,
          border: `1px solid ${CYBER.border}`,
          borderRadius: q(12),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: q(12) }}>
            <span style={{ color: CYBER.textSecondary, fontSize: q(24) }}>投注金额</span>
            <span style={{ color: '#ffd700', fontSize: q(28), fontWeight: 700 }}>{betAmount}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: q(12) }}>
            <button
              onClick={() => handleBetChange(-1)}
              disabled={phase === 'playing' || betIdx === 0}
              style={{
                width: q(64), height: q(64),
                background: 'rgba(120,60,220,0.3)',
                border: `1px solid ${CYBER.border}`,
                borderRadius: q(8),
                color: CYBER.textPrimary,
                fontSize: q(32),
                cursor: 'pointer',
                opacity: (phase === 'playing' || betIdx === 0) ? 0.4 : 1,
              }}
            >−</button>

            <div style={{ flex: 1, height: q(8), background: 'rgba(80,40,160,0.5)', borderRadius: q(4), position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${(betIdx / (BET_VALUES.length - 1)) * 100}%`,
                background: 'linear-gradient(90deg, #7c3aed, #c084fc)',
                borderRadius: q(4),
                transition: 'width 0.2s',
              }} />
            </div>

            <button
              onClick={() => handleBetChange(1)}
              disabled={phase === 'playing' || betIdx === BET_VALUES.length - 1}
              style={{
                width: q(64), height: q(64),
                background: 'rgba(120,60,220,0.3)',
                border: `1px solid ${CYBER.border}`,
                borderRadius: q(8),
                color: CYBER.textPrimary,
                fontSize: q(32),
                cursor: 'pointer',
                opacity: (phase === 'playing' || betIdx === BET_VALUES.length - 1) ? 0.4 : 1,
              }}
            >+</button>
          </div>
        </div>

        {/* 操作按钮区 */}
        <div style={{ margin: `${q(16)} ${q(16)} 0`, display: 'flex', gap: q(12) }}>
          {phase === 'idle' && (
            <button
              onClick={handleStart}
              disabled={startGameMut.isPending}
              style={{
                flex: 1,
                height: q(88),
                background: 'linear-gradient(180deg, #9333ea 0%, #7c3aed 50%, #5b21b6 100%)',
                border: 'none',
                borderRadius: q(12),
                color: '#fff',
                fontSize: q(32),
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(124,58,237,0.6)',
                letterSpacing: 2,
                opacity: startGameMut.isPending ? 0.7 : 1,
              }}
            >
              {startGameMut.isPending ? '出发中...' : '🚀 出发'}
            </button>
          )}

          {phase === 'playing' && (
            <>
              <button
                onClick={handleAdvance}
                style={{
                  flex: 2,
                  height: q(88),
                  background: 'linear-gradient(180deg, #059669 0%, #047857 50%, #065f46 100%)',
                  border: 'none',
                  borderRadius: q(12),
                  color: '#fff',
                  fontSize: q(30),
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: `0 4px 20px ${CYBER.winGlow}`,
                  letterSpacing: 1,
                }}
              >
                🐔 前进
              </button>
              <button
                onClick={() => handleCashOut()}
                disabled={currentLane === 0 || endGameMut.isPending}
                style={{
                  flex: 1,
                  height: q(88),
                  background: currentLane > 0
                    ? 'linear-gradient(180deg, #d97706 0%, #b45309 50%, #92400e 100%)'
                    : 'rgba(80,40,160,0.3)',
                  border: `1px solid ${currentLane > 0 ? '#f59e0b' : CYBER.border}`,
                  borderRadius: q(12),
                  color: currentLane > 0 ? '#fff' : CYBER.textMuted,
                  fontSize: q(24),
                  fontWeight: 700,
                  cursor: currentLane > 0 ? 'pointer' : 'not-allowed',
                  letterSpacing: 1,
                }}
              >
                💰 收手<br />
                <span style={{ fontSize: q(18) }}>
                  {currentLane > 0 ? `${(betAmount * currentMultiplier).toFixed(1)}` : '--'}
                </span>
              </button>
            </>
          )}

          {(phase === 'dead' || phase === 'cashed') && (
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                height: q(88),
                background: 'linear-gradient(180deg, #9333ea 0%, #7c3aed 50%, #5b21b6 100%)',
                border: 'none',
                borderRadius: q(12),
                color: '#fff',
                fontSize: q(32),
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(124,58,237,0.6)',
                letterSpacing: 2,
              }}
            >
              🔄 再来一局
            </button>
          )}
        </div>

        {/* 游戏说明 */}
        <div style={{
          margin: `${q(16)} ${q(16)} 0`,
          padding: q(12),
          background: 'rgba(20,8,50,0.6)',
          border: `1px solid rgba(120,60,220,0.2)`,
          borderRadius: q(8),
          color: CYBER.textMuted,
          fontSize: q(20),
          lineHeight: 1.6,
        }}>
          <div style={{ color: CYBER.textSecondary, marginBottom: q(4), fontWeight: 600 }}>玩法说明</div>
          点击【前进】让小鸡过一条车道，每过一条倍率递增。随时点击【收手】结算当前倍率。若被车撞死则输掉投注。
        </div>

      </div>

      {/* ── 底部导航 ── */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
        <BottomNav active="dating" />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* 设置弹窗 */}
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </div>
  );
}
