/**
 * rateLimit.ts — 轻量级内存速率限制中间件
 * 不依赖 Redis，适合单实例部署。
 * 生产多实例部署时请替换为 Redis 实现。
 */
import type { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 时间窗口内最大请求数 */
  max: number;
  /** 超限时的错误消息 */
  message?: string;
  /** 用于生成限制 key 的函数，默认使用 IP */
  keyGenerator?: (req: Request) => string;
}

interface HitRecord {
  count: number;
  resetAt: number;
}

/**
 * 创建速率限制中间件
 */
export function createRateLimit(options: RateLimitOptions) {
  const { windowMs, max, message = "请求过于频繁，请稍后再试", keyGenerator } = options;
  const store = new Map<string, HitRecord>();

  // 定期清理过期记录，防止内存泄漏
  setInterval(() => {
    const now = Date.now();
    store.forEach((record, key) => {
      if (record.resetAt <= now) store.delete(key);
    });
  }, windowMs);

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const key = keyGenerator
      ? keyGenerator(req)
      : (req.ip || req.headers["x-forwarded-for"] || "unknown") as string;

    const now = Date.now();
    const record = store.get(key);

    if (!record || record.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: { code: "TOO_MANY_REQUESTS", message, retryAfter },
      });
    }

    return next();
  };
}

/**
 * 预设：通用 API 限制（每 IP 每分钟 600 次）
 * 注：竞技场房间页面有轮询+SSE，需要较高的限制
 */
export const generalApiLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 600,
  message: "请求过于频繁，请 1 分钟后再试",
});

/**
 * 预设：游戏操作限制（每 IP 每秒 10 次，防止脚本刷分）
 */
export const gameActionLimit = createRateLimit({
  windowMs: 1000,
  max: 10,
  message: "操作过于频繁，请稍后再试",
});

/**
 * 预设：短信验证码限制（每 IP 每 5 分钟 3 次）
 */
export const smsLimit = createRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: "验证码发送过于频繁，请 5 分钟后再试",
});

/**
 * 预设：管理员登录限制（每 IP 每 15 分钟 10 次）
 */
export const adminLoginLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "登录尝试过多，请 15 分钟后再试",
});
