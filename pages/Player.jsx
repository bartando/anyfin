import {useCallback, useEffect, useRef, useState} from 'react';
import {FocusScope, Text, View, Video, motion, transitions, useFocus, useNavigationEvents} from '@ps5-react/core';
import {loadEpisodeAfter} from '../lib/jellyfin/library.js';
import {reportProgress, reportStart, reportStopped, startPlayback} from '../lib/jellyfin/playback.js';
import {rememberUpscaler, upscalerFor} from '../lib/playerPrefs.js';
import {getSettings, useSettings} from '../lib/settings.js';
import {PlayerHeader} from '../components/player/PlayerHeader.jsx';
import {Scrubber} from '../components/player/Scrubber.jsx';
import {OptionsPanel} from '../components/player/OptionsPanel.jsx';
import {optionTabs} from '../components/player/options.js';

// The controls fade out this long after the last input while the film plays.
const CONTROLS_MS = 4000;
const PROGRESS_REPORT_MS = 10000;
// Left/Right on the bar collect into one seek, made this long after the last press. Held, the
// steps grow: presses closer together than STREAK_MS count as one streak.
const SEEK_SETTLE_MS = 650;
const STREAK_MS = 450;
const seekStep = streak => (streak < 4 ? 10 : streak < 12 ? 30 : 60);
// After a seek the player keeps reporting the old position for a moment, even past its seek event:
// the bar holds the target until a reading near it arrives, or for SEEK_LAND_MS when a keyframe
// lands the seek short of it.
const SEEK_LAND_MS = 2500;

// Class names are compiled at build time, so each size is its own element.
function SubtitleLine({size, children}) {
  if (size === 'small') return <Text className="font-semi text-md text-white">{children}</Text>;
  if (size === 'large') return <Text className="font-semi text-xl text-white">{children}</Text>;
  return <Text className="font-semi text-lg text-white">{children}</Text>;
}

/**
 * The film, full screen. The bar is where focus rests: Left and Right seek, X pauses, Up reaches Back,
 * Audio & Subtitles and Next Episode. The options panel (Square) has the tracks, the version
 * and quality, the upscaler and what is playing. L1/R1 jump a minute, L2/R2 the step from Settings,
 * Triangle cycles the subtitles. Circle first brings the hidden controls back, then leaves. The position
 * goes to the server as it plays, so Continue Watching and other devices pick up where this one stopped.
 */
export function PlayerPage({item, active = true, onClose, onNext}) {
  const video = useRef(null);
  const {focus, focusedKey} = useFocus();
  const settings = useSettings();
  const focused = useRef(focusedKey);
  focused.current = focusedKey;

  const [request, setRequest] = useState({});
  const [playback, setPlayback] = useState(null);
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState({position: 0, duration: (item.runtime ?? 0) * 60, buffered: 0, state: 'loading'});
  const [subtitle, setSubtitle] = useState('');
  const [subtitleTrack, setSubtitleTrack] = useState(-1);
  const subtitleChosen = useRef(false);
  const [upscale, setUpscale] = useState(() => upscalerFor(item));
  const [next, setNext] = useState(null);
  const [panel, setPanel] = useState(null);
  const [pending, setPending] = useState(null);
  const position = useRef(0);
  const seekingTo = useRef(null);
  const reported = useRef(0);

  useEffect(() => { focus('player-bar'); }, []);

  // A new request (another version or quality) reopens the stream where it was.
  useEffect(() => {
    let live = true;
    setPlayback(null);
    setError(null);
    startPlayback(item, request).then(found => {
      if (!live) return;
      setPlayback(found);
      if (!subtitleChosen.current) setSubtitleTrack(getSettings().subtitles === 'off' ? -1 : found.subtitles.preferred);
    }, failed => live && setError(failed.message));
    return () => { live = false; };
  }, [item.id, request]);

  useEffect(() => {
    if (item.kind !== 'episode') return undefined;
    let live = true;
    loadEpisodeAfter(item).then(found => live && setNext(found), () => {});
    return () => { live = false; };
  }, [item.id]);

  // Started, progress while playing, stopped on the way out (or to another stream) with the last position.
  useEffect(() => {
    if (!playback) return undefined;
    reportStart(playback, playback.startSeconds);
    return () => { reportStopped(playback, position.current); };
  }, [playback]);

  // Controls: shown on any input, hidden a while after the last while the film plays.
  const [shown, setShown] = useState(true);
  const visible = useRef(true);
  const hideAt = useRef(0);
  const wake = useCallback(() => {
    hideAt.current = Date.now() + CONTROLS_MS;
    visible.current = true;
    setShown(true);
  }, []);
  useEffect(wake, [paused]);
  useEffect(() => {
    if (paused || error || panel || pending != null) return undefined;
    const id = setInterval(() => {
      if (!visible.current || Date.now() < hideAt.current) return;
      visible.current = false;
      setShown(false);
      focus('player-bar');
    }, 500);
    return () => clearInterval(id);
  }, [paused, error, panel, pending]);

  const seekTo = target => {
    const end = status.duration || Infinity;
    const clamped = Math.max(0, Math.min(target, end - 1));
    position.current = clamped;
    seekingTo.current = {target: clamped, at: Date.now()};
    setStatus(s => ({...s, position: clamped}));
    video.current?.seek(clamped);
  };

  // Left/Right on the bar: one seek per streak of presses, to where they added up.
  const scrub = useRef({target: null, streak: 0, last: 0, timer: 0});
  const nudge = direction => {
    const s = scrub.current, now = Date.now();
    s.streak = now - s.last < STREAK_MS ? s.streak + 1 : 0;
    s.last = now;
    const end = status.duration || Infinity;
    s.target = Math.max(0, Math.min((s.target ?? position.current) + direction * seekStep(s.streak), end - 1));
    setPending(s.target);
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      seekTo(s.target);
      s.target = null;
      setPending(null);
    }, SEEK_SETTLE_MS);
  };
  useEffect(() => () => clearTimeout(scrub.current.timer), []);

  useNavigationEvents(event => {
    if (!active) return;
    if (event.type === 'blocked' && !panel && focused.current === 'player-bar' &&
        (event.direction === 'left' || event.direction === 'right')) nudge(event.direction === 'left' ? -1 : 1);
    wake();
  });

  const onProgress = useCallback(({currentTime, playableDuration, seekableDuration}) => {
    const seek = seekingTo.current;
    if (seek && Math.abs(currentTime - seek.target) > 2 && Date.now() - seek.at < SEEK_LAND_MS) return;
    seekingTo.current = null;
    position.current = currentTime;
    setStatus(s => ({...s, position: currentTime, buffered: playableDuration, duration: seekableDuration || s.duration}));
    if (playback && Date.now() - reported.current >= PROGRESS_REPORT_MS) {
      reported.current = Date.now();
      reportProgress(playback, currentTime, false);
    }
  }, [playback]);

  const togglePause = () => setPaused(was => {
    if (playback) reportProgress(playback, position.current, !was);
    return !was;
  });

  // The panel pauses the film and gives it back as it was.
  const pausedBefore = useRef(false);
  const openPanel = (tab = 'tracks') => {
    if (!playback || panel) return;
    pausedBefore.current = paused;
    setPaused(true);
    setPanel(tab);
  };
  const closePanel = () => {
    setPanel(null);
    setPaused(pausedBefore.current);
  };
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !panel) focus('player-options');
    wasOpen.current = !!panel;
  }, [panel]);

  const chooseSubtitles = track => {
    subtitleChosen.current = true;
    setSubtitleTrack(track);
  };
  const subtitleOrder = [-1, ...(playback?.subtitles.options ?? []).map(option => option.track)];
  const restart = change => setRequest(was => ({...was, ...change, startSeconds: position.current}));
  const pick = {
    audio: index => video.current?.selectAudioTrack(index),
    subtitles: chooseSubtitles,
    version: id => id !== playback?.mediaSourceId && restart({mediaSourceId: id}),
    quality: bits => bits !== (playback?.maxBitrate ?? 0) && restart({maxBitrate: bits || undefined}),
    upscale: model => {
      setUpscale(model);
      rememberUpscaler(item, model);
    },
  };

  const onAction = action => {
    if (action === 'l1') seekTo(position.current - 60);
    else if (action === 'r1') seekTo(position.current + 60);
    else if (action === 'l2') seekTo(position.current - settings.seekStep);
    else if (action === 'r2') seekTo(position.current + settings.seekStep);
    else if (action === 'triangle') chooseSubtitles(subtitleOrder[(subtitleOrder.indexOf(subtitleTrack) + 1) % subtitleOrder.length]);
    else if (action === 'square') openPanel();
    else return false;
    return true;
  };
  const onBack = () => {
    if (!visible.current) wake();
    else onClose();
    return true;
  };
  const onEnd = () => (next && onNext ? onNext(next) : onClose());

  const waiting = !error && (!playback || status.state === 'loading' || status.state === 'buffering');
  const controls = shown || paused || !!error || !!panel;
  const live = video.current?.getStatus();

  return (
    <FocusScope trap={active} inert={!active} onBack={onBack} onAction={onAction}>
      <View className="w-screen h-screen bg-black">
        {playback && (
          <Video key={playback.url} ref={video} source={playback.url} paused={paused} startTime={playback.startSeconds}
            upscale={upscale || false} audioDelay={settings.audioDelay} subtitles={playback.subtitles.files} subtitleTrack={subtitleTrack}
            onSubtitle={setSubtitle} className="absolute inset-0" onProgress={onProgress}
            onStatus={s => setStatus(was => ({...was, state: s.state}))}
            onEnd={onEnd} onError={({error: failed}) => setError(failed)} />
        )}
        {!!subtitle && !error && (
          <View className={`absolute left-0 right-0 items-center ${controls ? 'bottom-[150px]' : 'bottom-[56px]'}`}>
            <View className="px-5 py-2 rounded-xl bg-black/55 items-center">
              {subtitle.split('\n').map((line, index) => (
                <SubtitleLine key={index} size={settings.subtitleSize}>{line}</SubtitleLine>
              ))}
            </View>
          </View>
        )}
        {waiting && (
          <View className={`absolute left-0 top-0 bottom-0 items-center justify-center ${panel ? 'right-[620px]' : 'right-0'}`}>
            <Text className="font-semi text-lg text-white/80">{status.state === 'buffering' ? 'Buffering…' : 'Loading…'}</Text>
          </View>
        )}
        {error && (
          <View className="absolute inset-0 items-center justify-center gap-4">
            <Text className="font-semi text-xl text-white">Can't play this</Text>
            <Text className="font-inter text-md text-slate-300">{error}</Text>
          </View>
        )}
        <motion.View className="absolute left-0 right-0 top-0 px-12 pt-10 pb-24 bg-gradient-to-b from-black/80 to-transparent"
          animate={{opacity: controls ? 1 : 0}} transition={transitions.panel}>
          <PlayerHeader item={item} onBack={onClose} onOptions={() => openPanel()}
            onNext={next && onNext ? () => onNext(next) : null} />
        </motion.View>
        <motion.View className="absolute left-0 right-0 bottom-0 px-12 pb-9 pt-24 bg-gradient-to-t from-black/85 via-black/50 to-transparent"
          animate={{opacity: controls ? 1 : 0}} transition={transitions.panel}>
          <Scrubber position={status.position} duration={status.duration} buffered={status.buffered} paused={paused}
            pending={pending} onPress={togglePause} />
        </motion.View>
        {panel && playback && (
          <>
            <View className="absolute inset-0 bg-black/50" />
            <OptionsPanel tab={panel} onTab={setPanel} onClose={closePanel}
              tabs={optionTabs({playback, status: live, subtitleTrack, upscale, pick})} />
          </>
        )}
      </View>
    </FocusScope>
  );
}
