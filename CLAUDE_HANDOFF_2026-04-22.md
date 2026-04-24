# Eggbeater Water Polo — Claude Handoff (2026-04-22)

## Status: Native build triggered. Ready for tournament weekend.

---

## Repo State

| Repo | HEAD | Status |
|------|------|--------|
| `eggbeater-marketing` | `d39e2cb` | ✅ Pushed, Vercel auto-deployed |
| `eggbeater-waterpolo` | `bcd33ea` | ✅ Pushed, ready for next native build |

### SW Versions
- **Marketing (web PWA):** `ebwp-v180` / `?v=272`
- **Waterpolo www/ (native bundle):** `ebwp-v178` / `?v=270`
- `www/app.js` is byte-for-byte identical to `marketing/app.js` ✅

---

## What Was Built This Session

### 1. Admin Panel — All Tier 1-3 UI Improvements
Both `admin.html` files updated:

**Tier 1 (highest impact):**
- Auto-save BSSync wizard state per-team to localStorage (`ebwp-bsync-draft-{team}`)
- bsAutoPoll change toast — green on change, red on fetch failure (8s)
- Game conflict detector before deploy (50-min pool overlap check)
- Rollback / undo last deploy (localStorage snapshot + "↩ Undo" in Danger Zone)

**Tier 2:**
- BSSync import diff at step 6 (+N new · M updated · removed · date changed)
- Search/filter in Add Games tab (live text filter)
- Tournament status badges (● Live / ⏳ Upcoming / ✓ Complete) with local-time date
- Copy tournament as template

**Tier 3:**
- Sticky "⚠️ Unsaved changes" amber banner + beforeunload warning
- Audit log in Danger Zone (localStorage, capped 50 entries)

### 2. Spectator App — All Tier 1-3 UI Improvements
`app.js` + `index.html` in both repos:

**Tier 1:**
- Pull-to-refresh (60px pull on Schedule/Scores tabs)
- Next game sticky countdown card (amber, 1-min interval, auto-removes)
- Score pulse animation on live score change
- Day picker (horizontal chips when tournament spans multiple days)

**Tier 2:**
- Offline indicator banner ("📶 Offline — showing cached data")
- Share button on completed game cards (Web Share API + clipboard)
- Game notes display (admin sets in game editor; shows as `📌 callout` to spectators)
- Context-aware empty states on Schedule and Scores tabs

**Tier 3:**
- Visual bracket tree in Bracket tab (CSS flex tree from path data)
- Haptic feedback on live/score card taps (Capacitor Haptics)

### 3. Game-Day Reliability Fixes (CRITICAL — applied before build)

**bsAutoPoll game merge** — previously destroyed on every poll cycle:
- Admin notes (`note` field) — sheet never supplies these, were silently wiped every 1-5 min
- Manual cap overrides (`cap` field)
- Existing scores when sheet cell is blank (prevented accidental score wipe)

**bsAutoPoll fetch failure** — was silently returning. Now shows red toast with HTTP status.

**Wizard draft namespace** — changed from `ebwp-bsync-draft` to `ebwp-bsync-draft-{team}` to prevent cross-age-group contamination.

**styles.css cache mismatch** — index.html had `?v=254` while sw.js cached `?v=272`. Fixed to `?v=272`.

**Tournament status badge** — was using UTC date, could show "Complete" during US evening hours. Fixed to `toLocaleDateString('en-CA')`.

---

## Architecture Reminders

### Two-repo structure
- **eggbeater-marketing** → Vercel (browser PWA + admin web)
- **eggbeater-waterpolo** → Cloudflare Worker (backend) + Codemagic (native iOS/Android)
- Codemagic build: clones marketing → rsync into `www/` → overlays waterpolo's `admin.html` + `widget-sync.js`
- So `www/app.js` in waterpolo must be kept manually in sync with `marketing/app.js`

### After any app.js or styles.css change
1. Bump SW cache in `sw.js` (`CACHE` + `VER`) — both repos
2. Update `index.html` version query strings — both repos
3. Trigger Codemagic native build (SW bump alone only updates browser PWA)

### BSSync two-code-path rule
`bsScanGames()` and `bsAutoPoll()` have duplicated game construction logic. Any fix to one MUST be applied identically to the other. This has caused multiple bugs where manual import was fixed but auto-sync still overwrote data.

### bsAutoPoll game merge rule (NEW — 2026-04-22)
Always preserve `note`, `cap`, and existing scores when sheet doesn't supply new values. See `feedback_bsync_date_bugs.md` Bug 5 for the exact merge code.

---

## What's NOT Done / Follow-ups

### Native build verification
After Codemagic build completes:
- [ ] Verify all 10 spectator app features work on device
- [ ] Verify pull-to-refresh gesture on Schedule tab
- [ ] Verify haptic feedback on iOS
- [ ] Verify day picker if tournament spans multiple days

### BSSync tournament day checklist
Before running BSSync on tournament day:
- [ ] Confirm Google Sheet is set to "Anyone with the link can view"
- [ ] Run full 7-step wizard for each age group (don't skip)
- [ ] After deploy, verify games appear on Schedule tab with correct dates
- [ ] Set auto-sync interval (1-5 min) and verify green toast fires
- [ ] Add admin notes to games AFTER BSSync wizard completes (notes survive auto-sync now ✅)

### Known post-tournament TODOs
- Push SW sheet config: SHEET_ID/TEAM_NAME hardcoded in both sw.js files — should move to CF Worker
- Admin password in localStorage is plaintext — Google Sign-In is the secure path
- Scoring password in public tournament.js — accepted tradeoff, documented

---

## Memory Files Updated This Session
- `project_eggbeater_app_state.md` — full state update with all commits and new features
- `feedback_bsync_date_bugs.md` — Bug 5 added (bsAutoPoll note/score preservation)
- `project_ui_reference.md` — updated with all new spectator and admin UI features

## Key Commit Hashes
```
eggbeater-marketing:
  1ba42f2  Pre-launch fixes (styles.css + tournament badge UTC)
  296d702  Fix 4 game-day reliability bugs
  f2da684  Add 10 spectator UI improvements
  4f72e60  Admin panel Tier 1-3 UI improvements

eggbeater-waterpolo:
  10db775  Sync www/app.js with marketing
  84f6100  Pre-launch fix (tournament badge UTC)
  61f028a  Fix 4 game-day reliability bugs
  5573b5e  Harden bsAutoPoll (mid-wizard guard + visibilitychange)
```

---

## 2026-04-22 Follow-up Update

### Latest build-ready heads
```
eggbeater-marketing:
  fa7cb39  Polish spectator cards, Futures Blue bracket import, admin recovery health strip

eggbeater-waterpolo:
  2e1c082  Sync spectator/admin polish bundle for next native build
```

### Futures 14u special-case import
- Google Sheet checked: `1n7y7fVM7RWku9yzqyx5sIxwdOTvDuXInV-Q0nLW9c7c` / gid `582713701`
- For this sheet only, 14u Girls Futures import now treats:
  - `680 A` / Red as locked to `Campo HS / SODA AC`
  - `680 B` / Blue as locked to `Independence HS`
- Blue bracket path from the official sheet:
  - current game: `Game 2` vs `ARWPC` at `Independence HS`
  - if Blue loses `Game 2` → `Game 5` at `12:50 PM`
  - if Blue wins `Game 2` → `Game 6` at `1:40 PM`
- Red has no additional bracket path on this sheet after its round-robin games.

### Spectator polish added
- Scores cards visually aligned to Schedule cards
- Scores `Follow Live` moved to the top-right to match Schedule card placement
- Schedule no longer shows misleading `No games today` below an already-featured next game
- Native header compacted further:
  - smaller logo block
  - tighter tournament strip
  - smaller team picker chrome
- `Last updated` timestamp now appears beside refresh controls after pull-to-refresh / force refresh

### Admin polish added
- Recovery tab now has a compact health strip:
  - active sessions
  - drafts needing action
  - conflicts
  - last sheet sync
  - last scorer update
- `Clear` mirrored draft action now has explicit destructive confirmation text

### Next build source
- Trigger native build from:
  - `C:\Users\sarah\Claude Code\eggbeater-waterpolo` at `2e1c082`

---

## 2026-04-22 Late Follow-up Update

### Latest shipped heads
```
eggbeater-marketing:
  f9bf952  Polish mobile draw and extract bracket import

eggbeater-waterpolo:
  8fee05d  Sync mobile draw and bracket import assets
```

### What changed in this batch
- Full Draw redesign is now live in web and synced to native assets:
  - pool cards grid
  - clearer Red / Blue highlighting
  - official vs projected path badges
  - lane cards with better hierarchy
  - mobile legend and tighter spacing
- Spectator card rendering has more shared helpers:
  - shared Follow Live button builder
  - shared schedule/scores card meta builders
- Admin recovery UI was cleaned up further:
  - shared empty-state helper
  - shared summary-pill helper
  - conflicts-only filter / stale-session chip / stale sheet-sync note remain in place
- Futures-specific bracket import logic has been extracted out of `admin.html` into:
  - `C:\Users\sarah\Claude Code\eggbeater-marketing\admin-bracket-import.js`
- Wrapper/native assets were synced and both Capacitor platforms were re-synced.

### Current build source
- Native build now being triggered from:
  - `C:\Users\sarah\Claude Code\eggbeater-waterpolo` at `8fee05d`

### Immediate follow-up after this build finishes
- [ ] Verify Full Draw redesign on native phone sizes
- [ ] Verify admin bracket wizard still computes Futures Blue path after extraction to `admin-bracket-import.js`
- [ ] Verify `admin-bracket-import.js` is included and loaded in native admin surface
- [ ] Verify Scores card height/spacing feels tighter on small phones
- [ ] Verify no regression in Recovery actions (`Restore Draft`, `Clear`, `Force Close`)

### Remaining polish / validation priorities
1. Real tournament-day validation on Saturday:
   - Blue/B-slot binding
   - manual-vs-official collision
   - scorer recovery / finalize ack
   - Live Activity reliability
2. If any admin wizard regression appears, inspect the new extraction boundary first:
   - `admin-bracket-import.js`
   - `bsComputeKap7FuturesSpecialPaths(...)` delegate in `admin.html`
3. If spectator polish still feels off, next smallest deltas should be:
   - further trim Full Draw mobile step density
   - further reduce Scores card vertical whitespace
   - remove any remaining inline styles from Admin Recovery cards

---

## 2026-04-22 Final UI Follow-up

### Latest shipped heads
```
eggbeater-marketing:
  ab9c87b  Fix bracket tab section visibility on web

eggbeater-waterpolo:
  d8d0d54  Sync bracket tab visibility fix into wrapper
```

### What was shipped after the earlier handoff
- Spectator history/data repair
  - Marin Earth Day history split and stale combined-entry pruning
  - archive/history cleanup fixed for keyed `bracket.paths`
  - live worker rebuild preserves 680 A / 680 B separation
- Card system unification
  - Schedule featured `next-game-card` now shares the same base shell as `game-card`
  - modifiers retained for:
    - featured
    - projected
    - dark caps
    - white caps
- Web/native branding alignment
  - desktop web now uses the same royal-blue branded shell as native
  - Schedule and Scores utility bars are readable on web
  - `Login to Score`, `Refresh Scores`, `No active games`, and guide links were re-styled for visibility
- History / Bracket / footer visibility fixes
  - History accordion headers now use high-contrast branded headers
  - Bracket tab copy, section labels, and toggle row are readable on the blue shell
  - footer legal links have higher contrast
- Wrapper sync
  - latest shared `app.js`, `styles.css`, and `index.html` changes were synced into native assets
  - both `npx cap sync ios` and `npx cap sync android` completed

### Current build source
- Trigger native build from:
  - `C:\Users\sarah\Claude Code\eggbeater-waterpolo` at `d8d0d54`

### Current assessment
- All UI improvements shipped today are applied in the latest web build and synced into the latest native wrapper build source.
- The earlier handoff sections above are stale with respect to the final shipped heads and should not be used as the build source reference.

### Immediate post-build checks
- [ ] Verify Bracket tab visibility on native matches web
- [ ] Verify History headers and section labels are readable in both light and dark mode
- [ ] Verify Schedule / Scores shared card shell looks consistent on native
- [ ] Verify utility rows (`Refresh`, `Login to Score`, `Last updated`) are readable in both light and dark mode

---

## 2026-04-22 Final Build Source Update

### Latest shipped heads
```
eggbeater-marketing:
  1f3a319  Fix possible games heading visibility on bracket tab

eggbeater-waterpolo:
  671d652  Sync possible games heading fix into wrapper
```

### Current native build source
- Trigger the current native build from:
  - `C:\Users\sarah\Claude Code\eggbeater-waterpolo` at `671d652`

### Confirmed included in this native build source
- Pull-to-refresh on `Schedule` and `Scores`
- Next-game sticky countdown card
- `Scores` `Follow Live` placement aligned to top-right like `Schedule`
- `Schedule` no longer shows misleading `No games today` below a featured next-game card
- Native header compaction:
  - smaller logo block
  - tighter tournament strip
  - smaller team picker chrome
- Web/native branded blue spectator shell alignment
- History visibility fixes
- Bracket tab visibility fixes, including `Possible Games`

### Immediate follow-up after build installs
- [ ] Recheck Bracket tab visibility on native
- [ ] Recheck `Possible Games` heading visibility on native
- [ ] Recheck History readability in both light and dark mode
- [ ] Recheck shared Schedule / Scores card treatment on native

---

## 2026-04-22 Late Native Fix Pass

### Latest shipped heads
```
eggbeater-marketing:
  363aca8  Fix native schedule and bracket readability

eggbeater-waterpolo:
  33fc3c4  Sync native schedule and bracket readability fixes
```

### Included in the current native build source
- Schedule cleanup
  - schedule utility rows no longer inject extra refresh buttons
  - only the bottom Schedule refresh control should remain
  - shared refresh path remains wired through pull-to-refresh and manual refresh
- Native bracket readability
  - white-card bracket sections forced readable in both light and dark mode
  - `Official` badges, bracket headers, and path meta forced to dark text on light cards
  - `Possible Games` headings and empty-state copy forced readable
- Native Full Draw readability
  - pool snapshot, legend, lane cards, and meta text forced readable on the white card shell
- Native Scores detail tabs
  - inactive `Play-by-Play` / `Summary` buttons forced to white text on dark buttons
- Mojibake cleanup
  - shared text normalization now fixes common `â€“` / `â€”` sequences in escaped strings
  - header subtitle normalization now also runs before textContent assignment

### Current native build source
- Trigger the current native build from:
  - `C:\Users\sarah\Claude Code\eggbeater-waterpolo` at `33fc3c4`

### Tournament validation timing
- Full tournament-day validation is scheduled to occur in 3 days.
- Until then, only regression fixes and reliability hardening should be added; avoid broad feature changes.

### Next validation checklist
- [ ] Confirm Schedule shows only one `Force Refresh` button per tab state on native
- [ ] Confirm pull-to-refresh visibly refreshes Schedule and Scores
- [ ] Confirm Bracket `My Path` and `Full Draw` text are readable in both light and dark mode
- [ ] Confirm `Play-by-Play` inactive button text is readable in native dark mode
- [ ] Confirm header copy no longer shows `â€“` mojibake in native

---

## 2026-04-22 Admin Recovery Cleanup Commit

### Latest shipped heads
```
eggbeater-marketing:
  PENDING  Admin recovery cleanup/refactor commit after native fix pass

eggbeater-waterpolo:
  33fc3c4  Sync native schedule and bracket readability fixes
```

### Included in the admin cleanup/refactor pass
- Admin Recovery filters
  - `Conflicts Only`
  - `Needs Final`
  - `Show All`
- Active session actions
  - `Force Close`
  - `Clear Lock`
- Mirrored draft state distinction
  - `Mirrored Draft`
  - `No Durable Game Yet`
  - `Final Saved`
- Lightweight admin exports
  - drafts
  - sessions
  - conflicts
- Recovery UI cleanup
  - shared recovery card classes
  - shared toolbar / summary / button styles
  - reduced inline styling in recovery render paths

### Notes
- This is an admin-only follow-up; it does not change the current native build source.
- Full tournament-day validation is still scheduled in 3 days.

---

## 2026-04-23 Admin Recovery + Futures Import Stabilization

### Current shipped web head
```
eggbeater-marketing:
  0476d06  Preserve venue targets in hosted imports
```

### What was recovered and re-shipped after `admin.html` corruption
- Superadmin recovery and club-picker flow restored
  - superadmins land on club picker again
  - `Switch Club` restored for superadmins
- Standard `Bracket Sheet Sync` and separate `Futures Bracket Import Wizard` both restored
- Mobile admin header / drawer UI re-applied
  - compact logo/header treatment
  - overflow / More drawer actions
  - drawer `Switch Club`
- Team manager UI polish re-applied
- Remaining admin surface polish from the missing recovery window re-applied

### Futures wizard work completed
- Google Sheets API path is now live in the Futures wizard
- Google OAuth/browser flow is wired and tested
- Futures flow stays inside the Futures wizard card instead of jumping into the standard wizard
- Legend detection hardened for:
  - merged labels
  - offset labels
  - shared-tab mixed age-group sheets
- Fixed stale `gid` state overriding the active pasted sheet URL
- Hardened Sheets API fetch path
  - timeout on stuck legend reads
  - removed fragile `fields=` filter that caused 400s
- Fixed missing helper regression:
  - `normalizeOpponentName is not defined`
- Fixed 18u parsing issues on the shared Futures tab
  - pool now comes from the actual pool column
  - mixed-age schedule scanning filters correctly by selected group
  - downstream `W-Game` / `L-Game` follow-on paths are detected
- Follow-on path detection generalized for imported teams instead of one narrow hard-coded case
- `14u Blue` bracket path wipeout investigated and addressed
  - root destructive deploy bug fixed
  - rerunning the Futures import restored the missing Blue path

### New manual correction support in the wizard
- Malformed sheet rows can now be fixed directly in Step 4 and the fixes persist
- Current manual correction support:
  - date overrides
  - per-row manual fixes for malformed imported rows
    - game number
    - opponent
    - time
    - location
- These corrections persist in `tournament.sheetSync` and are re-applied on later syncs

### Venue / maps fix (new)
- Imported games now support a separate directions target behind the displayed venue label
- Step 4 now includes `Confirm venue directions target`
  - short venue label stays visible on the spectator card
  - directions use the confirmed Google location / full address
- Venue targets are now preserved across later syncs
  - they are only replaced if the sheet venue itself changes
- This preservation rule now applies across:
  - Futures wizard
  - standard `Bracket Sheet Sync`
  - `Import from Hosted Tournament`
- Spectator app now prefers the saved directions target instead of routing only from the raw display label

### BSSync / deploy fixes verified live in this window
- `bsAutoPoll` and deploy path fixes remained in place
- Tournament metadata inferred from sheet deploy
- Header refresh after deploy fixed
- lingering `stayTuned` flag cleared on normal deploy
- keyed bracket paths preserved on deploy instead of being overwritten

### Practical validation completed
- Real Futures Google auth flow works
- Real 16u Futures import works
- Real 18u Futures import works
- Real Santa Cruz imports worked after malformed-row handling
- Venue confirmation flow worked across all teams tested by the user

### What still remains worth testing
- Standard non-Futures bracket import should get one more live smoke test after all Futures work:
  - paste URL
  - fetch pools
  - find team
  - game scan
  - re-bracket fetch
  - deploy
- Native/web parity still needs a fresh pass in `eggbeater-waterpolo`
  - all current work above was done in `eggbeater-marketing`
  - if native build parity matters for this admin surface, mirror the shared changes there

### Notes for the next agent
- `admin.html` went through a broad recovery from `old_admin.html`, then targeted re-application passes
- Do not assume the file is byte-identical to a pre-corruption snapshot; treat current state as reconciled-by-behavior
- The user is specifically nervous about lost work from the recovery window, so claims about “everything is included” should stay evidence-based
- If anything around venue sync regresses again, inspect these concepts first:
  - `sourceLocation`
  - `locationAddress`
  - `locationQuery`
  - `venueOverrides`
  - `bsPreserveManualLocation()`

---

## Post-Launch Debugging and Recovery Status (2026-04-23)

### Admin recovery / shared workflow
- `admin.html` was recovered after a corruption/mojibake incident, then re-reconciled in behavior with the missing mobile/admin work.
- Superadmin recovery is live again:
  - club picker restored
  - `Switch Club` restored
  - mobile header / drawer controls restored
- Standard `Bracket Sheet Sync` and a separate `Futures Bracket Import Wizard` are both live again.

### Futures Bracket Import Wizard
- Google Sheets API auth flow is working end to end.
- The dedicated Futures wizard now stays inside its own card for the full flow.
- Legend detection is hardened for:
  - merged labels
  - offset labels
  - shared mixed-age tabs
- Fixed stale `gid` overrides, stuck legend reads, and the broken `fields=` request path.
- Fixed the `normalizeOpponentName is not defined` regression.
- Real-world validation completed on:
  - 16u Futures tab
  - 18u Futures tab
  - Santa Cruz sheet
- Current live behavior also includes:
  - mixed-age schedule parsing
  - follow-on `W-Game` / `L-Game` path detection
  - group-specific 18u filtering
  - malformed-row correction in Step 4 with persistent overrides
  - venue confirmation in Step 4 with persistent directions targets
  - auto-generated tournament IDs on wizard deploy

### Deploy / history / tournament lifecycle fixes
- Deploy no longer wipes keyed team bracket paths on re-import.
- Tournament metadata is inferred or refreshed correctly on deploy.
- Lingering `stayTuned` flags are cleared on deploy.
- Spectator history collision protections are live:
  - duplicate repaired history entries dedupe correctly
  - conflicting tournament IDs no longer overwrite each other as easily
- Tournament lifecycle behavior changed:
  - once tournament dates pass, spectator falls back to `Stay Tuned`
  - completed events remain in `History`

### Help surfaces updated
- Web/admin help updated in `eggbeater-marketing`:
  - in-app admin Help tab (`admin.html`)
  - `admin-guide.html`
  - `admin-guide.i18n.js`
  - `spectator-guide.html`
  - `spectator-guide.i18n.js`
- Native help updated in `eggbeater-waterpolo`:
  - `admin.html` + `admin-guide.html` mirrored
  - in-app spectator help strings in `app.js`
  - standalone native spectator guide in `parent-guide.html`

### Current repo heads for this handoff
- `eggbeater-marketing`: `d39e2cb`
  - docs: update help surfaces for current tournament flows
- `eggbeater-waterpolo`: `bcd33ea`
  - docs: refresh native spectator help surfaces

### Follow-ups still worth doing
- Trigger a fresh native build from `eggbeater-waterpolo` after `bcd33ea` so the installed app picks up the updated help copy and current shared web behavior.
- Do one final live smoke test of the standard non-Futures `Bracket Sheet Sync` path:
  - paste URL
  - fetch pools
  - find team
  - game scan
  - re-bracket fetch
  - deploy
- If more history anomalies appear, inspect both:
  - tournament ID reuse in admin flows
  - existing corrupted local/device history that may need one-time repair logic

### Notes for the next agent
- The user is understandably nervous about regressions after the `admin.html` recovery. Keep claims evidence-based.
- Treat `eggbeater-marketing` as the primary shared web/admin surface, but verify whether a native-only help or UI surface exists before assuming a mirror already covers it.
- Do not stage `.wrangler` state files or unrelated `worker.js` changes when making native repo follow-up commits unless the task explicitly calls for them.