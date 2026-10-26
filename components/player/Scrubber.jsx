import {useEffect} from 'react';
import {Text, View, useIsFocused} from '@react-on-anything/core';
import {SCREEN, px} from '../../theme.js';
import {clock} from '../../lib/format.js';
import {setQuietEdges} from '../../lib/edges.js';

// The bar spans the screen less the player's side padding (px-12); the tag over a seek stays inside it.
const BAR_W = SCREEN.w - 2 * 48, TAG_W = 240;

/**
 * The seek bar, the only focusable element in its row: Left and Right find nothing to move to, and
 * the player turns them into seeks. X pauses. `pending` is where a seek still being chosen lands: the
 * stretch it skips lights up and its time and distance show over where it ends; `rate`, while a
 * trigger scrubs, how fast it moves there (film seconds a second). On a touchscreen a finger takes
 * the bar (`onDrag`, given while the controls show): it thickens under the finger, which drags `pending`
 * along it (`grabbed`).
 */
export function Scrubber({position, duration, buffered, pending, rate, grabbed, onPress, onDrag}) {
  // Closing the player with the bar focused may never blur it.
  useEffect(() => () => setQuietEdges(false), []);
  return (
    <View focusKey="player-bar" onPress={onPress} onDrag={onDrag} onFocus={() => setQuietEdges(true)}
      onBlur={() => setQuietEdges(false)}>
      <Bar position={position} duration={duration} buffered={buffered} pending={pending} rate={rate} grabbed={grabbed} />
    </View>
  );
}

function Bar({position, duration, buffered, pending, rate, grabbed}) {
  const focused = useIsFocused();
  const fraction = value => (duration > 0 ? Math.min(1, Math.max(0, value / duration)) : 0);
  const played = fraction(position);
  const target = pending == null ? null : fraction(pending);
  return (
    <>
      <View className={`rounded-full bg-white/20 ${grabbed ? 'h-[12px]' : focused ? 'h-[6px]' : 'h-[4px]'}`}>
        <View className="absolute left-0 top-0 bottom-0 rounded-full bg-white/25" style={{width: `${fraction(buffered) * 100}%`}} />
        <View className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-accent to-accent-soft"
          style={{width: `${played * 100}%`}} />
        {target != null && (
          <>
            <View className="absolute top-0 bottom-0 rounded-full bg-white/60"
              style={{left: `${Math.min(played, target) * 100}%`, width: `${Math.abs(target - played) * 100}%`}} />
            {grabbed && (
              <View className="absolute top-[-8px] size-7 rounded-full bg-white border-2 border-accent-soft"
                style={{left: px(target * BAR_W - 14)}} />
            )}
            <View className={`absolute flex-row items-end justify-center gap-3 ${grabbed ? 'bottom-[44px]' : 'bottom-[16px]'}`}
              style={{left: px(Math.min(Math.max(target * BAR_W - TAG_W / 2, 0), BAR_W - TAG_W)), width: px(TAG_W)}}>
              <Text className="font-semi text-lg text-white">{clock(pending)}</Text>
              <Text className="font-semi text-md text-accent-soft">
                {signed(pending - position)}{rate > 0 ? `  ${Math.round(rate)}×` : ''}
              </Text>
            </View>
          </>
        )}
      </View>
      <View className="flex-row justify-between mt-3">
        <Text className="font-semi text-md text-white">{clock(position)}</Text>
        <Text className="font-semi text-md text-white/65">−{clock(duration - position)}</Text>
      </View>
    </>
  );
}

const signed = seconds => `${seconds < 0 ? '−' : '+'}${clock(Math.abs(seconds))}`;
