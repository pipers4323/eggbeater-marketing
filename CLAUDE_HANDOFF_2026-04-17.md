## 2026-04-17 Late Update

- `eggbeater-marketing` `main` is now at `b8d3c79` (`assets: add 680 groupme bot avatar`).
- `eggbeater-waterpolo` `main` is now at `b2bc702` (`chore: sync native bundle with branding fix`).
- Weekend smoke tests now live:
  - `santa-cruz-wpc` spectator/parent-only test for Saturday/Sunday
  - `yolo-polo` full scoring + spectator test for Sunday
  - `680-drivers` full scoring + spectator test for Sunday
- Feedback intake is live through a published Google Form with prefilled links per smoke test.
- 680 GroupMe bot is wired to the correct chat and using the published avatar asset at:
  - `https://eggbeater.app/groupme-680-eggbeater-avatar-final.png`

### Open items after rollout prep

1. **Hydres director package:** closed for now. Hydres test club is live and usable; the separate 12-team hosted tournament/director artifact is intentionally deferred unless requested later.
2. **Billing/product rename:** move `Parent Monthly` to `Spectator Monthly` and update product-facing billing copy, including `about.html`.
3. **Internal cleanup plan:** visible `parent` copy is already renamed, but deeper internal `parent*` identifiers/storage keys were intentionally left alone. Future work needs a compatibility plan before renaming persisted keys or entitlement names.
4. **Domain check:** confirm `www.eggbeater.app` behavior later and decide whether to add an explicit redirect/alias to apex if needed.
5. **Post-weekend triage:** review smoke test feedback and classify into blocker / important / later before broader beta expansion.

### Build / rollout state

- Web is live with the latest scores fixes, guide updates, spectator rename work, GroupMe avatar asset, and branding corrections.
- Wrapper repo has been re-synced and pushed after the final `styles.css` branding fix; next native build should include today's shipped app changes.
- No additional feature work should happen during the live weekend tests unless a real blocker appears.

## 2026-04-17 PM Update

- `eggbeater-marketing` `main` is now at `f3422b6` (`style: polish scores card layout`).
- `eggbeater-waterpolo` `main` is now at `bbfa516` (`chore: sync native bundle with latest scores polish`).
- The spectator rename work is live in marketing, including:
  - product-facing `Spectator App` / `Spectator Guide` copy
  - new `spectator-guide.html`
  - internal low-risk rename cleanup (`spectator-guide-link`, `_checkSpectatorSubscription`)
- Latest marketing fixes after that:
  - split-team picker sync between header tray and Settings
  - scorer-mode card CTA restored (`Open Scorer`)
  - multi-team Scores tab uses full scorer cards again when unlocked
  - logged-out multi-team Scores tab now keeps cap-color game cards
  - score cards got a polish pass: two-line metadata, cap pills, softer dark-cap cards, stronger venue readability
- Wrapper repo was re-synced from marketing and `npx cap sync android` + `npx cap sync ios` both completed successfully before pushing `bbfa516`.

### Current build-readiness

- Ready to trigger a fresh native build from `eggbeater-waterpolo` `main`.
- Latest web bundle in wrapper includes:
  - light-mode age-group header fixes
  - help/localization updates
  - spectator rename phase 1/2/3A
  - split-team tray/settings picker sync
  - restored scorer CTA + full multi-team score cards
  - score-card visual polish/readability pass

### Follow-ups

1. Trigger Codemagic/TestFlight/Android build from `eggbeater-waterpolo` `main`.
2. Smoke test on device:
   - header tray split-team expansion (`All / A / B`) for Yolo `10u Co-Ed`
   - scorer unlock flow on Yolo scores tab (`Open Scorer` large CTA + immediate expansion)
   - logged-out vs logged-in Scores card appearance
   - dark-cap score card location readability / cap pills / overall card polish
   - light-mode Schedule / Bracket / History / Roster section headers
   - spectator copy/guide entry points
3. Separate product decision still open:
   - whether `Parent Monthly` should also be renamed, or left as-is for billing/entitlement stability

---
# Eggbeater Water Polo — Claude Handoff Doc
**Date:** 2026-04-17  
**Repo:** https://github.com/pipers4323/eggbeater-marketing  
**Branch:** `main` (HEAD: `1575e5d`)  
**Working directory:** `C:\Users\sarah\Claude Code\eggbeater-marketing`

---

## Project Overview

**Eggbeater Water Polo** is a parent-facing PWA + admin panel for a water polo club (680 Drivers / 14U Girls, 16U Girls teams). Stack:

| File | Purpose |
|------|---------|
| `index.html` | Parent app shell |
| `app.js` | All parent app logic (~8000+ lines) |
| `styles.css` | Shared styles, light/dark mode |
| `admin.html` | Admin panel (single-file, all JS inline) |
| `sw.js` | Service worker — cache versioning + push |
| `firebase.js` | Shared Firebase auth + Firestore helpers |
| `tournament.js` | Tournament data helpers |

**Versioning pattern:** Every deploy bumps two numbers together:
- `sw.js`: `CACHE = 'ebwp-vNNN'` and `VER = '?v=NNN'`
- `index.html`: all `?v=NNN` asset refs
- `admin.html`: `firebase.js?v=NNN` (tracks separately)

**Current versions:**
- sw.js: `ebwp-v162` / `?v=254`
- admin.html firebase.js: `?v=246` (unchanged this session)

**Native build note:** CSS changes to `styles.css` require a new Capacitor native build. JS/HTML-only changes propagate via service worker without a rebuild. This session changed `styles.css` → **new native build required.**

---

## Architecture Notes

### Admin panel (`admin.html`)
- Single HTML file, all JavaScript inline
- State lives in `S` object (`window.S`)
- `S.tournament` = current tournament/schedule data (saved via `api('PUT', '/admin/data', ...)`)
- `S.director` = Director tab data (saved via `saveDirectorLocally()` → localStorage)
- `S.history` = past tournament history array
- Tab rendering: `renderTab()` switches on `S.currentTab`, renders into `#tab-content`
- `tierHasFeature(feature)` guards premium features

### Director tab data flow
- Director tab uses `/admin/tournament-pkg` API with a 6-char share code
- `publishDirectorPkg()` sends bracket + `importedSchedule` to worker
- `dirBsDeploy()` normalises imported sheet games → saves to `S.director.importedSchedule`
- Multi-age-group import: same label replaces, different labels coexist
- Worker reuses existing share code when `code` param passed

### Parent app (`app.js`)
- Clock phases: `_PHASE_SEQ = ['q1','break12','q2','halftime','q3','break34','q4','done']`
- Halves mode: `_PHASE_SEQ_HALVES = ['h1','halftime','h2','done']`
- `_historyEntryTeamLetter(label)` — extracts A/B/C from labels like '680 A', '680 B', 'Team B', 'B'
- `getHistoryForActiveTeam()` uses `_historyEntryTeamLetter` for filtering
- `getCumulativeStandings()` — recognizes '680 A'/'680 B' subtitle patterns for standings
- `getTournamentBracketPaths()` fallback: manual `bracket.paths` → `bracket.importedPaths`
- `inferProjectedPath()` skips projection when no `qualifyMinWins` set on paths

### Worker (`eggbeater-waterpolo/worker.js`)
- HEAD: `e9fedc2` (no changes this session — no redeploy needed)
- KV namespaces: `club-tier:{clubId}`, `history-seed:{team}`, `tournament-pkg:{code}`
- `/admin/data` PUT: saves tournament + history to KV; history key is `history-seed:{team}`
- `/team-data` GET: returns `{ tournament, history, roster, ... }`
- History update flow: admin saves to KV → parent needs force-refresh to pick up change (no Firebase trigger)

---

## Work Done This Session (2026-04-17)

### Commits (newest first)
```
1575e5d  fix: seed legacy status message survives renderTab() re-render
5a05eb8  fix: handle range date strings in legacy seed (Oct 4-5, Jan 31 - Feb 1)
fcd29c1  fix: legacy seed always overwrites + history A/B filter handles custom labels
de21880  fix: correct age group header colors in light mode
```

### What was fixed

**Age group header colors (styles.css):**
- Previous fix incorrectly applied navy text to non-in-card headers (Schedule/Scores tabs sit on dark outer shell → navy-on-dark = unreadable)
- Fixed: removed the wrong rule, replaced with rule targeting `slot-header-in-card` headers only in light mode
- Schedule/Scores headers: stay white (correct — dark shell background)
- Roster/History in-card headers: navy in light mode via `[data-theme="light"] .scores-slot-header.slot-header-in-card`

**History A/B team filtering (app.js):**
- New `_historyEntryTeamLetter(label)` extracts letter from '680 A', '680 B', 'Team B', 'B', etc.
- `getHistoryForActiveTeam()` now correctly routes '680 B' entries to Team B slot (not Team A)
- `getCumulativeStandings()` resolves team from subtitle for standings display

**Legacy seed data (admin.html):**
- Was: skipped entries with matching IDs → re-deploys never updated stale data
- Now: always overwrites by ID, preserves non-seed entries
- Fixed: range date strings like "Oct 4–5, 2025" crashed `new Date().toISOString()` — strips range before parsing
- Fixed: `saveHistory()` called `renderTab()` destroying `statusEl` before count message could display — now calls API directly and re-queries `statusEl` after render

---

## History Data Structure

```javascript
// History entry (what buildHistoryCard expects)
{
  id: 'kap7-futures-day2-2026-680a',
  name: '2026 Kap 7 Futures...',
  dates: 'March 7, 2026',
  location: 'Archie Williams HS',
  team: '680 A',        // used for A/B filtering and standings grouping
  subtitle: '680 A · Day 2',
  wins: 2, losses: 0, totalPoints: 8,
  games: [
    {
      id: 'f2d2-g7', opponent: 'SHARKS', result: 'W',
      score: '16–4',    // string display
      teamScore: 16,    // integer (for buildHistoryCard syncedScore)
      oppScore: 4,      // integer
      points: 4,        // bracket points (NOT bracketPoints)
      liveScore: null,
    }
  ]
}
```

**Team label recognition (`_historyEntryTeamLetter`):**
- `'A'` / `'B'` / `'C'` → direct
- `'Team A'` / `'Team B'` → standard
- `'680 A'` / `'680 B'` → ends with ` A` / ` B`
- `null` / `''` → unassigned → defaults to Team A slot

**A/B breakdown on web:** requires selecting both A and B in the team picker. Single-team mode shows combined stats. Multi-team mode shows separate per-team sections.

---

## Director Import Workflow (fully working)

### Director side (once per age group):
1. Director tab → Schedule Sheet Import card
2. Paste Google Sheet URL → enter age group label (e.g., `10u Co-Ed`)
3. Check **Court/course schedule format** → Scan & Preview → Deploy All Games
4. Repeat for each age group — same share code reused
5. Share the code with team admins

### Team admin side:
1. Add Games tab → **📋 Import from Hosted Tournament**
2. Enter share code → Fetch → Pick age group → Pick team(s)
3. Review: pool games + yellow "possible bracket" games
4. Remove time-conflicting games with ✕
5. **🚀 Import** → direct games → schedule; bracket games → Bracket tab `importedPaths`

---

## Known Limitations / Pending

1. **Director bracket import — standard (pool-bracket) format not supported** (course/court only)
2. **Director tab periodMode not wired to clock engine** for live scoring
3. **History: `saveHistory()` has no Firebase push** — parent app needs manual force-refresh after admin seeds
4. **History legacy seed** — all 16 entries are 14U Girls only; no 16U Girls legacy data yet
5. **Color-coded sheets**: CSV parser can't detect row colors; workaround is per-age-group label + ✕ conflict removal

---

## Build / Deploy Checklist

- [x] All changes committed and pushed to `main` (HEAD: `1575e5d`)
- [x] Worker at HEAD `e9fedc2` — no changes this session, no redeploy needed
- [x] sw.js: `ebwp-v162` / `?v=254`
- [x] CSS changed (`styles.css`) → **new native build required**
- [ ] Trigger new native iOS/Android build
- [ ] Smoke-test age group header colors in light mode on device after build
- [ ] Smoke-test history A/B breakdown (select both A and B in team picker)
- [ ] Verify legacy seed: admin → 📥 Seed Legacy Data → force-refresh parent app

---

## Key Locations in `admin.html`

| Feature | Approx Line |
|---------|-------------|
| `seedLegacyHistory()` | ~12383 |
| `LEGACY_SEED` array | ~12397 |
| Director tab access control | 4852–4858 |
| `renderDirectorTab()` | ~14869 |
| `dirBsParseAllCourses()` | ~9634 |
| `dirBsDeploy()` | ~9768 |
| `_parseBracketRef()` | ~9918 |
| `dirImportApply()` | ~10033 |
| `dirImportWizardHtml()` | ~9810 |
| `publishDirectorPkg()` | ~14954 |

## Key Locations in `app.js`

| Feature | Approx Line |
|---------|-------------|
| `_historyEntryTeamLetter()` | ~1598 |
| `getHistoryForActiveTeam()` | ~1614 |
| `getCumulativeStandings()` | ~8388 |
| `buildHistoryCard()` | ~7760 |
| `getTournamentBracketPaths()` | ~(search) |
| `inferProjectedPath()` | ~(search) |
| Localization strings (EN) | 72–312 |

