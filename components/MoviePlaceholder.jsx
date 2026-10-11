import {Image, Text, View} from '@ps5-react/core';
import poster from '../assets/brand/poster-placeholder.png';
import thumb from '../assets/brand/thumb-placeholder.png';
import {CARD, POSTER, px} from '../theme.js';
import {clean} from '../lib/format.js';

const posterBox = {width: px(POSTER.w), height: px(POSTER.h)};
const thumbBox = {width: px(CARD.w), height: px(CARD.h)};

/** Stays underneath remote art while it loads, or when no usable image arrives. */
export function MoviePlaceholder({title, wide = false}) {
  return (
    <View className="absolute inset-0" pointerEvents="none">
      <Image source={wide ? thumb : poster} className="rounded-xl" style={wide ? thumbBox : posterBox} />
      {!!title && (
        <View className={wide ? 'absolute left-5 right-5 bottom-3' : 'absolute left-5 right-5 bottom-5'}>
          <Text className={wide ? 'font-inter text-xs text-slate-300 text-center line-clamp-2'
            : 'font-inter text-sm text-slate-300 text-center line-clamp-3'}>{clean(title)}</Text>
        </View>
      )}
    </View>
  );
}
