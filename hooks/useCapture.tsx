'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import type { Capture, User } from '@/types';
import { useAuth } from './useAuth';
import { useLocation } from './useLocation';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface CaptureContextType {
  captures: Capture[];
  loading: boolean;
  error: string | null;
  recordCapture: (runnerId: string) => Promise<void>;
  getNearbyRunners: (radiusMeters: number) => Promise<User[]>;
}

const CaptureContext = createContext<CaptureContextType | undefined>(undefined);

export function CaptureProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { location } = useLocation();
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCaptures([]);
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel;

    // Initial fetch - only for chasers
    const fetchCaptures = async () => {
      if (user.role !== 'chaser') {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('captures')
          .select('*')
          .eq('chaser_id', user.id);

        if (error) throw error;

        if (data) {
          const mappedCaptures: Capture[] = data.map(c => ({
            id: c.id,
            chaserId: c.chaser_id,
            runnerId: c.runner_id,
            location: {
              lat: c.latitude,
              lng: c.longitude,
              timestamp: new Date(c.capture_time),
            },
            captureTime: new Date(c.capture_time),
            verified: c.verified,
          }));
          setCaptures(mappedCaptures);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching captures:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch captures');
        setLoading(false);
      }
    };

    fetchCaptures();

    // Subscribe to real-time updates
    channel = supabase
      .channel('captures_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'captures' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const data = payload.new;
          const newCapture: Capture = {
            id: data.id,
            chaserId: data.chaser_id,
            runnerId: data.runner_id,
            location: {
              lat: data.latitude,
              lng: data.longitude,
              timestamp: new Date(data.capture_time),
            },
            captureTime: new Date(data.capture_time),
            verified: data.verified,
          };
          setCaptures(prev => [newCapture, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const data = payload.new;
          setCaptures(prev => prev.map(c =>
            c.id === data.id
              ? {
                  ...c,
                  verified: data.verified,
                }
              : c
          ));
        } else if (payload.eventType === 'DELETE') {
          setCaptures(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  const recordCapture = async (runnerId: string) => {
    if (!user || user.role !== 'chaser') {
      throw new Error('Only chasers can record captures');
    }

    if (!location) {
      throw new Error('Location not available');
    }

    try {
      setError(null);

      const { error } = await supabase
        .from('captures')
        .insert({
          chaser_id: user.id,
          runner_id: runnerId,
          latitude: location.lat,
          longitude: location.lng,
          verified: false,
        });

      if (error) throw error;

      // Update runner status to captured
      await supabase
        .from('users')
        .update({ status: 'captured' })
        .eq('id', runnerId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record capture');
      throw err;
    }
  };

  const getNearbyRunners = async (radiusMeters: number): Promise<User[]> => {
    if (!user || user.role !== 'chaser') {
      return [];
    }

    if (!location) {
      return [];
    }

    try {
      setError(null);

      // Use PostGIS function to find nearby players
      const { data: nearbyData, error: rpcError } = await supabase.rpc('nearby_players', {
        center_lat: location.lat,
        center_lng: location.lng,
        radius_meters: radiusMeters,
      });

      if (rpcError) throw rpcError;

      if (!nearbyData || nearbyData.length === 0) {
        return [];
      }

      // Get user details for nearby players
      const userIds = nearbyData.map((d: any) => d.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds)
        .eq('role', 'runner')
        .eq('status', 'active');

      if (usersError) throw usersError;

      if (!usersData) return [];

      const users: User[] = usersData.map(u => ({
        id: u.id,
        nickname: u.nickname,
        role: u.role,
        team: u.team_id,
        status: u.status,
        lastUpdated: new Date(u.updated_at),
      }));

      return users;
    } catch (err) {
      console.error('Error getting nearby runners:', err);
      setError(err instanceof Error ? err.message : 'Failed to get nearby runners');
      return [];
    }
  };

  return (
    <CaptureContext.Provider value={{
      captures,
      loading,
      error,
      recordCapture,
      getNearbyRunners,
    }}>
      {children}
    </CaptureContext.Provider>
  );
}

export function useCapture() {
  const context = useContext(CaptureContext);
  if (context === undefined) {
    throw new Error('useCapture must be used within a CaptureProvider');
  }
  return context;
}
