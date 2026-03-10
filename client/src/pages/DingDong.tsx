/**
 * DingDong.tsx — 丁咚游戏（Fruit Bomb 单人版）
 *
 * 玩法：
 * - 4x4 网格（16格），外圈是水果图标装饰
 * - 玩家选择一个格子并投注
 * - 服务端随机抽取1个中奖格子
 * - 中奖倍率 = 16 * RTP/100（约15.36x）
 * - 开奖动画：逐格揭示，最后揭示选中格和中奖格
 *
 * 布局：phone-container + cqw 响应式单位（基准 750px）
 * 配色：赛博朋克深紫蓝霓虹风格
 */
import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
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
  cellBg: 'rgba(30,12,70,0.9)',
  cellBorder: 'rgba(100,50,200,0.5)',
  cellSelected: 'rgba(120,40,220,0.6)',
  cellWin: 'rgba(0,120,60,0.8)',
  cellLose: 'rgba(120,0,30,0.6)',
};

// ── 水果图标（外圈装饰）─────────────────────────────────────────
const FRUITS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍒', '🍍', '🥝', '🍈', '🍌', '🍉', '🥭', '🍐', '🫐', '🍏'];

// ── 投注档位 ─────────────────────────────────────────────────────
const BET_VALUES = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

// ── 游戏状态 ─────────────────────────────────────────────────────
type GamePhase = 'idle' | 'selected' | 'revealing' | 'result';

interface CellState {
  revealed: boolean;
  isWin: boolean;
  isSelected: boolean;
}

export default function DingDong() {
  const [, navigate] = useLocation();
  const { showAlert } = useGameAlert();
  const { playClick, playWin, playLose, playRing, playBetUp, playBetDown, isMuted, toggleMute } = useSound();

  // ── 游戏状态 ─────────────────────────────────────────────────
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [betAmount, setBetAmount] = useState(10);
  const [betIdx, setBetIdx] = useState(3);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [cells, setCells] = useState<CellState[]>(Array(16).fill({ revealed: false, isWin: false, isSelected: false }));
  const [lastResult, setLastResult] = useState<{
    isWin: boolean;
    winCell: number;
    multiplier: number;
    winAmount: number;
    netAmount: number;
    balanceAfter: number;
  } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── tRPC ─────────────────────────────────────────────────────
  const { data: playerData, refetch: refetchPlayer } = trpc.player.me.useQuery();
  const { data: settings } = trpc.dingdong.getSettings.useQuery();
  const playMut = trpc.dingdong.play.useMutation();

  useEffect(() => {
    if (playerData?.gold) setBalance(parseFloat(playerData.gold));
  }, [playerData]);

  // ── 选择格子 ─────────────────────────────────────────────────
  const handleSelectCell = (idx: number) => {
    if (phase !== 'idle' && phase !== 'selected') return;
    setSelectedCell(idx);
    setPhase('selected');
    setCells(Array(16).fill(null).map((_, i) => ({
      revealed: false,
      isWin: false,
      isSelected: i === idx,
    })));
  };

  // ── 投注并开奖 ───────────────────────────────────────────────
  const handlePlay = async () => {
    if (selectedCell === null) { showAlert('请先选择一个格子'); return; }
    if (!playerData) { showAlert('请先登录'); return; }
    if (balance !== null && balance < betAmount) { showAlert('金币不足'); return; }

    setPhase('revealing');

    try {
      const result = await playMut.mutateAsync({ betAmount, selectedCell });
      setLastResult(result);
      setBalance(result.balanceAfter);
      // 开奖音效
      playRing();

      // 开奖动画：逐格揭示（非选中、非中奖格先揭示）
      const revealOrder: number[] = [];
      for (let i = 0; i < 16; i++) {
        if (i !== selectedCell && i !== result.winCell) revealOrder.push(i);
      }
      // 打乱顺序
      for (let i = revealOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [revealOrder[i], revealOrder[j]] = [revealOrder[j], revealOrder[i]];
      }

      // 逐格揭示
      let delay = 0;
      const newCells: CellState[] = Array(16).fill(null).map((_, i) => ({
        revealed: false,
        isWin: false,
        isSelected: i === selectedCell,
      }));

      for (const cellIdx of revealOrder) {
        const capturedIdx = cellIdx;
        revealTimerRef.current = setTimeout(() => {
          newCells[capturedIdx] = { ...newCells[capturedIdx], revealed: true };
          setCells([...newCells]);
        }, delay);
        delay += 60;
      }

      // 最后揭示选中格和中奖格
      revealTimerRef.current = setTimeout(() => {
        newCells[result.winCell] = { revealed: true, isWin: true, isSelected: result.winCell === selectedCell };
        newCells[selectedCell] = { revealed: true, isWin: result.isWin, isSelected: true };
        setCells([...newCells]);
        setPhase('result');
        refetchPlayer();
        // 中奖/未中音效
        setTimeout(() => {
          if (result.isWin) playWin(); else playLose();
        }, 200);
      }, delay + 200);

    } catch (e: any) {
      setPhase('selected');
      showAlert(e.message || '游戏失败');
    }
  };

  // ── 重置游戏 ─────────────────────────────────────────────────
  const handleReset = () => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    setPhase('idle');
    setSelectedCell(null);
    setLastResult(null);
    setCells(Array(16).fill({ revealed: false, isWin: false, isSelected: false }));
    refetchPlayer();
  };

  // ── 投注金额控制 ─────────────────────────────────────────────
  const handleBetChange = (dir: 1 | -1) => {
    const newIdx = Math.max(0, Math.min(BET_VALUES.length - 1, betIdx + dir));
    setBetIdx(newIdx);
    setBetAmount(BET_VALUES[newIdx]);
  };

  // ── 渲染格子 ─────────────────────────────────────────────────
  const renderCell = (idx: number) => {
    const cell = cells[idx];
    const isSelected = selectedCell === idx;
    const isWinCell = lastResult?.winCell === idx;

    let bg = CYBER.cellBg;
    let border = CYBER.cellBorder;
    let glow = '';
    let content: React.ReactNode = null;

    if (isSelected && !cell.revealed) {
      bg = CYBER.cellSelected;
      border = CYBER.accent;
      glow = `0 0 12px ${CYBER.borderGlow}`;
      content = <span style={{ fontSize: q(36) }}>⭐</span>;
    } else if (cell.revealed) {
      if (cell.isWin) {
        bg = CYBER.cellWin;
        border = CYBER.win;
        glow = `0 0 16px ${CYBER.winGlow}`;
        content = <span style={{ fontSize: q(40) }}>💎</span>;
      } else if (isWinCell) {
        bg = CYBER.cellWin;
        border = CYBER.win;
        glow = `0 0 16px ${CYBER.winGlow}`;
        content = <span style={{ fontSize: q(40) }}>💎</span>;
      } else if (isSelected) {
        bg = CYBER.cellLose;
        border = CYBER.lose;
        glow = `0 0 12px ${CYBER.loseGlow}`;
        content = <span style={{ fontSize: q(36) }}>💨</span>;
      } else {
        content = <span style={{ fontSize: q(30), opacity: 0.5 }}>{FRUITS[idx]}</span>;
      }
    } else {
      content = <span style={{ fontSize: q(30), opacity: 0.3 }}>?</span>;
    }

    return (
      <div
        key={idx}
        onClick={() => handleSelectCell(idx)}
        style={{
          width: `calc(25% - ${q(6)})`,
          aspectRatio: '1',
          background: bg,
          border: `1.5px solid ${border}`,
          borderRadius: q(12),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: (phase === 'idle' || phase === 'selected') ? 'pointer' : 'default',
          boxShadow: glow || 'none',
          transition: 'all 0.2s',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 选中高亮边框动画 */}
        {isSelected && !cell.revealed && (
          <div style={{
            position: 'absolute',
            inset: 0,
            border: `2px solid ${CYBER.accent}`,
            borderRadius: q(10),
            animation: 'borderPulse 1s infinite',
          }} />
        )}
        {content}
      </div>
    );
  };

  const multiplier = settings ? (16 * settings.rtp / 100).toFixed(1) : '15.4';

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
        <TopNav showLogo={false} onBackClick={() => navigate('/')} />
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
          padding: `${q(16)} 0 ${q(4)}`,
          color: CYBER.textPrimary,
          fontSize: q(32),
          fontWeight: 900,
          letterSpacing: 2,
          textShadow: `0 0 20px ${CYBER.borderGlow}`,
        }}>
          🎯 丁咚
        </div>
        <div style={{
          textAlign: 'center',
          color: CYBER.textSecondary,
          fontSize: q(22),
          marginBottom: q(8),
        }}>
          选1格，中奖倍率 {multiplier}x
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

        {/* 结果提示 */}
        {phase === 'result' && lastResult && (
          <div style={{
            margin: `0 ${q(24)} ${q(12)}`,
            padding: q(16),
            background: lastResult.isWin
              ? 'linear-gradient(135deg, rgba(0,80,40,0.9), rgba(0,40,20,0.95))'
              : 'linear-gradient(135deg, rgba(80,0,20,0.9), rgba(40,0,10,0.95))',
            border: `1.5px solid ${lastResult.isWin ? CYBER.win : CYBER.lose}`,
            borderRadius: q(12),
            textAlign: 'center',
            boxShadow: `0 0 20px ${lastResult.isWin ? CYBER.winGlow : CYBER.loseGlow}`,
          }}>
            <div style={{ fontSize: q(36), marginBottom: q(4) }}>
              {lastResult.isWin ? '🎉' : '😢'}
            </div>
            <div style={{
              color: lastResult.isWin ? CYBER.win : CYBER.lose,
              fontSize: q(28),
              fontWeight: 900,
            }}>
              {lastResult.isWin
                ? `中奖！赢得 ${lastResult.winAmount.toFixed(2)} 金币`
                : `未中奖，输掉 ${betAmount} 金币`}
            </div>
            {lastResult.isWin && (
              <div style={{ color: CYBER.textSecondary, fontSize: q(20), marginTop: q(4) }}>
                倍率：{lastResult.multiplier}x
              </div>
            )}
          </div>
        )}

        {/* 游戏网格 */}
        <div style={{
          margin: `0 ${q(16)}`,
          padding: q(16),
          background: CYBER.bgCard,
          border: `1.5px solid ${CYBER.border}`,
          borderRadius: q(16),
          boxShadow: `0 0 30px rgba(80,20,160,0.3)`,
        }}>
          {/* 提示文字 */}
          <div style={{
            textAlign: 'center',
            color: phase === 'idle' ? CYBER.textSecondary : phase === 'selected' ? CYBER.accent : CYBER.textMuted,
            fontSize: q(22),
            marginBottom: q(12),
          }}>
            {phase === 'idle' && '点击选择一个格子'}
            {phase === 'selected' && `已选第 ${(selectedCell ?? 0) + 1} 格，点击【开奖】`}
            {phase === 'revealing' && '开奖中...'}
            {phase === 'result' && (lastResult?.isWin ? '恭喜中奖！' : '再接再厉！')}
          </div>

          {/* 4x4 网格 */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: q(8),
          }}>
            {Array(16).fill(null).map((_, idx) => renderCell(idx))}
          </div>
        </div>

        {/* 投注区域 */}
        <div style={{
          margin: `${q(12)} ${q(16)} 0`,
          padding: q(16),
          background: CYBER.bgCard,
          border: `1px solid ${CYBER.border}`,
          borderRadius: q(12),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: q(10) }}>
            <span style={{ color: CYBER.textSecondary, fontSize: q(24) }}>投注金额</span>
            <span style={{ color: '#ffd700', fontSize: q(28), fontWeight: 700 }}>{betAmount}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: q(12) }}>
            <button
              onClick={() => handleBetChange(-1)}
              disabled={phase === 'revealing' || betIdx === 0}
              style={{
                width: q(64), height: q(64),
                background: 'rgba(120,60,220,0.3)',
                border: `1px solid ${CYBER.border}`,
                borderRadius: q(8),
                color: CYBER.textPrimary,
                fontSize: q(32),
                cursor: 'pointer',
                opacity: (phase === 'revealing' || betIdx === 0) ? 0.4 : 1,
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
              disabled={phase === 'revealing' || betIdx === BET_VALUES.length - 1}
              style={{
                width: q(64), height: q(64),
                background: 'rgba(120,60,220,0.3)',
                border: `1px solid ${CYBER.border}`,
                borderRadius: q(8),
                color: CYBER.textPrimary,
                fontSize: q(32),
                cursor: 'pointer',
                opacity: (phase === 'revealing' || betIdx === BET_VALUES.length - 1) ? 0.4 : 1,
              }}
            >+</button>
          </div>
        </div>

        {/* 快捷投注 */}
        <div style={{
          margin: `${q(8)} ${q(16)} 0`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: q(8),
        }}>
          {[1, 5, 10, 50, 100].map(v => (
            <button
              key={v}
              onClick={() => {
                const idx = BET_VALUES.indexOf(v);
                if (idx >= 0) { setBetIdx(idx); setBetAmount(v); }
              }}
              disabled={phase === 'revealing'}
              style={{
                padding: `${q(8)} ${q(20)}`,
                background: betAmount === v ? 'rgba(120,60,220,0.6)' : 'rgba(30,12,70,0.8)',
                border: `1px solid ${betAmount === v ? CYBER.accent : CYBER.border}`,
                borderRadius: q(8),
                color: betAmount === v ? '#fff' : CYBER.textSecondary,
                fontSize: q(22),
                cursor: 'pointer',
              }}
            >
              {v}
            </button>
          ))}
        </div>

        {/* 操作按钮 */}
        <div style={{ margin: `${q(16)} ${q(16)} 0`, display: 'flex', gap: q(12) }}>
          {(phase === 'idle' || phase === 'selected') && (
            <button
              onClick={handlePlay}
              disabled={selectedCell === null || playMut.isPending}
              style={{
                flex: 1,
                height: q(88),
                background: selectedCell !== null
                  ? 'linear-gradient(180deg, #9333ea 0%, #7c3aed 50%, #5b21b6 100%)'
                  : 'rgba(80,40,160,0.3)',
                border: selectedCell !== null ? 'none' : `1px solid ${CYBER.border}`,
                borderRadius: q(12),
                color: selectedCell !== null ? '#fff' : CYBER.textMuted,
                fontSize: q(32),
                fontWeight: 900,
                cursor: selectedCell !== null ? 'pointer' : 'not-allowed',
                boxShadow: selectedCell !== null ? '0 4px 20px rgba(124,58,237,0.6)' : 'none',
                letterSpacing: 2,
                opacity: playMut.isPending ? 0.7 : 1,
              }}
            >
              {playMut.isPending ? '开奖中...' : '🎯 开奖'}
            </button>
          )}

          {phase === 'revealing' && (
            <div style={{
              flex: 1,
              height: q(88),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: CYBER.accent,
              fontSize: q(28),
              fontWeight: 700,
            }}>
              开奖中...
            </div>
          )}

          {phase === 'result' && (
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
          margin: `${q(12)} ${q(16)} 0`,
          padding: q(12),
          background: 'rgba(20,8,50,0.6)',
          border: `1px solid rgba(120,60,220,0.2)`,
          borderRadius: q(8),
          color: CYBER.textMuted,
          fontSize: q(20),
          lineHeight: 1.6,
        }}>
          <div style={{ color: CYBER.textSecondary, marginBottom: q(4), fontWeight: 600 }}>玩法说明</div>
          16格中随机1格中奖，选中即赢 {multiplier}x 倍率。先选格子，再点【开奖】。
        </div>

      </div>

      {/* ── 底部导航 ── */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
        <BottomNav active="dating" />
      </div>

      <style>{`
        @keyframes borderPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(192,132,252,0.6); }
          50% { opacity: 0.6; box-shadow: 0 0 16px rgba(192,132,252,0.9); }
        }
      `}</style>
    </div>
  );
}
