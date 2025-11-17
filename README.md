# Tag Support - リアル鬼ごっこサポートアプリ

大学生グループ向けの大規模リアル鬼ごっこイベントを支援するPWA（Progressive Web App）です。

## 機能概要

### 🏃‍♂️ プレイヤー向け機能
- **逃走者（Runner）**: チームメイト位置の表示、ミッション表示
- **鬼（Chaser）**: 近距離レーダー、捕獲機能

### 🎮 運営向け機能
- **ゲームマスター**: 全プレイヤー位置管理、ステータス変更、リアルタイム監視

### 🗺️ 位置情報機能
- リアルタイム位置追跡
- Leaflet.jsによる地図表示
- 調整可能な位置精度・更新間隔

## 技術スタック

- **フロントエンド**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL + PostGIS + Realtime + Auth)
- **地図**: Leaflet.js + OpenStreetMap
- **PWA**: next-pwa + Service Worker
- **テスト**: Vitest + Playwright
- **CI/CD**: GitHub Actions + Vercel

## 開発環境セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd tag-support

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.local.example .env.local
# .env.localにFirebaseの設定を記入

# 開発サーバーの起動
npm run dev
```

### Supabase設定

1. [Supabase](https://app.supabase.com/)でプロジェクトを作成
2. SQL Editor で `supabase/migrations/20250101000000_initial_schema.sql` を実行
3. Settings > API でプロジェクトURLとAnon Keyを取得
4. `.env.local`に設定値を記入

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## ディレクトリ構成

```
tag-support/
├── app/                    # Next.js App Router
│   ├── runner/            # 逃走者UI
│   ├── chaser/            # 鬼UI
│   └── gamemaster/        # ゲームマスターUI
├── components/            # 共通コンポーネント
│   └── Map.tsx           # 地図コンポーネント
├── hooks/                # カスタムフック
│   ├── useAuth.ts        # 認証フック
│   └── useLocation.ts    # 位置情報フック
├── lib/                  # ライブラリ設定
│   └── supabase.ts       # Supabase初期化
├── types/                # TypeScript型定義
│   └── index.ts          # メイン型定義
└── public/               # 静的ファイル
    ├── manifest.json     # PWAマニフェスト
    └── sw.js            # Service Worker
```

## 使用方法

### 1. プレイヤー登録
1. アプリにアクセス
2. ニックネーム・役職・チームを選択
3. 位置情報のアクセス許可

### 2. 各役職での操作
- **逃走者**: チームメイト位置確認、ミッション進行
- **鬼**: 近くの逃走者を捕獲
- **ゲームマスター**: 全体管理、プレイヤーステータス変更

## 実装済み機能

✅ Next.js + TypeScript + PWA基盤
✅ Supabase (PostgreSQL + PostGIS) 連携
✅ 位置情報トラッキング
✅ Leaflet.js地図表示
✅ 役職別UI（逃走者・鬼・ゲームマスター）
✅ PWA設定・オフライン対応基礎
✅ CI/CD (GitHub Actions)
✅ テスト環境 (Vitest + Playwright)  

## 今後の実装予定

- [ ] Push通知機能
- [ ] ミッションシステム
- [ ] セーフゾーン・立禁エリア
- [ ] ゲーム状態管理
- [ ] リプレイ機能

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番環境確認
npm run start

# 型チェック
npm run type-check

# テスト
npm run test              # ユニットテスト (Vitest)
npm run test:ui           # ユニットテスト UI
npm run test:e2e          # E2Eテスト (Playwright)
npm run test:e2e:ui       # E2Eテスト UI

# コード品質
npm run lint              # ESLint
npm run format            # Prettier フォーマット
npm run format:check      # フォーマットチェック
```

## ライセンス

MIT License
