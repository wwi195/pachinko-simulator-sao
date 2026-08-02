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

function rollWouHitType() {
  const r = Math.random() * 100;
  if (r < 60.0) return '10R';
  return 'sword_drive';
}

function spinWou() {
  if (Math.random() < P_RUSH_HIT) return rollWouHitType();
  return 'miss';
}

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

function toActualBalls(nominal) {
  return nominal - nominal / 15;
}

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    P_NORMAL_HIT,
    rollNormalHitType,
    spinNormal,
    P_RUSH_HIT,
    rollSrHitType,
    spinSr,
    rollWouHitType,
    spinWou,
    SWORD_DRIVE_ROUTE_B_PROB,
    SWORD_DRIVE_ROUTE_B_BONUS_RATIO,
    HOLD_HIT_PROB,
    HOLD_COUNT,
    HOLD_HIT_BONUS,
    SWORD_DRIVE_BASE,
    resolveSwordDrive,
    toActualBalls,
    createInitialState,
    applySpin,
  };
}
