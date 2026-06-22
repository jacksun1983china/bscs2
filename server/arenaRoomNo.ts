import { randomInt } from "crypto";
import { eq } from "drizzle-orm";
import { arenaRooms } from "../drizzle/schema";

const ARENA_ROOM_NO_MAX_RETRIES = 50;

/**
 * 生成更大空间的竞技场房号。
 *
 * 旧的 6 位纯随机房号总空间只有 90 万，随着机器人持续开房与历史房间累积，
 * 线上已出现大量撞号。这里改为“时间片段 + 随机尾缀”的 12 位数字房号，
 * 在不改变字符串展示方式的前提下显著扩大唯一空间。
 */
export function genArenaRoomNo(): string {
  const timePart = Date.now().toString().slice(-9);
  const randomPart = String(randomInt(100, 1000));
  return `${timePart}${randomPart}`;
}

/**
 * 递归识别 Drizzle / mysql2 包装后的唯一键冲突。
 * 线上报错结构可能出现在 err、err.cause，甚至更深层对象里，
 * 因此不能只检查单一层级的 code/message。
 */
export function isArenaRoomNoDuplicateError(err: any): boolean {
  const visited = new Set<any>();
  const queue = [err];
  const messages: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const code = current.code;
    const errno = current.errno;
    const sqlState = current.sqlState;
    const message = String(current.sqlMessage ?? current.message ?? "");
    if (message) messages.push(message);

    if (code === "ER_DUP_ENTRY" || errno === 1062 || sqlState === "23000") {
      const normalized = message.toLowerCase();
      if (
        normalized.includes("arenarooms_roomno_unique") ||
        normalized.includes("roomno") ||
        normalized.includes("duplicate entry")
      ) {
        return true;
      }
    }

    if (current.cause) queue.push(current.cause);
    if (Array.isArray(current.errors)) queue.push(...current.errors);
    if (Array.isArray(current.stack)) queue.push(...current.stack);
  }

  const mergedMessage = messages.join(" ").toLowerCase();
  return (
    mergedMessage.includes("arenarooms_roomno_unique") ||
    (mergedMessage.includes("roomno") && mergedMessage.includes("duplicate entry"))
  );
}

/**
 * 为竞技场房间生成唯一房号并执行插入。
 *
 * 采用“两层防撞”策略：
 * 1. 插入前先查询一次 roomNo 是否已存在，尽量减少无意义报错；
 * 2. 即使并发窗口中仍然撞号，也会根据唯一键错误自动继续重试。
 */
export async function insertArenaRoomWithUniqueNo(
  db: any,
  values: Omit<typeof arenaRooms.$inferInsert, "roomNo">,
  options?: {
    logPrefix?: string;
    maxRetries?: number;
  }
): Promise<{ roomId: number; roomNo: string }> {
  const maxRetries = options?.maxRetries ?? ARENA_ROOM_NO_MAX_RETRIES;
  const logPrefix = options?.logPrefix ?? "[ArenaRoomNo]";

  for (let i = 0; i < maxRetries; i++) {
    const roomNo = genArenaRoomNo();

    const existingRows = await db
      .select({ id: arenaRooms.id })
      .from(arenaRooms)
      .where(eq(arenaRooms.roomNo, roomNo))
      .limit(1);
    if (existingRows.length > 0) {
      console.warn(`${logPrefix} 房间号 ${roomNo} 预检查撞号，继续重试第 ${i + 1} 次`);
      continue;
    }

    try {
      const [insertResult] = await db.insert(arenaRooms).values({
        ...values,
        roomNo,
      });
      return {
        roomId: (insertResult as any).insertId as number,
        roomNo,
      };
    } catch (err: any) {
      if (!isArenaRoomNoDuplicateError(err) || i === maxRetries - 1) {
        throw err;
      }
      const duplicateMsg = String(err?.sqlMessage ?? err?.message ?? err?.cause?.sqlMessage ?? err?.cause?.message ?? "");
      console.warn(`${logPrefix} 房间号 ${roomNo} 插入撞号，继续重试第 ${i + 1} 次: ${duplicateMsg}`);
    }
  }

  throw new Error(`生成竞技场房号失败，已重试 ${maxRetries} 次仍未成功`);
}
