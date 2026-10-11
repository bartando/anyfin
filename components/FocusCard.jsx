import {memo, useEffect, useState} from 'react';
import {View, motion, transitions, useIsFocused} from '@ps5-react/core';
import {FOCUS_LIFT, FOCUS_SCALE, RING_GAP, px} from '../theme.js';
import {FocusRing} from './FocusRing.jsx';
import {cardBlurred, cardFocused} from '../lib/focusedCard.js';

const GLIMMER_EVERY_MS = 4000;
// The band is a box three cards tall, clipped to the card: its corner-to-corner gradient puts a "/"
// stripe through the middle third, which is all that shows. Its width sets the slant: tan(20°) × 3h.
const GLIMMER_SLANT = Math.tan(20 * Math.PI / 180);
// Where the visible stripe sits across the band, as fractions of its width: its centre runs from 2/3
// (card top) to 1/3 (card bottom), and the 45%–55% stops make it a tenth of the width either side.
const STRIPE_LEFT = 1 / 3 - 0.1, STRIPE_RIGHT = 2 / 3 + 0.1;
const SWEEP = {type: 'tween', duration: 0.9, ease: [0.4, 0, 0.2, 1]};
const FADE_IN = {type: 'tween', duration: 0.25, ease: 'easeOut'};
const FADE_OUT = {type: 'tween', delay: 0.4, duration: 0.4, ease: 'easeIn'};

// A soft band of light crossing the focused card at a slant, on focus and then every few seconds. It
// sits beside the ring, outside the scaled body, so only the band's strip repaints, not the card. A
// rotated band would take one of the two transform cache slots the card's scale needs, so the slant is
// the gradient's. Clipping is to rectangles, not rounded corners, so the clip leaves out the corner
// columns.
function Glimmer({w, h, radius, scale}) {
  const [pass, setPass] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPass(n => n + 1), GLIMMER_EVERY_MS);
    return () => clearInterval(id);
  }, []);
  const sw = w * scale, sh = h * scale, inset = radius * scale, clipW = sw - 2 * inset;
  const band = 3 * sh * GLIMMER_SLANT;
  return (
    <View pointerEvents="none" style={{position: 'absolute', overflow: 'hidden',
      left: px((w - sw) / 2 + inset), top: px((h - sh) / 2), width: px(clipW), height: px(sh)}}>
      {/* The stripe starts and stops inside the clip, so no edge of it is ever cut. */}
      <motion.View key={pass} initial={{x: -band * STRIPE_LEFT, opacity: 0}}
        animate={{x: clipW - band * STRIPE_RIGHT, opacity: 1}}
        transition={{x: SWEEP, opacity: FADE_IN}}
        style={{position: 'absolute', left: 0, top: -px(sh), width: px(band), height: px(3 * sh)}}>
        <motion.View initial={{opacity: 1}} animate={{opacity: 0}} transition={FADE_OUT}
          className="absolute inset-0 bg-gradient-to-br from-transparent from-45% via-white/30 via-50% to-transparent to-55%" />
      </motion.View>
    </View>
  );
}

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
      {focused && <Glimmer w={w} h={h} radius={radius} scale={scale} />}
      {focused && <FocusRing radius={radius + RING_GAP} outX={growX} outY={growY} />}
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
      <Frame w={w} h={h} radius={radius} scale={scale}>{children}</Frame>
    </motion.View>
  );
});
