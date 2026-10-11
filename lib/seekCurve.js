// How L2/R2 seek: a tap jumps the seek step, a hold scrubs. Held, the trigger's travel sets the speed
// (a light press creeps, a full one runs), and a full press speeds up the longer it is held, so a
// minute and the other end of a film are both a single press away.

export const TRAVEL_FLOOR = 0.08; // less travel than this is a trigger let go
export const HOLD_MS = 250;       // a press let go sooner is a tap
export const FAST_FROM = 0.6;     // where the resistance starts: past it, scrubbing is fast

const CREEP = 4;      // film seconds a second, barely pressed
const START = 40;     // fully pressed, as the hold begins
const TOP = 600;      // fully pressed, held RAMP_MS
const RAMP_MS = 3000;

const clamp01 = value => Math.min(1, Math.max(0, value));

/** Film seconds a second for a trigger at `travel` (0–1) held `heldMs`; 0 before it counts as held. */
export function scrubRate(travel, heldMs) {
  if (heldMs < HOLD_MS) return 0;
  const depth = clamp01((travel - TRAVEL_FLOOR) / (1 - TRAVEL_FLOOR));
  const ramp = clamp01((heldMs - HOLD_MS) / RAMP_MS);
  // Squared both ways: the first part of the travel and of the hold stay fine, the rest gathers.
  const full = START + (TOP - START) * ramp * ramp;
  return CREEP + (full - CREEP) * depth * depth;
}
