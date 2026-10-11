import {api, invalidate} from './api.js';
import {getDeviceId, getSession} from './session.js';
import {chapterMarkers, mergeMarkers, segmentMarkers} from './markers.js';
import {getSettings} from '../settings.js';

const TICKS_PER_SECOND = 10000000;

// The HEVC ranges the player shows (Jellyfin's VideoRangeType names). HDR10, HDR10+ and HLG are tone
// mapped to SDR. Dolby Vision plays its base layer: the PS5 decoder drops the RPU and enhancement
// layer NAL units, so profile 7 (DOVIWithEL…) and 8 play as HDR10, HLG or SDR, and DOVIInvalid as
// whatever its base layer signals. Profile 5 (DOVI) has no such base layer: the server transcodes it,
// which with hardware transcoding needs the server's tone mapping on, or the colours come out wrong.
const HEVC_RANGES = ['SDR', 'HDR10', 'HDR10Plus', 'HLG', 'DOVIWithSDR', 'DOVIWithHDR10', 'DOVIWithHDR10Plus',
  'DOVIWithHLG', 'DOVIWithEL', 'DOVIWithELHDR10Plus', 'DOVIInvalid'];

// What the PS5 player takes as it is: the hardware decodes H.264 up to High, HEVC Main and Main 10 and
// VP9 profile 0 up to 4K; FFmpeg decodes the rest of these up to 1080p. Anything else the server
// transcodes to H.264 and AAC over HLS. VP9 needs no range: profile 0 is 8-bit, and HDR VP9 is not.
const DEVICE_PROFILE = {
  Name: 'Anyfin PS5',
  MaxStreamingBitrate: 160000000,
  MaxStaticBitrate: 160000000,
  MusicStreamingTranscodingBitrate: 384000,
  DirectPlayProfiles: [{
    Type: 'Video',
    Container: 'mp4,m4v,mov,mkv,webm,ts,m2ts,mpegts,avi,flv',
    VideoCodec: 'h264,hevc,vp9,mpeg4,mpeg2video,vc1,msmpeg4v3',
    AudioCodec: 'aac,ac3,eac3,mp3,mp2,opus,vorbis,flac,alac,truehd,dts,pcm_s16le,pcm_s24le',
  }],
  TranscodingProfiles: [{
    Type: 'Video', Container: 'ts', Protocol: 'hls', Context: 'Streaming', VideoCodec: 'h264', AudioCodec: 'aac,ac3',
    MaxAudioChannels: '6', MinSegments: '1', BreakOnNonKeyFrames: true,
  }],
  CodecProfiles: [
    {Type: 'Video', Codec: 'h264', Conditions: [
      {Condition: 'EqualsAny', Property: 'VideoProfile', Value: 'high|main|baseline|constrained baseline'},
      {Condition: 'LessThanEqual', Property: 'VideoBitDepth', Value: '8'},
      // As Jellyfin's web client asks: H.264 HDR is all but unknown, and SDR only keeps the server
      // from copying such a stream into a transcode as it is.
      {Condition: 'EqualsAny', Property: 'VideoRangeType', Value: 'SDR'},
      {Condition: 'LessThanEqual', Property: 'Width', Value: '3840'},
    ]},
    {Type: 'Video', Codec: 'hevc', Conditions: [
      {Condition: 'EqualsAny', Property: 'VideoProfile', Value: 'main|main 10'},
      {Condition: 'EqualsAny', Property: 'VideoRangeType', Value: HEVC_RANGES.join('|'), IsRequired: true},
      {Condition: 'LessThanEqual', Property: 'Width', Value: '3840'},
    ]},
    {Type: 'Video', Codec: 'vp9', Conditions: [
      {Condition: 'LessThanEqual', Property: 'VideoBitDepth', Value: '8'},
      {Condition: 'LessThanEqual', Property: 'Width', Value: '3840'},
    ]},
  ],
  // Text subtitles show over the picture, from the file or a separate one; bitmap ones the server burns in.
  SubtitleProfiles: [
    ...['srt', 'subrip', 'ass', 'ssa', 'vtt', 'webvtt', 'mov_text'].map(Format => ({Format, Method: 'Embed'})),
    ...['srt', 'ass', 'ssa', 'vtt'].map(Format => ({Format, Method: 'External'})),
  ],
};

const TEXT_SUBTITLES = new Set(['srt', 'subrip', 'ass', 'ssa', 'vtt', 'webvtt', 'mov_text']);

/**
 * The subtitle tracks of a version the player can show: {label, track} with `track` the player's
 * track index (the file's own stream index, or an added file's), and the files to add.
 */
function subtitles(server, source, token) {
  const files = [], options = [];
  let preferred = -1;
  for (const stream of source.MediaStreams ?? []) {
    if (stream.Type !== 'Subtitle' || !TEXT_SUBTITLES.has((stream.Codec ?? '').toLowerCase())) continue;
    let track;
    if (stream.IsExternal || stream.DeliveryMethod === 'External') {
      if (!stream.DeliveryUrl) continue;
      const url = `${server}${stream.DeliveryUrl}`;
      files.push({uri: /[?&]api_key=/.test(url) ? url : `${url}${url.includes('?') ? '&' : '?'}api_key=${token}`,
        language: stream.Language ?? '', title: stream.DisplayTitle ?? ''});
      track = 1000 + files.length - 1;
    } else {
      track = stream.Index;
    }
    options.push({label: stream.DisplayTitle || stream.Language || `Track ${options.length + 1}`, track});
    if (stream.Index === source.DefaultSubtitleStreamIndex) preferred = track;
  }
  return {files, options, preferred};
}

function streamUrl(server, itemId, source, token) {
  const direct = source.SupportsDirectPlay || source.SupportsDirectStream;
  if (direct && source.DirectStreamUrl) {
    const url = `${server}${source.DirectStreamUrl}`;
    return /[?&]api_key=/.test(url) ? url : `${url}${url.includes('?') ? '&' : '?'}api_key=${token}`;
  }
  if (direct) {
    return `${server}/Videos/${itemId}/stream?static=true&mediaSourceId=${source.Id}&deviceId=${getDeviceId()}`
      + `&api_key=${token}${source.ETag ? `&Tag=${source.ETag}` : ''}`;
  }
  return source.TranscodingUrl ? `${server}${source.TranscodingUrl}` : null;
}

const CODECS = {h264: 'H.264', hevc: 'HEVC', vp9: 'VP9', av1: 'AV1', mpeg2video: 'MPEG-2', mpeg4: 'MPEG-4', vc1: 'VC-1'};

/** "2160p · HEVC 10-bit", from a version's video stream. */
function videoLabel(source) {
  const video = (source.MediaStreams ?? []).find(stream => stream.Type === 'Video');
  if (!video) return '';
  const codec = CODECS[(video.Codec ?? '').toLowerCase()] ?? (video.Codec ?? '').toUpperCase();
  return [video.Height && `${video.Height}p`, [codec, video.BitDepth > 8 && `${video.BitDepth}-bit`].filter(Boolean).join(' ')]
    .filter(Boolean).join(' · ');
}

function version(source) {
  return {
    id: source.Id, name: source.Name || source.Container || 'Version', named: !!source.Name && source.Name !== source.Container,
    video: videoLabel(source),
    gigabytes: source.Size ? source.Size / 1e9 : 0, megabits: source.Bitrate ? source.Bitrate / 1e6 : 0,
    direct: !!(source.SupportsDirectPlay || source.SupportsDirectStream),
  };
}

/**
 * Asks the server how to play `item` and picks the first version it can play: {url, itemId,
 * mediaSourceId, playSessionId, playMethod, startSeconds, versions, audio, subtitles}. `mediaSourceId`
 * picks a version; `maxBitrate` (bits per second) caps the stream, which makes the server transcode a
 * version above it.
 */
export async function startPlayback(item, {mediaSourceId, startSeconds, maxBitrate} = {}) {
  const session = getSession();
  const start = startSeconds ?? (item.played ? 0 : item.positionSeconds ?? 0);
  // A cap picked for this film wins over the one in Settings.
  const bitrate = Math.min(maxBitrate ?? getSettings().maxBitrate, DEVICE_PROFILE.MaxStreamingBitrate);
  const info = await api(`Items/${item.id}/PlaybackInfo`, {
    userId: session.userId, IsPlayback: true, AutoOpenLiveStream: true, MediaSourceId: mediaSourceId,
    StartTimeTicks: Math.round(start * TICKS_PER_SECOND),
  }, {method: 'POST', body: {DeviceProfile: {...DEVICE_PROFILE, MaxStreamingBitrate: bitrate}, MaxStreamingBitrate: bitrate}});
  if (info?.ErrorCode) throw new Error(info.ErrorCode === 'NoCompatibleStream'
    ? 'The server has no version of this the PS5 can play' : `The server refused to play this (${info.ErrorCode})`);
  const sources = info?.MediaSources ?? [];
  const source = sources.find(s => s.Id === mediaSourceId) ?? sources[0];
  const url = source && streamUrl(session.server, item.id, source, session.token);
  if (!url) throw new Error('The server offered no stream for this');
  return {
    url, itemId: item.id, mediaSourceId: source.Id, playSessionId: info.PlaySessionId,
    playMethod: source.SupportsDirectPlay ? 'DirectPlay' : source.SupportsDirectStream ? 'DirectStream' : 'Transcode',
    startSeconds: start, maxBitrate: maxBitrate ?? null,
    version: version(source),
    versions: sources.map(version),
    // The server's names for the audio streams, by stream index, for the player's tracks.
    audio: Object.fromEntries((source.MediaStreams ?? []).filter(stream => stream.Type === 'Audio')
      .map(stream => [stream.Index, stream.DisplayTitle ?? ''])),
    subtitles: subtitles(session.server, source, session.token),
  };
}

function report(path, playback, positionSeconds, extra = {}) {
  return api(path, undefined, {method: 'POST', body: {
    ItemId: playback.itemId, MediaSourceId: playback.mediaSourceId, PlaySessionId: playback.playSessionId,
    PlayMethod: playback.playMethod, CanSeek: true, PositionTicks: Math.round(positionSeconds * TICKS_PER_SECOND), ...extra,
  }}).catch(error => console.log(`playback: ${path} failed: ${error.message}`));
}

/** Tells the server playback started, so other clients and the dashboard see it. */
export const reportStart = (playback, positionSeconds) => report('Sessions/Playing', playback, positionSeconds);

/** The position every few seconds and on pause, so another device resumes where this one is. */
export const reportProgress = (playback, positionSeconds, paused) =>
  report('Sessions/Playing/Progress', playback, positionSeconds, {IsPaused: paused, EventName: paused ? 'Pause' : 'TimeUpdate'});

/** The last position: the server saves it as the resume point, or marks the item watched near the end. */
export async function reportStopped(playback, positionSeconds) {
  await report('Sessions/Playing/Stopped', playback, positionSeconds);
  invalidate('UserItems/Resume', 'Shows/NextUp', `Items/${playback.itemId}`, `Users/${getSession()?.userId}/Items/${playback.itemId}`);
}

/**
 * Where `item`'s intro, recap and credits are ({intro, recap, outro}, see markers.js): its media
 * segments, then its chapters for what those leave out. A server before 10.10 has no segments (404).
 */
export async function loadMarkers(item) {
  const segments = await api(`MediaSegments/${item.id}`, undefined, {background: true})
    .then(segmentMarkers, () => segmentMarkers(null));
  if (segments.intro && segments.outro) return segments;
  const detail = await api(`Items/${item.id}`, {userId: getSession().userId, Fields: 'Chapters'}, {background: true})
    .catch(() => null);
  return mergeMarkers(segments, chapterMarkers(detail?.Chapters));
}
