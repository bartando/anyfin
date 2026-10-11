import {useEffect, useState} from 'react';
import {FocusScope, Image, Svg, View, motion} from '@ps5-react/core';
import frames from '../assets/brand/intro-frames.json';
import background from '../assets/brand/intro-background.png';
import ground from '../assets/brand/intro-ground.png';
import wordmark from '../assets/brand/wordmark.png';
import {px} from '../theme.js';

// The source composition is 1920 wide; app layout uses 1280 logical pixels.
const unit = value => px(value * 2 / 3);
const frameStyle = {position: 'absolute', left: unit(frames.box.x), top: unit(frames.box.y),
  width: unit(frames.box.width), height: unit(frames.box.height)};
// The vector rasterizer's coverage row is 1024 physical px. Two clipped windows
// keep each pass below that limit while drawing the same full-resolution tape.
const tiles = [0, 1].map(i => ({
  window: {...frameStyle, left: frameStyle.left + i * frameStyle.width / 2,
    width: frameStyle.width / 2, overflow: 'hidden'},
  artwork: {position: 'absolute', left: -i * frameStyle.width / 2, top: 0,
    width: frameStyle.width, height: frameStyle.height},
}));
const wordmarkStyle = {position: 'absolute', left: unit(736.668), top: unit(694.8),
  width: unit(448), height: unit(150.4)};
const groundStyles = frames.ground.map(light => ({position: 'absolute',
  left: unit(light.x), top: unit(light.y), width: unit(light.width), height: unit(light.height),
  opacity: light.opacity}));

/** Owns controller focus while the signed-in app loads underneath. */
export function LaunchIntro({onComplete}) {
  const [pose, setPose] = useState(frames.frames[0]);
  useEffect(() => {
    const started = Date.now();
    // Only this small component updates; all path parsing and clipping happened
    // in the exporter. Elapsed time skips missed poses instead of slowing down.
    const ticker = setInterval(() => {
      const index = Math.min(frames.frames.length - 1, Math.floor((Date.now() - started) * frames.fps / 1000));
      setPose(frames.frames[index]);
    }, 16);
    const finish = setTimeout(onComplete, frames.duration);
    return () => { clearInterval(ticker); clearTimeout(finish); };
  }, [onComplete]);

  return (
    <FocusScope autoFocus trap onBack={() => { onComplete(); return true; }} onAction={() => true}>
      <View focusKey="launch-skip" onPress={onComplete} className="w-screen h-screen bg-[#15111e]">
        <Image source={background} resizeMode="stretch" className="absolute inset-0 w-screen h-screen" />
        <Image source={ground} resizeMode="stretch" style={groundStyles[pose]} />
        {tiles.map((tile, column) => (
          <View key={column} style={tile.window}>
            {frames.sources[pose].map((source, i) => <Svg key={i} source={source} style={tile.artwork} />)}
          </View>
        ))}
        <motion.Image source={wordmark} resizeMode="contain" style={wordmarkStyle}
          initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}}
          transition={{type: 'tween', duration: .62, delay: 1.6, ease: 'easeOut'}} />
      </View>
    </FocusScope>
  );
}
