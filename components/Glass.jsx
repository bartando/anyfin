import {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {Animated, View, useAnimatedValue} from '@react-on-anything/core';
import {px} from '../theme.js';
import {lastMove} from '../lib/lastMove.js';

const SWEEP_EVERY_MS = 7000;
// A pass after the first is a reflection caught again, not a new one: dimmer.
const REPEAT_STRENGTH = 0.55;
// Engine animations (milliseconds), not motion: the glass mounts on every focus move, and motion's
// per-element bookkeeping was the costliest part of one.
const SWEEP = {duration: 1400, delay: 80, easing: {x1: 0.32, y1: 0.08, x2: 0.18, y2: 1}};
const SETTLE = {duration: 500, easing: 'easeOut'};
// The rim and hairline wait for the card to finish scaling up, or they would show outside it.
const SETTLE_LATE = {...SETTLE, delay: 150};

const WARM = alpha => `rgba(255,250,240,${+alpha.toFixed(3)})`;
const ANGLE = 112;
// One streak, anchored where it meets the top edge: a soft bloom, a ramp ending in a bright edge, and a
// faint second line behind it, like light caught in both faces of thick glass. Offsets are along the
// gradient line from the anchor, as fractions of its length.
const LAYERS = [
  {stops: [[-0.38, 0], [-0.1, 0.05], [0.2, 0]]},
  {stops: [[-0.24, 0], [-0.06, 0.13], [-0.004, 0.5], [0.006, 0]]},
  {shift: 0.06, stops: [[-0.006, 0], [0, 0.22], [0.006, 0]]},
];

// CSS linear-gradient geometry, which backgroundGradient follows: the line through the box centre at
// `angle`, as long as the box's projection onto it.
function line(angle, w, h) {
  const r = angle * Math.PI / 180, dx = Math.sin(r), dy = -Math.cos(r);
  return {dx, dy, len: Math.abs(w * dx) + Math.abs(h * dy)};
}
const stopAt = (g, w, h, x, y) => ((x - w / 2) * g.dx + (y - h / 2) * g.dy) / g.len + 0.5;
const xAt = (g, w, h, t, y) => ((t - 0.5) * g.len - (y - h / 2) * g.dy) / g.dx + w / 2;

/**
 * The streak for a w×h card (render px): its layers' gradients in a band box just wide enough to hold
 * the light, where the band starts and stops so no light is over the card at either end, and where the
 * streak meets the top and bottom edges. Laid out in a box 1.8 cards wide, as designed, then cropped to
 * the light with every stop kept at the same pixel.
 */
function streak(w, h, strength) {
  const wide = Math.round(w * 1.8), anchor = wide * 0.55, g = line(ANGLE, wide, h);
  const lineOf = layer => stopAt(g, wide, h, anchor + (layer.shift ?? 0) * wide, 0);
  let left = Infinity, right = -Infinity;
  for (const layer of LAYERS) {
    const t = lineOf(layer), stops = layer.stops;
    left = Math.min(left, xAt(g, wide, h, t + stops[0][0], h));
    right = Math.max(right, xAt(g, wide, h, t + stops[stops.length - 1][0], 0));
  }
  left = Math.floor(left) - 2;
  const bw = Math.ceil(right) + 2 - left;
  const box = line(ANGLE, bw, h);
  const layers = LAYERS.map(layer => {
    const t = stopAt(box, bw, h, anchor - left + (layer.shift ?? 0) * wide, 0);
    return {type: 'linear', angle: ANGLE,
      stops: layer.stops.map(([at, alpha]) => ({color: WARM(alpha * strength), offset: t + at * g.len / box.len}))};
  });
  const top = anchor - left;
  const bottom = top - h * Math.tan((ANGLE - 90) * Math.PI / 180);
  return {bw, layers, top, bottom, enter: -bw, leave: w};
}

const glint = (x, y, width, height, alpha) => ({
  position: 'absolute', left: Math.round(x - width / 2), top: y, width, height,
  backgroundGradient: {type: 'linear', angle: 90, stops: [
    {color: WARM(0), offset: 0}, {color: WARM(alpha), offset: 0.5}, {color: WARM(0), offset: 1}]},
});

const COAT = {type: 'linear', angle: 170, stops: [
  {color: 'rgba(255,255,255,0.22)', offset: 0}, {color: 'rgba(255,255,255,0.06)', offset: 0.24},
  {color: 'rgba(255,255,255,0)', offset: 0.44}]};
const HAIR = {type: 'linear', angle: 90, stops: [
  {color: 'rgba(255,255,255,0)', offset: 0}, {color: 'rgba(255,255,255,0.6)', offset: 0.5},
  {color: 'rgba(255,255,255,0)', offset: 1}]};

/**
 * Glass over the focused card: a gloss coat and a lit rim settle on it, and a reflection crosses it on
 * focus and again, dimmer, every few seconds. The light is added to the art (plus-lighter) and clipped to
 * the card's rounded corners (roundedClip), so it brightens rather than washes and runs out through the
 * corners. It sits still in the room: focus moving right sends it leftward across the card. Drawn beside
 * the scaled body, sized to the scaled box, so a light step repaints the light, not the card's subtree.
 */
export function Glass({w, h, radius, scale}) {
  const [pass, setPass] = useState(0);
  // Read once: the move that brought focus here.
  const [toRight] = useState(() => lastMove() !== 'right');
  useEffect(() => {
    const id = setInterval(() => setPass(n => n + 1), SWEEP_EVERY_MS);
    return () => clearInterval(id);
  }, []);

  const sw = px(w * scale), sh = px(h * scale), r = px(radius * scale);
  const first = useMemo(() => streak(sw, sh, 1), [sw, sh]);
  const again = useMemo(() => streak(sw, sh, REPEAT_STRENGTH), [sw, sh]);
  const s = pass === 0 ? first : again;
  const [from, to] = toRight ? [s.enter, s.leave] : [s.leave, s.enter];
  const coat = useAnimatedValue(0), rim = useAnimatedValue(0), x = useAnimatedValue(from);
  useEffect(() => {
    const run = Animated.parallel([Animated.timing(coat, {toValue: 1, ...SETTLE}),
      Animated.timing(rim, {toValue: 1, ...SETTLE_LATE})]);
    run.start();
    return () => run.stop();
  }, []);
  // Each pass starts over from the side the light enters.
  useLayoutEffect(() => {
    x.setValue(from);
    const run = Animated.timing(x, {toValue: to, ...SWEEP});
    run.start();
    return () => run.stop();
  }, [pass]);
  const fill = {position: 'absolute', left: 0, top: 0, width: sw, height: sh, borderRadius: r};
  const hair = px(1);

  return (
    <View pointerEvents="none" style={{position: 'absolute', left: px((w - w * scale) / 2), top: px((h - h * scale) / 2),
      width: sw, height: sh, borderRadius: r, roundedClip: true}}>
      <Animated.View style={{...fill, opacity: coat, backgroundGradient: COAT}} />
      <Animated.View style={{...fill, opacity: rim, borderWidth: hair, borderColor: 'rgba(255,255,255,0.12)'}} />
      <Animated.View style={{position: 'absolute', left: r, top: 0, width: sw - 2 * r, height: hair, opacity: rim,
        backgroundGradient: HAIR}} />
      <Animated.View style={{position: 'absolute', left: 0, top: 0, width: s.bw, height: sh, mixBlendMode: 'plus-lighter',
        transform: [{translateX: x}]}}>
        {s.layers.map((gradient, i) => (
          <View key={i} style={{position: 'absolute', left: 0, top: 0, width: s.bw, height: sh, backgroundGradient: gradient}} />
        ))}
        {/* Where the streak crosses the top and bottom edges, the rim catches it. */}
        <View style={glint(s.top, 0, px(40), hair + px(0.5), 0.94)} />
        <View style={glint(s.bottom, sh - hair - px(0.5), px(30), hair + px(0.5), 0.44)} />
      </Animated.View>
    </View>
  );
}
