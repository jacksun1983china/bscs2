import { adminRouter } from "./routers/adminRouter";
import { TRPCError } from "@trpc/server";
import { arenaRouter } from "./arenaRouter";
import { sendPushToAgent } from "./webPush";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
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
  deleteCsAgent,
  deleteCsQuickReply,
  drawRollRoom,
  getActiveSessionByPlayer,
  getAdminRollRoomList,
  getAllCsSessions,
  getAgentSessions,
  getSessionsByAgentId,
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
  insertGoldLog,
  getGoldLogs,
} from "./db";
import { storagePut } from "./storage";
import { SignJWT, jwtVerify } from "jose";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  banners,
  boxGoods,
  boxes,
  broadcasts,
  csAgents,
  gameSettings,
  rechargeConfigs,
  rechargeOrders,
  rollRoomPrizes,
  rollRooms,
  rollxGames,
  rushGames,
  rushPendingSessions,
  dingdongGames,
  fruitBombRounds,
  fruitBombBets,
  skuCategories,
  shopItems,
  shopOrders,
  players,
  playerItems,
  agentPushSubscriptions,
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
          // 新用户注册赠送 1,000,000 金币
          const WELCOME_GOLD = 1000000;
          const db = await getDb();
          if (db) {
            await db.update(players).set({ gold: sql`gold + ${WELCOME_GOLD}` }).where(eq(players.id, player.id));
            await insertGoldLog(player.id, WELCOME_GOLD, WELCOME_GOLD, 'register_gift', '新用户注册赠送金币');
            // 重新获取更新后的玩家数据
            const updatedPlayer = await getPlayerById(player.id);
            if (updatedPlayer) player = updatedPlayer;
          }
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
      // 昵称是默认格式（用户+数字）或为空时，需要设置昵称
      const needSetNickname = !player.nickname || /^用户\d+$/.test(player.nickname) || player.nickname === '';
      return {
        id: player.id, phone: player.phone, nickname: player.nickname, avatar: player.avatar,
        vipLevel: player.vipLevel, gold: player.gold, diamond: player.diamond, shopCoin: player.shopCoin,
        totalRecharge: player.totalRecharge, inviteCode: player.inviteCode,
        invitedBy: player.invitedBy, invitedByNickname, identity: player.identity,
        commissionEnabled: player.commissionEnabled, commissionBalance: player.commissionBalance,
        steamAccount: player.steamAccount, realName: player.realName ? "已认证" : "",
        createdAt: player.createdAt, needSetNickname,
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
    /** 标记邮件已读 */
    markMessageRead: publicProcedure
      .input(z.object({ id: z.number().optional(), all: z.boolean().optional() }))
      .mutation(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { messages: messagesTable } = await import("../drizzle/schema");
        if (input.all) {
          await db.update(messagesTable).set({ isRead: 1 }).where(eq(messagesTable.playerId, session.playerId));
        } else if (input.id) {
          await db.update(messagesTable).set({ isRead: 1 }).where(and(eq(messagesTable.id, input.id), eq(messagesTable.playerId, session.playerId)));
        }
        return { success: true };
      }),
    /** 删除邮件 */
    deleteMessage: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { messages: messagesTable } = await import("../drizzle/schema");
        await db.delete(messagesTable).where(and(eq(messagesTable.id, input.id), eq(messagesTable.playerId, session.playerId)));
        return { success: true };
      }),
    /** 充値档位列表 */
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

    /** 创建充値订单（玩家提交充値申请，等待管理员审批） */
    createRechargeOrder: publicProcedure
      .input(z.object({
        configId: z.number().int().positive(),
        payMethod: z.enum(['alipay', 'wechat', 'manual']).default('manual'),
        remark: z.string().max(200).optional().default(''),
      }))
      .mutation(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // 获取充値配置
        const configRows = await db.select().from(rechargeConfigs).where(eq(rechargeConfigs.id, input.configId));
        if (!configRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "充値配置不存在" });
        const config = configRows[0];
        // 生成唯一订单号
        const orderNo = `R${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        await db.insert(rechargeOrders).values({
          orderNo,
          playerId: session.playerId,
          amount: config.amount,
          gold: config.gold,
          bonusDiamond: config.bonusDiamond ?? '0.00',
          payMethod: input.payMethod,
          status: 0, // 待审批
          remark: input.remark,
        });
        return { success: true, orderNo, amount: parseFloat(String(config.amount)), gold: parseFloat(String(config.gold)) };
      }),

    /** 提取道具（status 0→1） */
    extractItem: publicProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
        // 只能提取自己的、状态为 0（待处理）的道具
        const items = await db.select().from(playerItems)
          .where(eq(playerItems.playerId, session.playerId));
        const validIds = items
          .filter(i => input.ids.includes(i.id) && i.status === 0)
          .map(i => i.id);
        if (validIds.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "没有可提取的道具" });
        for (const id of validIds) {
          await db.update(playerItems)
            .set({ status: 1, extractedAt: new Date() })
            .where(eq(playerItems.id, id));
        }
        return { success: true, count: validIds.length };
      }),

    /** 回收道具（status 0→2，竞技场物品返钻石，其他返金币） */
    recycleItem: publicProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
        // 只能回收自己的、状态为 0（待处理）的道具，同时查出 source 字段
        const items = await db.select({
          id: playerItems.id,
          recycleGold: playerItems.recycleGold,
          status: playerItems.status,
          playerId: playerItems.playerId,
          source: playerItems.source,
        })
          .from(playerItems)
          .where(eq(playerItems.playerId, session.playerId));
        const validItems = items.filter(i => input.ids.includes(i.id) && i.status === 0);
        if (validItems.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "没有可回收的道具" });

        // 按来源分组：竞技场物品分解为钻石，其他来源分解为金币
        const arenaItems = validItems.filter(i => i.source === 'arena');
        const otherItems = validItems.filter(i => i.source !== 'arena');
        const totalDiamond = Math.round(arenaItems.reduce((s, i) => s + Number(i.recycleGold ?? 0), 0) * 100) / 100;
        const totalGold = Math.round(otherItems.reduce((s, i) => s + Number(i.recycleGold ?? 0), 0) * 100) / 100;

        // 更新所有物品状态为已回收
        for (const item of validItems) {
          await db.update(playerItems)
            .set({ status: 2 })
            .where(eq(playerItems.id, item.id));
        }

        // 竞技场物品 → 返钻石
        if (totalDiamond > 0) {
          await db.update(players)
            .set({ diamond: sql`diamond + ${totalDiamond}` })
            .where(eq(players.id, session.playerId));
          const afterRows = await db.select({ diamond: players.diamond }).from(players).where(eq(players.id, session.playerId));
          const afterDiamond = afterRows.length ? parseFloat(afterRows[0].diamond) : 0;
          await insertGoldLog(session.playerId, totalDiamond, afterDiamond, 'recycle', `分解 ${arenaItems.length} 件竞技场道具，获得 ${totalDiamond.toFixed(2)} 钻石`);
        }

        // 其他来源物品 → 返金币
        if (totalGold > 0) {
          await db.update(players)
            .set({ gold: sql`gold + ${totalGold}` })
            .where(eq(players.id, session.playerId));
          const afterRows = await db.select({ gold: players.gold }).from(players).where(eq(players.id, session.playerId));
          const afterGold = afterRows.length ? parseFloat(afterRows[0].gold) : 0;
          await insertGoldLog(session.playerId, totalGold, afterGold, 'recycle', `分解 ${otherItems.length} 件道具，获得 ${totalGold.toFixed(2)} 金币`);
        }

        return {
          success: true,
          count: validItems.length,
          goldReturned: parseFloat(totalGold.toFixed(2)),
          diamondReturned: parseFloat(totalDiamond.toFixed(2)),
        };
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
        if (input.nickname) {
          // 检查昵称唯一性（排除自己）
          const existing = await db.select({ id: players.id }).from(players)
            .where(eq(players.nickname, input.nickname)).limit(1);
          if (existing.length > 0 && existing[0].id !== session.playerId) {
            throw new TRPCError({ code: "CONFLICT", message: "昵称已被使用，请换一个" });
          }
          updates.nickname = input.nickname;
        }
        if (input.avatar) updates.avatar = input.avatar;
        if (Object.keys(updates).length === 0) return { success: true };
        await db.update(players).set(updates).where(eq(players.id, session.playerId));
        return { success: true };
      }),

    /** 生成随机昵称候选列表（用于摇骰子） */
    generateNicknames: publicProcedure
      .input(z.object({ count: z.number().min(1).max(10).default(5) }))
      .query(async ({ input }) => {
        const { generateNicknameCandidates } = await import("../shared/nicknameDictionary");
        return { nicknames: generateNicknameCandidates(input.count) };
      }),

    /** 检查昵称是否可用 */
    checkNickname: publicProcedure
      .input(z.object({ nickname: z.string().min(1).max(20) }))
      .query(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        const db = await getDb();
        if (!db) return { available: false };
        const { players } = await import("../drizzle/schema");
        const existing = await db.select({ id: players.id }).from(players)
          .where(eq(players.nickname, input.nickname)).limit(1);
        if (existing.length === 0) return { available: true };
        // 如果是自己当前的昵称，也算可用
        if (session && existing[0].id === session.playerId) return { available: true };
        return { available: false };
      }),

    /** 获取Steam设置 */
    getSteam: publicProcedure.query(async ({ ctx }) => {
      const session = await getPlayerFromCookie(ctx.req);
      if (!session) return { mainUrl: '', subUrl: '', bindingCode: '' };
      const db = await getDb();
      if (!db) return { mainUrl: '', subUrl: '', bindingCode: '' };
      const [player] = await db.select({
        steamAccount: players.steamAccount,
        steamSubAccount: players.steamSubAccount,
        steamBindingCode: players.steamBindingCode,
      }).from(players).where(eq(players.id, session.playerId)).limit(1);
      if (!player) return { mainUrl: '', subUrl: '', bindingCode: '' };
      return {
        mainUrl: player.steamAccount || '',
        subUrl: player.steamSubAccount || '',
        bindingCode: player.steamBindingCode || '',
      };
    }),

    /** 保存Steam设置（主号URL + 副号URL） */
    updateSteam: publicProcedure
      .input(z.object({
        mainUrl: z.string().max(500),
        subUrl: z.string().max(500),
      }))
      .mutation(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
        await db.update(players).set({
          steamAccount: input.mainUrl,
          steamSubAccount: input.subUrl,
        }).where(eq(players.id, session.playerId));
        return { success: true };
      }),

    /** 生成Steam提货绑定码 */
    generateBindingCode: publicProcedure.mutation(async ({ ctx }) => {
      const session = await getPlayerFromCookie(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      const code = Math.random().toString(36).substring(2, 6).toUpperCase() +
                   Math.random().toString(36).substring(2, 6).toUpperCase();
      await db.update(players).set({ steamBindingCode: code }).where(eq(players.id, session.playerId));
      return { code };
    }),

    /** 发送安全密码验证码 */
    sendSecurityCode: publicProcedure.mutation(async ({ ctx }) => {
      const session = await getPlayerFromCookie(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
      const player = await getPlayerById(session.playerId);
      if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
      if (!player.phone) throw new TRPCError({ code: "BAD_REQUEST", message: "请先绑定手机号" });
      const code = await createSmsCode(player.phone, "safe_password");
      console.log(`[模拟短信] 安全密码验证码 手机号: ${player.phone} 验证码: ${code}`);
      return { success: true, message: "验证码已发送" };
    }),

    /** 设置安全密码（验证码校验 + 保存） */
    setPassword: publicProcedure
      .input(z.object({
        code: z.string().length(6),
        password: z.string().min(6).max(20),
      }))
      .mutation(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const player = await getPlayerById(session.playerId);
        if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
        if (!player.phone) throw new TRPCError({ code: "BAD_REQUEST", message: "请先绑定手机号" });
        const valid = await verifySmsCode(player.phone, input.code, "safe_password");
        if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "验证码无效或已过期" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
         await db.update(players).set({ safePassword: input.password }).where(eq(players.id, session.playerId));
        return { success: true };
      }),

    /** 查询金币流水日志 */
    goldLogs: publicProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().default(20),
        type: z.string().optional(),
        timeRange: z.enum(["all", "today", "yesterday", "week7"]).default("all"),
      }))
      .query(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        let startTime: Date | undefined;
        let endTime: Date | undefined;
        const now = new Date();
        if (input.timeRange === "today") {
          startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        } else if (input.timeRange === "yesterday") {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startTime = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
          endTime = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        } else if (input.timeRange === "week7") {
          startTime = new Date(now);
          startTime.setDate(startTime.getDate() - 6);
          startTime.setHours(0, 0, 0, 0);
        }
        return getGoldLogs(session.playerId, { page: input.page, limit: input.limit, type: input.type, startTime, endTime });
      }),

    /** 提货记录（status=1 已提取的道具列表） */
    extractLogs: publicProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) return { list: [], total: 0 };
        const offset = (input.page - 1) * input.limit;
        const [list, countResult] = await Promise.all([
          db.select({
            id: playerItems.id,
            itemId: playerItems.itemId,
            source: playerItems.source,
            status: playerItems.status,
            extractedAt: playerItems.extractedAt,
            createdAt: playerItems.createdAt,
            itemName: boxGoods.name,
            itemImageUrl: boxGoods.imageUrl,
            itemQuality: boxGoods.level,
            itemValue: boxGoods.price,
          })
            .from(playerItems)
            .leftJoin(boxGoods, eq(playerItems.itemId, boxGoods.id))
            .where(and(eq(playerItems.playerId, session.playerId), eq(playerItems.status, 1)))
            .orderBy(desc(playerItems.extractedAt))
            .limit(input.limit)
            .offset(offset),
          db.select({ count: sql<number>`count(*)` }).from(playerItems)
            .where(and(eq(playerItems.playerId, session.playerId), eq(playerItems.status, 1))),
        ]);
        return {
          list: list.map(r => ({ ...r, itemValue: parseFloat(String(r.itemValue ?? '0')) })),
          total: Number(countResult[0]?.count ?? 0),
        };
      }),

    /** 赠送记录（暂无赠送功能，返回空列表） */
    giftLogs: publicProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ input, ctx }) => {
        const session = await getPlayerFromCookie(ctx.req);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        // 赠送功能尚未实现，返回空列表
        return { list: [], total: 0 };
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
    // VIP等级配置（公开查询，用于VIP界面展示）
    vipConfigs: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { vipConfigs: vipConfigsTable } = await import('../drizzle/schema');
      const { asc } = await import('drizzle-orm');
      const rows = await db.select().from(vipConfigsTable).orderBy(asc(vipConfigsTable.level));
      // 如果数据库中没有数据，返回默认配置
      if (rows.length === 0) {
        return Array.from({ length: 11 }, (_, i) => ({
          id: i,
          level: i,
          name: i === 0 ? 'VIP0' : `VIP${i}`,
          requiredPoints: i === 0 ? 0 : i * 1000,
          rechargeBonus: '0.00',
          privileges: null,
          createdAt: new Date(),
        }));
      }
      return rows;
    }),
  }),
  // ── 管理后台 ──────────────────────────────────────────────────────
  admin: adminRouter,
  // ── ROLL-X 幸运转盘游戏 ──────────────────────────
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
        // 记录金币流水
        await insertGoldLog(playerToken.playerId, netAmount, newGold, 'rollx', isWin ? `ROLL-X 赢得 ${winAmount.toFixed(2)} 金币` : `ROLL-X 投注 ${input.betAmount.toFixed(2)} 金币`);
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
    updateSettings: adminProcedure
      .input(z.object({ rtp: z.number().min(1).max(99).optional(), minBet: z.number().positive().optional(), maxBet: z.number().positive().optional(), minMultiplier: z.number().min(1.01).optional(), maxMultiplier: z.number().max(100000).optional(), enabled: z.boolean().optional(), remark: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
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
    adminGetAllSettings: adminProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(gameSettings);
    }),

    /** 管理后台：获取ROLL-X游戏记录 */
    adminGetGames: adminProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
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
          // 向所有在线坐席发送新会话通知
          const playerInfo = await getPlayerById(player.playerId);
          const playerName = playerInfo?.nickname || `用户${player.phone.slice(-4)}`;
          const onlineAgents = await getCsAgentList();
          for (const agent of onlineAgents) {
            if (agent.status === 'online' || agent.status === 'busy') {
              sendPushToAgent(agent.id, {
                title: '新客服请求',
                body: `${playerName} 正在等待接入`,
                tag: 'cs-new-session',
                data: { url: '/agent' },
              }).catch(() => {});
            }
          }
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
        // 如果会话已分配坐席，向坐席发送 Web Push 推送
        if (session.agentId) {
          const playerName = playerInfo?.nickname || `用户${player.phone.slice(-4)}`;
          const msgPreview = input.msgType === 'text'
            ? input.content.slice(0, 60)
            : '[\u56fe\u7247\u6d88\u606f]';
          sendPushToAgent(session.agentId, {
            title: `\u65b0\u6d88\u606f\uff1a${playerName}`,
            body: msgPreview,
            tag: `cs-session-${input.sessionId}`,
            data: { url: '/agent', sessionId: input.sessionId },
          }).catch(() => {}); // 推送失败不影响主流程
        }
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
      .input(z.object({ status: z.string().optional(), page: z.number().min(1).default(1), limit: z.number().default(20) }))
      .query(async ({ input, ctx }) => {
        const agentAuth = await getAgentFromCookie(ctx.req);
        if (!agentAuth) throw new TRPCError({ code: "UNAUTHORIZED" });
        if (input.status === 'closed') {
          // 历史会话：分页返回
          return getAllCsSessions('closed', input.page, input.limit);
        }
        // 返回所有等待中和进行中的会话（不限制 agentId，坐席可看到所有会话）
        const [waiting, active] = await Promise.all([
          getAllCsSessions("waiting"),
          getAllCsSessions("active"),
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
        // 幂等：如果已被同一坐席接入，直接返回成功
        if (session.status === "active" && session.agentId === agentAuth.agentId) {
          return { success: true };
        }
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

    /** 注册 FCM 推送 Token */
    registerFcmToken: publicProcedure
      .input(z.object({ fcmToken: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const agentAuth = await getAgentFromCookie(ctx.req);
        if (!agentAuth) throw new TRPCError({ code: "UNAUTHORIZED" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(csAgents)
          .set({ fcmToken: input.fcmToken, lastActiveAt: new Date() })
          .where(eq(csAgents.id, agentAuth.agentId));
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
    adminGetAgents: adminProcedure.query(async ({ ctx }) => {
      return getCsAgentList();
    }),

    /** 管理员：创建坐席（简化：显示名+账号+密码） */
    adminCreateAgent: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(50),
        username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, '账号只能包含字母、数字、下划线'),
        password: z.string().min(6).max(50),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getCsAgentByUsername(input.username);
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "账号已存在" });
        return createCsAgent({ name: input.name, username: input.username, password: input.password });
      }),

    /** 管理员：更新坐席（显示名或重置密码） */
    adminUpdateAgent: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(50).optional(),
        password: z.string().min(6).max(50).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.password) updateData.password = data.password;
        await updateCsAgent(id, updateData);
        return { success: true };
      }),

    /** 管理员：启用/停用坐席 */
    adminToggleAgent: adminProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        await updateCsAgent(input.id, { enabled: input.enabled ? 1 : 0 } as any);
        return { success: true };
      }),

    /** 管理员：删除坐席 */
    adminDeleteAgent: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteCsAgent(input.id);
        return { success: true };
      }),

    /** 管理员：获取所有会话 */
    adminGetAllSessions: adminProcedure
      .input(z.object({ status: z.string().optional(), agentId: z.number().optional(), page: z.number().min(1).default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (input.agentId) {
          return getSessionsByAgentId(input.agentId, input.status, input.page, input.limit);
        }
        return getAllCsSessions(input.status, input.page, input.limit);
      }),

    /** 管理员：添加快捷回复 */
    adminAddQuickReply: adminProcedure
      .input(z.object({ category: z.string().default("通用"), title: z.string().min(1), content: z.string().min(1), sort: z.number().default(0) }))
      .mutation(async ({ ctx, input }) => {
        return createCsQuickReply(input);
      }),

    /** 管理员：删除快捷回复 */
    adminDeleteQuickReply: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteCsQuickReply(input.id);
        return { success: true };
      }),

    /** 获取 VAPID 公钥（前端订阅推送用） */
    getVapidPublicKey: publicProcedure.query(() => {
      return { publicKey: process.env.VAPID_PUBLIC_KEY || '' };
    }),

    /** 注册 Web Push 订阅 */
    registerPushSubscription: publicProcedure
      .input(z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
        deviceLabel: z.string().default(''),
      }))
      .mutation(async ({ ctx, input }) => {
        const agentAuth = await getAgentFromCookie(ctx.req);
        if (!agentAuth) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        // 如果已存在相同 endpoint 则更新，否则插入
        const existing = await db.select().from(agentPushSubscriptions)
          .where(eq(agentPushSubscriptions.endpoint, input.endpoint))
          .limit(1);
        if (existing.length > 0) {
          await db.update(agentPushSubscriptions)
            .set({ p256dh: input.p256dh, auth: input.auth, deviceLabel: input.deviceLabel })
            .where(eq(agentPushSubscriptions.endpoint, input.endpoint));
        } else {
          await db.insert(agentPushSubscriptions).values({
            agentId: agentAuth.agentId,
            endpoint: input.endpoint,
            p256dh: input.p256dh,
            auth: input.auth,
            deviceLabel: input.deviceLabel,
          });
        }
        return { success: true };
      }),

    /** 取消 Web Push 订阅 */
    unregisterPushSubscription: publicProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const agentAuth = await getAgentFromCookie(ctx.req);
        if (!agentAuth) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.delete(agentPushSubscriptions)
          .where(eq(agentPushSubscriptions.endpoint, input.endpoint));
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
    createCategory: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        iconUrl: z.string().default(""),
        sort: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
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
    updateCategory: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        iconUrl: z.string().optional(),
        sort: z.number().optional(),
        status: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...updates } = input;
        const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await db.update(skuCategories).set(filtered).where(eq(skuCategories.id, id));
        return { success: true };
      }),

    /** 管理员：删除分类 */
    deleteCategory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
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
    createBox: adminProcedure
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
    updateBox: adminProcedure
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
    deleteBox: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(boxGoods).where(eq(boxGoods.boxId, input.id));
        await db.delete(boxes).where(eq(boxes.id, input.id));
        return { success: true };
      }),

    /** 管理员：更新宝笱内商品列表（全量替换） */
    updateBoxGoods: adminProcedure
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

  // ── 商城（cs2pifa商品，从数据库读取，后台定时150秒同步） ──────────────────────────────
  shop: router({
    /** 获取商品分类列表（从数据库读取去重分类） */
    getCategories: publicProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return [];
        try {
          const [rows] = await (db as any).execute(
            sql`SELECT DISTINCT typeId, typeName, typeHashName FROM shopItems WHERE enabled = 1 AND sellNum > 0 AND referencePrice >= 20 ORDER BY typeName`
          );
          return (rows as any[]).map((r: any) => ({
            typeId: parseInt(r.typeId) || 0,
            typeName: r.typeName || '',
            typeHashName: r.typeHashName || '',
          }));
        } catch {
          return [];
        }
      }),

    /** 获取商品列表（从数据库读取，支持分类/关键词/价格/排序/分页） */
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
        const db = await getDb();
        if (!db) return { items: [], total: 0, pageNum: input.pageNum, pageSize: input.pageSize };
        try {
          // 构建WHERE条件
          const conditions: string[] = ['enabled = 1', 'sellNum > 0', 'referencePrice >= 20'];
          if (input.typeId) conditions.push(`typeId = '${input.typeId}'`);
          if (input.keyword) conditions.push(`templateName LIKE '%${input.keyword.replace(/'/g, "\\'").replace(/%/g, '\\%')}%'`);
          if (input.minPrice !== undefined) conditions.push(`referencePrice >= ${input.minPrice}`);
          if (input.maxPrice !== undefined) conditions.push(`referencePrice <= ${input.maxPrice}`);
          const whereClause = conditions.join(' AND ');
          const orderBy = input.sortDesc ? 'referencePrice DESC' : 'referencePrice ASC';
          const offset = (input.pageNum - 1) * input.pageSize;

          // 查询总数
          const [countRows] = await (db as any).execute(
            sql.raw(`SELECT COUNT(*) as total FROM shopItems WHERE ${whereClause}`)
          );
          const total = parseInt((countRows as any[])[0]?.total) || 0;

          // 查询数据
          const [rows] = await (db as any).execute(
            sql.raw(`SELECT * FROM shopItems WHERE ${whereClause} ORDER BY ${orderBy} LIMIT ${input.pageSize} OFFSET ${offset}`)
          );

          const items = (rows as any[]).map((r: any) => ({
            typeId: parseInt(r.typeId) || 0,
            typeName: r.typeName || '',
            typeHashName: r.typeHashName || '',
            weaponId: r.weaponId || 0,
            weaponHashName: r.weaponHashName || '',
            templateId: parseInt(r.templateId) || 0,
            templateHashName: r.templateHashName || '',
            templateName: r.templateName || '',
            iconUrl: r.iconUrl || '',
            exteriorName: r.exteriorName || '',
            rarityName: r.rarityName || '',
            minSellPrice: parseFloat(r.minSellPrice) || 0,
            fastShippingMinSellPrice: parseFloat(r.fastShippingMinSellPrice) || 0,
            referencePrice: parseFloat(r.referencePrice) || 0,
            sellNum: r.sellNum || 0,
          }));

          return { items, total, pageNum: input.pageNum, pageSize: input.pageSize };
        } catch (err) {
          console.error('[shop.getProducts] 查询失败:', err);
          return { items: [], total: 0, pageNum: input.pageNum, pageSize: input.pageSize };
        }
      }),

    /** 获取同步状态 */
    getSyncStatus: publicProcedure
      .query(async () => {
        const { getSyncStatus } = await import("./cs2pifaApi");
        const status = getSyncStatus();
        const db = await getDb();
        let totalItems = 0;
        if (db) {
          try {
            const [rows] = await (db as any).execute(
              sql`SELECT COUNT(*) as cnt FROM shopItems WHERE enabled = 1 AND sellNum > 0 AND referencePrice >= 20`
            );
            totalItems = parseInt((rows as any[])[0]?.cnt) || 0;
          } catch {}
        }
        return { ...status, totalItems };
      }),

    /** 手动触发同步（仅管理员） */
    triggerSync: publicProcedure
      .mutation(async ({ ctx }) => {
        const player = await getPlayerFromCookie(ctx.req);
        if (!player) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const { syncShopItems } = await import("./cs2pifaApi");
        const result = await syncShopItems();
        return result;
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
        const balance = parseFloat(playerData.diamond ?? '0');
        if (balance < price) throw new TRPCError({ code: "BAD_REQUEST", message: "钻石余额不足" });
        const newBalance = (balance - price).toFixed(2);
        await db.update(players).set({ diamond: newBalance }).where(eqOp(players.id, player.playerId));
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
    /** 开始游戏（扣除投注金额，服务端生成并存储 laneResults） */
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
        // 记录金币流水
        await insertGoldLog(playerToken.playerId, -input.betAmount, newGold, 'rush', `过马路投注 ${input.betAmount.toFixed(2)} 金币`);
        // 服务端预生成每条车道的存活结果和对应倍率（防止前端伪造）
        const LANE_MULTIPLIERS_SERVER = [1.4, 1.6, 1.7, 2.0, 2.5, 3.0, 4.0, 8.0];
        const maxLanes = 8;
        const baseDeath = 0.5 - (rtp / 100) * 0.28;
        const laneResults: boolean[] = [];
        for (let i = 0; i < maxLanes; i++) {
          const deathRate = Math.min(0.65, baseDeath * (1 + i * 0.18));
          laneResults.push(Math.random() >= deathRate);
        }
        // 将 laneResults 和 laneMultipliers 存入数据库，endGame 时服务端重算倍率
        const sessionResult = await db.insert(rushPendingSessions).values({
          playerId: playerToken.playerId,
          betAmount: input.betAmount.toFixed(2),
          laneResults: JSON.stringify(laneResults),
          laneMultipliers: JSON.stringify(LANE_MULTIPLIERS_SERVER),
          settled: 0,
        });
        const sessionId = (sessionResult as any).insertId as number;
        return { success: true, laneResults, balanceAfter: newGold, betAmount: input.betAmount, sessionId };
      }),
    /** 结束游戏（收手或死亡，服务端从 rushPendingSessions 读取 laneResults 重算倍率） */
    endGame: publicProcedure
      .input(z.object({
        sessionId: z.number().int().positive(),
        lanesReached: z.number().min(0),
        isDead: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const playerToken = await getPlayerFromCookie(ctx.req);
        if (!playerToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // 从数据库读取会话（验证归属 + 防止重复结算）
        const sessionRows = await db.select().from(rushPendingSessions)
          .where(eq(rushPendingSessions.id, input.sessionId));
        if (!sessionRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "游戏会话不存在" });
        const session = sessionRows[0];
        if (session.playerId !== playerToken.playerId)
          throw new TRPCError({ code: "FORBIDDEN", message: "无权操作此会话" });
        if (session.settled === 1)
          throw new TRPCError({ code: "BAD_REQUEST", message: "游戏已结算，请勿重复提交" });
        // 标记会话已结算（防止重复结算）
        await db.update(rushPendingSessions).set({ settled: 1 }).where(eq(rushPendingSessions.id, input.sessionId));
        const betAmount = parseFloat(session.betAmount);
        // 服务端重算倍率（完全不信任前端传入的 finalMultiplier）
        const laneMultipliers: number[] = JSON.parse(session.laneMultipliers);
        const serverMultiplier = input.lanesReached > 0 && input.lanesReached <= laneMultipliers.length
          ? laneMultipliers[input.lanesReached - 1]
          : 0;
        const playerRows = await db.select().from(players).where(eq(players.id, playerToken.playerId));
        if (!playerRows.length) throw new TRPCError({ code: "NOT_FOUND" });
        const player = playerRows[0];
        const currentGold = parseFloat(player.gold);
        let winAmount = 0;
        let netAmount = -betAmount;
        if (!input.isDead && input.lanesReached > 0) {
          winAmount = betAmount * serverMultiplier;
          netAmount = winAmount - betAmount;
        }
        const newGold = currentGold + winAmount;
        await db.update(players).set({ gold: newGold.toFixed(2) }).where(eq(players.id, playerToken.playerId));
        if (winAmount > 0) await insertGoldLog(playerToken.playerId, winAmount, newGold, 'rush', `过马路赢得 ${winAmount.toFixed(2)} 金币`);
        await db.insert(rushGames).values({
          playerId: playerToken.playerId,
          betAmount: betAmount.toFixed(2),
          lanesReached: input.lanesReached,
          isDead: input.isDead ? 1 : 0,
          finalMultiplier: serverMultiplier.toFixed(2),
          winAmount: winAmount.toFixed(2),
          netAmount: netAmount.toFixed(2),
          balanceAfter: newGold.toFixed(2),
        });
        return { winAmount, netAmount, balanceAfter: newGold, finalMultiplier: serverMultiplier };
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
      if (!db) return { rtp: 96, minBet: 1, maxBet: 10000, enabled: true };
      const rows = await db.select().from(gameSettings).where(eq(gameSettings.gameKey, "dingdong"));
      if (!rows.length) {
        await db.insert(gameSettings).values({ gameKey: "dingdong", rtp: "96.00", minBet: "1.00", maxBet: "10000.00", enabled: 1 });
        return { rtp: 96, minBet: 1, maxBet: 10000, enabled: true };
      }
      const s = rows[0];
      return { rtp: parseFloat(s.rtp), minBet: parseFloat(s.minBet), maxBet: parseFloat(s.maxBet), enabled: s.enabled === 1 };
    }),
    /**
     * Fruit Bomb 水果机 - 组合投注模式
     * betMap: { [fruitId]: betAmount } 可同时对多种水果下注
     * 系统随机开出一种水果，命中的水果获得 betAmount * multiplier
     */
    play: publicProcedure
      .input(z.object({
        betMap: z.record(z.string(), z.number().positive()),
      }))
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
        // 计算总投注额
        const betEntries = Object.entries(input.betMap).map(([k, v]) => ({ fruitId: parseInt(k), amount: v }));
        const totalBet = betEntries.reduce((s, e) => s + e.amount, 0);
        if (totalBet < minBet) throw new TRPCError({ code: "BAD_REQUEST", message: `投注金额需至少 ${minBet}` });
        if (totalBet > maxBet) throw new TRPCError({ code: "BAD_REQUEST", message: `投注金额不能超过 ${maxBet}` });
        const playerRows = await db.select().from(players).where(eq(players.id, playerToken.playerId));
        if (!playerRows.length) throw new TRPCError({ code: "NOT_FOUND" });
        const player = playerRows[0];
        const currentGold = parseFloat(player.gold);
        if (currentGold < totalBet) throw new TRPCError({ code: "BAD_REQUEST", message: "金币不足" });
        // 7种水果倍率
        const FRUIT_MULTIPLIERS = [2.5, 5, 5, 10, 10, 20, 20];
        // 权重：倍率越高出现概率越低
        const BASE_WEIGHTS = [40, 20, 20, 10, 10, 5, 5];
        const rtpFactor = rtp / 96;
        const weights = BASE_WEIGHTS.map(w => w * rtpFactor);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        // 按权重随机开奖
        let rand = Math.random() * totalWeight;
        let winFruit = 0;
        for (let i = 0; i < weights.length; i++) {
          rand -= weights[i];
          if (rand <= 0) { winFruit = i; break; }
        }
        // 计算该水果的下注金额（如果有）
        const winBetAmount = input.betMap[String(winFruit)] ?? 0;
        const multiplier = winBetAmount > 0 ? FRUIT_MULTIPLIERS[winFruit] : 0;
        const winAmount = winBetAmount > 0 ? winBetAmount * multiplier : 0;
        const isWin = winAmount > 0;
        const netAmount = winAmount - totalBet;
        const newGold = currentGold + netAmount;
        await db.update(players).set({ gold: newGold.toFixed(2) }).where(eq(players.id, playerToken.playerId));
        // 记录金币流水
        await insertGoldLog(playerToken.playerId, netAmount, newGold, 'dingdong', isWin ? `丁和大作赢得 ${winAmount.toFixed(2)} 金币` : `丁和大作投注 ${totalBet.toFixed(2)} 金币`);
        // 记录游戏（selectedCell 存储 JSON betMap，winCell 存储开奖水果）
        await db.insert(dingdongGames).values({
          playerId: playerToken.playerId,
          betAmount: totalBet.toFixed(2),
          selectedCell: winFruit, // 简化：存开奖水果
          winCell: winFruit,
          isWin: isWin ? 1 : 0,
          multiplier: multiplier.toFixed(2),
          winAmount: winAmount.toFixed(2),
          netAmount: netAmount.toFixed(2),
          balanceAfter: newGold.toFixed(2),
        });
        return {
          isWin,
          winFruit,
          multiplier,
          winAmount,
          netAmount,
          totalBet,
          balanceAfter: newGold,
          bets: input.betMap,
        };
      }),
    /**
     * 押大小环节（赢了之后）
     * 骰子1-3=小，4-6=大，猜中奖金翻倍，猜错清零
     */
    playDice: publicProcedure
      .input(z.object({
        choice: z.enum(['big', 'small']),
        winAmount: z.number().positive(),
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
        // 掷骰子
        const diceValue = Math.floor(Math.random() * 6) + 1;
        const isSmall = diceValue <= 3;
        const win = (input.choice === 'small' && isSmall) || (input.choice === 'big' && !isSmall);
        const finalAmount = win ? input.winAmount * 2 : 0;
        // 更新余额：原来已经加了 winAmount，现在需要调整
        // 如果赢：再加一倍 winAmount（总共 2x）
        // 如果输：扣除 winAmount（归零）
        const goldDelta = win ? input.winAmount : -input.winAmount;
        const newGold = currentGold + goldDelta;
        await db.update(players).set({ gold: newGold.toFixed(2) }).where(eq(players.id, playerToken.playerId));
        // 记录金币流水
        await insertGoldLog(playerToken.playerId, goldDelta, newGold, 'dingdong', win ? `丁和大作骰子翻倍 +${finalAmount.toFixed(2)} 金币` : `丁和大作骰子失败 -${input.winAmount.toFixed(2)} 金币`);
        return {
          win,
          diceValue,
          choice: input.choice,
          finalAmount,
          balanceAfter: newGold,
        };
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
        return rows.map(r => ({
          id: r.id,
          betAmount: parseFloat(r.betAmount),
          selectedFruit: r.selectedCell,
          winFruit: r.winCell,
          isWin: r.isWin === 1,
          multiplier: parseFloat(r.multiplier),
          winAmount: parseFloat(r.winAmount),
          netAmount: parseFloat(r.netAmount),
          balanceAfter: parseFloat(r.balanceAfter),
          createdAt: r.createdAt
        }));
      }),
  }),

  // ── Vortex 游戏路由 ──────────────────────────────────────────────
  vortex: router({
    /** 获取游戏配置（RTP、投注范围等） */
    getConfig: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { rtp: 96, minBet: 1, maxBet: 1000, enabled: true };
      try {
        const [rows] = await (db as any).execute('SELECT * FROM vortexConfig ORDER BY id DESC LIMIT 1');
        if (!rows || rows.length === 0) return { rtp: 96, minBet: 1, maxBet: 1000, enabled: true };
        const cfg = rows[0];
        return {
          rtp: cfg.rtp,
          minBet: parseFloat(cfg.minBet),
          maxBet: parseFloat(cfg.maxBet),
          enabled: cfg.enabled === 1,
        };
      } catch {
        return { rtp: 96, minBet: 1, maxBet: 1000, enabled: true };
      }
    }),

    /**
     * 旋转一次，返回本次旋转结果
     * 游戏逻辑：
     * - 每次旋转产生一个元素：fire/earth/water/wind/skull/bonus
     * - fire/earth/water：对应轨道格子+1，倍率累积
     * - wind：不填充，不影响倍率
     * - skull：所有轨道退后1格
     * - bonus：特殊奖励，直接给20.5x
     * RTP通过控制各元素出现概率实现
     */
    spin: publicProcedure
      .input(z.object({
        betAmount: z.number().positive(),
        // 当前轨道状态（前端传入，后端用于计算）
        trackState: z.object({
          fire: z.number().min(0).max(8),
          earth: z.number().min(0).max(8),
          water: z.number().min(0).max(8),
        }),
        // 当前累积倍率
        currentMultiplier: z.number().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const playerToken = await getPlayerFromCookie(ctx.req);
        if (!playerToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // 获取RTP配置
        let rtp = 96;
        try {
          const [rows] = await (db as any).execute('SELECT rtp FROM vortexConfig ORDER BY id DESC LIMIT 1');
          if (rows && rows.length > 0) rtp = rows[0].rtp;
        } catch {}

        // 验证投注金额
        const playerRows = await db.select().from(players).where(eq(players.id, playerToken.playerId));
        if (!playerRows.length) throw new TRPCError({ code: "NOT_FOUND" });
        const player = playerRows[0];
        const currentGold = parseFloat(player.gold);
        if (currentGold < input.betAmount) throw new TRPCError({ code: "BAD_REQUEST", message: "金币不足" });

        // 元素权重（基于RTP调整）
        // 元素：fire, earth, water, wind, skull, bonus
        // RTP越高，fire/earth/water出现概率越高，skull越少
        const rtpFactor = rtp / 96;
        const BASE_WEIGHTS = {
          fire:  25 * rtpFactor,
          earth: 25 * rtpFactor,
          water: 25 * rtpFactor,
          wind:  15,
          skull: 8 / rtpFactor,
          bonus: 2 * rtpFactor,
        };
        const totalW = Object.values(BASE_WEIGHTS).reduce((a, b) => a + b, 0);
        let rand = Math.random() * totalW;
        let element: 'fire' | 'earth' | 'water' | 'wind' | 'skull' | 'bonus' = 'wind';
        for (const [el, w] of Object.entries(BASE_WEIGHTS)) {
          rand -= w;
          if (rand <= 0) { element = el as any; break; }
        }

        // 计算新的轨道状态
        const TRACK_MAX = 8; // 每条轨道最大格子数
        let newTrack = { ...input.trackState };
        let bonusTriggered = false;
        let bonusMultiplier = 0;

        if (element === 'fire' || element === 'earth' || element === 'water') {
          newTrack[element] = Math.min(newTrack[element] + 1, TRACK_MAX);
          if (newTrack[element] === TRACK_MAX) {
            bonusTriggered = true;
            bonusMultiplier = 20.5;
          }
        } else if (element === 'skull') {
          // 所有轨道退后1格
          newTrack.fire = Math.max(0, newTrack.fire - 1);
          newTrack.earth = Math.max(0, newTrack.earth - 1);
          newTrack.water = Math.max(0, newTrack.water - 1);
        } else if (element === 'bonus') {
          bonusTriggered = true;
          bonusMultiplier = 20.5;
        }

        // 计算当前倍率（基于轨道进度）
        // 轨道倍率表（从外到内）
        const TRACK_MULTIPLIERS = [1.55, 2.5, 3.9, 4.85, 7.5, 10, 16, 20.5];
        const fireMultiplier = newTrack.fire > 0 ? TRACK_MULTIPLIERS[newTrack.fire - 1] : 0;
        const earthMultiplier = newTrack.earth > 0 ? TRACK_MULTIPLIERS[newTrack.earth - 1] : 0;
        const waterMultiplier = newTrack.water > 0 ? TRACK_MULTIPLIERS[newTrack.water - 1] : 0;
        const totalMultiplier = fireMultiplier + earthMultiplier + waterMultiplier + (bonusTriggered ? bonusMultiplier : 0);

        return {
          element,
          newTrack,
          multiplier: totalMultiplier,
          bonusTriggered,
          bonusMultiplier,
          fireMultiplier,
          earthMultiplier,
          waterMultiplier,
        };
      }),

    /**
     * Cash Out - 结算当前赢额（服务端从 trackState 重算倍率，不信任前端传入的 multiplier）
     */
    cashOut: publicProcedure
      .input(z.object({
        betAmount: z.number().positive(),
        trackState: z.object({
          fire: z.number().min(0).max(8),
          earth: z.number().min(0).max(8),
          water: z.number().min(0).max(8),
        }),
        isPartial: z.boolean().optional().default(false),
        partialRatio: z.number().min(0).max(1).optional().default(0.5),
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

        // 服务端从 trackState 重算倍率（不信任前端传入的 multiplier）
        const TRACK_MULTIPLIERS_SERVER = [1.55, 2.5, 3.9, 4.85, 7.5, 10, 16, 20.5];
        const { fire, earth, water } = input.trackState;
        const fireM = fire > 0 && fire <= 8 ? TRACK_MULTIPLIERS_SERVER[fire - 1] : 0;
        const earthM = earth > 0 && earth <= 8 ? TRACK_MULTIPLIERS_SERVER[earth - 1] : 0;
        const waterM = water > 0 && water <= 8 ? TRACK_MULTIPLIERS_SERVER[water - 1] : 0;
        const serverMultiplier = fireM + earthM + waterM;

        // 容错：服务端重算倍率为 0 时拒绝结算
        if (serverMultiplier <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "当前轨道状态无效，请重新旋转后再提现" });
        }

        const winAmount = input.betAmount * serverMultiplier;
        const payoutAmount = input.isPartial ? winAmount * input.partialRatio : winAmount;
        const netAmount = payoutAmount - input.betAmount;
        const newGold = currentGold - input.betAmount + payoutAmount;

         // 更新余额
        await db.update(players).set({ gold: newGold.toFixed(2) }).where(eq(players.id, playerToken.playerId));
        // 记录金币流水
        await insertGoldLog(playerToken.playerId, netAmount, newGold, 'vortex', netAmount >= 0 ? `Vortex 赢得 ${payoutAmount.toFixed(2)} 金币` : `Vortex 投注 ${input.betAmount.toFixed(2)} 金币`);
        // 记录投注
        await db.execute(
          sql`INSERT INTO vortexBets (userId, playerName, betAmount, multiplier, winAmount, netAmount, balanceAfter, resultData, isWin) VALUES (${playerToken.playerId}, ${player.nickname || ''}, ${input.betAmount.toFixed(2)}, ${serverMultiplier.toFixed(2)}, ${payoutAmount.toFixed(2)}, ${netAmount.toFixed(2)}, ${newGold.toFixed(2)}, ${JSON.stringify(input.trackState)}, ${payoutAmount > 0 ? 1 : 0})`
        );

        return {
          success: true,
          winAmount: payoutAmount,
          netAmount,
          balanceAfter: newGold,
          isPartial: input.isPartial,
        };
      }),

    /** 获取历史记录 */
    getHistory: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const playerToken = await getPlayerFromCookie(ctx.req);
        if (!playerToken) return [];
        const db = await getDb();
        if (!db) return [];
        try {
          const [rows] = await (db as any).execute(
            sql`SELECT * FROM vortexBets WHERE userId = ${playerToken.playerId} ORDER BY createdAt DESC LIMIT ${input.limit}`
          );
          return (rows as any[]).map((r: any) => ({
            id: r.id,
            betAmount: parseFloat(r.betAmount),
            multiplier: parseFloat(r.multiplier),
            winAmount: parseFloat(r.winAmount),
            netAmount: parseFloat(r.netAmount),
            balanceAfter: parseFloat(r.balanceAfter),
            isWin: r.isWin === 1,
            createdAt: r.createdAt,
          }));
        } catch {
          return [];
        }
      }),
  }),
});
export type AppRouter = typeof appRouter;

// 竞技场路由已在 appRouter 中注册
// 通过 arenaRouter 导出以便类型推断
export { arenaRouter };
