# Firebase環境構築手順

## 前提条件
- Googleアカウントを持っていること
- Node.js 18以上がインストールされていること

## 1. Firebaseプロジェクトの作成

### 1.1 Firebase Consoleへアクセス
1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. Googleアカウントでログイン

### 1.2 新規プロジェクト作成
1. 「プロジェクトを作成」ボタンをクリック
2. プロジェクト名を入力（例：`tag-support-app`）
3. Google Analytics設定
   - 有効にする場合：アナリティクスアカウントを選択
   - 無効でもOK（後から追加可能）
4. 「プロジェクトを作成」をクリック

## 2. Firebase Authentication設定

### 2.1 Authentication有効化
1. Firebase Console左メニューから「Authentication」選択
2. 「始める」ボタンをクリック
3. 「Sign-in method」タブを選択

### 2.2 匿名認証の有効化
1. 「匿名」を選択
2. 「有効にする」トグルをON
3. 「保存」をクリック

## 3. Cloud Firestore設定

### 3.1 Firestore有効化
1. 左メニューから「Firestore Database」選択
2. 「データベースの作成」をクリック
3. セキュリティルール選択
   - **開発時**: 「テストモードで開始」を選択（30日間誰でも読み書き可能）
   - **本番時**: 「本番モードで開始」を選択（後でルール設定必須）
4. ロケーション選択
   - **推奨**: `asia-northeast1` (東京)
   - または `asia-northeast2` (大阪)
5. 「有効にする」をクリック

### 3.2 セキュリティルール設定（重要）
Firestore画面の「ルール」タブで以下を設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーコレクション
    match /users/{userId} {
      // 認証されたユーザーは自分のデータを読み書き可能
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         resource.data.role == 'gamemaster');
    }
    
    // ゲームコレクション
    match /games/{gameId} {
      // 認証されたユーザーは読み取り可能
      allow read: if request.auth != null;
      // ゲームマスターのみ書き込み可能
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'gamemaster';
    }
    
    // ミッションコレクション
    match /missions/{missionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'gamemaster';
    }
  }
}
```

## 4. Firebase Cloud Functions設定（オプション）

### 4.1 Functions有効化
1. 左メニューから「Functions」選択
2. 「始める」をクリック
3. Blazeプラン（従量課金）へのアップグレードが必要
   - 無料枠あり（月間200万回の呼び出しまで無料）
   - クレジットカード登録必要

### 4.2 Functions初期設定
```bash
# Firebase CLIインストール（グローバル）
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# プロジェクトディレクトリで初期化
cd tag-support
firebase init functions

# TypeScriptを選択
# ESLintは任意
# 依存関係のインストール：Yes
```

## 5. Firebase Cloud Messaging設定（Push通知）

### 5.1 FCM有効化
1. プロジェクト設定（歯車アイコン）→「プロジェクトの設定」
2. 「Cloud Messaging」タブを選択
3. Web Push証明書の生成
   - 「ウェブプッシュ証明書」セクション
   - 「鍵ペアを生成」をクリック
   - 生成された「鍵」をコピー（後で.env.localに追加）

## 6. Webアプリの登録

### 6.1 アプリ追加
1. プロジェクト設定画面の「全般」タブ
2. 「マイアプリ」セクションで「</> (ウェブ)」アイコンをクリック
3. アプリのニックネーム入力（例：`tag-support-web`）
4. 「Firebase Hosting」は今回はチェック不要
5. 「アプリを登録」をクリック

### 6.2 設定情報の取得
登録後に表示される設定情報をコピー：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tag-support-app.firebaseapp.com",
  projectId: "tag-support-app",
  storageBucket: "tag-support-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

## 7. 環境変数の設定

### 7.1 .env.localファイル更新
プロジェクトルートの`.env.local`を以下の内容で更新：

```env
# Firebaseの設定値をコピー
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tag-support-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tag-support-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tag-support-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123...

# FCM用（Push通知を使う場合）
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### 7.2 .gitignoreの確認
`.env.local`が`.gitignore`に含まれていることを確認：

```gitignore
# local env files
.env*.local
```

## 8. 動作確認

### 8.1 開発サーバー起動
```bash
npm run dev
```

### 8.2 確認項目
1. http://localhost:3000 にアクセス
2. ニックネーム入力して「Join Game」
3. ブラウザの開発者ツール（F12）でエラーがないか確認
4. Firebase Console > Authentication でユーザーが作成されているか確認
5. Firebase Console > Firestore でデータが保存されているか確認

## 9. よくあるエラーと対処法

### エラー1: Permission Denied
**原因**: Firestoreのセキュリティルールが厳しすぎる
**対処**: 開発時は一時的にテストモードのルールを使用

```javascript
// 開発時のみ（本番では絶対に使わない）
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### エラー2: Firebase App not initialized
**原因**: Firebase設定が正しく読み込まれていない
**対処**: 
1. `.env.local`の値が正しいか確認
2. 開発サーバーを再起動（Ctrl+C → npm run dev）

### エラー3: Quota Exceeded
**原因**: 無料枠の制限超過
**対処**: 
1. Firebase Console > 使用量と請求 で使用状況確認
2. 必要に応じてBlazeプラン（従量課金）にアップグレード

## 10. 本番環境への移行準備

### 10.1 セキュリティ強化
- [ ] Firestoreセキュリティルールを本番用に更新
- [ ] APIキーの制限設定（Google Cloud Console）
- [ ] ドメイン制限の追加

### 10.2 パフォーマンス最適化
- [ ] Firestore複合インデックスの設定
- [ ] キャッシュ戦略の実装
- [ ] バッチ処理の活用

### 10.3 監視設定
- [ ] Firebase Performance Monitoring有効化
- [ ] Firebase Crashlytics設定（該当する場合）
- [ ] Google Analytics設定

## 次のステップ

環境構築が完了したら：
1. 実機でのテスト（スマートフォンで http://[PCのIPアドレス]:3000 にアクセス）
2. 位置情報の許可と動作確認
3. 複数端末での同期テスト
4. PWAインストールテスト

## 参考リンク

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth/web/start)