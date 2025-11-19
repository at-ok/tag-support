'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Location } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useGame } from './useGame';

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

  // Calculate speed between two locations
  const calculateSpeed = useCallback((prev: Location, current: Location): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (prev.lat * Math.PI) / 180;
    const φ2 = (current.lat * Math.PI) / 180;
    const Δφ = ((current.lat - prev.lat) * Math.PI) / 180;
    const Δλ = ((current.lng - prev.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    const timeDiff = (current.timestamp.getTime() - prev.timestamp.getTime()) / 1000; // Time in seconds

    return timeDiff > 0 ? distance / timeDiff : 0; // Speed in meters per second
  }, []);

  // Calculate heading between two locations
  const calculateHeading = useCallback((prev: Location, current: Location): number => {
    const φ1 = (prev.lat * Math.PI) / 180;
    const φ2 = (current.lat * Math.PI) / 180;
    const Δλ = ((current.lng - prev.lng) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360; // Heading in degrees (0-360)
  }, []);

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
          speed = calculateSpeed(previousLocation, newLocation);
          heading = calculateHeading(previousLocation, newLocation);
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
  }, [
    updateInterval,
    updateLocationInDatabase,
    previousLocation,
    calculateSpeed,
    calculateHeading,
  ]);

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
