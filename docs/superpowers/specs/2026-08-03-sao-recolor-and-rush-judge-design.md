# 配色刷新・RUSH突入ジャッジ演出・SR中表示 設計

正式機種名: eソードアート・オンライン アリシゼーション 夜空（会話上の略称: SAOアリシ。UI表示は「SAOアリシゼーション夜空」のまま変更しない）

## スコープ

`style.css`の配色全面刷新、`script.js`の通常時当選演出フロー変更（`bonus_result`→`rush_judge`＋新規2画面）、`sr_idle`画面への「SWORD RUSH」ラベル追加。`logic.js`・確率ロジックは変更しない（表示演出のみ）。

## ①配色刷新

`style.css`冒頭に4色をCSSカスタムプロパティとして定義し、既存の赤・ピンク・金系ハードコード色を置き換える:

```css
:root {
  --c-black: #1a1a1a;
  --c-white: #ffffff;
  --c-ruri:  #1c4b9c; /* 瑠璃色: メインアクセント（旧#e63950/#d2694a/#c9a227の置き換え先） */
  --c-mizu:  #4dc8e6; /* 水色: サブアクセント・縁取り */
}
```

**置き換え方針:**
- 旧赤系（`#e63950`, `#b5202f`, `#d2694a`）と旧金系（`#c9a227`）は、原則すべて`--c-ruri`（メイン）または`--c-mizu`（縁取り・軽いアクセント）に統一する
- 白と黒は「ペアで」使う: タイトルバー＝黒背景＋白文字、通常時モードバッジ＝白背景＋黒文字＋黒枠、RUSH中バッジ＝黒背景＋白文字＋水色枠、STARTボタン＝黒〜瑠璃色グラデーション＋水色の光彩
- 「収支」のプラス（緑`#2e9e5b`）／マイナス（赤`#d24141`）の色分けは変更しない（ユーザー確認済み）
- 「SWORD RUSH」の文字のみ例外として、指示通り専用の濃い赤（`--c-sword-red: #c0203c`）で強調表示する（②③で使用）
- 既存コードでSAO側からは未参照と確認済みの死んだCSS（`.cutin-flavor.color-red/.color-green/.color-blue/.color-rainbow`、`@keyframes rush-rainbow`、`.result-main.win`、`.result-balls`）は削除する

## ②通常時「2R」画面をRUSH突入ジャッジ演出に再構成

対象は`niR_53`／`niR_0`のみ（`boku_no_hero`＝ぼくの英雄ルートは変更なし、既存の`sword_drive_result`のまま）。

**新しい状態遷移:**

1. `runNormalSpin`でniR_53/niR_0がヒットした時点（従来通り即時に`nominal=300`/`actual=280`を加算・`game.pending`にセット）→ `rush_judge`画面へ（旧`bonus_result`を改名・再構成）
   - 表示: 「○回転で大当たり」→「図柄揃い」→「RUSH突入ジャッジ」→ボタン「運命に抗ってやる」
   - ボタン押下時に新たな抽選は行わない。スピン時点で確定していた`game.pending.outcome`を`handleRushJudge()`が読み取って開示するだけの演出
2. `handleRushJudge()`:
   - `outcome === 'niR_53'`: この時点で`game.rush`初期化・`game.mode = 'sr'`・`game.rushEntryCount++`を即時実行（ヘッダー統計もすぐ反映）→ `sword_rush_acquired`画面へ
   - `outcome === 'niR_0'`: → `rush_entry_failed`画面へ
3. `sword_rush_acquired`画面: 「SWORD RUSH」（`--c-sword-red`で強調）＋「2R 300個（＋280球）」。ボタンなし。`setTimeout`で2000ms後に自動で`sr_idle`へ遷移
4. `rush_entry_failed`画面: 「突入ならず」＋「2R 300個（＋280球）」。ボタンなし。`setTimeout`で2000ms後に自動で`backToNormal()`（`normal_idle`）へ遷移

niR_53経由でSR突入する際、従来の`rush_cutin`（SR突入カットイン）はこのルートでは経由しない（`sword_rush_acquired`画面が実質的に同じ役割を兼ねるため）。`rush_cutin`自体は他の経路（ぼくの英雄のWoU直行、SR→WoU昇格）では従来通り使用する。

## ③SR中画面

`sr_idle`（`game.mode === 'sr'`のとき）で「0連チャン中」の上に「SWORD RUSH」を`--c-sword-red`で表示する。`wou_idle`では表示しない（`sr_idle`/`wou_idle`は`buildScreen`で同じcaseを共有しているため、`game.mode`で出し分ける）。

## アーキテクチャ

- `style.css`: 冒頭に`:root`カスタムプロパティを追加、既存ルールの色指定をカスタムプロパティ参照に置換、死んだCSSを削除
- `script.js`:
  - `buildScreen`の`case 'bonus_result'`を`case 'rush_judge'`に置き換え、`case 'sword_rush_acquired'`・`case 'rush_entry_failed'`を新設
  - `handleBonusContinue`を`handleRushJudge`に置き換え（niR_53/niR_0判定＋`setTimeout`遷移）
  - `sr_idle`/`wou_idle`共有caseに`game.mode === 'sr'`条件でSWORD RUSHラベルを追加
  - `runNormalSpin`のniR_53/niR_0分岐が`setState('bonus_result')`と呼んでいた箇所を`setState('rush_judge')`に変更（ペイロード計算自体は変更なし）
