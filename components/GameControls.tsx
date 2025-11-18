'use client';

import { useState } from 'react';
import { useGame } from '@/hooks/useGame';
import type { GameSettings } from '@/types';

interface GameControlsProps {
  isGameMaster: boolean;
}

export default function GameControls({ isGameMaster }: GameControlsProps) {
  const { game, createGame, startGame, pauseGame, endGame, updateGameSettings, error } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [duration, setDuration] = useState(60); // minutes
  const [settings, setSettings] = useState<GameSettings>({
    locationUpdateInterval: 30000, // 30 seconds
    locationAccuracy: 20, // meters
    safeZones: [],
    restrictedZones: [],
    chaserRadarRange: 200, // meters
  });

  if (!isGameMaster) {
    return (
      <div className="card-mobile">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
            <span className="text-xl">🎮</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800">ゲーム状態</h3>
        </div>

        {game ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">状態</span>
                <span
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    game.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : game.status === 'waiting'
                        ? 'bg-yellow-100 text-yellow-700'
                        : game.status === 'paused'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {game.status === 'waiting'
                    ? '⏳ 待機中'
                    : game.status === 'active'
                      ? '▶️ 進行中'
                      : game.status === 'paused'
                        ? '⏸️ 一時停止'
                        : game.status === 'finished'
                          ? '✓ 終了'
                          : game.status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">制限時間</span>
                  <span className="text-sm font-semibold text-slate-800">{game.duration}分</span>
                </div>

                {game.startTime && game.status === 'active' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">開始時刻</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {game.startTime.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <span className="text-2xl opacity-50">🎮</span>
            </div>
            <p className="text-sm text-slate-500">アクティブなゲームがありません</p>
          </div>
        )}
      </div>
    );
  }

  const handleCreateGame = async () => {
    try {
      await createGame(settings, duration);
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await updateGameSettings(settings);
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 1000 / 60);
    const secs = Math.floor((seconds / 1000) % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="card-mobile">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
          <span className="text-xl">🎮</span>
        </div>
        <h3 className="text-lg font-bold text-slate-800">ゲーム制御</h3>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span className="text-lg">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {!game ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
            <h4 className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
              <span>🆕</span>
              <span>新しいゲームを作成</span>
            </h4>
            <p className="text-xs text-slate-600">ゲームの設定を行ってください</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              制限時間（分）
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="input-touch w-full"
              min="5"
              max="180"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">位置更新間隔</label>
            <select
              value={settings.locationUpdateInterval}
              onChange={(e) =>
                setSettings({ ...settings, locationUpdateInterval: Number(e.target.value) })
              }
              className="input-touch w-full"
            >
              <option value={15000}>15秒</option>
              <option value={30000}>30秒</option>
              <option value={60000}>1分</option>
              <option value={120000}>2分</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              鬼のレーダー範囲（メートル）
            </label>
            <input
              type="number"
              value={settings.chaserRadarRange || 200}
              onChange={(e) =>
                setSettings({ ...settings, chaserRadarRange: Number(e.target.value) })
              }
              className="input-touch w-full"
              min="50"
              max="500"
            />
          </div>

          <button onClick={handleCreateGame} className="btn-primary w-full">
            🎮 ゲーム作成
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold text-slate-800">
                <span>🎯</span>
                <span>現在のゲーム</span>
              </span>
              <span
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  game.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : game.status === 'waiting'
                      ? 'bg-yellow-100 text-yellow-700'
                      : game.status === 'paused'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-100 text-slate-700'
                }`}
              >
                {game.status === 'waiting'
                  ? '⏳ 待機中'
                  : game.status === 'active'
                    ? '▶️ 進行中'
                    : game.status === 'paused'
                      ? '⏸️ 一時停止'
                      : game.status === 'finished'
                        ? '✓ 終了'
                        : game.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/60 p-3">
                <p className="mb-1 text-xs text-slate-600">制限時間</p>
                <p className="text-sm font-semibold text-slate-800">{game.duration}分</p>
              </div>
              <div className="rounded-lg bg-white/60 p-3">
                <p className="mb-1 text-xs text-slate-600">更新間隔</p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatTime(game.settings.locationUpdateInterval)}
                </p>
              </div>
              <div className="rounded-lg bg-white/60 p-3">
                <p className="mb-1 text-xs text-slate-600">レーダー範囲</p>
                <p className="text-sm font-semibold text-slate-800">
                  {game.settings.chaserRadarRange || 200}m
                </p>
              </div>
              {game.startTime && (
                <div className="rounded-lg bg-white/60 p-3">
                  <p className="mb-1 text-xs text-slate-600">開始時刻</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {game.startTime.toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {game.status === 'waiting' && (
              <button onClick={startGame} className="btn-success col-span-2">
                ▶️ ゲーム開始
              </button>
            )}

            {game.status === 'active' && (
              <>
                <button onClick={pauseGame} className="btn-warning">
                  ⏸️ 一時停止
                </button>
                <button onClick={endGame} className="btn-danger">
                  ⏹️ 終了
                </button>
              </>
            )}

            {game.status === 'paused' && (
              <>
                <button onClick={startGame} className="btn-success">
                  ⏯️ 再開
                </button>
                <button onClick={endGame} className="btn-danger">
                  ⏹️ 終了
                </button>
              </>
            )}
          </div>

          <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary w-full">
            {showSettings ? '設定を隠す ▲' : '⚙️ ゲーム設定 ▼'}
          </button>

          {showSettings && (
            <div className="animate-in fade-in slide-in-from-top-2 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 duration-200">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  位置更新間隔
                </label>
                <select
                  value={settings.locationUpdateInterval}
                  onChange={(e) =>
                    setSettings({ ...settings, locationUpdateInterval: Number(e.target.value) })
                  }
                  className="input-touch w-full"
                >
                  <option value={15000}>15秒</option>
                  <option value={30000}>30秒</option>
                  <option value={60000}>1分</option>
                  <option value={120000}>2分</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  鬼のレーダー範囲（メートル）
                </label>
                <input
                  type="number"
                  value={settings.chaserRadarRange || 200}
                  onChange={(e) =>
                    setSettings({ ...settings, chaserRadarRange: Number(e.target.value) })
                  }
                  className="input-touch w-full"
                  min="50"
                  max="500"
                />
              </div>

              <button onClick={handleUpdateSettings} className="btn-primary w-full">
                設定を更新
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
