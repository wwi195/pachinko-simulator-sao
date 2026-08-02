# SAOアリシゼーション ロジック層 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pachinko-simulator-sao/logic.js` に、通常時・SR中・WoU中の抽選ロジックとソードドライブ演出の払出計算を、node:testでユニットテストしながら実装する。

**Architecture:** ghoul版（`pachinko-simulator-ghoul/logic.js`）と同じ規約に従う純粋関数の集合。`'use strict'` + `module.exports`。各モードは「ヒット判定→ヒット時のみtype抽選」という単一パターン（ghoul版`spinRush`/`rollRushHitType`と同型）。ソードドライブ演出は再帰関数として実装。状態遷移は`{ mode, jitanRemaining }`を受け取りイミュータブルに新stateを返す`applySpin`関数に集約する。

**Tech Stack:** Node.js標準の`node:test` / `node:assert/strict`（追加の依存パッケージなし）。

---

### Task 1: プロジェクト初期セットアップ

**Files:**
- Create: `package.json`

- [ ] **Step 1: package.jsonを作成**

```json
{
  "name": "pachinko-simulator-sao",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "test": "node --test \"test/**/*.test.js\""
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add package.json with test script"
```

---

### Task 2: 通常時の抽選（`spinNormal`）

**Files:**
- Create: `logic.js`
- Test: `test/logic.test.js`

- [ ] **Step 1: logic.jsの雛形とtest/logic.test.jsの雛形、mockRandomヘルパーを作成**

`logic.js`:
```js
'use strict';

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {};
}
```

`test/logic.test.js`:
```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const logic = require('../logic.js');

function withMockRandom(values, fn) {
  const original = Math.random;
  let i = 0;
  Math.random = () => values[Math.min(i++, values.length - 1)];
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}
```

- [ ] **Step 2: 失敗するテストを書く（P_NORMAL_HIT定数とspinNormalの4分岐）**

`test/logic.test.js`に追加:
```js
test('P_NORMAL_HIT is 1/199.9', () => {
  assert.equal(logic.P_NORMAL_HIT, 1 / 199.9);
});

test('spinNormal returns miss when the hit draw is at the high end', () => {
  const result = withMockRandom([0.999], () => logic.spinNormal());
  assert.equal(result, 'miss');
});

test('spinNormal returns boku_no_hero when hit and type draw lands under 1.5%', () => {
  const result = withMockRandom([0, 0], () => logic.spinNormal());
  assert.equal(result, 'boku_no_hero');
});

test('spinNormal returns niR_53 when hit and type draw lands in the 1.5%-50% band', () => {
  const result = withMockRandom([0, 0.02], () => logic.spinNormal());
  assert.equal(result, 'niR_53');
});

test('spinNormal returns niR_0 when hit and type draw lands at 50%+', () => {
  const result = withMockRandom([0, 0.999], () => logic.spinNormal());
  assert.equal(result, 'niR_0');
});
```

- [ ] **Step 3: テストを実行して失敗を確認**

Run: `npm test`
Expected: FAIL（`logic.P_NORMAL_HIT`が`undefined`、`spinNormal`が関数でない）

- [ ] **Step 4: logic.jsに実装を追加**

`logic.js`を以下に置き換え:
```js
'use strict';

const P_NORMAL_HIT = 1 / 199.9;

function rollNormalHitType() {
  const r = Math.random() * 100;
  if (r < 1.5) return 'boku_no_hero';
  if (r < 1.5 + 48.5) return 'niR_53';
  return 'niR_0';
}

function spinNormal() {
  if (Math.random() < P_NORMAL_HIT) return rollNormalHitType();
  return 'miss';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    P_NORMAL_HIT,
    rollNormalHitType,
    spinNormal,
  };
}
```

- [ ] **Step 5: テストを実行してパスを確認**

Run: `npm test`
Expected: PASS（5 tests）

- [ ] **Step 6: Commit**

```bash
git add logic.js test/logic.test.js
git commit -m "feat: add normal-mode spin logic"
```

---

### Task 3: SR中の抽選（`spinSr`）

**Files:**
- Modify: `logic.js`
- Modify: `test/logic.test.js`

- [ ] **Step 1: 失敗するテストを書く**

`test/logic.test.js`に追加:
```js
test('P_RUSH_HIT is 1/51.6', () => {
  assert.equal(logic.P_RUSH_HIT, 1 / 51.6);
});

test('spinSr returns miss when the hit draw is at the high end', () => {
  const result = withMockRandom([0.999], () => logic.spinSr());
  assert.equal(result, 'miss');
});

test('spinSr returns 10R_no_kessui when type draw lands under 45%', () => {
  const result = withMockRandom([0, 0], () => logic.spinSr());
  assert.equal(result, '10R_no_kessui');
});

test('spinSr returns 10R_kessui_fail when type draw lands in the 45%-78% band', () => {
  const result = withMockRandom([0, 0.46], () => logic.spinSr());
  assert.equal(result, '10R_kessui_fail');
});

test('spinSr returns 10R_kessui_success when type draw lands in the 78%-89% band', () => {
  const result = withMockRandom([0, 0.79], () => logic.spinSr());
  assert.equal(result, '10R_kessui_success');
});

test('spinSr returns sake_hanatachi when type draw lands at 89%+', () => {
  const result = withMockRandom([0, 0.999], () => logic.spinSr());
  assert.equal(result, 'sake_hanatachi');
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm test`
Expected: FAIL（`logic.P_RUSH_HIT`が`undefined`、`spinSr`が関数でない）

- [ ] **Step 3: logic.jsに実装を追加**

`logic.js`の`module.exports`直前に追加:
```js
const P_RUSH_HIT = 1 / 51.6;

function rollSrHitType() {
  const r = Math.random() * 100;
  if (r < 45.0) return '10R_no_kessui';
  if (r < 45.0 + 33.0) return '10R_kessui_fail';
  if (r < 45.0 + 33.0 + 11.0) return '10R_kessui_success';
  return 'sake_hanatachi';
}

function spinSr() {
  if (Math.random() < P_RUSH_HIT) return rollSrHitType();
  return 'miss';
}
```

`module.exports`に`P_RUSH_HIT, rollSrHitType, spinSr`を追加。

- [ ] **Step 4: テストを実行してパスを確認**

Run: `npm test`
Expected: PASS（11 tests）

- [ ] **Step 5: Commit**

```bash
git add logic.js test/logic.test.js
git commit -m "feat: add SR-mode spin logic"
```

---

### Task 4: WoU中の抽選（`spinWou`）

**Files:**
- Modify: `logic.js`
- Modify: `test/logic.test.js`

- [ ] **Step 1: 失敗するテストを書く**

`test/logic.test.js`に追加:
```js
test('spinWou returns miss when the hit draw is at the high end', () => {
  const result = withMockRandom([0.999], () => logic.spinWou());
  assert.equal(result, 'miss');
});

test('spinWou returns 10R when type draw lands under 60%', () => {
  const result = withMockRandom([0, 0], () => logic.spinWou());
  assert.equal(result, '10R');
});

test('spinWou returns sword_drive when type draw lands at 60%+', () => {
  const result = withMockRandom([0, 0.999], () => logic.spinWou());
  assert.equal(result, 'sword_drive');
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm test`
Expected: FAIL（`spinWou`が関数でない）

- [ ] **Step 3: logic.jsに実装を追加**

`logic.js`の`module.exports`直前に追加:
```js
function rollWouHitType() {
  const r = Math.random() * 100;
  if (r < 60.0) return '10R';
  return 'sword_drive';
}

function spinWou() {
  if (Math.random() < P_RUSH_HIT) return rollWouHitType();
  return 'miss';
}
```

`module.exports`に`rollWouHitType, spinWou`を追加。

- [ ] **Step 4: テストを実行してパスを確認**

Run: `npm test`
Expected: PASS（14 tests）

- [ ] **Step 5: Commit**

```bash
git add logic.js test/logic.test.js
git commit -m "feat: add WoU-mode spin logic"
```

---

### Task 5: ソードドライブ演出（`resolveSwordDrive`）

**Files:**
- Modify: `logic.js`
- Modify: `test/logic.test.js`

**設計メモ:** ルートAは`precedingBonus + 1500 + 1500*hitCount`（当選0でも最低1,500保証、④の表・SR/WoUのレンジ説明と整合させるため疑似コードの`1500*当選数`から修正済み — 設計書参照）。

- [ ] **Step 1: 失敗するテストを書く**

`test/logic.test.js`に追加:
```js
test('resolveSwordDrive route A with 0 hold hits pays preceding + 1500', () => {
  // route selector >= 0.025 (route A), then 4 hold draws all miss (>= 1/2.17)
  const result = withMockRandom([0.5, 0.5, 0.5, 0.5, 0.5], () => logic.resolveSwordDrive(0));
  assert.equal(result, 1500);
});

test('resolveSwordDrive route A with 4 hold hits pays preceding + 7500', () => {
  const result = withMockRandom([0.5, 0, 0, 0, 0], () => logic.resolveSwordDrive(0));
  assert.equal(result, 7500);
});

test('resolveSwordDrive route A with 2 hold hits pays preceding + 4500', () => {
  const result = withMockRandom([0.5, 0, 0.5, 0, 0.5], () => logic.resolveSwordDrive(0));
  assert.equal(result, 4500);
});

test('resolveSwordDrive route A adds precedingBonus on top (SR sake_hanatachi case)', () => {
  const result = withMockRandom([0.5, 0.5, 0.5, 0.5, 0.5], () => logic.resolveSwordDrive(1500));
  assert.equal(result, 1500 + 1500);
});

test('resolveSwordDrive route B bonus branch pays preceding + 3000', () => {
  // route selector < 0.025 (route B), then branch selector < 0.6 (bonus)
  const result = withMockRandom([0, 0.1], () => logic.resolveSwordDrive(0));
  assert.equal(result, 3000);
});

test('resolveSwordDrive route B retry branch recurses with precedingBonus 0', () => {
  // route B, retry branch, then recursive call lands in route A with 0 hits
  const result = withMockRandom([0, 0.9, 0.5, 0.5, 0.5, 0.5, 0.5], () => logic.resolveSwordDrive(0));
  assert.equal(result, 1500);
});

test('resolveSwordDrive route B retry accumulates precedingBonus across recursion', () => {
  // route B retry, then recursive call also hits route B bonus branch
  const result = withMockRandom([0, 0.9, 0, 0.1], () => logic.resolveSwordDrive(1500));
  assert.equal(result, 1500 + 3000);
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm test`
Expected: FAIL（`resolveSwordDrive`が関数でない）

- [ ] **Step 3: logic.jsに実装を追加**

`logic.js`の`module.exports`直前に追加:
```js
const SWORD_DRIVE_ROUTE_B_PROB = 0.025;
const SWORD_DRIVE_ROUTE_B_BONUS_RATIO = 1.5 / 2.5;
const HOLD_HIT_PROB = 1 / 2.17;
const HOLD_COUNT = 4;
const HOLD_HIT_BONUS = 1500;
const SWORD_DRIVE_BASE = 1500;

function resolveSwordDrive(precedingBonus) {
  if (Math.random() < SWORD_DRIVE_ROUTE_B_PROB) {
    if (Math.random() < SWORD_DRIVE_ROUTE_B_BONUS_RATIO) {
      return precedingBonus + 3000;
    }
    return precedingBonus + resolveSwordDrive(0);
  }

  let hitCount = 0;
  for (let i = 0; i < HOLD_COUNT; i++) {
    if (Math.random() < HOLD_HIT_PROB) hitCount++;
  }
  return precedingBonus + SWORD_DRIVE_BASE + HOLD_HIT_BONUS * hitCount;
}
```

`module.exports`に`SWORD_DRIVE_ROUTE_B_PROB, SWORD_DRIVE_ROUTE_B_BONUS_RATIO, HOLD_HIT_PROB, HOLD_COUNT, HOLD_HIT_BONUS, SWORD_DRIVE_BASE, resolveSwordDrive`を追加。

- [ ] **Step 4: テストを実行してパスを確認**

Run: `npm test`
Expected: PASS（21 tests）

- [ ] **Step 5: Commit**

```bash
git add logic.js test/logic.test.js
git commit -m "feat: add sword drive payout resolution"
```

---

### Task 6: 実獲得換算（`toActualBalls`）と状態遷移（`createInitialState` / `applySpin`）

**Files:**
- Modify: `logic.js`
- Modify: `test/logic.test.js`

**設計メモ:** `state = { mode: 'normal'|'sr'|'wou', jitanRemaining: number }`。`applySpin(state)`は現在のmodeに応じたspin関数を呼び、outcomeに応じて新state・`{ nominal, actual }`払出を組み立てる。`actual = toActualBalls(nominal) = nominal * 14 / 15`（実獲得は公称払出の14/15、⑤参照）。時短消化中（miss）はjitanRemainingを1減らし、0になったら`normal`へ転落。normalモードはjitanRemainingを持たない（常に0）。

**outcome→新state/公称払出のマッピング（actualは全て`toActualBalls(nominal)`で導出）:**
- normal + `boku_no_hero`: mode='wou', jitanRemaining=70, nominal=`resolveSwordDrive(1500)`
- normal + `niR_53`: mode='sr', jitanRemaining=53, nominal=300
- normal + `niR_0`: mode='normal', jitanRemaining=0, nominal=300
- sr + `10R_no_kessui` / `10R_kessui_fail`: mode='sr', jitanRemaining=53, nominal=1500
- sr + `10R_kessui_success`: mode='wou', jitanRemaining=70, nominal=1500
- sr + `sake_hanatachi`: mode='wou', jitanRemaining=70, nominal=`resolveSwordDrive(1500)`
- wou + `10R`: mode='wou', jitanRemaining=70, nominal=1500
- wou + `sword_drive`: mode='wou', jitanRemaining=70, nominal=`resolveSwordDrive(0)`
- 各モードで`miss`: jitanRemainingを1減算。0未満にならなければ現modeを維持、0に達したら（normal以外で）`mode='normal', jitanRemaining=0`。normalの`miss`はそのまま`mode='normal', jitanRemaining=0`。nominal/actualともに0。

- [ ] **Step 1: 失敗するテストを書く（toActualBallsから）**

`test/logic.test.js`に追加:
```js
test('toActualBalls converts nominal payout to actual (14/15)', () => {
  assert.equal(logic.toActualBalls(300), 280);
  assert.equal(logic.toActualBalls(1500), 1400);
  assert.equal(logic.toActualBalls(3000), 2800);
  assert.equal(logic.toActualBalls(0), 0);
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm test`
Expected: FAIL（`toActualBalls`が関数でない）

- [ ] **Step 3: logic.jsに`toActualBalls`を追加**

`logic.js`の`module.exports`直前に追加:
```js
function toActualBalls(nominal) {
  return nominal - nominal / 15;
}
```

`module.exports`に`toActualBalls`を追加。

- [ ] **Step 4: テストを実行してパスを確認**

Run: `npm test`
Expected: PASS（22 tests）

- [ ] **Step 5: Commit**

```bash
git add logic.js test/logic.test.js
git commit -m "feat: add nominal-to-actual ball conversion"
```

- [ ] **Step 6: 失敗するテストを書く（applySpin）**

`test/logic.test.js`に追加:
```js
test('createInitialState starts in normal mode with 0 jitan', () => {
  assert.deepEqual(logic.createInitialState(), { mode: 'normal', jitanRemaining: 0 });
});

test('applySpin: normal miss stays in normal mode', () => {
  const state = logic.createInitialState();
  const { state: newState, outcome, nominal, actual } = withMockRandom([0.999], () => logic.applySpin(state));
  assert.equal(outcome, 'miss');
  assert.equal(nominal, 0);
  assert.equal(actual, 0);
  assert.deepEqual(newState, { mode: 'normal', jitanRemaining: 0 });
});

test('applySpin: normal niR_53 enters SR with 53 jitan and 300/280 payout', () => {
  const state = logic.createInitialState();
  const { state: newState, outcome, nominal, actual } = withMockRandom([0, 0.02], () => logic.applySpin(state));
  assert.equal(outcome, 'niR_53');
  assert.equal(nominal, 300);
  assert.equal(actual, 280);
  assert.deepEqual(newState, { mode: 'sr', jitanRemaining: 53 });
});

test('applySpin: normal boku_no_hero jumps to WoU with sword drive payout', () => {
  const state = logic.createInitialState();
  // hit(0) -> type draw(0, boku_no_hero) -> resolveSwordDrive(1500): route A(0.5), 0 hold hits
  const { state: newState, outcome, nominal, actual } = withMockRandom(
    [0, 0, 0.5, 0.5, 0.5, 0.5, 0.5],
    () => logic.applySpin(state)
  );
  assert.equal(outcome, 'boku_no_hero');
  assert.equal(nominal, 1500 + 1500);
  assert.equal(actual, logic.toActualBalls(3000));
  assert.deepEqual(newState, { mode: 'wou', jitanRemaining: 70 });
});

test('applySpin: SR miss decrements jitanRemaining and stays in SR', () => {
  const state = { mode: 'sr', jitanRemaining: 53 };
  const { state: newState, outcome } = withMockRandom([0.999], () => logic.applySpin(state));
  assert.equal(outcome, 'miss');
  assert.deepEqual(newState, { mode: 'sr', jitanRemaining: 52 });
});

test('applySpin: SR miss on last jitan spin falls back to normal', () => {
  const state = { mode: 'sr', jitanRemaining: 1 };
  const { state: newState, outcome } = withMockRandom([0.999], () => logic.applySpin(state));
  assert.equal(outcome, 'miss');
  assert.deepEqual(newState, { mode: 'normal', jitanRemaining: 0 });
});

test('applySpin: SR 10R_kessui_success moves to WoU with 1500/1400 payout', () => {
  const state = { mode: 'sr', jitanRemaining: 53 };
  const { state: newState, outcome, nominal, actual } = withMockRandom([0, 0.79], () => logic.applySpin(state));
  assert.equal(outcome, '10R_kessui_success');
  assert.equal(nominal, 1500);
  assert.equal(actual, 1400);
  assert.deepEqual(newState, { mode: 'wou', jitanRemaining: 70 });
});

test('applySpin: SR sake_hanatachi moves to WoU with sword drive payout including 1500 precedingBonus', () => {
  const state = { mode: 'sr', jitanRemaining: 53 };
  const { outcome, nominal, actual } = withMockRandom(
    [0, 0.999, 0.5, 0.5, 0.5, 0.5, 0.5],
    () => logic.applySpin(state)
  );
  assert.equal(outcome, 'sake_hanatachi');
  assert.equal(nominal, 1500 + 1500);
  assert.equal(actual, logic.toActualBalls(3000));
});

test('applySpin: WoU miss decrements jitanRemaining and stays in WoU', () => {
  const state = { mode: 'wou', jitanRemaining: 70 };
  const { state: newState, outcome } = withMockRandom([0.999], () => logic.applySpin(state));
  assert.equal(outcome, 'miss');
  assert.deepEqual(newState, { mode: 'wou', jitanRemaining: 69 });
});

test('applySpin: WoU sword_drive stays in WoU at 70 jitan with sword drive payout (no precedingBonus)', () => {
  const state = { mode: 'wou', jitanRemaining: 70 };
  const { outcome, nominal, actual, state: newState } = withMockRandom(
    [0, 0.999, 0.5, 0.5, 0.5, 0.5, 0.5],
    () => logic.applySpin(state)
  );
  assert.equal(outcome, 'sword_drive');
  assert.equal(nominal, 1500);
  assert.equal(actual, 1400);
  assert.deepEqual(newState, { mode: 'wou', jitanRemaining: 70 });
});
```

- [ ] **Step 7: テストを実行して失敗を確認**

Run: `npm test`
Expected: FAIL（`createInitialState`/`applySpin`が関数でない）

- [ ] **Step 8: logic.jsに実装を追加**

`logic.js`の`module.exports`直前に追加:
```js
function createInitialState() {
  return { mode: 'normal', jitanRemaining: 0 };
}

function fallbackState(mode, jitanRemaining) {
  if (jitanRemaining > 0) return { mode, jitanRemaining };
  return { mode: 'normal', jitanRemaining: 0 };
}

function buildResult(state, outcome, nominal) {
  return { state, outcome, nominal, actual: toActualBalls(nominal) };
}

function applySpin(state) {
  if (state.mode === 'normal') {
    const outcome = spinNormal();
    if (outcome === 'miss') {
      return buildResult({ mode: 'normal', jitanRemaining: 0 }, outcome, 0);
    }
    if (outcome === 'boku_no_hero') {
      const nominal = resolveSwordDrive(1500);
      return buildResult({ mode: 'wou', jitanRemaining: 70 }, outcome, nominal);
    }
    if (outcome === 'niR_53') {
      return buildResult({ mode: 'sr', jitanRemaining: 53 }, outcome, 300);
    }
    return buildResult({ mode: 'normal', jitanRemaining: 0 }, outcome, 300);
  }

  if (state.mode === 'sr') {
    const outcome = spinSr();
    if (outcome === 'miss') {
      return buildResult(fallbackState('sr', state.jitanRemaining - 1), outcome, 0);
    }
    if (outcome === '10R_no_kessui' || outcome === '10R_kessui_fail') {
      return buildResult({ mode: 'sr', jitanRemaining: 53 }, outcome, 1500);
    }
    if (outcome === '10R_kessui_success') {
      return buildResult({ mode: 'wou', jitanRemaining: 70 }, outcome, 1500);
    }
    const nominal = resolveSwordDrive(1500);
    return buildResult({ mode: 'wou', jitanRemaining: 70 }, outcome, nominal);
  }

  const outcome = spinWou();
  if (outcome === 'miss') {
    return buildResult(fallbackState('wou', state.jitanRemaining - 1), outcome, 0);
  }
  if (outcome === '10R') {
    return buildResult({ mode: 'wou', jitanRemaining: 70 }, outcome, 1500);
  }
  const nominal = resolveSwordDrive(0);
  return buildResult({ mode: 'wou', jitanRemaining: 70 }, outcome, nominal);
}
```

`module.exports`に`createInitialState, applySpin`を追加。

- [ ] **Step 9: テストを実行してパスを確認**

Run: `npm test`
Expected: PASS（32 tests）

- [ ] **Step 10: Commit**

```bash
git add logic.js test/logic.test.js
git commit -m "feat: add state transition via applySpin with nominal/actual payout"
```

---

### Task 7: 貸玉料金・回転数（`RENTAL_RATE_TABLE` / `calcBallsPerSpin`）

**Files:**
- Modify: `logic.js`
- Modify: `test/logic.test.js`

**設計メモ:** ホール公表値をそのままテーブルとして保持（⑥参照）。`calcBallsPerSpin(yenPerBall)`は該当レートの`(1000 / yenPerBall) / spinsPerThousandYen`を返す。

- [ ] **Step 1: 失敗するテストを書く**

`test/logic.test.js`に追加:
```js
test('RENTAL_RATE_TABLE lists the five published rates with balls-per-100-yen and spins-per-1000-yen', () => {
  assert.deepEqual(logic.RENTAL_RATE_TABLE, [
    { yenPerBall: 4.0, ballsPerHundredYen: 25, spinsPerThousandYen: 20.0 },
    { yenPerBall: 3.5, ballsPerHundredYen: 28, spinsPerThousandYen: 21.0 },
    { yenPerBall: 3.3, ballsPerHundredYen: 30, spinsPerThousandYen: 21.6 },
    { yenPerBall: 3.0, ballsPerHundredYen: 33, spinsPerThousandYen: 22.5 },
    { yenPerBall: 2.5, ballsPerHundredYen: 40, spinsPerThousandYen: 24.4 },
  ]);
  assert.equal(logic.DEFAULT_RENTAL_RATE, 4.0);
});

test('calcBallsPerSpin derives balls consumed per spin from the rate table', () => {
  assert.equal(logic.calcBallsPerSpin(4.0), (1000 / 4.0) / 20.0);
  assert.equal(logic.calcBallsPerSpin(2.5), (1000 / 2.5) / 24.4);
});

test('calcBallsPerSpin throws for a rate not in the table', () => {
  assert.throws(() => logic.calcBallsPerSpin(1.0));
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm test`
Expected: FAIL（`logic.RENTAL_RATE_TABLE`が`undefined`、`calcBallsPerSpin`が関数でない）

- [ ] **Step 3: logic.jsに実装を追加**

`logic.js`の`module.exports`直前に追加:
```js
const RENTAL_RATE_TABLE = [
  { yenPerBall: 4.0, ballsPerHundredYen: 25, spinsPerThousandYen: 20.0 },
  { yenPerBall: 3.5, ballsPerHundredYen: 28, spinsPerThousandYen: 21.0 },
  { yenPerBall: 3.3, ballsPerHundredYen: 30, spinsPerThousandYen: 21.6 },
  { yenPerBall: 3.0, ballsPerHundredYen: 33, spinsPerThousandYen: 22.5 },
  { yenPerBall: 2.5, ballsPerHundredYen: 40, spinsPerThousandYen: 24.4 },
];
const DEFAULT_RENTAL_RATE = 4.0;

function calcBallsPerSpin(yenPerBall) {
  const entry = RENTAL_RATE_TABLE.find((r) => r.yenPerBall === yenPerBall);
  if (!entry) throw new Error(`Unknown rental rate: ${yenPerBall}`);
  return (1000 / entry.yenPerBall) / entry.spinsPerThousandYen;
}
```

`module.exports`に`RENTAL_RATE_TABLE, DEFAULT_RENTAL_RATE, calcBallsPerSpin`を追加。

- [ ] **Step 4: テストを実行してパスを確認**

Run: `npm test`
Expected: PASS（35 tests）

- [ ] **Step 5: Commit**

```bash
git add logic.js test/logic.test.js
git commit -m "feat: add rental rate table and balls-per-spin calculation"
```

---

### Task 8: 最終確認

- [ ] **Step 1: 全テストを実行**

Run: `npm test`
Expected: PASS（全35テスト）

- [ ] **Step 2: logic.jsの`module.exports`が全公開関数・定数を含むことを目視確認**

以下がすべて`module.exports`に含まれていること: `P_NORMAL_HIT, rollNormalHitType, spinNormal, P_RUSH_HIT, rollSrHitType, spinSr, rollWouHitType, spinWou, SWORD_DRIVE_ROUTE_B_PROB, SWORD_DRIVE_ROUTE_B_BONUS_RATIO, HOLD_HIT_PROB, HOLD_COUNT, HOLD_HIT_BONUS, SWORD_DRIVE_BASE, resolveSwordDrive, toActualBalls, createInitialState, applySpin, RENTAL_RATE_TABLE, DEFAULT_RENTAL_RATE, calcBallsPerSpin`

- [ ] **Step 3: Commit（変更があれば）**

```bash
git add logic.js
git commit -m "chore: ensure all public logic functions are exported"
```
