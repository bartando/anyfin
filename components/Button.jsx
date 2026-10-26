import {Text, View, useIsFocused} from '@react-on-anything/core';
import {FocusRing} from './FocusRing.jsx';

function Label({primary, children}) {
  const focused = useIsFocused();
  return (
    <Text focused={focused} className={`font-semi text-md ${primary ? 'text-canvas' : 'text-white'} focused:text-canvas`}>
      {children}
    </Text>
  );
}

function Ring() {
  return useIsFocused() ? <FocusRing radius={28} outX={4} outY={4} /> : null;
}

/** Glassy pill button: lighter for the primary action. Focus turns it solid white with the ring (no
 * scale: the ring would sit inside the transformed node and repaint all of it every frame). */
export function Button({label, icon: Icon, primary = false, autoFocus, onPress, onFocus, focusKey, nextFocusUp}) {
  return (
    <View autoFocus={autoFocus} focusKey={focusKey} nextFocusUp={nextFocusUp} onPress={onPress} onFocus={onFocus}
      className={`h-[48px] px-6 flex-row items-center gap-2 rounded-full border
        ${primary ? 'bg-white/85 border-white/60' : 'bg-white/15 border-white/25'}
        focused:bg-white focused:border-white`}>
      {Icon && <IconSlot Icon={Icon} primary={primary} />}
      <Label primary={primary}>{label}</Label>
      <Ring />
    </View>
  );
}

function IconSlot({Icon, primary}) {
  const focused = useIsFocused();
  return <Icon size={20} color={primary || focused ? '#0b0b12' : '#ffffff'} />;
}
