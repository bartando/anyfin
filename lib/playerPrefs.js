import {FileSystem} from '@react-on-anything/core';
import {getSettings} from './settings.js';

// Player choices kept on the console, over the defaults in Settings, per series (a film is its own
// series): the upscaler, since it suits some shows' art and not others, and whether the next episode
// starts by itself.
const PATH = `${FileSystem.dataDir}/player.json`;
let saved = null;

function load() {
  if (saved) return saved;
  saved = {};
  try {
    if (FileSystem.exists(PATH)) saved = JSON.parse(FileSystem.readFile(PATH));
  } catch (error) {
    console.log(`player: could not read ${PATH}: ${error.message}`);
  }
  return saved;
}

const scope = item => item.seriesId ?? item.id;

// `value` undefined forgets the series' own choice.
function remember(name, item, value) {
  const choices = {...load()[name]};
  if (value === undefined) delete choices[scope(item)];
  else choices[scope(item)] = value;
  saved = {...saved, [name]: choices};
  try {
    FileSystem.writeFile(PATH, JSON.stringify(saved));
  } catch (error) {
    console.log(`player: could not write ${PATH}: ${error.message}`);
  }
}

/** The upscaler for `item`: the one picked for its series, else the default in Settings ('' for none). */
export const upscalerFor = item => load().upscale?.[scope(item)] ?? getSettings().upscaler;

/** Keeps `model` for `item`'s series; picking the Settings default forgets the series' own choice. */
export const rememberUpscaler = (item, model) =>
  remember('upscale', item, model !== getSettings().upscaler ? model : undefined);

/** true or false where `item`'s series has its own autoplay choice, else undefined (Settings decides). */
export const autoplayFor = item => load().autoplay?.[scope(item)];
export const rememberAutoplay = (item, on) => remember('autoplay', item, on);
