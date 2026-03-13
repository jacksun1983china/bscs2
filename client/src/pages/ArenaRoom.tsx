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
import { playSlotStop, playWinFanfare, playLoseTone } from '@/lib/arenaSound';
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

// 卷轴单元格高度（cqw单位的px基准）
const REEL_ITEM_PX = 160;

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
  /** 跳过动画，直接显示最终结果 */
  skipAnim?: boolean;
  /** 箱子内道具列表，用于卷轴滚动 */
  reelItems?: Array<{ id: number; name: string; imageUrl: string; goodsLevel: number }>;
}

function SlotMachine({ finalItem, spinning, onDone, width = '100%', skipAnim = false, reelItems = [] }: SlotMachineProps) {
  const [showFinal, setShowFinal] = useState(false);
  const [displayItem, setDisplayItem] = useState<typeof finalItem>(null);
  const [translateY, setTranslateY] = useState(0);
  const [transition, setTransition] = useState('none');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 构建卷轴条目：目标放在第一格，后面跟随机条目
  // 滚动方向：从上往下（translateY 从负大到 0）
  const buildReel = useCallback((target: typeof finalItem, items: typeof reelItems) => {
    if (!target) return [];
    const pool = items.length > 0 ? items : [
      { id: 0, name: '传说武器', imageUrl: '', goodsLevel: 1 },
      { id: 1, name: '稀有装备', imageUrl: '', goodsLevel: 2 },
      { id: 2, name: '普通道具', imageUrl: '', goodsLevel: 3 },
      { id: 3, name: '回收物品', imageUrl: '', goodsLevel: 4 },
      { id: 4, name: '神秘宝笱', imageUrl: '', goodsLevel: 2 },
      { id: 5, name: '限定皮肤', imageUrl: '', goodsLevel: 1 },
    ];
    // 目标放在第一格，后面跟 30 个随机条目
    const reel: Array<{ id: number; name: string; imageUrl: string; goodsLevel: number }> = [];
    reel.push({ id: target.goodsId, name: target.goodsName, imageUrl: target.goodsImage, goodsLevel: target.goodsLevel });
    for (let i = 0; i < 30; i++) {
      reel.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return reel;
  }, []);

  const [reel, setReel] = useState<Array<{ id: number; name: string; imageUrl: string; goodsLevel: number }>>([]);

  // 跳过：直接显示最终结果
  useEffect(() => {
    if (skipAnim && finalItem) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setTransition('none');
      setTranslateY(0);
      setShowFinal(true);
      setDisplayItem(finalItem);
      onDone?.();
    }
  }, [skipAnim]);

  // 修复：spinning=true 但 finalItem=null 时，立即调用 onDone 避免卡住
  useEffect(() => {
    if (spinning && !finalItem && !skipAnim) {
      onDone?.();
    }
  }, [spinning, finalItem]);

  useEffect(() => {
    if (spinning && finalItem && !skipAnim) {
      const newReel = buildReel(finalItem, reelItems);
      setReel(newReel);
      setShowFinal(false);
      setDisplayItem(null);

      // 目标在第一格（index=0）
      // 滚动方向：从上往下（卷轴从底部开始，向上滚到顶部）
      // 初始位置：把卷轴放到最底部（展示最后一格）
      const totalItems = newReel.length;
      const startY = -((totalItems - 1) * REEL_ITEM_PX); // 卷轴展示最后一格
      const finalY = 0; // 目标：展示第一格（目标物品）
      const preY = -(1 * REEL_ITEM_PX); // 先停到目标后一格（弹性起点）

      // 重置到底部（无动画）
      setTransition('none');
      setTranslateY(startY);

      // 第一阶段：快速加速向上滚动（2.2s，从底部滚到目标前一格）
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransition(`transform 2.2s cubic-bezier(0.25, 0.1, 0.1, 1.0)`);
          setTranslateY(preY);
        });
      });

      // 第二阶段：弹性停止到目标（0.4s，弹性曲线）
      timerRef.current = setTimeout(() => {
        setTransition(`transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)`);
        setTranslateY(finalY);
        playSlotStop(finalItem.goodsLevel);

        // 动画结束后展示最终结果（同步更新两个状态确保一致）
        timerRef.current = setTimeout(() => {
          const itemToShow = finalItem; // 单独引用确保闭包捕获正确结果
          setDisplayItem(itemToShow);
          setShowFinal(true);
          onDone?.();
        }, 450);
      }, 2200);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [spinning, finalItem]);

  const glowAnimClass = showFinal && displayItem?.goodsLevel === 1
    ? 'arena-legendary-glow'
    : showFinal && displayItem?.goodsLevel === 2
      ? 'arena-rare-pulse'
      : '';

  const itemH = q(REEL_ITEM_PX);
  // 可见窗口高度 = 3行
  const windowH = q(REEL_ITEM_PX * 3);

  return (
    <div
      className={glowAnimClass}
      style={{
        width,
        background: showFinal
          ? LEVEL_BG[displayItem?.goodsLevel ?? 3]
          : 'rgba(12,4,30,0.95)',
        border: `2px solid ${
          showFinal
            ? LEVEL_GLOW[displayItem?.goodsLevel ?? 3].replace('0.6)', '1)').replace('0.4)', '1)').replace('0.3)', '1)')
            : 'rgba(120,60,220,0.5)'
        }`,
        borderRadius: q(12),
        textAlign: 'center',
        transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s',
        boxShadow: showFinal
          ? displayItem?.goodsLevel === 1
            ? `0 0 30px rgba(245,200,66,0.8), 0 0 60px rgba(245,200,66,0.4)`
            : displayItem?.goodsLevel === 2
              ? `0 0 25px rgba(192,132,252,0.8), 0 0 50px rgba(192,132,252,0.4)`
              : `0 0 15px ${LEVEL_GLOW[displayItem?.goodsLevel ?? 3]}`
          : '0 0 8px rgba(80,20,160,0.4)',
        position: 'relative',
        overflow: 'hidden',
        height: showFinal ? 'auto' : windowH,
        minHeight: showFinal ? q(REEL_ITEM_PX + 60) : windowH,
      }}
    >
      {/* 卷轴滚动区域（spinning时显示） */}
      {!showFinal && (
        <>
          {/* 顶部/底部渐变遮罩 */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '35%',
            background: 'linear-gradient(to bottom, rgba(12,4,30,0.95) 0%, transparent 100%)',
            zIndex: 3, pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%',
            background: 'linear-gradient(to top, rgba(12,4,30,0.95) 0%, transparent 100%)',
            zIndex: 3, pointerEvents: 'none',
          }} />
          {/* 中间选中框 */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: '50%', transform: 'translateY(-50%)',
            height: itemH,
            border: '2px solid rgba(192,132,252,0.8)',
            boxShadow: '0 0 12px rgba(192,132,252,0.5), inset 0 0 8px rgba(192,132,252,0.1)',
            zIndex: 4, pointerEvents: 'none',
            borderRadius: q(8),
          }} />
          {/* 卷轴条目 */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            transform: `translateY(calc(50% - ${q(REEL_ITEM_PX / 2)} + ${q(translateY)}))`,
            transition,
            willChange: 'transform',
          }}>
            {reel.map((item, idx) => (
              <div key={idx} style={{
                width: '100%', height: itemH,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: `${q(8)} ${q(4)}`,
                flexShrink: 0,
              }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name}
                    style={{ width: q(90), height: q(90), objectFit: 'contain', marginBottom: q(4) }} />
                ) : (
                  <div style={{
                    width: q(90), height: q(90), marginBottom: q(4),
                    background: LEVEL_BG[item.goodsLevel] || 'rgba(120,60,220,0.3)',
                    borderRadius: q(8),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: q(36),
                  }}>🎁</div>
                )}
                <div style={{
                  color: '#e0d0ff', fontSize: q(16), fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  width: '90%', textAlign: 'center',
                }}>{item.name}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 最终结果展示 */}
      {showFinal && displayItem && (
        <div style={{
          padding: `${q(16)} ${q(12)}`,
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
          <div style={{ width: q(120), height: q(120), marginBottom: q(8), position: 'relative', zIndex: 1 }}>
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
                borderRadius: q(12),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: q(48),
              }}>🎁</div>
            )}
          </div>
          <div style={{
            display: 'inline-block', padding: `${q(3)} ${q(12)}`,
            background: 'rgba(0,0,0,0.4)', borderRadius: q(4),
            color: '#fff', fontSize: q(18), fontWeight: 700, marginBottom: q(6), zIndex: 1, position: 'relative',
          }}>
            {LEVEL_LABEL[displayItem.goodsLevel]}
          </div>
          <div style={{
            color: '#fff', fontSize: q(20), fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            width: '90%', zIndex: 1, position: 'relative',
          }}>
            {displayItem.goodsName}
          </div>
          <div style={{ color: '#ffd700', fontSize: q(24), fontWeight: 700, marginTop: q(6), zIndex: 1, position: 'relative' }}>
            ¥{parseFloat(displayItem.goodsValue).toFixed(2)}
          </div>
        </div>
      )}

      {/* 等待状态 */}
      {!showFinal && !spinning && (
        <div style={{
          height: q(REEL_ITEM_PX + 60),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(192,132,252,0.4)', fontSize: q(22),
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
  /** 实时累计价值（游戏进行中） */
  liveValue?: number;
}

function PlayerSeat({ player, seatNo, isEmpty = false, isWinner = false, liveValue }: PlayerSeatProps) {
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
      border: `2px solid ${isWinner ? '#f5c842' : isEmpty ? 'rgba(120,60,220,0.2)' : 'rgba(120,60,220,0.4)'}`,
      borderRadius: q(12), padding: q(12),
      textAlign: 'center',
      boxShadow: isWinner ? '0 0 20px rgba(245,200,66,0.5)' : 'none',
      position: 'relative',
      transition: 'box-shadow 0.3s ease',
    }}>
      {isWinner && (
        <div style={{
          position: 'absolute', top: q(-12), left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg,#f5c842,#c8860a)',
          borderRadius: q(10), padding: `${q(2)} ${q(12)}`,
          color: '#fff', fontSize: q(18), fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>👑 胜利</div>
      )}
      {isEmpty ? (
        <>
          <div style={{
            width: q(60), height: q(60), borderRadius: '50%',
            background: 'rgba(120,60,220,0.15)',
            border: '2px dashed rgba(120,60,220,0.3)',
            margin: '0 auto', marginBottom: q(8),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#6b7280', fontSize: q(28) }}>?</span>
          </div>
          <div style={{ color: '#6b7280', fontSize: q(22) }}>等待加入</div>
        </>
      ) : (
        <>
          <img
            src={getAvatarUrl(player?.avatar)}
            alt=""
            style={{
              width: q(60), height: q(60), borderRadius: '50%',
              border: `2px solid ${isWinner ? '#f5c842' : 'rgba(120,60,220,0.5)'}`,
              marginBottom: q(8),
              objectFit: 'cover',
            }}
          />
          <div style={{ color: '#e0d0ff', fontSize: q(22), fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {player?.nickname}
          </div>
          {/* 实时累计价值（游戏进行中） */}
          {liveValue !== undefined && liveValue > 0 && (
            <div style={{
              color: '#ffd700', fontSize: q(22), fontWeight: 700, marginTop: q(4),
              transform: bump ? 'scale(1.25)' : 'scale(1)',
              transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              textShadow: bump ? '0 0 12px rgba(255,215,0,0.9)' : 'none',
            }}>
              ¥{liveValue.toFixed(2)}
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
  const replaySpinStartedRef = useRef(0); // 记录已经启动 slot 的轮次，防止重复触发
  const [isReplaying, setIsReplaying] = useState(false);
  // 回放是否正在等待开场动画完成（线性流程：开场动画 → slot动画）
  const [replayWaitingIntro, setReplayWaitingIntro] = useState(false);

  const [isPresent, setIsPresent] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  // 控制 getRoomDetail 延迟启动，避免与 joinRoom 并发触发 429
  const [roomDetailEnabled, setRoomDetailEnabled] = useState(false);

  // ── 开场碰撞动画状态 ──
  const [showIntro, setShowIntro] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);
  const introShownRef = useRef(false); // 防止重复触发
  const showIntroRef = useRef(false); // 实时跟踪 showIntro 状态，供事件处理函数读取
  // 开场动画期间到达的 round_result 缓存队列，动画结束后按顺序触发
  const pendingSpinRef = useRef<Array<{ itemMap: Record<number, { goodsId: number; goodsName: string; goodsImage: string; goodsLevel: number; goodsValue: string }>; roundNo: number }>>([]);

  // ── 跳过游戏动画状态 ──
  const [skipGameAnim, setSkipGameAnim] = useState(false);

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

  // 重试计数，避免 429 时无限重试
  const joinRetryRef = useRef(0);

  const joinRoom = trpc.arena.joinRoom.useMutation({
    onSuccess: (data) => {
      joinRetryRef.current = 0;
      setIsPresent(true);
      setJoinLoading(false);
      // 立即启用 roomDetail，缩短延迟到 100ms（仅用于避免同一批次并发）
      setTimeout(() => {
        setRoomDetailEnabled(true);
        // 如果 joinRoom 返回的状态已是 playing（房间已满），直接触发游戏开始逻辑
        // 这样即使错过了 SSE 的 game_started 广播也能正常开始
        if (data?.roomStatus === 'playing' || data?.isFull) {
          setGameStatus('playing');
          setCurrentRound(1);
          // 再延迟 50ms 让 roomDetailEnabled 状态生效后再 refetch
          setTimeout(() => refetchRoom(), 50);
        }
      }, 100);
    },
    onError: (err) => {
      setJoinLoading(false);
      // 429 Too Many Requests：自动重试（最多 2 次，逐次加长延迟）
      const httpStatus = (err as any)?.data?.httpStatus;
      const is429 = httpStatus === 429 || err.message?.includes('429');
      if (is429 && joinRetryRef.current < 2) {
        joinRetryRef.current += 1;
        const delay = 1500 * joinRetryRef.current; // 1.5s, 3s
        setTimeout(() => {
          setJoinLoading(true);
          joinRoom.mutate({ roomId });
        }, delay);
        return;
      }
      joinRetryRef.current = 0;
      // 房间已满、已不在等待状态（playing/finished）时，不显示错误，让roomDetail的useEffect处理展示
      if (err.message.includes('已满') || err.message.includes('不在等待') || err.message.includes('已不在等待')) {
        setIsPresent(false);
        // 延迟启用 getRoomDetail，以便显示房间当前状态
        setTimeout(() => setRoomDetailEnabled(true), 800);
      } else {
        setJoinError(err.message);
        // 其他错误也要启用 getRoomDetail，让用户能看到房间信息
        setTimeout(() => setRoomDetailEnabled(true), 800);
      }
    },
  });

  // 超时兜底：5 秒后若仍在加载中，强制退出加载状态并启用 roomDetail
  useEffect(() => {
    if (roomId > 0) {
      const timer = setTimeout(() => {
        setJoinLoading(false);
        setRoomDetailEnabled(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [roomId]);

  useEffect(() => {
    if (roomId > 0) {
      setJoinLoading(true);
      joinRoom.mutate({ roomId });
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
    players: Array<{ playerId: number; nickname: string; avatar: string; seatNo: number; totalValue: string; isWinner: boolean }>;
  } | null>(null);

  const [currentRoundItems, setCurrentRoundItems] = useState<Record<number, {
    goodsId: number; goodsName: string; goodsImage: string; goodsLevel: number; goodsValue: string;
  }>>({})

  // 开奖展示覆盖层
  const [showRoundReveal, setShowRoundReveal] = useState(false);
  const [revealItems, setRevealItems] = useState<Array<{
    nickname: string;
    goodsName: string;
    goodsImage: string;
    goodsLevel: number;
    goodsValue: string;
  }>>([]);;

  const spinRound = trpc.arena.spinRound.useMutation({
    onSuccess: (data) => {
      if (!data.alreadyDone) {
        const itemMap: typeof currentRoundItems = {};
        for (const r of data.results as any[]) {
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
        setSkipGameAnim(false); // 新一轮开始，重置跳过状态
      }
    },
    onError: (err) => {
      alert(err.message);
    },
  });

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
      case 'player_joined':
        refetchRoom();
        break;
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
        // 确保 gameStatus 为 playing（观战者可能在 roomDetail 加载前收到此消息）
        setGameStatus('playing');
        setCurrentRound(roundNo);
        setRoundResults((prev) => {
          const enriched = results.map((r: any) => ({ ...r }));
          return { ...prev, [roundNo]: enriched };
        });
        // 更新实时累计价値
        setLiveValues((prev) => {
          const next = { ...prev };
          for (const r of results) {
            next[r.playerId] = (next[r.playerId] ?? 0) + parseFloat(r.goodsValue);
          }
          return next;
        });
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
        setCurrentRoundItems(itemMap);
        if (showIntroRef.current) {
          // 开场动画正在播放，将结果加入队列，动画结束后按顺序触发 slot
          pendingSpinRef.current.push({ itemMap, roundNo });
          // 不设置 spinning=true，避免在开场动画期间在后台播放动画
        } else {
          // 开场动画已结束，直接触发 slot 动画
          setSpinning(true);
          setSpinDoneCount(0);
          setSkipGameAnim(false);
        }
        break;
      }
      case 'game_over': {
        const overData = {
          winnerId: msg.winnerId as number,
          players: msg.players as any[],
        };
        setGameOverData(overData);
        setGameStatus('finished');
        refetchRoom();
        setTimeout(() => {
          if (overData.players.some((p) => p.isWinner)) playWinFanfare();
          else playLoseTone();
        }, 500);
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
      const status = roomDetail.room.status as 'waiting' | 'playing' | 'finished' | 'cancelled';
      if (status === 'playing') {
        setGameStatus('playing');
        // 不强制设置 isPresent，保留原有状态（参与者=true, 观战者=false）
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
        } else if (roomDetail.players.length >= 2) {
          // 还没有轮次结果，触发开场动画（参与者和观战者都要看）
          triggerIntro(roomDetail.players);
        }
      } else if (status === 'finished') {
        setGameStatus('finished');
        if (!isPresent && !gameOverData && roomDetail.players.length > 0) {
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
      if (roomDetail.room.currentRound > 0) setCurrentRound(roomDetail.room.currentRound);
    }
  }, [roomDetail, isPresent, gameOverData]);

  // ── 同步已有轮次结果 ──
  useEffect(() => {
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

  // ── 兑底恢复：当 roomDetail 加载完成且游戏已结束（finished）但前端还在 playing 状态时，自动触发回放 ──
  // 这处理了服务器重启后 SSE game_over 消息丢失的情况
  useEffect(() => {
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
      if (next >= maxPlayers) {
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

          setTimeout(() => {
            setShowRoundReveal(false);
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

          setTimeout(() => {
            setShowRoundReveal(false);
            // 检查队列中是否有待处理的轮次（服务器恢复时快速广播的多轮结果）
            if (pendingSpinRef.current.length > 0) {
              const nextPending = pendingSpinRef.current[0];
              pendingSpinRef.current = pendingSpinRef.current.slice(1);
              setTimeout(() => {
                setCurrentRoundItems(nextPending.itemMap);
                setCurrentRound(nextPending.roundNo);
                setSpinning(true);
                setSpinDoneCount(0);
                setSkipGameAnim(false);
              }, 100);
            } else if (currentRound < totalRounds) {
              setCurrentRound((r) => r + 1);
              // 不清空 currentRoundItems，等待 SSE round_result 消息覆盖，避免 SlotMachine 动画中断
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
    // 兜底恢复：开场动画结束后 pendingSpinRef 为空，说明 SSE 消息在服务器重启时丢失了。
    // 检查 roomDetailRef 中是否有历史轮次结果，有则自动触发回放，避免永久卡在"等待开始"。
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
    }
  }, [isReplaying]); // isReplaying 是唯一需要的依赖，其余通过 ref 访问

  if (joinLoading && !room) {
    return (
      <div className="phone-container" style={{ display: 'flex', flexDirection: 'column', containerType: 'inline-size', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#9ca3af', fontSize: q(28) }}>进入房间中...</div>
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="phone-container" style={{ display: 'flex', flexDirection: 'column', containerType: 'inline-size', alignItems: 'center', justifyContent: 'center', gap: q(20) }}>
        <div style={{ color: '#ef4444', fontSize: q(28) }}>{joinError}</div>
        <button onClick={() => navigate('/arena')} style={{ padding: `${q(12)} ${q(32)}`, background: 'rgba(120,60,220,0.3)', border: '1px solid #c084fc', borderRadius: q(10), color: '#c084fc', fontSize: q(24), cursor: 'pointer' }}>返回大厅</button>
      </div>
    );
  }

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
        <div style={{ display: 'flex', gap: q(12), marginBottom: q(20) }}>
          {Array.from({ length: maxPlayers }).map((_, i) => {
            const seatNo = i + 1;
            const p = players.find((pl) => pl.seatNo === seatNo);
            const winnerData = gameOverData?.players.find((pl) => pl.seatNo === seatNo);
            return (
              <PlayerSeat
                key={seatNo}
                seatNo={seatNo}
                player={winnerData ? { ...p!, totalValue: winnerData.totalValue, isWinner: winnerData.isWinner ? 1 : 0 } : p}
                isEmpty={!p}
                isWinner={winnerData?.isWinner ?? false}
                liveValue={gameStatus === 'playing' && p ? (liveValues[p.playerId] ?? 0) : undefined}
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
                  key={box.id}
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
                key={d.id}
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
            <div style={{ display: 'flex', gap: q(12) }}>
              {Array.from({ length: maxPlayers }).map((_, i) => {
                const seatNo = i + 1;
                const p = players.find((pl) => pl.seatNo === seatNo);
                const finalItem = p ? currentRoundItems[p.playerId] ?? null : null;
                // 当前轮次对应的笱子ID
                const currentBoxId = roomDetail?.boxList?.[currentRound - 1]?.id;
                const reelItems = currentBoxId && boxGoodsMap ? (boxGoodsMap[currentBoxId] ?? []) : [];
                return (
                  <div key={seatNo} style={{ flex: 1 }}>
                    <div style={{ color: '#9ca3af', fontSize: q(20), textAlign: 'center', marginBottom: q(6) }}>
                      {p?.nickname ?? `玩家${seatNo}`}
                    </div>
                    <SlotMachine
                      finalItem={finalItem}
                      spinning={spinning}
                      onDone={handleSlotDone}
                      skipAnim={skipGameAnim}
                      reelItems={reelItems}
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

            {/* 开始按钮：仅参与者且没有机器人时显示（机器人房间由服务端自动开箱，避免并发重复） */}
            {!spinning && isPresent && players.length >= maxPlayers && !isReplaying && !players.some(p => p.playerId < 0) && (
              <button
                onClick={() => spinRound.mutate({ roomId, roundNo: currentRound })}
                disabled={spinRound.isPending}
                style={{
                  display: 'block', width: '100%', marginTop: q(20),
                  padding: q(20),
                  background: 'linear-gradient(135deg,#7c3aed,#c084fc)',
                  border: 'none', borderRadius: q(12),
                  color: '#fff', fontSize: q(32), fontWeight: 800,
                  cursor: spinRound.isPending ? 'not-allowed' : 'pointer',
                  opacity: spinRound.isPending ? 0.6 : 1,
                  boxShadow: '0 6px 24px rgba(124,58,237,0.6)',
                  letterSpacing: 2,
                }}
              >
                {spinRound.isPending ? '开箱中...' : `🎰 开始第 ${currentRound} 轮`}
              </button>
            )}
            {players.length < maxPlayers && (
              <div style={{ textAlign: 'center', marginTop: q(20), color: '#9ca3af', fontSize: q(26) }}>
                等待其他玩家加入...（{players.length}/{maxPlayers}）
              </div>
            )}
          </div>
        )}

        {/* 等待状态 */}
        {gameStatus === 'waiting' && (
          <div style={{
            textAlign: 'center', padding: `${q(40)} 0`,
            color: '#9ca3af', fontSize: q(26),
          }}>
            <div style={{ fontSize: q(60), marginBottom: q(16), animation: 'pulse 1.5s ease-in-out infinite' }}>⏳</div>
            等待玩家加入... ({players.length}/{maxPlayers})
            <div style={{ color: '#6b7280', fontSize: q(22), marginTop: q(12) }}>
              入场费：{parseFloat(room.entryFee).toFixed(0)} 金币/人
            </div>
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
                {/* 道具入背包提示 */}
                {(() => {
                  const myData = gameOverData?.players.find((p) => p.playerId === myPlayerId);
                  if (!myData) return null;
                  // 计算当前玩家获得的道具数量（每轮一件，共 totalRounds 轮）
                  const itemCount = totalRounds;
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
                {sortedPlayers.map((p) => (
                  <div
                    key={p.playerId}
                    style={{
                      flex: 1, textAlign: 'center', position: 'relative',
                      background: p.isWinner ? 'rgba(245,200,66,0.15)' : 'rgba(239,68,68,0.08)',
                      border: `2px solid ${p.isWinner ? '#f5c842' : '#ef4444'}`,
                      borderRadius: q(12), padding: `${q(20)} ${q(12)} ${q(12)}`,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: q(-14), left: '50%', transform: 'translateX(-50%)',
                      background: p.isWinner
                        ? 'linear-gradient(135deg,#f5c842,#c8860a)'
                        : 'linear-gradient(135deg,#ef4444,#991b1b)',
                      borderRadius: q(20), padding: `${q(4)} ${q(16)}`,
                      color: '#fff', fontSize: q(20), fontWeight: 800,
                      whiteSpace: 'nowrap', boxShadow: p.isWinner ? '0 2px 12px rgba(245,200,66,0.5)' : 'none',
                    }}>
                      {p.isWinner ? '👑 胜利' : '💔 失败'}
                    </div>
                    <img
                      src={getAvatarUrl(p.avatar)}
                      alt=""
                      style={{ width: q(60), height: q(60), borderRadius: '50%', marginBottom: q(8), border: `2px solid ${p.isWinner ? '#f5c842' : '#ef4444'}`, objectFit: 'cover' }}
                    />
                    <div style={{ color: '#e0d0ff', fontSize: q(22), fontWeight: 600 }}>{p.nickname}</div>
                    <div style={{ color: '#ffd700', fontSize: q(28), fontWeight: 800, marginTop: q(6) }}>
                      ¥{parseFloat(p.totalValue).toFixed(2)}
                    </div>
                    <div style={{ color: p.isWinner ? '#22c55e' : '#ef4444', fontSize: q(18), marginTop: q(4) }}>
                      {p.isWinner ? '⬆ 最高总价值' : '⬇ 较低总价值'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 历史轮次结果 */}
        {Object.keys(roundResults).length > 0 && (
          <div>
            <div style={{ color: '#9ca3af', fontSize: q(22), marginBottom: q(8), display: 'flex', alignItems: 'center', gap: q(8) }}>
              <span style={{ width: q(4), height: q(18), background: 'linear-gradient(#c084fc,#7c3aed)', display: 'inline-block', borderRadius: q(2) }} />
              开箱记录
            </div>
            {Object.entries(roundResults).sort((a, b) => Number(a[0]) - Number(b[0])).map(([roundNo, results]) => {
              const enrichedResults = (results as any[]).map((r: any) => {
                if (r.seatNo && r.seatNo > 0) return r;
                const matchedPlayer = players.find((pl) => pl.playerId === r.playerId);
                return {
                  ...r,
                  seatNo: matchedPlayer?.seatNo ?? 0,
                  nickname: r.nickname || matchedPlayer?.nickname || `玩家${r.playerId}`,
                };
              }).sort((a: any, b: any) => a.seatNo - b.seatNo);
              return (
                <div key={roundNo} style={{
                  background: 'linear-gradient(135deg,rgba(20,8,50,0.85),rgba(12,4,30,0.9))',
                  border: '1px solid rgba(120,60,220,0.3)',
                  borderRadius: q(14), padding: q(16),
                  marginBottom: q(12),
                  boxShadow: '0 4px 16px rgba(80,20,160,0.2)',
                }}>
                  <div style={{
                    color: '#c084fc', fontSize: q(22), fontWeight: 700, marginBottom: q(12),
                    display: 'flex', alignItems: 'center', gap: q(8),
                    borderBottom: '1px solid rgba(120,60,220,0.2)', paddingBottom: q(8),
                  }}>
                    <span style={{
                      background: 'rgba(120,60,220,0.3)', borderRadius: q(6),
                      padding: `${q(2)} ${q(10)}`, fontSize: q(20),
                    }}>第 {roundNo} 轮</span>
                  </div>
                  <div style={{ display: 'flex', gap: q(10) }}>
                    {enrichedResults.map((r: any) => (
                      <div key={r.playerId} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ color: '#9ca3af', fontSize: q(18), marginBottom: q(8), fontWeight: 500 }}>{r.nickname}</div>
                        {/* 武器图卡片 */}
                        <div style={{
                          position: 'relative',
                          background: LEVEL_BG[r.goodsLevel],
                          borderRadius: q(12), padding: q(10),
                          boxShadow: r.goodsLevel === 1
                            ? `0 0 20px rgba(245,200,66,0.7), 0 0 40px rgba(245,200,66,0.3), inset 0 0 12px rgba(245,200,66,0.1)`
                            : r.goodsLevel === 2
                              ? `0 0 16px rgba(192,132,252,0.7), 0 0 32px rgba(192,132,252,0.3)`
                              : `0 0 10px ${LEVEL_GLOW[r.goodsLevel]}`,
                          overflow: 'hidden',
                        }}>
                          {/* 稀有度光效背景 */}
                          {r.goodsLevel <= 2 && (
                            <div style={{
                              position: 'absolute', inset: 0, pointerEvents: 'none',
                              background: r.goodsLevel === 1
                                ? 'radial-gradient(ellipse at 50% 20%, rgba(245,200,66,0.3) 0%, transparent 65%)'
                                : 'radial-gradient(ellipse at 50% 20%, rgba(192,132,252,0.25) 0%, transparent 65%)',
                              animation: 'arenaPulse 1.5s ease-in-out infinite',
                            }} />
                          )}
                          {/* 武器图 */}
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            {r.goodsImage ? (
                              <img
                                src={r.goodsImage}
                                alt={r.goodsName}
                                style={{
                                  width: q(110), height: q(110), objectFit: 'contain',
                                  marginBottom: q(6), display: 'block', margin: '0 auto',
                                  filter: r.goodsLevel === 1
                                    ? 'drop-shadow(0 0 10px rgba(245,200,66,0.9)) drop-shadow(0 0 20px rgba(245,200,66,0.5))'
                                    : r.goodsLevel === 2
                                      ? 'drop-shadow(0 0 8px rgba(192,132,252,0.9)) drop-shadow(0 0 16px rgba(192,132,252,0.5))'
                                      : 'none',
                                }}
                              />
                            ) : (
                              <div style={{
                                width: q(110), height: q(110), margin: '0 auto',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: q(48), marginBottom: q(6),
                              }}>🎁</div>
                            )}
                            {/* 品质标签 */}
                            <div style={{
                              display: 'inline-block', padding: `${q(2)} ${q(8)}`,
                              background: 'rgba(0,0,0,0.45)', borderRadius: q(4),
                              color: '#fff', fontSize: q(16), fontWeight: 700,
                              marginBottom: q(4),
                            }}>{LEVEL_LABEL[r.goodsLevel]}</div>
                            <div style={{
                              color: '#fff', fontSize: q(18), fontWeight: 600,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              marginBottom: q(4),
                            }}>{r.goodsName}</div>
                            <div style={{ color: '#ffd700', fontSize: q(22), fontWeight: 800 }}>
                              ¥{parseFloat(r.goodsValue).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
