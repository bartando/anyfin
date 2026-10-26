import {LocalNetwork} from '@react-on-anything/core';
import {normalizeAddress, probeServer} from './api.js';

// Jellyfin answers this on UDP 7359 with {Address, Id, Name}.
const PORT = 7359;
const QUESTION = 'who is JellyfinServer?';
const LISTEN_MS = 1500;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

const hostOf = address => /^https?:\/\/(\[[^\]]*\]|[^/:?#]+)/i.exec(address)?.[1] ?? null;

/**
 * The address a reply announces. One only the server itself can reach (localhost) becomes the
 * sender's, on the announced port. Any other IP must be the sender's: otherwise anyone on the
 * network could point the console at any address. A host name (a published URL) cannot be checked
 * here; it still has to answer as Jellyfin below.
 */
function addressOf(reply) {
  let claimed;
  try {
    claimed = JSON.parse(reply.text);
  } catch {
    return null;
  }
  const address = typeof claimed?.Address === 'string' ? normalizeAddress(claimed.Address) : null;
  const host = address && hostOf(address);
  if (!host || host.startsWith('[')) return null;
  if (host === 'localhost' || host.startsWith('127.')) {
    const port = /:(\d+)/.exec(address.replace(/^\w+:\/\//, ''))?.[1] ?? '8096';
    return `http://${reply.address}:${port}`;
  }
  return IPV4.test(host) && host !== reply.address ? null : address;
}

/**
 * The Jellyfin servers on the local network that answer as Jellyfin at the address they announce
 * (one in Docker can announce its container's, where signing in would only time out).
 */
export async function discoverServers() {
  const replies = await LocalNetwork.broadcast({port: PORT, message: QUESTION, timeoutMs: LISTEN_MS});
  const addresses = [...new Set(replies.map(addressOf).filter(Boolean))];
  const servers = await Promise.all(addresses.map(address => probeServer(address).catch(() => null)));
  const seen = new Set();
  return servers.filter(server => server && !seen.has(server.id) && seen.add(server.id));
}
