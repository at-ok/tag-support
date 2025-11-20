'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Location } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useGame } from './useGame';
import { calculateSpeed as calcSpeed, calculateHeading as calcHeading } from '@/lib/geometry';

interface UseLocationReturn {
  location: Location | null;
  error: string | null;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
}

interface UseLocationOptions {
  enableHistory?: boolean;
}

export function useLocation(
  updateInterval: number = 30000,
  options: UseLocationOptions = {}
): UseLocationReturn {
  const { enableHistory = true } = options;
  const { user } = useAuth();
  const { game } = useGame();
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [previousLocation, setPreviousLocation] = useState<Location | null>(null);

  const updateLocationInDatabase = useCallback(
    async (loc: Location, speed?: number, heading?: number) => {
      if (!user) return;

      try {
        // Insert new location record into player_locations
        const insertPayload: Record<string, unknown> = {
          user_id: user.id,
          latitude: loc.lat,
          longitude: loc.lng,
          accuracy: loc.accuracy || null,
          timestamp: loc.timestamp.toISOString(),
        };

        const { error: insertError } = await supabase
          .from('player_locations')
          .insert(insertPayload as never);

        if (insertError) throw insertError;

        // Insert into location_history if enabled
        if (enableHistory) {
          const historyPayload: Record<string, unknown> = {
            user_id: user.id,
            game_id: game?.id || null,
            latitude: loc.lat,
            longitude: loc.lng,
            speed: speed || null,
            heading: heading || null,
            accuracy: loc.accuracy || null,
            timestamp: loc.timestamp.toISOString(),
          };

          const { error: historyError } = await supabase
            .from('location_history')
            .insert(historyPayload as never);

          if (historyError) {
            console.error('Failed to insert location history:', historyError);
            // 履歴の記録失敗は続行可能なエラーとして扱う
            // 重要な位置情報の更新は引き続き実行される
          }
        }

        // Update user's last updated time
        const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        const { error: updateError } = await supabase
          .from('users')
          .update(updatePayload as never)
          .eq('id', user.id);

        if (updateError) throw updateError;
      } catch (err) {
        console.error('Failed to update location:', err);
        // 位置情報の更新に失敗した場合、エラー状態を設定
        setError(err instanceof Error ? err.message : 'Failed to update location');
      }
    },
    [user, game, enableHistory]
  );

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    setIsTracking(true);
    setError(null);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(),
        };

        // Calculate speed and heading if we have a previous location
        let speed: number | undefined;
        let heading: number | undefined;

        if (previousLocation) {
          speed = calcSpeed(previousLocation, newLocation);
          heading = calcHeading(previousLocation, newLocation);
        }

        setLocation(newLocation);
        setPreviousLocation(newLocation);
        updateLocationInDatabase(newLocation, speed, heading);
      },
      (err) => {
        setError(err.message);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: updateInterval,
      }
    );

    setWatchId(id);
  }, [updateInterval, updateLocationInDatabase, previousLocation]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    location,
    error,
    isTracking,
    startTracking,
    stopTracking,
  };
}
