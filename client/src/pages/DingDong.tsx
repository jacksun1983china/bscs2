/**
 * DingDong.tsx — Fruit Bomb 水果机（单人版）
 *
 * 玩法：
 * - 外圈 20 个格子循环滚动展示水果图标
 * - 内圈 4×4 格子静态展示水果
 * - 右侧 7 种水果下注面板，各有不同倍率
 * - 玩家选择水果 + 输入金额 → 点击下注 → 外圈加速滚动 → 中心展示开奖水果 → 结果
 *
 * 布局：phone-container + cqw 响应式（基准 750px）
 * 配色：赛博朋克深紫蓝霓虹风格（与项目统一）
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import { useGameAlert } from '@/components/GameAlert';
import { useLocation } from 'wouter';
import { useSound } from '@/hooks/useSound';

// ── px → cqw 转换（基准 750px）──────────────────────────────────
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// ── CDN 素材 URL ─────────────────────────────────────────────────
const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';

// ── 7 种水果定义（与服务端索引对应）────────────────────────────
const FRUITS = [
  { id: 0, name: '铃铛',   img: `${CDN}/bell_42e211b8.png`,       multiplier: 2.5,  color: '#f59e0b', weight: 40 },
  { id: 1, name: '西瓜',   img: `${CDN}/watermelon_a06e5e29.png`, multiplier: 5,    color: '#22c55e', weight: 20 },
  { id: 2, name: '葡萄',   img: `${CDN}/grape_41b4f4b0.png`,      multiplier: 5,    color: '#a855f7', weight: 20 },
  { id: 3, name: '苹果',   img: `${CDN}/apple_3f9ba667.png`,      multiplier: 10,   color: '#84cc16', weight: 10 },
  { id: 4, name: '蓝宝石', img: `${CDN}/blue_4205add7.png`,       multiplier: 10,   color: '#3b82f6', weight: 10 },
  { id: 5, name: '柠檬',   img: `${CDN}/lemon_1880cb8f.png`,      multiplier: 20,   color: '#eab308', weight: 5  },
  { id: 6, name: 'LUCKY',  img: `${CDN}/lucky_a022fbfc.png`,      multiplier: 20,   color: '#ec4899', weight: 5  },
];

// 内圈 4×4 静态水果分布
const INNER_FRUITS = [1, 2, 3, 0, 5, 6, 4, 1, 2, 3, 0, 5, 6, 4, 1, 2];

// 外圈 20 格顺时针排列（上6 右4 下6 左4）
const OUTER_RING: { row: number; col: number }[] = [];
for (let c = 0; c < 6; c++) OUTER_RING.push({ row: 0, col: c });       // 上行
for (let r = 1; r <= 4; r++) OUTER_RING.push({ row: r, col: 5 });      // 右列
for (let c = 5; c >= 0; c--) OUTER_RING.push({ row: 5, col: c });      // 下行
for (let r = 4; r >= 1; r--) OUTER_RING.push({ row: r, col: 0 });      // 左列

// 快捷下注金额
const BET_PRESETS = [1, 5, 10, 50, 100, 500];

export default function DingDong() {
  const [, navigate] = useLocation();
  const { showAlert } = useGameAlert();
  const { playWin, playLose, playRing, isMuted, toggleMute } = useSound();

  // ── 状态 ──────────────────────────────────────────────────────
  const [selectedFruit, setSelectedFruit] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinOffset, setSpinOffset] = useState(0);   // 外圈滚动偏移（格数）
  const [centerFruit, setCenterFruit] = useState<number>(0); // 中心展示水果
  const [showCenter, setShowCenter] = useState(false);       // 是否显示中心开奖框
  const [lastResult, setLastResult] = useState<{
    isWin: boolean; winFruit: number; multiplier: number;
    winAmount: number; netAmount: number;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);

  // ── 外圈持续滚动动画 ──────────────────────────────────────────
  const rafRef = useRef<number>(0);
  const prevTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(0.015); // 格/ms（慢速）

  useEffect(() => {
    let offset = 0;
    const loop = (t: number) => {
      if (prevTimeRef.current) {
        const dt = t - prevTimeRef.current;
        offset = (offset + speedRef.current * dt) % OUTER_RING.length;
        setSpinOffset(offset);
      }
      prevTimeRef.current = t;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── tRPC ──────────────────────────────────────────────────────
  const { data: playerData, refetch: refetchPlayer } = trpc.player.me.useQuery();
  const { data: settings } = trpc.dingdong.getSettings.useQuery();
  const { data: history, refetch: refetchHistory } = trpc.dingdong.getHistory.useQuery({ limit: 20 });

  const playMut = trpc.dingdong.play.useMutation({
    onSuccess: async (result) => {
      // 加速外圈
      speedRef.current = 0.18;
      setShowCenter(true);
      playRing();

      // 播放 spinSequence 动画
      const seq = result.spinSequence as number[];
      for (let i = 0; i < seq.length; i++) {
        await new Promise<void>(res => setTimeout(() => {
          setCenterFruit(seq[i]);
          // 逐渐减速
          if (i > seq.length * 0.6) {
            speedRef.current = Math.max(0.015, speedRef.current * 0.88);
          }
          res();
        }, 80 + i * 25));
      }

      speedRef.current = 0.015;
      setIsSpinning(false);
      setShowCenter(false);

      setLastResult({
        isWin: result.isWin,
        winFruit: result.winFruit,
        multiplier: result.multiplier,
        winAmount: result.winAmount,
        netAmount: result.netAmount,
      });
      setShowResult(true);
      setTimeout(() => setShowResult(false), 3500);

      if (result.isWin) {
        playWin();
        showAlert(`🎉 恭喜！赢得 ${result.winAmount.toFixed(2)} 金币（${result.multiplier}x）`);
      } else {
        playLose();
      }

      await refetchPlayer();
      await refetchHistory();
    },
    onError: (err) => {
      setIsSpinning(false);
      speedRef.current = 0.015;
      setShowCenter(false);
      showAlert(err.message || '下注失败');
    },
  });

  const handleBet = useCallback(() => {
    if (selectedFruit === null) { showAlert('请先选择水果'); return; }
    if (!playerData) { navigate('/login'); return; }
    const gold = parseFloat(String(playerData.gold));
    if (gold < betAmount) { showAlert('金币不足'); return; }
    if (isSpinning) return;
    setIsSpinning(true);
    setShowResult(false);
    playMut.mutate({ betAmount, selectedFruit });
  }, [selectedFruit, betAmount, playerData, isSpinning, playMut, navigate, showAlert]);

  const gold = playerData ? parseFloat(String(playerData.gold)) : 0;
  const minBet = settings?.minBet ?? 1;
  const maxBet = settings?.maxBet ?? 10000;

  // ── 外圈水果计算 ──────────────────────────────────────────────
  const outerFruits = OUTER_RING.map((_, i) => {
    const idx = Math.floor((i + spinOffset + OUTER_RING.length) % OUTER_RING.length);
    return FRUITS[idx % 7];
  });

  // 格子尺寸（cqw 单位）
  const CELL_PX = 84;  // 每格像素（基于750px基准）
  const GAP_PX = 4;
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
        <TopNav showLogo={false} onBackClick={() => navigate('/')} />
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

        {/* 标题 */}
        <div style={{
          textAlign: 'center', padding: `${q(12)} 0 ${q(4)}`,
          color: '#f0e6ff', fontSize: q(30), fontWeight: 900, letterSpacing: 2,
          textShadow: '0 0 20px rgba(160,80,255,0.7)',
        }}>
          🍉 水果机
        </div>

        {/* 余额 */}
        <div style={{
          textAlign: 'center', marginBottom: q(8),
          color: '#ffd700', fontSize: q(26), fontWeight: 700,
        }}>
          💰 {gold.toFixed(2)}
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
          {/* 背景稻草人装饰 */}
          <img
            src={`${CDN}/game_bg_971837a8.png`}
            alt=""
            style={{
              position: 'absolute', bottom: 0, right: 0,
              height: '60%', opacity: 0.25, pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          <div style={{ display: 'flex', gap: q(10), position: 'relative', zIndex: 1 }}>

            {/* ── 左侧：外圈 + 内圈格子 ── */}
            <div style={{ flex: 1, position: 'relative' }}>
              {/* 格子容器 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${COLS}, ${q(CELL_PX)})`,
                gridTemplateRows: `repeat(${ROWS}, ${q(CELL_PX)})`,
                gap: q(GAP_PX),
                position: 'relative',
              }}>
                {/* 外圈格子 */}
                {OUTER_RING.map((pos, i) => {
                  const fruit = outerFruits[i];
                  const isWinCell = showResult && lastResult && fruit.id === lastResult.winFruit;
                  return (
                    <div
                      key={`outer-${i}`}
                      style={{
                        gridRow: pos.row + 1,
                        gridColumn: pos.col + 1,
                        width: q(CELL_PX), height: q(CELL_PX),
                        background: isWinCell
                          ? 'linear-gradient(135deg, rgba(255,215,0,0.35), rgba(255,165,0,0.35))'
                          : 'linear-gradient(135deg, rgba(30,10,65,0.9), rgba(15,5,40,0.9))',
                        border: `1.5px solid ${isWinCell ? '#ffd700' : 'rgba(120,60,220,0.5)'}`,
                        borderRadius: q(8),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: isWinCell ? '0 0 12px #ffd70088' : 'none',
                        transition: 'background 0.15s',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={fruit.img}
                        alt={fruit.name}
                        style={{ width: q(CELL_PX * 0.68), height: q(CELL_PX * 0.68), objectFit: 'contain' }}
                      />
                    </div>
                  );
                })}

                {/* 内圈 4×4 格子（row 1-4, col 1-4） */}
                {INNER_FRUITS.map((fruitId, idx) => {
                  const r = Math.floor(idx / 4) + 1; // 1-4
                  const c = (idx % 4) + 1;           // 1-4
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

                {/* 中心开奖动画框（转动时覆盖内圈中央 2×2） */}
                {showCenter && (
                  <div style={{
                    gridRow: '3 / 5',
                    gridColumn: '3 / 5',
                    background: 'rgba(0,0,0,0.85)',
                    border: '2px solid rgba(180,100,255,0.9)',
                    borderRadius: q(10),
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(180,100,255,0.6)',
                    zIndex: 5,
                    animation: 'centerPulse 0.5s ease infinite alternate',
                  }}>
                    <img
                      src={FRUITS[centerFruit]?.img}
                      alt=""
                      style={{ width: q(CELL_PX * 1.1), height: q(CELL_PX * 1.1), objectFit: 'contain' }}
                    />
                    <div style={{ color: '#fff', fontSize: q(18), marginTop: q(2) }}>
                      {FRUITS[centerFruit]?.name}
                    </div>
                  </div>
                )}
              </div>

              {/* 开奖结果浮层 */}
              {showResult && lastResult && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.65)',
                  borderRadius: q(12),
                  animation: 'fadeInResult 0.3s ease',
                }}>
                  <div style={{
                    background: lastResult.isWin
                      ? 'linear-gradient(135deg, rgba(22,163,74,0.97), rgba(15,118,50,0.97))'
                      : 'linear-gradient(135deg, rgba(185,28,28,0.97), rgba(127,29,29,0.97))',
                    borderRadius: q(16), padding: `${q(20)} ${q(28)}`, textAlign: 'center',
                    border: `2px solid ${lastResult.isWin ? '#22c55e' : '#ef4444'}`,
                    boxShadow: `0 0 40px ${lastResult.isWin ? '#22c55e66' : '#ef444466'}`,
                  }}>
                    <div style={{ fontSize: q(50), marginBottom: q(6) }}>
                      {lastResult.isWin ? '🎉' : '😢'}
                    </div>
                    <div style={{ color: '#fff', fontSize: q(26), fontWeight: 900, marginBottom: q(4) }}>
                      {lastResult.isWin ? '恭喜获胜！' : '未中奖'}
                    </div>
                    {lastResult.isWin && (
                      <div style={{ color: '#ffd700', fontSize: q(30), fontWeight: 900 }}>
                        +{lastResult.winAmount.toFixed(2)} 💰
                      </div>
                    )}
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(20), marginTop: q(6) }}>
                      开奖：{FRUITS[lastResult.winFruit]?.name}
                      {lastResult.isWin && ` × ${lastResult.multiplier}`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── 右侧：下注面板 ── */}
            <div style={{ width: q(160), display: 'flex', flexDirection: 'column', gap: q(6) }}>

              {/* 余额小显示 */}
              <div style={{
                background: 'rgba(0,0,0,0.5)', borderRadius: q(8), padding: `${q(5)} ${q(8)}`,
                color: '#ffd700', fontSize: q(20), fontWeight: 700, textAlign: 'center',
                border: '1px solid rgba(255,215,0,0.3)',
              }}>
                💰 {gold.toFixed(2)}
              </div>

              {/* 金额调节 */}
              <div style={{ display: 'flex', gap: q(4), alignItems: 'center' }}>
                <button
                  onClick={() => setBetAmount(prev => Math.max(minBet, Math.floor(prev / 2)))}
                  disabled={isSpinning}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: q(6),
                    color: '#fff', fontSize: q(18), padding: `${q(5)} 0`, cursor: 'pointer',
                  }}
                >½</button>
                <div style={{
                  flex: 2, background: 'rgba(0,0,0,0.5)', borderRadius: q(6),
                  color: '#fff', fontSize: q(20), fontWeight: 700, textAlign: 'center',
                  padding: `${q(5)} 0`, border: '1px solid rgba(120,60,220,0.4)',
                }}>
                  {betAmount}
                </div>
                <button
                  onClick={() => setBetAmount(prev => Math.min(maxBet, prev * 2))}
                  disabled={isSpinning}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: q(6),
                    color: '#fff', fontSize: q(18), padding: `${q(5)} 0`, cursor: 'pointer',
                  }}
                >×2</button>
              </div>

              {/* 快捷金额 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: q(4) }}>
                {BET_PRESETS.slice(0, 4).map(amt => (
                  <button
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    disabled={isSpinning}
                    style={{
                      background: betAmount === amt ? 'rgba(120,60,220,0.6)' : 'rgba(255,255,255,0.07)',
                      border: `1px solid ${betAmount === amt ? 'rgba(180,100,255,0.8)' : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: q(6), color: '#fff', fontSize: q(18), padding: `${q(4)} 0`, cursor: 'pointer',
                    }}
                  >{amt}</button>
                ))}
              </div>

              {/* 7 种水果下注按钮 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: q(5) }}>
                {FRUITS.map(fruit => (
                  <button
                    key={fruit.id}
                    onClick={() => setSelectedFruit(fruit.id)}
                    disabled={isSpinning}
                    style={{
                      display: 'flex', alignItems: 'center', gap: q(6),
                      background: selectedFruit === fruit.id
                        ? `linear-gradient(135deg, rgba(120,60,220,0.7), rgba(80,20,160,0.7))`
                        : 'rgba(0,0,0,0.45)',
                      border: `1.5px solid ${selectedFruit === fruit.id ? 'rgba(180,100,255,0.9)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: q(8), padding: `${q(5)} ${q(8)}`, cursor: 'pointer',
                      boxShadow: selectedFruit === fruit.id ? `0 0 10px ${fruit.color}55` : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    <img src={fruit.img} alt={fruit.name} style={{ width: q(34), height: q(34), objectFit: 'contain' }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ color: '#e0d0ff', fontSize: q(17) }}>{fruit.name}</div>
                      <div style={{ color: fruit.color, fontSize: q(19), fontWeight: 700 }}>×{fruit.multiplier}</div>
                    </div>
                    {selectedFruit === fruit.id && (
                      <div style={{ color: '#ffd700', fontSize: q(18) }}>✓</div>
                    )}
                  </button>
                ))}
              </div>

              {/* 下注按钮 */}
              <button
                onClick={handleBet}
                disabled={isSpinning || selectedFruit === null}
                style={{
                  marginTop: q(4),
                  background: isSpinning || selectedFruit === null
                    ? 'rgba(80,80,80,0.4)'
                    : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  border: 'none', borderRadius: q(10),
                  color: '#fff', fontSize: q(22), fontWeight: 700,
                  padding: `${q(12)} 0`, cursor: isSpinning || selectedFruit === null ? 'not-allowed' : 'pointer',
                  boxShadow: isSpinning || selectedFruit === null ? 'none' : '0 4px 20px rgba(124,58,237,0.6)',
                  transition: 'all 0.2s', letterSpacing: 1,
                }}
              >
                {isSpinning ? '转动中...' : selectedFruit === null ? '请选水果' : '下注'}
              </button>
            </div>
          </div>
        </div>

        {/* ── 历史记录 ── */}
        <div style={{
          margin: `${q(12)} ${q(12)} 0`,
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(120,60,220,0.3)',
          borderRadius: q(12), overflow: 'hidden',
        }}>
          {/* Tab 栏 */}
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

          {/* 历史列表 */}
          <div style={{ maxHeight: q(400), overflowY: 'auto' }}>
            {!history || history.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: `${q(32)} 0`, fontSize: q(22) }}>
                暂无记录
              </div>
            ) : (
              <>
                {/* 表头 */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  padding: `${q(6)} ${q(16)}`, color: 'rgba(255,255,255,0.4)', fontSize: q(18),
                }}>
                  <span>选择</span><span>开奖</span><span>投注</span><span style={{ textAlign: 'right' }}>盈亏</span>
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
                      <img src={FRUITS[r.selectedFruit]?.img} alt="" style={{ width: q(28), height: q(28), objectFit: 'contain' }} />
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(18) }}>{FRUITS[r.selectedFruit]?.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: q(4) }}>
                      <img src={FRUITS[r.winFruit]?.img} alt="" style={{ width: q(28), height: q(28), objectFit: 'contain' }} />
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(18) }}>{FRUITS[r.winFruit]?.name}</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(20) }}>{r.betAmount.toFixed(2)}</span>
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

      {/* 底部导航 */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
        <BottomNav />
      </div>

      <style>{`
        @keyframes fadeInResult {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes centerPulse {
          from { box-shadow: 0 0 20px rgba(180,100,255,0.5); }
          to   { box-shadow: 0 0 40px rgba(180,100,255,0.9); }
        }
      `}</style>
    </div>
  );
}
