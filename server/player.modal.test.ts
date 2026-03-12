/**
 * player.modal.test.ts
 * 测试安全密码弹窗和Steam设置弹窗相关的后端API：
 * - player.sendSecurityCode：未登录时抛出 UNAUTHORIZED
 * - player.setPassword：未登录时抛出 UNAUTHORIZED；密码格式校验
 * - player.getSteam：未登录时返回空值
 * - player.generateBindingCode：未登录时抛出 UNAUTHORIZED
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/** 创建未登录上下文（无 cookie） */
function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as unknown as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("player.sendSecurityCode", () => {
  it("未登录时应抛出 UNAUTHORIZED 错误", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.player.sendSecurityCode()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("player.setPassword", () => {
  it("未登录时应抛出 UNAUTHORIZED 错误", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.player.setPassword({ code: "123456", password: "abc123" })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("密码长度不足6位时应抛出 BAD_REQUEST 错误", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.player.setPassword({ code: "123456", password: "abc" })
    ).rejects.toThrow();
  });

  it("密码超过20位时应抛出错误", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.player.setPassword({ code: "123456", password: "a".repeat(21) })
    ).rejects.toThrow();
  });
});

describe("player.getSteam", () => {
  it("未登录时应返回空的Steam设置", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    const result = await caller.player.getSteam();
    expect(result).toEqual({ mainUrl: "", subUrl: "", bindingCode: "" });
  });
});

describe("player.generateBindingCode", () => {
  it("未登录时应抛出 UNAUTHORIZED 错误", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.player.generateBindingCode()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("player.updateSteam", () => {
  it("未登录时应抛出 UNAUTHORIZED 错误", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.player.updateSteam({ mainUrl: "https://steam.com/test", subUrl: "" })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
