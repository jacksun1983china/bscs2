import { TRPCError } from "@trpc/server";
import { arenaRouter } from "./arenaRouter";
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
  boxGoods,
  boxes,
  broadcasts,
  csAgents,
  gameSettings,
  rechargeConfigs,
  rollRoomPrizes,
  rollRooms,
  rollxGames,
  rushGames,
  dingdongGames,
  fruitBombRounds,
  fruitBombBets,
  skuCategories,
  shopItems,
  shopOrders,
  players,
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
  arena: arenaRouter,

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
      // 如果有推荐人，查询推荐人昵称
      let invitedByNickname: string | null = null;
      if (player.invitedBy) {
        const inviter = await getPlayerById(player.invitedBy);
        invitedByNickname = inviter?.nickname ?? null;
      }
      return {
        id: player.id, phone: player.phone, nickname: player.nickname, avatar: player.avatar,
        vipLevel: player.vipLevel, gold: player.gold, diamond: player.diamond, shopCoin: player.shopCoin,
        totalRecharge: player.totalRecharge, inviteCode: player.inviteCode,
        invitedBy: player.invitedBy, invitedByNickname, identity: player.identity,
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
    // 管理员登录（独立账号密码，不依赖Manus OAuth）
    login: publicProcedure
      .input(z.object({ account: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // 从环境变量读取管理员账号密码（默认 admin/admin123）
        const adminAccount = process.env.ADMIN_ACCOUNT || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const found = input.account === adminAccount && input.password === adminPassword;
        if (!found) throw new TRPCError({ code: 'UNAUTHORIZED', message: '账号或密码错误' });
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
        return { success: true, account: input.account };
      }),

    // 管理员退出
    logout: publicProcedure
      .mutation(async ({ ctx }) => {
        ctx.res.clearCookie('bdcs2_admin_token', { path: '/' });
        return { success: true };
      }),

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

    // ── 游戏配置管理 ──
    gameList: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      const { gameConfigs } = await import("../drizzle/schema");
      const list = await db.select().from(gameConfigs).orderBy(gameConfigs.sort);
      return list;
    }),

    updateGame: protectedProcedure
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
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { gameConfigs } = await import("../drizzle/schema");
        const { id, ...updates } = input;
        await db.update(gameConfigs).set(updates).where(eq(gameConfigs.id, id));
        return { success: true };
      }),

    updateAllRtp: protectedProcedure
      .input(z.object({ rtp: z.number().min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { gameConfigs } = await import("../drizzle/schema");
        await db.update(gameConfigs).set({ rtp: input.rtp });
        // 同步更新 gameSettings 表中的 rollx RTP
        await db.update(gameSettings).set({ rtp: String(input.rtp) }).where(eq(gameSettings.gameKey, "rollx"));
        return { success: true };
      }),

    deleteGame: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { gameConfigs } = await import("../drizzle/schema");
        await db.delete(gameConfigs).where(eq(gameConfigs.id, input.id));
        return { success: true };
      }),

    reorderGame: protectedProcedure
      .input(z.object({ id: z.number(), direction: z.enum(["up", "down"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { gameConfigs } = await import("../drizzle/schema");
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
    // ── 财务统计 ──
    financeStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return { totalRecharge: 0, todayRecharge: 0, totalOrders: 0, todayOrders: 0, topPlayers: [] };
      const { rechargeOrders, players } = await import("../drizzle/schema");
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
    financeOrders: protectedProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().default(15),
        status: z.number().optional(),
        keyword: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) return { list: [], total: 0 };
        const { rechargeOrders, players } = await import("../drizzle/schema");
        const { and, like, or } = await import("drizzle-orm");
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
    // ── 系统设置 ──
    getSiteSettings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      const { siteSettings } = await import("../drizzle/schema");
      return db.select().from(siteSettings).orderBy(siteSettings.settingKey);
    }),
    updateSiteSetting: protectedProcedure
      .input(z.object({ key: z.string(), value: z.string(), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { siteSettings } = await import("../drizzle/schema");
        const existing = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, input.key));
        if (existing.length > 0) {
          await db.update(siteSettings).set({ value: input.value, description: input.description ?? existing[0].description }).where(eq(siteSettings.settingKey, input.key));
        } else {
          await db.insert(siteSettings).values({ settingKey: input.key, value: input.value, description: input.description ?? "" });
        }
        return { success: true };
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
    spin: publicProcedure
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
    getHistory: publicProcedure
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

  // ── SKU管理（分类 + 宝笱） ──────────────────────────────────────────────────────
  sku: router({
    // ── 分类管理 ──
    /** 获取分类列表 */
    categoryList: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(skuCategories).orderBy(skuCategories.sort);
    }),

    /** 管理员：创建分类 */
    createCategory: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        iconUrl: z.string().default(""),
        sort: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [result] = await db.insert(skuCategories).values({
          name: input.name,
          iconUrl: input.iconUrl,
          sort: input.sort,
          status: 1,
        });
        return { success: true, id: (result as any).insertId };
      }),

    /** 管理员：更新分类 */
    updateCategory: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        iconUrl: z.string().optional(),
        sort: z.number().optional(),
        status: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...updates } = input;
        const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await db.update(skuCategories).set(filtered).where(eq(skuCategories.id, id));
        return { success: true };
      }),

    /** 管理员：删除分类 */
    deleteCategory: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(skuCategories).where(eq(skuCategories.id, input.id));
        return { success: true };
      }),

    // ── 宝笱管理 ──
    /** 获取宝笱列表（支持分页和分类筛选） */
    boxList: publicProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        categoryId: z.number().optional(),
        keyword: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { data: [], total: 0 };
        const { and, like, count } = await import("drizzle-orm");
        const conditions = [];
        if (input.categoryId) conditions.push(eq(boxes.categoryId, input.categoryId));
        if (input.keyword) conditions.push(like(boxes.name, `%${input.keyword}%`));
        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const offset = (input.page - 1) * input.limit;
        const [data, totalRows] = await Promise.all([
          db.select().from(boxes).where(where).orderBy(boxes.sort, boxes.id).limit(input.limit).offset(offset),
          db.select({ cnt: count() }).from(boxes).where(where),
        ]);
        return { data, total: Number(totalRows[0]?.cnt || 0) };
      }),

    /** 获取宝笱详情（含商品列表） */
    boxDetail: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [box] = await db.select().from(boxes).where(eq(boxes.id, input.id));
        if (!box) throw new TRPCError({ code: "NOT_FOUND", message: "宝笱不存在" });
        const goods = await db.select().from(boxGoods).where(eq(boxGoods.boxId, input.id)).orderBy(boxGoods.sort);
        return { ...box, goods };
      }),

    /** 管理员：创建宝笱 */
    createBox: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        imageUrl: z.string().default(""),
        goodsBgUrl: z.string().default(""),
        price: z.number().min(0),
        categoryId: z.number(),
        category: z.string().default(""),
        description: z.string().default(""),
        sort: z.number().default(0),
        goods: z.array(z.object({
          name: z.string().min(1),
          imageUrl: z.string().default(""),
          level: z.number().min(1).max(4).default(3),
          price: z.number().min(0).default(0),
          probability: z.number().min(0).default(1),
        })).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [result] = await db.insert(boxes).values({
          name: input.name,
          imageUrl: input.imageUrl,
          goodsBgUrl: input.goodsBgUrl,
          price: String(input.price),
          categoryId: input.categoryId,
          category: input.category,
          description: input.description,
          sort: input.sort,
          status: 1,
        });
        const boxId = (result as any).insertId;
        if (input.goods.length > 0) {
          await db.insert(boxGoods).values(input.goods.map((g, i) => ({
            boxId,
            name: g.name,
            imageUrl: g.imageUrl,
            level: g.level,
            price: String(g.price),
            probability: String(g.probability),
            sort: i,
          })));
        }
        return { success: true, id: boxId };
      }),

    /** 管理员：更新宝笱 */
    updateBox: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        imageUrl: z.string().optional(),
        goodsBgUrl: z.string().optional(),
        price: z.number().min(0).optional(),
        categoryId: z.number().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        sort: z.number().optional(),
        status: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, price, ...rest } = input;
        const updates: Record<string, any> = { ...rest };
        if (price !== undefined) updates.price = String(price);
        const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await db.update(boxes).set(filtered).where(eq(boxes.id, id));
        return { success: true };
      }),

    /** 管理员：删除宝笱 */
    deleteBox: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(boxGoods).where(eq(boxGoods.boxId, input.id));
        await db.delete(boxes).where(eq(boxes.id, input.id));
        return { success: true };
      }),

    /** 管理员：更新宝笱内商品列表（全量替换） */
    updateBoxGoods: protectedProcedure
      .input(z.object({
        boxId: z.number(),
        goods: z.array(z.object({
          name: z.string().min(1),
          imageUrl: z.string().default(""),
          level: z.number().min(1).max(4).default(3),
          price: z.number().min(0).default(0),
          probability: z.number().min(0).default(1),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(boxGoods).where(eq(boxGoods.boxId, input.boxId));
        if (input.goods.length > 0) {
          await db.insert(boxGoods).values(input.goods.map((g, i) => ({
            boxId: input.boxId,
            name: g.name,
            imageUrl: g.imageUrl,
            level: g.level,
            price: String(g.price),
            probability: String(g.probability),
            sort: i,
          })));
        }
        return { success: true };
      }),
  }),

  // ── 商城（cs2pifa商品，实时从API读取，不存数据库） ──────────────────────────────
  shop: router({
    /** 获取商品分类列表（实时从cs2pifa API读取） */
    getCategories: publicProcedure
      .query(async () => {
        const { getCategories } = await import("./cs2pifaApi");
        const categories = await getCategories();
        return categories;
      }),

    /** 获取商品列表（实时从cs2pifa API读取，支持分类/关键词/价格/排序/分页） */
    getProducts: publicProcedure
      .input(z.object({
        typeId: z.number().optional(),
        keyword: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        sortDesc: z.boolean().optional().default(false),
        pageNum: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ input }) => {
        const { getProductsByCategory } = await import("./cs2pifaApi");
        const result = await getProductsByCategory({
          typeId: input.typeId,
          keyword: input.keyword,
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          pageNum: input.pageNum,
          pageSize: input.pageSize,
          sortDesc: input.sortDesc,
        });
        return {
          items: result.saleTemplateByCategoryResponseList,
          total: result.total ?? result.saleTemplateByCategoryResponseList.length,
          pageNum: input.pageNum,
          pageSize: input.pageSize,
        };
      }),

    /** 购买商品（扣除shopCoin，写入shopOrders，调用cs2pifa下单） */
    buyProduct: publicProcedure
      .input(z.object({
        templateId: z.number(),
        templateName: z.string(),
        iconUrl: z.string(),
        referencePrice: z.number(),
        tradeLink: z.string().optional().default(''),
      }))
      .mutation(async ({ input, ctx }) => {
        const player = await getPlayerFromCookie(ctx.req);
        if (!player) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq: eqOp } = await import("drizzle-orm");
        const [playerData] = await db.select().from(players).where(eqOp(players.id, player.playerId));
        if (!playerData) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        const price = input.referencePrice;
        const balance = parseFloat(playerData.shopCoin ?? '0');
        if (balance < price) throw new TRPCError({ code: "BAD_REQUEST", message: "商城币余额不足" });
        const newBalance = (balance - price).toFixed(2);
        await db.update(players).set({ shopCoin: newBalance }).where(eqOp(players.id, player.playerId));
        const outOrderNo = `shop_${player.playerId}_${Date.now()}`;
        await db.insert(shopOrders).values({
          playerId: player.playerId,
          shopItemId: 0,
          itemName: input.templateName,
          itemIcon: input.iconUrl,
          payAmount: String(price),
          status: 'processing',
          csOrderNo: outOrderNo,
        });
        return { success: true, orderNo: outOrderNo, message: "购买成功，正在处理中" };
      }),

    /** 获取我的商城订单 */
    getMyOrders: publicProcedure
      .input(z.object({ page: z.number().min(1).default(1), pageSize: z.number().min(1).max(50).default(20) }))
      .query(async ({ input, ctx }) => {
        const player = await getPlayerFromCookie(ctx.req);
        if (!player) throw new TRPCError({ code: "UNAUTHORIZED" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq: eqOp, desc: descFn } = await import("drizzle-orm");
        const offset = (input.page - 1) * input.pageSize;
        const orders = await db.select().from(shopOrders)
          .where(eqOp(shopOrders.playerId, player.playerId))
          .orderBy(descFn(shopOrders.createdAt))
          .limit(input.pageSize)
          .offset(offset);
         return orders;
      }),
  }),

  // ── 过马路游戏（Uncrossable Rush）──────────────────────────────────────────────
  rush: router({
    /** 获取游戏设置 */
    getSettings: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { rtp: 96, minBet: 1, maxBet: 10000, enabled: true };
      const rows = await db.select().from(gameSettings).where(eq(gameSettings.gameKey, "rush"));
      if (!rows.length) {
        await db.insert(gameSettings).values({ gameKey: "rush", rtp: "96.00", minBet: "1.00", maxBet: "10000.00", enabled: 1 });
        return { rtp: 96, minBet: 1, maxBet: 10000, enabled: true };
      }
      const s = rows[0];
      return { rtp: parseFloat(s.rtp), minBet: parseFloat(s.minBet), maxBet: parseFloat(s.maxBet), enabled: s.enabled === 1 };
    }),
    /** 开始游戏（扣除投注金额） */
    startGame: publicProcedure
      .input(z.object({ betAmount: z.number().positive() }))
      .mutation(async ({ ctx, input }) => {
        const playerToken = await getPlayerFromCookie(ctx.req);
        if (!playerToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const settingsRows = await db.select().from(gameSettings).where(eq(gameSettings.gameKey, "rush"));
        let rtp = 96, minBet = 1, maxBet = 10000;
        if (settingsRows.length) {
          rtp = parseFloat(settingsRows[0].rtp);
          minBet = parseFloat(settingsRows[0].minBet);
          maxBet = parseFloat(settingsRows[0].maxBet);
          if (!settingsRows[0].enabled) throw new TRPCError({ code: "FORBIDDEN", message: "游戏暂未开放" });
        }
        if (input.betAmount < minBet || input.betAmount > maxBet)
          throw new TRPCError({ code: "BAD_REQUEST", message: `投注金额需在 ${minBet}~${maxBet} 之间` });
        const playerRows = await db.select().from(players).where(eq(players.id, playerToken.playerId));
        if (!playerRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
        const player = playerRows[0];
        const currentGold = parseFloat(player.gold);
        if (currentGold < input.betAmount) throw new TRPCError({ code: "BAD_REQUEST", message: "金币不足" });
        // 扣除投注金额
        const newGold = currentGold - input.betAmount;
        await db.update(players).set({ gold: newGold.toFixed(2) }).where(eq(players.id, playerToken.playerId));
        // 预生成每条车道的存活结果（true=安全, false=死亡）
        // 每条车道死亡概率随深度递增，确保游戏有真实风险
        // 基础死亡率由RTP控制：rtp越高存活概率越高
        // 公式：第 i 条车道死亡率 = baseDeath * (1 + i * 0.15)
        // baseDeath 由 RTP 决定：rtp=96 -> baseDeath≈0.22, rtp=90 -> baseDeath≈0.28, rtp=80 -> baseDeath≈0.35
        const maxLanes = 8;
        // baseDeath: RTP越高，基础死亡率越低（玩家赢面越大）
        const baseDeath = 0.5 - (rtp / 100) * 0.28; // rtp=96 -> 0.5-0.2688=0.231; rtp=80 -> 0.5-0.224=0.276
        const laneResults: boolean[] = [];
        for (let i = 0; i < maxLanes; i++) {
          // 每条车道死亡率随深度递增
          const deathRate = Math.min(0.65, baseDeath * (1 + i * 0.18));
          laneResults.push(Math.random() >= deathRate); // true=安全, false=死亡
        }
        return { success: true, laneResults, balanceAfter: newGold, betAmount: input.betAmount };
      }),
    /** 结束游戏（收手或死亡，结算金额） */
    endGame: publicProcedure
      .input(z.object({
        betAmount: z.number().positive(),
        lanesReached: z.number().min(0),
        isDead: z.boolean(),
        finalMultiplier: z.number().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const playerToken = await getPlayerFromCookie(ctx.req);
        if (!playerToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const playerRows = await db.select().from(players).where(eq(players.id, playerToken.playerId));
        if (!playerRows.length) throw new TRPCError({ code: "NOT_FOUND" });
        const player = playerRows[0];
        const currentGold = parseFloat(player.gold);
        let winAmount = 0;
        let netAmount = -input.betAmount;
        if (!input.isDead && input.lanesReached > 0) {
          winAmount = input.betAmount * input.finalMultiplier;
          netAmount = winAmount - input.betAmount;
        }
        const newGold = currentGold + winAmount;
        await db.update(players).set({ gold: newGold.toFixed(2) }).where(eq(players.id, playerToken.playerId));
        await db.insert(rushGames).values({
          playerId: playerToken.playerId,
          betAmount: input.betAmount.toFixed(2),
          lanesReached: input.lanesReached,
          isDead: input.isDead ? 1 : 0,
          finalMultiplier: input.finalMultiplier.toFixed(2),
          winAmount: winAmount.toFixed(2),
          netAmount: netAmount.toFixed(2),
          balanceAfter: newGold.toFixed(2),
        });
        return { winAmount, netAmount, balanceAfter: newGold };
      }),
    /** 获取历史记录 */
    getHistory: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const playerToken = await getPlayerFromCookie(ctx.req);
        if (!playerToken) return [];
        const db = await getDb();
        if (!db) return [];
        const rows = await db.select().from(rushGames)
          .where(eq(rushGames.playerId, playerToken.playerId))
          .orderBy(desc(rushGames.createdAt)).limit(input.limit);
        return rows.map(r => ({ id: r.id, betAmount: parseFloat(r.betAmount), lanesReached: r.lanesReached, isDead: r.isDead === 1, finalMultiplier: parseFloat(r.finalMultiplier), winAmount: parseFloat(r.winAmount), netAmount: parseFloat(r.netAmount), balanceAfter: parseFloat(r.balanceAfter), createdAt: r.createdAt }));
      }),
  }),

  // ── 丁咚游戏（Fruit Bomb）──────────────────────────────────────────────────────
  dingdong: router({
    /** 获取游戏设置 */
    getSettings: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { rtp: 96, minBet: 1, maxBet: 10000, enabled: true, gridSize: 16 };
      const rows = await db.select().from(gameSettings).where(eq(gameSettings.gameKey, "dingdong"));
      if (!rows.length) {
        await db.insert(gameSettings).values({ gameKey: "dingdong", rtp: "96.00", minBet: "1.00", maxBet: "10000.00", enabled: 1 });
        return { rtp: 96, minBet: 1, maxBet: 10000, enabled: true, gridSize: 16 };
      }
      const s = rows[0];
      return { rtp: parseFloat(s.rtp), minBet: parseFloat(s.minBet), maxBet: parseFloat(s.maxBet), enabled: s.enabled === 1, gridSize: 16 };
    }),
    /** 投注并开奖 */
    play: publicProcedure
      .input(z.object({ betAmount: z.number().positive(), selectedCell: z.number().min(0).max(15) }))
      .mutation(async ({ ctx, input }) => {
        const playerToken = await getPlayerFromCookie(ctx.req);
        if (!playerToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const settingsRows = await db.select().from(gameSettings).where(eq(gameSettings.gameKey, "dingdong"));
        let rtp = 96, minBet = 1, maxBet = 10000;
        if (settingsRows.length) {
          rtp = parseFloat(settingsRows[0].rtp);
          minBet = parseFloat(settingsRows[0].minBet);
          maxBet = parseFloat(settingsRows[0].maxBet);
          if (!settingsRows[0].enabled) throw new TRPCError({ code: "FORBIDDEN", message: "游戏暂未开放" });
        }
        if (input.betAmount < minBet || input.betAmount > maxBet)
          throw new TRPCError({ code: "BAD_REQUEST", message: `投注金额需在 ${minBet}~${maxBet} 之间` });
        const playerRows = await db.select().from(players).where(eq(players.id, playerToken.playerId));
        if (!playerRows.length) throw new TRPCError({ code: "NOT_FOUND" });
        const player = playerRows[0];
        const currentGold = parseFloat(player.gold);
        if (currentGold < input.betAmount) throw new TRPCError({ code: "BAD_REQUEST", message: "金币不足" });
        // 16格，中奖倍率：1格=16x，4格=4x，8格=2x（按RTP调整）
        // 简化：随机选1个中奖格，中奖倍率=16*rtp/100
        const gridSize = 16;
        const winCell = Math.floor(Math.random() * gridSize);
        const isWin = winCell === input.selectedCell;
        const multiplier = isWin ? (gridSize * rtp / 100) : 0;
        const winAmount = isWin ? input.betAmount * multiplier : 0;
        const netAmount = isWin ? winAmount - input.betAmount : -input.betAmount;
        const newGold = currentGold + netAmount;
        await db.update(players).set({ gold: newGold.toFixed(2) }).where(eq(players.id, playerToken.playerId));
        await db.insert(dingdongGames).values({
          playerId: playerToken.playerId,
          betAmount: input.betAmount.toFixed(2),
          selectedCell: input.selectedCell,
          winCell,
          isWin: isWin ? 1 : 0,
          multiplier: multiplier.toFixed(2),
          winAmount: winAmount.toFixed(2),
          netAmount: netAmount.toFixed(2),
          balanceAfter: newGold.toFixed(2),
        });
        return { isWin, winCell, multiplier, winAmount, netAmount, balanceAfter: newGold, selectedCell: input.selectedCell };
      }),
    /** 获取历史记录 */
    getHistory: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const playerToken = await getPlayerFromCookie(ctx.req);
        if (!playerToken) return [];
        const db = await getDb();
        if (!db) return [];
        const rows = await db.select().from(dingdongGames)
          .where(eq(dingdongGames.playerId, playerToken.playerId))
          .orderBy(desc(dingdongGames.createdAt)).limit(input.limit);
        return rows.map(r => ({ id: r.id, betAmount: parseFloat(r.betAmount), selectedCell: r.selectedCell, winCell: r.winCell, isWin: r.isWin === 1, multiplier: parseFloat(r.multiplier), winAmount: parseFloat(r.winAmount), netAmount: parseFloat(r.netAmount), balanceAfter: parseFloat(r.balanceAfter), createdAt: r.createdAt }));
      }),
  }),
});
export type AppRouter = typeof appRouter;

// 竞技场路由已在 appRouter 中注册
// 通过 arenaRouter 导出以便类型推断
export { arenaRouter };
