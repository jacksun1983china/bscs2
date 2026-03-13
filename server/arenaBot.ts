/**
 * arenaBot.ts — 竞技场机器人自动填充服务
 *
 * 逻辑：
 *   1. 每隔 BOT_CHECK_INTERVAL 毫秒检测等待中的房间
 *   2. 若房间创建后超过 BOT_WAIT_THRESHOLD 秒仍未满员，自动派遣机器人加入
 *   3. 机器人账号从数据库 isBot=1 的玩家中随机选取（真实账号）
 *   4. 机器人加入时扣除入场费（金币不足则跳过，从其他机器人中选）
 *   5. 机器人加入后，若房间满员，触发游戏开始广播并自动完成所有轮次
 *   6. 机器人开箱结果由服务端正常随机决定（与真实玩家相同概率）
 */

import { getDb, resetDb, insertGoldLog } from "./db";
import {
  arenaRooms,
  arenaRoomPlayers,
  arenaRoundResults,
  boxes,
  boxGoods,
  players,
  playerItems,
} from "../drizzle/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import {
  broadcastPlayerJoined,
  broadcastGameStarted,
  broadcastRoundResult,
  broadcastGameOver,
  broadcastRoomListUpdate,
} from "./arenaSSE";

// ── 配置 ──────────────────────────────────────────────────────────────────
const BOT_CHECK_INTERVAL = 8000;   // 每8秒检测一次
const BOT_WAIT_THRESHOLD = 10;     // 等待超过10秒派机器人（秒）

/** 根据概率权重随机抽取一个 boxGoods */
function rollBoxGoods(goods: Array<{ id: number; probability: string; [key: string]: unknown }>) {
  if (goods.length === 0) throw new Error("宝箱内没有物品");
  const total = goods.reduce((s, g) => s + parseFloat(g.probability as string), 0);
  let rand = Math.random() * total;
  for (const g of goods) {
    rand -= parseFloat(g.probability as string);
    if (rand <= 0) return g;
  }
  return goods[goods.length - 1];
}

/** 获取等待中房间摘要（用于广播） */
async function fetchRoomSummaries() {
  const db = await getDb();
  if (!db) return [];
  const rooms = await db
    .select()
    .from(arenaRooms)
    .where(eq(arenaRooms.status, "waiting"))
    .limit(50);
  return rooms.map((r) => ({
    id: r.id,
    roomNo: r.roomNo,
    creatorNickname: r.creatorNickname,
    creatorAvatar: r.creatorAvatar,
    maxPlayers: r.maxPlayers,
    currentPlayers: r.currentPlayers,
    rounds: r.rounds,
    entryFee: r.entryFee,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

/** 从数据库随机选取一个可用机器人（金币充足且不在房间内） */
async function pickBotFromDb(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  entryFee: number,
  excludeIds: number[]
): Promise<{ id: number; nickname: string; avatar: string; gold: string } | null> {
  // 查询所有 isBot=1 且金币 >= 入场费 的机器人
  const allBots = await db
    .select({ id: players.id, nickname: players.nickname, avatar: players.avatar, gold: players.gold })
    .from(players)
    .where(
      and(
        eq(players.isBot, 1),
        eq(players.status, 1),
        sql`CAST(${players.gold} AS DECIMAL(15,2)) >= ${entryFee}`
      )
    );

  // 过滤掉已在房间内的机器人
  const available = allBots.filter((b) => !excludeIds.includes(b.id));
  if (available.length === 0) return null;

  // 随机选一个
  return available[Math.floor(Math.random() * available.length)];
}

/** 机器人执行所有轮次开箱（游戏满员后自动完成） */
async function botPlayAllRounds(roomId: number) {
  const db = await getDb();
  if (!db) return;

  const [room] = await db.select().from(arenaRooms).where(eq(arenaRooms.id, roomId));
  if (!room || room.status !== "playing") return;

  const roomPlayerList = await db
    .select()
    .from(arenaRoomPlayers)
    .where(eq(arenaRoomPlayers.roomId, roomId))
    .orderBy(arenaRoomPlayers.seatNo);

  const boxIds: number[] = JSON.parse(room.boxIds || "[]");

  for (let roundNo = 1; roundNo <= room.rounds; roundNo++) {
    // 检查该轮是否已有结果
    const existingResults = await db
      .select()
      .from(arenaRoundResults)
      .where(and(eq(arenaRoundResults.roomId, roomId), eq(arenaRoundResults.roundNo, roundNo)));
    if (existingResults.length > 0) continue;

    const boxId = boxIds[roundNo - 1] ?? boxIds[boxIds.length - 1];
    if (!boxId) continue;

    const [box] = await db.select().from(boxes).where(eq(boxes.id, boxId));
    if (!box) continue;

    const goods = await db.select().from(boxGoods).where(eq(boxGoods.boxId, boxId));
    if (goods.length === 0) continue;

    const results: Array<{
      playerId: number;
      nickname: string;
      seatNo: number;
      goodsId: number;
      goodsName: string;
      goodsImage: string;
      goodsLevel: number;
      goodsValue: string;
    }> = [];

    for (const rp of roomPlayerList) {
      const picked = rollBoxGoods(goods as any) as {
        id: number;
        name: string;
        imageUrl: string;
        level: number;
        price: string | number;
        probability: string;
      };

      // 插入开箱结果
      await db.insert(arenaRoundResults).values({
        roomId,
        roundNo,
        playerId: rp.playerId,
        boxId,
        boxName: box.name,
        goodsId: picked.id,
        goodsName: picked.name,
        goodsImage: picked.imageUrl,
        goodsLevel: picked.level,
        goodsValue: String(picked.price),
      });

      // 若是真实玩家（正数ID），将物品放入背包（status=3 临时持有，等结算）
      if (rp.playerId > 0) {
        await db.insert(playerItems).values({
          playerId: rp.playerId,
          itemId: picked.id,
          source: 'arena',
          status: 3, // 3=竞技场待结算
        });
      }

      results.push({
        playerId: rp.playerId,
        nickname: rp.nickname,
        seatNo: rp.seatNo,
        goodsId: picked.id,
        goodsName: picked.name,
        goodsImage: picked.imageUrl,
        goodsLevel: picked.level,
        goodsValue: String(picked.price),
      });
    }

    // 广播本轮结果
    broadcastRoundResult(roomId, roundNo, results);

    // 每轮之间延迟5.5秒：slot动画约3秒 + 开奖展示2.2秒 + 0.3秒缓冲
    if (roundNo < room.rounds) {
      await new Promise((resolve) => setTimeout(resolve, 5500));
    }
  }

  // 所有轮次完成，计算胜负
  await finishBotGame(roomId, db, roomPlayerList);
}

/** 游戏结束处理（含平局检测和物品转移） */
async function finishBotGame(
  roomId: number,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  roomPlayerList: typeof arenaRoomPlayers.$inferSelect[]
) {
  const allResults = await db
    .select()
    .from(arenaRoundResults)
    .where(eq(arenaRoundResults.roomId, roomId));

  const valueMap: Record<number, number> = {};
  for (const r of allResults) {
    valueMap[r.playerId] = (valueMap[r.playerId] || 0) + parseFloat(r.goodsValue);
  }

  let maxValue = -1;
  let winnerId = 0;
  for (const [pid, val] of Object.entries(valueMap)) {
    if (val > maxValue) {
      maxValue = val;
      winnerId = Number(pid);
    }
  }

  // 检测平局
  const topPlayers = Object.entries(valueMap).filter(([, v]) => v === maxValue);
  const isDraw = topPlayers.length > 1;
  if (isDraw) winnerId = 0;

  // 更新参与者记录
  for (const rp of roomPlayerList) {
    const totalValue = (valueMap[rp.playerId] || 0).toFixed(2);
    const isWinner = isDraw ? 0 : (rp.playerId === winnerId ? 1 : 0);
    await db
      .update(arenaRoomPlayers)
      .set({ totalValue, isWinner })
      .where(eq(arenaRoomPlayers.id, rp.id));
  }

  if (isDraw) {
    // 平局：各自保留自己开出的物品（status=3 → status=0）
    for (const rp of roomPlayerList) {
      if (rp.playerId > 0) {
        await db
          .update(playerItems)
          .set({ status: 0 })
          .where(
            and(
              eq(playerItems.playerId, rp.playerId),
              eq(playerItems.status, 3),
              eq(playerItems.source, 'arena')
            )
          );
      }
    }
  } else {
    // 胜负：赢家获得所有玩家开出的物品
    if (winnerId > 0) {
      // 赢家自己的物品：status=3 → status=0
      await db
        .update(playerItems)
        .set({ status: 0 })
        .where(
          and(
            eq(playerItems.playerId, winnerId),
            eq(playerItems.status, 3),
            eq(playerItems.source, 'arena')
          )
        );
      // 输家的物品：转移给赢家
      for (const rp of roomPlayerList) {
        if (rp.playerId !== winnerId && rp.playerId > 0) {
          await db
            .update(playerItems)
            .set({ playerId: winnerId, status: 0 })
            .where(
              and(
                eq(playerItems.playerId, rp.playerId),
                eq(playerItems.status, 3),
                eq(playerItems.source, 'arena')
              )
            );
        }
      }
    } else {
      // 赢家是机器人，真实玩家的物品丢失（正常游戏逻辑）
      for (const rp of roomPlayerList) {
        if (rp.playerId > 0) {
          await db
            .update(playerItems)
            .set({ status: 2 }) // status=2 表示已消耗/丢失
            .where(
              and(
                eq(playerItems.playerId, rp.playerId),
                eq(playerItems.status, 3),
                eq(playerItems.source, 'arena')
              )
            );
        }
      }
    }
  }

  // 更新房间状态
  await db
    .update(arenaRooms)
    .set({ status: "finished", winnerId })
    .where(eq(arenaRooms.id, roomId));

  // 广播游戏结束
  const playerResults = roomPlayerList.map((rp) => ({
    playerId: rp.playerId,
    nickname: rp.nickname,
    avatar: rp.avatar,
    seatNo: rp.seatNo,
    totalValue: (valueMap[rp.playerId] || 0).toFixed(2),
    isWinner: !isDraw && rp.playerId === winnerId,
    isDraw,
  }));
  broadcastGameOver(roomId, winnerId, playerResults, isDraw);
}

// ── 主循环 ────────────────────────────────────────────────────────────────

let botLoopStarted = false;

export function startBotLoop() {
  if (botLoopStarted) return;
  botLoopStarted = true;

  console.log("[ArenaBot] 机器人服务已启动，检测间隔:", BOT_CHECK_INTERVAL, "ms");

  setInterval(async () => {
    try {
      await checkAndFillRooms();
    } catch (err: any) {
      console.error("[ArenaBot] 检测房间出错:", err);
      if (err?.cause?.message?.includes('ECONNRESET') || err?.message?.includes('ECONNRESET')) {
        console.log('[ArenaBot] 数据库连接断开，重置连接...');
        resetDb();
      }
    }
  }, BOT_CHECK_INTERVAL);
}

// 正在处理中的房间ID集合，防止并发重复处理
const processingRooms = new Set<number>();

async function checkAndFillRooms() {
  const db = await getDb();
  if (!db) return;

  const waitingRooms = await db
    .select()
    .from(arenaRooms)
    .where(eq(arenaRooms.status, "waiting"));

  const now = Date.now();

  for (const room of waitingRooms) {
    if (processingRooms.has(room.id)) continue;

    const createdAt = room.createdAt instanceof Date
      ? room.createdAt.getTime()
      : new Date(room.createdAt as any).getTime();
    const waitSeconds = (now - createdAt) / 1000;

    if (waitSeconds < BOT_WAIT_THRESHOLD) continue;

    // 重新读取最新房间状态
    const [freshRoom] = await db.select().from(arenaRooms).where(eq(arenaRooms.id, room.id));
    if (!freshRoom || freshRoom.status !== "waiting") continue;

    const needed = freshRoom.maxPlayers - freshRoom.currentPlayers;
    if (needed <= 0) continue;

    processingRooms.add(room.id);

    try {
      const entryFee = parseFloat(freshRoom.entryFee);

      // 获取房间内已有的玩家ID（避免同一机器人重复加入）
      const existingPlayers = await db
        .select()
        .from(arenaRoomPlayers)
        .where(eq(arenaRoomPlayers.roomId, room.id));
      const existingPlayerIds = existingPlayers.map((p) => p.playerId);

      console.log(`[ArenaBot] 房间 #${freshRoom.roomNo} 等待 ${waitSeconds.toFixed(0)}s，需派遣 ${needed} 个机器人`);

      let currentCount = freshRoom.currentPlayers;
      let gameStarted = false;
      const usedBotIds = [...existingPlayerIds];

      for (let i = 0; i < needed; i++) {
        // 从数据库选取可用机器人
        const bot = await pickBotFromDb(db, entryFee, usedBotIds);
        if (!bot) {
          console.warn(`[ArenaBot] 没有可用机器人（金币不足或已全部在房间内），跳过`);
          break;
        }
        usedBotIds.push(bot.id);

        const seatNo = currentCount + 1;
        currentCount++;
        const isFull = currentCount >= freshRoom.maxPlayers;

        // 扣除机器人入场费
        const botGold = parseFloat(bot.gold);
        const newBotGold = (botGold - entryFee).toFixed(2);
        await db
          .update(players)
          .set({ gold: newBotGold })
          .where(eq(players.id, bot.id));
        await insertGoldLog(bot.id, -entryFee, parseFloat(newBotGold), 'arena', `竞技场入场费（机器人加入房间 #${freshRoom.roomNo}）`);

        // 插入机器人为参与者
        await db.insert(arenaRoomPlayers).values({
          roomId: freshRoom.id,
          playerId: bot.id,
          nickname: bot.nickname,
          avatar: bot.avatar,
          seatNo,
        });

        // 原子更新房间人数
        await db
          .update(arenaRooms)
          .set({
            currentPlayers: currentCount,
            status: isFull ? "playing" : "waiting",
            currentRound: isFull ? 1 : 0,
          })
          .where(eq(arenaRooms.id, freshRoom.id));

        console.log(`[ArenaBot] 机器人 ${bot.nickname}(id=${bot.id}) 加入房间 #${freshRoom.roomNo}，人数 ${currentCount}/${freshRoom.maxPlayers}`);

        // 广播玩家加入
        broadcastPlayerJoined(
          freshRoom.id,
          { playerId: bot.id, nickname: bot.nickname, avatar: bot.avatar, seatNo },
          null
        );

        if (isFull) {
          gameStarted = true;
          console.log(`[ArenaBot] 房间 #${freshRoom.roomNo} 已满员，广播游戏开始`);
          broadcastGameStarted(freshRoom.id);
        }

        // 机器人加入间隔1秒，更自然
        if (i < needed - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // 广播房间列表更新
      const summaries = await fetchRoomSummaries();
      broadcastRoomListUpdate(summaries);

      // 游戏开始后，延迟5秒开始自动开箱（等开场动画播完）
      if (gameStarted) {
        setTimeout(() => {
          botPlayAllRounds(freshRoom.id).catch((err) => {
            console.error(`[ArenaBot] 房间 #${freshRoom.roomNo} 开箱出错:`, err);
          });
        }, 5000);
      }
    } finally {
      processingRooms.delete(room.id);
    }
  }
}
