import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { GameProvider, useGame } from '../useGame';
import { useAuth } from '../useAuth';
import type { Game, GameSettings } from '@/types';

// Mock dependencies
vi.mock('../useAuth');

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();
const mockOn = vi.fn();
const mockSubscribe = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

describe('useGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockLimit.mockReturnValue({ single: mockSingle });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ limit: mockLimit, eq: mockEq });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });

    // Setup realtime channel mock
    mockSubscribe.mockReturnValue(undefined);
    mockOn.mockReturnValue({ subscribe: mockSubscribe });
    mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when used outside GameProvider', () => {
    expect(() => {
      renderHook(() => useGame());
    }).toThrow('useGame must be used within a GameProvider');
  });

  it('should initialize with loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.game).toBeNull();
  });

  it('should listen to game updates when user is authenticated', async () => {
    const mockUser = {
      id: 'gm-123',
      nickname: 'GameMaster',
      role: 'gamemaster' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockGameData = {
      id: 'current-game',
      status: 'waiting',
      duration_minutes: 60,
      start_time: null,
      end_time: null,
    };

    mockSingle.mockResolvedValue({
      data: mockGameData,
      error: null,
    });

    let channelCallback: (payload: any) => void = () => {};
    mockOn.mockImplementation((event: string, filter: any, callback: any) => {
      channelCallback = callback;
      return { subscribe: mockSubscribe };
    });

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockChannel).toHaveBeenCalledWith('game_state_changes');
  });

  it('should create a new game as gamemaster', async () => {
    const mockUser = {
      id: 'gm-123',
      nickname: 'GameMaster',
      role: 'gamemaster' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    mockInsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    const settings: GameSettings = {
      locationUpdateInterval: 5000,
      locationAccuracy: 10,
      safeZones: [],
      restrictedZones: [],
      chaserRadarRange: 100,
    };

    await act(async () => {
      await result.current.createGame(settings, 60);
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'waiting',
        duration_minutes: 60,
      })
    );
  });

  it('should reject createGame for non-gamemaster users', async () => {
    const mockUser = {
      id: 'runner-123',
      nickname: 'Runner',
      role: 'runner' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    const settings: GameSettings = {
      locationUpdateInterval: 5000,
      locationAccuracy: 10,
      safeZones: [],
      restrictedZones: [],
      chaserRadarRange: 100,
    };

    await expect(async () => {
      await act(async () => {
        await result.current.createGame(settings, 60);
      });
    }).rejects.toThrow('Only game masters can create games');
  });

  it('should start a game', async () => {
    const mockUser = {
      id: 'gm-123',
      nickname: 'GameMaster',
      role: 'gamemaster' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockGameData = {
      id: 'current-game',
      status: 'waiting',
      duration_minutes: 60,
      start_time: null,
      end_time: null,
    };

    mockSingle.mockResolvedValue({
      data: mockGameData,
      error: null,
    });

    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    await waitFor(() => {
      expect(result.current.game).not.toBeNull();
    });

    await act(async () => {
      await result.current.startGame();
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
      })
    );
  });

  it('should pause a game', async () => {
    const mockUser = {
      id: 'gm-123',
      nickname: 'GameMaster',
      role: 'gamemaster' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockGameData = {
      id: 'current-game',
      status: 'active',
      duration_minutes: 60,
      start_time: new Date().toISOString(),
      end_time: null,
    };

    mockSingle.mockResolvedValue({
      data: mockGameData,
      error: null,
    });

    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    await waitFor(() => {
      expect(result.current.game).not.toBeNull();
    });

    await act(async () => {
      await result.current.pauseGame();
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'paused',
      })
    );
  });

  it('should end a game', async () => {
    const mockUser = {
      id: 'gm-123',
      nickname: 'GameMaster',
      role: 'gamemaster' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockGameData = {
      id: 'current-game',
      status: 'active',
      duration_minutes: 60,
      start_time: new Date().toISOString(),
      end_time: null,
    };

    mockSingle.mockResolvedValue({
      data: mockGameData,
      error: null,
    });

    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    await waitFor(() => {
      expect(result.current.game).not.toBeNull();
    });

    await act(async () => {
      await result.current.endGame();
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'finished',
      })
    );
  });

  it('should update game settings', async () => {
    const mockUser = {
      id: 'gm-123',
      nickname: 'GameMaster',
      role: 'gamemaster' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockGameData = {
      id: 'current-game',
      status: 'waiting',
      duration_minutes: 60,
      start_time: null,
      end_time: null,
    };

    mockSingle.mockResolvedValue({
      data: mockGameData,
      error: null,
    });

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    await waitFor(() => {
      expect(result.current.game).not.toBeNull();
    });

    const newSettings = {
      chaserRadarRange: 150,
    };

    await act(async () => {
      await result.current.updateGameSettings(newSettings);
    });

    // Settings are updated in memory
    expect(result.current.game?.settings.chaserRadarRange).toBe(150);
  });

  it('should handle timestamp conversion', async () => {
    const mockUser = {
      id: 'gm-123',
      nickname: 'GameMaster',
      role: 'gamemaster' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockGameData = {
      id: 'current-game',
      status: 'active',
      duration_minutes: 60,
      start_time: '2023-11-14T12:00:00.000Z',
      end_time: '2023-11-14T13:00:00.000Z',
    };

    mockSingle.mockResolvedValue({
      data: mockGameData,
      error: null,
    });

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    await waitFor(() => {
      expect(result.current.game).not.toBeNull();
      expect(result.current.game?.startTime).toBeInstanceOf(Date);
      expect(result.current.game?.endTime).toBeInstanceOf(Date);
    });
  });
});
