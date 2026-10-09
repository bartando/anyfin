import catalog from '../data/catalog.js';
import {SIZES} from '../theme.js';

export const {items, hero, rows, imageBase} = catalog;
export const movies = catalog.movies.map(key => items[key]);
export const shows = catalog.tv.map(key => items[key]);
export const heroItems = hero.map(key => items[key]);
export const allItems = Object.values(items);

/** Full TMDB URL, or null when the item has no such image. */
export function imageUrl(path, size) {
  return path ? imageBase + size + path : null;
}

export const backdropUrl = (item, size = SIZES.hero) => imageUrl(item.backdrop, size);
export const posterUrl = (item, size = SIZES.poster) => imageUrl(item.poster, size);
export const logoUrl = (item, size = SIZES.logo) => imageUrl(item.logo, size);

// TMDB text carries zero-width spaces, non-breaking hyphens and spaces the baked fonts lack.
export function clean(text) {
  return (text ?? '').replace(/​/g, '').replace(/‑/g, '-').replace(/ /g, ' ');
}

function byteLength(text) {
  let n = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0);
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
}

// The engine stores at most 255 bytes per Text node (ER_TEXT_MAX) and silently cuts the rest, so long
// overviews are split at sentence (then word) boundaries into several Text nodes.
export const TEXT_MAX_BYTES = 250;

export function splitText(text, max = TEXT_MAX_BYTES) {
  const sentences = clean(text).match(/[^.!?]+[.!?]*["”’)]?\s*/g) ?? [];
  const out = [];
  let current = '';
  const push = part => {
    if (byteLength(current + part) <= max) current += part;
    else {
      if (current.trim()) out.push(current.trim());
      current = part;
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
  let out = '';
  for (const word of value.split(/(?<=\s)/)) {
    if (byteLength(out + word) > max - 3) break;
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
  if (item.kind === 'movie' && item.runtime) parts.push(duration(item.runtime));
  if (item.kind === 'tv' && item.seasons) parts.push(item.seasons === 1 ? '1 Season' : `${item.seasons} Seasons`);
  parts.push(...item.genres.slice(0, genres));
  return parts.map(clean);
}

export function search(query) {
  const q = query.trim().toLowerCase();
  if (!q) return allItems;
  return allItems.filter(item => item.title.toLowerCase().includes(q));
}
