import {useEffect, useState} from 'react';
import {FocusScope, ScrollView, Text, View, useFocus, useIsFocused} from '@ps5-react/core';
import {logOut} from '../lib/jellyfin/auth.js';
import {setSetting, useSettings} from '../lib/settings.js';
import {ActionRow, ChoiceRow, InfoRow, ToggleRow} from '../components/SettingRow.jsx';
import {UpscalingPanel} from './Upscaling.jsx';
import {keepPageActions} from '../lib/pageActions.js';

// `first`: where Right from the section's tab lands.
const SECTIONS = [
  {id: 'playback', label: 'Playback', first: 'set:bitrate'},
  {id: 'upscaling', label: 'Upscaling', first: settings => `upscaler:${settings.upscaler || 'off'}`},
  {id: 'subtitles', label: 'Subtitles & audio', first: 'set:subs'},
  {id: 'interface', label: 'Interface', first: 'set:clock'},
  {id: 'account', label: 'Account', first: 'set:signout'},
  {id: 'about', label: 'About'},
];

const MBPS = 1000000;
const BITRATES = [
  {value: 160 * MBPS, label: 'Original'},
  {value: 80 * MBPS, label: '80 Mbps'},
  {value: 40 * MBPS, label: '40 Mbps'},
  {value: 20 * MBPS, label: '20 Mbps'},
  {value: 10 * MBPS, label: '10 Mbps'},
  {value: 4 * MBPS, label: '4 Mbps'},
];
const SEEK_STEPS = [5, 10, 15, 30].map(s => ({value: s, label: `${s} s`}));
const DELAYS = [-0.3, -0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2, 0.3].map(s => ({
  value: s, label: s === 0 ? 'None' : `${s > 0 ? '+' : '−'}${Math.round(Math.abs(s) * 1000)} ms`,
}));

function SectionLabel({label, active}) {
  const focused = useIsFocused();
  return (
    <Text focused={focused} className={`font-semi text-md ${active ? 'text-white' : 'text-slate-400'} focused:text-canvas`}>
      {label}
    </Text>
  );
}

// Focusing a section shows it, as the top bar's tabs do; Right goes into it.
function SectionTab({section, active, onSelect, right}) {
  return (
    <View focusable focusKey={`settings:${section.id}`} onFocus={() => onSelect(section.id)} nextFocusRight={right}
      className={`h-[52px] px-5 justify-center rounded-full ${active ? 'bg-white/15' : ''} focused:bg-white`}>
      <SectionLabel label={section.label} active={active} />
    </View>
  );
}

function Heading({children}) {
  return <Text className="font-semi text-xs text-accent-soft tracking-widest pt-2">{children}</Text>;
}

function Playback({settings, left}) {
  return (
    <>
      <ChoiceRow focusKey="set:bitrate" label="Streaming quality" nextFocusLeft={left}
        about="Above this the server converts the film to a smaller stream."
        options={BITRATES} value={settings.maxBitrate} onChange={v => setSetting('maxBitrate', v)} />
      <ChoiceRow focusKey="set:seek" label="Skip with L2 and R2" nextFocusLeft={left}
        about="L1 and R1 always skip a minute."
        options={SEEK_STEPS} value={settings.seekStep} onChange={v => setSetting('seekStep', v)} />
    </>
  );
}

function Subtitles({settings, left}) {
  return (
    <>
      <Heading>SUBTITLES</Heading>
      <ChoiceRow focusKey="set:subs" label="When a film starts" nextFocusLeft={left}
        about="Triangle switches subtitles while it plays."
        options={[{value: 'default', label: 'Server default'}, {value: 'off', label: 'Off'}]}
        value={settings.subtitles} onChange={v => setSetting('subtitles', v)} />
      <ChoiceRow focusKey="set:subsize" label="Size" nextFocusLeft={left}
        options={[{value: 'small', label: 'Small'}, {value: 'medium', label: 'Medium'}, {value: 'large', label: 'Large'}]}
        value={settings.subtitleSize} onChange={v => setSetting('subtitleSize', v)} />
      <Heading>AUDIO</Heading>
      <ChoiceRow focusKey="set:delay" label="Sound delay" nextFocusLeft={left}
        about="Plays the sound later (or earlier) to match a TV that shows the picture late."
        options={DELAYS} value={settings.audioDelay} onChange={v => setSetting('audioDelay', v)} />
    </>
  );
}

function Interface({settings, left}) {
  return (
    <>
      <ChoiceRow focusKey="set:clock" label="Clock" nextFocusLeft={left}
        options={[{value: true, label: '24-hour'}, {value: false, label: '12-hour'}]}
        value={settings.clock24} onChange={v => setSetting('clock24', v)} />
      <ToggleRow focusKey="set:sounds" label="Interface sounds" nextFocusLeft={left}
        about="The taps when focus moves and buttons are pressed."
        value={settings.sounds} onChange={v => setSetting('sounds', v)} />
    </>
  );
}

function Account({session, left}) {
  return (
    <>
      <InfoRow label="Signed in as" value={session.userName} />
      <InfoRow label="Server" value={session.serverName} />
      <InfoRow label="Address" value={session.server} />
      <ActionRow focusKey="set:signout" label="Sign out" nextFocusLeft={left}
        about="Back to the sign-in screen. Settings stay on this console." onPress={logOut} />
    </>
  );
}

function About() {
  return (
    <>
      <InfoRow label="Anyfin" value="1.0" />
      <InfoRow label="Built with" value="PS5 React" />
      <Heading>UPSCALERS</Heading>
      <InfoRow label="ArtCNN" value="João Chrisóstomo · MIT" />
      <InfoRow label="Anime4K" value="bloc97 · MIT" />
    </>
  );
}

/**
 * Preferences in sections: the list on the left selects as it is focused, the section's settings are on
 * the right. They are saved as they change and apply to the next film (upscaling also to the one playing).
 */
export function SettingsPage({session, section: initial = 'playback', active = true, onClose}) {
  const [section, setSection] = useState(initial);
  const settings = useSettings();
  const {focus} = useFocus();
  useEffect(() => { focus(`settings:${initial}`); }, []);
  const left = `settings:${section}`;
  const shown = SECTIONS.find(s => s.id === section);
  return (
    <FocusScope trap={active} inert={!active} onBack={() => { onClose(); return true; }} onAction={keepPageActions}>
      <View className="w-screen h-screen bg-canvas">
        <View pointerEvents="none" className="absolute inset-0 bg-gradient-to-br from-accent/20 via-canvas to-canvas" />
        <View className="absolute left-12 top-[56px] gap-1">
          <Text className="font-semi text-xs text-accent-soft tracking-widest">SETTINGS</Text>
          <Text className="font-semi text-xl text-white">{shown.label}</Text>
        </View>
        <View className="absolute left-12 top-[168px] w-[260px] gap-2">
          {SECTIONS.map(s => (
            <SectionTab key={s.id} section={s} active={s.id === section} onSelect={setSection}
              right={typeof s.first === 'function' ? s.first(settings) : s.first} />
          ))}
        </View>
        {/* Up and Down stay in the section; Left and Circle go back to its tab. */}
        <FocusScope trap onBack={() => { focus(left); return true; }}>
        <ScrollView className="absolute left-[360px] right-12 top-[160px] bottom-0">
          <View className="gap-3 pt-2 pb-12">
            {section === 'playback' && <Playback settings={settings} left={left} />}
            {section === 'upscaling' && (
              <UpscalingPanel value={settings.upscaler} onChange={v => setSetting('upscaler', v)} nextFocusLeft={left} />
            )}
            {section === 'subtitles' && <Subtitles settings={settings} left={left} />}
            {section === 'interface' && <Interface settings={settings} left={left} />}
            {section === 'account' && <Account session={session} left={left} />}
            {section === 'about' && <About />}
          </View>
        </ScrollView>
        </FocusScope>
      </View>
    </FocusScope>
  );
}
