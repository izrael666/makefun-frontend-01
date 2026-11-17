// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Answers are cached in memory and revalidated with ETag / If-None-Match:
// the API sends an ETag bound to the minute, so revisiting a view inside the
// same minute answers 304 and costs no bytes. When a conditional request
// cannot be made at all (a preflight the browser refuses), the call falls
// back to a plain GET instead of failing the view.

const API = 'https://make.fun/api';

const cache = new Map(); // url -> { etag, body }

async function get(path) {
  const url = API + path;
  const hit = cache.get(url);
  if (hit?.etag) {
    try {
      const res = await fetch(url, { headers: { 'If-None-Match': hit.etag } });
      if (res.status === 304) return hit.body;
      if (res.ok) {
        const body = await res.json();
        const etag = res.headers.get('etag');
        if (etag) cache.set(url, { etag, body });
        return body;
      }
    } catch {
      // A conditional request the browser will not make: fall through to a plain GET.
    }
  }
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`make.fun API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  const etag = res.headers.get('etag');
  if (etag) cache.set(url, { etag, body });
  return body;
}

/** The bounties: { items: [...] } (activity=times leaves out the activity a board does not show). */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: the top 10 full rows plus the rest in compact form. */
export const getLeaderboard = (slug) =>
  get(`/competitions/${encodeURIComponent(slug)}/leaderboard?rows=first`);

/** One account's public profile, by its handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** The top accounts, by prizes won. */
export const getRankings = () => get('/rankings?limit=50&order=paid');
