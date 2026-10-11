import {ScrollView, Text, View} from '@ps5-react/core';
import {px} from '../theme.js';

/**
 * A titled horizontal row (cast, related titles) inside a scrolling page. `anchor` makes the page
 * scroll the whole row into view on focus, title and captions included, not just the focused card.
 * `room` (logical px) pads the cards above and below, so the ScrollView does not clip a focused one:
 * focusRoom(card height) for cards.
 */
export function Shelf({title, height, room = 12, anchor = false, children}) {
  return (
    <View scrollAnchor={anchor} className="gap-1">
      {title ? <Text className="font-semi text-lg text-white px-12">{title}</Text> : null}
      <ScrollView horizontal className="flex-row" style={{height}}>
        <View className="flex-row gap-4 px-12" style={{paddingTop: px(room), paddingBottom: px(room)}}>{children}</View>
      </ScrollView>
    </View>
  );
}
