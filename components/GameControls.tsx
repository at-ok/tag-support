'use client';

import { useState } from 'react';
import { useGame } from '@/hooks/useGame';
import { GameSettings } from '@/types';

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
    chaserRadarRange: 200 // meters
  });

  if (!isGameMaster) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-bold mb-2">🎮 ゲーム状態</h3>
        {game ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>状態:</span>
              <span className={`font-bold ${
                game.status === 'active' ? 'text-green-600' : 
                game.status === 'waiting' ? 'text-yellow-600' : 
                game.status === 'paused' ? 'text-orange-600' : 'text-gray-600'
              }`}>
                {game.status === 'waiting' ? '待機中' :
                 game.status === 'active' ? '進行中' :
                 game.status === 'paused' ? '一時停止' :
                 game.status === 'finished' ? '終了' : game.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span>制限時間:</span>
              <span>{game.duration}分</span>
            </div>
            {game.startTime && game.status === 'active' && (
              <div className="flex justify-between">
                <span>開始時刻:</span>
                <span>{game.startTime.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">アクティブなゲームがありません</p>
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
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <h3 className="font-bold text-lg">🎮 ゲーム制御</h3>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-2 rounded text-sm">
          {error}
        </div>
      )}

      {!game ? (
        <div className="space-y-4">
          <h4 className="font-semibold">🆕 新しいゲームを作成</h4>
          
          <div>
            <label className="block text-sm font-medium mb-1">制限時間（分）</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              min="5"
              max="180"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">位置更新間隔</label>
            <select
              value={settings.locationUpdateInterval}
              onChange={(e) => setSettings({ ...settings, locationUpdateInterval: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value={15000}>15秒</option>
              <option value={30000}>30秒</option>
              <option value={60000}>1分</option>
              <option value={120000}>2分</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">鬼のレーダー範囲（メートル）</label>
            <input
              type="number"
              value={settings.chaserRadarRange || 200}
              onChange={(e) => setSettings({ ...settings, chaserRadarRange: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
              min="50"
              max="500"
            />
          </div>

          <button
            onClick={handleCreateGame}
            className="w-full btn-primary"
          >
            🎮 ゲーム作成
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">🎯 現在のゲーム</span>
              <span className={`px-2 py-1 rounded text-sm font-bold ${
                game.status === 'active' ? 'bg-green-100 text-green-800' : 
                game.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' : 
                game.status === 'paused' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {game.status}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <p>制限時間: {game.duration}分</p>
              <p>更新間隔: {formatTime(game.settings.locationUpdateInterval)}</p>
              <p>レーダー範囲: {game.settings.chaserRadarRange || 200}m</p>
              {game.startTime && (
                <p>開始時刻: {game.startTime.toLocaleTimeString()}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {game.status === 'waiting' && (
              <button
                onClick={startGame}
                className="flex-1 btn-success"
              >
                ▶️ ゲーム開始
              </button>
            )}
            
            {game.status === 'active' && (
              <button
                onClick={pauseGame}
                className="flex-1 btn-warning"
              >
                ⏸️ 一時停止
              </button>
            )}

            {game.status === 'paused' && (
              <button
                onClick={startGame}
                className="flex-1 btn-success"
              >
                ⏯️ 再開
              </button>
            )}

            {(game.status === 'active' || game.status === 'paused') && (
              <button
                onClick={endGame}
                className="flex-1 btn-danger"
              >
                ⏹️ ゲーム終了
              </button>
            )}
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full btn-secondary"
          >
            {showSettings ? '設定を隠す' : '⚙️ ゲーム設定'}
          </button>

          {showSettings && (
            <div className="space-y-3 p-3 bg-gray-50 rounded">
              <div>
                <label className="block text-sm font-medium mb-1">Location Update Interval</label>
                <select
                  value={settings.locationUpdateInterval}
                  onChange={(e) => setSettings({ ...settings, locationUpdateInterval: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value={15000}>15 seconds</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>1 minute</option>
                  <option value={120000}>2 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Chaser Radar Range (meters)</label>
                <input
                  type="number"
                  value={settings.chaserRadarRange || 200}
                  onChange={(e) => setSettings({ ...settings, chaserRadarRange: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                  min="50"
                  max="500"
                />
              </div>

              <button
                onClick={handleUpdateSettings}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                Update Settings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}