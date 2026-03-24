import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initArenaWs } from "../arenaWs";
import { initArenaSSE } from "../arenaSSE";
import { startBotLoop } from "../arenaBot";
import { startArenaTimeoutWatcher } from "../arenaTimeout";
import { autoSpinAllRounds } from "../arenaRouter";
import { getDb } from "../db";
import { arenaRooms } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { generalApiLimit, gameActionLimit, smsLimit, adminLoginLimit } from "./rateLimit";
import { startSyncScheduler } from "../cs2pifaApi";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // 速率限制中间件
  // 游戏操作接口：每 IP 每秒 60 次（防止脚本刷分）
  app.use("/api/trpc/game.", gameActionLimit);
  app.use("/api/trpc/rush.", gameActionLimit);
  app.use("/api/trpc/vortex.", gameActionLimit);
  app.use("/api/trpc/rollx.", gameActionLimit);
  app.use("/api/trpc/dingdong.", gameActionLimit);
  app.use("/api/trpc/fruitBomb.", gameActionLimit);
  // 短信接口：每 IP 每 5 分钟 3 次
  app.use("/api/trpc/player.sendSmsCode", smsLimit);
  // 管理员登录：每 IP 每 15 分钟 10 次
  app.use("/api/trpc/admin.login", adminLoginLimit);
  // 通用 API 限制：每 IP 每分钟 3000 次
  app.use("/api/trpc", generalApiLimit);

  // 专用退出登录路由（GET请求，浏览器直接导航，确保iOS Safari兼容）
  app.get('/api/logout', (req, res) => {
    // 直接用原始 Set-Cookie 头来过期 cookie，覆盖所有可能的属性组合
    // 这比 Express 的 clearCookie 更可靠，因为 clearCookie 需要属性完全匹配
    const expireDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
    const cookieHeaders = [
      // 匹配 HTTPS 设置的 cookie（secure + sameSite=none）
      `bdcs2_player_token=; Path=/; Expires=${expireDate}; HttpOnly; Secure; SameSite=None`,
      // 匹配 HTTP 设置的 cookie（sameSite=lax）
      `bdcs2_player_token=; Path=/; Expires=${expireDate}; HttpOnly; SameSite=Lax`,
      // 最简单的形式（兜底）
      `bdcs2_player_token=; Path=/; Expires=${expireDate}; HttpOnly`,
      // 不带 HttpOnly 的形式（以防万一）
      `bdcs2_player_token=; Path=/; Expires=${expireDate}`,
      // Max-Age=0 形式（某些浏览器更认这个）
      `bdcs2_player_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`,
      `bdcs2_player_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
      `bdcs2_player_token=; Path=/; Max-Age=0; HttpOnly`,
    ];
    res.setHeader('Set-Cookie', cookieHeaders);
    // 不用302重定向，直接返回一个简单的HTML页面来跳转
    // 这样确保浏览器先处理完 Set-Cookie 头，再进行跳转
    res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>document.cookie='bdcs2_player_token=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';document.cookie='bdcs2_player_token=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT;secure;samesite=none';window.location.replace('/login?logout=1');</script></head><body></body></html>`);
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // 挂载竞技场 SSE 服务（在静态文件之前）
  initArenaSSE(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // 挂载竞技场 WebSocket 服务
  initArenaWs(server);

  // 启动竞技场机器人自动填充服务
  startBotLoop();

  // 启动竞技场房间超时自动关闭（10分钟无人满员则退款关闭）
  startArenaTimeoutWatcher();

  // 服务器启动时恢复所有进行中的竞技场游戏
  // 防止服务器重启导致 autoSpinAllRounds 任务丢失
  setTimeout(async () => {
    try {
      const db = await getDb();
      if (!db) return;
      const playingRooms = await db
        .select({ id: arenaRooms.id })
        .from(arenaRooms)
        .where(eq(arenaRooms.status, 'playing'));
      if (playingRooms.length > 0) {
        console.log(`[Arena] Recovering ${playingRooms.length} playing room(s) after server restart...`);
        for (const room of playingRooms) {
          autoSpinAllRounds(room.id).catch((err) => {
            console.error(`[Arena] Failed to recover room ${room.id}:`, err);
          });
        }
      }
    } catch (err) {
      console.error('[Arena] Error recovering playing rooms:', err);
    }
  }, 2000); // 延迟2秒，等待SSE服务完全就绪

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // 启动cs2pifa商品数据定时同步
    startSyncScheduler();
  });
}

startServer().catch(console.error);
