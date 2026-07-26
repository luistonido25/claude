# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A static website: **"GHL 30-Day Intensive"** — a 30-day, day-by-day GoHighLevel training program (4–8 hrs/day) that takes a complete beginner to job-ready, with 13 portfolio projects. Week 4 covers GHL + n8n integration; Days 28–30 cover portfolio packaging and job hunting.

## Commands

There is **no build step and no test suite**. Plain HTML/CSS/JS; the only dependency (`@netlify/blobs`) is used by the serverless function and installed by Netlify at deploy time.

- Preview locally: `python3 -m http.server 8000` from the repo root, then open `http://localhost:8000`. The progress API is not available locally — the frontend falls back to local-only storage (by design).
- Deploy: pushes to `claude/claude-md-docs-jziuo2` auto-deploy two ways: (1) Netlify (primary, ghl-30-day-intensive.netlify.app) via linked repo — this includes the functions; (2) GitHub Pages via `.github/workflows/deploy-pages.yml`, which mirrors the branch to `gh-pages` (static only, no API — the site runs in local-only mode there).

## Structure

The site is multi-track: GHL 30-Day (original, at `index.html` + `day-XX.html`), Make.com 14-Day (`make.html` + `make-day-XX.html`), and the Portfolio Lab challenge library (`challenges.html`); n8n and Zapier tabs are "soon" placeholders. Every page carries a `<nav class="track-nav">` tab bar.

- `index.html` — GHL track hub: program overview, profile bar, week-by-week day cards, portfolio tracker, "Before Day 1" setup checklist. `<body data-page="index">` (no `data-track` = GHL, legacy keys).
- `make.html` — Make track hub, same mechanics. `<body data-page="index" data-track="make" data-total-days="14">`.
- `day-01.html` … `day-30.html` / `make-day-01.html` … `make-day-14.html` — one page per training day. `<body data-day="N">` plus `data-track="make"` on Make pages (N without leading zero; filenames use two digits). Each has a `<section id="daily-quiz">` placeholder rendered by app.js. Task IDs are globally unique across tracks: `dNN-tMM` (GHL), `mNN-tMM` (Make), portfolio `pf-*` / `mpf-*`.
- `styles.css` — all styling. Week color coding via `week-1` … `week-5` classes; light/dark via `prefers-color-scheme`.
- `app.js` — progress engine: named profiles, localStorage persistence, cloud sync, quiz rendering. No frameworks.
- `quizzes.js` / `make-quizzes.js` — `window.GHL30_QUIZZES` / `window.MAKE_QUIZZES = {dayNumber: [{q, options[4], correct, explain}]}`, 5 questions per day. app.js picks the registry by `data-track`.
- `challenges.html` + `challenges.js` — Portfolio Lab: `window.PORTFOLIO_CHALLENGES` is an array of 18 client-brief objects (`id` c01–c18, `stack` "make"|"ghl"|"ghl+n8n", `brief[]`, `guide[]` of `{step, tool, detail}` with `**bold**` node names rendered by `md()` in app.js, `dataModel[]`, `edgeCases[]`, `acceptance[]`, `portfolio[]`, `stretch[]`). Cards are rendered once by `renderChallengesPage()`; filters only toggle visibility. "Built" checkboxes use `data-task="ch-NN"` and ride the normal tasks sync.
- `netlify/functions/progress.mjs` — GET/PUT `/api/progress?user=<name>`; stores per-user JSON in the Netlify Blobs store `progress`. Name-only identity (no passwords) by design.

## Progress data model

- Current profile: `localStorage["ghl30:currentUser"]`. All progress keys are namespaced: `ghl30:<user>:task:<id>`, `ghl30:<user>:day:<n>:pct`, `ghl30:<user>:quiz:<n>`. Non-GHL tracks add a track prefix after the user: `ghl30:<user>:make:day:<n>:pct`, `ghl30:<user>:make:quiz:<n>`; snapshot dict keys are `"5"` (GHL) vs `"make:5"`.
- Sync: on load, GET server snapshot and merge (union of checked tasks, max of percentages/scores); on change, debounced PUT of the full snapshot `{tasks, days, quizzes}`. Offline/GitHub Pages → graceful local-only fallback.

## Conventions (must be preserved when editing day pages)

- **`day-01.html` is the canonical template.** Every day page copies its structure: colored header (`.day-header.week-K`), 2–4 `.session` sections with timed `ol.tasks`, then `callout` blocks (`deliverable`, optional `portfolio-flag` / `tip` / `warning`, `resources`), then prev/next `.day-nav`.
- **Task checkboxes** drive all progress tracking: `<input type="checkbox" data-task="dNN-tMM">` where `NN` = 2-digit day, `MM` = sequential task number. IDs must be unique — `app.js` persists them to `localStorage` under `ghl30:task:<id>` and computes per-day % (`ghl30:day:<n>:pct`), which the index reads to render day-card progress and the overall bar. Renaming a `data-task` id resets that task's saved state for users.
- Portfolio tracker items on the index use ids `pf-01` … `pf-13`; "Before Day 1" checklist uses `d00-*`.
- Day titles must stay in sync across three places: the day page `<h1>`/`<title>`, its card on `index.html`, and neighbors' prev/next nav links.
- Content style: click-by-click instructions with `<strong>` around every clickable UI element; fictional businesses are "Summit Dental" (Weeks 1, 3, 4) and "Ironworks Fitness" (Week 2); no invented client results — portfolio pieces are framed honestly as demonstration builds.
- Site must stay fully self-contained: no CDN scripts, fonts, or analytics.
