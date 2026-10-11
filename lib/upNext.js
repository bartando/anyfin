// When an episode offers the next one. With a credits marker the card comes up as they start and the
// next episode follows COUNTDOWN seconds later, skipping the rest of them; without one, it comes up
// CARD_LEAD seconds before the end and the next episode follows the end.

export const CARD_LEAD = 30;
export const COUNTDOWN = 10;

/**
 * {from, at}: the film time the card shows from and the time the next episode starts by itself, or
 * null while the length is unknown. A credits marker in the first half of the film is not believed.
 */
export function upNextTimes(duration, outro) {
  if (!(duration > 0)) return null;
  const credits = outro && outro.start > duration / 2 && outro.start < duration - 1 ? outro.start : null;
  if (credits == null) return {from: Math.max(0, duration - CARD_LEAD), at: duration};
  return {from: credits, at: Math.min(duration, credits + COUNTDOWN)};
}
