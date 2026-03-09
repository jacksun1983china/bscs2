import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createPlayer,
  createSmsCode,
  getPlayerByPhone,
  getPlayerById,
  getPlayerList,
  updatePlayerLogin,
  updatePlayerStatus,
  verifySmsCode,
} from "./db";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "bdcs2-secret-key-2025");
const PLAYER_COOKIE = "bdcs2_player_token";

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
    /** 发送验证码（模拟：固定 123456） */
    sendCode: publicProcedure
      .input(z.object({ phone: z.string().min(11).max(11), purpose: z.string().default("login") }))
      .mutation(async ({ input }) => {
        const code = await createSmsCode(input.phone, input.purpose);
        console.log(`[模拟短信] 手机号: ${input.phone} 验证码: ${code}`);
        return { success: true, message: "验证码已发送（模拟：123456）" };
      }),

    /** 登录（手机号+验证码，无账号自动注册） */
    login: publicProcedure
      .input(z.object({ phone: z.string().min(11).max(11), code: z.string().length(6) }))
      .mutation(async ({ input, ctx }) => {
        const valid = await verifySmsCode(input.phone, input.code, "login");
        if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "验证码无效或已过期" });

        let player = await getPlayerByPhone(input.phone);
        const isNew = !player;
        if (!player) {
          const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          player = await createPlayer({
            phone: input.phone,
            nickname: `用户${input.phone.slice(-4)}`,
            inviteCode,
            registerIp: (ctx.req as any).ip || "",
          });
          if (!player) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "登录失败" });
        }

        if (player.status === 0) throw new TRPCError({ code: "FORBIDDEN", message: "账号已被封禁" });

        await updatePlayerLogin(player.id, (ctx.req as any).ip || "");
        const token = await signPlayerToken(player.id, player.phone);
        // 使用与系统 session cookie 相同的配置（sameSite: none + secure）
        const isSecure = (ctx.req as any).protocol === 'https' ||
          ((ctx.req as any).headers?.['x-forwarded-proto'] || '').includes('https');
        (ctx.res as any).cookie(PLAYER_COOKIE, token, {
          httpOnly: true,
          secure: isSecure,
          sameSite: isSecure ? 'none' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: '/',
        });

        return {
          success: true,
          isNew,
          player: {
            id: player.id,
            phone: player.phone,
            nickname: player.nickname,
            vipLevel: player.vipLevel,
            gold: player.gold,
            diamond: player.diamond,
          },
        };
      }),

    /** 获取当前登录玩家信息 */
    me: publicProcedure.query(async ({ ctx }) => {
      const session = await getPlayerFromCookie(ctx.req);
      if (!session) return null;
      const player = await getPlayerById(session.playerId);
      if (!player) return null;
      return {
        id: player.id,
        phone: player.phone,
        nickname: player.nickname,
        avatar: player.avatar,
        vipLevel: player.vipLevel,
        gold: player.gold,
        diamond: player.diamond,
        totalRecharge: player.totalRecharge,
        inviteCode: player.inviteCode,
        createdAt: player.createdAt,
      };
    }),

    /** 退出登录 */
    logout: publicProcedure.mutation(({ ctx }) => {
      const isSecure = (ctx.req as any).protocol === 'https' ||
        ((ctx.req as any).headers?.['x-forwarded-proto'] || '').includes('https');
      (ctx.res as any).clearCookie(PLAYER_COOKIE, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        path: '/',
      });
      return { success: true };
    }),
  }),

  // ── 管理后台（需要 admin 身份） ───────────────────────────
  admin: router({
    playerList: protectedProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(15),
        keyword: z.string().optional(),
        status: z.number().optional(),
        vipLevel: z.number().optional(),
      }))
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
  }),
});

export type AppRouter = typeof appRouter;
