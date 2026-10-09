import {useCallback, useMemo, useState} from 'react';
import {FocusScope, ScrollView, Text, View, VirtualList, useIsFocused} from '@ps5-react/core';
import {CARD, px} from '../theme.js';
import {clean, search} from '../lib/catalog.js';
import {BackdropCard} from '../components/Cards.jsx';
import {BackspaceIcon, SearchIcon} from '../components/Icons.jsx';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('');
const KEY = 52, KEY_GAP = 6;

function KeyLabel({children}) {
  const focused = useIsFocused();
  return <Text focused={focused} className="font-semi text-md text-white focused:text-canvas">{children}</Text>;
}

function DeleteGlyph() {
  return <BackspaceIcon size={20} color={useIsFocused() ? '#0b0b12' : '#ffffff'} />;
}

function Key({label, wide = 1, onPress, children}) {
  return (
    <View focusKey={`key:${label}`} onPress={onPress} style={{width: px(KEY * wide + KEY_GAP * (wide - 1))}}
      className="h-[44px] rounded-lg bg-white/10 items-center justify-center focused:bg-white">
      {children ?? <KeyLabel>{label}</KeyLabel>}
    </View>
  );
}

function ResultCard({item, onOpen}) {
  return (
    <View className="gap-2">
      <BackdropCard item={item} onPress={onOpen} />
      <Text className="font-inter text-xs text-slate-300 truncate w-[240px]">{clean(item.title)}</Text>
    </View>
  );
}

/** Search: a letter-grid keyboard filters the catalog by title; results are a virtualized card grid. */
export function SearchPage({onOpen}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => search(query), [query]);
  const type = useCallback(ch => setQuery(q => (q + ch).slice(0, 24)), []);
  const renderItem = useCallback(({item}) => <ResultCard item={item} onOpen={onOpen} />, [onOpen]);

  return (
    <View className="absolute inset-0">
      <View className="absolute left-12 top-[96px] w-[342px] gap-4">
        <View className="h-[52px] px-4 flex-row items-center gap-3 rounded-xl bg-white/10 border border-white/15">
          <SearchIcon size={20} color="#a9a0ff" />
          <Text className={`font-inter text-md ${query ? 'text-white' : 'text-slate-400'} truncate`}>
            {query || 'Search movies & TV'}
          </Text>
        </View>
        <FocusScope focusKey="keyboard">
          <View className="flex-row flex-wrap gap-[6px]">
            {LETTERS.map(ch => <Key key={ch} label={ch} onPress={() => type(ch)} />)}
            <Key label="Space" wide={2} onPress={() => type(' ')} />
            <Key label="Delete" wide={2} onPress={() => setQuery(q => q.slice(0, -1))}>
              <DeleteGlyph />
            </Key>
            <Key label="Clear" wide={2} onPress={() => setQuery('')} />
          </View>
        </FocusScope>
        <Text className="font-inter text-xs text-slate-400">
          {results.length ? `${results.length} titles` : `No titles match "${query}"`}
        </Text>
      </View>
      <ScrollView className="absolute left-[440px] right-0 top-[84px] bottom-0">
        <View className="pl-3 pr-12 py-3">
          <VirtualList key={query} data={results} keyExtractor={item => item.key} renderItem={renderItem}
            numColumns={3} itemHeight={CARD.h + 26} rowGap={20} columnGap={CARD.gap} />
        </View>
      </ScrollView>
    </View>
  );
}
