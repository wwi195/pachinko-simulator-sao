# SWORD DRIVE「狙え」演出 設計

## スコープ

`script.js`の`resolveSwordDrive()`到達後の演出を、既存の`sword_drive_result`（金額を一括表示するだけの画面）から、「SWORD DRIVEを狙え」ボタン4回クリック→数字発表演出に置き換える。対象は3経路すべて（ぼくの英雄／咲け花たち／WoU中の神器解放SWORD DRIVE、40%）。`logic.js`・`resolveSwordDrive()`自体は変更しない。

## ルートA/Bの扱い

`resolveSwordDrive()`の戻り値だけからはルートA（保留4個消化）かルートB（2.5%、専用モード直行）かを判別できない（どちらも`precedingBonus + 1500×k`の形になり得るため）。今回は**的中数の内訳（◯/4）を一切表示せず**、4回クリック後に真の合計金額だけを発表する設計にすることで、この判別不能性を実質的に回避する（「何回当たったか」を主張しないので、ルートBでも矛盾なく成立する）。

## 新しい画面遷移

1. `sword_drive_intro`: 白背景の画面に「SWORD DRIVEを狙え」ボタンがゆっくりフェードインで表示。クリックごとに`game.swordDriveClicks`をインクリメントし、4回未満なら同画面のまま（クリック回数の簡易表示のみ、的中/ハズレのフィードバックは出さない）。4回に達したら`sword_drive_reveal`へ
2. `sword_drive_reveal`: 「SWORD DRIVE」の派手なタイトル＋元の当選内容（ぼくの英雄／咲け花たち／神器解放SWORD DRIVE）を小さく表示＋合計金額を千の位→残り3桁の順に少し間を置いて発表（CSSアニメーション）。「▶次へ」ボタンで`wou_idle`へ

## 3経路の接続変更

- **ぼくの英雄**（`runNormalSpin`）: 現在`resolveSwordDrive(1500)`計算後に`sword_drive_result`へ遷移している箇所を、WoU突入セットアップ（`game.rush`作成・`game.mode='wou'`・`rushEntryCount++`・`wouEntryCount++`、既存のhandleSwordDriveContinueが行っていたのと同じ値）をこの時点で即時実行した上で`sword_drive_intro`へ変更する。「WoU直行！」の告知画面は挟まない（SWORD DRIVE演出自体が告知を兼ねる、ユーザー確認済み）
- **咲け花たち**（`handleRushHitContinue`のネストしたコールバック）: 真の金額を`game.pending`にセットした後の遷移先を`sword_drive_result`→`sword_drive_intro`に変更（WoU突入セットアップは既にkessui成功時点で完了済みなので変更不要）
- **WoU中神器解放SWORD DRIVE**（`runRushSpin`）: `hasKessui:false`に加えて`leadsToSwordDrive:true`をpendingに追加。「1500ボーナス」画面（`sr_hit_result`、決意の刃なし表示）を経由後、`handleRushHitContinue`の`!hasKessui`分岐で`leadsToSwordDrive`を見て`sword_drive_intro`へ分岐する（それ以外は従来通り即座に`sr_idle`/`wou_idle`へ）

## 削除する死んだコード

上記3経路すべてが`sword_drive_result`を経由しなくなるため、以下は完全に不要になり削除する:
- `buildScreen`の`case 'sword_drive_result'`と`case 'rush_cutin'`
- `handleSwordDriveContinue`関数、`handleRushCutinContinue`関数

`SWORD_DRIVE_LABELS`は`runRushSpin`のログメッセージおよび`sword_drive_reveal`画面の小見出しで引き続き使用するため残す。

## アーキテクチャ

- `game`に`swordDriveClicks: 0`を追加（`resetGame`にも反映）
- `handleSwordDriveAttack()`: クリックごとに`swordDriveClicks`をインクリメントし、4回未満なら`render()`のみ、4回で`sword_drive_reveal`へ
- `handleSwordDriveRevealContinue()`: `swordDriveClicks`をリセットし`sword_drive_intro`はもう出ないので特に他状態リセット不要、`setState('wou_idle')`
- `style.css`: `.sword-drive-attack-btn`（ゆっくりフェードイン）、`.sword-drive-title`、`.sword-drive-amount`（千の位→残り桁が順にフェードイン、`animation-delay`で段階演出）を追加
