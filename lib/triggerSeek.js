import {HOLD_MS, TRAVEL_FLOOR, scrubRate} from './seekCurve.js';

/**
 * L2/R2 seeking from the framework's controller events (`press`, then a `frame` event every frame):
 * a press let go within HOLD_MS is `onTap(direction)`; held longer, `onScrub(seconds, rate)` every
 * frame and `onRelease()` at the end. A press lasts while the trigger is past TRAVEL_FLOOR, so
 * easing it off below the host's half-travel press keeps creeping instead of ending the scrub.
 * Time is the frames' own, so a scrub moves exactly as far as the frames it was held for.
 */
export function triggerSeek(handlers) {
  let press = null;

  const finish = () => {
    const ended = press;
    press = null;
    if (ended.scrubbing) handlers.onRelease();
    else handlers.onTap(ended.direction);
  };

  const step = (state, elapsedMs) => {
    const travel = state[press.trigger] ?? 0;
    if (!(travel > TRAVEL_FLOOR || state.buttons.includes(press.trigger))) return finish();
    const before = press.heldMs;
    press.heldMs += elapsedMs;
    if (press.heldMs < HOLD_MS) return undefined;
    press.scrubbing = true;
    const rate = scrubRate(travel, press.heldMs);
    // The first scrubbing frame counts only the time past HOLD_MS.
    handlers.onScrub(press.direction * rate * (press.heldMs - Math.max(before, HOLD_MS)) / 1000, rate);
    return undefined;
  };

  return {
    /** A controller event (useControllerEvents with frames). */
    event(event) {
      if (event.type === 'press' && (event.button === 'l2' || event.button === 'r2')) {
        // The other trigger pressed mid-press ends this one first.
        if (press) finish();
        press = {direction: event.button === 'l2' ? -1 : 1, trigger: event.button, heldMs: 0, scrubbing: false, fresh: true};
      } else if (event.type === 'frame' && press) {
        // The frame a press arrives in passed before it.
        if (press.fresh) press.fresh = false;
        else step(event.state, event.elapsedMs);
      }
    },
    /** Ends a press as if let go, when seeking is turned off under it (the panel opened). */
    cancel() {
      if (press) finish();
    },
  };
}
