import {useSyncExternalStore} from 'react';
import {FileSystem} from '@ps5-react/core';

// The app's preferences, kept in its data folder next to the session; unlike the session they stay
// across sign-outs. Unknown or missing values fall back to the defaults, so an old file still loads.
const PATH = `${FileSystem.dataDir}/settings.json`;

export const DEFAULTS = {
  upscaler: '',             // '' or a <Video upscale> model
  maxBitrate: 160000000,    // bits per second the server may stream before it transcodes down
  seekStep: 10,             // seconds L2/R2 jump when tapped
  triggerFeedback: true,    // L2/R2 resist past the point where holding them scrubs fast
  autoplay: true,           // the next episode starts by itself at the credits (a series can differ)
  subtitles: 'default',     // 'default' (the file's or server's choice) or 'off'
  subtitleSize: 'medium',
  audioDelay: 0,            // seconds the sound plays after the picture
  clock24: true,
  sounds: true,
};

const listeners = new Set();
let state = load();

function load() {
  let saved = {};
  try {
    if (FileSystem.exists(PATH)) saved = JSON.parse(FileSystem.readFile(PATH));
  } catch (error) {
    console.log(`settings: could not read ${PATH}: ${error.message}`);
  }
  const out = {...DEFAULTS};
  for (const key of Object.keys(DEFAULTS))
    if (typeof saved[key] === typeof DEFAULTS[key]) out[key] = saved[key];
  return out;
}

export function setSetting(key, value) {
  if (state[key] === value) return;
  state = {...state, [key]: value};
  try {
    FileSystem.writeFile(PATH, JSON.stringify(state));
  } catch (error) {
    console.log(`settings: could not write ${PATH}: ${error.message}`);
  }
  for (const listener of listeners) listener();
}

const subscribe = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSettings = () => state;
export const useSettings = () => useSyncExternalStore(subscribe, getSettings);
