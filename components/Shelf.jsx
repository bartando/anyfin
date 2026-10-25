import {Children, useRef, useState} from 'react';
import {FocusScope, ScrollView, Text, View} from '@ps5-react/core';
import {px} from '../theme.js';

// Cards mounted before the shelf has measured itself, and how far past the scroll target (in
// viewports) it keeps cards mounted after: a detail page's cast, stills and similar titles would
// otherwise mount, and load the images of, every card at once, most of them never seen.
const INITIAL = 8;
const AHEAD = 0.5;

/**
 * A titled horizontal row (cast, related titles) inside a scrolling page. `anchor` makes the page
 * scroll the whole row into view on focus, title and captions included, not just the focused card.
 * `room` (logical px) pads the cards above and below, so the ScrollView does not clip a focused one:
 * focusRoom(card height) for cards. Its cards are a focus row: Left and Right stop at its ends, and it
 * starts at its first card, later the one it had. Cards past the screen mount as it scrolls toward them.
 */
export function Shelf({title, height, room = 12, anchor = false, children}) {
  const cards = Children.toArray(children);
  const [count, setCount] = useState(INITIAL);
  const seen = useRef({viewport: 0, content: 0, mounted: 0, x: 0}).current;
  const fill = () => {
    if (!seen.viewport || !seen.content || !seen.mounted || seen.mounted >= cards.length) return;
    const reach = seen.x + seen.viewport * (1 + AHEAD);
    if (seen.content >= reach) return;
    const needed = Math.ceil(reach / (seen.content / seen.mounted));
    setCount(current => Math.max(current, needed));
  };
  const shown = Math.min(count, cards.length);
  return (
    <View scrollAnchor={anchor} className="gap-1">
      {title ? <Text className="font-semi text-lg text-white px-12">{title}</Text> : null}
      <FocusScope row>
        <ScrollView horizontal className="flex-row" style={{height}}
          onLayout={event => { seen.viewport = event.layout.width; fill(); }}
          onScrollTarget={({x}) => { seen.x = x; fill(); }}>
          <View className="flex-row gap-4 px-12" style={{paddingTop: px(room), paddingBottom: px(room)}}
            onLayout={event => { seen.content = event.layout.width; seen.mounted = shown; fill(); }}>
            {shown < cards.length ? cards.slice(0, shown) : cards}
          </View>
        </ScrollView>
      </FocusScope>
    </View>
  );
}
