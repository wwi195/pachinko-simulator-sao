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
