import {useEffect, useRef, useState} from 'react';
import {Image, View, motion} from '@ps5-react/core';
import {SIZES, px} from '../theme.js';
import {backdropUrl} from '../lib/catalog.js';

let nextLayer = 1;

/**
 * Backdrop that crossfades when `item` changes. The new art is prefetched first so a layer never
 * fades in over an empty tile; the incoming layer fades in over the old one, which stays opaque and
 * is dropped once the fade ends (no 50 % muddy dip). `w`/`h` are the box in logical px.
 */
export function Backdrop({item, w = 1280, h = 720, fadeMs = 600, size = SIZES.hero}) {
  const [layers, setLayers] = useState(() => (item ? [{id: nextLayer++, item, first: true}] : []));
  const latest = useRef(item?.key);
  latest.current = item?.key;

  useEffect(() => {
    if (!item || layers[layers.length - 1]?.item.key === item.key) return undefined;
    let live = true;
    const show = () => {
      if (live && latest.current === item.key) setLayers(list => [...list.slice(-1), {id: nextLayer++, item}]);
    };
    const uri = backdropUrl(item, size);
    if (uri) Image.prefetch(uri, {width: px(w), height: px(h)}).then(show, show);
    else show();
    return () => { live = false; };
  }, [item?.key]);

  const settle = id => setLayers(list => (list.length > 1 && list[list.length - 1].id === id ? list.slice(-1) : list));
  const box = {position: 'absolute', left: 0, top: 0, width: px(w), height: px(h)};
  return (
    <View style={box} pointerEvents="none">
      {layers.map(layer => (
        <motion.View key={layer.id} style={box} initial={layer.first ? false : {opacity: 0}} animate={{opacity: 1}}
          transition={{duration: fadeMs / 1000, ease: 'easeOut'}} onAnimationComplete={() => settle(layer.id)}>
          <Image source={{uri: backdropUrl(layer.item, size)}} style={{width: px(w), height: px(h)}}
            className="bg-canvas" />
        </motion.View>
      ))}
    </View>
  );
}
