import {Text, View, useIsFocused} from '@ps5-react/core';
import {px} from '../../theme.js';
import {clean} from '../../lib/format.js';
import {episodeCode} from '../../lib/jellyfin/items.js';
import {BackIcon, NextEpisodeIcon, SubtitlesIcon} from '../Icons.jsx';

const LABEL_W = 200, BUTTON = 52;

/** Back, Audio & Subtitles and Next Episode on the left, the title on the right. */
export function PlayerHeader({item, onBack, onOptions, onNext}) {
  const episode = item.kind === 'episode';
  return (
    <View className="flex-row items-start justify-between">
      <View className="flex-row gap-7">
        <IconButton focusKey="player-back" icon={BackIcon} label="Back" onPress={onBack} />
        <IconButton focusKey="player-options" icon={SubtitlesIcon} label="Audio & Subtitles" onPress={onOptions} />
        {onNext && <IconButton focusKey="player-next" icon={NextEpisodeIcon} label="Next Episode" onPress={onNext} />}
      </View>
      <View className="items-end pt-1">
        <Text className="font-semi text-xl text-white">{clean(episode ? item.seriesTitle ?? item.title : item.title)}</Text>
        {episode && (
          <Text className="font-inter text-md text-white/75">
            {[episodeCode(item), clean(item.title)].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
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
