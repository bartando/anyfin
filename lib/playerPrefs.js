import {FileSystem} from '@ps5-react/core';

// Player choices kept on the console: the upscaler, per series (a film is its own series), since it
// suits some shows' art and not others.
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

/** The upscaler picked for `item`'s series, or '' for none. */
export const upscalerFor = item => load().upscale?.[scope(item)] ?? '';

export function rememberUpscaler(item, model) {
  const upscale = {...load().upscale};
  if (model) upscale[scope(item)] = model;
  else delete upscale[scope(item)];
  saved = {...saved, upscale};
  try {
    FileSystem.writeFile(PATH, JSON.stringify(saved));
  } catch (error) {
    console.log(`player: could not write ${PATH}: ${error.message}`);
  }
}
