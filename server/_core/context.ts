import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "bdcs2-secret-key-2025");
const PLAYER_COOKIE = "bdcs2_player_token";
const AGENT_COOKIE = "bdcs2_agent_token";
const ADMIN_COOKIE = "bdcs2_admin_token";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * 尝试从玩家JWT cookie中构造一个兼容的User对象
 * 这样protectedProcedure的middleware可以通过，
 * 各路由内部再用getPlayerFromCookie做真正的业务验证
 */
async function tryAuthFromPlayerJwt(req: any): Promise<User | null> {
  try {
    const cookieHeader = req.headers?.cookie || "";

    // 尝试玩家token
    const playerMatch = cookieHeader.match(new RegExp(`${PLAYER_COOKIE}=([^;]+)`));
    if (playerMatch) {
      const { payload } = await jwtVerify(playerMatch[1], JWT_SECRET);
      if (payload.type === "player" && payload.playerId) {
        // 构造一个兼容User对象，让protectedProcedure通过
        return {
          id: payload.playerId as number,
          openId: `player_${payload.playerId}`,
          name: (payload.phone as string) || null,
          email: null,
          loginMethod: "phone",
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        } as User;
      }
    }

    // 尝试管理员token
    const adminMatch = cookieHeader.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`));
    if (adminMatch) {
      const { payload } = await jwtVerify(adminMatch[1], JWT_SECRET);
      if (payload.type === "admin") {
        return {
          id: 0,
          openId: "admin",
          name: (payload.account as string) || "admin",
          email: null,
          loginMethod: "admin",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        } as User;
      }
    }

    // 尝试客服token
    const agentMatch = cookieHeader.match(new RegExp(`${AGENT_COOKIE}=([^;]+)`));
    if (agentMatch) {
      const { payload } = await jwtVerify(agentMatch[1], JWT_SECRET);
      if (payload.type === "csagent" && payload.agentId) {
        return {
          id: payload.agentId as number,
          openId: `agent_${payload.agentId}`,
          name: (payload.username as string) || null,
          email: null,
          loginMethod: "csagent",
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        } as User;
      }
    }
  } catch {
    // JWT验证失败，返回null
  }
  return null;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // 直接使用玩家/管理员JWT认证，不依赖Manus OAuth
  const user = await tryAuthFromPlayerJwt(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
