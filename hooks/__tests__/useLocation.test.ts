import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLocation } from '../useLocation';
import { useAuth } from '../useAuth';

// Mock the dependencies
vi.mock('../useAuth');
vi.mock('@/lib/firebase', () => ({
  db: {},
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(),
}));

describe('useLocation', () => {
  let mockGeolocation: {
    watchPosition: ReturnType<typeof vi.fn>;
    clearWatch: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Mock geolocation API
    mockGeolocation = {
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };

    Object.defineProperty(global.navigator, 'geolocation', {
      writable: true,
      value: mockGeolocation,
    });

    // Mock useAuth hook
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user-id', nickname: 'Test User', role: 'runner', status: 'active', lastUpdated: new Date() },
      firebaseUser: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null location and not tracking', () => {
    const { result } = renderHook(() => useLocation());

    expect(result.current.location).toBeNull();
    expect(result.current.isTracking).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set error when geolocation is not supported', () => {
    // @ts-expect-error - intentionally setting to undefined
    Object.defineProperty(global.navigator, 'geolocation', {
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useLocation());

    act(() => {
      result.current.startTracking();
    });

    expect(result.current.error).toBe('Geolocation is not supported');
    expect(result.current.isTracking).toBe(false);
  });

  it('should start tracking when startTracking is called', () => {
    const { result } = renderHook(() => useLocation());

    act(() => {
      result.current.startTracking();
    });

    expect(mockGeolocation.watchPosition).toHaveBeenCalled();
    expect(result.current.isTracking).toBe(true);
  });

  it('should update location when position changes', async () => {
    let positionCallback: (position: GeolocationPosition) => void = () => {};

    mockGeolocation.watchPosition.mockImplementation((success) => {
      positionCallback = success;
      return 1;
    });

    const { result } = renderHook(() => useLocation());

    act(() => {
      result.current.startTracking();
    });

    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 35.6812,
        longitude: 139.7671,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    // Call the position callback synchronously
    act(() => {
      positionCallback(mockPosition);
    });

    // Wait for state update
    await waitFor(() => {
      expect(result.current.location).not.toBeNull();
    }, { timeout: 3000 });

    expect(result.current.location).toMatchObject({
      lat: 35.6812,
      lng: 139.7671,
      accuracy: 10,
    });
  });

  it('should handle geolocation errors', async () => {
    let errorCallback: (error: GeolocationPositionError) => void = () => {};

    mockGeolocation.watchPosition.mockImplementation((_, error) => {
      errorCallback = error!;
      return 1;
    });

    const { result } = renderHook(() => useLocation());

    act(() => {
      result.current.startTracking();
    });

    const mockError: GeolocationPositionError = {
      code: 1,
      message: 'User denied geolocation',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    // Call the error callback synchronously
    act(() => {
      errorCallback(mockError);
    });

    // Wait for state update
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    }, { timeout: 3000 });

    expect(result.current.error).toBe('User denied geolocation');
    expect(result.current.isTracking).toBe(false);
  });

  it('should stop tracking when stopTracking is called', () => {
    mockGeolocation.watchPosition.mockReturnValue(1);

    const { result } = renderHook(() => useLocation());

    act(() => {
      result.current.startTracking();
    });

    expect(result.current.isTracking).toBe(true);

    act(() => {
      result.current.stopTracking();
    });

    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(1);
    expect(result.current.isTracking).toBe(false);
  });

  it('should cleanup tracking on unmount', () => {
    mockGeolocation.watchPosition.mockReturnValue(1);

    const { result, unmount } = renderHook(() => useLocation());

    act(() => {
      result.current.startTracking();
    });

    unmount();

    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(1);
  });

  it('should respect custom update interval', () => {
    const customInterval = 10000;
    const { result } = renderHook(() => useLocation(customInterval));

    act(() => {
      result.current.startTracking();
    });

    expect(mockGeolocation.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        maximumAge: customInterval,
      })
    );
  });
});
