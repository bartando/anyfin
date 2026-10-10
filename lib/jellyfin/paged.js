import {useCallback, useEffect, useRef, useState} from 'react';
import {loadPage} from './library.js';

// A page is ten rows of the six-column poster grid.
export const PAGE = 60;
const CHANGES_KEPT = 32;


/**
 * A whole library as one array the grid can index, however many titles it holds: an index is empty
 * (a hole) until its page arrives. `need(index)` asks for that index's page; the grid's
 * cards call it as they mount, so only pages near what is on screen load. A new `key` starts over.
 * Every item carries its `slot` (index); key the grid by index, so a card keeps its node (and focus)
 * when its title arrives.
 */
export function usePagedItems(params, key) {
  const [state, setState] = useState({key, total: null, data: [], error: null, seq: 0});
  const store = useRef(null);
  if (!store.current || store.current.key !== key) store.current = {key, requested: new Set(), data: [], total: null, changes: [], seq: 0};

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
        // Holes until each page arrives: an object per title of a 30,000-title library would be live
        // heap every garbage collection walks, and those pauses grow with it.
        current.data = new Array(total);
      } else {
        current.data = current.data.slice();
      }
      total = current.total;
      items.forEach((item, offset) => {
        const index = page * PAGE + offset;
        if (index < total) {
          item.slot = index;
          current.data[index] = item;
        }
      });
      current.changes.push({seq: ++current.seq, from: page * PAGE, to: Math.min(total, (page + 1) * PAGE)});
      if (current.changes.length > CHANGES_KEPT) current.changes.shift();
      setState({key, total, data: current.data, error: null, seq: current.seq});
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
    store.current = {key, requested: new Set(), data: [], total: null, changes: [], seq: 0};
    fetchPage(0);
  }, [key]);

  const mine = state.key === key ? state : {key, total: null, data: [], error: null, seq: 0};
  // Which indices each page filled, newest last, so a view built from `data` can patch itself instead
  // of rebuilding (`changesSince(seq)`, null when the log no longer reaches back that far).
  const changesSince = useCallback(seq => {
    const {changes} = store.current;
    if (seq === store.current.seq) return [];
    if (!changes.length || changes[0].seq > seq + 1) return null;
    return changes.filter(change => change.seq > seq);
  }, [key]);
  return {...mine, need, reload, changesSince};
}
