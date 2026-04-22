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
