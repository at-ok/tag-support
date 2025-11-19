# プッシュ通知システム

このアプリケーションは、Web Push API を使用したサーバー側プッシュ通知をサポートしています。

## セットアップ

### 1. VAPIDキーの生成

プッシュ通知を送信するには、VAPIDキーが必要です。以下のコマンドでキーを生成します：

```bash
node scripts/generate-vapid-keys.js
```

生成されたキーを `.env.local` ファイルに追加します：

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your-email@example.com
```

### 2. データベースマイグレーション

Supabaseダッシュボードで以下のマイグレーションを実行します：

```bash
# Supabase CLIを使用する場合
supabase db push

# または、Supabaseダッシュボードで直接SQLを実行
# ファイル: supabase/migrations/20250120000000_add_push_subscriptions.sql
```

### 3. 環境変数の確認

以下の環境変数が設定されていることを確認します：

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - VAPIDパブリックキー（クライアント側で使用）
- `VAPID_PRIVATE_KEY` - VAPIDプライベートキー（サーバー側のみ）
- `VAPID_SUBJECT` - mailto: または https: URL
- `NEXT_PUBLIC_SUPABASE_URL` - Supabaseプロジェクト URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase Anon Key

## 使用方法

### クライアント側

#### 1. 通知権限のリクエスト

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { requestPermission, permission } = useNotifications();

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      console.log('通知権限が許可されました');
    }
  };

  return (
    <button onClick={handleRequestPermission}>
      通知を有効にする
    </button>
  );
}
```

#### 2. プッシュ通知のサブスクライブ

```typescript
const { subscribeToPush, isSubscribed } = useNotifications();

const handleSubscribe = async () => {
  const userId = 'user-id'; // 現在のユーザーID
  const success = await subscribeToPush(userId);
  if (success) {
    console.log('プッシュ通知にサブスクライブしました');
  }
};
```

#### 3. ローカル通知の送信

```typescript
const { sendNotification } = useNotifications();

const handleLocalNotification = async () => {
  await sendNotification('game_start', {
    title: 'ゲーム開始！',
    body: '30分間のゲームが開始されました',
    vibrate: [200, 100, 200],
  });
};
```

### サーバー側

#### プッシュ通知の送信

APIルート `/api/push/send` を使用して、プッシュ通知を送信します：

```typescript
// 特定のユーザーに送信
const response = await fetch('/api/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userIds: ['user-id-1', 'user-id-2'],
    payload: {
      title: 'ミッション割り当て',
      body: '新しいミッションが割り当てられました',
      type: 'mission_assigned',
      data: {
        missionId: 'mission-123',
        url: '/missions',
      },
    },
  }),
});

// すべてのユーザーに送信
const response = await fetch('/api/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userIds: 'all',
    payload: {
      title: 'ゲーム開始',
      body: 'ゲームが開始されました',
      type: 'game_start',
    },
  }),
});

// 特定のロールのユーザーに送信
const response = await fetch('/api/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userIds: 'all',
    roles: ['runner', 'chaser'],
    payload: {
      title: 'ゲーム終了',
      body: 'ゲームが終了しました',
      type: 'game_end',
    },
  }),
});
```

## API エンドポイント

### GET /api/push/vapid

VAPIDパブリックキーを取得します。

**レスポンス:**

```json
{
  "publicKey": "your-vapid-public-key"
}
```

### POST /api/push/subscribe

プッシュ通知サブスクリプションを登録します。

**リクエストボディ:**

```json
{
  "userId": "user-id",
  "subscription": {
    "endpoint": "https://...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

**レスポンス:**

```json
{
  "success": true,
  "message": "Subscription saved"
}
```

### POST /api/push/unsubscribe

プッシュ通知サブスクリプションを解除します。

**リクエストボディ:**

```json
{
  "userId": "user-id",
  "endpoint": "https://..."
}
```

**レスポンス:**

```json
{
  "success": true,
  "message": "Subscription deleted"
}
```

### POST /api/push/send

プッシュ通知を送信します。

**リクエストボディ:**

```json
{
  "userIds": ["user-id-1", "user-id-2"] | "all",
  "roles": ["runner", "chaser"],  // オプション
  "payload": {
    "title": "通知のタイトル",
    "body": "通知の本文",
    "icon": "/icons/icon-192x192.png",  // オプション
    "badge": "/icons/icon-192x192.png",  // オプション
    "vibrate": [100, 50, 100],  // オプション
    "type": "game_start",  // オプション
    "data": {  // オプション
      "url": "/game",
      "gameId": "game-123"
    }
  }
}
```

**レスポンス:**

```json
{
  "success": true,
  "sent": 10,
  "failed": 0,
  "total": 10
}
```

## 通知タイプ

以下の通知タイプがサポートされています：

- `game_start` - ゲーム開始
- `game_end` - ゲーム終了
- `mission_assigned` - ミッション割り当て
- `mission_completed` - ミッション完了
- `capture` - 捕獲
- `rescue` - 救出
- `time_warning` - 残り時間警告
- `zone_alert` - ゾーン警告

各タイプに対して、デフォルトのバイブレーションパターンが設定されています。

## トラブルシューティング

### プッシュ通知が届かない

1. VAPIDキーが正しく設定されているか確認
2. ユーザーが通知権限を許可しているか確認
3. Service Workerが正しく登録されているか確認
4. HTTPSで動作しているか確認（localhost以外）

### サブスクリプションが保存されない

1. Supabaseのマイグレーションが実行されているか確認
2. RLSポリシーが正しく設定されているか確認
3. ユーザーIDが正しいか確認

### 通知がクリックされても遷移しない

1. Service Workerのnotificationclickイベントハンドラーが正しく設定されているか確認
2. 通知のdataに正しいURLが含まれているか確認

## セキュリティ

- VAPIDプライベートキーは絶対にクライアント側に公開しないでください
- `.env.local` ファイルは `.gitignore` に含まれていることを確認してください
- プッシュ通知の送信APIには適切な認証を実装することを推奨します
- RLSポリシーにより、ユーザーは自分のサブスクリプションのみを操作できます

## ブラウザサポート

Web Push APIは以下のブラウザでサポートされています：

- Chrome/Edge 50+
- Firefox 44+
- Safari 16+ (macOS 13+, iOS 16.4+)
- Opera 37+

詳細は [Can I Use](https://caniuse.com/push-api) を参照してください。
