import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertPlayer, InsertUser, players, smsCodes, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ── 验证码操作 ────────────────────────────────────────────────────

/** 生成并保存验证码（模拟：固定返回 123456，方便测试） */
export async function createSmsCode(phone: string, purpose: string = "login"): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  const code = "123456"; // 模拟验证码，后续接短信API时替换
  const expireAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.update(smsCodes).set({ used: 1 })
    .where(and(eq(smsCodes.phone, phone), eq(smsCodes.purpose, purpose), eq(smsCodes.used, 0)));
  await db.insert(smsCodes).values({ phone, code, purpose, expireAt });
  return code;
}

/** 验证验证码是否有效 */
export async function verifySmsCode(phone: string, code: string, purpose: string = "login"): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  const now = new Date();
  const result = await db.select().from(smsCodes).where(
    and(eq(smsCodes.phone, phone), eq(smsCodes.code, code), eq(smsCodes.purpose, purpose), eq(smsCodes.used, 0))
  ).limit(1);
  if (result.length === 0) return false;
  const record = result[0]!;
  if (record.expireAt < now) return false;
  await db.update(smsCodes).set({ used: 1 }).where(eq(smsCodes.id, record.id));
  return true;
}

// ── 玩家操作 ────────────────────────────────────────────────────

export async function getPlayerByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(players).where(eq(players.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPlayerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(players).where(eq(players.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPlayer(data: InsertPlayer) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  const result = await db.insert(players).values(data);
  const insertId = (result as any)[0]?.insertId ?? 0;
  return getPlayerById(insertId);
}

export async function updatePlayerLogin(id: number, ip: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(players).set({ lastLogin: new Date(), lastIp: ip }).where(eq(players.id, id));
}

export async function getPlayerList(opts: {
  page: number; limit: number; keyword?: string; status?: number; vipLevel?: number;
}) {
  const db = await getDb();
  if (!db) return { list: [], total: 0 };
  const { page, limit, keyword, status, vipLevel } = opts;
  const offset = (page - 1) * limit;
  const conditions: any[] = [];
  if (keyword) conditions.push(or(like(players.phone, `%${keyword}%`), like(players.nickname, `%${keyword}%`)));
  if (status !== undefined) conditions.push(eq(players.status, status));
  if (vipLevel !== undefined) conditions.push(eq(players.vipLevel, vipLevel));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const [list, countResult] = await Promise.all([
    db.select().from(players).where(whereClause).orderBy(desc(players.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(players).where(whereClause),
  ]);
  return { list, total: Number(countResult[0]?.count ?? 0) };
}

export async function updatePlayerStatus(id: number, status: number, banReason: string = "") {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  await db.update(players).set({ status, banReason }).where(eq(players.id, id));
}
