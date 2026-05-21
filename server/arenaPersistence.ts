import { eq, inArray } from "drizzle-orm";
import { arenaRoomPlayers, arenaRoundResults, arenaRooms, players } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * 竞技场持久化辅助：
 * 1. 判断房间内是否有真人玩家参与；
 * 2. 仅为真人玩家保留可追溯记录；
 * 3. 纯机器人对局结束后清理中间记录，减少数据库压力。
 */

type DbClient = NonNullable<Awaited<ReturnType<typeof getDb>>>;

type ArenaRoomPlayerLike = {
  playerId: number;
};

/** 根据房间参与者列表，筛出真人玩家 ID 集合。 */
export async function getRealArenaPlayerIdSet(
  db: DbClient,
  roomPlayers: ArenaRoomPlayerLike[],
): Promise<Set<number>> {
  const playerIds = Array.from(new Set(roomPlayers.map((item) => item.playerId).filter((id) => id > 0)));
  if (playerIds.length === 0) return new Set<number>();

  const rows = await db
    .select({ id: players.id, isBot: players.isBot })
    .from(players)
    .where(inArray(players.id, playerIds));

  return new Set(rows.filter((item) => Number(item.isBot) === 0).map((item) => item.id));
}

/** 判断当前房间是否含有真人玩家。 */
export async function hasRealArenaPlayers(
  db: DbClient,
  roomPlayers: ArenaRoomPlayerLike[],
): Promise<boolean> {
  const realPlayerIdSet = await getRealArenaPlayerIdSet(db, roomPlayers);
  return realPlayerIdSet.size > 0;
}

/**
 * 清理纯机器人房间在数据库中的对局痕迹。
 * 说明：等待阶段房间仍需存在，方便真人玩家加入；只有纯机器人对局结束后才清理。
 */
export async function cleanupBotOnlyArenaRoom(db: DbClient, roomId: number) {
  await db.delete(arenaRoundResults).where(eq(arenaRoundResults.roomId, roomId));
  await db.delete(arenaRoomPlayers).where(eq(arenaRoomPlayers.roomId, roomId));
  await db.delete(arenaRooms).where(eq(arenaRooms.id, roomId));
}
