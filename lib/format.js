// Server text can carry zero-width spaces, non-breaking hyphens and spaces the baked fonts lack.
export function clean(text) {
  return (text ?? '').replace(/​/g, '').replace(/‑/g, '-').replace(/ /g, ' ');
}

// UTF-8 length from native regex counts, not a JavaScript loop per character: a surrogate pair is two
// units of two bytes each, so pairs come out at four.
const TWO_BYTES = /[\u0080-\u07ff\ud800-\udfff]/g, THREE_BYTES = /[\u0800-\ud7ff\ue000-\uffff]/g;
function byteLength(text) {
  if (!text) return 0;
  return text.length + (text.match(TWO_BYTES)?.length ?? 0) + 2 * (text.match(THREE_BYTES)?.length ?? 0);
}

// The engine stores at most 255 bytes per Text node (ER_TEXT_MAX) and silently cuts the rest, so long
// overviews are split at sentence (then word) boundaries into several Text nodes.
export const TEXT_MAX_BYTES = 250;

export function splitText(text, max = TEXT_MAX_BYTES) {
  const sentences = clean(text).match(/[^.!?]+[.!?]*["”’)]?\s*/g) ?? [];
  const out = [];
  let current = '', bytes = 0;
  const push = part => {
    const size = byteLength(part);
    if (bytes + size <= max) {
      current += part;
      bytes += size;
    } else {
      if (current.trim()) out.push(current.trim());
      current = part;
      bytes = size;
    }
  };
  for (const sentence of sentences) {
    if (byteLength(sentence) <= max) push(sentence);
    else for (const word of sentence.split(/(?<=\s)/)) push(word);
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** The text cut to `max` bytes at a word boundary, with an ellipsis when cut. */
export function clampText(text, max = TEXT_MAX_BYTES) {
  const value = clean(text);
  if (byteLength(value) <= max) return value;
  let out = '', bytes = 0;
  for (const word of value.split(/(?<=\s)/)) {
    bytes += byteLength(word);
    if (bytes > max - 3) break;
    out += word;
  }
  return out.trimEnd().replace(/[,.;:]$/, '') + '…';
}

function duration(minutes) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** Plain meta pieces after the rating: year, runtime or seasons, the first two genres. */
export function metaParts(item, genres = 2) {
  const parts = [];
  if (item.year) parts.push(String(item.year));
  if (item.kind !== 'tv' && item.runtime) parts.push(duration(item.runtime));
  if (item.kind === 'tv' && item.seasons) parts.push(item.seasons === 1 ? '1 Season' : `${item.seasons} Seasons`);
  parts.push(...(item.genres ?? []).slice(0, genres));
  return parts.map(clean);
}

export const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
/** The A–Z bar letter of a title: its sort name's first letter, '#' for digits and symbols. */
export function letterOf(item) {
  const first = (item?.sortName ?? item?.title ?? '').trim().charAt(0).toUpperCase();
  return first >= 'A' && first <= 'Z' ? first : '#';
}

/** 30514 → "30,514", grouped by hand rather than relying on the runtime's locale support. */
export const formatCount = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** "1:02:05" or "4:07": a position or length in seconds, as players show it. */
export function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600), m = String(Math.floor(s / 60) % 60), rest = String(s % 60).padStart(2, '0');
  return h ? `${h}:${m.padStart(2, '0')}:${rest}` : `${m}:${rest}`;
}
