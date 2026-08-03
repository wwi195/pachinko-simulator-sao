# SR中「決意の刃」ジャッジ演出 設計

## スコープ

`script.js`のSR中当選演出フローの再構成。`10R_no_kessui`（決意の刃なし・約45%）と`10R_kessui_fail`/`10R_kessui_success`/`sake_hanatachi`（決意の刃発生・約55%、`sake_hanatachi`もこの決意の刃を経由する）で表示分岐する。`logic.js`・確率ロジック・`resolveSwordDrive()`自体の抽選演出は変更しない（後日調整）。

## 状態フィールド

`runRushSpin`が`game.pending`にセットするフィールドを拡張する:
- `hasKessui: boolean` — 決意の刃が発生したか（`10R_no_kessui`と（WoU中の）`10R`は`false`、それ以外は`true`）
- `kessuiResult: 'fail' | 'success'`（`hasKessui`が`true`のときのみ）
- `leadsToSakeHanatachi: boolean`（`kessuiResult === 'success'`のときのみ。`sake_hanatachi`由来なら`true`）
- `sake_hanatachi`の場合、`nominal`/`actual`は表示用に**1500/1400固定**とし、`resolveSwordDrive(1500)`で既に計算済みの真の合計は`finalNominal`/`finalActual`として別途保持し、`sake_hanatachi_reveal`到達時まで開示しない（履歴ログにも先に1500個分だけ記録し、真の合計は最後に別途ログする）

## 画面遷移

1. `sr_hit_result`（1500ボーナス画面）: `hasKessui`が`true`なら「決意の刃発生！」を追加表示し、ボタン文言を「▶次へ」→「ジャッジ」に変更。押下時、新たな抽選はせず既に確定済みの`kessuiResult`を開示するだけ
2. ボタン押下 →
   - `hasKessui === false`: 従来通り即座に`sr_idle`/`wou_idle`へ（変更なし）
   - `kessuiResult === 'fail'`: `kessui_fail`画面「失敗」を1400ms表示 → 自動で`sr_idle`へ
   - `kessuiResult === 'success'`:  `game.mode = 'wou'`・`wouEntryCount++`をこの時点で即時実行 → `kessui_success`画面「成功！WoUへ」を1400ms表示 →
     - `leadsToSakeHanatachi === false`: 自動で`wou_idle`へ
     - `leadsToSakeHanatachi === true`: 自動で`sake_hanatachi_reveal`画面（レインボー演出のグラデーションテキストで「咲け、花たち」のみ表示）を1400ms表示 → 自動で既存の`sword_drive_result`画面へ（`finalNominal`/`finalActual`を`nominal`/`actual`として`game.pending`に再セットしてから遷移。ここで真の合計をログにも記録する）

表示時間はこの直前に調整した通常時ジャッジ演出と揃え、いずれも1400ms（2000msの30%短縮後の値）を使う。

## アーキテクチャ

- `style.css`: `.sake-hanatachi-label`（レインボーグラデーションアニメーションテキスト、以前削除した`.cutin-flavor.color-rainbow`と同じ手法を新規クラスで再実装）を追加
- `script.js`:
  - `runRushSpin`の`10R_no_kessui`/`10R_kessui_fail`/`10R_kessui_success`/`sake_hanatachi`/`10R`各分岐を上記フィールド構成に合わせて書き換え
  - `handleRushHitContinue`を拡張（`hasKessui`で分岐、新規`setTimeout`チェーンを追加）
  - `buildScreen`の`sr_hit_result`ケースに「決意の刃発生！」表示とボタン文言分岐を追加、`kessui_fail`/`kessui_success`/`sake_hanatachi_reveal`の3ケースを新設
