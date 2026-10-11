import {useEffect, useState} from 'react';
import {FocusScope, Image, Text, View, motion, transitions, useIsFocused} from '@ps5-react/core';
import {Brand} from './Brand.jsx';
import {formatTime, localNow} from '../lib/clock.js';
import {useSettings} from '../lib/settings.js';
import {sized} from '../lib/jellyfin/api.js';
import {FocusRing} from './FocusRing.jsx';
import {GearIcon, HeartFilledIcon, HeartIcon} from './Icons.jsx';

const TAB_W = 112;

function TabLabel({label, active}) {
  const focused = useIsFocused();
  return (
    <Text focused={focused} className={`font-semi text-sm ${active ? 'text-white' : 'text-slate-300'} focused:text-canvas`}>
      {label}
    </Text>
  );
}

// Favorites: a round button of its own, left of the pill. Its tab index is `FAVORITES`.
export const FAVORITES = -1;

// useIsFocused reads the enclosing focusable's focus, so the icon is its own component.
function FavoritesIcon({active}) {
  const focused = useIsFocused();
  const Icon = active || focused ? HeartFilledIcon : HeartIcon;
  return <Icon size={18} color={focused ? '#0b0b12' : active ? '#ffffff' : '#cbd5e1'} />;
}

function FavoritesTab({active, onSelect, onEnter}) {
  return (
    <View focusKey="tab:Favorites" onFocus={() => onSelect(FAVORITES)} onPress={onEnter}
      className={`size-11 rounded-full items-center justify-center border border-white/10
        ${active ? 'bg-white/20' : 'bg-black/45'} focused:bg-white`}>
      <FavoritesIcon active={active} />
    </View>
  );
}

function Clock() {
  const [now, setNow] = useState(localNow);
  useEffect(() => {
    const id = setTimeout(() => setNow(localNow()), now.msToNextMinute + 50);
    return () => clearTimeout(id);
  }, [now]);
  const {clock24} = useSettings();
  return <Text className="font-semi text-lg text-white">{formatTime(now, clock24)}</Text>;
}

function GearSlot() {
  return <GearIcon size={20} color={useIsFocused() ? '#0b0b12' : '#ffffff'} />;
}

/** Opens the settings. */
function SettingsButton({onPress}) {
  return (
    <View focusKey="settings" onPress={onPress}
      className="size-10 rounded-full items-center justify-center bg-black/45 border border-white/10 focused:bg-white">
      <GearSlot />
      <AvatarRing />
    </View>
  );
}

function AvatarRing() {
  return useIsFocused() ? <FocusRing radius={24} outX={4} outY={4} /> : null;
}

/** The signed-in user; pressing it opens the account page. */
function Avatar({user, onPress}) {
  const image = sized(user?.image, 120);
  return (
    <View focusKey="account" onPress={onPress}
      className="size-10 rounded-full bg-accent items-center justify-center border-2 border-white/30 focused:border-white">
      <Text className="font-semi text-md text-white">{(user?.name ?? '?').charAt(0).toUpperCase()}</Text>
      {image && <Image source={{uri: image}} className="absolute inset-0 size-10 rounded-full" />}
      <AvatarRing />
    </View>
  );
}

/**
 * Wordmark, the centred tab pill and the clock/avatar. Tabs share one width so the active pill glides by
 * translation; focusing a tab selects it (docs/NAVIGATION.md "Tabs"). `y` scrolls it off with Home's content.
 */
export function TopBar({labels, active, onSelect, onEnter, downTo = {}, y = 0, user, onAccount, onSettings}) {
  return (
    <motion.View className="absolute left-0 right-0 top-0 h-[80px]" pointerEvents="box-none"
      initial={false} animate={{y: -y}} transition={transitions.screen}>
      <View className="absolute left-12 top-0 bottom-0 flex-row items-center">
        <Brand />
      </View>
      <FocusScope focusKey="tabs" wrap>
        <View className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center" pointerEvents="box-none">
          <View className="relative flex-row p-1 rounded-full bg-black/45 border border-white/10">
            {/* Outside the pill, so the pill stays centred. */}
            <View className="absolute left-[-56px] top-0 bottom-0 justify-center">
              <FavoritesTab active={active === FAVORITES} onSelect={onSelect} onEnter={onEnter} />
            </View>
            <motion.View className="absolute top-1 left-1 w-28 h-9 rounded-full bg-white/20"
              initial={false} animate={{x: Math.max(0, active) * TAB_W, opacity: active === FAVORITES ? 0 : 1}}
              transition={transitions.focus} />
            {labels.map((label, index) => (
              <View key={label} focusKey={`tab:${label}`} nextFocusDown={downTo[label]}
                onFocus={() => onSelect(index)} onPress={onEnter}
                className="w-28 h-9 items-center justify-center rounded-full focused:bg-white">
                <TabLabel label={label} active={index === active} />
              </View>
            ))}
          </View>
        </View>
        <View className="absolute right-12 top-0 bottom-0 flex-row items-center gap-5" pointerEvents="box-none">
          <Clock />
          <SettingsButton onPress={onSettings} />
          <Avatar user={user} onPress={onAccount} />
        </View>
      </FocusScope>
    </motion.View>
  );
}
