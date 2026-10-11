import {memo, useCallback, useEffect, useState} from 'react';
import {FocusScope, ScrollView, Text, View, VirtualList, useFocusActions} from '@ps5-react/core';
import {CARD} from '../theme.js';
import {loadPicks, searchItems} from '../lib/jellyfin/library.js';
import {useLoad} from '../lib/useLoad.js';
import {CaptionedCard} from '../components/Cards.jsx';
import {Keyboard, TextField, useTextInput} from '../components/Keyboard.jsx';

// The server is asked once typing pauses this long, not on every key.
const SEARCH_DELAY_MS = 350;
const NO_RESULTS = {query: '', total: 0, items: [], error: null};

function status(query, results, picks) {
  if (!query) return picks?.length ? 'Some random picks. Type to search your whole library' : 'Search your whole library by title';
  if (results.query !== query) return 'Searching…';
  if (results.error) return `Search failed: ${results.error.message}`;
  if (!results.items.length) return `No titles match "${query}"`;
  return results.total > results.items.length ? `${results.total} titles, the first ${results.items.length} shown`
    : `${results.total} titles`;
}

// Memoized: a key typed re-renders the field, not the grid. Each search starts scrolled to the top.
const Results = memo(function Results({query, items, onOpen}) {
  const renderItem = useCallback(({item}) => <CaptionedCard item={item} onPress={onOpen} />, [onOpen]);
  return (
    <FocusScope focusKey="results">
      <ScrollView key={query} className="absolute left-[440px] right-0 top-[84px] bottom-0">
        <View className="pl-3 pr-12 py-3">
          <VirtualList data={items} keyExtractor={item => item.key} renderItem={renderItem}
            numColumns={3} itemHeight={CARD.h + 46} rowGap={20} columnGap={CARD.gap} />
        </View>
      </ScrollView>
    </FocusScope>
  );
});

/** Search: the letter-grid keyboard searches the server's library; results are a virtualized grid. */
export function SearchPage({onOpen}) {
  const input = useTextInput('', 24);
  const query = input.text.trim();
  const [results, setResults] = useState(NO_RESULTS);
  // With nothing searched (yet, or cleared), the grid shows these.
  const {data: picks} = useLoad('search-picks', loadPicks);
  const {focus} = useFocusActions();
  const toResults = useCallback(() => focus('results'), []);

  useEffect(() => {
    if (!query) {
      setResults(NO_RESULTS);
      return undefined;
    }
    let live = true;
    const id = setTimeout(() => searchItems(query).then(
      ({total, items}) => live && setResults({query, total, items, error: null}),
      error => live && setResults({...NO_RESULTS, query, error})), SEARCH_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [query]);

  return (
    <View className="absolute inset-0">
      <View className="absolute left-12 top-[96px] w-[342px] gap-4">
        <TextField text={input.text} cursor={input.cursor} placeholder="Search movies & TV" />
        <Keyboard edit={input.edit} layout="search" onSubmit={toResults} />
        <Text className="font-inter text-xs text-slate-400">{status(query, results, picks)}</Text>
      </View>
      <Results query={results.query} items={results.query ? results.items : picks ?? NO_RESULTS.items} onOpen={onOpen} />
    </View>
  );
}
