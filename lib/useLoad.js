import {useEffect, useState} from 'react';

/** `load()` once per `key` (none for a null key): {data, error}, data null while it loads. */
export function useLoad(key, load) {
  const [state, setState] = useState({key, data: null, error: null});
  useEffect(() => {
    if (key == null) return undefined;
    let live = true;
    load().then(data => live && setState({key, data, error: null}),
      error => live && setState({key, data: null, error}));
    return () => { live = false; };
  }, [key]);
  return state.key === key ? state : {key, data: null, error: null};
}
