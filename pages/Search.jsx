import {useCallback, useEffect, useRef, useState} from 'react';
import {FocusScope, ScrollView, Text, View, VirtualList, useFocus} from '@ps5-react/core';
import {CARD} from '../theme.js';
import {searchItems} from '../lib/jellyfin/library.js';
import {CaptionedCard} from '../components/Cards.jsx';
import {Keyboard, TextField, useTextInput} from '../components/Keyboard.jsx';

// The server is asked once typing pauses this long, not on every key.
const SEARCH_DELAY_MS = 350;

/** Search: the letter-grid keyboard searches the server's library; results are a virtualized grid. */
export function SearchPage({onOpen}) {
  const input = useTextInput('', 24);
  const query = input.text.trim();
  const [results, setResults] = useState({query: '', items: [], error: null});
  const {focus} = useFocus();
  const focusRef = useRef(focus);
  focusRef.current = focus;

  useEffect(() => {
    if (!query) {
      setResults({query: '', items: [], error: null});
      return undefined;
    }
    let live = true;
    const id = setTimeout(() => searchItems(query).then(
      items => live && setResults({query, items, error: null}),
      error => live && setResults({query, items: [], error})), SEARCH_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [query]);

  const renderItem = useCallback(({item}) => <CaptionedCard item={item} onPress={onOpen} />, [onOpen]);
  const settled = results.query === query;
  const status = !query ? 'Search your whole library by title'
    : !settled ? 'Searching…'
      : results.error ? `Search failed: ${results.error.message}`
        : results.items.length ? `${results.items.length} titles` : `No titles match "${query}"`;

  return (
    <View className="absolute inset-0">
      <View className="absolute left-12 top-[96px] w-[342px] gap-4">
        <TextField text={input.text} cursor={input.cursor} placeholder="Search movies & TV" />
        <Keyboard input={input} layout="search" onSubmit={() => focusRef.current('results')} />
        <Text className="font-inter text-xs text-slate-400">{status}</Text>
      </View>
      <FocusScope focusKey="results">
        <ScrollView className="absolute left-[440px] right-0 top-[84px] bottom-0">
          <View className="pl-3 pr-12 py-3">
            <VirtualList key={results.query} data={results.items} keyExtractor={item => item.key} renderItem={renderItem}
              numColumns={3} itemHeight={CARD.h + 46} rowGap={20} columnGap={CARD.gap} />
          </View>
        </ScrollView>
      </FocusScope>
    </View>
  );
}
