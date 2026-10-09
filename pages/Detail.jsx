import {FocusScope, Image, ScrollView, Text, View, useIsFocused} from '@ps5-react/core';
import {CAST, SIZES, px} from '../theme.js';
import {clampText, clean, imageUrl, splitText} from '../lib/catalog.js';
import {Backdrop} from '../components/Backdrop.jsx';
import {Button} from '../components/Button.jsx';
import {FocusRing} from '../components/FocusRing.jsx';
import {BackIcon, PlayIcon} from '../components/Icons.jsx';
import {Logo} from '../components/Logo.jsx';
import {MetaLine} from '../components/Meta.jsx';

function CastRing() {
  return useIsFocused() ? <FocusRing radius={CAST.size / 2 + 4} outX={4} outY={4} /> : null;
}

function CastMember({person}) {
  const initials = person.name.split(' ').map(part => part[0]).slice(0, 2).join('');
  return (
    <View className="w-[120px] items-center gap-2">
      <View focusable className="size-24 rounded-full">
        <View className="absolute inset-0 rounded-full bg-panel items-center justify-center">
          <Text className="font-semi text-lg text-slate-400">{initials}</Text>
        </View>
        {person.profile && (
          <Image source={{uri: imageUrl(person.profile, SIZES.profile)}} className="size-24 rounded-full" />
        )}
        <CastRing />
      </View>
      <Text className="font-semi text-xs text-white text-center truncate w-[120px]">{clean(person.name)}</Text>
      <Text className="font-inter text-xs text-slate-400 text-center truncate w-[120px]">{clean(person.character)}</Text>
    </View>
  );
}

/** "More Info": backdrop, logo, meta, tagline, the full overview, Play/Back and the cast. */
export function DetailPage({item, onClose, onPlay}) {
  // About six lines fit above the cast row; splitText keeps each node under the 255-byte cap.
  const paragraphs = splitText(clampText(item.overview, 480));
  return (
    <FocusScope trap autoFocus onBack={() => { onClose(); return true; }} onAction={() => true}>
      <View className="w-screen h-screen bg-canvas">
        <Backdrop item={item} />
        <View pointerEvents="none" className="absolute left-0 top-0 bottom-0 w-[960px]
          bg-gradient-to-r from-canvas via-canvas/85 to-transparent" />
        <View pointerEvents="none" className="absolute left-0 right-0 bottom-0 h-[420px]
          bg-gradient-to-t from-canvas via-canvas/90 to-transparent" />
        <View className="absolute left-12 top-[48px] w-[640px] gap-3">
          <Logo item={item} w={420} h={110} />
          <MetaLine item={item} genres={3} />
          {item.tagline && <Text className="font-semi text-md text-accent-soft">{clean(item.tagline)}</Text>}
          <View className="gap-2">
            {paragraphs.map((text, index) => (
              <Text key={index} className="font-inter text-sm text-slate-200">{text}</Text>
            ))}
          </View>
          <View className="flex-row gap-4 pt-2">
            <Button label="Play" icon={PlayIcon} primary onPress={() => onPlay(item)} />
            <Button label="Back" icon={BackIcon} onPress={onClose} />
          </View>
        </View>
        {item.cast.length > 0 && (
          <View className="absolute left-0 right-0 bottom-[16px] gap-1">
            <Text className="font-semi text-lg text-white px-12">Cast</Text>
            <ScrollView horizontal className="flex-row h-[176px]">
              <View className="flex-row gap-4 px-12 py-3">
                {item.cast.map((person, index) => <CastMember key={person.name + index} person={person} />)}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </FocusScope>
  );
}
