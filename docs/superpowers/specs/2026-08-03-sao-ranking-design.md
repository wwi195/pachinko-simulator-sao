# RUSH獲得出玉ランキング 設計

## スコープ

`pachinko-simulator-kinniku`のランキング機能（2026-07-26版：RUSH終了時の獲得出玉＋連チャン数を記録する方式）を、SAOの画面構造に合わせて移植する。`logic.js`は変更しない。

## 記録内容

RUSH終了（`runRushSpin`で`newLogicState.mode === 'normal'`となり`rush_result`へ遷移する瞬間）に、以下をエントリとして記録する:

- `balls`: `Math.round(game.rush.actualBalls)`（実獲得球数。エントリー時初当たり分を含む既存の累計値をそのまま使う）
- `renchan`: `game.rush.totalHits`（連チャン数）
- `date`: `YYYY/M/D`形式

新しいエントリを追加後、`balls`降順でソートし、上位10件のみを保持してlocalStorage（キー`saoRankingV1`）に保存する。キン肉マン版と異なり、SAOには「闇パチ」に相当する除外対象の状態がないため、除外条件は設けない。

## 表示

1. **`rush_result`画面**: RUSH終了時、連チャン数・TOTAL・獲得出玉の下に「🏆 最高出玉ランキング」セクションを追加。今回のRUSHがランクインした場合は「ランクイン！」の表示＋該当エントリを金色でハイライトする（キン肉マン版の`renderRankingList(list, highlightEntry)`と同じ考え方）
2. **`normal_idle`画面**: 「退店する」ボタンの隣に「🏆 ランキング」ボタンを追加。押すと新設の`ranking_view`画面（ハイライトなしの同じランキング一覧＋「戻る」ボタン）に遷移し、いつでも閲覧できる

## アーキテクチャ

- `script.js`にランキング用の純粋関数群を追加: `loadRanking()` / `saveRanking(list)` / `recordRanking(balls, renchan)`（`{list, entry, madeList}`を返す）/ `renderRankingList(list, highlightEntry)`
- `runRushSpin`のRUSH終了分岐で`recordRanking`を呼び出し、結果を`game.lastRankResult`（新規フィールド）に保存してから`setState('rush_result')`する
- `buildScreen`の`rush_result`ケースに`game.lastRankResult`を使ったランキング表示を追加
- `buildScreen`に`ranking_view`ケースを新設（`loadRanking()`をそのまま表示、ハイライトなし）
- `normal_idle`ケースに「🏆 ランキング」ボタンを追加、`handleShowRanking()`（`setState('ranking_view')`）と`handleRankingBack()`（`setState('normal_idle')`）を新設
