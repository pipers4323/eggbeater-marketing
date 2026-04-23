# Eggbeater Water Polo — Claude Handoff (2026-04-22)

## Status: Native build triggered. Ready for tournament weekend.

---

## Repo State

| Repo | HEAD | Status |
|------|------|--------|
| `eggbeater-marketing` | `1ba42f2` | ✅ Pushed, Vercel auto-deployed |
| `eggbeater-waterpolo` | `10db775` | ✅ Pushed, Codemagic build triggered |

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
