'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGame';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Game, GameStatus } from '@/types';
import GameControls from '@/components/GameControls';
import MissionManager from '@/components/MissionManager';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function GamemasterPage() {
  const { user } = useAuth();
  const { game } = useGame();
  const [allPlayers, setAllPlayers] = useState<User[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'gamemaster') return;

    const playersQuery = query(
      collection(db, 'users'),
      orderBy('lastUpdated', 'desc')
    );

    const unsubscribePlayers = onSnapshot(playersQuery, (snapshot) => {
      const players = snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as User))
        .filter(u => u.role !== 'gamemaster');
      setAllPlayers(players);
    });

    return () => unsubscribePlayers();
  }, [user]);

  const updatePlayerStatus = async (playerId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', playerId), {
        status: newStatus,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Failed to update player status:', error);
    }
  };

  const reassignPlayer = async (playerId: string, newRole: string, newTeam?: string) => {
    try {
      const updates: any = {
        role: newRole,
        lastUpdated: new Date()
      };
      if (newTeam) {
        updates.team = newTeam;
      }
      await updateDoc(doc(db, 'users', playerId), updates);
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
          
          <div className="bg-white rounded-lg p-4">
            <h2 className="font-bold mb-3">📊 ゲーム統計</h2>
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

          <div className="bg-white rounded-lg p-4">
            <h2 className="font-bold mb-3">Active Players</h2>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {activePlayers.map(player => (
                <div
                  key={player.id}
                  className={`p-2 rounded cursor-pointer ${
                    selectedPlayer?.id === player.id ? 'bg-blue-100' : 'bg-gray-50'
                  }`}
                  onClick={() => setSelectedPlayer(player)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">{player.nickname}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      player.role === 'runner' ? 'bg-blue-200' : 'bg-red-200'
                    }`}>
                      {player.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">Team {player.team}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h2 className="font-bold mb-3">Captured Players</h2>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {capturedPlayers.map(player => (
                <div key={player.id} className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">{player.nickname}</span>
                    <button
                      onClick={() => updatePlayerStatus(player.id, 'active')}
                      className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                    >
                      Rescue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedPlayer && (
            <div className="bg-white rounded-lg p-4">
              <h2 className="font-bold mb-3">Player Actions</h2>
              <p className="text-sm mb-3">Selected: {selectedPlayer.nickname}</p>
              
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold">Status:</label>
                  <div className="flex gap-1 mt-1">
                    {['active', 'captured', 'rescued', 'safe'].map(status => (
                      <button
                        key={status}
                        onClick={() => updatePlayerStatus(selectedPlayer.id, status)}
                        className={`px-2 py-1 text-xs rounded ${
                          selectedPlayer.status === status 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold">Role:</label>
                  <div className="flex gap-1 mt-1">
                    {['runner', 'chaser'].map(role => (
                      <button
                        key={role}
                        onClick={() => reassignPlayer(selectedPlayer.id, role)}
                        className={`px-2 py-1 text-xs rounded ${
                          selectedPlayer.role === role 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200'
                        }`}
                      >
                        {role}
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