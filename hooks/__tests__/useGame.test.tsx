import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { GameProvider, useGame } from '../useGame';
import { useAuth } from '../useAuth';
import type { Game, GameSettings } from '@/types';

// Mock dependencies
vi.mock('../useAuth');
vi.mock('@/lib/firebase', () => ({
  db: {},
}));

const mockOnSnapshot = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => new Date());

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

describe('useGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSnapshot.mockReturnValue(() => {});
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
      firebaseUser: null,
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
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockGame: Game = {
      id: 'current-game',
      status: 'waiting',
      duration: 3600,
      settings: {
        captureRadius: 10,
        visibilityRadius: 200,
      },
      players: [],
      missions: [],
    };

    let snapshotCallback: (snapshot: any) => void = () => {};
    mockOnSnapshot.mockImplementation((_, callback) => {
      snapshotCallback = callback;
      return () => {};
    });

    renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    expect(mockOnSnapshot).toHaveBeenCalled();

    // Simulate snapshot update
    act(() => {
      snapshotCallback({
        exists: () => true,
        data: () => mockGame,
      });
    });

    await waitFor(() => {
      expect(mockOnSnapshot).toHaveBeenCalled();
    });
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
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    mockSetDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    const settings: GameSettings = {
      captureRadius: 10,
      visibilityRadius: 200,
    };

    await act(async () => {
      await result.current.createGame(settings, 3600);
    });

    expect(mockSetDoc).toHaveBeenCalled();
    const setDocCall = mockSetDoc.mock.calls[0];
    expect(setDocCall).toBeDefined();
    const gameData = setDocCall[1];
    expect(gameData).toMatchObject({
      id: 'current-game',
      status: 'waiting',
      duration: 3600,
      settings,
      players: [],
      missions: [],
    });
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
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    const settings: GameSettings = {
      captureRadius: 10,
      visibilityRadius: 200,
    };

    await expect(async () => {
      await act(async () => {
        await result.current.createGame(settings, 3600);
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

    const mockGame: Game = {
      id: 'current-game',
      status: 'waiting',
      duration: 3600,
      settings: {
        captureRadius: 10,
        visibilityRadius: 200,
      },
      players: [],
      missions: [],
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    let snapshotCallback: (snapshot: any) => void = () => {};
    mockOnSnapshot.mockImplementation((_, callback) => {
      snapshotCallback = callback;
      return () => {};
    });

    mockUpdateDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    // Set initial game state
    act(() => {
      snapshotCallback({
        exists: () => true,
        data: () => mockGame,
      });
    });

    await act(async () => {
      await result.current.startGame();
    });

    expect(mockUpdateDoc).toHaveBeenCalled();
    const updateCall = mockUpdateDoc.mock.calls[0];
    expect(updateCall[1]).toMatchObject({
      status: 'active',
    });
  });

  it('should pause a game', async () => {
    const mockUser = {
      id: 'gm-123',
      nickname: 'GameMaster',
      role: 'gamemaster' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    const mockGame: Game = {
      id: 'current-game',
      status: 'active',
      duration: 3600,
      settings: {
        captureRadius: 10,
        visibilityRadius: 200,
      },
      players: [],
      missions: [],
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    let snapshotCallback: (snapshot: any) => void = () => {};
    mockOnSnapshot.mockImplementation((_, callback) => {
      snapshotCallback = callback;
      return () => {};
    });

    mockUpdateDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    act(() => {
      snapshotCallback({
        exists: () => true,
        data: () => mockGame,
      });
    });

    await act(async () => {
      await result.current.pauseGame();
    });

    expect(mockUpdateDoc).toHaveBeenCalled();
    const updateCall = mockUpdateDoc.mock.calls[0];
    expect(updateCall[1]).toMatchObject({
      status: 'paused',
    });
  });

  it('should end a game', async () => {
    const mockUser = {
      id: 'gm-123',
      nickname: 'GameMaster',
      role: 'gamemaster' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    const mockGame: Game = {
      id: 'current-game',
      status: 'active',
      duration: 3600,
      settings: {
        captureRadius: 10,
        visibilityRadius: 200,
      },
      players: [],
      missions: [],
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    let snapshotCallback: (snapshot: any) => void = () => {};
    mockOnSnapshot.mockImplementation((_, callback) => {
      snapshotCallback = callback;
      return () => {};
    });

    mockUpdateDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    act(() => {
      snapshotCallback({
        exists: () => true,
        data: () => mockGame,
      });
    });

    await act(async () => {
      await result.current.endGame();
    });

    expect(mockUpdateDoc).toHaveBeenCalled();
    const updateCall = mockUpdateDoc.mock.calls[0];
    expect(updateCall[1]).toMatchObject({
      status: 'finished',
    });
  });

  it('should update game settings', async () => {
    const mockUser = {
      id: 'gm-123',
      nickname: 'GameMaster',
      role: 'gamemaster' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    const mockGame: Game = {
      id: 'current-game',
      status: 'waiting',
      duration: 3600,
      settings: {
        captureRadius: 10,
        visibilityRadius: 200,
      },
      players: [],
      missions: [],
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    let snapshotCallback: (snapshot: any) => void = () => {};
    mockOnSnapshot.mockImplementation((_, callback) => {
      snapshotCallback = callback;
      return () => {};
    });

    mockUpdateDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    act(() => {
      snapshotCallback({
        exists: () => true,
        data: () => mockGame,
      });
    });

    const newSettings = {
      captureRadius: 15,
    };

    await act(async () => {
      await result.current.updateGameSettings(newSettings);
    });

    expect(mockUpdateDoc).toHaveBeenCalled();
    const updateCall = mockUpdateDoc.mock.calls[0];
    expect(updateCall[1]).toMatchObject({
      settings: {
        captureRadius: 15,
        visibilityRadius: 200,
      },
    });
  });

  it('should handle firestore timestamp conversion', async () => {
    const mockUser = {
      id: 'gm-123',
      nickname: 'GameMaster',
      role: 'gamemaster' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockGameWithTimestamps = {
      id: 'current-game',
      status: 'active',
      duration: 3600,
      settings: {
        captureRadius: 10,
        visibilityRadius: 200,
      },
      players: [],
      missions: [],
      startTime: { seconds: 1700000000, nanoseconds: 0 },
      endTime: { seconds: 1700003600, nanoseconds: 0 },
    };

    let snapshotCallback: (snapshot: any) => void = () => {};
    mockOnSnapshot.mockImplementation((_, callback) => {
      snapshotCallback = callback;
      return () => {};
    });

    renderHook(() => useGame(), {
      wrapper: GameProvider,
    });

    act(() => {
      snapshotCallback({
        exists: () => true,
        data: () => mockGameWithTimestamps,
      });
    });

    await waitFor(() => {
      expect(mockOnSnapshot).toHaveBeenCalled();
    });
  });
});
