# 収支反映タイミング修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `addBalls()`（`game.mochiDama`＝収支の元）の呼び出しを、抽選確定時ではなく実際に金額が画面表示される瞬間まで遅延させ、演出発表前の収支先読みを防ぐ。

**Architecture:** `runNormalSpin`/`runRushSpin`から即時の`addBalls()`呼び出しを削除し、代わりに`handleRushJudge`（通常時）と`handleSwordDriveAttack`（SWORD DRIVE発表時）に移動・分割する。マスク表示のある経路（咲け花たち／WoU中神器解放SWORD DRIVE）はスピン時にマスク分のみ加算し、真の合計との差分を発表時に追加加算する。`logic.js`・`game.rush.actualBalls`/`nominalBalls`の集計ロジックは変更しない。

**Tech Stack:** Vanilla JS。ビルド不要。

---

### Task 1: script.js — runNormalSpinから即時addBallsを削除

**Files:**
- Modify: `script.js`

- [ ] **Step 1: niR_53/niR_0分岐の`addBalls(actual)`を削除**

以下を:
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

以下に置き換える:
```js
  if (outcome === 'niR_53' || outcome === 'niR_0') {
    const nominal = 300;
    const actual = toActualBalls(nominal);
    game.pending = { outcome, nominal, actual, interval };
    addLog(`${interval}回転で大当たり！ 2R ＋${actual}球`, 'win');
    setState('rush_judge');
    return true;
  }
```

- [ ] **Step 2: ぼくの英雄分岐の`addBalls(actual)`を削除**

以下を:
```js
  // boku_no_hero: WoU直行（ソードドライブ演出、先付け1500）
  const nominal = resolveSwordDrive(1500);
  const actual = toActualBalls(nominal);
  addBalls(actual);
  game.rush = { logicState: { mode: 'wou', jitanRemaining: 70 }, totalHits: 0, nominalBalls: nominal, actualBalls: actual, cycleSpins: 0 };
```

以下に置き換える:
```js
  // boku_no_hero: WoU直行（ソードドライブ演出、先付け1500）
  const nominal = resolveSwordDrive(1500);
  const actual = toActualBalls(nominal);
  game.rush = { logicState: { mode: 'wou', jitanRemaining: 70 }, totalHits: 0, nominalBalls: nominal, actualBalls: actual, cycleSpins: 0 };
```

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "fix: defer normal-mode addBalls until reveal (remove from runNormalSpin)"
```

---

### Task 2: script.js — handleRushJudgeで加算

**Files:**
- Modify: `script.js`

- [ ] **Step 1: `handleRushJudge`冒頭に`addBalls(actual)`を追加**

以下を:
```js
function handleRushJudge() {
  const { outcome, nominal, actual } = game.pending;
  if (outcome === 'niR_53') {
```

以下に置き換える:
```js
function handleRushJudge() {
  const { outcome, nominal, actual } = game.pending;
  addBalls(actual);
  if (outcome === 'niR_53') {
```

- [ ] **Step 2: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "fix: add balls at rush-judge reveal time"
```

---

### Task 3: script.js — runRushSpinの共通addBallsを各分岐に分割

**Files:**
- Modify: `script.js`

- [ ] **Step 1: 共通ブロックの`addBalls(actual)`を削除し、各分岐内に個別配置。咲け花たち／sword_driveはマスク分のみ加算**

以下を:
```js
  game.totalRushHits++;
  game.rush.totalHits++;
  game.rush.nominalBalls += nominal;
  game.rush.actualBalls += actual;
  addBalls(actual);
  const spinsThisCycle = game.rush.cycleSpins;
  game.rush.cycleSpins = 0;

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

  // sword_drive（WoU中のみ）: まず1500ボーナス画面を経由し、SWORD DRIVE演出で真の金額を発表する
  game.pending = {
    outcome: 'sword_drive',
    nominal: 1500,
    actual: toActualBalls(1500),
    finalNominal: nominal,
    finalActual: actual,
    spinsThisCycle,
    hasKessui: false,
    leadsToSwordDrive: true,
  };
  addLog(`${spinsThisCycle}回転で当選！ 10R ＋${toActualBalls(1500)}球`, 'rush');
  setState('sr_hit_result');
  return true;
}
```

以下に置き換える:
```js
  game.totalRushHits++;
  game.rush.totalHits++;
  game.rush.nominalBalls += nominal;
  game.rush.actualBalls += actual;
  const spinsThisCycle = game.rush.cycleSpins;
  game.rush.cycleSpins = 0;

  if (outcome === '10R_no_kessui' || outcome === '10R') {
    addBalls(actual);
    game.pending = { nominal, actual, spinsThisCycle, hasKessui: false };
    addLog(`${spinsThisCycle}回転で当選！ 10R ＋${actual}球`, 'rush');
    setState('sr_hit_result');
    return true;
  }

  if (outcome === '10R_kessui_fail') {
    addBalls(actual);
    game.pending = { nominal, actual, spinsThisCycle, hasKessui: true, kessuiResult: 'fail' };
    addLog(`${spinsThisCycle}回転で当選！ 10R ＋${actual}球`, 'rush');
    setState('sr_hit_result');
    return true;
  }

  if (outcome === '10R_kessui_success') {
    addBalls(actual);
    game.pending = { nominal, actual, spinsThisCycle, hasKessui: true, kessuiResult: 'success', leadsToSakeHanatachi: false };
    addLog(`${spinsThisCycle}回転で当選！ 10R ＋${actual}球`, 'rush');
    setState('sr_hit_result');
    return true;
  }

  if (outcome === 'sake_hanatachi') {
    const displayNominal = 1500;
    const displayActual = toActualBalls(displayNominal);
    addBalls(displayActual);
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

  // sword_drive（WoU中のみ）: まず1500ボーナス画面を経由し、SWORD DRIVE演出で真の金額を発表する
  const swordDriveDisplayNominal = 1500;
  const swordDriveDisplayActual = toActualBalls(1500);
  addBalls(swordDriveDisplayActual);
  game.pending = {
    outcome: 'sword_drive',
    nominal: swordDriveDisplayNominal,
    actual: swordDriveDisplayActual,
    finalNominal: nominal,
    finalActual: actual,
    spinsThisCycle,
    hasKessui: false,
    leadsToSwordDrive: true,
  };
  addLog(`${spinsThisCycle}回転で当選！ 10R ＋${swordDriveDisplayActual}球`, 'rush');
  setState('sr_hit_result');
  return true;
}
```

- [ ] **Step 2: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "fix: split runRushSpin addBalls per-branch, mask sake-hanatachi/sword-drive payout at spin time"
```

---

### Task 4: script.js — handleSwordDriveAttackで最終加算

**Files:**
- Modify: `script.js`

- [ ] **Step 1: 4回目クリック完了時に、経路に応じた加算を行う**

以下を:
```js
function handleSwordDriveAttack() {
  game.swordDriveClicks++;
  if (game.swordDriveClicks < 4) {
    render();
    return;
  }
  if (game.pending.finalNominal !== undefined) {
    game.pending = { outcome: game.pending.outcome, nominal: game.pending.finalNominal, actual: game.pending.finalActual };
  }
  setState('sword_drive_reveal');
}
```

以下に置き換える:
```js
function handleSwordDriveAttack() {
  game.swordDriveClicks++;
  if (game.swordDriveClicks < 4) {
    render();
    return;
  }
  if (game.pending.finalActual !== undefined) {
    // 咲け花たち／WoU中神器解放SWORD DRIVE: マスク分は既に加算済みなので差分のみ加算
    addBalls(game.pending.finalActual - game.pending.actual);
    game.pending = { outcome: game.pending.outcome, nominal: game.pending.finalNominal, actual: game.pending.finalActual };
  } else {
    // ぼくの英雄: まだ何も加算していないので全額加算
    addBalls(game.pending.actual);
  }
  setState('sword_drive_reveal');
}
```

- [ ] **Step 2: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "fix: add remaining/full balls at SWORD DRIVE reveal time"
```

---

### Task 5: ブラウザ動作確認

**Files:** なし（確認のみ）

- [ ] **Step 1: ローカルサーバーを起動してブラウザで確認**

```bash
cd /c/Users/ab_99/pachinko-simulator-sao && npx http-server -p 8089 -c-1 &
```

Math.randomをモックして以下を確認する（各ステップで`game.mochiDama`の値を都度チェックし、まだ見せていない金額が加算されていないことを確認）:
- **niR_53**: `rush_judge`表示中は`mochiDama`が変化していない → 「運命に抗ってやる」クリック後（`sword_rush_acquired`表示時）に+280されている
- **ぼくの英雄**: `sword_drive_intro`（狙え画面）表示中は`mochiDama`が変化していない → 4回クリック後（`sword_drive_reveal`表示時）に真の金額が一括加算される
- **咲け花たち**: `sr_hit_result`（1500ボーナス表示）時点で+1400のみ加算 → `sword_drive_intro`表示中もそれ以上増えない → 4回クリック後の`sword_drive_reveal`表示時に差分が追加加算され、合計が真の金額と一致する
- **WoU中神器解放SWORD DRIVE**: 咲け花たちと同様のマスク→差分加算パターンになっている
- **決意の刃失敗・SR/WoUの通常10R**: 従来通りスピン直後に即加算されている（変更なし）
- 全経路で、最終的な`mochiDama`の累計が修正前と完全に一致すること（タイミングのみの変更で金額自体は変わらない）
- コンソールにJSエラーが出ていないこと

- [ ] **Step 2: サーバーを停止**

```bash
kill %1
```

- [ ] **Step 3: 動作確認完了を報告**

問題があれば該当箇所を修正し、再度Step 1から確認する。
