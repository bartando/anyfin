// The earlier mascot's rounded-body turntable, adapted to the Afterglow drawing.
// Project the face around the surface; retain volume when the fin turns edge-on.
export function turnAttributes(degrees) {
  const theta = degrees * Math.PI / 180;
  const c = Math.cos(theta), s = Math.sin(theta);
  const width = Math.sqrt(c * c + .84 * .84 * s * s);
  const volume = `translate(450 0) scale(${width} 1) translate(-450 0)`;
  const active = degrees > .001 && degrees < 719.999;
  const tip = 450 - 115 * c + 20 * s;
  const base = 450 + 20 * s;
  const half = 17 * Math.abs(s);
  const edge = `M${tip} 29 C${tip + half} 29 ${tip + half} 51 ${tip + half * .7} 73 C${base + half} 123 ${base + half} 164 ${base + half * 1.8} 216 L${base - half * 1.8} 216 C${base - half} 164 ${tip - half} 117 ${tip - half} 73 C${tip - half} 47 ${tip - half} 29 ${tip} 29Z`;
  const attributes = {
    'mascot-front': { opacity: active ? 0 : 1 },
    'mascot-turn': { opacity: active ? 1 : 0 },
    'turn-body': { transform: volume },
    'turn-face': { transform: volume },
    'turn-fin': { transform: `matrix(${c} 0 0 1 ${450 * (1 - c) + 20 * s} 0)` },
    'turn-fin-edge': { d: edge, opacity: Math.abs(s) },
    'turn-crown': { opacity: s * s },
    'turn-surface': {
      transform: `translate(${450 + 170 * s} 0) scale(${Math.max(0, c)} 1) translate(-450 0)`,
      opacity: Math.sqrt(Math.max(0, c)),
    },
  };
  for (const [id, x] of [['turn-eye-left', 395], ['turn-eye-right', 614], ['turn-mouth', 526.5]]) {
    const longitude = Math.asin((x - 450) / 250);
    const normal = Math.cos(longitude + theta);
    const projectedX = 450 + 250 * Math.sin(longitude + theta);
    const scale = Math.max(0, normal) / Math.cos(longitude);
    attributes[id] = {
      transform: `translate(${projectedX} 0) scale(${scale} 1) translate(${-x} 0)`,
      opacity: Math.max(0, Math.min(1, normal / .12)),
    };
  }
  return attributes;
}
