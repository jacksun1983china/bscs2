import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── 游戏玩家表 ──────────────────────────────────────────────────────
export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  /** 手机号，唯一标识 */
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  /** 昵称，默认为手机号后4位 */
  nickname: varchar("nickname", { length: 100 }).notNull().default(""),
  /** 头像URL */
  avatar: varchar("avatar", { length: 500 }).notNull().default(""),
  /** VIP等级 0-7 */
  vipLevel: tinyint("vipLevel").notNull().default(0),
  /** 金币余额 */
  gold: decimal("gold", { precision: 15, scale: 2 }).notNull().default("0.00"),
  /** 钻石余额 */
  diamond: decimal("diamond", { precision: 15, scale: 2 }).notNull().default("0.00"),
  /** 累计充值金额 */
  totalRecharge: decimal("totalRecharge", { precision: 15, scale: 2 }).notNull().default("0.00"),
  /** 累计获奖金额 */
  totalWin: decimal("totalWin", { precision: 15, scale: 2 }).notNull().default("0.00"),
  /** 状态：1正常 0封禁 */
  status: tinyint("status").notNull().default(1),
  /** 封禁原因 */
  banReason: varchar("banReason", { length: 255 }).notNull().default(""),
  /** 注册IP */
  registerIp: varchar("registerIp", { length: 50 }).notNull().default(""),
  /** 最后登录时间 */
  lastLogin: timestamp("lastLogin").defaultNow(),
  /** 最后登录IP */
  lastIp: varchar("lastIp", { length: 50 }).notNull().default(""),
  /** 设备信息 */
  device: varchar("device", { length: 200 }).notNull().default(""),
  /** 邀请码 */
  inviteCode: varchar("inviteCode", { length: 20 }).notNull().default(""),
  /** 邀请人ID */
  invitedBy: int("invitedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

// ── 验证码表（模拟短信验证码） ──────────────────────────────────────
export const smsCodes = mysqlTable("smsCodes", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  /** 用途：login | register */
  purpose: varchar("purpose", { length: 20 }).notNull().default("login"),
  /** 是否已使用 */
  used: tinyint("used").notNull().default(0),
  /** 过期时间 */
  expireAt: timestamp("expireAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SmsCode = typeof smsCodes.$inferSelect;