import test from 'node:test';
import assert from 'node:assert/strict';
import {HOLD_MS} from '../lib/seekCurve.js';
import {triggerSeek} from '../lib/triggerSeek.js';

const state = (trigger, travel) => ({l2: 0, r2: 0, [trigger]: travel, buttons: travel > 0.5 ? [trigger] : []});

function recorder() {
  const calls = [];
  const seek = triggerSeek({
    onTap: direction => calls.push(['tap', direction]),
    onScrub: (seconds, rate) => calls.push(['scrub', seconds, rate]),
    onRelease: () => calls.push(['release']),
  });
  const frame = (trigger, travel, ms = 16) => seek.event({type: 'frame', elapsedMs: ms, state: state(trigger, travel)});
  const press = trigger => seek.event({type: 'press', button: trigger, state: state(trigger, 1)});
  return {calls, seek, frame, press};
}

test('a press let go before HOLD_MS is a tap, whichever way', () => {
  const {calls, frame, press} = recorder();
  press('l2');
  frame('l2', 1);
  for (let i = 0; i < 5; i++) frame('l2', 1);
  frame('l2', 0);
  press('r2');
  frame('r2', 1);
  frame('r2', 0);
  assert.deepEqual(calls, [['tap', -1], ['tap', 1]]);
});

test('held, it scrubs by frame time past HOLD_MS, keeps creeping under the half-travel press, and ends on letting go', () => {
  const {calls, frame, press} = recorder();
  press('r2');
  frame('r2', 1); // the frame the press arrived in
  let held = 0;
  while (held + 20 < HOLD_MS) { frame('r2', 1, 20); held += 20; }
  assert.deepEqual(calls, [], 'not yet a hold');
  frame('r2', 1, 20); // crosses HOLD_MS by held + 20 - HOLD_MS
  const [, seconds, rate] = calls[0];
  assert.ok(Math.abs(seconds - rate * (held + 20 - HOLD_MS) / 1000) < 1e-9, 'only the time past HOLD_MS counts');
  frame('r2', 0.3, 16); // eased off below the press threshold: still scrubbing, slower
  assert.equal(calls.length, 2);
  assert.ok(calls[1][2] < rate);
  frame('r2', 0.05);
  assert.deepEqual(calls.at(-1), ['release']);
  assert.equal(calls.length, 3);
});

test('the other trigger pressed mid-scrub ends the first, and cancel ends a press as if let go', () => {
  const {calls, seek, frame, press} = recorder();
  press('r2');
  frame('r2', 1);
  frame('r2', 1, HOLD_MS + 100);
  press('l2');
  assert.deepEqual(calls.map(call => call[0]), ['scrub', 'release']);
  seek.cancel();
  assert.deepEqual(calls.at(-1), ['tap', -1]);
  seek.cancel();
  frame('l2', 1);
  assert.equal(calls.length, 3, 'nothing pressed after a cancel');
});
