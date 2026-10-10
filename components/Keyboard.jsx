import {memo, useCallback, useEffect, useRef, useState} from 'react';
import {Controller, FocusScope, Text, View, useFocus, useIsFocused} from '@ps5-react/core';
import {px} from '../theme.js';
import {SearchIcon, SquareGlyph, TriangleGlyph} from './Icons.jsx';

const KEY = 52, KEY_GAP = 6;
const DIGITS = '1234567890'.split('');
// Each layout is the letters block (six keys a row) and the digits under it. `text` has three that
// Shift cycles through, for passwords.
export const LAYOUTS = {
  // A–Z in order with the punctuation titles use.
  search: [[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '-', "'", '&', '.']],
  address: [[...'abcdefghijklmnopqrstuvwxyz', '.', ':', '/', '-']],
  text: [
    [...'abcdefghijklmnopqrstuvwxyz', '.', '-', '_', '@'],
    [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '.', '-', '_', '@'],
    [...'!#$%&*+=?^~()[]{}<>,;:\'"/\\|`', '_', '@'],
  ],
};
const SHIFT_LABELS = ['ABC', '#+=', 'abc'];
// L2 clears only when pressed nearly all the way: a light squeeze does nothing. While the keyboard has
// focus the trigger pushes back from 40% of its travel, so the clear takes a deliberate press.
const CLEAR_DEPTH = 0.92, RELEASED_DEPTH = 0.2;
const RESIST_FROM = 0.4, RESIST_STRENGTH = 0.75;

/** Text with a cursor, edited by the keyboard and the controller shortcuts. */
export function useTextInput(initial = '', max = 24) {
  const [input, setInput] = useState({text: initial, cursor: initial.length});
  const type = useCallback(ch => setInput(value => value.text.length >= max ? value : {
    text: value.text.slice(0, value.cursor) + ch + value.text.slice(value.cursor), cursor: value.cursor + 1,
  }), [max]);
  const remove = useCallback(() => setInput(value => value.cursor === 0 ? value : {
    text: value.text.slice(0, value.cursor - 1) + value.text.slice(value.cursor), cursor: value.cursor - 1,
  }), []);
  const clear = useCallback(() => setInput({text: '', cursor: 0}), []);
  const move = useCallback(step => setInput(value => {
    const next = Math.max(0, Math.min(value.text.length, value.cursor + step));
    return next === value.cursor ? value : {...value, cursor: next};
  }), []);
  const set = useCallback(text => setInput({text, cursor: text.length}), []);
  return {...input, type, remove, clear, move, set};
}

function KeyLabel({children}) {
  const focused = useIsFocused();
  return <Text focused={focused} className="font-semi text-md text-white focused:text-canvas">{children}</Text>;
}

/** An action key: its word, and in the corner the controller button that does the same. */
function ActionContent({label, Glyph, button}) {
  const focused = useIsFocused();
  const color = focused ? '#0b0b12' : '#d9d4ff';
  return (
    <>
      <Text focused={focused} className="font-semi text-sm text-[#d9d4ff] focused:text-canvas">{label}</Text>
      <View className="absolute top-[5px] right-[6px] opacity-70">
        {Glyph ? <Glyph size={10} color={color} /> : button ? (
          <Text focused={focused} className="font-semi text-[10px] leading-[12px] text-[#d9d4ff] focused:text-canvas">{button}</Text>
        ) : null}
      </View>
    </>
  );
}

/** A controller button in an outline, for hints. */
export function ButtonBadge({children}) {
  return (
    <View className="h-[18px] px-1 rounded-[5px] border border-slate-500 items-center justify-center">
      <Text className="font-semi text-[10px] leading-[12px] text-slate-400">{children}</Text>
    </View>
  );
}

// Memoized and pressed with its own value, so typing re-renders the text field, not all 43 keys.
// Character keys are named by position: Shift relabels them without moving focus off the key.
const Key = memo(function Key({name, value, wide = 1, action = false, onPress, children}) {
  return (
    <View focusKey={`key:${name}`} onPress={() => onPress(value)} style={{width: px(KEY * wide + KEY_GAP * (wide - 1))}}
      className={`h-[44px] rounded-lg items-center justify-center focused:bg-white
        ${action ? 'bg-accent/25' : 'bg-white/10'}`}>
      {children ?? <KeyLabel>{value}</KeyLabel>}
    </View>
  );
});

const SPACE = <ActionContent label="Space" Glyph={TriangleGlyph} />;
const DELETE = <ActionContent label="Delete" Glyph={SquareGlyph} />;
const CLEAR = <ActionContent label="Clear" button="L2" />;

/** A line of text with its cursor; `masked` draws dots, for passwords. */
export const TextField = memo(function TextField({text, cursor, placeholder, masked = false, icon = true}) {
  const shown = masked ? null : text;
  const dots = count => Array.from({length: count}, (_, index) => (
    <View key={index} className="size-[10px] mr-[6px] rounded-full bg-white" />
  ));
  return (
    <View className="h-[52px] px-4 flex-row items-center gap-3 rounded-xl bg-white/10 border border-white/15">
      {icon && <SearchIcon size={20} color="#a9a0ff" />}
      <View className="flex-1 flex-row items-center">
        {cursor > 0 && (masked ? dots(cursor) : <Text className="font-inter text-md text-white">{shown.slice(0, cursor)}</Text>)}
        <View className="w-[2px] h-[22px] rounded-full bg-accent-soft animate-pulse" />
        {text ? (masked ? <View className="flex-row items-center ml-[6px]">{dots(text.length - cursor)}</View>
          : <Text className="font-inter text-md text-white">{shown.slice(cursor)}</Text>)
          : <Text className="font-inter text-md text-slate-400">{placeholder}</Text>}
      </View>
      {text ? <View className="flex-row gap-1"><ButtonBadge>L1</ButtonBadge><ButtonBadge>R1</ButtonBadge></View> : null}
    </View>
  );
});

// useFocus re-renders on every focus move; this keeps that to a node that draws nothing. It also
// stiffens L2 while focus is on a key, and releases it when focus leaves or the keyboard unmounts.
function FocusBridge() {
  const {focusedKey} = useFocus();
  const onKeyboard = !!focusedKey?.startsWith('key:');
  useEffect(() => {
    if (!onKeyboard) return undefined;
    Controller.setTriggerResistance('l2', RESIST_STRENGTH, RESIST_FROM);
    return () => Controller.setTriggerResistance('l2', 0);
  }, [onKeyboard]);
  return null;
}

/**
 * The letter-grid keyboard for `input` (useTextInput). Controller shortcuts while it has focus:
 * □ delete, △ space, L1/R1 move the cursor, a deep L2 clears, R2 calls `onSubmit`.
 */
export function Keyboard({input, layout = 'search', onSubmit, focusKey = 'keyboard'}) {
  const modes = LAYOUTS[layout];
  const [mode, setMode] = useState(0);
  const letters = modes[mode % modes.length];
  const clearWatch = useRef(null);
  useEffect(() => () => clearInterval(clearWatch.current), []);
  const {type, remove, clear, move} = input;
  const space = useCallback(() => type(' '), [type]);
  const shift = useCallback(() => setMode(value => (value + 1) % modes.length), [modes.length]);

  // The trigger reports a press well before it bottoms out, so the clear waits for a deep one. Without
  // an analog trigger (the desktop keyboard) the press clears at once.
  const deepClear = useCallback(() => {
    if (!Controller.getState().connected) {
      clear();
      return;
    }
    clearInterval(clearWatch.current);
    clearWatch.current = setInterval(() => {
      const {l2} = Controller.getState();
      if (l2 >= CLEAR_DEPTH) {
        clear();
        Controller.vibrate(0.4, 60);
      }
      if (l2 >= CLEAR_DEPTH || l2 < RELEASED_DEPTH) clearInterval(clearWatch.current);
    }, 16);
  }, [clear]);

  const submit = useRef(onSubmit);
  submit.current = onSubmit;
  const onAction = useCallback(action => {
    if (action === 'square') remove();
    else if (action === 'triangle') space();
    else if (action === 'l1') move(-1);
    else if (action === 'r1') move(1);
    else if (action === 'l2') deepClear();
    else if (action === 'r2') submit.current?.();
    else return false;
    return true;
  }, [remove, space, move, deepClear]);

  return (
    <FocusScope focusKey={focusKey} onAction={onAction}>
      <FocusBridge />
      <View className="gap-[6px]">
        <View className="flex-row gap-[6px]">
          {modes.length > 1 ? (
            <Key name="Shift" value="Shift" wide={2} action onPress={shift}>
              <ActionContent label={SHIFT_LABELS[mode % SHIFT_LABELS.length]} />
            </Key>
          ) : null}
          <Key name="Space" value="Space" wide={2} action onPress={space}>{SPACE}</Key>
          <Key name="Delete" value="Delete" wide={2} action onPress={remove}>{DELETE}</Key>
          {modes.length === 1 ? <Key name="Clear" value="Clear" wide={2} action onPress={clear}>{CLEAR}</Key> : null}
        </View>
        <View className="flex-row flex-wrap gap-[6px]">
          {letters.map((ch, index) => <Key key={index} name={index === 0 ? 'A' : index} value={ch} onPress={type} />)}
        </View>
        <View className="flex-row flex-wrap gap-[6px] pt-2">
          {DIGITS.map(ch => <Key key={ch} name={`d${ch}`} value={ch} onPress={type} />)}
        </View>
      </View>
    </FocusScope>
  );
}
