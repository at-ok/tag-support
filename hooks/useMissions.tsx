'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Mission, Location } from '@/types';
import { useAuth } from './useAuth';
import { useLocation } from './useLocation';

interface MissionContextType {
  missions: Mission[];
  loading: boolean;
  error: string | null;
  createMission: (title: string, description: string, type: Mission['type'], targetLocation?: Location, radius?: number, duration?: number) => Promise<void>;
  deleteMission: (missionId: string) => Promise<void>;
  completeMission: (missionId: string) => Promise<void>;
  checkMissionProgress: () => void;
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

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

    const missionsRef = collection(db, 'missions');
    const unsubscribe = onSnapshot(missionsRef, 
      (snapshot) => {
        const missionList = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as Mission));
        setMissions(missionList);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
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
      const missionId = `mission_${Date.now()}`;
      
      const newMission: Mission = {
        id: missionId,
        title,
        description,
        type,
        completed: false,
        completedBy: [],
        ...(targetLocation && { targetLocation }),
        ...(radius && { radius }),
        ...(duration && { duration })
      };

      await setDoc(doc(db, 'missions', missionId), {
        ...newMission,
        createdAt: serverTimestamp(),
        createdBy: user.id
      });
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
      await deleteDoc(doc(db, 'missions', missionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete mission');
      throw err;
    }
  };

  const completeMission = async (missionId: string) => {
    if (!user) return;

    try {
      setError(null);
      const mission = missions.find(m => m.id === missionId);
      if (!mission) return;

      const completedBy = [...mission.completedBy];
      if (!completedBy.includes(user.id)) {
        completedBy.push(user.id);
      }

      await updateDoc(doc(db, 'missions', missionId), {
        completedBy,
        completed: completedBy.length > 0,
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete mission');
      throw err;
    }
  };

  const calculateDistance = (pos1: Location, pos2: Location) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.lat * Math.PI/180;
    const φ2 = pos2.lat * Math.PI/180;
    const Δφ = (pos2.lat-pos1.lat) * Math.PI/180;
    const Δλ = (pos2.lng-pos1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const checkMissionProgress = () => {
    if (!user || !location) return;

    missions.forEach(mission => {
      // Skip if user already completed this mission
      if (mission.completedBy.includes(user.id)) return;

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
    <MissionContext.Provider value={{
      missions,
      loading,
      error,
      createMission,
      deleteMission,
      completeMission,
      checkMissionProgress
    }}>
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