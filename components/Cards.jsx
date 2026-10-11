import {memo} from 'react';
import {Image, Text, View} from '@ps5-react/core';
import {CARD, POSTER, SIZES, px} from '../theme.js';
import {clean} from '../lib/format.js';
import {logoUrl, posterUrl, thumbUrl} from '../lib/art.js';
import {caption, cardTitle} from '../lib/jellyfin/items.js';
import {useIsPlayed} from '../lib/favorites.js';
import {FocusCard} from './FocusCard.jsx';
import {MoviePlaceholder} from './MoviePlaceholder.jsx';
import {CheckIcon} from './Icons.jsx';

const POSTER_BOX = {width: px(POSTER.w), height: px(POSTER.h)};

/** Watched: a check in the corner. Part way through: a bar along the bottom. */
function Progress({item, w}) {
  const played = useIsPlayed(item);
  if (played) {
    return (
      <View className="absolute top-[8px] right-[8px] size-6 rounded-full bg-accent items-center justify-center">
        <CheckIcon size={14} />
      </View>
    );
  }
  if (!(item.progress > 0)) return null;
  const inner = w - 24;
  return (
    <View className="absolute left-[12px] right-[12px] bottom-[10px] h-[5px] rounded-full bg-black/60">
      <View className="h-[5px] rounded-full bg-accent" style={{width: px(Math.max(4, inner * Math.min(1, item.progress)))}} />
    </View>
  );
}

// 16:9 art with the title logo over a bottom shade, Jellyfin "thumb" style. The mascot and title
// sit underneath until the art arrives (or if it fails).
export const BackdropCard = memo(function BackdropCard({item, onPress, onFocus, logo = true}) {
  const uri = thumbUrl(item, SIZES.card);
  return (
    <FocusCard w={CARD.w} h={CARD.h} radius={CARD.radius} item={item} onPress={onPress} onFocus={onFocus}>
      <MoviePlaceholder title={cardTitle(item)} wide />
      {uri && <Image source={{uri}} className="w-[240px] h-[135px] rounded-xl" />}
      {logo && item.logo && item.kind !== 'episode' && (
        <>
          <View className="absolute left-0 right-0 bottom-0 h-[64px] rounded-b-xl
            bg-gradient-to-t from-black/75 to-transparent" />
          <Image source={{uri: logoUrl(item, SIZES.cardLogo)}} resizeMode="contain"
            className="absolute left-[12px] bottom-[10px] w-[132px] h-[40px]" />
        </>
      )}
      <Progress item={item} w={CARD.w} />
    </FocusCard>
  );
});

/** A grid poster. A title still loading draws the mascot and can take focus. */
export const PosterCard = memo(function PosterCard({item, onPress, onFocus, onBlur}) {
  const uri = item.placeholder ? null : posterUrl(item);
  return (
    <FocusCard w={POSTER.w} h={POSTER.h} radius={POSTER.radius} item={item} onPress={item.placeholder ? null : onPress}
      onFocus={onFocus} onBlur={onBlur}>
      <MoviePlaceholder title={item.title} />
      {uri && <Image source={{uri}} className="rounded-xl" style={POSTER_BOX} />}
      {!item.placeholder && <Progress item={item} w={POSTER.w} />}
    </FocusCard>
  );
});

/** A 16:9 card with its title and a second line underneath (the year, or an episode's code). */
export const CaptionedCard = memo(function CaptionedCard({item, onPress, onFocus, title, subtitle}) {
  const second = subtitle ?? caption(item);
  return (
    <View className="gap-1">
      <BackdropCard item={item} onPress={onPress} onFocus={onFocus} logo={false} />
      <View className="pt-1 w-[240px]">
        <Text className="font-semi text-xs text-white truncate w-[240px]">{clean(title ?? cardTitle(item))}</Text>
        {second ? <Text className="font-inter text-xs text-slate-400 truncate w-[240px]">{clean(second)}</Text> : null}
      </View>
    </View>
  );
});
