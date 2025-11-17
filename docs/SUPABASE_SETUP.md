# Supabase環境構築手順

## 前提条件
- Googleアカウントまたはメールアドレス
- Node.js 20以上がインストールされていること

## 1. Supabaseプロジェクトの作成

### 1.1 Supabaseへアクセス
1. [Supabase](https://app.supabase.com/)にアクセス
2. GitHubアカウントまたはメールアドレスでサインアップ/ログイン

### 1.2 新規プロジェクト作成
1. 「New Project」ボタンをクリック
2. プロジェクト情報を入力：
   - **Name**: `tag-support`（任意）
   - **Database Password**: 強力なパスワードを生成（保存すること）
   - **Region**: `Northeast Asia (Tokyo)` または近隣リージョン
3. 「Create new project」をクリック
4. プロジェクトのセットアップを待つ（1-2分）

## 2. データベースの初期化

### 2.1 SQL Editorでスキーマ作成
1. 左サイドバーから「SQL Editor」を選択
2. 「New query」をクリック
3. `supabase/migrations/20250101000000_initial_schema.sql` の内容をコピー＆ペースト
4. 「Run」ボタンをクリックして実行

これにより以下が作成されます：
- ✅ PostGIS拡張（位置情報クエリ用）
- ✅ users テーブル
- ✅ player_locations テーブル（空間インデックス付き）
- ✅ missions テーブル
- ✅ game_state テーブル
- ✅ nearby_players 関数（近くのプレイヤー検索）
- ✅ Row Level Security (RLS) ポリシー

### 2.2 データベース確認
1. 左サイドバーから「Table Editor」を選択
2. 以下のテーブルが表示されることを確認：
   - users
   - player_locations
   - missions
   - game_state

## 3. API設定の取得

### 3.1 プロジェクト設定
1. 左サイドバーの歯車アイコン「Settings」をクリック
2. 「API」セクションを選択
3. 以下の情報をコピー：
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGci...` （長い文字列）

## 4. 環境変数の設定

### 4.1 .env.localファイル作成
プロジェクトルートに`.env.local`ファイルを作成：

```bash
cp .env.local.example .env.local
```

### 4.2 環境変数を記入
`.env.local`を編集：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 4.3 .gitignoreの確認
`.env.local`が`.gitignore`に含まれていることを確認：

```gitignore
# local env files
.env*.local
```

## 5. 認証の設定（オプション）

### 5.1 Authenticationの設定
1. 左サイドバーから「Authentication」を選択
2. 「Providers」タブで「Email」を有効化（デフォルトで有効）
3. 「Settings」で以下を確認：
   - **Confirm email**: オフ（開発時のみ、本番ではオン推奨）
   - **Auto-confirm users**: オン（開発時のみ）

## 6. リアルタイム機能の有効化

### 6.1 Realtimeの設定
1. 左サイドバーから「Database」 > 「Replication」を選択
2. 以下のテーブルでReplicationを有効化：
   - ✅ `player_locations`（位置情報のリアルタイム同期用）
   - ✅ `users`（ステータス変更のリアルタイム同期用）
   - ✅ `missions`（ミッション更新のリアルタイム同期用）
   - ✅ `game_state`（ゲーム状態のリアルタイム同期用）

## 7. 動作確認

### 7.1 開発サーバー起動
```bash
npm install
npm run dev
```

### 7.2 確認項目
1. http://localhost:3000 にアクセス
2. ブラウザの開発者ツール（F12）を開く
3. Consoleタブでエラーがないか確認
4. Supabase接続が成功していることを確認

### 7.3 データベース接続テスト
以下のコードで接続をテスト（任意のReactコンポーネント内）：

```typescript
import { supabase } from '@/lib/supabase';

// テストクエリ
const { data, error } = await supabase.from('users').select('*').limit(1);
console.log('Supabase test:', { data, error });
```

## 8. よくあるエラーと対処法

### エラー1: "Invalid API key"
**原因**: 環境変数が正しく読み込まれていない
**対処**:
1. `.env.local`の値が正しいか確認
2. 開発サーバーを再起動（Ctrl+C → `npm run dev`）
3. ブラウザのキャッシュをクリア

### エラー2: "Row Level Security policy"
**原因**: RLSポリシーが正しく設定されていない
**対処**:
1. SQL Editorで再度マイグレーションスクリプトを実行
2. Table Editor > テーブル > RLS タブでポリシーを確認

### エラー3: "PostGIS extension not found"
**原因**: PostGIS拡張がインストールされていない
**対処**:
SQL Editorで以下を実行：
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## 9. パフォーマンス最適化（オプション）

### 9.1 インデックスの確認
SQL Editorで以下を実行してインデックスを確認：

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 9.2 クエリパフォーマンスの監視
1. 左サイドバーから「Database」 > 「Query Performance」を選択
2. 遅いクエリを特定して最適化

## 10. 本番環境への移行準備

### 10.1 セキュリティ強化
- [ ] RLSポリシーの再確認
- [ ] APIキーの制限設定（Settings > API > API Settings）
- [ ] 認証メール確認を有効化
- [ ] パスワードポリシーの強化

### 10.2 バックアップ設定
- [ ] 自動バックアップの確認（Proプラン以上で7日間保持）
- [ ] Point-in-Time Recovery (PITR) の検討

### 10.3 監視設定
- [ ] Database Health の定期確認
- [ ] Usage & Billing で無料枠の使用状況を監視

## 11. Vercelへのデプロイ

### 11.1 Vercel連携
1. [Vercel](https://vercel.com/)にGitHubアカウントでログイン
2. 「Import Project」でリポジトリを選択
3. Environment Variablesに以下を追加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 「Deploy」をクリック

### 11.2 自動デプロイの確認
- mainブランチへのpushで自動デプロイされることを確認
- プレビュー環境が正しく動作することを確認

## 次のステップ

環境構築が完了したら：
1. ✅ 実機でのテスト（スマートフォンでURLにアクセス）
2. ✅ 位置情報の許可と動作確認
3. ✅ 複数端末での同期テスト
4. ✅ PWAインストールテスト
5. ✅ リアルタイム機能のテスト

## 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Supabase Pricing](https://supabase.com/pricing)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
