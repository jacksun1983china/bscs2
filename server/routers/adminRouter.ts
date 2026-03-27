/**
 * adminRouter.ts — 管理后台路由
 * 从 routers.ts 拆分，包含所有 admin.* 接口
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { eq, desc, sql, and, like, gte, lte, or } from "drizzle-orm";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import {
  addRollBots,
  createRollRoom,
  drawRollRoom,
  getAdminRollRoomList,
  getDb,
  getPlayerById,
  getPlayerList,
  getPlayerRechargeOrders,
  getRollRoomDetail,
  getRollWinners,
  insertGoldLog,
  updatePlayerIdentity,
  updatePlayerStatus,
} from "../db";
import { storagePut } from "../storage";
import {
  banners,
  boxGoods,
  boxes,
  broadcasts,
  gameSettings,
  players,
  playerItems,
  rechargeConfigs,
  rechargeOrders,
  rollRooms,
  skuCategories,
  shopItems,
  shopOrders,
  vipConfigs,
} from "../../drizzle/schema";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "bdcs2-secret-key-2025");

export const adminRouter = router({
  // 管理员登录（独立账号密码，不依赖Manus OAuth）
  login: publicProcedure
    .input(z.object({ account: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // 登录失败次数限制：同一 IP 5 次失败后锁定 15 分钟
      const clientIp = (ctx.req as any).ip || (ctx.req as any).headers?.['x-forwarded-for'] || 'unknown';
      const lockKey = `admin_login_fail:${clientIp}`;
      const now = Date.now();
      const g = global as unknown as Record<string, Record<string, { count: number; firstFail: number; lockedUntil: number }>>;
      if (!g._adminLoginFails) g._adminLoginFails = {};
      const failRecord = g._adminLoginFails[lockKey] || { count: 0, firstFail: now, lockedUntil: 0 };
      if (failRecord.lockedUntil > now) {
        const remaining = Math.ceil((failRecord.lockedUntil - now) / 1000 / 60);
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: `登录尝试过多，请 ${remaining} 分钟后再试` });
      }
      // 从环境变量读取管理员账号密码（默认 admin/admin123）
      const adminAccount = process.env.ADMIN_ACCOUNT || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      if (adminPassword === 'admin123') {
        console.warn('[Security] 警告：管理员密码使用默认弱密码，请通过环境变量 ADMIN_PASSWORD 设置强密码！');
      }
      const found = input.account === adminAccount && input.password === adminPassword;
      if (!found) {
        failRecord.count += 1;
        if (failRecord.count === 1) failRecord.firstFail = now;
        if (failRecord.count >= 5) failRecord.lockedUntil = now + 15 * 60 * 1000;
        g._adminLoginFails[lockKey] = failRecord;
        const remaining = 5 - failRecord.count;
        throw new TRPCError({ code: 'UNAUTHORIZED', message: remaining > 0 ? `账号或密码错误，还可尝试 ${remaining} 次` : '登录尝试过多，请 15 分钟后再试' });
      }
      // 登录成功，清除失败记录
      delete g._adminLoginFails[lockKey];
      // 签发管理员JWT token
      const token = await new SignJWT({ type: 'admin', account: input.account })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(JWT_SECRET);
      // 设置 cookie
      const isSecure = (ctx.req as any).protocol === 'https' ||
        ((ctx.req as any).headers?.['x-forwarded-proto'] || '').includes('https');
      ctx.res.cookie('bdcs2_admin_token', token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 8 * 3600 * 1000,
        path: '/',
      });
      return { success: true, account: input.account, token };
    }),

  // 管理员退出
  logout: publicProcedure
    .mutation(async ({ ctx }) => {
      ctx.res.clearCookie('bdcs2_admin_token', { path: '/' });
      return { success: true };
    }),

  // 验证管理员cookie是否有效
  verify: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== 'admin') {
        return { valid: false };
      }
      return { valid: true, account: ctx.user.name || 'admin' };
    }),

  // 玩家管理
  playerList: adminProcedure
    .input(z.object({ page: z.number().min(1).default(1), limit: z.number().min(1).max(100).default(15), keyword: z.string().optional(), status: z.number().optional(), vipLevel: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return getPlayerList(input);
    }),

  updatePlayerStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.number(), banReason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await updatePlayerStatus(input.id, input.status, input.banReason || "");
      return { success: true };
    }),

  playerDetail: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const player = await getPlayerById(input.id);
      if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      return player;
    }),

  updatePlayerIdentity: adminProcedure
    .input(z.object({
      id: z.number(),
      identity: z.enum(["player", "streamer", "merchant"]),
      commissionRate: z.number().min(0).max(100).optional(),
      commissionEnabled: z.number().optional(),
      invitedBy: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updatePlayerIdentity(input.id, input.identity, input.commissionRate, input.commissionEnabled);
      if (input.invitedBy !== undefined) {
        const db = await getDb();
        if (db) {
          const { players } = await import("../../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await db.update(players).set({ invitedBy: input.invitedBy || null }).where(eq(players.id, input.id));
        }
      }
      return { success: true };
    }),

  // Banner管理
  bannerList: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(banners).orderBy(banners.sort);
  }),

  createBanner: adminProcedure
    .input(z.object({
      title: z.string().default(""),
      linkUrl: z.string().default(""),
      sort: z.number().default(0),
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const buffer = Buffer.from(input.imageBase64, "base64");
      const key = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await db.insert(banners).values({ imageUrl: url, title: input.title, linkUrl: input.linkUrl, sort: input.sort, status: 1 });
      return { success: true, url };
    }),

  updateBanner: adminProcedure
    .input(z.object({ id: z.number(), title: z.string().optional(), linkUrl: z.string().optional(), sort: z.number().optional(), status: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.linkUrl !== undefined) updateData.linkUrl = input.linkUrl;
      if (input.sort !== undefined) updateData.sort = input.sort;
      if (input.status !== undefined) updateData.status = input.status;
      await db.update(banners).set(updateData).where(eq(banners.id, input.id));
      return { success: true };
    }),

  deleteBanner: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(banners).where(eq(banners.id, input.id));
      return { success: true };
    }),

  // 广播管理
  broadcastList: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(broadcasts).orderBy(broadcasts.sort);
  }),

  createBroadcast: adminProcedure
    .input(z.object({ content: z.string().min(1), sort: z.number().default(0) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(broadcasts).values({ content: input.content, sort: input.sort, status: 1 });
      return { success: true };
    }),

  updateBroadcast: adminProcedure
    .input(z.object({ id: z.number(), content: z.string().optional(), sort: z.number().optional(), status: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updateData: any = {};
      if (input.content !== undefined) updateData.content = input.content;
      if (input.sort !== undefined) updateData.sort = input.sort;
      if (input.status !== undefined) updateData.status = input.status;
      await db.update(broadcasts).set(updateData).where(eq(broadcasts.id, input.id));
      return { success: true };
    }),

  deleteBroadcast: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(broadcasts).where(eq(broadcasts.id, input.id));
      return { success: true };
    }),

  // Roll房管理
  rollRoomList: adminProcedure
    .input(z.object({ page: z.number().min(1).default(1), limit: z.number().default(10), keyword: z.string().optional(), status: z.string().optional(), ownerId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return getAdminRollRoomList(input);
    }),

  createRollRoom: adminProcedure
    .input(z.object({
      title: z.string().min(1),
      avatarBase64: z.string().optional(),
      ownerId: z.number().optional(),
      threshold: z.number().default(0),
      maxParticipants: z.number().default(0),
      startAt: z.string(),
      endAt: z.string(),
      prizes: z.array(z.object({
        name: z.string().min(1),
        value: z.number().min(0),
        quantity: z.number().min(1).default(1),
        coinType: z.enum(["shopCoin", "gold"]).default("shopCoin"),
        imageBase64: z.string().optional(),
        prizeType: z.enum(["coin", "item"]).default("coin"),
        itemCategory: z.string().default("roll"),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      let avatarUrl = "";
      if (input.avatarBase64) {
        const buffer = Buffer.from(input.avatarBase64, "base64");
        const key = `roll-avatars/${Date.now()}.jpg`;
        const { url } = await storagePut(key, buffer, "image/jpeg");
        avatarUrl = url;
      }
      const prizes = await Promise.all(input.prizes.map(async p => {
        let imageUrl = "";
        if (p.imageBase64) {
          const buffer = Buffer.from(p.imageBase64, "base64");
          const key = `roll-prizes/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
          const { url } = await storagePut(key, buffer, "image/jpeg");
          imageUrl = url;
        }
        return { name: p.name, value: p.value.toFixed(2), quantity: p.quantity, coinType: p.coinType, imageUrl, prizeType: p.prizeType, itemCategory: p.itemCategory };
      }));
      const roomId = await createRollRoom({
        title: input.title, avatarUrl,
        ownerId: input.ownerId || null,
        threshold: input.threshold.toFixed(2) as any,
        maxParticipants: input.maxParticipants,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        createdBy: ctx.user.openId,
      }, prizes as any);
      return { success: true, roomId };
    }),

  addRollBots: adminProcedure
    .input(z.object({ roomId: z.number(), count: z.number().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      await addRollBots(input.roomId, input.count);
      return { success: true };
    }),

  drawRollRoom: adminProcedure
    .input(z.object({
      roomId: z.number(),
      designatedWinners: z.array(z.object({ prizeId: z.number(), playerId: z.number() })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await drawRollRoom(input.roomId, input.designatedWinners);
      } catch (e: any) {
        throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
      }
    }),

  rollRoomDetail: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const detail = await getRollRoomDetail(input.id);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND" });
      const winners = await getRollWinners(input.id);
      return { ...detail, winners };
    }),

  rollWinners: adminProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getRollWinners(input.roomId);
    }),

  deleteRollRoom: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { rollRooms: rollRoomsTable, rollRoomPrizes: rollPrizesTable, rollParticipants: rollParticipantsTable, rollWinners: rollWinnersTable } = await import("../../drizzle/schema.js");
      await db.delete(rollWinnersTable).where(eq(rollWinnersTable.rollRoomId, input.id));
      await db.delete(rollParticipantsTable).where(eq(rollParticipantsTable.rollRoomId, input.id));
      await db.delete(rollPrizesTable).where(eq(rollPrizesTable.rollRoomId, input.id));
      await db.delete(rollRoomsTable).where(eq(rollRoomsTable.id, input.id));
      return { success: true };
    }),

  uploadFile: adminProcedure
    .input(z.object({ base64: z.string(), filename: z.string(), mimeType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.filename.split('.').pop() || 'jpg';
      const key = `admin-uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  // 充值档位管理
  rechargeConfigList: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(rechargeConfigs).orderBy(rechargeConfigs.sort);
  }),

  createRechargeConfig: adminProcedure
    .input(z.object({ amount: z.number(), gold: z.number(), bonusDiamond: z.number().default(0), tag: z.string().default(""), isFirstRecharge: z.number().default(0), sort: z.number().default(0) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(rechargeConfigs).values({ amount: input.amount.toFixed(2), gold: input.gold.toFixed(2), bonusDiamond: input.bonusDiamond.toFixed(2), tag: input.tag, isFirstRecharge: input.isFirstRecharge, sort: input.sort });
      return { success: true };
    }),

  updateRechargeConfig: adminProcedure
    .input(z.object({ id: z.number(), amount: z.number().optional(), gold: z.number().optional(), bonusDiamond: z.number().optional(), tag: z.string().optional(), status: z.number().optional(), sort: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updateData: any = {};
      if (input.amount !== undefined) updateData.amount = input.amount.toFixed(2);
      if (input.gold !== undefined) updateData.gold = input.gold.toFixed(2);
      if (input.bonusDiamond !== undefined) updateData.bonusDiamond = input.bonusDiamond.toFixed(2);
      if (input.tag !== undefined) updateData.tag = input.tag;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.sort !== undefined) updateData.sort = input.sort;
      await db.update(rechargeConfigs).set(updateData).where(eq(rechargeConfigs.id, input.id));
      return { success: true };
    }),

  deleteRechargeConfig: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(rechargeConfigs).where(eq(rechargeConfigs.id, input.id));
      return { success: true };
    }),

  // ── 游戏配置管理 ──
  gameList: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const { gameConfigs } = await import("../../drizzle/schema");
    const list = await db.select().from(gameConfigs).orderBy(gameConfigs.sort);
    return list;
  }),

  updateGame: adminProcedure
    .input(z.object({
      id: z.number(),
      rtp: z.number().min(1).max(200).optional(),
      enabled: z.number().min(0).max(1).optional(),
      minBet: z.number().min(1).optional(),
      maxBet: z.number().min(1).optional(),
      remark: z.string().optional(),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { gameConfigs } = await import("../../drizzle/schema");
      const { id, ...updates } = input;
      await db.update(gameConfigs).set(updates).where(eq(gameConfigs.id, id));
      return { success: true };
    }),

  updateAllRtp: adminProcedure
    .input(z.object({ rtp: z.number().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { gameConfigs } = await import("../../drizzle/schema");
      await db.update(gameConfigs).set({ rtp: input.rtp });
      await db.update(gameSettings).set({ rtp: String(input.rtp) }).where(eq(gameSettings.gameKey, "rollx"));
      return { success: true };
    }),

  deleteGame: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { gameConfigs } = await import("../../drizzle/schema");
      await db.delete(gameConfigs).where(eq(gameConfigs.id, input.id));
      return { success: true };
    }),

  reorderGame: adminProcedure
    .input(z.object({ id: z.number(), direction: z.enum(["up", "down"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { gameConfigs } = await import("../../drizzle/schema");
      const { asc } = await import("drizzle-orm");
      const list = await db.select().from(gameConfigs).orderBy(asc(gameConfigs.sort));
      const idx = list.findIndex(g => g.id === input.id);
      if (idx === -1) throw new TRPCError({ code: "NOT_FOUND" });
      const swapIdx = input.direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= list.length) return { success: true };
      const current = list[idx];
      const swap = list[swapIdx];
      await db.update(gameConfigs).set({ sort: swap.sort }).where(eq(gameConfigs.id, current.id));
      await db.update(gameConfigs).set({ sort: current.sort }).where(eq(gameConfigs.id, swap.id));
      return { success: true };
    }),

  // 统计数据
  stats: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { totalPlayers: 0, totalRollRooms: 0, activeRollRooms: 0 };
    const { players } = await import("../../drizzle/schema");
    const [playerCount, rollCount, activeRollCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(players),
      db.select({ count: sql<number>`count(*)` }).from(rollRooms),
      db.select({ count: sql<number>`count(*)` }).from(rollRooms).where(eq(rollRooms.status, "pending")),
    ]);
    return {
      totalPlayers: Number(playerCount[0]?.count ?? 0),
      totalRollRooms: Number(rollCount[0]?.count ?? 0),
      activeRollRooms: Number(activeRollCount[0]?.count ?? 0),
    };
  }),

  // ── 财务统计 ──
  financeStats: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { totalRecharge: 0, todayRecharge: 0, totalOrders: 0, todayOrders: 0, topPlayers: [] };
    const { rechargeOrders, players } = await import("../../drizzle/schema");
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [totalRechargeRes, todayRechargeRes, totalOrdersRes, todayOrdersRes, topPlayersRes] = await Promise.all([
      db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(rechargeOrders).where(eq(rechargeOrders.status, 1)),
      db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(rechargeOrders).where(sql`status = 1 AND createdAt >= ${todayStart}`),
      db.select({ count: sql<number>`count(*)` }).from(rechargeOrders).where(eq(rechargeOrders.status, 1)),
      db.select({ count: sql<number>`count(*)` }).from(rechargeOrders).where(sql`status = 1 AND createdAt >= ${todayStart}`),
      db.select({ id: players.id, nickname: players.nickname, phone: players.phone, totalRecharge: players.totalRecharge, vipLevel: players.vipLevel })
        .from(players).orderBy(desc(players.totalRecharge)).limit(10),
    ]);
    return {
      totalRecharge: parseFloat(String(totalRechargeRes[0]?.total ?? "0")),
      todayRecharge: parseFloat(String(todayRechargeRes[0]?.total ?? "0")),
      totalOrders: Number(totalOrdersRes[0]?.count ?? 0),
      todayOrders: Number(todayOrdersRes[0]?.count ?? 0),
      topPlayers: topPlayersRes.map(p => ({ ...p, totalRecharge: parseFloat(String(p.totalRecharge ?? "0")) })),
    };
  }),

  financeOrders: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().default(15),
      status: z.number().optional(),
      keyword: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { list: [], total: 0 };
      const { rechargeOrders, players } = await import("../../drizzle/schema");
      const { and, like } = await import("drizzle-orm");
      const conditions: any[] = [];
      if (input.status !== undefined) conditions.push(eq(rechargeOrders.status, input.status));
      if (input.keyword) conditions.push(like(rechargeOrders.orderNo, `%${input.keyword}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.limit;
      const [list, countRes] = await Promise.all([
        db.select({
          id: rechargeOrders.id,
          orderNo: rechargeOrders.orderNo,
          playerId: rechargeOrders.playerId,
          amount: rechargeOrders.amount,
          gold: rechargeOrders.gold,
          bonusDiamond: rechargeOrders.bonusDiamond,
          payMethod: rechargeOrders.payMethod,
          status: rechargeOrders.status,
          remark: rechargeOrders.remark,
          createdAt: rechargeOrders.createdAt,
          platformOrderNo: rechargeOrders.platformOrderNo,
          playerNickname: players.nickname,
          playerPhone: players.phone,
        })
          .from(rechargeOrders)
          .leftJoin(players, eq(rechargeOrders.playerId, players.id))
          .where(where)
          .orderBy(desc(rechargeOrders.createdAt))
          .limit(input.limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(rechargeOrders).where(where),
      ]);
      return {
        list: list.map(o => ({ ...o, amount: parseFloat(String(o.amount ?? "0")), gold: parseFloat(String(o.gold ?? "0")), bonusDiamond: parseFloat(String(o.bonusDiamond ?? "0")) })),
        total: Number(countRes[0]?.count ?? 0),
      };
    }),

  /** 审批充值订单（将订单状态改为已完成，并将金币发放给玩家） */
  approveRechargeOrder: adminProcedure
    .input(z.object({ id: z.number().int().positive(), remark: z.string().optional().default('') }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const orderRows = await db.select().from(rechargeOrders).where(eq(rechargeOrders.id, input.id));
      if (!orderRows.length) throw new TRPCError({ code: 'NOT_FOUND', message: '订单不存在' });
      const order = orderRows[0];
      if (order.status !== 0) throw new TRPCError({ code: 'BAD_REQUEST', message: '订单已处理，请勿重复操作' });
      await db.update(rechargeOrders).set({ status: 1, remark: input.remark || order.remark }).where(eq(rechargeOrders.id, input.id));
      const goldToAdd = parseFloat(String(order.gold));
      const diamondToAdd = parseFloat(String(order.bonusDiamond ?? '0'));
      const amountToAdd = parseFloat(String(order.amount));
      const playerRows = await db.select().from(players).where(eq(players.id, order.playerId));
      if (!playerRows.length) throw new TRPCError({ code: 'NOT_FOUND', message: '玩家不存在' });
      const player = playerRows[0];
      const newGold = parseFloat(player.gold) + goldToAdd;
      const newDiamond = parseFloat(player.diamond) + diamondToAdd;
      const newTotalRecharge = parseFloat(String(player.totalRecharge ?? '0')) + amountToAdd;
      // 根据新的累计充值自动计算VIP等级
      const { asc } = await import('drizzle-orm');
      let vipRows = await db.select().from(vipConfigs).orderBy(asc(vipConfigs.level));
      // 如果数据库中没有VIP配置，使用默认配置（每级1000元）
      if (vipRows.length === 0) {
        vipRows = Array.from({ length: 11 }, (_, i) => ({
          id: i, level: i, name: `VIP${i}`,
          requiredPoints: i === 0 ? 0 : i * 1000,
          rechargeBonus: '0.00', privileges: null, createdAt: new Date(),
        }));
      }
      let newVipLevel = 0;
      for (const vc of vipRows) {
        if (newTotalRecharge >= vc.requiredPoints) {
          newVipLevel = vc.level;
        } else {
          break;
        }
      }
      await db.update(players).set({
        gold: newGold.toFixed(2),
        diamond: newDiamond.toFixed(2),
        totalRecharge: newTotalRecharge.toFixed(2),
        vipLevel: newVipLevel,
      }).where(eq(players.id, order.playerId));
      // 记录金币流水
      await insertGoldLog(order.playerId, goldToAdd, newGold, 'recharge', `充值审批到账 ${goldToAdd.toFixed(2)} 金币 (订单号: ${order.orderNo})`);
      return { success: true, orderNo: order.orderNo, goldAdded: goldToAdd, diamondAdded: diamondToAdd, newVipLevel };
    }),

  /** 拒绝充值订单 */
  rejectRechargeOrder: adminProcedure
    .input(z.object({ id: z.number().int().positive(), remark: z.string().min(1, '请填写拒绝原因') }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const orderRows = await db.select().from(rechargeOrders).where(eq(rechargeOrders.id, input.id));
      if (!orderRows.length) throw new TRPCError({ code: 'NOT_FOUND', message: '订单不存在' });
      const order = orderRows[0];
      if (order.status !== 0) throw new TRPCError({ code: 'BAD_REQUEST', message: '订单已处理，请勿重复操作' });
      await db.update(rechargeOrders).set({ status: 2, remark: input.remark }).where(eq(rechargeOrders.id, input.id));
      return { success: true, orderNo: order.orderNo };
    }),

  // ── 系统设置 ──
  getSiteSettings: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const { siteSettings } = await import("../../drizzle/schema");
    return db.select().from(siteSettings).orderBy(siteSettings.settingKey);
  }),

  updateSiteSetting: adminProcedure
    .input(z.object({ key: z.string(), value: z.string(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { siteSettings } = await import("../../drizzle/schema");
      const existing = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, input.key));
      if (existing.length > 0) {
        await db.update(siteSettings).set({ value: input.value, description: input.description ?? existing[0].description }).where(eq(siteSettings.settingKey, input.key));
      } else {
        await db.insert(siteSettings).values({ settingKey: input.key, value: input.value, description: input.description ?? "" });
      }
      return { success: true };
    }),

  // VIP等级配置管理
  updateVipConfig: adminProcedure
    .input(z.object({
      level: z.number().min(0).max(10),
      requiredPoints: z.number().min(0),
      rechargeBonus: z.string(),
      privileges: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { vipConfigs } = await import("../../drizzle/schema");
      const existing = await db.select().from(vipConfigs).where(eq(vipConfigs.level, input.level));
      if (existing.length > 0) {
        await db.update(vipConfigs).set({
          requiredPoints: input.requiredPoints,
          rechargeBonus: input.rechargeBonus,
          privileges: input.privileges ?? null,
        }).where(eq(vipConfigs.level, input.level));
      } else {
        await db.insert(vipConfigs).values({
          level: input.level,
          name: input.level === 0 ? 'VIP0' : `VIP${input.level}`,
          requiredPoints: input.requiredPoints,
          rechargeBonus: input.rechargeBonus,
          privileges: input.privileges ?? null,
        });
      }
      return { success: true };
    }),

  /** 更新 Vortex 游戏配置（RTP、投注范围） */
  updateVortexConfig: publicProcedure
    .input(z.object({
      rtp: z.number().min(50).max(99),
      minBet: z.number().positive(),
      maxBet: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 验证管理员 cookie
      const adminToken = ctx.req.cookies?.bdcs2_admin_token;
      if (!adminToken) throw new TRPCError({ code: 'UNAUTHORIZED', message: '无权限' });
      try {
        await jwtVerify(adminToken, JWT_SECRET);
      } catch {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: '无效的管理员令牌' });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      try {
        const [existing] = await (db as any).execute('SELECT id FROM vortexConfig LIMIT 1');
        if (existing && existing.length > 0) {
          await (db as any).execute(
            'UPDATE vortexConfig SET rtp = ?, minBet = ?, maxBet = ? WHERE id = ?',
            [input.rtp, input.minBet, input.maxBet, existing[0].id]
          );
        } else {
          await (db as any).execute(
            'INSERT INTO vortexConfig (rtp, minBet, maxBet, enabled) VALUES (?, ?, ?, 1)',
            [input.rtp, input.minBet, input.maxBet]
          );
        }
        return { success: true };
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: String(e) });
      }
    }),

  /** 管理后台：查询玩家金币流水 */
  adminGoldLogs: adminProcedure
    .input(z.object({
      playerId: z.number().optional(),
      type: z.string().optional(),
      timeRange: z.enum(["all", "today", "yesterday", "week7", "month"]).default("all"),
      page: z.number().min(1).default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { list: [], total: 0 };
      const { goldLogs: goldLogsTable } = await import("../../drizzle/schema");
      const { gte, lte } = await import("drizzle-orm");
      const conditions: any[] = [];
      if (input.playerId) conditions.push(eq(goldLogsTable.playerId, input.playerId));
      if (input.type) conditions.push(eq(goldLogsTable.type, input.type));
      const now = new Date();
      if (input.timeRange === "today") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        conditions.push(gte(goldLogsTable.createdAt, start));
      } else if (input.timeRange === "yesterday") {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
        const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        conditions.push(gte(goldLogsTable.createdAt, start));
        conditions.push(lte(goldLogsTable.createdAt, end));
      } else if (input.timeRange === "week7") {
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        conditions.push(gte(goldLogsTable.createdAt, start));
      } else if (input.timeRange === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        conditions.push(gte(goldLogsTable.createdAt, start));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.limit;
      const [list, countResult] = await Promise.all([
        db.select().from(goldLogsTable).where(where).orderBy(desc(goldLogsTable.createdAt)).limit(input.limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(goldLogsTable).where(where),
      ]);
      const playerIds = Array.from(new Set(list.map(r => r.playerId)));
      let playerMap: Record<number, { nickname: string; phone: string }> = {};
      if (playerIds.length > 0) {
        const playerRows = await db.select({ id: players.id, nickname: players.nickname, phone: players.phone }).from(players).where(sql`${players.id} IN (${sql.join(playerIds.map(id => sql`${id}`), sql`, `)})`);
        for (const p of playerRows) playerMap[p.id] = { nickname: p.nickname || '', phone: p.phone || '' };
      }
      return {
        list: list.map(r => ({
          id: r.id,
          playerId: r.playerId,
          playerNickname: playerMap[r.playerId]?.nickname || '',
          playerPhone: playerMap[r.playerId]?.phone || '',
          amount: parseFloat(String(r.amount)),
          balance: parseFloat(String(r.balance)),
          type: r.type,
          description: r.description,
          refId: r.refId,
          createdAt: r.createdAt,
        })),
        total: Number(countResult[0]?.count ?? 0),
      };
    }),

  /** 管理后台：手动调整玩家金币 */
  adjustPlayerGold: adminProcedure
    .input(z.object({
      playerId: z.number(),
      amount: z.number(), // 正数为增加，负数为扣除
      reason: z.string().min(1, '请填写原因'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '数据库未连接' });
      const player = await getPlayerById(input.playerId);
      if (!player) throw new TRPCError({ code: 'NOT_FOUND', message: '玩家不存在' });
      const currentGold = parseFloat(String(player.gold ?? 0));
      const newGold = currentGold + input.amount;
      if (newGold < 0) throw new TRPCError({ code: 'BAD_REQUEST', message: '金币不足，无法扣除' });
      await db.update(players).set({ gold: String(newGold.toFixed(2)) }).where(eq(players.id, input.playerId));
      await insertGoldLog(
        input.playerId,
        input.amount,
        newGold,
        input.amount >= 0 ? 'admin_gift' : 'admin_deduct',
        input.reason,
      );
      return { success: true, newGold };
    }),

  // ── X-Game 分类管理 ──────────────────────────────────────────────
  // X-Game 列表（从 gameSettings 表中查询 rollx/rush/dingdong/vortex）
  xgameList: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const XGAME_KEYS = ['rollx', 'rush', 'dingdong', 'vortex'];
    const rows = await db.select().from(gameSettings).where(
      sql`${gameSettings.gameKey} IN ('rollx', 'rush', 'dingdong', 'vortex')`
    );
    // 添加中文名称映射
    const nameMap: Record<string, { name: string; nameEn: string; path: string }> = {
      rollx: { name: 'ROLL-X 转盘', nameEn: 'ROLL-X', path: '/rollx' },
      rush: { name: '\u4e0d\u53ef\u80fd\u7684\u51b2\u523a', nameEn: 'Uncrossable Rush', path: '/uncrossable-rush' },
      dingdong: { name: '\u53ee\u549a\u6e38\u620f', nameEn: 'DingDong', path: '/dingdong' },
      vortex: { name: '\u6f29\u6da1', nameEn: 'Vortex', path: '/vortex' },
    };
    return rows.map(r => ({
      ...r,
      rtp: parseFloat(String(r.rtp)),
      minBet: parseFloat(String(r.minBet)),
      maxBet: parseFloat(String(r.maxBet)),
      name: nameMap[r.gameKey]?.name || r.gameKey,
      nameEn: nameMap[r.gameKey]?.nameEn || r.gameKey,
      path: nameMap[r.gameKey]?.path || '',
    }));
  }),

  // 更新单个 X-Game 的配置（RTP / 开关 / 投注范围）
  xgameUpdate: adminProcedure
    .input(z.object({
      gameKey: z.string(),
      rtp: z.number().min(1).max(200).optional(),
      enabled: z.number().min(0).max(1).optional(),
      minBet: z.number().min(0).optional(),
      maxBet: z.number().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const updateData: any = {};
      if (input.rtp !== undefined) updateData.rtp = String(input.rtp.toFixed(2));
      if (input.enabled !== undefined) updateData.enabled = input.enabled;
      if (input.minBet !== undefined) updateData.minBet = String(input.minBet.toFixed(2));
      if (input.maxBet !== undefined) updateData.maxBet = String(input.maxBet.toFixed(2));
      await db.update(gameSettings).set(updateData).where(eq(gameSettings.gameKey, input.gameKey));
      // 同步到 vortexConfig 表（Vortex 用独立配置表）
      if (input.gameKey === 'vortex') {
        const vortexUpdate: any = {};
        if (input.rtp !== undefined) vortexUpdate.rtp = String(input.rtp.toFixed(2));
        if (input.minBet !== undefined) vortexUpdate.minBet = String(input.minBet.toFixed(2));
        if (input.maxBet !== undefined) vortexUpdate.maxBet = String(input.maxBet.toFixed(2));
        if (Object.keys(vortexUpdate).length > 0) {
          await (db as any).execute(sql`UPDATE vortexConfig SET ${sql.raw(
            Object.entries(vortexUpdate).map(([k, v]) => `${k} = '${v}'`).join(', ')
          )} ORDER BY id DESC LIMIT 1`);
        }
      }
      return { success: true };
    }),

  // 批量设置所有 X-Game 的 RTP
  xgameBatchRtp: adminProcedure
    .input(z.object({ rtp: z.number().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const rtpStr = String(input.rtp.toFixed(2));
      await db.update(gameSettings).set({ rtp: rtpStr }).where(
        sql`${gameSettings.gameKey} IN ('rollx', 'rush', 'dingdong', 'vortex')`
      );
      // 同步到 vortexConfig
      await (db as any).execute(sql`UPDATE vortexConfig SET rtp = ${rtpStr} ORDER BY id DESC LIMIT 1`);
      return { success: true };
    }),

  /** ========== 订单管理（提取记录） ========== */
  /** 提货订单列表（只显示已发起提货的记录，status=1） */
  extractOrders: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().default(20),
      keyword: z.string().optional(),       // 搜索：玩家昵称/手机号/cs2pifa订单号
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const offset = (input.page - 1) * input.limit;

      // 构建查询条件：只查询 status=1（已提货）的记录
      const conditions: any[] = [eq(playerItems.status, 1)];
      if (input.startDate) {
        conditions.push(gte(playerItems.extractedAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(playerItems.extractedAt, new Date(input.endDate + ' 23:59:59')));
      }
      if (input.keyword) {
        const kw = `%${input.keyword}%`;
        conditions.push(
          or(
            like(players.nickname, kw),
            like(players.phone, kw),
            like(playerItems.csOrderNo, kw),
          )
        );
      }

      const whereClause = and(...conditions);

      const [list, countResult] = await Promise.all([
        db.select({
          id: playerItems.id,
          playerId: playerItems.playerId,
          playerNickname: players.nickname,
          playerPhone: players.phone,
          itemId: playerItems.itemId,
          itemName: boxGoods.name,
          itemImageUrl: boxGoods.imageUrl,
          itemQuality: boxGoods.level,
          itemValue: boxGoods.price,
          source: playerItems.source,
          status: playerItems.status,
          csTemplateId: playerItems.csTemplateId,
          csOrderNo: playerItems.csOrderNo,
          extractedAt: playerItems.extractedAt,
          createdAt: playerItems.createdAt,
        })
          .from(playerItems)
          .leftJoin(players, eq(playerItems.playerId, players.id))
          .leftJoin(boxGoods, eq(playerItems.itemId, boxGoods.id))
          .where(whereClause)
          .orderBy(desc(playerItems.extractedAt))
          .limit(input.limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` })
          .from(playerItems)
          .leftJoin(players, eq(playerItems.playerId, players.id))
          .where(whereClause),
      ]);

      return {
        list: list.map(r => ({
          ...r,
          itemValue: parseFloat(String(r.itemValue ?? '0')),
        })),
        total: Number(countResult[0]?.count ?? 0),
      };
    }),

  /** 提货统计（只统计已提货的记录） */
  extractStats: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    const [stats] = await db.select({
      total: sql<number>`SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END)`,
      todayCount: sql<number>`SUM(CASE WHEN status = 1 AND DATE(extractedAt) = CURDATE() THEN 1 ELSE 0 END)`,
      totalValue: sql<string>`COALESCE(SUM(CASE WHEN status = 1 THEN (SELECT price FROM boxGoods WHERE boxGoods.id = playerItems.itemId LIMIT 1) ELSE 0 END), 0)`,
      todayValue: sql<string>`COALESCE(SUM(CASE WHEN status = 1 AND DATE(extractedAt) = CURDATE() THEN (SELECT price FROM boxGoods WHERE boxGoods.id = playerItems.itemId LIMIT 1) ELSE 0 END), 0)`,
    }).from(playerItems);
    return {
      total: Number(stats?.total ?? 0),
      todayCount: Number(stats?.todayCount ?? 0),
      totalValue: parseFloat(String(stats?.totalValue ?? '0')),
      todayValue: parseFloat(String(stats?.todayValue ?? '0')),
    };
  }),
});
