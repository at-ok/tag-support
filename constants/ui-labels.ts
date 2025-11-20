/**
 * UI表示用のラベル定数
 */

/**
 * ゲーム状態のラベルと表示スタイル
 */
export const GAME_STATUS_LABELS = {
  waiting: {
    emoji: '⏳',
    text: '待機中',
    color: 'bg-yellow-100 text-yellow-700',
  },
  active: {
    emoji: '▶️',
    text: '進行中',
    color: 'bg-green-100 text-green-700',
  },
  paused: {
    emoji: '⏸️',
    text: '一時停止',
    color: 'bg-orange-100 text-orange-700',
  },
  finished: {
    emoji: '✓',
    text: '終了',
    color: 'bg-slate-100 text-slate-700',
  },
} as const;

/**
 * ミッションタイプのラベル
 */
export const MISSION_TYPE_LABELS = {
  area: '📍 エリア到達',
  escape: '🏃 脱出ポイント',
  common: '🎯 共通タスク',
  rescue: '🚑 救出ミッション',
} as const;

/**
 * ユーザーロールのラベル
 */
export const ROLE_LABELS = {
  runner: {
    emoji: '🏃',
    text: '逃走者',
  },
  chaser: {
    emoji: '👹',
    text: '鬼',
  },
  gamemaster: {
    emoji: '🎮',
    text: 'ゲームマスター',
  },
  special: {
    emoji: '⭐',
    text: '特殊役職',
  },
} as const;

/**
 * プレイヤーステータスのラベル
 */
export const STATUS_LABELS = {
  active: {
    emoji: '✅',
    text: 'アクティブ',
    color: 'bg-green-100 text-green-700',
  },
  safe: {
    emoji: '🔒',
    text: '安全',
    color: 'bg-blue-100 text-blue-700',
  },
  captured: {
    emoji: '🎯',
    text: '捕獲済み',
    color: 'bg-red-100 text-red-700',
  },
  offline: {
    emoji: '⚪',
    text: 'オフライン',
    color: 'bg-gray-100 text-gray-700',
  },
} as const;

/**
 * ロールラベルを取得するヘルパー関数
 * @param role ユーザーロール
 * @returns ロールラベル（テキスト+絵文字）
 */
export function getRoleLabel(role: keyof typeof ROLE_LABELS): string {
  const label = ROLE_LABELS[role];
  return label ? `${label.emoji} ${label.text}` : role;
}

/**
 * ゲーム状態ラベルを取得するヘルパー関数
 * @param status ゲーム状態
 * @returns 状態ラベル（テキスト+絵文字）
 */
export function getGameStatusLabel(status: keyof typeof GAME_STATUS_LABELS): string {
  const label = GAME_STATUS_LABELS[status];
  return label ? `${label.emoji} ${label.text}` : status;
}

/**
 * ミッションタイプラベルを取得するヘルパー関数
 * @param type ミッションタイプ
 * @returns ミッションタイプラベル
 */
export function getMissionTypeLabel(type: keyof typeof MISSION_TYPE_LABELS): string {
  return MISSION_TYPE_LABELS[type] || type;
}
