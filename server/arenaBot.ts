/**
 * arenaBot.ts — 竞技场机器人自动填充服务
 *
 * 逻辑：
 *   1. 每隔 BOT_CHECK_INTERVAL 毫秒检测等待中的房间
 *   2. 若房间等待时间超过 BOT_WAIT_THRESHOLD 秒，自动派遣机器人加入
 *   3. 机器人账号从预设列表中随机选取（不占用真实玩家账号）
 *   4. 机器人加入后，若房间满员，触发游戏开始广播
 *   5. 机器人的开箱结果由服务端正常随机决定（与真实玩家相同概率）
 */

import { getDb, resetDb } from "./db";
import {
  arenaRooms,
  arenaRoomPlayers,
  arenaRoundResults,
  boxes,
  boxGoods,
} from "../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  broadcastPlayerJoined,
  broadcastGameStarted,
  broadcastRoundResult,
  broadcastGameOver,
  broadcastRoomListUpdate,
} from "./arenaSSE";

// ── 配置 ──────────────────────────────────────────────────────────────────
const BOT_CHECK_INTERVAL = 8000;   // 每8秒检测一次
const BOT_WAIT_THRESHOLD = 15;     // 等待超过15秒派机器人（秒）

// ── 机器人预设账号 ──────────────────────────────────────────────────────────
const BOT_ACCOUNTS = [
  { id: -1,  nickname: "暗影猎手",  avatar: "003" },
  { id: -2,  nickname: "星辰战士",  avatar: "007" },
  { id: -3,  nickname: "霓虹刺客",  avatar: "011" },
  { id: -4,  nickname: "量子破坏者", avatar: "002" },
  { id: -5,  nickname: "赛博武士",  avatar: "009" },
  { id: -6,  nickname: "幽灵特工",  avatar: "005" },
  { id: -7,  nickname: "铁血战神",  avatar: "013" },
  { id: -8,  nickname: "闪电猎人",  avatar: "006" },
  { id: -9,  nickname: "深渊守护者", avatar: "015" },
  { id: -10, nickname: "光速剑客",  avatar: "004" },
];

/** 随机选取一个机器人账号（避免同一房间重复） */
function pickBot(usedBotIds: number[]) {
  const available = BOT_ACCOUNTS.filter((b) => !usedBotIds.includes(b.id));
  if (available.length === 0) return BOT_ACCOUNTS[Math.floor(Math.random() * BOT_ACCOUNTS.length)];
  return available[Math.floor(Math.random() * available.length)];
}

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

    const boxId = boxIds[roundNo - 1];
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

    // 每轮之间延迟2.5秒，让前端有时间播放动画
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }

  // 所有轮次完成，计算胜负
  await finishBotGame(roomId, db, roomPlayerList);
}

/** 游戏结束处理（机器人版，不给机器人发金币） */
async function finishBotGame(
  roomId: number,
  db: Awaited<ReturnType<typeof getDb>>,
  roomPlayerList: typeof arenaRoomPlayers.$inferSelect[]
) {
  if (!db) return;

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

  // 更新参与者记录
  for (const rp of roomPlayerList) {
    const totalValue = (valueMap[rp.playerId] || 0).toFixed(2);
    const isWinner = rp.playerId === winnerId ? 1 : 0;
    await db
      .update(arenaRoomPlayers)
      .set({ totalValue, isWinner })
      .where(eq(arenaRoomPlayers.id, rp.id));
  }

  // 赢家若是真实玩家，发放奖励金币
  const { players } = await import("../drizzle/schema");
  const { eq: eqDrizzle } = await import("drizzle-orm");
  if (winnerId > 0) {
    // 正数ID = 真实玩家
    const [winnerPlayer] = await db.select().from(players).where(eqDrizzle(players.id, winnerId));
    if (winnerPlayer) {
      const totalPrize = Object.values(valueMap).reduce((s, v) => s + v, 0);
      const newGold = (parseFloat(winnerPlayer.gold ?? "0") + totalPrize).toFixed(2);
      await db.update(players).set({ gold: newGold }).where(eqDrizzle(players.id, winnerId));
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
    isWinner: rp.playerId === winnerId,
  }));
  broadcastGameOver(roomId, winnerId, playerResults);
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
      // 数据库连接断开时重置，下次自动重连
      if (err?.cause?.message?.includes('ECONNRESET') || err?.message?.includes('ECONNRESET')) {
        console.log('[ArenaBot] 数据库连接断开，重置连接...');
        resetDb();
      }
    }
  }, BOT_CHECK_INTERVAL);
}

async function checkAndFillRooms() {
  const db = await getDb();
  if (!db) return;

  const waitingRooms = await db
    .select()
    .from(arenaRooms)
    .where(eq(arenaRooms.status, "waiting"));

  const now = Date.now();

  for (const room of waitingRooms) {
    // 修复：Number(dateString) 返回 NaN，必须用 new Date() 解析
    const createdAt = room.createdAt instanceof Date ? room.createdAt.getTime() : new Date(room.createdAt).getTime();
    const waitSeconds = (now - createdAt) / 1000;

    // 等待时间未超过阈值，跳过
    if (waitSeconds < BOT_WAIT_THRESHOLD) continue;

    // 需要填充的机器人数量
    const needed = room.maxPlayers - room.currentPlayers;
    if (needed <= 0) continue;

    // 获取房间内已有的机器人ID（负数ID）
    const existingPlayers = await db
      .select()
      .from(arenaRoomPlayers)
      .where(eq(arenaRoomPlayers.roomId, room.id));
    const usedBotIds = existingPlayers
      .map((p) => p.playerId)
      .filter((id) => id < 0);

    console.log(`[ArenaBot] 房间 #${room.roomNo} 等待 ${waitSeconds.toFixed(0)}s，派遣 ${needed} 个机器人`);

    let currentCount = room.currentPlayers;
    let gameStarted = false;

    for (let i = 0; i < needed; i++) {
      const bot = pickBot(usedBotIds);
      usedBotIds.push(bot.id);

      const seatNo = currentCount + 1;
      currentCount++;
      const isFull = currentCount >= room.maxPlayers;

      // 插入机器人为参与者
      await db.insert(arenaRoomPlayers).values({
        roomId: room.id,
        playerId: bot.id,
        nickname: bot.nickname,
        avatar: bot.avatar,
        seatNo,
      });

      // 更新房间人数
      await db
        .update(arenaRooms)
        .set({
          currentPlayers: currentCount,
          status: isFull ? "playing" : "waiting",
          currentRound: isFull ? 1 : 0,
        })
        .where(eq(arenaRooms.id, room.id));

      // 广播玩家加入
      broadcastPlayerJoined(
        room.id,
        { playerId: bot.id, nickname: bot.nickname, avatar: bot.avatar, seatNo },
        null
      );

      if (isFull) {
        gameStarted = true;
        broadcastGameStarted(room.id);
      }

      // 机器人加入间隔1秒，更自然
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 广播房间列表更新
    const summaries = await fetchRoomSummaries();
    broadcastRoomListUpdate(summaries);

    // 如果游戏开始了，机器人自动完成所有轮次
    if (gameStarted) {
      // 延迟3秒后开始开箱（等前端加载游戏房间）
      setTimeout(() => {
        botPlayAllRounds(room.id).catch((err) => {
          console.error(`[ArenaBot] 房间 #${room.roomNo} 开箱出错:`, err);
        });
      }, 3000);
    }
  }
}
