// Repro: the embeddedReact font baker drops the closing edge of CFF (OTF) contours.
//   node cff-closepath.mjs [font ...]   (defaults: the bundled CFF OTF and glyf TTF of Inter SemiBold)
// Rasterizes glyphs exactly like bake-font.mjs bakeGlyph() at 4 bpp, prints ink % per glyph, then
// repeats with every contour explicitly closed ('Z' appended) to show that closing alone fixes it.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const ASSETS = fileURLToPath(new URL('../../react-on-anything/.deps/embeddedReact/bridges/quickjs/js/assets/', import.meta.url));
const opentype = createRequire(ASSETS + 'index.mjs')('opentype.js');
const {rasterize} = await import(ASSETS + 'rasterize.mjs');

const here = fileURLToPath(new URL('.', import.meta.url));
const fonts = process.argv.slice(2).length ? process.argv.slice(2)
  : [`${here}fonts/Inter-SemiBold-CFF.otf`, `${here}fonts/Inter-SemiBold-glyf.ttf`];
const GLYPHS = 'lHiTIKPrJo5';
const PX = 54; // text-md (18 logical) at 3840 render width

// What a fixed flattenCommands would see: every contour ends in 'Z'.
function closeContours(commands) {
  const out = [];
  for (const c of commands) {
    if (c.type === 'M' && out.length && out.at(-1).type !== 'Z') out.push({type: 'Z'});
    out.push(c);
  }
  if (out.length && out.at(-1).type !== 'Z') out.push({type: 'Z'});
  return out;
}

// Contours whose last point isn't their start point: these lose their closing edge in flattenCommands.
function openContours(commands) {
  let open = 0, start = null, last = null;
  const flush = () => { if (start && last && (last.x !== start.x || last.y !== start.y)) open++; };
  for (const c of commands) {
    if (c.type === 'M') { flush(); start = last = c; }
    else if (c.type === 'Z') { start = null; }
    else last = c;
  }
  flush();
  return open;
}

function ink(path) {
  const r = rasterize(path, {ss: 4, steps: Math.max(6, Math.ceil(PX / 3))}); // bakeGlyph's bpp=4 settings
  let sum = 0;
  for (const v of r.coverage) sum += v;
  return Math.round((sum / 255 / Math.max(1, r.width * r.height)) * 100);
}

for (const file of fonts) {
  const font = opentype.parse(fs.readFileSync(file).buffer);
  const baseline = Math.round(font.ascender * (PX / font.unitsPerEm));
  const rows = {asBaked: [], closed: []};
  for (const ch of GLYPHS) {
    const path = font.charToGlyph(ch).getPath(0, baseline, PX);
    rows.asBaked.push(`${ch}=${ink(path)}%${openContours(path.commands) ? '*' : ''}`);
    path.commands = closeContours(path.commands);
    rows.closed.push(`${ch}=${ink(path)}%`);
  }
  console.log(`${file.split('/').pop()} (${font.outlinesFormat} outlines)`);
  console.log(`  as baked:        ${rows.asBaked.join(' ')}`);
  console.log(`  contours closed: ${rows.closed.join(' ')}`);
}
console.log('* = glyph has a contour that ends away from its start point with no Z (CFF does this; glyf repeats the start point)');
