/**
 * ArenaRoom.tsx — 竞技场游戏房间页
 *
 * 新增功能：
 * 1. 开场碰撞动画（ArenaIntroAnimation）：游戏开始/回放开始时触发
 * 2. 跳过动画按钮：游戏进行中和回放模式均可一键跳过到最终结果
 * 3. 实时累计价值：每轮老虎机停止后，玩家座位卡片下方实时累加总价值
 * 4. 头像修复：使用 getAvatarUrl() 统一处理系统头像ID和URL格式
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { playSlotSpin, stopSlotSpin, playSlotStop, playWinFanfare, playLoseTone } from '@/lib/arenaSound';
import { useLocation, useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import SettingsModal from '@/components/SettingsModal';
import { useArenaWS } from '@/hooks/useArenaWS';
import ArenaIntroAnimation from '@/components/ArenaIntroAnimation';
import { getAvatarUrl } from '@/lib/assets';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// 品质颜色和标签
const LEVEL_BG: Record<number, string> = {
  1: 'linear-gradient(135deg,#c8860a,#f5c842)',
  2: 'linear-gradient(135deg,#6a0dad,#c084fc)',
  3: 'linear-gradient(135deg,#1a4fa8,#60a5fa)',
  4: 'linear-gradient(135deg,#4a4a4a,#9a9a9a)',
};
const LEVEL_LABEL: Record<number, string> = { 1: '传说', 2: '稀有', 3: '普通', 4: '回收' };
const LEVEL_GLOW: Record<number, string> = {
  1: 'rgba(245,200,66,0.6)',
  2: 'rgba(192,132,252,0.6)',
  3: 'rgba(96,165,250,0.4)',
  4: 'rgba(156,163,175,0.3)',
};

// ── 老虎机滚动动画组件 ────────────────────────────────────────────────────────

// ── 简洁可靠的 SlotMachine：用 CSS animation 实现滚动，不依赖复杂的 translateY 计算 ──

const ITEM_HEIGHT_NORMAL = 120; // 2人模式每个道具格子的高度
const ITEM_HEIGHT_COMPACT = 90; // 3人模式每个道具格子的高度

interface SlotMachineProps {
  finalItem: {
    goodsId: number;
    goodsName: string;
    goodsImage: string;
    goodsLevel: number;
    goodsValue: string;
  } | null;
  spinning: boolean;
  onDone?: () => void;
  width?: string;
  skipAnim?: boolean;
  reelItems?: Array<{ id: number; name: string; imageUrl: string; goodsLevel: number }>;
  /** 紧凑模式（3人竞技场） */
  compact?: boolean;
}

function SlotMachine({ finalItem, spinning, onDone, width = '100%', skipAnim = false, reelItems = [], compact = false }: SlotMachineProps) {
  const ITEM_HEIGHT_PX = compact ? ITEM_HEIGHT_COMPACT : ITEM_HEIGHT_NORMAL;
  const imgSize = compact ? 48 : 64;
  const doneImgSize = compact ? 70 : 100;
  const doneFontSize = compact ? 11 : 13;
  const doneNameSize = compact ? 12 : 14;
  const doneValueSize = compact ? 14 : 16;
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'done'>('idle');
  const [displayItem, setDisplayItem] = useState<typeof finalItem>(null);
  const [reel, setReel] = useState<Array<{ id: number; name: string; imageUrl: string; goodsLevel: number }>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const FALLBACK_POOL = [
    { id: -1, name: '传说武器', imageUrl: '', goodsLevel: 1 },
    { id: -2, name: '稀有装备', imageUrl: '', goodsLevel: 2 },
    { id: -3, name: '普通道具', imageUrl: '', goodsLevel: 3 },
    { id: -4, name: '回收物品', imageUrl: '', goodsLevel: 4 },
    { id: -5, name: '神秘宝箱', imageUrl: '', goodsLevel: 2 },
    { id: -6, name: '限定皮肤', imageUrl: '', goodsLevel: 1 },
  ];

  // 跳过动画
  useEffect(() => {
    if (skipAnim && finalItem) {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopSlotSpin(); // 跳过时也停止旋转音效
      setPhase('done');
      setDisplayItem(finalItem);
      onDone?.();
    }
  }, [skipAnim]);

  // spinning=true 但 finalItem=null 时立即完成
  useEffect(() => {
    if (spinning && !finalItem && !skipAnim) {
      onDone?.();
    }
  }, [spinning, finalItem]);

  // 开始旋转
  useEffect(() => {
    if (!spinning || !finalItem || skipAnim) return;

    const pool = reelItems.length > 0 ? reelItems : FALLBACK_POOL;
    // 构建卷轴：目标道具在前部（第2格=中间可见位置），随机道具在后面（滚动过程中显示）
    // 方向：从上往下转（物品从上方滚入，向下方滚出）
    const newReel: typeof reel = [];
    // 第1格：随机填充（顶部不可见）
    newReel.push(pool[Math.floor(Math.random() * pool.length)]);
    // 第2格：目标道具（最终停在中间可见位置）
    newReel.push({ id: finalItem.goodsId, name: finalItem.goodsName, imageUrl: finalItem.goodsImage, goodsLevel: finalItem.goodsLevel });
    // 第3格：随机填充（底部不可见）
    newReel.push(pool[Math.floor(Math.random() * pool.length)]);
    // 后20格：随机道具（滚动过程中从上方滚入）
    for (let i = 0; i < 20; i++) {
      newReel.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    setReel(newReel);
    setPhase('spinning');
    setDisplayItem(null);
    // 播放旋转音效
    playSlotSpin();

    // 2.6s 后停止并显示结果
    timerRef.current = setTimeout(() => {
      stopSlotSpin(); // 停止旋转音效
      playSlotStop(finalItem.goodsLevel);
      setPhase('done');
      setDisplayItem(finalItem);
      timerRef.current = setTimeout(() => {
        onDone?.();
      }, 300);
    }, 2600);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); stopSlotSpin(); };
  }, [spinning, finalItem]);

  // 重置：当 spinning=false 且 finalItem=null 时回到 idle
  useEffect(() => {
    if (!spinning && !finalItem) {
      setPhase('idle');
      setDisplayItem(null);
    }
  }, [spinning, finalItem]);

  const glowAnimClass = phase === 'done' && displayItem?.goodsLevel === 1
    ? 'arena-legendary-glow'
    : phase === 'done' && displayItem?.goodsLevel === 2
      ? 'arena-rare-pulse'
      : '';

  const totalH = `${ITEM_HEIGHT_PX * 3}px`;
  // 卷轴总高度 = 23格（1+1+1+20）
  const reelTotalH = reel.length * ITEM_HEIGHT_PX;
  // 从上往下转：初始显示最后3格（随机道具），动画结束时滚动到前3格（目标在第2格=中间）
  // 初始 translateY = -(reel.length - 3) * ITEM_HEIGHT_PX，结束 translateY = 0
  const scrollDist = (reel.length - 3) * ITEM_HEIGHT_PX;

  return (
    <div
      className={glowAnimClass}
      style={{
        width,
        background: phase === 'done'
          ? LEVEL_BG[displayItem?.goodsLevel ?? 3]
          : 'rgba(12,4,30,0.95)',
        border: `2px solid ${
          phase === 'done'
            ? LEVEL_GLOW[displayItem?.goodsLevel ?? 3].replace('0.6)', '1)').replace('0.4)', '1)').replace('0.3)', '1)')
            : 'rgba(120,60,220,0.5)'
        }`,
        borderRadius: q(12),
        textAlign: 'center',
        transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s',
        boxShadow: phase === 'done'
          ? displayItem?.goodsLevel === 1
            ? `0 0 30px rgba(245,200,66,0.8), 0 0 60px rgba(245,200,66,0.4)`
            : displayItem?.goodsLevel === 2
              ? `0 0 25px rgba(192,132,252,0.8), 0 0 50px rgba(192,132,252,0.4)`
              : `0 0 15px ${LEVEL_GLOW[displayItem?.goodsLevel ?? 3]}`
          : '0 0 8px rgba(80,20,160,0.4)',
        position: 'relative',
        overflow: 'hidden',
        height: phase === 'done' ? 'auto' : totalH,
        minHeight: phase === 'done' ? `${ITEM_HEIGHT_PX + 60}px` : totalH,
      }}
    >
      {/* 滚动动画 CSS */}
      <style>{`
        @keyframes slotSpin_${reel.length} {
          0%   { transform: translateY(-${scrollDist}px); }
          100% { transform: translateY(0); }
        }
      `}</style>

      {/* 卷轴滚动区域 */}
      {phase === 'spinning' && reel.length > 0 && (
        <>
          {/* 顶部/底部渐变遮罩 */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '33%', background: 'linear-gradient(to bottom, rgba(12,4,30,0.95) 0%, transparent 100%)', zIndex: 3, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '33%', background: 'linear-gradient(to top, rgba(12,4,30,0.95) 0%, transparent 100%)', zIndex: 3, pointerEvents: 'none' }} />
          {/* 中间高亮选中框 */}
          <div style={{
            position: 'absolute', left: 4, right: 4,
            top: `${ITEM_HEIGHT_PX}px`,
            height: `${ITEM_HEIGHT_PX}px`,
            border: '2px solid rgba(192,132,252,0.9)',
            boxShadow: '0 0 16px rgba(192,132,252,0.6), inset 0 0 10px rgba(192,132,252,0.15)',
            zIndex: 4, pointerEvents: 'none',
            borderRadius: 8,
          }} />
          {/* 卷轴列表 */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            animation: `slotSpin_${reel.length} 2.6s cubic-bezier(0.15, 0.0, 0.1, 1.0) forwards`,
            willChange: 'transform',
          }}>
            {reel.map((item, idx) => (
              <div key={idx} style={{
                width: '100%',
                height: `${ITEM_HEIGHT_PX}px`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                padding: '6px 4px',
                boxSizing: 'border-box',
              }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name}
                    style={{ width: imgSize, height: imgSize, objectFit: 'contain', marginBottom: 4, display: 'block' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div style={{
                    width: imgSize, height: imgSize, marginBottom: 4,
                    background: LEVEL_BG[item.goodsLevel] || 'rgba(120,60,220,0.3)',
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: compact ? 20 : 28, flexShrink: 0,
                  }}>🎁</div>
                )}
                <div style={{
                  color: '#e0d0ff', fontSize: 12, fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  width: '90%', textAlign: 'center',
                }}>{item.name}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 最终结果展示 */}
      {phase === 'done' && displayItem && (
        <div style={{
          padding: compact ? '10px 6px' : '16px 12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {displayItem.goodsLevel === 1 && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse at 50% 30%, rgba(245,200,66,0.3) 0%, transparent 70%)',
              animation: 'arenaPulse 1.2s ease-in-out infinite',
            }} />
          )}
          {displayItem.goodsLevel === 2 && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse at 50% 30%, rgba(192,132,252,0.2) 0%, transparent 70%)',
              animation: 'arenaPulse 1.5s ease-in-out infinite',
            }} />
          )}
          <div style={{ width: doneImgSize, height: doneImgSize, marginBottom: compact ? 4 : 8, position: 'relative', zIndex: 1 }}>
            {displayItem.goodsImage ? (
              <img src={displayItem.goodsImage} alt={displayItem.goodsName}
                style={{ width: '100%', height: '100%', objectFit: 'contain',
                  filter: displayItem.goodsLevel === 1 ? 'drop-shadow(0 0 12px rgba(245,200,66,0.8))'
                    : displayItem.goodsLevel === 2 ? 'drop-shadow(0 0 10px rgba(192,132,252,0.8))' : 'none',
                }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: LEVEL_BG[displayItem.goodsLevel],
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 40,
              }}>🎁</div>
            )}
          </div>
          <div style={{
            display: 'inline-block', padding: compact ? '2px 8px' : '3px 12px',
            background: 'rgba(0,0,0,0.4)', borderRadius: 4,
            color: '#fff', fontSize: doneFontSize, fontWeight: 700, marginBottom: compact ? 3 : 6, zIndex: 1, position: 'relative',
          }}>
            {LEVEL_LABEL[displayItem.goodsLevel]}
          </div>
          <div style={{
            color: '#fff', fontSize: doneNameSize, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            width: '90%', zIndex: 1, position: 'relative', textAlign: 'center',
          }}>
            {displayItem.goodsName}
          </div>
          <div style={{ color: '#ffd700', fontSize: doneValueSize, fontWeight: 700, marginTop: compact ? 3 : 6, zIndex: 1, position: 'relative' }}>
            ¥{parseFloat(displayItem.goodsValue).toFixed(2)}
          </div>
        </div>
      )}

      {/* 等待状态 */}
      {phase === 'idle' && (
        <div style={{
          height: `${ITEM_HEIGHT_PX * 3}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(192,132,252,0.4)', fontSize: compact ? 12 : 14,
        }}>等待开始</div>
      )}
    </div>
  );
}

// ── 玩家座位卡片 ──────────────────────────────────────────────────────────────

interface PlayerSeatProps {
  player?: {
    playerId: number;
    nickname: string;
    avatar: string;
    seatNo: number;
    totalValue?: string;
    isWinner?: number;
  };
  seatNo: number;
  isEmpty?: boolean;
  isWinner?: boolean;
  isDraw?: boolean;
  /** 实时累计价値（游戏进行中） */
  liveValue?: number;
  /** 显示加入按钮（空座位且房间等待中） */
  showJoinBtn?: boolean;
  /** 加入按钮点击回调 */
  onJoin?: () => void;
  /** 加入中加载状态 */
  joinLoading?: boolean;
  /** 紧凑模式（3人竞技场） */
  compact?: boolean;
}

/** 数字滚动动画组件：从旧值滚动到新值 */
function AnimatedValue({ value, duration = 800, style }: { value: number; duration?: number; style?: React.CSSProperties }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const diff = to - from;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + diff * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return <span style={style}>¥{display.toFixed(2)}</span>;
}

function PlayerSeat({ player, seatNo, isEmpty = false, isWinner = false, isDraw = false, liveValue, showJoinBtn = false, onJoin, joinLoading = false, compact = false }: PlayerSeatProps) {
  // 价值变化时触发数字跳动动画
  const [prevValue, setPrevValue] = useState(liveValue ?? 0);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (liveValue !== undefined && liveValue !== prevValue) {
      setBump(true);
      setPrevValue(liveValue);
      setTimeout(() => setBump(false), 400);
    }
  }, [liveValue]);

  return (
    <div style={{
      flex: 1,
      background: isWinner
        ? 'linear-gradient(135deg,rgba(245,200,66,0.3),rgba(200,134,10,0.2))'
        : isEmpty
          ? 'rgba(20,8,50,0.5)'
          : 'rgba(30,10,65,0.8)',
      border: `2px solid ${isWinner ? '#f5c842' : isDraw ? '#9ca3af' : isEmpty ? 'rgba(120,60,220,0.2)' : 'rgba(120,60,220,0.4)'}`,
      borderRadius: q(12), padding: compact ? q(8) : q(12),
      textAlign: 'center',
      boxShadow: isWinner ? '0 0 20px rgba(245,200,66,0.5)' : isDraw ? '0 0 12px rgba(156,163,175,0.3)' : 'none',
      position: 'relative',
      transition: 'box-shadow 0.3s ease',
      minWidth: 0,
    }}>
      {(isWinner || isDraw) && (
        <div style={{
          position: 'absolute', top: q(-12), left: '50%', transform: 'translateX(-50%)',
          background: isDraw
            ? 'linear-gradient(135deg,#6b7280,#9ca3af)'
            : 'linear-gradient(135deg,#f5c842,#c8860a)',
          borderRadius: q(10), padding: `${q(2)} ${q(12)}`,
          color: '#fff', fontSize: q(18), fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>{isDraw ? '🤝 平局' : '👑 胜利'}</div>
      )}
      {isEmpty ? (
        <>
          <div style={{
            width: compact ? q(44) : q(60), height: compact ? q(44) : q(60), borderRadius: '50%',
            background: 'rgba(120,60,220,0.15)',
            border: '2px dashed rgba(120,60,220,0.3)',
            margin: '0 auto', marginBottom: compact ? q(4) : q(8),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#6b7280', fontSize: compact ? q(22) : q(28) }}>?</span>
          </div>
          <div style={{ color: '#6b7280', fontSize: compact ? q(18) : q(22) }}>等待加入</div>
          {showJoinBtn && (
            <button
              onClick={(e) => { e.stopPropagation(); onJoin?.(); }}
              disabled={joinLoading}
              style={{
                marginTop: q(8),
                padding: `${q(6)} ${q(16)}`,
                background: joinLoading ? 'rgba(120,60,220,0.2)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                border: '1px solid rgba(192,132,252,0.6)',
                borderRadius: q(8),
                color: '#fff',
                fontSize: q(20),
                fontWeight: 700,
                cursor: joinLoading ? 'not-allowed' : 'pointer',
                opacity: joinLoading ? 0.6 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {joinLoading ? '加入中...' : '加入'}
            </button>
          )}
        </>
      ) : (
        <>
          <img
            src={getAvatarUrl(player?.avatar)}
            alt=""
            style={{
              width: compact ? q(44) : q(60), height: compact ? q(44) : q(60), borderRadius: '50%',
              border: `2px solid ${isWinner ? '#f5c842' : 'rgba(120,60,220,0.5)'}`,
              marginBottom: compact ? q(4) : q(8),
              objectFit: 'cover',
            }}
          />
          <div style={{ color: '#e0d0ff', fontSize: compact ? q(18) : q(22), fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {player?.nickname}
          </div>
          {/* 实时累计价值（游戏进行中）——数字滚动动画 */}
          {liveValue !== undefined && liveValue > 0 && (
            <div style={{
              color: '#ffd700', fontSize: q(22), fontWeight: 700, marginTop: q(4),
              transform: bump ? 'scale(1.25)' : 'scale(1)',
              transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              textShadow: bump ? '0 0 12px rgba(255,215,0,0.9)' : 'none',
            }}>
              <AnimatedValue value={liveValue} duration={600} />
            </div>
          )}
          {/* 最终总价值（游戏结束后） */}
          {player?.totalValue && liveValue === undefined && (
            <div style={{ color: '#ffd700', fontSize: q(20), marginTop: q(4) }}>
              ¥{parseFloat(player.totalValue).toFixed(2)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function ArenaRoom() {
  const params = useParams<{ id: string }>();
  const roomId = parseInt(params.id || '0');
  const [, navigate] = useLocation();
  const [settingsVisible, setSettingsVisible] = useState(false);

  // 回放模式：用 replayKey 强制重置，支持无限次回放
  const isReplayMode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('replay') === '1'
    : false;

  const [replayKey, setReplayKey] = useState(0); // 每次点击回放递增，强制重置状态
  const [replayRound, setReplayRound] = useState(0);
  const replayRoundRef = useRef(0); // 用ref跟踪最新値，避免handleSlotDone闭包捕获旧値
  const lastConnectedRefetchRef = useRef(0); // 防抖：记录上次 connected 触发 refetchRoom 的时间
  const lastPlayerJoinedRefetchRef = useRef(0); // 防抖：记录上次 player_joined 触发 refetchRoom 的时间
  const replaySpinStartedRef = useRef(0); // 记录已经启动 slot 的轮次，防止重复触发
  const [isReplaying, setIsReplaying] = useState(false);
  // 回放是否正在等待开场动画完成（线性流程：开场动画 → slot动画）
  const [replayWaitingIntro, setReplayWaitingIntro] = useState(false);

  const [isPresent, setIsPresent] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  // 加入确认弹窗
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  // 控制 getRoomDetail 延迟启动，避免与 joinRoom 并发触发 429
  const [roomDetailEnabled, setRoomDetailEnabled] = useState(false);

  // ── 开场碰撞动画状态 ──
  const [showIntro, setShowIntro] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);
  const introShownRef = useRef(false); // 防止重复触发
  const showIntroRef = useRef(false); // 实时跟踪 showIntro 状态，供事件处理函数读取
  // 开场动画期间到达的 round_result 缓存队列，动画结束后按顺序触发
  const pendingSpinRef = useRef<Array<{ itemMap: Record<number, { goodsId: number; goodsName: string; goodsImage: string; goodsLevel: number; goodsValue: string }>; roundNo: number }>>([]);
  // 缓存 game_over 数据，等待 SLOT 动画完成后再触发结束
  const pendingGameOverRef = useRef<any>(null);
  // 跟踪 reveal 动画状态（SLOT 转完后展示 2.2 秒的开奖结果），防止 SSE 在 reveal 期间直接启动下一轮
  const revealingRef = useRef(false);

  // ── 跳过游戏动画状态 ──
  const [skipGameAnim, setSkipGameAnim] = useState(false);

  // ── 实时游戏进行中标记 ──
  // 当通过 SSE 收到 round_result 时设为 true，表示正在实时游戏中（非回放）
  // 防止兜底恢复逻辑在正常游戏进行中误触发
  const liveGameActiveRef = useRef(false);
  // 已通过 SSE 实时接收到的轮次数
  const liveRoundsReceivedRef = useRef(0);

  // ── 实时累计价值 ──
  // 每轮结束后累加，key = playerId, value = 累计价值
  const [liveValues, setLiveValues] = useState<Record<number, number>>({});

  // ── 观战者缓存的玩家信息（在 roomDetail 加载前通过 round_result 获取） ──
  const [spectatorPlayers, setSpectatorPlayers] = useState<Array<{ playerId: number; nickname: string; avatar: string; seatNo: number }>>([])

  // ── 观战者人数 ──
  const [spectatorCount, setSpectatorCount] = useState(0);

  // ── 弹幕列表 ──
  interface DanmakuItem {
    id: number;
    nickname: string;
    avatar: string;
    text: string;
    ts: number;
  }
  const [danmakuList, setDanmakuList] = useState<DanmakuItem[]>([]);
  const [danmakuInput, setDanmakuInput] = useState('');
  const [danmakuSending, setDanmakuSending] = useState(false);
  const danmakuIdRef = useRef(0);

  const { data: roomDetail, refetch: refetchRoom } = trpc.arena.getRoomDetail.useQuery(
    { roomId },
    {
      enabled: roomId > 0 && roomDetailEnabled,
      refetchOnWindowFocus: false,
      // 等待状态下每 10 秒轮询一次，兜底 SSE 失效的情况（减少请求频率避免 429）
      // 注意：此处不能引用 gameStatus（后声明），改用 roomDetail 的状态判断
      refetchInterval: (query) => {
        // 错误时停止轮询，避免 429 死循环
        if (query.state.error) return false;
        const data = query.state.data as { room?: { status?: string } } | undefined;
        return data?.room?.status === 'waiting' || !data ? 10000 : false;
      },
    }
  );

  // 用 ref 跟踪最新的 roomDetail，供 useCallback 闭包中访问
  const roomDetailRef = useRef(roomDetail);
  useEffect(() => { roomDetailRef.current = roomDetail; }, [roomDetail]);

  // 获取所有笱子的道具列表，用于卷轴动画
  const boxIds = useMemo(() => roomDetail?.boxList?.map((b: { id: number }) => b.id) ?? [], [roomDetail?.boxList]);
  const { data: boxGoodsMap } = trpc.arena.getBoxGoodsList.useQuery(
    { boxIds },
    { enabled: boxIds.length > 0, refetchOnWindowFocus: false }
  );

  // ── 加入座位（主动点击加入，不可取消） ──
  const joinRetryRef = useRef(0);

  const joinSeat = trpc.arena.joinSeat.useMutation({
    onSuccess: (data: any) => {
      joinRetryRef.current = 0;
      setIsPresent(true);
      setJoinLoading(false);
      // 刷新房间详情
      refetchRoom();
      // 如果加入后房间已满，直接触发游戏开始
      if (data?.roomStatus === 'playing' || data?.roomStatus === 'finished' || data?.isFull) {
        setGameStatus(data?.roomStatus === 'finished' ? 'finished' : 'playing');
        setCurrentRound(1);
        setTimeout(() => refetchRoom(), 50);
      }
    },
    onError: (err: any) => {
      setJoinLoading(false);
      const httpStatus = (err as any)?.data?.httpStatus;
      const is429 = httpStatus === 429 || err.message?.includes('429') || err.message?.includes('Rate exceeded') || err.message?.includes('Too Many');
      if (is429 && joinRetryRef.current < 2) {
        joinRetryRef.current += 1;
        const delay = 1500 * joinRetryRef.current;
        setTimeout(() => {
          setJoinLoading(true);
          joinSeat.mutate({ roomId });
        }, delay);
        return;
      }
      joinRetryRef.current = 0;
      if (err.message.includes('已满') || err.message.includes('不在等待') || err.message.includes('已不在等待')) {
        // 房间已满，不显示错误，继续观战
      } else {
        setJoinError(err.message);
      }
    },
  });

  // 进入房间时直接启用 roomDetail（观战模式），不再自动加入
  useEffect(() => {
    if (roomId > 0) {
      setRoomDetailEnabled(true);
    }
  }, [roomId]);

  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  // 用 ref 跟踪最新的 gameStatus，供 useCallback 闭包中访问（避免闭包捕获旧值）
  const gameStatusRef = useRef<'waiting' | 'playing' | 'finished'>('waiting');
  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);

  // SSE 连接状态：true=已连接，false=断线重连中
  const [sseConnected, setSseConnected] = useState(true);
  // 断线提示延迟显示（避免短暂断线闪烁），只有断线超过 2s 才显示提示
  const [showSseDisconnected, setShowSseDisconnected] = useState(false);
  const sseDisconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!sseConnected) {
      // 断线 2 秒后才显示提示，避免短暂断线闪烁
      sseDisconnectTimerRef.current = setTimeout(() => setShowSseDisconnected(true), 2000);
    } else {
      if (sseDisconnectTimerRef.current) clearTimeout(sseDisconnectTimerRef.current);
      setShowSseDisconnected(false);
    }
    return () => {
      if (sseDisconnectTimerRef.current) clearTimeout(sseDisconnectTimerRef.current);
    };
  }, [sseConnected]);
  const [currentRound, setCurrentRound] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const spinningRef = useRef(false); // 实时跟踪 spinning 状态，供 SSE 回调读取
  // 同步 spinningRef 与 spinning state
  useEffect(() => { spinningRef.current = spinning; }, [spinning]);
  const [spinDoneCount, setSpinDoneCount] = useState(0);
  const [roundResults, setRoundResults] = useState<Record<number, Array<{
    playerId: number;
    nickname: string;
    seatNo: number;
    goodsId: number;
    goodsName: string;
    goodsImage: string;
    goodsLevel: number;
    goodsValue: string;
  }>>>({});
  const [gameOverData, setGameOverData] = useState<{
    winnerId: number;
    isDraw?: boolean;
    players: Array<{ playerId: number; nickname: string; avatar: string; seatNo: number; totalValue: string; isWinner: boolean; isDraw?: boolean }>;
  } | null>(null);

  const [currentRoundItems, setCurrentRoundItems] = useState<Record<number, {
    goodsId: number; goodsName: string; goodsImage: string; goodsLevel: number; goodsValue: string;
  }>>({})

  // 开奖展示覆盖层
  const [showRoundReveal, setShowRoundReveal] = useState(false);
  // 游戏结束获奖弹窗
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [myPrizeItems, setMyPrizeItems] = useState<Array<{
    goodsId: number; goodsName: string; goodsImage: string; goodsLevel: number; goodsValue: string;
  }>>([]);
  const utils = trpc.useUtils();
  const [revealItems, setRevealItems] = useState<Array<{
    nickname: string;
    goodsName: string;
    goodsImage: string;
    goodsLevel: number;
    goodsValue: string;
  }>>([]);;

  // spinRound mutation 已删除：游戏全程由服务端自动驱动（autoSpinAllRounds / botPlayAllRounds）
  // 前端通过 SSE round_result 事件接收开箱结果并播放动画

  // ── 触发开场动画 ──
  // forceReplay=true 时允许重复触发（回放模式每次都需要）
  const triggerIntro = useCallback((playerList: Array<{ playerId: number; nickname: string; avatar: string; seatNo: number }>, forceReplay = false) => {
    if (!forceReplay && introShownRef.current) { return; }
    if (playerList.length < 1) return;
    introShownRef.current = true;
    showIntroRef.current = true; // 实时标记开场动画正在播放
    setShowIntro(true);
    setSkipIntro(false);
  }, []);

  // ── WebSocket 消息处理 ──
  const handleWsMessage = useCallback((msg: { type: string; [key: string]: unknown }) => {
    switch (msg.type) {
      case 'player_joined': {
        // 防抖：2 秒内只触发一次，避免多人同时加入时爆发请求
        const nowJoined = Date.now();
        if (nowJoined - lastPlayerJoinedRefetchRef.current > 2000) {
          lastPlayerJoinedRefetchRef.current = nowJoined;
          refetchRoom();
        }
        break;
      }
      case 'game_started':
        setGameStatus('playing');
        setCurrentRound(1);
        // 先确保 roomDetailEnabled=true，再执行 refetch
        // 否则 enabled=false 时 refetchRoom() 不会执行，导致开场动画无法触发
        setRoomDetailEnabled(true);
        // 延迟一小步确保 enabled 状态生效后再 refetch
        setTimeout(() => refetchRoom(), 50);
        // 立即触发开场动画，不等 roomDetail 刷新
        // 从当前 roomDetail 获取玩家列表，如果没有则用占位符先展示动画
        {
          const currentPlayers = (roomDetailRef.current?.players ?? []) as Array<{ playerId: number; nickname: string; avatar: string; seatNo: number }>;
          triggerIntro(currentPlayers.length >= 2 ? currentPlayers : [{ playerId: 0, nickname: '玩家1', avatar: '001', seatNo: 1 }, { playerId: 1, nickname: '玩家2', avatar: '002', seatNo: 2 }]);
        }
        break;
      case 'round_result': {
        const results = msg.results as any[];
        const roundNo = msg.roundNo as number;
        // 标记实时游戏正在进行中，防止兜底恢复逻辑误触发
        liveGameActiveRef.current = true;
        liveRoundsReceivedRef.current = roundNo;
        // 确保 gameStatus 为 playing（观战者可能在 roomDetail 加载前收到此消息）
        setGameStatus('playing');
        // 注意：setCurrentRound 在空闲分支中设置，队列模式下由 handleSlotDone 线性推进
        setRoundResults((prev) => {
          const enriched = results.map((r: any) => ({ ...r }));
          return { ...prev, [roundNo]: enriched };
        });
        // 注意：不在此处更新 liveValues，而是在 handleSlotDone 中更新
        // 这样顶部金额会在每轮 SLOT 转盘动画结束后才逐步累加，而不是一收到消息就立即显示
        const itemMap: typeof currentRoundItems = {};
        for (const r of results) {
          itemMap[r.playerId] = {
            goodsId: r.goodsId,
            goodsName: r.goodsName,
            goodsImage: r.goodsImage,
            goodsLevel: r.goodsLevel,
            goodsValue: r.goodsValue,
          };
        }
        // 缓存玩家信息（观战者在 roomDetail 加载前也能正确显示玩家名称）
        if (results.length > 0 && results[0].seatNo !== undefined) {
          setSpectatorPlayers(results.map((r: any) => ({
            playerId: r.playerId,
            nickname: r.nickname ?? `玩家${r.seatNo}`,
            avatar: r.avatar ?? '001',
            seatNo: r.seatNo,
          })));
        }
        // ── 线性状态机核心逻辑 ──
        // 只有在“空闲”状态（非开场动画、非 SLOT 转动中、非 reveal 展示中）才直接启动 SLOT
        // 其他情况一律加入队列，等当前步骤完成后由 handleSlotDone/handleIntroComplete 线性触发
        const stateFlags = { intro: showIntroRef.current, spinning: spinningRef.current, revealing: revealingRef.current };
        console.log(`[SM] round_result R${roundNo} | flags:`, stateFlags, `| queue:${pendingSpinRef.current.length}`);
        if (showIntroRef.current || spinningRef.current || revealingRef.current) {
          // 开场动画正在播放 或 SLOT 正在转动 或 reveal 展示中，加入队列
          pendingSpinRef.current.push({ itemMap, roundNo });
          console.log(`[SM] → QUEUED R${roundNo} (queue now ${pendingSpinRef.current.length})`);
        } else {
          // 空闲状态，直接启动 SLOT 动画
          console.log(`[SM] → DIRECT START R${roundNo}`);
          setCurrentRound(roundNo);
          setCurrentRoundItems(itemMap);
          setSpinning(true);
          setSpinDoneCount(0);
          setSkipGameAnim(false);
        }
        break;
      }
      case 'game_over': {
        // 重置实时游戏标记
        liveGameActiveRef.current = false;
        liveRoundsReceivedRef.current = 0;
        const overData = {
          winnerId: msg.winnerId as number,
          isDraw: !!(msg.isDraw),
          players: (msg.players as any[]).map((p: any) => ({ ...p, isDraw: !!(msg.isDraw) })),
        };
        refetchRoom();
        utils.player.inventory.invalidate();
        // ── 线性状态机：检查当前是否空闲 ──
        console.log(`[SM] game_over | spinning:${spinningRef.current} revealing:${revealingRef.current} queue:${pendingSpinRef.current.length} intro:${showIntroRef.current}`);
        if (!spinningRef.current && !revealingRef.current && pendingSpinRef.current.length === 0 && !showIntroRef.current) {
          // SLOT 空闲且队列为空，所有轮次已完成，直接触发结束
          // 延迟 2.5 秒，等待最后一轮的 reveal 动画完成
          setTimeout(() => {
            setGameOverData(overData);
            setGameStatus('finished');
            setTimeout(() => {
              if (overData.isDraw) playLoseTone();
              else if (overData.players.some((p: any) => p.isWinner)) playWinFanfare();
              else playLoseTone();
            }, 500);
          }, 2500);
        } else {
          // SLOT 还在转或队列中还有待处理轮次，缓存 game_over 数据
          // 由 handleSlotDone 在最后一轮完成后线性消费
          pendingGameOverRef.current = overData;
          // 兜底定时器：60 秒后如果仍未消费，强制触发结束
          setTimeout(() => {
            if (pendingGameOverRef.current) {
              const pending = pendingGameOverRef.current;
              pendingGameOverRef.current = null;
              setGameOverData(pending);
              setGameStatus('finished');
              setTimeout(() => {
                if (pending.isDraw) playLoseTone();
                else if (pending.players.some((p: any) => p.isWinner)) playWinFanfare();
                else playLoseTone();
              }, 500);
            }
          }, 60000);
        }
        break;
      }
      case 'room_cancelled':
        alert('房间已被取消');
        navigate('/arena');
        break;
      case 'spectator_count':
        setSpectatorCount(msg.count as number);
        break;
      case 'connected': {
        // SSE 连接建立（初始连接或重连），无条件拉取一次房间状态
        // 这样即使错过了 game_started 广播，useEffect 小底也能根据最新状态触发开场动画
        // 防抖：5 秒内只触发一次，避免 SSE 频繁断连重连导致请求爆发
        {
          const now = Date.now();
          if (now - lastConnectedRefetchRef.current > 5000) {
            lastConnectedRefetchRef.current = now;
            // 先确保 roomDetailEnabled=true，再 refetch
            setRoomDetailEnabled(true);
            setTimeout(() => refetchRoom(), 50);
          }
        }
        break;
      }
      case 'danmaku': {
        const item: DanmakuItem = {
          id: ++danmakuIdRef.current,
          nickname: msg.nickname as string,
          avatar: msg.avatar as string,
          text: msg.text as string,
          ts: msg.ts as number,
        };
        setDanmakuList((prev) => {
          const next = [...prev, item];
          // 最多保留 30 条弹幕
          return next.length > 30 ? next.slice(next.length - 30) : next;
        });
        // 5 秒后自动移除
        setTimeout(() => {
          setDanmakuList((prev) => prev.filter((d) => d.id !== item.id));
        }, 5000);
        break;
      }
    }
  }, [refetchRoom, navigate]);

  useArenaWS({
    onMessage: handleWsMessage,
    subscribeRoomId: roomId,
    onConnectionChange: (connected) => setSseConnected(connected),
  });

  // ── 同步房间状态 ──
  useEffect(() => {
    if (roomDetail?.room) {
      // 根据 myPlayerId 是否在玩家列表中判断是否为参与者
      const myId = roomDetail.myPlayerId ?? 0;
      const amISeated = myId > 0 && (roomDetail.players ?? []).some((p: any) => p.playerId === myId);
      setIsPresent(amISeated);

      const status = roomDetail.room.status as 'waiting' | 'playing' | 'finished' | 'cancelled';
      if (status === 'playing') {
        setGameStatus('playing');
        if (liveGameActiveRef.current) {
          return;
        }
        if (roomDetail.roundResults && roomDetail.roundResults.length > 0 && !isReplaying && !spinning) {
          // 已有历史轮次结果，说明游戏已经开始了（服务器重启后重进房间）
          // 跳过开场动画，直接触发回放
          if (!introShownRef.current) {
            introShownRef.current = true; // 标记开场动画已处理，防止重复触发
            setIsReplaying(true);
            setGameOverData(null);
            setRoundResults({});
            setCurrentRound(1);
            setCurrentRoundItems({});
            setSpinning(false);
            setSpinDoneCount(0);
            setLiveValues({});
            setReplayRound(0);
            replayRoundRef.current = 0;
            replaySpinStartedRef.current = 0;
            setReplayWaitingIntro(false);
            setTimeout(() => {
              replayRoundRef.current = 1;
              setReplayRound(1);
            }, 600);
          }
        } else if (roomDetail.players.length >= 2 && !introShownRef.current) {
          // 还没有轮次结果，触发开场动画（参与者和观战者都要看）
          // 增加 !introShownRef.current 条件，防止 roomDetail 刷新时重复触发
          triggerIntro(roomDetail.players);
        }
      } else if (status === 'finished') {
        // 如果实时游戏正在进行中（还有轮次未完成），不要提前跳到结束
        if (liveGameActiveRef.current && (spinning || showIntro)) {
          // 实时游戏动画还在播放中，等待 game_over SSE 事件来触发结束
          return;
        }
        setGameStatus('finished');
        // 参与者和观战者都需要显示结果（参与者重新进入已结束房间时也要显示）
        if (!gameOverData && roomDetail.players.length > 0 && roomDetail.roundResults?.length > 0) {
          const playerTotals: Record<number, number> = {};
          for (const r of roomDetail.roundResults) {
            playerTotals[r.playerId] = (playerTotals[r.playerId] ?? 0) + parseFloat(r.goodsValue);
          }
          const maxVal = Math.max(...Object.values(playerTotals));
          const overPlayers = roomDetail.players.map((p) => ({
            playerId: p.playerId,
            nickname: p.nickname,
            avatar: p.avatar,
            seatNo: p.seatNo,
            totalValue: (playerTotals[p.playerId] ?? 0).toFixed(2),
            isWinner: (playerTotals[p.playerId] ?? 0) === maxVal,
          }));
          const winner = overPlayers.find((p) => p.isWinner);
          setGameOverData({ winnerId: winner?.playerId ?? 0, players: overPlayers });
        }
      }
      // 只在非实时游戏时同步 currentRound，避免覆盖实时轮次进度
      if (!liveGameActiveRef.current && roomDetail.room.currentRound > 0) setCurrentRound(roomDetail.room.currentRound);
    }
  }, [roomDetail, isPresent, gameOverData]);

  // ── 同步已有轮次结果 ──
  // 只在非实时游戏时同步，避免覆盖实时 SSE 收到的轮次数据
  useEffect(() => {
    // 实时游戏进行中时，不要用 roomDetail 覆盖 SSE 实时数据
    if (liveGameActiveRef.current) return;
    if (roomDetail?.roundResults && roomDetail.roundResults.length > 0) {
      const map: typeof roundResults = {};
      for (const r of roomDetail.roundResults) {
        if (!map[r.roundNo]) map[r.roundNo] = [];
        map[r.roundNo].push({
          playerId: r.playerId,
          nickname: '',
          seatNo: 0,
          goodsId: r.goodsId,
          goodsName: r.goodsName,
          goodsImage: r.goodsImage,
          goodsLevel: r.goodsLevel,
          goodsValue: r.goodsValue,
        });
      }
      setRoundResults(map);
    }
  }, [roomDetail?.roundResults]);

  // ── 兆底恢复：当 roomDetail 加载完成且游戏已结束（finished）但前端还在 playing 状态时 ──
  // 这处理了服务器重启后 SSE game_over 消息丢失的情况
  // 注意：只在非实时游戏时触发，防止在正常游戏进行中提前跳到结束画面
  useEffect(() => {
    // 实时游戏进行中时，不要干预，让 SSE game_over 事件来触发结束
    if (liveGameActiveRef.current) return;
    if (
      roomDetail?.room?.status === 'finished' &&
      roomDetail.roundResults?.length > 0 &&
      roomDetail.players?.length > 0 &&
      !isReplaying &&
      !spinning &&
      !showIntro &&
      gameStatus === 'playing'
    ) {
      // 游戏已结束但前端还在 playing，说明错过了 game_over 事件
      // 直接设置 game_over 数据
      const playerTotals: Record<number, number> = {};
      for (const r of roomDetail.roundResults) {
        playerTotals[r.playerId] = (playerTotals[r.playerId] ?? 0) + parseFloat(r.goodsValue);
      }
      const maxVal = Math.max(...Object.values(playerTotals));
      const overPlayers = roomDetail.players.map((p: any) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        avatar: p.avatar,
        seatNo: p.seatNo,
        totalValue: (playerTotals[p.playerId] ?? 0).toFixed(2),
        isWinner: (playerTotals[p.playerId] ?? 0) === maxVal,
      }));
      const winner = overPlayers.find((p: any) => p.isWinner);
      setGameOverData({ winnerId: winner?.playerId ?? 0, players: overPlayers });
      setGameStatus('finished');
    }
  }, [roomDetail?.room?.status, roomDetail?.roundResults, roomDetail?.players, isReplaying, spinning, showIntro, gameStatus]);

  // [REMOVED] 不再通过 useEffect 监听 spinning 变化来消费 pendingGameOver
  // 现在由 handleSlotDone 在最后一轮完成后线性消费，或由 game_over SSE 处理在空闲时直接触发

  // ── 回放模式：用 replayKey 控制开始（每次递增 replayKey 就重新开始回放）──
  // 依赖 replayKey 而非 isReplaying，避免数据刷新时重复触发
  const replayStartedRef = useRef<number>(-1); // 记录已处理的 replayKey
  useEffect(() => {
    if (!isReplayMode) return;
    if (replayKey < 0) return;
    if (replayStartedRef.current === replayKey) return; // 已处理过这个 key
    if (!roomDetail?.roundResults || roomDetail.roundResults.length === 0) return;
    if (!roomDetail.players || roomDetail.players.length === 0) return;

    // 标记已处理
    replayStartedRef.current = replayKey;

    // 重置所有回放状态
    setIsReplaying(true);
    setGameStatus('playing');
    setGameOverData(null);
    setRoundResults({});
    setCurrentRound(1);
    setCurrentRoundItems({});
    setSpinning(false);
    setSpinDoneCount(0);
    setLiveValues({});
    setReplayRound(0);
    replayRoundRef.current = 0;
    replaySpinStartedRef.current = 0;

    // 线性流程：先开场动画，动画完成后再开始 slot
    // 开场动画内部会调用 onComplete → setShowIntro(false)
    // 我们在 ArenaIntroAnimation.onComplete 中设置 replayWaitingIntro=false 并启动第一轮
    setReplayWaitingIntro(true);
    introShownRef.current = false; // 允许重新触发
    triggerIntro(roomDetail.players, true);
  }, [isReplayMode, replayKey, roomDetail?.roundResults, roomDetail?.players]);

  // ── 回放模式：开场动画完成后开始第一轮 ──
  // replayWaitingIntro=false 且 isReplaying=true 且 replayRound=0 时，延迟启动第一轮
  useEffect(() => {
    if (!isReplaying || replayWaitingIntro || replayRound !== 0) return;
    const timer = setTimeout(() => {
      replayRoundRef.current = 1;
      setReplayRound(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [isReplaying, replayWaitingIntro, replayRound]);

  // ── 回放模式：每轮推进 ──
  // 只依赖 replayRound 变化来触发，用 replaySpinStartedRef 防止重复触发同一轮
  useEffect(() => {
    if (!isReplaying || !roomDetail?.roundResults) return;
    if (replayWaitingIntro) return; // 开场动画还未完成，不进行 slot
    const allRoundNos = Array.from(new Set(roomDetail.roundResults.map((r) => r.roundNo))).sort((a, b) => a - b);
    const totalReplayRounds = allRoundNos.length;
    if (replayRound > 0 && replayRound <= totalReplayRounds) {
      // 防止重复触发：如果这一轮已经启动过 slot，跳过
      if (replaySpinStartedRef.current === replayRound) return;
      replaySpinStartedRef.current = replayRound;
      const roundNo = allRoundNos[replayRound - 1];
      const resultsForRound = roomDetail.roundResults.filter((r) => r.roundNo === roundNo);
      const itemMap: typeof currentRoundItems = {};
      for (const r of resultsForRound) {
        itemMap[r.playerId] = {
          goodsId: r.goodsId,
          goodsName: r.goodsName,
          goodsImage: r.goodsImage,
          goodsLevel: r.goodsLevel,
          goodsValue: r.goodsValue,
        };
      }
      setCurrentRoundItems(itemMap);
      setSpinning(true);
      setSpinDoneCount(0);
      setSkipGameAnim(false);
    }
  }, [isReplaying, replayRound, replayWaitingIntro]);

  const room = roomDetail?.room;
  // 玩家列表：优先使用包含机器人的更完整列表
  // roomDetail?.players 可能只有真实玩家（机器人加入后 roomDetail 还未刷新）
  // spectatorPlayers 从 round_result 中获取，包含所有参与者（含机器人）
  const players = (() => {
    const fromRoom = roomDetail?.players ?? [];
    const fromSpec = spectatorPlayers;
    // 使用玩家数量更多的列表，确保机器人也被包含
    return fromRoom.length >= fromSpec.length ? fromRoom : fromSpec;
  })();
  const maxPlayers = room?.maxPlayers ?? (spectatorPlayers.length > 0 ? spectatorPlayers.length : 2);
  const totalRounds = room?.rounds ?? 1;

  const myPlayerId = roomDetail?.myPlayerId ?? 0;
  const isCreator = room ? room.creatorId === myPlayerId : false;

  // 游戏结束时，展示我的获奖弹窗
  useEffect(() => {
    if (gameStatus !== 'finished' || myPlayerId === 0) return;
    // 判断当前玩家是否是赢家或平局
    const myOverData = gameOverData?.players.find((p) => p.playerId === myPlayerId);
    // 输家不弹出奖励弹窗（物品已输给赢家）
    if (myOverData && !myOverData.isWinner && !gameOverData?.isDraw) return;
    // 观战者也不弹窗
    if (!myOverData) return;
    // 收集所有轮次中我的物品
    const items: Array<{ goodsId: number; goodsName: string; goodsImage: string; goodsLevel: number; goodsValue: string }> = [];
    for (const roundArr of Object.values(roundResults)) {
      for (const r of roundArr) {
        if (r.playerId === myPlayerId) {
          items.push({ goodsId: r.goodsId, goodsName: r.goodsName, goodsImage: r.goodsImage, goodsLevel: r.goodsLevel, goodsValue: r.goodsValue });
        }
      }
    }
    // 如果没有轮次结果，就不弹窗
    if (items.length === 0) return;
    // 赢家：收集所有玩家的物品（赢家获得全部物品）
    if (myOverData.isWinner && !gameOverData?.isDraw) {
      const allItems: typeof items = [];
      for (const roundArr of Object.values(roundResults)) {
        for (const r of roundArr) {
          allItems.push({ goodsId: r.goodsId, goodsName: r.goodsName, goodsImage: r.goodsImage, goodsLevel: r.goodsLevel, goodsValue: r.goodsValue });
        }
      }
      // 延迟 1.5s 再弹出
      const timer = setTimeout(() => {
        setMyPrizeItems(allItems);
        setShowPrizeModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
    // 平局：只显示自己的物品
    const timer = setTimeout(() => {
      setMyPrizeItems(items);
      setShowPrizeModal(true);
    }, 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus, myPlayerId, gameOverData]);

  // ── 发送弹幕 ──
  const handleSendDanmaku = useCallback(async () => {
    const text = danmakuInput.trim();
    if (!text || danmakuSending) return;
    setDanmakuSending(true);
    try {
      const myPlayer = players.find(p => p.playerId === myPlayerId);
      const nickname = myPlayer?.nickname ?? '观战者';
      const avatar = myPlayer?.avatar ?? '001';
      await fetch('/api/arena/danmaku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roomId, nickname, avatar, text }),
      });
      setDanmakuInput('');
    } catch (e) {
      console.error('[Danmaku] send error:', e);
    } finally {
      setDanmakuSending(false);
    }
  }, [danmakuInput, danmakuSending, players, myPlayerId, roomId]);

  // ── 跳过所有动画，直接计算并展示最终结果 ──
  const handleSkipAll = useCallback(() => {
    if (!roomDetail) return;
    setSkipGameAnim(true);
    setSpinning(false);

    // 计算最终胜负
    const playerTotals: Record<number, number> = {};
    if (isReplaying && roomDetail.roundResults) {
      for (const r of roomDetail.roundResults) {
        playerTotals[r.playerId] = (playerTotals[r.playerId] ?? 0) + parseFloat(r.goodsValue);
      }
    } else {
      // 正常游戏中：累加已完成轮次
      for (const roundArr of Object.values(roundResults)) {
        for (const r of roundArr) {
          playerTotals[r.playerId] = (playerTotals[r.playerId] ?? 0) + parseFloat(r.goodsValue);
        }
      }
      // 加上当前轮次（如果有）
      for (const [pid, item] of Object.entries(currentRoundItems)) {
        playerTotals[Number(pid)] = (playerTotals[Number(pid)] ?? 0) + parseFloat(item.goodsValue);
      }
    }

    const maxVal = Object.values(playerTotals).length > 0 ? Math.max(...Object.values(playerTotals)) : 0;
    const overPlayers = players.map((p) => ({
      playerId: p.playerId,
      nickname: p.nickname,
      avatar: p.avatar,
      seatNo: p.seatNo,
      totalValue: (playerTotals[p.playerId] ?? 0).toFixed(2),
      isWinner: maxVal > 0 && (playerTotals[p.playerId] ?? 0) === maxVal,
    }));
    const winner = overPlayers.find((p) => p.isWinner);
    setGameOverData({ winnerId: winner?.playerId ?? 0, players: overPlayers });
    setGameStatus('finished');
    setIsReplaying(false);
    setReplayWaitingIntro(false);
    if (winner?.playerId === myPlayerId) playWinFanfare();
    else playLoseTone();
  }, [roomDetail, isReplaying, roundResults, currentRoundItems, players, myPlayerId]);

  // ── 每轮所有老虎机滚完 ──
  const handleSlotDone = useCallback(() => {
    setSpinDoneCount((prev) => {
      const next = prev + 1;
      console.log(`[SM] handleSlotDone count=${next}/${maxPlayers}`);
      if (next >= maxPlayers) {
        // ━━ 关键：先设置 revealingRef 再清除 spinning，避免两者之间的时间空隙被 SSE game_over 利用 ━━
        revealingRef.current = true;
        setSpinning(false);

        if (isReplaying && roomDetail?.roundResults) {
          const allRoundNos = Array.from(new Set(roomDetail.roundResults.map((r) => r.roundNo))).sort((a, b) => a - b);
          const totalReplayRounds = allRoundNos.length;
          const currentReplayRound = replayRoundRef.current;
          const roundNo = allRoundNos[currentReplayRound - 1];
          const resultsForRound = roomDetail.roundResults.filter((r) => r.roundNo === roundNo);
          const newResults = resultsForRound.map((r) => {
            const p = players.find((pl) => pl.playerId === r.playerId);
            return { ...r, nickname: p?.nickname ?? '', seatNo: p?.seatNo ?? 0 };
          });
          setRoundResults((prev2) => ({ ...prev2, [currentReplayRound]: newResults }));
          setLiveValues((prev2) => {
            const next2 = { ...prev2 };
            for (const r of resultsForRound) {
              next2[r.playerId] = (next2[r.playerId] ?? 0) + parseFloat(r.goodsValue);
            }
            return next2;
          });

          // 开奖展示覆盖层（按 seatNo 升序，确保左右顺序与玩家卡片一致）
          const revealData = resultsForRound
            .map((r) => {
              const p = players.find((pl) => pl.playerId === r.playerId);
              return { nickname: p?.nickname ?? `玩家${r.playerId}`, goodsName: r.goodsName, goodsImage: r.goodsImage, goodsLevel: r.goodsLevel, goodsValue: r.goodsValue, _seatNo: p?.seatNo ?? 99 };
            })
            .sort((a, b) => a._seatNo - b._seatNo);
          setRevealItems(revealData);
          setShowRoundReveal(true);
          // revealingRef 已在 setSpinning(false) 之前设置

          setTimeout(() => {
            setShowRoundReveal(false);
            revealingRef.current = false; // reveal 动画结束
            if (currentReplayRound < totalReplayRounds) {
              const nextRound = currentReplayRound + 1;
              replayRoundRef.current = nextRound;
              setReplayRound(nextRound);
              setCurrentRound((r) => r + 1);
              // 不清空 currentRoundItems，让 replayRound useEffect 覆盖，避免 SlotMachine 动画中断
            } else {
              const playerTotals: Record<number, number> = {};
              for (const r of roomDetail.roundResults) {
                playerTotals[r.playerId] = (playerTotals[r.playerId] ?? 0) + parseFloat(r.goodsValue);
              }
              const maxVal = Math.max(...Object.values(playerTotals));
              const overPlayers = (roomDetail?.players ?? []).map((p) => ({
                playerId: p.playerId,
                nickname: p.nickname,
                avatar: p.avatar,
                seatNo: p.seatNo,
                totalValue: (playerTotals[p.playerId] ?? 0).toFixed(2),
                isWinner: (playerTotals[p.playerId] ?? 0) === maxVal,
              }));
              const winner = overPlayers.find((p) => p.isWinner);
              setGameOverData({ winnerId: winner?.playerId ?? 0, players: overPlayers });
              setGameStatus('finished');
              setIsReplaying(false);
              if (winner?.playerId === myPlayerId) playWinFanfare();
              else playLoseTone();
            }
          }, 2200);
        } else {
          // 正常模式
          const newResults = Object.entries(currentRoundItems).map(([pid, item]) => {
            const p = players.find((pl) => pl.playerId === Number(pid));
            return { playerId: Number(pid), nickname: p?.nickname ?? '', seatNo: p?.seatNo ?? 0, ...item };
          });
          setRoundResults((prev2) => ({ ...prev2, [currentRound]: newResults }));
          setLiveValues((prev2) => {
            const next2 = { ...prev2 };
            for (const [pid, item] of Object.entries(currentRoundItems)) {
              next2[Number(pid)] = (next2[Number(pid)] ?? 0) + parseFloat(item.goodsValue);
            }
            return next2;
          });

          // 开奖展示覆盖层（按 seatNo 升序，确保左右顺序与玩家卡片一致）
          const revealData = Object.entries(currentRoundItems)
            .map(([pid, item]) => {
              const p = players.find((pl) => pl.playerId === Number(pid));
              return { nickname: p?.nickname ?? `玩家${pid}`, goodsName: item.goodsName, goodsImage: item.goodsImage, goodsLevel: item.goodsLevel, goodsValue: item.goodsValue, _seatNo: p?.seatNo ?? 99 };
            })
            .sort((a, b) => a._seatNo - b._seatNo);
          setRevealItems(revealData);
          setShowRoundReveal(true);
          // revealingRef 已在 setSpinning(false) 之前设置

          setTimeout(() => {
            setShowRoundReveal(false);
            revealingRef.current = false; // reveal 动画结束
            console.log(`[SM] reveal done (normal) | queue:${pendingSpinRef.current.length} currentRound:${currentRound} totalRounds:${totalRounds}`);
            // 检查队列中是否有待处理的轮次（服务器恢复时快速广播的多轮结果）
            if (pendingSpinRef.current.length > 0) {
              const nextPending = pendingSpinRef.current[0];
              pendingSpinRef.current = pendingSpinRef.current.slice(1);
              console.log(`[SM] → dequeue & start R${nextPending.roundNo} (queue remaining ${pendingSpinRef.current.length})`);
              setTimeout(() => {
                setCurrentRoundItems(nextPending.itemMap);
                setCurrentRound(nextPending.roundNo);
                setSpinning(true);
                setSpinDoneCount(0);
                setSkipGameAnim(false);
              }, 100);
            } else if (currentRound < totalRounds) {
              console.log(`[SM] → waiting for SSE R${currentRound + 1} (currentRound=${currentRound} < totalRounds=${totalRounds})`);
              setCurrentRound((r) => r + 1);
              // 不清空 currentRoundItems，等待 SSE round_result 消息覆盖，避免 SlotMachine 动画中断
            } else {
              // 最后一轮完成，检查是否有缓存的 game_over 数据
              console.log(`[SM] → last round done, pendingGameOver:${!!pendingGameOverRef.current}`);
              if (pendingGameOverRef.current) {
                const overData = pendingGameOverRef.current;
                pendingGameOverRef.current = null;
                setGameOverData(overData);
                setGameStatus('finished');
                refetchRoom();
                utils.player.inventory.invalidate();
                setTimeout(() => {
                  if (overData.isDraw) playLoseTone();
                  else if (overData.players.some((p: any) => p.isWinner)) playWinFanfare();
                  else playLoseTone();
                }, 500);
              }
              // 如果没有 pendingGameOverRef，等待 SSE game_over 事件
            }
          }, 2200);
        }
      }
      return next;
    });
  }, [maxPlayers, currentRound, totalRounds, currentRoundItems, players, isReplaying, replayRound, roomDetail?.roundResults, roomDetail?.players, myPlayerId]);

  // ── 开场动画完成回调（用 useCallback 稳定引用，避免 ArenaIntroAnimation 的 useEffect 因引用变化而重置计时器） ──
  const handleIntroComplete = useCallback(() => {
    showIntroRef.current = false; // 开场动画已结束
    setShowIntro(false);
    console.log(`[SM] handleIntroComplete | queue:${pendingSpinRef.current.length} isReplaying:${isReplaying}`);
    // 回放模式：开场动画完成，解除等待状态，允许 slot 开始
    if (isReplaying) {
      setReplayWaitingIntro(false);
      return;
    }
    // 实时模式：如果开场动画期间有缓存的 round_result，现在触发第一轮 slot 动画
    if (pendingSpinRef.current.length > 0) {
      // 取队列中第一个（最早到达的轮次）
      const pending = pendingSpinRef.current[0];
      pendingSpinRef.current = pendingSpinRef.current.slice(1);
      // 延迟 100ms 确保 React 状态已更新
      setTimeout(() => {
        setCurrentRoundItems(pending.itemMap);
        setCurrentRound(pending.roundNo);
        setSpinning(true);
        setSpinDoneCount(0);
        setSkipGameAnim(false);
      }, 100);
      return;
    }
    // 兆底恢复：开场动画结束后 pendingSpinRef 为空，说明 SSE 消息在服务器重启时丢失了。
    // 检查 roomDetailRef 中是否有历史轮次结果，有则自动触发回放，避免永久卡在“等待开始”。
    const detail = roomDetailRef.current;
    if (detail?.roundResults && detail.roundResults.length > 0 && detail.players && detail.players.length > 0) {
      // 延迟 300ms 确保 React 状态已更新，然后触发回放
      setTimeout(() => {
        setIsReplaying(true);
        setGameStatus('playing');
        setGameOverData(null);
        setRoundResults({});
        setCurrentRound(1);
        setCurrentRoundItems({});
        setSpinning(false);
        setSpinDoneCount(0);
        setLiveValues({});
        setReplayRound(0);
        replayRoundRef.current = 0;
        replaySpinStartedRef.current = 0;
        setReplayWaitingIntro(false); // 开场动画已经播放完了，直接开始 slot
        // 延迟 400ms 再设置 replayRound=1，触发第一轮 slot
        setTimeout(() => {
          replayRoundRef.current = 1;
          setReplayRound(1);
        }, 400);
      }, 300);
    } else {
      // 开场动画结束时还没有轮次结果（autoSpinAllRounds 还没开始）
      // 等待 SSE round_result 事件到达，它会通过线性状态机直接启动 SLOT
      // 兜底：10 秒后如果实时游戏未开始，强制 refetch 并触发回放
      setTimeout(() => {
        if (liveGameActiveRef.current) return; // 实时游戏已开始，不干预
        if (spinningRef.current) return; // SLOT 已在转，不干预
        if (gameStatusRef.current === 'finished') return; // 已结束，不干预
        // 强制 refetch 房间详情，然后交给同步状态 useEffect 处理
        // 重置 introShownRef 以允许同步状态 useEffect 触发回放
        introShownRef.current = false;
        refetchRoom();
      }, 10000);
    }
  }, [isReplaying]); // isReplaying 是唯一需要的依赖，其余通过 ref 访问

  // joinError 现在在等待状态区域内展示，不再全屏拦截

  if (!room) {
    return (
      <div className="phone-container" style={{ display: 'flex', flexDirection: 'column', containerType: 'inline-size', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9ca3af', fontSize: q(28) }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="phone-container" style={{ display: 'flex', flexDirection: 'column', containerType: 'inline-size', position: 'relative' }}>
      {/* 背景 */}
      <img
        src="https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/bg_98756154.png"
        alt=""
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }}
      />

      {/* ── 加入确认弹窗 ── */}
      {showJoinConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 600,
          background: 'rgba(5,1,15,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: `${q(40)} ${q(20)}`,
          animation: 'prizeModalIn 0.3s ease',
        }}>
          <div style={{
            background: 'linear-gradient(135deg,rgba(30,10,65,0.98),rgba(15,5,40,0.99))',
            border: '2px solid rgba(192,132,252,0.6)',
            borderRadius: q(20),
            padding: `${q(32)} ${q(28)}`,
            maxWidth: q(500),
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(120,60,220,0.4)',
          }}>
            <div style={{ fontSize: q(48), marginBottom: q(16) }}>⚠️</div>
            <div style={{ color: '#e0d0ff', fontSize: q(30), fontWeight: 700, marginBottom: q(16) }}>
              确认加入竞技场？
            </div>
            <div style={{ color: '#9ca3af', fontSize: q(24), marginBottom: q(8) }}>
              加入后不可取消，将扣除入场费
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: q(8),
              background: 'rgba(245,200,66,0.15)',
              border: '1px solid rgba(245,200,66,0.4)',
              borderRadius: q(12),
              padding: `${q(10)} ${q(24)}`,
              marginBottom: q(24),
            }}>
              <img src="/img/jinbi1.png" alt="金币" style={{ width: q(32), height: q(32) }} />
              <span style={{ color: '#ffd700', fontSize: q(32), fontWeight: 800 }}>
                {room ? parseFloat(room.entryFee).toFixed(0) : '?'}
              </span>
              <span style={{ color: '#c084fc', fontSize: q(24) }}>金币</span>
            </div>
            <div style={{ display: 'flex', gap: q(16) }}>
              <button
                onClick={() => setShowJoinConfirm(false)}
                style={{
                  flex: 1, padding: `${q(14)} 0`,
                  background: 'rgba(120,60,220,0.15)',
                  border: '1.5px solid rgba(120,60,220,0.4)',
                  borderRadius: q(12),
                  color: '#c084fc', fontSize: q(26), fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowJoinConfirm(false);
                  setJoinLoading(true);
                  setJoinError('');
                  joinSeat.mutate({ roomId });
                }}
                disabled={joinLoading}
                style={{
                  flex: 1, padding: `${q(14)} 0`,
                  background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  border: '1.5px solid rgba(192,132,252,0.6)',
                  borderRadius: q(12),
                  color: '#fff', fontSize: q(26), fontWeight: 700,
                  cursor: joinLoading ? 'not-allowed' : 'pointer',
                  opacity: joinLoading ? 0.6 : 1,
                  boxShadow: '0 4px 16px rgba(120,60,220,0.4)',
                }}
              >
                {joinLoading ? '加入中...' : '确认加入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 游戏结束获奖弹窗 ── */}
      {showPrizeModal && myPrizeItems.length > 0 && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(5,1,15,0.95)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: `${q(40)} ${q(20)}`,
          animation: 'prizeModalIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <style>{`
            @keyframes prizeModalIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
            @keyframes prizeItemIn { from { opacity:0; transform:translateY(30px) scale(0.8); } to { opacity:1; transform:translateY(0) scale(1); } }
            @keyframes prizeGoldSpin { 0%{transform:rotateY(0deg);} 100%{transform:rotateY(360deg);} }
            @keyframes prizeShine { 0%,100%{opacity:0.6;} 50%{opacity:1;} }
          `}</style>
          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: q(32) }}>
            <div style={{ fontSize: q(48), marginBottom: q(8) }}>🎉</div>
            <div style={{ color: '#f5c842', fontSize: q(36), fontWeight: 900, textShadow: '0 0 20px rgba(245,200,66,0.8)', letterSpacing: 2 }}>恭喜获得奖励！</div>
            <div style={{ color: '#c084fc', fontSize: q(24), marginTop: q(8) }}>
              共 <span style={{ color: '#f5c842', fontWeight: 700, fontSize: q(28) }}>{myPrizeItems.length}</span> 件道具已入背包
            </div>
          </div>
          {/* 物品列表 */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: q(16),
            justifyContent: 'center', maxWidth: q(700),
            maxHeight: q(600), overflowY: 'auto',
          }}>
            {myPrizeItems.map((item, idx) => (
              <div key={idx} style={{
                width: q(180), display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: item.goodsLevel === 1
                  ? 'linear-gradient(135deg,rgba(200,134,10,0.3),rgba(245,200,66,0.2))'
                  : item.goodsLevel === 2
                    ? 'linear-gradient(135deg,rgba(106,13,173,0.3),rgba(192,132,252,0.2))'
                    : 'rgba(20,8,50,0.8)',
                border: `2px solid ${
                  item.goodsLevel === 1 ? 'rgba(245,200,66,0.8)'
                    : item.goodsLevel === 2 ? 'rgba(192,132,252,0.8)'
                    : 'rgba(96,165,250,0.5)'
                }`,
                borderRadius: q(12), padding: q(12),
                animation: `prizeItemIn 0.4s ease ${idx * 0.08}s both`,
                boxShadow: item.goodsLevel === 1
                  ? '0 0 20px rgba(245,200,66,0.4)'
                  : item.goodsLevel === 2
                    ? '0 0 20px rgba(192,132,252,0.4)'
                    : 'none',
              }}>
                <div style={{
                  width: q(120), height: q(120), borderRadius: q(8), overflow: 'hidden',
                  background: 'rgba(0,0,0,0.3)', marginBottom: q(8),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img src={item.goodsImage} alt={item.goodsName}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{
                  color: item.goodsLevel === 1 ? '#f5c842' : item.goodsLevel === 2 ? '#c084fc' : '#60a5fa',
                  fontSize: q(16), fontWeight: 700, marginBottom: q(4),
                }}>
                  {item.goodsLevel === 1 ? '传说' : item.goodsLevel === 2 ? '稀有' : '普通'}
                </div>
                <div style={{ color: '#fff', fontSize: q(18), fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{item.goodsName}</div>
                <div style={{ color: '#ffd700', fontSize: q(22), fontWeight: 800, marginTop: q(4) }}>¥{parseFloat(item.goodsValue).toFixed(2)}</div>
              </div>
            ))}
          </div>
          {/* 关闭按钮 */}
          <button
            onClick={() => setShowPrizeModal(false)}
            style={{
              marginTop: q(32),
              padding: `${q(16)} ${q(60)}`,
              background: 'linear-gradient(135deg,#7c3aed,#c084fc)',
              border: 'none', borderRadius: q(30),
              color: '#fff', fontSize: q(28), fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(192,132,252,0.5)',
            }}
          >
            太棒了！
          </button>
        </div>
      )}

      {/* ── 开奖展示覆盖层 ── */}
      {showRoundReveal && revealItems.length > 0 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 200,
          background: 'rgba(8,2,22,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          animation: 'fadeInReveal 0.3s ease',
          overflow: 'hidden',
          padding: `${q(20)} ${q(16)}`,
        }}>
          <style>{`
            @keyframes fadeInReveal { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
            @keyframes revealGlow { 0%,100%{box-shadow:0 0 30px rgba(192,132,252,0.5);} 50%{box-shadow:0 0 60px rgba(192,132,252,0.9), 0 0 100px rgba(192,132,252,0.4);} }
            @keyframes revealGoldGlow { 0%,100%{box-shadow:0 0 30px rgba(245,200,66,0.5);} 50%{box-shadow:0 0 60px rgba(245,200,66,0.9), 0 0 100px rgba(245,200,66,0.4);} }
          `}</style>
          <div style={{ color: '#c084fc', fontSize: q(28), fontWeight: 700, marginBottom: q(24), letterSpacing: 2, textShadow: '0 0 12px rgba(192,132,252,0.8)' }}>
            本轮开奖结果
          </div>
          <div style={{ display: 'flex', gap: q(16), justifyContent: 'center', flexWrap: 'nowrap', width: '100%', padding: `0 ${q(8)}` }}>
            {revealItems.map((item, idx) => (
              <div key={idx} style={{
                flex: 1, minWidth: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: item.goodsLevel === 1
                  ? 'linear-gradient(135deg,rgba(200,134,10,0.25),rgba(245,200,66,0.15))'
                  : item.goodsLevel === 2
                    ? 'linear-gradient(135deg,rgba(106,13,173,0.25),rgba(192,132,252,0.15))'
                    : 'rgba(20,8,50,0.8)',
                border: `2px solid ${
                  item.goodsLevel === 1 ? 'rgba(245,200,66,0.8)'
                    : item.goodsLevel === 2 ? 'rgba(192,132,252,0.8)'
                    : 'rgba(96,165,250,0.5)'
                }`,
                borderRadius: q(16),
                padding: `${q(16)} ${q(12)}`,
                animation: item.goodsLevel === 1 ? 'revealGoldGlow 1.2s ease-in-out infinite' : 'revealGlow 1.5s ease-in-out infinite',
              }}>
                <div style={{ color: '#9ca3af', fontSize: q(20), marginBottom: q(8) }}>{item.nickname}</div>
                <div style={{
                  width: q(110), height: q(110), marginBottom: q(10),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.goodsImage ? (
                    <img src={item.goodsImage} alt={item.goodsName} style={{
                      width: '100%', height: '100%', objectFit: 'contain',
                      filter: item.goodsLevel === 1
                        ? 'drop-shadow(0 0 16px rgba(245,200,66,0.9))'
                        : item.goodsLevel === 2
                          ? 'drop-shadow(0 0 14px rgba(192,132,252,0.9))'
                          : 'none',
                    }} />
                  ) : (
                    <div style={{ fontSize: q(60) }}>🎁</div>
                  )}
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: `${q(3)} ${q(14)}`,
                  background: item.goodsLevel === 1 ? 'rgba(245,200,66,0.2)' : item.goodsLevel === 2 ? 'rgba(192,132,252,0.2)' : 'rgba(96,165,250,0.15)',
                  borderRadius: q(6), marginBottom: q(6),
                  color: item.goodsLevel === 1 ? '#f5c842' : item.goodsLevel === 2 ? '#c084fc' : '#60a5fa',
                  fontSize: q(18), fontWeight: 700,
                }}>
                  {LEVEL_LABEL[item.goodsLevel] ?? '普通'}
                </div>
                <div style={{ color: '#fff', fontSize: q(22), fontWeight: 600, textAlign: 'center', maxWidth: q(200) }}>{item.goodsName}</div>
                <div style={{ color: '#ffd700', fontSize: q(28), fontWeight: 800, marginTop: q(6) }}>¥{parseFloat(item.goodsValue).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 开场碰撞动画（覆盖全屏） ── */}
      {showIntro && (
        <ArenaIntroAnimation
          players={players.map((p) => ({
            nickname: p?.nickname ?? '',
            avatar: p?.avatar ?? '001',
          }))}
          skip={skipIntro}
          onComplete={handleIntroComplete}
        />
      )}

      {/* 顶部导航 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <TopNav onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
      </div>

      {/* SSE 断线提示条：断线超过 2s 才显示，避免短暂断线闪烁 */}
      {showSseDisconnected && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 49,
          background: 'rgba(180,60,20,0.92)',
          borderBottom: '1px solid rgba(255,100,50,0.6)',
          padding: `${q(8)} ${q(20)}`,
          display: 'flex', alignItems: 'center', gap: q(8),
          fontSize: q(22), color: '#ffd0b0',
        }}>
          <span style={{ animation: 'pulse 1.2s ease-in-out infinite', display: 'inline-block' }}>⚡</span>
          <span>网络不稳定，正在重连中……游戏结果不会丢失</span>
        </div>
      )}

      {/* 内容区 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${q(12)} ${q(20)}`, paddingBottom: q(80), position: 'relative', zIndex: 1 }}>

        {/* 房间信息栏 */}
        <div style={{
          background: 'rgba(20,8,50,0.85)',
          border: '1px solid rgba(120,60,220,0.4)',
          borderRadius: q(12), padding: `${q(12)} ${q(16)}`,
          marginBottom: q(16),
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ color: '#c084fc', fontSize: q(28), fontWeight: 700 }}>竞技场</span>
            <span style={{ color: '#9980cc', fontSize: q(22), marginLeft: q(12) }}>#{room.roomNo}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: q(12) }}>
            <span style={{ color: '#9ca3af', fontSize: q(22) }}>
              {gameStatus === 'waiting' ? '等待中' : gameStatus === 'playing' ? `第 ${currentRound}/${totalRounds} 轮` : '已结束'}
            </span>
            {/* 观战标识：非参与者且游戏进行中 */}
            {!isPresent && gameStatus === 'playing' && (
              <span style={{
                background: 'rgba(59,130,246,0.2)',
                border: '1px solid rgba(96,165,250,0.6)',
                borderRadius: q(8), padding: `${q(4)} ${q(12)}`,
                color: '#60a5fa', fontSize: q(20), fontWeight: 600,
              }}>👁 观战</span>
            )}
            {/* 观战者人数：游戏进行中时显示 */}
            {spectatorCount > 0 && (gameStatus === 'playing' || gameStatus === 'finished') && (
              <span style={{
                color: '#9ca3af', fontSize: q(20),
                display: 'flex', alignItems: 'center', gap: q(4),
              }}>👁 {spectatorCount}人观战</span>
            )}
          </div>
        </div>

        {/* 玩家座位区 */}
        <div style={{ display: 'flex', gap: maxPlayers >= 3 ? q(6) : q(12), marginBottom: q(20) }}>
          {Array.from({ length: maxPlayers }).map((_, i) => {
            const seatNo = i + 1;
            const p = players.find((pl) => pl.seatNo === seatNo);
            const winnerData = gameOverData?.players.find((pl) => pl.seatNo === seatNo);
            // 显示加入按钮条件：空座位 + 房间等待中 + 当前玩家未加入 + 已登录
            const canShowJoin = !p && gameStatus === 'waiting' && !isPresent && myPlayerId > 0;
            return (
              <PlayerSeat
                key={seatNo}
                seatNo={seatNo}
                player={winnerData ? { ...p!, totalValue: winnerData.totalValue, isWinner: winnerData.isWinner ? 1 : 0 } : p}
                isEmpty={!p}
                isWinner={winnerData?.isWinner ?? false}
                isDraw={gameOverData?.isDraw ?? false}
                liveValue={gameStatus === 'playing' && p ? (liveValues[p.playerId] ?? 0) : undefined}
                showJoinBtn={canShowJoin}
                onJoin={() => {
                  setShowJoinConfirm(true);
                }}
                joinLoading={joinLoading}
                compact={maxPlayers >= 3}
              />
            );
          })}
        </div>

        {/* 宝箱列表 */}
        {roomDetail?.boxList && roomDetail.boxList.length > 0 && (
          <div style={{ marginBottom: q(16) }}>
            <div style={{ color: '#9ca3af', fontSize: q(22), marginBottom: q(8) }}>本局宝箱</div>
            <div style={{ display: 'flex', gap: q(8), overflowX: 'auto' }}>
              {roomDetail.boxList.map((box, idx) => (
                <div
                  key={`box-${idx}`}
                  style={{
                    flexShrink: 0, textAlign: 'center',
                    background: idx + 1 < currentRound ? 'rgba(120,60,220,0.1)' : idx + 1 === currentRound ? 'rgba(120,60,220,0.3)' : 'rgba(20,8,50,0.8)',
                    border: `1.5px solid ${idx + 1 === currentRound ? '#c084fc' : 'rgba(120,60,220,0.25)'}`,
                    borderRadius: q(10), padding: q(8),
                    opacity: idx + 1 < currentRound ? 0.5 : 1,
                    width: q(100),
                  }}
                >
                  <img src={box.imageUrl || `${CDN}/a888e4d9c59e44cf49c0949345509ee4_32c3c37e.png`} alt={box.name} style={{ width: q(60), height: q(60), objectFit: 'contain' }} />
                  <div style={{ color: '#e0d0ff', fontSize: q(18), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{box.name}</div>
                  {idx + 1 < currentRound && <div style={{ color: '#22c55e', fontSize: q(16) }}>✓ 已开</div>}
                  {idx + 1 === currentRound && <div style={{ color: '#c084fc', fontSize: q(16) }}>▶ 当前</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 弹幕飘动层：游戏进行中显示 */}
        {(gameStatus === 'playing' || gameStatus === 'finished') && danmakuList.length > 0 && (
          <div style={{
            position: 'relative',
            height: q(80),
            overflow: 'hidden',
            marginBottom: q(8),
            pointerEvents: 'none',
          }}>
            {danmakuList.map((d, idx) => (
              <div
                key={`dm-${d.id}-${idx}`}
                style={{
                  position: 'absolute',
                  top: `${(idx % 3) * 33}%`,
                  left: 0,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: q(6),
                  background: 'rgba(0,0,0,0.55)',
                  borderRadius: q(20),
                  padding: `${q(4)} ${q(12)}`,
                  animation: 'danmakuSlide 5s linear forwards',
                }}
              >
                <img
                  src={`/img/avatars/${d.avatar}.png`}
                  alt=""
                  style={{ width: q(28), height: q(28), borderRadius: '50%', flexShrink: 0 }}
                />
                <span style={{ color: '#e0d0ff', fontSize: q(22), fontWeight: 600 }}>{d.nickname}:</span>
                <span style={{ color: '#fff', fontSize: q(22) }}>{d.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* 老虎机区域 */}
        {gameStatus === 'playing' && (
          <div style={{ marginBottom: q(20) }}>
            <div style={{ color: '#c084fc', fontSize: q(26), fontWeight: 700, marginBottom: q(12), textAlign: 'center' }}>
              第 {currentRound} 轮开箱
            </div>
            <div style={{ display: 'flex', gap: maxPlayers >= 3 ? q(6) : q(12) }}>
              {Array.from({ length: maxPlayers }).map((_, i) => {
                const seatNo = i + 1;
                const p = players.find((pl) => pl.seatNo === seatNo);
                const finalItem = p ? currentRoundItems[p.playerId] ?? null : null;
                // 当前轮次对应的笱子ID
                const currentBoxId = roomDetail?.boxList?.[currentRound - 1]?.id;
                const reelItems = currentBoxId && boxGoodsMap ? (boxGoodsMap[currentBoxId] ?? []) : [];
                return (
                  <div key={seatNo} style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#9ca3af', fontSize: maxPlayers >= 3 ? q(18) : q(20), textAlign: 'center', marginBottom: q(4), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p?.nickname ?? `玩家${seatNo}`}
                    </div>
                    <SlotMachine
                      finalItem={finalItem}
                      spinning={spinning}
                      onDone={handleSlotDone}
                      skipAnim={skipGameAnim}
                      reelItems={reelItems}
                      compact={maxPlayers >= 3}
                    />
                  </div>
                );
              })}
            </div>

            {/* 跳过动画按钮（游戏进行中或回放中，且正在spinning时显示） */}
            {(spinning || isReplaying) && !skipGameAnim && (
              <button
                onClick={handleSkipAll}
                style={{
                  display: 'block', width: '100%', marginTop: q(12),
                  padding: `${q(14)} ${q(20)}`,
                  background: 'rgba(120,60,220,0.15)',
                  border: '1px solid rgba(192,132,252,0.4)',
                  borderRadius: q(10),
                  color: 'rgba(192,132,252,0.8)',
                  fontSize: q(24), fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: 1,
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(120,60,220,0.3)'; (e.target as HTMLButtonElement).style.color = '#c084fc'; }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(120,60,220,0.15)'; (e.target as HTMLButtonElement).style.color = 'rgba(192,132,252,0.8)'; }}
              >
                ⏭ 跳过动画，直接看结果
              </button>
            )}

            {/* 满员后自动开始，显示等待提示 */}
            {!spinning && players.length >= maxPlayers && !isReplaying && gameStatus === 'playing' && (
              <div style={{
                textAlign: 'center', marginTop: q(20), color: '#c084fc', fontSize: q(28),
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                游戏即将开始...
              </div>
            )}
            {players.length < maxPlayers && (
              <div style={{ textAlign: 'center', marginTop: q(20), color: '#9ca3af', fontSize: q(26) }}>
                等待其他玩家加入...（{players.length}/{maxPlayers}）
              </div>
            )}
          </div>
        )}

        {/* ── 已完成轮次的奖品罗列 ── */}
        {Object.keys(roundResults).length > 0 && (gameStatus === 'playing' || gameStatus === 'finished') && (
          <div style={{ marginBottom: q(20) }}>
            {Object.entries(roundResults)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([roundNo, results]) => {
                const sortedResults = [...results].sort((a, b) => a.seatNo - b.seatNo);
                return (
                  <div key={`round-${roundNo}`} style={{ marginBottom: q(16) }}>
                    <div style={{
                      color: '#c084fc', fontSize: q(24), fontWeight: 700,
                      marginBottom: q(8), textAlign: 'center',
                      textShadow: '0 0 8px rgba(192,132,252,0.5)',
                    }}>
                      第 {roundNo} 轮开箱
                    </div>
                    <div style={{ display: 'flex', gap: maxPlayers >= 3 ? q(4) : q(8) }}>
                      {sortedResults.map((item, idx) => {
                        const p = players.find(pl => pl.playerId === item.playerId);
                        const borderColor = item.goodsLevel === 1 ? 'rgba(245,200,66,0.8)'
                          : item.goodsLevel === 2 ? 'rgba(192,132,252,0.8)'
                          : item.goodsLevel === 3 ? 'rgba(96,165,250,0.6)'
                          : 'rgba(156,163,175,0.4)';
                        const bgGrad = item.goodsLevel === 1
                          ? 'linear-gradient(135deg,rgba(200,134,10,0.2),rgba(245,200,66,0.1))'
                          : item.goodsLevel === 2
                            ? 'linear-gradient(135deg,rgba(106,13,173,0.2),rgba(192,132,252,0.1))'
                            : 'rgba(20,8,50,0.8)';
                        return (
                          <div key={`r${roundNo}-${idx}`} style={{
                            flex: 1, minWidth: 0,
                            background: bgGrad,
                            border: `1.5px solid ${borderColor}`,
                            borderRadius: q(12),
                            padding: `${q(10)} ${q(8)}`,
                            textAlign: 'center',
                            boxShadow: item.goodsLevel <= 2
                              ? `0 0 12px ${borderColor.replace('0.8)', '0.3)').replace('0.6)', '0.2)')}`
                              : 'none',
                          }}>
                            {/* 玩家昵称 */}
                            <div style={{
                              color: '#9ca3af', fontSize: q(18), marginBottom: q(6),
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {p?.nickname ?? item.nickname ?? `玩家${item.seatNo}`}
                            </div>
                            {/* 物品图片 */}
                            <div style={{
                              width: maxPlayers >= 3 ? q(80) : q(120), height: maxPlayers >= 3 ? q(80) : q(120), margin: '0 auto',
                              marginBottom: q(6),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {item.goodsImage ? (
                                <img src={item.goodsImage} alt={item.goodsName} style={{
                                  width: '100%', height: '100%', objectFit: 'contain',
                                  filter: item.goodsLevel === 1
                                    ? 'drop-shadow(0 0 10px rgba(245,200,66,0.7))'
                                    : item.goodsLevel === 2
                                      ? 'drop-shadow(0 0 8px rgba(192,132,252,0.7))'
                                      : 'none',
                                }} />
                              ) : (
                                <div style={{ fontSize: q(48) }}>🎁</div>
                              )}
                            </div>
                            {/* 物品名称 */}
                            <div style={{
                              color: '#e0d0ff', fontSize: maxPlayers >= 3 ? q(16) : q(18), fontWeight: 600,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              marginBottom: q(4),
                            }}>
                              {item.goodsName}
                            </div>
                            {/* 物品价值 */}
                            <div style={{
                              color: '#ffd700', fontSize: maxPlayers >= 3 ? q(18) : q(22), fontWeight: 800,
                            }}>
                              ¥{parseFloat(item.goodsValue).toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* 等待状态 */}
        {gameStatus === 'waiting' && (
          <div style={{
            textAlign: 'center', padding: `${q(40)} 0`,
            color: '#9ca3af', fontSize: q(26),
          }}>
            <div style={{ fontSize: q(60), marginBottom: q(16), animation: 'pulse 1.5s ease-in-out infinite' }}>⏳</div>
            {isPresent ? (
              <>已加入，等待其他玩家... ({players.length}/{maxPlayers})</>
            ) : (
              <>等待玩家加入... ({players.length}/{maxPlayers})</>
            )}
            <div style={{ color: '#6b7280', fontSize: q(22), marginTop: q(12) }}>
              入场费：{parseFloat(room.entryFee).toFixed(0)} 金币/人
            </div>
            {!isPresent && myPlayerId > 0 && (
              <div style={{ color: '#60a5fa', fontSize: q(22), marginTop: q(8) }}>
                点击上方空座位的“加入”按钮参与游戏
              </div>
            )}
            {joinError && (
              <div style={{ color: '#ef4444', fontSize: q(22), marginTop: q(8) }}>
                {joinError}
              </div>
            )}
          </div>
        )}

        {/* 游戏结束展示 */}
        {gameStatus === 'finished' && gameOverData && (() => {
          const winner = gameOverData.players.find((p) => p.isWinner);
          const sortedPlayers = [...gameOverData.players].sort((a, b) => a.seatNo - b.seatNo);
          return (
            <div style={{
              background: 'linear-gradient(135deg,rgba(30,10,65,0.95),rgba(15,5,40,0.98))',
              border: '2px solid rgba(245,200,66,0.5)',
              borderRadius: q(16), padding: q(24),
              marginBottom: q(20),
              boxShadow: '0 0 40px rgba(245,200,66,0.2)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: q(24) }}>
                <div style={{ fontSize: q(72) }}>{winner ? '🏆' : '🤝'}</div>
                <div style={{
                  color: '#f5c842', fontSize: q(44), fontWeight: 900, marginTop: q(8),
                  textShadow: '0 0 20px rgba(245,200,66,0.8)',
                  animation: 'arenaWinnerBounce 1s ease-in-out infinite',
                }}>
                  {winner ? `${winner.nickname} 获胜！` : '平局'}
                </div>
                {winner && (
                  <div style={{ color: '#9ca3af', fontSize: q(22), marginTop: q(6) }}>
                    奖励总价值：
                    <span style={{ color: '#ffd700', fontWeight: 700 }}>
                      ¥{sortedPlayers.reduce((s, p) => s + parseFloat(p.totalValue), 0).toFixed(2)}
                    </span>
                  </div>
                )}
                {/* 道具入背包提示 / 输家结算提示 */}
                {(() => {
                  const myData = gameOverData?.players.find((p) => p.playerId === myPlayerId);
                  if (!myData) return null;
                  const itemCount = totalRounds;
                  // 输家专属提示
                  if (!myData.isWinner && !gameOverData?.isDraw) {
                    return (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: q(8),
                        marginTop: q(10),
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.35)',
                        borderRadius: q(20),
                        padding: `${q(6)} ${q(20)}`,
                        boxShadow: '0 0 12px rgba(239,68,68,0.15)',
                      }}>
                        <span style={{ fontSize: q(28) }}>💔</span>
                        <span style={{ color: '#ef4444', fontSize: q(22), fontWeight: 700 }}>
                          本局失利，物品已转移给赢家
                        </span>
                      </div>
                    );
                  }
                  // 赢家提示
                  if (myData.isWinner) {
                    const allItemCount = totalRounds * maxPlayers;
                    return (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: q(8),
                        marginTop: q(10),
                        background: 'rgba(34,197,94,0.15)',
                        border: '1px solid rgba(34,197,94,0.4)',
                        borderRadius: q(20),
                        padding: `${q(6)} ${q(20)}`,
                        boxShadow: '0 0 12px rgba(34,197,94,0.2)',
                      }}>
                        <span style={{ fontSize: q(28) }}>🎒</span>
                        <span style={{ color: '#22c55e', fontSize: q(22), fontWeight: 700 }}>
                          {allItemCount} 件道具已入背包
                        </span>
                      </div>
                    );
                  }
                  // 平局提示
                  return (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: q(8),
                      marginTop: q(10),
                      background: 'rgba(34,197,94,0.15)',
                      border: '1px solid rgba(34,197,94,0.4)',
                      borderRadius: q(20),
                      padding: `${q(6)} ${q(20)}`,
                      boxShadow: '0 0 12px rgba(34,197,94,0.2)',
                    }}>
                      <span style={{ fontSize: q(28) }}>🎒</span>
                      <span style={{ color: '#22c55e', fontSize: q(22), fontWeight: 700 }}>
                        {itemCount} 件道具已入背包
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div style={{ display: 'flex', gap: q(12) }}>
                {sortedPlayers.map((p, pIdx) => {
                  const pDraw = gameOverData?.isDraw ?? false;
                  const borderColor = pDraw ? '#9ca3af' : p.isWinner ? '#f5c842' : '#ef4444';
                  const bgColor = pDraw ? 'rgba(156,163,175,0.1)' : p.isWinner ? 'rgba(245,200,66,0.15)' : 'rgba(239,68,68,0.08)';
                  const badgeBg = pDraw
                    ? 'linear-gradient(135deg,#6b7280,#9ca3af)'
                    : p.isWinner
                      ? 'linear-gradient(135deg,#f5c842,#c8860a)'
                      : 'linear-gradient(135deg,#ef4444,#991b1b)';
                  const badgeText = pDraw ? '🤝 平局' : p.isWinner ? '👑 胜利' : '💔 失败';
                  const valueLabel = pDraw ? '↔ 平局保留物品' : p.isWinner ? '⬆ 最高总价値' : '⬇ 较低总价値';
                  const valueColor = pDraw ? '#9ca3af' : p.isWinner ? '#22c55e' : '#ef4444';
                  return (
                  <div
                    key={`${p.seatNo}-${pIdx}`}
                    style={{
                      flex: 1, textAlign: 'center', position: 'relative',
                      background: bgColor,
                      border: `2px solid ${borderColor}`,
                      borderRadius: q(12), padding: `${q(20)} ${q(12)} ${q(12)}`,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: q(-14), left: '50%', transform: 'translateX(-50%)',
                      background: badgeBg,
                      borderRadius: q(20), padding: `${q(4)} ${q(16)}`,
                      color: '#fff', fontSize: q(20), fontWeight: 800,
                      whiteSpace: 'nowrap', boxShadow: p.isWinner ? '0 2px 12px rgba(245,200,66,0.5)' : 'none',
                    }}>
                      {badgeText}
                    </div>
                    <img
                      src={getAvatarUrl(p.avatar)}
                      alt=""
                      style={{ width: q(60), height: q(60), borderRadius: '50%', marginBottom: q(8), border: `2px solid ${borderColor}`, objectFit: 'cover' }}
                    />
                    <div style={{ color: '#e0d0ff', fontSize: q(22), fontWeight: 600 }}>{p.nickname}</div>
                    <div style={{ color: '#ffd700', fontSize: q(28), fontWeight: 800, marginTop: q(6) }}>
                      ¥{parseFloat(p.totalValue).toFixed(2)}
                    </div>
                    <div style={{ color: valueColor, fontSize: q(18), marginTop: q(4) }}>
                      {valueLabel}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 返回按鈕 + 再次回放按鈕 */}
        {gameStatus === 'finished' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: q(12), marginTop: q(20) }}>
            {/* 回放模式下显示“再次回放”按鈕 */}
            {isReplayMode && (
              <button
                onClick={() => {
                  // 递增 replayKey 强制重新开始回放
                  setReplayKey((k) => k + 1);
                  // 重置回放相关状态
                  replayStartedRef.current = -1;
                  setIsReplaying(false);
                  setReplayRound(0);
                  replayRoundRef.current = 0;
                  setReplayWaitingIntro(false);
                  introShownRef.current = false;
                  setShowIntro(false);
                  setSpinning(false);
                  setSpinDoneCount(0);
                  setSkipGameAnim(false);
                  setGameOverData(null);
                  setRoundResults({});
                  setCurrentRound(1);
                  setCurrentRoundItems({});
                  setLiveValues({});
                  pendingGameOverRef.current = null;
                  liveGameActiveRef.current = false;
                  liveRoundsReceivedRef.current = 0;
                }}
                style={{
                  display: 'block', width: '100%',
                  padding: q(18),
                  background: 'linear-gradient(135deg,rgba(96,165,250,0.25),rgba(59,130,246,0.15))',
                  border: '1.5px solid rgba(96,165,250,0.6)',
                  borderRadius: q(12), color: '#60a5fa',
                  fontSize: q(28), fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(96,165,250,0.2)',
                }}
              >
                ▶ 再次回放
              </button>
            )}
            <button
              onClick={() => navigate('/arena')}
              style={{
                display: 'block', width: '100%',
                padding: q(18),
                background: 'rgba(120,60,220,0.2)',
                border: '1.5px solid rgba(120,60,220,0.5)',
                borderRadius: q(12), color: '#c084fc',
                fontSize: q(28), fontWeight: 700, cursor: 'pointer',
              }}
            >
              返回大厅
            </button>
          </div>
        )}
      </div>

      {/* 弹幕发送输入框：游戏进行中显示 */}
      {(gameStatus === 'playing' || gameStatus === 'finished') && (
        <div style={{
          position: 'relative', zIndex: 10,
          padding: `${q(8)} ${q(12)}`,
          background: 'rgba(13,6,33,0.9)',
          borderTop: '1px solid rgba(120,60,220,0.3)',
          display: 'flex', gap: q(8), alignItems: 'center',
        }}>
          <input
            value={danmakuInput}
            onChange={e => setDanmakuInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && danmakuInput.trim()) handleSendDanmaku(); }}
            placeholder="发弹幕..."
            maxLength={30}
            style={{
              flex: 1, background: 'rgba(30,12,60,0.8)',
              border: '1px solid rgba(120,60,220,0.4)',
              borderRadius: q(20), padding: `${q(10)} ${q(16)}`,
              color: '#e0d0ff', fontSize: q(24), outline: 'none',
            }}
          />
          <button
            onClick={handleSendDanmaku}
            disabled={danmakuSending || !danmakuInput.trim()}
            style={{
              background: danmakuInput.trim() ? 'linear-gradient(135deg,#7c3aed,#c084fc)' : 'rgba(120,60,220,0.2)',
              border: 'none', borderRadius: q(20),
              padding: `${q(10)} ${q(20)}`,
              color: '#fff', fontSize: q(24), fontWeight: 700,
              cursor: danmakuInput.trim() ? 'pointer' : 'not-allowed',
              opacity: danmakuSending ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {danmakuSending ? '...' : '发送'}
          </button>
        </div>
      )}

      {/* 底部导航 */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <BottomNav />
      </div>

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      {/* 动画 CSS */}
      <style>{`
        @keyframes slotSpin {
          0% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }
        @keyframes slotTextFlip {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes arenaPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes arenaLegendaryShine {
          0% { box-shadow: 0 0 30px rgba(245,200,66,0.8), 0 0 60px rgba(245,200,66,0.4); }
          50% { box-shadow: 0 0 50px rgba(245,200,66,1), 0 0 100px rgba(245,200,66,0.6), 0 0 140px rgba(245,200,66,0.2); }
          100% { box-shadow: 0 0 30px rgba(245,200,66,0.8), 0 0 60px rgba(245,200,66,0.4); }
        }
        .arena-legendary-glow { animation: arenaLegendaryShine 1.2s ease-in-out infinite !important; }
        @keyframes arenaRarePulse {
          0% { box-shadow: 0 0 25px rgba(192,132,252,0.8), 0 0 50px rgba(192,132,252,0.4); }
          50% { box-shadow: 0 0 40px rgba(192,132,252,1), 0 0 80px rgba(192,132,252,0.6); }
          100% { box-shadow: 0 0 25px rgba(192,132,252,0.8), 0 0 50px rgba(192,132,252,0.4); }
        }
        .arena-rare-pulse { animation: arenaRarePulse 1.5s ease-in-out infinite !important; }
        @keyframes arenaWinnerBounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-6px); }
          75% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
