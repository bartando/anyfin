import {useEffect, useState} from 'react';
import {Image, Text, View} from '@ps5-react/core';
import {px} from '../theme.js';
import {clean} from '../lib/format.js';
import {logoUrl} from '../lib/art.js';

/**
 * The title's logo art, fitted into w×h (logical px) and pinned bottom-left. Once onLoad reports the
 * source size the image box takes the fitted size and flex does the pinning (no transform: the box is
 * far over the 768 px transform buffer). Falls back to text: `title`, the item's own by default. `tint`
 * paints the art one color, for places where a dark logo would vanish; `tintDull` does so only for art
 * with no vivid colour (black, grey), as one color turns a coloured logo's letters and outlines into
 * one blob.
 */
const MAX_UPSCALE = 2;

export function Logo({item, w, h, title = item.title, tint, tintDull}) {
  const [state, setState] = useState({key: null, width: 0, height: 0, failed: false});
  const uri = logoUrl(item);
  const mine = state.key === item.key;
  const vivid = useVivid(tintDull ? uri : null);
  // Hidden until it is known whether the art is tinted, so it does not change colour once shown.
  const known = !tintDull || vivid.uri === uri;
  const paint = tint ?? (tintDull && known && !vivid.value ? tintDull : undefined);
  if (!uri || (mine && state.failed)) {
    return (
      <View style={{width: px(w), minHeight: px(Math.min(h, 70))}} className="justify-end">
        <Text className="font-semi text-hero text-white line-clamp-2">{clean(title)}</Text>
      </View>
    );
  }
  const onLoad = ({nativeEvent: {source}}) => {
    // Decode never enlarges, so fit by aspect and let the draw upscale (at most MAX_UPSCALE).
    const s = Math.min(px(w) / source.width, px(h) / source.height, MAX_UPSCALE);
    setState({key: item.key, failed: false,
      width: Math.round(source.width * s), height: Math.round(source.height * s)});
  };
  const fitted = mine && state.width > 0;
  return (
    <View style={{width: px(w), height: px(h)}} className="justify-end items-start">
      <Image key={item.key} source={{uri}} resizeMode="contain" onLoad={onLoad}
        onError={() => setState({key: item.key, failed: true, width: 0, height: 0})}
        style={{width: fitted ? state.width : px(w), height: fitted ? state.height : px(h),
          opacity: mine && known ? 1 : 0, tintColor: paint}} />
    </View>
  );
}

// Whether the art at `uri` has a vivid colour: {uri, value}, for the uri asked about last.
function useVivid(uri) {
  const [vivid, setVivid] = useState({uri: null, value: false});
  useEffect(() => {
    if (!uri) return undefined;
    let live = true;
    Image.getColor(uri).then(color => live && setVivid({uri, value: !!color}),
      () => live && setVivid({uri, value: false}));
    return () => { live = false; };
  }, [uri]);
  return vivid;
}
