'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocationHistory } from '@/hooks/useLocationHistory';

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
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-600">
          <span className="text-xl">🎬</span>
        </div>
        <h3 className="text-lg font-bold text-slate-800">リプレイビューア</h3>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-slate-100">
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-sm text-slate-500">履歴を読み込み中...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <span className="text-2xl opacity-50">🎬</span>
          </div>
          <p className="text-sm text-slate-500">位置履歴データがありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current position info */}
          {currentEntry && (
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs text-slate-600">時刻</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatTime(currentEntry.timestamp)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-600">位置</p>
                  <p className="font-mono text-xs text-slate-800">
                    {currentEntry.location.lat.toFixed(6)}, {currentEntry.location.lng.toFixed(6)}
                  </p>
                </div>
                {currentEntry.speed !== undefined && (
                  <div>
                    <p className="mb-1 text-xs text-slate-600">速度</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {(currentEntry.speed * 3.6).toFixed(1)} km/h
                    </p>
                  </div>
                )}
                {currentEntry.heading !== undefined && (
                  <div>
                    <p className="mb-1 text-xs text-slate-600">方向</p>
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
              <span>
                {currentIndex + 1} / {history.length}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-slate-200">
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
              className="h-2 w-full cursor-pointer appearance-none bg-transparent"
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
                className="btn-secondary flex-1 py-2 text-sm"
                disabled={currentIndex === 0}
              >
                ⏮️ リセット
              </button>
              {isPlaying ? (
                <button onClick={handlePause} className="btn-warning flex-1 py-2 text-sm">
                  ⏸️ 一時停止
                </button>
              ) : (
                <button
                  onClick={handlePlay}
                  className="btn-success flex-1 py-2 text-sm"
                  disabled={currentIndex >= history.length - 1}
                >
                  ▶️ 再生
                </button>
              )}
            </div>

            {/* Playback speed */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">再生速度:</span>
              <div className="flex flex-1 gap-1">
                {[1, 2, 4, 8].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      playbackSpeed === speed
                        ? 'elevation-2 bg-blue-500 text-white'
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
            <h4 className="mb-2 text-xs font-semibold text-slate-700">タイムライン</h4>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {history
                .slice(Math.max(0, currentIndex - 2), Math.min(history.length, currentIndex + 3))
                .map((entry, idx) => {
                  const actualIdx = Math.max(0, currentIndex - 2) + idx;
                  const isCurrent = actualIdx === currentIndex;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => handleSeek(actualIdx)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-all ${
                        isCurrent
                          ? 'border border-blue-300 bg-blue-100 font-semibold'
                          : 'border border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={isCurrent ? 'text-blue-700' : 'text-slate-700'}>
                          {formatTime(entry.timestamp)}
                        </span>
                        {entry.speed !== undefined && (
                          <span
                            className={`font-mono ${isCurrent ? 'text-blue-600' : 'text-slate-500'}`}
                          >
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
