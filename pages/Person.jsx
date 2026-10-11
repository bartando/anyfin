import {FocusScope, Image, ScrollView, Text, View} from '@ps5-react/core';
import {CARD, SIZES, captionedRowH, focusRoom, px} from '../theme.js';
import {clampText, clean, splitText} from '../lib/format.js';
import {sized} from '../lib/jellyfin/api.js';
import {loadPerson} from '../lib/jellyfin/library.js';
import {useLoad} from '../lib/useLoad.js';
import {Backdrop} from '../components/Backdrop.jsx';
import {Button} from '../components/Button.jsx';
import {CaptionedCard} from '../components/Cards.jsx';
import {BackIcon} from '../components/Icons.jsx';
import {PersonBubble} from '../components/People.jsx';
import {Shelf} from '../components/Shelf.jsx';
import {keepPageActions} from '../lib/pageActions.js';

const PORTRAIT = {w: 200, h: 300};
const INFO_H = 420;

function facts(person) {
  const born = person.premiere ? Number(person.premiere.slice(0, 4)) : null;
  const life = born ? (person.endYear ? `${born}–${person.endYear}` : `Born ${born}`) : null;
  return [life, person.places[0]].filter(Boolean).join('  ·  ');
}

/**
 * A person: portrait, name, facts and biography over the backdrop of their best-rated title, then
 * their titles in this library and who they appear with most. Every card and face opens another page.
 */
export function PersonPage({person: shown, active = true, onClose, onOpen, onPerson}) {
  const {data: person} = useLoad(`person-${shown.id}`, () => loadPerson(shown.id));
  const costars = person?.costars;
  const name = person?.title || shown.name;
  const paragraphs = person ? splitText(clampText(person.overview, 520)) : [];
  const profile = sized(person?.poster ?? shown.profile, SIZES.portrait);
  const backdropItem = person?.credits.find(item => item.backdrop);
  return (
    <FocusScope trap={active} inert={!active} autoFocus onBack={() => { onClose(); return true; }} onAction={keepPageActions}>
      <View className="w-screen h-screen bg-canvas">
        {backdropItem && <Backdrop item={backdropItem} />}
        <View pointerEvents="none" className="absolute inset-0 bg-canvas/75" />
        <View pointerEvents="none" className="absolute left-0 right-0 bottom-0 h-[420px]
          bg-gradient-to-t from-canvas via-canvas/90 to-transparent" />
        <ScrollView className="absolute inset-0">
          <View style={{height: px(INFO_H)}}>
            <View className="absolute left-12 top-[56px] flex-row gap-8">
              <View className="rounded-xl bg-panel" style={{width: px(PORTRAIT.w), height: px(PORTRAIT.h)}}>
                {profile && (
                  <Image source={{uri: profile}} className="rounded-xl"
                    style={{width: px(PORTRAIT.w), height: px(PORTRAIT.h)}} />
                )}
              </View>
              <View className="w-[760px] gap-3 pt-2">
                <Text className="font-semi text-xl text-white line-clamp-2">{clean(name)}</Text>
                {person && facts(person) && <Text className="font-inter text-sm text-accent-soft">{facts(person)}</Text>}
                <View className="gap-2">
                  {paragraphs.map((text, index) => (
                    <Text key={index} className="font-inter text-sm text-slate-200">{text}</Text>
                  ))}
                  {person && !paragraphs.length && (
                    <Text className="font-inter text-sm text-slate-400">No biography on this server.</Text>
                  )}
                </View>
                {/* Focus has somewhere to land before the rows arrive. */}
                <View className="flex-row pt-2">
                  <Button label="Back" icon={BackIcon} onPress={onClose} />
                </View>
              </View>
            </View>
          </View>
          <View className="gap-4 pb-12">
            {person?.credits.length > 0 && (
              <Shelf title="In your library" height={captionedRowH(CARD.h)} room={focusRoom(CARD.h)}>
                {person.credits.map(item => <CaptionedCard key={item.key} item={item} onPress={onOpen} />)}
              </Shelf>
            )}
            {costars?.length > 0 && (
              <Shelf title="Often appears with" height={px(176)}>
                {costars.map(costar => <PersonBubble key={costar.id} person={costar} onPress={onPerson} />)}
              </Shelf>
            )}
          </View>
        </ScrollView>
      </View>
    </FocusScope>
  );
}
