'use client';

import { useState, useEffect } from 'react';
import type { PlayerStats } from '@/hooks/useLocationHistory';
import { supabase } from '@/lib/supabase';

interface PlayerStatsData {
  userId: string;
  nickname: string;
  role: string;
  team?: string;
  stats: PlayerStats | null;
}

interface GameStatsProps {
  gameId?: string;
  isGameMaster?: boolean;
}

interface UserRecord {
  id: string;
  nickname: string;
  role: string;
  team?: string;
}

interface LocationHistoryRecord {
  user_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
}

export default function GameStats({ gameId, isGameMaster = false }: GameStatsProps) {
  const [playerStats, setPlayerStats] = useState<PlayerStatsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const fetchPlayerStats = async () => {
      try {
        setLoading(true);

        // Fetch all players
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, nickname, role, team');

        if (usersError) throw usersError;

        if (users) {
          const statsPromises = users.map(async (user: UserRecord) => {
            // Fetch location history for each user
            const { data: historyData, error: historyError } = await supabase
              .from('location_history')
              .select('*')
              .eq('user_id', user.id)
              .eq('game_id', gameId)
              .order('timestamp', { ascending: true });

            if (historyError) {
              console.error('Error fetching history for user:', user.id, historyError);
              return {
                userId: user.id,
                nickname: user.nickname,
                role: user.role,
                team: user.team,
                stats: null,
              };
            }

            // Calculate stats
            if (!historyData || historyData.length === 0) {
              return {
                userId: user.id,
                nickname: user.nickname,
                role: user.role,
                team: user.team,
                stats: null,
              };
            }

            // Calculate distance and stats
            let totalDistance = 0;
            let maxSpeed = 0;
            const speeds: number[] = [];

            for (let i = 1; i < historyData.length; i++) {
              const prev = historyData[i - 1] as unknown as LocationHistoryRecord;
              const curr = historyData[i] as unknown as LocationHistoryRecord;

              if (!prev || !curr) continue;

              const distance = calculateDistance(
                { lat: prev.latitude, lng: prev.longitude },
                { lat: curr.latitude, lng: curr.longitude }
              );
              totalDistance += distance;

              if (curr.speed) {
                speeds.push(curr.speed);
                maxSpeed = Math.max(maxSpeed, curr.speed);
              }
            }

            const lastEntry = historyData[
              historyData.length - 1
            ] as unknown as LocationHistoryRecord;
            const firstEntry = historyData[0] as unknown as LocationHistoryRecord;

            if (!lastEntry || !firstEntry) {
              return {
                userId: user.id,
                nickname: user.nickname,
                role: user.role,
                team: user.team,
                stats: null,
              };
            }

            const duration =
              new Date(lastEntry.timestamp).getTime() - new Date(firstEntry.timestamp).getTime();

            const averageSpeed =
              speeds.length > 0 ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length : 0;

            return {
              userId: user.id,
              nickname: user.nickname,
              role: user.role,
              team: user.team,
              stats: {
                totalDistance,
                averageSpeed,
                maxSpeed,
                duration,
                lastLocation: {
                  lat: lastEntry.latitude,
                  lng: lastEntry.longitude,
                  timestamp: new Date(lastEntry.timestamp),
                },
              },
            };
          });

          const allStats = await Promise.all(statsPromises);
          setPlayerStats(allStats);
        }
      } catch (err) {
        console.error('Error fetching player stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerStats();
  }, [gameId]);

  const calculateDistance = (
    pos1: { lat: number; lng: number },
    pos2: { lat: number; lng: number }
  ): number => {
    const R = 6371e3;
    const φ1 = (pos1.lat * Math.PI) / 180;
    const φ2 = (pos2.lat * Math.PI) / 180;
    const Δφ = ((pos2.lat - pos1.lat) * Math.PI) / 180;
    const Δλ = ((pos2.lng - pos1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const formatSpeed = (metersPerSecond: number): string => {
    const kmh = metersPerSecond * 3.6;
    return `${kmh.toFixed(1)}km/h`;
  };

  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}時間${minutes % 60}分`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  };

  const getRoleEmoji = (role: string): string => {
    switch (role) {
      case 'runner':
        return '🏃';
      case 'chaser':
        return '👹';
      case 'gamemaster':
        return '🎮';
      default:
        return '👤';
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'runner':
        return '逃走者';
      case 'chaser':
        return '鬼';
      case 'gamemaster':
        return 'GM';
      default:
        return role;
    }
  };

  if (!isGameMaster) {
    return null;
  }

  return (
    <div className="card-mobile">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
          <span className="text-xl">📊</span>
        </div>
        <h3 className="text-lg font-bold text-slate-800">ゲーム統計</h3>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-slate-100">
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-sm text-slate-500">統計を読み込み中...</p>
        </div>
      ) : playerStats.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <span className="text-2xl opacity-50">📊</span>
          </div>
          <p className="text-sm text-slate-500">統計データがありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary stats */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
              <p className="mb-1 text-xs text-slate-600">総プレイヤー数</p>
              <p className="text-2xl font-bold text-slate-800">{playerStats.length}</p>
            </div>
            <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-3">
              <p className="mb-1 text-xs text-slate-600">アクティブ</p>
              <p className="text-2xl font-bold text-slate-800">
                {playerStats.filter((p) => p.stats !== null).length}
              </p>
            </div>
          </div>

          {/* Individual player stats */}
          <div className="space-y-2">
            <h4 className="mb-2 text-sm font-semibold text-slate-800">プレイヤー別統計</h4>
            {playerStats.map((player) => (
              <div
                key={player.userId}
                className="elevation-1 hover:elevation-2 rounded-xl border border-slate-200 bg-white p-3 transition-shadow"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getRoleEmoji(player.role)}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{player.nickname}</p>
                      <p className="text-xs text-slate-500">
                        {getRoleLabel(player.role)}
                        {player.team && ` • チーム${player.team}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setSelectedPlayer(selectedPlayer === player.userId ? null : player.userId)
                    }
                    className="text-xs font-medium text-blue-500 hover:text-blue-700"
                  >
                    {selectedPlayer === player.userId ? '▲' : '▼'}
                  </button>
                </div>

                {player.stats ? (
                  <>
                    <div className="mb-2 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-slate-50 p-2">
                        <p className="mb-0.5 text-xs text-slate-600">移動距離</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {formatDistance(player.stats.totalDistance)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2">
                        <p className="mb-0.5 text-xs text-slate-600">平均速度</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {formatSpeed(player.stats.averageSpeed)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2">
                        <p className="mb-0.5 text-xs text-slate-600">最高速度</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {formatSpeed(player.stats.maxSpeed)}
                        </p>
                      </div>
                    </div>

                    {selectedPlayer === player.userId && (
                      <div className="animate-in fade-in slide-in-from-top-2 border-t border-slate-200 pt-2 duration-200">
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-600">活動時間:</span>
                            <span className="font-semibold text-slate-800">
                              {formatDuration(player.stats.duration)}
                            </span>
                          </div>
                          {player.stats.lastLocation && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">最終位置:</span>
                              <span className="font-mono text-xs text-slate-800">
                                {player.stats.lastLocation.lat.toFixed(6)},{' '}
                                {player.stats.lastLocation.lng.toFixed(6)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-2 text-center">
                    <p className="text-xs text-slate-400">データなし</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
