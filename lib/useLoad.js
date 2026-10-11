import {useEffect, useState} from 'react';

/**
 * `load()` once per `key` (none for a null key): {data, error}, data null while it loads. A new
 * `version` loads it again, the data already there staying up meanwhile and on a failure.
 */
export function useLoad(key, load, version = 0) {
  const [state, setState] = useState({key, data: null, error: null});
  useEffect(() => {
    if (key == null) return undefined;
    let live = true;
    load().then(data => live && setState({key, data, error: null}),
      error => live && setState(was => (was.key === key && was.data ? was : {key, data: null, error})));
    return () => { live = false; };
  }, [key, version]);
  return state.key === key ? state : {key, data: null, error: null};
}
