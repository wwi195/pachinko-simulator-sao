# ヘッダー・通常時画面 調整設計

## スコープ

`index.html`/`script.js`/`style.css`のヘッダー部分と通常時画面（`normal_idle`）の表示調整。RUSHリザルト画面（`rush_result`）の内訳表示は今回のスコープ外（別途指示予定）。

## 変更内容

### hrow1（回転数・モード・残り）

変更なし。

### hrow2（持ち球・投資・収支）

- 常時表示は「収支」のみに変更
- 右端に「詳細▾」トグルボタンを追加。クリックで開閉し、持ち球・投資を表示する行が下に展開される（`game.detailsExpanded`フラグで管理、初期値`false`）
- 開いているときはボタン表記が「詳細▴」になる

### hrow3（大当たり総回数・初当たり・RUSH突入）

- 「大当たり総回数」の位置は現状維持
- 現在2行に分かれている「通常時初当たり」と「RUSH突入」を1行に統合する
- RUSH突入の表示を拡張:
  - 実測突入率（現行の計算値）
  - スペック上の理論突入率「理論50%」を固定テキストで併記
  - WoU突入回数を新規追加。通常時からの直行（ぼくの英雄）とSR中からの昇格（10R_kessui_success成功／咲け花たち）の両方を合算した回数（`game.wouEntryCount`、新規カウンター）

### normal_idle画面

- 貸玉料金セレクトボックス（`spin-rate-block`）を削除。ヘッダーの「4.0円」表示（`fee-block`）も削除
- 内部的なレートは`DEFAULT_RENTAL_RATE`（4.0円）に固定したまま`consumeSpinCost`/`calcBallsPerSpin`で使用する（`logic.js`は変更なし）
- 「1万円分」ボタンの表記を「1万円分回す」に変更

## script.js変更点

- `game`に`wouEntryCount: 0`と`detailsExpanded: false`を追加（`resetGame`にも反映）
- WoU突入となる3箇所（`handleSwordDriveContinue`のboku_no_hero直行分岐、sake_hanatachi昇格分岐、`handleRushHitContinue`の10R_kessui_success昇格分岐）で`game.wouEntryCount++`
- `handleToggleDetails()`を追加：`game.detailsExpanded`を反転して`render()`
- `renderHeader`から`fee-block`更新処理を削除し、詳細行の開閉表示（`display`切り替え）とWoU突入回数の描画を追加
- 不要になった`handleRentalRateChange`・`rentalRateOptionsHtml`を削除
- `buildScreen`の`normal_idle`ケースから`spin-rate-block`を削除、ボタン文言を変更

## index.html / style.css変更点

- hrow2に詳細トグルボタンと開閉行（`display:none`をデフォルトとし、JSで切り替え）を追加
- hrow3の「通常時初当たり」「RUSH突入」を1つの行にまとめるマークアップに変更、WoU突入回数用の要素を追加
- `fee-block`要素を削除
- 上記マークアップに対応する最小限のCSSを追加（配色はlycoris版のまま、レイアウトのみ）
