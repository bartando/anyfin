import {useControllerEvents} from '@ps5-react/core';

/**
 * `onPress` when `button` goes down while `enabled`, for the buttons the host sends no action for
 * (touchpad, l3, r3). Held as it is enabled is not a press: it may be the press that brought the
 * prompt up.
 */
export function usePadButton(button, enabled, onPress) {
  useControllerEvents(enabled ? event => {
    if (event.type === 'press' && event.button === button) onPress();
  } : null);
}
