'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Location } from '@/types';

export interface LocationHistoryEntry {
  id: string;
  userId: string;
  location: Location;
  timestamp: Date;
  speed?: number; // meters per second
  heading?: number; // degrees
}

export interface PlayerStats {
  totalDistance: number; // meters
  averageSpeed: number; // meters per second
  maxSpeed: number; // meters per second
  duration: number; // milliseconds
  lastLocation?: Location;
}

interface UseLocationHistoryOptions {
  gameId?: string;
  userId?: string;
  autoTrack?: boolean;
}

export function useLocationHistory(options: UseLocationHistoryOptions = {}) {
  const { gameId, userId, autoTrack = false } = options;
  const [history, setHistory] = useState<LocationHistoryEntry[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch location history
  const fetchHistory = useCallback(async () => {
    if (!userId && !gameId) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('location_history')
        .select('*')
        .order('timestamp', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (gameId) {
        query = query.eq('game_id', gameId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (data) {
        const entries: LocationHistoryEntry[] = data.map((entry: any) => ({
          id: entry.id,
          userId: entry.user_id,
          location: {
            lat: entry.latitude,
            lng: entry.longitude,
            timestamp: new Date(entry.timestamp),
          },
          timestamp: new Date(entry.timestamp),
          speed: entry.speed || undefined,
          heading: entry.heading || undefined,
        }));

        setHistory(entries);
        calculateStats(entries);
      }
    } catch (err) {
      console.error('Error fetching location history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, [userId, gameId]);

  // Calculate statistics from history
  const calculateStats = useCallback((entries: LocationHistoryEntry[]) => {
    if (entries.length === 0) {
      setStats(null);
      return;
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    const speeds: number[] = [];

    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1];
      const curr = entries[i];

      if (!prev || !curr) continue;

      const distance = calculateDistance(prev.location, curr.location);
      totalDistance += distance;

      if (curr.speed !== undefined) {
        speeds.push(curr.speed);
        maxSpeed = Math.max(maxSpeed, curr.speed);
      }
    }

    const lastEntry = entries[entries.length - 1];
    const firstEntry = entries[0];
    const duration = lastEntry && firstEntry
      ? lastEntry.timestamp.getTime() - firstEntry.timestamp.getTime()
      : 0;

    const averageSpeed = speeds.length > 0
      ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length
      : 0;

    setStats({
      totalDistance,
      averageSpeed,
      maxSpeed,
      duration,
      lastLocation: lastEntry?.location,
    });
  }, []);

  // Record a location entry
  const recordLocation = useCallback(async (location: Location, speed?: number, heading?: number) => {
    if (!userId) {
      throw new Error('User ID is required to record location');
    }

    try {
      const insertPayload: Record<string, unknown> = {
        user_id: userId,
        game_id: gameId || null,
        latitude: location.lat,
        longitude: location.lng,
        timestamp: new Date().toISOString(),
        speed: speed || null,
        heading: heading || null,
      };

      const { error: insertError } = await supabase
        .from('location_history')
        .insert(insertPayload as never);

      if (insertError) throw insertError;

      // Optionally refetch to update local state
      if (autoTrack) {
        await fetchHistory();
      }
    } catch (err) {
      console.error('Error recording location:', err);
      throw err;
    }
  }, [userId, gameId, autoTrack, fetchHistory]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (pos1: Location, pos2: Location): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.lat * Math.PI / 180;
    const φ2 = pos2.lat * Math.PI / 180;
    const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
    const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Clear history
  const clearHistory = useCallback(async () => {
    if (!userId) return;

    try {
      let deleteQuery = supabase
        .from('location_history')
        .delete()
        .eq('user_id', userId);

      if (gameId) {
        deleteQuery = deleteQuery.eq('game_id', gameId);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) throw deleteError;

      setHistory([]);
      setStats(null);
    } catch (err) {
      console.error('Error clearing history:', err);
      throw err;
    }
  }, [userId, gameId]);

  // Initial fetch
  useEffect(() => {
    if (autoTrack) {
      fetchHistory();
    }
  }, [autoTrack, fetchHistory]);

  return {
    history,
    stats,
    loading,
    error,
    fetchHistory,
    recordLocation,
    clearHistory,
    calculateDistance,
  };
}
