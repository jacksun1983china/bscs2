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
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import { useGameAlert } from '@/components/GameAlert';
import { useLocation } from 'wouter';

// ── px → cqw 转换（基准 750px）──────────────────────────────────
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

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

  // 滑动条索引（0~21）
  const [coeffIndex, setCoeffIndex] = useState(7); // 默认 1.4x（index 3 in BOARD_X_VALUES）
  const [betIndex, setBetIndex] = useState(1);      // 默认 0.2

  const multiplier = BOARD_X_VALUES[coeffIndex];
  const betAmountDisplay = BET_VALUES[betIndex]; // 前端显示金额
  const betAmount = betAmountDisplay * 100;       // 实际发送后端的金额

  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{ isWin: boolean; winAmount: number; netAmount: number; balanceAfter: number; multiplier: number; betAmount: number } | null>(null);
  const [showResult, setShowResult] = useState(false);

  // 转盘旋转角度（CSS transform rotate）
  const [wheelRotation, setWheelRotation] = useState(0);
  const lastSpinDegRef = useRef(0);
  const wheelRotationRef = useRef(0);

  // 绿色扇形 clip-path 旋转角度（跟随转盘）
  const [greenContainerRotation, setGreenContainerRotation] = useState(0);

  // 获取游戏设置
  const { data: settings } = trpc.rollx.getSettings.useQuery();
  // 获取玩家信息（余额）
  const { data: player, refetch: refetchPlayer } = trpc.player.me.useQuery();
  // 获取历史记录
  const { data: history, refetch: refetchHistory } = trpc.rollx.getHistory.useQuery({ limit: 10 });

  // 旋转 mutation
  const spinMutation = trpc.rollx.spin.useMutation();

  // RTP（从服务端获取，默认96）
  const rtp = settings?.rtp ?? 96;
  const greenDegree = getGreenDegree(multiplier, rtp);
  const greenPercent = 100 / (360 / greenDegree);

  // 转盘尺寸（响应式）
  const [wheelSize, setWheelSize] = useState(300);
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

  // 绿色扇形 clip-path
  const greenClipPath = getGreenClipPath(greenPercent, wheelRadius);

  // 执行旋转动画
  // 转盘坐标系：绿色扇区从 3点方向（0度）开始顺时针
  // 指针固定在顶部，对应转盘的 270度位置
  // 要让指针停在 stopAngle 处：转盘需要旋转到 (270 - stopAngle) mod 360
  const animateSpin = useCallback((isWin: boolean, stopAngle: number, onComplete: () => void) => {
    const targetOffset = (270 - stopAngle + 360) % 360;
    const totalSpin = lastSpinDegRef.current + 1800 + targetOffset;

    lastSpinDegRef.current = Math.ceil(totalSpin / 360) * 360;

    setWheelRotation(totalSpin);
    setGreenContainerRotation(totalSpin);

    setTimeout(() => {
      onComplete();
    }, 3200);
  }, []);

  // 点击旋转
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
      animateSpin(res.isWin, res.stopAngle, () => {
        setResult({ ...res });
        setShowResult(true);
        setIsSpinning(false);
        refetchPlayer();
        refetchHistory();
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
        background: '#282828',
        minHeight: '100vh',
      }}
    >
      {/* ── 顶部导航 ── */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, width: '100%' }}>
        <TopNav showLogo={false} onBackClick={() => navigate('/')} />
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
        }}
      >
        {/* Online 人数 */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'flex-end',
            padding: `${q(8)} ${q(20)} 0`,
            color: '#aaa',
            fontSize: q(22),
          }}
        >
          <span>Online: </span>
          <span style={{ color: '#fff', marginLeft: 4 }}>165</span>
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
              borderTop: `${wheelSize * 0.065}px solid #ff4444`,
              filter: 'drop-shadow(0 0 6px rgba(255,68,68,0.8))',
            }}
          />

          {/* 转盘外圈（灰色边框）*/}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `${wheelSize * 0.015}px solid #555`,
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
              background: '#1a1a1a',
              transform: `rotate(${wheelRotation}deg)`,
              transition: isSpinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
              zIndex: 1,
            }}
          >
            {/* 黑色扇区纹理线条 */}
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '50%',
                  height: 1,
                  background: 'rgba(255,255,255,0.06)',
                  transformOrigin: '0 0',
                  transform: `rotate(${(360 / 16) * i}deg)`,
                }}
              />
            ))}
          </div>

          {/* 绿色扇形（旋转，用 clip-path 裁剪）*/}
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
                background: 'radial-gradient(circle at 60% 60%, #5dde5d 0%, #2db82d 40%, #1a8a1a 100%)',
                clipPath: greenClipPath,
                boxShadow: 'inset 0 0 20px rgba(0,255,0,0.3)',
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
              background: 'radial-gradient(circle, #3a3a3a 0%, #222 100%)',
              border: '3px solid #555',
              zIndex: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0,0,0,0.8), inset 0 0 15px rgba(0,0,0,0.5)',
            }}
          >
            {showResult && result ? (
              <>
                <div style={{ color: result.isWin ? '#5dde5d' : '#ff4444', fontSize: wheelSize * 0.06, fontWeight: 700, lineHeight: 1.1 }}>
                  {result.isWin ? 'WIN' : 'LOSE'}
                </div>
                <div style={{ color: '#fff', fontSize: wheelSize * 0.055, fontWeight: 700 }}>
                  {result.isWin ? result.winAmount.toFixed(2) : (-result.netAmount).toFixed(2)}
                </div>
              </>
            ) : (
              <>
                <div style={{ color: '#5dde5d', fontSize: wheelSize * 0.06, fontWeight: 700, lineHeight: 1.1 }}>
                  WIN
                </div>
                <div style={{ color: '#fff', fontSize: wheelSize * 0.055, fontWeight: 700 }}>
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
              <span style={{ color: '#aaa', fontSize: q(24) }}>MULTIPLIER</span>
              <span style={{ color: '#fff', fontSize: q(30), fontWeight: 700 }}>{multiplier}x</span>
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
                  background: '#444',
                  overflow: 'hidden',
                }}
              >
                {/* 已选择部分（橙红渐变）*/}
                <div
                  style={{
                    height: '100%',
                    width: `${(coeffIndex / (BOARD_X_VALUES.length - 1)) * 100}%`,
                    background: 'linear-gradient(90deg, #ff6b35 0%, #ff4500 100%)',
                    borderRadius: q(50),
                    transition: 'width 0.1s',
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
                  background: '#fff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  transition: 'left 0.1s',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: q(4) }}>
              <span style={{ color: '#666', fontSize: q(20) }}>1.1x</span>
              <span style={{ color: '#666', fontSize: q(20) }}>30x</span>
            </div>
          </div>

          {/* 投注金额滑动条 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: q(8) }}>
              <span style={{ color: '#aaa', fontSize: q(24) }}>BET AMOUNT</span>
              <span style={{ color: '#fff', fontSize: q(30), fontWeight: 700 }}>{betAmountDisplay.toFixed(2)}</span>
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
                  background: '#444',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(betIndex / (BET_VALUES.length - 1)) * 100}%`,
                    background: 'linear-gradient(90deg, #ff6b35 0%, #ff4500 100%)',
                    borderRadius: q(50),
                    transition: 'width 0.1s',
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
                  background: '#fff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  transition: 'left 0.1s',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: q(4) }}>
              <span style={{ color: '#666', fontSize: q(20) }}>1.00</span>
              <span style={{ color: '#666', fontSize: q(20) }}>10000</span>
            </div>
          </div>

          {/* SPIN 按钮 */}
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            style={{
              width: '60%',
              alignSelf: 'center',
              padding: `${q(22)} 0`,
              borderRadius: q(60),
              border: 'none',
              background: isSpinning
                ? '#555'
                : 'linear-gradient(180deg, #5dde5d 0%, #2db82d 50%, #1a8a1a 100%)',
              color: '#fff',
              fontSize: q(32),
              fontWeight: 700,
              cursor: isSpinning ? 'not-allowed' : 'pointer',
              boxShadow: isSpinning ? 'none' : '0 4px 20px rgba(45,184,45,0.5)',
              letterSpacing: 3,
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              transition: 'all 0.2s',
            }}
          >
            {isSpinning ? '...' : 'SPIN'}
          </button>

          {/* 余额显示 */}
          <div
            style={{
              textAlign: 'center',
              color: '#aaa',
              fontSize: q(24),
              paddingBottom: q(8),
            }}
          >
            BALANCE:{' '}
            <span style={{ color: '#fff', fontWeight: 600 }}>
              {gold.toFixed(2)}
            </span>
          </div>

          {/* 历史记录（简洁版）*/}
          {history && history.length > 0 && (
            <div style={{ marginTop: q(8) }}>
              <div style={{ color: '#666', fontSize: q(22), marginBottom: q(10), textAlign: 'center' }}>
                RECENT BETS
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
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: q(8),
                      fontSize: q(22),
                      borderLeft: `3px solid ${h.isWin ? '#2db82d' : '#cc3333'}`,
                    }}
                  >
                    <span style={{ color: '#888' }}>{h.multiplier}x</span>
                    <span style={{ color: '#888' }}>{(h.betAmount / 100).toFixed(2)}</span>
                    <span style={{ color: h.isWin ? '#5dde5d' : '#ff5555', fontWeight: 700 }}>
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

      {/* ── 结果弹窗 ── */}
      {showResult && result && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowResult(false)}
        >
          <div
            style={{
              background: result.isWin ? '#1a3a1a' : '#3a1a1a',
              border: `2px solid ${result.isWin ? '#2db82d' : '#cc3333'}`,
              borderRadius: 16,
              padding: '32px 48px',
              textAlign: 'center',
              boxShadow: result.isWin
                ? '0 0 40px rgba(45,184,45,0.5)'
                : '0 0 40px rgba(204,51,51,0.5)',
              minWidth: 220,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              fontSize: 36,
              fontWeight: 900,
              color: result.isWin ? '#5dde5d' : '#ff5555',
              marginBottom: 12,
            }}>
              {result.isWin ? 'YOU WIN!' : 'YOU LOSE'}
            </div>
            <div style={{ color: '#fff', fontSize: 22, marginBottom: 6 }}>
              {result.isWin
                ? `+${(result.winAmount / 100).toFixed(2)}`
                : `-${(Math.abs(result.netAmount) / 100).toFixed(2)}`}
            </div>
            <div style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>
              Balance: {(result.balanceAfter / 100).toFixed(2)}
            </div>
            <button
              onClick={() => setShowResult(false)}
              style={{
                padding: '10px 32px',
                borderRadius: 30,
                border: 'none',
                background: result.isWin ? '#2db82d' : '#cc3333',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
