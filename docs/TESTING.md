# テストドキュメント

## テスト概要

Tag Supportプロジェクトでは、高品質なコードを維持するために包括的なテスト戦略を採用しています。

## テストフレームワーク

- **ユニットテスト**: Vitest + React Testing Library
- **E2Eテスト**: Playwright
- **カバレッジ**: @vitest/coverage-v8

## テスト実行方法

```bash
# ユニットテスト実行
npm test

# ユニットテスト (UI付き)
npm run test:ui

# カバレッジ付きテスト実行
npm test -- --coverage

# E2Eテスト実行
npm run test:e2e

# E2Eテスト (UI付き)
npm run test:e2e:ui

# すべてのテストを実行
npm test && npm run test:e2e
```

## テスト結果サマリー

### ユニットテスト (Vitest)

**最終更新**: 2025-11-17

- **総テスト数**: 41
- **成功**: 41 (100%)
- **失敗**: 0

#### テストファイル別内訳

| ファイル | テスト数 | 状態 |
|---------|---------|------|
| `lib/__tests__/supabase.test.ts` | 4 | ✅ |
| `hooks/__tests__/useAuth.test.tsx` | 9 | ✅ |
| `hooks/__tests__/useLocation.test.ts` | 8 | ✅ |
| `hooks/__tests__/useGame.test.tsx` | 10 | ✅ |
| `hooks/__tests__/useMissions.test.tsx` | 10 | ✅ |

### コードカバレッジ

| モジュール | カバレッジ | Branch | Functions | Lines |
|-----------|-----------|---------|-----------|-------|
| **hooks/** | **88.99%** | 74.48% | 100% | 88.99% |
| `useAuth.tsx` | 97.01% | 83.33% | 100% | 97.01% |
| `useLocation.ts` | 97.14% | 84.61% | 100% | 97.14% |
| `useGame.tsx` | 79.45% | 57.14% | 100% | 79.45% |
| `useMissions.tsx` | 90.84% | 79.48% | 100% | 90.84% |
| **lib/** | **48.64%** | 50% | 0% | 48.64% |
| `supabase.ts` | 100% | 100% | 100% | 100% |

### E2Eテスト (Playwright)

E2Eテストは以下の項目をカバーしています：

- ホームページの読み込み
- 役職別ページ（逃走者・鬼・ゲームマスター）の読み込み
- レスポンシブデザインの動作確認
- ページ間のナビゲーション
- パフォーマンス測定（5秒以内の読み込み）

## テスト戦略

### ユニットテスト

#### 1. フック (Hooks)

各カスタムフックは以下の観点でテストされています：

- **初期状態**: 正しい初期値が設定されているか
- **成功ケース**: 正常系の動作が期待通りか
- **エラーハンドリング**: エラーケースが適切に処理されるか
- **権限チェック**: 適切な権限チェックが行われているか
- **状態更新**: 状態が正しく更新されるか

#### 2. ライブラリ初期化

- **環境変数チェック**: 必要な環境変数が存在するか
- **クライアント初期化**: 正しく初期化されるか

### E2Eテスト

#### 1. ページロード

- 各役職ページが正常に読み込まれるか
- 必要な要素が表示されるか

#### 2. レスポンシブデザイン

- モバイルビューポート (375x667) で正しく表示されるか

#### 3. パフォーマンス

- ページ読み込みが5秒以内に完了するか

## テストカバレッジ目標

- **フック**: 85%以上 ✅ (現在: 88.99%)
- **ライブラリ**: 90%以上 (現在: 48.64% - firebase.tsは実際の環境でのみテスト)
- **コンポーネント**: 70%以上 (今後実装予定)

## テストのベストプラクティス

### 1. テストの命名

```typescript
// Good
it('should create a game as gamemaster', async () => { ... });

// Bad
it('test1', async () => { ... });
```

### 2. モックの使用

```typescript
// 依存関係は適切にモックする
vi.mock('../useAuth');
vi.mock('@/lib/firebase');
```

### 3. 非同期処理

```typescript
// act()とwaitFor()を適切に使用
await act(async () => {
  await result.current.startGame();
});

await waitFor(() => {
  expect(mockUpdateDoc).toHaveBeenCalled();
});
```

### 4. アサーション

```typescript
// 具体的なアサーションを使用
expect(result.current.game).toMatchObject({
  status: 'active',
  duration: 3600,
});
```

## CI/CD統合

GitHub Actionsを使用して、プルリクエスト時に自動的にテストを実行します。

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test
```

## 今後の改善計画

- [ ] コンポーネントテストの追加 (Map, GameControls, MissionManager)
- [ ] E2Eテストの拡充（実際のユーザーフローのシミュレーション）
- [ ] ビジュアルリグレッションテストの導入
- [ ] パフォーマンステストの自動化
- [ ] カバレッジレポートの自動生成とバッジ表示

## トラブルシューティング

### よくある問題

#### 1. "act(...) not configured" 警告

これは現在の環境設定によるもので、テストの動作には影響しません。

#### 2. "Multiple GoTrueClient instances" 警告

Supabaseクライアントが複数回初期化される場合に表示されますが、テストには影響しません。

### デバッグ方法

```bash
# UIモードでテストをデバッグ
npm run test:ui

# 特定のテストファイルのみ実行
npm test -- useAuth.test.tsx

# カバレッジレポートをブラウザで確認
npm test -- --coverage
# coverage/index.html を開く
```

## 参考リンク

- [Vitest公式ドキュメント](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright公式ドキュメント](https://playwright.dev/)
