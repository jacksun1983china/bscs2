/**
 * DingDong.tsx — Fruit Bomb 水果机（重构版）
 *
 * 玩法：
 * - 外圈 20 个格子固定展示水果（蓝色底座+水果图标）
 * - 黄色方块光标顺时针旋转，有拖尾透明度渐变效果
 * - 经过的格子水果有放大动画
 * - 支持组合投注（每种水果单独设置金额，可全押）
 * - 赢了之后进入押大小环节（骰子1-3=小，4-6=大，赢翻倍输清零）
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import SettingsModal from '@/components/SettingsModal';
import { useGameAlert } from '@/components/GameAlert';
import { useLocation } from 'wouter';
import { useSound } from '@/hooks/useSound';

// ── px → cqw 转换（基准 750px）──────────────────────────────────
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// ── CDN 素材 URL ─────────────────────────────────────────────────
const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';

// ── 7 种水果定义（与服务端索引对应）────────────────────────────
const FRUITS = [
  { id: 0, name: '铃铛',   img: `${CDN}/bell_e5597e98.png`,          multiplier: 2.5,  color: '#f59e0b', weight: 40 },
  { id: 1, name: '西瓜',   img: `${CDN}/watermelon_eb129441.png`,    multiplier: 5,    color: '#22c55e', weight: 20 },
  { id: 2, name: '葡萄',   img: `${CDN}/grape_4bcc9bc9.png`,         multiplier: 5,    color: '#a855f7', weight: 20 },
  { id: 3, name: '苹果',   img: `${CDN}/apple_523cd9c7.png`,         multiplier: 10,   color: '#84cc16', weight: 10 },
  { id: 4, name: '粉钻石', img: `${CDN}/pink_diamond_2f9484f3.png`,  multiplier: 10,   color: '#ec4899', weight: 10 },
  { id: 5, name: '草莓',   img: `${CDN}/strawberry_62f90b5c.png`,    multiplier: 20,   color: '#f43f5e', weight: 5  },
  { id: 6, name: 'LUCKY',  img: `${CDN}/lucky_a3ec1ad3.png`,         multiplier: 20,   color: '#fbbf24', weight: 5  },
];

// 蓝色底座和黄色光标图标
const BLUE_BASE = `${CDN}/blue_9419a480.png`;
const YELLOW_CURSOR = `${CDN}/yellow_e723d352.png`;

// 外圈 20 格顺时针排列（上6 右4 下6 左4）
const OUTER_RING: { row: number; col: number }[] = [];
for (let c = 0; c < 6; c++) OUTER_RING.push({ row: 0, col: c });       // 上行 左→右
for (let r = 1; r <= 4; r++) OUTER_RING.push({ row: r, col: 5 });      // 右列 上→下
for (let c = 5; c >= 0; c--) OUTER_RING.push({ row: 5, col: c });      // 下行 右→左
for (let r = 4; r >= 1; r--) OUTER_RING.push({ row: r, col: 0 });      // 左列 下→上

// 外圈固定水果序列（20格，循环7种水果）
const OUTER_FRUITS = OUTER_RING.map((_, i) => FRUITS[i % 7]);

// 内圈 4×4 水果随机生成函数
function generateInnerFruits(): number[] {
  const base = [0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1];
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base;
}

// 快捷下注金额
const BET_PRESETS = [1, 5, 10, 50];

// 拖尾长度（格数）
const TAIL_LENGTH = 5;

// 骰子点数对应的 emoji
const DICE_EMOJI = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function DingDong() {
  const [, navigate] = useLocation();
  const { showAlert } = useGameAlert();
  const { playWin, playLose, playRing, isMuted, toggleMute } = useSound();

  // ── 状态 ──────────────────────────────────────────────────────
  const [innerFruits] = useState<number[]>(() => generateInnerFruits());
  const [settingsVisible, setSettingsVisible] = useState(false);

  // 组合投注：每种水果的下注金额（0 = 未下注）
  const [betMap, setBetMap] = useState<Record<number, number>>({});
  // 当前选中的快捷金额（用于快速设置）
  const [quickBet, setQuickBet] = useState(10);

  const [isSpinning, setIsSpinning] = useState(false);
  // 用 ref 存储 isSpinning，以便在 RAF 回调中访问（闭包不捕获 state）
  const isSpinningRef = useRef(false);

  // 光标位置（浮点数，表示在外圈的位置）
  const cursorPosRef = useRef<number>(0);
  const [cursorPos, setCursorPos] = useState<number>(0);
  const rafRef = useRef<number>(0);
  const prevTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(0); // 格/ms（当前速度）
  const targetPosRef = useRef<number | null>(null); // 目标停止位置

  // 三段式动画状态机
  const spinPhaseRef = useRef<'idle' | 'accelerating' | 'spinning' | 'decelerating'>('idle');
  // 动画参数（可调）
  const SPEED_MAX = 0.10;    // 匀速峰值（格/ms）≈ 每秒 2 格
  const SPEED_ACCEL = 0.00020; // 加速度（格/ms²）约 0.5s 达到峰值
  const SPEED_DECEL = 0.00010; // 减速度（格/ms²）约 1s 减到 0
  const DECEL_DIST = 6;      // 距目标还有多少格时切换减速阶段

  // 开奖结果
  const [lastResult, setLastResult] = useState<{
    isWin: boolean; winFruit: number; multiplier: number;
    winAmount: number; netAmount: number; bets: Record<number, number>;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);

  // 押大小环节
  const [showDicePhase, setShowDicePhase] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [diceChoice, setDiceChoice] = useState<'big' | 'small' | null>(null);
  const [diceResult, setDiceResult] = useState<{ win: boolean; value: number; amount: number } | null>(null);
  const [pendingWinAmount, setPendingWinAmount] = useState(0);

  // ── 光标动画（三段式状态机） ─────────────────────────────────
  useEffect(() => {
    const loop = (t: number) => {
      if (prevTimeRef.current) {
        const dt = Math.min(t - prevTimeRef.current, 50); // 防止切标后大跳跃
        const phase = spinPhaseRef.current;
        const target = targetPosRef.current;

        if (phase === 'idle') {
          // 待机：静止不动
        } else if (phase === 'accelerating') {
          // 加速阶段：速度逐渐增大到 SPEED_MAX
          speedRef.current = Math.min(speedRef.current + SPEED_ACCEL * dt, SPEED_MAX);
          cursorPosRef.current = (cursorPosRef.current + speedRef.current * dt) % OUTER_RING.length;
          setCursorPos(cursorPosRef.current);
          if (speedRef.current >= SPEED_MAX) {
            spinPhaseRef.current = 'spinning';
          }
        } else if (phase === 'spinning') {
          // 匀速阶段：如果有目标且距离小于 DECEL_DIST，切换减速
          if (target !== null) {
            const dist = (target - cursorPosRef.current + OUTER_RING.length) % OUTER_RING.length;
            if (dist <= DECEL_DIST) {
              spinPhaseRef.current = 'decelerating';
            }
          }
          cursorPosRef.current = (cursorPosRef.current + speedRef.current * dt) % OUTER_RING.length;
          setCursorPos(cursorPosRef.current);
        } else if (phase === 'decelerating') {
          // 减速收尾阶段
          if (target !== null) {
            const dist = (target - cursorPosRef.current + OUTER_RING.length) % OUTER_RING.length;
            if (dist < 0.08 || speedRef.current <= 0.002) {
              // 到达目标，停止
              cursorPosRef.current = target;
              setCursorPos(target);
              targetPosRef.current = null;
              speedRef.current = 0;
              spinPhaseRef.current = 'idle';
            } else {
              // 平滑减速：速度按减速度减小，但不能超过剩余距离
              speedRef.current = Math.max(speedRef.current - SPEED_DECEL * dt, 0.002);
              const step = Math.min(speedRef.current * dt, dist);
              cursorPosRef.current = (cursorPosRef.current + step) % OUTER_RING.length;
              setCursorPos(cursorPosRef.current);
            }
          } else {
            // 没有目标时也减速（错误保护）
            speedRef.current = Math.max(speedRef.current - SPEED_DECEL * dt, 0);
            cursorPosRef.current = (cursorPosRef.current + speedRef.current * dt) % OUTER_RING.length;
            setCursorPos(cursorPosRef.current);
            if (speedRef.current <= 0) spinPhaseRef.current = 'idle';
          }
        }
      }
      prevTimeRef.current = t;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [SPEED_MAX, SPEED_ACCEL, SPEED_DECEL, DECEL_DIST]);

  // ── tRPC ──────────────────────────────────────────────────────
  const { data: playerData, refetch: refetchPlayer } = trpc.player.me.useQuery();
  const { data: settings } = trpc.dingdong.getSettings.useQuery();
  const { data: history, refetch: refetchHistory } = trpc.dingdong.getHistory.useQuery({ limit: 20 });

  const playMut = trpc.dingdong.play.useMutation({
    onSuccess: async (result) => {
      // 启动加速阶段
      speedRef.current = 0;
      spinPhaseRef.current = 'accelerating';
      playRing();

      // 计算目标停止位置（开奖水果在外圈的某个格子）
      const winFruitId = result.winFruit as number;
      const winCells = OUTER_FRUITS
        .map((f, i) => ({ i, f }))
        .filter(({ f }) => f.id === winFruitId);
      const targetCell = winCells.length > 0
        ? winCells[Math.floor(Math.random() * winCells.length)].i
        : 0;

      // 等待加速完成（约 0.5s）再开始计时
      await new Promise<void>(res => setTimeout(res, 600));

      // 匀速旋转至少 2.5 秒，确保转足够圈数
      await new Promise<void>(res => setTimeout(res, 2500));

      // 设置目标位置，开始减速收尾
      targetPosRef.current = targetCell;

      // 等待光标停止（spinPhase 回到 idle）
      await new Promise<void>(res => {
        const check = setInterval(() => {
          if (spinPhaseRef.current === 'idle') {
            clearInterval(check);
            res();
          }
        }, 50);
      });

      setIsSpinning(false);
      isSpinningRef.current = false;

      // ★ 光标停止后停留 1.5 秒，让玩家看清楚停在哪里
      await new Promise<void>(res => setTimeout(res, 1500));

      const bets = result.bets as Record<number, number>;
      setLastResult({
        isWin: result.isWin,
        winFruit: result.winFruit,
        multiplier: result.multiplier,
        winAmount: result.winAmount,
        netAmount: result.netAmount,
        bets,
      });

      if (result.isWin) {
        playWin();
        setPendingWinAmount(result.winAmount);
        // 中奖：先显示光圈动画（showResult），2.5 秒后再弹出押大小
        setShowResult(true);
        setTimeout(() => {
          setShowResult(false);
          setShowDicePhase(true);
        }, 2500);
      } else {
        // 未中奖：播放失败音效，停留后直接结束
        playLose();
      }

      await refetchPlayer();
      await refetchHistory();
    },
    onError: (err) => {
      setIsSpinning(false);
      isSpinningRef.current = false;
      speedRef.current = 0;
      spinPhaseRef.current = 'idle';
      targetPosRef.current = null;
      showAlert(err.message || '下注失败');
    },
  });

  const dicePlayMut = trpc.dingdong.playDice.useMutation({
    onSuccess: async (result) => {
      // 骰子滚动动画
      let count = 0;
      const rollInterval = setInterval(() => {
        setDiceValue(Math.floor(Math.random() * 6) + 1);
        count++;
        if (count >= 15) {
          clearInterval(rollInterval);
          setDiceValue(result.diceValue);
          setDiceRolling(false);
          setDiceResult({
            win: result.win,
            value: result.diceValue,
            amount: result.finalAmount,
          });
          if (result.win) {
            playWin();
          } else {
            playLose();
          }
        }
      }, 100);

      await refetchPlayer();
    },
    onError: (err) => {
      setDiceRolling(false);
      showAlert(err.message || '押大小失败');
    },
  });

  const handleBet = useCallback(() => {
    const totalBet = Object.values(betMap).reduce((s, v) => s + v, 0);
    if (totalBet <= 0) { showAlert('请先设置下注金额'); return; }
    if (!playerData) { navigate('/login'); return; }
    const gold = parseFloat(String(playerData.gold));
    if (gold < totalBet) { showAlert('金币不足'); return; }
    if (isSpinning) return;
    setIsSpinning(true);
    isSpinningRef.current = true;
    setShowResult(false);
    setShowDicePhase(false);
    setDiceResult(null);
    setDiceChoice(null);
    setDiceValue(null);
    playMut.mutate({ betMap });
  }, [betMap, playerData, isSpinning, playMut, navigate, showAlert]);

  const handleDiceChoice = useCallback((choice: 'big' | 'small') => {
    if (diceRolling || diceResult) return;
    setDiceChoice(choice);
    setDiceRolling(true);
    dicePlayMut.mutate({ choice, winAmount: pendingWinAmount });
  }, [diceRolling, diceResult, pendingWinAmount, dicePlayMut]);

  const handleDiceSkip = useCallback(() => {
    setShowDicePhase(false);
    setDiceResult(null);
    setDiceChoice(null);
    setDiceValue(null);
    showAlert(`获得 ${pendingWinAmount.toFixed(2)} 金币！`);
  }, [pendingWinAmount, showAlert]);

  const handleDiceClose = useCallback(() => {
    setShowDicePhase(false);
    setDiceResult(null);
    setDiceChoice(null);
    setDiceValue(null);
  }, []);

  // 设置某种水果的下注金额
  const setBetForFruit = useCallback((fruitId: number, amount: number) => {
    setBetMap(prev => {
      if (amount <= 0) {
        const next = { ...prev };
        delete next[fruitId];
        return next;
      }
      return { ...prev, [fruitId]: amount };
    });
  }, []);

  // 全押（每种水果都下注 quickBet）
  const handleBetAll = useCallback(() => {
    const newMap: Record<number, number> = {};
    FRUITS.forEach(f => { newMap[f.id] = quickBet; });
    setBetMap(newMap);
  }, [quickBet]);

  // 清空投注
  const handleClearBets = useCallback(() => {
    setBetMap({});
  }, []);

  const gold = playerData ? parseFloat(String(playerData.gold)) : 0;
  const minBet = settings?.minBet ?? 1;
  const maxBet = settings?.maxBet ?? 10000;
  const totalBet = Object.values(betMap).reduce((s, v) => s + v, 0);

  // ── 光标位置计算 ──────────────────────────────────────────────
  const cursorIndex = Math.round(cursorPos) % OUTER_RING.length;

  // 格子尺寸（缩小以适配左侧栏）
  const CELL_PX = 72;
  const GAP_PX = 3;
  const COLS = 6;
  const ROWS = 6;

  return (
    <div
      className="phone-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        containerType: 'inline-size',
        position: 'relative',
        background: '#0d0621',
        minHeight: '100vh',
      }}
    >
      {/* 全局背景光晕 */}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', height: '100%',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(120,40,220,0.18) 0%, transparent 60%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* 顶部导航 */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
        <TopNav showLogo={false} onBackClick={() => navigate('/')}  onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
      </div>

      {/* 静音按钮 */}
      <button
        onClick={toggleMute}
        style={{
          position: 'absolute', top: q(60), right: q(20), zIndex: 10,
          width: q(60), height: q(60), borderRadius: '50%',
          background: 'rgba(20,8,50,0.85)', border: '1px solid rgba(120,60,220,0.5)',
          color: '#fff', fontSize: q(28), cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {/* 内容区 */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1, paddingBottom: q(120) }}>

        {/* 标题 + 余额（紧凑单行） */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `${q(8)} ${q(16)} ${q(4)}`,
        }}>
          <div style={{ color: '#f0e6ff', fontSize: q(28), fontWeight: 900, letterSpacing: 2, textShadow: '0 0 20px rgba(160,80,255,0.7)' }}>
            🍉 水果机
          </div>
          <div style={{ color: '#ffd700', fontSize: q(24), fontWeight: 700 }}>
            💰 {gold.toFixed(2)}
          </div>
        </div>

        {/* ── 主游戏区 ── */}
        <div style={{
          margin: `0 ${q(12)}`,
          background: 'rgba(20,8,50,0.92)',
          border: '1.5px solid rgba(120,60,220,0.45)',
          borderRadius: q(16),
          padding: q(10),
          boxShadow: '0 0 30px rgba(80,20,160,0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* 背景装饰 */}
          <img
            src={`${CDN}/game_bg_971837a8.png`}
            alt=""
            style={{
              position: 'absolute', bottom: 0, right: 0,
              height: '60%', opacity: 0.25, pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          {/* ── 左右两栏布局：左侧转盘 + 右侧控制区 ── */}
          <div style={{ display: 'flex', gap: q(10), position: 'relative', zIndex: 1, alignItems: 'flex-start' }}>

            {/* ── 左侧：转盘区 ── */}
            <div style={{ flexShrink: 0, position: 'relative' }}>
              {/* 格子容器 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${COLS}, ${q(CELL_PX)})`,
                gridTemplateRows: `repeat(${ROWS}, ${q(CELL_PX)})`,
                gap: q(GAP_PX),
                position: 'relative',
              }}>
                {/* 外圈格子（固定水果 + 蓝色底座 + 黄色光标拖尾） */}
                {OUTER_RING.map((pos, i) => {
                  const fruit = OUTER_FRUITS[i];

                  // 计算拖尾效果
                  const dist = (cursorPos - i + OUTER_RING.length) % OUTER_RING.length;
                  const isCursor = dist < 0.5; // 当前光标格
                  const tailOpacity = dist < TAIL_LENGTH && dist >= 0.5
                    ? (1 - dist / TAIL_LENGTH) * 0.85
                    : 0;
                  const isActive = isCursor || tailOpacity > 0;

                  // 水果放大效果（光标经过时）
                  const fruitScale = isCursor ? 1.25 : (tailOpacity > 0.5 ? 1.1 : 1.0);

                  // 开奖高亮
                  const isWinCell = showResult && lastResult && fruit.id === lastResult.winFruit;

                  return (
                    <div
                      key={`outer-${i}`}
                      style={{
                        gridRow: pos.row + 1,
                        gridColumn: pos.col + 1,
                        width: q(CELL_PX), height: q(CELL_PX),
                        position: 'relative',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'visible',
                      }}
                    >
                      {/* 蓝色底座 */}
                      <img
                        src={BLUE_BASE}
                        alt=""
                        style={{
                          position: 'absolute', inset: 0,
                          width: '100%', height: '100%',
                          objectFit: 'contain',
                          filter: isWinCell ? 'brightness(1.4) saturate(1.5)' : 'none',
                          transition: 'filter 0.2s',
                        }}
                      />

                      {/* 黄色光标（当前格） */}
                      {isCursor && (
                        <img
                          src={YELLOW_CURSOR}
                          alt=""
                          style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'contain',
                            opacity: 1,
                            zIndex: 2,
                          }}
                        />
                      )}

                      {/* 拖尾光标（黄色图片透明度渐变） */}
                      {tailOpacity > 0 && (
                        <img
                          src={YELLOW_CURSOR}
                          alt=""
                          style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'contain',
                            opacity: tailOpacity,
                            zIndex: 2,
                          }}
                        />
                      )}

                      {/* 水果图标 */}
                      <img
                        src={fruit.img}
                        alt={fruit.name}
                        style={{
                          position: 'relative', zIndex: 3,
                          width: q(CELL_PX * 0.62),
                          height: q(CELL_PX * 0.62),
                          objectFit: 'contain',
                          transform: `scale(${fruitScale})`,
                          transition: 'transform 0.12s ease-out',
                          filter: isWinCell ? 'drop-shadow(0 0 6px #ffd700)' : 'none',
                        }}
                      />

                      {/* 开奖光晕 */}
                      {isWinCell && (
                        <div style={{
                          position: 'absolute', inset: 0, zIndex: 4,
                          borderRadius: q(8),
                          boxShadow: '0 0 16px 4px #ffd70088',
                          border: '2px solid #ffd700',
                          pointerEvents: 'none',
                          animation: 'winGlow 0.5s ease infinite alternate',
                        }} />
                      )}
                    </div>
                  );
                })}

                {/* 内圈 4×4 格子（row 1-4, col 1-4） */}
                {innerFruits.map((fruitId, idx) => {
                  const r = Math.floor(idx / 4) + 1;
                  const c = (idx % 4) + 1;
                  const fruit = FRUITS[fruitId];
                  return (
                    <div
                      key={`inner-${idx}`}
                      style={{
                        gridRow: r + 1,
                        gridColumn: c + 1,
                        width: q(CELL_PX), height: q(CELL_PX),
                        background: 'linear-gradient(135deg, rgba(20,8,50,0.95), rgba(10,4,30,0.95))',
                        border: '1px solid rgba(80,40,160,0.4)',
                        borderRadius: q(8),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={fruit.img}
                        alt={fruit.name}
                        style={{ width: q(CELL_PX * 0.62), height: q(CELL_PX * 0.62), objectFit: 'contain', opacity: 0.6 }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* 中奖庆祝动画浮层（仅中奖时显示） */}
              {showResult && lastResult && lastResult.isWin && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.72)',
                  borderRadius: q(12),
                  animation: 'fadeInResult 0.3s ease',
                }}>
                  {/* 外圈光圈动画 */}
                  <div style={{
                    position: 'absolute', inset: q(20),
                    borderRadius: '50%',
                    border: '3px solid #ffd700',
                    boxShadow: '0 0 40px 10px #ffd70066, inset 0 0 40px 10px #ffd70033',
                    animation: 'winRing 0.8s ease infinite alternate',
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(22,163,74,0.97), rgba(15,118,50,0.97))',
                    borderRadius: q(16), padding: `${q(20)} ${q(28)}`, textAlign: 'center',
                    border: '2px solid #22c55e',
                    boxShadow: '0 0 60px #22c55e66',
                    position: 'relative', zIndex: 1,
                  }}>
                    <div style={{ fontSize: q(56), marginBottom: q(6), animation: 'bounceWin 0.5s ease infinite alternate' }}>
                      🎉
                    </div>
                    <div style={{ color: '#fff', fontSize: q(28), fontWeight: 900, marginBottom: q(6) }}>
                      恭喜中奖！
                    </div>
                    <div style={{ color: '#ffd700', fontSize: q(36), fontWeight: 900, marginBottom: q(4) }}>
                      +{lastResult.winAmount.toFixed(2)} 💰
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: q(20), marginTop: q(4) }}>
                      {FRUITS[lastResult.winFruit]?.name} × {lastResult.multiplier} 倍
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: q(18), marginTop: q(6) }}>
                      即将进入押大小环节...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── 右侧：控制区（快捷金额 + 全押/清空 + 开始按钮） ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: q(8), minWidth: 0 }}>

              {/* 快捷金额选择（2×2） */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: q(4) }}>
                {BET_PRESETS.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setQuickBet(amt)}
                    disabled={isSpinning}
                    style={{
                      background: quickBet === amt ? 'rgba(120,60,220,0.6)' : 'rgba(255,255,255,0.07)',
                      border: `1px solid ${quickBet === amt ? 'rgba(180,100,255,0.8)' : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: q(6), color: '#fff', fontSize: q(20), padding: `${q(6)} 0`, cursor: 'pointer',
                    }}
                  >{amt}</button>
                ))}
              </div>

              {/* 全押 / 清空 按钮 */}
              <div style={{ display: 'flex', gap: q(4) }}>
                <button
                  onClick={handleBetAll}
                  disabled={isSpinning}
                  style={{
                    flex: 1, background: 'rgba(120,60,220,0.4)',
                    border: '1px solid rgba(180,100,255,0.5)', borderRadius: q(6),
                    color: '#fff', fontSize: q(18), padding: `${q(6)} 0`, cursor: 'pointer',
                  }}
                >全押</button>
                <button
                  onClick={handleClearBets}
                  disabled={isSpinning}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: q(6),
                    color: '#fff', fontSize: q(18), padding: `${q(6)} 0`, cursor: 'pointer',
                  }}
                >清空</button>
              </div>

              {/* 总投注显示 */}
              {totalBet > 0 && (
                <div style={{
                  background: 'rgba(0,0,0,0.4)', borderRadius: q(6), padding: `${q(4)} ${q(6)}`,
                  color: 'rgba(255,255,255,0.7)', fontSize: q(18), textAlign: 'center',
                  border: '1px solid rgba(255,215,0,0.2)',
                }}>
                  总计：<span style={{ color: '#ffd700', fontWeight: 700 }}>{totalBet}</span>
                </div>
              )}

              {/* ── 开始按钮（右侧栏核心，始终可见） ── */}
              <button
                onClick={handleBet}
                disabled={isSpinning || totalBet <= 0}
                style={{
                  marginTop: 'auto',
                  background: isSpinning || totalBet <= 0
                    ? 'rgba(80,80,80,0.4)'
                    : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  border: 'none', borderRadius: q(10),
                  color: '#fff', fontSize: q(24), fontWeight: 700,
                  padding: `${q(14)} 0`, cursor: isSpinning || totalBet <= 0 ? 'not-allowed' : 'pointer',
                  boxShadow: isSpinning || totalBet <= 0 ? 'none' : '0 4px 20px rgba(124,58,237,0.6)',
                  transition: 'all 0.2s', letterSpacing: 1,
                  width: '100%',
                }}
              >
                {isSpinning ? '转动中...' : totalBet <= 0 ? '请下注' : '开始'}
              </button>

              {/* 下注说明 */}
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: q(16), textAlign: 'center' }}>
                先选金额，再点水果下注
              </div>

            </div>
          </div>
        </div>

        {/* ── 7 种水果下注区（主游戏区下方） ── */}
        <div style={{
          margin: `${q(8)} ${q(12)} 0`,
          background: 'rgba(20,8,50,0.92)',
          border: '1.5px solid rgba(120,60,220,0.35)',
          borderRadius: q(14),
          padding: `${q(10)} ${q(10)}`,
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: q(18), marginBottom: q(6), textAlign: 'center' }}>
            选择水果下注
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: q(6) }}>
            {FRUITS.map(fruit => {
              const currentBet = betMap[fruit.id] ?? 0;
              const hasBet = currentBet > 0;
              return (
                <div
                  key={fruit.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: q(6),
                    background: hasBet
                      ? `linear-gradient(135deg, rgba(120,60,220,0.5), rgba(80,20,160,0.5))`
                      : 'rgba(0,0,0,0.35)',
                    border: `1px solid ${hasBet ? 'rgba(180,100,255,0.7)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: q(10), padding: `${q(7)} ${q(8)}`,
                    transition: 'all 0.15s',
                  }}
                >
                  {/* 水果图标 */}
                  <img src={fruit.img} alt={fruit.name}
                    style={{ width: q(40), height: q(40), objectFit: 'contain', flexShrink: 0 }} />

                  {/* 名称 + 倍率 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#e0d0ff', fontSize: q(18), lineHeight: 1.3 }}>{fruit.name}</div>
                    <div style={{ color: fruit.color, fontSize: q(18), fontWeight: 700 }}>×{fruit.multiplier}</div>
                  </div>

                  {/* 下注金额控制 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: q(4) }}>
                    <button
                      onClick={() => setBetForFruit(fruit.id, Math.max(0, currentBet - quickBet))}
                      disabled={isSpinning || currentBet <= 0}
                      style={{
                        width: q(48), height: q(48),
                        background: currentBet > 0 ? 'rgba(255,80,80,0.4)' : 'rgba(80,80,80,0.3)',
                        border: '1px solid rgba(255,100,100,0.3)',
                        borderRadius: q(8), color: '#fff', fontSize: q(28),
                        cursor: currentBet > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1, flexShrink: 0,
                      }}
                    >−</button>
                    <div style={{
                      color: hasBet ? '#ffd700' : 'rgba(255,255,255,0.4)',
                      fontSize: q(20), fontWeight: hasBet ? 700 : 400,
                      minWidth: q(36), textAlign: 'center',
                    }}>
                      {currentBet > 0 ? currentBet : '0'}
                    </div>
                    <button
                      onClick={() => setBetForFruit(fruit.id, Math.min(maxBet, currentBet + quickBet))}
                      disabled={isSpinning}
                      style={{
                        width: q(48), height: q(48),
                        background: 'rgba(120,60,220,0.5)',
                        border: '1px solid rgba(180,100,255,0.5)',
                        borderRadius: q(8), color: '#fff', fontSize: q(28),
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1, flexShrink: 0,
                      }}
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 历史记录 ── */}
        <div style={{
          margin: `${q(12)} ${q(12)} 0`,
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(120,60,220,0.3)',
          borderRadius: q(12), overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(120,60,220,0.3)' }}>
            {['最新投注', '我的投注', '历史记录'].map((tab, i) => (
              <div
                key={tab}
                style={{
                  flex: 1, padding: `${q(14)} 0`, textAlign: 'center',
                  background: i === 1 ? 'rgba(120,60,220,0.25)' : 'transparent',
                  borderBottom: i === 1 ? '2px solid #7c3aed' : '2px solid transparent',
                  color: i === 1 ? '#fff' : 'rgba(255,255,255,0.45)',
                  fontSize: q(22), cursor: 'pointer',
                }}
              >
                {tab}
              </div>
            ))}
          </div>

          <div style={{ maxHeight: q(400), overflowY: 'auto' }}>
            {!history || history.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: `${q(32)} 0`, fontSize: q(22) }}>
                暂无记录
              </div>
            ) : (
              <>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  padding: `${q(6)} ${q(16)}`, color: 'rgba(255,255,255,0.4)', fontSize: q(18),
                }}>
                  <span>开奖</span><span>投注</span><span>赢得</span><span style={{ textAlign: 'right' }}>盈亏</span>
                </div>
                {history.map(r => (
                  <div
                    key={r.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      padding: `${q(8)} ${q(16)}`, alignItems: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: q(4) }}>
                      <img src={FRUITS[r.winFruit]?.img} alt="" style={{ width: q(28), height: q(28), objectFit: 'contain' }} />
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(18) }}>{FRUITS[r.winFruit]?.name}</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(20) }}>{r.betAmount.toFixed(2)}</span>
                    <span style={{ color: r.winAmount > 0 ? '#ffd700' : 'rgba(255,255,255,0.4)', fontSize: q(20) }}>
                      {r.winAmount > 0 ? r.winAmount.toFixed(2) : '-'}
                    </span>
                    <span style={{
                      textAlign: 'right', fontSize: q(20), fontWeight: 700,
                      color: r.netAmount >= 0 ? '#22c55e' : '#ef4444',
                    }}>
                      {r.netAmount >= 0 ? '+' : ''}{r.netAmount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 押大小弹窗 ── */}
      {showDicePhase && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)',
          animation: 'fadeInResult 0.3s ease',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(20,8,60,0.98), rgba(10,4,40,0.98))',
            border: '2px solid rgba(120,60,220,0.7)',
            borderRadius: q(20), padding: `${q(30)} ${q(36)}`,
            textAlign: 'center', width: q(480),
            boxShadow: '0 0 60px rgba(120,60,220,0.5)',
          }}>
            <div style={{ color: '#f0e6ff', fontSize: q(28), fontWeight: 900, marginBottom: q(8) }}>
              🎲 押大小
            </div>
            <div style={{ color: '#ffd700', fontSize: q(24), fontWeight: 700, marginBottom: q(16) }}>
              当前奖金：{pendingWinAmount.toFixed(2)} 💰
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(20), marginBottom: q(20) }}>
              1·2·3 = 小 &nbsp;|&nbsp; 4·5·6 = 大<br />
              <span style={{ color: '#22c55e' }}>猜中奖金翻倍</span> &nbsp;·&nbsp; <span style={{ color: '#ef4444' }}>猜错清零</span>
            </div>

            {/* 骰子显示 */}
            <div style={{
              fontSize: '72px', lineHeight: 1,
              marginBottom: q(20),
              animation: diceRolling ? 'diceRoll 0.1s ease infinite' : 'none',
              filter: diceRolling ? 'blur(1px)' : 'none',
              transition: 'filter 0.2s',
            }}>
              {diceValue ? DICE_EMOJI[diceValue] : '🎲'}
            </div>

            {/* 结果显示 */}
            {diceResult && (
              <div style={{
                marginBottom: q(16),
                padding: `${q(12)} ${q(20)}`,
                background: diceResult.win
                  ? 'rgba(22,163,74,0.25)'
                  : 'rgba(185,28,28,0.25)',
                border: `1px solid ${diceResult.win ? '#22c55e' : '#ef4444'}`,
                borderRadius: q(10),
                animation: 'fadeInResult 0.3s ease',
              }}>
                <div style={{ fontSize: q(28), marginBottom: q(4) }}>
                  {diceResult.win ? '🎉' : '😢'}
                </div>
                <div style={{ color: '#fff', fontSize: q(22), fontWeight: 700 }}>
                  {diceResult.win
                    ? `恭喜！奖金翻倍 → ${diceResult.amount.toFixed(2)} 💰`
                    : `很遗憾，奖金清零`}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: q(18), marginTop: q(4) }}>
                  骰子点数：{diceResult.value}（{diceResult.value <= 3 ? '小' : '大'}）
                </div>
              </div>
            )}

            {/* 选择按鈕 */}
            {!diceResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: q(12), marginBottom: q(16) }}>
                {/* 开始按鈕：默认跳过押大小，直接领取 */}
                <button
                  onClick={handleDiceSkip}
                  disabled={diceRolling}
                  style={{
                    width: '100%', padding: `${q(18)} 0`,
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    border: 'none', borderRadius: q(12),
                    color: '#fff', fontSize: q(26), fontWeight: 900, cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(124,58,237,0.6)',
                    letterSpacing: 1,
                  }}
                >
                  开始（跳过押大小）
                </button>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: q(18), textAlign: 'center' }}>
                  ―――― 或者选择押大小，赢了翻倍 ――――
                </div>
                <div style={{ display: 'flex', gap: q(16), justifyContent: 'center' }}>
                <button
                  onClick={() => handleDiceChoice('small')}
                  disabled={diceRolling}
                  style={{
                    flex: 1, padding: `${q(16)} 0`,
                    background: diceChoice === 'small'
                      ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                      : 'rgba(37,99,235,0.3)',
                    border: '2px solid #3b82f6', borderRadius: q(12),
                    color: '#fff', fontSize: q(24), fontWeight: 900, cursor: 'pointer',
                    boxShadow: diceChoice === 'small' ? '0 0 20px #3b82f688' : 'none',
                  }}
                >
                  小<br />
                  <span style={{ fontSize: q(18), fontWeight: 400 }}>1 · 2 · 3</span>
                </button>
                <button
                  onClick={() => handleDiceChoice('big')}
                  disabled={diceRolling}
                  style={{
                    flex: 1, padding: `${q(16)} 0`,
                    background: diceChoice === 'big'
                      ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                      : 'rgba(220,38,38,0.3)',
                    border: '2px solid #ef4444', borderRadius: q(12),
                    color: '#fff', fontSize: q(24), fontWeight: 900, cursor: 'pointer',
                    boxShadow: diceChoice === 'big' ? '0 0 20px #ef444488' : 'none',
                  }}
                >
                  大<br />
                  <span style={{ fontSize: q(18), fontWeight: 400 }}>4 · 5 · 6</span>
                </button>
              </div>
              </div>
            )}

            {/* 关闭按鈕（已出结果时） */}
            <div style={{ display: 'flex', gap: q(12), justifyContent: 'center' }}>
              {diceResult ? (
                <button
                  onClick={handleDiceClose}
                  style={{
                    padding: `${q(10)} ${q(40)}`,
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    border: 'none', borderRadius: q(10),
                    color: '#fff', fontSize: q(22), fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(124,58,237,0.6)',
                  }}
                >
                  确认
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 底部导航 */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
        <BottomNav />
      </div>

      <style>{`
        @keyframes fadeInResult {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes winGlow {
          from { box-shadow: 0 0 10px 2px #ffd70066; }
          to   { box-shadow: 0 0 24px 6px #ffd700cc; }
        }
        @keyframes winRing {
          from { box-shadow: 0 0 20px 4px #ffd70044, inset 0 0 20px 4px #ffd70022; opacity: 0.7; }
          to   { box-shadow: 0 0 60px 16px #ffd700aa, inset 0 0 60px 16px #ffd70055; opacity: 1; }
        }
        @keyframes bounceWin {
          from { transform: scale(1) rotate(-5deg); }
          to   { transform: scale(1.15) rotate(5deg); }
        }
        @keyframes diceRoll {
          0%   { transform: rotate(-10deg) scale(1.1); }
          50%  { transform: rotate(10deg) scale(0.9); }
          100% { transform: rotate(-10deg) scale(1.1); }
        }
      `}</style>

      {/* 设置弹窗 */}
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </div>
  );
}
