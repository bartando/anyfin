import {memo} from 'react';
import {Image, Text, View} from '@ps5-react/core';
import {CARD, POSTER, SIZES, px} from '../theme.js';
import {backdropUrl, clean, logoUrl, posterUrl} from '../lib/catalog.js';
import {FocusCard, Placeholder} from './FocusCard.jsx';

const POSTER_BOX = {width: px(POSTER.w), height: px(POSTER.h)};

// 16:9 backdrop with the title logo over a bottom shade, Jellyfin "thumb" style. The title text sits
// underneath as the placeholder until the art arrives (or if it fails).
export const BackdropCard = memo(function BackdropCard({item, onPress, onFocus, logo = true}) {
  return (
    <FocusCard w={CARD.w} h={CARD.h} radius={CARD.radius} item={item} onPress={onPress} onFocus={onFocus}>
      <View className="absolute inset-0 rounded-xl bg-panel" />
      <Placeholder>
        <Text className="font-inter text-xs text-slate-400 text-center line-clamp-2">{clean(item.title)}</Text>
      </Placeholder>
      <Image source={{uri: backdropUrl(item, SIZES.card)}} className="w-[240px] h-[135px] rounded-xl" />
      {logo && item.logo && (
        <>
          <View className="absolute left-0 right-0 bottom-0 h-[64px] rounded-b-xl
            bg-gradient-to-t from-black/75 to-transparent" />
          <Image source={{uri: logoUrl(item, SIZES.cardLogo)}} resizeMode="contain"
            className="absolute left-[12px] bottom-[10px] w-[132px] h-[40px]" />
        </>
      )}
    </FocusCard>
  );
});

export const PosterCard = memo(function PosterCard({item, onPress, onFocus}) {
  return (
    <FocusCard w={POSTER.w} h={POSTER.h} radius={POSTER.radius} item={item} onPress={onPress} onFocus={onFocus}>
      <View className="absolute inset-0 rounded-xl bg-panel" />
      <Placeholder>
        <Text className="font-inter text-sm text-slate-400 text-center line-clamp-3">{clean(item.title)}</Text>
      </Placeholder>
      <Image source={{uri: posterUrl(item)}} className="rounded-xl" style={POSTER_BOX} />
    </FocusCard>
  );
});
