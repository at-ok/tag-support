'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocationHistory, type LocationHistoryEntry } from '@/hooks/useLocationHistory';

interface ReplayViewerProps {
  userId: string;
  gameId?: string;
  isGameMaster?: boolean;
}

export default function ReplayViewer({ userId, gameId, isGameMaster = false }: ReplayViewerProps) {
  const { history, loading, fetchHistory } = useLocationHistory({ userId, gameId });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!isPlaying || history.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= history.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, history.length, playbackSpeed]);

  const handlePlay = useCallback(() => {
    if (currentIndex >= history.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  }, [currentIndex, history.length]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  const handleSeek = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPlaying(false);
  }, []);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const currentEntry = history[currentIndex];
  const progress = history.length > 0 ? (currentIndex / (history.length - 1)) * 100 : 0;

  if (!isGameMaster) {
    return null;
  }

  return (
    <div className="card-mobile">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
          <span className="text-xl">🎬</span>
        </div>
        <h3 className="font-bold text-lg text-slate-800">リプレイビューア</h3>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center animate-pulse">
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-slate-500 text-sm">履歴を読み込み中...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-2xl opacity-50">🎬</span>
          </div>
          <p className="text-slate-500 text-sm">位置履歴データがありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current position info */}
          {currentEntry && (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-600 mb-1">時刻</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatTime(currentEntry.timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">位置</p>
                  <p className="text-xs font-mono text-slate-800">
                    {currentEntry.location.lat.toFixed(6)}, {currentEntry.location.lng.toFixed(6)}
                  </p>
                </div>
                {currentEntry.speed !== undefined && (
                  <div>
                    <p className="text-xs text-slate-600 mb-1">速度</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {(currentEntry.speed * 3.6).toFixed(1)} km/h
                    </p>
                  </div>
                )}
                {currentEntry.heading !== undefined && (
                  <div>
                    <p className="text-xs text-slate-600 mb-1">方向</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {currentEntry.heading.toFixed(0)}°
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>{currentIndex + 1} / {history.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Seek bar */}
            <input
              type="range"
              min="0"
              max={history.length - 1}
              value={currentIndex}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full h-2 bg-transparent cursor-pointer appearance-none"
              style={{
                WebkitAppearance: 'none',
                background: 'transparent',
              }}
            />
          </div>

          {/* Playback controls */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 btn-secondary text-sm py-2"
                disabled={currentIndex === 0}
              >
                ⏮️ リセット
              </button>
              {isPlaying ? (
                <button
                  onClick={handlePause}
                  className="flex-1 btn-warning text-sm py-2"
                >
                  ⏸️ 一時停止
                </button>
              ) : (
                <button
                  onClick={handlePlay}
                  className="flex-1 btn-success text-sm py-2"
                  disabled={currentIndex >= history.length - 1}
                >
                  ▶️ 再生
                </button>
              )}
            </div>

            {/* Playback speed */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">再生速度:</span>
              <div className="flex gap-1 flex-1">
                {[1, 2, 4, 8].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      playbackSpeed === speed
                        ? 'bg-blue-500 text-white elevation-2'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-semibold text-slate-700 mb-2">タイムライン</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {history.slice(Math.max(0, currentIndex - 2), Math.min(history.length, currentIndex + 3)).map((entry, idx) => {
                const actualIdx = Math.max(0, currentIndex - 2) + idx;
                const isCurrent = actualIdx === currentIndex;
                return (
                  <button
                    key={entry.id}
                    onClick={() => handleSeek(actualIdx)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                      isCurrent
                        ? 'bg-blue-100 border border-blue-300 font-semibold'
                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={isCurrent ? 'text-blue-700' : 'text-slate-700'}>
                        {formatTime(entry.timestamp)}
                      </span>
                      {entry.speed !== undefined && (
                        <span className={`font-mono ${isCurrent ? 'text-blue-600' : 'text-slate-500'}`}>
                          {(entry.speed * 3.6).toFixed(1)} km/h
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
