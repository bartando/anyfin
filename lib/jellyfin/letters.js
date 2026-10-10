import {useEffect, useState} from 'react';
import {FileSystem} from '@ps5-react/core';
import {getSession} from './session.js';
import {loadLetterOffsets} from './library.js';
import {LETTERS} from '../format.js';

// Where each letter starts in a library, kept between launches: counting them takes a request per
// letter, so the bar would otherwise stay dim for the first seconds of every session. The saved
// index shows at once and the server's current one replaces it when it arrives.
const PATH = `${FileSystem.dataDir}/letters.json`;
const KEEP = 12;

let saved = null;
function cache() {
  if (saved) return saved;
  try {
    saved = FileSystem.exists(PATH) ? JSON.parse(FileSystem.readFile(PATH)) : {};
  } catch (error) {
    console.log(`letters: could not read ${PATH}: ${error.message}`);
    saved = {};
  }
  return saved;
}

function store(key, offsets) {
  const entries = Object.entries(cache()).filter(([other]) => other !== key).slice(-(KEEP - 1));
  saved = Object.fromEntries([...entries, [key, [...offsets]]]);
  try {
    FileSystem.writeFile(PATH, JSON.stringify(saved));
  } catch (error) {
    console.log(`letters: could not write ${PATH}: ${error.message}`);
  }
}

/**
 * The letter offsets (letter → titles sorting before it) of an alphabetical library query, or null.
 * The saved ones come first; once `total` is known (the first page arrived) the server is asked again
 * in the background. `enabled` false skips it all (a list that is not alphabetical).
 */
export function useLetterOffsets(params, total, enabled = true) {
  const session = getSession();
  const key = `${session?.server}|${session?.userId}|${JSON.stringify(params)}`;
  const [state, setState] = useState(() => {
    const known = enabled ? cache()[key] : null;
    return {key, offsets: known ? new Map(known) : null};
  });
  useEffect(() => {
    if (!enabled || total == null) return undefined;
    let live = true;
    loadLetterOffsets(params, LETTERS).then(offsets => {
      store(key, offsets);
      if (live) setState({key, offsets});
    }, error => console.log(`letters: ${error.message}`));
    return () => { live = false; };
  }, [key, enabled, total == null]);
  return state.key === key ? state.offsets : null;
}
