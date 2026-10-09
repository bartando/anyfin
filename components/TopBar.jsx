import {useEffect, useState} from 'react';
import {FocusScope, Text, View, motion, transitions, useIsFocused} from '@ps5-react/core';
import {localNow} from '../lib/clock.js';

const TAB_W = 112;

function TabLabel({label, active}) {
  const focused = useIsFocused();
  return (
    <Text focused={focused} className={`font-semi text-sm ${active ? 'text-white' : 'text-slate-300'} focused:text-canvas`}>
      {label}
    </Text>
  );
}

function Clock() {
  const [now, setNow] = useState(localNow);
  useEffect(() => {
    const id = setTimeout(() => setNow(localNow()), now.msToNextMinute + 50);
    return () => clearTimeout(id);
  }, [now]);
  const hh = String(now.hours).padStart(2, '0'), mm = String(now.minutes).padStart(2, '0');
  return <Text className="font-semi text-lg text-white">{`${hh}:${mm}`}</Text>;
}

/**
 * Wordmark, the centred tab pill and the clock/avatar. Tabs share one width so the active pill glides by
 * translation; focusing a tab selects it (docs/NAVIGATION.md "Tabs").
 */
export function TopBar({labels, active, onSelect, onEnter, downTo = {}}) {
  return (
    <View className="absolute left-0 right-0 top-0 h-[80px]" pointerEvents="box-none">
      <View className="absolute left-12 top-0 bottom-0 flex-row items-center">
        <Text className="font-semi text-xl text-white">Jelly<Text className="font-semi text-xl text-accent">5</Text></Text>
      </View>
      <View className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center" pointerEvents="box-none">
        <FocusScope focusKey="tabs" wrap>
          <View className="relative flex-row p-1 rounded-full bg-black/45 border border-white/10">
            <motion.View className="absolute top-1 left-1 w-28 h-9 rounded-full bg-white/20"
              initial={false} animate={{x: active * TAB_W}} transition={transitions.focus} />
            {labels.map((label, index) => (
              <View key={label} focusKey={`tab:${label}`} nextFocusDown={downTo[label]}
                onFocus={() => onSelect(index)} onPress={onEnter}
                className="w-28 h-9 items-center justify-center rounded-full focused:bg-white">
                <TabLabel label={label} active={index === active} />
              </View>
            ))}
          </View>
        </FocusScope>
      </View>
      <View className="absolute right-12 top-0 bottom-0 flex-row items-center gap-5">
        <Clock />
        <View className="size-10 rounded-full bg-accent items-center justify-center border-2 border-white/30">
          <Text className="font-semi text-md text-white">K</Text>
        </View>
      </View>
    </View>
  );
}
