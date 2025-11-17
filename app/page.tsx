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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">おかえりなさい！</h1>
          <div className="text-center space-y-2">
            <p>ニックネーム: <span className="font-bold">{user.nickname}</span></p>
            <p>役職: <span className="font-bold">{
              user.role === 'runner' ? '逃走者' : 
              user.role === 'chaser' ? '鬼' : 
              user.role === 'gamemaster' ? 'ゲームマスター' : user.role
            }</span></p>
            {user.team && <p>チーム: <span className="font-bold">{user.team}</span></p>}
            
            <div className="mt-6 space-y-3">
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🏃‍♂️ リアル鬼ごっこ</h1>
          <p className="text-gray-600">リアルタイム鬼ごっこサポートアプリ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '参加中...' : 'ゲームに参加'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            位置情報の許可をお忘れなく！
          </p>
        </div>
      </div>
    </div>
  );
}
