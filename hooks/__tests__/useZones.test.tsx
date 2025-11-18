import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useZones, ZoneProvider } from '../useZones';
import { useAuth } from '../useAuth';
import { useLocation } from '../useLocation';
import { supabase } from '@/lib/supabase';
import type { User, Location, Zone } from '@/types';

// Mock dependencies
vi.mock('../useAuth');
vi.mock('../useLocation');
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('useZones', () => {
  const mockGameMaster: User = {
    id: 'gm-1',
    nickname: 'Test GM',
    role: 'gamemaster',
    status: 'active',
    lastUpdated: new Date(),
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

  const mockSafeZone: Zone = {
    id: 'zone-1',
    name: 'Safe Zone 1',
    type: 'safe',
    center: mockLocation,
    radius: 100,
  };

  const mockRestrictedZone: Zone = {
    id: 'zone-2',
    name: 'Restricted Zone 1',
    type: 'restricted',
    center: { lat: 35.659584, lng: 139.746438, timestamp: new Date() },
    radius: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAuth
    vi.mocked(useAuth).mockReturnValue({
      user: mockRunner,
      session: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    // Mock useLocation
    vi.mocked(useLocation).mockReturnValue({
      location: mockLocation,
      error: null,
      isTracking: true,
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty zones list', async () => {
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
      <ZoneProvider>{children}</ZoneProvider>
    );

    const { result } = renderHook(() => useZones(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.safeZones).toEqual([]);
    expect(result.current.restrictedZones).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch and separate zones by type', async () => {
    const mockDbSafeZone = {
      id: mockSafeZone.id,
      name: mockSafeZone.name,
      type: mockSafeZone.type,
      center_latitude: mockSafeZone.center.lat,
      center_longitude: mockSafeZone.center.lng,
      radius_meters: mockSafeZone.radius,
      active: true,
    };

    const mockDbRestrictedZone = {
      id: mockRestrictedZone.id,
      name: mockRestrictedZone.name,
      type: mockRestrictedZone.type,
      center_latitude: mockRestrictedZone.center.lat,
      center_longitude: mockRestrictedZone.center.lng,
      radius_meters: mockRestrictedZone.radius,
      active: true,
    };

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({
      data: [mockDbSafeZone, mockDbRestrictedZone],
      error: null,
    });

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
      <ZoneProvider>{children}</ZoneProvider>
    );

    const { result } = renderHook(() => useZones(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.safeZones).toHaveLength(1);
    expect(result.current.restrictedZones).toHaveLength(1);
    expect(result.current.safeZones[0]!.id).toBe(mockSafeZone.id);
    expect(result.current.restrictedZones[0]!.id).toBe(mockRestrictedZone.id);
  });

  it('should create a zone as gamemaster', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockGameMaster,
      loading: false,
      error: null,
      session: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'zones') {
        return {
          select: mockSelect,
          eq: mockEq,
          insert: mockInsert,
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
      <ZoneProvider>{children}</ZoneProvider>
    );

    const { result } = renderHook(() => useZones(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.createZone('New Safe Zone', 'safe', mockLocation, 150);
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Safe Zone',
        type: 'safe',
        center_lat: mockLocation.lat,
        center_lng: mockLocation.lng,
        radius_meters: 150,
        active: true,
      })
    );
  });

  it('should throw error if non-gamemaster tries to create zone', async () => {
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
      <ZoneProvider>{children}</ZoneProvider>
    );

    const { result } = renderHook(() => useZones(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.createZone('Test Zone', 'safe', mockLocation, 100);
      })
    ).rejects.toThrow('Only game masters can create zones');
  });

  it('should delete a zone as gamemaster', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockGameMaster,
      loading: false,
      error: null,
      session: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockDelete = vi.fn().mockReturnThis();
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'zones') {
        return {
          select: mockSelect,
          eq: mockEq,
          delete: () => ({
            eq: mockDeleteEq,
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
      <ZoneProvider>{children}</ZoneProvider>
    );

    const { result } = renderHook(() => useZones(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteZone('zone-1');
    });

    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'zone-1');
  });

  it('should check if player is in safe zone', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({
      data: [
        {
          id: mockSafeZone.id,
          name: mockSafeZone.name,
          type: mockSafeZone.type,
          center_latitude: mockSafeZone.center.lat,
          center_longitude: mockSafeZone.center.lng,
          radius_meters: mockSafeZone.radius,
          active: true,
        },
      ],
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    } as any);

    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          zone_id: mockSafeZone.id,
          zone_name: mockSafeZone.name,
          distance_meters: 50,
        },
      ],
      error: null,
    });
    (supabase as any).rpc = mockRpc;

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ZoneProvider>{children}</ZoneProvider>
    );

    const { result } = renderHook(() => useZones(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let isInSafeZone;
    await act(async () => {
      isInSafeZone = await result.current.isInSafeZone(mockLocation);
    });

    expect(isInSafeZone).toBe(true);
  });

  it('should check if player is in restricted zone', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    } as any);

    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          zone_id: mockRestrictedZone.id,
          zone_name: mockRestrictedZone.name,
          distance_meters: 30,
        },
      ],
      error: null,
    });
    (supabase as any).rpc = mockRpc;

    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ZoneProvider>{children}</ZoneProvider>
    );

    const { result } = renderHook(() => useZones(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let isInRestrictedZone;
    await act(async () => {
      isInRestrictedZone = await result.current.isInRestrictedZone(mockLocation);
    });

    expect(isInRestrictedZone).toBe(true);
  });

  it('should handle real-time zone updates', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    } as any);

    let zoneCallback: any;
    const mockChannel = {
      on: vi.fn((event, config, callback) => {
        zoneCallback = callback;
        return mockChannel;
      }),
      subscribe: vi.fn(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ZoneProvider>{children}</ZoneProvider>
    );

    const { result } = renderHook(() => useZones(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate real-time insert
    act(() => {
      zoneCallback({
        eventType: 'INSERT',
        new: {
          id: 'zone-3',
          name: 'New Safe Zone',
          type: 'safe',
          center_latitude: 35.66,
          center_longitude: 139.75,
          radius_meters: 120,
          active: true,
        },
      });
    });

    await waitFor(() => {
      expect(result.current.safeZones).toHaveLength(1);
    });

    expect(result.current.safeZones[0]!.id).toBe('zone-3');
  });

  it('should throw error when used outside ZoneProvider', () => {
    expect(() => renderHook(() => useZones())).toThrow(
      'useZones must be used within a ZoneProvider'
    );
  });
});
