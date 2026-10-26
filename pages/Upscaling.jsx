import {Text, View, useIsFocused} from '@react-on-anything/core';
import {FocusRing} from '../components/FocusRing.jsx';
import {SMOOTH_MS, UPSCALERS} from '../lib/upscalers.js';

const MAX_MS = 20;

function Radio({on}) {
  const focused = useIsFocused();
  return (
    <View className={`size-6 rounded-full border-2 items-center justify-center
      ${on ? 'border-accent' : 'border-white/40'} ${focused ? 'border-canvas' : ''}`}>
      {on && <View className={`size-3 rounded-full ${focused ? 'bg-canvas' : 'bg-accent'}`} />}
    </View>
  );
}

function Badge({text}) {
  const focused = useIsFocused();
  return (
    <View className={`px-2 h-[22px] justify-center rounded-full ${focused ? 'bg-canvas' : 'bg-accent/30'}`}>
      <Text className="font-semi text-xs text-white">{text}</Text>
    </View>
  );
}

// The GPU time against the most a model takes: green while it keeps 60 fps, amber past that.
function Cost({ms}) {
  const focused = useIsFocused();
  const smooth = ms <= SMOOTH_MS;
  return (
    <View className="w-[190px] gap-[6px]">
      <Text focused={focused} className="font-inter text-xs text-slate-300 focused:text-slate-700">
        {ms ? `${ms} ms GPU a frame` : 'No GPU work'}
      </Text>
      <View className={`h-[6px] rounded-full ${focused ? 'bg-canvas/15' : 'bg-white/10'}`}>
        {ms > 0 && (
          <View className={`h-[6px] rounded-full ${smooth ? 'bg-[#4ade80]' : 'bg-[#fbbf24]'}`}
            style={{width: `${Math.min(1, ms / MAX_MS) * 100}%`}} />
        )}
      </View>
    </View>
  );
}

function Names({model}) {
  const focused = useIsFocused();
  return (
    <View className="flex-1 gap-[2px]">
      <View className="flex-row items-center gap-3">
        <Text focused={focused} className="font-semi text-md text-white focused:text-canvas">{model.name}</Text>
        {model.badge && <Badge text={model.badge} />}
      </View>
      <Text focused={focused} className="font-inter text-xs text-slate-400 focused:text-slate-600 line-clamp-2">
        {model.about}
      </Text>
    </View>
  );
}

function Ring() {
  return useIsFocused() ? <FocusRing radius={16} outX={3} outY={3} /> : null;
}

function ModelCard({model, selected, onPress, nextFocusLeft}) {
  return (
    <View focusKey={`upscaler:${model.id || 'off'}`} nextFocusLeft={nextFocusLeft} onPress={onPress}
      className={`min-h-[76px] px-5 py-3 flex-row items-center gap-5 rounded-2xl border
        ${selected ? 'bg-accent/15 border-accent/70' : 'bg-white/5 border-white/10'} focused:bg-white focused:border-white`}>
      <Radio on={selected} />
      <Names model={model} />
      <Cost ms={model.gpuMs} />
      <Ring />
    </View>
  );
}

/**
 * Which network doubles a 720p or 1080p picture on the way to a 4K screen. The choice applies from
 * the next picture, also in a film already playing.
 */
export function UpscalingPanel({value, onChange, nextFocusLeft}) {
  return (
    <View className="gap-3">
      <View className="px-5 py-4 gap-1 rounded-2xl bg-accent/10 border border-accent/30">
        <Text className="font-semi text-sm text-white">Sharper anime on a 4K screen</Text>
        <Text className="font-inter text-xs text-slate-300">
          Doubles 720p and 1080p pictures before the PS5 scales them. Made for animation: live action can look
          painted. The first film after a change pauses for half a second while the GPU prepares it.
        </Text>
      </View>
      {UPSCALERS.map(model => (
        <ModelCard key={model.id || 'off'} model={model} selected={model.id === value}
          onPress={() => onChange(model.id)} nextFocusLeft={nextFocusLeft} />
      ))}
    </View>
  );
}
