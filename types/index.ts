export type UserRole = 'runner' | 'chaser' | 'gamemaster' | 'special';
export type GameStatus = 'waiting' | 'active' | 'paused' | 'finished';
export type PlayerStatus = 'active' | 'captured' | 'rescued' | 'safe';

export interface User {
  id: string;
  nickname: string;
  role: UserRole;
  team?: string;
  status: PlayerStatus;
  location?: Location;
  lastUpdated: Date;
  captureCount?: number;
}

export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: Date;
}

export interface Game {
  id: string;
  status: GameStatus;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  settings: GameSettings;
  players: string[];
  missions: Mission[];
}

export interface GameSettings {
  locationUpdateInterval: number;
  locationAccuracy: number;
  safeZones: Zone[];
  restrictedZones: Zone[];
  chaserRadarRange?: number;
}

export interface Zone {
  id: string;
  name: string;
  center: Location;
  radius: number;
  type: 'safe' | 'restricted';
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'area' | 'escape' | 'rescue' | 'common';
  targetLocation?: Location;
  radius?: number;
  duration?: number;
  completed: boolean;
  completedBy: string[];
}