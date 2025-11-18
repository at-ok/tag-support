'use client';

import { useState } from 'react';
import { useMissions } from '@/hooks/useMissions';
import { useAuth } from '@/hooks/useAuth';
import type { Mission, Location } from '@/types';

interface MissionManagerProps {
  isGameMaster: boolean;
  userMissions?: Mission[];
}

export default function MissionManager({ isGameMaster, userMissions }: MissionManagerProps) {
  const { user } = useAuth();
  const { missions, createMission, deleteMission, completeMission, error } = useMissions();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMission, setNewMission] = useState({
    title: '',
    description: '',
    type: 'area' as Mission['type'],
    lat: '',
    lng: '',
    radius: 50,
    duration: 300 // 5 minutes
  });

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMission.title || !newMission.description) return;

    try {
      const targetLocation: Location | undefined = newMission.lat && newMission.lng ? {
        lat: parseFloat(newMission.lat),
        lng: parseFloat(newMission.lng),
        timestamp: new Date()
      } : undefined;

      await createMission(
        newMission.title,
        newMission.description,
        newMission.type,
        targetLocation,
        newMission.radius,
        newMission.duration
      );

      // Reset form
      setNewMission({
        title: '',
        description: '',
        type: 'area',
        lat: '',
        lng: '',
        radius: 50,
        duration: 300
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create mission:', error);
    }
  };

  const handleCompleteMission = async (missionId: string) => {
    try {
      await completeMission(missionId);
    } catch (error) {
      console.error('Failed to complete mission:', error);
    }
  };

  const handleDeleteMission = async (missionId: string) => {
    if (!confirm('Are you sure you want to delete this mission?')) return;
    
    try {
      await deleteMission(missionId);
    } catch (error) {
      console.error('Failed to delete mission:', error);
    }
  };

  const displayMissions = userMissions || missions;

  if (isGameMaster) {
    return (
      <div className="card-mobile">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-xl">🎯</span>
            </div>
            <h3 className="font-bold text-lg text-slate-800">ミッション管理</h3>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 elevation-2 hover:elevation-3"
            style={{
              backgroundColor: showCreateForm ? '#ef4444' : '#3b82f6',
              color: 'white'
            }}
          >
            {showCreateForm ? '✕ キャンセル' : '+ ミッション作成'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm mb-4 flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {showCreateForm && (
          <form onSubmit={handleCreateMission} className="space-y-4 p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">タイトル</label>
              <input
                type="text"
                value={newMission.title}
                onChange={(e) => setNewMission({ ...newMission, title: e.target.value })}
                className="w-full input-touch"
                placeholder="ミッションのタイトル"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">説明</label>
              <textarea
                value={newMission.description}
                onChange={(e) => setNewMission({ ...newMission, description: e.target.value })}
                className="w-full input-touch resize-none"
                placeholder="ミッションの詳細"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">種類</label>
                <select
                  value={newMission.type}
                  onChange={(e) => setNewMission({ ...newMission, type: e.target.value as Mission['type'] })}
                  className="w-full input-touch"
                >
                  <option value="area">📍 エリア到達</option>
                  <option value="escape">🏃 脱出ポイント</option>
                  <option value="common">🎯 共通タスク</option>
                  <option value="rescue">🚑 救出ミッション</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">範囲 (m)</label>
                <input
                  type="number"
                  value={newMission.radius}
                  onChange={(e) => setNewMission({ ...newMission, radius: Number(e.target.value) })}
                  className="w-full input-touch"
                  min="10"
                  max="500"
                />
              </div>
            </div>

            {(newMission.type === 'area' || newMission.type === 'escape') && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">緯度</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newMission.lat}
                    onChange={(e) => setNewMission({ ...newMission, lat: e.target.value })}
                    className="w-full input-touch"
                    placeholder="35.658584"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">経度</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newMission.lng}
                    onChange={(e) => setNewMission({ ...newMission, lng: e.target.value })}
                    className="w-full input-touch"
                    placeholder="139.745438"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                className="btn-success"
              >
                ✓ 作成
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary"
              >
                ✕ キャンセル
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-800">アクティブミッション</h4>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">
              {missions.length}件
            </span>
          </div>

          {missions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-2xl opacity-50">🎯</span>
              </div>
              <p className="text-slate-500 text-sm">ミッションがまだ作成されていません</p>
            </div>
          ) : (
            missions.map(mission => (
              <div key={mission.id} className="bg-white rounded-xl p-4 border border-slate-200 elevation-1 hover:elevation-2 transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h5 className="font-semibold text-slate-800 mb-1">{mission.title}</h5>
                    <p className="text-sm text-slate-600 mb-2">{mission.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-medium">
                        {mission.type === 'area' ? '📍 エリア到達' :
                         mission.type === 'escape' ? '🏃 脱出ポイント' :
                         mission.type === 'common' ? '🎯 共通タスク' :
                         mission.type === 'rescue' ? '🚑 救出ミッション' : mission.type}
                      </span>
                      {mission.radius && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium">
                          範囲 {mission.radius}m
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMission(mission.id)}
                    className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 transition-colors"
                  >
                    <span className="text-lg">🗑️</span>
                  </button>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <span>✓</span>
                  <span>{mission.completedBy.length}人が完了</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Player view
  return (
    <div className="card-mobile">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
          <span className="text-xl">🎯</span>
        </div>
        <h3 className="font-bold text-lg text-slate-800">アクティブミッション</h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm mb-4 flex items-start gap-2">
          <span className="text-lg">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {displayMissions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-2xl opacity-50">🎯</span>
            </div>
            <p className="text-slate-500 text-sm">アクティブなミッションがありません</p>
          </div>
        ) : (
          displayMissions.map(mission => {
            const isCompleted = user && mission.completedBy.includes(user.id);
            return (
              <div
                key={mission.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                    : 'bg-white border-slate-200 elevation-1 hover:elevation-2'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 mb-1">{mission.title}</h4>
                    <p className="text-sm text-slate-600 mb-3">{mission.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
                        {mission.type === 'area' ? '📍 エリア到達' :
                         mission.type === 'escape' ? '🏃 脱出ポイント' :
                         mission.type === 'common' ? '🎯 共通タスク' :
                         mission.type === 'rescue' ? '🚑 救出ミッション' : mission.type}
                      </span>
                      {mission.radius && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium">
                          範囲 {mission.radius}m
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    {isCompleted ? (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl mb-1">✅</span>
                        <span className="text-xs text-green-700 font-semibold">完了</span>
                      </div>
                    ) : mission.type === 'rescue' ? (
                      <button
                        onClick={() => handleCompleteMission(mission.id)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 elevation-2 hover:elevation-3 transition-all haptic-medium"
                      >
                        🚑 救出完了
                      </button>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl mb-1 opacity-40">⏳</span>
                        <span className="text-xs text-slate-500 font-medium">進行中</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}