import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MissionProvider, useMissions } from '../useMissions';
import { useAuth } from '../useAuth';
import { useLocation } from '../useLocation';
import type { Mission, Location } from '@/types';

// Mock dependencies
vi.mock('../useAuth');
vi.mock('../useLocation');
vi.mock('@/lib/firebase', () => ({
  db: {},
}));

const mockOnSnapshot = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockServerTimestamp = vi.fn(() => new Date());

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

describe('useMissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSnapshot.mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when used outside MissionProvider', () => {
    expect(() => {
      renderHook(() => useMissions());
    }).toThrow('useMissions must be used within a MissionProvider');
  });

  it('should initialize with empty missions when no user', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    vi.mocked(useLocation).mockReturnValue({
      location: null,
      isTracking: false,
      error: null,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    expect(result.current.missions).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should listen to missions when user is authenticated', async () => {
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

    vi.mocked(useLocation).mockReturnValue({
      location: null,
      isTracking: false,
      error: null,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    const mockMissions: Mission[] = [
      {
        id: 'mission-1',
        title: 'Reach Point A',
        description: 'Get to the destination',
        type: 'area',
        completed: false,
        completedBy: [],
        targetLocation: { lat: 35.6812, lng: 139.7671 },
        radius: 50,
      },
    ];

    let snapshotCallback: (snapshot: any) => void = () => {};
    mockOnSnapshot.mockImplementation((_, callback) => {
      snapshotCallback = callback;
      return () => {};
    });

    renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    expect(mockOnSnapshot).toHaveBeenCalled();

    act(() => {
      snapshotCallback({
        docs: mockMissions.map((mission) => ({
          id: mission.id,
          data: () => mission,
        })),
      });
    });

    await waitFor(() => {
      expect(mockOnSnapshot).toHaveBeenCalled();
    });
  });

  it('should create a mission as gamemaster', async () => {
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

    vi.mocked(useLocation).mockReturnValue({
      location: null,
      isTracking: false,
      error: null,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    mockSetDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    const targetLocation: Location = { lat: 35.6812, lng: 139.7671 };

    await act(async () => {
      await result.current.createMission(
        'Test Mission',
        'Test Description',
        'area',
        targetLocation,
        50,
        300
      );
    });

    expect(mockSetDoc).toHaveBeenCalled();
    const setDocCall = mockSetDoc.mock.calls[0];
    expect(setDocCall).toBeDefined();
    const missionData = setDocCall[1];
    expect(missionData).toMatchObject({
      title: 'Test Mission',
      description: 'Test Description',
      type: 'area',
      completed: false,
      completedBy: [],
      targetLocation,
      radius: 50,
      duration: 300,
    });
  });

  it('should reject createMission for non-gamemaster users', async () => {
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

    vi.mocked(useLocation).mockReturnValue({
      location: null,
      isTracking: false,
      error: null,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    await expect(async () => {
      await act(async () => {
        await result.current.createMission(
          'Test Mission',
          'Test Description',
          'area'
        );
      });
    }).rejects.toThrow('Only game masters can create missions');
  });

  it('should delete a mission as gamemaster', async () => {
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

    vi.mocked(useLocation).mockReturnValue({
      location: null,
      isTracking: false,
      error: null,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    mockDeleteDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    await act(async () => {
      await result.current.deleteMission('mission-1');
    });

    expect(mockDeleteDoc).toHaveBeenCalled();
  });

  it('should complete a mission', async () => {
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

    vi.mocked(useLocation).mockReturnValue({
      location: null,
      isTracking: false,
      error: null,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    const mockMissions: Mission[] = [
      {
        id: 'mission-1',
        title: 'Test Mission',
        description: 'Test',
        type: 'area',
        completed: false,
        completedBy: [],
      },
    ];

    let snapshotCallback: (snapshot: any) => void = () => {};
    mockOnSnapshot.mockImplementation((_, callback) => {
      snapshotCallback = callback;
      return () => {};
    });

    mockUpdateDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    act(() => {
      snapshotCallback({
        docs: mockMissions.map((mission) => ({
          id: mission.id,
          data: () => mission,
        })),
      });
    });

    await act(async () => {
      await result.current.completeMission('mission-1');
    });

    expect(mockUpdateDoc).toHaveBeenCalled();
    const updateCall = mockUpdateDoc.mock.calls[0];
    expect(updateCall[1]).toMatchObject({
      completedBy: ['runner-123'],
      completed: true,
    });
  });

  it('should auto-check mission progress when in area', async () => {
    const mockUser = {
      id: 'runner-123',
      nickname: 'Runner',
      role: 'runner' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    const userLocation: Location = { lat: 35.6812, lng: 139.7671 };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    // Initially no location
    const mockUseLocation = vi.mocked(useLocation);
    mockUseLocation.mockReturnValue({
      location: null,
      isTracking: false,
      error: null,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    const mockMissions: Mission[] = [
      {
        id: 'mission-1',
        title: 'Reach Point A',
        description: 'Get to the destination',
        type: 'area',
        completed: false,
        completedBy: [],
        targetLocation: { lat: 35.6812, lng: 139.7671 }, // Same as user location
        radius: 50,
      },
    ];

    let snapshotCallback: (snapshot: any) => void = () => {};
    mockOnSnapshot.mockImplementation((_, callback) => {
      snapshotCallback = callback;
      return () => {};
    });

    mockUpdateDoc.mockResolvedValue(undefined);

    const { rerender } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    // Set missions
    act(() => {
      snapshotCallback({
        docs: mockMissions.map((mission) => ({
          id: mission.id,
          data: () => mission,
        })),
      });
    });

    // Now update location to trigger mission check
    mockUseLocation.mockReturnValue({
      location: userLocation,
      isTracking: true,
      error: null,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    rerender();

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('should calculate distance correctly', async () => {
    const mockUser = {
      id: 'runner-123',
      nickname: 'Runner',
      role: 'runner' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    // User is far from mission location
    const userLocation: Location = { lat: 35.6812, lng: 139.7671 }; // Tokyo
    const missionLocation: Location = { lat: 34.6937, lng: 135.5023 }; // Osaka - about 400km away

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockUseLocation = vi.mocked(useLocation);
    mockUseLocation.mockReturnValue({
      location: null,
      isTracking: false,
      error: null,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    const mockMissions: Mission[] = [
      {
        id: 'mission-1',
        title: 'Reach Osaka',
        description: 'Get to Osaka',
        type: 'area',
        completed: false,
        completedBy: [],
        targetLocation: missionLocation,
        radius: 50, // Only 50m radius
      },
    ];

    let snapshotCallback: (snapshot: any) => void = () => {};
    mockOnSnapshot.mockImplementation((_, callback) => {
      snapshotCallback = callback;
      return () => {};
    });

    mockUpdateDoc.mockResolvedValue(undefined);

    const { rerender } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    act(() => {
      snapshotCallback({
        docs: mockMissions.map((mission) => ({
          id: mission.id,
          data: () => mission,
        })),
      });
    });

    // Update location - user is too far
    mockUseLocation.mockReturnValue({
      location: userLocation,
      isTracking: true,
      error: null,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    rerender();

    // Wait a bit to ensure no update happens
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should NOT auto-complete because user is too far
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('should handle escape missions', async () => {
    const mockUser = {
      id: 'runner-123',
      nickname: 'Runner',
      role: 'runner' as const,
      status: 'active' as const,
      lastUpdated: new Date(),
    };

    const userLocation: Location = { lat: 35.6812, lng: 139.7671 };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockUseLocation = vi.mocked(useLocation);
    mockUseLocation.mockReturnValue({
      location: null,
      isTracking: false,
      error: null,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    const mockMissions: Mission[] = [
      {
        id: 'mission-1',
        title: 'Escape to Safety',
        description: 'Reach the safe zone',
        type: 'escape',
        completed: false,
        completedBy: [],
        targetLocation: { lat: 35.6812, lng: 139.7671 },
        radius: 50,
      },
    ];

    let snapshotCallback: (snapshot: any) => void = () => {};
    mockOnSnapshot.mockImplementation((_, callback) => {
      snapshotCallback = callback;
      return () => {};
    });

    mockUpdateDoc.mockResolvedValue(undefined);

    const { rerender } = renderHook(() => useMissions(), {
      wrapper: MissionProvider,
    });

    act(() => {
      snapshotCallback({
        docs: mockMissions.map((mission) => ({
          id: mission.id,
          data: () => mission,
        })),
      });
    });

    mockUseLocation.mockReturnValue({
      location: userLocation,
      isTracking: true,
      error: null,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    rerender();

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
