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

const channels = n => (n === 1 ? 'Mono' : n === 2 ? 'Stereo' : n > 2 ? `${n - 1}.1` : '');

// A player track, by the server's name for that stream when the file plays as it is.
function audioOption(playback, track, at) {
  const named = playback.playMethod !== 'Transcode' && playback.audio[track.index];
  if (named) return {id: track.index, ...split(named)};
  return {id: track.index, label: track.language || track.title || `Track ${at + 1}`,
    detail: [(track.codec ?? '').toUpperCase(), channels(track.channels)].filter(Boolean).join(' · ')};
}

function qualities() {
  const cap = getSettings().maxBitrate;
  return [{id: 0, label: 'Default', detail: cap >= 160e6 ? 'Original, from Settings' : `${mbps(cap)}, from Settings`}, ...QUALITIES];
}

function upscaleNote(status) {
  if (!status?.height) return 'Remembered for this series.';
  const fills = status.height >= 2160;
  return `This file is ${status.height}p${fills ? ' and already fills the 4K screen, so upscaling does nothing'
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
    ['Decoder', !status ? '—' : status.decoder === 'sceVideodec2' ? 'Hardware' : 'Software (FFmpeg)'],
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
      {title: 'SUBTITLES', selected: subtitleTrack, onPick: pick.subtitles, options: [
        {id: -1, label: 'Off'},
        ...playback.subtitles.options.map(option => ({id: option.track, ...split(option.label)})),
      ]},
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
