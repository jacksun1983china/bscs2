/**
 * ArenaRoom.tsx — 竞技场游戏房间页
 * 布局：顶部导航 → 房间信息 → 玩家座位 → 老虎机滚动区域 → 轮次结果 → 最终胜负
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { playSlotTick, playSlotStop, playWinFanfare, playLoseTone } from '@/lib/arenaSound';
import { useLocation, useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import SettingsModal from '@/components/SettingsModal';
import { useArenaWS } from '@/hooks/useArenaWS';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// 品质颜色和标签
const LEVEL_BG: Record<number, string> = {
  1: 'linear-gradient(135deg,#c8860a,#f5c842)',  // 传说
  2: 'linear-gradient(135deg,#6a0dad,#c084fc)',  // 稀有
  3: 'linear-gradient(135deg,#1a4fa8,#60a5fa)',  // 普通
  4: 'linear-gradient(135deg,#4a4a4a,#9a9a9a)',  // 回收
};
const LEVEL_LABEL: Record<number, string> = { 1: '传说', 2: '稀有', 3: '普通', 4: '回收' };
const LEVEL_GLOW: Record<number, string> = {
  1: 'rgba(245,200,66,0.6)',
  2: 'rgba(192,132,252,0.6)',
  3: 'rgba(96,165,250,0.4)',
  4: 'rgba(156,163,175,0.3)',
};

// ── 老虎机滚动动画组件 ────────────────────────────────────────────────────

interface SlotMachineProps {
  /** 最终停止的物品 */
  finalItem: {
    goodsId: number;
    goodsName: string;
    goodsImage: string;
    goodsLevel: number;
    goodsValue: string;
  } | null;
  /** 是否开始滚动 */
  spinning: boolean;
  /** 滚动完成回调 */
  onDone?: () => void;
  /** 占位宽度 */
  width?: string;
}

function SlotMachine({ finalItem, spinning, onDone, width = '100%' }: SlotMachineProps) {
  const [displayItem, setDisplayItem] = useState<typeof finalItem>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 随机占位物品（用于滚动动画）
  const PLACEHOLDER_LEVELS = [1, 2, 3, 3, 3, 4, 2, 1, 3, 4];
  const PLACEHOLDER_NAMES = ['传说武器', '稀有装备', '普通道具', '回收物品', '神秘宝箱', '限定皮肤', '稀有配件', '普通材料'];
  const [rollingIdx, setRollingIdx] = useState(0);

  // 音效滴答计数器
  const tickCountRef = useRef(0);

  useEffect(() => {
    if (spinning && finalItem) {
      setIsRolling(true);
      setShowFinal(false);
      tickCountRef.current = 0;
      let idx = 0;
      // 动态加速：前期快，后期慢下来
      let interval = 60;
      const scheduleNext = () => {
        intervalRef.current = setTimeout(() => {
          idx = (idx + 1) % PLACEHOLDER_NAMES.length;
          setRollingIdx(idx);
          tickCountRef.current++;
          // 每隔两帧播放滚动音
          if (tickCountRef.current % 2 === 0) playSlotTick();
          // 后期动画慢下来（最后0.8秒）
          const elapsed = tickCountRef.current * interval;
          if (elapsed > 1700) interval = Math.min(interval + 15, 200);
          if (elapsed < 2500) scheduleNext();
        }, interval) as unknown as ReturnType<typeof setInterval>;
      };
      scheduleNext();
      // 2.5秒后停止
      timerRef.current = setTimeout(() => {
        if (intervalRef.current) clearTimeout(intervalRef.current as unknown as ReturnType<typeof setTimeout>);
        setIsRolling(false);
        setShowFinal(true);
        setDisplayItem(finalItem);
        // 根据品质播放不同音效
        playSlotStop(finalItem.goodsLevel);
        onDone?.();
      }, 2500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearTimeout(intervalRef.current as unknown as ReturnType<typeof setTimeout>);
    };
  }, [spinning, finalItem]);

  const currentLevel = isRolling ? PLACEHOLDER_LEVELS[rollingIdx % PLACEHOLDER_LEVELS.length] : (displayItem?.goodsLevel ?? 3);
  const currentName = isRolling ? PLACEHOLDER_NAMES[rollingIdx] : (displayItem?.goodsName ?? '');
  const currentImage = isRolling ? '' : (displayItem?.goodsImage ?? '');
  const currentValue = isRolling ? '' : (displayItem?.goodsValue ?? '');

  // 传说级动画类名
  const glowAnimClass = showFinal && currentLevel === 1
    ? 'arena-legendary-glow'
    : showFinal && currentLevel === 2
      ? 'arena-rare-pulse'
      : '';

  return (
    <div
      className={glowAnimClass}
      style={{
        width,
        background: isRolling
          ? `linear-gradient(135deg,rgba(30,10,65,0.9),rgba(80,20,160,0.5))`
          : (showFinal ? LEVEL_BG[currentLevel] : 'rgba(20,8,50,0.8)'),
        border: `2px solid ${showFinal ? LEVEL_GLOW[currentLevel].replace('0.6)', '1)').replace('0.4)', '1)').replace('0.3)', '1)') : 'rgba(120,60,220,0.4)'}`,
        borderRadius: q(12),
        padding: q(12),
        textAlign: 'center',
        transition: 'background 0.3s, border-color 0.3s',
        boxShadow: showFinal
          ? currentLevel === 1
            ? `0 0 30px rgba(245,200,66,0.8), 0 0 60px rgba(245,200,66,0.4), inset 0 0 20px rgba(245,200,66,0.1)`
            : currentLevel === 2
              ? `0 0 25px rgba(192,132,252,0.8), 0 0 50px rgba(192,132,252,0.4)`
              : `0 0 15px ${LEVEL_GLOW[currentLevel]}`
          : 'none',
        minHeight: q(160),
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 传说级金色射线粒子 */}
      {showFinal && currentLevel === 1 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(245,200,66,0.25) 0%, transparent 70%)',
          animation: 'arenaPulse 1.2s ease-in-out infinite',
        }} />
      )}
      {/* 稀有级紫色光晕 */}
      {showFinal && currentLevel === 2 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(192,132,252,0.2) 0%, transparent 70%)',
          animation: 'arenaPulse 1.5s ease-in-out infinite',
        }} />
      )}
      {/* 物品图片 */}
      <div style={{ width: q(100), height: q(100), marginBottom: q(8), position: 'relative' }}>
        {currentImage ? (
          <img src={currentImage} alt={currentName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: isRolling ? `linear-gradient(135deg,${LEVEL_BG[currentLevel]})` : 'rgba(120,60,220,0.2)',
            borderRadius: q(8),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: isRolling ? 'slotSpin 0.08s linear infinite' : 'none',
          }}>
            <span style={{ fontSize: q(40) }}>🎁</span>
          </div>
        )}
      </div>

      {/* 品质标签 */}
      <div style={{
        display: 'inline-block',
        padding: `${q(2)} ${q(10)}`,
        background: isRolling ? 'rgba(120,60,220,0.4)' : 'rgba(0,0,0,0.3)',
        borderRadius: q(4), color: '#fff',
        fontSize: q(18), fontWeight: 600, marginBottom: q(4),
      }}>
        {LEVEL_LABEL[currentLevel]}
      </div>

      {/* 物品名称 */}
      <div style={{
        color: '#fff', fontSize: q(20), fontWeight: 600,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        width: '90%',
        animation: isRolling ? 'slotTextFlip 0.08s linear infinite' : 'none',
      }}>
        {currentName || (isRolling ? '...' : '等待开始')}
      </div>

      {/* 价值 */}
      {showFinal && currentValue && (
        <div style={{ color: '#ffd700', fontSize: q(22), fontWeight: 700, marginTop: q(4) }}>
          ¥{parseFloat(currentValue).toFixed(2)}
        </div>
      )}
    </div>
  );
}

// ── 玩家座位卡片 ──────────────────────────────────────────────────────────

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
}

function PlayerSeat({ player, seatNo, isEmpty = false, isWinner = false }: PlayerSeatProps) {
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
            src={`/img/avatars/${player?.avatar || '001'}.png`}
            alt=""
            style={{ width: q(60), height: q(60), borderRadius: '50%', border: `2px solid ${isWinner ? '#f5c842' : 'rgba(120,60,220,0.5)'}`, marginBottom: q(8) }}
          />
          <div style={{ color: '#e0d0ff', fontSize: q(22), fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {player?.nickname}
          </div>
          {player?.totalValue && (
            <div style={{ color: '#ffd700', fontSize: q(20), marginTop: q(4) }}>
              ¥{parseFloat(player.totalValue).toFixed(2)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────

export default function ArenaRoom() {
  const params = useParams<{ id: string }>();
  const roomId = parseInt(params.id || '0');
  const [, navigate] = useLocation();
  const [settingsVisible, setSettingsVisible] = useState(false);

  // 房间详情
  const { data: roomDetail, refetch: refetchRoom } = trpc.arena.getRoomDetail.useQuery(
    { roomId },
    { enabled: roomId > 0, refetchOnWindowFocus: false }
  );

  // 游戏状态
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
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

  // 当前轮次各玩家的最终物品
  const [currentRoundItems, setCurrentRoundItems] = useState<Record<number, {
    goodsId: number; goodsName: string; goodsImage: string; goodsLevel: number; goodsValue: string;
  }>>({});

  // 开箱mutation
  const spinRound = trpc.arena.spinRound.useMutation({
    onSuccess: (data) => {
      if (!data.alreadyDone) {
        // 设置当前轮次物品，触发老虎机动画
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
      }
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  // WebSocket 消息处理
  const handleWsMessage = useCallback((msg: { type: string; [key: string]: unknown }) => {
    switch (msg.type) {
      case 'player_joined':
        refetchRoom();
        break;
      case 'game_started':
        setGameStatus('playing');
        setCurrentRound(1);
        refetchRoom();
        break;
      case 'round_result': {
        const results = msg.results as any[];
        const roundNo = msg.roundNo as number;
        // 将 results 补充 seatNo 和 nickname（从当前玩家列表匹配）
        setRoundResults((prev) => {
          // 使用当前玩家列表进行匹配，不能直接引用 players（闭包内可能过时）
          const enriched = results.map((r: any) => ({ ...r }));
          return { ...prev, [roundNo]: enriched };
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
        setCurrentRoundItems(itemMap);
        setSpinning(true);
        setSpinDoneCount(0);
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
        // 播放胜负音效（延迟0.5s等动画结束）
        setTimeout(() => {
          if (overData.players.some((p) => p.isWinner)) {
            playWinFanfare();
          } else {
            playLoseTone();
          }
        }, 500);
        break;
      }
      case 'room_cancelled':
        alert('房间已被取消');
        navigate('/arena');
        break;
    }
  }, [refetchRoom, navigate]);

  useArenaWS({
    onMessage: handleWsMessage,
    subscribeRoomId: roomId,
  });

  // 同步房间状态
  useEffect(() => {
    if (roomDetail?.room) {
      const status = roomDetail.room.status as 'waiting' | 'playing' | 'finished' | 'cancelled';
      if (status === 'playing') setGameStatus('playing');
      else if (status === 'finished') setGameStatus('finished');
      if (roomDetail.room.currentRound > 0) setCurrentRound(roomDetail.room.currentRound);
    }
  }, [roomDetail]);

  // 同步已有轮次结果
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

  const room = roomDetail?.room;
  const players = roomDetail?.players ?? [];
  const maxPlayers = room?.maxPlayers ?? 2;
  const totalRounds = room?.rounds ?? 1;

  // 当所有老虎机都滚完时
  const handleSlotDone = useCallback(() => {
    setSpinDoneCount((prev) => {
      const next = prev + 1;
      if (next >= maxPlayers) {
        setSpinning(false);
        // 保存本轮结果
      const newResults = Object.entries(currentRoundItems).map(([pid, item]) => {
                  const p = players.find((pl) => pl.playerId === Number(pid));
                  return {
                    playerId: Number(pid),
                    nickname: p?.nickname ?? '',
                    seatNo: p?.seatNo ?? 0,
                    ...item,
                  };
                });
              setRoundResults((prev2) => ({
                ...prev2,
                [currentRound]: newResults,
              }));
        // 进入下一轮
        if (currentRound < totalRounds) {
          setTimeout(() => {
            setCurrentRound((r) => r + 1);
            setCurrentRoundItems({});
          }, 1200);
        }
      }
      return next;
    });
  }, [maxPlayers, currentRound, totalRounds, currentRoundItems, players]);

  // 取消房间
  const cancelRoom = trpc.arena.cancelRoom.useMutation({
    onSuccess: () => navigate('/arena'),
    onError: (err) => alert(err.message),
  });

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

      {/* 顶部导航 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <TopNav onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />
      </div>

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
            {gameStatus === 'waiting' && (
              <button
                onClick={() => cancelRoom.mutate({ roomId })}
                style={{
                  padding: `${q(6)} ${q(16)}`,
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid #ef4444',
                  borderRadius: q(8), color: '#ef4444',
                  fontSize: q(20), cursor: 'pointer',
                }}
              >取消</button>
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
                return (
                  <div key={seatNo} style={{ flex: 1 }}>
                    <div style={{ color: '#9ca3af', fontSize: q(20), textAlign: 'center', marginBottom: q(6) }}>
                      {p?.nickname ?? `玩家${seatNo}`}
                    </div>
                    <SlotMachine
                      finalItem={finalItem}
                      spinning={spinning && !!finalItem}
                      onDone={handleSlotDone}
                    />
                  </div>
                );
              })}
            </div>

            {/* 开始按钮 */}
            {!spinning && players.length >= maxPlayers && (
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
              {/* 大字展示胜负 */}
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
              </div>

              {/* 玩家对比 */}
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
                    {/* 胜负标签 */}
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
                    <img src={`/img/avatars/${p.avatar || '001'}.png`} alt="" style={{ width: q(60), height: q(60), borderRadius: '50%', marginBottom: q(8), border: `2px solid ${p.isWinner ? '#f5c842' : '#ef4444'}` }} />
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
            <div style={{ color: '#9ca3af', fontSize: q(22), marginBottom: q(8) }}>开笱记录</div>
            {Object.entries(roundResults).sort((a, b) => Number(a[0]) - Number(b[0])).map(([roundNo, results]) => {
              // 按 seatNo 排序：seatNo 为 0 时从 players 列表补充
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
                  background: 'rgba(20,8,50,0.7)',
                  border: '1px solid rgba(120,60,220,0.25)',
                  borderRadius: q(10), padding: q(12),
                  marginBottom: q(10),
                }}>
                  <div style={{ color: '#c084fc', fontSize: q(22), fontWeight: 600, marginBottom: q(8) }}>第 {roundNo} 轮</div>
                  <div style={{ display: 'flex', gap: q(10) }}>
                    {enrichedResults.map((r: any) => (
                      <div key={r.playerId} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ color: '#9ca3af', fontSize: q(18), marginBottom: q(4) }}>{r.nickname}</div>
                        <div style={{
                          background: LEVEL_BG[r.goodsLevel],
                          borderRadius: q(8), padding: q(8),
                          boxShadow: `0 0 10px ${LEVEL_GLOW[r.goodsLevel]}`,
                        }}>
                          {r.goodsImage && <img src={r.goodsImage} alt={r.goodsName} style={{ width: q(50), height: q(50), objectFit: 'contain', marginBottom: q(4) }} />}
                          <div style={{ color: '#fff', fontSize: q(18), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.goodsName}</div>
                          <div style={{ color: '#ffd700', fontSize: q(18) }}>¥{parseFloat(r.goodsValue).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 返回按钮 */}
        {gameStatus === 'finished' && (
          <button
            onClick={() => navigate('/arena')}
            style={{
              display: 'block', width: '100%', marginTop: q(20),
              padding: q(18),
              background: 'rgba(120,60,220,0.2)',
              border: '1.5px solid rgba(120,60,220,0.5)',
              borderRadius: q(12), color: '#c084fc',
              fontSize: q(28), fontWeight: 700, cursor: 'pointer',
            }}
          >
            返回大厅
          </button>
        )}
      </div>

      {/* 底部导航 */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <BottomNav />
      </div>

      {/* 设置弹窗 */}
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      {/* 老虎机动画 CSS */}
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
        .arena-legendary-glow {
          animation: arenaLegendaryShine 1.2s ease-in-out infinite !important;
        }
        @keyframes arenaRarePulse {
          0% { box-shadow: 0 0 25px rgba(192,132,252,0.8), 0 0 50px rgba(192,132,252,0.4); }
          50% { box-shadow: 0 0 40px rgba(192,132,252,1), 0 0 80px rgba(192,132,252,0.6); }
          100% { box-shadow: 0 0 25px rgba(192,132,252,0.8), 0 0 50px rgba(192,132,252,0.4); }
        }
        .arena-rare-pulse {
          animation: arenaRarePulse 1.5s ease-in-out infinite !important;
        }
        @keyframes arenaWinnerGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(245,200,66,0.5); }
          50% { box-shadow: 0 0 40px rgba(245,200,66,0.9), 0 0 80px rgba(245,200,66,0.4); }
        }
        @keyframes arenaWinnerBounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-6px); }
          75% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
