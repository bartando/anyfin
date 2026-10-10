import {useEffect, useRef, useState} from 'react';
import {Image, View, motion} from '@ps5-react/core';
import {SIZES, px} from '../theme.js';
import {backdropUrl} from '../lib/art.js';

let nextLayer = 1;

/**
 * Backdrop that crossfades when `item` changes. The new art is prefetched first so a layer never
 * fades in over an empty tile; each incoming layer fades in over the ones below, which stay opaque,
 * and when one finishes everything under it is dropped (no 50 % muddy dip, also when a new item
 * arrives mid-fade). The images are host layers: the presenter draws them and the fades repaint
 * nothing, as long as an opaque layer stays at the bottom. `w`/`h` are the box in logical px.
 */
export function Backdrop({item, w = 1280, h = 720, fadeMs = 600, size = SIZES.hero}) {
  const [layers, setLayers] = useState(() => (item ? [{id: nextLayer++, item, first: true}] : []));
  const latest = useRef(item?.key);
  latest.current = item?.key;

  useEffect(() => {
    if (!item || layers[layers.length - 1]?.item.key === item.key) return undefined;
    let live = true;
    const show = () => {
      if (live && latest.current === item.key) setLayers(list => [...list, {id: nextLayer++, item}]);
    };
    const uri = backdropUrl(item, size);
    if (uri) Image.prefetch(uri, {width: px(w), height: px(h)}).then(show, show);
    else show();
    return () => { live = false; };
  }, [item?.key]);

  const settle = id => setLayers(list => {
    const index = list.findIndex(layer => layer.id === id);
    return index > 0 ? list.slice(index) : list;
  });
  const box = {position: 'absolute', left: 0, top: 0, width: px(w), height: px(h)};
  return (
    <View style={box} pointerEvents="none">
      {layers.map(layer => (
        <motion.View key={layer.id} style={box} initial={layer.first ? false : {opacity: 0}} animate={{opacity: 1}}
          transition={{duration: fadeMs / 1000, ease: 'easeOut'}} onAnimationComplete={() => settle(layer.id)}>
          <Image layer source={{uri: backdropUrl(layer.item, size)}} style={{width: px(w), height: px(h)}}
            className="bg-canvas" />
        </motion.View>
      ))}
    </View>
  );
}
