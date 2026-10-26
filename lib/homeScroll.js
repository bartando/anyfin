import {useSyncExternalStore} from 'react';

// Home's scroll offset (logical px), outside the app's state: it changes on every move between Home's
// hero and its rows, and as the app's state it re-rendered every tab's page, the top bar and the page
// stack each time (25 to 50ms of React on the Shield). Only Home and the top bar's slide read it.
let y = 0;
const listeners = new Set();

export function setHomeY(next) {
  if (next === y) return;
  y = next;
  for (const listener of listeners) listener();
}

const subscribe = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useHomeY = () => useSyncExternalStore(subscribe, () => y);
