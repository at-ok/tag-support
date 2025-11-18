'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="font-medium text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="card-elevated w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="elevation-3 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
              <span className="text-3xl">👋</span>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-slate-800">おかえりなさい！</h1>
          </div>

          <div className="mb-6 space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-1 text-sm text-slate-600">ニックネーム</p>
              <p className="text-lg font-semibold text-slate-800">{user.nickname}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-1 text-sm text-slate-600">役職</p>
              <p className="text-lg font-semibold text-slate-800">
                {user.role === 'runner'
                  ? '🏃 逃走者'
                  : user.role === 'chaser'
                    ? '👹 鬼'
                    : user.role === 'gamemaster'
                      ? '🎮 ゲームマスター'
                      : user.role}
              </p>
            </div>

            {user.team && (
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-1 text-sm text-slate-600">チーム</p>
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
            className="btn-primary w-full"
          >
            ゲームに参加
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="card-elevated w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="elevation-4 mx-auto mb-4 flex h-20 w-20 transform items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 transition-transform duration-200 hover:scale-105">
            <span className="text-4xl">🏃‍♂️</span>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-slate-800">リアル鬼ごっこ</h1>
          <p className="text-slate-600">リアルタイム鬼ごっこサポートアプリ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">ニックネーム</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="input-touch w-full"
              placeholder="ニックネームを入力"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">役職</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="input-touch w-full"
              disabled={isSubmitting}
            >
              <option value="runner">🏃 逃走者（逃げる人）</option>
              <option value="chaser">👹 鬼（追いかける人）</option>
              <option value="gamemaster">🎮 ゲームマスター</option>
            </select>
          </div>

          {role !== 'gamemaster' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="mb-2 block text-sm font-semibold text-slate-700">チーム</label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="input-touch w-full"
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
            className="btn-primary w-full disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '参加中...' : 'ゲームに参加'}
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <span className="text-lg">📍</span>
            <span className="font-medium">位置情報の許可をお忘れなく！</span>
          </div>
        </div>
      </div>
    </div>
  );
}
