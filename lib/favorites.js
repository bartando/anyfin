import {useSyncExternalStore} from 'react';
import {setFavorite, setPlayed} from './jellyfin/library.js';

// Favorite and watched flags live on the server. A toggle shows at once and is kept here over what
// the (possibly cached) item says; a failed request puts it back. `version` counts changes to the
// favorites, so the Favorites grid knows to load again.
const overrides = new Map();
const listeners = new Set();
let version = 0;

const notify = () => { for (const listener of listeners) listener(); };
const subscribe = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const flag = (item, name) => overrides.get(item.id)?.[name] ?? item[name];

/** `item`'s favorite or played flag as the app shows it, a pending toggle included. */
export const getFlag = (item, name) => !!flag(item, name);

async function toggle(item, name, send) {
  const on = !flag(item, name);
  const set = value => {
    overrides.set(item.id, {...overrides.get(item.id), [name]: value});
    if (name === 'favorite') version++;
    notify();
  };
  set(on);
  try {
    await send(item.id, on);
  } catch (error) {
    console.log(`${name}: could not update ${item.title}: ${error.message}`);
    set(!on);
  }
}

export const toggleFavorite = item => toggle(item, 'favorite', setFavorite);
export const togglePlayed = item => toggle(item, 'played', setPlayed);

export const useIsFavorite = item => useSyncExternalStore(subscribe, () => !!item && !!flag(item, 'favorite'));
export const useIsPlayed = item => useSyncExternalStore(subscribe, () => !!item && !!flag(item, 'played'));
export const useFavoritesVersion = () => useSyncExternalStore(subscribe, () => version);

export function forgetUserData() {
  overrides.clear();
  version++;
  notify();
}
