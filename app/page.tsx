'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, signIn, loading } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<UserRole>('runner');
  const [team, setTeam] = useState('A');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setIsSubmitting(true);
    try {
      await signIn(nickname.trim(), role, role === 'gamemaster' ? undefined : team);
      
      switch (role) {
        case 'runner':
          router.push('/runner');
          break;
        case 'chaser':
          router.push('/chaser');
          break;
        case 'gamemaster':
          router.push('/gamemaster');
          break;
        default:
          router.push('/');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="card-elevated max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center elevation-3">
              <span className="text-3xl">👋</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">おかえりなさい！</h1>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm text-slate-600 mb-1">ニックネーム</p>
              <p className="text-lg font-semibold text-slate-800">{user.nickname}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm text-slate-600 mb-1">役職</p>
              <p className="text-lg font-semibold text-slate-800">
                {user.role === 'runner' ? '🏃 逃走者' :
                 user.role === 'chaser' ? '👹 鬼' :
                 user.role === 'gamemaster' ? '🎮 ゲームマスター' : user.role}
              </p>
            </div>

            {user.team && (
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-600 mb-1">チーム</p>
                <p className="text-lg font-semibold text-slate-800">チーム {user.team}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              switch (user.role) {
                case 'runner':
                  router.push('/runner');
                  break;
                case 'chaser':
                  router.push('/chaser');
                  break;
                case 'gamemaster':
                  router.push('/gamemaster');
                  break;
              }
            }}
            className="w-full btn-primary"
          >
            ゲームに参加
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="card-elevated max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center elevation-4 transform hover:scale-105 transition-transform duration-200">
            <span className="text-4xl">🏃‍♂️</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">リアル鬼ごっこ</h1>
          <p className="text-slate-600">リアルタイム鬼ごっこサポートアプリ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              ニックネーム
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full input-touch"
              placeholder="ニックネームを入力"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              役職
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full input-touch"
              disabled={isSubmitting}
            >
              <option value="runner">🏃 逃走者（逃げる人）</option>
              <option value="chaser">👹 鬼（追いかける人）</option>
              <option value="gamemaster">🎮 ゲームマスター</option>
            </select>
          </div>

          {role !== 'gamemaster' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                チーム
              </label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full input-touch"
                disabled={isSubmitting}
              >
                <option value="A">チーム A</option>
                <option value="B">チーム B</option>
                <option value="C">チーム C</option>
                <option value="D">チーム D</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={!nickname.trim() || isSubmitting}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? '参加中...' : 'ゲームに参加'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <span className="text-lg">📍</span>
            <span className="font-medium">位置情報の許可をお忘れなく！</span>
          </div>
        </div>
      </div>
    </div>
  );
}
