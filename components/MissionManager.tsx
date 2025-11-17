'use client';

import { useState } from 'react';
import { useMissions } from '@/hooks/useMissions';
import { useAuth } from '@/hooks/useAuth';
import { Mission, Location } from '@/types';

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
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Mission Management</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
          >
            {showCreateForm ? 'Cancel' : 'Create Mission'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-2 rounded text-sm">
            {error}
          </div>
        )}

        {showCreateForm && (
          <form onSubmit={handleCreateMission} className="space-y-3 p-3 bg-gray-50 rounded">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={newMission.title}
                onChange={(e) => setNewMission({ ...newMission, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Mission title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={newMission.description}
                onChange={(e) => setNewMission({ ...newMission, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Mission description"
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={newMission.type}
                  onChange={(e) => setNewMission({ ...newMission, type: e.target.value as Mission['type'] })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="area">Area Visit</option>
                  <option value="escape">Escape Point</option>
                  <option value="common">Common Task</option>
                  <option value="rescue">Rescue Mission</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Radius (m)</label>
                <input
                  type="number"
                  value={newMission.radius}
                  onChange={(e) => setNewMission({ ...newMission, radius: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  min="10"
                  max="500"
                />
              </div>
            </div>

            {(newMission.type === 'area' || newMission.type === 'escape') && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newMission.lat}
                    onChange={(e) => setNewMission({ ...newMission, lat: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="35.658584"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newMission.lng}
                    onChange={(e) => setNewMission({ ...newMission, lng: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="139.745438"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 text-sm"
              >
                Create Mission
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          <h4 className="font-semibold">Active Missions ({missions.length})</h4>
          {missions.length === 0 ? (
            <p className="text-gray-500 text-sm">No missions created yet</p>
          ) : (
            missions.map(mission => (
              <div key={mission.id} className="border rounded p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-semibold text-sm">{mission.title}</h5>
                    <p className="text-xs text-gray-600">{mission.description}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{mission.type}</span>
                      {mission.radius && (
                        <span className="text-xs bg-blue-100 px-2 py-1 rounded">{mission.radius}m</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMission(mission.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Completed by: {mission.completedBy.length} players
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
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-bold mb-3">🎯 アクティブミッション</h3>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-2 rounded text-sm mb-3">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {displayMissions.length === 0 ? (
          <p className="text-gray-500 text-sm">アクティブなミッションがありません</p>
        ) : (
          displayMissions.map(mission => {
            const isCompleted = user && mission.completedBy.includes(user.id);
            return (
              <div 
                key={mission.id} 
                className={`p-3 rounded border ${
                  isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-sm">{mission.title}</h4>
                    <p className="text-xs text-gray-600 mb-2">{mission.description}</p>
                    <div className="flex gap-2">
                      <span className="text-xs bg-white px-2 py-1 rounded border">{
                        mission.type === 'area' ? '📍 エリア到達' :
                        mission.type === 'escape' ? '🏃 脱出ポイント' :
                        mission.type === 'common' ? '🎯 共通タスク' :
                        mission.type === 'rescue' ? '🚑 救出ミッション' : mission.type
                      }</span>
                      {mission.radius && (
                        <span className="text-xs bg-blue-100 px-2 py-1 rounded">範囲: {mission.radius}m</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {isCompleted ? (
                      <div className="text-green-600 text-xs font-bold">✅ 完了</div>
                    ) : mission.type === 'rescue' ? (
                      <button
                        onClick={() => handleCompleteMission(mission.id)}
                        className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600 haptic-medium"
                      >
                        🚑 救出完了
                      </button>
                    ) : (
                      <div className="text-gray-500 text-xs">進行中</div>
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