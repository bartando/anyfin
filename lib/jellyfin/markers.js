// Where an episode's intro, recap and credits are, in seconds: {intro, recap, outro}, each {start, end}
// or null. Jellyfin's media segments (10.10 on, filled in by a plugin such as Intro Skipper) are the
// source; without them, chapters named like "Opening" or "End Credits" stand in.

const TICKS_PER_SECOND = 10000000;
// A chapter shorter or longer than these is not an intro, whatever it is called.
const CHAPTER_MIN = 1, CHAPTER_MAX = 300;

const valid = (start, end) => Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start;
const none = () => ({intro: null, recap: null, outro: null});

/** From GET /MediaSegments/{id}: the earliest segment of each kind. */
export function segmentMarkers(reply) {
  const found = none();
  const kinds = {Intro: 'intro', Recap: 'recap', Outro: 'outro'};
  for (const segment of reply?.Items ?? []) {
    const kind = kinds[segment.Type];
    const start = segment.StartTicks / TICKS_PER_SECOND, end = segment.EndTicks / TICKS_PER_SECOND;
    if (!kind || !valid(start, end)) continue;
    if (!found[kind] || start < found[kind].start) found[kind] = {start, end};
  }
  return found;
}

const words = name => (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// "Intro", "Opening Credits", "OP", "OP2", "Intro - Theme"; not "Intro End", a marker some tools add
// where the intro stops.
function introName(name) {
  if (name.endsWith(' end')) return false;
  if (/^op ?\d*$/.test(name)) return true;
  return ['intro', 'introduction', 'opening', 'opening credits', 'opening theme', 'title sequence']
    .some(label => name === label || name.startsWith(`${label}: `) || name.startsWith(`${label} - `));
}

const recapName = name => name === 'recap' || name.startsWith('previously');
const creditsName = name => name === 'credits' || name === 'ending' || /^ed ?\d*$/.test(name)
  || /end(ing)? credits|closing credits|outro/.test(name);

/** From an item's Chapters: a named chapter runs to the next one; the credits run to the end. */
export function chapterMarkers(chapters) {
  const found = none();
  const list = (chapters ?? []).map(chapter => ({start: chapter.StartPositionTicks / TICKS_PER_SECOND, name: words(chapter.Name)}))
    .filter(chapter => Number.isFinite(chapter.start) && chapter.start >= 0)
    .sort((a, b) => a.start - b.start);
  list.forEach((chapter, index) => {
    const next = list.slice(index + 1).find(later => later.start > chapter.start);
    if (creditsName(chapter.name) && !found.outro) found.outro = {start: chapter.start, end: Infinity};
    const kind = introName(chapter.name) ? 'intro' : recapName(chapter.name) ? 'recap' : null;
    const length = next ? next.start - chapter.start : 0;
    if (!kind || found[kind] || length <= CHAPTER_MIN || length > CHAPTER_MAX) return;
    found[kind] = {start: chapter.start, end: next.start};
  });
  return found;
}

/** `primary`'s markers, with `fallback`'s where it has none. */
export const mergeMarkers = (primary, fallback) => ({
  intro: primary.intro ?? fallback.intro, recap: primary.recap ?? fallback.recap, outro: primary.outro ?? fallback.outro,
});

export const hasMarkers = markers => !!(markers.intro || markers.recap || markers.outro);

// The offer goes away this close to the segment's end: skipping would gain nothing.
const SKIP_TAIL = 2;

/** The intro or recap playing at `position` that can be skipped: {kind, end}, or null. */
export function skippable(markers, position) {
  for (const kind of ['recap', 'intro']) {
    const segment = markers?.[kind];
    if (segment && position >= segment.start && position < segment.end - SKIP_TAIL) return {kind, end: segment.end};
  }
  return null;
}
