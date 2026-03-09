import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", () => ({
  createSmsCode: vi.fn().mockResolvedValue("123456"),
  verifySmsCode: vi.fn().mockResolvedValue(true),
  getPlayerByPhone: vi.fn().mockResolvedValue(null),
  createPlayer: vi.fn().mockResolvedValue({
    id: 1,
    phone: "13800138000",
    nickname: "用户8000",
    avatar: "",
    vipLevel: 0,
    gold: "0.00",
    diamond: "0.00",
    totalRecharge: "0.00",
    totalWin: "0.00",
    status: 1,
    banReason: "",
    registerIp: "127.0.0.1",
    lastLogin: new Date(),
    lastIp: "127.0.0.1",
    device: "",
    inviteCode: "ABC123",
    invitedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updatePlayerLogin: vi.fn().mockResolvedValue(undefined),
  getPlayerById: vi.fn().mockResolvedValue(null),
  getPlayerList: vi.fn().mockResolvedValue({ list: [], total: 0 }),
  updatePlayerStatus: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

function createPublicContext(): TrpcContext {
  const cookies: Record<string, string> = {};
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as unknown as TrpcContext["req"],
    res: {
      cookie: (name: string, val: string) => { cookies[name] = val; },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("player.sendCode", () => {
  it("should send mock verification code successfully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.player.sendCode({ phone: "13800138000", purpose: "login" });
    expect(result.success).toBe(true);
    expect(result.message).toContain("验证码");
  });
});

describe("player.login", () => {
  it("should register new player with valid code", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.player.login({ phone: "13800138000", code: "123456" });
    expect(result.success).toBe(true);
    expect(result.isNew).toBe(true);
    expect(result.player.phone).toBe("13800138000");
  });
});

describe("player.me", () => {
  it("should return null when not logged in", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.player.me();
    expect(result).toBeNull();
  });
});

describe("admin.playerList", () => {
  it("should reject non-admin users", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-user",
        name: "Test User",
        email: null,
        loginMethod: null,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.playerList({ page: 1, limit: 15 })).rejects.toThrow("无权限访问");
  });

  it("should return player list for admin users", async () => {
    const { getPlayerList } = await import("./db");
    vi.mocked(getPlayerList).mockResolvedValueOnce({ list: [], total: 0 });

    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "admin-user",
        name: "Admin",
        email: null,
        loginMethod: null,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as unknown as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.playerList({ page: 1, limit: 15 });
    expect(result).toHaveProperty("list");
    expect(result).toHaveProperty("total");
  });
});
