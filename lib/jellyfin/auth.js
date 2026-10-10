import {getSession, signIn, signOut} from './session.js';
import {clearCache, request} from './api.js';

const userImage = (server, user) => (user.PrimaryImageTag
  ? `${server}/UserImage?userId=${user.Id}&tag=${user.PrimaryImageTag}&quality=90` : null);

/** The users a server lists on its sign-in screen (hidden users are not among them). */
export async function loadPublicUsers(server) {
  const users = await request(server.address, 'Users/Public');
  return (users ?? []).map(user => ({id: user.Id, name: user.Name, hasPassword: !!user.HasPassword,
    profile: userImage(server.address, user)}));
}

export async function quickConnectEnabled(server) {
  try {
    return (await request(server.address, 'QuickConnect/Enabled')) === true;
  } catch {
    return false;
  }
}

function start(server, result) {
  clearCache();
  signIn({server: server.address, serverName: server.name, serverId: server.id,
    userId: result.User.Id, userName: result.User.Name, userImage: userImage(server.address, result.User),
    token: result.AccessToken});
}

export async function signInWithPassword(server, username, password) {
  const result = await request(server.address, 'Users/AuthenticateByName', {method: 'POST',
    body: {Username: username, Pw: password}});
  start(server, result);
}

/** Starts Quick Connect: {code} to show, and `wait()`, which resolves once the code is approved. */
export async function quickConnect(server) {
  const {Code: code, Secret: secret} = await request(server.address, 'QuickConnect/Initiate', {method: 'POST'});
  let stopped = false;
  const wait = async (intervalMs = 3000) => {
    while (!stopped) {
      const state = await request(server.address, 'QuickConnect/Connect', {params: {Secret: secret}});
      if (state?.Authenticated) {
        const result = await request(server.address, 'Users/AuthenticateWithQuickConnect', {method: 'POST',
          body: {Secret: secret}});
        if (!stopped) start(server, result);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  };
  return {code, wait, stop: () => { stopped = true; }};
}

/** Ends the session on the server too (best effort: a dead server must not keep anyone signed in). */
export function logOut() {
  const session = getSession();
  if (session) request(session.server, 'Sessions/Logout', {method: 'POST', token: session.token}).catch(() => {});
  clearCache();
  signOut();
}
