'use client';

import { useState } from 'react';
import { useZones } from '@/hooks/useZones';
import { useLocation } from '@/hooks/useLocation';
import type { Location } from '@/types';

interface ZoneManagerProps {
  isGameMaster: boolean;
}

export default function ZoneManager({ isGameMaster }: ZoneManagerProps) {
  const { safeZones, restrictedZones, createZone, deleteZone, error } = useZones();
  const { location } = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newZone, setNewZone] = useState({
    name: '',
    type: 'safe' as 'safe' | 'restricted',
    lat: '',
    lng: '',
    radius: 100,
    useCurrentLocation: true,
  });

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZone.name) return;

    try {
      let targetLocation: Location;

      if (newZone.useCurrentLocation && location) {
        targetLocation = location;
      } else if (newZone.lat && newZone.lng) {
        targetLocation = {
          lat: parseFloat(newZone.lat),
          lng: parseFloat(newZone.lng),
          timestamp: new Date(),
        };
      } else {
        alert('位置情報を設定してください');
        return;
      }

      await createZone(
        newZone.name,
        newZone.type,
        targetLocation,
        newZone.radius
      );

      // Reset form
      setNewZone({
        name: '',
        type: 'safe',
        lat: '',
        lng: '',
        radius: 100,
        useCurrentLocation: true,
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create zone:', error);
    }
  };

  const handleDeleteZone = async (zoneId: string, zoneName: string) => {
    if (!confirm(`「${zoneName}」を削除しますか？`)) return;

    try {
      await deleteZone(zoneId);
    } catch (error) {
      console.error('Failed to delete zone:', error);
    }
  };

  if (!isGameMaster) {
    return (
      <div className="card-mobile">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-xl">🗺️</span>
          </div>
          <h3 className="font-bold text-lg text-slate-800">エリア情報</h3>
        </div>

        <div className="space-y-4">
          {/* Safe Zones */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span>🛡️</span>
              <span>セーフゾーン</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                {safeZones.length}
              </span>
            </h4>
            {safeZones.length === 0 ? (
              <p className="text-sm text-slate-500">セーフゾーンは設定されていません</p>
            ) : (
              <div className="space-y-2">
                {safeZones.map(zone => (
                  <div key={zone.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="font-semibold text-slate-800">{zone.name}</p>
                    <p className="text-xs text-slate-600">範囲: {zone.radius}m</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Restricted Zones */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span>⚠️</span>
              <span>立入禁止エリア</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                {restrictedZones.length}
              </span>
            </h4>
            {restrictedZones.length === 0 ? (
              <p className="text-sm text-slate-500">立入禁止エリアは設定されていません</p>
            ) : (
              <div className="space-y-2">
                {restrictedZones.map(zone => (
                  <div key={zone.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="font-semibold text-slate-800">{zone.name}</p>
                    <p className="text-xs text-slate-600">範囲: {zone.radius}m</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Game Master view
  return (
    <div className="card-mobile">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-xl">🗺️</span>
          </div>
          <h3 className="font-bold text-lg text-slate-800">エリア管理</h3>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 elevation-2 hover:elevation-3"
          style={{
            backgroundColor: showCreateForm ? '#ef4444' : '#10b981',
            color: 'white',
          }}
        >
          {showCreateForm ? '✕ キャンセル' : '+ エリア作成'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm mb-4 flex items-start gap-2">
          <span className="text-lg">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateZone} className="space-y-4 p-4 bg-gradient-to-br from-slate-50 to-green-50 rounded-xl border border-slate-200 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">エリア名</label>
            <input
              type="text"
              value={newZone.name}
              onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
              className="w-full input-touch"
              placeholder="例: 駅前セーフゾーン"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">種類</label>
              <select
                value={newZone.type}
                onChange={(e) => setNewZone({ ...newZone, type: e.target.value as 'safe' | 'restricted' })}
                className="w-full input-touch"
              >
                <option value="safe">🛡️ セーフゾーン</option>
                <option value="restricted">⚠️ 立入禁止</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">範囲 (m)</label>
              <input
                type="number"
                value={newZone.radius}
                onChange={(e) => setNewZone({ ...newZone, radius: Number(e.target.value) })}
                className="w-full input-touch"
                min="10"
                max="1000"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={newZone.useCurrentLocation}
                onChange={(e) => setNewZone({ ...newZone, useCurrentLocation: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-slate-300"
              />
              <span className="text-sm font-semibold text-slate-700">現在地を使用</span>
            </label>

            {!newZone.useCurrentLocation && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">緯度</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newZone.lat}
                    onChange={(e) => setNewZone({ ...newZone, lat: e.target.value })}
                    className="w-full input-touch"
                    placeholder="35.658584"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">経度</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newZone.lng}
                    onChange={(e) => setNewZone({ ...newZone, lng: e.target.value })}
                    className="w-full input-touch"
                    placeholder="139.745438"
                  />
                </div>
              </div>
            )}

            {newZone.useCurrentLocation && !location && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <span>⚠️</span>
                <span>現在地を取得中...</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="submit"
              className="btn-success"
              disabled={!newZone.name || (!newZone.useCurrentLocation && (!newZone.lat || !newZone.lng))}
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

      {/* Safe Zones Management */}
      <div className="mb-4">
        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span>🛡️</span>
          <span>セーフゾーン</span>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
            {safeZones.length}件
          </span>
        </h4>

        {safeZones.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-2xl opacity-50">🛡️</span>
            </div>
            <p className="text-slate-500 text-sm">セーフゾーンがまだ作成されていません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {safeZones.map(zone => (
              <div key={zone.id} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 elevation-1 hover:elevation-2 transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h5 className="font-semibold text-slate-800 mb-1">{zone.name}</h5>
                    <div className="flex gap-3 text-xs text-slate-600">
                      <span>📍 中心: {zone.center.lat.toFixed(5)}, {zone.center.lng.toFixed(5)}</span>
                      <span>📏 範囲: {zone.radius}m</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteZone(zone.id, zone.name)}
                    className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 transition-colors"
                  >
                    <span className="text-lg">🗑️</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restricted Zones Management */}
      <div>
        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span>⚠️</span>
          <span>立入禁止エリア</span>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
            {restrictedZones.length}件
          </span>
        </h4>

        {restrictedZones.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-red-100 rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-2xl opacity-50">⚠️</span>
            </div>
            <p className="text-slate-500 text-sm">立入禁止エリアがまだ作成されていません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {restrictedZones.map(zone => (
              <div key={zone.id} className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-200 elevation-1 hover:elevation-2 transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h5 className="font-semibold text-slate-800 mb-1">{zone.name}</h5>
                    <div className="flex gap-3 text-xs text-slate-600">
                      <span>📍 中心: {zone.center.lat.toFixed(5)}, {zone.center.lng.toFixed(5)}</span>
                      <span>📏 範囲: {zone.radius}m</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteZone(zone.id, zone.name)}
                    className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 transition-colors"
                  >
                    <span className="text-lg">🗑️</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
