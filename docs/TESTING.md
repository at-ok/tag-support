# テストガイド

## 概要

Tag Supportプロジェクトでは、高品質なコードを維持するために2種類のテストを実施しています。

- **ユニットテスト**: Vitestを使用した単体テスト
- **E2Eテスト**: Playwrightを使用したエンドツーエンドテスト

## テスト環境

### ユニットテスト (Vitest)

- **フレームワーク**: Vitest
- **テストライブラリ**: @testing-library/react
- **環境**: jsdom
- **設定ファイル**: `vitest.config.ts`

### E2Eテスト (Playwright)

- **フレームワーク**: Playwright
- **対応ブラウザ**: Chromium, Mobile Chrome, Mobile Safari
- **設定ファイル**: `playwright.config.ts`

## テストの実行

### ユニットテスト

```bash
# 全ユニットテストを実行
npm run test

# ウォッチモードで実行
npm run test -- --watch

# UI付きで実行
npm run test:ui

# カバレッジレポート付きで実行
npm run test -- --coverage
```

### E2Eテスト

```bash
# 全E2Eテストを実行
npm run test:e2e

# UI付きで実行
npm run test:e2e:ui

# 特定のブラウザで実行
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project="Mobile Chrome"
npm run test:e2e -- --project="Mobile Safari"

# デバッグモードで実行
npm run test:e2e -- --debug
```

### すべてのテストを実行

```bash
npm run test && npm run test:e2e
```

## テスト構成

### ユニットテスト

```
lib/
└── __tests__/
    └── supabase.test.ts          # Supabaseクライアントのテスト

hooks/
└── __tests__/
    ├── useAuth.test.tsx          # 認証フックのテスト
    └── useLocation.test.ts       # 位置情報フックのテスト
```

### E2Eテスト

```
tests/
└── e2e/
    ├── example.spec.ts           # ホームページのテスト
    └── role-pages.spec.ts        # 役職別ページのテスト
```

## テストカバレッジ

### ユニットテスト

| ファイル | カバレッジ対象 |
|---------|--------------|
| `lib/supabase.ts` | ✅ 環境変数チェック、クライアント初期化 |
| `hooks/useAuth.tsx` | ✅ サインイン、サインアウト、状態管理 |
| `hooks/useLocation.ts` | ✅ 位置情報追跡、エラーハンドリング |

### E2Eテスト

| テストケース | カバレッジ対象 |
|------------|--------------|
| ホームページ | ✅ ページ読み込み、基本ナビゲーション |
| 逃走者ページ | ✅ ページ読み込み、レスポンシブ対応 |
| 鬼ページ | ✅ ページ読み込み、UI表示 |
| ゲームマスターページ | ✅ ページ読み込み、管理機能UI |
| パフォーマンス | ✅ ページ読み込み時間（5秒以内） |

## テスト戦略

### ユニットテスト戦略

1. **フックのテスト**
   - 各フックの正常系・異常系をテスト
   - 外部依存（Firebase、Geolocation API）をモック化
   - 状態変化を適切にテスト

2. **ライブラリのテスト**
   - 環境変数の検証
   - エラーハンドリング
   - クライアント初期化

3. **コンポーネントのテスト** (今後追加予定)
   - レンダリングテスト
   - ユーザーインタラクションテスト
   - プロパティのバリデーション

### E2Eテスト戦略

1. **ページ読み込みテスト**
   - 各ページが正常に読み込まれることを確認
   - 必須要素の表示確認

2. **レスポンシブテスト**
   - モバイルデバイスでの表示確認
   - 異なる画面サイズでの動作確認

3. **パフォーマンステスト**
   - ページ読み込み時間の計測
   - パフォーマンス基準（5秒以内）の遵守

4. **ナビゲーションテスト**
   - ページ間の遷移確認
   - URLの正確性確認

## モック化とテストデータ

### Firebaseのモック化

```typescript
vi.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
}));
```

### Geolocation APIのモック化

```typescript
const mockGeolocation = {
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  writable: true,
  value: mockGeolocation,
});
```

### 環境変数のモック化

```typescript
beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});
```

## CI/CD統合

GitHub Actionsでのテスト実行は、`.github/workflows/ci.yml`で設定されています。

プッシュやプルリクエスト時に自動的に以下が実行されます：
- 型チェック
- Lintチェック
- ユニットテスト
- E2Eテスト（Chromiumのみ）

## ベストプラクティス

### テスト作成時の注意点

1. **外部依存のモック化**
   - Firebase、Supabase、Geolocation APIなど外部サービスは必ずモック化
   - 実際のAPIコールは避ける

2. **テストの独立性**
   - 各テストケースは独立して実行可能にする
   - beforeEach/afterEachでクリーンアップを適切に実施

3. **わかりやすいテスト名**
   - "should ..." の形式でテストの内容を明確に記述
   - 日本語コメントで補足説明を追加

4. **エッジケースのカバー**
   - 正常系だけでなく異常系も必ずテスト
   - エラーハンドリングの動作確認

5. **パフォーマンス考慮**
   - テストは高速に実行できるように設計
   - 不要な待機時間を避ける

### テストの追加方法

1. **新しいユニットテストを追加する場合**

```bash
# テスト対象のファイルと同じディレクトリに__tests__フォルダを作成
mkdir -p path/to/module/__tests__

# テストファイルを作成（拡張子は.test.tsまたは.test.tsx）
touch path/to/module/__tests__/filename.test.ts
```

2. **新しいE2Eテストを追加する場合**

```bash
# tests/e2eディレクトリにテストファイルを作成（拡張子は.spec.ts）
touch tests/e2e/new-feature.spec.ts
```

## トラブルシューティング

### ユニットテストが失敗する場合

1. **モックが適切に設定されているか確認**
   - `vi.mock()`の呼び出し位置
   - モック関数の戻り値

2. **非同期処理の待機**
   - `await waitFor()`を使用
   - `act()`で状態更新をラップ

3. **環境変数の設定**
   - `beforeEach`で適切に設定されているか確認

### E2Eテストが失敗する場合

1. **開発サーバーが起動しているか確認**
   - Playwrightは自動的に起動しますが、ポートが使用中の場合は失敗します

2. **セレクタの確認**
   - ページの実装変更に合わせてセレクタを更新

3. **タイムアウトの調整**
   - 重いページの場合、タイムアウトを延長

## 今後の改善予定

- [ ] テストカバレッジの向上（目標: 80%以上）
- [ ] コンポーネントのユニットテスト追加
- [ ] ビジュアルリグレッションテストの導入
- [ ] パフォーマンステストの拡充
- [ ] アクセシビリティテストの追加
- [ ] テストレポートの自動生成
- [ ] CI/CDでのカバレッジレポート表示

## 参考資料

- [Vitest公式ドキュメント](https://vitest.dev/)
- [Playwright公式ドキュメント](https://playwright.dev/)
- [React Testing Library公式ドキュメント](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
