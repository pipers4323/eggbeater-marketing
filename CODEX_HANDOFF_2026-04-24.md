# Codex Handoff
Date: 2026-04-24

## Current State

This handoff captures the current release state across the shared web/admin repo and the native wrapper repo after the latest production fixes.

- Web/source repo: `eggbeater-marketing`
- Native wrapper repo: `eggbeater-waterpolo`
- Current web commit: `9291572`
- Current wrapper commit: `64f01ad`
- Latest known web production deploy status: pushed from `main`; re-check live deploy state before assuming `READY`

The shared rule for this codebase still applies:

- If a change touches shared spectator behavior, shared admin behavior, or `admin.html`, mirror it across both repos.

---

## What Was Just Fixed

### Director import behavior

Director now has a proper host-tournament import mode in the shared wizard flow.

Previous bad behavior:

- Director reused the same team-centric bracket import flow as normal club admin
- It asked:
  `How is your team listed on this sheet?`
- That was wrong for the host setup case, because the host is importing the entire tournament, not filtering down to one team

Current behavior:

- Director shared import wizard no longer requires team-name matching for host setup
- Director host mode now:
  - fetches pools
  - scans the full tournament schedule
  - publishes the result into the Director package
- Team selection is deferred to the later club-admin import flow using the director code

This now matches the intended use case:

1. Tournament host sets up the tournament once from the sheet
2. Director package publishes pools and schedule
3. Participating clubs later import only their team(s) from that hosted package

### Shared wizard coverage in Director

Director has the shared import stack available in the Director tab:

- standard Bracket Wizard
- Futures Wizard
- NJO wizard

The older Director schedule importer card was left in place, but the shared wizard path is now the correct tournament-host setup flow.

### Super-admin regression

A major regression was fixed earlier in this session window:

- Firebase club admins were incorrectly landing in the all-clubs super-admin dashboard
- The shared access logic was tightened so normal club admins stay scoped to their own club
- Missing club-doc fallback no longer silently scans all clubs or creates new clubs with automatic super-admin rights

### Spectator/admin polish already landed before this handoff

Already live before the latest Director import change:

- spectator header contrast fixes
- club branding shell fixes
- shared spectator header color fixes
- admin/super-admin access scoping fix
- Director tab received the shared import wizard entry point

---

## Files Touched Most Recently

### `eggbeater-marketing/admin.html`

Main areas changed:

- Director shared import card now launches the shared wizard in Director host mode
- Shared bracket/futures wizard can run in `hostMode: 'director'`
- Step 3 no longer asks for a team name in Director host mode
- Full-sheet scan logic now supports tournament-wide import instead of team filtering
- Deploy branch now publishes to the Director package instead of writing team-local tournament games
- Draft persistence now keeps `hostMode`

### `eggbeater-waterpolo/admin.html`

Mirrored the same Director host-mode wizard logic so the next native build stays aligned with web.

---

## Key Behavioral Rules Now Expected

### Director host setup

Use Director shared import wizard when:

- a host club is setting up a tournament from a Google Sheet
- they need pools + full schedule imported into the hosted tournament package

It should not ask for a specific team name in this flow.

### Club admin importing from a hosted tournament

Use the Director code import flow when:

- a participating club wants to pull only its own team schedule from the host tournament

This is where team selection belongs.

### Shared mirroring rule

When fixing any of these surfaces, keep both repos aligned:

- spectator shell
- shared CSS
- `admin.html`
- Firebase/admin auth flow
- Director workflow

---

## Recommended Next Verification

The code is pushed and web is live, but these specific flows should be manually checked in browser/native:

1. Director tab -> shared standard wizard
   Confirm it does not ask for team name in Director host mode
2. Director tab -> shared Futures wizard
   Confirm it behaves the same way for full-sheet host import
3. Club admin -> director-code import
   Confirm team selection still appears there and still filters correctly
4. Firebase club admin login
   Confirm a normal club admin lands only in their club admin surface, not the all-clubs dashboard

---

## Known Boundaries

- The older Director schedule importer card still exists; it was not removed in this pass
- NJO wizard was left available in Director, but the core change here was the shared standard/futures host setup path
- Manual browser/native QA is still recommended for the exact Director flows above

---

## Resume Point

If work resumes from here, start with:

1. Verify Director host import in production on web
2. Verify a club-admin director-code import still prompts for teams correctly
3. If native packaging is needed, build from wrapper commit `0e49844`

If a new regression appears in Director import, inspect these areas first in `admin.html`:

- `bsIsDirectorHost`
- `bsWizardHtml`
- `bsFindTeam`
- `bsParseCourseSched`
- `bsScanGames`
- `bsDeploy`
- Director render block where shared import cards are injected

---

## Late Update - Hosted Bracket Resolution

After the original handoff, the Hydres hosted tournament package `XHD2BG` was pushed through a long round of production debugging.

### What finally fixed Hydres Full Draw

The critical root cause was in the published Director package shape, not just the renderer:

- `importedSchedule` rows in the live package used `team1Name` / `team2Name`
- the hosted `Full Draw` path was reading only `myTeam` / `opponent`
- so the spectator app silently dropped the hosted division schedule and fell back to generic rebracket lane cards

The final production fix narrowed hosted `Full Draw` to:

- pool games whose teams belong to the selected hosted age-group/division
- bracket games referenced by that division's published hosted rebracket block
- schedule rows read from either `myTeam` / `opponent` or `team1Name` / `team2Name`

### Resulting expected behavior

- `My Path`:
  - only the selected team's scheduled games
- `Full Draw`:
  - division scoreboard for the full hosted division
  - pool games plus bracket games for that division
  - uses live/director score data when present

### Verified live package clue

When the live package for `XHD2BG` was fetched directly, it showed:

- `importedSchedule` present and flat
- `ageGroupName` values like `Masters Division 1`, `Masters Division 2`, `Masters B`
- hosted bracket paths still published as team-based lane maps under `importedBracketPaths`

That package fetch was what finally exposed the mismatch between published schedule rows and spectator render expectations.

### Follow-up still worth doing

Even though the blocker was resolved, these remain worthwhile:

1. Add a small debug/admin-only inspector for live Director package contents by code, so hosted-package regressions can be diagnosed without blind UI patching.
2. Normalize Director package schedule rows at publish time to one canonical shape:
   - `gameNum`
   - `ageGroupName`
   - `myTeam`
   - `opponent`
   - `date`
   - `dateISO`
   - `time`
   - `location`
3. Clean up `Full Draw` desktop formatting for hosted division scoreboards, especially spacing/card sizing.
4. Keep monitoring Hydres-style hosted imports, because this path now depends on package shape consistency more than local tournament state.

---

## 2026-04-25 Game-Day Scoring Hotfix

After first live games of the day, four scorer issues were reported. Three were patched directly in `app.js` and mirrored into the wrapper; the fourth was improved but still needs live confirmation on device.

### Fixed in code

1. Simultaneous scoring conflict for different games in the same club/division
   - Previous behavior:
     - scorer conflict detection treated any open scorer session in the same context as a blocker
     - example: `680 Red` and `680 Blue` at the same time could interfere with each other
   - Fix:
     - local unfinished-session detection is now scoped to the exact game key
     - scorer mirror payloads now send game-scoped identifiers (`scopedKey`) instead of only the age-group key
   - Intended result:
     - multiple people can score different games at the same time
     - only same-game scoring should conflict

2. Timeout lost the quarter clock
   - Previous behavior:
     - timeout ended and the scorer returned to the quarter with `0:00`
   - Fix:
     - timeout now stores:
       - resume phase
       - remaining quarter seconds
       - frozen quarter clock string
     - when timeout ends, it resumes the quarter clock from that saved state

3. Manual sprint fallback was missing
   - Fix:
     - added a `Sprint` button back into the scorer timing controls as a manual fallback
     - this is intended for cases where quarters are started manually and sprint tracking still needs to be recorded

### Still needs live verification

4. Live Activities reliability
   - I added extra Live Activity timer pushes on timeout start/end, and the simultaneous-game scorer lock fix may also reduce update churn.
   - However, this was not fully re-verified on-device in the same turn.
   - Treat this as:
     - improved in code
     - not fully proven until the next native/live test

### Commit anchors

- Web/source repo hotfix commit: `9291572`
- Wrapper repo hotfix commit: `64f01ad`

### Tomorrow morning checks

1. Verify two simultaneous scorers on different games no longer conflict.
2. Verify timeout resumes the correct quarter clock.
3. Verify manual `Sprint` control is present and usable.
4. Verify Live Activities update through:
   - score changes
   - timeout start
   - timeout end
   - finalization
