import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../useAuth';

// Mock Supabase
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    // Setup chain for supabase.from('users').select().eq().single()
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });
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
    expect(result.current.session).toBeNull();
  });

  it('should handle user sign in with runner role', async () => {
    const mockUser = {
      id: 'test-uid-123',
      email: 'testplayer@temp.tag-game.local',
    };

    const mockUserData = {
      id: 'test-uid-123',
      nickname: 'TestPlayer',
      role: 'runner',
      team_id: 'TeamA',
      status: 'active',
      updated_at: new Date().toISOString(),
    };

    mockSignUp.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: mockUserData,
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signIn('TestPlayer', 'runner', 'TeamA');
    });

    expect(mockSignUp).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-uid-123',
        nickname: 'TestPlayer',
        role: 'runner',
        team_id: 'TeamA',
        status: 'active',
      })
    );

    await waitFor(() => {
      expect(result.current.user).toMatchObject({
        id: 'test-uid-123',
        nickname: 'TestPlayer',
        role: 'runner',
        team: 'TeamA',
        status: 'active',
      });
    });
  });

  it('should handle user sign in with chaser role', async () => {
    const mockUser = {
      id: 'test-uid-456',
      email: 'chaser1@temp.tag-game.local',
    };

    const mockUserData = {
      id: 'test-uid-456',
      nickname: 'Chaser1',
      role: 'chaser',
      team_id: null,
      status: 'active',
      updated_at: new Date().toISOString(),
    };

    mockSignUp.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: mockUserData,
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signIn('Chaser1', 'chaser');
    });

    expect(mockSignUp).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-uid-456',
        nickname: 'Chaser1',
        role: 'chaser',
        team_id: null,
        status: 'active',
      })
    );

    await waitFor(() => {
      expect(result.current.user).toMatchObject({
        id: 'test-uid-456',
        nickname: 'Chaser1',
        role: 'chaser',
        status: 'active',
      });
    });
  });

  it('should handle sign in errors', async () => {
    const error = new Error('Sign in failed');
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: error,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await expect(async () => {
      await act(async () => {
        await result.current.signIn('TestPlayer', 'runner');
      });
    }).rejects.toThrow('Sign in failed');
  });

  it('should handle user sign out', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should handle sign out errors', async () => {
    const error = new Error('Sign out failed');
    mockSignOut.mockResolvedValue({ error });

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
    const mockUser = {
      id: 'existing-user-123',
      email: 'existing@temp.tag-game.local',
    };

    const mockSession = {
      user: mockUser,
      access_token: 'test-token',
    };

    const mockUserData = {
      id: 'existing-user-123',
      nickname: 'ExistingUser',
      role: 'runner',
      team_id: 'TeamB',
      status: 'active',
      updated_at: new Date().toISOString(),
    };

    let authStateCallback: (event: string, session: any) => void = () => {};
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    mockSingle.mockResolvedValue({
      data: mockUserData,
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      authStateCallback('SIGNED_IN', mockSession);
      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalled();
      });
    });

    await waitFor(() => {
      expect(result.current.user).toMatchObject({
        id: 'existing-user-123',
        nickname: 'ExistingUser',
        role: 'runner',
        team: 'TeamB',
      });
    });
  });

  it('should handle gamemaster role without team', async () => {
    const mockUser = {
      id: 'gm-uid-789',
      email: 'gamemaster@temp.tag-game.local',
    };

    const mockUserData = {
      id: 'gm-uid-789',
      nickname: 'GameMaster',
      role: 'gamemaster',
      team_id: null,
      status: 'active',
      updated_at: new Date().toISOString(),
    };

    mockSignUp.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: mockUserData,
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signIn('GameMaster', 'gamemaster');
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'gm-uid-789',
        nickname: 'GameMaster',
        role: 'gamemaster',
        team_id: null,
        status: 'active',
      })
    );

    await waitFor(() => {
      expect(result.current.user).toMatchObject({
        id: 'gm-uid-789',
        nickname: 'GameMaster',
        role: 'gamemaster',
        status: 'active',
      });
      // team should be undefined for gamemaster with team_id: null
      expect(result.current.user?.team).toBeUndefined();
    });
  });
});
