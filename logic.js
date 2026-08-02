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
  };
}
