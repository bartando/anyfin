import {useEffect} from 'react';
import {Animated, Easing, View, useAnimatedValue} from '@react-on-anything/core';
import {px} from '../theme.js';

// The PS5 focus ring: a thin static white border with a light running around it (ANIMATION.md,
// "Focus: a light running around the border"). Phase-only changes repaint the four edge bands, not
// the card. Mount it only on the focused element so one light runs at a time.
// `outX`/`outY` push the ring outside the box (logical px), e.g. to wrap a card scaled around its centre.
export function FocusRing({radius, outX = 0, outY = 0, period = 2600}) {
  const phase = useAnimatedValue(0);
  useEffect(() => {
    const run = Animated.loop(Animated.timing(phase, {toValue: 1, duration: period, easing: Easing.linear}));
    run.start();
    return () => run.stop();
  }, []);
  const box = {position: 'absolute', left: -px(outX), right: -px(outX), top: -px(outY), bottom: -px(outY),
    borderRadius: px(radius)};
  return (
    <>
      <View pointerEvents="none" style={{...box, borderWidth: px(1.5), borderColor: 'rgba(255,255,255,0.7)'}} />
      <Animated.View pointerEvents="none" style={{...box, borderSweepColor: 'rgba(190,180,255,0.55)',
        borderSweepWidth: px(5), borderSweepLength: 0.45, borderSweepPhase: phase}} />
      <Animated.View pointerEvents="none" style={{...box, borderSweepColor: '#ffffff',
        borderSweepWidth: px(2.5), borderSweepLength: 0.3, borderSweepPhase: phase}} />
    </>
  );
}
