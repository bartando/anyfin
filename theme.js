// Layout constants in logical px (1280-wide, like Tailwind classes) plus helpers for the places that
// take raw style objects, which the engine reads in render px.
export const RENDER_SCALE = 3840 / 1280;
export const px = n => Math.round(n * RENDER_SCALE);

export const SCREEN = {w: 1280, h: 720};

// 240 logical = 720 render px: inside the 768 px transform buffer, so the focus scale renders.
export const CARD = {w: 240, h: 135, radius: 12, gap: 16};
export const POSTER = {w: 176, h: 264, radius: 12, colGap: 25, rowGap: 28, cols: 6};
export const CAST = {size: 96};

export const FOCUS_SCALE = 1.05;
export const FOCUS_LIFT = -4;
export const RING_GAP = 4;

export const HERO_ROTATE_MS = 8000;
export const PREVIEW_DELAY_MS = 350;

// TMDB size per use. Images decode at their box size and are never enlarged, so a source smaller
// than its box is upscaled on every repaint; w1280 is the largest backdrop under the 5 MP limit.
export const SIZES = {
  hero: 'w1280',
  card: 'w780',
  poster: 'w780',
  logo: 'w500',
  cardLogo: 'w300',
  profile: 'h632',
};

export const COLORS = {
  canvas: '#0b0b12',
  accent: '#7b6dff',
  white: '#ffffff',
};
