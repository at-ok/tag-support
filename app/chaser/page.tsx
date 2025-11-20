'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useGame } from '@/hooks/useGame';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { calculateDistance } from '@/lib/geometry';
import { mapDatabaseUsersToAppUsers } from '@/lib/user-mapper';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function ChaserPage() {
  const { user } = useAuth();
  const { location, isTracking, startTracking } = useLocation();
  const { game } = useGame();
  const [nearbyRunners, setNearbyRunners] = useState<User[]>([]);
  const [allRunners, setAllRunners] = useState<User[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'chaser') return;

    let channel: RealtimeChannel | null = null;

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
        const mappedRunners = mapDatabaseUsersToAppUsers(data);
        setAllRunners(mappedRunners);

        if (location) {
          const radarRange = game?.settings.chaserRadarRange || 200;
          const nearby = mappedRunners.filter((runner) => {
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: 'role=eq.runner',
        },
        () => {
          fetchRunners();
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, location, game?.settings.chaserRadarRange]);

  useEffect(() => {
    if (!isTracking) {
      startTracking();
    }
  }, [isTracking, startTracking]);

  const captureRunner = async (runnerId: string) => {
    if (!user) return;

    try {
      // Update runner status to captured
      const updatePayload: Record<string, unknown> = { status: 'captured' };
      const { error: runnerError } = await supabase
        .from('users')
        .update(updatePayload as never)
        .eq('id', runnerId);

      if (runnerError) throw runnerError;

      // Runner captured successfully
    } catch (error) {
      console.error('Failed to capture runner:', error);
    }
  };

  if (!user || user.role !== 'chaser') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold">アクセス拒否</h2>
          <p>鬼の権限が必要です</p>
        </div>
      </div>
    );
  }

  const mapCenter: [number, number] = location ? [location.lat, location.lng] : [35.5522, 139.7797];

  return (
    <div className="h-screen-mobile safe-area-top safe-area-bottom flex flex-col bg-gray-100">
      <header className="bg-red-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">👹 鬼</h1>
            <p className="text-sm">{user.nickname}</p>
          </div>
          <div className="text-right">
            <p className="text-sm">捕獲数: {user.captureCount || 0}人</p>
            {game && (
              <p className="text-xs">
                ゲーム:{' '}
                {game.status === 'waiting'
                  ? '待機中'
                  : game.status === 'active'
                    ? '進行中'
                    : game.status === 'paused'
                      ? '一時停止'
                      : game.status === 'finished'
                        ? '終了'
                        : game.status}
              </p>
            )}
            {isTracking && <p className="text-xs">📍 位置追跡中</p>}
          </div>
        </div>
        {game && game.status === 'active' && game.startTime && (
          <div className="mt-2 rounded bg-red-700 p-2 text-center">
            <p className="text-sm">
              ゲーム開始から {Math.floor((Date.now() - game.startTime.getTime()) / 60000)} 分経過
            </p>
          </div>
        )}
      </header>

      <div className="relative flex-1">
        <Map
          center={mapCenter}
          currentUser={{ ...user, location: location || undefined }}
          visibleUsers={nearbyRunners}
        />
      </div>

      <div className="border-t bg-white p-4">
        <h2 className="mb-2 font-bold">📡 近くの逃走者</h2>
        <div className="space-y-2">
          {nearbyRunners.length === 0 ? (
            <p className="text-sm text-gray-500">レーダー範囲内に逃走者なし</p>
          ) : (
            nearbyRunners.map((runner) => (
              <div
                key={runner.id}
                className="flex items-center justify-between rounded bg-gray-50 p-2"
              >
                <div>
                  <p className="text-sm font-semibold">{runner.nickname}</p>
                  <p className="text-xs text-gray-600">チーム {runner.team}</p>
                </div>
                {runner.status === 'active' && (
                  <button
                    onClick={() => captureRunner(runner.id)}
                    className="haptic-heavy rounded bg-red-500 px-3 py-1 text-sm font-bold text-white"
                  >
                    👹 捕獲
                  </button>
                )}
                {runner.status === 'captured' && (
                  <span className="text-xs font-bold text-red-600">捕獲済み</span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 border-t pt-4">
          <p className="text-xs text-gray-600">
            レーダー範囲: {game?.settings.chaserRadarRange || 200}m | 総逃走者数:{' '}
            {allRunners.length}人
          </p>
        </div>
      </div>
    </div>
  );
}
