# Eggbeater Water Polo — Claude Handoff Doc
**Date:** 2026-04-16 (updated)  
**Repo:** https://github.com/pipers4323/eggbeater-marketing  
**Branch:** `main` (HEAD: `3a53981`)  
**Working directory:** `C:\Users\sarah\Claude Code\eggbeater-marketing`

---

## Project Overview

**Eggbeater Water Polo** is a parent-facing PWA + admin panel for a water polo club (680 Drivers / 14U Girls, 16U Girls teams). Stack:

| File | Purpose |
|------|---------|
| `index.html` | Parent app shell |
| `app.js` | All parent app logic (~8000+ lines) |
| `styles.css` | Shared styles, light/dark mode |
| `admin.html` | Admin panel (single-file, ~15500+ lines, all JS inline) |
| `sw.js` | Service worker — cache versioning + push |
| `firebase.js` | Shared Firebase auth + Firestore helpers |
| `tournament.js` | Tournament data helpers |

**Versioning pattern:** Every deploy bumps two numbers together:
- `sw.js`: `CACHE = 'ebwp-vNNN'` and `VER = '?v=NNN'`  
- `index.html`: all `?v=NNN` asset refs  
- `admin.html`: `firebase.js?v=NNN` (can be different number — tracks separately)

**Current versions:**  
- sw.js: `ebwp-v157` / `?v=249`  
- admin.html firebase.js: `?v=246`

---

## Architecture Notes

### Admin panel (`admin.html`)
- Single HTML file, all JavaScript inline
- State lives in `S` object (`window.S`)
- `S.tournament` = current tournament/schedule data (saved via `api('PUT', '/admin/data', ...)`)
- `S.director` = Director tab data (saved via `saveDirectorLocally()` → localStorage)
- `S.director.importedSchedule` = flat game list imported from director sheet (team1Name/team2Name format)
- `S.history` = past tournament history array
- `S.pw` = standard admin password (from login)
- `S.idToken` = Firebase ID token (from Firebase login)
- Tab rendering: `renderTab()` switches on `S.currentTab`, renders into `#tab-content`
- `tierHasFeature(feature)` guards premium features — `tournament_host` tier unlocks the Director tab

### Director tab data flow
- Director tab uses `/admin/tournament-pkg` API with a 6-char share code — completely separate from `S.tournament.games`
- `publishDirectorPkg()` sends bracket + `importedSchedule` to worker → parents/teams fetch by code
- `dirBsDeploy()` normalises imported sheet games → saves to `S.director.importedSchedule` → calls `publishDirectorPkg(null)` (does NOT touch `S.tournament.games`)
- Teams attending a director-hosted tournament: admin enters the 6-char share code in **Add Games → Import from Hosted Tournament** card → picks their team → games populate into their own `S.tournament.games`

### Parent app (`app.js`)
- Clock phases: `_PHASE_SEQ = ['q1','break12','q2','halftime','q3','break34','q4','done']`
- Halves mode: `_PHASE_SEQ_HALVES = ['h1','halftime','h2','done']`
  - `h1` maps to game state `q1` (period 1), `h2` maps to `q3` (period 3)
  - Duration uses `cs.halfMins` (default 18 min)
- Period labels: `_getPeriodLabel(period, gameOrRef)` picks from `HALF_PERIOD_LABELS` or `PERIOD_LABELS` based on `cs.periodMode`
- League team key: `_leagueTeamKey = e => e.team || e.subtitle || ''`

### Worker (`eggbeater-waterpolo/worker.js`)
- KV namespaces: `club-tier:{clubId}`, `sponsored-clubs`, `club-logo:{clubId}`, `club-settings:{clubId}`
- `/team-data` endpoint: only constructs `logoUrl` when `club-logo:{clubId}` KV entry exists (avoids header jitter for unbranded clubs)
- `/admin/tournament-pkg` endpoint: stores/retrieves director packages by share code

### Bracket Wizard (in Add Games tab)
Functions: `bsStep()`, `bsStep1Next()`, `bsFindTeam()`, `bsScanGames()`, `bsParseCourseSched()`, `bsDeploy()`  
State: `S.bsync` object  
- Standard format: pool teams + team name filter → your team's games only
- Course/court format: time-slot rows × course columns → one team's games (via `bsParseCourseSched`)
- Color-coded format: age group color detection → filter by age group

### Director Tab Bracket Import
Functions: `dirBsParseAllCourses()`, `dirBsImportSheet()`, `dirBsDeploy()`  
- Same course-schedule parsing as bracket wizard but imports ALL games (no team filter)
- Stores scanned games in `S._dirBsGames`, deploys into `S.director.importedSchedule` via `publishDirectorPkg()`
- Only supports course/court schedule format currently

### Import from Hosted Tournament (Add Games tab)
Functions: `dirImportWizardHtml()`, `dirImportFetch()`, `dirImportPickTeam()`, `dirImportApply()`  
- Parents'/team admins' side: enter 6-char share code → fetches director pkg → filter by team name → imports matching games into `S.tournament.games`

---

## Recent Work (this session, 2026-04-16)

### Commits this session (newest first)
```
3a53981  feat: fix light mode headers, move age group Done button, update help/i18n
e42794e  feat: complete admin localization — add translations block and fill ES/FR gaps
(several prior commits — see git log for full history)
```

### Changes in latest commit (`3a53981`)

**`styles.css`**
- **Root cause fix**: `html.native-ios[data-theme="light"] .scores-slot-header:not(.slot-header-in-card) .scores-slot-label { color: #002868 !important }` (same for native-android) — added AFTER the existing native contrast lock rules (lines ~7446–7460) which were forcing `#ffffff !important`. Overrides by higher specificity (adds `[data-theme="light"]` attribute selector). Covers history tab and Follow Player sections of Roster tab.
- Age group picker: removed `.team-picker-modal-done-wrap` block; added `.team-picker-done-inline { margin-left: auto; }` for the Done button now inline in the actions row.

**`index.html`**
- Age group picker Done button moved to TOP — now third item inside `.team-picker-modal-actions` row alongside Select all / Clear. Class `team-picker-done-inline` pushes it right. Separate `done-wrap` div removed.
- All `?v=` refs bumped to `?v=249`.

**`app.js`** (help strings EN/ES/FR)
- `help_agegroup_body`: new bullet noting Done button is top-right of picker
- `help_tscore_body`: new bullet describing director-published schedule view in T-Score tab

**`admin.html`** (help tab, hardcoded English)
- "Add Games Tab — Managing the Schedule": new bullet for **Import from Hosted Tournament** card
- "Tournament Director Package": expanded with **Schedule Sheet Import** flow (Sheet URL → age group → deploy → share code) and **Period Mode per age group** (Quarters/Halves toggle + half length)

**`sw.js`**: bumped to `ebwp-v157` / `?v=249`

---

## Key Locations in `admin.html`

| Feature | Approx Line |
|---------|-------------|
| Director tab access control | 4852–4858 |
| `renderDirectorLoginGate()` | ~14834 |
| `renderDirectorTab()` | 14869 |
| Director age group clock settings | ~15260 |
| Director bracket import card HTML | ~15352 |
| `dirBsParseAllCourses()` | ~9623 |
| `dirBsImportSheet()` | ~9716 |
| `dirBsDeploy()` | ~9757 |
| `dirImportWizardHtml()` | ~9780 |
| `dirImportFetch()` / `dirImportPickTeam()` / `dirImportApply()` | ~9800 |
| `bsParseCourseSched()` | ~9026 |
| `bsScanGames()` | ~9151 |
| `seedLegacyHistory()` | ~11658 |
| Help tab `renderHelpTab()` | ~14003 |
| Bracket wizard step rendering | ~8600–8802 |

## Key Locations in `app.js`

| Feature | Approx Line |
|---------|-------------|
| Localization strings (EN) | 72–312 |
| Localization strings (ES) | ~380–755 |
| Localization strings (FR) | ~756–1100 |
| `help_agegroup_body` (EN) | ~204 |
| `help_tscore_body` (EN) | ~263 |
| `renderHelpTab()` | ~10929 |
| `_renderScheduleMulti()` | ~6949 |
| `_renderHistoryMulti()` | ~8415 |
| Follow Player / `mp-multi-card` render | ~11484 |

---

## Known Limitations / Next Steps

1. **Director bracket import — standard (pool-bracket) format not yet supported.** Only course/court schedule format works. If a director has a standard pool-bracket sheet, they need to use the Bracket Wizard in Add Games tab instead.

2. **Director tab periodMode not wired to clock engine yet for live scoring.** The toggle saves `ag.periodMode` and `ag.halfMins` locally but the live clock reads from `S.tournament.clockSettings`. A future step: when a Director tab age group game is started, copy `ag.periodMode`/`ag.halfMins` into the game's clock settings before starting.

3. **History tab legacy data is 680 Drivers (14U Girls) only.** Other teams/age groups would need their own seed data.

4. **Club entitlements added this session (worker KV):**
   - `santa-cruz-wpc`: `tournament_host` for 6 months + `parent` join bonus for 6 months
   - `patriot-wpc`: same

---

## Build / Deploy Checklist

Before triggering a native build, verify:
- [x] All changes committed and pushed to `main` (HEAD: `3a53981`)
- [x] `sw.js` CACHE and VER bumped (`ebwp-v157` / `?v=249`)
- [x] `index.html` all `?v=` refs at `?v=249`
- [ ] Smoke-test parent app in light mode: history tab and Follow Player section labels show navy, not white
- [ ] Smoke-test age group picker: Done button appears at top-right of the sheet alongside Select all / Clear
- [ ] Smoke-test admin panel: Director tab opens, Schedule Sheet Import card visible, period mode toggle works per age group

**Safe to trigger native builds.** HEAD is clean at `3a53981`.
