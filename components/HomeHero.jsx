import {memo, useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore} from 'react';
import {Animated, Text, View, transitions, useAnimatedValue} from '@react-on-anything/core';
import {HERO_ROTATE_MS, px} from '../theme.js';
import {clampText} from '../lib/format.js';
import {Backdrop} from './Backdrop.jsx';
import {Button} from './Button.jsx';
import {InfoIcon, PlayIcon} from './Icons.jsx';
import {Logo} from './Logo.jsx';
import {MetaLine} from './Meta.jsx';

// Home's hero: the featured title's backdrop, its logo, meta and overview, and Play / More Info.

// Hero overviews are clamped to three lines and also kept under the engine's 255-byte text node cap.
const HERO_OVERVIEW_BYTES = 200;

// Each featured title rises in with the panel spring. The nodes stay and take the new title's text;
// keyed by title, every preview made them all again.
const HERO_RISE = 10;

function useEntrance(key) {
  const opacity = useAnimatedValue(0);
  const y = useAnimatedValue(px(HERO_RISE));
  useLayoutEffect(() => {
    if (key == null) return undefined;
    opacity.setValue(0);
    y.setValue(px(HERO_RISE));
    const run = Animated.parallel([opacity, y].map((value, i) =>
      Animated.spring(value, {toValue: i ? 0 : 1, ...transitions.panel})));
    run.start();
    return () => run.stop();
  }, [key]);
  return {opacity, transform: [{translateY: y}]};
}

// The featured title and whether it rotates, outside HomePage's state: a preview landing re-rendered the
// whole page (its overlays, the scroll column, the hero's buttons) for what the backdrop and the hero
// text show. One store per mounted page, so a new session starts on its own first title.
export function createFeatured() {
  let state = {picked: null, rotating: true};
  const listeners = new Set();
  return {
    get: () => state,
    set(change) {
      const next = {...state, ...change};
      if (next.picked === state.picked && next.rotating === state.rotating) return;
      state = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function useFeatured(store, heroItems) {
  const {picked, rotating} = useSyncExternalStore(store.subscribe, store.get);
  return {featured: picked ?? heroItems[0] ?? null, rotating};
}

// While rotating, the next hero title every HERO_ROTATE_MS.
export const HeroRotation = memo(function HeroRotation({store, heroItems, active}) {
  const {featured, rotating} = useFeatured(store, heroItems);
  useEffect(() => {
    if (!rotating || !active || heroItems.length < 2) return undefined;
    const id = setTimeout(() => {
      const index = heroItems.findIndex(item => item.key === featured?.key);
      store.set({picked: heroItems[(index + 1) % heroItems.length]});
    }, HERO_ROTATE_MS);
    return () => clearTimeout(id);
  }, [rotating, featured, active, heroItems]);
  return null;
});

export const HeroBackdrop = memo(function HeroBackdrop({store, heroItems}) {
  return <Backdrop item={useFeatured(store, heroItems).featured} />;
});

export const HeroInfo = memo(function HeroInfo({store, heroItems, onPlay, onMore, onFocus}) {
  const item = useFeatured(store, heroItems).featured;
  const shown = useRef(item);
  shown.current = item;
  const play = useCallback(() => shown.current && onPlay(shown.current), [onPlay]);
  const more = useCallback(() => shown.current && onMore(shown.current), [onMore]);
  const entrance = useEntrance(item?.key);
  return (
    <View className="absolute left-12 top-[104px] w-[600px] gap-4">
      {item ? (
        <Animated.View className="gap-4" style={entrance}>
          <Logo item={item} w={420} h={130} />
          <MetaLine item={item} />
          <Text className="font-inter text-md text-slate-200 line-clamp-3">{clampText(item.overview, HERO_OVERVIEW_BYTES)}</Text>
        </Animated.View>
      ) : <View className="h-[130px]" />}
      <View className="flex-row gap-4 pt-2">
        {/* Up goes to the Home tab: the tab bar remembers nothing on a fresh start, and the nearest
            element above Play is the Favorites heart, which would switch the page. */}
        <Button focusKey="hero-play" nextFocusUp="tab:Home" label="Play" icon={PlayIcon} primary
          onPress={play} onFocus={onFocus} />
        <Button focusKey="hero-info" nextFocusUp="tab:Home" label="More Info" icon={InfoIcon}
          onPress={more} onFocus={onFocus} />
      </View>
    </View>
  );
});
