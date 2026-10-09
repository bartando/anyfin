import {useState} from 'react';
import {Image, Text, View} from '@ps5-react/core';
import {px} from '../theme.js';
import {clean, logoUrl} from '../lib/catalog.js';

/**
 * The title's logo art, fitted into w×h (logical px) and pinned bottom-left. Once onLoad reports the
 * source size the image box takes the fitted size and flex does the pinning (no transform: the box is
 * far over the 768 px transform buffer). Falls back to text.
 */
const MAX_UPSCALE = 2;

export function Logo({item, w, h}) {
  const [state, setState] = useState({key: null, width: 0, height: 0, failed: false});
  const uri = logoUrl(item);
  const mine = state.key === item.key;
  if (!uri || (mine && state.failed)) {
    return (
      <View style={{width: px(w), minHeight: px(Math.min(h, 70))}} className="justify-end">
        <Text className="font-semi text-hero text-white line-clamp-2">{clean(item.title)}</Text>
      </View>
    );
  }
  const onLoad = ({nativeEvent: {source}}) => {
    // w500 is the biggest TMDB logo under the 4 MiB encoded cap (originals run to 11 MB), and decode
    // never enlarges, so fit by aspect and let the draw upscale (at most MAX_UPSCALE).
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
          opacity: mine ? 1 : 0}} />
    </View>
  );
}
