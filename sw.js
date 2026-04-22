/**
 * Eggbeater Water Polo — Service Worker
 * =========================================
 * • App shell caching (offline support)
 * • Web Push handler: checks tournament sheet every 30 min,
 *   notifies parents when new games are added to the schedule
 */

const CACHE = 'ebwp-v179';
const VER   = '?v=271';   // bump alongside index.html script tags on every deploy
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css' + VER,
  '/app.js' + VER,
  '/tournament.js' + VER,
  '/manifest.json',
  '/icon.svg',
  '/logo_large.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE && k !== 'ebwp-known-games').map(k => caches.delete(k))
      )
    ).then(() => {
      // Navigate all open pages to a cache-busting URL so WKWebView is forced
      // to fetch fresh assets — postMessage + location.reload() is not enough
      // because WKWebView's native disk cache ignores JS reloads.
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
  self.clients.claim();
});

// Network-first: always try to fetch fresh, fall back to cache
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // In Capacitor native app (remote URL mode), don't cache-intercept the app's own pages
  // — the WebView loads directly from Vercel. Only pass through.
  if (url.hostname === 'eggbeater.app' && e.request.mode === 'navigate') return;

  // Network-first for workers.dev /team-data — always fetch fresh, cache as offline fallback
  if (url.hostname.includes('workers.dev') && url.pathname === '/team-data') {
    e.respondWith(
      caches.open('ebwp-team-data').then(async cache => {
        try {
          const res = await fetch(e.request);
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        } catch {
          // Offline: return cached version if available
          const cached = await cache.match(e.request);
          return cached || new Response('{"ok":false}', { status: 503, headers: { 'Content-Type': 'application/json' } });
        }
      })
    );
    return;
  }

  // Don't intercept Google API calls or external services
  if (url.hostname.includes('google') || url.hostname.includes('googleapis') ||
      url.hostname.includes('groupme') || url.hostname.includes('workers.dev')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ─── PERIODIC BACKGROUND SYNC (Android/Chrome) ────────────────────────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'check-schedule') {
    e.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'PERIODIC_SYNC_TRIGGERED' }));
      })
    );
  }
});

// ─── BACKGROUND SYNC (Offline Score Replay) ───────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'score-sync') {
    e.waitUntil((async () => {
      // If the app is open in a window, delegate to it to avoid racing on the same IndexedDB store
      const clients = await self.clients.matchAll({ type: 'window' });
      if (clients.length > 0) {
        clients.forEach(c => c.postMessage({ type: 'SYNC_SCORES' }));
        return;
      }
      // No app windows open — replay here in the service worker
      await _replayPendingScores();
    })());
  }
});

async function _replayPendingScores() {
  const PUSH_URL = 'https://ebwp-push.sarah-new.workers.dev';
  try {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('ebwp-offline', 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('pending-scores'))
          db.createObjectStore('pending-scores', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('tournament-cache'))
          db.createObjectStore('tournament-cache', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('pending-scores', 'readonly');
    const all = await new Promise(res => {
      const req = tx.objectStore('pending-scores').getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => res([]);
    });
    for (const entry of all) {
      if (entry.retryCount >= 10) {
        const dtx = db.transaction('pending-scores', 'readwrite');
        dtx.objectStore('pending-scores').delete(entry.id);
        continue;
      }
      try {
        const replayHeaders = { 'Content-Type': 'application/json' };
        if (entry.payload._scorePw) replayHeaders['X-Score-Password'] = entry.payload._scorePw;
        const res = await fetch(`${PUSH_URL}/live-score`, {
          method: 'POST',
          headers: replayHeaders,
          body: JSON.stringify(entry.payload),
        });
        if (!res.ok) {
          if (res.status === 400 || res.status === 401) {
            const dtx = db.transaction('pending-scores', 'readwrite');
            dtx.objectStore('pending-scores').delete(entry.id);
            continue;
          }
          throw new Error('fail');
        }
        const dtx = db.transaction('pending-scores', 'readwrite');
        dtx.objectStore('pending-scores').delete(entry.id);
      } catch {
        const utx = db.transaction('pending-scores', 'readwrite');
        utx.objectStore('pending-scores').put({ ...entry, retryCount: entry.retryCount + 1 });
        throw new Error('Still offline'); // tells Background Sync to retry
      }
    }
    // Notify app
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.postMessage({ type: 'SCORES_SYNCED' }));
  } catch (e) {
    throw e; // Re-throw so Background Sync retries
  }
}

// ─── SHEET CONFIG ─────────────────────────────────────────────────────────────
// ⚠️  BETA LIMITATION: These values are hardcoded for a specific tournament.
// They are baked into every installed SW regardless of which club is using the app.
// Push notifications for new games will only work correctly for the club/tournament
// that matches SHEET_ID, TEAM_NAME, and TOURNAMENT_DATES below.
// TODO (post-beta): Move game-detection logic into the CF Worker so it can be
// configured per-club server-side, and send the full notification body as push payload.
//
// Update SHEET_GID each tournament day when the league posts the new schedule tab.
// To find the GID: open the sheet, click the tab, look at the URL: ...#gid=XXXXXXXX
const SHEET_ID   = '1f-nUWyb2TiydKk8eYQGxGvzsYQ80MLqxNIi2G_Ps7x0';
const SHEET_GID  = '1573007784'; // ← update per tournament day if needed
const TEAM_NAME  = 'Team';        // matches any team name containing "Team"

// Tournament day → ISO date  (keep in sync with tournament.js)
const TOURNAMENT_DATES = {
  'day 1': '2026-01-10',
  'day 2': '2026-03-07',
  'day 3': '2026-04-25',
};

const DEFAULT_SHEET_CONFIG = {
  sheetId: SHEET_ID,
  gid: SHEET_GID,
  teamName: TEAM_NAME,
  tournamentDates: TOURNAMENT_DATES,
  cacheKey: 'default-diablo-alliance',
  dateCol: 0,
  locationCol: 1,
  timeCol: 2,
  whiteTeamCol: 3,
  whiteScoreCol: 4,
  darkTeamCol: 5,
  darkScoreCol: 6,
  gameNumCol: 7,
};

// ─── KNOWN-GAMES PERSISTENCE (Cache API, accessible in SW context) ────────────

async function getKnownGames(cacheKey = DEFAULT_SHEET_CONFIG.cacheKey) {
  try {
    const cache = await caches.open('ebwp-known-games');
    const res   = await cache.match(`/known-games-${cacheKey}.json`);
    if (!res) return {};
    return await res.json();
  } catch { return {}; }
}

async function saveKnownGames(games, cacheKey = DEFAULT_SHEET_CONFIG.cacheKey) {
  try {
    const cache = await caches.open('ebwp-known-games');
    await cache.put(`/known-games-${cacheKey}.json`, new Response(JSON.stringify(games), {
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (e) {
    console.error('SW: saveKnownGames failed:', e.message);
  }
}

async function getSheetConfig() {
  try {
    const cache = await caches.open('ebwp-sheet-config');
    const res = await cache.match('/sheet-config.json');
    if (!res) return [DEFAULT_SHEET_CONFIG];
    const config = await res.json();
    const configs = Array.isArray(config?.configs) ? config.configs : [config];
    return configs.map(cfg => ({
      ...DEFAULT_SHEET_CONFIG,
      ...cfg,
      tournamentDates: Object.prototype.hasOwnProperty.call(cfg || {}, 'tournamentDates')
        ? (cfg?.tournamentDates || {})
        : DEFAULT_SHEET_CONFIG.tournamentDates,
    }));
  } catch {
    return [DEFAULT_SHEET_CONFIG];
  }
}

async function saveSheetConfig(config) {
  try {
    const cache = await caches.open('ebwp-sheet-config');
    await cache.put('/sheet-config.json', new Response(JSON.stringify(config), {
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (e) {
    console.error('SW: saveSheetConfig failed:', e.message);
  }
}

// ─── MINIMAL CSV PARSER ───────────────────────────────────────────────────────

function parseCSVRows(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQ) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQ = true; }
      else if (c === ',') { row.push(field.trim()); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && next === '\n') i++;
        row.push(field.trim());
        if (row.some(f => f)) rows.push(row);
        row = []; field = '';
      } else { field += c; }
    }
  }
  row.push(field.trim());
  if (row.some(f => f)) rows.push(row);
  return rows;
}

function cleanTeamName(raw) {
  return (raw || '').replace(/^[A-Z]\d+-/i, '').trim();
}

function parseScoreValue(raw) {
  const str = String(raw || '').trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

function parseGameNum(raw) {
  const str = String(raw || '').trim();
  if (!str) return '';
  const match = str.match(/(?:game\s*#?\s*|#)(\d+)/i);
  return match ? match[1] : '';
}

function normalizeTimeLabel(raw) {
  const str = String(raw || '').trim();
  if (!str) return '';
  if (/\b(am|pm)\b/i.test(str)) return str.toUpperCase();
  const hm = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!hm) return str;
  const h = parseInt(hm[1], 10);
  return `${hm[1]}:${hm[2]} ${h >= 7 && h <= 11 ? 'AM' : 'PM'}`;
}

function parseDateToISO(raw) {
  const str = String(raw || '').trim();
  if (!str) return '';
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return str;
}

// ─── SHEET FETCHER ────────────────────────────────────────────────────────────

async function fetchGamesFromSheet(sheetConfig = DEFAULT_SHEET_CONFIG) {
  const sheetId = sheetConfig?.sheetId || DEFAULT_SHEET_CONFIG.sheetId;
  const gid = sheetConfig?.gid || DEFAULT_SHEET_CONFIG.gid;
  const team = (sheetConfig?.teamName || DEFAULT_SHEET_CONFIG.teamName || '').toLowerCase();
  const tournamentDates = Object.prototype.hasOwnProperty.call(sheetConfig || {}, 'tournamentDates')
    ? (sheetConfig?.tournamentDates || {})
    : DEFAULT_SHEET_CONFIG.tournamentDates;
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res  = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);

  const csv  = await res.text();
  const rows = parseCSVRows(csv);
  const games = {};
  const dateCol = Number.isInteger(sheetConfig?.dateCol) ? sheetConfig.dateCol : DEFAULT_SHEET_CONFIG.dateCol;
  const locationCol = Number.isInteger(sheetConfig?.locationCol) ? sheetConfig.locationCol : DEFAULT_SHEET_CONFIG.locationCol;
  const timeCol = Number.isInteger(sheetConfig?.timeCol) ? sheetConfig.timeCol : DEFAULT_SHEET_CONFIG.timeCol;
  const whiteTeamCol = Number.isInteger(sheetConfig?.whiteTeamCol) ? sheetConfig.whiteTeamCol : DEFAULT_SHEET_CONFIG.whiteTeamCol;
  const whiteScoreCol = Number.isInteger(sheetConfig?.whiteScoreCol) ? sheetConfig.whiteScoreCol : DEFAULT_SHEET_CONFIG.whiteScoreCol;
  const darkTeamCol = Number.isInteger(sheetConfig?.darkTeamCol) ? sheetConfig.darkTeamCol : DEFAULT_SHEET_CONFIG.darkTeamCol;
  const darkScoreCol = Number.isInteger(sheetConfig?.darkScoreCol) ? sheetConfig.darkScoreCol : DEFAULT_SHEET_CONFIG.darkScoreCol;
  const gameNumCol = Number.isInteger(sheetConfig?.gameNumCol) ? sheetConfig.gameNumCol : DEFAULT_SHEET_CONFIG.gameNumCol;

  for (const row of rows) {
    const white = cleanTeamName(row[whiteTeamCol] || '');
    const dark = cleanTeamName(row[darkTeamCol] || '');
    if (!white && !dark) continue;

    const isTeamWhite = white.toLowerCase().includes(team);
    const isTeamDark = dark.toLowerCase().includes(team);
    if (!isTeamWhite && !isTeamDark) continue;

    const dateRaw = (row[dateCol] || '').trim();
    const dateISO = parseDateToISO(dateRaw) || tournamentDates[(dateRaw || '').toLowerCase()] || '';
    const time = normalizeTimeLabel(row[timeCol] || '');
    const location = (row[locationCol] || '').trim();
    const gameNum = parseGameNum(row[gameNumCol] || '');
    const whiteScore = parseScoreValue(row[whiteScoreCol]);
    const darkScore = parseScoreValue(row[darkScoreCol]);
    const opponent = isTeamWhite ? dark : white;
    const teamCap = isTeamWhite ? 'White' : 'Dark';
    const key = `${dateISO || dateRaw}|${time}|${gameNum}|${white}|${dark}`;
    games[key] = {
      gameNum,
      date: dateISO || dateRaw,
      dateISO: dateISO || '',
      time,
      location,
      opponent: opponent || 'Opponent TBD',
      whiteTeam: white,
      whiteScore,
      darkTeam: dark,
      darkScore,
      teamCap,
      teamName: isTeamWhite ? white : dark,
    };
  }

  return games;
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString([], {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch { return dateStr; }
}

// ─── WEB PUSH HANDLER ─────────────────────────────────────────────────────────
// Fires when the Cloudflare Worker sends a push every 30 min.
// iOS REQUIRES showNotification() on every push — no silent pushes allowed.

self.addEventListener('message', e => {
  if (e.data?.type === 'SYNC_SHEET_CONFIG' && e.data.config) {
    e.waitUntil(saveSheetConfig(e.data.config));
  }
});

self.addEventListener('push', e => {
  e.waitUntil(
    (async () => {
      let newGames = [];

      try {
        const sheetConfig = await getSheetConfig();
        const [currentGames, knownGames] = await Promise.all([
          fetchGamesFromSheet(sheetConfig),
          getKnownGames(sheetConfig.cacheKey),
        ]);

        for (const [key, game] of Object.entries(currentGames)) {
          if (!knownGames[key]) newGames.push(game);
        }

        await saveKnownGames(currentGames, sheetConfig.cacheKey);

      } catch (err) {
        console.error('SW push: sheet fetch failed:', err.message);
        // Fall through to generic notification
      }

      if (newGames.length > 0) {
        for (const game of newGames) {
          const dateLabel = game.date ? formatDate(game.date) : '';
          const body = [
            `vs ${game.opponent}`,
            dateLabel && `${dateLabel} @ ${game.time}`,
            game.location,
          ].filter(Boolean).join(' · ');

          await self.registration.showNotification('🏊 New Game Added — Eggbeater', {
            body,
            icon:               '/logo_large.svg',
            badge:              '/logo_large.svg',
            tag:                `ebwp-new-game-${game.gameNum || Date.now()}`,
            requireInteraction: true,
            silent:             false,
          });
        }
      } else {
        // iOS requires showNotification() on every push — use a silent, self-replacing one
        await self.registration.showNotification('Eggbeater WP ✓', {
          body:               'No schedule changes.',
          icon:               '/logo_large.svg',
          tag:                'ebwp-sync',   // replaces previous — never stacks
          silent:             true,
          requireInteraction: false,
        });
      }

      // Tell any open app tabs to refresh regardless
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(c => c.postMessage({ type: 'PUSH_SYNC' }));
    })()
  );
});

// Tapping a notification opens (or focuses) the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow('/');
    })
  );
});
