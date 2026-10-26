import {Text, View, motion, transitions} from '@ps5-react/core';
import {PauseIcon, PlayIcon, SeekIcon} from '../Icons.jsx';
import {px} from '../../theme.js';

/**
 * A phone player's middle, for a finger: play/pause, with a step back and forward either side. A
 * controller has the scrubber and the triggers for these, so the player shows them only while the
 * touchscreen is in use. They fade with the rest of the controls.
 */
export function TouchControls({shown, paused, step, onToggle, onSeek}) {
  return (
    <motion.View pointerEvents="box-none" className="absolute inset-0 flex-row items-center justify-center gap-20"
      initial={false} animate={{opacity: shown ? 1 : 0}} transition={transitions.panel}>
      <Round size={76} onPress={() => onSeek(-step)}>
        <SeekIcon size={44} />
        <Text className="absolute font-semi text-xs text-white pt-1">{String(step)}</Text>
      </Round>
      <Round size={104} onPress={onToggle}>
        {paused ? <PlayIcon size={48} color="#ffffff" /> : <PauseIcon size={48} />}
      </Round>
      <Round size={76} onPress={() => onSeek(step)}>
        <SeekIcon size={44} forward />
        <Text className="absolute font-semi text-xs text-white pt-1">{String(step)}</Text>
      </Round>
    </motion.View>
  );
}

function Round({size, onPress, children}) {
  return (
    <motion.View onPress={onPress} whilePress={{scale: 0.9}} transition={transitions.focus}
      style={{width: px(size), height: px(size)}} className="rounded-full bg-black/45 items-center justify-center">
      {children}
    </motion.View>
  );
}
