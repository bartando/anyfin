import {useNavigationEvents} from '@ps5-react/core';

// The direction of the last focus move, so a newly focused card's glass knows which way the room slid
// past it. A module value rather than state: focus moves re-render nothing.
let last = null;

export const lastMove = () => last;

/** Call once near the root. */
export function useMoveTracking() {
  useNavigationEvents(event => {
    if (event.type === 'move') last = event.direction;
  });
}
