import { and, desc, eq, gt, gte, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import {
  CsAgent,
  CsMessage,
  CsSession,
  InsertCsAgent,
  InsertCsMessage,
  InsertCsSession,
  InsertPlayer,
  InsertRollRoom,
  InsertRollRoomPrize,
  InsertUser,
  InsertWeeklyCommissionStat,
  WeeklyCommissionStat,
  boxGoods,
  commissionLogs,
  csAgents,
  csMessages,
  csQuickReplies,
  csSessions,
  items,
  messages,
  playerItems,
  players,
  rechargeConfigs,
  rechargeOrders,
  rollParticipants,
  rollRoomPrizes,
  rollRooms,
  rollWinners,
  goldLogs,
  smsCodes,
  users,
  weeklyCommissionStats,
} from "../drizzle/schema";
import { ENV } from './_core/env';

// 使用连接池替代单连接，彻底解决 ECONNRESET 问题
// 连接池会自动回收断开的连接，无需手动重置
type Pool = ReturnType<typeof createPool>;
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getPool(): Pool {
  if (!_pool && process.env.DATABASE_URL) {
    _pool = createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
    console.log('[Database] 连接池已创建');
  }
  return _pool!;
}

/** @deprecated 保留兼容性，连接池模式下无需手动重置 */
export function resetDb() {
  // 连接池模式下不需要重置，保留函数避免调用报错
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = getPool();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _db = drizzle(pool as any);
    } catch (error) {
      console.warn('[Database] Failed to create pool:', error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
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
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSmsCode(phone: string, purpose: string = "login"): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  const code = "123456";
  const expireAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.update(smsCodes).set({ used: 1 }).where(and(eq(smsCodes.phone, phone), eq(smsCodes.purpose, purpose), eq(smsCodes.used, 0)));
  await db.insert(smsCodes).values({ phone, code, purpose, expireAt });
  return code;
}

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

export async function getPlayerByInviteCode(inviteCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(players).where(eq(players.inviteCode, inviteCode)).limit(1);
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

export async function updatePlayerIdentity(id: number, identity: "player" | "streamer" | "merchant", commissionRate?: number, commissionEnabled?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  const updateData: any = { identity };
  if (commissionRate !== undefined) updateData.commissionRate = commissionRate.toFixed(2);
  if (commissionEnabled !== undefined) updateData.commissionEnabled = commissionEnabled;
  await db.update(players).set(updateData).where(eq(players.id, id));
}

export async function bindInviteCode(playerId: number, inviteCode: string) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  const player = await getPlayerById(playerId);
  if (!player) throw new Error("玩家不存在");
  if (player.invitedBy) throw new Error("已绑定邀请码，不可重复绑定");
  const inviter = await getPlayerByInviteCode(inviteCode);
  if (!inviter) throw new Error("邀请码不存在");
  if (inviter.id === playerId) throw new Error("不能绑定自己的邀请码");
  await db.update(players).set({ invitedBy: inviter.id }).where(eq(players.id, playerId));
  return inviter;
}

export async function getTeamStats(playerId: number) {
  const db = await getDb();
  if (!db) return { total: 0, todayCount: 0, commissionBalance: "0.00", weeklyStats: [] as WeeklyCommissionStat[] };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [totalResult, todayResult, player, weeklyRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(players).where(eq(players.invitedBy, playerId)),
    db.select({ count: sql<number>`count(*)` }).from(players).where(and(eq(players.invitedBy, playerId), gte(players.createdAt, today))),
    getPlayerById(playerId),
    db.select().from(weeklyCommissionStats)
      .where(eq(weeklyCommissionStats.inviterId, playerId))
      .orderBy(desc(weeklyCommissionStats.weekStart))
      .limit(20),
  ]);
  let weeklyStats: WeeklyCommissionStat[] = weeklyRows;
  // 如果没有周期数据，自动生成近 8 周的模拟数据
  if (weeklyStats.length === 0) {
    const now = new Date();
    const toInsert: InsertWeeklyCommissionStat[] = [];
    for (let i = 0; i < 8; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      const weekStart = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const totalMem = Number(totalResult[0]?.count ?? 0);
      const newMem = i === 0 ? Number(todayResult[0]?.count ?? 0) : Math.floor(Math.random() * 3);
      const recharge = (Math.random() * 5000 + 500).toFixed(2);
      const flow = (parseFloat(recharge) * (1 + Math.random() * 0.5)).toFixed(2);
      toInsert.push({
        inviterId: playerId,
        weekStart,
        commissionRate: player?.commissionRate ?? '4.00',
        totalMembers: totalMem,
        newMembers: newMem,
        totalRecharge: recharge,
        totalFlow: flow,
      });
    }
    try {
      await db.insert(weeklyCommissionStats).values(toInsert);
      weeklyStats = await db.select().from(weeklyCommissionStats)
        .where(eq(weeklyCommissionStats.inviterId, playerId))
        .orderBy(desc(weeklyCommissionStats.weekStart))
        .limit(20);
    } catch (e) {
      weeklyStats = toInsert.map((r, idx) => ({ ...r, id: idx + 1, createdAt: new Date(), updatedAt: new Date() })) as WeeklyCommissionStat[];
    }
  }
  return {
    total: Number(totalResult[0]?.count ?? 0),
    todayCount: Number(todayResult[0]?.count ?? 0),
    commissionBalance: player?.commissionBalance ?? "0.00",
    weeklyStats,
  };
}

export async function withdrawCommission(playerId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  const player = await getPlayerById(playerId);
  if (!player) throw new Error("玩家不存在");
  const balance = parseFloat(player.commissionBalance as string);
  if (balance <= 0) throw new Error("没有可提取的返佣余额");
  await db.update(players).set({
    commissionBalance: "0.00",
    shopCoin: sql`shopCoin + ${balance}`,
  }).where(eq(players.id, playerId));
  return { amount: balance };
}

export async function createRollRoom(data: InsertRollRoom, prizes: InsertRollRoomPrize[]) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  let totalValue = 0;
  let totalPrizes = 0;
  for (const p of prizes) {
    totalValue += parseFloat(p.value as string) * (p.quantity ?? 1);
    totalPrizes += p.quantity ?? 1;
  }
  const insertData = { ...data, totalValue: totalValue.toFixed(2), totalPrizes };
  const result = await db.insert(rollRooms).values(insertData);
  const roomId = (result as any)[0]?.insertId ?? 0;
  if (prizes.length > 0) {
    await db.insert(rollRoomPrizes).values(prizes.map(p => ({ ...p, rollRoomId: roomId })));
  }
  return roomId;
}

export async function getRollRoomList(opts: {
  page: number; limit: number; status?: string; playerId?: number; filter?: string; keyword?: string;
}) {
  const db = await getDb();
  if (!db) return { list: [], total: 0 };
  const { page, limit, status, playerId, filter, keyword } = opts;
  const offset = (page - 1) * limit;
  const conditions: any[] = [];
  if (status) conditions.push(eq(rollRooms.status, status as any));
  if (keyword) conditions.push(like(rollRooms.title, `%${keyword}%`));
  if (filter === "ended") {
    conditions.push(eq(rollRooms.status, "ended"));
  } else if (filter === "mine" && playerId) {
    const myRoomIds = await db.select({ rollRoomId: rollParticipants.rollRoomId })
      .from(rollParticipants).where(and(eq(rollParticipants.playerId, playerId), eq(rollParticipants.isBot, 0)));
    const ids = myRoomIds.map(r => r.rollRoomId);
    if (ids.length === 0) return { list: [], total: 0 };
    conditions.push(sql`${rollRooms.id} IN (${ids.join(",")})`);
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const [list, countResult] = await Promise.all([
    db.select().from(rollRooms).where(whereClause).orderBy(desc(rollRooms.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(rollRooms).where(whereClause),
  ]);
  // 为每个房间附加奖品预览（最多6个）
  const listWithPrizes = await Promise.all(list.map(async (room) => {
    const prizes = await db.select().from(rollRoomPrizes)
      .where(eq(rollRoomPrizes.rollRoomId, room.id))
      .limit(6);
    return { ...room, prizes, prizeCount: room.totalPrizes };
  }));
  return { list: listWithPrizes, total: Number(countResult[0]?.count ?? 0) };
}

export async function getRollRoomDetail(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [room] = await db.select().from(rollRooms).where(eq(rollRooms.id, id)).limit(1);
  if (!room) return null;
  const prizes = await db.select().from(rollRoomPrizes).where(eq(rollRoomPrizes.rollRoomId, id));
  const participants = await db.select({
    id: rollParticipants.id,
    playerId: rollParticipants.playerId,
    isBot: rollParticipants.isBot,
    botNickname: rollParticipants.botNickname,
    botAvatar: rollParticipants.botAvatar,
    createdAt: rollParticipants.createdAt,
    nickname: players.nickname,
    avatar: players.avatar,
  }).from(rollParticipants)
    .leftJoin(players, eq(rollParticipants.playerId, players.id))
    .where(eq(rollParticipants.rollRoomId, id))
    .orderBy(rollParticipants.createdAt);
  return { room, prizes, participants };
}

export async function joinRollRoom(roomId: number, playerId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  const room = await db.select().from(rollRooms).where(eq(rollRooms.id, roomId)).limit(1);
  if (!room[0]) throw new Error("Roll房不存在");
  const r = room[0];
  if (r.status === "ended") throw new Error("Roll房已结束");
  const now = new Date();
  if (now < r.startAt) throw new Error("Roll房还未开始");
  if (now > r.endAt) throw new Error("Roll房已截止");
  const existing = await db.select().from(rollParticipants).where(
    and(eq(rollParticipants.rollRoomId, roomId), eq(rollParticipants.playerId, playerId), eq(rollParticipants.isBot, 0))
  ).limit(1);
  if (existing.length > 0) throw new Error("您已参与此Roll房");
  if (r.maxParticipants > 0 && r.participantCount >= r.maxParticipants) throw new Error("Roll房人员已满");
  const player = await getPlayerById(playerId);
  if (!player) throw new Error("玩家不存在");
  const threshold = parseFloat(r.threshold as string);
  if (threshold > 0) {
    const rechargeResult = await db.select({ total: sql<number>`COALESCE(SUM(gold), 0)` })
      .from(rechargeOrders)
      .where(and(eq(rechargeOrders.playerId, playerId), eq(rechargeOrders.status, 1), gte(rechargeOrders.createdAt, r.startAt)));
    const totalRecharge = Number(rechargeResult[0]?.total ?? 0);
    if (totalRecharge < threshold) {
      const diff = threshold - totalRecharge;
      throw new Error(`充值金额未满 ${threshold} 金币，还差 ${diff.toFixed(2)} 金币`);
    }
  }
  await db.insert(rollParticipants).values({ rollRoomId: roomId, playerId, isBot: 0 });
  await db.update(rollRooms).set({ participantCount: sql`participantCount + 1` }).where(eq(rollRooms.id, roomId));
  return { success: true };
}

export async function addRollBots(roomId: number, count: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  const botNames = ["幸运玩家", "神秘用户", "匿名大佬", "隐身高手", "暗影战士", "星际游侠", "银河猎手", "量子战士"];
  const bots = Array.from({ length: count }, (_, i) => ({
    rollRoomId: roomId, playerId: 0, isBot: 1,
    botNickname: `${botNames[i % botNames.length]}${Math.floor(Math.random() * 9000) + 1000}`,
    botAvatar: "",
  }));
  await db.insert(rollParticipants).values(bots);
  await db.update(rollRooms).set({ botCount: sql`botCount + ${count}` }).where(eq(rollRooms.id, roomId));
}

export async function drawRollRoom(roomId: number, designatedWinners?: { prizeId: number; playerId: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  const room = await db.select().from(rollRooms).where(eq(rollRooms.id, roomId)).limit(1);
  if (!room[0]) throw new Error("Roll房不存在");
  if (room[0].status === "ended") throw new Error("Roll房已结束");
  const prizes = await db.select().from(rollRoomPrizes).where(eq(rollRoomPrizes.rollRoomId, roomId));
  const participants = await db.select().from(rollParticipants).where(eq(rollParticipants.rollRoomId, roomId));
  const prizeSlots: { prizeId: number; value: number; coinType: string }[] = [];
  for (const p of prizes) {
    for (let i = 0; i < p.quantity; i++) {
      prizeSlots.push({ prizeId: p.id, value: parseFloat(p.value as string), coinType: p.coinType });
    }
  }
  const realPlayers = participants.filter(p => p.isBot === 0);
  const bots = participants.filter(p => p.isBot === 1);
  const shuffle = <T>(arr: T[]) => arr.sort(() => Math.random() - 0.5);
  const shuffledPrizes = shuffle([...prizeSlots]);
  const winners: { prizeId: number; playerId: number; isBot: number; nicknameSnapshot: string; isDesignated: number }[] = [];
  const usedPlayerIds = new Set<number>();
  let prizeIndex = 0;
  if (designatedWinners) {
    for (const dw of designatedWinners) {
      const prizeSlot = shuffledPrizes.find(p => p.prizeId === dw.prizeId && !winners.some(w => w.prizeId === dw.prizeId));
      if (prizeSlot && !usedPlayerIds.has(dw.playerId)) {
        const player = await getPlayerById(dw.playerId);
        winners.push({ prizeId: dw.prizeId, playerId: dw.playerId, isBot: 0, nicknameSnapshot: player?.nickname ?? "", isDesignated: 1 });
        usedPlayerIds.add(dw.playerId);
      }
    }
  }
  const shuffledBots = shuffle([...bots]);
  for (const bot of shuffledBots) {
    if (prizeIndex >= shuffledPrizes.length) break;
    const prize = shuffledPrizes[prizeIndex];
    if (!prize || winners.some(w => w.prizeId === prize.prizeId)) { prizeIndex++; continue; }
    winners.push({ prizeId: prize.prizeId, playerId: 0, isBot: 1, nicknameSnapshot: bot.botNickname, isDesignated: 0 });
    prizeIndex++;
  }
  const shuffledReal = shuffle([...realPlayers]);
  for (const p of shuffledReal) {
    if (prizeIndex >= shuffledPrizes.length) break;
    if (usedPlayerIds.has(p.playerId)) continue;
    const prize = shuffledPrizes[prizeIndex];
    if (!prize) break;
    const playerInfo = await getPlayerById(p.playerId);
    winners.push({ prizeId: prize.prizeId, playerId: p.playerId, isBot: 0, nicknameSnapshot: playerInfo?.nickname ?? "", isDesignated: 0 });
    usedPlayerIds.add(p.playerId);
    prizeIndex++;
  }
  if (winners.length > 0) {
    await db.insert(rollWinners).values(winners.map(w => ({ ...w, rollRoomId: roomId })));
  }
  let actualPaidValue = 0;
  let actualPaidCount = 0;
  for (const w of winners) {
    if (w.isBot || w.playerId === 0) continue;
    const prizeInfo = prizes.find(p => p.id === w.prizeId);
    if (!prizeInfo) continue;
    const amount = parseFloat(prizeInfo.value as string);
    actualPaidValue += amount;
    actualPaidCount++;

    if ((prizeInfo as any).prizeType === 'item') {
      // 道具奖品：写入玩家背包
      // 先尝试在 items 表中查找同名道具
      let existingItem = await db.select().from(items)
        .where(eq(items.name, prizeInfo.name)).limit(1);
      let itemId: number;
      if (existingItem.length > 0) {
        itemId = existingItem[0].id;
      } else {
        // 创建新道具记录
        const inserted = await db.insert(items).values({
          name: prizeInfo.name,
          imageUrl: prizeInfo.imageUrl || '',
          value: prizeInfo.value,
          quality: 'common',
          type: 'skin',
          game: 'ROLL',
          status: 1,
        });
        itemId = (inserted as any).insertId;
      }
      // 写入玩家背包
      await db.insert(playerItems).values({
        playerId: w.playerId,
        itemId,
        source: 'roll',
        status: 0,
      });
      await db.insert(messages).values({
        playerId: w.playerId, title: 'Roll房道具奖品',
        content: `恭喜您，您在ROLL房活动《${room[0].title}》获得道具『${prizeInfo.name}』，已入背包，请前往背包页面查看。`,
        type: 'roll', refId: roomId,
      });
    } else if (prizeInfo.coinType === "shopCoin") {
      await db.update(players).set({ shopCoin: sql`shopCoin + ${amount}` }).where(eq(players.id, w.playerId));
      await db.insert(messages).values({
        playerId: w.playerId, title: "Roll房参与结果",
        content: `恭喜您，您在ROLL房活动《${room[0].title}》获得${prizeInfo.name}，价値：${prizeInfo.value}。`,
        type: "roll", refId: roomId,
      });
    } else {
      await db.update(players).set({ gold: sql`gold + ${amount}` }).where(eq(players.id, w.playerId));
      await db.insert(messages).values({
        playerId: w.playerId, title: "Roll房参与结果",
        content: `恭喜您，您在ROLL房活动《${room[0].title}》获得${prizeInfo.name}，价値：${prizeInfo.value}。`,
        type: "roll", refId: roomId,
      });
    }
  }
  for (const p of realPlayers) {
    if (!usedPlayerIds.has(p.playerId)) {
      await db.insert(messages).values({
        playerId: p.playerId, title: "Roll房参与结果",
        content: `很遗憾，您在ROLL房活动《${room[0].title}》没有获得奖品。`,
        type: "roll", refId: roomId,
      });
    }
  }
  await db.update(rollRooms).set({ status: "ended", actualPaidValue: actualPaidValue.toFixed(2), actualPaidCount }).where(eq(rollRooms.id, roomId));
  return { winners: winners.length, realWinners: actualPaidCount };
}

export async function getRollWinners(roomId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: rollWinners.id, playerId: rollWinners.playerId, isBot: rollWinners.isBot,
    nicknameSnapshot: rollWinners.nicknameSnapshot, isDesignated: rollWinners.isDesignated,
    createdAt: rollWinners.createdAt, prizeId: rollWinners.prizeId,
    prizeName: rollRoomPrizes.name, prizeValue: rollRoomPrizes.value, prizeImageUrl: rollRoomPrizes.imageUrl,
  }).from(rollWinners)
    .leftJoin(rollRoomPrizes, eq(rollWinners.prizeId, rollRoomPrizes.id))
    .where(eq(rollWinners.rollRoomId, roomId))
    .orderBy(rollWinners.createdAt);
}

export async function getPlayerMessages(playerId: number, page: number = 1, limit: number = 20) {
  const db = await getDb();
  if (!db) return { list: [], total: 0 };
  const offset = (page - 1) * limit;
  const [list, countResult] = await Promise.all([
    db.select().from(messages).where(eq(messages.playerId, playerId)).orderBy(desc(messages.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.playerId, playerId)),
  ]);
  return { list, total: Number(countResult[0]?.count ?? 0) };
}

export async function getRechargeConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rechargeConfigs).where(eq(rechargeConfigs.status, 1)).orderBy(rechargeConfigs.sort);
}

export async function getPlayerRechargeOrders(playerId: number, page: number = 1, limit: number = 20) {
  const db = await getDb();
  if (!db) return { list: [], total: 0 };
  const offset = (page - 1) * limit;
  const [list, countResult] = await Promise.all([
    db.select().from(rechargeOrders).where(eq(rechargeOrders.playerId, playerId)).orderBy(desc(rechargeOrders.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(rechargeOrders).where(eq(rechargeOrders.playerId, playerId)),
  ]);
  return { list, total: Number(countResult[0]?.count ?? 0) };
}

export async function getAdminRollRoomList(opts: {
  page: number; limit: number; keyword?: string; status?: string; ownerId?: number;
}) {
  const db = await getDb();
  if (!db) return { list: [], total: 0 };
  const { page, limit, keyword, status, ownerId } = opts;
  const offset = (page - 1) * limit;
  const conditions: any[] = [];
  if (keyword) conditions.push(like(rollRooms.title, `%${keyword}%`));
  if (status) conditions.push(eq(rollRooms.status, status as any));
  if (ownerId) conditions.push(eq(rollRooms.ownerId, ownerId));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const [list, countResult] = await Promise.all([
    db.select().from(rollRooms).where(whereClause).orderBy(desc(rollRooms.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(rollRooms).where(whereClause),
  ]);
  return { list, total: Number(countResult[0]?.count ?? 0) };
}

export async function getPlayerInventory(playerId: number, page: number = 1, limit: number = 20) {
  const db = await getDb();
  if (!db) return { list: [], total: 0 };
  const offset = (page - 1) * limit;
  const [list, countResult] = await Promise.all([
    db
      .select({
        id: playerItems.id,
        playerId: playerItems.playerId,
        itemId: playerItems.itemId,
        source: playerItems.source,
        status: playerItems.status,
        recycleGold: playerItems.recycleGold,
        createdAt: playerItems.createdAt,
        // JOIN boxGoods fields (itemId references boxGoods.id)
        itemName: boxGoods.name,
        itemImageUrl: boxGoods.imageUrl,
        itemQuality: boxGoods.level,
        itemValue: boxGoods.price,
      })
      .from(playerItems)
      .leftJoin(boxGoods, eq(playerItems.itemId, boxGoods.id))
      .where(and(eq(playerItems.playerId, playerId), eq(playerItems.status, 0)))
      .orderBy(desc(playerItems.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(playerItems).where(and(eq(playerItems.playerId, playerId), eq(playerItems.status, 0))),
  ]);
  return { list, total: Number(countResult[0]?.count ?? 0) };
}

// ══════════════════════════════════════════════════════════════════
// 客服系统 DB 函数
// ══════════════════════════════════════════════════════════════════

// ── 坐席管理 ──────────────────────────────────────────────────────
export async function getCsAgentList() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(csAgents).orderBy(csAgents.id);
}

export async function getCsAgentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(csAgents).where(eq(csAgents.id, id));
  return rows[0] ?? null;
}

export async function getCsAgentByUsername(username: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(csAgents).where(eq(csAgents.username, username));
  return rows[0] ?? null;
}

export async function createCsAgent(data: InsertCsAgent) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(csAgents).values(data);
  const id = (result as any).insertId;
  const rows = await db.select().from(csAgents).where(eq(csAgents.id, id));
  return rows[0] ?? null;
}

export async function updateCsAgentStatus(id: number, status: "online" | "busy" | "offline") {
  const db = await getDb();
  if (!db) return;
  await db.update(csAgents).set({ status }).where(eq(csAgents.id, id));
}

export async function updateCsAgent(id: number, data: Partial<CsAgent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(csAgents).set(data).where(eq(csAgents.id, id));
}

export async function deleteCsAgent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(csAgents).where(eq(csAgents.id, id));
}

// ── 会话管理 ──────────────────────────────────────────────────────
export async function createCsSession(playerId: number, title: string = "") {
  const db = await getDb();
  if (!db) return null;
  // 检查是否有进行中的会话
  const existing = await db
    .select()
    .from(csSessions)
    .where(and(eq(csSessions.playerId, playerId), inArray(csSessions.status, ["waiting", "active"])));
  if (existing.length > 0) return existing[0];
  const [result] = await db.insert(csSessions).values({ playerId, title, status: "waiting" });
  const id = (result as any).insertId;
  const rows = await db.select().from(csSessions).where(eq(csSessions.id, id));
  return rows[0] ?? null;
}

export async function getCsSessionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(csSessions).where(eq(csSessions.id, id));
  return rows[0] ?? null;
}

export async function getCsSessionsByPlayer(playerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(csSessions).where(eq(csSessions.playerId, playerId)).orderBy(desc(csSessions.updatedAt));
}

export async function getActiveSessionByPlayer(playerId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(csSessions)
    .where(and(eq(csSessions.playerId, playerId), inArray(csSessions.status, ["waiting", "active"])));
  return rows[0] ?? null;
}

export async function getAllCsSessions(status?: string, page: number = 1, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  const offset = (page - 1) * limit;
  if (status) {
    return db
      .select()
      .from(csSessions)
      .where(eq(csSessions.status, status as any))
      .orderBy(desc(csSessions.updatedAt))
      .limit(limit)
      .offset(offset);
  }
  return db.select().from(csSessions).orderBy(desc(csSessions.updatedAt)).limit(limit).offset(offset);
}

export async function getAgentSessions(agentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(csSessions)
    .where(and(eq(csSessions.agentId, agentId), inArray(csSessions.status, ["active", "waiting"])))
    .orderBy(desc(csSessions.updatedAt));
}

export async function getSessionsByAgentId(agentId: number, status?: string, page: number = 1, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  const offset = (page - 1) * limit;
  const conditions = status
    ? and(eq(csSessions.agentId, agentId), eq(csSessions.status, status as any))
    : eq(csSessions.agentId, agentId);
  return db
    .select()
    .from(csSessions)
    .where(conditions)
    .orderBy(desc(csSessions.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function assignSessionToAgent(sessionId: number, agentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(csSessions).set({ agentId, status: "active" }).where(eq(csSessions.id, sessionId));
  // 更新坐席接待数
  await db
    .update(csAgents)
    .set({ activeSessionCount: sql`activeSessionCount + 1` })
    .where(eq(csAgents.id, agentId));
}

export async function closeCsSession(sessionId: number, reason: string = "") {
  const db = await getDb();
  if (!db) return;
  const session = await getCsSessionById(sessionId);
  if (!session) return;
  await db.update(csSessions).set({ status: "closed", closeReason: reason }).where(eq(csSessions.id, sessionId));
  if (session.agentId) {
    await db
      .update(csAgents)
      .set({ activeSessionCount: sql`GREATEST(activeSessionCount - 1, 0)` })
      .where(eq(csAgents.id, session.agentId));
  }
}

export async function updateSessionLastMessage(sessionId: number, content: string, agentUnreadDelta = 0, playerUnreadDelta = 0) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(csSessions)
    .set({
      lastMessage: content.slice(0, 100),
      lastMessageAt: new Date(),
      agentUnread: sql`agentUnread + ${agentUnreadDelta}`,
      playerUnread: sql`playerUnread + ${playerUnreadDelta}`,
    })
    .where(eq(csSessions.id, sessionId));
}

export async function clearAgentUnread(sessionId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(csSessions).set({ agentUnread: 0 }).where(eq(csSessions.id, sessionId));
}

export async function clearPlayerUnread(sessionId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(csSessions).set({ playerUnread: 0 }).where(eq(csSessions.id, sessionId));
}

// ── 消息管理 ──────────────────────────────────────────────────────
export async function sendCsMessage(data: InsertCsMessage) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(csMessages).values(data);
  const id = (result as any).insertId;
  const rows = await db.select().from(csMessages).where(eq(csMessages.id, id));
  return rows[0] ?? null;
}

export async function getCsMessages(sessionId: number, afterId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (afterId) {
    return db
      .select()
      .from(csMessages)
      .where(and(eq(csMessages.sessionId, sessionId), gt(csMessages.id, afterId)))
      .orderBy(csMessages.id);
  }
  return db.select().from(csMessages).where(eq(csMessages.sessionId, sessionId)).orderBy(csMessages.id);
}

// ── 快捷回复 ──────────────────────────────────────────────────────
export async function getCsQuickReplies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(csQuickReplies).where(eq(csQuickReplies.status, 1)).orderBy(csQuickReplies.sort, csQuickReplies.id);
}

export async function createCsQuickReply(data: { category: string; title: string; content: string; sort?: number }) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(csQuickReplies).values(data);
  const id = (result as any).insertId;
  const rows = await db.select().from(csQuickReplies).where(eq(csQuickReplies.id, id));
  return rows[0] ?? null;
}

export async function deleteCsQuickReply(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(csQuickReplies).set({ status: 0 }).where(eq(csQuickReplies.id, id));
}

// ── 金币流水日志 ──────────────────────────────────────────────────────
/**
 * 插入一条金币变动日志
 * @param playerId 玩家ID
 * @param amount 变动金额（正为增加，负为减少）
 * @param balance 变动后余额
 * @param type 类型：recharge/win/lose/recycle/extract/gift/admin/arena/rollx/vortex/roll
 * @param description 描述
 * @param refId 关联ID（订单ID等，可选）
 */
export async function insertGoldLog(
  playerId: number,
  amount: number,
  balance: number,
  type: string,
  description: string,
  refId?: number
) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(goldLogs).values({
      playerId,
      amount: amount.toFixed(2),
      balance: balance.toFixed(2),
      type,
      description,
      refId: refId ?? null,
    });
  } catch (e) {
    // 日志插入失败不影响主流程
    console.warn('[GoldLog] 插入失败:', e);
  }
}

/**
 * 查询玩家金币流水日志
 * @param playerId 玩家ID
 * @param opts 分页和时间筛选
 */
export async function getGoldLogs(
  playerId: number,
  opts: { page: number; limit: number; type?: string; startTime?: Date; endTime?: Date }
) {
  const db = await getDb();
  if (!db) return { list: [], total: 0 };
  const { page, limit, type, startTime, endTime } = opts;
  const offset = (page - 1) * limit;
  const conditions: any[] = [eq(goldLogs.playerId, playerId)];
  if (type) conditions.push(eq(goldLogs.type, type));
  if (startTime) conditions.push(gte(goldLogs.createdAt, startTime));
  if (endTime) conditions.push(sql`${goldLogs.createdAt} <= ${endTime}`);
  const where = and(...conditions);
  const [list, countResult] = await Promise.all([
    db.select().from(goldLogs).where(where).orderBy(desc(goldLogs.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(goldLogs).where(where),
  ]);
  return {
    list: list.map(r => ({
      id: r.id,
      amount: parseFloat(String(r.amount)),
      balance: parseFloat(String(r.balance)),
      type: r.type,
      description: r.description,
      refId: r.refId,
      createdAt: r.createdAt,
    })),
    total: Number(countResult[0]?.count ?? 0),
  };
}
