/**
 * RollX.tsx — 幸运转盘游戏
 * 1:1 复刻原版 SSG RollX 玩法和美术风格
 *
 * 核心玩法：
 * - 转盘分绿色（WIN）和黑色（LOSE）两个扇区
 * - 绿色扇区角度 = 360 × (1/multiplier × RTP/100)
 * - 服务端决定胜负，返回 isWin + stopAngle
 * - 前端只负责动画展示
 *
 * 布局：phone-container + cqw 响应式单位（基准 750px）
 * 配色：赛博朋克深紫蓝霓虹风格
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import { useGameAlert } from '@/components/GameAlert';
import { useLocation } from 'wouter';
import { useSound } from '@/hooks/useSound';
import SettingsModal from '@/components/SettingsModal';

// ── px → cqw 转换（基准 750px）──────────────────────────────────
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// ── 赛博朋克配色常量 ─────────────────────────────────────────────
const CYBER = {
  bg: '#0d0621',                          // 深紫黑背景
  bgCard: 'rgba(20,8,50,0.92)',           // 卡片背景
  bgCardLight: 'rgba(30,12,70,0.85)',     // 浅卡片背景
  border: 'rgba(120,60,220,0.45)',        // 紫色边框
  borderGlow: 'rgba(160,80,255,0.7)',     // 发光边框
  accent: '#c084fc',                      // 主紫色
  accentCyan: '#22d3ee',                  // 青色强调
  accentPink: '#f472b6',                  // 粉色强调
  win: '#00f5a0',                         // 霓虹绿（胜利）
  winDark: '#00b36e',                     // 深霓虹绿
  winGlow: 'rgba(0,245,160,0.5)',         // 绿色发光
  lose: '#ff4d6d',                        // 霓虹红（失败）
  loseDark: '#cc1a38',                    // 深霓虹红
  loseGlow: 'rgba(255,77,109,0.5)',       // 红色发光
  textPrimary: '#f0e6ff',                 // 主文字
  textSecondary: '#9980cc',              // 次要文字
  textMuted: '#5a4a7a',                   // 淡化文字
  sliderTrack: 'rgba(80,40,160,0.5)',     // 滑轨背景
  sliderFill: 'linear-gradient(90deg, #7c3aed 0%, #c084fc 100%)', // 滑轨填充
  sliderThumb: '#c084fc',                 // 滑块颜色
  wheelBorder: '#6d28d9',                 // 转盘边框
  wheelCenter: 'radial-gradient(circle, #1e0a4a 0%, #0d0621 100%)', // 中心圆
  wheelCenterBorder: '#7c3aed',           // 中心圆边框
  wheelDark: '#0a0418',                   // 转盘黑色扇区
  wheelLine: 'rgba(160,80,255,0.12)',     // 转盘线条
  pointer: '#c084fc',                     // 指针颜色
  pointerGlow: 'rgba(192,132,252,0.9)',   // 指针发光
  spinBtn: 'linear-gradient(180deg, #9333ea 0%, #7c3aed 50%, #5b21b6 100%)', // SPIN按钮
  spinBtnGlow: 'rgba(124,58,237,0.6)',    // SPIN按钮发光
  historyBg: 'rgba(30,10,65,0.7)',        // 历史记录背景
  historyBorder: 'rgba(80,40,160,0.3)',   // 历史记录边框
  winBorder: '#00f5a0',                   // 胜利边框
  loseBorder: '#ff4d6d',                  // 失败边框
  popupWinBg: 'linear-gradient(135deg, #0a2a1a 0%, #0d1a2e 100%)',
  popupLoseBg: 'linear-gradient(135deg, #2a0a14 0%, #1a0d2e 100%)',
};

// ── 原版倍率档位（从小到大，对应滑动条 0~21）──────────────────
const BOARD_X_VALUES = [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30];

// ── 投注档位（前端显示值，实际发送后端时 ×100）───────────────
const BET_VALUES = [1, 2, 5, 10, 20, 30, 50, 70, 100, 150, 200, 300, 400, 500, 700, 1000, 2000, 3000, 4000, 5000, 8000, 10000];

// ── 计算绿色扇区角度 ──────────────────────────────────────────
function getGreenDegree(multiplier: number, rtp: number): number {
  const winProbability = (rtp / 100) / multiplier;
  return 360 * winProbability;
}

// ── 计算绿色扇形 clip-path（与原版 drawCircle 完全一致）────────
function getGreenClipPath(circlePercent: number, radius: number): string {
  const angle = 360 * circlePercent / 100;
  const x = radius + radius * Math.cos(angle * Math.PI / 180);
  const y = radius + radius * Math.sin(angle * Math.PI / 180);

  let clipPathMiddle = `${2 * radius}px ${2 * radius}px,`;
  if (angle > 90) clipPathMiddle += `${0}px ${2 * radius}px,`;
  if (angle > 180) clipPathMiddle += `${0}px ${0}px,`;
  if (angle > 270) clipPathMiddle += `${2 * radius}px ${0}px,`;

  return `polygon(
    ${radius}px ${radius}px,
    ${2 * radius}px ${radius}px,
    ${clipPathMiddle}
    ${x}px ${y}px
  )`;
}

// ── 主组件 ──────────────────────────────────────────────────────
export default function RollX() {
  const [, navigate] = useLocation();
  const { showAlert } = useGameAlert();
  const { playClick, playWin, playLose, playSpinStop, playBetUp, playBetDown } = useSound();

  // 滑动条索引（0~21）
  const [coeffIndex, setCoeffIndex] = useState(7);
  const [betIndex, setBetIndex] = useState(1);

  const multiplier = BOARD_X_VALUES[coeffIndex];
  const betAmountDisplay = BET_VALUES[betIndex];
  const betAmount = betAmountDisplay * 100;

  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{ isWin: boolean; winAmount: number; netAmount: number; balanceAfter: number; multiplier: number; betAmount: number } | null>(null);
  const [showResult, setShowResult] = useState(false);

  const [wheelRotation, setWheelRotation] = useState(0);
  const lastSpinDegRef = useRef(0);
  const wheelRotationRef = useRef(0);
  const [greenContainerRotation, setGreenContainerRotation] = useState(0);

  const { data: settings } = trpc.rollx.getSettings.useQuery();
  const { data: player, refetch: refetchPlayer } = trpc.player.me.useQuery(undefined, { staleTime: 30_000 });
  const { data: history, refetch: refetchHistory } = trpc.rollx.getHistory.useQuery({ limit: 10 });

  const spinMutation = trpc.rollx.spin.useMutation();

  const rtp = settings?.rtp ?? 96;
  const greenDegree = getGreenDegree(multiplier, rtp);
  const greenPercent = 100 / (360 / greenDegree);

  const [wheelSize, setWheelSize] = useState(300);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [rulesVisible, setRulesVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setWheelSize(Math.min(Math.round(w * 0.78), 360));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const wheelRadius = wheelSize / 2;
  const greenClipPath = getGreenClipPath(greenPercent, wheelRadius);

  const animateSpin = useCallback((isWin: boolean, stopAngle: number, onComplete: () => void) => {
    const targetOffset = (270 - stopAngle + 360) % 360;
    const totalSpin = lastSpinDegRef.current + 1800 + targetOffset;
    lastSpinDegRef.current = Math.ceil(totalSpin / 360) * 360;
    setWheelRotation(totalSpin);
    setGreenContainerRotation(totalSpin);
    setTimeout(() => { onComplete(); }, 3200);
  }, []);

  const handleSpin = async () => {
    if (isSpinning) return;
    if (!player) { navigate('/login'); return; }
    const gold = parseFloat(player.gold);
    if (gold < betAmount) { showAlert('金币不足，请先充值！', { type: 'error', title: '余额不足' }); return; }

    setIsSpinning(true);
    setShowResult(false);
    setResult(null);

    try {
      const res = await spinMutation.mutateAsync({ betAmount, multiplier });
      // 旋转开始音效（旋转中）
      animateSpin(res.isWin, res.stopAngle, () => {
        setResult({ ...res });
        setShowResult(true);
        setIsSpinning(false);
        refetchPlayer();
        refetchHistory();
        // 旋转停止音效
        playSpinStop();
        // 中奖/失败音效（延迟200ms，等待停止音效播放完）
        setTimeout(() => {
          if (res.isWin) playWin(); else playLose();
        }, 300);
      });
    } catch (err: any) {
      setIsSpinning(false);
      showAlert(err.message || '旋转失败，请重试', { type: 'error', title: '错误' });
    }
  };

  const gold = player ? parseFloat(player.gold) : 0;
  const potentialWin = (betAmountDisplay * multiplier).toFixed(2);

  return (
    <div
      className="phone-container"
      ref={containerRef}
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
        background: 'radial-gradient(ellipse at 50% 20%, rgba(120,40,220,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(0,200,255,0.08) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ── 顶部导航 ── */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
        <TopNav showLogo={false} onBackClick={() => navigate('/')} onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
      </div>



      {/* ── 内容区 ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: q(20),
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Online 人数 + 规则按钮 */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${q(8)} ${q(20)} 0`,
            color: CYBER.textSecondary,
            fontSize: q(22),
          }}
        >
          <div
            onClick={() => setRulesVisible(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: q(6),
              cursor: 'pointer',
              padding: `${q(6)} ${q(16)}`,
              borderRadius: q(20),
              background: 'rgba(120,60,220,0.15)',
              border: `1px solid ${CYBER.border}`,
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: q(22) }}>\u2753</span>
            <span style={{ color: CYBER.accent, fontSize: q(20), fontWeight: 600 }}>\u89c4\u5219</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>Online: </span>
            <span style={{ color: CYBER.accentCyan, marginLeft: 4, textShadow: `0 0 8px ${CYBER.accentCyan}` }}>165</span>
          </div>
        </div>

        {/* ── 转盘区域 ── */}
        <div
          style={{
            position: 'relative',
            width: wheelSize,
            height: wheelSize,
            margin: `${q(16)} auto`,
            flexShrink: 0,
          }}
        >
          {/* 指针（顶部，固定不动）*/}
          <div
            style={{
              position: 'absolute',
              top: -wheelSize * 0.04,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              width: 0,
              height: 0,
              borderLeft: `${wheelSize * 0.025}px solid transparent`,
              borderRight: `${wheelSize * 0.025}px solid transparent`,
              borderTop: `${wheelSize * 0.065}px solid ${CYBER.pointer}`,
              filter: `drop-shadow(0 0 8px ${CYBER.pointerGlow})`,
            }}
          />

          {/* 转盘外圈发光环 */}
          <div
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: '50%',
              background: 'transparent',
              border: `2px solid ${CYBER.borderGlow}`,
              boxShadow: `0 0 20px rgba(120,60,220,0.6), 0 0 40px rgba(120,60,220,0.3), inset 0 0 20px rgba(120,60,220,0.1)`,
              zIndex: 4,
              pointerEvents: 'none',
            }}
          />

          {/* 转盘外圈边框 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `${wheelSize * 0.015}px solid ${CYBER.wheelBorder}`,
              zIndex: 3,
              pointerEvents: 'none',
            }}
          />

          {/* 黑色底盘（旋转）*/}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: CYBER.wheelDark,
              transform: `rotate(${wheelRotation}deg)`,
              transition: isSpinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
              zIndex: 1,
            }}
          >
            {/* 扇区纹理线条（紫色调） */}
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '50%',
                  height: 1,
                  background: CYBER.wheelLine,
                  transformOrigin: '0 0',
                  transform: `rotate(${(360 / 16) * i}deg)`,
                }}
              />
            ))}
          </div>

          {/* 霓虹绿扇形（旋转，用 clip-path 裁剪）*/}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: `rotate(${greenContainerRotation}deg)`,
              transition: isSpinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
              zIndex: 2,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: `${wheelRadius}px`,
                background: `radial-gradient(circle at 60% 60%, ${CYBER.win} 0%, ${CYBER.winDark} 40%, #006644 100%)`,
                clipPath: greenClipPath,
                boxShadow: `inset 0 0 20px ${CYBER.winGlow}`,
              }}
            />
          </div>

          {/* 中心圆（WIN / 金额显示）*/}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: wheelSize * 0.32,
              height: wheelSize * 0.32,
              borderRadius: '50%',
              background: CYBER.wheelCenter,
              border: `3px solid ${CYBER.wheelCenterBorder}`,
              boxShadow: `0 0 15px rgba(124,58,237,0.5), inset 0 0 15px rgba(80,20,160,0.3)`,
              zIndex: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {showResult && result ? (
              <>
                <div style={{ color: result.isWin ? CYBER.win : CYBER.lose, fontSize: wheelSize * 0.06, fontWeight: 700, lineHeight: 1.1, textShadow: result.isWin ? `0 0 10px ${CYBER.winGlow}` : `0 0 10px ${CYBER.loseGlow}` }}>
                  {result.isWin ? '中奖' : '未中'}
                </div>
                <div style={{ color: CYBER.textPrimary, fontSize: wheelSize * 0.055, fontWeight: 700 }}>
                  {result.isWin ? result.winAmount.toFixed(2) : (-result.netAmount).toFixed(2)}
                </div>
              </>
            ) : (
              <>
                <div style={{ color: CYBER.win, fontSize: wheelSize * 0.06, fontWeight: 700, lineHeight: 1.1, textShadow: `0 0 10px ${CYBER.winGlow}` }}>
                  可赢
                </div>
                <div style={{ color: CYBER.textPrimary, fontSize: wheelSize * 0.055, fontWeight: 700 }}>
                  {potentialWin}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── 控制区域 ── */}
        <div
          style={{
            width: '100%',
            padding: `0 ${q(30)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: q(20),
          }}
        >
          {/* 倍率滑动条 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: q(8) }}>
              <span style={{ color: CYBER.textSecondary, fontSize: q(24), letterSpacing: 1 }}>倍率</span>
              <span style={{ color: CYBER.accent, fontSize: q(30), fontWeight: 700, textShadow: `0 0 8px rgba(192,132,252,0.6)` }}>{multiplier}x</span>
            </div>
            <div style={{ position: 'relative', height: q(14) }}>
              {/* 轨道背景 */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: q(10),
                  transform: 'translateY(-50%)',
                  borderRadius: q(50),
                  background: CYBER.sliderTrack,
                  overflow: 'hidden',
                  border: `1px solid rgba(120,60,220,0.3)`,
                }}
              >
                {/* 已选择部分（紫色渐变）*/}
                <div
                  style={{
                    height: '100%',
                    width: `${(coeffIndex / (BOARD_X_VALUES.length - 1)) * 100}%`,
                    background: CYBER.sliderFill,
                    borderRadius: q(50),
                    transition: 'width 0.1s',
                    boxShadow: `0 0 8px rgba(192,132,252,0.4)`,
                  }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={BOARD_X_VALUES.length - 1}
                step={1}
                value={coeffIndex}
                disabled={isSpinning}
                onChange={e => setCoeffIndex(parseInt(e.target.value))}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: isSpinning ? 'not-allowed' : 'pointer',
                  margin: 0,
                }}
              />
              {/* 滑块 */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `calc(${(coeffIndex / (BOARD_X_VALUES.length - 1)) * 100}% - ${q(14)})`,
                  transform: 'translateY(-50%)',
                  width: q(28),
                  height: q(28),
                  borderRadius: '50%',
                  background: CYBER.sliderThumb,
                  boxShadow: `0 0 10px rgba(192,132,252,0.8), 0 2px 6px rgba(0,0,0,0.5)`,
                  pointerEvents: 'none',
                  transition: 'left 0.1s',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: q(4) }}>
              <span style={{ color: CYBER.textMuted, fontSize: q(20) }}>1.1x</span>
              <span style={{ color: CYBER.textMuted, fontSize: q(20) }}>30x</span>
            </div>
          </div>

          {/* 投注金额滑动条 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: q(8) }}>
              <span style={{ color: CYBER.textSecondary, fontSize: q(24), letterSpacing: 1 }}>投注金额</span>
              <span style={{ color: CYBER.accent, fontSize: q(30), fontWeight: 700, textShadow: `0 0 8px rgba(192,132,252,0.6)` }}>{betAmountDisplay.toFixed(2)}</span>
            </div>
            <div style={{ position: 'relative', height: q(14) }}>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: q(10),
                  transform: 'translateY(-50%)',
                  borderRadius: q(50),
                  background: CYBER.sliderTrack,
                  overflow: 'hidden',
                  border: `1px solid rgba(120,60,220,0.3)`,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(betIndex / (BET_VALUES.length - 1)) * 100}%`,
                    background: CYBER.sliderFill,
                    borderRadius: q(50),
                    transition: 'width 0.1s',
                    boxShadow: `0 0 8px rgba(192,132,252,0.4)`,
                  }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={BET_VALUES.length - 1}
                step={1}
                value={betIndex}
                disabled={isSpinning}
                onChange={e => setBetIndex(parseInt(e.target.value))}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: isSpinning ? 'not-allowed' : 'pointer',
                  margin: 0,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `calc(${(betIndex / (BET_VALUES.length - 1)) * 100}% - ${q(14)})`,
                  transform: 'translateY(-50%)',
                  width: q(28),
                  height: q(28),
                  borderRadius: '50%',
                  background: CYBER.sliderThumb,
                  boxShadow: `0 0 10px rgba(192,132,252,0.8), 0 2px 6px rgba(0,0,0,0.5)`,
                  pointerEvents: 'none',
                  transition: 'left 0.1s',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: q(4) }}>
              <span style={{ color: CYBER.textMuted, fontSize: q(20) }}>1.00</span>
              <span style={{ color: CYBER.textMuted, fontSize: q(20) }}>10000</span>
            </div>
          </div>

          {/* SPIN 按钮 */}
          <button
            onClick={() => { playClick(); handleSpin(); }}
            disabled={isSpinning}
            style={{
              width: '60%',
              alignSelf: 'center',
              padding: `${q(22)} 0`,
              borderRadius: q(60),
              border: `1px solid ${isSpinning ? 'transparent' : CYBER.borderGlow}`,
              background: isSpinning
                ? 'rgba(80,40,160,0.3)'
                : CYBER.spinBtn,
              color: isSpinning ? CYBER.textMuted : '#fff',
              fontSize: q(32),
              fontWeight: 700,
              cursor: isSpinning ? 'not-allowed' : 'pointer',
              boxShadow: isSpinning ? 'none' : `0 4px 24px ${CYBER.spinBtnGlow}, 0 0 40px rgba(124,58,237,0.3)`,
              letterSpacing: 3,
              textShadow: isSpinning ? 'none' : '0 0 12px rgba(255,255,255,0.5)',
              transition: 'all 0.2s',
            }}
          >
            {isSpinning ? '转中...' : '旋转'}
          </button>

          {/* 余额显示 */}
          <div
            style={{
              textAlign: 'center',
              color: CYBER.textSecondary,
              fontSize: q(24),
              paddingBottom: q(8),
            }}
          >
            余额：{' '}
            <span style={{ color: CYBER.accentCyan, fontWeight: 600, textShadow: `0 0 8px rgba(34,211,238,0.5)` }}>
              {gold.toFixed(2)}
            </span>
          </div>

          {/* 历史记录（简洁版）*/}
          {history && history.length > 0 && (
            <div style={{ marginTop: q(8) }}>
              <div style={{ color: CYBER.textMuted, fontSize: q(22), marginBottom: q(10), textAlign: 'center', letterSpacing: 2 }}>
                最近投注
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: q(6) }}>
                {history.slice(0, 6).map(h => (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: `${q(10)} ${q(16)}`,
                      background: CYBER.historyBg,
                      borderRadius: q(8),
                      fontSize: q(22),
                      border: `1px solid ${CYBER.historyBorder}`,
                      borderLeft: `3px solid ${h.isWin ? CYBER.win : CYBER.lose}`,
                      boxShadow: h.isWin
                        ? `inset 0 0 10px rgba(0,245,160,0.05)`
                        : `inset 0 0 10px rgba(255,77,109,0.05)`,
                    }}
                  >
                    <span style={{ color: CYBER.textSecondary }}>{h.multiplier}x</span>
                    <span style={{ color: CYBER.textSecondary }}>{(h.betAmount / 100).toFixed(2)}</span>
                    <span style={{ color: h.isWin ? CYBER.win : CYBER.lose, fontWeight: 700, textShadow: h.isWin ? `0 0 6px ${CYBER.winGlow}` : `0 0 6px ${CYBER.loseGlow}` }}>
                      {h.isWin ? `+${(h.winAmount / 100).toFixed(2)}` : `-${(h.betAmount / 100).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 底部导航 ── */}
      <BottomNav />

      {/* 设置弹窗 */}
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      {/* 规则说明弹窗 */}
      {rulesVisible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5,2,20,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(6px)',
          }}
          onClick={() => setRulesVisible(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(26,8,64,0.98) 0%, rgba(13,6,33,0.99) 100%)',
              border: `2px solid ${CYBER.border}`,
              borderRadius: 20,
              padding: '28px 24px',
              maxWidth: 380,
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: `0 0 40px rgba(120,60,220,0.3), 0 0 80px rgba(120,60,220,0.1)`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 标题 */}
            <div style={{
              textAlign: 'center',
              marginBottom: 20,
            }}>
              <div style={{
                fontSize: 22,
                fontWeight: 900,
                color: CYBER.accent,
                letterSpacing: 2,
                textShadow: `0 0 12px rgba(192,132,252,0.5)`,
                marginBottom: 4,
              }}>ROLL-X 规则说明</div>
              <div style={{ width: 60, height: 2, background: `linear-gradient(90deg, transparent, ${CYBER.accent}, transparent)`, margin: '0 auto' }} />
            </div>

            {/* 规则内容 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 游戏简介 */}
              <div>
                <div style={{ color: CYBER.accentCyan, fontSize: 14, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>\ud83c\udfb0</span> 游戏简介
                </div>
                <div style={{ color: CYBER.textPrimary, fontSize: 13, lineHeight: 1.7 }}>
                  ROLL-X 是一款刺激的转盘博弈游戏。转盘分为<span style={{ color: CYBER.win, fontWeight: 700 }}>绿色（胜利）</span>和<span style={{ color: '#555', fontWeight: 700 }}>黑色（失败）</span>两个区域。指针停在绿色区域即为中奖，停在黑色区域则未中奖。
                </div>
              </div>

              {/* 倍率说明 */}
              <div>
                <div style={{ color: CYBER.accentCyan, fontSize: 14, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>\ud83d\udcc8</span> 倍率说明
                </div>
                <div style={{ color: CYBER.textPrimary, fontSize: 13, lineHeight: 1.7 }}>
                  倍率范围为 <span style={{ color: CYBER.accent, fontWeight: 700 }}>1.1x ~ 30x</span>。倍率越高，绿色区域越小，中奖概率越低，但中奖后的收益越高。
                </div>
                <div style={{
                  marginTop: 8,
                  padding: '10px 12px',
                  background: 'rgba(120,60,220,0.1)',
                  borderRadius: 8,
                  border: `1px solid rgba(120,60,220,0.2)`,
                }}>
                  <div style={{ color: CYBER.textSecondary, fontSize: 12, lineHeight: 1.8 }}>
                    <div>\u2022 <span style={{ color: CYBER.win }}>1.1x</span> → 绿色区域最大，胜率最高</div>
                    <div>\u2022 <span style={{ color: '#fbbf24' }}>2x~5x</span> → 中等倍率，攻守平衡</div>
                    <div>\u2022 <span style={{ color: CYBER.lose }}>10x~30x</span> → 高倍率高回报，但胜率较低</div>
                  </div>
                </div>
              </div>

              {/* 投注规则 */}
              <div>
                <div style={{ color: CYBER.accentCyan, fontSize: 14, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>\ud83d\udcb0</span> 投注规则
                </div>
                <div style={{ color: CYBER.textPrimary, fontSize: 13, lineHeight: 1.7 }}>
                  投注范围为 <span style={{ color: CYBER.accent, fontWeight: 700 }}>1.00 ~ 10,000.00</span> 金币。每次旋转前请确认您的倍率和投注金额。
                </div>
              </div>

              {/* 中奖计算 */}
              <div>
                <div style={{ color: CYBER.accentCyan, fontSize: 14, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>\ud83c\udfc6</span> 中奖计算
                </div>
                <div style={{ color: CYBER.textPrimary, fontSize: 13, lineHeight: 1.7 }}>
                  中奖金额 = 投注金额 \u00d7 倍率
                </div>
                <div style={{
                  marginTop: 8,
                  padding: '10px 12px',
                  background: 'rgba(0,245,160,0.06)',
                  borderRadius: 8,
                  border: `1px solid rgba(0,245,160,0.15)`,
                }}>
                  <div style={{ color: CYBER.textSecondary, fontSize: 12, lineHeight: 1.8 }}>
                    <div>例如：投注 <span style={{ color: CYBER.accent }}>100</span> 金币，倍率 <span style={{ color: CYBER.accent }}>2x</span></div>
                    <div>→ 中奖可获得 <span style={{ color: CYBER.win, fontWeight: 700 }}>200</span> 金币（净赚 100）</div>
                    <div>→ 未中奖则失去 <span style={{ color: CYBER.lose, fontWeight: 700 }}>100</span> 金币</div>
                  </div>
                </div>
              </div>

              {/* 温馨提示 */}
              <div style={{
                padding: '12px 14px',
                background: 'rgba(245,158,11,0.08)',
                borderRadius: 10,
                border: '1px solid rgba(245,158,11,0.2)',
              }}>
                <div style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>\u26a0\ufe0f</span> 温馨提示
                </div>
                <div style={{ color: 'rgba(245,158,11,0.8)', fontSize: 12, lineHeight: 1.7 }}>
                  请理性游戏，合理控制投注金额。游戏结果由服务器随机生成，确保公平公正。
                </div>
              </div>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={() => setRulesVisible(false)}
              style={{
                display: 'block',
                margin: '20px auto 0',
                padding: '10px 40px',
                borderRadius: 30,
                border: `1px solid ${CYBER.border}`,
                background: CYBER.spinBtn,
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: `0 0 15px ${CYBER.spinBtnGlow}`,
                letterSpacing: 2,
              }}
            >
              我知道了
            </button>
          </div>
        </div>
      )}
      {/* 结果弹窗 */}
      {showResult && result && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5,2,20,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowResult(false)}
        >
          <div
            style={{
              background: result.isWin ? CYBER.popupWinBg : CYBER.popupLoseBg,
              border: `2px solid ${result.isWin ? CYBER.win : CYBER.lose}`,
              borderRadius: 16,
              padding: '32px 48px',
              textAlign: 'center',
              boxShadow: result.isWin
                ? `0 0 40px ${CYBER.winGlow}, 0 0 80px rgba(0,245,160,0.2)`
                : `0 0 40px ${CYBER.loseGlow}, 0 0 80px rgba(255,77,109,0.2)`,
              minWidth: 220,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              fontSize: 36,
              fontWeight: 900,
              color: result.isWin ? CYBER.win : CYBER.lose,
              marginBottom: 12,
              textShadow: result.isWin ? `0 0 20px ${CYBER.winGlow}` : `0 0 20px ${CYBER.loseGlow}`,
              letterSpacing: 2,
            }}>
              {result.isWin ? '恭喜中奖！' : '未中奖'}
            </div>
            <div style={{ color: CYBER.textPrimary, fontSize: 22, marginBottom: 6 }}>
              {result.isWin
                ? `+${(result.winAmount / 100).toFixed(2)}`
                : `-${(Math.abs(result.netAmount) / 100).toFixed(2)}`}
            </div>
            <div style={{ color: CYBER.textSecondary, fontSize: 14, marginBottom: 20 }}>
              余额：{(result.balanceAfter / 100).toFixed(2)}
            </div>
            <button
              onClick={() => setShowResult(false)}
              style={{
                padding: '10px 32px',
                borderRadius: 30,
                border: `1px solid ${result.isWin ? CYBER.win : CYBER.lose}`,
                background: result.isWin
                  ? 'linear-gradient(135deg, #006644 0%, #00b36e 100%)'
                  : 'linear-gradient(135deg, #7c1a2e 0%, #cc1a38 100%)',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: result.isWin ? `0 0 15px ${CYBER.winGlow}` : `0 0 15px ${CYBER.loseGlow}`,
                letterSpacing: 1,
              }}
            >
              继续
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
