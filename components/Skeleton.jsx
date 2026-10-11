import {ScrollView, View, motion} from '@ps5-react/core';
import {CARD, CAST, px} from '../theme.js';
import {Shelf} from './Shelf.jsx';

// Placeholders hold a loading row's exact space, so nothing below it moves when the row arrives.
// They sit still for a moment first: most loads land before then, and a pulse that flashes for a
// frame or two looks like a glitch. One pulse per row, not per tile.
const PULSE = {type: 'tween', duration: 0.9, delay: 0.25, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse'};

function Pulse({pills = false, children}) {
  return (
    <motion.View initial={{opacity: 1}} animate={{opacity: 0.4}} transition={PULSE}
      className={pills ? 'flex-row gap-2 px-12 py-[8px]' : 'flex-row gap-4'}>
      {children}
    </motion.View>
  );
}

const tiles = (count, render) => Array.from({length: count}, (_, index) => render(index));

/** A row of pills (seasons, blocks of episodes) as the real Pills row lays them out. */
export function PillsSkeleton({count}) {
  return (
    <ScrollView horizontal className="flex-row h-[56px]">
      <Pulse pills>
        {tiles(count, index => (
          <View key={index} className="h-[40px] w-[104px] rounded-full bg-white/5 border border-white/10" />
        ))}
      </Pulse>
    </ScrollView>
  );
}

/** 16:9 cards with a title and a caption line, as CaptionedCard draws them. */
export function CardsSkeleton({title, count, height}) {
  return (
    <Shelf title={title} height={height}>
      <Pulse>
        {tiles(count, index => (
          <View key={index} className="gap-1">
            <View className="rounded-xl bg-panel" style={{width: px(CARD.w), height: px(CARD.h)}} />
            <View className="pt-1 gap-[6px]">
              <View className="h-[12px] w-[150px] rounded-full bg-panel" />
              <View className="h-[12px] w-[64px] rounded-full bg-panel" />
            </View>
          </View>
        ))}
      </Pulse>
    </Shelf>
  );
}

/** Round portraits with a name line, as PersonBubble draws them. */
export function PeopleSkeleton({title, count, height}) {
  return (
    <Shelf title={title} height={height}>
      <Pulse>
        {tiles(count, index => (
          <View key={index} className="w-[120px] items-center gap-2">
            <View className="rounded-full bg-panel" style={{width: px(CAST.size), height: px(CAST.size)}} />
            <View className="h-[12px] w-[84px] rounded-full bg-panel" />
          </View>
        ))}
      </Pulse>
    </Shelf>
  );
}
