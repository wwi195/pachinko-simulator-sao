# 配色刷新・RUSH突入ジャッジ演出・SR中表示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `style.css`の配色を白・黒・瑠璃色・水色ベースに刷新し、`script.js`の通常時「2R」当選演出を「RUSH突入ジャッジ」演出（図柄揃い→ジャッジ→運命に抗ってやるボタン→SWORD RUSH獲得／突入ならず→自動遷移）に再構成し、SR中画面に「SWORD RUSH」ラベルを追加する。

**Architecture:** `style.css`は`:root`カスタムプロパティで4色を一元管理し全ルールをそこから参照する形に書き換える（死んだCSSも削除）。`script.js`は`bonus_result`ステートを`rush_judge`に置き換え、`sword_rush_acquired`/`rush_entry_failed`の2ステートを新設、`setTimeout`による自動遷移を初めて導入する。`logic.js`・確率ロジックは変更しない。

**Tech Stack:** Vanilla JS/CSS。ビルド不要。

---

### Task 1: style.css — 配色刷新（全面書き換え）

**Files:**
- Modify: `style.css`（全体を以下の内容に置き換え）

- [ ] **Step 1: style.css全体を以下に置き換える**

```css
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

:root {
  --c-black: #1a1a1a;
  --c-white: #ffffff;
  --c-ruri:  #1c4b9c;
  --c-mizu:  #4dc8e6;
  --c-mizu-dark: #1a8fa8;
  --c-sword-red: #c0203c;
}

body {
  background: #f5f5f7;
  color: var(--c-black);
  font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif;
  max-width: 390px;
  margin: 0 auto;
  min-height: 100vh;
  overflow-x: hidden;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--c-white);
}

/* タイトル */
#title-bar {
  background: var(--c-black);
  border-bottom: 2px solid var(--c-mizu);
  text-align: center;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: bold;
  color: var(--c-white);
  letter-spacing: 1px;
}

/* ========== ヘッダー ========== */
#header {
  background: var(--c-white);
  border-bottom: 2px solid var(--c-black);
  position: sticky;
  top: 0;
  z-index: 10;
}

.hrow {
  display: flex;
  align-items: center;
  padding: 6px 12px;
}

.hrow1 {
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}

.spins-block { display: flex; align-items: baseline; gap: 2px; }
.spins-current { font-size: 20px; font-weight: bold; color: var(--c-ruri); }
.spins-total   { font-size: 16px; font-weight: bold; color: #666; }
.spins-unit    { font-size: 11px; color: #999; }
.spins-sep     { font-size: 11px; color: #aaa; margin: 0 3px; }

#mode-badge {
  font-size: 12px;
  font-weight: bold;
  padding: 5px 12px;
  border-radius: 20px;
  background: var(--c-white);
  border: 1px solid var(--c-black);
  color: var(--c-black);
  transition: all 0.3s;
}
#mode-badge.rush { background: var(--c-black); border-color: var(--c-mizu); color: var(--c-white); }

.esup-block { text-align: right; min-width: 60px; }
.esup-label { font-size: 10px; color: #999; }
.esup-value { font-size: 18px; font-weight: bold; color: var(--c-ruri); }

.hrow2 {
  justify-content: space-between;
  align-items: center;
  padding: 5px 12px;
  border-bottom: 1px solid #eee;
}

.hrow2-detail {
  justify-content: space-around;
  border-bottom: 1px solid #eee;
  padding: 5px 12px;
}

.btn-details-toggle {
  background: none;
  border: none;
  font-size: 11px;
  color: #999;
  cursor: pointer;
  padding: 4px 6px;
}

.money-block { display: flex; align-items: baseline; gap: 4px; }
.money-label { font-size: 10px; color: #999; }
.money-value { font-size: 19px; font-weight: bold; }
.money-value.gold  { color: var(--c-ruri); }
.money-value.red   { color: #d24141; }
.money-value.green { color: #2e9e5b; }
.money-unit  { font-size: 11px; color: #999; }

.hrow3 {
  flex-direction: column;
  padding: 4px 12px 6px;
  gap: 3px;
}

.hrow3-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.hrow3-title {
  font-size: 11px;
  font-weight: bold;
  color: #666;
  letter-spacing: 0.5px;
}

.hrow3-stats {
  display: flex;
  gap: 14px;
  width: 100%;
  flex-wrap: wrap;
}

.hit-item {
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex-wrap: wrap;
}

.hit-label2 { font-size: 9px; color: #999; }
.hit-count  { font-size: 12px; font-weight: bold; color: #333; }
.hit-prob   { font-size: 9px; color: #aaa; }
.rush-entry { font-size: 9px; color: var(--c-ruri); }
.rush-entry-theory { font-size: 9px; color: #999; }

.total-hit-block { display: flex; align-items: baseline; gap: 3px; }
.total-hit-count { font-size: 12px; font-weight: bold; color: var(--c-ruri); }

/* ========== メイン画面 ========== */
#main-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 20px;
  min-height: 380px;
}

.screen {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* STARTボタン */
.btn-start {
  width: 148px;
  height: 148px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, var(--c-mizu), var(--c-ruri));
  border: 5px solid var(--c-black);
  font-size: 26px;
  font-weight: bold;
  color: var(--c-white);
  letter-spacing: 2px;
  cursor: pointer;
  box-shadow: 0 0 24px rgba(28,75,156,0.3), 0 4px 12px rgba(0,0,0,0.12);
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn-start:active { transform: scale(0.94); }

/* アクションボタン */
.btn-action {
  width: 100%;
  max-width: 300px;
  padding: 15px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--c-ruri), var(--c-black));
  border: 2px solid var(--c-mizu);
  font-size: 17px;
  font-weight: bold;
  color: var(--c-white);
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: opacity 0.1s, transform 0.1s;
}
.btn-action:active { opacity: 0.8; transform: scale(0.97); }

/* サブボタン */
.btn-sub {
  font-size: 14px;
  color: #666;
  background: none;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 8px 20px;
  cursor: pointer;
}
.btn-sub:active { opacity: 0.7; }

/* 確率表示 */
.prob-hint { font-size: 11px; color: #999; }

/* 結果テキスト */
.result-main {
  font-size: 34px;
  font-weight: bold;
  letter-spacing: 2px;
}
.result-main.lose   { color: #aaa; }

.result-sub   { font-size: 14px; color: #999; }

/* RUSHジャッジ */
.judge-label {
  font-size: 15px;
  font-weight: bold;
  color: var(--c-ruri);
  letter-spacing: 1px;
  margin-top: 6px;
}

/* SWORD RUSH演出テキスト（例外的にかっこいい赤） */
.sword-rush-label {
  font-size: 26px;
  font-weight: bold;
  letter-spacing: 2px;
  color: var(--c-sword-red);
  text-shadow: 0 2px 6px rgba(192,32,60,0.35);
}

/* LT(RUSH) */
.rush-title {
  font-size: 22px;
  font-weight: bold;
  letter-spacing: 1px;
  line-height: 1.3;
  text-align: center;
  color: var(--c-ruri);
}

.cutin-flavor {
  font-size: 15px;
  font-weight: bold;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.rush-sub { font-size: 16px; color: #666; }
.rush-sub span { font-size: 32px; font-weight: bold; color: var(--c-ruri); }

.chain-label {
  font-size: 15px;
  font-weight: bold;
  color: var(--c-ruri);
  letter-spacing: 1px;
}

/* 振り分けボックス */
.vibun-box {
  width: 100%;
  max-width: 300px;
  background: #fbfbfc;
  border-radius: 12px;
  border: 2px solid #eee;
  padding: 18px;
  text-align: center;
}
.vibun-box.rush-box   { border-color: var(--c-ruri); background: #eef5fc; }

.bonus-main {
  font-size: 22px;
  font-weight: bold;
  letter-spacing: 1px;
  line-height: 1.2;
}
.bonus-main.premium  { color: var(--c-ruri); }
.bonus-main.standard { color: var(--c-ruri); }

.bonus-sub { font-size: 13px; color: #888; margin-top: 5px; }

/* 一括回転 */
.auto-spin-btns { display: flex; gap: 12px; margin-top: 12px; }

.btn-auto {
  flex: 1;
  padding: 12px 0;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #ccc;
  font-size: 15px;
  font-weight: bold;
  color: #333;
  cursor: pointer;
  transition: background 0.1s, transform 0.1s;
  max-width: 200px;
}
.btn-auto:active { background: #f2f2f2; transform: scale(0.96); }

.auto-spin-wrap  { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.spin-cost-hint  { font-size: 9px; color: #aaa; }

.btn-taiten {
  font-size: 12px;
  color: #999;
  background: none;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 6px 18px;
  cursor: pointer;
  margin-top: 4px;
}
.btn-taiten:active { opacity: 0.7; }

/* RUSH中の3種回転ボタン */
.rush-spin-btns {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  width: 100%;
  max-width: 320px;
}
.btn-rush-spin {
  flex: 1;
  padding: 10px 0;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #ccc;
  font-size: 13px;
  font-weight: bold;
  color: #333;
  cursor: pointer;
  transition: background 0.1s, transform 0.1s;
}
.btn-rush-spin:active { background: #f2f2f2; transform: scale(0.96); }
.btn-rush-spin.skip {
  background: linear-gradient(135deg, var(--c-ruri), var(--c-black));
  border-color: var(--c-mizu);
  color: var(--c-white);
}
.btn-rush-spin:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.btn-rush-spin.skip:disabled {
  background: #eee;
  border-color: #ddd;
  color: #aaa;
}

/* ========== リザルト ========== */
.rush-result-title {
  font-size: 20px;
  font-weight: bold;
  color: var(--c-ruri);
  letter-spacing: 2px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
  width: 100%;
  max-width: 300px;
  text-align: center;
}

.rush-result-box {
  width: 100%;
  max-width: 300px;
  background: #fbfbfc;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 14px 16px;
}

.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
}
.result-row.highlight { background: rgba(28,75,156,0.08); border-radius: 6px; padding: 6px 4px; }

.rr-label { font-size: 13px; color: #888; }
.rr-val   { font-size: 15px; font-weight: bold; color: #333; }
.rr-val.gold { color: var(--c-ruri); font-size: 18px; }

.result-hr { border: none; border-top: 1px solid #eee; margin: 8px 0; }

.rr-section {
  font-size: 10px;
  color: #999;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

/* ========== 通算RUSH成績 ========== */
#rush-stats-bar {
  background: #fafafa;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  padding: 5px 12px;
  flex-shrink: 0;
}
.rsb-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 3px;
}
.rsb-title {
  font-size: 10px;
  font-weight: bold;
  color: var(--c-ruri);
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.rsb-item { display: flex; align-items: baseline; gap: 3px; }
.rsb-label { font-size: 9px; color: #999; }
.rsb-val   { font-size: 12px; font-weight: bold; color: #333; }
.rsb-prob  { font-size: 9px; color: #999; }

/* ========== ログ ========== */
#log-area {
  background: #fafafa;
  border-top: 1px solid #eee;
  max-height: 140px;
  overflow-y: auto;
  flex-shrink: 0;
}
#log-title { font-size: 10px; color: #aaa; padding: 5px 12px 2px; letter-spacing: 1px; }
.log-item {
  font-size: 12px;
  padding: 4px 12px;
  border-bottom: 1px solid #f0f0f0;
  color: #888;
}
.log-item.win   { color: var(--c-ruri); }
.log-item.rush  { color: var(--c-mizu-dark); }
```

- [ ] **Step 2: 削除確認**

以下のセレクタが新しいstyle.cssに存在しないことを確認する（SAO側からは未参照と確認済みの死んだCSSのため削除）:
`.btn-start.rush-btn`, `.result-main.win`, `.result-balls`, `.cutin-flavor.color-red`, `.cutin-flavor.color-green`, `.cutin-flavor.color-blue`, `.cutin-flavor.color-rainbow`, `@keyframes rush-rainbow`, `.spin-rate-block`, `.spin-rate-label`, `.spin-rate-select`, `.fee-block`, `.hrow3-normal-line`

Run: `grep -c "rush-btn\|result-main.win\|result-balls\|color-red\|color-green\|color-blue\|color-rainbow\|rush-rainbow" style.css`
Expected: `0`

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: recolor UI to white/black/ruri/mizu palette, remove dead CSS"
```

---

### Task 2: script.js — RUSH突入ジャッジ演出・SR中ラベル

**Files:**
- Modify: `script.js`

- [ ] **Step 1: `runNormalSpin`のniR_53/niR_0分岐の遷移先を`rush_judge`に変更**

以下を:
```js
  if (outcome === 'niR_53' || outcome === 'niR_0') {
    const nominal = 300;
    const actual = toActualBalls(nominal);
    addBalls(actual);
    game.pending = { outcome, nominal, actual, interval };
    addLog(`${interval}回転で大当たり！ 2R ＋${actual}球`, 'win');
    setState('bonus_result');
    return true;
  }
```

以下に置き換える:
```js
  if (outcome === 'niR_53' || outcome === 'niR_0') {
    const nominal = 300;
    const actual = toActualBalls(nominal);
    addBalls(actual);
    game.pending = { outcome, nominal, actual, interval };
    addLog(`${interval}回転で大当たり！ 2R ＋${actual}球`, 'win');
    setState('rush_judge');
    return true;
  }
```

- [ ] **Step 2: `handleBonusContinue`を`handleRushJudge`に置き換え**

以下を:
```js
function handleBonusContinue() {
  if (game.pending.outcome === 'niR_53') {
    game.rush = { logicState: { mode: 'sr', jitanRemaining: 53 }, totalHits: 0, nominalBalls: 0, actualBalls: 0, cycleSpins: 0 };
    game.mode = 'sr';
    game.rushEntryCount++;
    game.pending = { cutinLabel: 'SR突入', cutinSub: 'SWORD RUSH' };
    addLog('SR突入！', 'rush');
    setState('rush_cutin');
  } else {
    backToNormal();
  }
}
```

以下に置き換える:
```js
function handleRushJudge() {
  const { outcome, nominal, actual } = game.pending;
  if (outcome === 'niR_53') {
    game.rush = { logicState: { mode: 'sr', jitanRemaining: 53 }, totalHits: 0, nominalBalls: 0, actualBalls: 0, cycleSpins: 0 };
    game.mode = 'sr';
    game.rushEntryCount++;
    game.pending = { nominal, actual };
    addLog('SWORD RUSH獲得！', 'rush');
    setState('sword_rush_acquired');
    setTimeout(() => setState('sr_idle'), 2000);
  } else {
    game.pending = { nominal, actual };
    addLog('突入ならず');
    setState('rush_entry_failed');
    setTimeout(() => backToNormal(), 2000);
  }
}
```

- [ ] **Step 3: `buildScreen`の`case 'bonus_result'`を`case 'rush_judge'`に置き換え、`sword_rush_acquired`/`rush_entry_failed`を新設**

以下を:
```js
    case 'bonus_result': {
      const { nominal, actual, interval } = game.pending;
      return `<div class="screen">
        <p class="result-sub">${interval}回転で大当たり</p>
        <div class="vibun-box">
          <p class="bonus-main standard">2R</p>
          <p class="bonus-sub">${nominal}個（＋${actual}球獲得）</p>
        </div>
        <button class="btn-action" onclick="handleBonusContinue()">▶ 次へ</button>
      </div>`;
    }
```

以下に置き換える:
```js
    case 'rush_judge': {
      const { interval } = game.pending;
      return `<div class="screen">
        <p class="result-sub">${interval}回転で大当たり</p>
        <div class="vibun-box">
          <p class="bonus-main standard">図柄揃い</p>
          <p class="judge-label">RUSH突入ジャッジ</p>
        </div>
        <button class="btn-action" onclick="handleRushJudge()">運命に抗ってやる</button>
      </div>`;
    }

    case 'sword_rush_acquired': {
      const { nominal, actual } = game.pending;
      return `<div class="screen">
        <p class="sword-rush-label">SWORD RUSH</p>
        <p class="bonus-sub">2R ${nominal}個（＋${actual}球）</p>
      </div>`;
    }

    case 'rush_entry_failed': {
      const { nominal, actual } = game.pending;
      return `<div class="screen">
        <p class="result-main lose">突入ならず</p>
        <p class="bonus-sub">2R ${nominal}個（＋${actual}球）</p>
      </div>`;
    }
```

- [ ] **Step 4: `rush_cutin`ケースの`rush-title`インライン色指定を削除（CSSの`.rush-title`が新色を適用するため）**

以下を:
```js
        <p class="rush-title" style="color:#c9a227;">${cutinSub}</p>
```

以下に置き換える:
```js
        <p class="rush-title">${cutinSub}</p>
```

- [ ] **Step 5: `sr_idle`/`wou_idle`共有caseに`game.mode === 'sr'`のときだけ「SWORD RUSH」ラベルを追加**

以下を:
```js
    case 'sr_idle':
    case 'wou_idle': {
      const skipDisabled = game.rush.logicState.jitanRemaining <= 10;
      return `<div class="screen">
        <p class="chain-label">${game.rush.totalHits}連チャン中</p>
```

以下に置き換える:
```js
    case 'sr_idle':
    case 'wou_idle': {
      const skipDisabled = game.rush.logicState.jitanRemaining <= 10;
      const swordRushLabel = game.mode === 'sr' ? '<p class="sword-rush-label">SWORD RUSH</p>' : '';
      return `<div class="screen">
        ${swordRushLabel}
        <p class="chain-label">${game.rush.totalHits}連チャン中</p>
```

- [ ] **Step 6: `sr_miss`/`wou_miss`と`eigyo_alert`のインライン旧色指定を新色に変更**

以下を:
```js
    case 'sr_miss':
    case 'wou_miss':
      return `<div class="screen">
        <p class="result-main lose">外れ</p>
        <p style="color:#d2694a; font-size:18px; margin-top:4px;">残り ${game.rush.logicState.jitanRemaining}回</p>
        <button class="btn-sub" onclick="handleRushMissContinue()" style="margin-top:12px;">続ける</button>
      </div>`;
```

以下に置き換える:
```js
    case 'sr_miss':
    case 'wou_miss':
      return `<div class="screen">
        <p class="result-main lose">外れ</p>
        <p style="color:var(--c-ruri); font-size:18px; margin-top:4px;">残り ${game.rush.logicState.jitanRemaining}回</p>
        <button class="btn-sub" onclick="handleRushMissContinue()" style="margin-top:12px;">続ける</button>
      </div>`;
```

続けて、以下を:
```js
    case 'eigyo_alert':
      return `<div class="screen">
        <p style="font-size:22px; font-weight:bold; color:#c9a227; text-align:center; line-height:1.6;">
          営業時間終了になりました
        </p>
```

以下に置き換える:
```js
    case 'eigyo_alert':
      return `<div class="screen">
        <p style="font-size:22px; font-weight:bold; color:var(--c-ruri); text-align:center; line-height:1.6;">
          営業時間終了になりました
        </p>
```

- [ ] **Step 7: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 8: Commit**

```bash
git add script.js
git commit -m "feat: add RUSH judge screen flow and SWORD RUSH label in SR"
```

---

### Task 3: ブラウザ動作確認

**Files:** なし（確認のみ）

- [ ] **Step 1: ローカルサーバーを起動してブラウザで確認**

```bash
cd /c/Users/ab_99/pachinko-simulator-sao && npx http-server -p 8089 -c-1 &
```

Math.randomをモックしてniR_53とniR_0の両方を発生させ、以下を確認する:
- 全体の配色が白・黒・瑠璃色・水色ベースになっている（旧赤・ピンク・金色が残っていない）
- 収支のプラス（緑）・マイナス（赤）の色分けは維持されている
- 通常時当選で「図柄揃い」→「RUSH突入ジャッジ」→「運命に抗ってやる」ボタンの画面が出る
- ボタン押下でniR_53なら「SWORD RUSH」（赤・目立つ）＋「2R 300個（＋280球）」画面が2秒表示され、自動でSR中画面（`sr_idle`）に遷移する
- niR_0なら「突入ならず」＋「2R 300個（＋280球）」画面が2秒表示され、自動で通常時画面に遷移する
- SR中画面で「0連チャン中」の上に「SWORD RUSH」がかっこいい赤で表示されている（WoU中画面には表示されない）
- コンソールにJSエラーが出ていないこと

- [ ] **Step 2: サーバーを停止**

```bash
kill %1
```

- [ ] **Step 3: 動作確認完了を報告**

問題があれば該当箇所を修正し、再度Step 1から確認する。
