/**
 * arenaRouter.ts — 竞技场 tRPC 路由
 *
 * 功能：
 *   arena.getRooms       — 获取等待中的房间列表
 *   arena.createRoom     — 创建房间（选宝箱、设置人数）
 *   arena.joinRoom       — 加入房间
 *   arena.getRoomDetail  — 获取房间详情（含玩家列表和已有轮次结果）
 *   arena.spinRound      — 执行一轮开箱（服务端决定物品，广播结果）
 *   arena.cancelRoom     — 取消房间（仅创建者，仅 waiting 状态）
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  arenaRooms,
  arenaRoomPlayers,
  arenaRoundResults,
  boxes,
  boxGoods,
  players,
} from "../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import {
  broadcastRoomListUpdate,
  broadcastPlayerJoined,
  broadcastGameStarted,
  broadcastRoundResult,
  broadcastGameOver,
  broadcastRoomCancelled,
} from "./arenaSSE";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "bdcs2-secret-key-2025");
const PLAYER_COOKIE = "bdcs2_player_token";

// ── 工具函数 ──────────────────────────────────────────────────────────────

async function getPlayerFromCookie(req: any): Promise<{ playerId: number; phone: string } | null> {
  try {
    const cookies = req.headers.cookie || "";
    const match = cookies.match(new RegExp(`${PLAYER_COOKIE}=([^;]+)`));
    if (!match) return null;
    const { payload } = await jwtVerify(match[1], JWT_SECRET);
    return { playerId: payload.playerId as number, phone: payload.phone as string };
  } catch {
    return null;
  }
}

/** 生成6位随机房间号 */
function genRoomNo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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

/** 获取房间摘要列表（用于广播） */
async function fetchRoomSummaries() {
  const db = await getDb();
  if (!db) return [];
  const rooms = await db
    .select()
    .from(arenaRooms)
    .where(eq(arenaRooms.status, "waiting"))
    .orderBy(desc(arenaRooms.createdAt))
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

// ── 路由定义 ──────────────────────────────────────────────────────────────

export const arenaRouter = router({
  /** 获取等待中的房间列表 */
  getRooms: publicProcedure
    .input(
      z.object({
        status: z.enum(["waiting", "playing", "finished", "all"]).default("waiting"),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const offset = (input.page - 1) * input.pageSize;
      let query = db.select().from(arenaRooms).$dynamic();
      if (input.status !== "all") {
        query = query.where(eq(arenaRooms.status, input.status as "waiting" | "playing" | "finished" | "cancelled"));
      }
      const rooms = await query
        .orderBy(desc(arenaRooms.createdAt))
        .limit(input.pageSize)
        .offset(offset);
      return rooms;
    }),

  /** 获取房间详情（含玩家和已有轮次结果） */
  getRoomDetail: publicProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [room] = await db.select().from(arenaRooms).where(eq(arenaRooms.id, input.roomId));
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "房间不存在" });
      const roomPlayers = await db
        .select()
        .from(arenaRoomPlayers)
        .where(eq(arenaRoomPlayers.roomId, input.roomId))
        .orderBy(arenaRoomPlayers.seatNo);
      const roundResults = await db
        .select()
        .from(arenaRoundResults)
        .where(eq(arenaRoundResults.roomId, input.roomId))
        .orderBy(arenaRoundResults.roundNo, arenaRoundResults.playerId);
      // 解析宝笱列表
      let boxList: Array<{ id: number; name: string; imageUrl: string; price: string }> = [];
      try {
        const boxIds: number[] = JSON.parse(room.boxIds || "[]");
        if (boxIds.length > 0) {
          const boxRows = await db.select().from(boxes).where(inArray(boxes.id, boxIds));
          boxList = boxIds.map((bid) => {
            const b = boxRows.find((x) => x.id === bid);
            return b
              ? { id: b.id, name: b.name, imageUrl: b.imageUrl, price: b.price }
              : { id: bid, name: "未知宝笱", imageUrl: "", price: "0.00" };
          });
        }
      } catch {}
      // 获取当前登录玩家ID（未登录则为0）
      let myPlayerId = 0;
      try {
        const session = await getPlayerFromCookie((ctx as any).req);
        if (session) myPlayerId = session.playerId;
      } catch {}
      return { room, players: roomPlayers, roundResults, boxList, myPlayerId };
    }),

  /** 创建房间 */
  createRoom: publicProcedure
    .input(
      z.object({
        maxPlayers: z.number().min(2).max(3),
        boxIds: z.array(z.number()).min(1).max(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const session = await getPlayerFromCookie((ctx as any).req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // 查询玩家信息
      const [player] = await db.select().from(players).where(eq(players.id, session.playerId));
      if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      // 查询宝箱价格，计算入场费
      const boxRows = await db.select().from(boxes).where(inArray(boxes.id, input.boxIds));
      if (boxRows.length !== input.boxIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "部分宝箱不存在" });
      }
      const entryFee = boxRows.reduce((s, b) => s + parseFloat(b.price), 0);
      // 检查金币余额
      const gold = parseFloat(player.gold ?? "0");
      if (gold < entryFee) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `金币不足，需要 ${entryFee} 金币` });
      }
      // 扣除金币
      await db
        .update(players)
        .set({ gold: (gold - entryFee).toFixed(2) })
        .where(eq(players.id, session.playerId));
      // 创建房间
      let roomNo = genRoomNo();
      // 确保房间号唯一
      for (let i = 0; i < 5; i++) {
        const [exist] = await db.select().from(arenaRooms).where(eq(arenaRooms.roomNo, roomNo));
        if (!exist) break;
        roomNo = genRoomNo();
      }
      const [insertResult] = await db.insert(arenaRooms).values({
        roomNo,
        creatorId: session.playerId,
        creatorNickname: player.nickname || player.phone,
        creatorAvatar: player.avatar || "001",
        maxPlayers: input.maxPlayers,
        currentPlayers: 1,
        rounds: input.boxIds.length,
        entryFee: entryFee.toFixed(2),
        boxIds: JSON.stringify(input.boxIds),
        status: "waiting",
      });
      const roomId = (insertResult as any).insertId as number;
      // 添加创建者为参与者（座位1）
      await db.insert(arenaRoomPlayers).values({
        roomId,
        playerId: session.playerId,
        nickname: player.nickname || player.phone,
        avatar: player.avatar || "001",
        seatNo: 1,
      });
      // 广播房间列表更新
      const summaries = await fetchRoomSummaries();
      broadcastRoomListUpdate(summaries);
      return { roomId, roomNo, entryFee };
    }),

  /** 加入房间 */
  joinRoom: publicProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlayerFromCookie((ctx as any).req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // 查询房间
      const [room] = await db.select().from(arenaRooms).where(eq(arenaRooms.id, input.roomId));
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "房间不存在" });
      if (room.status !== "waiting") throw new TRPCError({ code: "BAD_REQUEST", message: "房间已不在等待状态" });
      if (room.currentPlayers >= room.maxPlayers) throw new TRPCError({ code: "BAD_REQUEST", message: "房间已满" });
      // 检查是否已在房间（已在房间则直接返回成功，允许重新进入）
      const [existing] = await db
        .select()
        .from(arenaRoomPlayers)
        .where(and(eq(arenaRoomPlayers.roomId, input.roomId), eq(arenaRoomPlayers.playerId, session.playerId)));
      if (existing) {
        return { roomId: input.roomId, alreadyJoined: true };
      }
      // 查询玩家信息
      const [player] = await db.select().from(players).where(eq(players.id, session.playerId));
      if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      const entryFee = parseFloat(room.entryFee);
      const gold = parseFloat(player.gold ?? "0");
      if (gold < entryFee) throw new TRPCError({ code: "BAD_REQUEST", message: `金币不足，需要 ${entryFee} 金币` });
      // 扣除金币
      await db
        .update(players)
        .set({ gold: (gold - entryFee).toFixed(2) })
        .where(eq(players.id, session.playerId));
      // 确定座位号
      const seatNo = room.currentPlayers + 1;
      // 添加参与者
      await db.insert(arenaRoomPlayers).values({
        roomId: input.roomId,
        playerId: session.playerId,
        nickname: player.nickname || player.phone,
        avatar: player.avatar || "001",
        seatNo,
      });
      // 更新房间人数
      const newCount = room.currentPlayers + 1;
      const isFull = newCount >= room.maxPlayers;
      await db
        .update(arenaRooms)
        .set({
          currentPlayers: newCount,
          status: isFull ? "playing" : "waiting",
          currentRound: isFull ? 1 : 0,
        })
        .where(eq(arenaRooms.id, input.roomId));
      // 广播玩家加入
      broadcastPlayerJoined(
        input.roomId,
        { playerId: session.playerId, nickname: player.nickname || player.phone, avatar: player.avatar || "001", seatNo },
        null
      );
      // 如果房间满了，广播游戏开始，并异步自动执行所有轮次
      if (isFull) {
        broadcastGameStarted(input.roomId);
        // 延迟 1.5 秒等客户端收到 game_started 并准备好后再开始开笱
        setTimeout(() => {
          autoSpinAllRounds(input.roomId).catch((err) => {
            console.error('[Arena] autoSpinAllRounds error:', err);
          });
        }, 1500);
      }
      // 广播房间列表更新
      const summaries = await fetchRoomSummaries();
      broadcastRoomListUpdate(summaries);
      return { success: true, seatNo, isFull };
    }),

  /** 执行一轮开箱（服务端决定物品，广播结果） */
  spinRound: publicProcedure
    .input(z.object({ roomId: z.number(), roundNo: z.number().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlayerFromCookie((ctx as any).req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [room] = await db.select().from(arenaRooms).where(eq(arenaRooms.id, input.roomId));
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "房间不存在" });
      if (room.status !== "playing") throw new TRPCError({ code: "BAD_REQUEST", message: "游戏未开始" });
      if (input.roundNo > room.rounds) throw new TRPCError({ code: "BAD_REQUEST", message: "轮次超出范围" });
      // 检查该轮是否已有结果
      const existingResults = await db
        .select()
        .from(arenaRoundResults)
        .where(and(eq(arenaRoundResults.roomId, input.roomId), eq(arenaRoundResults.roundNo, input.roundNo)));
      if (existingResults.length > 0) {
        // 已有结果，直接返回
        return { results: existingResults, alreadyDone: true };
      }
      // 解析宝箱ID列表
      const boxIds: number[] = JSON.parse(room.boxIds || "[]");
      const boxId = boxIds[input.roundNo - 1];
      if (!boxId) throw new TRPCError({ code: "BAD_REQUEST", message: "宝箱配置错误" });
      const [box] = await db.select().from(boxes).where(eq(boxes.id, boxId));
      if (!box) throw new TRPCError({ code: "NOT_FOUND", message: "宝箱不存在" });
      // 获取宝箱内物品
      const goods = await db.select().from(boxGoods).where(eq(boxGoods.boxId, boxId));
      if (goods.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "宝箱内没有物品" });
      // 获取所有参与者
      const roomPlayers = await db
        .select()
        .from(arenaRoomPlayers)
        .where(eq(arenaRoomPlayers.roomId, input.roomId))
        .orderBy(arenaRoomPlayers.seatNo);
      // 为每个玩家随机抽取物品
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
      for (const rp of roomPlayers) {
        const picked = rollBoxGoods(goods as any) as {
          id: number;
          name: string;
          imageUrl: string;
          level: number;
          price: string | number;
          probability: string;
        };
        await db.insert(arenaRoundResults).values({
          roomId: input.roomId,
          roundNo: input.roundNo,
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
      broadcastRoundResult(input.roomId, input.roundNo, results);
      // 如果是最后一轮，计算胜负
      if (input.roundNo >= room.rounds) {
        await finishGame(input.roomId, db, roomPlayers);
      } else {
        // 更新当前轮次
        await db
          .update(arenaRooms)
          .set({ currentRound: input.roundNo + 1 })
          .where(eq(arenaRooms.id, input.roomId));
      }
      return { results, alreadyDone: false };
    }),

  /** 取消房间（仅创建者，仅 waiting 状态） */
  cancelRoom: publicProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlayerFromCookie((ctx as any).req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [room] = await db.select().from(arenaRooms).where(eq(arenaRooms.id, input.roomId));
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "房间不存在" });
      if (room.creatorId !== session.playerId) throw new TRPCError({ code: "FORBIDDEN", message: "只有创建者可以取消房间" });
      if (room.status !== "waiting") throw new TRPCError({ code: "BAD_REQUEST", message: "只能取消等待中的房间" });
      // 退还入场费给所有参与者
      const roomPlayers = await db.select().from(arenaRoomPlayers).where(eq(arenaRoomPlayers.roomId, input.roomId));
      const entryFee = parseFloat(room.entryFee);
      for (const rp of roomPlayers) {
        const [p] = await db.select().from(players).where(eq(players.id, rp.playerId));
        if (p) {
          const newGold = (parseFloat(p.gold ?? "0") + entryFee).toFixed(2);
          await db.update(players).set({ gold: newGold }).where(eq(players.id, rp.playerId));
        }
      }
      await db.update(arenaRooms).set({ status: "cancelled" }).where(eq(arenaRooms.id, input.roomId));
      broadcastRoomCancelled(input.roomId);
      const summaries = await fetchRoomSummaries();
      broadcastRoomListUpdate(summaries);
      return { success: true };
    }),

  /** 离开房间（仅 waiting 状态，退还入场费，房间继续等待） */
  leaveRoom: publicProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getPlayerFromCookie((ctx as any).req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [room] = await db.select().from(arenaRooms).where(eq(arenaRooms.id, input.roomId));
      if (!room) return { success: true }; // 房间不存在，直接返回
      if (room.status !== "waiting") return { success: true }; // 游戏已开始，不能离开
      // 检查玩家是否在房间内
      const [rp] = await db.select().from(arenaRoomPlayers)
        .where(and(eq(arenaRoomPlayers.roomId, input.roomId), eq(arenaRoomPlayers.playerId, session.playerId)));
      if (!rp) return { success: true }; // 玩家不在房间内
      // 退还入场费
      const entryFee = parseFloat(room.entryFee);
      const [p] = await db.select().from(players).where(eq(players.id, session.playerId));
      if (p) {
        const newGold = (parseFloat(p.gold ?? "0") + entryFee).toFixed(2);
        await db.update(players).set({ gold: newGold }).where(eq(players.id, session.playerId));
      }
      // 删除玩家记录
      await db.delete(arenaRoomPlayers)
        .where(and(eq(arenaRoomPlayers.roomId, input.roomId), eq(arenaRoomPlayers.playerId, session.playerId)));
      // 更新房间人数（房间继续等待，不取消）
      const newCount = Math.max(0, room.currentPlayers - 1);
      await db.update(arenaRooms).set({ currentPlayers: newCount }).where(eq(arenaRooms.id, input.roomId));
      // 广播房间列表更新
      const summaries = await fetchRoomSummaries();
      broadcastRoomListUpdate(summaries);
      return { success: true };
    }),

  /** 获取我当前所在的活跃房间（waiting/playing） */
  getMyActiveRoom: publicProcedure
    .query(async ({ ctx }) => {
      const session = await getPlayerFromCookie((ctx as any).req);
      if (!session) return null;
      const db = await getDb();
      if (!db) return null;
      // 查询玩家已加入的房间
      const myRoomPlayers = await db
        .select()
        .from(arenaRoomPlayers)
        .where(eq(arenaRoomPlayers.playerId, session.playerId))
        .orderBy(desc(arenaRoomPlayers.createdAt))
        .limit(10);
      if (myRoomPlayers.length === 0) return null;
      const roomIds = myRoomPlayers.map((p) => p.roomId);
      // 找到最近的 waiting 或 playing 房间
      const activeRooms = await db
        .select()
        .from(arenaRooms)
        .where(inArray(arenaRooms.id, roomIds))
        .orderBy(desc(arenaRooms.createdAt));
      const active = activeRooms.find((r) => r.status === 'waiting' || r.status === 'playing');
      if (!active) return null;
      return {
        id: active.id,
        roomNo: active.roomNo,
        status: active.status,
        currentPlayers: active.currentPlayers,
        maxPlayers: active.maxPlayers,
        rounds: active.rounds,
        entryFee: active.entryFee,
        creatorId: active.creatorId,
        isCreator: active.creatorId === session.playerId,
      };
    }),

  /** 获取我参与的竞技场记录 */
  getMyRecords: publicProcedure
    .input(z.object({ page: z.number().min(1).default(1), pageSize: z.number().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const session = await getPlayerFromCookie((ctx as any).req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const offset = (input.page - 1) * input.pageSize;
      const participated = await db
        .select()
        .from(arenaRoomPlayers)
        .where(eq(arenaRoomPlayers.playerId, session.playerId))
        .orderBy(desc(arenaRoomPlayers.createdAt))
        .limit(input.pageSize)
        .offset(offset);
      if (participated.length === 0) return [];
      const roomIds = participated.map((p) => p.roomId);
      const roomList = await db.select().from(arenaRooms).where(inArray(arenaRooms.id, roomIds));
      return participated.map((p) => {
        const room = roomList.find((r) => r.id === p.roomId);
        return { ...p, room };
      });
    }),

  /** 获取多个箱子的道具列表（供老虎机卷轴使用） */
  getBoxGoodsList: publicProcedure
    .input(z.object({ boxIds: z.array(z.number()).min(1).max(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const rows = await db
        .select()
        .from(boxGoods)
        .where(inArray(boxGoods.boxId, input.boxIds));
      // 按 boxId 分组
      const map: Record<number, Array<{ id: number; name: string; imageUrl: string; goodsLevel: number; probability: string }>> = {};
      for (const r of rows) {
        if (!map[r.boxId]) map[r.boxId] = [];
        map[r.boxId].push({
          id: r.id,
          name: r.name,
          imageUrl: r.imageUrl ?? '',
          goodsLevel: r.level ?? 3,
          probability: String(r.probability ?? '1'),
        });
      }
      return map;
    }),
});

// ── 自动执行所有轮次（游戏开始时服务端自动驱动） ──────────────────────────────

/**
 * 游戏开始后，服务端自动按顺序执行所有轮次并广播结果。
 * 每轮之间延迟 1.5 秒，给客户端动画播放时间。
 * 前端只需监听 round_result 和 game_over 广播即可。
 */
async function autoSpinAllRounds(roomId: number) {
  const db = await getDb();
  if (!db) return;
  const [room] = await db.select().from(arenaRooms).where(eq(arenaRooms.id, roomId));
  if (!room || room.status !== 'playing') return;

  const roomPlayers = await db
    .select()
    .from(arenaRoomPlayers)
    .where(eq(arenaRoomPlayers.roomId, roomId))
    .orderBy(arenaRoomPlayers.seatNo);

  const boxIds: number[] = JSON.parse(room.boxIds || '[]');
  const totalRounds = room.rounds;

  for (let roundNo = 1; roundNo <= totalRounds; roundNo++) {
    // 检查该轮是否已有结果（幂等）
    const existing = await db
      .select()
      .from(arenaRoundResults)
      .where(and(eq(arenaRoundResults.roomId, roomId), eq(arenaRoundResults.roundNo, roundNo)));
    if (existing.length > 0) {
      // 已有结果，广播给可能错过的客户端
      const results = existing.map((r) => ({
        playerId: r.playerId,
        nickname: roomPlayers.find((p) => p.playerId === r.playerId)?.nickname ?? '',
        seatNo: roomPlayers.find((p) => p.playerId === r.playerId)?.seatNo ?? 0,
        goodsId: r.goodsId,
        goodsName: r.goodsName,
        goodsImage: r.goodsImage,
        goodsLevel: r.goodsLevel,
        goodsValue: r.goodsValue,
      }));
      broadcastRoundResult(roomId, roundNo, results);
    } else {
      const boxId = boxIds[roundNo - 1];
      if (!boxId) continue;
      const [box] = await db.select().from(boxes).where(eq(boxes.id, boxId));
      if (!box) continue;
      const goods = await db.select().from(boxGoods).where(eq(boxGoods.boxId, boxId));
      if (goods.length === 0) continue;

      const results: Array<{
        playerId: number; nickname: string; seatNo: number;
        goodsId: number; goodsName: string; goodsImage: string;
        goodsLevel: number; goodsValue: string;
      }> = [];

      for (const rp of roomPlayers) {
        const picked = rollBoxGoods(goods as any) as {
          id: number; name: string; imageUrl: string;
          level: number; price: string | number; probability: string;
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
      broadcastRoundResult(roomId, roundNo, results);

      // 更新当前轮次
      if (roundNo < totalRounds) {
        await db.update(arenaRooms).set({ currentRound: roundNo + 1 }).where(eq(arenaRooms.id, roomId));
      }
    }

    // 等待客户端动画播放（slot动画约3秒 + 开奖展示2.2秒 = 5.2秒，留余量用6秒）
    if (roundNo < totalRounds) {
      await new Promise((res) => setTimeout(res, 6000));
    }
  }

  // 所有轮次完成，执行游戏结束
  const freshPlayers = await db
    .select()
    .from(arenaRoomPlayers)
    .where(eq(arenaRoomPlayers.roomId, roomId))
    .orderBy(arenaRoomPlayers.seatNo);
  await finishGame(roomId, db, freshPlayers);
}

// ── 游戏结束处理 ──────────────────────────────────────────────────────────

async function finishGame(roomId: number, db: Awaited<ReturnType<typeof getDb>>, roomPlayers: typeof arenaRoomPlayers.$inferSelect[]) {
  if (!db) return;
  // 汇总每个玩家的总价值
  const allResults = await db
    .select()
    .from(arenaRoundResults)
    .where(eq(arenaRoundResults.roomId, roomId));
  const valueMap: Record<number, number> = {};
  for (const r of allResults) {
    valueMap[r.playerId] = (valueMap[r.playerId] || 0) + parseFloat(r.goodsValue);
  }
  // 找出最高价值玩家
  let maxValue = -1;
  let winnerId = 0;
  for (const [pid, val] of Object.entries(valueMap)) {
    if (val > maxValue) {
      maxValue = val;
      winnerId = Number(pid);
    }
  }
  // 更新参与者记录
  for (const rp of roomPlayers) {
    const totalValue = (valueMap[rp.playerId] || 0).toFixed(2);
    const isWinner = rp.playerId === winnerId ? 1 : 0;
    await db
      .update(arenaRoomPlayers)
      .set({ totalValue, isWinner })
      .where(eq(arenaRoomPlayers.id, rp.id));
    // 赢家获得所有物品价值（以金币形式发放）
    if (isWinner) {
      const [p] = await db.select().from(players).where(eq(players.id, rp.playerId));
      if (p) {
        // 总奖励 = 所有玩家的总价值之和
        const totalPrize = Object.values(valueMap).reduce((s, v) => s + v, 0);
        const newGold = (parseFloat(p.gold ?? "0") + totalPrize).toFixed(2);
        await db.update(players).set({ gold: newGold }).where(eq(players.id, rp.playerId));
      }
    }
  }
  // 更新房间状态
  await db
    .update(arenaRooms)
    .set({ status: "finished", winnerId })
    .where(eq(arenaRooms.id, roomId));
  // 广播游戏结束
  const playerResults = roomPlayers.map((rp) => ({
    playerId: rp.playerId,
    nickname: rp.nickname,
    avatar: rp.avatar,
    seatNo: rp.seatNo,
    totalValue: (valueMap[rp.playerId] || 0).toFixed(2),
    isWinner: rp.playerId === winnerId,
  }));
  broadcastGameOver(roomId, winnerId, playerResults);
}
