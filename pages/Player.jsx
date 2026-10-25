import {useCallback, useEffect, useRef, useState} from 'react';
import {FocusScope, Text, View, Video, motion, transitions, useFocus, useNavigationEvents} from '@ps5-react/core';
import {loadEpisodeAfter} from '../lib/jellyfin/library.js';
import {loadMarkers, reportProgress, reportStart, reportStopped, startPlayback} from '../lib/jellyfin/playback.js';
import {skippable} from '../lib/jellyfin/markers.js';
import {autoplayFor, rememberAutoplay, rememberUpscaler, upscalerFor} from '../lib/playerPrefs.js';
import {getSettings, useSettings} from '../lib/settings.js';
import {progressChanged} from '../lib/progress.js';
import {PlayerHeader} from '../components/player/PlayerHeader.jsx';
import {PlayerTitle} from '../components/player/PlayerTitle.jsx';
import {Scrubber} from '../components/player/Scrubber.jsx';
import {OptionsPanel} from '../components/player/OptionsPanel.jsx';
import {SkipPrompt} from '../components/player/SkipPrompt.jsx';
import {UpNext} from '../components/player/UpNext.jsx';
import {CompareOverlay, cycleUpscaler, pictureSpan} from '../components/player/Compare.jsx';
import {remote} from '../lib/remote.js';
import {optionTabs, subtitleOptions} from '../components/player/options.js';
import {usePadButton} from '../components/player/usePadButton.js';
import {useTriggerSeek} from '../components/player/useTriggerSeek.js';
import {useUpNext} from '../components/player/useUpNext.js';
import {PauseIcon} from '../components/Icons.jsx';

// The controls fade out this long after the last input while the film plays.
const CONTROLS_MS = 4000;
const PROGRESS_REPORT_MS = 10000;
// Left/Right on the bar collect into one seek, made this long after the last press. Held, the
// steps grow: presses closer together than STREAK_MS count as one streak.
const SEEK_SETTLE_MS = 650;
const STREAK_MS = 450;
const seekStep = streak => (streak < 4 ? 10 : streak < 12 ? 30 : 60);
// Left/Right move the compare line this share of the picture, more once held.
const splitStep = streak => (streak < 3 ? 0.01 : streak < 10 ? 0.025 : 0.05);
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
 * Audio & Subtitles and Next Episode. The options panel (Square or Options) has the tracks, the version
 * and quality, the upscaler, autoplay and what is playing. L1/R1 jump a minute; L2/R2 tapped jump the
 * step from Settings and held scrub (useTriggerSeek). Triangle cycles the subtitles, except from a TV
 * remote, whose Menu key it is: there it opens the panel. During an intro or recap the touchpad skips
 * it; over the credits of an episode the next one is offered and, with autoplay, starts. Circle first
 * puts that offer away, then brings the hidden controls back, then leaves. The position goes to the
 * server as it plays, so Continue Watching and other devices pick up where this one stopped.
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
  const [markers, setMarkers] = useState(null);
  const [panel, setPanel] = useState(null);
  const [pending, setPending] = useState(null);
  const [rate, setRate] = useState(0);
  const [seriesAutoplay, setSeriesAutoplay] = useState(() => autoplayFor(item));
  // Upscalers side by side: {left, right, split, activity}; null when not comparing.
  const [compare, setCompare] = useState(null);
  const comparing = useRef(false);
  comparing.current = !!compare;
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

  useEffect(() => {
    let live = true;
    loadMarkers(item).then(found => live && setMarkers(found), () => {});
    return () => { live = false; };
  }, [item.id]);

  // Started, progress while playing, stopped on the way out (or to another stream) with the last position.
  useEffect(() => {
    if (!playback) return undefined;
    reportStart(playback, playback.startSeconds);
    return () => { reportStopped(playback, position.current).then(progressChanged); };
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
  const offered = useRef(false);
  useEffect(() => {
    if (paused || error || panel || pending != null || compare) return undefined;
    const id = setInterval(() => {
      if (!visible.current || Date.now() < hideAt.current) return;
      visible.current = false;
      setShown(false);
      focus(offered.current ? 'player-upnext' : 'player-bar');
    }, 500);
    return () => clearInterval(id);
  }, [paused, error, panel, pending, !!compare]);

  const seekTo = target => {
    const end = status.duration || Infinity;
    const clamped = Math.max(0, Math.min(target, end - 1));
    position.current = clamped;
    seekingTo.current = {target: clamped, at: Date.now()};
    setStatus(s => ({...s, position: clamped}));
    video.current?.seek(clamped);
  };

  // Left/Right on the bar and the triggers move one target, sought once they settle on it.
  const scrub = useRef({target: null, streak: 0, last: 0, timer: 0});
  const moveTarget = seconds => {
    const s = scrub.current, end = status.duration || Infinity;
    s.target = Math.max(0, Math.min((s.target ?? position.current) + seconds, end - 1));
    setPending(s.target);
  };
  const settle = () => {
    const s = scrub.current;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      seekTo(s.target);
      s.target = null;
      setPending(null);
    }, SEEK_SETTLE_MS);
  };
  const nudge = direction => {
    const s = scrub.current, now = Date.now();
    s.streak = now - s.last < STREAK_MS ? s.streak + 1 : 0;
    s.last = now;
    moveTarget(direction * seekStep(s.streak));
    settle();
  };
  useEffect(() => () => clearTimeout(scrub.current.timer), []);
  useTriggerSeek({
    enabled: active && !!playback && !panel, feedback: settings.triggerFeedback,
    onTap: direction => {
      moveTarget(direction * settings.seekStep);
      settle();
    },
    onScrub: (seconds, speed) => {
      clearTimeout(scrub.current.timer);
      moveTarget(seconds);
      setRate(speed);
      wake();
    },
    onRelease: () => {
      setRate(0);
      settle();
    },
  });

  const slide = useRef({streak: 0, last: 0});
  const changeCompare = change => setCompare(was => was && {...was, ...change(was), activity: was.activity + 1});
  const moveSplit = direction => {
    const s = slide.current, now = Date.now();
    s.streak = now - s.last < STREAK_MS ? s.streak + 1 : 0;
    s.last = now;
    changeCompare(was => ({split: Math.max(0, Math.min(1, was.split + direction * splitStep(s.streak)))}));
  };

  useNavigationEvents(event => {
    if (!active) return;
    const sideways = event.type === 'blocked' && (event.direction === 'left' || event.direction === 'right');
    if (sideways && focused.current === 'player-compare') moveSplit(event.direction === 'left' ? -1 : 1);
    else if (sideways && !panel && focused.current === 'player-bar') nudge(event.direction === 'left' ? -1 : 1);
    else if (comparing.current) changeCompare(() => ({}));
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
    if (wasOpen.current && !panel) focus(comparing.current ? 'player-compare' : 'player-options');
    wasOpen.current = !!panel;
  }, [panel]);

  // From the panel, the film as it was (a still, as the panel paused it): the model playing on the
  // left, Off or ArtCNN on the right. Leaving keeps the left one; Square keeps the right one.
  const startCompare = () => {
    setCompare({left: upscale, right: upscale ? '' : 'artcnn', split: 0.5, activity: 0});
    setPanel(null);
  };
  const endCompare = keep => {
    setCompare(null);
    if (keep !== upscale) pick.upscale(keep);
    focus('player-bar');
  };

  const chooseSubtitles = track => {
    subtitleChosen.current = true;
    setSubtitleTrack(track);
  };
  const subtitleOrder = playback ? subtitleOptions(playback, video.current?.getStatus()).map(option => option.id) : [-1];
  const restart = change => setRequest(was => ({...was, ...change, startSeconds: position.current}));
  const autoplay = seriesAutoplay ?? settings.autoplay;
  const pick = {
    audio: index => video.current?.selectAudioTrack(index),
    subtitles: chooseSubtitles,
    version: id => id !== playback?.mediaSourceId && restart({mediaSourceId: id}),
    quality: bits => bits !== (playback?.maxBitrate ?? 0) && restart({maxBitrate: bits || undefined}),
    upscale: model => {
      setUpscale(model);
      rememberUpscaler(item, model);
    },
    compare: startCompare,
    autoplay: id => {
      const on = id === 'default' ? undefined : id === 'on';
      setSeriesAutoplay(on);
      rememberAutoplay(item, on);
    },
  };

  // The intro or recap playing now, skipped to its end by the touchpad or its button.
  const skip = !panel && !error ? skippable(markers, status.position) : null;
  const skipNow = () => {
    if (skip) seekTo(skip.end);
  };
  usePadButton('touchpad', active && !!skip, skipNow);
  useEffect(() => {
    if (!skip && focused.current === 'player-skip') focus('player-bar');
  }, [!!skip]);

  const upNext = useUpNext({next, onNext, onClose, position: status.position, duration: status.duration,
    outro: markers?.outro, autoplay, holding: paused || pending != null || !!panel});
  const offering = upNext.offering && !panel && !error;
  // The card takes focus as it comes up, so X plays the next episode; it gives it back as it goes.
  useEffect(() => {
    if (offering && !offered.current) focus('player-upnext');
    else if (!offering && offered.current && focused.current === 'player-upnext') focus('player-bar');
    offered.current = offering;
  }, [offering]);

  const onAction = action => {
    if (compare) {
      if (action === 'l1') changeCompare(was => ({left: cycleUpscaler(was.left, 1)}));
      else if (action === 'r1') changeCompare(was => ({right: cycleUpscaler(was.right, 1)}));
      else if (action === 'triangle') changeCompare(was => ({left: was.right, right: was.left}));
      else if (action === 'square') endCompare(compare.right);
      // The triggers seek (useTriggerSeek); Options would open Settings over the comparison.
      else if (!['l2', 'r2', 'options'].includes(action)) return false;
      return true;
    }
    if (action === 'l1') seekTo(position.current - 60);
    else if (action === 'r1') seekTo(position.current + 60);
    else if (action === 'l2' || action === 'r2') { /* useTriggerSeek takes the triggers from controller events */ }
    // A TV remote's Menu key comes as Triangle, and opens the panel rather than cycling subtitles.
    else if (action === 'options' || (remote && action === 'triangle')) (panel ? closePanel() : openPanel());
    else if (action === 'triangle') chooseSubtitles(subtitleOrder[(subtitleOrder.indexOf(subtitleTrack) + 1) % subtitleOrder.length]);
    else if (action === 'square') openPanel();
    else return false;
    return true;
  };
  const onBack = () => {
    if (compare) {
      endCompare(compare.left);
    } else if (offering) {
      upNext.dismiss();
      focus('player-bar');
    } else if (!visible.current) wake();
    else onClose();
    return true;
  };

  const waiting = !error && (!playback || status.state === 'loading' || status.state === 'buffering');
  const controls = !compare && (shown || paused || !!error || !!panel);
  const live = video.current?.getStatus();

  return (
    <FocusScope trap={active} inert={!active} onBack={onBack} onAction={onAction}>
      <View className="w-screen h-screen bg-black">
        {playback && (
          <Video key={playback.url} ref={video} source={playback.url} paused={paused} startTime={playback.startSeconds}
            upscale={(compare ? compare.left : upscale) || false}
            compare={compare ? {upscale: compare.right || false, split: compare.split} : undefined} audioDelay={settings.audioDelay} subtitles={playback.subtitles.files} subtitleTrack={subtitleTrack}
            onSubtitle={setSubtitle} className="absolute inset-0" onProgress={onProgress}
            onStatus={s => setStatus(was => ({...was, state: s.state}))}
            onEnd={upNext.finish} onError={({error: failed}) => setError(failed)} />
        )}
        {!!subtitle && !error && (
          <View className={`absolute left-0 right-0 items-center ${controls ? 'bottom-[316px]' : 'bottom-[56px]'}`}>
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
        {paused && !panel && !compare && !waiting && !error && (
          <View className="absolute inset-0 items-center justify-center">
            <View className="w-[96px] h-[96px] rounded-full bg-black/45 items-center justify-center">
              <PauseIcon size={40} color="#ffffff" />
            </View>
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
          <PlayerHeader onBack={onClose} onOptions={() => openPanel()}
            onNext={next && onNext ? () => onNext(next) : null} />
        </motion.View>
        <motion.View className="absolute left-0 right-0 bottom-0 px-12 pb-9 pt-32 bg-gradient-to-t from-black/90 via-black/55 to-transparent"
          animate={{opacity: controls ? 1 : 0}} transition={transitions.panel}>
          <PlayerTitle item={item} position={status.position} duration={status.duration} dim={pending != null} />
          <Scrubber position={status.position} duration={status.duration} buffered={status.buffered}
            pending={pending} rate={rate} onPress={togglePause} />
        </motion.View>
        {compare && (
          <CompareOverlay left={compare.left} right={compare.right} split={compare.split} span={pictureSpan(live)}
            paused={paused} activity={compare.activity} onPress={togglePause} />
        )}
        {(skip || offering) && !compare && (
          <View className={`absolute right-12 ${controls ? 'bottom-[316px]' : 'bottom-[48px]'}`}>
            {offering ? <UpNext next={next} seconds={upNext.seconds} onPlay={upNext.play} />
              : <SkipPrompt kind={skip.kind} onPress={skipNow} />}
          </View>
        )}
        {panel && playback && (
          <>
            <View className="absolute inset-0 bg-black/50" />
            <OptionsPanel tab={panel} onTab={setPanel} onClose={closePanel}
              tabs={optionTabs({playback, status: live, subtitleTrack, upscale, pick,
                autoplay: item.kind === 'episode' ? {series: seriesAutoplay} : null})} />
          </>
        )}
      </View>
    </FocusScope>
  );
}
