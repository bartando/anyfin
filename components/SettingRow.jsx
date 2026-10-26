import {useEffect, useRef, useState} from 'react';
import {FocusScope, Text, View, useFocusActions, useIsFocused} from '@react-on-anything/core';
import {FocusRing} from './FocusRing.jsx';
import {CheckIcon} from './Icons.jsx';

// useIsFocused reads the enclosing focusable's focus, so the parts that flip colour are components.
function RowText({label, about}) {
  const focused = useIsFocused();
  return (
    <View className="flex-1 gap-[2px]">
      <Text focused={focused} className="font-semi text-md text-white focused:text-canvas">{label}</Text>
      {!!about && (
        <Text focused={focused} className="font-inter text-xs text-slate-400 focused:text-slate-600 line-clamp-2">
          {about}
        </Text>
      )}
    </View>
  );
}

function Value({children}) {
  const focused = useIsFocused();
  return (
    <Text focused={focused} className="font-semi text-sm text-accent-soft focused:text-accent">{children}</Text>
  );
}

function Ring({radius = 16}) {
  return useIsFocused() ? <FocusRing radius={radius} outX={3} outY={3} /> : null;
}

const ROW = 'min-h-[68px] px-6 py-3 flex-row items-center gap-6 rounded-2xl bg-white/5 border border-white/10 focused:bg-white focused:border-white';

function Pill({label, selected, onPress}) {
  return (
    <View onPress={onPress} autoFocus={selected}
      className={`h-[40px] px-4 flex-row items-center gap-2 rounded-full border
        ${selected ? 'bg-accent/30 border-accent' : 'bg-white/10 border-white/15'} focused:bg-white focused:border-white`}>
      {selected && <PillCheck />}
      <PillLabel label={label} />
      <Ring radius={20} />
    </View>
  );
}

function PillLabel({label}) {
  const focused = useIsFocused();
  return <Text focused={focused} className="font-semi text-sm text-white focused:text-canvas">{label}</Text>;
}

function PillCheck() {
  return <CheckIcon size={14} color={useIsFocused() ? '#0b0b12' : '#ffffff'} />;
}

/**
 * A setting with a few values. Cross opens them as pills under the label, the current one focused;
 * Cross on a pill picks it, Circle closes without a change.
 */
export function ChoiceRow({focusKey, label, about, options, value, onChange, nextFocusLeft}) {
  const [open, setOpen] = useState(false);
  const {focus} = useFocusActions();
  // The row comes back on the next render; focus goes to it then.
  const closing = useRef(false);
  useEffect(() => {
    if (open || !closing.current) return;
    closing.current = false;
    focus(focusKey);
  }, [open]);
  const current = options.find(option => option.value === value) ?? options[0];
  const close = () => {
    closing.current = true;
    setOpen(false);
  };
  if (open) {
    return (
      <FocusScope trap autoFocus onBack={() => { close(); return true; }}>
        <View className="px-6 py-4 gap-3 rounded-2xl bg-white/10 border border-accent/60">
          <Text className="font-semi text-md text-white">{label}</Text>
          <View className="flex-row flex-wrap gap-3">
            {options.map(option => (
              <Pill key={String(option.value)} label={option.label} selected={option.value === value}
                onPress={() => { onChange(option.value); close(); }} />
            ))}
          </View>
        </View>
      </FocusScope>
    );
  }
  return (
    <View focusKey={focusKey} nextFocusLeft={nextFocusLeft} onPress={() => setOpen(true)} className={ROW}>
      <RowText label={label} about={about} />
      <Value>{current.label}</Value>
      <Ring />
    </View>
  );
}

function Switch({on}) {
  const focused = useIsFocused();
  return (
    <View className={`w-[52px] h-[30px] rounded-full p-[3px] ${on ? 'bg-accent' : 'bg-white/20'}
      ${focused && !on ? 'bg-slate-300' : ''}`}>
      <View className={`size-6 rounded-full bg-white ${on ? 'ml-[22px]' : 'ml-0'}`} />
    </View>
  );
}

/** An on/off setting: Cross flips it. */
export function ToggleRow({focusKey, label, about, value, onChange, nextFocusLeft}) {
  return (
    <View focusKey={focusKey} nextFocusLeft={nextFocusLeft} onPress={() => onChange(!value)} className={ROW}>
      <RowText label={label} about={about} />
      <Switch on={value} />
      <Ring />
    </View>
  );
}

/** A row that does something when pressed (sign out, open a page), with an optional value shown. */
export function ActionRow({focusKey, label, about, value, onPress, nextFocusLeft}) {
  return (
    <View focusKey={focusKey} nextFocusLeft={nextFocusLeft} onPress={onPress} className={ROW}>
      <RowText label={label} about={about} />
      {!!value && <Value>{value}</Value>}
      <Ring />
    </View>
  );
}

/** A read-only line: a label and its value. */
export function InfoRow({label, value}) {
  return (
    <View className="min-h-[52px] px-6 flex-row items-center gap-6 rounded-2xl bg-white/5">
      <Text className="flex-1 font-inter text-sm text-slate-300">{label}</Text>
      <Text className="font-semi text-sm text-white">{value}</Text>
    </View>
  );
}
