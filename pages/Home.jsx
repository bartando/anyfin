import {useCallback, useEffect, useRef, useState} from 'react';
import {ScrollView, Text, View, motion, transitions} from '@ps5-react/core';
import {HERO_ROTATE_MS, PREVIEW_DELAY_MS} from '../theme.js';
import {clampText, heroItems, items, rows} from '../lib/catalog.js';
import {Backdrop} from '../components/Backdrop.jsx';
import {BackdropCard} from '../components/Cards.jsx';
import {Button} from '../components/Button.jsx';
import {InfoIcon, PlayIcon} from '../components/Icons.jsx';
import {Logo} from '../components/Logo.jsx';
import {MetaLine} from '../components/Meta.jsx';

const ROWS = rows.map(row => ({...row, items: row.items.map(key => items[key])}));

// Hero overviews are clamped to three lines and also kept under the engine's 255-byte text node cap.
const HERO_OVERVIEW_BYTES = 200;

function HeroInfo({item, onPlay, onMore, onFocus}) {
  return (
    <View className="absolute left-12 top-[104px] w-[600px] gap-4">
      <motion.View key={item.key} className="gap-4" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}
        transition={transitions.panel}>
        <Logo item={item} w={420} h={130} />
        <MetaLine item={item} />
        <Text className="font-inter text-md text-slate-200 line-clamp-3">{clampText(item.overview, HERO_OVERVIEW_BYTES)}</Text>
      </motion.View>
      <View className="flex-row gap-4 pt-2">
        <Button focusKey="hero-play" label="Play" icon={PlayIcon} primary onPress={() => onPlay(item)} onFocus={onFocus} />
        <Button focusKey="hero-info" label="More Info" icon={InfoIcon} onPress={() => onMore(item)} onFocus={onFocus} />
      </View>
    </View>
  );
}

function Row({row, onOpen, onPreview}) {
  return (
    <View scrollAnchor className="pb-6">
      <Text className="font-semi text-lg text-white px-12">{row.title}</Text>
      <ScrollView horizontal className="flex-row h-[166px]">
        <View className="flex-row gap-4 px-12 py-[14px]">
          {row.items.map(item => <BackdropCard key={item.key} item={item} onPress={onOpen} onFocus={onPreview} />)}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Home: a crossfading full-bleed backdrop, hero info for the featured title and rows below. The hero
 * rotates every 8 s while focus is on its buttons; resting on a card features that card instead.
 */
export function HomePage({onOpen, onPlay}) {
  const [featured, setFeatured] = useState(heroItems[0]);
  const [rotating, setRotating] = useState(true);
  const pending = useRef(null);

  useEffect(() => {
    if (!rotating) return undefined;
    const id = setTimeout(() => setFeatured(current => {
      const index = heroItems.findIndex(item => item.key === current.key);
      return heroItems[(index + 1) % heroItems.length];
    }), HERO_ROTATE_MS);
    return () => clearTimeout(id);
  }, [rotating, featured]);
  useEffect(() => () => clearTimeout(pending.current), []);

  const preview = useCallback(item => {
    setRotating(false);
    clearTimeout(pending.current);
    pending.current = setTimeout(() => setFeatured(item), PREVIEW_DELAY_MS);
  }, []);
  const heroFocus = useCallback(() => {
    clearTimeout(pending.current);
    setRotating(true);
  }, []);

  return (
    <View className="absolute inset-0">
      <Backdrop item={featured} />
      <View pointerEvents="none" className="absolute left-0 top-0 bottom-0 w-[1000px]
        bg-gradient-to-r from-canvas via-canvas/85 to-transparent" />
      <View pointerEvents="none" className="absolute left-0 right-0 bottom-0 h-[460px]
        bg-gradient-to-t from-canvas via-canvas/80 to-transparent" />
      <View pointerEvents="none" className="absolute left-0 right-0 top-0 h-[120px]
        bg-gradient-to-b from-black/60 to-transparent" />
      <HeroInfo item={featured} onPlay={onPlay} onMore={onOpen} onFocus={heroFocus} />
      <ScrollView className="absolute left-0 right-0 bottom-0 h-[262px]">
        {ROWS.map(row => <Row key={row.id} row={row} onOpen={onOpen} onPreview={preview} />)}
        <View className="h-[40px]" />
      </ScrollView>
    </View>
  );
}
