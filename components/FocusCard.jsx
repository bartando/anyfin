import {memo, useEffect, useState} from 'react';
import {View, motion, transitions, useIsFocused} from '@ps5-react/core';
import {FOCUS_LIFT, FOCUS_SCALE, RING_GAP, px} from '../theme.js';
import {FocusRing} from './FocusRing.jsx';
import {Glass} from './Glass.jsx';
import {FaceGlyph} from './FaceGlyph.jsx';
import {MenuGlyph} from './Icons.jsx';
import {remote} from '../lib/remote.js';
import {cardBlurred, cardFocused} from '../lib/focusedCard.js';

// Triangle's menu (a remote's menu key), hinted: a glyph in a dim circle on the card's top-left corner (the watched badge
// has the other one), once focus has rested there a moment. Outside the scaled body like the ring,
// so its fade repaints only the circle.
const HINT_AFTER_MS = 1200, HINT = 26, HINT_INSET = 8;

function TriangleHint({w, h, scale}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShown(true), HINT_AFTER_MS);
    return () => clearTimeout(id);
  }, []);
  if (!shown) return null;
  const left = -(w * (scale - 1)) / 2 + HINT_INSET, top = -(h * (scale - 1)) / 2 + HINT_INSET;
  return (
    <motion.View pointerEvents="none" initial={{opacity: 0}} animate={{opacity: 1}} transition={transitions.panel}
      className="absolute rounded-full bg-black/50 border border-white/30 items-center justify-center"
      style={{left: px(left), top: px(top), width: px(HINT), height: px(HINT)}}>
      {remote ? <MenuGlyph size={12} color="rgba(255,255,255,0.9)" />
        : <FaceGlyph button="triangle" size={12} color="rgba(255,255,255,0.9)" />}
    </motion.View>
  );
}

// The body scales around its centre; the ring sits outside the scaled subtree (a sweep inside a
// transformed node would repaint the whole node every frame), sized to the scaled box plus a gap.
function Frame({w, h, radius, scale, hint, children}) {
  const focused = useIsFocused();
  const growX = (w * (scale - 1)) / 2 + RING_GAP, growY = (h * (scale - 1)) / 2 + RING_GAP;
  return (
    <>
      <motion.View style={{position: 'absolute', left: 0, top: 0, width: px(w), height: px(h)}}
        initial={false} animate={{scale: focused ? scale : 1}} transition={transitions.focus}>
        {children}
      </motion.View>
      {focused && <Glass w={w} h={h} radius={radius} scale={scale} />}
      {focused && <FocusRing radius={radius + RING_GAP} outX={growX} outY={growY} />}
      {focused && hint && <TriangleHint w={w} h={h} scale={scale} />}
    </>
  );
}

/**
 * A focusable w×h tile (logical px) that lifts by translation, scales its body and shows the running
 * ring while focused. Scale only renders for bodies within the 768 render-px transform buffer.
 */
export const FocusCard = memo(function FocusCard({w, h, radius, scale = FOCUS_SCALE, item, onPress, onFocus, onBlur,
  focusKey, children}) {
  return (
    <motion.View focusKey={focusKey} onPress={() => onPress?.(item)}
      onFocus={() => { cardFocused(item); onFocus?.(item); }} onBlur={() => { cardBlurred(item); onBlur?.(item); }}
      whileFocus={{y: FOCUS_LIFT}} transition={transitions.focus}
      style={{width: px(w), height: px(h)}}>
      <Frame w={w} h={h} radius={radius} scale={scale} hint={!!item && !item.placeholder}>{children}</Frame>
    </motion.View>
  );
});
