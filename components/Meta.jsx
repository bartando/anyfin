import {Text, View} from '@react-on-anything/core';
import {metaParts} from '../lib/format.js';
import {StarIcon} from './Icons.jsx';

const dot = <Text className="font-inter text-sm text-slate-400">·</Text>;

/** "★ 8.7 · 2021 · Animation · Action & Adventure [TV-14]"; the rating hides for unreleased titles. */
export function MetaLine({item, genres = 2}) {
  const parts = metaParts(item, genres);
  return (
    <View className="flex-row items-center gap-2">
      {item.rating > 0 && (
        <View className="flex-row items-center gap-1">
          <StarIcon size={14} />
          <Text className="font-semi text-sm text-white">{item.rating.toFixed(1)}</Text>
        </View>
      )}
      {parts.map((part, index) => (
        <View key={part + index} className="flex-row items-center gap-2">
          {(index > 0 || item.rating > 0) && dot}
          <Text className="font-inter text-sm text-slate-200">{part}</Text>
        </View>
      ))}
      {item.certification && (
        <View className="ml-1 px-2 rounded border border-white/50">
          <Text className="font-semi text-xs text-white">{item.certification}</Text>
        </View>
      )}
    </View>
  );
}
