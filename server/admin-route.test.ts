/**
 * admin-route.test.ts — 验证管理后台路由和增强功能的单元测试
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Admin Route Configuration", () => {
  const appTsxPath = path.resolve(__dirname, "../client/src/App.tsx");
  const appContent = fs.readFileSync(appTsxPath, "utf-8");

  it("/admin route should NOT be wrapped in ProtectedRoute", () => {
    // 确保 /admin 路由不使用 ProtectedRoute 包裹
    // 查找 /admin 路由行
    const adminRouteMatch = appContent.match(/path=\{?"\/admin"\}?[^]*?(?=<Route|$)/);
    expect(adminRouteMatch).toBeTruthy();
    
    // 确保 /admin 路由行不包含 ProtectedRoute
    const adminLine = appContent.split('\n').find(line => 
      line.includes('"/admin"') && !line.includes('"/admin/')
    );
    expect(adminLine).toBeTruthy();
    expect(adminLine).not.toContain('ProtectedRoute');
  });

  it("/admin route should directly use AdminDashboard component", () => {
    // 确保 /admin 路由直接使用 AdminDashboard
    const hasDirectAdminRoute = appContent.includes('path={"/admin"} component={AdminDashboard}') ||
      appContent.includes('path="/admin" component={AdminDashboard}');
    expect(hasDirectAdminRoute).toBe(true);
  });

  it("AdminDashboard should be imported", () => {
    expect(appContent).toContain("AdminDashboard");
    expect(appContent).toContain("./pages/AdminDashboard");
  });
});

describe("Admin Router - verify endpoint", () => {
  const adminRouterPath = path.resolve(__dirname, "./routers/adminRouter.ts");
  const adminRouterContent = fs.readFileSync(adminRouterPath, "utf-8");

  it("should have a verify endpoint using publicProcedure", () => {
    expect(adminRouterContent).toContain("verify:");
    expect(adminRouterContent).toContain("publicProcedure");
  });

  it("verify endpoint should check ctx.user.role for admin", () => {
    expect(adminRouterContent).toContain("ctx.user.role !== 'admin'");
  });
});

describe("Arena Sound Effects", () => {
  const soundPath = path.resolve(__dirname, "../client/src/lib/arenaSound.ts");
  const soundContent = fs.readFileSync(soundPath, "utf-8");

  it("should export playSlotSpin function", () => {
    expect(soundContent).toContain("export function playSlotSpin");
  });

  it("should export stopSlotSpin function", () => {
    expect(soundContent).toContain("export function stopSlotSpin");
  });

  it("slot spin sound should respect SFX mute setting", () => {
    // playSlotSpin 应该检查 isSfxMuted
    const playSlotSpinMatch = soundContent.match(/export function playSlotSpin[\s\S]*?(?=export function)/);
    expect(playSlotSpinMatch).toBeTruthy();
    expect(playSlotSpinMatch![0]).toContain("isSfxMuted");
  });
});

describe("ArenaRoom Enhancements", () => {
  const arenaRoomPath = path.resolve(__dirname, "../client/src/pages/ArenaRoom.tsx");
  const arenaContent = fs.readFileSync(arenaRoomPath, "utf-8");

  it("should import playSlotSpin and stopSlotSpin", () => {
    expect(arenaContent).toContain("playSlotSpin");
    expect(arenaContent).toContain("stopSlotSpin");
  });

  it("should have AnimatedValue component for number rolling animation", () => {
    expect(arenaContent).toContain("function AnimatedValue");
    expect(arenaContent).toContain("requestAnimationFrame");
    expect(arenaContent).toContain("easeOutCubic");
  });

  it("should use AnimatedValue in PlayerSeat liveValue display", () => {
    expect(arenaContent).toContain("<AnimatedValue value={liveValue}");
  });

  it("should have join confirmation dialog", () => {
    // 确认弹窗相关状态
    expect(arenaContent).toContain("showJoinConfirm");
    expect(arenaContent).toContain("确认加入");
  });

  it("should have loser-specific settlement message", () => {
    expect(arenaContent).toContain("本局失利，物品已转移给赢家");
  });

  it("should have winner-specific settlement with total item count", () => {
    expect(arenaContent).toContain("allItemCount");
    expect(arenaContent).toContain("totalRounds * maxPlayers");
  });
});
