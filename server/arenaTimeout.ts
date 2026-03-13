/**
 * arenaTimeout.ts — 竞技场房间超时自动关闭
 *
 * 每 2 分钟扫描一次，将等待超过 10 分钟仍未满员的房间自动关闭，
 * 并退还所有参与者的入场费。
 */

import { getDb, insertGoldLog } from "./db";
import { arenaRooms, arenaRoomPlayers, players } from "../drizzle/schema";
import { eq, and, lt } from "drizzle-orm";
import { broadcastRoomCancelled, broadcastRoomListUpdate } from "./arenaSSE";

const TIMEOUT_MS = 10 * 60 * 1000; // 10 分钟
const SCAN_INTERVAL_MS = 2 * 60 * 1000; // 每 2 分钟扫描一次

/** 获取等待中房间摘要列表（用于广播） */
async function fetchWaitingRoomSummaries() {
  const db = await getDb();
  if (!db) return [];
  const rooms = await db
    .select()
    .from(arenaRooms)
    .where(eq(arenaRooms.status, "waiting"))
    .limit(50);
  return rooms.map((r) => ({
    id: r.id,
    roomNo: r.roomNo,
    creatorNickname: r.creatorNickname,
    creatorAvatar: r.creatorAvatar,
    maxPlayers: r.maxPlayers,
    currentPlayers: r.currentPlayers,
    rounds: r.rounds,
    entryFee: r.entryFee,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

/** 扫描并关闭超时房间 */
async function closeTimeoutRooms() {
  try {
    const db = await getDb();
    if (!db) return;

    const cutoffTime = new Date(Date.now() - TIMEOUT_MS);

    // 查找超时的 waiting 房间
    const timeoutRooms = await db
      .select()
      .from(arenaRooms)
      .where(
        and(
          eq(arenaRooms.status, "waiting"),
          lt(arenaRooms.createdAt, cutoffTime)
        )
      );

    if (timeoutRooms.length === 0) return;

    console.log(`[ArenaTimeout] Found ${timeoutRooms.length} timed-out room(s), closing...`);

    for (const room of timeoutRooms) {
      try {
        // 获取房间内所有玩家
        const roomPlayers = await db
          .select()
          .from(arenaRoomPlayers)
          .where(eq(arenaRoomPlayers.roomId, room.id));

        const entryFee = parseFloat(room.entryFee ?? "0");

        // 退还入场费给所有参与者
        for (const rp of roomPlayers) {
          const [player] = await db
            .select()
            .from(players)
            .where(eq(players.id, rp.playerId));

          if (player && entryFee > 0) {
            const newGold = (parseFloat(player.gold ?? "0") + entryFee).toFixed(2);
            await db
              .update(players)
              .set({ gold: newGold })
              .where(eq(players.id, rp.playerId));
            await insertGoldLog(
              rp.playerId,
              entryFee,
              parseFloat(newGold),
              "arena",
              `竞技场房间超时退款（房间 #${room.roomNo}）`
            );
          }
        }

        // 标记房间为已取消
        await db
          .update(arenaRooms)
          .set({ status: "cancelled" })
          .where(eq(arenaRooms.id, room.id));

        // 广播房间取消
        broadcastRoomCancelled(room.id);

        console.log(
          `[ArenaTimeout] Room #${room.roomNo} (id=${room.id}) closed, refunded ${roomPlayers.length} player(s) × ¥${entryFee}`
        );
      } catch (err) {
        console.error(`[ArenaTimeout] Error closing room ${room.id}:`, err);
      }
    }

    // 广播更新后的房间列表
    const summaries = await fetchWaitingRoomSummaries();
    broadcastRoomListUpdate(summaries);
  } catch (err) {
    console.error("[ArenaTimeout] Scan error:", err);
  }
}

/** 启动超时扫描定时器 */
export function startArenaTimeoutWatcher() {
  console.log("[ArenaTimeout] Timeout watcher started (10min timeout, 2min scan interval)");

  // 服务器启动后 30 秒先扫一次（处理服务器重启前遗留的超时房间）
  setTimeout(closeTimeoutRooms, 30_000);

  // 之后每 2 分钟扫描一次
  setInterval(closeTimeoutRooms, SCAN_INTERVAL_MS);
}
