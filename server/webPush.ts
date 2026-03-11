import webpush from 'web-push';
import { getDb } from './db';
import { agentPushSubscriptions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// 初始化 VAPID 配置
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:support@youmegame.vip',
    vapidPublicKey,
    vapidPrivateKey
  );
}

export { webpush, vapidPublicKey };

/**
 * 向指定订阅发送推送通知
 */
export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
  }
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[WebPush] VAPID keys not configured, skipping push');
    return false;
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    if (error.statusCode === 410 || error.statusCode === 404) {
      // 订阅已过期，需要从数据库删除
      console.warn('[WebPush] Subscription expired:', error.message);
      return false;
    }
    console.error('[WebPush] Failed to send push:', error.message);
    return false;
  }
}

/**
 * 向指定坐席的所有已订阅设备发送推送通知
 */
export async function sendPushToAgent(
  agentId: number,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
  }
): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[WebPush] VAPID keys not configured, skipping push notification');
    return;
  }

  const db = await getDb();
  if (!db) return;

  try {
    const subscriptions = await db
      .select()
      .from(agentPushSubscriptions)
      .where(eq(agentPushSubscriptions.agentId, agentId));

    if (subscriptions.length === 0) return;

    const pushData = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/img/logok.png',
      badge: payload.badge || '/img/logok.png',
      tag: payload.tag || 'cs-message',
      data: payload.data || { url: '/agent' },
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushData,
          { TTL: 3600 } // 1 小时有效期
        )
      )
    );

    // 清理失效的订阅（410 Gone / 404 表示订阅已失效）
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        const err = result.reason as { statusCode?: number; message?: string };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await db
            .delete(agentPushSubscriptions)
            .where(eq(agentPushSubscriptions.endpoint, subscriptions[i].endpoint));
          console.log(`[WebPush] Removed expired subscription for agent ${agentId}`);
        } else {
          console.error(`[WebPush] Failed to send push to agent ${agentId}:`, err?.message);
        }
      }
    }
  } catch (err) {
    console.error('[WebPush] Error sending push notifications:', err);
  }
}
