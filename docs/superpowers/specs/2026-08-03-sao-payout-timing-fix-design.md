# 収支反映タイミング修正 設計

## 問題

`addBalls()`（`game.mochiDama`を増減させ、ヘッダーの「収支」に直結する）が、抽選結果が内部的に確定した瞬間（スピン処理時）に呼ばれており、演出上まだ隠しているはずの金額（咲け花たち・WoU中神器解放SWORD DRIVE・ぼくの英雄のソードドライブ演出結果）まで即座に収支へ反映されてしまう。プレイヤーは演出の発表を待たずに、常時表示されているヘッダーの収支を見るだけで結果を先読みできてしまう。

`game.rush.actualBalls`/`nominalBalls`（連チャン中画面・ランキング用の内部集計）はプレイ中に画面表示されない（表示されるのは全ての演出が完了した後の`sr_idle`/`wou_idle`到達後のみ）ため、この問題の対象外。修正対象は`addBalls()`の呼び出しタイミングのみ。

## 修正方針

`addBalls()`を「実際にその金額が画面に表示される瞬間」まで遅延させる。

| 経路 | 現状 | 修正後 |
|---|---|---|
| niR_53/niR_0（300個/280球） | `runNormalSpin`でスピン時に即加算 | `handleRushJudge`（運命に抗ってやるクリック後）で加算。両ルート同額のため実害はないが統一のため合わせる |
| ぼくの英雄（ソードドライブ結果） | `runNormalSpin`でスピン時に即加算（マスクなしで直接狙え画面へ進むため完全な先読みが可能だった） | `handleSwordDriveAttack`の4回目クリック時（発表直前）に全額を加算 |
| 咲け花たち／WoU中神器解放SWORD DRIVE | `runRushSpin`でスピン時に真の合計を即加算 | スピン時はマスク表示分（1500個/1400球）のみ加算、真の合計との差分は`handleSwordDriveAttack`の4回目クリック時に追加加算 |
| 決意の刃成功/失敗・SR/WoUの通常10R（1500個/1400球） | `runRushSpin`でスピン時に即加算 | 変更なし（マスクなく画面表示と同時なので問題なし） |

## アーキテクチャ

- `runNormalSpin`: niR_53/niR_0・ぼくの英雄の両分岐から`addBalls()`呼び出しを削除
- `handleRushJudge`: 冒頭で`addBalls(actual)`を呼ぶ（niR_53/niR_0共通）
- `runRushSpin`: 共通ブロックの`addBalls(actual)`を削除し、各分岐（10R系・決意の刃系）内に個別に`addBalls(actual)`を配置。咲け花たち／sword_drive分岐では`addBalls(displayActual)`（マスク分のみ）に変更
- `handleSwordDriveAttack`: 4回クリック完了時、`game.pending.finalActual`が存在する場合（咲け花たち／sword_drive）は差分`finalActual - actual`を追加加算、存在しない場合（ぼくの英雄）は`actual`全額を加算
