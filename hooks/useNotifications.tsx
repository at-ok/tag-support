'use client';

import { useState, useEffect, useCallback } from 'react';

export type NotificationType =
  | 'game_start'
  | 'game_end'
  | 'mission_assigned'
  | 'mission_completed'
  | 'capture'
  | 'rescue'
  | 'time_warning'
  | 'zone_alert';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  vibrate?: number[];
  silent?: boolean;
}

interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  sendNotification: (type: NotificationType, options: NotificationOptions) => Promise<void>;
  error: string | null;
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if notifications are supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    } else {
      setIsSupported(false);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setError(null);
      return result === 'granted';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permission';
      setError(errorMessage);
      console.error('Error requesting notification permission:', err);
      return false;
    }
  }, [isSupported]);

  // Send a notification
  const sendNotification = useCallback(
    async (type: NotificationType, options: NotificationOptions): Promise<void> => {
      if (!isSupported) {
        throw new Error('Notifications are not supported');
      }

      if (permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      try {
        // Register service worker if not already registered
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;

          // Use Service Worker notification for better background support
          if (registration.showNotification) {
            await registration.showNotification(options.title, {
              body: options.body,
              icon: options.icon || '/icons/icon-192x192.png',
              badge: options.badge || '/icons/icon-192x192.png',
              tag: options.tag || type,
              data: { ...options.data, type },
              vibrate: options.vibrate || getDefaultVibration(type),
              silent: options.silent || false,
              requireInteraction: type === 'game_start' || type === 'game_end',
            });
          } else {
            // Fallback to regular notification
            new Notification(options.title, {
              body: options.body,
              icon: options.icon || '/icons/icon-192x192.png',
              tag: options.tag || type,
              data: { ...options.data, type },
              vibrate: options.vibrate || getDefaultVibration(type),
              silent: options.silent || false,
            });
          }
        } else {
          // Fallback to regular notification if service worker is not available
          new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/icons/icon-192x192.png',
            tag: options.tag || type,
            data: { ...options.data, type },
            vibrate: options.vibrate || getDefaultVibration(type),
            silent: options.silent || false,
          });
        }

        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send notification';
        setError(errorMessage);
        console.error('Error sending notification:', err);
        throw err;
      }
    },
    [isSupported, permission]
  );

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    error,
  };
}

// Get default vibration pattern based on notification type
function getDefaultVibration(type: NotificationType): number[] {
  switch (type) {
    case 'game_start':
    case 'game_end':
      return [200, 100, 200, 100, 200]; // Strong vibration pattern
    case 'capture':
    case 'rescue':
      return [300, 100, 300]; // Medium vibration pattern
    case 'mission_assigned':
    case 'mission_completed':
      return [100, 50, 100]; // Light vibration pattern
    case 'time_warning':
    case 'zone_alert':
      return [100, 50, 100, 50, 100, 50, 100]; // Repeating pattern for alerts
    default:
      return [100]; // Single short vibration
  }
}

// Notification templates for common scenarios
export const NotificationTemplates = {
  gameStart: (duration: number): NotificationOptions => ({
    title: 'ゲーム開始！',
    body: `${duration}分間のゲームが開始されました。頑張ってください！`,
    vibrate: [200, 100, 200, 100, 200],
  }),

  gameEnd: (winner?: string): NotificationOptions => ({
    title: 'ゲーム終了',
    body: winner ? `${winner}チームの勝利です！` : 'ゲームが終了しました。',
    vibrate: [200, 100, 200],
  }),

  missionAssigned: (missionTitle: string): NotificationOptions => ({
    title: '新しいミッション',
    body: `「${missionTitle}」が割り当てられました。`,
    vibrate: [100, 50, 100],
  }),

  missionCompleted: (missionTitle: string, points: number): NotificationOptions => ({
    title: 'ミッション達成！',
    body: `「${missionTitle}」を達成しました！ +${points}ポイント`,
    vibrate: [100, 50, 100, 50, 100],
  }),

  captured: (chaserName: string): NotificationOptions => ({
    title: '捕まりました！',
    body: `${chaserName}に捕まりました。`,
    vibrate: [300, 100, 300],
  }),

  rescued: (rescuerName: string): NotificationOptions => ({
    title: '救出されました！',
    body: `${rescuerName}が救出してくれました。`,
    vibrate: [100, 50, 100, 50, 100],
  }),

  timeWarning: (remainingMinutes: number): NotificationOptions => ({
    title: '残り時間警告',
    body: `ゲーム終了まであと${remainingMinutes}分です。`,
    vibrate: [100, 50, 100, 50, 100, 50, 100],
    silent: true,
  }),

  zoneAlert: (zoneName: string, zoneType: 'safe' | 'restricted'): NotificationOptions => ({
    title: zoneType === 'safe' ? 'セーフゾーン' : '立禁エリア',
    body: `${zoneName}に接近しています。`,
    vibrate: [100, 50, 100, 50, 100, 50, 100],
  }),
};
