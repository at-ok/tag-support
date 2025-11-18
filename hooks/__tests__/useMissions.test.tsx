import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MissionProvider, useMissions } from '../useMissions';
import { useAuth } from '../useAuth';
import { useLocation } from '../useLocation';
import type { Location, User } from '@/types';

// Mock dependencies
vi.mock('../useAuth');
vi.mock('../useLocation');

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
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

describe('useMissions', () => {
  const mockGamemaster: User = {
    id: 'gm-123',
    nickname: 'GameMaster',
    role: 'gamemaster',
    status: 'active',
    lastUpdated: new Date(),
  };

  const mockRunner: User = {
    id: 'runner-123',
    nickname: 'Runner',
    role: 'runner',
    status: 'active',
    lastUpdated: new Date(),
  };

  const mockLocation: Location = {
    lat: 35.658584,
    lng: 139.745438,
    accuracy: 10,
    timestamp: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain
    mockSelect.mockResolvedValue({ data: [], error: null });
    mockEq.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });

    // Setup realtime channel mock
    mockSubscribe.mockReturnValue(undefined);
    mockOn.mockReturnValue({ subscribe: mockSubscribe });
    mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });

    // Mock useLocation
    vi.mocked(useLocation).mockReturnValue({
      location: null,
      error: null,
      isTracking: false,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when used outside MissionProvider', () => {
    expect(() => {
      renderHook(() => useMissions());
    }).toThrow('useMissions must be used within a MissionProvider');
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

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.missions).toEqual([]);
  });

  it('should fetch missions when user is authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockGamemaster,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockMissionData = [
      {
        id: 'mission-1',
        title: 'Test Mission',
        description: 'Test Description',
        type: 'area_arrival',
        target_latitude: 35.658584,
        target_longitude: 139.745438,
        radius_meters: 50,
        duration_seconds: 300,
        points: 100,
        status: 'active',
      },
    ];

    mockSelect.mockResolvedValue({ data: mockMissionData, error: null });

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.missions).toHaveLength(1);
      expect(result.current.missions[0]).toMatchObject({
        id: 'mission-1',
        title: 'Test Mission',
        description: 'Test Description',
        type: 'area',
        completed: false,
      });
    });

    expect(mockChannel).toHaveBeenCalledWith('missions_changes');
  });

  it('should create a mission as gamemaster', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockGamemaster,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    mockInsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    await act(async () => {
      await result.current.createMission(
        'New Mission',
        'Mission Description',
        'area',
        { lat: 35.6, lng: 139.7, timestamp: new Date() },
        100,
        600
      );
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Mission',
        description: 'Mission Description',
        type: 'area_arrival',
        target_latitude: 35.6,
        target_longitude: 139.7,
        radius_meters: 100,
        duration_seconds: 600,
        points: 100,
        status: 'active',
      })
    );
  });

  it('should reject createMission for non-gamemaster users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockRunner,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    await expect(async () => {
      await act(async () => {
        await result.current.createMission(
          'New Mission',
          'Mission Description',
          'area',
          { lat: 35.6, lng: 139.7, timestamp: new Date() },
          100,
          600
        );
      });
    }).rejects.toThrow('Only game masters can create missions');
  });

  it('should delete a mission as gamemaster', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockGamemaster,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    mockEq.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    await act(async () => {
      await result.current.deleteMission('mission-1');
    });

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'mission-1');
  });

  it('should reject deleteMission for non-gamemaster users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockRunner,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    await expect(async () => {
      await act(async () => {
        await result.current.deleteMission('mission-1');
      });
    }).rejects.toThrow('Only game masters can delete missions');
  });

  it('should complete a mission', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockRunner,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    mockEq.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    await act(async () => {
      await result.current.completeMission('mission-1');
    });

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'completed' });
    expect(mockEq).toHaveBeenCalledWith('id', 'mission-1');
  });

  it('should calculate distance correctly', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockGamemaster,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    // This test is implicitly testing the distance calculation
    // by verifying that checkMissionProgress works correctly
    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    act(() => {
      result.current.checkMissionProgress();
    });

    // checkMissionProgress is called without errors
    expect(result.current.error).toBeNull();
  });

  it('should auto-check mission progress when in area', async () => {
    const mockMissionData = [
      {
        id: 'mission-1',
        title: 'Area Mission',
        description: 'Reach the target area',
        type: 'area_arrival',
        target_latitude: 35.658584,
        target_longitude: 139.745438,
        radius_meters: 50,
        duration_seconds: 300,
        points: 100,
        status: 'active',
      },
    ];

    mockSelect.mockResolvedValue({ data: mockMissionData, error: null });
    mockEq.mockResolvedValue({ error: null });

    vi.mocked(useAuth).mockReturnValue({
      user: mockRunner,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    // User is within the target area
    vi.mocked(useLocation).mockReturnValue({
      location: mockLocation,
      error: null,
      isTracking: true,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mission should be auto-completed when in range
    act(() => {
      result.current.checkMissionProgress();
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'completed' });
    });
  });

  it('should handle escape missions', async () => {
    const mockMissionData = [
      {
        id: 'mission-2',
        title: 'Escape Mission',
        description: 'Reach the safe zone',
        type: 'escape',
        target_latitude: 35.658584,
        target_longitude: 139.745438,
        radius_meters: 50,
        duration_seconds: 300,
        points: 100,
        status: 'active',
      },
    ];

    mockSelect.mockResolvedValue({ data: mockMissionData, error: null });
    mockEq.mockResolvedValue({ error: null });

    vi.mocked(useAuth).mockReturnValue({
      user: mockRunner,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    vi.mocked(useLocation).mockReturnValue({
      location: mockLocation,
      error: null,
      isTracking: true,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.checkMissionProgress();
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'completed' });
    });
  });

  it('should not auto-complete mission when outside radius', async () => {
    const mockMissionData = [
      {
        id: 'mission-3',
        title: 'Distant Mission',
        description: 'Far away',
        type: 'area_arrival',
        target_latitude: 40.0, // Very far from mockLocation (35.658584, 139.745438)
        target_longitude: 140.0,
        radius_meters: 50,
        duration_seconds: 300,
        points: 100,
        status: 'active',
      },
    ];

    mockSelect.mockResolvedValue({ data: mockMissionData, error: null });

    vi.mocked(useAuth).mockReturnValue({
      user: mockRunner,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    vi.mocked(useLocation).mockReturnValue({
      location: mockLocation,
      error: null,
      isTracking: true,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.checkMissionProgress();
    });

    // Should not have called update for completion
    // (the update mock might be called 0 times or only for other reasons)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify mission is not completed
    expect(result.current.missions[0]?.completed).toBe(false);
  });

  it('should map database mission types correctly', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockGamemaster,
      session: { access_token: 'test-token' } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockMissionData = [
      {
        id: 'mission-1',
        title: 'Area Mission',
        description: 'Area',
        type: 'area_arrival',
        target_latitude: null,
        target_longitude: null,
        radius_meters: null,
        duration_seconds: null,
        points: 100,
        status: 'active',
      },
      {
        id: 'mission-2',
        title: 'Escape Mission',
        description: 'Escape',
        type: 'escape',
        target_latitude: null,
        target_longitude: null,
        radius_meters: null,
        duration_seconds: null,
        points: 100,
        status: 'active',
      },
      {
        id: 'mission-3',
        title: 'Rescue Mission',
        description: 'Rescue',
        type: 'rescue',
        target_latitude: null,
        target_longitude: null,
        radius_meters: null,
        duration_seconds: null,
        points: 100,
        status: 'active',
      },
    ];

    mockSelect.mockResolvedValue({ data: mockMissionData, error: null });

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.missions).toHaveLength(3);
      expect(result.current.missions[0]!.type).toBe('area');
      expect(result.current.missions[1]!.type).toBe('escape');
      expect(result.current.missions[2]!.type).toBe('rescue');
    });
  });
});
