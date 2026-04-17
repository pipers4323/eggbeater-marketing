# Eggbeater Water Polo — Claude Handoff Doc
**Date:** 2026-04-16 (updated — session 2)  
**Repo:** https://github.com/pipers4323/eggbeater-marketing  
**Branch:** `main` (HEAD: `7213f59`)  
**Working directory:** `C:\Users\sarah\Claude Code\eggbeater-marketing`

---

## Project Overview

**Eggbeater Water Polo** is a parent-facing PWA + admin panel for a water polo club (680 Drivers / 14U Girls, 16U Girls teams). Stack:

| File | Purpose |
|------|---------|
| `index.html` | Parent app shell |
| `app.js` | All parent app logic (~8000+ lines) |
| `styles.css` | Shared styles, light/dark mode |
| `admin.html` | Admin panel (single-file, ~15600+ lines, all JS inline) |
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
- `S.director.importedSchedule` = flat game list imported from director sheet (team1Name/team2Name format, ageGroupName per game)
- `S.history` = past tournament history array
- `S.pw` = standard admin password (from login)
- `S.idToken` = Firebase ID token (from Firebase login)
- Tab rendering: `renderTab()` switches on `S.currentTab`, renders into `#tab-content`
- `tierHasFeature(feature)` guards premium features — `tournament_host` tier unlocks the Director tab

### Director tab data flow
- Director tab uses `/admin/tournament-pkg` API with a 6-char share code — completely separate from `S.tournament.games`
- `publishDirectorPkg()` sends bracket + `importedSchedule` to worker → parents/teams fetch by code
- `dirBsDeploy()` normalises imported sheet games → saves to `S.director.importedSchedule` → calls `publishDirectorPkg(null)`
- **Multi-age-group import**: director runs `dirBsDeploy` once per age group (each with a text label in `dir-bs-ag-label`). Games are merged by label — same label replaces, different labels coexist. `publishDirectorPkg` passes `S.director.publishedCode` so the same share code is reused across all imports.
- Teams attending a director-hosted tournament: admin enters the 6-char share code in **Add Games → Import from Hosted Tournament** card → picks age group → picks their team(s) → bracket path traversal adds possible bracket games → time-conflict detection highlights duplicates with ✕ remove button

### Parent app (`app.js`)
- Clock phases: `_PHASE_SEQ = ['q1','break12','q2','halftime','q3','break34','q4','done']`
- Halves mode: `_PHASE_SEQ_HALVES = ['h1','halftime','h2','done']`
  - `h1` maps to game state `q1` (period 1), `h2` maps to `q3` (period 3)
  - Duration uses `cs.halfMins` (default 18 min)
- Period labels: `_getPeriodLabel(period, gameOrRef)` picks from `HALF_PERIOD_LABELS` or `PERIOD_LABELS` based on `cs.periodMode`
- League team key: `_leagueTeamKey = e => e.team || e.subtitle || ''`

### Worker (`eggbeater-waterpolo/worker.js`)
- KV namespaces: `club-tier:{clubId}`, `sponsored-clubs`, `club-logo:{clubId}`, `club-settings:{clubId}`
- `/team-data` endpoint: only constructs `logoUrl` when `club-logo:{clubId}` KV entry exists
- `/admin/tournament-pkg` PUT: accepts optional `code` in body — reuses existing code if valid 6-char, otherwise generates new one. Stores as `tournament-pkg:{code}` in KV.
- `/tournament-pkg` GET: public fetch by share code

### Bracket Wizard (in Add Games tab)
Functions: `bsStep()`, `bsStep1Next()`, `bsFindTeam()`, `bsScanGames()`, `bsParseCourseSched()`, `bsDeploy()`  
State: `S.bsync` object  
- Standard format: pool teams + team name filter → your team's games only
- Course/court format: time-slot rows × course columns → one team's games (via `bsParseCourseSched`)
- Color-coded format: age group color detection → filter by age group
- Bracket path wizard: `bsFetchRebracket()` reads a separate rebracket range → `bsParseRebracket()` builds seeding map → `bsComputeBracketPaths()` traces reachable bracket games by finish position

### Director Tab Bracket Import
Functions: `dirBsParseAllCourses()`, `dirBsImportSheet()`, `dirBsDeploy()`  
- Parses course/court schedule format (all games, no team filter)
- Director enters an **Age Group / Division label** (free text, e.g. "10u Co-Ed") before deploying
- `dirBsDeploy` merges by label: keeps games with different labels, replaces games with the same label
- Stores scanned games in `S._dirBsGames`, deploys into `S.director.importedSchedule` via `publishDirectorPkg(null, existingCode)`
- **Does NOT support standard pool-bracket format** — only course/court schedule format

### Import from Hosted Tournament (Add Games tab)
Functions: `dirImportWizardHtml()`, `dirImportFetch()`, `dirImportPickAgeGroup()`, `dirImportPickTeam()`, `dirImportRemoveGame()`, `dirImportApply()`  
- Team admins enter 6-char share code → fetch director pkg
- If pkg has multiple `ageGroupName` values → age group picker appears first
- Team name pills filtered to selected age group; `W G#` / `L G#` bracket refs excluded from pills
- **Bracket path traversal** (`_parseBracketRef`): after finding direct pool games, recursively follows `W G{N}` / `L G{N}` references to find all reachable bracket games. Bracket games shown with yellow "possible bracket" badge.
- **Time-conflict detection**: games at the same date+time highlighted in amber; each row has ✕ button (`dirImportRemoveGame`) to remove wrong game before importing
- Multi-team select: tap multiple team pills (A+B teams) to union their games

### Two different import cards in Add Games tab — DO NOT CONFUSE:
1. **📋 Import from Hosted Tournament** (`dirImportWizardHtml`, above Game Setup card) — imports games into `S.tournament.games`. This is what team admins use.
2. **📊 Sync T-Score Bracket from Director** (inline section inside the games list card) — syncs bracket for T-Score live display only. Requires age groups set up. Different purpose entirely.

---

## Recent Work (session 2, 2026-04-16)

### Commits this session (newest first)
```
7213f59  feat: time-conflict detection and per-game remove in import preview
acd5b69  fix: pass existing share code on re-publish to keep same code across imports
3fc2003  feat: bracket path traversal for W G21 / L G11 style references
d571c12  feat: per-age-group director import with age group filter on team side
948f0eb  fix: use data-team attribute to avoid onclick quoting issues
8e24b11  fix: escape JSON in dirImportPickTeam onclick attribute
de5eed9  feat: multi-team select in Import from Hosted Tournament
1ae9e00  fix: clarify Sync T-Score vs Import from Hosted Tournament to reduce confusion
50b9f36  fix: restore dirImportWizardHtml/Fetch/PickTeam/Apply (wiped by localization commit)
```

### Worker commits (eggbeater-waterpolo)
```
e9fedc2  fix: reuse existing share code in PUT /admin/tournament-pkg if provided
```

---

## Key Locations in `admin.html`

| Feature | Approx Line |
|---------|-------------|
| Director tab access control | 4852–4858 |
| `renderDirectorTab()` | ~14869 |
| Director bracket import card HTML (`dirBsCard`) | ~15557 |
| `dirBsParseAllCourses()` | ~9634 |
| `dirBsImportSheet()` | ~9727 |
| `dirBsDeploy()` | ~9768 |
| `_parseBracketRef()` | ~9918 |
| `dirImportPickAgeGroup()` | ~9921 |
| `dirImportPickTeam()` | ~9935 |
| `dirImportRemoveGame()` | ~10025 |
| `dirImportApply()` | ~10033 |
| `dirImportWizardHtml()` | ~9810 |
| `dirImportFetch()` | ~9857 |
| `publishDirectorPkg()` | ~14954 |
| Bracket wizard step rendering | ~8600–8802 |
| `bsFetchRebracket()` | ~9347 |
| `bsComputeBracketPaths()` | ~9454 |
| Help tab `renderHelpTab()` | ~14003 |

## Key Locations in `app.js`

| Feature | Approx Line |
|---------|-------------|
| Localization strings (EN) | 72–312 |
| Localization strings (ES) | ~380–755 |
| Localization strings (FR) | ~756–1100 |
| `renderHelpTab()` | ~10929 |

---

## Director Import Workflow (fully working as of this session)

### Director side (once per age group):
1. Director tab → Schedule Sheet Import card
2. Paste Google Sheet URL (must be public/anyone with link can view)
3. Enter age group label (e.g. `10u Co-Ed`) in the **Age Group / Division label** field
4. Check **Court/course schedule format**
5. Click **Scan & Preview Games**
6. Click **Deploy All Games to App** → popup shows share code
7. Repeat for each age group (same URL, different label) — same share code reused
8. Share the one code with all teams

### Team admin side:
1. Add Games tab → **📋 Import from Hosted Tournament** (scroll up, expand card)
2. Enter share code → **Fetch →**
3. Pick age group (if multiple)
4. Pick team(s) — tap multiple for A+B teams
5. Review: pool games + yellow "possible bracket" games
6. Remove any time-conflicting wrong-age-group games with ✕
7. **🚀 Import** → games land in schedule

### Limitations:
- Color-coded sheets: CSV has no color info. Director must run import per age group and team admin must manually ✕ any cross-age-group duplicates at same timeslot.
- `W G#` bracket refs: resolved by game-number traversal. `Cross` notation not supported.
- Standard pool-bracket sheet format not supported in director import — only course/court.

---

## Known Limitations / Next Steps

1. **Director bracket import — standard (pool-bracket) format not yet supported.**
2. **Director tab periodMode not wired to clock engine yet for live scoring.**
3. **History tab legacy data is 680 Drivers (14U Girls) only.**
4. **Color-coded sheets**: CSV parser can't distinguish row colors; workaround is per-age-group label + ✕ conflict removal on team side.

---

## Build / Deploy Checklist

Before triggering a native build, verify:
- [x] All changes committed and pushed to `main` (HEAD: `7213f59`)
- [x] Worker deployed via `npx wrangler deploy` (HEAD: `e9fedc2`)
- [x] `sw.js` CACHE and VER at `ebwp-v157` / `?v=249`
- [ ] Smoke-test Import from Hosted Tournament end-to-end
- [ ] Smoke-test multi-age-group director import produces single share code
