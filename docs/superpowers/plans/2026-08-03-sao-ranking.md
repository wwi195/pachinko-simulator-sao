# RUSH獲得出玉ランキング Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** RUSH終了時の獲得出玉（実獲得球数）＋連チャン数を記録するランキング機能を追加する。`pachinko-simulator-kinniku`の実装（`localStorage`保存・上位10件・RUSH終了時に自動記録＋いつでも閲覧可能）をSAOの画面構成に合わせて移植する。

**Architecture:** `script.js`に純粋なランキング関数群（`loadRanking`/`saveRanking`/`recordRanking`/`renderRankingList`）を追加し、`runRushSpin`のRUSH終了分岐で記録、`rush_result`画面と新設`ranking_view`画面で表示する。`logic.js`は変更しない。

**Tech Stack:** Vanilla JS + `localStorage`。ビルド不要。

---

### Task 1: style.css — ランキング表示用スタイル追加

**Files:**
- Modify: `style.css`

- [ ] **Step 1: ファイル末尾に追加**

```css

/* ランキング */
.result-row.rank-new { background: rgba(28,75,156,0.12); border-radius: 6px; padding: 6px 4px; }
.rank-date { font-size: 10px; color: #999; margin-left: 6px; }
.rank-madelist { color: var(--c-ruri); font-weight: bold; text-align: center; margin-bottom: 4px; }
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "feat: add ranking display styles"
```

---

### Task 2: script.js — ランキング関数群の追加

**Files:**
- Modify: `script.js`

- [ ] **Step 1: `game`に`lastRankResult`を追加**

以下を:
```js
  swordDriveClicks: 0,
  log: [],
};
```

以下に置き換える:
```js
  swordDriveClicks: 0,
  lastRankResult: null,
  log: [],
};
```

- [ ] **Step 2: `addLog`の直後にランキング関数群を追加**

以下を:
```js
function addLog(text, type = '') {
  game.log.unshift({ text, type });
  if (game.log.length > 50) game.log.pop();
  renderLog();
}

// ---- 球数・投資 ----
```

以下に置き換える:
```js
function addLog(text, type = '') {
  game.log.unshift({ text, type });
  if (game.log.length > 50) game.log.pop();
  renderLog();
}

// ---- ランキング ----

const RANK_KEY = 'saoRankingV1';

function loadRanking() {
  try {
    const raw = localStorage.getItem(RANK_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (list.some((r) => typeof r.renchan !== 'number')) {
      saveRanking([]);
      return [];
    }
    return list;
  } catch (e) {
    return [];
  }
}

function saveRanking(list) {
  try {
    localStorage.setItem(RANK_KEY, JSON.stringify(list));
  } catch (e) {}
}

function recordRanking(balls, renchan) {
  const list = loadRanking();
  const d = new Date();
  const entry = { balls, renchan, date: `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` };
  list.push(entry);
  list.sort((a, b) => b.balls - a.balls);
  const trimmed = list.slice(0, 10);
  saveRanking(trimmed);
  return { list: trimmed, entry, madeList: trimmed.includes(entry) };
}

function renderRankingList(list, highlightEntry) {
  if (list.length === 0) return `<div class="rr-label" style="text-align:center;">まだ記録がありません</div>`;
  return list.map((r, i) => {
    const isNew = r === highlightEntry;
    return `<div class="result-row${isNew ? ' rank-new' : ''}">
      <span class="rr-label">${i + 1}位${isNew ? ' 🆕' : ''}</span>
      <span class="rr-val${isNew ? ' gold' : ''}">${r.balls.toLocaleString()}球（${r.renchan}連）<span class="rank-date">${r.date}</span></span>
    </div>`;
  }).join('');
}

function handleShowRanking() {
  setState('ranking_view');
}

function handleRankingBack() {
  setState('normal_idle');
}

// ---- 球数・投資 ----
```

- [ ] **Step 3: `runRushSpin`のRUSH終了分岐で`recordRanking`を呼び出す**

以下を:
```js
  if (outcome === 'miss') {
    if (newLogicState.mode === 'normal') {
      addLog('時短終了 → RUSHリザルトへ');
      setState('rush_result');
      return true;
    }
```

以下に置き換える:
```js
  if (outcome === 'miss') {
    if (newLogicState.mode === 'normal') {
      game.lastRankResult = recordRanking(Math.round(game.rush.actualBalls), game.rush.totalHits);
      addLog('時短終了 → RUSHリザルトへ');
      setState('rush_result');
      return true;
    }
```

- [ ] **Step 4: `resetGame`に`lastRankResult`のリセットを追加**

以下を:
```js
  game.swordDriveClicks = 0;
  game.log = [];
  render();
}
```

以下に置き換える:
```js
  game.swordDriveClicks = 0;
  game.lastRankResult = null;
  game.log = [];
  render();
}
```

- [ ] **Step 5: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 6: Commit**

```bash
git add script.js
git commit -m "feat: add ranking recording functions and hook into RUSH end"
```

---

### Task 3: script.js — buildScreenへのランキング表示追加

**Files:**
- Modify: `script.js`

- [ ] **Step 1: `normal_idle`ケースに「🏆 ランキング」ボタンを追加**

以下を:
```js
        <button class="btn-taiten" onclick="handleTaiten()">退店する</button>
      </div>`;

    case 'rush_judge': {
```

以下に置き換える:
```js
        <div style="display:flex; gap:8px;">
          <button class="btn-taiten" onclick="handleTaiten()">退店する</button>
          <button class="btn-taiten" onclick="handleShowRanking()">🏆 ランキング</button>
        </div>
      </div>`;

    case 'ranking_view':
      return `<div class="screen">
        <p class="rush-result-title">🏆 最高出玉ランキング</p>
        <div class="rush-result-box">
          ${renderRankingList(loadRanking())}
        </div>
        <button class="btn-sub" onclick="handleRankingBack()" style="margin-top:16px;">戻る</button>
      </div>`;

    case 'rush_judge': {
```

- [ ] **Step 2: `rush_result`ケースにランキング表示を追加**

以下を:
```js
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
```

以下に置き換える:
```js
    case 'rush_result': {
      const r = game.rush;
      const rank = game.lastRankResult;
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
        <div class="rush-result-box">
          <p class="rr-section">🏆 最高出玉ランキング</p>
          ${rank && rank.madeList ? '<p class="rank-madelist">ランクイン！</p>' : ''}
          ${renderRankingList(rank ? rank.list : loadRanking(), rank ? rank.entry : null)}
        </div>
        <button class="btn-action" onclick="handleRushResultEnd()" style="margin-top:16px;">▶ 通常へ戻る</button>
      </div>`;
    }
```

- [ ] **Step 3: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 4: Commit**

```bash
git add script.js
git commit -m "feat: display ranking on rush_result screen and add ranking_view screen"
```

---

### Task 4: ブラウザ動作確認

**Files:** なし（確認のみ）

- [ ] **Step 1: ローカルサーバーを起動してブラウザで確認**

```bash
cd /c/Users/ab_99/pachinko-simulator-sao && npx http-server -p 8089 -c-1 &
```

Math.randomをモックしてRUSHを発生・終了させ、以下を確認する:
- 通常時画面に「🏆 ランキング」ボタンが「退店する」の隣に表示される
- 押すとランキング一覧画面（初回は「まだ記録がありません」）が表示され、「戻る」で通常時画面に戻る
- RUSHを1回発生させて終了すると、`rush_result`画面に今回の記録が「ランクイン！」付きでハイライト表示される
- ブラウザをリロードしても`localStorage`（`saoRankingV1`）の記録が保持されていること
- 2回目以降のRUSHで、獲得出玉に応じて正しく順位・上位10件のトリミングが行われること
- コンソールにJSエラーが出ていないこと

- [ ] **Step 2: サーバーを停止**

```bash
kill %1
```

- [ ] **Step 3: 動作確認完了を報告**

問題があれば該当箇所を修正し、再度Step 1から確認する。
