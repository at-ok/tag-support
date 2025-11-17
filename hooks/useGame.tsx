'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Game, GameStatus, GameSettings } from '@/types';
import { useAuth } from './useAuth';

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

    // Listen to the current active game
    const gameDocRef = doc(db, 'games', 'current-game');
    const unsubscribe = onSnapshot(gameDocRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const gameData = snapshot.data() as Game;
          // Convert Firestore timestamps to Date objects
          if (gameData.startTime) {
            gameData.startTime = gameData.startTime instanceof Date 
              ? gameData.startTime 
              : new Date(gameData.startTime.seconds * 1000);
          }
          if (gameData.endTime) {
            gameData.endTime = gameData.endTime instanceof Date 
              ? gameData.endTime 
              : new Date(gameData.endTime.seconds * 1000);
          }
          setGame(gameData);
        } else {
          setGame(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const createGame = async (settings: GameSettings, duration: number) => {
    if (!user || user.role !== 'gamemaster') {
      throw new Error('Only game masters can create games');
    }

    try {
      setError(null);
      const gameId = 'current-game';
      
      const newGame: Game = {
        id: gameId,
        status: 'waiting',
        duration,
        settings,
        players: [],
        missions: []
      };

      await setDoc(doc(db, 'games', gameId), {
        ...newGame,
        createdAt: serverTimestamp(),
        createdBy: user.id
      });
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
      await updateDoc(doc(db, 'games', game.id), {
        status: 'active',
        startTime: serverTimestamp()
      });
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
      await updateDoc(doc(db, 'games', game.id), {
        status: 'paused'
      });
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
      await updateDoc(doc(db, 'games', game.id), {
        status: 'finished',
        endTime: serverTimestamp()
      });
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
      const newSettings = { ...game.settings, ...settingsUpdate };
      await updateDoc(doc(db, 'games', game.id), {
        settings: newSettings
      });
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