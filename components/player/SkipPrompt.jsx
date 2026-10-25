import {Text, View, useIsFocused} from '@ps5-react/core';
import {FocusRing} from '../FocusRing.jsx';
import {TouchpadGlyph} from '../Icons.jsx';
import {remote} from '../../lib/remote.js';

const LABELS = {intro: 'Skip Intro', recap: 'Skip Recap'};

/**
 * Over the bottom right of the film while an intro or recap plays. The touchpad skips it whether or
 * not the controls show; with them up, Up from the bar reaches this and X does too.
 */
export function SkipPrompt({kind, onPress}) {
  return (
    <View focusKey="player-skip" onPress={onPress}
      className="h-[52px] pl-4 pr-5 flex-row items-center gap-3 rounded-full bg-black/70 border border-white/30
        focused:bg-white focused:border-white">
      <Body label={LABELS[kind]} />
    </View>
  );
}

function Body({label}) {
  const focused = useIsFocused();
  const color = focused ? '#0b0b12' : '#ffffff';
  return (
    <>
      {!remote && <TouchpadGlyph size={22} color={color} />}
      <Text focused={focused} className="font-semi text-md text-white focused:text-canvas">{label}</Text>
      {focused && <FocusRing radius={26} outX={4} outY={4} />}
    </>
  );
}
