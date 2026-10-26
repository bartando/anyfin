import {useEffect, useRef} from 'react';
import {Controller, useControllerEvents} from '@react-on-anything/core';
import {FAST_FROM} from '../../lib/seekCurve.js';
import {triggerSeek} from '../../lib/triggerSeek.js';

const RESISTANCE = 0.35;

/**
 * L2 and R2 as seek triggers while `enabled` (lib/triggerSeek.js): tapped, `onTap(direction)`; held,
 * `onScrub(seconds, rate)` every frame at a speed the trigger's travel sets, and `onRelease()` at the
 * end. While `enabled` and `feedback`, both triggers resist from FAST_FROM of their travel, where
 * scrubbing turns fast.
 */
export function useTriggerSeek({enabled, feedback, onTap, onScrub, onRelease}) {
  const handlers = useRef(null);
  handlers.current = {onTap, onScrub, onRelease};
  const seek = useRef(null);
  seek.current ??= triggerSeek({
    onTap: direction => handlers.current.onTap(direction),
    onScrub: (seconds, rate) => handlers.current.onScrub(seconds, rate),
    onRelease: () => handlers.current.onRelease(),
  });

  useEffect(() => {
    if (!enabled || !feedback) return undefined;
    Controller.setTriggerEffect('both', {type: 'resistance', from: FAST_FROM, strength: RESISTANCE});
    return () => Controller.setTriggerEffect('both', {type: 'off'});
  }, [enabled, feedback]);

  // Turned off mid-press (the panel opened), the press ends as if let go.
  useEffect(() => {
    if (!enabled) seek.current.cancel();
  }, [enabled]);

  useControllerEvents(enabled ? event => seek.current.event(event) : null, {frames: true});
}
