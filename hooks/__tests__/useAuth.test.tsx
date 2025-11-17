import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../useAuth';
import type { User as FirebaseUser } from 'firebase/auth';

// Mock Firebase
const mockOnAuthStateChanged = vi.fn();
const mockSignInAnonymously = vi.fn();
const mockSignOut = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn();

// Mock auth object with signOut method
const mockAuth = {
  signOut: mockSignOut,
};

vi.mock('@/lib/firebase', () => ({
  auth: {
    signOut: (...args: unknown[]) => mockSignOut(...args),
  },
  db: {},
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChanged.mockReturnValue(() => {});
  });

  it('should throw error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.firebaseUser).toBeNull();
  });

  it('should handle user sign in with runner role', async () => {
    const mockFirebaseUser = {
      uid: 'test-uid-123',
    } as FirebaseUser;

    mockSignInAnonymously.mockResolvedValue({
      user: mockFirebaseUser,
    });

    mockSetDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signIn('TestPlayer', 'runner', 'TeamA');
    });

    expect(mockSignInAnonymously).toHaveBeenCalled();

    // Verify setDoc was called with correct data structure
    const setDocCall = mockSetDoc.mock.calls[0];
    expect(setDocCall).toBeDefined();
    const userData = setDocCall[1];
    expect(userData).toMatchObject({
      id: 'test-uid-123',
      nickname: 'TestPlayer',
      role: 'runner',
      team: 'TeamA',
      status: 'active',
    });
    expect(userData.lastUpdated).toBeInstanceOf(Date);
  });

  it('should handle user sign in with chaser role', async () => {
    const mockFirebaseUser = {
      uid: 'test-uid-456',
    } as FirebaseUser;

    mockSignInAnonymously.mockResolvedValue({
      user: mockFirebaseUser,
    });

    mockSetDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signIn('Chaser1', 'chaser');
    });

    // Verify setDoc was called with correct data structure
    const setDocCall = mockSetDoc.mock.calls[0];
    expect(setDocCall).toBeDefined();
    const userData = setDocCall[1];
    expect(userData).toMatchObject({
      id: 'test-uid-456',
      nickname: 'Chaser1',
      role: 'chaser',
      status: 'active',
      captureCount: 0,
    });
    expect(userData.lastUpdated).toBeInstanceOf(Date);
  });

  it('should handle sign in errors', async () => {
    const error = new Error('Sign in failed');
    mockSignInAnonymously.mockRejectedValue(error);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    // Attempt to sign in and expect it to throw
    await expect(async () => {
      await act(async () => {
        await result.current.signIn('TestPlayer', 'runner');
      });
    }).rejects.toThrow('Sign in failed');

    // Note: The error state might not be immediately available due to async nature
    // The important part is that the error was thrown, which we verified above
  });

  it('should handle user sign out', async () => {
    mockSignOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('should handle sign out errors', async () => {
    const error = new Error('Sign out failed');
    mockSignOut.mockRejectedValue(error);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await expect(async () => {
      await act(async () => {
        await result.current.signOut();
      });
    }).rejects.toThrow('Sign out failed');
  });

  it('should load existing user data on auth state change', async () => {
    const mockFirebaseUser = {
      uid: 'existing-user-123',
    } as FirebaseUser;

    const mockUserData = {
      id: 'existing-user-123',
      nickname: 'ExistingUser',
      role: 'runner',
      status: 'active',
      team: 'TeamB',
      lastUpdated: new Date(),
    };

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    });

    let authStateCallback: (user: FirebaseUser | null) => void = () => {};
    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      authStateCallback = callback;
      return () => {};
    });

    renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      authStateCallback(mockFirebaseUser);
      await waitFor(() => {
        expect(mockGetDoc).toHaveBeenCalled();
      });
    });

    expect(mockGetDoc).toHaveBeenCalled();
  });

  it('should handle gamemaster role without team', async () => {
    const mockFirebaseUser = {
      uid: 'gm-uid-789',
    } as FirebaseUser;

    mockSignInAnonymously.mockResolvedValue({
      user: mockFirebaseUser,
    });

    mockSetDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signIn('GameMaster', 'gamemaster');
    });

    // Verify setDoc was called with correct data structure
    const setDocCall = mockSetDoc.mock.calls[0];
    expect(setDocCall).toBeDefined();
    const userData = setDocCall[1];
    expect(userData).toMatchObject({
      id: 'gm-uid-789',
      nickname: 'GameMaster',
      role: 'gamemaster',
      status: 'active',
    });
    expect(userData.lastUpdated).toBeInstanceOf(Date);

    // Verify team field is not included
    expect(userData).not.toHaveProperty('team');
  });
});
