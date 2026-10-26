import {Text, View, useIsFocused} from '@react-on-anything/core';
import {px} from '../../theme.js';
import {BackIcon, NextEpisodeIcon, SubtitlesIcon} from '../Icons.jsx';

const LABEL_W = 200, BUTTON = 52;

/** Back, Audio & Subtitles and Next Episode. The title sits over the seek bar. */
export function PlayerHeader({onBack, onOptions, onNext}) {
  return (
    <View className="flex-row gap-7">
      <IconButton focusKey="player-back" icon={BackIcon} label="Back" onPress={onBack} />
      <IconButton focusKey="player-options" icon={SubtitlesIcon} label="Audio & Subtitles" onPress={onOptions} />
      {onNext && <IconButton focusKey="player-next" icon={NextEpisodeIcon} label="Next Episode" onPress={onNext} />}
    </View>
  );
}

function IconButton({focusKey, icon, label, onPress}) {
  return (
    <View focusKey={focusKey} onPress={onPress}
      className="w-[52px] h-[52px] rounded-full items-center justify-center focused:bg-white">
      <IconBody Icon={icon} label={label} />
    </View>
  );
}

// The name shows under the focused button only, as on the reference players.
function IconBody({Icon, label}) {
  const focused = useIsFocused();
  return (
    <>
      <Icon size={26} color={focused ? '#0b0b12' : '#ffffff'} />
      {focused && (
        <View className="absolute top-[62px] items-center" style={{left: px((BUTTON - LABEL_W) / 2), width: px(LABEL_W)}}>
          <Text className="font-semi text-sm text-white">{label}</Text>
        </View>
      )}
    </>
  );
}
