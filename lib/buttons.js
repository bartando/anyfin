import {Platform} from '@ps5-react/core';
import {remote} from './remote.js';

// The controller's buttons as this device names them, for hints: a DualSense's on the PS5 and the
// desktop, a Joy-Con's on the Switch (its A, B, X and Y sit where Cross, Circle, Triangle and Square do),
// none on Android TV's remote.
export const nintendo = Platform.OS === 'switch';
const NINTENDO = {l1: 'L', r1: 'R', l2: 'ZL', r2: 'ZR', options: '+', cross: 'A', circle: 'B', triangle: 'X', square: 'Y'};

/** `button` ('l1', 'r2', 'options' ...) as this device names it ('L1', or 'L' on the Switch); null where it has none. */
export function buttonName(button) {
  if (remote) return null;
  return nintendo ? NINTENDO[button] ?? null : button.toUpperCase();
}

// A device with a touchscreen gets targets a finger can hit (about 9 mm on a phone; 64 logical px on
// the Switch's 6.2-inch screen), where a TV's are sized for focus.
export const touchscreen = nintendo;
