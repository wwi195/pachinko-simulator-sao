# SAOアリシゼーション夜空 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pachinko-simulator-sao`に、`pachinko-simulator-lycoris`と同一アーキテクチャの`index.html`/`script.js`/`style.css`を追加し、既存の`logic.js`（35テスト済み）を使ってブラウザで遊べる状態にする。

**Architecture:** lycoris版と同じ「`game`オブジェクト＋`state`文字列で`buildScreen(state)`がHTMLを組み立てる」単一ページ構成。SR/WoUの2段階RUSHはUI側の`game.rush`ラッパー（`{ logicState, totalHits, nominalBalls, actualBalls, cycleSpins }`）が`logic.js`の`applySpin`を呼びながら通算する。配色はlycoris版`style.css`をそのまま流用。

**Tech Stack:** Vanilla JS（ビルドツールなし）、ブラウザで直接開くだけで動作。

---

### Task 1: style.css をlycoris版から流用

**Files:**
- Create: `style.css`（`pachinko-simulator-lycoris/style.css`のコピー）

- [ ] **Step 1: コピー**

```bash
cp /c/Users/ab_99/pachinko-simulator-lycoris/style.css /c/Users/ab_99/pachinko-simulator-sao/style.css
```

- [ ] **Step 2: 行数が一致することを確認**

Run: `wc -l style.css`
Expected: `464 style.css`（lycoris版と同じ行数）

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "chore: copy style.css from lycoris simulator (colors to be tuned later)"
```

---

### Task 2: index.html

**Files:**
- Create: `index.html`

- [ ] **Step 1: 作成**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>パチンコシミュレーター（SAOアリシゼーション夜空）</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">

    <div id="title-bar">パチンコ　SAOアリシゼーション夜空</div>

    <div id="header">

      <div class="hrow hrow1">
        <div class="spins-block">
          <span class="spins-current" id="current-spins">0</span>
          <span class="spins-unit">回</span>
          <span class="spins-sep">／累計</span>
          <span class="spins-total" id="total-spins-disp">0</span>
          <span class="spins-unit">回</span>
        </div>
        <div id="mode-badge">通常時</div>
        <div class="esup-block">
          <div class="esup-label">残り</div>
          <div class="esup-value" id="rush-count">－</div>
        </div>
      </div>

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

    </div><!-- /header -->

    <div id="main-screen"></div>

    <div id="rush-stats-bar">
      <div class="rsb-header">
        <span class="rsb-title">通算RUSH成績</span>
        <span class="rsb-item">
          <span class="rsb-label">大当たり</span>
          <span class="rsb-val" id="rs-chain">0回</span>
          <span class="rsb-prob" id="rs-prob">1/―</span>
        </span>
        <span class="rsb-item">
          <span class="rsb-label">総回転</span>
          <span class="rsb-val" id="rs-spins">0回</span>
        </span>
      </div>
    </div>

    <div id="log-area">
      <div id="log-title">履歴</div>
      <div id="log-list"></div>
    </div>

  </div>
  <script src="logic.js"></script>
  <script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add index.html shell adapted from lycoris simulator"
```

---

### Task 3: script.js — ゲーム状態・通常時フロー

**Files:**
- Create: `script.js`

- [ ] **Step 1: game状態と球数・投資まわりのヘルパーを作成**

```js
'use strict';

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

function addLog(text, type = '') {
  game.log.unshift({ text, type });
  if (game.log.length > 50) game.log.pop();
  renderLog();
}

// ---- 球数・投資 ----

function consumeSpinCost() {
  const cost = calcBallsPerSpin(game.rentalRate);
  if (game.mochiDama >= cost) {
    game.mochiDama -= cost;
  } else {
    const shortfall = cost - game.mochiDama;
    const perThousand = 1000 / game.rentalRate;
    game.mochiDama = 0;
    const units = Math.ceil(shortfall / perThousand);
    game.toushi += units * 1000;
    game.mochiDama = units * perThousand - shortfall;
  }
}

function addBalls(n) {
  game.mochiDama += n;
}

function handleRentalRateChange(value) {
  game.rentalRate = Number(value);
  render();
}
```

- [ ] **Step 2: 通常時ハンドラを追加**

```js
// ---- 通常時ハンドラ ----

function checkEigyoAlert() {
  if (!game.eigyoAlertShown && game.totalSpins >= 2000) {
    game.eigyoAlertShown = true;
    setState('eigyo_alert');
    return true;
  }
  return false;
}

// 1回転処理。演出発生など画面遷移が起きたら true を返す
function runNormalSpin() {
  game.totalSpins++;
  game.currentSpins++;
  consumeSpinCost();
  const outcome = spinNormal();

  if (outcome === 'miss') return false;

  game.normalHitCount++;
  const interval = game.totalSpins - game.lastHitSpins;
  game.currentSpins = 0;
  game.lastHitSpins = game.totalSpins;

  if (outcome === 'niR_53' || outcome === 'niR_0') {
    const nominal = 300;
    const actual = toActualBalls(nominal);
    addBalls(actual);
    game.pending = { outcome, nominal, actual, interval };
    addLog(`${interval}回転で大当たり！ 2R ＋${actual}球`, 'win');
    setState('bonus_result');
    return true;
  }

  // boku_no_hero: WoU直行（ソードドライブ演出、先付け1500）
  const nominal = resolveSwordDrive(1500);
  const actual = toActualBalls(nominal);
  addBalls(actual);
  game.pending = { outcome: 'boku_no_hero', nominal, actual, interval, promote: true };
  addLog(`${interval}回転で大当たり！ ぼくの英雄 ＋${actual}球`, 'win');
  setState('sword_drive_result');
  return true;
}

function handleStart() {
  if (checkEigyoAlert()) return;
  if (!runNormalSpin()) {
    setState('lose_result');
  }
}

function autoSpin(count) {
  for (let i = 0; i < count; i++) {
    if (checkEigyoAlert()) return;
    if (runNormalSpin()) return;
  }
  setState('normal_idle');
}

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

function handleSwordDriveContinue() {
  if (!game.pending.promote) {
    setState('wou_idle');
    return;
  }
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
  addLog(`${game.pending.cutinLabel}！`, 'rush');
  setState('rush_cutin');
}

function handleRushCutinContinue() {
  setState(game.rush.logicState.mode === 'sr' ? 'sr_idle' : 'wou_idle');
}

function backToNormal() {
  game.mode = 'normal';
  setState('normal_idle');
}
```

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "feat: add game state and normal-mode flow to script.js"
```

---

### Task 4: script.js — SR/WoU中フロー・営業終了・退店

**Files:**
- Modify: `script.js`

- [ ] **Step 1: RUSH（SR/WoU）中ハンドラを追加**

```js
// ---- SR/WoU中ハンドラ ----

// 1回転処理。画面遷移が起きたら true を返す
function runRushSpin(opts = {}) {
  game.rushAllStats.totalSpins++;
  game.rush.cycleSpins++;
  const wasMode = game.rush.logicState.mode;
  const { state: newLogicState, outcome, nominal, actual } = applySpin(game.rush.logicState);
  game.rush.logicState = newLogicState;

  if (outcome === 'miss') {
    if (newLogicState.mode === 'normal') {
      addLog('時短終了 → RUSHリザルトへ');
      setState('rush_result');
      return true;
    }
    if (!opts.silent) {
      addLog(`残り${newLogicState.jitanRemaining}回`);
      setState(wasMode === 'sr' ? 'sr_miss' : 'wou_miss');
      return true;
    }
    return false;
  }

  game.totalRushHits++;
  game.rush.totalHits++;
  game.rush.nominalBalls += nominal;
  game.rush.actualBalls += actual;
  addBalls(actual);
  const spinsThisCycle = game.rush.cycleSpins;
  game.rush.cycleSpins = 0;

  if (outcome === '10R_no_kessui' || outcome === '10R_kessui_fail' || outcome === '10R') {
    game.pending = { nominal, actual, spinsThisCycle, promote: false };
    addLog(`${spinsThisCycle}回転で当選！ 10R ＋${actual}球`, 'rush');
    setState('sr_hit_result');
    return true;
  }

  if (outcome === '10R_kessui_success') {
    game.pending = { nominal, actual, spinsThisCycle, promote: true };
    addLog(`${spinsThisCycle}回転で当選！ 10R（決意の刃成功） ＋${actual}球`, 'rush');
    setState('sr_hit_result');
    return true;
  }

  // sake_hanatachi（SR中）または sword_drive（WoU中）
  const promote = outcome === 'sake_hanatachi';
  game.pending = { outcome, nominal, actual, spinsThisCycle, promote };
  const label = promote ? '咲け、花たち' : '神器解放SWORD DRIVE';
  addLog(`${spinsThisCycle}回転で当選！ ${label} ＋${actual}球`, 'rush');
  setState('sword_drive_result');
  return true;
}

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

function handleRushSpin() {
  runRushSpin();
}

function handleRushSpin10() {
  for (let i = 0; i < 10; i++) {
    if (runRushSpin({ silent: true })) return;
  }
  setState(game.rush.logicState.mode === 'sr' ? 'sr_idle' : 'wou_idle');
}

function handleRushSkip() {
  for (;;) {
    if (runRushSpin({ silent: true })) return;
    if (game.rush.logicState.jitanRemaining <= 10) {
      setState(game.rush.logicState.mode === 'sr' ? 'sr_idle' : 'wou_idle');
      return;
    }
  }
}

function handleRushMissContinue() {
  setState(game.rush.logicState.mode === 'sr' ? 'sr_idle' : 'wou_idle');
}

function handleRushResultEnd() {
  addLog('RUSH終了 → 通常時へ');
  game.mode = 'normal';
  game.rush = null;
  setState('normal_idle');
}
```

- [ ] **Step 2: 営業終了・退店ハンドラを追加**

```js
// ---- 営業終了・退店 ----

function handleEigyoHai() {
  setState(game.mode === 'normal' ? 'normal_idle' : (game.rush.logicState.mode === 'sr' ? 'sr_idle' : 'wou_idle'));
}

function handleEigyoIie() {
  setState('taiten_result');
}

function handleTaiten() {
  setState('taiten_result');
}

function resetGame() {
  game.state = 'normal_idle';
  game.mode = 'normal';
  game.rentalRate = DEFAULT_RENTAL_RATE;
  game.mochiDama = 0;
  game.toushi = 0;
  game.totalSpins = 0;
  game.currentSpins = 0;
  game.lastHitSpins = 0;
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

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "feat: add SR/WoU spin flow and eigyo/taiten handlers to script.js"
```

---

### Task 5: script.js — 描画（render / buildScreen）

**Files:**
- Modify: `script.js`

- [ ] **Step 1: 状態セット・ヘッダー・バッジ描画を追加**

```js
// ---- 状態セット & レンダリング ----

function setState(state) {
  game.state = state;
  render();
}

function render() {
  renderHeader();
  renderModeBadge();
  renderMainScreen();
  renderRushStats();
}

function renderHeader() {
  const mochiInt = Math.floor(game.mochiDama);
  document.getElementById('mochi-dama').textContent = mochiInt.toLocaleString();
  document.getElementById('toushi-value').textContent = game.toushi.toLocaleString();

  const shuushi = Math.round(mochiInt * game.rentalRate) - game.toushi;
  const shuushiEl = document.getElementById('shuushi-value');
  shuushiEl.textContent = (shuushi >= 0 ? '+' : '') + shuushi.toLocaleString();
  shuushiEl.className = 'money-value ' + (shuushi >= 0 ? 'green' : 'red');
  document.getElementById('current-spins').textContent = game.currentSpins.toLocaleString();
  document.getElementById('total-spins-disp').textContent = game.totalSpins.toLocaleString();

  const rushCountEl = document.getElementById('rush-count');
  rushCountEl.textContent = game.rush ? `${game.rush.logicState.jitanRemaining}回` : '－';

  document.getElementById('total-hit-count').textContent = (game.normalHitCount + game.totalRushHits) + '回';
  document.getElementById('normal-first-hit').textContent = game.normalHitCount + '回';
  document.getElementById('normal-first-prob').textContent = game.normalHitCount > 0 && game.totalSpins > 0
    ? '1/' + Math.round(game.totalSpins / game.normalHitCount).toLocaleString()
    : '1/―';

  document.getElementById('rush-entry-count').textContent = game.rushEntryCount + '回';
  const rushEntryRate = game.normalHitCount > 0 ? Math.round(game.rushEntryCount / game.normalHitCount * 100) : 0;
  document.getElementById('rush-entry-info').textContent = `(突入率 ${rushEntryRate}%)`;

  document.getElementById('fee-block').textContent = `${game.rentalRate.toFixed(1)}円`;
}

function renderModeBadge() {
  const el = document.getElementById('mode-badge');
  if (game.mode === 'sr') {
    el.textContent = 'SR中';
    el.className = 'rush';
  } else if (game.mode === 'wou') {
    el.textContent = 'WoU中';
    el.className = 'rush';
  } else {
    el.textContent = '通常時';
    el.className = '';
  }
}

function renderMainScreen() {
  document.getElementById('main-screen').innerHTML = buildScreen(game.state);
}

function rentalRateOptionsHtml() {
  return RENTAL_RATE_TABLE.map(r =>
    `<option value="${r.yenPerBall}" ${r.yenPerBall === game.rentalRate ? 'selected' : ''}>${r.yenPerBall.toFixed(1)}円${r.yenPerBall === DEFAULT_RENTAL_RATE ? '（等価）' : ''}</option>`
  ).join('');
}

function tenThousandYenSpins() {
  const entry = RENTAL_RATE_TABLE.find((r) => r.yenPerBall === game.rentalRate);
  return Math.round(entry.spinsPerThousandYen * 10);
}
```

- [ ] **Step 2: テスト実行で構文確認**

Run: `node --check script.js`
Expected: エラーなし（buildScreenがまだ無いため、この時点ではブラウザ実行はできないが構文チェックは通る）

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "feat: add header/badge rendering and rate helpers to script.js"
```

---

### Task 6: script.js — buildScreen（各画面）

**Files:**
- Modify: `script.js`

- [ ] **Step 1: buildScreenと残りの描画関数を追加**

```js
const P_NORMAL_HIT_DISPLAY = '1/199.9';
const P_RUSH_HIT_DISPLAY = '1/51.6';

const SWORD_DRIVE_LABELS = {
  boku_no_hero: 'ぼくの英雄',
  sake_hanatachi: '咲け、花たち',
  sword_drive: '神器解放SWORD DRIVE',
};

function buildScreen(state) {
  switch (state) {

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

    case 'lose_result':
      return `<div class="screen">
        <p class="result-main lose">はずれ</p>
        <button class="btn-sub" onclick="backToNormal()" style="margin-top:8px;">続ける</button>
      </div>`;

    case 'sword_drive_result': {
      const { outcome, nominal, actual, interval, spinsThisCycle } = game.pending;
      const label = SWORD_DRIVE_LABELS[outcome] || outcome;
      const intervalLabel = interval !== undefined ? `${interval}回転で大当たり` : `${spinsThisCycle}回転で当選`;
      return `<div class="screen">
        <p class="result-sub">${intervalLabel}</p>
        <div class="vibun-box rush-box">
          <p class="bonus-main premium">${label}</p>
          <p class="bonus-sub">${nominal.toLocaleString()}個（＋${actual.toLocaleString()}球獲得）</p>
        </div>
        <button class="btn-action" onclick="handleSwordDriveContinue()" style="margin-top:16px;">▶ 次へ</button>
      </div>`;
    }

    case 'rush_cutin': {
      const { cutinLabel, cutinSub } = game.pending;
      return `<div class="screen">
        <p class="cutin-flavor">${cutinLabel}！</p>
        <p class="rush-title" style="color:#c9a227;">${cutinSub}</p>
        <button class="btn-action" onclick="handleRushCutinContinue()">▶ 次へ</button>
      </div>`;
    }

    case 'sr_idle':
    case 'wou_idle': {
      const skipDisabled = game.rush.logicState.jitanRemaining <= 10;
      return `<div class="screen">
        <p class="chain-label">${game.rush.totalHits}連チャン中</p>
        <p class="rush-sub">獲得出玉 <span>${Math.round(game.rush.actualBalls).toLocaleString()}</span> 球</p>
        <p class="rush-sub">残り <span>${game.rush.logicState.jitanRemaining}</span> 回</p>
        <div class="rush-spin-btns">
          <button class="btn-rush-spin" onclick="handleRushSpin()">1回転</button>
          <button class="btn-rush-spin" onclick="handleRushSpin10()">10回転</button>
          <button class="btn-rush-spin skip" ${skipDisabled ? 'disabled' : 'onclick="handleRushSkip()"'}>スキップ</button>
        </div>
        <p class="prob-hint">大当たり確率 ${P_RUSH_HIT_DISPLAY}</p>
        <button class="btn-taiten" onclick="handleTaiten()">退店する</button>
      </div>`;
    }

    case 'sr_hit_result': {
      const { nominal, actual, spinsThisCycle } = game.pending;
      return `<div class="screen">
        <p class="result-sub">${spinsThisCycle}回転で当選</p>
        <p class="chain-label">${game.rush.totalHits}連チャン中</p>
        <div class="vibun-box rush-box">
          <p class="bonus-main premium">10R</p>
          <p class="bonus-sub">${nominal}個（＋${actual}球獲得）</p>
        </div>
        <button class="btn-action" onclick="handleRushHitContinue()" style="margin-top:16px;">▶ 次へ</button>
      </div>`;
    }

    case 'sr_miss':
    case 'wou_miss':
      return `<div class="screen">
        <p class="result-main lose">外れ</p>
        <p style="color:#d2694a; font-size:18px; margin-top:4px;">残り ${game.rush.logicState.jitanRemaining}回</p>
        <button class="btn-sub" onclick="handleRushMissContinue()" style="margin-top:12px;">続ける</button>
      </div>`;

    case 'rush_result': {
      const r = game.rush;
      return `<div class="screen">
        <p class="rush-result-title">RUSH リザルト</p>
        <div class="rush-result-box">
          <div class="result-row highlight">
            <span class="rr-label">連チャン数</span>
            <span class="rr-val gold">${r.totalHits}回</span>
          </div>
          <div class="result-row">
            <span class="rr-label">TOTAL</span>
            <span class="rr-val gold">${r.nominalBalls.toLocaleString()}個</span>
          </div>
          <div class="result-row">
            <span class="rr-label">獲得出玉</span>
            <span class="rr-val">${Math.round(r.actualBalls).toLocaleString()}球</span>
          </div>
        </div>
        <button class="btn-action" onclick="handleRushResultEnd()" style="margin-top:16px;">▶ 通常へ戻る</button>
      </div>`;
    }

    case 'eigyo_alert':
      return `<div class="screen">
        <p style="font-size:22px; font-weight:bold; color:#c9a227; text-align:center; line-height:1.6;">
          営業時間終了になりました
        </p>
        <p style="font-size:16px; color:#666; text-align:center;">このまま居座り続けますか？</p>
        <div style="display:flex; gap:16px; margin-top:8px;">
          <button class="btn-action" style="flex:1;" onclick="handleEigyoHai()">はい</button>
          <button class="btn-action" style="flex:1; background:linear-gradient(135deg,#999,#666); border-color:#ccc;"
            onclick="handleEigyoIie()">いいえ</button>
        </div>
      </div>`;

    case 'taiten_result': {
      const mochi = Math.floor(game.mochiDama);
      const mochiYen = Math.round(mochi * game.rentalRate);
      const shuushi = mochiYen - game.toushi;
      const shuushiColor = shuushi >= 0 ? '#2e9e5b' : '#d24141';
      const shuushiSign = shuushi >= 0 ? '＋' : '';
      return `<div class="screen">
        <p style="font-size:24px; font-weight:bold; color:#666;">退店します</p>
        <div class="rush-result-box" style="max-width:320px;">
          <p class="rr-section" style="margin-bottom:8px;">収支発表</p>
          <div class="result-row">
            <span class="rr-label">総回転数</span>
            <span class="rr-val">${game.totalSpins.toLocaleString()}回</span>
          </div>
          <div class="result-row">
            <span class="rr-label">投資金額</span>
            <span class="rr-val" style="color:#d24141;">${game.toushi.toLocaleString()}円</span>
          </div>
          <div class="result-row">
            <span class="rr-label">持ち球換算</span>
            <span class="rr-val">${mochiYen.toLocaleString()}円</span>
          </div>
          <hr class="result-hr">
          <div class="result-row highlight">
            <span class="rr-label" style="font-weight:bold;">収支</span>
            <span class="rr-val" style="color:${shuushiColor}; font-size:22px;">
              ${shuushiSign}${shuushi.toLocaleString()}円
            </span>
          </div>
          <hr class="result-hr">
          <div class="result-row">
            <span class="rr-label">RUSH突入</span>
            <span class="rr-val">${game.rushEntryCount}回</span>
          </div>
        </div>
        <button class="btn-action" onclick="resetGame()" style="margin-top:8px;">▶ 最初の画面に戻る</button>
      </div>`;
    }

    default:
      return `<div class="screen"><p>...</p></div>`;
  }
}

function renderRushStats() {
  const hits = game.totalRushHits;
  const spins = game.rushAllStats.totalSpins;
  const prob = hits > 0 && spins > 0 ? '1/' + (spins / hits).toFixed(1) : '1/―';
  document.getElementById('rs-chain').textContent = hits + '回';
  document.getElementById('rs-prob').textContent = prob;
  document.getElementById('rs-spins').textContent = spins + '回';
}

function renderLog() {
  const el = document.getElementById('log-list');
  el.innerHTML = game.log.map(item =>
    `<div class="log-item ${item.type}">${item.text}</div>`
  ).join('');
}

render();
```

- [ ] **Step 2: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "feat: add buildScreen and remaining render functions to script.js"
```

---

### Task 7: ブラウザ動作確認

**Files:** なし（確認のみ）

- [ ] **Step 1: ローカルサーバーを起動してブラウザで開く**

```bash
cd /c/Users/ab_99/pachinko-simulator-sao && npx http-server -p 8089 -c-1 &
```

ブラウザ（またはPlaywright）で `http://localhost:8089` を開き、以下を目視確認する:
- 初期画面にSTARTボタン・確率1/199.9・貸玉料金セレクト・1万円分ボタンが表示される
- STARTを何度か押して、ハズレ／2R当選／ぼくの英雄（低確率のため出ない場合はコンソールで`Math.random`を一時的にモックして確認）が正しく画面遷移する
- コンソールにJSエラーが出ていないこと（開発者ツールのConsoleタブを確認）

- [ ] **Step 2: サーバーを停止**

```bash
kill %1
```

- [ ] **Step 3: 動作確認完了を報告**

問題があれば該当箇所を修正し、再度Step 1から確認する。
