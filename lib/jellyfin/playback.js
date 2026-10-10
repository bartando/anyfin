import {api, invalidate} from './api.js';
import {getDeviceId, getSession} from './session.js';

const TICKS_PER_SECOND = 10000000;

// What the PS5 player takes as it is: the hardware decodes H.264 up to High, HEVC Main and Main 10 and
// VP9 profile 0 up to 4K; FFmpeg decodes the rest of these up to 1080p. Anything else the server
// transcodes to H.264 and AAC over HLS.
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
      {Condition: 'LessThanEqual', Property: 'Width', Value: '3840'},
    ]},
    {Type: 'Video', Codec: 'hevc', Conditions: [
      {Condition: 'EqualsAny', Property: 'VideoProfile', Value: 'main|main 10'},
      {Condition: 'LessThanEqual', Property: 'Width', Value: '3840'},
    ]},
    {Type: 'Video', Codec: 'vp9', Conditions: [
      {Condition: 'LessThanEqual', Property: 'VideoBitDepth', Value: '8'},
      {Condition: 'LessThanEqual', Property: 'Width', Value: '3840'},
    ]},
  ],
  SubtitleProfiles: [
    {Format: 'srt', Method: 'External'}, {Format: 'ass', Method: 'External'}, {Format: 'vtt', Method: 'External'},
  ],
};

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

/**
 * Asks the server how to play `item` and picks the first version it can play: {url, itemId,
 * mediaSourceId, playSessionId, playMethod, startSeconds, versions}. `mediaSourceId` picks a version.
 */
export async function startPlayback(item, {mediaSourceId, startSeconds} = {}) {
  const session = getSession();
  const start = startSeconds ?? (item.played ? 0 : item.positionSeconds ?? 0);
  const info = await api(`Items/${item.id}/PlaybackInfo`, {
    userId: session.userId, IsPlayback: true, AutoOpenLiveStream: true, MediaSourceId: mediaSourceId,
    StartTimeTicks: Math.round(start * TICKS_PER_SECOND),
  }, {method: 'POST', body: {DeviceProfile: DEVICE_PROFILE, MaxStreamingBitrate: DEVICE_PROFILE.MaxStreamingBitrate}});
  if (info?.ErrorCode) throw new Error(info.ErrorCode === 'NoCompatibleStream'
    ? 'The server has no version of this the PS5 can play' : `The server refused to play this (${info.ErrorCode})`);
  const sources = info?.MediaSources ?? [];
  const source = sources.find(s => s.Id === mediaSourceId) ?? sources[0];
  const url = source && streamUrl(session.server, item.id, source, session.token);
  if (!url) throw new Error('The server offered no stream for this');
  return {
    url, itemId: item.id, mediaSourceId: source.Id, playSessionId: info.PlaySessionId,
    playMethod: source.SupportsDirectPlay ? 'DirectPlay' : source.SupportsDirectStream ? 'DirectStream' : 'Transcode',
    startSeconds: start,
    versions: sources.map(s => ({id: s.Id, name: s.Name || s.Container || 'Version'})),
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
