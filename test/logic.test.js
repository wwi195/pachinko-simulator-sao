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
