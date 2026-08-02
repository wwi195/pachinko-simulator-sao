# SAOアリシゼーション夜空 UI設計

## スコープ

`index.html` / `script.js` / `style.css` を、`pachinko-simulator-lycoris`と同一のアーキテクチャ・UIシェルを踏襲して作成する。確率ロジックは既存の`logic.js`（実装済み・35テスト済み）をそのまま利用する。配色はlycoris版の`style.css`をそのまま流用し、後日ユーザーが微調整する。

## アーキテクチャ

lycoris版と同じ「`game`オブジェクト＋`state`文字列で`buildScreen(state)`が画面HTMLを組み立てる」単一ページ構成。`index.html`は`logic.js`→`script.js`の順で読み込む2スクリプト構成。

**`game`オブジェクトの主要フィールド**（lycoris版`game`を土台に、SAOの3モードに合わせて調整）:
- `state`: 現在の画面状態
- `mode`: `'normal' | 'sr' | 'wou'`
- `rentalRate`: 選択中の貸玉レート（`RENTAL_RATE_TABLE`の`yenPerBall`、デフォルト`DEFAULT_RENTAL_RATE`）
- `mochiDama`, `toushi`, `totalSpins`, `currentSpins`, `lastHitSpins`
- `normalHitCount`: 通常時初当たり回数（niR_53 + niR_0 + boku_no_hero）
- `rushEntryCount`: RUSH（SR or WoU直行）突入回数
- `totalRushHits`: RUSH中（SR+WoU通算）の大当たり回数
- `rushAllStats.totalSpins`: RUSH中（SR+WoU通算）の総回転数
- `rush`: RUSH中のみ非null。`{ logicState: {mode, jitanRemaining}, totalHits, nominalBalls, actualBalls, cycleSpins }`。`logicState`は`logic.js`の`applySpin`にそのまま渡す最小状態、それ以外のフィールド（累計獲得・連チャン数）はscript.js側でロールごとに加算する
  - ※ghoul/lycoris版は累計統計を`logic.js`のstate自体に持たせていたが、SAOの`logic.js`は既に確率遷移のみのミニマルな状態で実装・テスト済みのため、累計はscript.js側（UIセッションの関心事）で管理する方針とする
- `pending`: 画面間で受け渡す一時データ（当選内容・払出など）
- `log`: 履歴

## 画面状態（state）とロジック層のマッピング

| state | 遷移元 | 表示内容 |
|---|---|---|
| `normal_idle` | 初期/継続 | STARTボタン、確率1/199.9、貸玉レート選択、1万円分ボタン、退店 |
| `bonus_result` | `spinNormal`→niR_53 / niR_0 | 300個（+280球）表示 |
| `lose_result` | `spinNormal`→miss | ハズレ表示 |
| `rush_cutin` | niR_53（SR突入）/ boku_no_hero（WoU直行） | RUSH突入演出。突入元でタイトル出し分け |
| `sr_idle` | SR継続中 | ST残り・連チャン数、1回転/10回転/スキップ、確率1/51.6 |
| `wou_idle` | WoU継続中 | 同上（WoU向け表示） |
| `sr_hit_result` | `spinSr`→10R_no_kessui / 10R_kessui_fail / 10R_kessui_success | 1500個（+1400球） |
| `sword_drive_result` | boku_no_hero / sake_hanatachi / sword_drive | `resolveSwordDrive()`の最終結果を一括表示（1,500〜9,000個+α） |
| `sr_miss` | `spinSr`→miss（ST残りあり） | ハズレ、ST残り表示 |
| `wou_miss` | `spinWou`→miss（ST残りあり） | 同上 |
| `rush_result` | SR/WoU miss でjitanRemaining=0（`applySpin`の新stateがmode='normal'） | RUSH終了リザルト（SR+WoU通算の連チャン数・獲得出玉・内訳） |
| `eigyo_alert` / `taiten_result` | 既存条件（2000回転到達／退店） | lycoris版と同一 |

`sr_hit_result` / `wou_idle`の「10R」当選時も同じ`sr_hit_result`相当の表示を再利用する（WoU中の`10R`アウトカムも1500/1400なので共通コンポーネント化）。

## 貸玉レート選択UI

lycoris/ghoul版の`SPIN_RATE_OPTIONS`（回転数を直接選択）と異なり、SAOの`logic.js`は`RENTAL_RATE_TABLE`（円/球を選ぶとテーブルから回転数が決まる）という設計。セレクトボックスは「4.0円（等価）」のように円/球の選択肢を並べ、選択値で`calcBallsPerSpin(rate)`を呼んで1回転の消費球数を算出する。

## スタイル

`pachinko-simulator-lycoris/style.css`をそのままコピーして流用する。配色（色合い）は今回のタスク範囲外とし、後日ユーザーが調整する。
