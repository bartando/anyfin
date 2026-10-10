import {useCallback, useEffect, useRef, useState} from 'react';
import {loadPage} from './library.js';

// A page is ten rows of the six-column poster grid.
export const PAGE = 60;

const slots = new Map();
/** The stand-in for a title not loaded yet; the same object per index, so rows that did not change
 * keep their memoized cards. */
function placeholder(index) {
  let slot = slots.get(index);
  if (!slot) {
    slot = Object.freeze({key: `slot:${index}`, slot: index, placeholder: true, title: '', genres: [], cast: []});
    slots.set(index, slot);
  }
  return slot;
}

/**
 * A whole library as one array the grid can index, however many titles it holds: every index has an
 * item, a placeholder until its page arrives. `need(index)` asks for that index's page; the grid's
 * cards call it as they mount, so only pages near what is on screen load. A new `key` starts over.
 * Every item carries its `slot` (index); key the grid by that, so a card keeps its node (and focus)
 * when its placeholder is replaced.
 */
export function usePagedItems(params, key) {
  const [state, setState] = useState({key, total: null, data: [], error: null});
  const store = useRef(null);
  if (!store.current || store.current.key !== key) store.current = {key, requested: new Set(), data: [], total: null};

  const fetchPage = useCallback(page => {
    const current = store.current;
    if (current.requested.has(page)) return;
    current.requested.add(page);
    loadPage(params, page * PAGE, PAGE).then(({total, items}) => {
      if (store.current !== current) return;
      // The first reply sets the length. A server can report a slightly different total on later
      // pages (one that indexes as it serves); resizing for each would rebuild the grid under focus,
      // so later pages only fill what fits.
      if (current.total == null) {
        current.total = total;
        current.data = Array.from({length: total}, (_, index) => placeholder(index));
      } else {
        current.data = current.data.slice();
      }
      total = current.total;
      items.forEach((item, offset) => {
        const index = page * PAGE + offset;
        if (index < total) current.data[index] = {...item, slot: index};
      });
      setState({key, total, data: current.data, error: null});
    }, error => {
      if (store.current !== current) return;
      current.requested.delete(page);
      setState(previous => ({...previous, key, error}));
    });
  }, [key]);

  useEffect(() => { fetchPage(0); }, [key]);

  const need = useCallback(index => {
    if (index >= 0 && (store.current.total == null || index < store.current.total)) fetchPage(Math.floor(index / PAGE));
  }, [fetchPage]);
  const reload = useCallback(() => {
    store.current = {key, requested: new Set(), data: [], total: null};
    fetchPage(0);
  }, [key]);

  const mine = state.key === key ? state : {key, total: null, data: [], error: null};
  return {...mine, need, reload};
}
