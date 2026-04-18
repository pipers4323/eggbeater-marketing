## 2026-04-17 Closeout Update

- `eggbeater-marketing` `main` is now at `79b9173` for the latest spectator paygate migration work, plus `8abd027` / `6ae9902` / `480959a` / `2304a53` for the broader spectator entitlement and billing rename sequence.
- `eggbeater-waterpolo` `main` is now at `bf26ac4` (`chore: sync native bundle with spectator migration`).
- Product-facing billing rename is effectively complete in code: `Spectator Monthly` is now the visible subscription name across marketing, app settings/paygate copy, legal pages, and admin-facing labels where safe.
- Canonical paid tier is now `spectator`; compatibility remains in place for legacy `parent*` storage keys, entitlement ids, tier values, feature ids, and helper aliases.
- RevenueCat / App Store / Google Play operator checklist was prepared for manual dashboard/store updates. Assumption at handoff: those display-text updates are either done or in progress and should be verified in the real dashboards before any final cleanup pass.

## 2026-04-17 Follow-up Update

- Product-facing billing rename is now patched locally: `Parent Monthly` -> `Spectator Monthly` in `about.html`, `app.js`, `terms.html`, and `privacy.html`.
- Internal migration is now in phase 3A: the app treats `spectator` as the canonical paid tier, dual-reads `ebwp-spectator-tier` and `ebwp-parent-tier`, dual-writes both keys, accepts both legacy and new entitlement ids, and keeps legacy aliases in place only for compatibility.
- Domain check is complete: `https://eggbeater.app/` and `https://eggbeater.app/scorer-one-page-guide.html` both `307` to `https://www.eggbeater.app/...`, and `www` serves `200 OK`. No redirect/alias fix is needed right now.
- Hydres hosted director-package follow-up remains closed/deferred unless they explicitly ask for it later.

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
2. **Billing/product rename:** code-side and product-facing text is substantially complete. Remaining work is verification of dashboard/store display text and any future retirement of legacy entitlement/storage identifiers.
3. **Internal cleanup plan:** migration is partially started. Canonical paid tier is now `spectator`, spectator join UI ids are replacing parent-named ids, and `spectator_stats` is now the canonical feature id. Legacy compatibility mirrors still remain (`state.parentTier`, `ebwp-parent-tier`, `ENFORCE_PARENT_TIERS`, `PARENT_FEATURES`, legacy feature id fallback from `parent_stats`, legacy tier value `parent`, and old aliases such as `showParentUpgradeSheet()`).
4. **Domain check:** completed. Apex currently redirects to `www`, and `www` serves successfully. No action needed unless that behavior changes.
5. **Post-weekend triage:** review smoke test feedback and classify into blocker / important / later before broader beta expansion.

### Future Phase 3B-final retirement pass

Only do this after subscription dashboards and real entitlement verification are stable:

1. Stop writing `ebwp-parent-tier`; keep read fallback temporarily, then remove later.
2. Retire `state.parentTier` and keep only `state.spectatorTier`.
3. Remove legacy helper aliases:
   - `showParentUpgradeSheet`
   - `parentHasFeature`
   - `parentHasFeatureByTier`
   - `updateParentCrowns`
   - `renderParentNudge`
   - `ENFORCE_PARENT_TIERS`
   - `PARENT_FEATURES`
4. Decide whether legacy entitlement ids (`parent`, `parent_monthly`) remain permanently supported or are retired after a compatibility window.
5. Remove fallback feature-id normalization from `parent_stats` to `spectator_stats` only after admin/worker/native code no longer emits or expects the old id.
6. Remove final DOM/id fallbacks like `parent-join-url` once no older code paths depend on them.

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
   - complete the final internal migration from `parent*` to `spectator*` once it is safe to retire legacy storage keys, entitlement ids, tier values, feature ids, DOM ids, and helper aliases

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


---

## Update - 2026-04-18

### Current marketing HEAD
- `572d401` - `fix: use resolved club id for admin masters fallback`

### Live fixes completed today

1. **Hydres admin auth club-context bug**
- Fixed stale club-context resolution during admin login.
- Result: Hydres admin login now evaluates against `hydres-quebec` instead of a previously saved club.

2. **Multi-age scorer unlock**
- Fixed scorer password unlock to validate against the full selected age-group scope, not just the current tournament context.
- Result: `Open Scorer` shows again in multi-age scorer mode when the selected groups share the scorer password.

3. **Hydres single Masters setup**
- Hydres payload redeployed under single team key `masters`.
- Club/app logic now supports `singleMastersTeam`.
- Spectator app now infers single-Masters mode from live `team=masters` data if `club-info` does not expose the flag.
- Admin panel now does the same inference and uses the resolved club id correctly.
- Result: Hydres now shows a single `Masters` selector instead of `Masters Women` / `Masters Men`.

4. **Scores tab dark-mode cap pill contrast**
- Fixed unreadable cap pills on white-cap score cards in Chrome dark mode.

5. **Roster > My Players dark-mode readability**
- Fixed dark-on-dark stat tiles in My Players for iPhone dark mode / native dark presentations.
- Stat tiles now stay light with readable labels and blue numbers.

### Important live behavior note
- The worker currently serves a live `masters` payload for Hydres, but `club-info?club=hydres-quebec` still does **not** expose `singleMastersTeam`.
- App/admin now contain fallback inference to handle this, but the cleaner long-term fix is to update the worker/club-info response to include the flag directly.

### Follow-ups

1. **Worker cleanup**
- Add `singleMastersTeam` to the worker `club-info` / club-settings response path so Hydres and future single-masters clubs do not rely on frontend inference.

2. **Native sync / build**
- Latest web fixes after the previous wrapper sync include:
  - Hydres single-Masters app/admin handling
  - cap pill dark-mode contrast fix
  - My Players dark-mode readability fix
- Wrapper repo needs a fresh sync before the next iOS/Android build if those fixes must ship natively.

3. **Native QA**
- Re-test on iPhone dark mode:
  - `Roster` > `My Players`
  - `Scores` cap pills
  - Hydres selector in app/admin as needed

4. **Admin cleanup later**
- `admin.html` still contains some old mojibake/encoding artifacts in copy strings.
- Not blocking functionally, but worth a cleanup pass later.


---

## Update - 2026-04-18 (Live scoring / summary / recovery)

### Current heads
- Marketing: `6ddbc9e` - `fix: keep summary clock synced live`
- Wrapper: `a5c7c4e` - `chore: sync native bundle with live score summary updates`
- Worker/backend: `dca1540` - durable scored-game storage, official sheet sync, recovery endpoints

### Completed today

1. **Durable scored-game source of truth**
- Live-scored games now persist to durable worker storage instead of relying only on expiring live-score keys.
- Client `team-data` merge now restores scored games in clean/incognito sessions.
- Goal: prevent Schedule/History disagreement and loss of final scores after scorer-device/browser loss.

2. **Official sheet result ingestion**
- Worker now matches bracket-wizard sheet rows back to games.
- Official final sheet scores can update durable scored-game records and tournament snapshots.
- Applied to current Cal Cup examples such as 680 and Santa Cruz.

3. **Admin recovery UI**
- Added scored-games recovery/admin actions in `admin.html`:
  - scored-games list
  - sync official sheet results
  - rebuild history from scored games
  - promote final / reopen / reset scored game

4. **History cleanup**
- Fixed bogus `Other Tournaments` duplicate/empty shell entries.
- Root cause was stale local archived shells with no real results.
- Filtering and storage sanitization now purge those entries.

5. **Scores / Summary / Play-by-Play UI refresh**
- `Scores` now uses the clean `Summary` / `Play-by-Play` game view instead of the old noisy embedded box-score card.
- `History` games open into the same summary/play-by-play detail flow.
- Live games in `Schedule` now open directly into the `Scores` summary view.

6. **Scorer / scoring workflow fixes**
- `Open Scorer` click path fixed.
- Added turnover event support and delete-from-play-by-play / in-card event log.
- Added scorer finalization actions.
- Added goal subtype `Counter` for team goals.
- Added turnover subtype `Inside 2m`.
- If there is exactly one goalie, `GK Save` now records directly without prompting.

7. **Live summary and score-view polish**
- Summary center state now shows the live period/clock above the dash.
- Summary clock now ticks live with scorer time.
- Halftime now shows as `Half Time`.
- Removed map buttons from `Scores` / summary views; location is venue text only.
- Fixed location pin + venue text to stay on one line.
- Enlarged live quarter/clock label.
- Relaxed over-aggressive desktop width cap while keeping readability.
- Removed useless pre-game summary body.

### Important current behavior
- Web is current at marketing `6ddbc9e`.
- Native wrapper is synced at `a5c7c4e` and is the correct build source for the next iOS build.
- Old lost play-by-play cannot be reconstructed unless recovered from an original scorer device; only final/result data can be restored after the fact.

### Follow-ups

1. **Verify new native build**
- Confirm the build from wrapper `a5c7c4e` includes:
  - clean `Summary` / `Play-by-Play` UI
  - live ticking summary clock
  - scorer open fix
  - delete support in play-by-play and in-card event log
  - map buttons removed from `Scores`
  - summary location pin inline

2. **Live scoring reliability QA**
- During the next scored game, verify end-to-end:
  - scorer device writes durable scored-game record
  - clean/incognito spectator session restores live/final state
  - finalized game leaves `Schedule` and appears in `History`
  - official sheet sync updates the final score when applicable

3. **Recovery workflow QA**
- In admin, test:
  - `Sync Official Sheet Results`
  - `Rebuild History from Scored Games`
  - `Promote Final`
  - `Reopen`
  - `Reset`
- Goal: verify operations work without manual code/data patching.

4. **Future improvement**
- If desired later, add a cleaner explicit worker-side archive/recovery view instead of depending on local spectator history shells at all.
## 2026-04-18 Live Scoring / Sheet Sync Update

- `eggbeater-marketing` `main` is now at `2a12024` (`fix: keep blue button text readable`).
- `eggbeater-waterpolo` `main` is now at `8a61800` (`chore: sync native styles for button contrast`).
- Live worker deploy is current at version `890fc8e8-ba1d-43af-97ae-db6ad220e78e`.
- Durable scored-game persistence is now the intended source of truth for scored games; schedule/history restore and archive recovery were hardened around that path.
- Official sheet sync now updates durable scored-game records and history without wiping an existing event stream with `events: []`.
- Santa Cruz `16u Girls` was manually recovered and restored from copied play-by-play:
  - `CHAWP WHITE` final is `17-10 W`
  - `CLOVIS` final is `13-5 W`
  - `CLOVIS` durable scored-game record and history entry now include restored play-by-play.
- Sheet-driven next-game materialization is live in the worker:
  - Santa Cruz now gets the next bracket game as a real scheduled game object (`7:00 AM`, `April 19, 2026`, `NORCO HS`, opponent `1st C`).
  - Cap color is now derived from sheet white/blue columns; Santa Cruz next game comes through as `Dark`.
- Recent UI fixes now shipped/synced:
  - projected-next card restyled lighter on the blue background
  - blue buttons/tabs force white text when active
  - My Players light-mode contrast improved (`Add` button + initials/avatar)
  - score/schedule surfaces keep map buttons off scores/summary views where requested
  - score summary clock/period sizing and live state display improved
  - live schedule click-through to Scores summary fixed
  - halftime label shows correctly
- Wrapper sync state:
  - latest native build should come from `eggbeater-waterpolo` `main` at `8a61800`
  - latest marketing web head is `2a12024`

### Follow-ups

1. Verify fresh native build from `8a61800` on device for:
   - projected next game card
   - next-game cap color
   - blue-button/tab contrast
   - My Players readability in light mode
   - live summary/play-by-play and delete support
2. Watch the next scored game end-to-end and confirm:
   - durable scored-game record keeps full event stream
   - archive/history transition preserves score and play-by-play
   - finalization prompt appears at Q4 expiry and drives a durable final write
3. Santa Cruz / Clovis recovery note:
   - one anonymous opponent goal at `Q4 0:00` was added to reconcile restored play-by-play to the official `13-5` sheet result.
4. Remaining product cleanup after tournament pressure is lower:
   - full standings engine for projected bracket placement instead of current heuristic
   - broader admin tooling polish around scored-game restore/rebuild flows
   - confirm all official sheet sync paths also update any client-side projected/current tournament caches cleanly.

## 2026-04-18 Late Venue/Native Sync Update

- `eggbeater-marketing` `main` is now at `3d1d451` (`fix: use game venue in schedule cards`).
- `eggbeater-waterpolo` `main` is now at `f188cdb` (`chore: sync native bundle with schedule venue fix`).
- Schedule cards were still using `TOURNAMENT.location`; they now use `g.location || TOURNAMENT.location` so sheet/materialized next games show the correct venue.
- Santa Cruz projected/materialized next game should now show `NORCO HS` instead of `Elsinore High School`.
- Latest native build should be triggered from wrapper commit `f188cdb`.

### Updated follow-ups

1. Trigger and verify a fresh native build from `f188cdb`.
2. Device QA for Santa Cruz next game should confirm all of:
   - opponent `1st C`
   - venue `NORCO HS`
   - cap color `Dark`
   - projected-next card styling and readable text
3. Keep watching sheet sync on the next tournament rollover/end-of-game cycle:
   - official score ingestion
   - next-game materialization
   - durable history/archive preservation
4. If another scored game disappears, inspect durable scored-game record before running any official-sheet/admin rebuild action so the original event stream is not overwritten.
