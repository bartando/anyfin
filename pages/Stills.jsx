import {useState} from 'react';
import {FocusScope, Text, View} from '@ps5-react/core';
import {Backdrop} from '../components/Backdrop.jsx';
import {keepPageActions} from '../lib/pageActions.js';

/**
 * A title's stills, full screen, from the one pressed. A dot per still along the bottom: Left and
 * Right move along them and the picture follows, as the season pills do. Circle goes back.
 */
export function StillsPage({item, index: start = 0, active = true, onClose}) {
  const stills = item.backdrops ?? [];
  const [index, setIndex] = useState(start);
  const uri = stills[index];
  return (
    <FocusScope trap={active} inert={!active} autoFocus onBack={() => { onClose(); return true; }} onAction={keepPageActions}>
      <View className="w-screen h-screen bg-black">
        {uri && <Backdrop item={{key: uri, backdrop: uri}} fadeMs={300} />}
        <View pointerEvents="none" className="absolute left-0 right-0 bottom-0 h-[140px]
          bg-gradient-to-t from-black/80 to-transparent" />
        <View className="absolute left-0 right-0 bottom-[36px] items-center gap-3">
          <Text className="font-semi text-sm text-white/80">{`${index + 1} / ${stills.length}`}</Text>
          <FocusScope row>
            <View className="flex-row gap-3">
              {stills.map((still, at) => (
                <View key={still} focusable autoFocus={at === start} selected={at === index} onFocus={() => setIndex(at)}
                  className={`size-[12px] rounded-full ${at === index ? 'bg-white' : 'bg-white/35'} focused:bg-white`} />
              ))}
            </View>
          </FocusScope>
        </View>
      </View>
    </FocusScope>
  );
}
