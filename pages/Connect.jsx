import {useCallback, useEffect, useRef, useState} from 'react';
import {FocusScope, Text, View, useFocus, useIsFocused} from '@ps5-react/core';
import {getLastServer, rememberServer} from '../lib/jellyfin/session.js';
import {normalizeAddress, probeServer} from '../lib/jellyfin/api.js';
import {discoverServers} from '../lib/jellyfin/discovery.js';
import {loadPublicUsers, quickConnect, quickConnectEnabled, signInWithPassword} from '../lib/jellyfin/auth.js';
import {Button} from '../components/Button.jsx';
import {Keyboard, TextField, useTextInput} from '../components/Keyboard.jsx';
import {PersonBubble} from '../components/People.jsx';
import {BackIcon, LockIcon, ServerIcon} from '../components/Icons.jsx';

function Wordmark() {
  return (
    <View className="absolute left-12 top-0 h-[80px] justify-center">
      <Text className="font-semi text-xl text-white">Any<Text className="font-semi text-xl text-accent">fin</Text></Text>
    </View>
  );
}

function Status({text, error}) {
  return text ? <Text className={`font-inter text-sm ${error ? 'text-[#ff8a8a]' : 'text-slate-400'}`}>{text}</Text> : null;
}

/** The right-hand column: what this step is for. */
function Intro({eyebrow, title, children}) {
  return (
    <View className="absolute left-[480px] top-[120px] w-[680px] gap-3">
      <Text className="font-semi text-xs text-accent-soft tracking-widest">{eyebrow}</Text>
      <Text className="font-semi text-xl text-white">{title}</Text>
      {children}
    </View>
  );
}

/** A keyboard step: the field and keys on the left, the submit button under them. R2 submits too. */
function KeyboardStep({input, layout, placeholder, masked, submitLabel, onSubmit, status, error}) {
  return (
    <View className="absolute left-12 top-[96px] w-[342px] gap-4">
      <TextField text={input.text} cursor={input.cursor} placeholder={placeholder} masked={masked} icon={false} />
      <Keyboard input={input} layout={layout} onSubmit={onSubmit} />
      <View className="flex-row items-center gap-3">
        <Button focusKey="submit" label={submitLabel} primary onPress={onSubmit} />
        <Text className="font-inter text-xs text-slate-400">or R2</Text>
      </View>
      <Status text={status} error={error} />
    </View>
  );
}

// While the address step shows, the network is asked again this often (a server may still be starting).
const SCAN_EVERY_MS = 8000;

function ServerText({server}) {
  const focused = useIsFocused();
  return (
    <View className="gap-[2px]">
      <Text focused={focused} className="font-semi text-md text-white focused:text-canvas">{server.name}</Text>
      <Text focused={focused} className="font-inter text-xs text-slate-400 focused:text-canvas">
        {server.address.replace(/^http:\/\//, '')} · Jellyfin {server.version}
      </Text>
    </View>
  );
}

function ServerIconSlot() {
  return <ServerIcon size={22} color={useIsFocused() ? '#0b0b12' : '#a9a0ff'} />;
}

/** A server found on the network; pressing it connects. */
function ServerTile({server, index, onPress}) {
  return (
    <View focusKey={`server:${index}`} onPress={() => onPress(server)}
      className="h-[64px] px-5 flex-row items-center gap-4 rounded-xl bg-white/10 border border-white/15
        focused:bg-white focused:border-white">
      <ServerIconSlot />
      <ServerText server={server} />
    </View>
  );
}

/** Jellyfin servers that answer discovery, asked again every SCAN_EVERY_MS; null before the first answer. */
function useDiscoveredServers() {
  const [servers, setServers] = useState(null);
  useEffect(() => {
    let live = true, timer = null;
    const scan = () => discoverServers().then(found => live && setServers(found), error => {
      console.log(`discovery: ${error.message}`);
      if (live) setServers(previous => previous ?? []);
    }).finally(() => { if (live) timer = setTimeout(scan, SCAN_EVERY_MS); });
    scan();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, []);
  return servers;
}

function ServerStep({onServer}) {
  const last = getLastServer();
  const initial = last?.address?.replace(/^http:\/\//, '') ?? '';
  const input = useTextInput(initial, 64);
  const [state, setState] = useState({busy: false, error: null});
  const servers = useDiscoveredServers();
  const {focus} = useFocus();
  const offered = useRef(false);
  // The first servers found take focus, unless the address is already being typed.
  useEffect(() => {
    if (offered.current || !servers?.length) return;
    offered.current = true;
    if (input.text === initial) focus('server:0');
  }, [servers]);
  const choose = useCallback(server => {
    rememberServer({address: server.address, name: server.name});
    onServer(server);
  }, []);
  const connect = useCallback(() => {
    const address = normalizeAddress(input.text);
    if (!address) {
      setState({busy: false, error: 'Type the server address, for example 192.168.0.10'});
      return;
    }
    setState({busy: true, error: null});
    probeServer(address).then(server => {
      rememberServer({address: server.address, name: server.name});
      onServer(server);
    }, error => setState({busy: false, error: error.message}));
  }, [input.text]);
  return (
    <>
      <KeyboardStep input={input} layout="address" placeholder="192.168.0.10:8096" submitLabel="Connect"
        onSubmit={connect} status={state.busy ? 'Connecting…' : state.error} error={!!state.error} />
      <Intro eyebrow="SIGN IN" title="Connect to your Jellyfin server">
        <Text className="font-semi text-xs text-slate-400 tracking-widest pt-2">ON YOUR NETWORK</Text>
        {servers?.length ? (
          <View className="flex-row flex-wrap gap-3">
            {servers.map((server, index) => <ServerTile key={server.id} server={server} index={index} onPress={choose} />)}
          </View>
        ) : (
          <Text className="font-inter text-sm text-slate-400">
            {servers ? 'No server answered. It needs UDP port 7359 open and auto discovery on in Jellyfin\'s networking settings.'
              : 'Looking for servers…'}
          </Text>
        )}
        <Text className="font-inter text-md text-slate-300 pt-4">
          Not listed? Type the address you open Jellyfin at in a browser. Without a port, Anyfin uses 8096; without http or https, http.
        </Text>
        <View className="flex-row items-center gap-3 pt-2">
          <ServerIcon size={20} color="#a9a0ff" />
          <Text className="font-inter text-sm text-slate-400">
            {last ? `Last used: ${last.name} at ${last.address}` : 'The address is kept for next time.'}
          </Text>
        </View>
      </Intro>
    </>
  );
}

function UsersStep({server, onUser, onManual, onQuickConnect, onBack}) {
  const [state, setState] = useState({users: null, quick: false, error: null});
  const {focus} = useFocus();
  useEffect(() => {
    let live = true;
    Promise.all([loadPublicUsers(server), quickConnectEnabled(server)]).then(
      ([users, quick]) => live && setState({users, quick, error: null}),
      error => live && setState({users: [], quick: false, error}));
    return () => { live = false; };
  }, [server.address]);
  useEffect(() => {
    if (state.users) focus(state.users.length ? 'user:0' : 'manual');
  }, [state.users]);
  return (
    <View className="absolute left-12 right-12 top-[120px] gap-8">
      <View className="gap-2">
        <Text className="font-semi text-xs text-accent-soft tracking-widest">{server.name.toUpperCase()} · JELLYFIN {server.version}</Text>
        <Text className="font-semi text-xl text-white">Who's watching?</Text>
        <Status text={!state.users ? 'Loading users…' : state.error?.message} error={!!state.error} />
      </View>
      {state.users?.length > 0 && (
        <View className="flex-row flex-wrap gap-6">
          {state.users.map((user, index) => (
            <View key={user.id} className="items-center">
              <PersonBubble person={{...user, character: user.hasPassword ? '' : 'No password'}}
                focusKey={`user:${index}`} onPress={() => onUser(user)} />
            </View>
          ))}
        </View>
      )}
      <View className="flex-row gap-4">
        <Button focusKey="manual" label="Other User" icon={LockIcon} onPress={onManual} />
        {state.quick && <Button label="Quick Connect" onPress={onQuickConnect} />}
        <Button label="Change Server" icon={BackIcon} onPress={onBack} />
      </View>
    </View>
  );
}

function PasswordStep({server, user, onBack}) {
  const input = useTextInput('', 64);
  const [state, setState] = useState({busy: false, error: null});
  const submit = useCallback(() => {
    setState({busy: true, error: null});
    signInWithPassword(server, user.name, input.text).catch(error => setState({busy: false,
      error: error.status === 401 ? 'Wrong password' : error.message}));
  }, [input.text]);
  return (
    <>
      <KeyboardStep input={input} layout="text" placeholder="Password" masked submitLabel="Sign In" onSubmit={submit}
        status={state.busy ? 'Signing in…' : state.error} error={!!state.error} />
      <Intro eyebrow={server.name.toUpperCase()} title={`Sign in as ${user.name}`}>
        <Text className="font-inter text-md text-slate-300">
          Shift switches between lower case, upper case and symbols. Leave it empty if the account has no password.
        </Text>
        <View className="flex-row pt-2"><Button label="Back" icon={BackIcon} onPress={onBack} /></View>
      </Intro>
    </>
  );
}

function UsernameStep({server, onUser, onBack}) {
  const input = useTextInput('', 64);
  const submit = useCallback(() => {
    if (input.text.trim()) onUser({name: input.text.trim(), hasPassword: true});
  }, [input.text]);
  return (
    <>
      <KeyboardStep input={input} layout="text" placeholder="Username" submitLabel="Next" onSubmit={submit} />
      <Intro eyebrow={server.name.toUpperCase()} title="Sign in with a username">
        <Text className="font-inter text-md text-slate-300">For accounts the server does not list on its sign-in screen.</Text>
        <View className="flex-row pt-2"><Button label="Back" icon={BackIcon} onPress={onBack} /></View>
      </Intro>
    </>
  );
}

function QuickConnectStep({server, onBack}) {
  const [state, setState] = useState({code: null, error: null});
  const {focus} = useFocus();
  useEffect(() => {
    let session = null;
    let live = true;
    quickConnect(server).then(started => {
      session = started;
      if (!live) return started.stop();
      setState({code: started.code, error: null});
      return started.wait().catch(error => live && setState(previous => ({...previous, error})));
    }, error => live && setState({code: null, error}));
    focus('quick-back');
    return () => {
      live = false;
      session?.stop();
    };
  }, [server.address]);
  return (
    <View className="absolute left-12 right-12 top-[120px] gap-6">
      <View className="gap-2">
        <Text className="font-semi text-xs text-accent-soft tracking-widest">QUICK CONNECT · {server.name.toUpperCase()}</Text>
        <Text className="font-semi text-xl text-white">Enter this code on a signed-in device</Text>
        <Text className="font-inter text-md text-slate-300">
          In Jellyfin on your phone or in a browser: your profile, then Quick Connect. This screen signs in by itself.
        </Text>
      </View>
      <View className="flex-row gap-3">
        {(state.code ?? '······').split('').map((digit, index) => (
          <View key={index} className="w-[72px] h-[88px] rounded-2xl bg-white/10 border border-white/20 items-center justify-center">
            <Text className="font-semi text-xl text-white">{state.code ? digit : ''}</Text>
          </View>
        ))}
      </View>
      <Status text={state.error ? state.error.message : state.code ? 'Waiting for approval…' : 'Asking the server for a code…'}
        error={!!state.error} />
      <View className="flex-row"><Button focusKey="quick-back" label="Back" icon={BackIcon} onPress={onBack} /></View>
    </View>
  );
}

/**
 * Sign-in: the server address, then who is watching, then a password or Quick Connect. Signing in
 * stores the session, which swaps this screen for the app. The last server is tried straight away.
 */
export function ConnectPage() {
  const [step, setStep] = useState({name: 'server'});
  const {focus} = useFocus();
  const tried = useRef(false);
  useEffect(() => {
    const last = getLastServer();
    if (tried.current || !last) return;
    tried.current = true;
    probeServer(last.address).then(server => setStep(current => current.name === 'server' ? {name: 'users', server} : current),
      () => {});
  }, []);
  useEffect(() => {
    if (step.name === 'server' || step.name === 'password' || step.name === 'username') focus('key:A');
  }, [step]);

  const toServer = () => setStep({name: 'server'});
  const toUsers = server => setStep({name: 'users', server});
  const toPassword = (server, user) => setStep({name: 'password', server, user});
  const onBack = () => {
    if (step.name === 'server') return false;
    if (step.name === 'users') toServer();
    else toUsers(step.server);
    return true;
  };

  let body;
  if (step.name === 'server') body = <ServerStep onServer={toUsers} />;
  else if (step.name === 'users') {
    body = (
      <UsersStep server={step.server} onBack={toServer} onManual={() => setStep({name: 'username', server: step.server})}
        onQuickConnect={() => setStep({name: 'quick', server: step.server})}
        onUser={user => {
          // An account without a password signs in at once.
          if (user.hasPassword) toPassword(step.server, user);
          else signInWithPassword(step.server, user.name, '').catch(() => toPassword(step.server, user));
        }} />
    );
  } else if (step.name === 'username') {
    body = <UsernameStep server={step.server} onUser={user => toPassword(step.server, user)} onBack={() => toUsers(step.server)} />;
  } else if (step.name === 'password') {
    body = <PasswordStep server={step.server} user={step.user} onBack={() => toUsers(step.server)} />;
  } else {
    body = <QuickConnectStep server={step.server} onBack={() => toUsers(step.server)} />;
  }

  return (
    <FocusScope onBack={onBack} onAction={() => false}>
      <View className="w-screen h-screen bg-canvas">
        <View pointerEvents="none" className="absolute inset-0 bg-gradient-to-br from-accent/20 via-canvas to-canvas" />
        <Wordmark />
        <View key={step.name} className="absolute inset-0">{body}</View>
      </View>
    </FocusScope>
  );
}
