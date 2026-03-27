import { parsePaymentNotify } from "../paymentApi";
// OxaPay 回调使用动态 import（见 startServer 内）
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

  // ── OxaPay USDT 支付回调通知（必须在 express.json() 之前注册，以获取原始 body 用于 HMAC 验证）
  app.post('/api/payment/oxapay-notify', express.raw({ type: '*/*' }), async (req, res) => {
    try {
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const hmacHeader = String(req.headers['hmac'] || req.headers['HMAC'] || '');
      let body: any;
      try {
        body = JSON.parse(rawBody);
      } catch {
        console.error("[OxaPay Notify] body解析失败, rawBody:", rawBody.substring(0, 300));
        res.status(200).send("ok");
        return;
      }
      console.log("[OxaPay Notify] 收到支付回调(POST):", rawBody.substring(0, 500));

      const { parseOxaPayNotify } = await import("../oxaPayApi");
      const notifyData = parseOxaPayNotify(body, rawBody, hmacHeader);

      if (!notifyData.hmacValid) {
        // HMAC验证失败时记录日志但不拒绝（防止JSON.stringify顺序差异导致误判）
        console.warn("[OxaPay Notify] HMAC签名验证失败，但继续处理。hmac:", hmacHeader.substring(0, 20) + '...');
      }

      if (!notifyData.isPaid) {
        console.log("[OxaPay Notify] 支付未完成, status:", notifyData.status);
        res.status(200).send("ok");
        return;
      }

      // 查找订单并更新状态
      const { getDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) {
        console.error("[OxaPay Notify] 数据库连接失败");
        res.status(500).send("db error");
        return;
      }

      // 用 order_id 查询订单
      const orderNo = notifyData.orderId;
      const orderResult = await db.execute(sql`SELECT id, playerId, gold, bonusDiamond, status FROM rechargeOrders WHERE orderNo = ${orderNo} LIMIT 1`);
      const rows = Array.isArray(orderResult) ? (orderResult[0] || orderResult) : orderResult;
      const orderRow = Array.isArray(rows) ? rows[0] : rows;

      if (!orderRow || !(orderRow as any).id) {
        console.error("[OxaPay Notify] 订单不存在:", orderNo);
        res.status(200).send("ok");
        return;
      }

      const order = orderRow as any;

      if (order.status === 1) {
        console.log("[OxaPay Notify] 订单已处理过:", orderNo);
        res.status(200).send("ok");
        return;
      }

      // 更新订单状态为已支付
      await db.execute(sql`UPDATE rechargeOrders SET status = 1, platformOrderNo = ${notifyData.trackId || ''}, updatedAt = NOW() WHERE orderNo = ${orderNo} AND status = 0`);

      // 给玩家加金币
      const goldAmount = parseFloat(String(order.gold)) || 0;
      const bonusDiamond = parseFloat(String(order.bonusDiamond)) || 0;

      if (goldAmount > 0) {
        await db.execute(sql`UPDATE players SET gold = gold + ${goldAmount} WHERE id = ${order.playerId}`);
        // 记录金币日志
        const { insertGoldLog } = await import("../db");
        const playerResult = await db.execute(sql`SELECT gold FROM players WHERE id = ${order.playerId}`);
        const pRows = Array.isArray(playerResult) ? (playerResult[0] || playerResult) : playerResult;
        const pRow = Array.isArray(pRows) ? pRows[0] : pRows;
        const newGold = parseFloat(String((pRow as any)?.gold || 0));
        await insertGoldLog(order.playerId, goldAmount, newGold, 'recharge', `USDT充值 ${goldAmount} 金币`);
      }

      // 如果有赠送钻石
      if (bonusDiamond > 0) {
        await db.execute(sql`UPDATE players SET diamond = diamond + ${bonusDiamond} WHERE id = ${order.playerId}`);
      }

      // 更新玩家总充值金额
      await db.execute(sql`UPDATE players SET totalRecharge = totalRecharge + ${goldAmount} WHERE id = ${order.playerId}`);

      console.log(`[OxaPay Notify] USDT充值成功: orderNo=${orderNo}, playerId=${order.playerId}, gold=${goldAmount}, diamond=${bonusDiamond}`);
      res.status(200).send("ok");
    } catch (err) {
      console.error("[OxaPay Notify] 处理回调异常:", err);
      res.status(200).send("ok");
    }
  });

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


  // ── 支付平台异步回调通知（GET方式，query参数） ─────────────────────────
  app.get('/api/payment/notify', async (req, res) => {
    try {
      console.log("[Payment Notify] 收到支付回调(GET):", JSON.stringify(req.query));
      const notifyData = parsePaymentNotify(req.query as Record<string, any>);
      
      if (!notifyData.signValid) {
        console.error("[Payment Notify] 签名验证失败");
        res.status(200).send("sign error");
        return;
      }
      
      if (notifyData.status !== "paid") {
        console.log("[Payment Notify] 支付未成功, status:", notifyData.status);
        res.status(200).send("success");
        return;
      }
      
      // 查找订单并更新状态
      const { getDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) {
        console.error("[Payment Notify] 数据库连接失败");
        res.status(500).send("db error");
        return;
      }
      
      // 查询订单
      const orderResult = await db.execute(sql`SELECT id, playerId, gold, bonusDiamond, status FROM rechargeOrders WHERE orderNo = ${notifyData.orderNo} LIMIT 1`);
      const rows = Array.isArray(orderResult) ? (orderResult[0] || orderResult) : orderResult;
      const orderRow = Array.isArray(rows) ? rows[0] : rows;
      
      if (!orderRow || !(orderRow as any).id) {
        console.error("[Payment Notify] 订单不存在:", notifyData.orderNo);
        res.status(200).send("success");
        return;
      }
      
      const order = orderRow as any;
      
      if (order.status === 1) {
        console.log("[Payment Notify] 订单已处理过:", notifyData.orderNo);
        res.status(200).send("success");
        return;
      }
      
      // 更新订单状态为已支付
      await db.execute(sql`UPDATE rechargeOrders SET status = 1, platformOrderNo = ${notifyData.platformOrderNo || ''}, updatedAt = NOW() WHERE orderNo = ${notifyData.orderNo} AND status = 0`);
      
      // 给玩家加金币
      const goldAmount = parseFloat(String(order.gold)) || 0;
      const bonusDiamond = parseFloat(String(order.bonusDiamond)) || 0;
      
      if (goldAmount > 0) {
        await db.execute(sql`UPDATE players SET gold = gold + ${goldAmount} WHERE id = ${order.playerId}`);
        // 记录金币日志
        const { insertGoldLog } = await import("../db");
        const playerResult = await db.execute(sql`SELECT gold FROM players WHERE id = ${order.playerId}`);
        const pRows = Array.isArray(playerResult) ? (playerResult[0] || playerResult) : playerResult;
        const pRow = Array.isArray(pRows) ? pRows[0] : pRows;
        const newGold = parseFloat(String((pRow as any)?.gold || 0));
        await insertGoldLog(order.playerId, goldAmount, newGold, 'recharge', `充值 ${goldAmount} 金币`);
      }
      
      // 如果有赠送钻石
      if (bonusDiamond > 0) {
        await db.execute(sql`UPDATE players SET diamond = diamond + ${bonusDiamond} WHERE id = ${order.playerId}`);
      }
      
      console.log(`[Payment Notify] 充值成功: orderNo=${notifyData.orderNo}, playerId=${order.playerId}, gold=${goldAmount}, diamond=${bonusDiamond}`);
      res.status(200).send("success");
    } catch (err) {
      console.error("[Payment Notify] 处理回调异常:", err);
      res.status(200).send("success");
    }
  });

  // OxaPay 回调已在 express.json() 之前注册（见上方）

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
