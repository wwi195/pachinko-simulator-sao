# SWORD DRIVE「狙え」演出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ぼくの英雄／咲け花たち／WoU中神器解放SWORD DRIVEの3経路すべてで、既存の`sword_drive_result`一括表示を「SWORD DRIVEを狙え」ボタン4回クリック→数字発表演出に置き換える。

**Architecture:** `resolveSwordDrive()`はすでに各経路で呼び出し済みの真の金額をそのまま使う（`logic.js`は無変更）。的中数の内訳は表示せず、4回クリック後に真の合計金額だけを発表することでルートA/Bの判別不能性を回避する。3経路すべてが不要にする`sword_drive_result`/`rush_cutin`/`handleSwordDriveContinue`/`handleRushCutinContinue`は削除する。

**Tech Stack:** Vanilla JS/CSS。ビルド不要。

---

### Task 1: style.css — SWORD DRIVE演出用スタイル追加

**Files:**
- Modify: `style.css`

- [ ] **Step 1: ファイル末尾に追加**

```css

/* SWORD DRIVE演出 */
.sword-drive-attack-btn {
  padding: 18px 36px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--c-ruri), var(--c-black));
  border: 2px solid var(--c-mizu);
  font-size: 20px;
  font-weight: bold;
  color: var(--c-white);
  letter-spacing: 2px;
  cursor: pointer;
  animation: swordDriveFadeIn 1.5s ease;
}
@keyframes swordDriveFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.sword-drive-progress { font-size: 12px; color: #999; }

.sword-drive-outcome-label { font-size: 13px; color: #999; }

.sword-drive-title {
  font-size: 30px;
  font-weight: bold;
  letter-spacing: 3px;
  color: var(--c-sword-red);
  text-shadow: 0 2px 8px rgba(192,32,60,0.4);
}

.sword-drive-amount { font-size: 34px; font-weight: bold; color: var(--c-ruri); }

.digit-thousands, .digit-rest {
  display: inline-block;
  opacity: 0;
  animation: digitDrop 0.5s ease forwards;
}
.digit-thousands { animation-delay: 0.2s; }
.digit-rest      { animation-delay: 0.9s; }
@keyframes digitDrop {
  from { opacity: 0; transform: translateY(-16px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "feat: add SWORD DRIVE attack/reveal styles"
```

---

### Task 2: script.js — 3経路の接続変更・死んだコード削除

**Files:**
- Modify: `script.js`

- [ ] **Step 1: `game`に`swordDriveClicks`を追加**

以下を:
```js
  eigyoAlertShown: false,
  detailsExpanded: false,
  log: [],
};
```

以下に置き換える:
```js
  eigyoAlertShown: false,
  detailsExpanded: false,
  swordDriveClicks: 0,
  log: [],
};
```

- [ ] **Step 2: `runNormalSpin`のぼくの英雄分岐を、WoU突入セットアップを即時実行し`sword_drive_intro`へ向かうよう変更**

以下を:
```js
  // boku_no_hero: WoU直行（ソードドライブ演出、先付け1500）
  const nominal = resolveSwordDrive(1500);
  const actual = toActualBalls(nominal);
  addBalls(actual);
  game.pending = { outcome: 'boku_no_hero', nominal, actual, interval, promote: true };
  addLog(`${interval}回転で大当たり！ ぼくの英雄 ＋${actual}球`, 'win');
  setState('sword_drive_result');
  return true;
}
```

以下に置き換える:
```js
  // boku_no_hero: WoU直行（ソードドライブ演出、先付け1500）
  const nominal = resolveSwordDrive(1500);
  const actual = toActualBalls(nominal);
  addBalls(actual);
  game.rush = { logicState: { mode: 'wou', jitanRemaining: 70 }, totalHits: 0, nominalBalls: 0, actualBalls: 0, cycleSpins: 0 };
  game.mode = 'wou';
  game.rushEntryCount++;
  game.wouEntryCount++;
  game.pending = { outcome: 'boku_no_hero', nominal, actual, interval };
  addLog(`${interval}回転で大当たり！ ぼくの英雄 ＋${actual}球`, 'win');
  setState('sword_drive_intro');
  return true;
}
```

- [ ] **Step 3: 不要になった`handleSwordDriveContinue`・`handleRushCutinContinue`を削除**

以下を:
```js
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
    game.wouEntryCount++;
    game.pending = { cutinLabel: 'WoU直行', cutinSub: 'War of Underworld' };
  } else {
    // sake_hanatachi: SRからWoUへ移行
    game.mode = 'wou';
    game.wouEntryCount++;
    game.pending = { cutinLabel: 'WoU移行', cutinSub: 'War of Underworld' };
  }
  addLog(`${game.pending.cutinLabel}！`, 'rush');
  setState('rush_cutin');
}

function handleRushCutinContinue() {
  setState(game.rush.logicState.mode === 'sr' ? 'sr_idle' : 'wou_idle');
}

function backToNormal() {
```

以下に置き換える:
```js
function backToNormal() {
```

- [ ] **Step 4: 咲け花たち最終遷移を`sword_drive_result`から`sword_drive_intro`へ変更**

以下を:
```js
      setState('sake_hanatachi_reveal');
      setTimeout(() => {
        const { finalNominal, finalActual, spinsThisCycle } = game.pending;
        game.pending = { outcome: 'sake_hanatachi', nominal: finalNominal, actual: finalActual, spinsThisCycle };
        addLog(`咲け、花たち ＋${finalActual}球`, 'rush');
        setState('sword_drive_result');
      }, 1400);
```

以下に置き換える:
```js
      setState('sake_hanatachi_reveal');
      setTimeout(() => {
        const { finalNominal, finalActual, spinsThisCycle } = game.pending;
        game.pending = { outcome: 'sake_hanatachi', nominal: finalNominal, actual: finalActual, spinsThisCycle };
        addLog(`咲け、花たち ＋${finalActual}球`, 'rush');
        setState('sword_drive_intro');
      }, 1400);
```

- [ ] **Step 5: `runRushSpin`のWoU中`sword_drive`分岐を、1500ボーナス画面経由に変更**

以下を:
```js
  // sword_drive（WoU中のみ、既存動作は変更なし）
  game.pending = { outcome, nominal, actual, spinsThisCycle, promote: false };
  addLog(`${spinsThisCycle}回転で当選！ ${SWORD_DRIVE_LABELS[outcome]} ＋${actual}球`, 'rush');
  setState('sword_drive_result');
  return true;
}
```

以下に置き換える:
```js
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

- [ ] **Step 6: `handleRushHitContinue`の`!hasKessui`分岐に`leadsToSwordDrive`判定を追加**

以下を:
```js
function handleRushHitContinue() {
  if (!game.pending.hasKessui) {
    setState(game.rush.logicState.mode === 'sr' ? 'sr_idle' : 'wou_idle');
    return;
  }
```

以下に置き換える:
```js
function handleRushHitContinue() {
  if (!game.pending.hasKessui) {
    if (game.pending.leadsToSwordDrive) {
      setState('sword_drive_intro');
    } else {
      setState(game.rush.logicState.mode === 'sr' ? 'sr_idle' : 'wou_idle');
    }
    return;
  }
```

- [ ] **Step 7: `handleSwordDriveAttack`・`handleSwordDriveRevealContinue`を追加（`handleRushSpin`の直前に挿入）**

以下を:
```js
function handleRushSpin() {
  runRushSpin();
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
  if (game.pending.finalNominal !== undefined) {
    game.pending = { outcome: game.pending.outcome, nominal: game.pending.finalNominal, actual: game.pending.finalActual };
  }
  setState('sword_drive_reveal');
}

function handleSwordDriveRevealContinue() {
  game.swordDriveClicks = 0;
  setState('wou_idle');
}

function handleRushSpin() {
  runRushSpin();
}
```

- [ ] **Step 8: `resetGame`に`swordDriveClicks`のリセットを追加**

以下を:
```js
  game.eigyoAlertShown = false;
  game.detailsExpanded = false;
  game.log = [];
  render();
}
```

以下に置き換える:
```js
  game.eigyoAlertShown = false;
  game.detailsExpanded = false;
  game.swordDriveClicks = 0;
  game.log = [];
  render();
}
```

- [ ] **Step 9: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 10: Commit**

```bash
git add script.js
git commit -m "feat: route all 3 sword-drive triggers through new attack flow, remove dead cutin code"
```

---

### Task 3: script.js — buildScreenの画面追加・不要ケース削除

**Files:**
- Modify: `script.js`

- [ ] **Step 1: `case 'sword_drive_result'`と`case 'rush_cutin'`を削除し、`sword_drive_intro`/`sword_drive_reveal`を追加**

以下を:
```js
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
        <p class="rush-title">${cutinSub}</p>
        <button class="btn-action" onclick="handleRushCutinContinue()">▶ 次へ</button>
      </div>`;
    }
```

以下に置き換える:
```js
    case 'sword_drive_intro': {
      const clicksRemaining = 4 - game.swordDriveClicks;
      return `<div class="screen">
        <button class="sword-drive-attack-btn" onclick="handleSwordDriveAttack()">SWORD DRIVEを狙え</button>
        <p class="sword-drive-progress">あと${clicksRemaining}回</p>
      </div>`;
    }

    case 'sword_drive_reveal': {
      const { outcome, nominal, actual } = game.pending;
      const label = SWORD_DRIVE_LABELS[outcome] || outcome;
      const thousands = Math.floor(nominal / 1000);
      const rest = String(nominal % 1000).padStart(3, '0');
      return `<div class="screen">
        <p class="sword-drive-outcome-label">${label}</p>
        <p class="sword-drive-title">SWORD DRIVE</p>
        <p class="sword-drive-amount">
          <span class="digit-thousands">${thousands}</span><span class="digit-rest">${rest}</span>発獲得
        </p>
        <p class="bonus-sub">＋${actual.toLocaleString()}球</p>
        <button class="btn-action" onclick="handleSwordDriveRevealContinue()" style="margin-top:16px;">▶ 次へ</button>
      </div>`;
    }
```

- [ ] **Step 2: 構文確認**

Run: `node --check script.js`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "feat: add sword_drive_intro/sword_drive_reveal screens, remove sword_drive_result/rush_cutin"
```

---

### Task 4: ブラウザ動作確認

**Files:** なし（確認のみ）

- [ ] **Step 1: ローカルサーバーを起動してブラウザで確認**

```bash
cd /c/Users/ab_99/pachinko-simulator-sao && npx http-server -p 8089 -c-1 &
```

Math.randomをモックして3経路それぞれを発生させ、以下を確認する:
- **ぼくの英雄**: 通常時当選（boku_no_hero）→ 直接`sword_drive_intro`（「WoU直行」等の告知なし）→ 4回クリック → `sword_drive_reveal`で「ぼくの英雄」ラベル＋真の金額発表 → 次へ → `wou_idle`
- **咲け花たち**: SR中決意の刃成功→成功！WoUへ→レインボー咲け花たち→`sword_drive_intro`→4回クリック→`sword_drive_reveal`で「咲け、花たち」ラベル＋真の金額発表→次へ→`wou_idle`
- **WoU中神器解放SWORD DRIVE**: WoU中当選→「1500ボーナス」画面（決意の刃表示なし、ボタン「▶次へ」）→ 次へ押下 → 白背景に「SWORD DRIVEを狙え」ボタン → 4回クリック → `sword_drive_reveal`で「神器解放SWORD DRIVE」ラベル＋真の金額発表 → 次へ → `wou_idle`
- WoU中の通常「10R」（sword_driveでない60%）は従来通り`sr_hit_result`→即座に`wou_idle`のまま変わらないこと
- コンソールにJSエラーが出ていないこと（特に`handleSwordDriveContinue`/`handleRushCutinContinue`/`sword_drive_result`/`rush_cutin`への参照が残っていないこと）

- [ ] **Step 2: サーバーを停止**

```bash
kill %1
```

- [ ] **Step 3: 動作確認完了を報告**

問題があれば該当箇所を修正し、再度Step 1から確認する。
