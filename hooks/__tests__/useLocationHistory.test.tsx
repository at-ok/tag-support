import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLocationHistory } from '../useLocationHistory';
import { supabase } from '@/lib/supabase';
import { calculateDistance } from '@/lib/geometry';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: null,
          })),
          data: null,
          error: null,
        })),
      })),
    })),
  },
}));

describe('useLocationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useLocationHistory());

    expect(result.current.history).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should provide fetchHistory function', () => {
    const { result } = renderHook(() => useLocationHistory({ userId: 'user1', gameId: 'game1' }));

    expect(result.current.loading).toBe(false);
    expect(typeof result.current.fetchHistory).toBe('function');
  });

  it('should calculate distance between two points', () => {
    const distance = calculateDistance(
      { lat: 35.6895, lng: 139.6917, timestamp: new Date() },
      { lat: 35.6896, lng: 139.6918, timestamp: new Date() }
    );

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(20); // Should be a small distance in meters
  });

  it('should record a location', async () => {
    const mockInsert = vi.fn(() => Promise.resolve({ data: null, error: null }));

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);

    const { result } = renderHook(() => useLocationHistory({ userId: 'user1' }));

    await result.current.recordLocation(
      { lat: 35.6895, lng: 139.6917, timestamp: new Date() },
      1.5,
      90
    );

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  it('should throw error when recording without userId', async () => {
    const { result } = renderHook(() => useLocationHistory());

    await expect(
      result.current.recordLocation({ lat: 35.6895, lng: 139.6917, timestamp: new Date() })
    ).rejects.toThrow('User ID is required');
  });

  it('should clear history', async () => {
    const { result } = renderHook(() => useLocationHistory({ userId: 'user1' }));

    const mockDelete = vi.fn(() => Promise.resolve({ data: null, error: null }));

    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(mockDelete),
        })),
      })),
    } as any);

    await result.current.clearHistory();

    expect(result.current.history).toEqual([]);
    expect(result.current.stats).toBeNull();
  });

  it('should handle fetch errors gracefully', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null, error: new Error('Network error') })),
        })),
        order: vi.fn(() => Promise.resolve({ data: null, error: new Error('Network error') })),
      })),
    } as any);

    const { result } = renderHook(() => useLocationHistory({ userId: 'user1' }));

    await result.current.fetchHistory();

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should initialize stats as null', () => {
    const { result } = renderHook(() => useLocationHistory({ userId: 'user1', gameId: 'game1' }));

    expect(result.current.stats).toBeNull();
    expect(result.current.history).toEqual([]);
  });

  it('should auto-fetch when autoTrack is enabled', async () => {
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    }));

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    renderHook(() => useLocationHistory({ userId: 'user1', autoTrack: true }));

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalled();
    });
  });
});
