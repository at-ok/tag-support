/**
 * データベースのユーザーレコードをアプリケーション型にマッピング
 */

import type { User } from '@/types';

interface DatabaseUserRow {
  id: string;
  nickname: string;
  role: string;
  team_id: string | null;
  status: string;
  updated_at: string;
  capture_count?: number;
  [key: string]: unknown;
}

/**
 * データベースのユーザーレコード1件をアプリのUser型に変換
 * @param row データベースから取得したユーザーレコード
 * @returns アプリケーションで使用するUser型
 */
export function mapDatabaseUserToAppUser(row: DatabaseUserRow): User {
  return {
    id: row.id,
    nickname: row.nickname,
    role: row.role as User['role'],
    team: row.team_id || undefined,
    status:
      row.status === 'captured'
        ? 'captured'
        : row.status === 'offline'
          ? 'safe'
          : 'active',
    lastUpdated: new Date(row.updated_at),
    captureCount: row.capture_count || 0,
  };
}

/**
 * データベースのユーザーレコード配列をアプリのUser型配列に変換
 * @param rows データベースから取得したユーザーレコード配列
 * @returns アプリケーションで使用するUser型配列
 */
export function mapDatabaseUsersToAppUsers(rows: DatabaseUserRow[]): User[] {
  return rows.map(mapDatabaseUserToAppUser);
}
