// The surfaces, each a function from API data to HTML. No fetching here:
// main.js fetches (cached) and hands the data in.

import { date, day, esc, money, num, plural, shortAddr, timeLeft } from './format.js';
import { md } from './md.js';

const API_ORIGIN = 'https://make.fun';

/** Whether a bounty still takes entries: by its deadline, not its status alone. */
export const isLive = (b) => new Date(b.deadline).getTime() > Date.now();

const fee = (b) => (b.entryFeeUsd ? `${money(b.entryFeeUsd)} fee` : 'Free');
const pot = (b) => money(b.potUsd ?? b.rewardAmount);
const statusBadge = (b) =>
  isLive(b) && b.acceptingSubmissions !== false
    ? '<span class="status live">Live</span>'
    : '<span class="status ended">Ended</span>';

/* ---- Board: the live bounties ---- */

export function board(data, category) {
  const live = (data.items ?? [])
    .filter(isLive)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const categories = [...new Set(live.map((b) => b.category).filter(Boolean))].sort();
  const shown = category ? live.filter((b) => b.category === category) : live;
  const totalPot = shown.reduce((sum, b) => sum + Number(b.potUsd ?? b.rewardAmount ?? 0), 0);
  const cards = shown
    .map(
      (b) => `
      <li class="card">
        <div>${statusBadge(b)} <span class="chip">${esc(b.category ?? '')}</span></div>
        <h2><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h2>
        <div class="pot">${pot(b)}</div>
        <div class="meta">
          <span>${fee(b)}</span>
          <span><b>${timeLeft(b.deadline)}</b></span>
          <span>${plural(b.submissionCount ?? 0, 'entry', 'entries')}</span>
        </div>
        <div class="skills">${(b.skills ?? []).slice(0, 4).map(esc).join(' · ')}</div>
      </li>`,
    )
    .join('');
  return `
    <h1>Live bounties</h1>
    <p class="lede">${num(shown.length)} live ${shown.length === 1 ? 'bounty' : 'bounties'} · ${money(totalPot)} total pot · sorted by deadline, soonest first.</p>
    <div class="toolbar">
      <label for="category">Category</label>
      <select id="category" data-action="filter">
        <option value="">All categories</option>
        ${categories.map((c) => `<option value="${esc(c)}"${c === category ? ' selected' : ''}>${esc(c)}</option>`).join('')}
      </select>
    </div>
    ${shown.length ? `<ul class="grid">${cards}</ul>` : '<p>No live bounties in this category right now.</p>'}`;
}

/* ---- One bounty ---- */

function rewardsTable(b) {
  const rows = Array.isArray(b.rewardsNow) && b.rewardsNow.length
    ? b.rewardsNow.map((r) => [r.place, r.amountUsd])
    : Object.entries(b.rewards ?? {}).map(([place, usd]) => [Number(place), usd]);
  if (!rows.length) return '<p class="muted">No rewards published yet.</p>';
  rows.sort((a, b) => a[0] - b[0]);
  return `
    <div class="tablewrap"><table>
      <thead><tr><th>Place</th><th class="num">Reward</th></tr></thead>
      <tbody>
        ${rows.map(([place, usd]) => `<tr><td>${place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`}</td><td class="num">${money(usd)}</td></tr>`).join('')}
      </tbody>
    </table></div>`;
}

export function bounty(b) {
  return `
    <p><a href="#/">← All bounties</a></p>
    <h1>${esc(b.title)}</h1>
    <p>${statusBadge(b)} <span class="chip">${esc(b.category ?? '')}</span> ${(b.skills ?? []).slice(0, 5).map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</p>
    <p class="lede">${esc(b.summary ?? '')}</p>
    <dl class="facts">
      <div><dt>Live pot</dt><dd>${pot(b)}</dd></div>
      <div><dt>Entry fee</dt><dd>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</dd></div>
      <div><dt>Deadline</dt><dd class="small">${date(b.deadline)}<br><span class="muted">${timeLeft(b.deadline)}</span></dd></div>
      <div><dt>Entries</dt><dd>${num(b.submissionCount ?? 0)}</dd></div>
    </dl>
    <div class="actions">
      <a class="btn" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">View leaderboard</a>
      <a class="btn ghost" href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">Open on make.fun</a>
    </div>
    <h2>Rewards</h2>
    ${rewardsTable(b)}
    <h2>About this bounty</h2>
    <div class="md">${md(b.description ?? '')}</div>
    ${b.rules ? `<h2>Rules</h2><div class="md">${md(b.rules)}</div>` : ''}`;
}

/* ---- Leaderboard ---- */

const PAGE = 50;

export function leaderboard(data, shown = PAGE) {
  const cols = (data.columns ?? []).filter((c) => !c.hidden);
  const rankKey = data.rank_key;
  const full = (data.entries ?? []).map((e) => ({
    rank: e.rank,
    handle: e.handle,
    title: e.title,
    values: e.display ?? {},
  }));
  const rest = (data.rest ?? []).map((e) => ({
    rank: e.rank,
    handle: e.handle,
    title: e.title,
    values: { [rankKey]: e.display ?? String(e.value ?? '') },
  }));
  const rows = [...full, ...rest].sort((a, b) => a.rank - b.rank);
  const visible = rows.slice(0, shown);
  const remaining = rows.length - visible.length;
  const head = `<tr><th>#</th><th>Entrant</th><th>Entry</th>${cols.map((c) => `<th class="num">${esc(c.title)}</th>`).join('')}</tr>`;
  const body = visible
    .map(
      (r) => `<tr>
        <td class="rank">${num(r.rank)}</td>
        <td class="handle"><a href="#/u/${encodeURIComponent(r.handle)}">${esc(r.handle)}</a></td>
        <td>${esc(r.title ?? '')}</td>
        ${cols.map((c) => `<td class="num">${esc(r.values[c.key] ?? '—')}</td>`).join('')}
      </tr>`,
    )
    .join('');
  return `
    <p><a href="#/bounty/${encodeURIComponent(data.competition?.slug ?? '')}">← ${esc(data.competition?.title ?? 'Bounty')}</a></p>
    <h1>${esc(data.title ?? 'Leaderboard')}</h1>
    <p class="lede">${esc(data.phase?.title ?? '')} · ${data.phase?.scores_visible ? 'scores live' : 'scores not visible yet'}${data.phase?.ends_at ? ` · ends ${day(data.phase.ends_at)}` : ''}</p>
    ${data.metrics_withheld ? '<p class="muted small">Some metrics are withheld by make.fun.</p>' : ''}
    ${rows.length ? `
    <div class="tablewrap"><table>
      <thead>${head}</thead>
      <tbody>${body}</tbody>
    </table></div>
    <p class="muted small">Showing ${num(visible.length)} of ${num(rows.length)} ranked entries.</p>
    ${remaining > 0 ? `<p><button type="button" class="btn ghost" data-action="more" data-shown="${shown}">Show ${num(Math.min(PAGE, remaining))} more</button></p>` : ''}`
    : '<p>No scored entries yet.</p>'}`;
}

/* ---- Public profile ---- */

export function profile(p) {
  const rec = p.record ?? {};
  const initial = String(p.handle ?? '?').charAt(0).toUpperCase();
  const image = typeof p.image === 'string' && p.image.startsWith('/') ? `${API_ORIGIN}${p.image}` : null;
  const stats = [
    ['Entered', rec.competitions_entered],
    ['Placed', rec.competitions_placed],
    ['Won', rec.competitions_won],
    ['Podiums', rec.podium_finishes],
    ['Best place', rec.best_placement],
    ['Prizes', money(rec.prize_usd)],
  ];
  const entries = (p.solutions ?? [])
    .map(
      (s) => `<li>
        <div class="t">${esc(s.title ?? '')}</div>
        <div class="meta">
          <span><a href="#/bounty/${encodeURIComponent(s.competition?.slug ?? '')}">${esc(s.competition?.title ?? '')}</a></span>
          ${s.placement ? `<span>Placed #${num(s.placement)}</span>` : ''}
          ${s.prize_usd ? `<span>${money(s.prize_usd)} prize</span>` : ''}
          ${s.score?.display ? `<span>${esc(s.score.column?.title ?? 'Score')}: ${esc(s.score.display)}</span>` : ''}
          <span>${day(s.entered_at)}</span>
        </div>
      </li>`,
    )
    .join('');
  const payouts = (p.payouts ?? [])
    .map(
      (x) => `<tr>
        <td class="num">${money(x.amount_usd)}</td>
        <td>#${num(x.place)}</td>
        <td><a href="#/bounty/${encodeURIComponent(x.competition?.slug ?? '')}">${esc(x.competition?.title ?? '')}</a></td>
        <td>${day(x.paid_at)}</td>
      </tr>`,
    )
    .join('');
  const links = [];
  if (p.github_login) links.push(`<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub</a>`);
  if (typeof p.x === 'string' && p.x) links.push(`<a href="https://x.com/${encodeURIComponent(p.x)}">X</a>`);
  if (p.x?.url) links.push(`<a href="${esc(p.x.url)}">X</a>`);
  if (p.discord?.url) links.push(`<a href="${esc(p.discord.url)}">Discord</a>`);
  if (p.wallet?.address) {
    links.push(p.wallet.explorer_url
      ? `<a href="${esc(p.wallet.explorer_url)}">Wallet ${shortAddr(p.wallet.address)}</a>`
      : `<span>Wallet ${shortAddr(p.wallet.address)}</span>`);
  }
  return `
    <div class="profile-head">
      <div class="avatar" aria-hidden="true">${image ? `<img crossorigin="anonymous" src="${esc(image)}" alt="">` : ''}<span>${initial}</span></div>
      <div>
        <h1>@${esc(p.handle)}</h1>
        ${p.display_name ? `<p class="lede">${esc(p.display_name)}</p>` : ''}
        ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
        <p class="muted small">Joined ${day(p.joined_at)}${links.length ? ` · ${links.join(' · ')}` : ''}</p>
      </div>
    </div>
    <ul class="statgrid">
      ${stats.map(([k, v]) => `<li><div class="v">${v == null ? '—' : esc(String(v))}</div><div class="k">${k}</div></li>`).join('')}
    </ul>
    <h2>Entries</h2>
    ${entries ? `<ul class="entrylist">${entries}</ul>` : '<p class="muted">No entries yet.</p>'}
    <h2>Payouts</h2>
    ${payouts ? `<div class="tablewrap"><table>
      <thead><tr><th class="num">Amount</th><th>Place</th><th>Bounty</th><th>Paid</th></tr></thead>
      <tbody>${payouts}</tbody>
    </table></div>` : '<p class="muted">No payouts yet.</p>'}`;
}

/* ---- Rankings: top accounts by prizes ---- */

export function rankings(data) {
  const items = data.items ?? [];
  const rows = items
    .map(
      (a) => `<tr>
        <td class="rank">${num(a.rank)}</td>
        <td class="handle"><a href="#/u/${encodeURIComponent(a.handle)}">${esc(a.handle)}</a></td>
        <td class="num">${num(a.record?.competitions_entered)}</td>
        <td class="num">${num(a.record?.competitions_placed)}</td>
        <td class="num">${num(a.record?.competitions_won)}</td>
        <td class="num">${a.record?.best_placement == null ? '—' : `#${num(a.record.best_placement)}`}</td>
        <td class="num">${money(a.record?.prize_usd)}</td>
      </tr>`,
    )
    .join('');
  return `
    <h1>Top accounts</h1>
    <p class="lede">Ranked by prizes won · ${num(data.total ?? items.length)} accounts.</p>
    ${rows ? `<div class="tablewrap"><table>
      <thead><tr><th>#</th><th>Account</th><th class="num">Entered</th><th class="num">Placed</th><th class="num">Won</th><th class="num">Best</th><th class="num">Prizes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>` : '<p>No rankings yet.</p>'}`;
}

/* ---- Errors ---- */

export function notFound(message) {
  return `<div class="error"><h1>Not found</h1><p>${esc(message)}</p><p><a href="#/">Back to the live bounties</a></p></div>`;
}

export function errorView(message) {
  return `<div class="error"><h1>Something went wrong</h1><p>${esc(message)}</p>
    <p><button type="button" class="btn" data-action="retry">Try again</button> <a href="#/">Back to the bounties</a></p></div>`;
}
