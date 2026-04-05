# Eggbeater Water Polo — Web App

Progressive Web App (PWA) and web source bundle for Eggbeater Water Polo. Deployed to Vercel at [eggbeater.app](https://eggbeater.app). Also rsynced into the native iOS/Android shell at build time by the [eggbeater-waterpolo](https://github.com/pipers4323/eggbeater-waterpolo) Codemagic pipeline.

---

## Architecture

```
eggbeater-marketing/
  ├── index.html        ← App shell (club picker → tab UI)
  ├── app.js            ← Main app logic (schedule, scores, roster, bracket, history)
  ├── firebase.js       ← Auth (Google Sign-In), Firestore prefs sync
  ├── tournament.js     ← Tournament data model (injected per-club)
  ├── live-update.js    ← Android Live Update notification chip bridge
  ├── styles.css        ← All app styles
  ├── sw.js             ← Service worker (cache-first, versioned)
  ├── admin.html        ← Club admin panel
  ├── widget-sync.js    ← [native builds only] Widget data bridge (from waterpolo repo)
  ├── manifest.json     ← PWA manifest
  └── vercel.json       ← Vercel deploy config (no-cache headers for index.html)
```

---

## Deployment

**Web (PWA):** Push to `main` → Vercel auto-deploys to `eggbeater.app`.

**Native apps:** Codemagic clones this repo and rsyncs it into `www/` inside the `eggbeater-waterpolo` native shell. No action needed here — pushing to `main` is enough.

---

## Service Worker cache

**Always bump the SW cache version after any JS/CSS change**, or fixes will be invisible inside the native app (WKWebView / Android WebView serve stale cached files).

Two places to update — must match:
1. `sw.js` — `const CACHE = 'ebwp-vN'`
2. `index.html` — `<script src="app.js?v=N">` (and other asset references)

Current version: tracked in `sw.js` first line.

---

## Key systems

### Auth (`firebase.js`)
- Google Sign-In via Capacitor Social Login plugin
- iOS: `signInWithCustomToken` via Cloudflare Worker proxy (WKWebView blocks direct Firebase calls)
- Android: `GetGoogleIdOption` with `style: 'bottom', forcePrompt: true` (avoids Credential Manager cooldown)
- `fbSavePrefs()` — persists `myPlayers`, `selectedTeams`, `joinedClubs`, `clubId`/`clubName`/`clubType` to Firestore
- `fbLoadPrefs()` — restores all prefs on sign-in; auto-navigates to saved club if on splash screen

### Live scoring (`app.js`)
- Scorer writes to Cloudflare Worker `live:{gameId}` (8h TTL)
- Viewers poll every 5s via `pollLiveScores()`
- `broadcastAt` timestamp used to distinguish live vs. historical games
- `isGameLive()` priority: remote `broadcastAt` wins over local `myGames` history

### Live Activity / Live Update
- **iOS:** `LiveActivityPlugin.swift` (Capacitor plugin) → ActivityKit
- **Android:** `LiveUpdatePlugin.java` (Capacitor plugin) → foreground service notification chip
- Both triggered from `app.js` via `window.Capacitor.Plugins.LiveActivity` / `LiveUpdate`
- **Critical:** use `window.Capacitor.Plugins.PluginName` not `Capacitor.registerPlugin()` in vanilla JS

### Widgets (`_syncWidgetsAll()` in `app.js`)
- **iOS:** calls `LiveActivity.updateWidgetData()` → UserDefaults App Group `group.com.eggbeater.waterpolo`
- **Android:** calls `LiveUpdate.updateWidgetData()` → SharedPreferences `com.eggbeater.waterpolo.widgets`
- Platform detected via `window.Capacitor.getPlatform()`
- Keys differ per platform — see widget key table in [eggbeater-waterpolo README](https://github.com/pipers4323/eggbeater-waterpolo)

### Multi-club branding
- `applyClubBranding(primary, secondary)` — sets CSS vars + widget colors
- `applyClubLogo(url)` — downloads and caches club logo for native widgets
- Each club has its own `tournament.js` injected via KV

### Subscriptions (RevenueCat)
- 4 tiers: Free / Parent ($4.99/mo) / Club / Tournament Host
- `ENFORCE_TIERS = true` in both `admin.html` files
- `parentHasFeatureByTier()` checks entitlement case-insensitively (RC returns `Parent` with capital P)

---

## Cloudflare Worker

`worker.js` is deployed separately via `wrangler.toml` in the `eggbeater-waterpolo` repo.

Key endpoints used by this app:

| Endpoint | Purpose |
|----------|---------|
| `POST /google-sign-in` | iOS Google Sign-In proxy → Firebase custom token |
| `GET /live-scores?tournamentId=` | Poll live game scores |
| `POST /broadcast-score` | Write live score (scorer path) |
| `GET /team-data?club=&team=` | Fetch roster + schedule from KV |
| `GET /club-logo?club=` | Fetch club logo (HTTPS, for SwiftUI AsyncImage) |
| `POST /send-push` | Send push notification to followers |

---

## Important rules (don't break these)

### Date parsing
`parseGameTime()` must use `new Date(dateISO + 'T00:00:00')` (local midnight), **not** `new Date(dateISO)` (UTC midnight). UTC causes games to show on the wrong day in non-UTC timezones.

### 50-minute grace period
`isGameLive()` includes a 50-minute grace window after the scheduled start time so games show as potentially live before the scorer taps Start.

### Live Activity / Live Update checks (6 fixes — verify after any `app.js` edit)
1. Plugin accessed via `window.Capacitor.Plugins.LiveActivity` / `LiveUpdate`
2. Period field is `score.period` not `score.quarter`
3. `updateActivity` called on every scoring action (not just `startActivity`)
4. Viewer polling skips `isScorerUnlocked()` games only, not all `myGames`
5. `broadcastAt` timestamp used for live state detection
6. Final/pre game state properly ends the Live Activity

---

## Vercel config (`vercel.json`)

`index.html` is served with `Cache-Control: no-cache` so the PWA shell always fetches fresh on load. All other assets are long-cached by the SW.
