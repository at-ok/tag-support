'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useGame } from '@/hooks/useGame';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function ChaserPage() {
  const { user } = useAuth();
  const { location, isTracking, startTracking } = useLocation();
  const { game } = useGame();
  const [nearbyRunners, setNearbyRunners] = useState<User[]>([]);
  const [allRunners, setAllRunners] = useState<User[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'chaser') return;

    let channel: RealtimeChannel;

    const fetchRunners = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'runner')
        .in('status', ['active']);

      if (error) {
        console.error('Error fetching runners:', error);
        return;
      }

      if (data) {
        const mappedRunners: User[] = data.map(u => ({
          id: u.id,
          nickname: u.nickname,
          role: u.role as any,
          team: u.team_id || undefined,
          status: u.status === 'captured' ? 'captured' : u.status === 'offline' ? 'safe' : 'active',
          lastUpdated: new Date(u.updated_at),
        }));
        setAllRunners(mappedRunners);

        if (location) {
          const radarRange = game?.settings.chaserRadarRange || 200;
          const nearby = mappedRunners.filter(runner => {
            if (!runner.location) return false;
            const distance = calculateDistance(location, runner.location);
            return distance <= radarRange;
          });
          setNearbyRunners(nearby);
        }
      }
    };

    fetchRunners();

    // Subscribe to real-time updates
    channel = supabase
      .channel('runners_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: 'role=eq.runner',
      }, () => {
        fetchRunners();
      })
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, location]);

  useEffect(() => {
    if (!isTracking) {
      startTracking();
    }
  }, [isTracking, startTracking]);

  const calculateDistance = (pos1: {lat: number, lng: number}, pos2: {lat: number, lng: number}) => {
    const R = 6371e3;
    const φ1 = pos1.lat * Math.PI/180;
    const φ2 = pos2.lat * Math.PI/180;
    const Δφ = (pos2.lat-pos1.lat) * Math.PI/180;
    const Δλ = (pos2.lng-pos1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const captureRunner = async (runnerId: string) => {
    if (!user) return;

    try {
      // Update runner status to captured
      const { error: runnerError } = await supabase
        .from('users')
        .update({ status: 'captured' })
        .eq('id', runnerId);

      if (runnerError) throw runnerError;

      console.log('Runner captured successfully');
    } catch (error) {
      console.error('Failed to capture runner:', error);
    }
  };

  if (!user || user.role !== 'chaser') {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">アクセス拒否</h2>
        <p>鬼の権限が必要です</p>
      </div>
    </div>;
  }

  const mapCenter: [number, number] = location 
    ? [location.lat, location.lng]
    : [35.5522, 139.7797];

  return (
    <div className="flex flex-col h-screen-mobile bg-gray-100 safe-area-top safe-area-bottom">
      <header className="bg-red-600 text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">👹 鬼</h1>
            <p className="text-sm">{user.nickname}</p>
          </div>
          <div className="text-right">
            <p className="text-sm">捕獲数: {user.captureCount || 0}人</p>
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
          <div className="mt-2 bg-red-700 rounded p-2 text-center">
            <p className="text-sm">ゲーム開始から {Math.floor((Date.now() - game.startTime.getTime()) / 60000)} 分経過</p>
          </div>
        )}
      </header>

      <div className="flex-1 relative">
        <Map
          center={mapCenter}
          currentUser={{ ...user, location }}
          visibleUsers={nearbyRunners}
        />
      </div>

      <div className="bg-white p-4 border-t">
        <h2 className="font-bold mb-2">📡 近くの逃走者</h2>
        <div className="space-y-2">
          {nearbyRunners.length === 0 ? (
            <p className="text-gray-500 text-sm">レーダー範囲内に逃走者なし</p>
          ) : (
            nearbyRunners.map(runner => (
              <div key={runner.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                <div>
                  <p className="font-semibold text-sm">{runner.nickname}</p>
                  <p className="text-xs text-gray-600">チーム {runner.team}</p>
                </div>
                {runner.status === 'active' && (
                  <button
                    onClick={() => captureRunner(runner.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold haptic-heavy"
                  >
                    👹 捕獲
                  </button>
                )}
                {runner.status === 'captured' && (
                  <span className="text-xs text-red-600 font-bold">捕獲済み</span>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-600">
            レーダー範囲: {game?.settings.chaserRadarRange || 200}m | 総逃走者数: {allRunners.length}人
          </p>
        </div>
      </div>
    </div>
  );
}