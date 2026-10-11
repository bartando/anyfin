import {FileSystem} from '@ps5-react/core';
import {getSettings} from './settings.js';

// Player choices kept on the console, over the defaults in Settings: the upscaler, per series (a film
// is its own series), since it suits some shows' art and not others.
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

/** The upscaler for `item`: the one picked for its series, else the default in Settings ('' for none). */
export const upscalerFor = item => load().upscale?.[scope(item)] ?? getSettings().upscaler;

/** Keeps `model` for `item`'s series; picking the Settings default forgets the series' own choice. */
export function rememberUpscaler(item, model) {
  const upscale = {...load().upscale};
  if (model !== getSettings().upscaler) upscale[scope(item)] = model;
  else delete upscale[scope(item)];
  saved = {...saved, upscale};
  try {
    FileSystem.writeFile(PATH, JSON.stringify(saved));
  } catch (error) {
    console.log(`player: could not write ${PATH}: ${error.message}`);
  }
}
