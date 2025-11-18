'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useGame } from '@/hooks/useGame';
import { supabase } from '@/lib/supabase';
import type { User, Mission } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import MissionManager from '@/components/MissionManager';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function RunnerPage() {
  const { user } = useAuth();
  const { location, isTracking, startTracking } = useLocation();
  const { game } = useGame();
  const [teammates, setTeammates] = useState<User[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'runner' || !user.team) return;

    let channel: RealtimeChannel;

    const fetchTeammates = async () => {
      if (!user.team) {
        setTeammates([]);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('team_id', user.team)
        .eq('role', 'runner')
        .neq('id', user.id);

      if (error) {
        console.error('Error fetching teammates:', error);
        return;
      }

      if (data) {
        const mappedUsers: User[] = data.map((u: any) => ({
          id: u.id,
          nickname: u.nickname,
          role: u.role as any,
          team: u.team_id || undefined,
          status: u.status === 'captured' ? 'captured' : u.status === 'offline' ? 'safe' : 'active',
          lastUpdated: new Date(u.updated_at),
        }));
        setTeammates(mappedUsers);
      }
    };

    fetchTeammates();

    // Subscribe to real-time updates
    channel = supabase
      .channel('teammates_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `team_id=eq.${user.team}`,
      }, () => {
        fetchTeammates();
      })
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  useEffect(() => {
    if (!isTracking) {
      startTracking();
    }
  }, [isTracking, startTracking]);

  if (!user || user.role !== 'runner') {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">アクセス拒否</h2>
        <p>逃走者の権限が必要です</p>
      </div>
    </div>;
  }

  const mapCenter: [number, number] = location 
    ? [location.lat, location.lng]
    : [35.5522, 139.7797];

  return (
    <div className="flex flex-col h-screen-mobile bg-gray-100 safe-area-top safe-area-bottom">
      <header className="bg-blue-600 text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">🏃 逃走者</h1>
            <p className="text-sm">{user.nickname} - チーム {user.team}</p>
          </div>
          <div className="text-right">
            <p className="text-sm">状態: {
              user.status === 'active' ? '逃走中' :
              user.status === 'captured' ? '捕獲済み' :
              user.status === 'rescued' ? '救出済み' :
              user.status === 'safe' ? '安全' : user.status
            }</p>
            {game && (
              <p className="text-xs">ゲーム: {
                game.status === 'waiting' ? '待機中' :
                game.status === 'active' ? '進行中' :
                game.status === 'paused' ? '一時停止' :
                game.status === 'finished' ? '終了' : game.status
              }</p>
            )}
            {isTracking && <p className="text-xs">📍 位置追跡中</p>}
          </div>
        </div>
        {game && game.status === 'active' && game.startTime && (
          <div className="mt-2 bg-blue-700 rounded p-2 text-center">
            <p className="text-sm">ゲーム開始から {Math.floor((Date.now() - game.startTime.getTime()) / 60000)} 分経過</p>
          </div>
        )}
      </header>

      <div className="flex-1 relative">
        <Map
          center={mapCenter}
          currentUser={{ ...user, location: location || undefined }}
          visibleUsers={teammates}
        />
      </div>

      <div className="bg-white p-4 border-t">
        <MissionManager isGameMaster={false} />
      </div>
    </div>
  );
}