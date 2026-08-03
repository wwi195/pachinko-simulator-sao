# ヘッダー・通常時画面 調整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pachinko-simulator-sao`のヘッダー表示と通常時画面を調整する（持ち球/投資の詳細タブ化、初当たり/RUSH突入の1行統合、理論突入率とWoU突入回数の追加、貸玉料金UIの削除、ボタン文言変更）。

**Architecture:** 既存の`index.html`/`script.js`/`style.css`への部分修正（`logic.js`は変更なし）。既存のマークアップ・命名規則に従う。

**Tech Stack:** Vanilla JS。ビルド不要、ブラウザで直接確認。

---

### Task 1: index.html — hrow2/hrow3のマークアップ変更

**Files:**
- Modify: `index.html:31-69`

- [ ] **Step 1: hrow2を「収支のみ＋詳細トグル」＋開閉行に変更**

`index.html`の以下のブロックを:
```html
      <div class="hrow hrow2">
        <div class="money-block">
          <span class="money-label">持ち球</span>
          <span class="money-value gold" id="mochi-dama">0</span>
          <span class="money-unit">球</span>
        </div>
        <div class="money-block">
          <span class="money-label">投資</span>
          <span class="money-value red" id="toushi-value">0</span>
          <span class="money-unit">円</span>
        </div>
        <div class="money-block">
          <span class="money-label">収支</span>
          <span class="money-value red" id="shuushi-value">0</span>
          <span class="money-unit">円</span>
        </div>
      </div>
```

以下に置き換える:
```html
      <div class="hrow hrow2">
        <div class="money-block">
          <span class="money-label">収支</span>
          <span class="money-value red" id="shuushi-value">0</span>
          <span class="money-unit">円</span>
        </div>
        <button class="btn-details-toggle" id="details-toggle" onclick="handleToggleDetails()">詳細▾</button>
      </div>

      <div class="hrow hrow2-detail" id="hrow2-detail" style="display:none;">
        <div class="money-block">
          <span class="money-label">持ち球</span>
          <span class="money-value gold" id="mochi-dama">0</span>
          <span class="money-unit">球</span>
        </div>
        <div class="money-block">
          <span class="money-label">投資</span>
          <span class="money-value red" id="toushi-value">0</span>
          <span class="money-unit">円</span>
        </div>
      </div>
```

- [ ] **Step 2: hrow3を「大当たり総回数」＋「通常時初当たり／RUSH突入を1行に統合」に変更**

以下のブロックを:
```html
      <div class="hrow hrow3">
        <div class="hrow3-header">
          <span class="hrow3-title">大当たり総回数</span>
          <span class="total-hit-block">
            <span class="total-hit-count" id="total-hit-count">0回</span>
          </span>
          <span class="fee-block" id="fee-block">4.0円</span>
        </div>
        <div class="hrow3-normal-line">
          <span class="hit-label2">通常時初当たり</span>
          <span class="hit-count" id="normal-first-hit">0回</span>
          <span class="hit-prob" id="normal-first-prob">1/―</span>
        </div>
        <div class="hrow3-stats">
          <div class="hit-item">
            <span class="hit-label2">RUSH突入</span>
            <span class="hit-count" id="rush-entry-count">0回</span>
            <span class="rush-entry" id="rush-entry-info">(突入率 0%)</span>
          </div>
        </div>
      </div>
```

以下に置き換える:
```html
      <div class="hrow hrow3">
        <div class="hrow3-header">
          <span class="hrow3-title">大当たり総回数</span>
          <span class="total-hit-block">
            <span class="total-hit-count" id="total-hit-count">0回</span>
          </span>
        </div>
        <div class="hrow3-stats">
          <div class="hit-item">
            <span class="hit-label2">通常時初当たり</span>
            <span class="hit-count" id="normal-first-hit">0回</span>
            <span class="hit-prob" id="normal-first-prob">1/―</span>
          </div>
          <div class="hit-item">
            <span class="hit-label2">RUSH突入</span>
            <span class="hit-count" id="rush-entry-count">0回</span>
            <span class="rush-entry" id="rush-entry-info">(突入率 0%)</span>
            <span class="rush-entry-theory">理論50%</span>
            <span class="hit-label2">WoU突入</span>
            <span class="hit-count" id="wou-entry-count">0回</span>
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: restructure header markup for details toggle and combined stats row"
```

---

### Task 2: style.css — 新規スタイル追加・不要スタイル削除

**Files:**
- Modify: `style.css`

- [ ] **Step 1: 不要になった `.hrow3-normal-line` と `.fee-block` を削除**

以下を:
```css
.hrow3-normal-line {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 2px;
}

.hrow3-stats {
```

以下に置き換える（`.hrow3-normal-line`ルールを削除、`.hrow3-stats`はそのまま）:
```css
.hrow3-stats {
```

続けて、以下を:
```css
.total-hit-block { display: flex; align-items: baseline; gap: 3px; }
.total-hit-count { font-size: 12px; font-weight: bold; color: #c9a227; }

.fee-block { font-size: 9px; color: #aaa; white-space: nowrap; }
```

以下に置き換える（`.fee-block`ルールを削除）:
```css
.total-hit-block { display: flex; align-items: baseline; gap: 3px; }
.total-hit-count { font-size: 12px; font-weight: bold; color: #c9a227; }
```

- [ ] **Step 2: `.rush-entry-theory` を追加**

以下を:
```css
.hit-label2 { font-size: 9px; color: #999; }
.hit-count  { font-size: 12px; font-weight: bold; color: #333; }
.hit-prob   { font-size: 9px; color: #aaa; }
.rush-entry { font-size: 9px; color: #d2694a; }
```

以下に置き換える:
```css
.hit-label2 { font-size: 9px; color: #999; }
.hit-count  { font-size: 12px; font-weight: bold; color: #333; }
.hit-prob   { font-size: 9px; color: #aaa; }
.rush-entry { font-size: 9px; color: #d2694a; }
.rush-entry-theory { font-size: 9px; color: #999; }
```

- [ ] **Step 3: `.hrow2-detail` と `.btn-details-toggle` を追加**

以下を:
```css
.hrow2 {
  justify-content: space-around;
  border-bottom: 1px solid #eee;
  padding: 5px 12px;
}
```

以下に置き換える:
```css
.hrow2 {
  justify-content: space-between;
  align-items: center;
  padding: 5px 12px;
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
```

- [ ] **Step 4: 不要になった `.spin-rate-block` / `.spin-rate-label` / `.spin-rate-select` を削除**

以下を:
```css
/* 一括回転 */
.spin-rate-block {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}
.spin-rate-label { font-size: 11px; color: #999; }
.spin-rate-select {
  background: #fff;
  color: #333;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
}

.auto-spin-btns { display: flex; gap: 12px; margin-top: 4px; }
```

以下に置き換える:
```css
/* 一括回転 */
.auto-spin-btns { display: flex; gap: 12px; margin-top: 12px; }
```

- [ ] **Step 5: Commit**

```bash
git add style.css
git commit -m "feat: add details-toggle/combined-stats styles, remove unused rental-rate CSS"
```

---

### Task 3: script.js — game状態・ハンドラの変更

**Files:**
- Modify: `script.js`

- [ ] **Step 1: `game`オブジェクトに`wouEntryCount`と`detailsExpanded`を追加**

以下を:
```js
const game = {
  state: 'normal_idle',
  mode: 'normal',
  rentalRate: DEFAULT_RENTAL_RATE,
  mochiDama: 0,
  toushi: 0,
  totalSpins: 0,
  currentSpins: 0,
  lastHitSpins: 0,
  normalHitCount: 0,
  rushEntryCount: 0,
  totalRushHits: 0,
  rushAllStats: { totalSpins: 0 },
  rush: null,
  pending: {},
  eigyoAlertShown: false,
  log: [],
};
```

以下に置き換える:
```js
const game = {
  state: 'normal_idle',
  mode: 'normal',
  rentalRate: DEFAULT_RENTAL_RATE,
  mochiDama: 0,
  toushi: 0,
  totalSpins: 0,
  currentSpins: 0,
  lastHitSpins: 0,
  normalHitCount: 0,
  rushEntryCount: 0,
  wouEntryCount: 0,
  totalRushHits: 0,
  rushAllStats: { totalSpins: 0 },
  rush: null,
  pending: {},
  eigyoAlertShown: false,
  detailsExpanded: false,
  log: [],
};
```

- [ ] **Step 2: 不要になった`handleRentalRateChange`を削除**

以下を:
```js
function handleRentalRateChange(value) {
  game.rentalRate = Number(value);
  render();
}

// ---- 通常時ハンドラ ----
```

以下に置き換える:
```js
// ---- 通常時ハンドラ ----
```

- [ ] **Step 3: `handleSwordDriveContinue`でWoU突入時に`wouEntryCount`を加算**

以下を:
```js
  if (!game.rush) {
    // boku_no_hero: 通常時からWoU直行
    game.rush = { logicState: { mode: 'wou', jitanRemaining: 70 }, totalHits: 0, nominalBalls: 0, actualBalls: 0, cycleSpins: 0 };
    game.mode = 'wou';
    game.rushEntryCount++;
    game.pending = { cutinLabel: 'WoU直行', cutinSub: 'War of Underworld' };
  } else {
    // sake_hanatachi: SRからWoUへ移行
    game.mode = 'wou';
    game.pending = { cutinLabel: 'WoU移行', cutinSub: 'War of Underworld' };
  }
```

以下に置き換える:
```js
  if (!game.rush) {
    // boku_no_hero: 通常時からWoU直行
    game.rush = { logicState: { mode: 'wou', jitanRemaining: 70 }, totalHits: 0, nominalBalls: 0, actualBalls: 0, cycleSpins: 0 };
    game.mode = 'wou';
    game.rushEntryCount++;
    game.wouEntryCount++;
    game.pending = { cutinLabel: 'WoU直行', cutinSub: 'War of Underworld' };
  } else {
    // sake_hanatachi: SRからWoUへ移行
    game.mode = 'wou';
    game.wouEntryCount++;
    game.pending = { cutinLabel: 'WoU移行', cutinSub: 'War of Underworld' };
  }
```

- [ ] **Step 4: `handleRushHitContinue`でWoU昇格時に`wouEntryCount`を加算**

以下を:
```js
function handleRushHitContinue() {
  if (game.pending.promote) {
    game.mode = 'wou';
    game.pending = { cutinLabel: 'WoU移行', cutinSub: 'War of Underworld' };
    addLog('WoU移行！', 'rush');
    setState('rush_cutin');
  } else {
    setState(game.rush.logicState.mode === 'sr' ? 'sr_idle' : 'wou_idle');
  }
}
```

以下に置き換える:
```js
function handleRushHitContinue() {
  if (game.pending.promote) {
    game.mode = 'wou';
    game.wouEntryCount++;
    game.pending = { cutinLabel: 'WoU移行', cutinSub: 'War of Underworld' };
    addLog('WoU移行！', 'rush');
    setState('rush_cutin');
  } else {
    setState(game.rush.logicState.mode === 'sr' ? 'sr_idle' : 'wou_idle');
  }
}
```

- [ ] **Step 5: `resetGame`に`wouEntryCount`・`detailsExpanded`のリセットを追加**

以下を:
```js
  game.normalHitCount = 0;
  game.rushEntryCount = 0;
  game.totalRushHits = 0;
  game.rushAllStats = { totalSpins: 0 };
  game.rush = null;
  game.pending = {};
  game.eigyoAlertShown = false;
  game.log = [];
  render();
}
```

以下に置き換える:
```js
  game.normalHitCount = 0;
  game.rushEntryCount = 0;
  game.wouEntryCount = 0;
  game.totalRushHits = 0;
  game.rushAllStats = { totalSpins: 0 };
  game.rush = null;
  game.pending = {};
  game.eigyoAlertShown = false;
  game.detailsExpanded = false;
  game.log = [];
  render();
}
```

- [ ] **Step 6: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 7: Commit**

```bash
git add script.js
git commit -m "feat: add wouEntryCount tracking and detailsExpanded state"
```

---

### Task 4: script.js — 描画・normal_idle画面の変更

**Files:**
- Modify: `script.js`

- [ ] **Step 1: `handleToggleDetails`を追加（`renderHeader`の直前に挿入）**

以下を:
```js
function renderHeader() {
```

以下に置き換える:
```js
function handleToggleDetails() {
  game.detailsExpanded = !game.detailsExpanded;
  render();
}

function renderHeader() {
```

- [ ] **Step 2: `renderHeader`から`fee-block`更新を削除し、詳細行トグルと`wou-entry-count`描画を追加**

以下を:
```js
  document.getElementById('rush-entry-count').textContent = game.rushEntryCount + '回';
  const rushEntryRate = game.normalHitCount > 0 ? Math.round(game.rushEntryCount / game.normalHitCount * 100) : 0;
  document.getElementById('rush-entry-info').textContent = `(突入率 ${rushEntryRate}%)`;

  document.getElementById('fee-block').textContent = `${game.rentalRate.toFixed(1)}円`;
}
```

以下に置き換える:
```js
  document.getElementById('rush-entry-count').textContent = game.rushEntryCount + '回';
  const rushEntryRate = game.normalHitCount > 0 ? Math.round(game.rushEntryCount / game.normalHitCount * 100) : 0;
  document.getElementById('rush-entry-info').textContent = `(突入率 ${rushEntryRate}%)`;
  document.getElementById('wou-entry-count').textContent = game.wouEntryCount + '回';

  document.getElementById('hrow2-detail').style.display = game.detailsExpanded ? 'flex' : 'none';
  document.getElementById('details-toggle').textContent = game.detailsExpanded ? '詳細▴' : '詳細▾';
}
```

- [ ] **Step 3: 不要になった`rentalRateOptionsHtml`を削除**

以下を:
```js
function rentalRateOptionsHtml() {
  return RENTAL_RATE_TABLE.map(r =>
    `<option value="${r.yenPerBall}" ${r.yenPerBall === game.rentalRate ? 'selected' : ''}>${r.yenPerBall.toFixed(1)}円${r.yenPerBall === DEFAULT_RENTAL_RATE ? '（等価）' : ''}</option>`
  ).join('');
}

function tenThousandYenSpins() {
```

以下に置き換える:
```js
function tenThousandYenSpins() {
```

- [ ] **Step 4: `normal_idle`画面から貸玉料金セレクトを削除し、ボタン文言を変更**

以下を:
```js
    case 'normal_idle':
      return `<div class="screen">
        <button class="btn-start" onclick="handleStart()">START</button>
        <p class="prob-hint">大当たり確率 ${P_NORMAL_HIT_DISPLAY}</p>
        <div class="spin-rate-block">
          <span class="spin-rate-label">貸玉料金</span>
          <select class="spin-rate-select" onchange="handleRentalRateChange(this.value)">
            ${rentalRateOptionsHtml()}
          </select>
        </div>
        <div class="auto-spin-btns">
          <div class="auto-spin-wrap">
            <button class="btn-auto" onclick="autoSpin(${tenThousandYenSpins()})">1万円分</button>
            <p class="spin-cost-hint">約${tenThousandYenSpins()}回転分</p>
          </div>
        </div>
        <button class="btn-taiten" onclick="handleTaiten()">退店する</button>
      </div>`;
```

以下に置き換える:
```js
    case 'normal_idle':
      return `<div class="screen">
        <button class="btn-start" onclick="handleStart()">START</button>
        <p class="prob-hint">大当たり確率 ${P_NORMAL_HIT_DISPLAY}</p>
        <div class="auto-spin-btns">
          <div class="auto-spin-wrap">
            <button class="btn-auto" onclick="autoSpin(${tenThousandYenSpins()})">1万円分回す</button>
            <p class="spin-cost-hint">約${tenThousandYenSpins()}回転分</p>
          </div>
        </div>
        <button class="btn-taiten" onclick="handleTaiten()">退店する</button>
      </div>`;
```

- [ ] **Step 5: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 6: Commit**

```bash
git add script.js
git commit -m "feat: wire details toggle and WoU entry count into header rendering"
```

---

### Task 5: ブラウザ動作確認

**Files:** なし（確認のみ）

- [ ] **Step 1: ローカルサーバーを起動してブラウザで確認**

```bash
cd /c/Users/ab_99/pachinko-simulator-sao && npx http-server -p 8089 -c-1 &
```

以下を確認する:
- 初期画面のhrow2に「収支」のみ表示され、「詳細▾」ボタンがある。クリックすると持ち球・投資の行が開き、ボタンが「詳細▴」になる。再クリックで閉じる
- hrow3で「通常時初当たり」と「RUSH突入」が1行に収まっている。RUSH突入の横に「理論50%」とWoU突入回数が表示される
- 通常時画面に貸玉料金の選択肢が表示されない。ヘッダーにも「4.0円」表示がない
- 「1万円分回す」ボタンの文言になっている
- Math.randomをモックしてniR_53→SR→WoU昇格の一連の流れを進め、WoU突入回数が正しく加算されることを確認（通常時からのWoU直行、SR中からの昇格の両方）
- コンソールにJSエラーが出ていないこと

- [ ] **Step 2: サーバーを停止**

```bash
kill %1
```

- [ ] **Step 3: 動作確認完了を報告**

問題があれば該当箇所を修正し、再度Step 1から確認する。
