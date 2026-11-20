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
  wouEntryCount: 0,
  totalRushHits: 0,
  rushAllStats: { totalSpins: 0 },
  rush: null,
  pending: {},
  eigyoAlertShown: false,
  detailsExpanded: false,
  swordDriveClicks: 0,
  lastRankResult: null,
  hitHistory: [], // 大当たり履歴 [{games, chain}]（新しい順。chain=null はRUSH結果待ち、0はRUSHなし）
  log: [],
};

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
  recordSlump();
}

function addBalls(n) {
  game.mochiDama += n;
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
  game.hitHistory.unshift({ games: interval, chain: outcome === 'niR_0' ? 0 : null });
  game.currentSpins = 0;
  game.lastHitSpins = game.totalSpins;

  if (outcome === 'niR_53' || outcome === 'niR_0') {
    const nominal = 300;
    const actual = toActualBalls(nominal);
    game.pending = { outcome, nominal, actual, interval };
    addLog(`${interval}回転で大当たり！ 2R ＋${actual}球`, 'win');
    setState('rush_judge');
    return true;
  }

  // boku_no_hero: WoU直行（ソードドライブ演出、先付け1500）
  const nominal = resolveSwordDrive(1500);
  const actual = toActualBalls(nominal);
  game.rush = { logicState: { mode: 'wou', jitanRemaining: 70 }, totalHits: 0, nominalBalls: nominal, actualBalls: actual, cycleSpins: 0 };
  game.mode = 'wou';
  game.rushEntryCount++;
  game.wouEntryCount++;
  game.pending = { outcome: 'boku_no_hero', nominal, actual, interval };
  addLog(`${interval}回転で大当たり！ ぼくの英雄 ＋${actual}球`, 'win');
  setState('sword_drive_intro');
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

function handleRushJudge() {
  const { outcome, nominal, actual } = game.pending;
  addBalls(actual);
  if (outcome === 'niR_53') {
    game.rush = { logicState: { mode: 'sr', jitanRemaining: 53 }, totalHits: 0, nominalBalls: nominal, actualBalls: actual, cycleSpins: 0 };
    game.mode = 'sr';
    game.rushEntryCount++;
    game.pending = { nominal, actual };
    addLog('SWORD RUSH獲得！', 'rush');
    setState('sword_rush_acquired');
    setTimeout(() => setState('sr_idle'), 1400);
  } else {
    game.pending = { nominal, actual };
    addLog('突入ならず');
    setState('rush_entry_failed');
    setTimeout(() => backToNormal(), 600);
  }
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
      // 初当たりを1連目として数える（RUSH中の当たり回数＋1）
      const last = game.hitHistory[0];
      if (last && last.chain === null) last.chain = game.rush.totalHits + 1;
      game.lastRankResult = recordRanking(Math.round(game.rush.actualBalls), game.rush.totalHits + 1);
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
      outcome: 'sake_hanatachi',
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

function handleRushHitContinue() {
  if (!game.pending.hasKessui) {
    if (game.pending.leadsToSwordDrive) {
      setState('sword_drive_blackout');
      setTimeout(() => setState('sword_drive_intro'), 1000);
    } else {
      setState(game.rush.logicState.mode === 'sr' ? 'sr_idle' : 'wou_idle');
    }
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
        addLog(`咲け、花たち ＋${game.pending.finalActual}球`, 'rush');
        setState('sword_drive_intro');
      }, 1400);
    } else {
      setState('wou_idle');
    }
  }, 1400);
}

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

function handleSwordDriveRevealContinue() {
  game.swordDriveClicks = 0;
  setState('wou_idle');
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
  game.wouEntryCount = 0;
  game.totalRushHits = 0;
  game.rushAllStats = { totalSpins: 0 };
  game.rush = null;
  game.pending = {};
  game.eigyoAlertShown = false;
  game.detailsExpanded = false;
  game.swordDriveClicks = 0;
  game.lastRankResult = null;
  game.slump = [{ x: 0, y: 0 }];
  game.log = [];
  game.hitHistory = [];
  render();
}

// ---- 状態セット & レンダリング ----

function setState(state) {
  game.state = state;
  render();
}

// ---- 大当たり履歴グラフ ----
const HIST_BLOCK = 100;
const HIST_MAX_BLOCKS = 7;
function renderHitGraph() {
  const el = document.getElementById('hist-cols');
  if (!el) return;
  const col = (cls, games, label, idx) => {
    const blocks = Math.min(HIST_MAX_BLOCKS, Math.max(1, Math.ceil(games / HIST_BLOCK)));
    const more = games >= HIST_BLOCK * HIST_MAX_BLOCKS ? '<div class="hist-more">▲</div>' : '';
    return `<div class="hist-col ${cls}">
      <div class="hist-g">${games}</div>${more}
      ${'<div class="hist-block"></div>'.repeat(blocks)}
      <div class="hist-type">${label}</div>
      <div class="hist-idx">${idx}</div>
    </div>`;
  };
  let html = col('now', game.currentSpins, '現在', '');
  game.hitHistory.forEach((h, i) => {
    let cls, label;
    if (h.chain === null) { cls = 'pending'; label = '…'; }
    else if (h.chain >= 1) { cls = h.chain >= 10 ? 'big-chain' : 'rush'; label = `${h.chain}連`; }
    else { cls = 'zugar'; label = '単発'; }
    html += col(cls, h.games, label, i + 1);
  });
  if (game.hitHistory.length === 0) html += '<div class="hist-empty">まだ大当たりがありません</div>';
  el.innerHTML = html;
}

// ---- 差玉推移グラフ ----
// 差玉 = 持ち玉 − 投資玉（投資は貸玉レートで玉に換算）。横軸は通常時の総回転数
function currentDiffBalls() {
  return Math.round(game.mochiDama - game.toushi / game.rentalRate);
}
function recordSlump() {
  if (!game.slump) game.slump = [{ x: 0, y: 0 }];
  const y = currentDiffBalls();
  const pts = game.slump;
  const last = pts[pts.length - 1];
  if (last.x === game.totalSpins && last.y === y) return;
  pts.push({ x: game.totalSpins, y });
  if (pts.length > 40000) game.slump = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1);
}
function slumpNiceStep(range) {
  const raw = range / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}
function renderSlumpGraph() {
  const el = document.getElementById('slump-svg');
  if (!el) return;
  recordSlump();
  const pts = game.slump;
  const W = 360, H = 170, L = 46, R = 8, T = 10, B = 22;
  const maxX = Math.max(100, pts[pts.length - 1].x);
  let minY = 0, maxY = 0;
  pts.forEach((p) => { if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; });
  if (maxY - minY < 1000) { maxY += 500; minY -= 500; }
  const step = slumpNiceStep(maxY - minY);
  minY = Math.floor(minY / step) * step;
  maxY = Math.ceil(maxY / step) * step;
  const sx = (x) => L + (x / maxX) * (W - L - R);
  const sy = (y) => T + (1 - (y - minY) / (maxY - minY)) * (H - T - B);
  let grid = '';
  for (let v = minY; v <= maxY + 1e-9; v += step) {
    const y = sy(v).toFixed(1);
    grid += `<line x1="${L}" y1="${y}" x2="${W - R}" y2="${y}" class="${v === 0 ? 'sl-zero' : 'sl-grid'}"/>`;
    grid += `<text x="${L - 4}" y="${(+y + 3).toFixed(1)}" class="sl-ylab">${v.toLocaleString()}</text>`;
  }
  const xStep = slumpNiceStep(maxX);
  for (let v = 0; v <= maxX + 1e-9; v += xStep) {
    const anchor = sx(v) > W - R - 16 ? ' style="text-anchor:end"' : '';
    grid += `<text x="${sx(v).toFixed(1)}" y="${H - 6}" class="sl-xlab"${anchor}>${v.toLocaleString()}</text>`;
  }
  const maxPts = (W - L - R) * 2;
  const stride = Math.max(1, Math.floor(pts.length / maxPts));
  const line = pts.filter((_, i) => i % stride === 0 || i === pts.length - 1)
    .map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const cur = pts[pts.length - 1];
  const cls = cur.y >= 0 ? 'plus' : 'minus';
  // 0より上はプラス色、下はマイナス色で塗り分ける
  const zeroOff = Math.min(1, Math.max(0, (sy(0) - T) / (H - T - B))).toFixed(4);
  el.innerHTML = `<defs><linearGradient id="sl-grad" gradientUnits="userSpaceOnUse" x1="0" y1="${T}" x2="0" y2="${H - B}">
      <stop offset="${zeroOff}" stop-color="#2e9e5e"/><stop offset="${zeroOff}" stop-color="#d64545"/>
    </linearGradient></defs>
    ${grid}
    <polyline points="${line}" class="sl-line" stroke="url(#sl-grad)"/>
    <circle cx="${sx(cur.x).toFixed(1)}" cy="${sy(cur.y).toFixed(1)}" r="3" class="sl-dot ${cls}"/>`;
  document.getElementById('slump-now').innerHTML =
    `現在 <b class="${cls}">${cur.y >= 0 ? '+' : ''}${cur.y.toLocaleString()}玉</b>（${game.totalSpins.toLocaleString()}回転）`;
}

function render() {
  renderHeader();
  renderModeBadge();
  renderMainScreen();
  renderRushStats();
  renderHitGraph();
  document.getElementById('sword-drive-overlay').style.display = game.state === 'sword_drive_blackout' ? 'block' : 'none';
  renderSlumpGraph();
}

function handleToggleDetails() {
  game.detailsExpanded = !game.detailsExpanded;
  render();
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
  document.getElementById('wou-entry-count').textContent = game.wouEntryCount + '回';

  document.getElementById('hrow2-detail').style.display = game.detailsExpanded ? 'flex' : 'none';
  document.getElementById('details-toggle').textContent = game.detailsExpanded ? '詳細▴' : '詳細▾';
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

function tenThousandYenSpins() {
  const entry = RENTAL_RATE_TABLE.find((r) => r.yenPerBall === game.rentalRate);
  return Math.round(entry.spinsPerThousandYen * 10);
}

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
        <div class="auto-spin-btns">
          <div class="auto-spin-wrap">
            <button class="btn-auto" onclick="autoSpin(${tenThousandYenSpins()})">1万円分回す</button>
            <p class="spin-cost-hint">約${tenThousandYenSpins()}回転分</p>
          </div>
        </div>
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

    case 'lose_result':
      return `<div class="screen">
        <p class="result-main lose">はずれ</p>
        <button class="btn-sub" onclick="backToNormal()" style="margin-top:8px;">続ける</button>
      </div>`;

    case 'sword_drive_blackout':
      return '';

    case 'sword_drive_intro': {
      const clicksRemaining = 4 - game.swordDriveClicks;
      return `<div class="screen">
        <button class="sword-drive-attack-btn" onclick="handleSwordDriveAttack()">SWORD DRIVEを狙え</button>
        <p class="sword-drive-progress">あと${clicksRemaining}回</p>
      </div>`;
    }

    case 'sword_drive_reveal': {
      const { outcome, nominal } = game.pending;
      const label = SWORD_DRIVE_LABELS[outcome] || outcome;
      const str = String(nominal);
      const lastTwo = str.slice(-2);
      const hundredsDigit = str.slice(-3, -2);
      const thousandsPart = str.slice(0, -3);
      return `<div class="screen">
        <p class="sword-drive-outcome-label">${label}</p>
        <p class="sword-drive-title">SWORD DRIVE</p>
        <p class="sword-drive-amount">
          <span class="digit-thousands">${thousandsPart}</span><span class="digit-hundreds">${hundredsDigit}</span><span class="digit-fixed">${lastTwo}</span>発獲得
        </p>
        <button class="btn-action" onclick="handleSwordDriveRevealContinue()" style="margin-top:16px;">▶ 次へ</button>
      </div>`;
    }

    case 'sr_idle':
    case 'wou_idle': {
      const skipDisabled = game.rush.logicState.jitanRemaining <= 10;
      const swordRushLabel = game.mode === 'sr' ? '<p class="sword-rush-label">SWORD RUSH</p>' : '';
      return `<div class="screen">
        ${swordRushLabel}
        <p class="chain-label">${game.rush.totalHits + 1}連チャン中</p>
        <p class="rush-sub">獲得出玉 <span>${game.rush.nominalBalls.toLocaleString()}</span> 個</p>
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
      const { nominal, actual, spinsThisCycle, hasKessui } = game.pending;
      const kessuiLabel = hasKessui ? '<p class="judge-label">決意の刃発生！</p>' : '';
      const buttonLabel = hasKessui ? 'ジャッジ' : '▶ 次へ';
      return `<div class="screen">
        <p class="result-sub">${spinsThisCycle}回転で当選</p>
        <p class="chain-label">${game.rush.totalHits + 1}連チャン中</p>
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

    case 'sr_miss':
    case 'wou_miss':
      return `<div class="screen">
        <p class="result-main lose">外れ</p>
        <p style="color:var(--c-ruri); font-size:18px; margin-top:4px;">残り ${game.rush.logicState.jitanRemaining}回</p>
        <button class="btn-sub" onclick="handleRushMissContinue()" style="margin-top:12px;">続ける</button>
      </div>`;

    case 'rush_result': {
      const r = game.rush;
      const rank = game.lastRankResult;
      return `<div class="screen">
        <p class="rush-result-title">RUSH リザルト</p>
        <div class="rush-result-box">
          <div class="result-row highlight">
            <span class="rr-label">連チャン数（初当たり含む）</span>
            <span class="rr-val gold">${r.totalHits + 1}連</span>
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

    case 'eigyo_alert':
      return `<div class="screen">
        <p style="font-size:22px; font-weight:bold; color:var(--c-ruri); text-align:center; line-height:1.6;">
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
