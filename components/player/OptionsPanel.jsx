import {useEffect, useRef} from 'react';
import {FocusScope, ScrollView, Text, View, useFocusActions, useIsFocused} from '@ps5-react/core';
import {CheckIcon} from '../Icons.jsx';
import {remote} from '../../lib/remote.js';

const rowKey = (tab, section, id) => `opt:${tab}:${section}:${id}`;
const tabKey = id => `opt-tab:${id}`;

// Where focus lands in a tab: its first section's chosen row, or the tab itself when it has no rows.
function landing(tab) {
  const section = tab.sections?.[0];
  if (!section?.options.length) return tabKey(tab.id);
  const chosen = section.options.some(option => option.id === section.selected) ? section.selected : section.options[0].id;
  return rowKey(tab.id, 0, chosen);
}

/**
 * The player's settings over the right of the film: a row of tabs (L1/R1 or the D-pad), each with
 * sections of choices or, for `facts`, a read-only list. Picking applies at once and leaves it open;
 * Circle closes it.
 */
export function OptionsPanel({tabs, tab, onTab, onClose}) {
  const {focus} = useFocusActions();
  const current = tabs.find(candidate => candidate.id === tab) ?? tabs[0];
  // Focus follows a tab switched with L1/R1 (and the first one shown), not one the D-pad walked onto.
  // L1/R1 focus the new tab first, which selects it: had the focused row just unmounted, focus would
  // fall back onto the old tab and select that one again.
  const jump = useRef(true);
  useEffect(() => {
    if (!jump.current) return;
    jump.current = false;
    focus(landing(current));
  }, [current.id]);
  const switchBy = step => {
    jump.current = true;
    focus(tabKey(tabs[(tabs.indexOf(current) + step + tabs.length) % tabs.length].id));
  };
  const onAction = action => {
    if (action === 'l1') switchBy(-1);
    else if (action === 'r1') switchBy(1);
    else return false;
    return true;
  };

  return (
    <FocusScope trap onBack={() => { onClose(); return true; }} onAction={onAction}>
      <View className="absolute right-0 top-0 bottom-0 w-[620px] bg-canvas px-10 pt-10 pb-8">
        <View className="flex-row items-center gap-1 mb-7">
          {!remote && <Hint>L1</Hint>}
          {tabs.map(candidate => (
            <Tab key={candidate.id} id={candidate.id} label={candidate.label} selected={candidate === current}
              onFocus={() => onTab(candidate.id)} />
          ))}
          {!remote && <Hint>R1</Hint>}
        </View>
        {current.facts ? <Facts facts={current.facts} /> : current.columns ? (
          <View className="flex-1 flex-row gap-8">
            {current.sections.map((section, index) => (
              <ScrollView key={section.title} className="flex-1">
                <Section tab={current.id} index={index} section={section} />
              </ScrollView>
            ))}
          </View>
        ) : (
          <ScrollView className="flex-1">
            <View className="gap-7">
              {current.sections.map((section, index) => (
                <Section key={section.title} tab={current.id} index={index} section={section} />
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </FocusScope>
  );
}

function Hint({children}) {
  return (
    <View className="h-[22px] px-2 rounded-md border border-white/25 justify-center">
      <Text className="font-semi text-xs text-white/50">{children}</Text>
    </View>
  );
}

function Tab({id, label, selected, onFocus}) {
  return (
    <View focusKey={tabKey(id)} focusable onFocus={onFocus}
      className={`h-[36px] px-3 rounded-full justify-center ${selected ? 'bg-white/15' : ''} focused:bg-white`}>
      <TabLabel selected={selected}>{label}</TabLabel>
    </View>
  );
}

function TabLabel({selected, children}) {
  const focused = useIsFocused();
  return (
    <Text focused={focused} className={`font-semi text-sm ${selected ? 'text-white' : 'text-white/55'} focused:text-canvas`}>
      {children}
    </Text>
  );
}

function Section({tab, index, section}) {
  return (
    <View className="gap-1">
      <Text className="font-semi text-xs text-white/45 mb-2">{section.title}</Text>
      {section.options.map(option => (
        <Row key={option.id} focusKey={rowKey(tab, index, option.id)} option={option}
          selected={option.id === section.selected} onPress={() => section.onPick(option.id)} />
      ))}
      {!!section.note && <Text className="font-inter text-sm text-white/50 mt-3">{section.note}</Text>}
    </View>
  );
}

function Row({focusKey, option, selected, onPress}) {
  return (
    <View focusKey={focusKey} onPress={onPress} className="h-[44px] px-4 flex-row items-center gap-3 rounded-lg focused:bg-white">
      <RowBody option={option} selected={selected} />
    </View>
  );
}

function RowBody({option, selected}) {
  const focused = useIsFocused();
  return (
    <>
      <View className="w-[18px]">{selected && <CheckIcon size={16} color={focused ? '#7b6dff' : '#a9a0ff'} />}</View>
      <Text focused={focused} className={`flex-1 font-semi text-md ${selected ? 'text-white' : 'text-white/75'} focused:text-canvas truncate`}>
        {option.label}
      </Text>
      {!!option.detail && (
        <Text focused={focused} className="max-w-[160px] font-inter text-sm text-white/45 focused:text-canvas/60 truncate">{option.detail}</Text>
      )}
    </>
  );
}

function Facts({facts}) {
  return (
    <View className="gap-3">
      {facts.map(([name, value]) => (
        <View key={name} className="flex-row">
          <Text className="font-semi text-sm text-white/45 w-[130px]">{name}</Text>
          <Text className="font-inter text-sm text-white flex-1">{value}</Text>
        </View>
      ))}
    </View>
  );
}
