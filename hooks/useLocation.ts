'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Location } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface UseLocationReturn {
  location: Location | null;
  error: string | null;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
}

export function useLocation(updateInterval: number = 30000): UseLocationReturn {
  const { user } = useAuth();
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const updateLocationInDatabase = useCallback(
    async (loc: Location) => {
      if (!user) return;

      try {
        // Insert new location record
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
    [user]
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

        setLocation(newLocation);
        updateLocationInDatabase(newLocation);
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
  }, [updateInterval, updateLocationInDatabase]);

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
