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
- pnpm 9.12.3以上

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd tag-support

# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.example .env.local
# .env.localにSupabaseの設定を記入

# 開発サーバーの起動
pnpm dev
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
│   ├── api/               # API Routes
│   │   └── push/         # プッシュ通知API
│   ├── runner/            # 逃走者UI
│   ├── chaser/            # 鬼UI
│   └── gamemaster/        # ゲームマスターUI
├── components/            # 共通コンポーネント
│   ├── Map.tsx           # 地図コンポーネント
│   ├── GameControls.tsx  # ゲーム制御UI
│   ├── MissionManager.tsx# ミッション管理UI
│   └── GameStats.tsx     # 統計表示
├── hooks/                # カスタムフック
│   ├── useAuth.tsx       # 認証フック
│   ├── useLocation.ts    # 位置情報フック
│   ├── useGame.tsx       # ゲーム状態管理
│   ├── useMissions.tsx   # ミッション管理
│   └── useLocationHistory.tsx # 位置履歴
├── lib/                  # ユーティリティライブラリ
│   ├── supabase.ts       # Supabase初期化
│   ├── geometry.ts       # 地理計算関数（距離・速度・方向）
│   ├── user-mapper.ts    # DBユーザー型変換
│   └── web-push.ts       # Web Push設定
├── constants/            # 定数定義
│   ├── ui-labels.ts      # UIラベル定数
│   └── game-config.ts    # ゲーム設定定数
├── types/                # TypeScript型定義
│   ├── index.ts          # メイン型定義
│   └── database.ts       # Supabase型定義
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
✅ 位置情報トラッキング（自動履歴記録付き）
✅ Leaflet.js地図表示
✅ 役職別UI（逃走者・鬼・ゲームマスター）
✅ ミッションシステム（作成・削除・完了・位置ベース自動判定）
✅ セーフゾーン・立禁エリア管理
✅ ゲーム状態管理（開始・停止・設定変更）
✅ 捕獲システム（近距離検出・PostGIS）
✅ 位置履歴記録・リプレイ機能
✅ ゲーム統計・分析機能
✅ **プッシュ通知システム（Web Push API + サーバー統合）** ⭐️ NEW
✅ PWA設定・オフライン対応基礎
✅ CI/CD (GitHub Actions)
✅ テスト環境 (Vitest + Playwright)
✅ **コード品質改善（リファクタリング完了）** ⭐️ NEW

## 今後の実装予定

- [ ] Supabase実環境構築（RLS設定・マイグレーション実行）
- [ ] ゲームイベント連動の自動通知
- [ ] マルチゲームマスター対応
- [ ] 特殊役職システム

## 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# 本番環境確認
pnpm start

# 型チェック
pnpm type-check

# テスト
pnpm test              # ユニットテスト (Vitest)
pnpm test:ui           # ユニットテスト UI
pnpm test:e2e          # E2Eテスト (Playwright)
pnpm test:e2e:ui       # E2Eテスト UI

# テストカバレッジ
pnpm test -- --coverage    # カバレッジレポート生成

# コード品質
pnpm lint              # ESLint
pnpm format            # Prettier フォーマット
pnpm format:check      # フォーマットチェック
```

## テスト状況

- **ユニットテスト**: 41/41 成功 (100%) ✅
- **コードカバレッジ**: 88.99% (hooks/) ✅
- **E2Eテスト**: 実装済み ✅

詳細は [docs/TESTING.md](docs/TESTING.md) を参照してください。

## ライセンス

MIT License
