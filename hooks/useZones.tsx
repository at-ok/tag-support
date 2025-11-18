'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import type { Zone, Location } from '@/types';
import { useAuth } from './useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ZoneContextType {
  safeZones: Zone[];
  restrictedZones: Zone[];
  loading: boolean;
  error: string | null;
  createZone: (name: string, type: 'safe' | 'restricted', center: Location, radius: number) => Promise<void>;
  updateZone: (zoneId: string, updates: Partial<Omit<Zone, 'id'>>) => Promise<void>;
  deleteZone: (zoneId: string) => Promise<void>;
  isInSafeZone: (location: Location) => Promise<boolean>;
  isInRestrictedZone: (location: Location) => Promise<boolean>;
}

const ZoneContext = createContext<ZoneContextType | undefined>(undefined);

export function ZoneProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [safeZones, setSafeZones] = useState<Zone[]>([]);
  const [restrictedZones, setRestrictedZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSafeZones([]);
      setRestrictedZones([]);
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel;

    // Initial fetch
    const fetchZones = async () => {
      try {
        const { data, error } = await supabase
          .from('zones')
          .select('*')
          .eq('active', true);

        if (error) throw error;

        if (data) {
          const mappedZones: Zone[] = (data as any[]).map((z: any) => ({
            id: z.id,
            name: z.name,
            type: z.type as 'safe' | 'restricted',
            center: {
              lat: z.center_lat,
              lng: z.center_lng,
              timestamp: new Date(),
            },
            radius: z.radius_meters,
          }));

          setSafeZones(mappedZones.filter(z => z.type === 'safe'));
          setRestrictedZones(mappedZones.filter(z => z.type === 'restricted'));
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching zones:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch zones');
        setLoading(false);
      }
    };

    fetchZones();

    // Subscribe to real-time updates
    channel = supabase
      .channel('zones_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const data = payload.new;
          const zone: Zone = {
            id: data.id,
            name: data.name,
            type: data.type as 'safe' | 'restricted',
            center: {
              lat: data.center_latitude,
              lng: data.center_longitude,
              timestamp: new Date(),
            },
            radius: data.radius_meters,
          };

          if (data.active) {
            if (zone.type === 'safe') {
              setSafeZones(prev => {
                const existing = prev.find(z => z.id === zone.id);
                if (existing) {
                  return prev.map(z => z.id === zone.id ? zone : z);
                }
                return [...prev, zone];
              });
            } else {
              setRestrictedZones(prev => {
                const existing = prev.find(z => z.id === zone.id);
                if (existing) {
                  return prev.map(z => z.id === zone.id ? zone : z);
                }
                return [...prev, zone];
              });
            }
          } else {
            // If zone is deactivated, remove it
            setSafeZones(prev => prev.filter(z => z.id !== data.id));
            setRestrictedZones(prev => prev.filter(z => z.id !== data.id));
          }
        } else if (payload.eventType === 'DELETE') {
          const zoneId = payload.old.id;
          setSafeZones(prev => prev.filter(z => z.id !== zoneId));
          setRestrictedZones(prev => prev.filter(z => z.id !== zoneId));
        }
      })
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  const createZone = async (
    name: string,
    type: 'safe' | 'restricted',
    center: Location,
    radius: number
  ) => {
    if (!user || user.role !== 'gamemaster') {
      throw new Error('Only game masters can create zones');
    }

    try {
      setError(null);

      const insertPayload: Record<string, unknown> = {
        name,
        type,
        center_lat: center.lat,
        center_lng: center.lng,
        radius_meters: radius,
        active: true,
      };

      const { error } = await (supabase
        .from('zones')
        .insert(insertPayload as never));

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create zone');
      throw err;
    }
  };

  const updateZone = async (zoneId: string, updates: Partial<Omit<Zone, 'id'>>) => {
    if (!user || user.role !== 'gamemaster') {
      throw new Error('Only game masters can update zones');
    }

    try {
      setError(null);

      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.radius !== undefined) dbUpdates.radius_meters = updates.radius;
      if (updates.center !== undefined) {
        dbUpdates.center_lat = updates.center.lat;
        dbUpdates.center_lng = updates.center.lng;
      }

      const { error } = await (supabase
        .from('zones')
        .update(dbUpdates as never)
        .eq('id', zoneId));

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update zone');
      throw err;
    }
  };

  const deleteZone = async (zoneId: string) => {
    if (!user || user.role !== 'gamemaster') {
      throw new Error('Only game masters can delete zones');
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('zones')
        .delete()
        .eq('id', zoneId);

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete zone');
      throw err;
    }
  };

  const isInSafeZone = async (location: Location): Promise<boolean> => {
    try {
      setError(null);
      const { data, error } = await supabase.rpc('is_in_zone' as any, {
        player_lat: location.lat,
        player_lng: location.lng,
        zone_type: 'safe',
      } as any);

      if (error) throw error;

      const typedData = data as any[] | null;
      return !!(typedData && typedData.length > 0);
    } catch (err) {
      console.error('Error checking safe zone:', err);
      setError(err instanceof Error ? err.message : 'Failed to check safe zone');
      return false;
    }
  };

  const isInRestrictedZone = async (location: Location): Promise<boolean> => {
    try {
      setError(null);
      const { data, error } = await supabase.rpc('is_in_zone' as any, {
        player_lat: location.lat,
        player_lng: location.lng,
        zone_type: 'restricted',
      } as any);

      if (error) throw error;

      const typedData = data as any[] | null;
      return !!(typedData && typedData.length > 0);
    } catch (err) {
      console.error('Error checking restricted zone:', err);
      setError(err instanceof Error ? err.message : 'Failed to check restricted zone');
      return false;
    }
  };

  return (
    <ZoneContext.Provider value={{
      safeZones,
      restrictedZones,
      loading,
      error,
      createZone,
      updateZone,
      deleteZone,
      isInSafeZone,
      isInRestrictedZone,
    }}>
      {children}
    </ZoneContext.Provider>
  );
}

export function useZones() {
  const context = useContext(ZoneContext);
  if (context === undefined) {
    throw new Error('useZones must be used within a ZoneProvider');
  }
  return context;
}
