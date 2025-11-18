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
    duration: 300, // 5 minutes
  });

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMission.title || !newMission.description) return;

    try {
      const targetLocation: Location | undefined =
        newMission.lat && newMission.lng
          ? {
              lat: parseFloat(newMission.lat),
              lng: parseFloat(newMission.lng),
              timestamp: new Date(),
            }
          : undefined;

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
        duration: 300,
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
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
              <span className="text-xl">🎯</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800">ミッション管理</h3>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="elevation-2 hover:elevation-3 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: showCreateForm ? '#ef4444' : '#3b82f6',
              color: 'white',
            }}
          >
            {showCreateForm ? '✕ キャンセル' : '+ ミッション作成'}
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {showCreateForm && (
          <form
            onSubmit={handleCreateMission}
            className="animate-in fade-in slide-in-from-top-2 space-y-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-4 duration-200"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">タイトル</label>
              <input
                type="text"
                value={newMission.title}
                onChange={(e) => setNewMission({ ...newMission, title: e.target.value })}
                className="input-touch w-full"
                placeholder="ミッションのタイトル"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">説明</label>
              <textarea
                value={newMission.description}
                onChange={(e) => setNewMission({ ...newMission, description: e.target.value })}
                className="input-touch w-full resize-none"
                placeholder="ミッションの詳細"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">種類</label>
                <select
                  value={newMission.type}
                  onChange={(e) =>
                    setNewMission({ ...newMission, type: e.target.value as Mission['type'] })
                  }
                  className="input-touch w-full"
                >
                  <option value="area">📍 エリア到達</option>
                  <option value="escape">🏃 脱出ポイント</option>
                  <option value="common">🎯 共通タスク</option>
                  <option value="rescue">🚑 救出ミッション</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">範囲 (m)</label>
                <input
                  type="number"
                  value={newMission.radius}
                  onChange={(e) => setNewMission({ ...newMission, radius: Number(e.target.value) })}
                  className="input-touch w-full"
                  min="10"
                  max="500"
                />
              </div>
            </div>

            {(newMission.type === 'area' || newMission.type === 'escape') && (
              <div className="animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-3 duration-200">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">緯度</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newMission.lat}
                    onChange={(e) => setNewMission({ ...newMission, lat: e.target.value })}
                    className="input-touch w-full"
                    placeholder="35.658584"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">経度</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newMission.lng}
                    onChange={(e) => setNewMission({ ...newMission, lng: e.target.value })}
                    className="input-touch w-full"
                    placeholder="139.745438"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button type="submit" className="btn-success">
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

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-800">アクティブミッション</h4>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {missions.length}件
            </span>
          </div>

          {missions.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <span className="text-2xl opacity-50">🎯</span>
              </div>
              <p className="text-sm text-slate-500">ミッションがまだ作成されていません</p>
            </div>
          ) : (
            missions.map((mission) => (
              <div
                key={mission.id}
                className="elevation-1 hover:elevation-2 rounded-xl border border-slate-200 bg-white p-4 transition-shadow"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="mb-1 font-semibold text-slate-800">{mission.title}</h5>
                    <p className="mb-2 text-sm text-slate-600">{mission.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {mission.type === 'area'
                          ? '📍 エリア到達'
                          : mission.type === 'escape'
                            ? '🏃 脱出ポイント'
                            : mission.type === 'common'
                              ? '🎯 共通タスク'
                              : mission.type === 'rescue'
                                ? '🚑 救出ミッション'
                                : mission.type}
                      </span>
                      {mission.radius && (
                        <span className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          範囲 {mission.radius}m
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMission(mission.id)}
                    className="ml-2 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                  >
                    <span className="text-lg">🗑️</span>
                  </button>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
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
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
          <span className="text-xl">🎯</span>
        </div>
        <h3 className="text-lg font-bold text-slate-800">アクティブミッション</h3>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span className="text-lg">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {displayMissions.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <span className="text-2xl opacity-50">🎯</span>
            </div>
            <p className="text-sm text-slate-500">アクティブなミッションがありません</p>
          </div>
        ) : (
          displayMissions.map((mission) => {
            const isCompleted = user && mission.completedBy.includes(user.id);
            return (
              <div
                key={mission.id}
                className={`rounded-xl border p-4 transition-all ${
                  isCompleted
                    ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50'
                    : 'elevation-1 hover:elevation-2 border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="mb-1 font-semibold text-slate-800">{mission.title}</h4>
                    <p className="mb-3 text-sm text-slate-600">{mission.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium">
                        {mission.type === 'area'
                          ? '📍 エリア到達'
                          : mission.type === 'escape'
                            ? '🏃 脱出ポイント'
                            : mission.type === 'common'
                              ? '🎯 共通タスク'
                              : mission.type === 'rescue'
                                ? '🚑 救出ミッション'
                                : mission.type}
                      </span>
                      {mission.radius && (
                        <span className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700">
                          範囲 {mission.radius}m
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    {isCompleted ? (
                      <div className="flex flex-col items-center">
                        <span className="mb-1 text-2xl">✅</span>
                        <span className="text-xs font-semibold text-green-700">完了</span>
                      </div>
                    ) : mission.type === 'rescue' ? (
                      <button
                        onClick={() => handleCompleteMission(mission.id)}
                        className="elevation-2 hover:elevation-3 haptic-medium rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-orange-600"
                      >
                        🚑 救出完了
                      </button>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="mb-1 text-2xl opacity-40">⏳</span>
                        <span className="text-xs font-medium text-slate-500">進行中</span>
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
