import {useCallback, useEffect, useRef, useState} from 'react';
import {FocusScope, Text, View, Video, motion, transitions, useFocus, useNavigationEvents} from '@ps5-react/core';
import {px} from '../theme.js';
import {clean} from '../lib/format.js';
import {episodeCode} from '../lib/jellyfin/items.js';
import {reportProgress, reportStart, reportStopped, startPlayback} from '../lib/jellyfin/playback.js';
import {Button} from '../components/Button.jsx';
import {BackIcon, PlayIcon} from '../components/Icons.jsx';

// The controls fade out this long after the last input while the film plays.
const CONTROLS_MS = 4000;
const PROGRESS_REPORT_MS = 10000;

function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600), m = String(Math.floor(s / 60) % 60), rest = String(s % 60).padStart(2, '0');
  return h ? `${h}:${m.padStart(2, '0')}:${rest}` : `${m}:${rest}`;
}

const PauseIcon = ({size = 18, color = '#0b0b12'}) => (
  <View style={{width: px(size), height: px(size), flexDirection: 'row', justifyContent: 'space-between',
    paddingLeft: px(size * 0.18), paddingRight: px(size * 0.18)}}>
    <View style={{width: px(size * 0.22), height: px(size), backgroundColor: color, borderRadius: px(1)}} />
    <View style={{width: px(size * 0.22), height: px(size), backgroundColor: color, borderRadius: px(1)}} />
  </View>
);

function title(item) {
  if (item.kind !== 'episode') return clean(item.title);
  return [item.seriesTitle, episodeCode(item), item.title].filter(Boolean).map(clean).join(' · ');
}

/**
 * The film, full screen, with the controls over it: X pauses, the buttons seek, L1/R1 jump a minute,
 * Square changes the audio track, Triangle the subtitles, Circle leaves. The position goes to the server as it plays, so
 * Continue Watching and other devices pick up where this one stopped.
 */
export function PlayerPage({item, active = true, onClose}) {
  const video = useRef(null);
  const [playback, setPlayback] = useState(null);
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState({position: 0, duration: (item.runtime ?? 0) * 60, buffered: 0, state: 'loading'});
  const [tracks, setTracks] = useState([]);
  const [shown, setShown] = useState(true);
  const [subtitle, setSubtitle] = useState('');
  const [subtitleTrack, setSubtitleTrack] = useState(-1);
  const hideAt = useRef(0);
  const {focus} = useFocus();
  useEffect(() => { focus('player-play'); }, []);
  const position = useRef(0);
  const reported = useRef(0);

  useEffect(() => {
    let live = true;
    startPlayback(item).then(found => {
      if (!live) return;
      setPlayback(found);
      setSubtitleTrack(found.subtitles.preferred);
    }, failed => live && setError(failed.message));
    return () => { live = false; };
  }, [item.id]);

  // Started, progress while playing, stopped on the way out with the last position.
  useEffect(() => {
    if (!playback) return undefined;
    reportStart(playback, playback.startSeconds);
    return () => { reportStopped(playback, position.current); };
  }, [playback]);

  const wake = useCallback(() => {
    hideAt.current = Date.now() + CONTROLS_MS;
    setShown(true);
  }, []);
  useNavigationEvents(() => { if (active) wake(); });
  useEffect(() => {
    if (paused || error) return undefined;
    const id = setInterval(() => { if (Date.now() >= hideAt.current) setShown(false); }, 500);
    return () => clearInterval(id);
  }, [paused, error]);
  useEffect(wake, [paused]);

  const onProgress = useCallback(({currentTime, playableDuration, seekableDuration}) => {
    position.current = currentTime;
    setStatus(s => ({...s, position: currentTime, buffered: playableDuration, duration: seekableDuration || s.duration}));
    if (playback && Date.now() - reported.current >= PROGRESS_REPORT_MS) {
      reported.current = Date.now();
      reportProgress(playback, currentTime, false);
    }
  }, [playback]);

  const seekBy = seconds => {
    const target = Math.max(0, Math.min(position.current + seconds, (status.duration || Infinity) - 1));
    position.current = target;
    setStatus(s => ({...s, position: target}));
    video.current?.seek(target);
  };
  const togglePause = () => setPaused(was => {
    if (playback) reportProgress(playback, position.current, !was);
    return !was;
  });
  const nextTrack = () => {
    const current = video.current?.getStatus();
    if (!current?.audioTracks?.length) return;
    const at = current.audioTracks.findIndex(track => track.index === current.audioTrack);
    video.current.selectAudioTrack(current.audioTracks[(at + 1) % current.audioTracks.length].index);
  };
  const subtitleOptions = playback?.subtitles.options ?? [];
  const nextSubtitles = () => {
    const order = [-1, ...subtitleOptions.map(option => option.track)];
    setSubtitleTrack(current => order[(order.indexOf(current) + 1) % order.length]);
  };
  const subtitleLabel = subtitleOptions.find(option => option.track === subtitleTrack)?.label;
  const onAction = action => {
    if (action === 'l1') seekBy(-60);
    else if (action === 'r1') seekBy(60);
    else if (action === 'l2') seekBy(-10);
    else if (action === 'r2') seekBy(10);
    else if (action === 'square') nextTrack();
    else if (action === 'triangle') nextSubtitles();
    else return false;
    return true;
  };

  const status_ = video.current?.getStatus();
  const track = status_?.audioTracks?.find(t => t.index === status_.audioTrack);
  const fraction = status.duration > 0 ? Math.min(1, status.position / status.duration) : 0;
  const bufferedFraction = status.duration > 0 ? Math.min(1, status.buffered / status.duration) : 0;
  const waiting = !error && (!playback || status.state === 'loading' || status.state === 'buffering');

  return (
    <FocusScope trap={active} inert={!active} autoFocus onBack={() => { onClose(); return true; }} onAction={onAction}>
      <View className="w-screen h-screen bg-black">
        {playback && (
          <Video ref={video} source={playback.url} paused={paused} startTime={playback.startSeconds}
            subtitles={playback.subtitles.files} subtitleTrack={subtitleTrack} onSubtitle={setSubtitle}
            className="absolute inset-0" onProgress={onProgress}
            onLoad={({audioTracks}) => setTracks(audioTracks)}
            onStatus={s => setStatus(was => ({...was, state: s.state}))}
            onEnd={onClose} onError={({error: failed}) => setError(failed)} />
        )}
        {!!subtitle && !error && (
          <View className={`absolute left-0 right-0 items-center ${shown || paused ? 'bottom-[200px]' : 'bottom-[56px]'}`}>
            <View className="px-5 py-2 rounded-xl bg-black/55 items-center">
              {subtitle.split('\n').map((line, index) => (
                <Text key={index} className="font-semi text-lg text-white">{line}</Text>
              ))}
            </View>
          </View>
        )}
        {waiting && (
          <View className="absolute inset-0 items-center justify-center">
            <Text className="font-semi text-lg text-white/80">{status.state === 'buffering' ? 'Buffering…' : 'Loading…'}</Text>
          </View>
        )}
        {error && (
          <View className="absolute inset-0 items-center justify-center gap-4">
            <Text className="font-semi text-xl text-white">Can't play this</Text>
            <Text className="font-inter text-md text-slate-300">{error}</Text>
          </View>
        )}
        <motion.View className="absolute left-0 right-0 bottom-0 px-12 pb-10 pt-24 gap-4
          bg-gradient-to-t from-black/90 via-black/60 to-transparent"
          animate={{opacity: shown || paused || error ? 1 : 0}} transition={transitions.panel}>
          <Text className="font-semi text-xl text-white">{title(item)}</Text>
          <View className="flex-row items-center gap-4">
            <Text className="font-inter text-sm text-white w-[80px]">{clock(status.position)}</Text>
            <View className="flex-1 h-[6px] rounded-full bg-white/20">
              <View className="absolute left-0 top-0 h-[6px] rounded-full bg-white/30" style={{width: `${bufferedFraction * 100}%`}} />
              <View className="absolute left-0 top-0 h-[6px] rounded-full bg-accent" style={{width: `${fraction * 100}%`}} />
            </View>
            <Text className="font-inter text-sm text-white w-[80px] text-right">{clock(status.duration)}</Text>
          </View>
          <View className="flex-row items-center gap-4">
            <Button label="Back" icon={BackIcon} onPress={onClose} />
            <Button label="–10 s" onPress={() => seekBy(-10)} />
            <Button label={paused ? 'Play' : 'Pause'} icon={paused ? PlayIcon : PauseIcon} primary focusKey="player-play"
              onPress={togglePause} />
            <Button label="+30 s" onPress={() => seekBy(30)} />
            {tracks.length > 1 && <Button label={`Audio: ${track ? (track.language || track.codec) : '—'}`} onPress={nextTrack} />}
            {subtitleOptions.length > 0 && (
              <Button label={`Subtitles: ${subtitleLabel ?? 'Off'}`} onPress={nextSubtitles} />
            )}
            <Text className="font-inter text-sm text-slate-300">L1/R1 one minute · L2/R2 ten seconds</Text>
          </View>
        </motion.View>
      </View>
    </FocusScope>
  );
}
