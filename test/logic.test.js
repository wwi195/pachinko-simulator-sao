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
