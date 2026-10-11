import {memo, useRef, useState} from 'react';
import {FocusScope, ScrollView, Text, View, useIsFocused} from '@ps5-react/core';
import {CARD, POSTER, captionedRowH, focusRoom, px} from '../theme.js';
import {clampText, clean, splitText} from '../lib/format.js';
import {loadEpisodes, loadItem, loadNextEpisode, loadSeasons, loadSimilar} from '../lib/jellyfin/library.js';
import {episodeCode} from '../lib/jellyfin/items.js';
import {useLoad} from '../lib/useLoad.js';
import {toggleFavorite, togglePlayed, useIsFavorite, useIsPlayed} from '../lib/favorites.js';
import {Backdrop} from '../components/Backdrop.jsx';
import {Button} from '../components/Button.jsx';
import {CaptionedCard, CaptionedPoster} from '../components/Cards.jsx';
import {BackIcon, CheckIcon, HeartFilledIcon, HeartIcon, PlayIcon} from '../components/Icons.jsx';
import {Logo} from '../components/Logo.jsx';
import {MetaLine} from '../components/Meta.jsx';
import {PersonBubble} from '../components/People.jsx';
import {Shelf} from '../components/Shelf.jsx';
import {CardsSkeleton, PeopleSkeleton, PillsSkeleton, PostersSkeleton} from '../components/Skeleton.jsx';
import {keepPageActions} from '../lib/pageActions.js';

// Engine coordinates are 16-bit: a row of 240 px cards overflows past about 42 of them, so a long
// season (a soap, an anime) shows its episodes this many at a time.
const EPISODES_SHOWN = 40;
const EPISODES_H = captionedRowH(CARD.h), CAST_H = px(176), SIMILAR_H = captionedRowH(POSTER.h);
// Placeholder tiles: enough to run past the right edge.
const CARDS_SHOWN = 6, POSTERS_SHOWN = 8, PEOPLE_SHOWN = 9;

/**
 * A season's episodes, fetched once per detail page: the season pills select on focus, so moving
 * along them would otherwise ask again for every season passed, including ones already shown.
 */
function cachedEpisodes(cache, seriesId, seasonId) {
  if (!cache.has(seasonId)) {
    const entry = {list: null};
    entry.promise = loadEpisodes(seriesId, seasonId).then(list => (entry.list = list),
      error => { cache.delete(seasonId); throw error; });
    cache.set(seasonId, entry);
  }
  return cache.get(seasonId).promise;
}

function SeasonLabel({label, selected}) {
  const focused = useIsFocused();
  return (
    <Text focused={focused} className={`font-semi text-sm ${selected ? 'text-white' : 'text-slate-300'} focused:text-canvas`}>
      {label}
    </Text>
  );
}

/** Pills, one per season (or block of episodes); focusing one selects it, as the top bar's tabs do. */
const Pills = memo(function Pills({options, selected, onSelect}) {
  return (
    <ScrollView horizontal className="flex-row h-[56px]">
      <View className="flex-row gap-2 px-12 py-[8px]">
        {options.map(option => (
          <View key={option.id} focusable onFocus={() => onSelect(option.id)}
            className={`h-[40px] px-5 rounded-full items-center justify-center border
              ${option.id === selected ? 'bg-white/20 border-white/40' : 'bg-white/5 border-white/10'}
              focused:bg-white focused:border-white`}>
            <SeasonLabel label={option.label} selected={option.id === selected} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
});

/**
 * A season's episodes, EPISODES_SHOWN at a time, starting at the block that holds `next`. While they
 * load, placeholders sized from the season's episode count hold their place.
 */
function Episodes({seriesId, seasonId, count, cache, next, onPlay}) {
  const cached = cache.get(seasonId)?.list;
  const {data: loaded, error} = useLoad(cached ? null : `episodes-${seasonId}`,
    () => cachedEpisodes(cache, seriesId, seasonId));
  const [picked, setPicked] = useState(null);
  const episodes = cached ?? loaded;
  if (!episodes && !error) {
    return (
      <>
        {count > EPISODES_SHOWN && <PillsSkeleton count={Math.ceil(count / EPISODES_SHOWN)} />}
        <CardsSkeleton count={Math.min(count || CARDS_SHOWN, CARDS_SHOWN)} height={EPISODES_H} />
      </>
    );
  }
  if (!episodes?.length) return null;
  const blocks = Math.ceil(episodes.length / EPISODES_SHOWN);
  const nextAt = next ? episodes.findIndex(episode => episode.id === next.id) : -1;
  const block = picked ?? Math.max(0, Math.floor(nextAt / EPISODES_SHOWN));
  const shown = episodes.slice(block * EPISODES_SHOWN, (block + 1) * EPISODES_SHOWN);
  const options = Array.from({length: blocks}, (_, index) => ({id: index,
    label: `${index * EPISODES_SHOWN + 1}–${Math.min(episodes.length, (index + 1) * EPISODES_SHOWN)}`}));
  return (
    <>
      {blocks > 1 && <Pills options={options} selected={block} onSelect={setPicked} />}
      <Shelf height={EPISODES_H} room={focusRoom(CARD.h)}>
        {shown.map(episode => (
          <CaptionedCard key={episode.key} item={episode} onPress={onPlay}
            title={`${episode.episode != null ? `${episode.episode}. ` : ''}${episode.title}`}
            subtitle={episode.runtime ? `${episode.runtime} min` : ''} />
        ))}
      </Shelf>
    </>
  );
}

function playLabel(item, next) {
  if (item.kind === 'tv') return next ? `Play ${episodeCode(next)}` : 'Play';
  return item.progress > 0 && item.positionMinutes > 0 ? `Resume ${item.positionMinutes} min` : 'Play';
}

/**
 * "More Info": backdrop, logo, meta, tagline, the overview and actions, then for a series its seasons
 * and episodes, then cast and similar titles, which open a person page or another title. The item
 * shown first is the card's; the full item from the server fills in the rest.
 */
export function DetailPage({item: shown, active = true, onClose, onPlay, onOpen, onPerson}) {
  const {data: live, error: liveError} = useLoad(`item-${shown.id}`, () => loadItem(shown.id));
  const item = live ? {...shown, ...live} : shown;
  const series = item.kind === 'tv';
  const {data: similar, error: similarError} = useLoad(`similar-${shown.id}`, () => loadSimilar(shown.id));
  const {data: seasons, error: seasonsError} = useLoad(series ? `seasons-${shown.id}` : null, () => loadSeasons(shown.id));
  const {data: next} = useLoad(series ? `next-${shown.id}` : null, () => loadNextEpisode(shown.id));
  const [picked, setPicked] = useState(shown.initialSeasonId ?? null);
  const seasonId = picked ?? next?.seasonId ?? seasons?.[0]?.id ?? null;
  const episodeCache = useRef(new Map()).current;
  const favorite = useIsFavorite(item);
  const played = useIsPlayed(item);
  // About six lines fit above the first shelf; splitText keeps each node under the 255-byte cap.
  const paragraphs = splitText(clampText(item.overview, 480));
  const cast = item.cast ?? [];
  return (
    <FocusScope trap={active} inert={!active} autoFocus onBack={() => { onClose(); return true; }} onAction={keepPageActions}>
      <View className="w-screen h-screen bg-canvas">
        <Backdrop item={item} />
        <View pointerEvents="none" className="absolute left-0 top-0 bottom-0 w-[960px]
          bg-gradient-to-r from-canvas via-canvas/85 to-transparent" />
        <View pointerEvents="none" className="absolute left-0 right-0 bottom-0 h-[420px]
          bg-gradient-to-t from-canvas via-canvas/90 to-transparent" />
        <ScrollView className="absolute inset-0">
          <View scrollAnchor className="px-12 pt-[48px] pb-10">
            <View className="w-[640px] gap-3">
              <Logo item={item} w={420} h={110} />
              <MetaLine item={item} genres={3} />
              {item.tagline && <Text className="font-semi text-md text-accent-soft">{clean(item.tagline)}</Text>}
              <View className="gap-2">
                {paragraphs.map((text, index) => (
                  <Text key={index} className="font-inter text-sm text-slate-200">{text}</Text>
                ))}
              </View>
              <View className="flex-row gap-4 pt-2">
                <Button label="Back" icon={BackIcon} onPress={onClose} />
                <Button label={playLabel(item, next)} icon={PlayIcon} primary autoFocus onPress={() => onPlay(series && next ? next : item)} />
                <Button label={favorite ? 'In Favorites' : 'Favorite'} icon={favorite ? HeartFilledIcon : HeartIcon}
                  onPress={() => toggleFavorite(item)} />
                <Button label={played ? 'Watched' : 'Mark Watched'} icon={played ? CheckIcon : undefined}
                  onPress={() => togglePlayed(item)} />
              </View>
            </View>
          </View>
          <View className="gap-4 pb-12">
            {series && !seasons && !seasonsError && (
              <View className="gap-1">
                <PillsSkeleton count={Math.min(item.seasons || 3, 8)} />
                <CardsSkeleton count={CARDS_SHOWN} height={EPISODES_H} />
              </View>
            )}
            {series && seasons?.length > 0 && (
              <View className="gap-1">
                <Pills options={seasons.map(season => ({id: season.id, label: clean(season.title)}))}
                  selected={seasonId} onSelect={setPicked} />
                {seasonId && <Episodes key={seasonId} seriesId={shown.id} seasonId={seasonId} cache={episodeCache}
                  count={seasons.find(season => season.id === seasonId)?.childCount} next={next} onPlay={onPlay} />}
              </View>
            )}
            {!live && !liveError && <PeopleSkeleton title="Cast" count={PEOPLE_SHOWN} height={CAST_H} />}
            {cast.length > 0 && (
              <Shelf title="Cast" height={CAST_H} anchor>
                {cast.map(person => <PersonBubble key={person.id} person={person} onPress={onPerson} />)}
              </Shelf>
            )}
            {!similar && !similarError && <PostersSkeleton title="More like this" count={POSTERS_SHOWN} height={SIMILAR_H} />}
            {similar?.length > 0 && (
              <Shelf title="More like this" height={SIMILAR_H} room={focusRoom(POSTER.h)} anchor>
                {similar.map(related => <CaptionedPoster key={related.key} item={related} onPress={onOpen} />)}
              </Shelf>
            )}
          </View>
        </ScrollView>
      </View>
    </FocusScope>
  );
}
