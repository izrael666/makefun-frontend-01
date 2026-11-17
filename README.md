[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/izrael666/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/izrael666/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# makefun-frontend-01 — Build the best make.fun frontend

A fully working, read-only web client for make.fun, made of static files with no build step. It reads live data from make.fun's public API alone (no sign-in, no writes, no script, stylesheet, module, or font from any origin but make.fun's) and shows four surfaces, each reachable by a link and by its own URL:

- **Bounty board** (`#/`): live bounties with reward, live pot, entry fee, and time left, sorted by deadline, soonest first.
- **Bounty page** (`#/bounty/<slug>`): a bounty's rules, rewards, deadline, and entries.
- **Leaderboard** (`#/bounty/<slug>/leaderboard`): a bounty's live results.
- **Account profile** (`#/account/<name>`): an account's public profile, reachable from the search box and from leaderboard entrants.

## What the program does

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json`, the summary the judge reads, with the vendored make.fun library. It first checks that `app/index.html` exists and that `screenshots/` holds exactly the 3 images the gate expects, and fails with a clear error if either is missing.

## How to run

Serve the app locally, then open it in a browser:

```sh
node serve.ts
```

Then open http://localhost:8080.

To build the entry's output the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The output is `out/` with `app/`, `screenshots/` (3 JPEGs of the running app on live data), and `dossier.json`.
