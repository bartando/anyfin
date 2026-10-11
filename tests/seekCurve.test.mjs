import test from 'node:test';
import assert from 'node:assert/strict';
import {HOLD_MS, scrubRate} from '../lib/seekCurve.js';

test('a press shorter than the hold threshold does not scrub (it is a tap)', () => {
  assert.equal(scrubRate(1, HOLD_MS - 1), 0);
  assert.ok(scrubRate(1, HOLD_MS) > 0);
});

test('deeper is faster, at every moment of the hold', () => {
  for (const held of [HOLD_MS, 1000, 2000, 5000]) {
    let last = 0;
    for (let travel = 0.1; travel <= 1; travel += 0.1) {
      const rate = scrubRate(travel, held);
      assert.ok(rate > last, `travel ${travel.toFixed(1)} held ${held}`);
      last = rate;
    }
  }
});

test('a light press stays fine however long it is held; a full one gathers to ten minutes a second', () => {
  assert.ok(scrubRate(0.2, 60000) < 15);
  assert.ok(scrubRate(1, HOLD_MS) <= 40);
  assert.equal(scrubRate(1, 60000), 600);
  assert.ok(scrubRate(1, 1500) < scrubRate(1, 2500));
});

test('travel at or under the floor still creeps rather than stops while the button is held', () => {
  assert.ok(scrubRate(0, 1000) > 0);
  assert.ok(scrubRate(0, 1000) < 5);
});
