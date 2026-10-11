import {useEffect, useRef, useState} from 'react';
import {upNextTimes} from '../../lib/upNext.js';

/**
 * The Up Next card over the end of an episode (see lib/upNext.js for when). The countdown runs in
 * film time, so it stops when the film does, and a seek back before the card resets a dismissal.
 * Returns {offering, seconds, dismiss, play, finish}: `seconds` is null with `autoplay` off, and
 * `finish` is what the end of the film does (play the next one, or `onClose`).
 */
export function useUpNext({next, onNext, onClose, position, duration, outro, autoplay, holding}) {
  const [dismissed, setDismissed] = useState(false);
  const times = next && onNext ? upNextTimes(duration, outro) : null;
  const inside = !!times && position >= times.from;
  const offering = inside && !dismissed;
  const seconds = offering && autoplay ? Math.max(0, Math.ceil(times.at - position)) : null;

  // The end and the countdown can both get here; the page is replaced once.
  const gone = useRef(false);
  const play = () => {
    if (gone.current) return;
    gone.current = true;
    onNext(next);
  };

  useEffect(() => {
    if (dismissed && !inside) setDismissed(false);
    if (seconds === 0 && !holding) play();
  }, [position, inside, seconds, holding]);

  return {
    offering, seconds, play,
    dismiss: () => setDismissed(true),
    finish: () => (next && onNext && autoplay && !dismissed ? play() : onClose()),
  };
}
