import {useCallback, useEffect, useRef, useState} from 'react';
import {ScrollView, Text, View, VirtualList} from '@ps5-react/core';
import {POSTER, PREVIEW_DELAY_MS} from '../theme.js';
import {clampText, clean} from '../lib/catalog.js';
import {Backdrop} from '../components/Backdrop.jsx';
import {PosterCard} from '../components/Cards.jsx';
import {MetaLine} from '../components/Meta.jsx';

const BACKDROP = {w: 760, h: 428};

/** Movies / TV Shows: a poster grid; the focused poster's title, meta and art fill the header. */
export function LibraryPage({title, list, onOpen}) {
  const [current, setCurrent] = useState(list[0]);
  const [art, setArt] = useState(list[0]);
  const pending = useRef(null);
  useEffect(() => () => clearTimeout(pending.current), []);

  const onFocus = useCallback(item => {
    setCurrent(item);
    clearTimeout(pending.current);
    pending.current = setTimeout(() => setArt(item), PREVIEW_DELAY_MS);
  }, []);
  const renderItem = useCallback(({item}) => <PosterCard item={item} onPress={onOpen} onFocus={onFocus} />,
    [onOpen, onFocus]);

  return (
    <View className="absolute inset-0">
      <View className="absolute right-0 top-0 w-[760px] h-[428px]" pointerEvents="none">
        <Backdrop item={art} w={BACKDROP.w} h={BACKDROP.h} fadeMs={350} />
        <View className="absolute left-0 top-0 bottom-0 w-[420px] bg-gradient-to-r from-canvas to-transparent" />
        <View className="absolute left-0 right-0 bottom-0 h-[260px] bg-gradient-to-t from-canvas to-transparent" />
        <View className="absolute left-0 right-0 top-0 h-[120px] bg-gradient-to-b from-canvas/70 to-transparent" />
      </View>
      <View className="absolute left-12 top-[92px] w-[640px] gap-2">
        <Text className="font-semi text-xs text-accent-soft tracking-widest">{title.toUpperCase()} · {list.length} TITLES</Text>
        <Text className="font-semi text-xl text-white truncate">{clean(current.title)}</Text>
        <MetaLine item={current} genres={3} />
        <Text className="font-inter text-sm text-slate-300 line-clamp-2">{clampText(current.overview, 180)}</Text>
      </View>
      <ScrollView className="absolute left-0 right-0 bottom-0 top-[262px]">
        <View className="px-12 py-4">
          <VirtualList data={list} keyExtractor={item => item.key} renderItem={renderItem}
            numColumns={POSTER.cols} itemHeight={POSTER.h} rowGap={POSTER.rowGap} columnGap={POSTER.colGap} />
        </View>
        <View className="h-[24px]" />
      </ScrollView>
    </View>
  );
}
