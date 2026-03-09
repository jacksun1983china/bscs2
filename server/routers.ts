import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addRollBots,
  assignSessionToAgent,
  bindInviteCode,
  clearAgentUnread,
  clearPlayerUnread,
  closeCsSession,
  createCsAgent,
  createCsQuickReply,
  createCsSession,
  createPlayer,
  createRollRoom,
  createSmsCode,
  deleteCsQuickReply,
  drawRollRoom,
  getActiveSessionByPlayer,
  getAdminRollRoomList,
  getAllCsSessions,
  getAgentSessions,
  getCsAgentById,
  getCsAgentByUsername,
  getCsAgentList,
  getCsMessages,
  getCsQuickReplies,
  getCsSessionById,
  getCsSessionsByPlayer,
  getDb,
  getPlayerByPhone,
  getPlayerById,
  getPlayerByInviteCode,
  getPlayerInventory,
  getPlayerList,
  getPlayerMessages,
  getPlayerRechargeOrders,
  getRechargeConfigs,
  getRollRoomDetail,
  getRollRoomList,
  getRollWinners,
  getTeamStats,
  sendCsMessage,
  updateCsAgent,
  updateCsAgentStatus,
  updatePlayerIdentity,
  updatePlayerLogin,
  updatePlayerStatus,
  updateSessionLastMessage,
  verifySmsCode,
  withdrawCommission,
} from "./db";
import { storagePut } from "./storage";
import { SignJWT, jwtVerify } from "jose";
import { eq, desc, sql } from "drizzle-orm";
import {
  banners,
  broadcasts,
  csAgents,
  gameSettings,
  rechargeConfigs,
  rollRoomPrizes,
  rollRooms,
  rollxGames,
} from "../drizzle/schema";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "bdcs2-secret-key-2025");
const PLAYER_COOKIE = "bdcs2_player_token";
const AGENT_COOKIE = "bdcs2_agent_token";

async function getAgentFromCookie(req: any): Promise<{ agentId: number; username: string } | null> {
  try {
    const cookieHeader = req.headers?.cookie || "";
    const match = cookieHeader.match(new RegExp(`${AGENT_COOKIE}=([^;]+)`));
    if (!match) return null;
    const token = match[1];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "csagent") return null;
    return { agentId: payload.agentId as number, username: payload.username as string };
  } catch { return null; }
}

async function signPlayerToken(playerId: number, phone: string) {
  return new SignJWT({ playerId, phone, type: "player" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

async function getPlayerFromCookie(req: any): Promise<{ playerId: number; phone: string } | null> {
  try {
    const cookieHeader = req.headers?.cookie || "";
    const match = cookieHeader.match(new RegExp(`${PLAYER_COOKIE}=([^;]+)`));
    if (!match) return null;
    const token = match[1];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "player") return null;
    return { playerId: payload.playerId as number, phone: payload.phone as string };
  } catch { return null; }
}

function setCookieOptions(req: any) {
  const isSecure = (req as any).protocol === 'https' ||
    ((req as any).headers?.['x-forwarded-proto'] || '').includes('https');
  return { httpOnly: true, secure: isSecure, sameSite: isSecure ? 'none' as const : 'lax' as const, maxAge: 30 * 24 * 60 * 60 * 1000, path: '/' };
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── 玩家认证（手机号+验证码） ──────────────────────────────
  player: router({
    sendCode: publicProcedure
      .input(z.object({ phone: z.string().min(11).max(11), purpose: z.string().default("login") }))
      .mutation(async ({ input }) => {
        const code = await createSmsCode(input.phone, input.purpose);
        console.log(`[模拟短信] 手机号: ${input.phone} 验证码: ${code}`);
        return { success: true, message: "验证码已发送（模拟：123456）" };
      }),

    login: publicProcedure
      .input(z.object({ phone: z.string().min(11).max(11), code: z.string().length(6), inviteCode: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const valid = await verifySmsCode(input.phone, input.code, "login");
        if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "验证码无效或已过期" });
        let player = await getPlayerByPhone(input.phone);
        const isNew = !player;
        if (!player) {
          const myInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          let invitedBy: number | undefined;
          if (input.inviteCode) {
            const inviter = await getPlayerByInviteCode(input.inviteCode);
            if (inviter) invitedBy = inviter.id;
          }
          player = await createPlayer({
            phone: input.phone,
            nickname: `用户${input.phone.slice(-4)}`,
            inviteCode: myInviteCode,
            invitedBy,
            registerIp: (ctx.req as any).ip || "",
          });
          if (!player) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "登录失败" });
        }
        if (player.status === 0) throw new TRPCError({ code: "FORBIDDEN", message: "账号已被封禁" });
        await updatePlayerLogin(player.id, (ctx.req as any).ip || "");
        const token = await signPlayerToken(player.id, player.phone);
        (ctx.res as any).cookie(PLAYER_COOKIE, token, setCookieOptions(ctx.req));
        return {
          success: true, isNew,
          player: { id: player.id, phone: player.phone, nickname: player.nickname, vipLevel: player.vipLevel, gold: player.gold, diamond: player.diamond },
        };
      }),

    me: publicProcedure.query(async ({ ctx }) => {
      const session = await getPlayerFromCookie(ctx.req);
      if (!session) return null;
      const player = await getPlayerById(session.playerId);
      if (!player) return null;
      return {
        id: player.id, phone: player.phone, nickname: player.nickname, avatar: player.avatar,
        vipLevel: player.vipLevel, gold: player.gold, diamond: player.diamond, shopCoin: player.shopCoin,
        totalRecharge: player.totalRecharge, inviteCode: player.inviteCode,
        invitedBy: player.invitedBy, identity: player.identity,
        commissionEnabled: player.commissionEnabled, commissionBalance: player.commissionBalance,
        steamAccount: player.steamAccount, realName: player.realName ? "已认证" : "",
        createdAt: player.createdAt,
      };
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const opts = setCookieOptions(ctx.req);
      (ctx.res as any).clearCookie(PLAYER_COOKIE, { ...opts, maxAge: -1 });
      return { success: true };
    }),

    /** 绑定邀请码 */
    bindInviteCode: publicProcedure
      .input(z.object({ inviteCode: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const inviter = await bindInviteCode(session.playerId, input.inviteCode);
        return { success: true, inviterNickname: inviter.nickname, inviterId: inviter.id };
      }),

    /** 获取推广数据 */
    teamStats: publicProcedure.query(async ({ ctx }) => {
      const session = await getPlayerFromCookie(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
      return getTeamStats(session.playerId);
    }),

    /** 提取返佣 */
    withdrawCommission: publicProcedure.mutation(async ({ ctx }) => {
      const session = await getPlayerFromCookie(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
      return withdrawCommission(session.playerId);
    }),

    /** 获取背包 */
    inventory: publicProcedure
      .input(z.object({ page: z.number().min(1).default(1), limit: z.number().default(20) }))
      .query(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        return getPlayerInventory(session.playerId, input.page, input.limit);
      }),

    /** 获取站内信 */
    messages: publicProcedure
      .input(z.object({ page: z.number().min(1).default(1), limit: z.number().default(20) }))
      .query(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        return getPlayerMessages(session.playerId, input.page, input.limit);
      }),

    /** 充值档位列表 */
    rechargeConfigs: publicProcedure.query(async () => {
      return getRechargeConfigs();
    }),

    /** 充値记录 */
    rechargeOrders: publicProcedure
      .input(z.object({ page: z.number().min(1).default(1), limit: z.number().default(20) }))
      .query(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        return getPlayerRechargeOrders(session.playerId, input.page, input.limit);
      }),

    /** 更新个人资料（昵称+头像ID） */
    updateProfile: publicProcedure
      .input(z.object({
        nickname: z.string().min(1).max(20).optional(),
        avatar: z.string().regex(/^0[0-9]{2}$/).optional(), // 001-016
      }))
      .mutation(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
        const { players } = await import("../drizzle/schema");
        const updates: Record<string, string> = {};
        if (input.nickname) updates.nickname = input.nickname;
        if (input.avatar) updates.avatar = input.avatar;
        if (Object.keys(updates).length === 0) return { success: true };
        await db.update(players).set(updates).where(eq(players.id, session.playerId));
        return { success: true };
      }),
  }),

  // ── Roll房 ──────────────────────────────────────────────────
  roll: router({
    /** 获取Roll房列表 */
    list: publicProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().default(10),
        filter: z.enum(["all", "joinable", "mine", "ended"]).default("all"),
        keyword: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        return getRollRoomList({
          page: input.page, limit: input.limit,
          filter: input.filter, keyword: input.keyword,
          playerId: session?.playerId,
        });
      }),

    /** 获取Roll房详情 */
    detail: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const detail = await getRollRoomDetail(input.id);
        if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Roll房不存在" });
        return detail;
      }),

    /** 参与Roll房 */
    join: publicProcedure
      .input(z.object({ roomId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        try {
          return await (await import("./db")).joinRollRoom(input.roomId, session.playerId);
        } catch (e: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        }
      }),

    /** 获取中奖名单 */
    winners: publicProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input }) => {
        return getRollWinners(input.roomId);
      }),

    /** 检查是否已参与 */
    checkJoined: publicProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) return { joined: false };
        const db = await getDb();
        if (!db) return { joined: false };
        const { rollParticipants } = await import("../drizzle/schema");
        const { and, eq } = await import("drizzle-orm");
        const result = await db.select().from(rollParticipants).where(
          and(eq(rollParticipants.rollRoomId, input.roomId), eq(rollParticipants.playerId, session.playerId), eq(rollParticipants.isBot, 0))
        ).limit(1);
        return { joined: result.length > 0 };
      }),
  }),

  // ── 公共数据（Banner、广播） ──────────────────────────────────
  public: router({
    banners: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(banners).where(eq(banners.status, 1)).orderBy(banners.sort);
    }),

    broadcasts: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(broadcasts).where(eq(broadcasts.status, 1)).orderBy(broadcasts.sort);
    }),
  }),

  // ── 管理后台 ──────────────────────────────────────────────────
  admin: router({
    // 玩家管理
    playerList: protectedProcedure
      .input(z.object({ page: z.number().min(1).default(1), limit: z.number().min(1).max(100).default(15), keyword: z.string().optional(), status: z.number().optional(), vipLevel: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "无权限访问" });
        return getPlayerList(input);
      }),

    updatePlayerStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.number(), banReason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "无权限" });
        await updatePlayerStatus(input.id, input.status, input.banReason || "");
        return { success: true };
      }),

    playerDetail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "无权限" });
        const player = await getPlayerById(input.id);
        if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
        return player;
      }),

    updatePlayerIdentity: protectedProcedure
      .input(z.object({
        id: z.number(),
        identity: z.enum(["player", "streamer", "merchant"]),
        commissionRate: z.number().min(0).max(100).optional(),
        commissionEnabled: z.number().optional(),
        invitedBy: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "无权限" });
        await updatePlayerIdentity(input.id, input.identity, input.commissionRate, input.commissionEnabled);
        if (input.invitedBy !== undefined) {
          const db = await getDb();
          if (db) {
            const { players } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await db.update(players).set({ invitedBy: input.invitedBy || null }).where(eq(players.id, input.id));
          }
        }
        return { success: true };
      }),

    // Banner管理
    bannerList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(banners).orderBy(banners.sort);
    }),

    createBanner: protectedProcedure
      .input(z.object({
        title: z.string().default(""),
        linkUrl: z.string().default(""),
        sort: z.number().default(0),
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // 上传图片到S3
        const buffer = Buffer.from(input.imageBase64, "base64");
        const key = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.insert(banners).values({ imageUrl: url, title: input.title, linkUrl: input.linkUrl, sort: input.sort, status: 1 });
        return { success: true, url };
      }),

    updateBanner: protectedProcedure
      .input(z.object({ id: z.number(), title: z.string().optional(), linkUrl: z.string().optional(), sort: z.number().optional(), status: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
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

    deleteBanner: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(banners).where(eq(banners.id, input.id));
        return { success: true };
      }),

    // 广播管理
    broadcastList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(broadcasts).orderBy(broadcasts.sort);
    }),

    createBroadcast: protectedProcedure
      .input(z.object({ content: z.string().min(1), sort: z.number().default(0) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(broadcasts).values({ content: input.content, sort: input.sort, status: 1 });
        return { success: true };
      }),

    updateBroadcast: protectedProcedure
      .input(z.object({ id: z.number(), content: z.string().optional(), sort: z.number().optional(), status: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const updateData: any = {};
        if (input.content !== undefined) updateData.content = input.content;
        if (input.sort !== undefined) updateData.sort = input.sort;
        if (input.status !== undefined) updateData.status = input.status;
        await db.update(broadcasts).set(updateData).where(eq(broadcasts.id, input.id));
        return { success: true };
      }),

    deleteBroadcast: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(broadcasts).where(eq(broadcasts.id, input.id));
        return { success: true };
      }),

    // Roll房管理
    rollRoomList: protectedProcedure
      .input(z.object({ page: z.number().min(1).default(1), limit: z.number().default(10), keyword: z.string().optional(), status: z.string().optional(), ownerId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAdminRollRoomList(input);
      }),

    createRollRoom: protectedProcedure
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
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
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
          return { name: p.name, value: p.value.toFixed(2), quantity: p.quantity, coinType: p.coinType, imageUrl };
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

    addRollBots: protectedProcedure
      .input(z.object({ roomId: z.number(), count: z.number().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await addRollBots(input.roomId, input.count);
        return { success: true };
      }),

    drawRollRoom: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        designatedWinners: z.array(z.object({ prizeId: z.number(), playerId: z.number() })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        try {
          return await drawRollRoom(input.roomId, input.designatedWinners);
        } catch (e: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        }
      }),

    rollRoomDetail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const detail = await getRollRoomDetail(input.id);
        if (!detail) throw new TRPCError({ code: "NOT_FOUND" });
        const winners = await getRollWinners(input.id);
        return { ...detail, winners };
      }),

    rollWinners: protectedProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getRollWinners(input.roomId);
      }),

    deleteRollRoom: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { rollRooms: rollRoomsTable, rollRoomPrizes: rollPrizesTable, rollParticipants: rollParticipantsTable, rollWinners: rollWinnersTable } = await import("../drizzle/schema.js");
        await db.delete(rollWinnersTable).where(eq(rollWinnersTable.rollRoomId, input.id));
        await db.delete(rollParticipantsTable).where(eq(rollParticipantsTable.rollRoomId, input.id));
        await db.delete(rollPrizesTable).where(eq(rollPrizesTable.rollRoomId, input.id));
        await db.delete(rollRoomsTable).where(eq(rollRoomsTable.id, input.id));
        return { success: true };
      }),

    uploadFile: protectedProcedure
      .input(z.object({ base64: z.string(), filename: z.string(), mimeType: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.filename.split('.').pop() || 'jpg';
        const key = `admin-uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),

    // 充值档位管理
    rechargeConfigList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(rechargeConfigs).orderBy(rechargeConfigs.sort);
    }),

    createRechargeConfig: protectedProcedure
      .input(z.object({ amount: z.number(), gold: z.number(), bonusDiamond: z.number().default(0), tag: z.string().default(""), isFirstRecharge: z.number().default(0), sort: z.number().default(0) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(rechargeConfigs).values({ amount: input.amount.toFixed(2), gold: input.gold.toFixed(2), bonusDiamond: input.bonusDiamond.toFixed(2), tag: input.tag, isFirstRecharge: input.isFirstRecharge, sort: input.sort });
        return { success: true };
      }),

    updateRechargeConfig: protectedProcedure
      .input(z.object({ id: z.number(), amount: z.number().optional(), gold: z.number().optional(), bonusDiamond: z.number().optional(), tag: z.string().optional(), status: z.number().optional(), sort: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
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

    deleteRechargeConfig: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(rechargeConfigs).where(eq(rechargeConfigs.id, input.id));
        return { success: true };
      }),

    // 统计数据
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return { totalPlayers: 0, totalRollRooms: 0, activeRollRooms: 0 };
      const { players } = await import("../drizzle/schema");
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
  }),

  // ── ROLL-X 幸运转盘游戏 ──────────────────────────────────────────────
  rollx: router({
    /** 获取游戏设置（最小/最大倍率、最小/最大投注额、是否启用） */
    getSettings: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { rtp: 96, minBet: 1, maxBet: 10000, minMultiplier: 1.1, maxMultiplier: 30000, enabled: true };
      const rows = await db.select().from(gameSettings).where(eq(gameSettings.gameKey, "rollx"));
      if (!rows.length) {
        await db.insert(gameSettings).values({ gameKey: "rollx", rtp: "96.00", minBet: "1.00", maxBet: "10000.00", minMultiplier: "1.10", maxMultiplier: "30000.00", enabled: 1 });
        return { rtp: 96, minBet: 1, maxBet: 10000, minMultiplier: 1.1, maxMultiplier: 30000, enabled: true };
      }
      const s = rows[0];
      return { rtp: parseFloat(s.rtp), minBet: parseFloat(s.minBet), maxBet: parseFloat(s.maxBet), minMultiplier: parseFloat(s.minMultiplier), maxMultiplier: parseFloat(s.maxMultiplier), enabled: s.enabled === 1 };
    }),

    /** 旋转 - 服务端决定结果，扣/加金币 */
    spin: protectedProcedure
      .input(z.object({ betAmount: z.number().positive(), multiplier: z.number().min(1.01) }))
      .mutation(async ({ ctx, input }) => {
        const playerToken = await getPlayerFromCookie(ctx.req);
        if (!playerToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // 获取游戏设置
        const settingsRows = await db.select().from(gameSettings).where(eq(gameSettings.gameKey, "rollx"));
        let rtp = 96, minBet = 1, maxBet = 10000;
        if (settingsRows.length) {
          rtp = parseFloat(settingsRows[0].rtp);
          minBet = parseFloat(settingsRows[0].minBet);
          maxBet = parseFloat(settingsRows[0].maxBet);
          if (!settingsRows[0].enabled) throw new TRPCError({ code: "FORBIDDEN", message: "游戏暂未开放" });
        }
        // 验证投注参数
        if (input.betAmount < minBet || input.betAmount > maxBet)
          throw new TRPCError({ code: "BAD_REQUEST", message: `投注金额需在 ${minBet}~${maxBet} 之间` });
        // 获取玩家余额
        const { players } = await import("../drizzle/schema");
        const playerRows = await db.select().from(players).where(eq(players.id, playerToken.playerId));
        if (!playerRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
        const player = playerRows[0];
        const currentGold = parseFloat(player.gold);
        if (currentGold < input.betAmount) throw new TRPCError({ code: "BAD_REQUEST", message: "金币不足" });
        // 服务端决定结果（基于RTP）
        const winProbability = (rtp / 100) / input.multiplier;
        const isWin = Math.random() < winProbability;
        // 计算转盘停止角度
        const greenAngle = 360 / input.multiplier;
        let stopAngle: number;
        if (isWin) {
          stopAngle = Math.random() * greenAngle * 0.85;
        } else {
          stopAngle = greenAngle + Math.random() * (360 - greenAngle) * 0.9;
        }
        // 计算金额变化
        const winAmount = isWin ? input.betAmount * input.multiplier : 0;
        const netAmount = isWin ? winAmount - input.betAmount : -input.betAmount;
        const newGold = currentGold + netAmount;
        // 更新玩家余额
        await db.update(players).set({ gold: newGold.toFixed(2) }).where(eq(players.id, playerToken.playerId));
        // 记录游戏日志
        await db.insert(rollxGames).values({
          playerId: playerToken.playerId,
          betAmount: input.betAmount.toFixed(2),
          multiplier: input.multiplier.toFixed(2),
          isWin: isWin ? 1 : 0,
          winAmount: winAmount.toFixed(2),
          netAmount: netAmount.toFixed(2),
          stopAngle: stopAngle.toFixed(4),
          balanceAfter: newGold.toFixed(2),
        });
        return { isWin, winAmount, netAmount, stopAngle, balanceAfter: newGold, multiplier: input.multiplier, betAmount: input.betAmount };
      }),

    /** 获取游戏历史记录 */
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const playerToken = await getPlayerFromCookie(ctx.req);
        if (!playerToken) return [];
        const db = await getDb();
        if (!db) return [];
        const rows = await db.select().from(rollxGames)
          .where(eq(rollxGames.playerId, playerToken.playerId))
          .orderBy(desc(rollxGames.createdAt)).limit(input.limit);
        return rows.map(r => ({ id: r.id, betAmount: parseFloat(r.betAmount), multiplier: parseFloat(r.multiplier), isWin: r.isWin === 1, winAmount: parseFloat(r.winAmount), netAmount: parseFloat(r.netAmount), balanceAfter: parseFloat(r.balanceAfter), createdAt: r.createdAt }));
      }),

    /** 管理后台：更新游戏设置 */
    updateSettings: protectedProcedure
      .input(z.object({ rtp: z.number().min(1).max(99).optional(), minBet: z.number().positive().optional(), maxBet: z.number().positive().optional(), minMultiplier: z.number().min(1.01).optional(), maxMultiplier: z.number().max(100000).optional(), enabled: z.boolean().optional(), remark: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const updateData: any = {};
        if (input.rtp !== undefined) updateData.rtp = input.rtp.toFixed(2);
        if (input.minBet !== undefined) updateData.minBet = input.minBet.toFixed(2);
        if (input.maxBet !== undefined) updateData.maxBet = input.maxBet.toFixed(2);
        if (input.minMultiplier !== undefined) updateData.minMultiplier = input.minMultiplier.toFixed(2);
        if (input.maxMultiplier !== undefined) updateData.maxMultiplier = input.maxMultiplier.toFixed(2);
        if (input.enabled !== undefined) updateData.enabled = input.enabled ? 1 : 0;
        if (input.remark !== undefined) updateData.remark = input.remark;
        const existing = await db.select().from(gameSettings).where(eq(gameSettings.gameKey, "rollx"));
        if (existing.length) {
          await db.update(gameSettings).set(updateData).where(eq(gameSettings.gameKey, "rollx"));
        } else {
          await db.insert(gameSettings).values({ gameKey: "rollx", ...updateData });
        }
        return { success: true };
      }),

    /** 管理后台：获取所有游戏设置 */
    adminGetAllSettings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(gameSettings);
    }),

    /** 管理后台：获取ROLL-X游戏记录 */
    adminGetGames: protectedProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) return { rows: [], total: 0 };
        const [rows, countRows] = await Promise.all([
          db.select().from(rollxGames).orderBy(desc(rollxGames.createdAt)).limit(input.limit).offset(input.offset),
          db.select({ count: sql<number>`count(*)` }).from(rollxGames),
        ]);
        return {
          rows: rows.map(r => ({ id: r.id, playerId: r.playerId, betAmount: parseFloat(r.betAmount), multiplier: parseFloat(r.multiplier), isWin: r.isWin === 1, winAmount: parseFloat(r.winAmount), netAmount: parseFloat(r.netAmount), balanceAfter: parseFloat(r.balanceAfter), createdAt: r.createdAt })),
          total: Number(countRows[0]?.count ?? 0),
        };
      }),
  }),

  // ── 客服系统 ──────────────────────────────────────────────────────
  cs: router({
    /** 玩家：获取或创建当前会话 */
    getOrCreateSession: publicProcedure
      .input(z.object({ title: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const player = await getPlayerFromCookie(ctx.req);
        if (!player) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const session = await createCsSession(player.playerId, input.title || "");
        if (!session) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // 发送系统消息
        const msgs = await getCsMessages(session.id);
        if (msgs.length === 0) {
          await sendCsMessage({
            sessionId: session.id,
            senderType: "system",
            senderId: 0,
            senderName: "系统",
            content: "您好！欢迎使用在线客服。请描述您的问题，我们将尽快为您服务。",
          });
        }
        return session;
      }),

    /** 玩家：获取当前活跃会话 */
    getActiveSession: publicProcedure.query(async ({ ctx }) => {
      const player = await getPlayerFromCookie(ctx.req);
      if (!player) return null;
      return getActiveSessionByPlayer(player.playerId);
    }),

    /** 玩家：获取消息列表（轮询） */
    getMessages: publicProcedure
      .input(z.object({ sessionId: z.number(), afterId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const player = await getPlayerFromCookie(ctx.req);
        if (!player) throw new TRPCError({ code: "UNAUTHORIZED" });
        const session = await getCsSessionById(input.sessionId);
        if (!session || session.playerId !== player.playerId) throw new TRPCError({ code: "FORBIDDEN" });
        await clearPlayerUnread(input.sessionId);
        return getCsMessages(input.sessionId, input.afterId);
      }),

    /** 玩家：发送消息 */
    sendMessage: publicProcedure
      .input(z.object({ sessionId: z.number(), content: z.string().min(1).max(2000), msgType: z.enum(["text", "image"]).default("text") }))
      .mutation(async ({ input, ctx }) => {
        const player = await getPlayerFromCookie(ctx.req);
        if (!player) throw new TRPCError({ code: "UNAUTHORIZED" });
        const session = await getCsSessionById(input.sessionId);
        if (!session || session.playerId !== player.playerId) throw new TRPCError({ code: "FORBIDDEN" });
        if (session.status === "closed") throw new TRPCError({ code: "BAD_REQUEST", message: "会话已关闭" });
        const playerInfo = await getPlayerById(player.playerId);
        const msg = await sendCsMessage({
          sessionId: input.sessionId,
          senderType: "player",
          senderId: player.playerId,
          senderName: playerInfo?.nickname || `用户${player.phone.slice(-4)}`,
          senderAvatar: playerInfo?.avatar || "001",
          content: input.content,
          msgType: input.msgType,
        });
        await updateSessionLastMessage(input.sessionId, input.content, 1, 0);
        return msg;
      }),

    /** 玩家：关闭会话 */
    closeSession: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const player = await getPlayerFromCookie(ctx.req);
        if (!player) throw new TRPCError({ code: "UNAUTHORIZED" });
        const session = await getCsSessionById(input.sessionId);
        if (!session || session.playerId !== player.playerId) throw new TRPCError({ code: "FORBIDDEN" });
        await closeCsSession(input.sessionId, "用户主动关闭");
        return { success: true };
      }),

    /** 玩家：获取会话状态（轮询用） */
    getSessionStatus: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input, ctx }) => {
        const player = await getPlayerFromCookie(ctx.req);
        if (!player) return null;
        const session = await getCsSessionById(input.sessionId);
        if (!session || session.playerId !== player.playerId) return null;
        return { status: session.status, agentId: session.agentId, playerUnread: session.playerUnread };
      }),

    // ── 坐席端接口 ──────────────────────────────────────────────────
    /** 坐席登录 */
    agentLogin: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const agent = await getCsAgentByUsername(input.username);
        if (!agent || agent.password !== input.password || !agent.enabled) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "账号或密码错误" });
        }
        const token = await new SignJWT({ agentId: agent.id, username: agent.username, type: "csagent" })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("8h")
          .sign(JWT_SECRET);
        const isSecure = (ctx.req as any).protocol === 'https' || ((ctx.req as any).headers?.['x-forwarded-proto'] || '').includes('https');
        ctx.res.cookie("bdcs2_agent_token", token, { httpOnly: true, secure: isSecure, sameSite: isSecure ? 'none' : 'lax', maxAge: 8 * 60 * 60 * 1000, path: '/' });
        await updateCsAgentStatus(agent.id, "online");
        return { success: true, agent: { id: agent.id, name: agent.name, username: agent.username, avatarUrl: agent.avatarUrl, status: "online" } };
      }),

    /** 坐席登出 */
    agentLogout: publicProcedure.mutation(async ({ ctx }) => {
      const agent = await getAgentFromCookie(ctx.req);
      if (agent) await updateCsAgentStatus(agent.agentId, "offline");
      ctx.res.clearCookie("bdcs2_agent_token", { path: '/' });
      return { success: true };
    }),

    /** 坐席：获取自己信息 */
    agentMe: publicProcedure.query(async ({ ctx }) => {
      const agentAuth = await getAgentFromCookie(ctx.req);
      if (!agentAuth) return null;
      return getCsAgentById(agentAuth.agentId);
    }),

    /** 坐席：获取所有待处理/进行中会话 */
    agentGetSessions: publicProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const agentAuth = await getAgentFromCookie(ctx.req);
        if (!agentAuth) throw new TRPCError({ code: "UNAUTHORIZED" });
        if (input.status) {
          return getAllCsSessions(input.status);
        }
        // 返回等待中和进行中的会话
        const [waiting, active] = await Promise.all([
          getAllCsSessions("waiting"),
          getAgentSessions(agentAuth.agentId),
        ]);
        return [...waiting, ...active];
      }),

    /** 坐席：接入会话 */
    agentAcceptSession: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const agentAuth = await getAgentFromCookie(ctx.req);
        if (!agentAuth) throw new TRPCError({ code: "UNAUTHORIZED" });
        const agent = await getCsAgentById(agentAuth.agentId);
        if (!agent) throw new TRPCError({ code: "UNAUTHORIZED" });
        const session = await getCsSessionById(input.sessionId);
        if (!session) throw new TRPCError({ code: "NOT_FOUND" });
        if (session.status !== "waiting") throw new TRPCError({ code: "BAD_REQUEST", message: "会话已被接入" });
        await assignSessionToAgent(input.sessionId, agentAuth.agentId);
        // 发送系统消息
        await sendCsMessage({
          sessionId: input.sessionId,
          senderType: "system",
          senderId: 0,
          senderName: "系统",
          content: `客服 ${agent.name} 已接入，请问有什么可以帮您？`,
        });
        await updateSessionLastMessage(input.sessionId, `客服 ${agent.name} 已接入`, 0, 1);
        return { success: true };
      }),

    /** 坐席：获取消息（轮询） */
    agentGetMessages: publicProcedure
      .input(z.object({ sessionId: z.number(), afterId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const agentAuth = await getAgentFromCookie(ctx.req);
        if (!agentAuth) throw new TRPCError({ code: "UNAUTHORIZED" });
        await clearAgentUnread(input.sessionId);
        return getCsMessages(input.sessionId, input.afterId);
      }),

    /** 坐席：发送消息 */
    agentSendMessage: publicProcedure
      .input(z.object({ sessionId: z.number(), content: z.string().min(1).max(2000), msgType: z.enum(["text", "image"]).default("text") }))
      .mutation(async ({ input, ctx }) => {
        const agentAuth = await getAgentFromCookie(ctx.req);
        if (!agentAuth) throw new TRPCError({ code: "UNAUTHORIZED" });
        const agent = await getCsAgentById(agentAuth.agentId);
        if (!agent) throw new TRPCError({ code: "UNAUTHORIZED" });
        const session = await getCsSessionById(input.sessionId);
        if (!session) throw new TRPCError({ code: "NOT_FOUND" });
        if (session.status === "closed") throw new TRPCError({ code: "BAD_REQUEST", message: "会话已关闭" });
        const msg = await sendCsMessage({
          sessionId: input.sessionId,
          senderType: "agent",
          senderId: agentAuth.agentId,
          senderName: agent.name,
          senderAvatar: agent.avatarUrl,
          content: input.content,
          msgType: input.msgType,
        });
        await updateSessionLastMessage(input.sessionId, input.content, 0, 1);
        return msg;
      }),

    /** 坐席：关闭会话 */
    agentCloseSession: publicProcedure
      .input(z.object({ sessionId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const agentAuth = await getAgentFromCookie(ctx.req);
        if (!agentAuth) throw new TRPCError({ code: "UNAUTHORIZED" });
        await closeCsSession(input.sessionId, input.reason || "坐席关闭");
        await sendCsMessage({
          sessionId: input.sessionId,
          senderType: "system",
          senderId: 0,
          senderName: "系统",
          content: "会话已结束，感谢您的使用。",
        });
        return { success: true };
      }),

    /** 坐席：更新状态 */
    agentUpdateStatus: publicProcedure
      .input(z.object({ status: z.enum(["online", "busy", "offline"]) }))
      .mutation(async ({ input, ctx }) => {
        const agentAuth = await getAgentFromCookie(ctx.req);
        if (!agentAuth) throw new TRPCError({ code: "UNAUTHORIZED" });
        await updateCsAgentStatus(agentAuth.agentId, input.status);
        return { success: true };
      }),

    /** 获取快捷回复 */
    getQuickReplies: publicProcedure.query(async ({ ctx }) => {
      const agentAuth = await getAgentFromCookie(ctx.req);
      if (!agentAuth) throw new TRPCError({ code: "UNAUTHORIZED" });
      return getCsQuickReplies();
    }),

    // ── 管理员接口 ──────────────────────────────────────────────────
    /** 管理员：获取坐席列表 */
    adminGetAgents: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getCsAgentList();
    }),

    /** 管理员：创建坐席 */
    adminCreateAgent: protectedProcedure
      .input(z.object({ name: z.string().min(1), username: z.string().min(3), password: z.string().min(6), maxSessions: z.number().default(5) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const existing = await getCsAgentByUsername(input.username);
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "账号已存在" });
        return createCsAgent({ name: input.name, username: input.username, password: input.password, maxSessions: input.maxSessions });
      }),

    /** 管理员：更新坐席 */
    adminUpdateAgent: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), password: z.string().optional(), maxSessions: z.number().optional(), enabled: z.boolean().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.password) updateData.password = data.password;
        if (data.maxSessions !== undefined) updateData.maxSessions = data.maxSessions;
        if (data.enabled !== undefined) updateData.enabled = data.enabled ? 1 : 0;
        await updateCsAgent(id, updateData);
        return { success: true };
      }),

    /** 管理员：获取所有会话 */
    adminGetAllSessions: protectedProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAllCsSessions(input.status);
      }),

    /** 管理员：添加快捷回复 */
    adminAddQuickReply: protectedProcedure
      .input(z.object({ category: z.string().default("通用"), title: z.string().min(1), content: z.string().min(1), sort: z.number().default(0) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createCsQuickReply(input);
      }),

    /** 管理员：删除快捷回复 */
    adminDeleteQuickReply: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteCsQuickReply(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
