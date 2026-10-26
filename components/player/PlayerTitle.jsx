import {useEffect, useState} from 'react';
import {Text, motion, transitions} from '@react-on-anything/core';
import {clean, metaParts} from '../../lib/format.js';
import {formatTime, localNow} from '../../lib/clock.js';
import {useSettings} from '../../lib/settings.js';
import {episodeCode} from '../../lib/jellyfin/items.js';
import {Logo} from '../Logo.jsx';

/**
 * The title's logo (the series' for an episode, text without one) and a line under it: the episode's
 * code and name, or a film's year and runtime, then when it ends. A logo with no vivid colour is drawn
 * white: over a dark scene a black one vanished. It steps back while a seek is being chosen, and the gap under it holds
 * the seek's time.
 */
export function PlayerTitle({item, position, duration, dim}) {
  const episode = item.kind === 'episode';
  const ends = useEndsAt(duration > 0 ? duration - position : null);
  const parts = episode ? [episodeCode(item), clean(item.title)] : item.kind === 'trailer' ? ['Trailer'] : metaParts(item, 0);
  const line = [...parts, ends && `Ends at ${ends}`].filter(Boolean).join(' · ');
  return (
    <motion.View className="mb-[60px]" animate={{opacity: dim ? 0.35 : 1}} transition={transitions.panel}>
      <Logo item={item} title={episode ? item.seriesTitle ?? item.title : item.title} w={420} h={110} tintDull="#ffffff" />
      {!!line && <Text className="font-semi text-md text-white/70 mt-3 truncate">{line}</Text>}
    </motion.View>
  );
}

// Paused, nothing else re-renders the line, so the end time moves on with the minute.
function useEndsAt(remaining) {
  const {clock24} = useSettings();
  const [, setTick] = useState(0);
  const end = remaining == null ? null : localNow(Date.now() + remaining * 1000);
  useEffect(() => {
    if (!end) return undefined;
    const id = setTimeout(() => setTick(n => n + 1), end.msToNextMinute + 50);
    return () => clearTimeout(id);
  });
  return end && formatTime(end, clock24);
}
