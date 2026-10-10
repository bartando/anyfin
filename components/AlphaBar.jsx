import {memo} from 'react';
import {Text, View} from '@ps5-react/core';
import {LETTERS} from '../lib/format.js';

/** The A–Z index beside a library grid: the current letter lit, letters without titles dimmed. */
export const AlphaBar = memo(function AlphaBar({available, current, jumping}) {
  return (
    <View className="w-[32px] py-2 rounded-full bg-black/55 border border-white/10 items-center">
      {LETTERS.map(letter => {
        const lit = letter === current;
        return (
          <View key={letter} className={`w-[26px] h-[21px] rounded-full items-center justify-center
            ${lit ? (jumping ? 'bg-accent' : 'bg-white/25') : ''}`}>
            <Text className={`font-semi text-[14px] leading-[18px]
              ${lit ? 'text-white' : available.has(letter) ? 'text-slate-300' : 'text-slate-600'}`}>{letter}</Text>
          </View>
        );
      })}
    </View>
  );
});

/** The letter a held key is jumping through, large in the middle of the grid. */
export function LetterBadge({letter}) {
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      {/* text-xl: the engine draws text at most 96 render px, 32 logical at 4K. */}
      <View className="w-[96px] h-[96px] rounded-2xl bg-black/70 border border-white/15 items-center justify-center">
        <Text className="font-semi text-xl text-white">{letter}</Text>
      </View>
    </View>
  );
}
