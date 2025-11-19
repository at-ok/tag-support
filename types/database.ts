export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nickname: string;
          role: 'runner' | 'chaser' | 'gamemaster' | 'special';
          team_id: string | null;
          status: 'active' | 'captured' | 'offline' | 'rescued' | 'safe';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nickname: string;
          role: 'runner' | 'chaser' | 'gamemaster' | 'special';
          team_id?: string | null;
          status?: 'active' | 'captured' | 'offline' | 'rescued' | 'safe';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          role?: 'runner' | 'chaser' | 'gamemaster' | 'special';
          team_id?: string | null;
          status?: 'active' | 'captured' | 'offline' | 'rescued' | 'safe';
          created_at?: string;
          updated_at?: string;
        };
      };
      player_locations: {
        Row: {
          id: string;
          user_id: string;
          latitude: number;
          longitude: number;
          accuracy: number | null;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          latitude: number;
          longitude: number;
          accuracy?: number | null;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          latitude?: number;
          longitude?: number;
          accuracy?: number | null;
          timestamp?: string;
          created_at?: string;
        };
      };
      missions: {
        Row: {
          id: string;
          title: string;
          description: string;
          type: 'area_arrival' | 'escape' | 'rescue';
          target_latitude: number | null;
          target_longitude: number | null;
          radius_meters: number | null;
          duration_seconds: number | null;
          points: number;
          status: 'active' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          type: 'area_arrival' | 'escape' | 'rescue';
          target_latitude?: number | null;
          target_longitude?: number | null;
          radius_meters?: number | null;
          duration_seconds?: number | null;
          points?: number;
          status?: 'active' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          type?: 'area_arrival' | 'escape' | 'rescue';
          target_latitude?: number | null;
          target_longitude?: number | null;
          radius_meters?: number | null;
          duration_seconds?: number | null;
          points?: number;
          status?: 'active' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
      };
      game_state: {
        Row: {
          id: string;
          status: 'waiting' | 'active' | 'paused' | 'finished';
          start_time: string | null;
          end_time: string | null;
          duration_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          status?: 'waiting' | 'active' | 'paused' | 'finished';
          start_time?: string | null;
          end_time?: string | null;
          duration_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          status?: 'waiting' | 'active' | 'paused' | 'finished';
          start_time?: string | null;
          end_time?: string | null;
          duration_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      captures: {
        Row: {
          id: string;
          chaser_id: string;
          runner_id: string;
          latitude: number;
          longitude: number;
          capture_time: string;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          chaser_id: string;
          runner_id: string;
          latitude: number;
          longitude: number;
          capture_time?: string;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          chaser_id?: string;
          runner_id?: string;
          latitude?: number;
          longitude?: number;
          capture_time?: string;
          verified?: boolean;
          created_at?: string;
        };
      };
      zones: {
        Row: {
          id: string;
          name: string;
          type: 'safe' | 'restricted';
          center_lat: number;
          center_lng: number;
          radius_meters: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'safe' | 'restricted';
          center_lat: number;
          center_lng: number;
          radius_meters: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'safe' | 'restricted';
          center_lat?: number;
          center_lng?: number;
          radius_meters?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh_key: string;
          auth_key: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh_key: string;
          auth_key: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh_key?: string;
          auth_key?: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      nearby_players: {
        Args: {
          center_lat: number;
          center_lng: number;
          radius_meters: number;
        };
        Returns: {
          user_id: string;
          distance_meters: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
