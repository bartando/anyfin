// Pure timeline shared by the interactive SVG and the 4K video renderer.
import { turnAttributes } from './turn.mjs';
export const duration = 4000;
export const fps = 60;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const ramp = (time, start, end) => smooth((time - start) / (end - start));
const round = value => Math.round(value * 100000) / 100000;
function track(time, keys) {
  if (time <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (time <= keys[i][0]) {
      const [a, av] = keys[i - 1], [b, bv] = keys[i];
      return av + (bv - av) * smooth((time - a) / (b - a));
    }
  }
  return keys.at(-1)[1];
}
export function poseAt(time) {
  const t = Math.max(0, Math.min(duration, time));
  const reveal = ramp(t, 180, 720);
  // Reuse the original 1.5-second launch, after the initial reveal. Distances
  // are scaled from the earlier 900-unit mascot into this icon's .68 scale.
  const launchTime = Math.max(0, t - 810);
  const flight = clamp((launchTime - 170) / 840);
  const lift = .68 * 840 * flight * (1 - flight);
  const rebound = clamp((launchTime - 1130) / 230);
  const rise = lift + .68 * 48 * rebound * (1 - rebound);
  const sx = track(launchTime, [[0,1],[170,1.14],[240,.91],[500,1],[900,.96],[1010,1],[1090,1.16],[1210,.97],[1360,1.025],[1500,1]]);
  const sy = track(launchTime, [[0,1],[170,.82],[240,1.12],[500,1],[900,1.06],[1010,1],[1090,.8],[1210,1.04],[1360,.975],[1500,1]]);
  const yaw = 720 * smooth((flight - .06) / .88);
  const ripple = clamp((t - 1820) / 900);
  const pulse = Math.sin(Math.PI * ripple) * .24;
  // After the landing rebound, the dot eyes close into happy arcs and the
  // little dash eases into a smile. The spin keeps the original curious face.
  const smile = ramp(t, 2030, 2410);
  const squint = ramp(t, 2230, 2350);
  const happyEyes = ramp(t, 2310, 2420);
  const eyeOpacity = 1 - ramp(t, 2290, 2360);
  const mouthX1 = 511 - 9 * smile, mouthY1 = 398;
  const mouthCX = 526.5 + 2.5 * smile, mouthCY = 395.5 + 40.5 * smile;
  const mouthX2 = 542 + 9 * smile, mouthY2 = 393 - 2 * smile;
  const distance = lift / (.68 * 210);
  const attrs = {
    ...turnAttributes(yaw),
    'splash-haze-layer': { opacity: round(.45 + .55 * reveal + pulse) },
    'aura-layer': { opacity: round(reveal * (1 + pulse)), transform: `translate(259 321) scale(${round(1 + pulse * .35)}) translate(-259 -321)` },
    'ground-layer': { opacity: round(reveal * (1 - .55 * distance)), transform: `translate(260 467) scale(${round(1 - .36 * distance)} ${round(1 - .2 * distance)}) translate(-260 -467)` },
    'landing-ripple': { opacity: round((ripple > 0 && ripple < 1) ? .4 * Math.pow(1 - ripple, 2) : 0), rx: round(140 + ripple * 285), ry: round(17 + ripple * 42) },
    'mascot-motion': { opacity: round(reveal), transform: `translate(260 ${round(467 - rise + 30 * (1 - reveal))}) scale(${round(sx)} ${round(sy)}) translate(-260 -467)` },
    'eye-left': { opacity: round(eyeOpacity), transform: `translate(395 355) scale(1 ${round(1 - .92 * squint)}) translate(-395 -355)` },
    'eye-right': { opacity: round(eyeOpacity), transform: `translate(614 326) scale(1 ${round(1 - .92 * squint)}) translate(-614 -326)` },
    'mouth': { d: `M${round(mouthX1)} ${mouthY1}Q${round(mouthCX)} ${round(mouthCY)} ${round(mouthX2)} ${round(mouthY2)}` },
    'happy-cheeks': { opacity: round(.46 * smile) },
    'happy-eyes': { opacity: round(happyEyes) },
    'happy-eye-left': { d: `M371 360Q394 ${round(357 - 37 * happyEyes)} 419 354` },
    'happy-eye-right': { d: `M596 332Q613 ${round(329 - 33 * happyEyes)} 632 326` },
  };
  for (let i = 0; i < 6; i++) {
    const progress = ramp(t, 1600 + 65 * i, 2220 + 65 * i);
    attrs['letter-' + i] = { opacity: round(progress), transform: `translate(0 ${round(24 * (1 - progress))})` };
  }
  return attrs;
}
export function applyPose(svg, time) {
  for (const [id, attributes] of Object.entries(poseAt(time))) {
    const node = svg.querySelector('#' + id);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  }
}
