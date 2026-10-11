import test from 'node:test';
import assert from 'node:assert/strict';
import {chapterMarkers, mergeMarkers, segmentMarkers, skippable} from '../lib/jellyfin/markers.js';

const T = 10000000;
const segment = (Type, start, end) => ({Type, StartTicks: start * T, EndTicks: end * T});
const chapter = (Name, start) => ({Name, StartPositionTicks: start * T});

test('segments: the earliest valid one of each kind; commercials, previews and broken ones ignored', () => {
  const found = segmentMarkers({Items: [
    segment('Commercial', 0, 30), segment('Intro', 300, 290), segment('Intro', 95, 180), segment('Intro', 600, 650),
    segment('Recap', 0, 40), segment('Outro', 1250, 1320), segment('Preview', 1320, 1340),
  ]});
  assert.deepEqual(found, {intro: {start: 95, end: 180}, recap: {start: 0, end: 40}, outro: {start: 1250, end: 1320}});
  assert.deepEqual(segmentMarkers(null), {intro: null, recap: null, outro: null});
});

test('chapters: a named intro runs to the next chapter, credits from where they start', () => {
  const found = chapterMarkers([
    chapter('Chapter 3', 400), chapter('Previously On', 0), chapter('Opening', 60), chapter('Chapter 2', 150),
    chapter('End Credits', 1280),
  ]);
  assert.deepEqual(found.recap, {start: 0, end: 60});
  assert.deepEqual(found.intro, {start: 60, end: 150});
  assert.equal(found.outro.start, 1280);
});

test('chapters: anime OP/ED names count; "Intro End", a one-second stub and a long "Intro" do not', () => {
  assert.deepEqual(chapterMarkers([chapter('Avant', 0), chapter('OP', 90), chapter('Part A', 180), chapter('ED', 1300)]).intro,
    {start: 90, end: 180});
  assert.equal(chapterMarkers([chapter('OP2', 0), chapter('A', 89)]).intro.end, 89);
  assert.equal(chapterMarkers([chapter('Intro End', 0), chapter('A', 60)]).intro, null);
  assert.equal(chapterMarkers([chapter('Intro', 0), chapter('A', 0.5)]).intro, null);
  assert.equal(chapterMarkers([chapter('Intro', 0), chapter('A', 900)]).intro, null);
  assert.equal(chapterMarkers([chapter('Introspection', 0), chapter('A', 60)]).intro, null);
});

test('segments win over chapters, which fill in what they lack', () => {
  const merged = mergeMarkers(segmentMarkers({Items: [segment('Intro', 10, 100)]}),
    chapterMarkers([chapter('Intro', 0), chapter('A', 60), chapter('Credits', 1200)]));
  assert.deepEqual(merged.intro, {start: 10, end: 100});
  assert.equal(merged.outro.start, 1200);
});

test('skippable: inside the segment, not in its last two seconds; a recap before an intro', () => {
  const markers = {recap: {start: 0, end: 40}, intro: {start: 40, end: 130}, outro: null};
  assert.deepEqual(skippable(markers, 5), {kind: 'recap', end: 40});
  assert.deepEqual(skippable(markers, 40), {kind: 'intro', end: 130});
  assert.equal(skippable(markers, 128.5), null);
  assert.equal(skippable(markers, 200), null);
  assert.equal(skippable(null, 50), null);
});
