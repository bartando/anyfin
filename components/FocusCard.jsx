import {memo} from 'react';
import {View, motion, transitions, useIsFocused} from '@ps5-react/core';
import {FOCUS_LIFT, FOCUS_SCALE, RING_GAP, px} from '../theme.js';
import {FocusRing} from './FocusRing.jsx';

// The body scales around its centre; the ring sits outside the scaled subtree (a sweep inside a
// transformed node would repaint the whole node every frame), sized to the scaled box plus a gap.
function Frame({w, h, radius, scale, children}) {
  const focused = useIsFocused();
  const growX = (w * (scale - 1)) / 2 + RING_GAP, growY = (h * (scale - 1)) / 2 + RING_GAP;
  return (
    <>
      <motion.View style={{position: 'absolute', left: 0, top: 0, width: px(w), height: px(h)}}
        initial={false} animate={{scale: focused ? scale : 1}} transition={transitions.focus}>
        {children}
      </motion.View>
      {focused && <FocusRing radius={radius + RING_GAP} outX={growX} outY={growY} />}
    </>
  );
}

/**
 * A focusable w×h tile (logical px) that lifts by translation, scales its body and shows the running
 * ring while focused. Scale only renders for bodies within the 768 render-px transform buffer.
 */
export const FocusCard = memo(function FocusCard({w, h, radius, scale = FOCUS_SCALE, item, onPress, onFocus,
  focusKey, children}) {
  return (
    <motion.View focusKey={focusKey} onPress={() => onPress?.(item)} onFocus={() => onFocus?.(item)}
      whileFocus={{y: FOCUS_LIFT}} transition={transitions.focus}
      style={{width: px(w), height: px(h)}}>
      <Frame w={w} h={h} radius={radius} scale={scale}>{children}</Frame>
    </motion.View>
  );
});

export function Placeholder({children}) {
  return <View className="absolute inset-0 items-center justify-center px-3">{children}</View>;
}
