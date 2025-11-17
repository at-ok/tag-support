'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import type { Game, GameStatus, GameSettings } from '@/types';
import { useAuth } from './useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface GameContextType {
  game: Game | null;
  loading: boolean;
  error: string | null;
  createGame: (settings: GameSettings, duration: number) => Promise<void>;
  startGame: () => Promise<void>;
  pauseGame: () => Promise<void>;
  endGame: () => Promise<void>;
  updateGameSettings: (settings: Partial<GameSettings>) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setGame(null);
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel;

    // Initial fetch
    const fetchGame = async () => {
      try {
        const { data, error } = await supabase
          .from('game_state')
          .select('*')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error

        if (data) {
          setGame({
            id: data.id,
            status: data.status as GameStatus,
            startTime: data.start_time ? new Date(data.start_time) : undefined,
            endTime: data.end_time ? new Date(data.end_time) : undefined,
            duration: data.duration_minutes,
            settings: {
              locationUpdateInterval: 5000,
              locationAccuracy: 10,
              safeZones: [],
              restrictedZones: [],
              chaserRadarRange: 100,
            },
            players: [],
            missions: [],
          });
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching game:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch game');
        setLoading(false);
      }
    };

    fetchGame();

    // Subscribe to real-time updates
    channel = supabase
      .channel('game_state_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setGame(null);
        } else {
          const data = payload.new;
          setGame({
            id: data.id,
            status: data.status as GameStatus,
            startTime: data.start_time ? new Date(data.start_time) : undefined,
            endTime: data.end_time ? new Date(data.end_time) : undefined,
            duration: data.duration_minutes,
            settings: {
              locationUpdateInterval: 5000,
              locationAccuracy: 10,
              safeZones: [],
              restrictedZones: [],
              chaserRadarRange: 100,
            },
            players: [],
            missions: [],
          });
        }
      })
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  const createGame = async (settings: GameSettings, duration: number) => {
    if (!user || user.role !== 'gamemaster') {
      throw new Error('Only game masters can create games');
    }

    try {
      setError(null);

      const { error } = await supabase
        .from('game_state')
        .insert({
          status: 'waiting',
          duration_minutes: duration,
        });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
      throw err;
    }
  };

  const startGame = async () => {
    if (!user || user.role !== 'gamemaster' || !game) {
      throw new Error('Cannot start game');
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('game_state')
        .update({
          status: 'active',
          start_time: new Date().toISOString(),
        })
        .eq('id', game.id);

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
      throw err;
    }
  };

  const pauseGame = async () => {
    if (!user || user.role !== 'gamemaster' || !game) {
      throw new Error('Cannot pause game');
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('game_state')
        .update({ status: 'paused' })
        .eq('id', game.id);

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause game');
      throw err;
    }
  };

  const endGame = async () => {
    if (!user || user.role !== 'gamemaster' || !game) {
      throw new Error('Cannot end game');
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('game_state')
        .update({
          status: 'finished',
          end_time: new Date().toISOString(),
        })
        .eq('id', game.id);

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end game');
      throw err;
    }
  };

  const updateGameSettings = async (settingsUpdate: Partial<GameSettings>) => {
    if (!user || user.role !== 'gamemaster' || !game) {
      throw new Error('Cannot update game settings');
    }

    try {
      setError(null);
      // For now, we'll store settings in the game object in memory
      // In a full implementation, you'd want to add a settings column to game_state
      const newSettings = { ...game.settings, ...settingsUpdate };
      setGame({ ...game, settings: newSettings });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      throw err;
    }
  };

  return (
    <GameContext.Provider value={{
      game,
      loading,
      error,
      createGame,
      startGame,
      pauseGame,
      endGame,
      updateGameSettings
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}