import {FocusScope, ScrollView, Text, View} from '@ps5-react/core';
import {px} from '../theme.js';
import {clampText, clean, splitText} from '../lib/format.js';
import {loadCollection} from '../lib/jellyfin/library.js';
import {useLoad} from '../lib/useLoad.js';
import {Backdrop} from '../components/Backdrop.jsx';
import {Button} from '../components/Button.jsx';
import {CaptionedCard} from '../components/Cards.jsx';
import {BackIcon} from '../components/Icons.jsx';
import {Shelf} from '../components/Shelf.jsx';

const INFO_H = 440;

/** "6 titles · 2012–2019" */
export function collectionFacts(collection, parts) {
  const years = parts.map(part => part.year).filter(Boolean);
  const span = years.length ? (years[0] === years[years.length - 1] ? `${years[0]}` : `${years[0]}–${years[years.length - 1]}`) : '';
  return [`${parts.length} ${parts.length === 1 ? 'title' : 'titles'}`, span].filter(Boolean).join('  ·  ');
}

/** A collection (box set): its backdrop, name, title count and years, overview, then its titles in release order. */
export function CollectionPage({collection, active = true, onClose, onOpen}) {
  const {data} = useLoad(`collection-${collection.id}`, () => loadCollection(collection.id));
  const parts = data ?? [];
  const paragraphs = splitText(clampText(collection.overview ?? '', 420));
  return (
    <FocusScope trap={active} inert={!active} autoFocus onBack={() => { onClose(); return true; }} onAction={() => true}>
      <View className="w-screen h-screen bg-canvas">
        {collection.backdrop && <Backdrop item={collection} />}
        <View pointerEvents="none" className="absolute left-0 top-0 bottom-0 w-[960px]
          bg-gradient-to-r from-canvas via-canvas/85 to-transparent" />
        <View pointerEvents="none" className="absolute left-0 right-0 bottom-0 h-[420px]
          bg-gradient-to-t from-canvas via-canvas/90 to-transparent" />
        <ScrollView className="absolute inset-0">
          <View style={{height: px(INFO_H)}}>
            <View className="absolute left-12 top-[72px] w-[640px] gap-3">
              <Text className="font-semi text-xs text-accent-soft tracking-widest">COLLECTION</Text>
              <Text className="font-semi text-xl text-white">{clean(collection.title)}</Text>
              {parts.length > 0 && <Text className="font-inter text-sm text-slate-300">{collectionFacts(collection, parts)}</Text>}
              <View className="gap-2">
                {paragraphs.map((text, index) => (
                  <Text key={index} className="font-inter text-sm text-slate-200">{text}</Text>
                ))}
              </View>
              <View className="flex-row pt-2">
                <Button label="Back" icon={BackIcon} onPress={onClose} />
              </View>
            </View>
          </View>
          <View className="pb-12">
            {parts.length > 0 && (
              <Shelf title="Titles" height={px(206)}>
                {parts.map(part => <CaptionedCard key={part.key} item={part} onPress={onOpen} />)}
              </Shelf>
            )}
          </View>
        </ScrollView>
      </View>
    </FocusScope>
  );
}
