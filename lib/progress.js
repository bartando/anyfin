import {useSyncExternalStore} from 'react';

// Counts playbacks stopped, once the server has the position they stopped at, so the pages that show
// progress (the play button's "Resume", Continue Watching, Next Up) know to load again.
const listeners = new Set();
let version = 0;

const subscribe = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function progressChanged() {
  version++;
  for (const listener of listeners) listener();
}

export const useProgressVersion = () => useSyncExternalStore(subscribe, () => version);
