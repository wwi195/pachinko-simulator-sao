# SR中「決意の刃」ジャッジ演出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SR中の当選演出を「1500ボーナス（決意の刃発生時はジャッジボタン）→成功/失敗リバース→（咲け花たちなら）レインボー演出→既存sword_drive_result」の流れに再構成する。

**Architecture:** `runRushSpin`の出玉決定はそのまま（`logic.js`は無変更）、`game.pending`にジャッジ用フィールド（`hasKessui`/`kessuiResult`/`leadsToSakeHanatachi`）を追加し、`handleRushHitContinue`と`buildScreen`の`sr_hit_result`を拡張、`kessui_fail`/`kessui_success`/`sake_hanatachi_reveal`の3画面を新設する。表示時間は直前に調整した1400msに統一する。

**Tech Stack:** Vanilla JS/CSS。ビルド不要。

---

### Task 1: style.css — 決意の刃演出用スタイル追加

**Files:**
- Modify: `style.css`

- [ ] **Step 1: `.judge-label`の直後に`.kessui-success-label`と`.sake-hanatachi-label`（レインボー演出）を追加**

以下を:
```css
/* RUSHジャッジ */
.judge-label {
  font-size: 15px;
  font-weight: bold;
  color: var(--c-ruri);
  letter-spacing: 1px;
  margin-top: 6px;
}
```

以下に置き換える:
```css
/* RUSHジャッジ */
.judge-label {
  font-size: 15px;
  font-weight: bold;
  color: var(--c-ruri);
  letter-spacing: 1px;
  margin-top: 6px;
}

.kessui-success-label {
  font-size: 26px;
  font-weight: bold;
  letter-spacing: 2px;
  color: var(--c-ruri);
}

.sake-hanatachi-label {
  font-size: 28px;
  font-weight: bold;
  letter-spacing: 2px;
  background: linear-gradient(90deg, #ff3b3b, #ff9d3b, #ffe93b, #3bff6a, #3bcfff, #6a3bff, #ff3bcf, #ff3b3b);
  background-size: 400% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: rush-rainbow 3s linear infinite;
}
@keyframes rush-rainbow {
  0%   { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "feat: add kessui judge and sake-hanatachi reveal styles"
```

---

### Task 2: script.js — runRushSpinの出玉分岐をジャッジ用フィールド構成に変更

**Files:**
- Modify: `script.js`

- [ ] **Step 1: `10R_no_kessui`/`10R_kessui_fail`/`10R_kessui_success`/`sake_hanatachi`/`10R`(WoU)/`sword_drive`(WoU)の分岐を書き換え**

以下を:
```js
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
```

以下に置き換える:
```js
  if (outcome === '10R_no_kessui' || outcome === '10R') {
    game.pending = { nominal, actual, spinsThisCycle, hasKessui: false };
    addLog(`${spinsThisCycle}回転で当選！ 10R ＋${actual}球`, 'rush');
    setState('sr_hit_result');
    return true;
  }

  if (outcome === '10R_kessui_fail') {
    game.pending = { nominal, actual, spinsThisCycle, hasKessui: true, kessuiResult: 'fail' };
    addLog(`${spinsThisCycle}回転で当選！ 10R ＋${actual}球`, 'rush');
    setState('sr_hit_result');
    return true;
  }

  if (outcome === '10R_kessui_success') {
    game.pending = { nominal, actual, spinsThisCycle, hasKessui: true, kessuiResult: 'success', leadsToSakeHanatachi: false };
    addLog(`${spinsThisCycle}回転で当選！ 10R ＋${actual}球`, 'rush');
    setState('sr_hit_result');
    return true;
  }

  if (outcome === 'sake_hanatachi') {
    const displayNominal = 1500;
    const displayActual = toActualBalls(displayNominal);
    game.pending = {
      nominal: displayNominal,
      actual: displayActual,
      finalNominal: nominal,
      finalActual: actual,
      spinsThisCycle,
      hasKessui: true,
      kessuiResult: 'success',
      leadsToSakeHanatachi: true,
    };
    addLog(`${spinsThisCycle}回転で当選！ 10R ＋${displayActual}球`, 'rush');
    setState('sr_hit_result');
    return true;
  }

  // sword_drive（WoU中のみ、既存動作は変更なし）
  game.pending = { outcome, nominal, actual, spinsThisCycle, promote: false };
  addLog(`${spinsThisCycle}回転で当選！ ${SWORD_DRIVE_LABELS[outcome]} ＋${actual}球`, 'rush');
  setState('sword_drive_result');
  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add script.js
git commit -m "feat: split SR outcome branches into kessui judge fields"
```

---

### Task 3: script.js — handleRushHitContinueをジャッジ対応に拡張

**Files:**
- Modify: `script.js`

- [ ] **Step 1: `handleRushHitContinue`を書き換え**

以下を:
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

以下に置き換える:
```js
function handleRushHitContinue() {
  if (!game.pending.hasKessui) {
    setState(game.rush.logicState.mode === 'sr' ? 'sr_idle' : 'wou_idle');
    return;
  }

  if (game.pending.kessuiResult === 'fail') {
    addLog('決意の刃 失敗', 'rush');
    setState('kessui_fail');
    setTimeout(() => setState('sr_idle'), 1400);
    return;
  }

  game.mode = 'wou';
  game.wouEntryCount++;
  addLog('決意の刃 成功！WoUへ', 'rush');
  setState('kessui_success');
  setTimeout(() => {
    if (game.pending.leadsToSakeHanatachi) {
      setState('sake_hanatachi_reveal');
      setTimeout(() => {
        const { finalNominal, finalActual, spinsThisCycle } = game.pending;
        game.pending = { outcome: 'sake_hanatachi', nominal: finalNominal, actual: finalActual, spinsThisCycle };
        addLog(`咲け、花たち ＋${finalActual}球`, 'rush');
        setState('sword_drive_result');
      }, 1400);
    } else {
      setState('wou_idle');
    }
  }, 1400);
}
```

- [ ] **Step 2: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "feat: extend handleRushHitContinue with kessui judge chain"
```

---

### Task 4: script.js — buildScreenの画面追加

**Files:**
- Modify: `script.js`

- [ ] **Step 1: `sr_hit_result`ケースを決意の刃対応に書き換え、`kessui_fail`/`kessui_success`/`sake_hanatachi_reveal`を新設**

以下を:
```js
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
```

以下に置き換える:
```js
    case 'sr_hit_result': {
      const { nominal, actual, spinsThisCycle, hasKessui } = game.pending;
      const kessuiLabel = hasKessui ? '<p class="judge-label">決意の刃発生！</p>' : '';
      const buttonLabel = hasKessui ? 'ジャッジ' : '▶ 次へ';
      return `<div class="screen">
        <p class="result-sub">${spinsThisCycle}回転で当選</p>
        <p class="chain-label">${game.rush.totalHits}連チャン中</p>
        <div class="vibun-box rush-box">
          <p class="bonus-main premium">10R</p>
          <p class="bonus-sub">${nominal}個（＋${actual}球獲得）</p>
          ${kessuiLabel}
        </div>
        <button class="btn-action" onclick="handleRushHitContinue()" style="margin-top:16px;">${buttonLabel}</button>
      </div>`;
    }

    case 'kessui_fail':
      return `<div class="screen">
        <p class="result-main lose">失敗</p>
      </div>`;

    case 'kessui_success':
      return `<div class="screen">
        <p class="kessui-success-label">成功！WoUへ</p>
      </div>`;

    case 'sake_hanatachi_reveal':
      return `<div class="screen">
        <p class="sake-hanatachi-label">咲け、花たち</p>
      </div>`;
```

- [ ] **Step 2: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "feat: add sr_hit_result kessui UI and kessui/sake-hanatachi reveal screens"
```

---

### Task 5: ブラウザ動作確認

**Files:** なし（確認のみ）

- [ ] **Step 1: ローカルサーバーを起動してブラウザで確認**

```bash
cd /c/Users/ab_99/pachinko-simulator-sao && npx http-server -p 8089 -c-1 &
```

Math.randomをモックしてSR中の4パターン（`10R_no_kessui`, `10R_kessui_fail`, `10R_kessui_success`, `sake_hanatachi`）をそれぞれ発生させ、以下を確認する:
- `10R_no_kessui`: 「決意の刃発生！」表示なし、ボタンは「▶次へ」のまま、押下で即座にsr_idleへ
- `10R_kessui_fail`: 「決意の刃発生！」表示、ボタン「ジャッジ」。押下で「失敗」画面が1400ms表示され自動でsr_idleへ戻る
- `10R_kessui_success`: 押下で「成功！WoUへ」画面が1400ms表示され、自動でwou_idleへ（ヘッダーがWoU中に切り替わる）
- `sake_hanatachi`: 押下で「成功！WoUへ」（1400ms）→「咲け、花たち」レインボー演出（1400ms）→ 既存のsword_drive_result画面（真の合計金額が開示される）に遷移する。1500ボーナス画面時点では真の金額が見えていないこと（履歴ログも含めて）
- コンソールにJSエラーが出ていないこと

- [ ] **Step 2: サーバーを停止**

```bash
kill %1
```

- [ ] **Step 3: 動作確認完了を報告**

問題があれば該当箇所を修正し、再度Step 1から確認する。
