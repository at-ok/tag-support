import webpush from 'web-push';
import type { NotificationType } from '@/hooks/useNotifications';

// VAPID configuration
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@tag-support.app';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn(
    'VAPID keys not configured. Run `node scripts/generate-vapid-keys.js` to generate keys.'
  );
} else {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  vibrate?: number[];
  data?: Record<string, unknown>;
  type?: NotificationType;
}

/**
 * Send a push notification to a specific subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushNotificationPayload
): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys not configured');
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 60 * 60 * 24, // 24 hours
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

/**
 * Send push notifications to multiple subscriptions
 */
export async function sendPushNotificationBatch(
  subscriptions: PushSubscription[],
  payload: PushNotificationPayload
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ subscription: PushSubscription; error: unknown }>;
}> {
  const results = await Promise.allSettled(
    subscriptions.map((subscription) => sendPushNotification(subscription, payload))
  );

  const success = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  const errors = results
    .map((r, i) => ({ result: r, subscription: subscriptions[i] }))
    .filter(({ result }) => result.status === 'rejected')
    .map(({ result, subscription }) => ({
      subscription: subscription!,
      error: (result as PromiseRejectedResult).reason as unknown,
    }));

  return { success, failed, errors };
}

/**
 * Validate a push subscription
 */
export function validatePushSubscription(subscription: unknown): subscription is PushSubscription {
  if (typeof subscription !== 'object' || subscription === null) {
    return false;
  }

  const sub = subscription as Record<string, unknown>;

  return (
    typeof sub.endpoint === 'string' &&
    typeof sub.keys === 'object' &&
    sub.keys !== null &&
    typeof (sub.keys as Record<string, unknown>).p256dh === 'string' &&
    typeof (sub.keys as Record<string, unknown>).auth === 'string'
  );
}

export { webpush };
