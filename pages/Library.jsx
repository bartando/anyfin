import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Controller, ScrollView, Text, View, VirtualList, useNavigationEvents} from '@react-on-anything/core';
import {POSTER, PREVIEW_DELAY_MS, px} from '../theme.js';
import {LETTERS, clampText, clean, formatCount} from '../lib/format.js';
import {useLetterOffsets} from '../lib/jellyfin/letters.js';
import {usePagedItems} from '../lib/jellyfin/paged.js';
import {AlphaBar, LetterBadge} from '../components/AlphaBar.jsx';
import {Backdrop} from '../components/Backdrop.jsx';
import {Button} from '../components/Button.jsx';
import {PosterCard} from '../components/Cards.jsx';
import {MetaLine} from '../components/Meta.jsx';

const BACKDROP = {w: 760, h: 428};
// Holding Up or Down this many repeats switches from rows to letters, as Infuse does; a pause this
// long between repeats ends it.
const HOLD_MOVES = 5;
const REPEAT_GAP_MS = 260;
const LETTER_IDLE_MS = 450;
const NO_LETTERS = {first: new Map(), starts: [], available: new Set(), letterAt: () => null};

/** Where each A–Z letter starts, from how many titles sort before it; letters with none are left out. */
function alphabet(offsets, total) {
  if (!offsets || !total) return NO_LETTERS;
  const first = new Map();
  LETTERS.forEach((letter, at) => {
    const start = offsets.get(letter);
    const end = at + 1 < LETTERS.length ? offsets.get(LETTERS[at + 1]) : total;
    if (end > start) first.set(letter, start);
  });
  const starts = [...first.entries()];
  const letterAt = index => {
    let letter = null;
    for (const [candidate, start] of starts) if (start <= index) letter = candidate;
    return letter;
  };
  return {first, starts, available: new Set(first.keys()), letterAt};
}

const gaps = new Map();
/** An empty cell finishing a letter's last row; the same object per cell, for the rows' memo. */
function gap(at) {
  let cell = gaps.get(at);
  if (!cell) gaps.set(at, cell = Object.freeze({key: `gap:${at}`, gap: true}));
  return cell;
}

/**
 * Where the grid's cells come from: each letter starts a row of its own (Infuse's grid), so the last
 * row of a letter is filled up with empty cells, and a jump lands at the row's start. `cellOf` maps a
 * title's place in the library to its cell. Without the letter index the titles run on.
 */
function planGrid(index, total, columns) {
  if (!index.starts.length || !total) return {padded: false, length: total ?? 0, cellOf: at => at, titleAt: at => at, segments: []};
  // Each letter's titles [start, end) go to the cells from `cell` on.
  const segments = [];
  let cell = 0;
  index.starts.forEach(([, start], at) => {
    const end = Math.min(total, at + 1 < index.starts.length ? index.starts[at + 1][1] : total);
    segments.push({start, end, cell});
    cell += Math.max(0, end - start);
    cell = Math.ceil(cell / columns) * columns;
  });
  const cellOf = at => {
    let lo = 0, hi = segments.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segments[mid].start <= at) lo = mid;
      else hi = mid - 1;
    }
    return segments[lo].start <= at ? segments[lo].cell + at - segments[lo].start : at;
  };
  // The title in a cell, or -1 for a cell finishing a letter's row.
  const titleAt = at => {
    let lo = 0, hi = segments.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segments[mid].cell <= at) lo = mid;
      else hi = mid - 1;
    }
    const {start, end, cell: first} = segments[lo];
    return at - first < end - start ? start + at - first : -1;
  };
  return {padded: true, length: cell, cellOf, titleAt, segments};
}

/** All cells of `plan` filled from `data`: once per letter index, O(library). */
function fillGrid(plan, data) {
  const cells = new Array(plan.length);
  let next = 0;
  for (const {start, end, cell} of plan.segments) {
    for (; next < cell; next++) cells[next] = gap(next);
    for (let i = start; i < end && i < data.length; i++) cells[next++] = data[i];
  }
  for (; next < plan.length; next++) cells[next] = gap(next);
  return cells;
}

const keyOf = (_, index) => String(index);
const GAP = {width: px(POSTER.w), height: px(POSTER.h)};

/**
 * A library tab: a poster grid of a whole server library, loaded a page at a time as it scrolls; the
 * focused poster's title, meta and art fill the header. `params` is the Jellyfin items query;
 * `version` reloads it (Favorites after a toggle).
 */
export function LibraryPage({title, params, version = 0, onOpen, empty, facts, unit = 'TITLE', alphabetical = false}) {
  const key = `${JSON.stringify(params)}#${version}`;
  const {data, total, error, need, reload, seq, changesSince} = usePagedItems(params, key);
  const [focused, setFocused] = useState(0);
  const [artAt, setArtAt] = useState(0);
  const pending = useRef(null);
  useEffect(() => () => clearTimeout(pending.current), []);

  const offsets = useLetterOffsets(params, total, alphabetical);
  const index = useMemo(() => alphabet(offsets, total), [offsets, total]);
  const plan = useMemo(() => planGrid(index, total, POSTER.cols), [index, total]);
  // A page arriving patches its cells into a copy; only a new letter index fills the grid afresh.
  const built = useRef({plan: null, data: null, seq: 0, cells: []});
  const grid = useMemo(() => {
    const last = built.current;
    let cells;
    if (!plan.padded) cells = data;
    else if (last.plan !== plan || last.data === null) cells = fillGrid(plan, data);
    else {
      const changes = changesSince(last.seq);
      if (!changes) cells = fillGrid(plan, data);
      else {
        cells = last.cells.slice();
        for (const {from, to} of changes) for (let i = from; i < to; i++) cells[plan.cellOf(i)] = data[i];
      }
    }
    built.current = {plan, data, seq, cells};
    return {cells, cellOf: plan.cellOf, titleAt: plan.titleAt};
  }, [plan, data, seq]);

  const listRef = useRef(null);
  const focusedAt = useRef(-1);
  const hold = useRef({direction: null, count: 0, last: 0, letter: null, timer: null}).current;
  const [jumpLetter, setJumpLetter] = useState(null);
  useEffect(() => () => clearTimeout(hold.timer), []);

  // A held Up/Down repeats a move each tick. After HOLD_MOVES of them each repeat jumps to the next
  // letter that has titles instead, with a tick of the motors; the pause after release ends it.
  useNavigationEvents(event => {
    // While a jump lands, focus is nowhere for a frame or two and moves report blocked: the hold goes on.
    if (event.type !== 'move' && !(event.type === 'blocked' && hold.letter)) return;
    const vertical = event.direction === 'up' || event.direction === 'down';
    // Mid-jump the old card can lose focus before the new one takes it; the hold carries on.
    if (!alphabetical || !vertical || (focusedAt.current < 0 && !hold.letter) || !index.available.size) {
      hold.direction = null;
      hold.count = 0;
      return;
    }
    const now = Date.now();
    hold.count = hold.direction === event.direction && now - hold.last < REPEAT_GAP_MS ? hold.count + 1 : 1;
    hold.direction = event.direction;
    hold.last = now;
    clearTimeout(hold.timer);
    hold.timer = setTimeout(() => {
      hold.letter = null;
      hold.count = 0;
      setJumpLetter(null);
    }, LETTER_IDLE_MS);
    if (hold.count < HOLD_MOVES) return;
    const from = LETTERS.indexOf(hold.letter ?? index.letterAt(Math.max(0, focusedAt.current)));
    const step = event.direction === 'down' ? 1 : -1;
    let at = from + step;
    while (at >= 0 && at < LETTERS.length && !index.available.has(LETTERS[at])) at += step;
    if (at < 0 || at >= LETTERS.length) return;
    hold.letter = LETTERS[at];
    setJumpLetter(hold.letter);
    listRef.current?.focusIndex(grid.cellOf(index.first.get(hold.letter)));
    Controller.vibrate(0.25, 35);
  });

  // The letter index arriving pads the rows and moves the titles to other cells: focus follows its title.
  // (A page arriving changes the cells too, but no title moves.)
  const laidOut = useRef(index);
  useEffect(() => {
    if (laidOut.current === index) return;
    laidOut.current = index;
    if (focusedAt.current >= 0) listRef.current?.focusIndex(grid.cellOf(focusedAt.current));
  }, [index]);

  const onBlur = useCallback(() => { focusedAt.current = -1; }, []);
  const onFocus = useCallback(item => {
    focusedAt.current = item.slot;
    setFocused(item.slot);
    clearTimeout(pending.current);
    pending.current = setTimeout(() => setArtAt(item.slot), PREVIEW_DELAY_MS);
  }, []);
  // A card still waiting for its page asks for it as it mounts: only pages near the screen load.
  // A cell whose page has not arrived is a hole: its card gets a placeholder made on the spot and asks
  // for the page as it mounts, so only pages near the screen load.
  const titleAt = useRef(grid.titleAt);
  titleAt.current = grid.titleAt;
  const renderItem = useCallback(({item, index: at}) => {
    if (item?.gap) return <View style={GAP} />;
    if (!item) {
      const slot = titleAt.current(at);
      if (slot < 0) return <View style={GAP} />;
      need(slot);
      item = {key: `slot:${slot}`, slot, placeholder: true, title: '', genres: [], cast: []};
    }
    return <PosterCard item={item} onPress={onOpen} onFocus={onFocus} onBlur={onBlur} />;
  }, [onOpen, onFocus, need]);

  // The art stays on the last loaded title while the focused one's page is on its way.
  const lastArt = useRef(null);
  const art = data[artAt];
  if (art) lastArt.current = art;
  else if (!lastArt.current) lastArt.current = data[0] ?? null;

  if (total == null || total === 0) {
    const message = total === 0 ? empty ?? 'Nothing in this library yet.'
      : error ? `Could not load ${title}: ${error.message}` : 'Loading…';
    return (
      <View className="absolute left-12 top-[92px] w-[640px] gap-3">
        <Text className="font-semi text-xs text-accent-soft tracking-widest">{title.toUpperCase()}</Text>
        <Text className="font-inter text-md text-slate-300">{message}</Text>
        {error && total == null && <View className="flex-row"><Button label="Retry" onPress={reload} /></View>}
      </View>
    );
  }

  const shown = data[Math.min(focused, total - 1)];
  const count = `${formatCount(total)} ${total === 1 ? unit : `${unit}S`}`;
  return (
    <View className="absolute inset-0">
      <View className="absolute right-0 top-0 w-[760px] h-[428px]" pointerEvents="none">
        <Backdrop item={lastArt.current} w={BACKDROP.w} h={BACKDROP.h} fadeMs={350} />
        <View className="absolute left-0 top-0 bottom-0 w-[420px] bg-gradient-to-r from-canvas to-transparent" />
        <View className="absolute left-0 right-0 bottom-0 h-[260px] bg-gradient-to-t from-canvas to-transparent" />
        <View className="absolute left-0 right-0 top-0 h-[120px] bg-gradient-to-b from-canvas/70 to-transparent" />
      </View>
      <View className="absolute left-12 top-[92px] w-[640px] gap-2">
        <Text className="font-semi text-xs text-accent-soft tracking-widest">{title.toUpperCase()} · {count}</Text>
        {!shown ? <View className="h-[40px]" /> : (
          <>
            <Text className="font-semi text-xl text-white truncate">{clean(shown.title)}</Text>
            {facts ? <Text className="font-inter text-sm text-slate-300">{facts(shown)}</Text> : <MetaLine item={shown} genres={3} />}
            <Text className="font-inter text-sm text-slate-300 line-clamp-2">{clampText(shown.overview, 180)}</Text>
          </>
        )}
      </View>
      <ScrollView className="absolute left-0 right-0 bottom-0 top-[262px]">
        <View className="px-12 py-4">
          <VirtualList ref={listRef} data={grid.cells} keyExtractor={keyOf} renderItem={renderItem}
            numColumns={POSTER.cols} itemHeight={POSTER.h} rowGap={POSTER.rowGap} columnGap={POSTER.colGap} />
        </View>
        <View className="h-[24px]" />
      </ScrollView>
      {alphabetical && index.available.size > 0 && (
        <View className="absolute right-[12px] top-[96px]" pointerEvents="none">
          <AlphaBar available={index.available} current={jumpLetter ?? index.letterAt(focused)} jumping={!!jumpLetter} />
        </View>
      )}
      {jumpLetter && (
        <View className="absolute left-0 right-0 top-[262px] bottom-0" pointerEvents="none">
          <LetterBadge letter={jumpLetter} />
        </View>
      )}
    </View>
  );
}
