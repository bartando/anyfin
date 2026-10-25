import {getSettings} from '../../lib/settings.js';
import {UPSCALERS} from '../../lib/upscalers.js';

// What the options panel lists, from the server's playback info and the player's status.

const UPSCALE_OPTIONS = UPSCALERS.map(u => ({id: u.id, label: u.name, detail: u.badge ?? (u.gpuMs ? `${u.gpuMs} ms` : '')}));

const mbps = bits => `${Math.round(bits / 1e6)} Mbps`;

// Bits per second; 0 follows Settings.
const QUALITIES = [
  {id: 160e6, label: 'Original', detail: 'No transcoding'},
  {id: 40e6, label: '40 Mbps'},
  {id: 20e6, label: '20 Mbps'},
  {id: 10e6, label: '10 Mbps'},
  {id: 4e6, label: '4 Mbps'},
];

const METHODS = {DirectPlay: 'Direct play', DirectStream: 'Direct stream', Transcode: 'Transcoded by the server'};

// "English - SUBRIP - Default" → {label: 'English', detail: 'SUBRIP'}.
function split(title, fallback) {
  const [label, ...rest] = (title || fallback).split(' - ');
  return {label, detail: rest.filter(part => part !== 'Default').join(' · ')};
}

// Names for the language codes files and servers use (ISO 639-2, both forms, and 639-1).
const LANGUAGES = {eng: 'English', en: 'English', cze: 'Czech', ces: 'Czech', cs: 'Czech', slo: 'Slovak', slk: 'Slovak',
  sk: 'Slovak', ger: 'German', deu: 'German', de: 'German', fre: 'French', fra: 'French', fr: 'French', spa: 'Spanish',
  es: 'Spanish', ita: 'Italian', it: 'Italian', pol: 'Polish', pl: 'Polish', hun: 'Hungarian', hu: 'Hungarian',
  rus: 'Russian', ru: 'Russian', ukr: 'Ukrainian', uk: 'Ukrainian', por: 'Portuguese', pt: 'Portuguese', dut: 'Dutch',
  nld: 'Dutch', nl: 'Dutch', jpn: 'Japanese', ja: 'Japanese', kor: 'Korean', ko: 'Korean', chi: 'Chinese', zho: 'Chinese',
  zh: 'Chinese'};
const language = code => (code ? LANGUAGES[code.toLowerCase()] ?? code : '');

const channels = n => (n === 1 ? 'Mono' : n === 2 ? 'Stereo' : n > 2 ? `${n - 1}.1` : '');

// A player track, by the server's name for that stream when the file plays as it is.
function audioOption(playback, track, at) {
  const named = playback.playMethod !== 'Transcode' && playback.audio[track.index];
  if (named) return {id: track.index, ...split(named)};
  return {id: track.index, label: language(track.language) || track.title || `Track ${at + 1}`,
    detail: [(track.codec ?? '').toUpperCase(), channels(track.channels)].filter(Boolean).join(' · ')};
}

/**
 * Off, the subtitles the server lists, then the file's own text tracks it does not (an original it
 * never looked into): the player finds those in the file itself.
 */
export function subtitleOptions(playback, status) {
  const listed = playback.subtitles.options.map(option => ({id: option.track, ...split(option.label)}));
  const known = new Set(listed.map(option => option.id));
  const found = (status?.subtitleTracks ?? []).filter(track => !track.external && !known.has(track.index))
    .map((track, at) => ({id: track.index, label: language(track.language) || track.title || `Track ${listed.length + at + 1}`,
      detail: track.language ? track.title ?? '' : ''}));
  return [{id: -1, label: 'Off'}, ...listed, ...found];
}

function qualities() {
  const cap = getSettings().maxBitrate;
  return [{id: 0, label: 'Default', detail: cap >= 160e6 ? 'Original, from Settings' : `${mbps(cap)}, from Settings`}, ...QUALITIES];
}

// A model runs only on a picture the 4K screen shows at least this much bigger than it is (the
// shaders' own condition: Anime4K 1.2, ArtCNN 1.3), so a 4K file, scope (3840 × 1608) included, never.
const UPSCALE_RATIO = 1.2;

function upscaleNote(status) {
  if (!status?.height) return 'Remembered for this series.';
  const scale = Math.min(3840 / (status.width * (status.aspect || 1)), 2160 / status.height);
  const fills = scale <= UPSCALE_RATIO;
  const size = status.width >= 3840 ? `4K (${status.width} × ${status.height})` : `${status.height}p`;
  return `This file is ${size}${fills ? ' and already fills the 4K screen, so upscaling stays off'
    : ': upscaling doubles it on its way to 4K'}. Remembered for this series.`;
}

function facts(playback, status) {
  const at = status?.audioTracks?.findIndex(candidate => candidate.index === status.audioTrack) ?? -1;
  const audio = at >= 0 && audioOption(playback, status.audioTracks[at], at);
  const v = playback.version;
  return [
    ['Method', METHODS[playback.playMethod] ?? playback.playMethod],
    ['Version', [v.video, v.megabits ? `${v.megabits.toFixed(1)} Mbps` : ''].filter(Boolean).join(' · ') || v.name],
    ['Video', status ? `${(status.videoCodec ?? '').toUpperCase()} · ${status.width}×${status.height}` : '—'],
    ['Decoder', !status ? '—' : status.decoder === 'sceVideodec2' ? 'Hardware'
      : status.decoder?.startsWith('MediaCodec') ? 'Hardware (MediaCodec)' : 'Software (FFmpeg)'],
    ['Audio', audio ? [audio.label, audio.detail].filter(Boolean).join(' · ') : '—'],
    ['Buffered', status ? `${Math.max(0, Math.round(status.buffered - status.position))} s ahead` : '—'],
    ['Frames', status ? `${status.shownFrames} shown · ${status.droppedFrames} dropped` : '—'],
    ['Late', status ? `${(status.lateMs ?? 0).toFixed(1)} ms on average` : '—'],
  ];
}

// An episode's series can autoplay differently from Settings.
function autoplaySection(autoplay, pick) {
  const id = autoplay.series === undefined ? 'default' : autoplay.series ? 'on' : 'off';
  return {title: 'AUTOPLAY NEXT EPISODE · THIS SERIES', selected: id, onPick: pick.autoplay, options: [
    {id: 'default', label: 'Default', detail: `${getSettings().autoplay ? 'On' : 'Off'}, from Settings`},
    {id: 'on', label: 'On'}, {id: 'off', label: 'Off'},
  ], note: 'On, the next episode starts a few seconds into the credits. Remembered for this series.'};
}

/**
 * The panel's tabs. `pick` holds the handlers: audio, subtitles, version, quality, upscale, compare and, for an
 * episode (`autoplay` set), autoplay ('default', 'on' or 'off').
 */
export function optionTabs({playback, status, subtitleTrack, upscale, autoplay, pick}) {
  return [
    {id: 'tracks', label: 'Audio & Subtitles', columns: true, sections: [
      {title: 'AUDIO', options: (status?.audioTracks ?? []).map((track, at) => audioOption(playback, track, at)), selected: status?.audioTrack, onPick: pick.audio},
      {title: 'SUBTITLES', selected: subtitleTrack, onPick: pick.subtitles, options: subtitleOptions(playback, status)},
    ]},
    {id: 'version', label: 'Version', sections: [
      // The server's name tells versions apart ("1080p · CZ dabing · 4.6 GB"); a bare container name does not.
      {title: 'VERSION', selected: playback.mediaSourceId, onPick: pick.version, options: playback.versions.map(v => ({
        id: v.id, label: v.named ? v.name : v.video || v.name,
        detail: [v.direct ? 'Direct' : 'Transcode', !v.named && v.gigabytes ? `${v.gigabytes.toFixed(1)} GB` : ''].filter(Boolean).join(' · '),
      }))},
      {title: 'QUALITY', selected: playback.maxBitrate ?? 0, onPick: pick.quality, options: qualities(),
        note: `Playing: ${(METHODS[playback.playMethod] ?? playback.playMethod).toLowerCase()}.`},
    ]},
    {id: 'upscale', label: 'Upscaling', sections: [
      {title: 'UPSCALING · FOR ANIMATION', selected: upscale, onPick: pick.upscale, options: UPSCALE_OPTIONS, note: upscaleNote(status)},
      {title: 'COMPARE', selected: null, onPick: pick.compare,
        options: [{id: 'compare', label: 'Side by side', detail: 'Two models on one picture'}]},
    ]},
    ...(autoplay ? [{id: 'autoplay', label: 'Autoplay', sections: [autoplaySection(autoplay, pick)]}] : []),
    {id: 'info', label: 'Info', facts: facts(playback, status)},
  ];
}
