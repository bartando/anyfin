import {memo, useCallback, useEffect, useRef, useState} from 'react';
import {FocusScope, PanView, ScrollView, Text, View, motion, transitions, useFocusActions, useIsScreenActive, useTouching}
  from '@react-on-anything/core';
import {HERO_ROTATE_MS, PREVIEW_DELAY_MS, SCREEN, px} from '../theme.js';
import {clampText} from '../lib/format.js';
import {Backdrop} from '../components/Backdrop.jsx';
import {CaptionedCard} from '../components/Cards.jsx';
import {Button} from '../components/Button.jsx';
import {InfoIcon, PlayIcon} from '../components/Icons.jsx';
import {Logo} from '../components/Logo.jsx';
import {MetaLine} from '../components/Meta.jsx';

// The page scrolls by translating one column (hero block, then rows) instead of a ScrollView, so the
// top bar can move with it in lockstep. Heights are fixed, which makes every row's offset known up front.
// A finger scrolls it freely through `pan` (the top bar's too), detached from focus: nothing here
// scrolls to focus or previews it until a button is pressed again.
const HERO_H = 474;
const ROW_H = 250;
const ROW_TOP = 24; // a focused row's title sits this far below the screen top
// The first row already shows under the hero, so focusing it keeps the page where it is.
const maxOffset = count => Math.max(0, HERO_H + count * ROW_H + 40 - SCREEN.h);
function rowOffset(index, count) {
  return index === 0 ? 0 : Math.max(0, Math.min(HERO_H + index * ROW_H - ROW_TOP, maxOffset(count)));
}

// Hero overviews are clamped to three lines and also kept under the engine's 255-byte text node cap.
const HERO_OVERVIEW_BYTES = 200;

const HeroInfo = memo(function HeroInfo({item, onPlay, onMore, onFocus}) {
  return (
    <View className="absolute left-12 top-[104px] w-[600px] gap-4">
      {item ? (
        <motion.View key={item.key} className="gap-4" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}
          transition={transitions.panel}>
          <Logo item={item} w={420} h={130} />
          <MetaLine item={item} />
          <Text className="font-inter text-md text-slate-200 line-clamp-3">{clampText(item.overview, HERO_OVERVIEW_BYTES)}</Text>
        </motion.View>
      ) : <View className="h-[130px]" />}
      <View className="flex-row gap-4 pt-2">
        {/* Up goes to the Home tab: the tab bar remembers nothing on a fresh start, and the nearest
            element above Play is the Favorites heart, which would switch the page. */}
        <Button focusKey="hero-play" nextFocusUp="tab:Home" label="Play" icon={PlayIcon} primary
          onPress={() => item && onPlay(item)} onFocus={onFocus} />
        <Button focusKey="hero-info" nextFocusUp="tab:Home" label="More Info" icon={InfoIcon}
          onPress={() => item && onMore(item)} onFocus={onFocus} />
      </View>
    </View>
  );
});

// Memoized with a stable onPreview: every focus move scrolls the page (a new scrollY), which must not
// re-render every card.
const Row = memo(function Row({row, onOpen, onPreview}) {
  const onFocus = useCallback(item => onPreview(item, row.id), [onPreview, row.id]);
  return (
    <View style={{height: px(ROW_H)}}>
      <Text className="font-semi text-lg text-white px-12">{row.title}</Text>
      <FocusScope row>
        <ScrollView horizontal className="flex-row h-[206px]">
          <View className="flex-row gap-4 px-12 py-[14px]">
            {row.items.map(item => <CaptionedCard key={item.key} item={item} onPress={onOpen} onFocus={onFocus} />)}
          </View>
        </ScrollView>
      </FocusScope>
    </View>
  );
});

/**
 * Home: a crossfading full-bleed backdrop, hero info for the featured title and rows below. The hero
 * rotates every 8 s while focus is on its buttons; resting on a card features that card instead.
 * `scrollY` (logical px) lives in the app because the top bar scrolls away with this page, as `pan`
 * moves both under a finger.
 */
export function HomePage({home, onOpen, onPlay, scrollY = 0, onScrollY, pan}) {
  const active = useIsScreenActive();
  const {touching} = useFocusActions();
  const touched = useTouching();
  const heroItems = home?.hero ?? [];
  const rows = home?.rows ?? [];
  const [picked, setFeatured] = useState(null);
  const featured = picked ?? heroItems[0] ?? null;
  const [rotating, setRotating] = useState(true);
  const pending = useRef(null);
  const latestRows = useRef(rows);
  latestRows.current = rows;
  // The row focus is in, by id: rows that come or go above it (a favorite toggled) move it.
  const focusedRow = useRef(null);
  const scrollTo = rowId => {
    const at = latestRows.current.findIndex(row => row.id === rowId);
    if (at >= 0) onScrollY(rowOffset(at, latestRows.current.length));
  };

  useEffect(() => {
    if (!rotating || !active || heroItems.length < 2) return undefined;
    const id = setTimeout(() => {
      const index = heroItems.findIndex(item => item.key === featured?.key);
      setFeatured(heroItems[(index + 1) % heroItems.length]);
    }, HERO_ROTATE_MS);
    return () => clearTimeout(id);
  }, [rotating, featured, active, heroItems]);
  useEffect(() => () => clearTimeout(pending.current), []);
  useEffect(() => {
    if (!active) clearTimeout(pending.current);
  }, [active]);
  // Only while scrolled into the rows: a tab focused scrolls the page back up without leaving a row.
  useEffect(() => {
    if (focusedRow.current && scrollY > 0) scrollTo(focusedRow.current);
  }, [rows.map(row => row.id).join('|')]);

  // Back from the touchscreen, the page goes to where focus is again.
  useEffect(() => {
    if (!touched && focusedRow.current) scrollTo(focusedRow.current);
  }, [touched]);

  const preview = useCallback((item, rowId) => {
    focusedRow.current = rowId;
    if (touching()) return;
    scrollTo(rowId);
    setRotating(false);
    clearTimeout(pending.current);
    pending.current = setTimeout(() => setFeatured(item), PREVIEW_DELAY_MS);
  }, []);
  const heroFocus = useCallback(() => {
    focusedRow.current = null;
    if (touching()) return;
    onScrollY(0);
    clearTimeout(pending.current);
    setRotating(true);
  }, []);

  return (
    <View className="absolute inset-0">
      <Backdrop item={featured} />
      {/* In the rows one flat dim replaces the hero's gradients: every layer under the moving column is
          blended again on each frame of the scroll. It snaps rather than fades, since animated opacity on a
          screen-sized node is the costliest effect. */}
      {scrollY > 0 ? <View pointerEvents="none" className="absolute inset-0 bg-canvas/70" /> : (
        <>
          <View pointerEvents="none" className="absolute left-0 top-0 bottom-0 w-[1000px]
            bg-gradient-to-r from-canvas via-canvas/85 to-transparent" />
          <View pointerEvents="none" className="absolute left-0 right-0 bottom-0 h-[460px]
            bg-gradient-to-t from-canvas via-canvas/80 to-transparent" />
          <View pointerEvents="none" className="absolute left-0 right-0 top-0 h-[120px]
            bg-gradient-to-b from-black/60 to-transparent" />
        </>
      )}
      {/* Hidden, it lets go of what a finger scrolled, and the top bar with it. */}
      <PanView pan={pan} offset={active ? scrollY : 0} max={active ? maxOffset(rows.length) : 0}
        className="absolute inset-0" pointerEvents="box-none">
        <motion.View className="absolute left-0 right-0 top-0" initial={false} animate={{y: -scrollY}}
          transition={transitions.screen}>
          <View style={{height: px(HERO_H)}}>
            <HeroInfo item={featured} onPlay={onPlay} onMore={onOpen} onFocus={heroFocus} />
          </View>
          {rows.map(row => <Row key={row.id} row={row} onOpen={onOpen} onPreview={preview} />)}
        </motion.View>
      </PanView>
    </View>
  );
}
