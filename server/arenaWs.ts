/**
 * arenaWs.ts — 竞技场 WebSocket 服务
 *
 * 消息协议（服务端 → 客户端）：
 *   { type: 'room_list_update', rooms: ArenaRoomSummary[] }
 *   { type: 'room_joined', room: ArenaRoomDetail }
 *   { type: 'player_joined', roomId, player: { playerId, nickname, avatar, seatNo } }
 *   { type: 'game_started', roomId, currentRound: 1 }
 *   { type: 'round_result', roomId, roundNo, results: RoundResult[] }
 *   { type: 'game_over', roomId, winnerId, players: PlayerResult[] }
 *   { type: 'room_cancelled', roomId }
 *   { type: 'error', message: string }
 *
 * 消息协议（客户端 → 服务端）：
 *   { type: 'subscribe_list' }           — 订阅房间列表更新
 *   { type: 'subscribe_room', roomId }   — 订阅某个房间的实时更新
 *   { type: 'unsubscribe_room', roomId } — 取消订阅
 *   { type: 'ping' }                     — 心跳
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

// ── 类型定义 ──────────────────────────────────────────────────────────────

export interface WsClient {
  ws: WebSocket;
  /** 是否订阅了房间列表 */
  subscribedList: boolean;
  /** 订阅的具体房间ID集合 */
  subscribedRooms: Set<number>;
}

// ── 全局客户端集合 ────────────────────────────────────────────────────────

const clients = new Set<WsClient>();

// ── 初始化 WebSocket 服务器 ───────────────────────────────────────────────

export function initArenaWs(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/arena" });

  wss.on("connection", (ws) => {
    const client: WsClient = {
      ws,
      subscribedList: false,
      subscribedRooms: new Set(),
    };
    clients.add(client);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleClientMessage(client, msg);
      } catch {
        sendTo(client, { type: "error", message: "Invalid JSON" });
      }
    });

    ws.on("close", () => {
      clients.delete(client);
    });

    ws.on("error", () => {
      clients.delete(client);
    });

    // 发送欢迎消息
    sendTo(client, { type: "connected" });
  });

  console.log("[ArenaWS] WebSocket server mounted at /ws/arena");
  return wss;
}

// ── 处理客户端消息 ────────────────────────────────────────────────────────

function handleClientMessage(client: WsClient, msg: Record<string, unknown>) {
  switch (msg.type) {
    case "subscribe_list":
      client.subscribedList = true;
      break;

    case "unsubscribe_list":
      client.subscribedList = false;
      break;

    case "subscribe_room": {
      const roomId = Number(msg.roomId);
      if (roomId > 0) client.subscribedRooms.add(roomId);
      break;
    }

    case "unsubscribe_room": {
      const roomId = Number(msg.roomId);
      client.subscribedRooms.delete(roomId);
      break;
    }

    case "ping":
      sendTo(client, { type: "pong" });
      break;

    default:
      break;
  }
}

// ── 发送工具 ──────────────────────────────────────────────────────────────

function sendTo(client: WsClient, payload: Record<string, unknown>) {
  if (client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(payload));
  }
}

// ── 广播 API（供 tRPC 路由调用） ──────────────────────────────────────────

/** 广播房间列表更新给所有订阅列表的客户端 */
export function broadcastRoomListUpdate(rooms: unknown[]) {
  const payload = JSON.stringify({ type: "room_list_update", rooms });
  for (const client of Array.from(clients)) {
    if (client.subscribedList && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

/** 广播某房间的玩家加入事件 */
export function broadcastPlayerJoined(
  roomId: number,
  player: { playerId: number; nickname: string; avatar: string; seatNo: number },
  roomDetail: unknown
) {
  const payload = JSON.stringify({ type: "player_joined", roomId, player, room: roomDetail });
  broadcastToRoom(roomId, payload);
}

/** 广播游戏开始 */
export function broadcastGameStarted(roomId: number) {
  const payload = JSON.stringify({ type: "game_started", roomId, currentRound: 1 });
  broadcastToRoom(roomId, payload);
}

/** 广播每轮开箱结果 */
export function broadcastRoundResult(
  roomId: number,
  roundNo: number,
  results: unknown[]
) {
  const payload = JSON.stringify({ type: "round_result", roomId, roundNo, results });
  broadcastToRoom(roomId, payload);
}

/** 广播游戏结束 */
export function broadcastGameOver(
  roomId: number,
  winnerId: number,
  players: unknown[]
) {
  const payload = JSON.stringify({ type: "game_over", roomId, winnerId, players });
  broadcastToRoom(roomId, payload);
}

/** 广播房间取消 */
export function broadcastRoomCancelled(roomId: number) {
  const payload = JSON.stringify({ type: "room_cancelled", roomId });
  broadcastToRoom(roomId, payload);
  // 同时通知列表订阅者
  const listPayload = JSON.stringify({ type: "room_removed", roomId });
  for (const client of Array.from(clients)) {
    if (client.subscribedList && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(listPayload);
    }
  }
}

/** 向订阅了指定房间的所有客户端广播 */
function broadcastToRoom(roomId: number, payload: string) {
  for (const client of Array.from(clients)) {
    if (client.subscribedRooms.has(roomId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}
