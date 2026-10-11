// Layout constants in logical px (1280-wide, like Tailwind classes) plus helpers for the places that
// take raw style objects, which the engine reads in render px.
export const RENDER_SCALE = 3840 / 1280;
export const px = n => Math.round(n * RENDER_SCALE);

export const SCREEN = {w: 1280, h: 720};

// 240 logical = 720 render px: inside the 768 px transform buffer, so the focus scale renders.
export const CARD = {w: 240, h: 135, radius: 12, gap: 16};
// colGap leaves room on the right for the A–Z bar.
export const POSTER = {w: 176, h: 264, radius: 12, colGap: 18, rowGap: 28, cols: 6};
export const CAST = {size: 96};

export const FOCUS_SCALE = 1.05;
export const FOCUS_LIFT = -4;
export const RING_GAP = 4;
// What a focused card takes past its box above and below (logical px): half its scale's growth, the
// lift, the ring's gap and its stroke. A row that clips, as a ScrollView does, pads its cards by this.
export const focusRoom = h => Math.ceil(h * (FOCUS_SCALE - 1) / 2 + Math.abs(FOCUS_LIFT) + RING_GAP + 2);
// A row of captioned cards h tall, in render px: the cards, two caption lines and the focus room.
export const CAPTION_H = 47;
export const captionedRowH = h => px(h + CAPTION_H + 2 * focusRoom(h));

export const HERO_ROTATE_MS = 8000;
export const PREVIEW_DELAY_MS = 350;

// Image width per use, in render px: the server scales art to it. Images decode at their box size and
// are never enlarged, so a smaller source is upscaled on every repaint. Backdrops stop at 1280: a
// server that proxies TMDB rounds widths up to its sizes, and past w1280 that is the original, which
// can be over the 5 MP decode limit.
export const SIZES = {
  hero: 1280,
  card: 720,
  poster: 528,
  logo: 800,
  cardLogo: 400,
  profile: 400,
  portrait: 600,
};

export const COLORS = {
  canvas: '#0b0b12',
  accent: '#7b6dff',
  white: '#ffffff',
};
