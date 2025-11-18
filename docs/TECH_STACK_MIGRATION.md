# 技術スタック移行ガイド

## 概要

このドキュメントでは、Firebase から Supabase への移行、およびCI/CD・テスト環境の追加について説明します。

## 移行の背景

### なぜSupabaseに移行するのか？

| 項目               | Firebase                 | Supabase             | 判定                |
| ------------------ | ------------------------ | -------------------- | ------------------- |
| **無料枠**         | Firestore: 50K reads/day | PostgreSQL: 500MB DB | ✅ Supabaseが有利   |
| **リアルタイム**   | 有料（Blazeプラン必須）  | 完全無料             | ✅ Supabaseが有利   |
| **位置情報クエリ** | GeoFirestore必要         | PostGIS内蔵          | ✅ Supabaseが圧倒的 |
| **SQL**            | 使えない                 | PostgreSQL標準       | ✅ Supabaseが有利   |
| **複雑なクエリ**   | 制限あり                 | フル機能             | ✅ Supabaseが有利   |
| **総合コスト**     | $0-5/月                  | $0/月                | ✅ Supabase完全無料 |

**結論**: 本プロジェクトの要件（6-10人、リアルタイム位置同期、完全無料）に最適。

---

## Phase 1: 環境構築（完了✅）

### 追加されたファイル

```
.github/workflows/
├── ci.yml                  # CI/CDパイプライン
└── deploy.yml              # デプロイワークフロー

lib/
└── supabase.ts             # Supabaseクライアント

types/
└── database.ts             # データベース型定義

supabase/migrations/
└── 20250101000000_initial_schema.sql  # 初期スキーマ

tests/e2e/
└── example.spec.ts         # E2Eテストサンプル

.eslintrc.json              # ESLint設定
.prettierrc                 # Prettier設定
.prettierignore             # Prettierインスタンス設定
vitest.config.ts            # Vitestテスト設定
vitest.setup.ts             # Vitestセットアップ
playwright.config.ts        # Playwrightテスト設定
.env.local.example          # 環境変数テンプレート
```

### 更新されたファイル

```
package.json                # 依存関係更新
tsconfig.json               # TypeScript strictモード強化
README.md                   # 新スタックに対応
docs/SUPABASE_SETUP.md      # セットアップガイド（新規）
```

---

## Phase 2: データ移行（次のステップ）

### 2.1 Firebaseデータのエクスポート（該当する場合）

既存のFirebaseデータがある場合：

```bash
# Firebase CLIをインストール
npm install -g firebase-tools

# ログイン
firebase login

# Firestoreデータをエクスポート
firebase firestore:export gs://YOUR_BUCKET/export
```

### 2.2 Supabaseへのインポート

エクスポートしたデータをSupabaseにインポート：

```typescript
// scripts/migrate-data.ts
import { supabase } from '@/lib/supabase';
import firebaseData from './firebase-export.json';

async function migrateUsers() {
  for (const user of firebaseData.users) {
    await supabase.from('users').insert({
      id: user.id,
      nickname: user.nickname,
      role: user.role,
      team_id: user.teamId,
      status: user.status,
    });
  }
}

// 実行
migrateUsers().then(() => console.log('Migration complete!'));
```

---

## Phase 3: コード移行

### 3.1 認証の移行

#### Firebase（旧）

```typescript
import { auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';

await signInAnonymously(auth);
```

#### Supabase（新）

```typescript
import { supabase } from '@/lib/supabase';

// 匿名認証
const { data, error } = await supabase.auth.signInAnonymously();

// または、ニックネームベースの簡易認証
const { data: user } = await supabase
  .from('users')
  .insert({
    nickname: 'Player1',
    role: 'runner',
  })
  .select()
  .single();
```

### 3.2 データ取得の移行

#### Firebase（旧）

```typescript
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const snapshot = await getDocs(collection(db, 'users'));
const users = snapshot.docs.map((doc) => doc.data());
```

#### Supabase（新）

```typescript
import { supabase } from '@/lib/supabase';

const { data: users, error } = await supabase.from('users').select('*');
```

### 3.3 リアルタイムサブスクリプションの移行

#### Firebase（旧）

```typescript
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const unsubscribe = onSnapshot(collection(db, 'player_locations'), (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added' || change.type === 'modified') {
      console.log('Location updated:', change.doc.data());
    }
  });
});
```

#### Supabase（新）

```typescript
import { supabase } from '@/lib/supabase';

const channel = supabase
  .channel('player-locations')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'player_locations',
    },
    (payload) => {
      console.log('Location updated:', payload.new);
    }
  )
  .subscribe();

// クリーンアップ
return () => {
  supabase.removeChannel(channel);
};
```

### 3.4 位置情報クエリの移行

#### Firebase（旧）- GeoFirestore必要

```typescript
import * as geofirestore from 'geofirestore';

const GeoFirestore = geofirestore.initializeApp(db);
const geocollection = GeoFirestore.collection('player_locations');

const query = geocollection.near({
  center: new firebase.firestore.GeoPoint(35.5494, 139.7798),
  radius: 1000, // meters
});

query.get().then((snapshot) => {
  snapshot.forEach((doc) => {
    console.log(doc.data());
  });
});
```

#### Supabase（新）- PostGIS内蔵

```typescript
import { supabase } from '@/lib/supabase';

// 関数を使った近くのプレイヤー検索
const { data, error } = await supabase.rpc('nearby_players', {
  center_lat: 35.5494,
  center_lng: 139.7798,
  radius_meters: 1000,
});

// または直接SQLで
const { data, error } = await supabase.rpc('sql', {
  query: `
    SELECT
      user_id,
      ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) AS distance
    FROM player_locations
    WHERE ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3
    )
    ORDER BY distance
  `,
  params: [139.7798, 35.5494, 1000],
});
```

---

## Phase 4: Reactフックの作成

### 4.1 認証フック

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types/database';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // ユーザー情報取得
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUser(data);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setUser(data));
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

### 4.2 リアルタイム位置情報フック

```typescript
// hooks/useRealtimeLocations.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface PlayerLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export function useRealtimeLocations(teamId?: string) {
  const [locations, setLocations] = useState<PlayerLocation[]>([]);

  useEffect(() => {
    // 初期データ取得
    const fetchLocations = async () => {
      const query = supabase
        .from('player_locations')
        .select('*, users!inner(team_id)')
        .order('timestamp', { ascending: false });

      if (teamId) {
        query.eq('users.team_id', teamId);
      }

      const { data } = await query;
      if (data) setLocations(data);
    };

    fetchLocations();

    // リアルタイムサブスクリプション
    const channel = supabase
      .channel('player-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_locations',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setLocations((prev) => {
              const index = prev.findIndex((l) => l.id === payload.new.id);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = payload.new as PlayerLocation;
                return updated;
              }
              return [...prev, payload.new as PlayerLocation];
            });
          } else if (payload.eventType === 'DELETE') {
            setLocations((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  return locations;
}
```

---

## Phase 5: テスト環境の活用

### 5.1 ユニットテスト（Vitest）

```typescript
// __tests__/lib/supabase.test.ts
import { describe, it, expect } from 'vitest';
import { supabase } from '@/lib/supabase';

describe('Supabase Client', () => {
  it('should be initialized', () => {
    expect(supabase).toBeDefined();
  });

  it('should fetch users', async () => {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

### 5.2 E2Eテスト（Playwright）

```typescript
// tests/e2e/location-tracking.spec.ts
import { test, expect } from '@playwright/test';

test('location tracking works', async ({ page, context }) => {
  // 位置情報の許可を付与
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 35.5494, longitude: 139.7798 });

  await page.goto('/runner');

  // 地図が表示されることを確認
  const map = page.locator('#map');
  await expect(map).toBeVisible();

  // 位置情報が更新されることを確認
  await page.waitForTimeout(2000);
  const locationMarker = page.locator('.leaflet-marker-icon');
  await expect(locationMarker).toBeVisible();
});
```

---

## Phase 6: CI/CDの活用

### 6.1 GitHub Actionsの動作確認

プルリクエストを作成すると自動的に：

1. ✅ ESLint チェック
2. ✅ TypeScript 型チェック
3. ✅ Prettier フォーマットチェック
4. ✅ ユニットテスト実行
5. ✅ E2Eテスト実行
6. ✅ ビルド確認

### 6.2 Vercel自動デプロイ

`main`ブランチへのpushで自動的に：

1. ✅ テスト実行
2. ✅ ビルド
3. ✅ Vercelにデプロイ
4. ✅ プレビューURL生成

---

## よくある質問（FAQ）

### Q1: Firebaseを完全に削除していいか？

**A**: 既存のデータや機能がない場合は削除可能です。移行完了後、`npm uninstall firebase` で削除できます。

### Q2: SupabaseとFirebaseを併用できるか？

**A**: 可能ですが、複雑になるため推奨しません。段階的移行の場合は一時的に併用できます。

### Q3: 無料枠を超えたらどうなるか？

**A**: Supabaseの無料枠：

- DB: 500MB（本プロジェクトでは十分）
- API requests: 無制限
- Bandwidth: 5GB/月（10人×1日なら余裕）

### Q4: 本番環境でのパフォーマンスは？

**A**:

- PostgreSQL + PostGIS は高速
- Tokyo リージョン選択でレイテンシ最小化
- 空間インデックスで位置クエリは<10ms

### Q5: ローカル開発環境は？

**A**: Supabase CLIでローカルDBを起動可能：

```bash
npx supabase start
```

---

## まとめ

### ✅ 完了したこと

- CI/CDパイプライン構築
- テスト環境整備（Vitest + Playwright）
- Supabase設定ファイル作成
- データベーススキーマ作成
- TypeScript strictモード強化
- ESLint/Prettier設定

### 🔄 次のステップ

1. Supabaseプロジェクト作成
2. 環境変数設定（`.env.local`）
3. データベースマイグレーション実行
4. 既存コードの移行（認証、データ取得、リアルタイム）
5. テスト実行
6. Vercelデプロイ

### 📚 参考資料

- [Supabase Documentation](https://supabase.com/docs)
- [PostGIS Documentation](https://postgis.net/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
