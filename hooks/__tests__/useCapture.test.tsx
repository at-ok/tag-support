import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCapture, CaptureProvider } from '../useCapture';
import { useAuth } from '../useAuth';
import { useLocation } from '../useLocation';
import { supabase } from '@/lib/supabase';
import type { User, Location, Capture } from '@/types';

// Mock dependencies
vi.mock('../useAuth');
vi.mock('../useLocation');
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('useCapture', () => {
  const mockChaser: User = {
    id: 'chaser-1',
    nickname: 'Test Chaser',
    role: 'chaser',
    status: 'active',
    lastUpdated: new Date(),
    captureCount: 0,
  };

  const mockRunner: User = {
    id: 'runner-1',
    nickname: 'Test Runner',
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

  const mockCapture: Capture = {
    id: 'capture-1',
    chaserId: 'chaser-1',
    runnerId: 'runner-1',
    location: mockLocation,
    captureTime: new Date(),
    verified: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAuth
    vi.mocked(useAuth).mockReturnValue({
      user: mockChaser,
      loading: false,
      error: null,
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
    });

    // Mock useLocation
    vi.mocked(useLocation).mockReturnValue({
      location: mockLocation,
      error: null,
      accuracy: 10,
      isTracking: true,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty captures list', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    } as any);

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaptureProvider>{children}</CaptureProvider>
    );

    const { result } = renderHook(() => useCapture(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.captures).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch captures for a chaser', async () => {
    const mockDbCapture = {
      id: mockCapture.id,
      chaser_id: mockCapture.chaserId,
      runner_id: mockCapture.runnerId,
      latitude: mockCapture.location.lat,
      longitude: mockCapture.location.lng,
      capture_time: mockCapture.captureTime.toISOString(),
      verified: mockCapture.verified,
    };

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: [mockDbCapture], error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    } as any);

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaptureProvider>{children}</CaptureProvider>
    );

    const { result } = renderHook(() => useCapture(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.captures).toHaveLength(1);
    expect(result.current.captures[0].id).toBe(mockCapture.id);
    expect(result.current.captures[0].chaserId).toBe(mockCapture.chaserId);
  });

  it('should record a capture successfully', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnThis();
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'captures') {
        return {
          select: mockSelect,
          eq: mockEq,
          insert: mockInsert,
        } as any;
      }
      if (table === 'users') {
        return {
          update: () => ({
            eq: mockUpdateEq,
          }),
        } as any;
      }
      return {
        select: mockSelect,
        eq: mockEq,
      } as any;
    });

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaptureProvider>{children}</CaptureProvider>
    );

    const { result } = renderHook(() => useCapture(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.recordCapture('runner-1');
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        chaser_id: mockChaser.id,
        runner_id: 'runner-1',
        latitude: mockLocation.lat,
        longitude: mockLocation.lng,
      })
    );
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'runner-1');
  });

  it('should throw error if non-chaser tries to record capture', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockRunner,
      loading: false,
      error: null,
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    } as any);

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaptureProvider>{children}</CaptureProvider>
    );

    const { result } = renderHook(() => useCapture(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.recordCapture('runner-2');
      })
    ).rejects.toThrow('Only chasers can record captures');
  });

  it('should throw error if location is not available', async () => {
    vi.mocked(useLocation).mockReturnValue({
      location: null,
      error: null,
      accuracy: 0,
      isTracking: false,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    } as any);

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaptureProvider>{children}</CaptureProvider>
    );

    const { result } = renderHook(() => useCapture(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.recordCapture('runner-1');
      })
    ).rejects.toThrow('Location not available');
  });

  it('should get nearby runners within range', async () => {
    const nearbyRunner = {
      id: 'runner-2',
      nickname: 'Nearby Runner',
      role: 'runner',
      team_id: 'team-1',
      status: 'active',
    };

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRpc = vi.fn().mockResolvedValue({
      data: [{ user_id: nearbyRunner.id, distance_meters: 50 }],
      error: null,
    });

    const mockUsersChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // Setup the final eq call in the chain to resolve with data
    mockUsersChain.eq = vi.fn((column) => {
      if (column === 'status') {
        return Promise.resolve({ data: [nearbyRunner], error: null });
      }
      return mockUsersChain;
    });

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'users') {
        return mockUsersChain as any;
      }
      return {
        select: mockSelect,
        eq: mockEq,
      } as any;
    });

    (supabase as any).rpc = mockRpc;

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaptureProvider>{children}</CaptureProvider>
    );

    const { result } = renderHook(() => useCapture(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let nearbyRunners;
    await act(async () => {
      nearbyRunners = await result.current.getNearbyRunners(100);
    });

    expect(nearbyRunners).toHaveLength(1);
    expect(nearbyRunners[0].id).toBe(nearbyRunner.id);
  });

  it('should handle real-time capture updates', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    } as any);

    let captureCallback: any;
    const mockChannel = {
      on: vi.fn((event, config, callback) => {
        captureCallback = callback;
        return mockChannel;
      }),
      subscribe: vi.fn(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaptureProvider>{children}</CaptureProvider>
    );

    const { result } = renderHook(() => useCapture(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate real-time insert
    act(() => {
      captureCallback({
        eventType: 'INSERT',
        new: {
          id: 'capture-2',
          chaser_id: 'chaser-1',
          runner_id: 'runner-2',
          latitude: 35.658584,
          longitude: 139.745438,
          capture_time: new Date().toISOString(),
          verified: false,
        },
      });
    });

    await waitFor(() => {
      expect(result.current.captures).toHaveLength(1);
    });

    expect(result.current.captures[0].id).toBe('capture-2');
  });

  it('should throw error when used outside CaptureProvider', () => {
    expect(() => renderHook(() => useCapture())).toThrow(
      'useCapture must be used within a CaptureProvider'
    );
  });
});
