import {useSyncExternalStore} from 'react';
import {FileSystem} from '@react-on-anything/core';

// Who is signed in where, kept in the app's data folder so a restart goes straight to Home. The
// device id stays across sign-outs: Jellyfin lists sessions by it, and a new one per sign-in would
// leave a trail of dead devices on the server's dashboard.
const PATH = `${FileSystem.dataDir}/session.json`;

const listeners = new Set();
let state = load();

function randomId() {
  let id = '';
  for (let i = 0; i < 32; i++) id += Math.floor(Math.random() * 16).toString(16);
  return id;
}

function load() {
  let saved = {};
  try {
    if (FileSystem.exists(PATH)) saved = JSON.parse(FileSystem.readFile(PATH));
  } catch (error) {
    console.log(`session: could not read ${PATH}: ${error.message}`);
  }
  return {deviceId: saved.deviceId || randomId(), lastServer: saved.lastServer ?? null, session: saved.session ?? null};
}

function save() {
  try {
    FileSystem.writeFile(PATH, JSON.stringify(state));
  } catch (error) {
    console.log(`session: could not write ${PATH}: ${error.message}`);
  }
}

function set(next) {
  state = {...state, ...next};
  save();
  for (const listener of listeners) listener();
}

const subscribe = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** {server, serverName, serverId, userId, userName, userImage, token} or null. */
export const getSession = () => state.session;
export const getDeviceId = () => state.deviceId;
/** The server last connected to, {address, name}, to start the address field from. */
export const getLastServer = () => state.lastServer;

export function rememberServer(server) {
  set({lastServer: server});
}

export function signIn(session) {
  set({session, lastServer: {address: session.server, name: session.serverName}});
}

export function signOut() {
  set({session: null});
}

export const useSession = () => useSyncExternalStore(subscribe, () => state.session);
