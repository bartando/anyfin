import {Http} from '@ps5-react/core';
import {getDeviceId, getSession, signOut} from './session.js';

const CLIENT = 'Anyfin';
const VERSION = '0.1.0';
const DEVICE = 'PlayStation 5';
const DEFAULT_PORT = 8096;
// The native queue holds eight unconsumed tasks in all; staying under it leaves room for anything
// else the app starts, and requests past this wait here instead of failing.
const MAX_ACTIVE = 4;
const CACHE_MAX = 200;
// Item lists come back several kilobytes per item; a page of a library stays far below this.
const MAX_BYTES = 4 * 1024 * 1024;
// The transport retries a failed connection for up to a minute or two, right for a flaky network but
// not for checking whether a typed address is a server at all.
const PROBE_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

function authorization(token) {
  const fields = `Client="${CLIENT}", Device="${DEVICE}", DeviceId="${getDeviceId()}", Version="${VERSION}"`;
  return `MediaBrowser ${fields}${token ? `, Token="${token}"` : ''}`;
}

// Background requests (an index nobody waits on) take a free slot only when no other request is
// waiting, and use at most one, so they never hold up what is on screen.
const waiting = [], waitingBackground = [];
let active = 0, activeBackground = 0;

function slot(background) {
  if (active < MAX_ACTIVE && !(background && (waiting.length || activeBackground))) {
    active++;
    if (background) activeBackground++;
    return Promise.resolve();
  }
  return new Promise(resolve => (background ? waitingBackground : waiting).push(resolve));
}

function release(background) {
  if (background) activeBackground--;
  const next = waiting.shift();
  if (next) return next();
  if (!activeBackground && waitingBackground.length) {
    activeBackground++;
    return waitingBackground.shift()();
  }
  active--;
}

export function query(params = {}) {
  const pairs = Object.entries(params).filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(Array.isArray(value) ? value.join(',') : value)}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

/**
 * One request to `server`: JSON in and out, null for an empty reply. Rejects with an ApiError on
 * transport failures and non-2xx statuses.
 */
export async function request(server, path, {params, method = 'GET', body, token, signal, background = false} = {}) {
  await slot(background);
  try {
    let response;
    try {
      response = await Http.request(`${server}/${path}${query(params)}`, {
        method, maxBytes: MAX_BYTES, signal,
        headers: {Authorization: authorization(token), Accept: 'application/json',
          ...(body !== undefined ? {'Content-Type': 'application/json'} : {})},
        ...(body !== undefined ? {body: JSON.stringify(body)} : {}),
      });
    } catch (error) {
      throw new ApiError(signal?.aborted ? `${server} did not answer` : `Could not reach ${server}: ${error.message}`);
    }
    if (!response.ok) throw new ApiError(`${method} ${path} failed with HTTP ${response.status}`, response.status);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } finally {
    release(background);
  }
}

const cache = new Map();

/**
 * A request as the signed-in user. GETs are cached as promises (a page opened twice, or two pages
 * asking for the same thing, cost one request) unless `fresh`. A 401 means the token was revoked
 * on the server: that signs out.
 */
export function api(path, params, {method = 'GET', body, fresh = false, background = false} = {}) {
  const session = getSession();
  if (!session) return Promise.reject(new ApiError('Not signed in'));
  const key = `${session.server}|${session.userId}|${path}${query(params)}`;
  if (method === 'GET' && !fresh) {
    const hit = cache.get(key);
    if (hit) {
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
  }
  const pending = request(session.server, path, {params, method, body, token: session.token, background}).catch(error => {
    if (error.status === 401 && getSession() === session) signOut();
    throw error;
  });
  if (method === 'GET') {
    pending.catch(() => cache.delete(key));
    cache.set(key, pending);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  }
  return pending;
}

/** Forgets cached replies whose path starts with one of `prefixes`, after user data changed. */
export function invalidate(...prefixes) {
  for (const key of [...cache.keys()]) {
    const path = key.slice(key.indexOf('|', key.indexOf('|') + 1) + 1);
    if (prefixes.some(prefix => path.startsWith(prefix))) cache.delete(key);
  }
}

export function clearCache() {
  cache.clear();
}

/**
 * "192.168.0.10" → "http://192.168.0.10:8096": the scheme defaults to http and a bare host to
 * Jellyfin's port. Returns null for something that cannot be an address.
 */
export function normalizeAddress(input) {
  let text = input.trim().replace(/\/+$/, '');
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = `http://${text}`;
  const match = /^(https?):\/\/([^/:]+)(:\d+)?(\/.*)?$/i.exec(text);
  if (!match) return null;
  const [, scheme, host, port, rest = ''] = match;
  const defaultPort = scheme.toLowerCase() === 'http' && !port ? `:${DEFAULT_PORT}` : '';
  return `${scheme.toLowerCase()}://${host.toLowerCase()}${port ?? defaultPort}${rest}`;
}

/** The `signal` Http.request takes, aborted after `ms`. */
function timeoutSignal(ms) {
  const listeners = new Set();
  const signal = {aborted: false, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn)};
  const id = setTimeout(() => {
    signal.aborted = true;
    for (const fn of listeners) fn();
  }, ms);
  return {signal, clear: () => clearTimeout(id)};
}

/** The server's public info, which also proves the address answers as Jellyfin. */
export async function probeServer(address) {
  const timeout = timeoutSignal(PROBE_TIMEOUT_MS);
  let info;
  try {
    info = await request(address, 'System/Info/Public', {signal: timeout.signal});
  } finally {
    timeout.clear();
  }
  if (!info?.Id) throw new ApiError(`${address} answered, but not as a Jellyfin server`);
  return {address, name: info.ServerName || 'Jellyfin', id: info.Id, version: info.Version};
}

/** An image URL without its size; `sized` adds that. */
export function imagePath(server, itemId, type, tag, index) {
  if (!itemId || !tag) return null;
  return `${server}/Items/${itemId}/Images/${type}${index != null ? `/${index}` : ''}?tag=${tag}&quality=90`;
}

export const sized = (path, width) => (path ? `${path}&maxWidth=${width}` : null);
