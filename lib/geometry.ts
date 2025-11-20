/**
 * 地理的計算のユーティリティ関数
 */

export interface GeoLocation {
  lat: number;
  lng: number;
  timestamp?: Date;
}

/**
 * 2点間の距離をメートル単位で計算（Haversine formula）
 * @param pos1 開始位置
 * @param pos2 終了位置
 * @returns 距離（メートル）
 */
export function calculateDistance(
  pos1: GeoLocation,
  pos2: GeoLocation
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (pos1.lat * Math.PI) / 180;
  const φ2 = (pos2.lat * Math.PI) / 180;
  const Δφ = ((pos2.lat - pos1.lat) * Math.PI) / 180;
  const Δλ = ((pos2.lng - pos1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 2点間の速度を計算（メートル/秒）
 * @param prev 前の位置（timestampが必要）
 * @param current 現在の位置（timestampが必要）
 * @returns 速度（メートル/秒）、時間差がない場合は0
 */
export function calculateSpeed(
  prev: GeoLocation & { timestamp: Date },
  current: GeoLocation & { timestamp: Date }
): number {
  const distance = calculateDistance(prev, current);
  const timeDiff = (current.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
  return timeDiff > 0 ? distance / timeDiff : 0;
}

/**
 * 2点間の方向角を計算（度数法、0-360）
 * @param prev 前の位置
 * @param current 現在の位置
 * @returns 方向角（度、北を0度として時計回り）
 */
export function calculateHeading(
  prev: GeoLocation,
  current: GeoLocation
): number {
  const φ1 = (prev.lat * Math.PI) / 180;
  const φ2 = (current.lat * Math.PI) / 180;
  const Δλ = ((current.lng - prev.lng) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360;
}
