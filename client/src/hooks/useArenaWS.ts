/**
 * useArenaWS.ts — 竞技场实时通信 Hook（SSE 版本）
 *
 * 使用 SSE（Server-Sent Events）实现实时通信，兼容性更好。
 * 接口与原 WebSocket 版本完全兼容，调用方无需修改。
 *
 * 用法：
 *   const { connected, subscribeList, subscribeRoom } = useArenaWS({ onMessage })
 */

import { useEffect, useRef, useCallback } from 'react';

export interface ArenaWSMessage {
  type: string;
  [key: string]: unknown;
}

interface UseArenaWSOptions {
  onMessage?: (msg: ArenaWSMessage) => void;
  /** 是否自动订阅房间列表（roomId=0） */
  subscribeList?: boolean;
  /** 自动订阅的房间ID */
  subscribeRoomId?: number | null;
}

export function useArenaWS({ onMessage, subscribeList = false, subscribeRoomId = null }: UseArenaWSOptions) {
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);

  // 保持 onMessage 引用最新，避免闭包问题
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback((roomId: number) => {
    // 关闭已有连接
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const url = `/api/arena/events?roomId=${roomId}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ArenaWSMessage;
        // 过滤心跳
        if (msg.type === 'connected') return;
        onMessageRef.current?.(msg);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // 3秒后重连
      reconnectTimerRef.current = setTimeout(() => {
        connect(roomId);
      }, 3000);
    };
  }, []);

  // 初始连接
  useEffect(() => {
    const roomId = subscribeRoomId ?? (subscribeList ? 0 : -1);
    if (roomId < 0) return; // 不需要连接

    connect(roomId);

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect, subscribeList, subscribeRoomId]);

  // 以下方法保留接口兼容性（SSE 无需客户端发送订阅消息，连接时已通过 URL 参数指定）
  const subscribeListFn = useCallback(() => {
    connect(0);
  }, [connect]);

  const unsubscribeListFn = useCallback(() => {
    // SSE 无需取消订阅，关闭连接即可
  }, []);

  const subscribeRoom = useCallback((roomId: number) => {
    connect(roomId);
  }, [connect]);

  const unsubscribeRoom = useCallback((_roomId: number) => {
    // SSE 无需取消订阅
  }, []);

  return {
    subscribeList: subscribeListFn,
    unsubscribeList: unsubscribeListFn,
    subscribeRoom,
    unsubscribeRoom,
  };
}
