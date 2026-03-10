/**
 * arenaSSE.ts — 竞技场 SSE（Server-Sent Events）服务
 *
 * 替换 WebSocket，解决 Manus 平台代理不支持 WebSocket 的问题。
 * SSE 是单向长连接（服务端→客户端），走标准 HTTP，代理完全支持。
 *
 * 端点：GET /api/arena/events?roomId=xxx
 *   - roomId=0 或不传：订阅房间列表更新
 *   - roomId=N：订阅指定房间的实时事件
 *
 * 事件格式（与原 WebSocket 消息格式完全相同）：
 *   data: {"type":"room_list_update","rooms":[...]}
 *   data: {"type":"player_joined","roomId":1,"player":{...}}
 *   data: {"type":"game_started","roomId":1,"currentRound":1}
 *   data: {"type":"round_result","roomId":1,"roundNo":1,"results":[...]}
 *   data: {"type":"game_over","roomId":1,"winnerId":1,"players":[...]}
 *   data: {"type":"room_cancelled","roomId":1}
 */

import type { Request, Response, Express } from "express";

// ── 客户端连接管理 ────────────────────────────────────────────────────────────

interface SSEClient {
  res: Response;
  /** 订阅的房间ID，0 表示订阅列表 */
  roomId: number;
}

const clients = new Set<SSEClient>();

// ── 挂载 SSE 端点 ─────────────────────────────────────────────────────────────

export function initArenaSSE(app: Express) {
  app.get("/api/arena/events", (req: Request, res: Response) => {
    const roomId = parseInt((req.query.roomId as string) || "0", 10);

    // 设置 SSE 响应头
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // 禁用 Nginx 缓冲
    res.flushHeaders();

    const client: SSEClient = { res, roomId };
    clients.add(client);

    // 发送连接成功事件
    sendToClient(client, { type: "connected" });

    // 心跳：每 25 秒发一次，防止代理超时断开
    const heartbeat = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeat);
        return;
      }
      res.write(": heartbeat\n\n");
    }, 25000);

    // 客户端断开时清理
    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(client);
    });
  });

  console.log("[ArenaSSE] SSE endpoint mounted at /api/arena/events");
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function sendToClient(client: SSEClient, payload: Record<string, unknown>) {
  if (client.res.writableEnded) return;
  try {
    client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch {
    clients.delete(client);
  }
}

function broadcastToRoom(roomId: number, payload: Record<string, unknown>) {
  for (const client of Array.from(clients)) {
    if (client.roomId === roomId) {
      sendToClient(client, payload);
    }
  }
}

function broadcastToListSubscribers(payload: Record<string, unknown>) {
  for (const client of Array.from(clients)) {
    if (client.roomId === 0) {
      sendToClient(client, payload);
    }
  }
}

// ── 广播 API（供 tRPC 路由和 arenaBot 调用，接口与 arenaWs.ts 完全相同） ──────

/** 广播房间列表更新给所有订阅列表的客户端 */
export function broadcastRoomListUpdate(rooms: unknown[]) {
  broadcastToListSubscribers({ type: "room_list_update", rooms });
}

/** 广播某房间的玩家加入事件 */
export function broadcastPlayerJoined(
  roomId: number,
  player: { playerId: number; nickname: string; avatar: string; seatNo: number },
  roomDetail: unknown
) {
  broadcastToRoom(roomId, { type: "player_joined", roomId, player, room: roomDetail });
}

/** 广播游戏开始 */
export function broadcastGameStarted(roomId: number) {
  broadcastToRoom(roomId, { type: "game_started", roomId, currentRound: 1 });
}

/** 广播每轮开箱结果 */
export function broadcastRoundResult(
  roomId: number,
  roundNo: number,
  results: unknown[]
) {
  broadcastToRoom(roomId, { type: "round_result", roomId, roundNo, results });
}

/** 广播游戏结束 */
export function broadcastGameOver(
  roomId: number,
  winnerId: number,
  players: unknown[]
) {
  broadcastToRoom(roomId, { type: "game_over", roomId, winnerId, players });
}

/** 广播房间取消 */
export function broadcastRoomCancelled(roomId: number) {
  broadcastToRoom(roomId, { type: "room_cancelled", roomId });
  broadcastToListSubscribers({ type: "room_removed", roomId });
}
