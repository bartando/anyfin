import {Image, Text, View, useIsFocused} from '@ps5-react/core';
import {SIZES} from '../../theme.js';
import {clean} from '../../lib/format.js';
import {thumbUrl} from '../../lib/art.js';
import {episodeCode} from '../../lib/jellyfin/items.js';
import {FocusRing} from '../FocusRing.jsx';
import {FaceGlyph} from '../FaceGlyph.jsx';
import {PlayIcon} from '../Icons.jsx';
import {remote} from '../../lib/remote.js';

/**
 * The next episode, offered over the end of this one: X on Play Now starts it, Circle puts the card
 * away. `seconds` counts down to when it starts by itself, or is null with autoplay off.
 */
export function UpNext({next, seconds, onPlay}) {
  const uri = thumbUrl(next, SIZES.card);
  return (
    <View className="w-[440px] p-4 flex-row gap-4 rounded-2xl bg-canvas/90 border border-white/15">
      <View className="w-[160px] h-[90px] rounded-lg bg-white/10">
        {uri && <Image source={{uri}} className="w-[160px] h-[90px] rounded-lg" />}
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-semi text-xs text-accent-soft">
          {seconds != null ? `UP NEXT IN ${seconds}` : 'UP NEXT'}
        </Text>
        <Text className="font-semi text-sm text-white truncate w-[232px]">
          {[episodeCode(next), clean(next.title)].filter(Boolean).join(' · ')}
        </Text>
        <View className="flex-row items-center gap-3 pt-1">
          <View focusKey="player-upnext" onPress={onPlay}
            className="h-[36px] px-4 flex-row items-center gap-2 rounded-full bg-white/15 focused:bg-white">
            <PlayLabel />
          </View>
          <View className="flex-row items-center gap-1">
            <FaceGlyph button="circle" size={14} color="rgba(255,255,255,0.55)" />
            <Text className="font-inter text-xs text-white/55">{remote ? 'Back hides' : 'Hide'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function PlayLabel() {
  const focused = useIsFocused();
  return (
    <>
      <PlayIcon size={14} color={focused ? '#0b0b12' : '#ffffff'} />
      <Text focused={focused} className="font-semi text-sm text-white focused:text-canvas">Play Now</Text>
      {focused && <FocusRing radius={18} outX={3} outY={3} />}
    </>
  );
}
