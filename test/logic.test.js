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

test('toActualBalls converts nominal payout to actual (14/15)', () => {
  assert.equal(logic.toActualBalls(300), 280);
  assert.equal(logic.toActualBalls(1500), 1400);
  assert.equal(logic.toActualBalls(3000), 2800);
  assert.equal(logic.toActualBalls(0), 0);
});

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
