# UIデザイン思想

## Material Design 3準拠のUIシステム

### カスタムCSS変数（globals.css）

```css
/* Elevation Shadows */
--shadow-1 ～ --shadow-6

/* Color System */
--md-primary, --md-success, --md-error, --md-warning
--md-surface, --md-outline

/* 8dp Grid */
--spacing-1 ～ --spacing-6
```

### 主要コンポーネントクラス

#### カード

- `card-mobile`: 基本カード（elevation-2）
- `card-elevated`: 強調カード（elevation-4）

#### ボタン

- `btn-primary`: 青（主要アクション）
- `btn-success`: 緑（開始/成功）
- `btn-danger`: 赤（終了/削除）
- `btn-warning`: オレンジ（一時停止/注意）
- `btn-secondary`: アウトライン型（副次的）

#### フォーム

- `input-touch`: 48px最小高、2pxボーダー、フォーカス時にシャドウ

#### ユーティリティ

- `elevation-1` ～ `elevation-6`: シャドウレベル
- `haptic-light/medium/heavy`: タッチフィードバック

### 実装時の注意点

- スペーシング: `p-4`, `gap-3`, `space-y-3`を基本とする
- グラデーション背景で視覚的階層を表現
- アイコンは各セクションでグラデーション円形背景を使用
- アクセシビリティ: `prefers-reduced-motion`, `prefers-contrast`に対応済み
