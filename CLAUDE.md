# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A static website: **"GHL 30-Day Intensive"** — a 30-day, day-by-day GoHighLevel training program (4–8 hrs/day) that takes a complete beginner to job-ready, with 13 portfolio projects. Week 4 covers GHL + n8n integration; Days 28–30 cover portfolio packaging and job hunting.

## Commands

There is **no build step, no dependencies, no test suite**. Plain HTML/CSS/JS.

- Preview locally: `python3 -m http.server 8000` from the repo root, then open `http://localhost:8000`.
- Deploy: `.github/workflows/deploy-pages.yml` publishes the repo root to GitHub Pages on push to `main` (Pages must be enabled with Source = GitHub Actions in repo settings).

## Structure

- `index.html` — landing page: program overview, week-by-week day cards, portfolio tracker, "Before Day 1" setup checklist. `<body data-page="index">`.
- `day-01.html` … `day-30.html` — one page per training day. `<body data-day="N">` (N without leading zero; filenames use two digits).
- `styles.css` — all styling. Week color coding via `week-1` … `week-5` classes; light/dark via `prefers-color-scheme`.
- `app.js` — progress engine. No frameworks, no external requests.

## Conventions (must be preserved when editing day pages)

- **`day-01.html` is the canonical template.** Every day page copies its structure: colored header (`.day-header.week-K`), 2–4 `.session` sections with timed `ol.tasks`, then `callout` blocks (`deliverable`, optional `portfolio-flag` / `tip` / `warning`, `resources`), then prev/next `.day-nav`.
- **Task checkboxes** drive all progress tracking: `<input type="checkbox" data-task="dNN-tMM">` where `NN` = 2-digit day, `MM` = sequential task number. IDs must be unique — `app.js` persists them to `localStorage` under `ghl30:task:<id>` and computes per-day % (`ghl30:day:<n>:pct`), which the index reads to render day-card progress and the overall bar. Renaming a `data-task` id resets that task's saved state for users.
- Portfolio tracker items on the index use ids `pf-01` … `pf-13`; "Before Day 1" checklist uses `d00-*`.
- Day titles must stay in sync across three places: the day page `<h1>`/`<title>`, its card on `index.html`, and neighbors' prev/next nav links.
- Content style: click-by-click instructions with `<strong>` around every clickable UI element; fictional businesses are "Summit Dental" (Weeks 1, 3, 4) and "Ironworks Fitness" (Week 2); no invented client results — portfolio pieces are framed honestly as demonstration builds.
- Site must stay fully self-contained: no CDN scripts, fonts, or analytics.
