import {Text, View, useIsFocused} from '@ps5-react/core';
import {px} from '../../theme.js';
import {clock} from '../../lib/format.js';
import {PauseIcon, PlayIcon} from '../Icons.jsx';

const THUMB = 14, THUMB_FOCUSED = 22, BUBBLE_W = 132;

/**
 * The seek bar, the only focusable element in its row: Left and Right find nothing to move to, and
 * the player turns them into seeks. X pauses. `pending` is where a seek still being chosen lands.
 */
export function Scrubber({position, duration, buffered, paused, pending, onPress}) {
  return (
    <View focusKey="player-bar" onPress={onPress} className="flex-row items-center gap-5 h-[56px]">
      <Bar position={position} duration={duration} buffered={buffered} paused={paused} pending={pending} />
    </View>
  );
}

function Bar({position, duration, buffered, paused, pending}) {
  const focused = useIsFocused();
  const shown = pending ?? position;
  const fraction = value => (duration > 0 ? Math.min(1, Math.max(0, value / duration)) : 0);
  const at = `${fraction(shown) * 100}%`;
  const thumb = focused ? THUMB_FOCUSED : THUMB;
  const Glyph = paused ? PlayIcon : PauseIcon;
  return (
    <>
      <Glyph size={26} color="#ffffff" />
      <Text className="font-semi text-md text-white w-[84px]">{clock(shown)}</Text>
      <View className={`flex-1 rounded-full bg-white/20 ${focused ? 'h-[8px]' : 'h-[5px]'}`}>
        <View className="absolute left-0 top-0 bottom-0 rounded-full bg-white/30" style={{width: `${fraction(buffered) * 100}%`}} />
        <View className="absolute left-0 top-0 bottom-0 rounded-full bg-accent" style={{width: at}} />
        <View className="absolute rounded-full bg-white" style={{left: at, top: '50%', width: px(thumb), height: px(thumb),
          marginLeft: -px(thumb / 2), marginTop: -px(thumb / 2)}} />
        {pending != null && (
          <View className="absolute items-center" style={{left: at, bottom: px(20), width: px(BUBBLE_W), marginLeft: -px(BUBBLE_W / 2)}}>
            <View className="px-3 py-1 rounded-lg bg-white">
              <Text className="font-semi text-md text-canvas">{signed(pending - position)}</Text>
            </View>
          </View>
        )}
      </View>
      <Text className="font-semi text-md text-white w-[96px] text-right">−{clock(duration - shown)}</Text>
    </>
  );
}

const signed = seconds => `${seconds < 0 ? '−' : '+'}${clock(Math.abs(seconds))}`;
