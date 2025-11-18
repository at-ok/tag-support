'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGame';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import GameControls from '@/components/GameControls';
import MissionManager from '@/components/MissionManager';
import ZoneManager from '@/components/ZoneManager';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function GamemasterPage() {
  const { user } = useAuth();
  const { game } = useGame();
  const [allPlayers, setAllPlayers] = useState<User[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'gamemaster') return;

    let channel: RealtimeChannel;

    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'gamemaster')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching players:', error);
        return;
      }

      if (data) {
        const mappedPlayers: User[] = data.map((u: any) => ({
          id: u.id,
          nickname: u.nickname,
          role: u.role as any,
          team: u.team_id || undefined,
          status: u.status === 'captured' ? 'captured' : u.status === 'offline' ? 'safe' : 'active',
          lastUpdated: new Date(u.updated_at),
          captureCount: 0,
        }));
        setAllPlayers(mappedPlayers);
      }
    };

    fetchPlayers();

    // Subscribe to real-time updates
    channel = supabase
      .channel('all_players_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
      }, () => {
        fetchPlayers();
      })
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  const updatePlayerStatus = async (playerId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          status: newStatus === 'captured' ? 'captured' : newStatus === 'offline' ? 'offline' : 'active',
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', playerId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update player status:', error);
    }
  };

  const reassignPlayer = async (playerId: string, newRole: string, newTeam?: string) => {
    try {
      const updates: any = {
        role: newRole,
        updated_at: new Date().toISOString()
      };
      if (newTeam) {
        updates.team_id = newTeam;
      }

      const { error } = await supabase
        .from('users')
        .update(updates as any)
        .eq('id', playerId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to reassign player:', error);
    }
  };

  if (!user || user.role !== 'gamemaster') {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">アクセス拒否</h2>
        <p>ゲームマスターの権限が必要です</p>
      </div>
    </div>;
  }

  const runners = allPlayers.filter(p => p.role === 'runner');
  const chasers = allPlayers.filter(p => p.role === 'chaser');
  const activePlayers = allPlayers.filter(p => p.status === 'active');
  const capturedPlayers = allPlayers.filter(p => p.status === 'captured');

  const mapCenter: [number, number] = allPlayers.find(p => p.location) 
    ? [allPlayers.find(p => p.location)!.location!.lat, allPlayers.find(p => p.location)!.location!.lng]
    : [35.5522, 139.7797];

  return (
    <div className="flex h-screen-mobile bg-gray-100 safe-area-top safe-area-bottom">
      <div className="w-1/3 flex flex-col">
        <header className="bg-green-600 text-white p-4">
          <h1 className="text-xl font-bold">🎮 ゲームマスター</h1>
          <p className="text-sm">{user.nickname}</p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <GameControls isGameMaster={true} />
          
          <div className="card-mobile">
            <h2 className="font-bold mb-3 flex items-center gap-2">
              <span>📊</span>
              <span>ゲーム統計</span>
            </h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-blue-50 p-2 rounded">
                <p className="font-semibold">🏃 逃走者</p>
                <p>合計 {runners.length}人</p>
                <p className="text-green-600">逃走中 {runners.filter(r => r.status === 'active').length}人</p>
              </div>
              <div className="bg-red-50 p-2 rounded">
                <p className="font-semibold">👹 鬼</p>
                <p>合計 {chasers.length}人</p>
                <p className="text-blue-600">捕獲数 {chasers.reduce((sum, c) => sum + (c.captureCount || 0), 0)}人</p>
              </div>
            </div>
            {game && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span>ゲーム状態:</span>
                  <span className="font-bold">{
                    game.status === 'waiting' ? '待機中' :
                    game.status === 'active' ? '進行中' :
                    game.status === 'paused' ? '一時停止' :
                    game.status === 'finished' ? '終了' : game.status
                  }</span>
                </div>
                {game.startTime && game.status === 'active' && (
                  <div className="flex justify-between text-sm">
                    <span>経過時間:</span>
                    <span>{Math.floor((Date.now() - game.startTime.getTime()) / 60000)}分</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <MissionManager isGameMaster={true} />

          <ZoneManager isGameMaster={true} />

          <div className="card-mobile">
            <h2 className="font-bold mb-3 flex items-center gap-2">
              <span>👥</span>
              <span>アクティブプレイヤー</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold ml-auto">
                {activePlayers.length}
              </span>
            </h2>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {activePlayers.map(player => (
                <div
                  key={player.id}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    selectedPlayer?.id === player.id ? 'bg-blue-100 elevation-2' : 'bg-slate-50 elevation-1 hover:elevation-2'
                  }`}
                  onClick={() => setSelectedPlayer(player)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">{player.nickname}</span>
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                      player.role === 'runner' ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'
                    }`}>
                      {player.role === 'runner' ? '🏃 逃走者' : '👹 鬼'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">チーム {player.team}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-mobile">
            <h2 className="font-bold mb-3 flex items-center gap-2">
              <span>🚨</span>
              <span>捕獲されたプレイヤー</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold ml-auto">
                {capturedPlayers.length}
              </span>
            </h2>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {capturedPlayers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">捕獲されたプレイヤーはいません</p>
              ) : (
                capturedPlayers.map(player => (
                  <div key={player.id} className="p-3 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">{player.nickname}</span>
                      <button
                        onClick={() => updatePlayerStatus(player.id, 'active')}
                        className="btn-success text-xs px-3 py-1.5 min-h-0"
                      >
                        🚑 救出
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedPlayer && (
            <div className="card-elevated">
              <h2 className="font-bold mb-3 flex items-center gap-2">
                <span>⚙️</span>
                <span>プレイヤー操作</span>
              </h2>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-xl mb-3 border border-blue-100">
                <p className="text-sm font-semibold text-slate-800">選択中: {selectedPlayer.nickname}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-2 block">ステータス変更:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['active', 'captured', 'rescued', 'safe'].map(status => (
                      <button
                        key={status}
                        onClick={() => updatePlayerStatus(selectedPlayer.id, status)}
                        className={`px-3 py-2 text-xs rounded-lg font-medium transition-all ${
                          selectedPlayer.status === status
                            ? 'bg-blue-500 text-white elevation-2'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {status === 'active' ? '✓ アクティブ' :
                         status === 'captured' ? '🚨 捕獲' :
                         status === 'rescued' ? '🚑 救出済' : '🛡️ 安全'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-2 block">役職変更:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['runner', 'chaser'].map(role => (
                      <button
                        key={role}
                        onClick={() => reassignPlayer(selectedPlayer.id, role)}
                        className={`px-3 py-2 text-xs rounded-lg font-medium transition-all ${
                          selectedPlayer.role === role
                            ? 'bg-green-500 text-white elevation-2'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {role === 'runner' ? '🏃 逃走者' : '👹 鬼'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <Map
          center={mapCenter}
          visibleUsers={allPlayers}
          zoom={14}
        />
      </div>
    </div>
  );
}