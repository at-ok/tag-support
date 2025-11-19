import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications, NotificationTemplates } from '../useNotifications';

describe('useNotifications', () => {
  let mockNotification: {
    requestPermission: ReturnType<typeof vi.fn>;
  };
  let mockServiceWorker: {
    ready: Promise<{
      showNotification: ReturnType<typeof vi.fn>;
    }>;
  };

  beforeEach(() => {
    // Mock Notification API
    mockNotification = {
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };

    Object.defineProperty(global, 'Notification', {
      writable: true,
      value: class Notification {
        static permission: NotificationPermission = 'default';
        static requestPermission = mockNotification.requestPermission;

        constructor(
          public title: string,
          public options?: NotificationOptions
        ) {}
      },
    });

    // Mock Service Worker API
    mockServiceWorker = {
      ready: Promise.resolve({
        showNotification: vi.fn().mockResolvedValue(undefined),
      }),
    };

    Object.defineProperty(global.navigator, 'serviceWorker', {
      writable: true,
      value: mockServiceWorker,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should detect notification support', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.isSupported).toBe(true);
  });

  it('should initialize with default permission state', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.permission).toBe('default');
  });

  it('should request notification permission', async () => {
    const { result } = renderHook(() => useNotifications());

    let permissionGranted = false;
    await act(async () => {
      permissionGranted = await result.current.requestPermission();
    });

    expect(mockNotification.requestPermission).toHaveBeenCalled();
    expect(permissionGranted).toBe(true);
  });

  it('should handle permission denial', async () => {
    mockNotification.requestPermission.mockResolvedValue('denied');

    const { result } = renderHook(() => useNotifications());

    let permissionGranted = false;
    await act(async () => {
      permissionGranted = await result.current.requestPermission();
    });

    expect(permissionGranted).toBe(false);
  });

  it('should send notification when permission is granted', async () => {
    // Set permission to granted
    Object.defineProperty(global.Notification, 'permission', {
      writable: true,
      value: 'granted',
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.permission).toBe('granted');
    });

    const registration = await mockServiceWorker.ready;

    await act(async () => {
      await result.current.sendNotification('game_start', {
        title: 'Game Started',
        body: 'The game has begun!',
      });
    });

    expect(registration.showNotification).toHaveBeenCalledWith(
      'Game Started',
      expect.objectContaining({
        body: 'The game has begun!',
      })
    );
  });

  it('should throw error when sending notification without permission', async () => {
    const { result } = renderHook(() => useNotifications());

    await expect(
      act(async () => {
        await result.current.sendNotification('game_start', {
          title: 'Test',
          body: 'Test body',
        });
      })
    ).rejects.toThrow('Notification permission not granted');
  });

  it('should handle notification error gracefully', async () => {
    Object.defineProperty(global.Notification, 'permission', {
      writable: true,
      value: 'granted',
    });

    const mockError = new Error('Notification failed');
    mockServiceWorker.ready = Promise.resolve({
      showNotification: vi.fn().mockRejectedValue(mockError),
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.permission).toBe('granted');
    });

    // Verify that the error is thrown
    await expect(
      act(async () => {
        await result.current.sendNotification('game_start', {
          title: 'Test',
          body: 'Test body',
        });
      })
    ).rejects.toThrow('Notification failed');

    // The error state is set asynchronously, and its value is logged in the hook
    // We verify that the sendNotification function correctly throws the error
  });

  it('should use correct vibration patterns for different notification types', async () => {
    Object.defineProperty(global.Notification, 'permission', {
      writable: true,
      value: 'granted',
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.permission).toBe('granted');
    });

    const registration = await mockServiceWorker.ready;

    // Test game_start notification
    await act(async () => {
      await result.current.sendNotification('game_start', {
        title: 'Game Started',
        body: 'The game has begun!',
      });
    });

    expect(registration.showNotification).toHaveBeenLastCalledWith(
      'Game Started',
      expect.objectContaining({
        vibrate: [200, 100, 200, 100, 200],
      })
    );

    // Test capture notification
    await act(async () => {
      await result.current.sendNotification('capture', {
        title: 'Captured',
        body: 'You were caught!',
      });
    });

    expect(registration.showNotification).toHaveBeenLastCalledWith(
      'Captured',
      expect.objectContaining({
        vibrate: [300, 100, 300],
      })
    );
  });

  describe('NotificationTemplates', () => {
    it('should create game start notification', () => {
      const notification = NotificationTemplates.gameStart(60);

      expect(notification.title).toBe('ゲーム開始！');
      expect(notification.body).toContain('60分間');
    });

    it('should create game end notification', () => {
      const notification = NotificationTemplates.gameEnd('Team A');

      expect(notification.title).toBe('ゲーム終了');
      expect(notification.body).toContain('Team A');
    });

    it('should create mission assigned notification', () => {
      const notification = NotificationTemplates.missionAssigned('Find the flag');

      expect(notification.title).toBe('新しいミッション');
      expect(notification.body).toContain('Find the flag');
    });

    it('should create mission completed notification', () => {
      const notification = NotificationTemplates.missionCompleted('Find the flag', 100);

      expect(notification.title).toBe('ミッション達成！');
      expect(notification.body).toContain('Find the flag');
      expect(notification.body).toContain('100');
    });

    it('should create capture notification', () => {
      const notification = NotificationTemplates.captured('Chaser1');

      expect(notification.title).toBe('捕まりました！');
      expect(notification.body).toContain('Chaser1');
    });

    it('should create rescue notification', () => {
      const notification = NotificationTemplates.rescued('Runner1');

      expect(notification.title).toBe('救出されました！');
      expect(notification.body).toContain('Runner1');
    });

    it('should create time warning notification', () => {
      const notification = NotificationTemplates.timeWarning(5);

      expect(notification.title).toBe('残り時間警告');
      expect(notification.body).toContain('5分');
      expect(notification.silent).toBe(true);
    });

    it('should create zone alert notification', () => {
      const safeZone = NotificationTemplates.zoneAlert('Park Area', 'safe');
      expect(safeZone.title).toBe('セーフゾーン');
      expect(safeZone.body).toContain('Park Area');

      const restrictedZone = NotificationTemplates.zoneAlert('Danger Area', 'restricted');
      expect(restrictedZone.title).toBe('立禁エリア');
      expect(restrictedZone.body).toContain('Danger Area');
    });
  });
});
