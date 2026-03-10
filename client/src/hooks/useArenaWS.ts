/**
 * useArenaWS.ts — 竞技场 WebSocket 客户端 Hook
 *
 * 用法：
 *   const { connected, subscribe, unsubscribe } = useArenaWS({ onMessage })
 */

import { useEffect, useRef, useCallback } from 'react';

export interface ArenaWSMessage {
  type: string;
  [key: string]: unknown;
}

interface UseArenaWSOptions {
  onMessage?: (msg: ArenaWSMessage) => void;
  /** 是否自动订阅房间列表 */
  subscribeList?: boolean;
  /** 自动订阅的房间ID */
  subscribeRoomId?: number | null;
}

export function useArenaWS({ onMessage, subscribeList = false, subscribeRoomId = null }: UseArenaWSOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedRef = useRef(false);
  const pendingSubscriptions = useRef<{ list: boolean; rooms: Set<number> }>({
    list: subscribeList,
    rooms: new Set(subscribeRoomId ? [subscribeRoomId] : []),
  });

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/arena`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      connectedRef.current = true;
      // 恢复订阅
      if (pendingSubscriptions.current.list) {
        ws.send(JSON.stringify({ type: 'subscribe_list' }));
      }
      for (const roomId of Array.from(pendingSubscriptions.current.rooms)) {
        ws.send(JSON.stringify({ type: 'subscribe_room', roomId }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ArenaWSMessage;
        onMessage?.(msg);
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      connectedRef.current = false;
      // 3秒后重连
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  /** 订阅房间列表 */
  const subscribeListFn = useCallback(() => {
    pendingSubscriptions.current.list = true;
    send({ type: 'subscribe_list' });
  }, [send]);

  /** 取消订阅房间列表 */
  const unsubscribeListFn = useCallback(() => {
    pendingSubscriptions.current.list = false;
    send({ type: 'unsubscribe_list' });
  }, [send]);

  /** 订阅某个房间 */
  const subscribeRoom = useCallback((roomId: number) => {
    pendingSubscriptions.current.rooms.add(roomId);
    send({ type: 'subscribe_room', roomId });
  }, [send]);

  /** 取消订阅某个房间 */
  const unsubscribeRoom = useCallback((roomId: number) => {
    pendingSubscriptions.current.rooms.delete(roomId);
    send({ type: 'unsubscribe_room', roomId });
  }, [send]);

  return {
    subscribeList: subscribeListFn,
    unsubscribeList: unsubscribeListFn,
    subscribeRoom,
    unsubscribeRoom,
  };
}
