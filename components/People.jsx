import {memo} from 'react';
import {Image, Text, View, useIsFocused} from '@ps5-react/core';
import {CAST} from '../theme.js';
import {clean} from '../lib/format.js';
import {profileUrl} from '../lib/art.js';
import {FocusRing} from './FocusRing.jsx';

function PersonRing() {
  return useIsFocused() ? <FocusRing radius={CAST.size / 2 + 4} outX={4} outY={4} /> : null;
}

/** A round portrait with the name and a second line (the role, or how often they worked together). */
export const PersonBubble = memo(function PersonBubble({person, onPress, focusKey}) {
  const initials = person.name.split(' ').map(part => part[0]).slice(0, 2).join('');
  return (
    <View className="w-[120px] items-center gap-2">
      <View focusable focusKey={focusKey} onPress={() => onPress?.(person)} className="size-24 rounded-full">
        <View className="absolute inset-0 rounded-full bg-panel items-center justify-center">
          <Text className="font-semi text-lg text-slate-400">{initials}</Text>
        </View>
        {person.profile && (
          <Image source={{uri: profileUrl(person)}} className="size-24 rounded-full" />
        )}
        <PersonRing />
      </View>
      <Text className="font-semi text-xs text-white text-center truncate w-[120px]">{clean(person.name)}</Text>
      {person.character ? (
        <Text className="font-inter text-xs text-slate-400 text-center truncate w-[120px]">{clean(person.character)}</Text>
      ) : null}
    </View>
  );
});
