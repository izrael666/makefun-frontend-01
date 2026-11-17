// A make.fun frontend: the board of live bounties, a page for each, its
// leaderboard, an account's public profile, and the top accounts, on hash
// routes.
//
//   #/                              the board
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     its leaderboard
//   #/u/<handle>                    an account's public profile
//   #/rankings                      the top accounts
//
// window.__shotReady is false while a page loads and true once its data is
// on screen, so a screenshot script knows when to capture.

import { getBounties, getBounty, getLeaderboard, getProfile, getRankings } from './api.js';
import { board, bounty, errorView, leaderboard, notFound, profile, rankings } from './views.js';

const app = document.getElementById('app');

// What is on screen now, so a filter or a "show more" re-renders from the
// data already fetched instead of asking the API again.
const state = { kind: '', data: null, shown: 50, category: '' };

function routes() {
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { kind: 'board' };
  if (parts[0] === 'rankings' && parts.length === 1) return { kind: 'rankings' };
  if (parts[0] === 'bounty' && parts[1] && parts.length === 2) return { kind: 'bounty', slug: parts[1] };
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') return { kind: 'leaderboard', slug: parts[1] };
  if (parts[0] === 'u' && parts[1] && parts.length === 2) return { kind: 'profile', handle: parts[1] };
  return { kind: 'unknown' };
}

function setTitle(text) {
  document.title = text ? `${text} | make.fun` : 'make.fun bounties';
}

function wireImages() {
  // An account picture that does not load falls back to the initial letter.
  app.querySelectorAll('.avatar img').forEach((img) => {
    img.addEventListener('error', () => img.remove());
  });
}

async function render() {
  window.__shotReady = false;
  const route = routes();
  app.innerHTML = '<p class="loading">Loading…</p>';
  try {
    if (route.kind === 'board') {
      const data = await getBounties();
      state.kind = 'board';
      state.data = data;
      state.category = '';
      setTitle('');
      app.innerHTML = board(data, '');
    } else if (route.kind === 'bounty') {
      const b = await getBounty(route.slug);
      state.kind = 'bounty';
      state.data = b;
      setTitle(b.title);
      app.innerHTML = bounty(b);
    } else if (route.kind === 'leaderboard') {
      const data = await getLeaderboard(route.slug);
      state.kind = 'leaderboard';
      state.data = data;
      state.shown = 50;
      setTitle(`${data.competition?.title ?? route.slug} leaderboard`);
      app.innerHTML = leaderboard(data, 50);
    } else if (route.kind === 'profile') {
      const p = await getProfile(route.handle);
      state.kind = 'profile';
      state.data = p;
      setTitle(`@${p.handle}`);
      app.innerHTML = profile(p);
    } else if (route.kind === 'rankings') {
      const data = await getRankings();
      state.kind = 'rankings';
      state.data = data;
      setTitle('Top accounts');
      app.innerHTML = rankings(data);
    } else {
      state.kind = 'unknown';
      state.data = null;
      setTitle('Not found');
      app.innerHTML = notFound('That page does not exist here.');
    }
  } catch (err) {
    state.kind = 'error';
    state.data = null;
    setTitle('Something went wrong');
    app.innerHTML =
      err.status === 404
        ? notFound('make.fun has no such bounty or account.')
        : errorView(err.message || 'The make.fun API did not answer.');
  }
  wireImages();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'retry') {
    render();
  } else if (button.dataset.action === 'more' && state.kind === 'leaderboard') {
    state.shown = Number(button.dataset.shown) + 50;
    app.innerHTML = leaderboard(state.data, state.shown);
    wireImages();
  }
});

app.addEventListener('change', (event) => {
  const select = event.target.closest('[data-action="filter"]');
  if (!select || state.kind !== 'board') return;
  state.category = select.value;
  app.innerHTML = board(state.data, state.category);
  wireImages();
  const again = app.querySelector('#category');
  if (again) again.focus();
});

document.getElementById('profile-search').addEventListener('submit', (event) => {
  event.preventDefault();
  const handle = document.getElementById('handle').value.trim();
  if (handle) location.hash = `#/u/${encodeURIComponent(handle)}`;
});

window.addEventListener('hashchange', render);
render();
