import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD_LEAD, COUNTDOWN, upNextTimes} from '../lib/upNext.js';

test('without credits the card comes CARD_LEAD before the end and the next episode follows the end', () => {
  assert.deepEqual(upNextTimes(1320, null), {from: 1320 - CARD_LEAD, at: 1320});
});

test('with credits the card comes as they start, and the next episode COUNTDOWN later', () => {
  assert.deepEqual(upNextTimes(1320, {start: 1250, end: 1320}), {from: 1250, at: 1250 + COUNTDOWN});
  assert.deepEqual(upNextTimes(1320, {start: 1315, end: Infinity}), {from: 1315, at: 1320});
});

test('credits marked in the first half, or past the end, are not believed; an unknown length offers nothing', () => {
  assert.equal(upNextTimes(1320, {start: 100, end: 200}).from, 1320 - CARD_LEAD);
  assert.equal(upNextTimes(1320, {start: 1400, end: 1500}).from, 1320 - CARD_LEAD);
  assert.equal(upNextTimes(0, null), null);
});
