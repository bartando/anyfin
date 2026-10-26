import {useEffect, useState} from 'react';
import {FocusScope, Text, View, motion, transitions} from '@ps5-react/core';
import {SCREEN, px} from '../../theme.js';
import {SMOOTH_MS, UPSCALERS} from '../../lib/upscalers.js';
import {buttonName} from '../../lib/buttons.js';
import {FaceGlyph} from '../FaceGlyph.jsx';

// The hint at the bottom fades this long after the last input.
const HINT_MS = 4000;
const LABEL_W = 300, HANDLE = 40, GAP = 14;
// The names keep this far from the screen's edges, whichever side of them the line is.
const EDGE = 240;

const upscaler = id => UPSCALERS.find(candidate => candidate.id === id) ?? UPSCALERS[0];

/** The model after (`step` 1) or before (-1) `id` in the settings' order, Off included. */
export function cycleUpscaler(id, step) {
  const at = UPSCALERS.findIndex(candidate => candidate.id === id);
  return UPSCALERS[(Math.max(at, 0) + step + UPSCALERS.length) % UPSCALERS.length].id;
}

/**
 * Where the picture sits across the screen, in logical px: a film narrower than 16:9 is pillarboxed,
 * and the split runs across the picture, not the bars.
 */
export function pictureSpan(status) {
  const ratio = status?.width && status?.height ? status.width * (status.aspect || 1) / status.height : 16 / 9;
  const w = Math.min(SCREEN.w, SCREEN.h * ratio);
  return {x: (SCREEN.w - w) / 2, w};
}

/**
 * Upscalers side by side over the film: `left` left of the line, `right` right of it, `split` (0..1
 * across the picture) where the line is. All it draws is the line, a name by each side of it and a
 * hint that fades, so the film stays in view. The player does the input; `activity` changes with
 * each, which brings the hint back. X on it pauses or plays.
 */
export function CompareOverlay({left, right, split, span, paused, activity, onPress}) {
  const [hint, setHint] = useState(true);
  useEffect(() => {
    setHint(true);
    const id = setTimeout(() => setHint(false), HINT_MS);
    return () => clearTimeout(id);
  }, [activity]);
  const x = span.x + split * span.w;
  const handle = Math.min(Math.max(x, HANDLE / 2 + 8), SCREEN.w - HANDLE / 2 - 8);
  const leftEnd = Math.min(Math.max(x - GAP, EDGE), SCREEN.w - EDGE - 2 * GAP), rightStart = leftEnd + 2 * GAP;
  const a = upscaler(left), b = upscaler(right);
  const heavy = !paused && a.gpuMs + b.gpuMs > SMOOTH_MS;
  return (
    <FocusScope trap>
      <View focusKey="player-compare" onPress={onPress} className="absolute inset-0">
        <View className="absolute top-0 bottom-0 w-[2px] bg-white/80" style={{left: px(x - 1)}} />
        <View className="absolute rounded-full bg-white items-center justify-center"
          style={{left: px(handle - HANDLE / 2), top: px((SCREEN.h - HANDLE) / 2), width: px(HANDLE), height: px(HANDLE)}}>
          <Text className="font-semi text-md text-canvas">{'‹ ›'}</Text>
        </View>
        <View className="absolute top-[28px] items-end" style={{left: px(leftEnd - LABEL_W), width: px(LABEL_W)}}>
          <Label shoulder={buttonName('l1')} model={a} />
        </View>
        <View className="absolute top-[28px] items-start" style={{left: px(rightStart), width: px(LABEL_W)}}>
          <Label shoulder={buttonName('r1')} model={b} />
        </View>
        <motion.View className="absolute left-0 right-0 bottom-[28px] items-center" initial={false}
          animate={{opacity: hint ? 1 : 0}} transition={transitions.panel}>
          <View className="flex-row items-center gap-5 h-[40px] px-5 rounded-full bg-black/55">
            <Key text="← →" label="Slide" />
            <Key text={`${buttonName('l1')} ${buttonName('r1')}`} label="Models" />
            <Key glyph="triangle" label="Swap" />
            <Key glyph="cross" label={paused ? 'Play' : 'Pause'} />
            <Key glyph="square" label="Keep right" />
            <Key glyph="circle" label="Done" />
          </View>
          {heavy && (
            <Text className="font-inter text-xs text-amber-300 mt-2">
              Both run on every frame: {a.gpuMs + b.gpuMs} ms of GPU drops frames while playing
            </Text>
          )}
        </motion.View>
      </View>
    </FocusScope>
  );
}

function Label({shoulder, model}) {
  return (
    <View className="flex-row items-center gap-2 h-[34px] px-3 rounded-full bg-black/55">
      <View className="px-[6px] h-[20px] rounded-[5px] border border-white/50 items-center justify-center">
        <Text className="font-semi text-xs text-white/80">{shoulder}</Text>
      </View>
      <Text className="font-semi text-sm text-white">{model.name}</Text>
      {model.gpuMs > 0 && <Text className="font-inter text-xs text-white/60">{model.gpuMs} ms</Text>}
    </View>
  );
}

function Key({text, glyph, label}) {
  return (
    <View className="flex-row items-center gap-2">
      {glyph ? <FaceGlyph button={glyph} size={16} /> : <Text className="font-semi text-xs text-white/80">{text}</Text>}
      <Text className="font-inter text-xs text-white">{label}</Text>
    </View>
  );
}
