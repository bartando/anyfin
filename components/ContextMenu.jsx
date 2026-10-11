import {FocusScope, Text, View, motion, transitions, useIsFocused} from '@ps5-react/core';
import {SCREEN, px} from '../theme.js';
import {clean} from '../lib/format.js';
import {caption, cardTitle} from '../lib/jellyfin/items.js';
import {useIsFavorite, useIsPlayed} from '../lib/favorites.js';
import {CheckIcon, HeartFilledIcon, HeartIcon, InfoIcon, PlayIcon, RestartIcon} from './Icons.jsx';

// Logical px. The height is worked out from the rows, so the menu can be placed before it lays out; a
// title longer than TITLE_CHARS takes a second line.
const W = 300, GAP = 20, MARGIN = 32, HEADER = 62, TITLE_LINE = 27, TITLE_CHARS = 24, ROW = 48, PAD = 8;

/** What Triangle offers for `item`; ids are what `onPick` gets. */
function entries(item, played, favorite) {
  const list = [];
  if (item.kind === 'movie' || item.kind === 'episode') {
    const resume = !played && item.positionMinutes > 0;
    list.push({id: 'play', label: resume ? `Resume ${item.positionMinutes} min` : 'Play', icon: PlayIcon});
    if (resume) list.push({id: 'restart', label: 'Play from the start', icon: RestartIcon});
  }
  if (item.kind !== 'collection') list.push({id: 'watched', label: played ? 'Mark as unwatched' : 'Mark as watched', icon: CheckIcon});
  list.push({id: 'favorite', label: favorite ? 'Remove from Favorites' : 'Add to Favorites',
    icon: favorite ? HeartFilledIcon : HeartIcon});
  list.push({id: 'info', label: item.kind === 'episode' ? 'Go to series' : 'Details', icon: InfoIcon});
  return list;
}

// Beside the card, right if it fits, else left; level with its top, kept on screen. `rect` is in
// render px, as useFocus().focusedRect() gives it.
function place(rect, rows, title) {
  const header = HEADER + (title.length > TITLE_CHARS ? TITLE_LINE : 0);
  const w = px(W), height = px(header + rows * ROW + PAD * 2), margin = px(MARGIN);
  const right = rect.x + rect.width + px(GAP);
  const left = right + w <= px(SCREEN.w) - margin ? right : Math.max(margin, rect.x - px(GAP) - w);
  const top = Math.min(Math.max(margin, rect.y), px(SCREEN.h) - margin - height);
  return {left, top, width: w};
}

/** Triangle's menu for a focused card: play, watched, favorite, details. Circle or Triangle closes it. */
export function ContextMenu({item, rect, onPick, onClose}) {
  const played = useIsPlayed(item);
  const favorite = useIsFavorite(item);
  const list = entries(item, played, favorite);
  const title = clean(cardTitle(item));
  const close = () => { onClose(); return true; };
  return (
    <FocusScope trap autoFocus onBack={close} onAction={action => (action === 'triangle' ? close() : true)}>
      <motion.View className="absolute p-2 rounded-2xl bg-panel border border-edge" style={place(rect, list.length, title)}
        initial={{opacity: 0, x: -12}} animate={{opacity: 1, x: 0}} transition={transitions.panel}>
        <View className="px-4 pt-2 pb-3">
          <Text className="font-semi text-md text-white">{title}</Text>
          {!!caption(item) && <Text className="font-inter text-sm text-white/55">{caption(item)}</Text>}
        </View>
        {list.map(entry => (
          <View key={entry.id} onPress={() => onPick(entry.id, item)}
            className="h-[48px] px-4 flex-row items-center gap-3 rounded-xl focused:bg-white">
            <Entry entry={entry} />
          </View>
        ))}
      </motion.View>
    </FocusScope>
  );
}

function Entry({entry: {icon: Icon, label}}) {
  const focused = useIsFocused();
  return (
    <>
      <Icon size={18} color={focused ? '#0b0b12' : '#ffffff'} />
      <Text focused={focused} className="font-semi text-md text-white focused:text-canvas">{label}</Text>
    </>
  );
}
