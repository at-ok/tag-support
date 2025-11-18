'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import type { Mission, Location } from '@/types';
import { useAuth } from './useAuth';
import { useLocation } from './useLocation';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface MissionContextType {
  missions: Mission[];
  loading: boolean;
  error: string | null;
  createMission: (
    title: string,
    description: string,
    type: Mission['type'],
    targetLocation?: Location,
    radius?: number,
    duration?: number
  ) => Promise<void>;
  deleteMission: (missionId: string) => Promise<void>;
  completeMission: (missionId: string) => Promise<void>;
  checkMissionProgress: () => void;
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

// Type mapping between database and app types
const mapMissionType = (dbType: string): Mission['type'] => {
  switch (dbType) {
    case 'area_arrival':
      return 'area';
    case 'escape':
      return 'escape';
    case 'rescue':
      return 'rescue';
    default:
      return 'common';
  }
};

const mapMissionTypeToDb = (appType: Mission['type']): string => {
  switch (appType) {
    case 'area':
      return 'area_arrival';
    case 'escape':
      return 'escape';
    case 'rescue':
      return 'rescue';
    default:
      return 'area_arrival';
  }
};

export function MissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { location } = useLocation();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setMissions([]);
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel;

    // Initial fetch
    const fetchMissions = async () => {
      try {
        const { data, error } = await supabase.from('missions').select('*');

        if (error) throw error;

        if (data) {
          const mappedMissions: Mission[] = (data as any[]).map((m: any) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            type: mapMissionType(m.type),
            targetLocation:
              m.target_latitude && m.target_longitude
                ? {
                    lat: m.target_latitude,
                    lng: m.target_longitude,
                    timestamp: new Date(),
                  }
                : undefined,
            radius: m.radius_meters || undefined,
            duration: m.duration_seconds || undefined,
            completed: m.status === 'completed',
            completedBy: [],
          }));
          setMissions(mappedMissions);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching missions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch missions');
        setLoading(false);
      }
    };

    fetchMissions();

    // Subscribe to real-time updates
    channel = supabase
      .channel('missions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () => {
        // Refetch missions on any change
        fetchMissions();
      })
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  // Auto-check mission progress when location changes
  useEffect(() => {
    if (location && user && missions.length > 0) {
      checkMissionProgress();
    }
  }, [location, missions]);

  const createMission = async (
    title: string,
    description: string,
    type: Mission['type'],
    targetLocation?: Location,
    radius?: number,
    duration?: number
  ) => {
    if (!user || user.role !== 'gamemaster') {
      throw new Error('Only game masters can create missions');
    }

    try {
      setError(null);

      const insertPayload: Record<string, unknown> = {
        title,
        description,
        type: mapMissionTypeToDb(type),
        target_latitude: targetLocation?.lat || null,
        target_longitude: targetLocation?.lng || null,
        radius_meters: radius || null,
        duration_seconds: duration || null,
        points: 100,
        status: 'active',
      };

      const { error } = await supabase.from('missions').insert(insertPayload as never);

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mission');
      throw err;
    }
  };

  const deleteMission = async (missionId: string) => {
    if (!user || user.role !== 'gamemaster') {
      throw new Error('Only game masters can delete missions');
    }

    try {
      setError(null);
      const { error } = await supabase.from('missions').delete().eq('id', missionId);

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete mission');
      throw err;
    }
  };

  const completeMission = async (missionId: string) => {
    if (!user) return;

    try {
      setError(null);
      const updatePayload: Record<string, unknown> = { status: 'completed' };
      const { error } = await supabase
        .from('missions')
        .update(updatePayload as never)
        .eq('id', missionId);

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete mission');
      throw err;
    }
  };

  const calculateDistance = (pos1: Location, pos2: Location) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (pos1.lat * Math.PI) / 180;
    const φ2 = (pos2.lat * Math.PI) / 180;
    const Δφ = ((pos2.lat - pos1.lat) * Math.PI) / 180;
    const Δλ = ((pos2.lng - pos1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const checkMissionProgress = () => {
    if (!user || !location) return;

    missions.forEach((mission) => {
      // Skip if mission already completed
      if (mission.completed) return;

      // Check area-based missions
      if (mission.type === 'area' && mission.targetLocation && mission.radius) {
        const distance = calculateDistance(location, mission.targetLocation);
        if (distance <= mission.radius) {
          // Auto-complete area missions when in range
          completeMission(mission.id);
        }
      }

      // Check escape missions (reaching a specific point)
      if (mission.type === 'escape' && mission.targetLocation && mission.radius) {
        const distance = calculateDistance(location, mission.targetLocation);
        if (distance <= mission.radius) {
          completeMission(mission.id);
        }
      }
    });
  };

  return (
    <MissionContext.Provider
      value={{
        missions,
        loading,
        error,
        createMission,
        deleteMission,
        completeMission,
        checkMissionProgress,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
}

export function useMissions() {
  const context = useContext(MissionContext);
  if (context === undefined) {
    throw new Error('useMissions must be used within a MissionProvider');
  }
  return context;
}
