/**
 * Eggbeater Water Polo — Tournament App
 * =========================================
 * Features:
 *  - Tournament schedule loaded from tournament.js
 *  - WIN / LOSS tracking per game
 *  - Projected next game (pool play → bracket projection)
 *  - Google Calendar sync (optional, OAuth-based)
 *  - Tournament history (auto-archived to localStorage)
 */

// ─── DARK MODE (3-mode: light / dark / system) ───────────────────────────────

function getThemePref() {
  return localStorage.getItem('ebwp-theme-preference') || 'system';
}

function applyThemePref(pref) {
  localStorage.setItem('ebwp-theme-preference', pref);
  // Legacy compat — old key
  localStorage.removeItem('ebwp-theme');
  let effective;
  if (pref === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    effective = pref;
  }
  document.documentElement.dataset.theme = effective;
  updateThemeIcon();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = effective === 'dark' ? '#0d1117' : (window._clubPrimaryColor || '#002868');
}

// Legacy toggle (from header button) — cycles light → dark → system
function toggleTheme() {
  const prefs = ['light', 'dark', 'system'];
  const cur = getThemePref();
  const next = prefs[(prefs.indexOf(cur) + 1) % prefs.length];
  applyThemePref(next);
}

function updateThemeIcon() {
  const btn = document.getElementById('theme-toggle');
  const pref = getThemePref();
  if (btn) btn.textContent = pref === 'dark' ? '☀️' : pref === 'system' ? '⚙️' : '🌙';
}

// Listen for OS theme changes when in 'system' mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getThemePref() === 'system') applyThemePref('system');
});

// Init icon on load
setTimeout(updateThemeIcon, 0);

// ─── CLUB BRANDING ────────────────────────────────────────────────────────────

/**
 * Apply custom club colors by overriding CSS custom properties.
 * Computes lighter/darker tints from the primary hex color.
 */
function applyClubBranding(primaryColor, secondaryColor, headerStyle) {
  if (!primaryColor) return;
  const root = document.documentElement;

  // Parse hex → {r, g, b}
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) };
  }
  function rgbToHex(r,g,b) {
    return '#' + [r,g,b].map(c => Math.max(0,Math.min(255,Math.round(c))).toString(16).padStart(2,'0')).join('');
  }
  function mix(c, white, t) {
    return { r: c.r + (white.r - c.r) * t, g: c.g + (white.g - c.g) * t, b: c.b + (white.b - c.b) * t };
  }
  function darken(c, amount) {
    return { r: c.r * (1 - amount), g: c.g * (1 - amount), b: c.b * (1 - amount) };
  }

  const pc = hexToRgb(primaryColor);
  const white = { r: 255, g: 255, b: 255 };

  // Set primary and computed variants
  root.style.setProperty('--royal', primaryColor);
  const dark = darken(pc, 0.3);
  root.style.setProperty('--royal-dark', rgbToHex(dark.r, dark.g, dark.b));
  const mid = mix(pc, white, 0.2);
  root.style.setProperty('--royal-mid', rgbToHex(mid.r, mid.g, mid.b));
  const light = mix(pc, white, 0.85);
  root.style.setProperty('--royal-light', rgbToHex(light.r, light.g, light.b));
  const subtle = mix(pc, white, 0.93);
  root.style.setProperty('--royal-subtle', rgbToHex(subtle.r, subtle.g, subtle.b));

  // Set secondary color (accent)
  if (secondaryColor) {
    root.style.setProperty('--teal', secondaryColor);
    const sc = hexToRgb(secondaryColor);
    const tl = mix(sc, white, 0.9);
    root.style.setProperty('--teal-light', rgbToHex(tl.r, tl.g, tl.b));
  }

  // Update meta theme-color for mobile browser chrome
  const isDark = document.documentElement.dataset.theme === 'dark';
  if (!isDark) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = primaryColor;
  }

  // Store for theme toggle to reference
  window._clubPrimaryColor = primaryColor;

  // Recolor all eggbeater SVG logo instances (header logo + inline "brought to you by" logo)
  function recolorEggbeaterSvg(imgEl) {
    if (!imgEl) return;
    fetch('logo_large.svg')
      .then(r => r.text())
      .then(svg => {
        const recolored = svg.replace('fill="#002868"', `fill="${primaryColor}"`);
        const blob = new Blob([recolored], { type: 'image/svg+xml' });
        if (imgEl._blobUrl) URL.revokeObjectURL(imgEl._blobUrl);
        imgEl._blobUrl = URL.createObjectURL(blob);
        imgEl.src = imgEl._blobUrl;
      })
      .catch(() => {});
  }

  const logoImg = document.querySelector('.club-logo-img');
  if (logoImg) {
    logoImg._brandApplied = true;
    recolorEggbeaterSvg(logoImg);
  }
  // Also recolor the inline "brought to you by" logo
  const inlineLogo = document.querySelector('.eggbeater-inline-logo');
  if (inlineLogo) recolorEggbeaterSvg(inlineLogo);
}

/**
 * BFS flood-fill background removal: makes outer near-white pixels transparent
 * while preserving internal white design elements (borders, faces, letters, etc.)
 */
function removeLogoBackground(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const w = canvas.width, h = canvas.height;
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      
      // If the first pixel or a quick sample of the perimeter is transparent, 
      // skip the cleaning algorithm to protect our pre-processed logo.
      if (d[3] < 200 || d[(w*h-1)*4 + 3] < 200) { resolve(dataUrl); return; }
      
      const bgR = d[0], bgG = d[1], bgB = d[2];
      if (bgR < 200 || bgG < 200 || bgB < 200) { resolve(dataUrl); return; }
      
      const TOL2 = 30 * 30;
      const visited = new Uint8Array(w * h);
      function matches(pi) {
        if (d[pi + 3] === 0) return true;
        const dr = d[pi] - bgR, dg = d[pi+1] - bgG, db = d[pi+2] - bgB;
        return (dr*dr + dg*dg + db*db) <= TOL2;
      }
      const queue = [];
      for (const [sx, sy] of [[0,0],[w-1,0],[0,h-1],[w-1,h-1]]) {
        const si = sy * w + sx;
        if (!visited[si]) { visited[si] = 1; queue.push(si); }
      }
      let qi = 0;
      while (qi < queue.length) {
        const idx = queue[qi++];
        d[idx * 4 + 3] = 0;
        const x = idx % w, y = (idx / w) | 0;
        if (x > 0)   { const n=idx-1; if (!visited[n]&&matches(n*4)){visited[n]=1;queue.push(n);} }
        if (x < w-1) { const n=idx+1; if (!visited[n]&&matches(n*4)){visited[n]=1;queue.push(n);} }
        if (y > 0)   { const n=idx-w; if (!visited[n]&&matches(n*4)){visited[n]=1;queue.push(n);} }
        if (y < h-1) { const n=idx+w; if (!visited[n]&&matches(n*4)){visited[n]=1;queue.push(n);} }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Show the club's custom logo in the header (if uploaded) or fall back to the
 * eggbeater logo. When a custom logo is present, the eggbeater logo collapses
 * to a small "brought to you by eggbeater" credit line.
 */
function applyClubLogo(logoDataUrl, clubName) {
  const defaultLogo  = document.querySelector('.club-logo-img');
  const customWrap   = document.querySelector('.club-custom-logo-wrap');
  const customImg    = document.querySelector('.club-custom-logo-img');
  const poweredByBar = document.querySelector('.eggbeater-poweredby-bar');

  if (logoDataUrl) {
    if (customImg) {
      customImg.alt = clubName || 'Club logo';
      customImg.src = logoDataUrl;
    }
    if (customWrap)  customWrap.classList.remove('hidden');
    if (poweredByBar) poweredByBar.classList.remove('hidden');
    if (defaultLogo) {
      defaultLogo.classList.add('hidden');
      defaultLogo.style.display = 'none'; // Force hide
    }
  } else {
    // No custom logo — show eggbeater logo, reset any stale SVG blob from a
    // previous club that had branding (avoids keeping the old club's color)
    if (customWrap)  customWrap.classList.add('hidden');
    if (poweredByBar) poweredByBar.classList.add('hidden');
    if (defaultLogo) {
      defaultLogo.classList.remove('hidden');
      defaultLogo.style.display = ''; // Restore display
      if (defaultLogo._blobUrl && !window._clubPrimaryColor) {
        URL.revokeObjectURL(defaultLogo._blobUrl);
        defaultLogo._blobUrl = null;
        defaultLogo._brandApplied = false;
        defaultLogo.src = 'logo_large.svg';
      } else if (!defaultLogo._brandApplied && window._clubPrimaryColor) {
        recolorEggbeaterSvg(defaultLogo);
        defaultLogo._brandApplied = true;
      }
    }
  }
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const CONFIG = {
  // Get this from Google Cloud Console → APIs & Services → Credentials
  // Add your Netlify URL to Authorized JavaScript Origins
  CLIENT_ID: '334438983134-th4thsf0upc8pabe245d2l41fon2oun9.apps.googleusercontent.com',

  SCOPES:            'https://www.googleapis.com/auth/calendar',
  EVENT_TAG:         'ebwp-sync-v1',          // tag on calendar events for cleanup
  SYNC_INTERVAL_MS:  20 * 60 * 1000,           // auto-sync every 20 min
  EVENT_DURATION_MIN: 45,                       // default game length in minutes
};

// ─── STORAGE KEYS ─────────────────────────────────────────────────────────────

// Returns a gender-appropriate water polo emoji based on the team key
function swimmerEmoji(teamKey) {
  if (!teamKey) teamKey = (getSelectedTeams && getSelectedTeams()[0]) || '';
  const k = teamKey.toLowerCase();
  if (k.includes('boy') || k.includes('men') || k.includes('bv') || k.includes('bjv')) return '🤽‍♂️';
  return '🤽‍♀️'; // girls, co-ed, or default
}

const STORE = {
  TOURNAMENT_ID:    'ebwp-tournament-id',
  SNAPSHOT:         'ebwp-snapshot',
  RESULTS:          'ebwp-results',
  BRACKET_RESULTS:  'ebwp-bracket-results',
  LIVE_SCORES:      'ebwp-live-scores',
  HISTORY:          'ebwp-history',
  CALENDAR_ID:      'ebwp-calendar-id',
  CALENDAR_NAME:    'ebwp-calendar-name',
  ROSTER:           'ebwp-roster',
  GROUPME_BOT_ID:   'ebwp-groupme-bot-id',
  MY_PLAYER:        'ebwp-my-player',       // legacy single followed player
  MY_PLAYERS:       'ebwp-my-players',      // [{name, teamKey}] multi-child
  SPORTS68_URL:     'ebwp-68sports-url',    // parent's 6-8 Sports profile URL
};

// Cache of loaded tournament data keyed by age-group key (e.g. '14u-girls')
const TEAM_CACHE = {};

// ─── MULTI-TEAM HELPERS ────────────────────────────────────────────────────────

function isMultiTeam() {
  // Multi-team is the default. Only disabled when explicitly set.
  return TOURNAMENT.singleTeam !== true;
}

/** Returns all selected team letters for the currently-rendering age group (e.g. ['A','B']). */
function getActiveTeams() {
  if (!isMultiTeam()) return null;
  if (_activeTeamLetters) return _activeTeamLetters;  // per-letter rendering override
  const valid = TOURNAMENT.enableCTeam
    ? ['A', 'B', 'C']
    : (Array.isArray(TOURNAMENT.teams) && TOURNAMENT.teams.length > 1 ? TOURNAMENT.teams : ['A', 'B']);
  const groupKey = _activeAgeGroup || getSelectedTeam();
  const saved = getTeamLettersForGroup(groupKey).filter(l => valid.includes(l));
  return saved.length ? saved : [valid[0]];
}
/** Returns the primary selected letter (first of the set). Used for single-letter contexts. */
function getActiveTeam() {
  const teams = getActiveTeams();
  return teams ? teams[0] : null;
}

function getTeamLabel(teamKey) {
  if (!teamKey) return 'My Team';
  return TOURNAMENT.teamLabels?.[teamKey] || ('Team ' + teamKey);
}

function getActiveTeamLabel() {
  return getTeamLabel(getActiveTeam()) || 'Eggbeater';
}

// ── Per-age-group A/B/C preference storage ────────────────────────────────────
// Stored as { '12u-girls': ['A','B'], '16u-boys': ['B'] } in ebwp-team-letters.
// A child playing on both A and B within the same age group can have both selected.
// Falls back to the legacy global ebwp-selected-team value for existing users.
function getTeamLettersForGroup(groupKey) {
  try {
    const map = JSON.parse(localStorage.getItem('ebwp-team-letters') || '{}');
    const val = map[groupKey] ?? localStorage.getItem('ebwp-selected-team') ?? null;
    if (!val) return [];
    return Array.isArray(val) ? val : [val]; // migrate old single-string format
  } catch { return []; }
}
/** Convenience: returns the first selected letter (primary), or null. */
function getTeamLetterForGroup(groupKey) {
  return getTeamLettersForGroup(groupKey)[0] ?? null;
}
function setTeamLettersForGroup(groupKey, letters) {
  try {
    const map = JSON.parse(localStorage.getItem('ebwp-team-letters') || '{}');
    map[groupKey] = letters;
    localStorage.setItem('ebwp-team-letters', JSON.stringify(map));
  } catch {}
}
/** Toggles one letter in/out of the selected set for a group. At least one always stays selected. */
function toggleTeamLetterForGroup(groupKey, letter, validTeams) {
  const current = getTeamLettersForGroup(groupKey);
  const effective = current.filter(l => validTeams.includes(l));
  const base = effective.length ? effective : [validTeams[0]];
  if (base.includes(letter)) {
    if (base.length === 1) return; // must keep at least one
    setTeamLettersForGroup(groupKey, base.filter(l => l !== letter));
  } else {
    setTeamLettersForGroup(groupKey, [...base, letter]);
  }
}

// Returns the roster array for the currently selected team(s) (merged when both A+B selected)
function getTournamentRoster() {
  const r = TOURNAMENT.roster;
  if (!r) return [];
  if (Array.isArray(r)) return r;          // single-team (legacy array format)
  const letters = getActiveTeams();
  if (!letters) return [];
  return letters.flatMap(l => r[l] || []);
}

// Returns games for the currently selected team(s). When A+B both selected, returns union.
// Games with no `team` field are treated as belonging to the FIRST team (A).
function getTournamentGames() {
  if (TOURNAMENT.upcomingMode) return [];
  const games = TOURNAMENT.games || [];
  const letters = getActiveTeams();
  if (!letters) return games;                           // single-team — return all
  const firstTeam = Array.isArray(TOURNAMENT.teams) && TOURNAMENT.teams.length
    ? TOURNAMENT.teams[0] : 'A';
  return games.filter(g => {
    if (!g.team) return letters.includes(firstTeam);   // unassigned → first team only
    return letters.includes(g.team);
  });
}

// Returns bracket paths for the currently selected team(s). Merges when A+B both selected.
// A plain array (legacy format) belongs to the first team only.
function getTournamentBracketPaths() {
  const bp = TOURNAMENT.bracket?.paths;
  if (!bp) return null;
  const letters = getActiveTeams();
  if (!letters) return Array.isArray(bp) ? bp : null;  // single-team — return as-is
  if (Array.isArray(bp)) {
    return letters.includes('A') ? bp : null;
  }
  const paths = letters.flatMap(l => bp[l] || []);
  return paths.length ? paths : null;
}

function switchTeam(letter, groupKey) {
  if (!groupKey) groupKey = _activeAgeGroup || getSelectedTeam();
  const validTeams = TOURNAMENT.enableCTeam
    ? ['A', 'B', 'C']
    : (Array.isArray(TOURNAMENT.teams) && TOURNAMENT.teams.length ? TOURNAMENT.teams : ['A', 'B']);
  if (!validTeams.includes(letter)) return;
  toggleTeamLetterForGroup(groupKey, letter, validTeams);
  const first = getTeamLettersForGroup(groupKey)[0];
  if (first) localStorage.setItem('ebwp-selected-team', first); // legacy compat
  _historyTeamFilter = '';   // clear stale opponent search when team changes
  state.roster = loadRoster();
  renderTeamPicker();
  renderHeader();
  renderScheduleTab();
  renderScoresTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
}

// Returns history entries relevant to the currently selected team.
// Red (A) team → entries for 'Team', 'Team A', 'Team A1', 'Team A2', 'A', 'A1', 'A2' (any non-B variant).
// Blue (B) team → entries for 'Team B', 'B' only.
// Single-team mode (no multi-team) → all entries unchanged.
function getHistoryForActiveTeam() {
  const history = getHistory();
  if (!isMultiTeam()) return history;
  const team = getActiveTeam();
  if (!team) return history;

  return history.filter(entry => {
    const t = (entry.team || '').trim();
    if (team === 'A') {
      const isB = t === 'B' || /^Team\s*B$/i.test(t);
      const isC = t === 'C' || /^Team\s*C$/i.test(t);
      return !isB && !isC;
    }
    if (team === 'B') {
      return t === 'B' || /^Team\s*B$/i.test(t);
    }
    if (team === 'C') {
      return t === 'C' || /^Team\s*C$/i.test(t);
    }
    return true;
  });
}

// ─── BRACKET POINTS ───────────────────────────────────────────────────────────
// Points awarded per game result (per league rules)

const POINTS = { W: 4, SW: 3, SL: 2, L: 1, F: 0 };

function getPoints(result) {
  return (result != null && result in POINTS) ? POINTS[result] : null;
}

function isWin(result)  { return result === 'W'  || result === 'SW'; }
function isLoss(result) { return result === 'L'  || result === 'SL' || result === 'F'; }

function resultLabel(result) {
  return { W: 'WIN', SW: 'SO WIN', SL: 'SO LOSS', L: 'LOSS', F: 'FORFEIT' }[result] || result || '—';
}

// ─── STATE ────────────────────────────────────────────────────────────────────

const state = {
  results:          {},     // gameId → 'W' | 'SW' | 'SL' | 'L' | 'F'
  bracketResults:   {},     // 'pathId-gameNum' → 'W' | 'L'
  liveScores:       {},     // gameId → { team, opp, clock, period, gameState, events[], quarterMins, halfMins, timeoutMins }
  dirScores:        {},     // gameId → { score1, score2, status, updatedAt }  — director game scores
  dirScorerUnlocked: false, // true = director scoring mode unlocked
  dirPollTimer:     null,   // interval ID for polling dir scores
  // Tournament Score tab
  tscoreUnlocked:   false,
  tscorePkg:        null,
  tscorePw:         '',
  tscoreScores:     {},
  tscorePollTimer:  null,
  roster:           [],     // [{ cap, first, last }] — editable via Roster tab
  currentTab:       'schedule',
  viewerMode:       true,       // true = viewing live scores without scorer login (default for parents)

  // Calendar sync
  accessToken:      null,
  tokenExpiry:      null,
  selectedCalId:    null,
  selectedCalName:  null,
  syncActive:       false,
  syncIntervalId:   null,
  lastSyncTime:     null,
  tokenClient:      null,
  pendingAction:    null,   // callback to run after token is granted
};

// ─── DOM HELPER ───────────────────────────────────────────────────────────────

// _renderSuffix is set during multi-team rendering so $('foo') finds 'foo-14u-girls' etc.
let _renderSuffix    = '';
let _inMultiRender   = false;   // prevents recursive multi→single→multi dispatch
let _activeAgeGroup  = null;    // which age group is currently being rendered (for per-group A/B)
let _activeTeamLetters = null;  // when set, overrides getActiveTeams() during per-letter rendering
// _historyOverride bypasses localStorage during multi-team history rendering
let _historyOverride = null;

const $ = id => document.getElementById(_renderSuffix ? id + _renderSuffix : id)
               || document.getElementById(id);

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Build a tappable directions link for a location string with Apple Maps, Google Maps, and Waze.
 * If location looks like coordinates ("37.7749,-122.4194"), use directly.
 * Otherwise URL-encode as a place name search.
 */
function buildLocationLink(location) {
  if (!location) return '';
  const isCoords = /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(location.trim());
  const dest = isCoords ? location.trim() : encodeURIComponent(location);
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  const appleUrl = `https://maps.apple.com/?daddr=${dest}`;
  const wazeUrl = `https://waze.com/ul?q=${dest}`;
  const btnStyle = `display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;font-weight:700;background:#f8fafc;color:#374151;border:1px solid #e2e8f0;border-radius:6px;padding:3px 8px;text-decoration:none;white-space:nowrap;-webkit-tap-highlight-color:transparent`;
  const iconStyle = `width:14px;height:14px;border-radius:2px;object-fit:contain;flex-shrink:0`;
  return `<span style="display:inline-flex;align-items:center;gap:4px;min-height:44px;flex-wrap:wrap">
    <a href="${googleUrl}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline;font-weight:600;-webkit-tap-highlight-color:transparent" onclick="event.stopPropagation()">📍 ${escHtml(location)}</a>
    <span style="display:inline-flex;gap:3px">
      <a href="${appleUrl}" target="_blank" rel="noopener" class="directions-btn" onclick="event.stopPropagation()" style="${btnStyle}"><img src="https://maps.apple.com/favicon.ico" alt="" style="${iconStyle}" onerror="this.style.display='none'">Apple</a>
      <a href="${googleUrl}" target="_blank" rel="noopener" class="directions-btn" onclick="event.stopPropagation()" style="${btnStyle}"><img src="https://maps.gstatic.com/favicon3.ico" alt="" style="${iconStyle}" onerror="this.style.display='none'">Google</a>
      <a href="${wazeUrl}" target="_blank" rel="noopener" class="directions-btn" onclick="event.stopPropagation()" style="${btnStyle}"><img src="https://www.waze.com/favicon.ico" alt="" style="${iconStyle}" onerror="this.style.display='none'">Waze</a>
    </span>
  </span>`;
}

/**
 * Sort key for roster cap numbers.
 * Field players (2–25+) sort numerically first.
 * Goalkeepers (GK / 1 / 1A) and blank caps sort to the bottom.
 */
function capSortKey(cap) {
  const c = String(cap || '').trim().toUpperCase();
  if (!c || c === 'GK' || c === '1' || c === '1A') return 9999;
  const n = parseInt(c, 10);
  return isNaN(n) ? 9998 : n;
}

/** Returns true if the cap number belongs to a goalkeeper (GK, 1, or 1A). */
function isGoalie(cap) {
  const c = String(cap || '').trim().toUpperCase();
  return c === 'GK' || c === '1' || c === '1A';
}

/** Returns a copy of a roster array sorted: field players 2–25 first, goalies last. */
function sortedRoster(roster) {
  return [...(roster || [])].sort((a, b) => capSortKey(a.cap) - capSortKey(b.cap));
}

function showToast(msg, type = 'default') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast toast-${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 4000);
}

// ─── TIME HELPERS ─────────────────────────────────────────────────────────────

function parseGameTime(dateISO, timeStr) {
  if (!dateISO || !timeStr || timeStr === 'TBD') return null;
  try {
    const [timePart, ampm] = timeStr.split(' ');
    const [hStr, mStr] = timePart.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr || '0', 10);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const d = new Date(dateISO);
    d.setHours(h, m, 0, 0);
    return d;
  } catch { return null; }
}

function toISOLocal(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}` +
         `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

// ─── PROJECTED NEXT GAME ──────────────────────────────────────────────────────
// Returns the next upcoming game — either a pool play game (by time)
// or the next bracket step from the projected path once pool play is complete.

function findNextGameOrProjected() {
  const now = new Date();
  const games = getTournamentGames();

  // 1. Next upcoming pool play game by clock time
  const nextPool = games
    .filter(g => {
      const t = parseGameTime(g.dateISO, g.time);
      return t && t > now;
    })
    .sort((a, b) => parseGameTime(a.dateISO, a.time) - parseGameTime(b.dateISO, b.time))[0];

  if (nextPool) return { game: nextPool, type: 'pool' };

  // 2. All pool games past (or no time data) → look at projected bracket path
  const projected = inferProjectedPath();
  if (!projected) return null;

  for (const step of (projected.steps || [])) {
    const stepKey = `${projected.id}-${step.gameNum}`;
    if (!state.bracketResults[stepKey]) {
      // This step hasn't been played yet
      return { game: step, type: 'bracket', pathLabel: projected.label };
    }
  }

  return null; // all done!
}

// ─── BRACKET PROJECTION ───────────────────────────────────────────────────────

function inferProjectedPath() {
  const paths = getTournamentBracketPaths();
  if (!paths?.length) return null;

  const games = getTournamentGames();
  if (!games.length) return null;

  const completedGames = games.filter(g => state.results[g.id]);
  if (!completedGames.length) return null;

  const wins = completedGames.filter(g => isWin(state.results[g.id])).length;

  for (const path of paths) {
    const minW = path.qualifyMinWins ?? 0;
    const maxW = path.qualifyMaxWins ?? 99;
    if (wins >= minW && wins <= maxW) return path;
  }

  return paths[0]; // fallback
}

function getPoolRecord() {
  let w = 0, l = 0, pts = 0;
  for (const g of getTournamentGames()) {
    const r = state.results[g.id];
    if (isWin(r))  w++;
    else if (isLoss(r)) l++;
    if (r != null) pts += POINTS[r] ?? 0;
  }
  return (w + l) > 0 ? `${w}-${l} · ${pts} pts` : '0-0';
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────

function getHistory() {
  if (_historyOverride !== null) return _historyOverride;
  try { return JSON.parse(localStorage.getItem(STORE.HISTORY) || '[]'); }
  catch { return []; }
}

function archiveTournament(snapshot, results, bracketResults, liveScores) {
  const history = getHistory();
  const games = snapshot.games || [];
  let wins = 0, losses = 0, totalPoints = 0;
  for (const g of games) {
    const r = results[g.id];
    if (isWin(r))        wins++;
    else if (isLoss(r))  losses++;
    if (r != null) totalPoints += POINTS[r] ?? 0;
  }
  const record = `${wins}-${losses}`;

  const bracketPaths = (snapshot.bracket?.paths || []).map(path => ({
    ...path,
    steps: (path.steps || []).map(step => ({
      ...step,
      result: (bracketResults || {})[`${path.id}-${step.gameNum}`] || null,
    })),
  }));

  // Extract player stats from liveScores events (Phase 5D)
  const playerStats = {};
  for (const g of games) {
    const ls = (liveScores || {})[g.id];
    if (!ls || !Array.isArray(ls.events)) continue;
    const playersInGame = new Set();
    for (const ev of ls.events) {
      const player = ev.player || ev.scorer;
      if (!player) continue;
      if (!playerStats[player]) {
        playerStats[player] = { goals: 0, assists: 0, steals: 0, exclusions: 0, gamesPlayed: 0 };
      }
      playersInGame.add(player);
      const action = (ev.action || ev.type || '').toLowerCase();
      if (action === 'goal' || action === 'scored')     playerStats[player].goals++;
      else if (action === 'assist')                       playerStats[player].assists++;
      else if (action === 'steal')                        playerStats[player].steals++;
      else if (action === 'exclusion' || action === 'ejection') playerStats[player].exclusions++;
    }
    for (const p of playersInGame) {
      playerStats[p].gamesPlayed++;
    }
  }

  const archived = {
    id: snapshot.id, name: snapshot.name, subtitle: snapshot.subtitle,
    dates: snapshot.dates, location: snapshot.location, pool: snapshot.pool,
    record, wins, losses, totalPoints,
    archivedAt: new Date().toISOString(),
    games: games.map(g => ({
      ...g,
      result:    results[g.id] || null,
      points:    getPoints(results[g.id] || null),
      liveScore: (liveScores || {})[g.id] || null,
    })),
    bracketPaths,
    playerStats,
  };

  const idx = history.findIndex(h => h.id === archived.id);
  if (idx >= 0) history[idx] = archived;
  else history.unshift(archived);

  localStorage.setItem(STORE.HISTORY, JSON.stringify(history));
}

// ─── TOURNAMENT CHANGE DETECTION ──────────────────────────────────────────────

function checkTournamentChange() {
  const savedId         = localStorage.getItem(STORE.TOURNAMENT_ID);
  const savedSnap       = JSON.parse(localStorage.getItem(STORE.SNAPSHOT)        || 'null');
  const savedRes        = JSON.parse(localStorage.getItem(STORE.RESULTS)         || '{}');
  const savedBrRes      = JSON.parse(localStorage.getItem(STORE.BRACKET_RESULTS) || '{}');
  const savedLiveScores = JSON.parse(localStorage.getItem(STORE.LIVE_SCORES)     || '{}');

  if (savedId && savedId !== TOURNAMENT.id && savedSnap) {
    // Only archive if results were actually recorded (skip blank placeholder data)
    const hasResults = Object.keys(savedRes).length > 0 || Object.keys(savedBrRes).length > 0;
    if (hasResults) {
      archiveTournament(savedSnap, savedRes, savedBrRes, savedLiveScores);
      showToast(`${savedSnap.name || 'Last tournament'} archived to History ✓`, 'ok');
    }
    localStorage.removeItem(STORE.RESULTS);
    localStorage.removeItem(STORE.BRACKET_RESULTS);
    localStorage.removeItem(STORE.LIVE_SCORES);
    // Clear cached rosters so new tournament always loads fresh from admin panel
    localStorage.removeItem(STORE.ROSTER);
    localStorage.removeItem(STORE.ROSTER + '-A');
    localStorage.removeItem(STORE.ROSTER + '-B');
    state.results        = {};
    state.bracketResults = {};
    state.liveScores     = {};
  } else {
    state.results        = savedRes;
    state.bracketResults = savedBrRes;
    state.liveScores     = savedLiveScores;
  }

  localStorage.setItem(STORE.TOURNAMENT_ID, TOURNAMENT.id);
  localStorage.setItem(STORE.SNAPSHOT, JSON.stringify(TOURNAMENT));

  // Restore calendar settings
  state.selectedCalId   = localStorage.getItem(STORE.CALENDAR_ID)   || null;
  state.selectedCalName = localStorage.getItem(STORE.CALENDAR_NAME) || null;
  if (state.selectedCalId) state.syncActive = true;
}

// ─── LIVE SCORING ─────────────────────────────────────────────────────────────

// ─── LIVE SCORES PERSISTENCE ──────────────────────────────────────────────────

function saveLiveScores() {
  localStorage.setItem(STORE.LIVE_SCORES, JSON.stringify(state.liveScores));
}

// ─── MY-GAMES TRACKING ────────────────────────────────────────────────────────
// The CF worker /live-scores response never includes deviceId, so we can't
// tell our own broadcasts from a stranger's via the response alone.
// Instead we keep a local Set of game IDs this device has scored.
// pollLiveScores skips these; updateLiveDot/buildScheduleCard treat them as
// local (respecting the scorer-locked state).

function getMyGames() {
  try { return new Set(JSON.parse(localStorage.getItem('ebwp-my-games') || '[]')); }
  catch { return new Set(); }
}
function addMyGame(gameId) {
  const g = getMyGames();
  g.add(gameId);
  localStorage.setItem('ebwp-my-games', JSON.stringify([...g]));
}

// Returns true if a game should show as LIVE right now —
// either this device has scorer unlocked and the game is active,
// or another device broadcast it recently.
function isGameLive(gameId) {
  const s = state.liveScores[gameId];
  if (!s || !s.gameState || s.gameState === 'pre') return false;
  const myGames = getMyGames();
  if (myGames.has(gameId) || !s._remote) return isScorerUnlocked();
  return (Date.now() - (s._broadcastAt || 0)) < 30 * 60 * 1000;
}

/** Save + re-render + broadcast after any scoring action. */
function afterScore(gameId) {
  addMyGame(gameId); // remember we scored this game on this device
  saveLiveScores();
  renderGamesList();
  renderNextGameCard(); // update LIVE badge on blue card
  if (state.currentTab === 'scores') renderScoresTab();
  updateLiveDot();
  broadcastLiveScore(gameId); // fire-and-forget
  notifyScorePush(gameId, 'goal'); // fire-and-forget APNs push
  // Android 16 Live Update Sync
  if (typeof EggbeaterLiveUpdate !== 'undefined') {
    EggbeaterLiveUpdate.sync(gameId, state.liveScores[gameId]);
  }
}

// Show/hide the pulsing red dot on the Scores nav button.
// Shows when THIS device has scorer unlocked + active game, OR when another
// device is broadcasting a live score (visible to all viewers).
// Clears the moment anyone locks (they broadcast 'pre' to the worker).
function updateLiveDot() {
  const dot = $('scores-live-dot');
  if (!dot) return;
  const STALE_MS    = 30 * 60 * 1000;
  const localActive = isScorerUnlocked();
  const myGames     = getMyGames();
  const hasLive = getTournamentGames().some(g => {
    const s = state.liveScores[g.id];
    if (!s || !s.gameState || s.gameState === 'pre') return false;
    if (myGames.has(g.id) || !s._remote) return localActive;
    return (Date.now() - (s._broadcastAt || 0)) < STALE_MS;
  });
  dot.classList.toggle('hidden', !hasLive);
}

function loadLiveScores() {
  try {
    state.liveScores = JSON.parse(localStorage.getItem(STORE.LIVE_SCORES) || '{}');
  } catch { state.liveScores = {}; }
}

// Returns (and migrates) the liveScore object for a game.
// Shape: { team, opp, clock, period, gameState, events[], quarterMins, halfMins, timeoutMins }
function getLiveScore(gameId) {
  if (!state.liveScores[gameId]) {
    state.liveScores[gameId] = {
      team: 0, opp: 0, clock: '', period: 0, gameState: 'pre', events: [],
      quarterMins: 8, halfMins: 5, timeoutMins: 1,
    };
  }
  const s = state.liveScores[gameId];
  // Migrate old goals[] format → events[]
  if (!s.events && s.goals) {
    s.events = s.goals.map(g => ({
      type: g.side === 'team' ? 'goal' : 'opp_goal',
      side: g.side, cap: g.cap || '', name: g.name || '',
      clock: '', period: 0, sixOnFive: false, ts: g.ts || Date.now(),
    }));
    delete s.goals;
  }
  if (!s.events)      s.events      = [];
  if (!s.gameState)   s.gameState   = 'pre';
  if (s.period == null) s.period    = 0;
  if (s.quarterMins == null) s.quarterMins = 8;
  if (s.halfMins    == null) s.halfMins    = 5;
  if (s.timeoutMins == null) s.timeoutMins = 1;
  return s;
}

// ─── BOX SCORE EVENT RECORDING ────────────────────────────────────────────────

// Mapping from game-state key → period number
const PERIOD_FOR_STATE = { start: 0, q1: 1, q2: 2, half: 2, q3: 3, q4: 4, ot: 5, final: 4, shootout: 6 };
const PERIOD_LABELS    = { 0: 'Pre-Game', 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4', 5: 'OT', 6: 'Shootout' };

// Log a game-state transition (Start, Q1, Q2, Half, Q3, Q4, OT, Final)
function setGameState(gameId, gstate) {
  const s = getLiveScore(gameId);
  s.gameState = gstate;
  const newPeriod = PERIOD_FOR_STATE[gstate];
  if (newPeriod != null) s.period = newPeriod;
  s.events.push({ type: 'game_state', gameState: gstate, clock: s.clock || '', period: s.period, ts: Date.now() });
  state.liveScores[gameId] = s;
  afterScore(gameId);
}

// Toggle a game-state button — tap once to activate, tap again to revert to Pre-Game.
// Used for Start, Shootout, and End so accidental taps can always be reversed cleanly.
function toggleGameState(gameId, gstate) {
  const s = getLiveScore(gameId);
  if (s.gameState === gstate) {
    // Remove the most recent event for this key and drop back to pre-game
    const events = s.events || [];
    const revIdx = [...events].reverse().findIndex(e => e.type === 'game_state' && e.gameState === gstate);
    if (revIdx !== -1) events.splice(events.length - 1 - revIdx, 1);
    s.gameState = 'pre';
    s.period    = 0;
    state.liveScores[gameId] = s;
    afterScore(gameId);
  } else {
    setGameState(gameId, gstate);
  }
}

// Resets the game back to Pre-Game state from any state (clears game_state events).
function resetToPreGame(gameId) {
  const s = getLiveScore(gameId);
  s.events    = (s.events || []).filter(e => e.type !== 'game_state');
  s.gameState = 'pre';
  s.period    = 0;
  state.liveScores[gameId] = s;
  afterScore(gameId);
}

// Keep old name as alias
function toggleGameStart(gameId) { toggleGameState(gameId, 'start'); }

// Update the running clock display (no re-render — called on every keystroke)
function setGameClock(gameId, val) {
  const s = getLiveScore(gameId);
  s.clock = val;
  state.liveScores[gameId] = s;
  saveLiveScores();
}

// Update game timing settings (quarterMins / halfMins / timeoutMins)
function setGameTiming(gameId, field, val) {
  const s = getLiveScore(gameId);
  const n = parseFloat(val);
  if (!isNaN(n) && n >= 0) s[field] = n;
  state.liveScores[gameId] = s;
  saveLiveScores();
}

// Record any event with a player (goal, assist, exclusion, brutality)
function recordEventForPlayer(gameId, eventType, cap, name, sixOnFive) {
  const s          = getLiveScore(gameId);
  const inShootout = s.gameState === 'shootout';
  const isGoal     = eventType === 'goal';
  const isOppGoal  = eventType === 'opp_goal';
  // In shootout mode goals become SO goals (decimal scoring)
  const actualType = (inShootout && isGoal)    ? 'so_goal'
                   : (inShootout && isOppGoal) ? 'opp_so_goal'
                   : eventType;
  const ev = {
    type: actualType, side: (actualType === 'opp_so_goal' || isOppGoal) ? 'opp' : 'team',
    cap: cap || '', name: name || '',
    clock: _pendingClock || s.clock || '', period: s.period || 0,
    sixOnFive: (isGoal && sixOnFive && !inShootout) ? true : false,
    ts: Date.now(),
  };
  _pendingClock = '';
  if (actualType === 'goal')        s.team++;
  if (actualType === 'goal_5m')     s.team++;
  if (actualType === 'so_goal')     s.team = Math.round((s.team + 0.1) * 10) / 10;
  if (actualType === 'opp_goal')    s.opp++;
  if (actualType === 'opp_so_goal') s.opp  = Math.round((s.opp  + 0.1) * 10) / 10;
  s.events.push(ev);
  state.liveScores[gameId] = s;
  afterScore(gameId);
}

// Record a direct (no-player) event: opp_goal, timeout, opp_timeout, opp_exclusion
// Always uses auto-clock — no manual prompt needed.
function recordEventDirect(gameId, eventType) {
  _pendingClock = getCurrentClockStr(gameId);
  _doRecordDirect(gameId, eventType);
}

// Internal — records immediately using _pendingClock (no prompt).
function _doRecordDirect(gameId, eventType) {
  const s          = getLiveScore(gameId);
  const inShootout = s.gameState === 'shootout';
  const actualType = (inShootout && eventType === 'opp_goal') ? 'opp_so_goal' : eventType;
  const isOppSide  = actualType.startsWith('opp');
  const ev = {
    type: actualType, side: isOppSide ? 'opp' : 'team',
    cap: '', name: '', clock: _pendingClock || s.clock || '', period: s.period || 0,
    sixOnFive: false, ts: Date.now(),
  };
  _pendingClock = '';
  if (actualType === 'opp_goal')    s.opp++;
  if (actualType === 'opp_goal_5m') s.opp++;
  if (actualType === 'opp_so_goal') s.opp = Math.round((s.opp + 0.1) * 10) / 10;
  s.events.push(ev);
  state.liveScores[gameId] = s;
  afterScore(gameId);
}

// Recompute team + opp scores from event list (handles regular goals and SO goals)
function recomputeScores(events) {
  let team = 0, opp = 0;
  for (const e of events) {
    if (e.type === 'goal')        team++;
    if (e.type === 'goal_5m')     team++;
    if (e.type === 'so_goal')     team = Math.round((team + 0.1) * 10) / 10;
    if (e.type === 'opp_goal')    opp++;
    if (e.type === 'opp_goal_5m') opp++;
    if (e.type === 'opp_so_goal') opp  = Math.round((opp  + 0.1) * 10) / 10;
  }
  return { team, opp };
}

// Remove the last event (smart undo — recomputes scores)
function undoLastEvent(gameId) {
  const s = getLiveScore(gameId);
  // Backward compat: old goals[] format
  if (!s.events && s.goals?.length) {
    const last = s.goals.pop();
    if (last.side === 'team') s.team = Math.max(0, s.team - 1);
    else s.opp = Math.max(0, s.opp - 1);
    state.liveScores[gameId] = s;
    afterScore(gameId); return;
  }
  if (!s.events?.length) return;
  const last = s.events.pop();
  // Revert game state if needed
  if (last.type === 'game_state') {
    const prev = [...s.events].reverse().find(e => e.type === 'game_state');
    s.gameState = prev?.gameState || 'pre';
    s.period    = PERIOD_FOR_STATE[s.gameState] ?? 0;
  }
  // Recompute scores from remaining events (includes SO goals)
  const recomputed = recomputeScores(s.events);
  s.team = recomputed.team;
  s.opp  = recomputed.opp;
  state.liveScores[gameId] = s;
  afterScore(gameId);
}

// Backward-compat shims
function scoreGoal(gameId, side, cap, name) {
  if (side === 'team') recordEventForPlayer(gameId, 'goal', cap, name, false);
  else recordEventDirect(gameId, 'opp_goal');
}
function undoLastGoal(gameId) { undoLastEvent(gameId); }

// ─── BOX SCORE RENDERING ──────────────────────────────────────────────────────

// Build the event log HTML, grouped by period
function buildEventLog(events) {
  const nonState = events.filter(e => e.type !== 'game_state');
  if (!nonState.length) return '';

  // Group by period
  const groups = {};
  for (const ev of nonState) {
    const p = ev.period ?? 0;
    if (!groups[p]) groups[p] = [];
    groups[p].push(ev);
  }

  const WP_BALL = '<span class="wp-ball">🏐</span>';
  const TYPE_ICONS = { goal:WP_BALL, opp_goal:WP_BALL, goal_5m:WP_BALL, opp_goal_5m:WP_BALL, shot_miss:'❌', opp_shot_miss:'❌', miss_5m:'❌', opp_miss_5m:'❌', so_goal:WP_BALL, opp_so_goal:WP_BALL, so_miss:'❌', opp_so_miss:'❌', assist:'🤝', exclusion:'❌', opp_exclusion:'❌', brutality:'🟥', timeout:'⏱', opp_timeout:'⏱', save:'🧤', block:'🛡️' };
  const TYPE_LABEL = {
    goal:          ev => ev.sixOnFive ? 'GOAL (6v5)' : 'GOAL',
    opp_goal:      ()  => 'GOAL',
    goal_5m:       ()  => 'GOAL (5m)',
    opp_goal_5m:   ()  => 'GOAL (5m)',
    shot_miss:     ()  => 'SHOT ATTEMPT',
    opp_shot_miss: ()  => 'SHOT ATTEMPT',
    miss_5m:       ()  => 'ATTEMPT (5m)',
    opp_miss_5m:   ()  => 'ATTEMPT (5m)',
    so_goal:       ()  => 'SO GOAL 🎯',
    opp_so_goal:   ()  => 'SO GOAL 🎯',
    so_miss:       ()  => 'SO MISS',
    opp_so_miss:   ()  => 'SO MISS',
    assist:        ()  => 'ASSIST',
    exclusion:     ()  => 'EXCL',
    opp_exclusion: ()  => 'EXCL',
    brutality:     ()  => 'BRUTAL',
    timeout:       ()  => 'TIMEOUT',
    opp_timeout:   ()  => 'OPP T/O',
    save:          ()  => 'SAVE',
    block:         ()  => 'BLOCK',
  };

  let html = '<div class="event-log">';
  for (const [period, evs] of Object.entries(groups).sort((a,b) => Number(a[0]) - Number(b[0]))) {
    const label = PERIOD_LABELS[parseInt(period)] || `P${period}`;
    html += `<div class="event-period-header">${escHtml(label)}</div>`;
    for (const ev of evs) {
      const isTeam    = ev.side === 'team';
      const icon      = TYPE_ICONS[ev.type] || '·';
      const typeLabel = (TYPE_LABEL[ev.type] || (() => ev.type))(ev);
      const player    = ev.cap  ? `#${escHtml(ev.cap)} ${escHtml((ev.name||'').split(' ')[0])}`
                      : ev.name ? escHtml(ev.name)
                      : isTeam  ? 'Team' : 'Opp';
      html += `<div class="event-row event-${isTeam?'team':'opp'}">
        <span class="event-clock">${escHtml(ev.clock||'—')}</span>
        <span class="event-icon">${icon}</span>
        <span class="event-player">${player}</span>
        <span class="event-type">${escHtml(typeLabel)}</span>
      </div>`;
    }
  }
  html += '</div>';
  return html;
}

// Build the box score summary table HTML
function buildBoxScoreHtml(events, oppName) {
  const nonState = events.filter(e => e.type !== 'game_state');
  if (!nonState.length) return '';

  const playerMap   = {};
  let teamTimeouts  = 0;

  for (const ev of nonState) {
    if (ev.type === 'timeout')    { teamTimeouts++; continue; }
    if (ev.side !== 'team')       continue;
    const key = ev.cap || ev.name || '_unknown';
    if (!playerMap[key]) playerMap[key] = { cap: ev.cap||'', name: ev.name||'', G:0, SM:0, G5:0, M5:0, SOG:0, SOM:0, A:0, Excl:0, Sv:0, Blk:0 };
    if (ev.type === 'goal')                              playerMap[key].G++;
    if (ev.type === 'shot_miss')                         playerMap[key].SM++;
    if (ev.type === 'goal_5m')                           playerMap[key].G5++;
    if (ev.type === 'miss_5m')                           playerMap[key].M5++;
    if (ev.type === 'so_goal')                           playerMap[key].SOG++;
    if (ev.type === 'so_miss')                           playerMap[key].SOM++;
    if (ev.type === 'assist')                            playerMap[key].A++;
    if (ev.type === 'exclusion' || ev.type === 'brutality') playerMap[key].Excl++;
    if (ev.type === 'save')                              playerMap[key].Sv++;
    if (ev.type === 'block')                             playerMap[key].Blk++;
  }

  const players = Object.values(playerMap)
    .sort((a,b) => parseInt(a.cap||'999',10) - parseInt(b.cap||'999',10));

  if (!players.length && !teamTimeouts) return '';

  // Split field players from goalkeepers
  const fieldPlayers = players.filter(p => !isGoalie(p.cap));
  const gkPlayers    = players.filter(p =>  isGoalie(p.cap));

  const totalG    = fieldPlayers.reduce((s,p) => s+p.G, 0);
  const totalA    = fieldPlayers.reduce((s,p) => s+p.A, 0);
  const totalExcl = fieldPlayers.reduce((s,p) => s+p.Excl, 0);

  const hasShotMiss = fieldPlayers.some(p => p.SM > 0);
  const has5m     = fieldPlayers.some(p => p.G5 > 0 || p.M5 > 0);
  const hasSoGoals = fieldPlayers.some(p => p.SOG > 0 || p.SOM > 0);
  const fieldRows = fieldPlayers.map(p => {
    const pName = p.cap ? `#${escHtml(p.cap)} ${escHtml((p.name||'').split(' ')[0])}` : escHtml(p.name||'?');
    return `<div class="bs-row">
      <span class="bs-player">${pName}</span>
      <span class="bs-stat${p.G?'   has-stat':''}">${p.G}</span>
      ${hasShotMiss ? `<span class="bs-stat${p.SM?' has-stat excl-stat':''}">${p.SM||0}</span>` : ''}
      ${has5m ? `<span class="bs-stat${p.G5?' has-stat':''}">${p.G5||0}</span>` : ''}
      ${has5m ? `<span class="bs-stat${p.M5?' has-stat excl-stat':''}">${p.M5||0}</span>` : ''}
      ${hasSoGoals ? `<span class="bs-stat${p.SOG?' has-stat':''}">${p.SOG||0}</span>` : ''}
      ${hasSoGoals ? `<span class="bs-stat${p.SOM?' has-stat excl-stat':''}">${p.SOM||0}</span>` : ''}
      <span class="bs-stat${p.A?'   has-stat':''}">${p.A}</span>
      <span class="bs-stat${p.Excl?' has-stat excl-stat':''}">${p.Excl}</span>
    </div>`;
  }).join('');

  const gkRows = gkPlayers.map(p => {
    const pName = p.cap ? `#${escHtml(p.cap)} ${escHtml((p.name||'').split(' ')[0])}` : escHtml(p.name||'GK');
    return `<div class="bs-row">
      <span class="bs-player">${pName}</span>
      <span class="bs-stat${p.Sv?'  has-stat gk-stat':''}">${p.Sv}</span>
      <span class="bs-stat${p.Blk?' has-stat gk-stat':''}">${p.Blk}</span>
      <span class="bs-stat${p.Excl?' has-stat excl-stat':''}">${p.Excl}</span>
    </div>`;
  }).join('');

  const gkSection = gkPlayers.length ? `
    <div class="bs-section-label">Goalkeeper</div>
    <div class="bs-header-row">
      <span class="bs-player bs-col-hdr">Player</span>
      <span class="bs-stat bs-col-hdr">Sv</span>
      <span class="bs-stat bs-col-hdr">Blk</span>
      <span class="bs-stat bs-col-hdr">Ex</span>
    </div>
    ${gkRows}` : '';

  const toLine = teamTimeouts ? `<div class="bs-footer-line">Team Timeouts: ${teamTimeouts}</div>` : '';

  const totalSM  = fieldPlayers.reduce((s,p) => s+(p.SM||0), 0);
  const totalG5  = fieldPlayers.reduce((s,p) => s+p.G5,  0);
  const totalM5  = fieldPlayers.reduce((s,p) => s+p.M5,  0);
  const totalSOG = fieldPlayers.reduce((s,p) => s+p.SOG, 0);
  const totalSOM = fieldPlayers.reduce((s,p) => s+p.SOM, 0);
  return `<div class="box-score">
    <div class="bs-header-row">
      <span class="bs-player bs-col-hdr">Player</span>
      <span class="bs-stat bs-col-hdr">G</span>
      ${hasShotMiss ? `<span class="bs-stat bs-col-hdr" title="Shot Attempts">SA</span>` : ''}
      ${has5m ? `<span class="bs-stat bs-col-hdr" title="5m Penalty Goals">5m✓</span>` : ''}
      ${has5m ? `<span class="bs-stat bs-col-hdr" title="5m Penalty Attempts">5m?</span>` : ''}
      ${hasSoGoals ? `<span class="bs-stat bs-col-hdr" title="Shootout Goals">SO✓</span>` : ''}
      ${hasSoGoals ? `<span class="bs-stat bs-col-hdr" title="Shootout Misses">SO✗</span>` : ''}
      <span class="bs-stat bs-col-hdr">A</span>
      <span class="bs-stat bs-col-hdr">Ex</span>
    </div>
    ${fieldRows}
    ${fieldPlayers.length ? `<div class="bs-row bs-total-row">
      <span class="bs-player">Total</span>
      <span class="bs-stat has-stat">${totalG}</span>
      ${hasShotMiss ? `<span class="bs-stat">${totalSM}</span>` : ''}
      ${has5m ? `<span class="bs-stat has-stat">${totalG5}</span>` : ''}
      ${has5m ? `<span class="bs-stat">${totalM5}</span>` : ''}
      ${hasSoGoals ? `<span class="bs-stat has-stat">${totalSOG}</span>` : ''}
      ${hasSoGoals ? `<span class="bs-stat">${totalSOM}</span>` : ''}
      <span class="bs-stat">${totalA}</span>
      <span class="bs-stat">${totalExcl}</span>
    </div>` : ''}
    ${gkSection}
    ${toLine}
  </div>`;
}

// Share (or copy) the formatted box score text
function shareBoxScore(gameId) {
  const s    = getLiveScore(gameId);
  const game = getTournamentGames().find(g => g.id === gameId);
  const opp  = game?.opponent || 'Opponent';
  const evs  = s.events || [];

  const TYPE_TEXT = {
    goal:          ev => ev.sixOnFive ? 'GOAL (6v5)' : 'GOAL',
    opp_goal:      ()  => 'GOAL',
    goal_5m:       ()  => 'GOAL (5m)',
    opp_goal_5m:   ()  => 'GOAL (5m)',
    shot_miss:     ()  => 'SHOT ATTEMPT',
    opp_shot_miss: ()  => 'SHOT ATTEMPT',
    miss_5m:       ()  => 'ATTEMPT (5m)',
    opp_miss_5m:   ()  => 'ATTEMPT (5m)',
    so_goal:       ()  => 'SO GOAL',
    opp_so_goal:   ()  => 'SO GOAL',
    so_miss:       ()  => 'SO MISS',
    opp_so_miss:   ()  => 'SO MISS',
    assist:        ()  => 'ASSIST',
    exclusion:     ()  => 'EXCL',
    opp_exclusion: ()  => 'EXCL',
    brutality:     ()  => 'BRUTALITY',
    timeout:       ()  => 'TIMEOUT',
    opp_timeout:   ()  => 'OPP TIMEOUT',
    save:          ()  => 'SAVE',
    block:         ()  => 'BLOCK',
  };

  let text = `${TOURNAMENT.name || 'Eggbeater'}\n`;
  text += `${getActiveTeamLabel()} vs ${opp}\n`;
  text += `Final Score: Team ${s.team} – ${s.opp} ${opp}\n`;
  if (s.quarterMins) text += `Quarters: ${s.quarterMins} min  ·  Half: ${s.halfMins} min  ·  T/O: ${s.timeoutMins} min\n`;
  text += '\n';

  // Events by period
  const nonState = evs.filter(e => e.type !== 'game_state');
  const groups   = {};
  for (const ev of nonState) {
    const p = ev.period ?? 0;
    if (!groups[p]) groups[p] = [];
    groups[p].push(ev);
  }
  for (const [period, pevs] of Object.entries(groups).sort((a,b) => Number(a[0])-Number(b[0]))) {
    text += `── ${PERIOD_LABELS[parseInt(period)] || 'P'+period} ──\n`;
    for (const ev of pevs) {
      const clock  = ev.clock ? `[${ev.clock}] ` : '';
      const player = ev.cap   ? `#${ev.cap} ${(ev.name||'').split(' ')[0]}` : (ev.name || '');
      const side   = ev.side === 'team' ? 'Team' : opp;
      const tl     = (TYPE_TEXT[ev.type] || (() => ev.type))(ev);
      text += `  ${clock}${side}${player?' '+player:''} — ${tl}\n`;
    }
    text += '\n';
  }

  // Box score summary
  const playerMap = {};
  let ttls = 0;
  for (const ev of nonState) {
    if (ev.type === 'timeout')  { ttls++; continue; }
    if (ev.side !== 'team')     continue;
    const k = ev.cap || ev.name || '?';
    if (!playerMap[k]) playerMap[k] = { cap:ev.cap||'', name:ev.name||'', G:0, A:0, Excl:0, Sv:0, Blk:0 };
    if (ev.type==='goal')                              playerMap[k].G++;
    if (ev.type==='assist')                            playerMap[k].A++;
    if (ev.type==='exclusion'||ev.type==='brutality')  playerMap[k].Excl++;
    if (ev.type==='save')                              playerMap[k].Sv++;
    if (ev.type==='block')                             playerMap[k].Blk++;
  }
  const ps = Object.values(playerMap).sort((a,b)=>parseInt(a.cap||'999')-parseInt(b.cap||'999'));
  const fieldPs = ps.filter(p => !isGoalie(p.cap));
  const gkPs    = ps.filter(p =>  isGoalie(p.cap));
  if (fieldPs.length) {
    text += `── Box Score ──\n`;
    text += `${'Player'.padEnd(15)} G  A  Ex\n`;
    for (const p of fieldPs) {
      const n = (p.cap ? `#${p.cap} ${(p.name||'').split(' ')[0]}` : p.name||'?').padEnd(15);
      text += `${n} ${p.G}  ${p.A}  ${p.Excl}\n`;
    }
    if (ttls) text += `Team Timeouts: ${ttls}\n`;
  }
  if (gkPs.length) {
    text += `── Goalkeeper ──\n`;
    text += `${'Player'.padEnd(15)} Sv Blk Ex\n`;
    for (const p of gkPs) {
      const n = (p.cap ? `#${p.cap} ${(p.name||'').split(' ')[0]}` : p.name||'GK').padEnd(15);
      text += `${n} ${p.Sv}  ${p.Blk}  ${p.Excl}\n`;
    }
  }
  text += `\nGenerated by ${getActiveTeamLabel()} WP App`;

  if (navigator.share) {
    navigator.share({ title: `Team vs ${opp} — Box Score`, text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text)
      .then(()  => showToast('Box score copied!', 'ok'))
      .catch(()  => showToast('Copy failed — try a different browser'));
  }
}

// ─── ROSTER MANAGEMENT ────────────────────────────────────────────────────────

function loadRoster() {
  try {
    const key = isMultiTeam() ? STORE.ROSTER + '-' + getActiveTeam() : STORE.ROSTER;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only use cached roster if it has actual players; otherwise fall through to admin-panel data
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* fall through */ }
  // Always show the roster deployed from the admin panel
  return getTournamentRoster().map(p => ({ ...p }));
}

function saveRosterToStorage() {
  const key = isMultiTeam() ? STORE.ROSTER + '-' + getActiveTeam() : STORE.ROSTER;
  localStorage.setItem(key, JSON.stringify(state.roster));
}

function getRosterPlayers() {
  return state.roster || [];
}

function addRosterPlayer() {
  state.roster.push({ cap: '', first: '', last: '' });
  saveRosterToStorage();
  renderRosterTab();
  setTimeout(() => {
    const rows = document.querySelectorAll('.roster-edit-row');
    if (rows.length) {
      rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      rows[rows.length - 1].querySelector('input')?.focus();
    }
  }, 60);
}

function removeRosterPlayer(idx) {
  state.roster.splice(idx, 1);
  saveRosterToStorage();
  renderRosterTab();
}

function updateRosterPlayer(idx, field, val) {
  if (state.roster[idx]) {
    state.roster[idx][field] = val;
    saveRosterToStorage();
  }
}

function saveRosterFromUI() {
  saveRosterToStorage();
  showToast('Roster saved!', 'ok');
}

// ─── GROUPME BOT ───────────────────────────────────────────────────────────────

function loadGroupMeSettings() {
  return localStorage.getItem(STORE.GROUPME_BOT_ID) || '';
}

function saveGroupMeSettings(botId) {
  state.groupmeBotId = botId.trim();
  if (state.groupmeBotId) {
    localStorage.setItem(STORE.GROUPME_BOT_ID, state.groupmeBotId);
  } else {
    localStorage.removeItem(STORE.GROUPME_BOT_ID);
  }
}

function updateGroupMeBotId(val) {
  saveGroupMeSettings(val);
}

/** Split a long text into chunks that fit GroupMe's ~1000-char limit. */
function chunkMessage(text, maxLen = 900) {
  const lines  = text.split('\n');
  const chunks = [];
  let cur      = '';
  for (const line of lines) {
    const add = (cur ? '\n' : '') + line;
    if (cur.length + add.length > maxLen) {
      if (cur) chunks.push(cur);
      cur = line;
    } else {
      cur += add;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/** Send the current box score to Telegram or GroupMe via the worker /notify endpoint. */
async function sendBoxScoreNotify(gameId, channel) {
  const text = buildBoxScoreText(gameId);
  const scorePassword = TOURNAMENT.scoringPassword || '';
  const label = channel === 'tg' ? 'Telegram' : 'GroupMe';
  showToast(`Sending to ${label}…`);
  try {
    const res  = await fetch(`${PUSH_SERVER_URL}/notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, channel, scorePassword, team: getSelectedTeam() }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast(`✅ Sent to ${label}!`, 'ok');
    } else {
      showToast(`❌ ${label}: ${data.description || 'Not configured or failed'}`, 'err');
    }
  } catch (e) {
    showToast('❌ Network error: ' + e.message, 'err');
  }
}

/** Send a shootout alert notification to Telegram and/or GroupMe. */
async function sendShootoutAlert(gameId, channel) {
  const s    = getLiveScore(gameId);
  const game = getTournamentGames().find(g => g.id === gameId);
  const opp  = game?.opponent || 'Opponent';
  const teamScore = Number.isInteger(s.team) ? s.team : s.team.toFixed(1);
  const oppScore  = Number.isInteger(s.opp)  ? s.opp  : s.opp.toFixed(1);
  const text = [
    `🎯 SHOOTOUT!`,
    `${TOURNAMENT.name || 'Eggbeater'}`,
    `Team vs ${opp}`,
    ``,
    `Tied ${teamScore}–${oppScore} at end of regulation.`,
    `Heading to penalty shootout! 5 shots per team.`,
    ``,
    `Each goal = 0.1 pts · Most total wins the round.`,
  ].join('\n');
  const label = channel === 'tg' ? 'Telegram' : 'GroupMe';
  showToast(`Sending shootout alert to ${label}…`);
  try {
    const res = await fetch(`${PUSH_SERVER_URL}/notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, channel, scorePassword: TOURNAMENT.scoringPassword || '', team: getSelectedTeam() }),
    });
    const data = await res.json();
    if (data.ok) showToast(`✅ Shootout alert sent to ${label}!`, 'ok');
    else showToast(`❌ ${label}: ${data.description || 'Not configured or failed'}`, 'err');
  } catch (e) {
    showToast('❌ Network error: ' + e.message, 'err');
  }
}

/** Build the plain-text box score (same as shareBoxScore but returns string). */
function buildBoxScoreText(gameId) {
  const s    = getLiveScore(gameId);
  const game = getTournamentGames().find(g => g.id === gameId);
  const opp  = game?.opponent || 'Opponent';
  const evs  = s.events || [];

  const TYPE_TEXT = {
    goal:          ev => ev.sixOnFive ? 'GOAL (6v5)' : 'GOAL',
    opp_goal:      ()  => 'GOAL',
    goal_5m:       ()  => 'GOAL (5m)',
    opp_goal_5m:   ()  => 'GOAL (5m)',
    shot_miss:     ()  => 'SHOT ATTEMPT',
    opp_shot_miss: ()  => 'SHOT ATTEMPT',
    miss_5m:       ()  => 'ATTEMPT (5m)',
    opp_miss_5m:   ()  => 'ATTEMPT (5m)',
    so_goal:       ()  => 'SO GOAL',
    opp_so_goal:   ()  => 'SO GOAL',
    so_miss:       ()  => 'SO MISS',
    opp_so_miss:   ()  => 'SO MISS',
    assist:        ()  => 'ASSIST',
    exclusion:     ()  => 'EXCL',
    opp_exclusion: ()  => 'EXCL',
    brutality:     ()  => 'BRUTALITY',
    timeout:       ()  => 'TIMEOUT',
    opp_timeout:   ()  => 'OPP TIMEOUT',
    save:          ()  => 'SAVE',
    block:         ()  => 'BLOCK',
  };

  // ── Status line: smart summary based on game state ──
  const gs = s.gameState || 'pre';
  let statusLine;
  const scoreStr = `${getActiveTeamLabel()} ${s.team} – ${opp} ${s.opp}`;
  if (gs === 'pre' || gs === 'start') {
    statusLine = 'Game has Started';
  } else if (gs === 'half') {
    statusLine = `Halftime: ${scoreStr}`;
  } else if (gs === 'final' || gs === 'so_w' || gs === 'so_l' || gs === 'ff') {
    const label = gs === 'so_w' ? 'SO Win' : gs === 'so_l' ? 'SO Loss' : gs === 'ff' ? 'Forfeit' : 'Final';
    statusLine = `${label}: ${scoreStr}`;
  } else {
    // In-progress quarter/OT — show current period + score
    const periodLabel = PERIOD_LABELS[s.period] || `P${s.period}`;
    statusLine = `${periodLabel}: ${scoreStr}`;
  }

  let text = `${TOURNAMENT.name || 'Eggbeater'}\n`;
  text += `${getActiveTeamLabel()} vs ${opp}\n`;
  text += `${statusLine}\n`;
  text += '\n';

  const nonState = evs.filter(e => e.type !== 'game_state');
  const groups   = {};
  for (const ev of nonState) {
    const p = ev.period ?? 0;
    if (!groups[p]) groups[p] = [];
    groups[p].push(ev);
  }
  for (const [period, pevs] of Object.entries(groups).sort((a,b) => Number(a[0])-Number(b[0]))) {
    text += `── ${PERIOD_LABELS[parseInt(period)] || 'P'+period} ──\n`;
    for (const ev of pevs) {
      const clock  = ev.clock ? `[${ev.clock}] ` : '';
      const player = ev.cap   ? `#${ev.cap} ${(ev.name||'').split(' ')[0]}` : (ev.name || '');
      const side   = ev.side === 'team' ? 'Team' : opp;
      const tl     = (TYPE_TEXT[ev.type] || (() => ev.type))(ev);
      text += `  ${clock}${side}${player?' '+player:''} — ${tl}\n`;
    }
    text += '\n';
  }

  const playerMap = {};
  let ttls = 0, oppTtls = 0;
  for (const ev of nonState) {
    if (ev.type === 'timeout')     { ttls++;    continue; }
    if (ev.type === 'opp_timeout') { oppTtls++; continue; }
    if (ev.side !== 'team')     continue;
    const k = ev.cap || ev.name || '?';
    if (!playerMap[k]) playerMap[k] = { cap:ev.cap||'', name:ev.name||'', G:0, A:0, Excl:0, Sv:0, Blk:0 };
    if (ev.type==='goal')                              playerMap[k].G++;
    if (ev.type==='assist')                            playerMap[k].A++;
    if (ev.type==='exclusion'||ev.type==='brutality')  playerMap[k].Excl++;
    if (ev.type==='save')                              playerMap[k].Sv++;
    if (ev.type==='block')                             playerMap[k].Blk++;
  }
  const ps = Object.values(playerMap).sort((a,b)=>parseInt(a.cap||'999')-parseInt(b.cap||'999'));
  const fieldPs = ps.filter(p => !isGoalie(p.cap));
  const gkPs    = ps.filter(p =>  isGoalie(p.cap));
  if (fieldPs.length) {
    text += `── Box Score ──\n`;
    text += `Player          G  A  Ex\n`;
    for (const p of fieldPs) {
      const n = (p.cap ? `#${p.cap} ${(p.name||'').split(' ')[0]}` : p.name||'?').padEnd(15);
      text += `${n} ${p.G}  ${p.A}  ${p.Excl}\n`;
    }
    if (ttls)    text += `Team Timeouts: ${ttls}\n`;
    if (oppTtls) text += `Opp Timeouts: ${oppTtls}\n`;
  }
  if (gkPs.length) {
    text += `── Goalkeeper ──\n`;
    text += `Player          Sv Blk Ex\n`;
    for (const p of gkPs) {
      const n = (p.cap ? `#${p.cap} ${(p.name||'').split(' ')[0]}` : p.name||'GK').padEnd(15);
      text += `${n} ${p.Sv}  ${p.Blk}  ${p.Excl}\n`;
    }
  }
  text += `\n— ${getActiveTeamLabel()} WP App\nhttps://eggbeater.app`;
  return text;
}

async function postToGroupMe(gameId) {
  const botId = state.groupmeBotId;
  if (!botId) {
    showToast('Enter your GroupMe Bot ID in the Roster tab first', 'warn');
    return;
  }
  const text   = buildBoxScoreText(gameId);
  const chunks = chunkMessage(text);
  showToast(`Sending ${chunks.length > 1 ? chunks.length + ' messages' : 'to GroupMe'}…`);
  let failed = 0;
  for (const chunk of chunks) {
    try {
      const res = await fetch('https://api.groupme.com/v3/bots/post', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bot_id: botId, text: chunk }),
      });
      if (!res.ok && res.status !== 202) failed++;
    } catch {
      failed++;
    }
  }
  if (failed === 0) {
    showToast('Sent to GroupMe! 📱', 'ok');
  } else {
    showToast(`${failed} message(s) failed — check your Bot ID`);
  }
}

async function testGroupMeBot() {
  const input = $('groupme-bot-id-input');
  const botId = (input?.value || '').trim();
  if (!botId) { showToast('Paste your Bot ID first'); return; }
  saveGroupMeSettings(botId);
  showToast('Sending test message…');
  try {
    const res = await fetch('https://api.groupme.com/v3/bots/post', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bot_id: botId, text: 'Eggbeater WP App connected! 🤽‍♀️' }),
    });
    if (res.ok || res.status === 202) {
      showToast('Test message sent! Check your GroupMe 📱', 'ok');
    } else {
      showToast(`Failed (HTTP ${res.status}) — double-check Bot ID`);
    }
  } catch {
    showToast('Network error — check connection');
  }
}

function renderRosterTab() {
  const el = $('view-roster');
  if (!el) return;
  const slots = getExpandedTeamSlots();
  if (slots.length === 0) {
    el.innerHTML = '<p class="empty-msg" style="padding:24px;text-align:center;color:var(--gray-500)">Select an age group above to view the roster.</p>';
    return;
  }
  if (slots.length > 1) { _renderRosterMulti(el, slots); return; }
  const roster = state.roster || [];

  // Sort display order: field players 2-25 numerically, goalies (GK/1/1A) at bottom.
  // Preserve original index i so edit/delete operations target the correct state.roster slot.
  const sortedEntries = roster
    .map((p, i) => ({ p, i }))
    .sort((a, b) => capSortKey(a.p.cap) - capSortKey(b.p.cap));

  const isHS = localStorage.getItem('ebwp-club-type') === 'highschool';

  const colHdr = `<div class="roster-edit-header">
    <span class="rec-col-cap">Cap</span>
    <span class="rec-col-name">First</span>
    <span class="rec-col-name">Last</span>
    ${isHS ? '<span class="rec-col-name" style="flex:0 0 70px">Grade</span>' : ''}
    <span class="rec-col-del"></span>
  </div>`;

  const rows = sortedEntries.map(({ p, i }) => `
    <div class="roster-edit-row">
      <input type="text" class="roster-cap-input${isGoalie(p.cap) ? ' roster-cap-gk' : ''}" value="${escHtml(p.cap||'')}" placeholder="#"
             maxlength="3" oninput="updateRosterPlayer(${i},'cap',this.value)" aria-label="Cap">
      <input type="text" class="roster-name-input" value="${escHtml(p.first||'')}" placeholder="First"
             oninput="updateRosterPlayer(${i},'first',this.value)" aria-label="First">
      <input type="text" class="roster-name-input" value="${escHtml(p.last||'')}" placeholder="Last"
             oninput="updateRosterPlayer(${i},'last',this.value)" aria-label="Last">
      ${isHS ? `<select class="roster-name-input" style="flex:0 0 70px;font-size:0.75rem;padding:6px 2px"
                       onchange="updateRosterPlayer(${i},'grade',this.value)" aria-label="Grade">
        <option value="">—</option>
        <option value="Freshman"${p.grade==='Freshman'?' selected':''}>Fr</option>
        <option value="Sophomore"${p.grade==='Sophomore'?' selected':''}>So</option>
        <option value="Junior"${p.grade==='Junior'?' selected':''}>Jr</option>
        <option value="Senior"${p.grade==='Senior'?' selected':''}>Sr</option>
      </select>` : ''}
      <button class="roster-remove-btn" onclick="removeRosterPlayer(${i})" aria-label="Remove">×</button>
    </div>`).join('');

  el.innerHTML = `${renderMyPlayerCard()}
  ${renderPlayerLookupCard()}
  <div class="card tab-card">
    <div class="history-header-row">
      <h2>Roster</h2>
      <span class="history-subtitle">${escHtml(_groupSectionLabelFor(getSelectedTeam(), null))}</span>
    </div>
    <p class="step-desc">Manage players for live scoring. Cap numbers appear on goal/assist chips.</p>
    <button class="pstats-export-btn" onclick="openPlayerStatsModal()">📊 Download All Player Stats</button>
    <button class="pstats-export-btn" style="background:#eff6ff;color:#1e40af;border-color:#93c5fd" onclick="openSeasonStatsModal()">📊 Season Stats</button>
    ${colHdr}
    <div id="roster-edit-list">
      ${rows || '<p class="empty-msg" style="padding:10px 0">No players yet.</p>'}
    </div>
    <button class="btn btn-ghost" onclick="addRosterPlayer()" style="margin-top:10px">+ Add Player</button>
    <button class="btn-save-roster" onclick="saveRosterFromUI()">💾 Save Roster</button>
  </div>`;
}

function _renderRosterMulti(el, slots) {
  let html = renderMyPlayersCard();
  for (const { groupKey, letter, suffix } of slots) {
    const cache = TEAM_CACHE[groupKey];
    const letters = letter ? [letter] : getTeamLettersForGroup(groupKey);
    const roster = cache ? (Array.isArray(cache.tournament.roster)
      ? cache.tournament.roster
      : letters.flatMap(l => cache.tournament.roster?.[l] || [])) : [];
    const sorted = sortedRoster(roster);
    const rows = sorted.map(p => `
      <div class="roster-view-row">
        <span class="roster-cap-badge${isGoalie(p.cap) ? ' roster-cap-gk' : ''}">${p.cap ? '#' + escHtml(p.cap) : '—'}</span>
        <span class="roster-view-name">${escHtml([p.first, p.last].filter(Boolean).join(' ') || '—')}</span>
      </div>`).join('');
    html += `<div class="card tab-card">
      <div class="history-header-row">
        <h2>Roster</h2>
        <span class="history-subtitle">${escHtml(_groupSectionLabelFor(groupKey, letter))}</span>
      </div>
      <div class="roster-view-list">
        ${rows || '<p class="empty-msg" style="padding:10px 0">No roster data.</p>'}
      </div>
    </div>`;
  }
  el.innerHTML = html;
}

// ─── PLAYER LOOKUP (Roster tab) ──────────────────────────────────────────────

let _playerLookupName = '';

/** Builds the "Player Stats" lookup card inserted above the roster management card. */
function renderPlayerLookupCard() {
  const roster    = state.roster || [];
  const allStats  = getAllPlayersWithStats();
  const sorted    = sortedRoster(roster);
  const rosterNames = new Set(sorted.map(p => `${p.first} ${p.last}`.toLowerCase().trim()));

  const rosterOpts = sorted
    .filter(p => p.first || p.last)
    .map(p => {
      const name = `${p.first} ${p.last}`.trim();
      const sel  = _playerLookupName === name ? ' selected' : '';
      return `<option value="${encodeURIComponent(name)}"${sel}>${p.cap ? `#${escHtml(p.cap)} ` : ''}${escHtml(name)}</option>`;
    });

  const histOpts = allStats
    .filter(p => p.name && !rosterNames.has(p.name.toLowerCase()))
    .map(p => {
      const sel = _playerLookupName === p.name ? ' selected' : '';
      return `<option value="${encodeURIComponent(p.name)}"${sel}>${escHtml(p.name)}</option>`;
    });

  const resultHtml = _playerLookupName ? buildPlayerLookupResult(_playerLookupName) : '';

  // Group into optgroups so roster cap-order is visually clear
  const optsHtml = rosterOpts.length
    ? `<optgroup label="Current Roster">${rosterOpts.join('')}</optgroup>`
      + (histOpts.length ? `<optgroup label="Past Players">${histOpts.join('')}</optgroup>` : '')
    : histOpts.join('');

  return `<div class="card tab-card player-lookup-card">
    <div class="history-header-row">
      <h2>Player Stats</h2>
    </div>
    <p class="step-desc">Look up stats for any rostered player.</p>
    <select class="player-lookup-select" onchange="selectPlayerLookup(this.value)">
      <option value="">— Choose a player —</option>
      ${optsHtml}
    </select>
    <div id="player-lookup-result">${resultHtml}</div>
  </div>`;
}

/** Called when the player lookup dropdown changes. */
function selectPlayerLookup(encodedName) {
  _playerLookupName = encodedName ? decodeURIComponent(encodedName) : '';
  const el = $('player-lookup-result');
  if (el) el.innerHTML = _playerLookupName ? buildPlayerLookupResult(_playerLookupName) : '';
}

/** Builds the stats panel HTML for a given player name. */
function buildPlayerLookupResult(name) {
  const stats  = getMyPlayerSummaryStats(name);
  const roster = state.roster || [];
  const entry  = roster.find(p => `${p.first} ${p.last}`.toLowerCase() === name.toLowerCase());
  const isGK   = entry ? isGoalie(entry.cap) : ((stats?.Sv || 0) > 0 || (stats?.Blk || 0) > 0);

  const G          = stats?.G          || 0;
  const A          = stats?.A          || 0;
  const Excl       = stats?.Excl       || 0;
  const sixOnFive  = stats?.sixOnFive  || 0;
  const Sv         = stats?.Sv         || 0;
  const Blk        = stats?.Blk        || 0;
  const gameCount  = stats?.gameCount  || 0;
  const nameEnc    = encodeURIComponent(name);
  const capBadge   = entry?.cap ? `<span class="plookup-cap">#${escHtml(entry.cap)}</span>` : '';
  const gkBadge    = isGK ? `<span class="plookup-gk-badge">GK</span>` : '';

  const SM2        = stats?.SM  || 0;
  const G5_2       = stats?.G5  || 0;
  const M5_2       = stats?.M5  || 0;
  const SOG2       = stats?.SOG || 0;
  const SOM2       = stats?.SOM || 0;

  const statBoxes = isGK
    ? `<div class="mp-stat-rows">
        <div class="mp-stat-row-lg">
          <div class="mp-stat-box"><span class="mp-stat-num">${Sv}</span><span class="mp-stat-lbl">Saves</span></div>
          <div class="mp-stat-box"><span class="mp-stat-num">${Blk}</span><span class="mp-stat-lbl">Blocks</span></div>
          <div class="mp-stat-box"><span class="mp-stat-num">${Excl}</span><span class="mp-stat-lbl">Exclusions</span></div>
        </div>
        <div class="mp-stat-row-3">
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${gameCount}</span><span class="mp-stat-lbl-sm">Games</span></div>
        </div>
       </div>`
    : `<div class="mp-stat-rows">
        <div class="mp-stat-row-lg">
          <div class="mp-stat-box"><span class="mp-stat-num">${G}</span><span class="mp-stat-lbl">Goals</span></div>
          <div class="mp-stat-box"><span class="mp-stat-num">${A}</span><span class="mp-stat-lbl">Assists</span></div>
          <div class="mp-stat-box"><span class="mp-stat-num">${SM2}</span><span class="mp-stat-lbl">Attempts</span></div>
        </div>
        <div class="mp-stat-row-4">
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${sixOnFive}</span><span class="mp-stat-lbl-sm">6on5 Goals</span></div>
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${G5_2}</span><span class="mp-stat-lbl-sm">5m Goals</span></div>
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${M5_2}</span><span class="mp-stat-lbl-sm">5m Attempts</span></div>
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${SOG2}</span><span class="mp-stat-lbl-sm">SO Goals</span></div>
        </div>
        <div class="mp-stat-row-3">
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${Excl}</span><span class="mp-stat-lbl-sm">Exclusions</span></div>
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${SOM2}</span><span class="mp-stat-lbl-sm">SO Attempts</span></div>
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${gameCount}</span><span class="mp-stat-lbl-sm">Games</span></div>
        </div>
       </div>`;

  const rows   = collectPlayerGameRows(name);
  const recent = [...rows].reverse().slice(0, 5);
  const gameRowsHtml = recent.map(r => {
    const res   = r.result ? `<span class="mp-game-result mp-res-${r.result.toLowerCase()}">${resultLabel(r.result)}</span>` : '';
    const score = (r.teamScore !== '' && r.oppScore !== '') ? `<span class="mp-game-score">${r.teamScore}–${r.oppScore}</span>` : '';
    const st    = isGK
      ? `Sv&nbsp;${r.Sv||0}&nbsp; Blk&nbsp;${r.Blk||0}&nbsp; Ex&nbsp;${r.Excl}`
      : `G&nbsp;${r.G}&nbsp; A&nbsp;${r.A}&nbsp; Ex&nbsp;${r.Excl}`;
    return `<div class="mp-game-row">
      <div class="mp-game-opp">${escHtml(r.opponent)}${res ? ' '+res : ''}${score ? ' '+score : ''}</div>
      <div class="mp-game-stats">${st}</div>
    </div>`;
  }).join('');

  const moreNote = rows.length > 5
    ? `<div class="mp-game-more">${rows.length - 5} more game${rows.length - 5 !== 1 ? 's' : ''} in download</div>` : '';

  return `
    <div class="plookup-player-header">
      <div class="plookup-name-row">${capBadge}<span class="plookup-name">${escHtml(name)}</span>${gkBadge}</div>
    </div>
    ${statBoxes}
    ${!gameCount ? '<p class="plookup-no-stats">No stats recorded yet — use live scoring to start tracking.</p>' : ''}
    ${gameRowsHtml ? `<div class="plookup-games-section">
      <div class="mp-section-label">Recent games</div>
      ${gameRowsHtml}${moreNote}
    </div>` : ''}
    ${gameCount ? `<button class="plookup-dl-btn" onclick="downloadPlayerStats('${nameEnc}')">📊 Download stats CSV</button>` : ''}`;
}

// ─── HISTORY TEAM SEARCH ─────────────────────────────────────────────────────

let _historyTeamFilter = '';

/** Builds and injects the "Search by Team" card into #history-team-search. */
function renderHistoryTeamSearch() {
  const el = $('history-team-search');
  if (!el) return;

  const history = getHistoryForActiveTeam();
  const oppSet  = new Set();
  for (const t of history) {
    for (const g of (t.games || [])) {
      if (g.opponent && g.opponent.trim() && g.opponent !== 'TBD') oppSet.add(g.opponent.trim());
    }
  }
  // Also include opponents from current tournament live scores
  for (const g of getTournamentGames()) {
    const ls = state.liveScores[g.id] || {};
    if (g.opponent && g.opponent !== 'TBD' && (ls.team > 0 || ls.opp > 0)) oppSet.add(g.opponent.trim());
  }

  if (!oppSet.size) { el.innerHTML = ''; return; }

  const opts = [...oppSet].sort((a, b) => a.localeCompare(b)).map(opp => {
    const sel = _historyTeamFilter === opp ? ' selected' : '';
    return `<option value="${encodeURIComponent(opp)}"${sel}>${escHtml(opp)}</option>`;
  });

  const resultHtml = _historyTeamFilter ? buildTeamSearchResult(_historyTeamFilter) : '';

  el.innerHTML = `<div class="card tab-card team-search-card">
    <div class="history-header-row">
      <h2>Search by Team</h2>
      ${_historyTeamFilter ? `<button class="team-search-clear-btn" onclick="clearTeamSearch()">Clear ✕</button>` : ''}
    </div>
    <select class="team-search-select" onchange="applyTeamSearch(this.value)">
      <option value="">— Select an opponent —</option>
      ${opts.join('')}
    </select>
    <div id="team-search-result">${resultHtml}</div>
  </div>`;
}

/** Called when an opponent is selected in the team search dropdown. */
function applyTeamSearch(encodedOpp) {
  _historyTeamFilter = encodedOpp ? decodeURIComponent(encodedOpp) : '';
  const resultEl = $('team-search-result');
  if (resultEl) resultEl.innerHTML = _historyTeamFilter ? buildTeamSearchResult(_historyTeamFilter) : '';
  // Re-render header to show/hide Clear button
  const headerBtn = document.querySelector('.team-search-card .history-header-row .team-search-clear-btn');
  const hRow = document.querySelector('.team-search-card .history-header-row');
  if (hRow) {
    const existing = hRow.querySelector('.team-search-clear-btn');
    if (_historyTeamFilter && !existing) {
      const btn = document.createElement('button');
      btn.className = 'team-search-clear-btn';
      btn.textContent = 'Clear ✕';
      btn.onclick = clearTeamSearch;
      hRow.appendChild(btn);
    } else if (!_historyTeamFilter && existing) {
      existing.remove();
    }
  }
}

function clearTeamSearch() {
  _historyTeamFilter = '';
  renderHistoryTeamSearch();
}

/** Builds the results panel for a selected opponent. */
function buildTeamSearchResult(opponent) {
  const oppLC = opponent.toLowerCase();

  // Collect all games vs this opponent from history + current tournament
  const matchedGames = [];

  for (const t of getHistoryForActiveTeam()) {
    for (const g of (t.games || [])) {
      if ((g.opponent || '').toLowerCase() !== oppLC) continue;
      const ls = g.liveScore || {};
      matchedGames.push({
        tournamentName: t.name || 'Past Tournament',
        date:           g.dateISO || g.date || '',
        result:         g.result || '',
        teamScore:      ls.team ?? g.teamScore ?? '',
        oppScore:       ls.opp  ?? g.oppScore  ?? '',
        score:          g.score || '',
      });
    }
  }
  // Current tournament
  for (const g of getTournamentGames()) {
    if ((g.opponent || '').toLowerCase() !== oppLC) continue;
    const ls = state.liveScores[g.id] || {};
    if (ls.team == null && ls.opp == null && !state.results[g.id]) continue;
    matchedGames.push({
      tournamentName: TOURNAMENT.name || 'Eggbeater',
      date:           g.dateISO || g.date || '',
      result:         state.results[g.id] || '',
      teamScore:      ls.team ?? '',
      oppScore:       ls.opp  ?? '',
      score:          '',
    });
  }

  if (!matchedGames.length) {
    return `<p class="team-search-empty">No recorded results vs ${escHtml(opponent)} yet.</p>`;
  }

  // Sort chronologically
  matchedGames.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  // Record tally
  let W = 0, L = 0, T = 0;
  for (const g of matchedGames) {
    if (isWin(g.result))  W++;
    else if (g.result === 'L' || g.result === 'SL') L++;
    else if (g.result && g.result !== 'F') T++;
  }
  const totalWithResult = W + L + T;
  const recStr = totalWithResult ? `${W}W – ${L}L${T ? ` – ${T}T` : ''}` : `${matchedGames.length} game${matchedGames.length !== 1 ? 's' : ''}`;

  const gameRows = matchedGames.map(g => {
    const rc = isWin(g.result) ? 'win' : (g.result === 'L' || g.result === 'SL') ? 'loss' : 'none';
    let dateStr = '';
    if (g.date) {
      try { dateStr = new Date(g.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }
      catch { dateStr = g.date; }
    }
    let scoreStr = '';
    if (g.teamScore !== '' && g.oppScore !== '') {
      scoreStr = `<span class="tsearch-score">${g.teamScore}–${g.oppScore}</span>`;
    } else if (g.score) {
      scoreStr = `<span class="tsearch-score">${escHtml(g.score)}</span>`;
    }
    const resultStr = g.result ? `<span class="hg-result ${rc}">${g.result}</span>` : '';
    return `<div class="tsearch-game-row">
      <div class="tsearch-game-left">
        <span class="tsearch-tourney">${escHtml(g.tournamentName)}</span>
        ${dateStr ? `<span class="tsearch-date">${escHtml(dateStr)}</span>` : ''}
      </div>
      <div class="tsearch-game-right">${scoreStr}${resultStr}</div>
    </div>`;
  }).join('');

  return `
    <div class="tsearch-record-row">
      <span class="tsearch-record-label">vs ${escHtml(opponent)}</span>
      <span class="tsearch-record-value">${recStr}</span>
    </div>
    <div class="tsearch-games-list">${gameRows}</div>`;
}

// ── Auto-Clock Engine ────────────────────────────────────────────────────────

function getClockSettings() {
  const cs = TOURNAMENT.clockSettings || {};
  return {
    quarterMins:     cs.quarterMins     ?? 7,
    breakMins:       cs.breakMins       ?? 2,
    halftimeMins:    cs.halftimeMins    ?? 5,
    timeoutsPerTeam: cs.timeoutsPerTeam ?? 2,
    timeoutLengths:  (cs.timeoutLengths && cs.timeoutLengths.length) ? cs.timeoutLengths : [1, 0.5],
  };
}

function fmtClock(seconds) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function getCurrentClockStr(gameId) {
  const s = state.liveScores[gameId];
  if (!s) return '0:00';
  if (s.timerRunning && s.timerStartedAt) {
    const elapsed = (Date.now() - s.timerStartedAt) / 1000;
    return fmtClock(Math.max(0, (s.timerSecondsLeft || 0) - elapsed));
  }
  return fmtClock(s.timerSecondsLeft || 0);
}

function hasAutoClock(gameId) {
  const s = state.liveScores[gameId];
  return !!(s && s.timerPhase && (s.timerRunning || (s.timerSecondsLeft || 0) > 0));
}

let _clockTicker = null;

function ensureClockTicker() {
  if (_clockTicker) return;
  _clockTicker = setInterval(_tickAllClocks, 250);
}

function _tickAllClocks() {
  let anyRunning = false;
  for (const [gameId, s] of Object.entries(state.liveScores)) {
    if (!s || !s.timerRunning) continue;
    anyRunning = true;
    const elapsed = (Date.now() - (s.timerStartedAt || Date.now())) / 1000;
    const remaining = Math.max(0, (s.timerSecondsLeft || 0) - elapsed);
    const el = document.getElementById('game-clock-' + gameId);
    if (el) el.textContent = fmtClock(remaining);
    // Also update the schedule page live card clock
    const schedEl = document.getElementById('next-game-clock-' + gameId);
    if (schedEl) schedEl.textContent = fmtClock(remaining);
    if (remaining <= 0 && !s._clockExpiring) {
      s._clockExpiring = true;
      _handleClockExpired(gameId);
    }
  }
  if (!anyRunning && _clockTicker) {
    clearInterval(_clockTicker);
    _clockTicker = null;
  }
}

const _PHASE_SEQ = ['q1','break12','q2','halftime','q3','break34','q4','done'];

function _phaseSeconds(phase, cs) {
  if (phase === 'break12' || phase === 'break34') return (cs.breakMins || 2) * 60;
  if (phase === 'halftime') return (cs.halftimeMins || 5) * 60;
  return (cs.quarterMins || 7) * 60;
}

function _nextPhase(phase) {
  const i = _PHASE_SEQ.indexOf(phase);
  return i >= 0 && i < _PHASE_SEQ.length - 1 ? _PHASE_SEQ[i + 1] : 'done';
}

function _phaseGameState(phase) {
  return { q1:'q1', q2:'q2', halftime:'half', q3:'q3', q4:'q4' }[phase] || null;
}

function _phaseLabel(phase) {
  return { q1:'Q1', break12:'Quarter Break', q2:'Q2', halftime:'Half Time', q3:'Q3', break34:'Quarter Break', q4:'Q4', done:'Final' }[phase] || phase?.toUpperCase() || '';
}

function _handleClockExpired(gameId) {
  const s = getLiveScore(gameId);
  const cs = getClockSettings();
  const cur  = s.timerPhase || 'q1';
  const next = _nextPhase(cur);

  s.timerRunning     = false;
  s.timerStartedAt   = null;
  s.timerSecondsLeft = 0;
  s._clockExpiring   = false;

  if (next === 'done') {
    state.liveScores[gameId] = s;
    saveLiveScores();
    setGameState(gameId, 'final');
    showToast('🏁 Game over!');
    return;
  }

  s.timerPhase       = next;
  s.timerSecondsLeft = _phaseSeconds(next, cs);

  const isBreak = next === 'break12' || next === 'break34' || next === 'halftime';
  if (isBreak) {
    // Auto-start break/halftime countdown
    s.timerRunning   = true;
    s.timerStartedAt = Date.now();
    state.liveScores[gameId] = s;
    saveLiveScores();
    ensureClockTicker();
    const gs = _phaseGameState(next);
    if (gs) setGameState(gameId, gs);
    else { renderGamesList(); renderNextGameCard(); if (state.currentTab === 'scores') renderScoresTab(); }
    showToast(next === 'halftime' ? '⏸ Halftime!' : '⏸ Quarter break');
  } else {
    // New quarter — advance state, wait for scorer to tap ▶
    state.liveScores[gameId] = s;
    saveLiveScores();
    const gs = _phaseGameState(next);
    if (gs) setGameState(gameId, gs);
    else { renderGamesList(); renderNextGameCard(); if (state.currentTab === 'scores') renderScoresTab(); }
    showToast(`⏱ ${_phaseLabel(next)} — tap ▶ to start`);
  }
}

function startScoring(gameId) {
  const s  = getLiveScore(gameId);
  const cs = getClockSettings();

  // Determine which quarter we're starting
  const phase = s.timerPhase || 'q1';
  const isNewGame = !s.timerPhase || s.gameState === 'pre';

  if (isNewGame) {
    s.timerPhase = 'q1';
    s.teamTimeoutsLeft = cs.timeoutsPerTeam;
    s.oppTimeoutsLeft  = cs.timeoutsPerTeam;
    s.teamTimeoutIdx   = 0;
    s.oppTimeoutIdx    = 0;
  }

  if (!s.timerSecondsLeft || s.timerSecondsLeft <= 0) {
    s.timerSecondsLeft = _phaseSeconds(s.timerPhase, cs);
  }

  s.timerRunning   = true;
  s.timerStartedAt = Date.now();
  s._clockExpiring = false;

  state.liveScores[gameId] = s;
  saveLiveScores();
  ensureClockTicker();

  // Set game state for the current quarter
  const gs = _phaseGameState(s.timerPhase);
  if (gs && s.gameState !== gs) setGameState(gameId, gs);
  else afterScore(gameId);
}

function pauseGameTimer(gameId) {
  const s = getLiveScore(gameId);
  if (!s.timerRunning) return;
  const elapsed      = (Date.now() - (s.timerStartedAt || Date.now())) / 1000;
  s.timerSecondsLeft = Math.max(0, (s.timerSecondsLeft || 0) - elapsed);
  s.timerRunning     = false;
  s.timerStartedAt   = null;
  state.liveScores[gameId] = s;
  saveLiveScores();
  renderGamesList();
  renderNextGameCard();
  if (state.currentTab === 'scores') renderScoresTab();
}

function resumeGameTimer(gameId) {
  const s = getLiveScore(gameId);
  if (s.timerRunning) return;
  if ((s.timerSecondsLeft || 0) <= 0) return;
  s.timerRunning   = true;
  s.timerStartedAt = Date.now();
  state.liveScores[gameId] = s;
  saveLiveScores();
  ensureClockTicker();
  renderGamesList();
  renderNextGameCard();
  if (state.currentTab === 'scores') renderScoresTab();
}

function resetGameClock(gameId) {
  const s  = getLiveScore(gameId);
  const cs = getClockSettings();
  const phase = s.timerPhase || 'q1';
  s.timerRunning     = false;
  s.timerStartedAt   = null;
  s.timerSecondsLeft = _phaseSeconds(phase, cs);
  s._clockExpiring   = false;
  state.liveScores[gameId] = s;
  saveLiveScores();
  // Update display immediately
  const el = document.getElementById('game-clock-' + gameId);
  if (el) el.textContent = fmtClock(s.timerSecondsLeft);
  renderGamesList();
  renderNextGameCard();
  if (state.currentTab === 'scores') renderScoresTab();
}

// Format timeout length for button labels: 1 → "1 Min", 0.5 → "30s", 1.5 → "1.5 Min"
function fmtTOLabel(mins) {
  if (mins < 1) return `${Math.round(mins * 60)}s`;
  return `${mins} Min`;
}

function callTeamTimeout(gameId, lengthMins) {
  const s  = getLiveScore(gameId);
  if (!s.teamTimeoutsUsed) s.teamTimeoutsUsed = [];
  if (s.teamTimeoutsUsed.includes(lengthMins)) { showToast('That timeout already used'); return; }
  pauseGameTimer(gameId);
  s.teamTimeoutsUsed = [...s.teamTimeoutsUsed, lengthMins];
  state.liveScores[gameId] = s;
  _pendingClock = getCurrentClockStr(gameId);
  _doRecordDirect(gameId, 'timeout');
}

function callOppTimeout(gameId, lengthMins) {
  const s  = getLiveScore(gameId);
  if (!s.oppTimeoutsUsed) s.oppTimeoutsUsed = [];
  if (s.oppTimeoutsUsed.includes(lengthMins)) { showToast('That timeout already used'); return; }
  pauseGameTimer(gameId);
  s.oppTimeoutsUsed = [...s.oppTimeoutsUsed, lengthMins];
  state.liveScores[gameId] = s;
  _pendingClock = getCurrentClockStr(gameId);
  _doRecordDirect(gameId, 'opp_timeout');
}

// ─── CLOCK PROMPT ─────────────────────────────────────────────────────────────

let _pendingClock    = '';   // clock value bridged from prompt → recording
let _clockCallback   = null; // called with the entered time (or '' to skip)

/** Show the clock-prompt bottom sheet. callback(clockStr) fires when confirmed. */
function promptClock(callback) {
  _clockCallback = callback;
  const input = $('clock-prompt-input');
  if (input) input.value = '';
  $('clock-prompt')?.classList.remove('hidden');
  document.body.classList.add('modal-open');
  // Auto-focus after the paint so keyboard opens
  setTimeout(() => $('clock-prompt-input')?.focus(), 80);
}

function confirmClockPrompt(val) {
  $('clock-prompt')?.classList.add('hidden');
  document.body.classList.remove('modal-open');
  const cb = _clockCallback;
  _clockCallback = null;
  if (cb) cb((val || '').trim());
}

function skipClockPrompt() { confirmClockPrompt(''); }

// ─── EVENT PICKER MODAL ───────────────────────────────────────────────────────

let _pickerGameId   = null;
let _pickerType     = 'goal';
let _pickerSixOnFive = false;

function openEventPicker(gameId, eventType) {
  const _doOpenPicker = () => {
    const isSixOnFive = eventType === 'goal_6v5';
    const realType    = isSixOnFive ? 'goal' : eventType;

    // Direct events — record immediately with the captured clock
    if (realType === 'timeout') { _doRecordDirect(gameId, 'timeout'); return; }

    const roster = getRosterPlayers();
    if (!roster.length && realType === 'goal') {
      recordEventForPlayer(gameId, 'goal', '', '', isSixOnFive);
      return;
    }

    _pickerGameId    = gameId;
    _pickerType      = realType;
    _pickerSixOnFive = isSixOnFive;

    const TITLES = {
      goal:      'Who scored?',
      assist:    'Who assisted?',
      exclusion: 'Who was excluded?',
      brutality: 'Brutality foul — who?',
      save:      'Who made the save?',
      block:     'Who blocked?',
    };

    const titleEl = $('roster-modal-title');
    const row6v5  = $('roster-6v5-row');
    const cb      = $('roster-6v5-checkbox');
    const list    = $('roster-modal-list');

    if (titleEl) titleEl.textContent = TITLES[realType] || 'Select Player';
    if (row6v5)  row6v5.classList.toggle('hidden', realType !== 'goal');
    if (cb)      cb.checked = isSixOnFive;

    // For save/block, show only goalkeepers; for everything else show full roster
    const goalieOnly    = realType === 'save' || realType === 'block';
    const displayRoster = goalieOnly
      ? sortedRoster(roster).filter(p => isGoalie(p.cap))
      : sortedRoster(roster);

    list.innerHTML = '';
    displayRoster.forEach(player => {
      const btn = document.createElement('button');
      btn.className = 'roster-player-btn';
      btn.innerHTML = `
        <span class="roster-cap">${player.cap ? '#'+escHtml(player.cap) : 'GK'}</span>
        <span class="roster-name">${escHtml(player.first)} ${escHtml(player.last)}</span>`;
      btn.addEventListener('click', () => {
        const sixOnFive = $('roster-6v5-checkbox')?.checked || _pickerSixOnFive;
        recordEventForPlayer(gameId, _pickerType, player.cap, `${player.first} ${player.last}`, sixOnFive);
        closeEventPicker();
      });
      list.appendChild(btn);
    });

    $('roster-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
  };
  // Always use auto-clock — no manual prompt needed.
  _pendingClock = getCurrentClockStr(gameId);
  _doOpenPicker();
}

// Backward-compat alias
function openRosterPicker(gameId) { openEventPicker(gameId, 'goal'); }

function closeEventPicker() {
  $('roster-modal').classList.add('hidden');
  document.body.classList.remove('modal-open');
  _pickerGameId = null;
  const cb = $('roster-6v5-checkbox');
  if (cb) cb.checked = false;
}
function closeRosterPicker() { closeEventPicker(); }

// ─── RESULT MANAGEMENT ────────────────────────────────────────────────────────

function setResult(gameId, result) {
  state.results[gameId] = state.results[gameId] === result ? null : result;
  localStorage.setItem(STORE.RESULTS, JSON.stringify(state.results));
  renderScheduleTab();
  renderPossibleTab();
  // Trigger a calendar re-sync if active
  if (state.syncActive && state.accessToken) syncToCalendar();
}

function setBracketResult(stepKey, result) {
  state.bracketResults[stepKey] = state.bracketResults[stepKey] === result ? null : result;
  localStorage.setItem(STORE.BRACKET_RESULTS, JSON.stringify(state.bracketResults));
  renderPossibleTab();
  renderNextGameCard(); // bracket projection may have advanced
}

// ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────

function ensureTokenClient() {
  if (state.tokenClient) return;
  if (!window.google?.accounts?.oauth2) return;
  // If parent is already signed in via Firebase, skip the account-picker popup
  const hint = (typeof fbGetUser === 'function' && fbGetUser()?.email) || undefined;
  state.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id:  CONFIG.CLIENT_ID,
    scope:      CONFIG.SCOPES,
    callback:   handleTokenResponse,
    ...(hint ? { login_hint: hint } : {}),
  });
}

function handleTokenResponse(resp) {
  if (resp.error) {
    showToast('Sign-in failed: ' + resp.error);
    updateSyncBadge('error');
    return;
  }
  state.accessToken = resp.access_token;
  state.tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
  if (state.pendingAction) {
    const fn = state.pendingAction;
    state.pendingAction = null;
    fn();
  }
}

/** Check if running inside Capacitor native app */
function _isNativePlatform() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function requestToken(callback) {
  if (_isNativePlatform()) {
    // ── Native iOS: GIS doesn't work in WKWebView ──────────────────────
    // Use the SocialLogin plugin to get a fresh access token with calendar scope
    _requestTokenNative(callback);
    return;
  }

  // ── Web browser: use GIS token client ──────────────────────────────
  ensureTokenClient();
  if (!state.tokenClient) {
    showToast('Google Sign-In not ready yet — try again in a moment.');
    return;
  }
  state.pendingAction = callback;
  if (state.accessToken && Date.now() < state.tokenExpiry) {
    const fn = state.pendingAction;
    state.pendingAction = null;
    fn();
    return;
  }
  const alreadyConsented = !!state.accessToken || (typeof fbIsSignedIn === 'function' && fbIsSignedIn());
  state.tokenClient.requestAccessToken({ prompt: alreadyConsented ? '' : 'consent' });
}

async function _requestTokenNative(callback) {
  // If we already have a valid token, use it
  if (state.accessToken && Date.now() < state.tokenExpiry) {
    callback();
    return;
  }

  try {
    const plugin = window.Capacitor?.Plugins?.SocialLogin;
    if (!plugin) {
      showToast('Calendar sync not available on this device.');
      return;
    }

    // Request Google sign-in with calendar scope to get an access token
    const result = await plugin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile', 'https://www.googleapis.com/auth/calendar'],
      },
    });

    console.info('[calendar] SocialLogin result keys:', JSON.stringify(result, null, 2).substring(0, 500));

    // The plugin may return accessToken as:
    // - { token: "..." } (object with token property)
    // - "..." (plain string)  
    // - nested under result.result
    const r = result?.result || result;
    let token = null;

    // Try accessToken.token (object format)
    if (r?.accessToken?.token) {
      token = r.accessToken.token;
    }
    // Try accessToken as string
    else if (typeof r?.accessToken === 'string') {
      token = r.accessToken;
    }
    // Try serverAuthCode (would need exchange, but log it)
    else {
      console.warn('[calendar] No accessToken found. Available keys:', Object.keys(r || {}));
      console.warn('[calendar] Full result:', JSON.stringify(r).substring(0, 300));
    }

    if (token) {
      state.accessToken = token;
      state.tokenExpiry = Date.now() + 50 * 60 * 1000; // ~50 min
      callback();
    } else {
      showToast('Could not get calendar access — please try again.');
    }
  } catch (e) {
    console.error('[calendar] native token error:', e);
    if (!e.message?.includes('cancel')) {
      showToast('Calendar sign-in failed — ' + e.message);
    }
  }
}

// ─── CALENDAR API ─────────────────────────────────────────────────────────────

async function calFetch(path, options = {}) {
  const resp = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${state.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${resp.status}`);
  }
  if (resp.status === 204) return {};
  return resp.json();
}

async function listCalendars() {
  const data = await calFetch('/users/me/calendarList');
  return (data.items || [])
    .filter(c => c.accessRole === 'owner' || c.accessRole === 'writer')
    .sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
}

function buildEventPayload(game, isPool = true) {
  const start = parseGameTime(game.dateISO, game.time);
  if (!start) return null;
  const end = new Date(start.getTime() + CONFIG.EVENT_DURATION_MIN * 60000);

  const title = isPool
    ? `Team vs ${game.opponent || 'TBD'} — ${TOURNAMENT.name}`
    : `Team ${game.desc} (Projected) — ${TOURNAMENT.name}`;

  const lines = [
    `Tournament: ${TOURNAMENT.name}`,
    `Date: ${game.date || game.dateISO}`,
    game.pool     ? `Pool: ${game.pool}`         : null,
    game.gameNum  ? `Game: ${game.gameNum}`      : null,
    game.cap      ? `Team Caps: ${game.cap}`      : null,
    !isPool       ? `Bracket: ${game.desc}`      : null,
    '',
    'Added by Eggbeater Water Polo App',
  ].filter(l => l !== null).join('\n');

  return {
    summary:     title,
    location:    game.location || '',
    description: lines,
    start: { dateTime: toISOLocal(start), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end:   { dateTime: toISOLocal(end),   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    extendedProperties: {
      private: {
        [CONFIG.EVENT_TAG]: 'true',
        gameId: game.id || game.gameNum || '',
        tournamentId: TOURNAMENT.id,
      },
    },
  };
}

async function syncToCalendar() {
  if (!state.selectedCalId || !state.accessToken) return;

  updateSyncBadge('syncing');
  renderSyncCard(); // show spinner

  try {
    // Fetch existing tagged events for this tournament
    const existingRes = await calFetch(
      `/calendars/${encodeURIComponent(state.selectedCalId)}/events` +
      `?privateExtendedProperty=${encodeURIComponent(CONFIG.EVENT_TAG + '=true')}` +
      `&privateExtendedProperty=${encodeURIComponent('tournamentId=' + TOURNAMENT.id)}` +
      `&maxResults=50&singleEvents=true`
    );
    const existingEvents = existingRes.items || [];
    const existingByGameId = {};
    for (const ev of existingEvents) {
      const gId = ev.extendedProperties?.private?.gameId;
      if (gId) existingByGameId[gId] = ev;
    }

    let created = 0, updated = 0, skipped = 0;

    // Sync all pool play games
    for (const game of getTournamentGames()) {
      const payload = buildEventPayload(game, true);
      if (!payload) { skipped++; continue; }
      const existing = existingByGameId[game.id];
      if (existing) {
        await calFetch(`/calendars/${encodeURIComponent(state.selectedCalId)}/events/${existing.id}`,
          { method: 'PUT', body: JSON.stringify(payload) });
        updated++;
      } else {
        await calFetch(`/calendars/${encodeURIComponent(state.selectedCalId)}/events`,
          { method: 'POST', body: JSON.stringify(payload) });
        created++;
      }
      delete existingByGameId[game.id];
    }

    // Sync next projected bracket step (as a tentative "possible" event)
    const nextInfo = findNextGameOrProjected();
    if (nextInfo?.type === 'bracket') {
      const bGame = nextInfo.game;
      const bId   = `bracket-${bGame.gameNum}`;
      const payload = buildEventPayload({ ...bGame, id: bId, dateISO: bGame.dateISO, time: bGame.time }, false);
      if (payload) {
        const existing = existingByGameId[bId];
        if (existing) {
          await calFetch(`/calendars/${encodeURIComponent(state.selectedCalId)}/events/${existing.id}`,
            { method: 'PUT', body: JSON.stringify(payload) });
          updated++;
        } else {
          await calFetch(`/calendars/${encodeURIComponent(state.selectedCalId)}/events`,
            { method: 'POST', body: JSON.stringify(payload) });
          created++;
        }
        delete existingByGameId[bId];
      }
    }

    // Delete stale events (old bracket projections, removed games)
    for (const stale of Object.values(existingByGameId)) {
      await calFetch(`/calendars/${encodeURIComponent(state.selectedCalId)}/events/${stale.id}`,
        { method: 'DELETE' });
    }

    state.lastSyncTime = new Date();
    updateSyncBadge('ok');
    renderSyncCard();

    const parts = [];
    if (created) parts.push(`${created} added`);
    if (updated) parts.push(`${updated} updated`);
    if (!parts.length) parts.push('Calendar up to date');
    showToast('📅 ' + parts.join(' · '), 'ok');

    // Schedule next auto-sync
    clearInterval(state.syncIntervalId);
    state.syncIntervalId = setInterval(() => {
      if (state.accessToken && Date.now() < state.tokenExpiry) syncToCalendar();
    }, CONFIG.SYNC_INTERVAL_MS);

  } catch (err) {
    updateSyncBadge('error');
    renderSyncCard();
    showToast('Sync failed: ' + err.message);
  }
}

// ─── CALENDAR CHOOSER ─────────────────────────────────────────────────────────

function startCalendarSetup() {
  requestToken(async () => {
    try {
      const cals = await listCalendars();
      renderCalendarChooser(cals);
      // Hide bottom nav while choosing
      document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
      $('view-calendar').classList.remove('hidden');
    } catch (err) {
      showToast('Could not load calendars: ' + err.message);
    }
  });
}

function renderCalendarChooser(calendars) {
  const list = $('calendars-list');
  list.innerHTML = '';
  calendars.forEach(cal => {
    const item = document.createElement('label');
    item.className = 'calendar-item';
    item.innerHTML = `
      <input type="radio" name="cal" value="${escHtml(cal.id)}">
      <span class="cal-dot" style="background:${escHtml(cal.backgroundColor || '#1440b0')}"></span>
      <span class="cal-name">${escHtml(cal.summary)}${cal.primary ? ' (Primary)' : ''}</span>
    `;
    item.querySelector('input').addEventListener('change', () => {
      state.selectedCalId   = cal.id;
      state.selectedCalName = cal.summary;
      localStorage.setItem(STORE.CALENDAR_ID,   cal.id);
      localStorage.setItem(STORE.CALENDAR_NAME, cal.summary);
      state.syncActive = true;
      // Return to schedule tab and sync
      switchTab('schedule');
      requestToken(() => syncToCalendar());
    });
    list.appendChild(item);
  });
}

function cancelCalendarChoice() {
  switchTab('schedule');
}

// ─── SYNC BADGE (header) ──────────────────────────────────────────────────────

function updateSyncBadge(status) {
  const badge = $('sync-badge');
  if (!state.syncActive) { badge.classList.add('hidden'); return; }
  badge.classList.remove('hidden');
  const map = {
    ok:      { text: '✓ Synced',   cls: 'badge-ok' },
    syncing: { text: '↻ Syncing',  cls: 'badge-syncing' },
    error:   { text: '⚠ Sync err', cls: 'badge-error' },
  };
  const { text, cls } = map[status] || map.ok;
  badge.textContent  = text;
  badge.className    = `sync-badge ${cls}`;
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────

function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
  $(`view-${tab}`)?.classList.remove('hidden');
  // For tabs in bottom nav, highlight them; for "more" tabs, highlight "more"
  const primaryTabs = ['schedule','scores','history'];
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (primaryTabs.includes(tab)) {
      btn.classList.toggle('nav-active', btn.dataset.tab === tab);
    } else {
      // Secondary tab (roster, possible, help, settings, tournscore) — highlight More
      btn.classList.toggle('nav-active', btn.dataset.tab === 'more');
    }
  });
  // Also update desktop-only sidebar items
  document.querySelectorAll('.desktop-nav-item').forEach(btn => {
    btn.classList.toggle('nav-active', btn.dataset.tab === tab);
  });
  updateTScoreTabVisibility();
  if (tab === 'roster')      renderRosterTab();
  if (tab === 'scores')      renderScoresTab();
  if (tab === 'tournscore')  renderTournScoreTab();
  if (tab === 'help')        renderHelpTab();
  if (tab === 'settings')    renderSettingsTab();
}

/** Toggle the More drawer bottom sheet */
function toggleMoreDrawer() {
  const el = $('more-drawer');
  if (!el) return;
  el.classList.toggle('hidden');
  updateTScoreTabVisibility();
}

/** Navigate from the More drawer — auto-closes drawer */
function moreNavigate(tab) {
  const el = $('more-drawer');
  if (el) el.classList.add('hidden');
  switchTab(tab);
}

/** Show/hide the T-Score item in the More drawer based on whether a director package is available. */
function updateTScoreTabVisibility() {
  // Drawer item
  const drawerItem = document.querySelector('.more-drawer-tscore');
  if (drawerItem) {
    const hasPkg = !!(getDirectorPkg() || state.tscorePkg);
    drawerItem.classList.toggle('hidden', !hasPkg);
  }
}

/** Render the Settings tab with team picker, favorites, and club change */
function renderSettingsTab() {
  const el = $('view-settings');
  if (!el) return;

  const currentClubId = getAppClubId() || '';
  const clubName = localStorage.getItem('ebwp-club-name') || currentClubId;

  // Auth state
  const fbAvailable = typeof firebase !== 'undefined' && typeof firebase.auth === 'function';
  const user = fbAvailable ? firebase.auth().currentUser : null;

  // Theme preference
  const themePref = getThemePref();
  function themePill(value, label) {
    const active = themePref === value;
    const style = active
      ? 'background:var(--royal);color:#fff;border-color:var(--royal)'
      : 'background:transparent;color:var(--gray-600);border-color:var(--gray-200)';
    return `<button onclick="applyThemePref('${value}');renderSettingsTab()" style="padding:6px 14px;border-radius:20px;font-size:0.82rem;font-weight:700;border:1.5px solid;cursor:pointer;font-family:inherit;transition:all .15s;${style}">${label}</button>`;
  }

  el.innerHTML = `
    <div class="card tab-card" style="padding:12px 16px;margin-bottom:8px">
      <h2 style="font-size:1.1rem;margin:0 0 2px 0">Settings</h2>
      <p class="step-desc" style="margin:0;font-size:0.78rem">Manage your team and preferences.</p>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Team Selection</div>
      <div id="settings-team-picker" class="settings-team-picker"></div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">My Clubs</div>
      <div id="settings-clubs-list">
        <div class="settings-item" style="justify-content:center;color:var(--gray-400);font-size:0.85rem">Loading clubs…</div>
      </div>
      <div class="settings-item" onclick="_settingsAddClub()" style="border-top:1px solid var(--gray-100)">
        <span class="settings-item-icon" style="color:var(--royal)">＋</span>
        <div class="settings-item-text">
          <div class="settings-item-label" style="color:var(--royal)">Add Club</div>
          <div class="settings-item-value">Join another club via code</div>
        </div>
      </div>
      <div class="settings-item" onclick="_settingsReturnToClubPicker()" style="border-top:1px solid var(--gray-100)">
        <span class="settings-item-icon">🏠</span>
        <div class="settings-item-text">
          <div class="settings-item-label">Return to Club Picker</div>
          <div class="settings-item-value">Switch to a different club</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">🎨 Appearance</div>
      <div style="padding:12px 16px">
        <div style="font-size:0.82rem;color:var(--gray-500);margin-bottom:10px">Choose your display theme</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${themePill('light', '☀️ Light')}
          ${themePill('dark', '🌙 Dark')}
          ${themePill('system', '⚙️ System')}
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">📅 Calendar &amp; Notifications</div>
      <div id="sync-section"></div>
      <div id="push-btn-container"></div>
    </div>

    <div class="settings-section" style="margin-bottom:24px">
      <div class="settings-section-title">Account</div>
      ${user ? `
        <div class="settings-item" style="cursor:default">
          <span class="settings-item-icon" style="font-size:1.3rem">☁️</span>
          <div class="settings-item-text">
            <div class="settings-item-label">${escHtml(user.displayName || 'Signed In')}</div>
            <div class="settings-item-value">${escHtml(user.email || '')}</div>
          </div>
        </div>
        <div class="settings-item" onclick="fbSignOut()" style="border-top:1px solid var(--gray-100)">
          <span class="settings-item-icon">🚪</span>
          <div class="settings-item-text">
            <div class="settings-item-label" style="color:#dc2626">Sign Out</div>
          </div>
        </div>
      ` : `
        <div class="settings-item" onclick="fbSignIn()">
          <span class="settings-item-icon">👤</span>
          <div class="settings-item-text">
            <div class="settings-item-label">Sign In with Google</div>
            <div class="settings-item-value">Sync preferences across devices</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      `}
    </div>
  `;

  // Render team pills into the settings area
  _renderSettingsTeamPicker();
  // Load club list asynchronously
  _renderSettingsClubList();
  // Render calendar sync + push notification widgets
  renderSyncCard();
  renderPushButton();
}

/** Fetch joined clubs from worker and render quick-switch list in Settings */
async function _renderSettingsClubList() {
  const container = $('settings-clubs-list');
  if (!container) return;

  const currentClubId = getAppClubId() || '';
  const joined = getJoinedClubs();

  let allClubs = [];
  try {
    const res = await fetch(WORKER + '/clubs');
    if (res.ok) {
      const data = await res.json();
      allClubs = data.clubs || [];
    }
  } catch (e) {
    console.warn('[settings] fetch /clubs error:', e.message);
  }

  const clubs = allClubs.filter(c => joined.includes(c.id));

  if (!clubs.length) {
    container.innerHTML = `
      <div class="settings-item" style="cursor:default">
        <span class="settings-item-icon">🤽‍♀️</span>
        <div class="settings-item-text">
          <div class="settings-item-label">${escHtml(localStorage.getItem('ebwp-club-name') || currentClubId || 'No club')}</div>
          <div class="settings-item-value">Use "Add Club" below to join a club</div>
        </div>
      </div>
    `;
    return;
  }

  let html = '';
  for (const club of clubs) {
    const isCurrent = club.id === currentClubId;
    const nameStyle = isCurrent ? 'font-weight:700;color:var(--royal)' : '';
    const clubIcon = club.logo
      ? `<img src="${escHtml(club.logo)}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1.5px solid var(--gray-200)">`
      : `<span style="font-size:1.3rem">🤽‍♀️</span>`;
    const switchAction = isCurrent ? '' : `_settingsSwitchClub('${escHtml(club.id)}','${escHtml(club.name || club.id)}','${escHtml(club.clubType || '')}')`;
    const removeBtn = `<button onclick="event.stopPropagation();_settingsRemoveClub('${escHtml(club.id)}')" style="flex-shrink:0;background:none;border:none;padding:6px;cursor:pointer;color:var(--gray-400);font-size:1rem;line-height:1;border-radius:6px" title="Remove club">✕</button>`;
    html += `
      <div class="settings-item" onclick="${switchAction}" style="${isCurrent ? 'cursor:default;background:var(--royal-subtle)' : ''}">
        <span class="settings-item-icon" style="display:flex;align-items:center;justify-content:center">${clubIcon}</span>
        <div class="settings-item-text">
          <div class="settings-item-label" style="${nameStyle}">${escHtml(club.name || club.id)}</div>
          ${isCurrent ? '<div class="settings-item-value">Current club</div>' : ''}
        </div>
        ${isCurrent ? '<span style="color:var(--royal);font-weight:800;font-size:1rem;flex-shrink:0;margin-right:4px">✓</span>' : ''}
        ${removeBtn}
      </div>
    `;
  }
  container.innerHTML = html;
}

/** Quick-switch to a different club from Settings */
function _settingsSwitchClub(clubId, clubName, clubType) {
  // Clear ALL old club's data (tournament, history, scores, roster, etc.)
  // but keep my-players (favorite player stats persist across clubs)
  localStorage.removeItem('ebwp-team-keys');   // legacy global key
  localStorage.removeItem('ebwp-team-key');    // legacy compat key
  // Note: ebwp-fav-groups-{clubId} and ebwp-team-keys-{clubId} are NOT cleared
  // — each club's favorites and team selection are stored per-club and persist
  localStorage.removeItem('ebwp-tournament-id');
  localStorage.removeItem('ebwp-snapshot');
  localStorage.removeItem('ebwp-results');
  localStorage.removeItem('ebwp-bracket-results');
  localStorage.removeItem('ebwp-live-scores');
  localStorage.removeItem('ebwp-history');
  localStorage.removeItem('ebwp-roster');
  // Also clear any team-specific history/data (ebwp-history-*, ebwp-sched-*)
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('ebwp-history-') || k.startsWith('ebwp-sched-') ||
              k.startsWith('ebwp-mpc-'))) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  // Note: ebwp-my-players is NOT cleared — favorite player stats persist across clubs

  // Set the new club
  localStorage.setItem('ebwp-club-id', clubId);
  localStorage.setItem('ebwp-club-name', clubName);
  if (clubType) {
    localStorage.setItem('ebwp-club-type', clubType);
  } else {
    localStorage.removeItem('ebwp-club-type');
  }
  // Reload to re-initialize with the new club
  window.location.href = window.location.pathname + '?club=' + encodeURIComponent(clubId);
}

/** Remove a club from the joined list. If it's the current club, return to splash. */
function _settingsRemoveClub(clubId) {
  removeJoinedClub(clubId);
  const currentClubId = getAppClubId();
  if (clubId === currentClubId) {
    // Clear current club and return to club picker
    localStorage.removeItem('ebwp-club-id');
    localStorage.removeItem('ebwp-club-name');
    localStorage.removeItem('ebwp-club-type');
    window.location.href = window.location.pathname;
  } else {
    _renderSettingsClubList();
  }
}

/** Clear current club and return to the club picker splash screen */
function _settingsReturnToClubPicker() {
  localStorage.removeItem('ebwp-club-id');
  localStorage.removeItem('ebwp-club-name');
  localStorage.removeItem('ebwp-club-type');
  window.location.href = window.location.pathname;
}

/** Show inline add-club input in Settings */
function _settingsAddClub() {
  const container = $('settings-clubs-list');
  if (!container) return;
  // Check if already showing
  if (container.querySelector('.settings-join-row')) return;

  const row = document.createElement('div');
  row.className = 'settings-join-row';
  row.style.cssText = 'display:flex;gap:8px;padding:10px 16px;border-top:1px solid var(--gray-100)';
  row.innerHTML = `
    <input id="settings-join-input" type="text" placeholder="Enter club code"
           style="flex:1;padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:0.88rem;font-family:inherit">
    <button onclick="_settingsJoinClub()" style="padding:9px 14px;background:var(--royal);color:white;border:none;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;white-space:nowrap">Join</button>
  `;
  container.parentElement.insertBefore(row, container.nextSibling.nextSibling);

  const errDiv = document.createElement('div');
  errDiv.id = 'settings-join-error';
  errDiv.style.cssText = 'font-size:0.8rem;color:#dc2626;padding:0 16px 8px;min-height:14px';
  row.parentElement.insertBefore(errDiv, row.nextSibling);

  setTimeout(() => document.getElementById('settings-join-input')?.focus(), 100);
}

/** Handle joining a club from Settings */
async function _settingsJoinClub() {
  const input = document.getElementById('settings-join-input');
  const errEl = document.getElementById('settings-join-error');
  if (!input) return;
  const code = input.value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!code) { if (errEl) errEl.textContent = 'Please enter a club code'; return; }

  try {
    const res = await fetch(WORKER + '/clubs');
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    const club = (data.clubs || []).find(c => c.id === code);
    if (!club) {
      if (errEl) errEl.textContent = `Club "${code}" not found. Check with your admin.`;
      return;
    }
    addJoinedClub(code);
    if (typeof showToast === 'function') showToast(`Joined ${club.name || code}!`);
    _renderSettingsClubList(); // refresh the list
    // Remove join row
    const row = document.querySelector('.settings-join-row');
    if (row) row.remove();
    if (errEl) errEl.remove();
  } catch (e) {
    if (errEl) errEl.textContent = 'Could not connect. Try again.';
  }
}

/** Render team pills inside the Settings tab */
function _renderSettingsTeamPicker() {
  const container = $('settings-team-picker');
  if (!container) return;

  const isHS = localStorage.getItem('ebwp-club-type') === 'highschool';
  const selectedTeams = getSelectedTeams();
  const favGroups = getFavGroups();

  if (isHS) {
    const groups = [
      { label: 'Boys',  keys: [{key:'boys-varsity',label:'Varsity'},{key:'boys-jv',label:'JV'}] },
      { label: 'Girls', keys: [{key:'girls-varsity',label:'Varsity'},{key:'girls-jv',label:'JV'}] },
    ];
    function buildStar(key) {
      const isFav = favGroups.includes(key);
      const cls = isFav ? 'age-star age-star-on' : 'age-star';
      const icon = isFav ? '★' : '☆';
      return `<span class="${cls}" onclick="event.stopPropagation();toggleFavGroup('${escHtml(key)}');_renderSettingsTeamPicker();renderHeader()" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">${icon}</span>`;
    }
    let html = '<div class="age-pill-row" style="gap:6px">';
    for (const g of groups) {
      const anyActive = g.keys.some(k => selectedTeams.includes(k.key));
      const pillCls = anyActive ? 'age-pill age-pill-active age-pill-compound' : 'age-pill';
      if (!anyActive) {
        html += `<button class="${pillCls}" onclick="onAgeGroupToggle('${g.keys[0].key}');_renderSettingsTeamPicker();renderHeader()">${escHtml(g.label)}</button>`;
      } else {
        const groupKeys = g.keys.map(k => k.key).join(',');
        const subBtns = g.keys.map(k => {
          const cls = selectedTeams.includes(k.key) ? 'age-sub-btn age-sub-active' : 'age-sub-btn';
          return `<button class="${cls}" onclick="event.stopPropagation();onAgeGroupToggle('${escHtml(k.key)}');_renderSettingsTeamPicker();renderHeader()">${buildStar(k.key)}${escHtml(k.label)}</button>`;
        }).join('');
        html += `<div class="${pillCls}">
          <button class="age-pill-label" style="padding:6px 10px;font-weight:700;background:none;border:none;color:inherit;cursor:pointer" onclick="event.stopPropagation();deselectHSGroup('${groupKeys}');_renderSettingsTeamPicker();renderHeader()">${escHtml(g.label)}</button>
          <span class="age-pill-sep">·</span>
          ${subBtns}
        </div>`;
      }
    }
    html += '</div>';
    container.innerHTML = html;
  } else {
    // Club teams: standard pill layout with A/B sub-pills for multi-team tournaments
    let html = '<div class="age-pill-row" style="gap:6px;flex-wrap:wrap">';
    for (const opt of TEAM_OPTIONS) {
      const active = selectedTeams.includes(opt.key);
      const isFav = favGroups.includes(opt.key);
      const starCls = isFav ? 'age-star age-star-on' : 'age-star';
      const starIcon = isFav ? '★' : '☆';
      const starBtn = `<span class="${starCls}" onclick="event.stopPropagation();toggleFavGroup('${escHtml(opt.key)}');_renderSettingsTeamPicker();renderHeader()">${starIcon}</span>`;

      // Check if this age group has a multi-team tournament
      const cache = TEAM_CACHE[opt.key];
      const isMulti = cache && cache.tournament && cache.tournament.singleTeam !== true;

      if (active && isMulti) {
        // Show compound pill with team letter sub-buttons
        const validTeams = cache.tournament.enableCTeam ? ['A','B','C'] :
          (Array.isArray(cache.tournament.teams) && cache.tournament.teams.length
            ? cache.tournament.teams : ['A','B']);
        const selectedLetters = getTeamLettersForGroup(opt.key).filter(l => validTeams.includes(l));
        const effective = selectedLetters.length ? selectedLetters : [validTeams[0]];

        const subBtns = validTeams.map(letter => {
          const lbl = cache.tournament.teamLabels?.[letter] || `Team ${letter}`;
          const isOn = effective.includes(letter);
          const subCls = isOn ? 'age-sub-btn age-sub-active' : 'age-sub-btn';
          return `<button class="${subCls}" onclick="event.stopPropagation();switchTeam('${letter}','${escHtml(opt.key)}');_renderSettingsTeamPicker()">${escHtml(lbl)}</button>`;
        }).join('');

        html += `<div class="age-pill age-pill-active age-pill-compound">
          <button class="age-pill-label" style="padding:6px 10px;font-weight:700;background:none;border:none;color:inherit;cursor:pointer" onclick="event.stopPropagation();onAgeGroupToggle('${escHtml(opt.key)}');_renderSettingsTeamPicker();renderHeader()">${starBtn}${escHtml(opt.label)}</button>
          <span class="age-pill-sep">·</span>
          ${subBtns}
        </div>`;
      } else {
        const cls = active ? 'age-pill age-pill-active' : 'age-pill';
        html += `<button class="${cls}" onclick="onAgeGroupToggle('${escHtml(opt.key)}');_renderSettingsTeamPicker();renderHeader()">
          ${starBtn}
          ${escHtml(opt.label)}
        </button>`;
      }
    }
    html += '</div>';
    container.innerHTML = html;
  }
}

// ─── RENDER: SCORES TAB ───────────────────────────────────────────────────────

function renderScoresTab() {
  const el = $('view-scores');
  if (!el) return;

  // ── Director "Submit Live Scores" section (prepended regardless of scorer mode) ──
  const dirPkg = getDirectorPkg();
  const dirGames = dirPkg?.directorGames || [];
  let dirHtml = '';
  if (dirGames.length) {
    // Restore unlock state from localStorage (keyed by code so it resets on new publish)
    if (!state.dirScorerUnlocked) {
      const savedCode = localStorage.getItem(DIR_SCORER_CODE);
      if (localStorage.getItem(DIR_SCORER_KEY) === '1' && savedCode === dirPkg.code) {
        state.dirScorerUnlocked = true;
      }
    }
    dirHtml = buildDirScoreSection(dirPkg, dirGames);
  }

  // Multi-slot: show read-only scores per (ageGroup × letter) slot
  const scoreSlots = getExpandedTeamSlots();
  if (scoreSlots.length > 1) {
    const scorerLocked = TOURNAMENT.scoringPassword && !isScorerUnlocked();
    const loginBar = scorerLocked
      ? `<div class="scorer-gate-bar"><button class="scorer-gate-btn" onclick="openScoringPasswordModal()">🔒 Scorer Login</button></div>`
      : (!isScorerUnlocked() ? '' : `<div class="scorer-gate-bar"><button class="scorer-gate-btn scorer-gate-btn-active" onclick="">✅ Scorer Active</button></div>`);
    let html = loginBar;
    for (const { groupKey, letter } of scoreSlots) {
      const cache = TEAM_CACHE[groupKey];
      const allGames = cache ? (cache.tournament.games || []) : [];
      const firstTeam = cache && Array.isArray(cache.tournament.teams) ? cache.tournament.teams[0] : 'A';
      const letters = letter ? [letter] : getTeamLettersForGroup(groupKey);
      const games = allGames.filter(g => g.team ? letters.includes(g.team) : letters.includes(firstTeam));
      const today = new Date().toISOString().split('T')[0];
      const active = games.filter(g => (!g.dateISO || g.dateISO >= today));
      const rows = active.length
        ? active.map(g => buildGameCard(g, true)).join('')
        : `<p class="empty-msg" style="padding:14px 0">No active games.</p>`;
      html += `<div class="card tab-card">
        <div class="history-header-row"><h2>Scores</h2><span class="history-subtitle">${escHtml(_groupSectionLabelFor(groupKey, letter))}</span></div>
        ${rows}
      </div>`;
    }
    el.innerHTML = dirHtml + html;
    return;
  }

  // ── Tab-level: scorer not unlocked → show live scores (viewer mode) with scorer login in corner ─
  if (TOURNAMENT.scoringPassword && !isScorerUnlocked()) {

    const games = getTournamentGames();
    const activeGames = games.filter(g => !state.results[g.id]);
    const gameNumVal = g => parseInt((g.gameNum || '').replace(/\D/g, ''), 10) || 9999;
    activeGames.sort((a, b) => {
      const d = (a.dateISO || '').localeCompare(b.dateISO || '');
      return d !== 0 ? d : gameNumVal(a) - gameNumVal(b);
    });

    const anyLive = activeGames.some(g => isGameLive(g.id));

    let cardsHtml = '';
    if (!activeGames.length) {
      cardsHtml = `<div class="card tab-card" style="text-align:center;padding:24px 16px">
          <div style="font-size:2rem;margin-bottom:8px">${swimmerEmoji(teamKey)}</div>
          <div style="font-weight:700;margin-bottom:4px">No games scheduled yet</div>
          <div style="color:var(--gray-600);font-size:0.88rem">Check back on tournament day.</div>
        </div>`;
    } else {
      const byDate = {};
      const dateOrder = [];
      for (const g of activeGames) {
        const d = g.date || g.dateISO || 'Unknown';
        if (!byDate[d]) { byDate[d] = []; dateOrder.push(d); }
        byDate[d].push(g);
      }
      for (const dateKey of dateOrder) {
        cardsHtml += `<div class="date-group-header">${escHtml(dateKey)}</div><div class="games-section">`;
        for (const g of byDate[dateKey]) cardsHtml += buildGameCard(g, true);
        cardsHtml += `</div>`;
      }
    }

    el.innerHTML = dirHtml + `
        <div class="viewer-tab-bar">
          <span class="viewer-tab-label">${anyLive ? '🔴 Live Scores' : '📺 Scores'}</span>
          <button class="viewer-tab-login-btn" onclick="openScoringPasswordModal()">🔒 Scorer Login</button>
        </div>
        ${anyLive ? `<div class="live-tab-banner">📡 Live scoring in progress — scores update every 10 seconds</div>` : ''}
        ${cardsHtml}`;
    return;
  }

  const games = getTournamentGames();
  if (!games.length) {
    const tName = TOURNAMENT.name ? `<strong>${escHtml(TOURNAMENT.name)}</strong>` : 'the upcoming tournament';
    const tDate = TOURNAMENT.dates ? ` on ${escHtml(TOURNAMENT.dates)}` : '';
    el.innerHTML = dirHtml + `<div class="card tab-card">
      <div class="history-header-row"><h2>Box Scores</h2></div>
      <div style="padding:20px 16px;text-align:center">
        <div style="font-size:2rem;margin-bottom:10px">${swimmerEmoji()}</div>
        <div style="font-weight:700;font-size:1rem;margin-bottom:6px">Live scoring coming soon</div>
        <div style="color:var(--gray-600);font-size:0.88rem;line-height:1.55">
          Box scores and live game stats will be available here on tournament day${tDate}.<br><br>
          Check back once the schedule for ${tName} is posted.
        </div>
      </div>
    </div>`;
    return;
  }

  // Group games by date — filter out completed games (they appear in History tab)
  const activeGames = games.filter(g => !state.results[g.id]);

  if (!activeGames.length) {
    el.innerHTML = dirHtml + `<div class="card tab-card">
      <div class="history-header-row"><h2>Box Scores</h2></div>
      <p class="empty-msg" style="padding:16px 0">All games complete — check the History tab for results.</p>
    </div>`;
    return;
  }

  // Sort by game number
  const gameNumVal = g => parseInt((g.gameNum || '').replace(/\D/g, ''), 10) || 9999;
  activeGames.sort((a, b) => {
    const d = (a.dateISO || '').localeCompare(b.dateISO || '');
    return d !== 0 ? d : gameNumVal(a) - gameNumVal(b);
  });

  const byDate = {};
  const dateOrder = [];
  for (const g of activeGames) {
    const d = g.date || g.dateISO || 'Unknown';
    if (!byDate[d]) { byDate[d] = []; dateOrder.push(d); }
    byDate[d].push(g);
  }

  // Live banner — shown when any game is being scored by another device
  const liveGames = games.filter(g => {
    const s = state.liveScores[g.id];
    return s?._remote && s.gameState && s.gameState !== 'pre'
      && (Date.now() - (s._broadcastAt || 0)) < 30 * 60 * 1000;
  });
  const bannerHtml = liveGames.length
    ? `<div class="live-tab-banner">📡 Live scoring in progress — scores update every 10 seconds</div>`
    : '';

  // Single lock bar at the top when scorer is unlocked
  const lockBar = TOURNAMENT.scoringPassword
    ? `<div class="scorer-tab-bar">
         <span class="scorer-tab-label">🔓 Scorer Mode Active</span>
         <button class="scorer-tab-lock-btn" onclick="lockScoring()">🔒 Lock</button>
       </div>`
    : '';

  let html = lockBar + bannerHtml;
  for (const dateKey of dateOrder) {
    html += `<div class="date-group-header">${escHtml(dateKey)}</div>`;
    html += `<div class="games-section">`;
    for (const g of byDate[dateKey]) html += buildGameCard(g);
    html += `</div>`;
  }

  el.innerHTML = dirHtml + html;
}

// ─── DIRECTOR LIVE SCORES ─────────────────────────────────────────────────────

function buildDirScoreSection(dirPkg, dirGames) {
  if (!state.dirScorerUnlocked) {
    // Locked: show unlock button and read-only scores if any exist
    const anyScores = Object.keys(state.dirScores).some(id => state.dirScores[id]?.status === 'final');
    const resultsHtml = anyScores ? buildDirStandingsHtml(dirGames) : '';
    return `
      <div class="card tab-card" id="dir-score-section">
        <div class="history-header-row">
          <h2>Submit Live Scores</h2>
          <span class="history-subtitle">${escHtml(dirPkg.tournamentName || '')}</span>
        </div>
        ${resultsHtml}
        <button class="btn" style="margin-top:${anyScores?'12':'0'}px" onclick="openDirScoringModal()">🔒 Unlock Score Entry</button>
      </div>`;
  }

  // Unlocked: score entry grid grouped by division
  const groups = {};
  for (const g of dirGames) {
    const key = (g.ageGroupName ? g.ageGroupName + ' · ' : '') + 'Division ' + (g.divisionName || '?');
    if (!groups[key]) groups[key] = [];
    groups[key].push(g);
  }

  let rows = '';
  for (const [label, grpGames] of Object.entries(groups)) {
    rows += `<div style="margin-bottom:14px">
      <div style="font-size:0.72rem;font-weight:700;color:var(--royal);text-transform:uppercase;margin-bottom:6px">${escHtml(label)}</div>`;
    for (const g of grpGames) {
      const sc = state.dirScores[g.id] || {};
      const isFinal = sc.status === 'final';
      rows += `
        <div style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100);flex-wrap:wrap">
          <div style="flex:1;min-width:140px;font-size:0.88rem">
            <span style="font-weight:600;color:var(--royal-dark)">${escHtml(g.team1Name || g.team1Seed)}</span>
            <span style="color:var(--gray-400);margin:0 5px">vs</span>
            <span style="font-weight:600;color:var(--royal-dark)">${escHtml(g.team2Name || g.team2Seed)}</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <input type="number" min="0" max="99" id="dir-s1-${escHtml(g.id)}"
                   value="${isFinal ? sc.score1 : ''}" placeholder="–"
                   style="width:46px;text-align:center;padding:5px 4px;border:1.5px solid var(--gray-300);border-radius:6px;font-size:1rem;font-weight:700">
            <span style="color:var(--gray-400);font-weight:700">–</span>
            <input type="number" min="0" max="99" id="dir-s2-${escHtml(g.id)}"
                   value="${isFinal ? sc.score2 : ''}" placeholder="–"
                   style="width:46px;text-align:center;padding:5px 4px;border:1.5px solid var(--gray-300);border-radius:6px;font-size:1rem;font-weight:700">
            <button class="btn${isFinal ? ' btn-ghost' : ''}" style="font-size:0.8rem;padding:5px 12px"
                    onclick="submitDirGameScore('${escHtml(g.id)}')">
              ${isFinal ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>`;
    }
    rows += '</div>';
  }

  const standingsHtml = Object.keys(state.dirScores).length ? buildDirStandingsHtml(dirGames) : '';

  return `
    <div class="card tab-card" id="dir-score-section">
      <div class="history-header-row">
        <h2>Submit Live Scores</h2>
        <button class="btn btn-ghost" style="font-size:0.78rem;padding:5px 12px" onclick="lockDirScoring()">🔒 Lock</button>
      </div>
      ${rows}
      ${standingsHtml ? `<div style="margin-top:14px;padding-top:12px;border-top:2px solid var(--gray-100)">${standingsHtml}</div>` : ''}
    </div>`;
}

function buildDirStandingsHtml(dirGames) {
  const divStats = {};
  for (const g of dirGames) {
    const sc = state.dirScores[g.id];
    if (!sc || sc.status !== 'final') continue;
    const divKey = (g.ageGroupName || '') + '|' + (g.divisionName || '');
    if (!divStats[divKey]) divStats[divKey] = { agName: g.ageGroupName, divName: g.divisionName, teams: {} };
    const ds = divStats[divKey].teams;
    const t1 = g.team1Name || g.team1Seed;
    const t2 = g.team2Name || g.team2Seed;
    if (!ds[t1]) ds[t1] = { w:0, l:0, t:0, gf:0, ga:0 };
    if (!ds[t2]) ds[t2] = { w:0, l:0, t:0, gf:0, ga:0 };
    ds[t1].gf += sc.score1; ds[t1].ga += sc.score2;
    ds[t2].gf += sc.score2; ds[t2].ga += sc.score1;
    if (sc.score1 > sc.score2)      { ds[t1].w++; ds[t2].l++; }
    else if (sc.score1 < sc.score2) { ds[t2].w++; ds[t1].l++; }
    else                             { ds[t1].t++; ds[t2].t++; }
  }
  if (!Object.keys(divStats).length) return '';
  let html = '<div style="font-size:0.8rem;font-weight:700;color:var(--gray-700);margin-bottom:8px">Standings</div>';
  for (const { agName, divName, teams } of Object.values(divStats)) {
    const sorted = Object.entries(teams).sort(([,a],[,b]) => {
      const pa = a.w*3+a.t, pb = b.w*3+b.t;
      return pa !== pb ? pb - pa : (b.gf-b.ga) - (a.gf-a.ga);
    });
    html += `<div style="margin-bottom:10px">
      <div style="font-size:0.72rem;font-weight:700;color:var(--royal);margin-bottom:4px">${escHtml(agName ? agName + ' · ' : '')}Division ${escHtml(divName)}</div>
      <table style="width:100%;font-size:0.82rem;border-collapse:collapse">
        <tr style="color:var(--gray-400);font-size:0.7rem;text-align:center">
          <th style="text-align:left;padding:2px 4px;font-weight:600">Team</th>
          <th style="padding:2px 6px">W</th><th style="padding:2px 6px">L</th><th style="padding:2px 6px">T</th>
          <th style="padding:2px 6px">GF</th><th style="padding:2px 6px">GA</th><th style="padding:2px 6px">GD</th>
        </tr>
        ${sorted.map(([name, s], i) => `
          <tr style="border-top:1px solid var(--gray-100)">
            <td style="padding:4px 4px;font-weight:${i===0?'700':'400'}">${i+1}. ${escHtml(name)}</td>
            <td style="text-align:center;padding:4px 6px">${s.w}</td>
            <td style="text-align:center;padding:4px 6px">${s.l}</td>
            <td style="text-align:center;padding:4px 6px">${s.t}</td>
            <td style="text-align:center;padding:4px 6px">${s.gf}</td>
            <td style="text-align:center;padding:4px 6px">${s.ga}</td>
            <td style="text-align:center;padding:4px 6px;color:${s.gf-s.ga>0?'var(--green)':s.gf-s.ga<0?'var(--red)':'inherit'}">${s.gf-s.ga>0?'+':''}${s.gf-s.ga}</td>
          </tr>`).join('')}
      </table>
    </div>`;
  }
  return html;
}

function buildDirReseedHtml(dirPkg, dirGames) {
  // Show reseeding guidance for divisions that have seedByDay enabled and are fully scored
  if (!dirPkg?.ageGroups) return '';
  let html = '';
  for (const ag of dirPkg.ageGroups) {
    for (const dv of (ag.divisions || [])) {
      if (!dv.seedByDay) continue;
      // Get games for this division
      const divGames = dirGames.filter(g => g.ageGroupName === ag.name && g.divisionName === dv.name);
      const scoredGames = divGames.filter(g => state.dirScores[g.id]?.status === 'final');
      if (!scoredGames.length) continue;
      // Calculate standings
      const teams = {};
      for (const g of scoredGames) {
        const sc = state.dirScores[g.id];
        const t1 = g.team1Name || g.team1Seed, t2 = g.team2Name || g.team2Seed;
        if (!teams[t1]) teams[t1] = { w:0, l:0, t:0, gf:0, ga:0 };
        if (!teams[t2]) teams[t2] = { w:0, l:0, t:0, gf:0, ga:0 };
        teams[t1].gf += sc.score1; teams[t1].ga += sc.score2;
        teams[t2].gf += sc.score2; teams[t2].ga += sc.score1;
        if (sc.score1 > sc.score2) { teams[t1].w++; teams[t2].l++; }
        else if (sc.score1 < sc.score2) { teams[t2].w++; teams[t1].l++; }
        else { teams[t1].t++; teams[t2].t++; }
      }
      const sorted = Object.entries(teams).sort(([,a],[,b]) => {
        const pa = a.w*3+a.t, pb = b.w*3+b.t;
        return pa !== pb ? pb - pa : (b.gf-b.ga) - (a.gf-a.ga);
      });
      const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
      html += `<div style="margin-top:14px;padding-top:12px;border-top:2px solid var(--gray-100)">
        <div style="font-size:0.8rem;font-weight:700;color:var(--gray-700);margin-bottom:6px">Next Day Seeding — ${escHtml(ag.name ? ag.name + ' · ' : '')}Division ${escHtml(dv.name)}</div>
        ${sorted.map(([name, s], i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.85rem">
            <span style="font-weight:700;color:var(--royal);min-width:32px">${ordinals[i] || (i+1)+'th'}</span>
            <span style="font-weight:600">${escHtml(name)}</span>
            <span style="color:var(--gray-400);font-size:0.78rem">${s.w}W–${s.l}L${s.t?'–'+s.t+'T':''}</span>
            <span style="margin-left:auto;font-size:0.75rem;color:var(--gray-400);font-style:italic">feeds "${ordinals[i] || (i+1)+'th'} Div ${escHtml(dv.name)}"</span>
          </div>`).join('')}
      </div>`;
    }
  }
  return html;
}

function openDirScoringModal() {
  const modal = document.getElementById('dir-scoring-pw-modal');
  if (!modal) return;
  const inp = document.getElementById('dir-scoring-pw-input');
  if (inp) inp.value = '';
  const err = document.getElementById('dir-scoring-pw-error');
  if (err) err.textContent = '';
  modal.classList.remove('hidden');
  setTimeout(() => { if (inp) inp.focus(); }, 100);
}

function closeDirScoringModal() {
  const modal = document.getElementById('dir-scoring-pw-modal');
  if (modal) modal.classList.add('hidden');
}

function submitDirScoringPassword() {
  const dirPkg = getDirectorPkg();
  if (!dirPkg) return;
  const entered = (document.getElementById('dir-scoring-pw-input')?.value || '').trim();
  const correct = (dirPkg.directorScoringPassword || '').trim();
  if (correct && entered !== correct) {
    const err = document.getElementById('dir-scoring-pw-error');
    if (err) err.textContent = 'Incorrect password — try again';
    return;
  }
  state.dirScorerUnlocked = true;
  localStorage.setItem(DIR_SCORER_KEY, '1');
  localStorage.setItem(DIR_SCORER_CODE, dirPkg.code || '');
  closeDirScoringModal();
  showToast('🔓 Score entry unlocked!', 'ok');
  renderScoresTab();
  startDirScorePolling();
}

function lockDirScoring() {
  state.dirScorerUnlocked = false;
  localStorage.removeItem(DIR_SCORER_KEY);
  renderScoresTab();
}

async function submitDirGameScore(gameId) {
  const dirPkg = getDirectorPkg();
  if (!dirPkg) return;
  const s1el = document.getElementById('dir-s1-' + gameId);
  const s2el = document.getElementById('dir-s2-' + gameId);
  if (!s1el || !s2el) return;
  const score1 = parseInt(s1el.value);
  const score2 = parseInt(s2el.value);
  if (isNaN(score1) || isNaN(score2)) { showToast('Enter both scores'); return; }
  try {
    const res = await fetch(WORKER + '/dir-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: dirPkg.code,
        gameId,
        score1,
        score2,
        password: dirPkg.directorScoringPassword || '',
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Save failed');
    state.dirScores[gameId] = { score1, score2, status: 'final', updatedAt: Date.now() };
    showToast('✓ Score saved');
    renderScoresTab();
    if (state.currentTab === 'possible') renderPossibleTab();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

async function pollDirScores() {
  const dirPkg = getDirectorPkg();
  if (!dirPkg?.code || !dirPkg?.directorGames?.length) return;
  try {
    const res = await fetch(WORKER + '/dir-scores?code=' + encodeURIComponent(dirPkg.code));
    const data = await res.json();
    if (!data.ok) return;
    let changed = false;
    for (const [id, sc] of Object.entries(data.scores || {})) {
      const existing = state.dirScores[id];
      if (!existing || sc.updatedAt > (existing.updatedAt || 0)) {
        state.dirScores[id] = sc;
        changed = true;
      }
    }
    if (changed) {
      if (state.currentTab === 'scores') renderScoresTab();
      if (state.currentTab === 'possible') renderPossibleTab();
    }
  } catch {}
}

function startDirScorePolling() {
  if (state.dirPollTimer) clearInterval(state.dirPollTimer);
  const dirPkg = getDirectorPkg();
  if (!dirPkg?.code || !dirPkg?.directorGames?.length) return;
  pollDirScores(); // immediate first fetch
  state.dirPollTimer = setInterval(pollDirScores, 30000);
}

// ─── RENDER: TOURNAMENT SCORE TAB ────────────────────────────────────────────

const TSCORE_STORE   = 'ebwp-tscore-pkg';       // cached tournament package
const TSCORE_PW_KEY  = 'ebwp-tscore-pw';        // remembered scorer password
const TSCORE_CODE_KEY = 'ebwp-tscore-code';      // remembered share code

function renderTournScoreTab() {
  const el = $('view-tournscore');
  if (!el) return;

  // Step 1: Scorer password gate
  if (!state.tscoreUnlocked) {
    const savedCode = localStorage.getItem(TSCORE_CODE_KEY) || '';
    el.innerHTML = `
      <div class="card tab-card">
        <h2>🏆 Tournament Score</h2>
        <p class="step-desc">Enter the scoring password and share code to access the full tournament bracket for live score entry.</p>
        <div style="margin-top:14px">
          <label style="font-size:0.82rem;font-weight:600;color:var(--gray-700);display:block;margin-bottom:4px">Scorer Password</label>
          <input id="tscore-pw" type="password" class="form-input" placeholder="Tournament password"
                 autocomplete="off" autocorrect="off" spellcheck="false"
                 style="margin-bottom:12px;font-size:0.95rem"
                 onkeydown="if(event.key==='Enter')document.getElementById('tscore-code')?.focus()">
          <label style="font-size:0.82rem;font-weight:600;color:var(--gray-700);display:block;margin-bottom:4px">Share Code</label>
          <input id="tscore-code" type="text" class="form-input" placeholder="e.g. ABC123" maxlength="6"
                 value="${escHtml(savedCode)}"
                 autocomplete="off" spellcheck="false"
                 style="text-transform:uppercase;letter-spacing:2px;font-weight:700;font-size:1rem;margin-bottom:12px"
                 oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')"
                 onkeydown="if(event.key==='Enter')unlockTournScore()">
          <div id="tscore-err" style="color:var(--red);font-size:0.82rem;margin-bottom:8px"></div>
          <button class="btn" style="width:100%;padding:12px;font-size:0.95rem;font-weight:700" onclick="unlockTournScore()">🔓 Unlock Tournament Scoring</button>
        </div>
      </div>`;
    return;
  }

  // Step 2: Bracket loaded — render score entry
  const pkg = state.tscorePkg;
  if (!pkg) { el.innerHTML = '<div class="card tab-card"><p class="empty-msg">No tournament data loaded.</p></div>'; return; }

  let html = `<div class="card tab-card">
    <div class="history-header-row">
      <h2>🏆 ${escHtml(pkg.tournamentName || 'Tournament')}</h2>
      <button class="btn btn-ghost" style="font-size:0.78rem;padding:5px 12px" onclick="lockTournScore()">🔒 Lock</button>
    </div>
    <p class="step-desc" style="margin-bottom:4px">${escHtml([pkg.dates, pkg.location].filter(Boolean).join(' · '))}</p>`;

  // Render each age group > division group > division with games
  const ags = pkg.ageGroups || [];
  const dirGames = pkg.directorGames || [];

  if (dirGames.length) {
    // Group games by age group + division
    const groups = {};
    for (const g of dirGames) {
      const key = (g.ageGroupName ? g.ageGroupName + ' · ' : '') + (g.divisionGroupName ? g.divisionGroupName + ' · ' : '') + 'Division ' + (g.divisionName || '?');
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    }

    for (const [label, grpGames] of Object.entries(groups)) {
      html += `<div style="margin-top:14px">
        <div style="font-size:0.75rem;font-weight:700;color:var(--royal);text-transform:uppercase;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid var(--royal-light)">${escHtml(label)}</div>`;
      for (const g of grpGames) {
        const sc = state.tscoreScores[g.id] || {};
        const isFinal = sc.status === 'final';
        html += `
          <div style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100);flex-wrap:wrap">
            <div style="flex:1;min-width:130px;font-size:0.88rem">
              <span style="font-weight:600;color:var(--royal-dark)">${escHtml(g.team1Name || g.team1Seed || '?')}</span>
              <span style="color:var(--gray-400);margin:0 4px">vs</span>
              <span style="font-weight:600;color:var(--royal-dark)">${escHtml(g.team2Name || g.team2Seed || '?')}</span>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="number" min="0" max="99" id="ts-s1-${escHtml(g.id)}"
                     value="${isFinal ? sc.score1 : ''}" placeholder="–" inputmode="numeric"
                     style="width:46px;text-align:center;padding:5px 4px;border:1.5px solid ${isFinal?'var(--green)':'var(--gray-300)'};border-radius:6px;font-size:1rem;font-weight:700">
              <span style="color:var(--gray-400);font-weight:700">–</span>
              <input type="number" min="0" max="99" id="ts-s2-${escHtml(g.id)}"
                     value="${isFinal ? sc.score2 : ''}" placeholder="–" inputmode="numeric"
                     style="width:46px;text-align:center;padding:5px 4px;border:1.5px solid ${isFinal?'var(--green)':'var(--gray-300)'};border-radius:6px;font-size:1rem;font-weight:700">
              <button class="btn${isFinal ? ' btn-ghost' : ''}" style="font-size:0.8rem;padding:5px 12px"
                      onclick="submitTournScore('${escHtml(g.id)}')">
                ${isFinal ? '✓' : 'Save'}
              </button>
            </div>
          </div>`;
      }
      html += '</div>';
    }
  } else {
    html += '<p class="empty-msg" style="padding:20px 0">No bracket games found in this tournament package.</p>';
  }

  // Standings
  if (dirGames.length && Object.keys(state.tscoreScores).length) {
    html += '<div style="margin-top:16px;padding-top:12px;border-top:2px solid var(--gray-100)">';
    html += buildTournScoreStandings(dirGames);
    html += '</div>';
  }

  html += '</div>';
  el.innerHTML = html;
}

async function unlockTournScore() {
  const pw = (document.getElementById('tscore-pw')?.value || '').trim();
  const code = (document.getElementById('tscore-code')?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const errEl = document.getElementById('tscore-err');
  if (!code || code.length < 6) { if (errEl) errEl.textContent = 'Enter the 6-character share code'; return; }

  if (errEl) errEl.textContent = 'Loading…';
  try {
    const res = await fetch(WORKER + '/tournament-pkg?code=' + encodeURIComponent(code));
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Package not found');
    const pkg = data.pkg;

    // Verify password
    const correctPw = (pkg.directorScoringPassword || '').trim();
    if (correctPw && pw !== correctPw) {
      if (errEl) errEl.textContent = 'Incorrect scoring password';
      return;
    }

    // Success — store and unlock
    state.tscoreUnlocked = true;
    state.tscorePkg = { ...pkg, code };
    state.tscorePw = pw;
    state.tscoreScores = {};
    localStorage.setItem(TSCORE_CODE_KEY, code);
    localStorage.setItem(TSCORE_PW_KEY, pw);
    localStorage.setItem(TSCORE_STORE, JSON.stringify({ ...pkg, code }));

    // Fetch existing scores
    await pollTournScores();
    startTournScorePolling();
    renderTournScoreTab();
  } catch (e) {
    if (errEl) errEl.textContent = e.message;
  }
}

function lockTournScore() {
  state.tscoreUnlocked = false;
  state.tscorePkg = null;
  state.tscoreScores = {};
  if (state.tscorePollTimer) clearInterval(state.tscorePollTimer);
  localStorage.removeItem(TSCORE_PW_KEY);
  renderTournScoreTab();
}

async function submitTournScore(gameId) {
  const pkg = state.tscorePkg;
  if (!pkg) return;
  const s1el = document.getElementById('ts-s1-' + gameId);
  const s2el = document.getElementById('ts-s2-' + gameId);
  if (!s1el || !s2el) return;
  const score1 = parseInt(s1el.value);
  const score2 = parseInt(s2el.value);
  if (isNaN(score1) || isNaN(score2)) { showToast('Enter both scores'); return; }
  try {
    const res = await fetch(WORKER + '/dir-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: pkg.code,
        gameId,
        score1,
        score2,
        password: state.tscorePw || pkg.directorScoringPassword || '',
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Save failed');
    state.tscoreScores[gameId] = { score1, score2, status: 'final', updatedAt: Date.now() };
    showToast('✓ Score saved');
    renderTournScoreTab();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

async function pollTournScores() {
  const pkg = state.tscorePkg;
  if (!pkg?.code) return;
  try {
    const res = await fetch(WORKER + '/dir-scores?code=' + encodeURIComponent(pkg.code));
    const data = await res.json();
    if (!data.ok) return;
    let changed = false;
    for (const [id, sc] of Object.entries(data.scores || {})) {
      const existing = state.tscoreScores[id];
      if (!existing || sc.updatedAt > (existing.updatedAt || 0)) {
        state.tscoreScores[id] = sc;
        changed = true;
      }
    }
    if (changed && state.currentTab === 'tournscore') renderTournScoreTab();
  } catch {}
}

function startTournScorePolling() {
  if (state.tscorePollTimer) clearInterval(state.tscorePollTimer);
  if (!state.tscorePkg?.code) return;
  state.tscorePollTimer = setInterval(pollTournScores, 15000);
}

function buildTournScoreStandings(dirGames) {
  const divStats = {};
  for (const g of dirGames) {
    const sc = state.tscoreScores[g.id];
    if (!sc || sc.status !== 'final') continue;
    const divKey = (g.ageGroupName || '') + '|' + (g.divisionGroupName || '') + '|' + (g.divisionName || '');
    if (!divStats[divKey]) divStats[divKey] = { agName: g.ageGroupName, dgName: g.divisionGroupName, divName: g.divisionName, teams: {} };
    const ds = divStats[divKey].teams;
    const t1 = g.team1Name || g.team1Seed;
    const t2 = g.team2Name || g.team2Seed;
    if (!ds[t1]) ds[t1] = { w:0, l:0, t:0, gf:0, ga:0 };
    if (!ds[t2]) ds[t2] = { w:0, l:0, t:0, gf:0, ga:0 };
    ds[t1].gf += sc.score1; ds[t1].ga += sc.score2;
    ds[t2].gf += sc.score2; ds[t2].ga += sc.score1;
    if (sc.score1 > sc.score2)      { ds[t1].w++; ds[t2].l++; }
    else if (sc.score1 < sc.score2) { ds[t2].w++; ds[t1].l++; }
    else                             { ds[t1].t++; ds[t2].t++; }
  }
  if (!Object.keys(divStats).length) return '';
  let html = '<div style="font-size:0.82rem;font-weight:700;color:var(--gray-700);margin-bottom:8px">Standings</div>';
  for (const { agName, dgName, divName, teams } of Object.values(divStats)) {
    const sorted = Object.entries(teams).sort(([,a],[,b]) => {
      const pa = a.w*3+a.t, pb = b.w*3+b.t;
      return pa !== pb ? pb - pa : (b.gf-b.ga) - (a.gf-a.ga);
    });
    const label = [agName, dgName, 'Division ' + divName].filter(Boolean).join(' · ');
    html += `<div style="margin-bottom:10px">
      <div style="font-size:0.72rem;font-weight:700;color:var(--royal);margin-bottom:4px">${escHtml(label)}</div>
      <table style="width:100%;font-size:0.82rem;border-collapse:collapse">
        <tr style="color:var(--gray-400);font-size:0.7rem;text-align:center">
          <th style="text-align:left;padding:2px 4px;font-weight:600">Team</th>
          <th style="padding:2px 6px">W</th><th style="padding:2px 6px">L</th><th style="padding:2px 6px">T</th>
          <th style="padding:2px 6px">GF</th><th style="padding:2px 6px">GA</th><th style="padding:2px 6px">GD</th>
        </tr>
        ${sorted.map(([name, s], i) => `
          <tr style="border-top:1px solid var(--gray-100)">
            <td style="padding:4px 4px;font-weight:${i===0?'700':'400'}">${i+1}. ${escHtml(name)}</td>
            <td style="text-align:center;padding:4px 6px">${s.w}</td>
            <td style="text-align:center;padding:4px 6px">${s.l}</td>
            <td style="text-align:center;padding:4px 6px">${s.t}</td>
            <td style="text-align:center;padding:4px 6px">${s.gf}</td>
            <td style="text-align:center;padding:4px 6px">${s.ga}</td>
            <td style="text-align:center;padding:4px 6px;color:${s.gf-s.ga>0?'var(--green)':s.gf-s.ga<0?'var(--red)':'inherit'}">${s.gf-s.ga>0?'+':''}${s.gf-s.ga}</td>
          </tr>`).join('')}
      </table>
    </div>`;
  }
  return html;
}

// Restore tournament score session on load
function restoreTournScoreSession() {
  try {
    const pkgStr = localStorage.getItem(TSCORE_STORE);
    const pw = localStorage.getItem(TSCORE_PW_KEY);
    if (pkgStr && pw) {
      const pkg = JSON.parse(pkgStr);
      state.tscoreUnlocked = true;
      state.tscorePkg = pkg;
      state.tscorePw = pw;
      state.tscoreScores = {};
      pollTournScores();
      startTournScorePolling();
    }
  } catch {}
}

// ─── RENDER: HEADER ───────────────────────────────────────────────────────────

function renderHeader() {
  const isUpcoming = !!(TOURNAMENT.upcomingMode);
  const isHS = localStorage.getItem('ebwp-club-type') === 'highschool';
  const clubId = getAppClubId();

  let headerName = TOURNAMENT.name || 'Tournament';
  let headerSub = [TOURNAMENT.dates, TOURNAMENT.location].filter(Boolean).join(' · ');

  if (isHS) {
    const savedClubName = localStorage.getItem('ebwp-club-name');
    headerName = savedClubName
      || (clubId ? clubId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : headerName);
    const teamKey = getSelectedTeam();
    const teamOpt = TEAM_OPTIONS.find(t => t.key === teamKey);
    const teamLabel = teamOpt ? teamOpt.label : (teamKey || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const seasonLabel = `Fall ${new Date().getFullYear()} Season`;
    headerSub = teamLabel ? teamLabel + ' · ' + seasonLabel : seasonLabel;
  } else if (TOURNAMENT.stayTuned) {
    const savedClubName = localStorage.getItem('ebwp-club-name');
    headerName = savedClubName
      || (clubId ? clubId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : headerName);
    // Even in non-HS mode, if we are in "Stay Tuned" mode (no tourney), show the selected team in subtext
    const teamKey = getSelectedTeam();
    const teamOpt = TEAM_OPTIONS.find(t => t.key === teamKey);
    const teamLabel = teamOpt ? teamOpt.label : (teamKey || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (teamLabel) headerSub = teamLabel;
  }

  $('header-tournament-name').innerHTML =
    (isUpcoming ? '<em>Upcoming Tournament:</em> ' : '') + escHtml(headerName);
  $('header-tournament-dates').textContent = headerSub;

  // Render compact team indicator in header (tappable → opens Settings)
  renderTeamPicker();
  syncHeaderHeight();
}

/** Render a compact team badge in the header that opens Settings when tapped */
function renderTeamPicker() {
  const el = $('team-picker');
  if (!el) return;

  const selectedTeams = getSelectedTeams();
  const isHS = localStorage.getItem('ebwp-club-type') === 'highschool';

  // Build label for current team(s)
  const labels = selectedTeams.map(k => {
    const opt = TEAM_OPTIONS.find(t => t.key === k);
    if (opt) return opt.label;
    return k.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  });
  const displayLabel = labels.join(', ') || 'Select Team';

  el.innerHTML = `
    <button class="header-team-badge" onclick="moreNavigate('settings')" title="Change team">
      <span class="header-team-label">${escHtml(displayLabel)}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
  `;
}

/** Keep --header-h CSS variable in sync so the desktop sidebar top offset is correct. */
function syncHeaderHeight() {
  const h = document.querySelector('.app-header');
  if (h) document.documentElement.style.setProperty('--header-h', h.offsetHeight + 'px');
}

// ─── RENDER: SCHEDULE TAB ─────────────────────────────────────────────────────

function renderScheduleTab() {
  _renderSuffix = '';
  const slots = getExpandedTeamSlots();
  if (slots.length === 0) {
    const msg = '<p class="empty-msg" style="padding:24px;text-align:center;color:var(--gray-500)">Select an age group above to view the schedule.</p>';
    const ns = $('next-game-section'); if (ns) ns.innerHTML = '';
    const sl = $('schedule-list');    if (sl) sl.innerHTML = msg;
    const ss = $('schedule-standings'); if (ss) ss.innerHTML = '';
    renderDirectorImportCard();
    return;
  }
  if (slots.length > 1) { _renderScheduleMulti(slots); return; }
  renderNextGameCard();
  renderDirectorImportCard();
  renderGamesList();
  // When there's no active schedule, show the bracket standings below the coming-soon card
  // Use HISTORY_SEED (current team's server data) to avoid showing stale entries from
  // other age groups that were previously selected and merged into shared localStorage.
  if (!getTournamentGames().length) {
    renderHistoryStandings('schedule-standings', window.HISTORY_SEED || []);
  } else {
    const el = $('schedule-standings');
    if (el) el.innerHTML = '';
  }
  // Refresh button at the bottom of the tab
  const rb = $('schedule-refresh-wrap');
  if (rb) rb.innerHTML = `
    <button class="schedule-refresh-btn" id="schedule-refresh-btn" onclick="forceAppRefresh(this)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      Force Refresh
    </button>`;
}

/**
 * Returns an array of { groupKey, letter, suffix } slots — one per (ageGroup × selectedLetter).
 * When 14u Girls has both A+B selected → two slots. When single letter → one slot per group.
 * `suffix` is used as the unique DOM ID fragment (e.g. "14u-girls-A").
 */
function getExpandedTeamSlots() {
  const slots = [];
  for (const groupKey of getSelectedTeams()) {
    const cache = TEAM_CACHE[groupKey];
    const isMulti = cache && cache.tournament.singleTeam !== true;
    if (!isMulti) {
      slots.push({ groupKey, letter: null, suffix: groupKey });
    } else {
      const valid = cache.tournament.enableCTeam ? ['A','B','C'] :
        (Array.isArray(cache.tournament.teams) && cache.tournament.teams.length
          ? cache.tournament.teams : ['A','B']);
      const selected = getTeamLettersForGroup(groupKey).filter(l => valid.includes(l));
      const effective = selected.length ? selected : [valid[0]];
      for (const letter of effective) {
        slots.push({ groupKey, letter, suffix: `${groupKey}-${letter}` });
      }
    }
  }
  return slots;
}

/** Section label for a specific slot: "14u Girls · 680 Red". */
function _groupSectionLabelFor(groupKey, letter) {
  const base = TEAM_OPTIONS.find(t => t.key === groupKey)?.label || groupKey;
  if (!letter) return base;
  const cache = TEAM_CACHE[groupKey];
  if (!cache || cache.tournament.singleTeam === true) return base;
  const teamLabel = cache.tournament.teamLabels?.[letter];
  return teamLabel ? `${base} · ${teamLabel}` : `${base} · Team ${letter}`;
}

/** Section label using current render context (_activeTeamLetters). */
function _groupSectionLabel(groupKey) {
  if (_activeTeamLetters?.length === 1) return _groupSectionLabelFor(groupKey, _activeTeamLetters[0]);
  const base  = TEAM_OPTIONS.find(t => t.key === groupKey)?.label || groupKey;
  const cache = TEAM_CACHE[groupKey];
  if (!cache || cache.tournament.singleTeam === true) return base;
  const letters    = getTeamLettersForGroup(groupKey);
  const teamLabels = letters.map(l => cache.tournament.teamLabels?.[l]).filter(Boolean);
  return teamLabels.length ? `${base} · ${teamLabels.join(' & ')}` : base;
}

function _renderScheduleMulti(slots) {
  renderDirectorImportCard();
  $('next-game-section').innerHTML = '';
  $('schedule-standings').innerHTML = '';

  $('schedule-list').innerHTML = slots.map(({ groupKey, letter, suffix }) =>
    `<div class="team-section">
      <div class="team-section-header">${escHtml(_groupSectionLabelFor(groupKey, letter))}</div>
      <div id="next-game-section-${suffix}"></div>
      <div id="schedule-list-${suffix}"></div>
    </div>`
  ).join('');

  for (const { groupKey, letter, suffix } of slots) {
    const cache = TEAM_CACHE[groupKey];
    if (!cache) continue;
    const savedT = window.TOURNAMENT, savedH = window.HISTORY_SEED;
    window.TOURNAMENT = cache.tournament; window.HISTORY_SEED = cache.history || [];
    _activeAgeGroup = groupKey;
    _activeTeamLetters = letter ? [letter] : null;
    _renderSuffix = '-' + suffix;
    renderNextGameCard();
    renderGamesList();
    _renderSuffix = '';
    _activeTeamLetters = null;
    _activeAgeGroup = null;
    window.TOURNAMENT = savedT; window.HISTORY_SEED = savedH;
  }

  const rb = $('schedule-refresh-wrap');
  if (rb) rb.innerHTML = `<button class="schedule-refresh-btn" id="schedule-refresh-btn" onclick="forceAppRefresh(this)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
    Force Refresh</button>`;
}

/** Clears SW cache and reloads to pick up latest code + data. */
async function forceAppRefresh(btn) {
  if (btn) { btn.disabled = true; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Refreshing…'; }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) { /* ignore — reload anyway */ }
  window.location.reload();
}

function renderNextGameCard() {
  const section = $('next-game-section');
  const next = findNextGameOrProjected();

  if (!next) {
    // Check if tournament is fully complete
    const allPoolDone = getTournamentGames().length > 0 &&
      getTournamentGames().every(g => state.results[g.id]);
    if (allPoolDone) {
      section.innerHTML = `
        <div class="next-game-wrap">
          <div class="next-game-card next-complete">
            <div class="next-label">Tournament</div>
            <div class="next-vs">Pool Play Complete ${swimmerEmoji()}</div>
            <div class="next-meta"><span>Record: ${getPoolRecord()} — Check Possible tab for bracket path</span></div>
          </div>
        </div>`;
    } else {
      section.innerHTML = '';
    }
    return;
  }

  if (next.type === 'pool') {
    const g = next.game;
    const capIcon = g.cap === 'Dark' ? '🔵' : '⚪';
    const nextLive = isGameLive(g.id);
    // Live score summary — shown on the IN PROGRESS card
    const liveS = nextLive ? getLiveScore(g.id) : null;
    const GS_DISPLAY = { start:'Starting', q1:'Q1', q2:'Q2', half:'Half Time', q3:'Q3', q4:'Q4', shootout:'Shootout', final:'Final' };
    const gsLabel    = (liveS && GS_DISPLAY[liveS.gameState]) || '';
    const clockStr   = liveS ? getCurrentClockStr(g.id) : '';
    const liveSummary = (liveS && liveS.gameState && liveS.gameState !== 'pre')
      ? `<div class="next-live-score">
           <span class="next-live-score-nums">${liveS.team} &ndash; ${liveS.opp}</span>
           ${gsLabel ? `<span class="next-live-period">${gsLabel}</span>` : ''}
           ${clockStr ? `<span class="next-live-clock" id="next-game-clock-${g.id}">${clockStr}</span>` : ''}
         </div>`
      : '';
    section.innerHTML = `
      <div class="next-game-wrap">
        <div class="next-game-card${nextLive ? ' next-game-live' : ''}">
          <div class="next-game-card-top">
            ${g.gameNum ? `<div class="next-game-num">${escHtml(g.gameNum)}</div>` : ''}
            ${nextLive ? `<span class="live-badge-next">🔴 LIVE</span>` : ''}
            <button class="follow-live-btn" onclick="toggleLiveActivity('${g.id}')">📡 Follow Live</button>
          </div>
          <div class="next-label">${nextLive ? 'In Progress' : 'Next Game'}</div>
          <div class="next-vs">vs ${escHtml(g.opponent || 'TBD')}</div>
          ${liveSummary}
          <div class="next-meta">
            <span>🕐 ${escHtml(g.time)} &nbsp;·&nbsp; ${escHtml(g.date || g.dateISO)}</span>
            ${g.pool              ? `<span>${swimmerEmoji()} ${escHtml(g.pool)}</span>`              : ''}
            ${TOURNAMENT.location ? buildLocationLink(TOURNAMENT.location) : ''}
          </div>
          <div class="next-cap-badge">${capIcon} ${escHtml(g.cap)} Caps</div>
        </div>
      </div>`;
  } else {
    // Projected bracket game
    const g = next.game;
    const timeStr = g.time && g.time !== 'TBD'
      ? `🕐 ${escHtml(g.time)} · ${escHtml(g.date || g.dateISO)}`
      : g.date ? escHtml(g.date) : 'Time TBD';
    section.innerHTML = `
      <div class="next-game-wrap">
        <div class="next-game-card next-projected">
          ${g.gameNum ? `<div class="next-game-num">${escHtml(g.gameNum)}</div>` : ''}
          <div class="next-label">Projected Next — ${escHtml(next.pathLabel || '')}</div>
          <div class="next-vs">${escHtml(g.desc || 'Bracket Game')}</div>
          <div class="next-meta">
            <span>${timeStr}</span>
            ${bracketLocationDisplay(g.location) ? buildLocationLink(bracketLocationDisplay(g.location)) : ''}
          </div>
          <div class="next-cap-badge projected-note">Based on ${getPoolRecord()} pool record</div>
        </div>
      </div>`;
  }
}

function renderSyncCard() {
  const section = $('sync-section');

  if (!state.syncActive) {
    // Show "Sync to Calendar" invite
    section.innerHTML = `
      <div class="sync-invite-card">
        <div class="sync-invite-inner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--royal)">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <div class="sync-invite-text">
            <strong>Add to Google Calendar</strong>
            <span>Sync all games to your calendar</span>
          </div>
        </div>
        <button class="btn-sync-connect" onclick="startCalendarSetup()">Connect</button>
      </div>`;
  } else {
    // Show sync status
    const timeStr = state.lastSyncTime
      ? state.lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Not yet synced';
    section.innerHTML = `
      <div class="sync-status-card">
        <div class="sync-status-inner">
          <span class="sync-cal-name">📅 ${escHtml(state.selectedCalName || 'Calendar')}</span>
          <span class="sync-time">Last sync: ${timeStr}</span>
        </div>
        <div class="sync-btn-row">
          <button class="btn-sync-now" onclick="requestToken(() => syncToCalendar())">Sync Now</button>
          <button class="btn-sync-change" onclick="disconnectCalendar()" title="Change or disconnect calendar">Change</button>
        </div>
      </div>`;
  }
}

/** Disconnects the current calendar so the user can pick a new one. */
function disconnectCalendar() {
  if (!confirm('Disconnect calendar and choose a different one?')) return;
  clearInterval(state.syncIntervalId);
  state.syncActive      = false;
  state.selectedCalId   = null;
  state.selectedCalName = null;
  state.lastSyncTime    = null;
  state.syncIntervalId  = null;
  state.accessToken     = null;
  state.tokenExpiry     = null;
  localStorage.removeItem(STORE.CALENDAR_ID);
  localStorage.removeItem(STORE.CALENDAR_NAME);
  renderSyncCard();
  showToast('Calendar disconnected — tap Connect to choose a new one');
}

// ─── TOURNAMENT DIRECTOR IMPORT ───────────────────────────────────────────────

const DIR_STORE        = 'ebwp-director-pkg';         // localStorage key for last-imported package
const DIR_SCORER_KEY   = 'ebwp-dir-scorer-unlocked';  // localStorage key for director scorer unlock
const DIR_SCORER_CODE  = 'ebwp-dir-scorer-code';      // localStorage key for which code was unlocked

function getDirectorPkg() {
  try { return JSON.parse(localStorage.getItem(DIR_STORE) || 'null'); } catch { return null; }
}

function renderDirectorImportCard() {
  // Director import moved to T-Score tab — this is now a no-op
}

async function importDirectorPackage() {
  const input = document.getElementById('director-code-input');
  if (!input) return;
  const code = (input.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 6) { showToast('Enter the 6-character share code'); return; }
  input.disabled = true;
  try {
    const res = await fetch(`${WORKER}/tournament-pkg?code=${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Import failed');
    const pkg = data.pkg;
    localStorage.setItem(DIR_STORE, JSON.stringify({ ...pkg, importedAt: Date.now(), code }));
    const summary = [pkg.tournamentName || 'Tournament', pkg.dates, pkg.location].filter(Boolean).join(' · ');
    showToast('Imported: ' + summary);
    input.value = '';
    renderDirectorImportCard();
  } catch (e) {
    showToast('Import failed: ' + e.message);
  } finally {
    if (input) input.disabled = false;
  }
}

function clearDirectorImport() {
  localStorage.removeItem(DIR_STORE);
  renderDirectorImportCard();
}


function renderGamesList() {
  const listEl = $('schedule-list');
  const games  = getTournamentGames();

  if (!games.length) {
    if (TOURNAMENT.stayTuned) {
      listEl.innerHTML = `
        <div class="coming-soon-wrap">
          <div class="coming-soon-card">
            <div class="coming-soon-icon">⏳</div>
            <div class="coming-soon-text">
              <div class="coming-soon-label">Stay Tuned!</div>
              <div class="coming-soon-sub">${localStorage.getItem('ebwp-club-type') === 'highschool' ? 'Future season information will appear here.' : 'Future tournament information will appear here.'}</div>
              <div class="coming-soon-sub" style="margin-top:8px;font-size:.82rem;opacity:.8">Enable notifications to be updated when ${localStorage.getItem('ebwp-club-type') === 'highschool' ? 'season info is' : 'tournaments are'} added.</div>
            </div>
          </div>
        </div>`;
    } else if (TOURNAMENT.comingSoon) {
      listEl.innerHTML = `
        <div class="coming-soon-wrap">
          <div class="coming-soon-card">
            <div class="coming-soon-icon">📅</div>
            <div class="coming-soon-text">
              <div class="coming-soon-label">${escHtml(TOURNAMENT.comingSoon)}</div>
              <div class="coming-soon-sub">Upcoming Tournament: ${escHtml(TOURNAMENT.name)}</div>
              ${TOURNAMENT.dates ? `<div class="coming-soon-date">🗓 ${escHtml(TOURNAMENT.dates)}</div>` : ''}
            </div>
          </div>
        </div>`;
    } else {
      listEl.innerHTML = '<p class="empty-msg" style="padding:24px 18px;">No games scheduled.</p>';
    }
    return;
  }

  // Show only today + future games that haven't been completed yet
  // Completed games (with a result) move to the History tab automatically
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingGames = games.filter(g =>
    (!g.dateISO || g.dateISO >= todayStr) && !state.results[g.id]
  );

  if (!upcomingGames.length) {
    listEl.innerHTML = '<p class="empty-msg" style="padding:24px 18px;">All games complete — check the History tab for results.</p>';
    return;
  }

  // Sort by date then by game number numerically (G1 < G4 < G10 < G13)
  const gameNumVal = g => parseInt((g.gameNum || '').replace(/\D/g, ''), 10) || 9999;
  upcomingGames.sort((a, b) => {
    const d = (a.dateISO || '').localeCompare(b.dateISO || '');
    if (d !== 0) return d;
    return gameNumVal(a) - gameNumVal(b);
  });

  // Exclude the next game — it already appears in the blue card above
  const nextObj    = findNextGameOrProjected();
  const nextGameId = nextObj?.type === 'pool' ? nextObj.game?.id : null;
  const listGames  = upcomingGames.filter(g => g.id !== nextGameId);

  if (!listGames.length) { listEl.innerHTML = ''; return; }

  const groups = {};
  const groupOrder = [];
  for (const g of listGames) {
    const key = g.date || g.dateISO || 'TBD';
    if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
    groups[key].push(g);
  }

  let html = '';
  for (const dateLabel of groupOrder) {
    html += `<div class="date-group-header">${escHtml(dateLabel)}</div>`;
    html += `<div class="games-section">`;
    for (const g of groups[dateLabel]) html += buildScheduleCard(g);
    html += `</div>`;
  }
  listEl.innerHTML = html;
}

// Clean schedule card — shows game info only, no scoring controls.
// Completed games (with a result) are filtered out upstream and shown in History.
function buildScheduleCard(g) {
  const capIcon = g.cap === 'Dark' ? '🔵' : '⚪';
  // LIVE badge is handled by the Next Game blue card; plain schedule cards don't show it
  const isLive = getTournamentGames().some(game => game.id === g.id && isGameLive(game.id));
  const liveBadge = isLive ? ' <span class="live-badge">🔴 LIVE</span>' : '';
  const followBtn = `<button class="follow-live-btn-sm" onclick="toggleLiveActivity('${g.id}')" title="Follow Live on Lock Screen">📡 Follow</button>`;

  return `
    <div class="sched-card">
      <div class="sched-card-top">
        <div class="sched-vs">${TOURNAMENT.clubName ? escHtml(TOURNAMENT.clubName) + ' vs ' : 'vs '}${escHtml(g.opponent || 'TBD')}${liveBadge} ${followBtn}</div>
        ${g.gameNum ? `<div class="sched-game-num">${escHtml(g.gameNum)}</div>` : ''}
      </div>
      <div class="sched-meta">
        <span>🕐 ${escHtml(g.time || 'TBD')}${g.date ? ' · ' + escHtml(g.date) : ''}</span>
        ${g.pool              ? `<span>${swimmerEmoji()} ${escHtml(g.pool)}</span>`              : ''}
        ${TOURNAMENT.location ? buildLocationLink(TOURNAMENT.location) : ''}
      </div>
      <div class="sched-cap-badge">${capIcon} ${escHtml(g.cap || '')} Caps</div>
    </div>`;
}

function buildGameCard(g, viewerOnly = false) {
  const result    = state.results[g.id] || null;
  const pts       = getPoints(result);
  const win       = isWin(result);
  const loss      = isLoss(result);
  const cardClass = win ? 'result-win' : loss ? 'result-loss' : '';
  const capIcon   = g.cap === 'Dark' ? '🔵' : '⚪';
  const pillHtml  = result
    ? `<span class="result-pill ${win ? 'win' : 'loss'}">${resultLabel(result)}</span>` : '';

  const btn = (cls, val, label, p) => {
    const active = result === val ? 'active' : '';
    return `<button class="result-btn ${cls} ${active}" onclick="setResult('${escHtml(g.id)}','${val}')"><span class="rbtn-label">${label}</span><span class="rbtn-pts">${p} pt${p !== 1 ? 's' : ''}</span></button>`;
  };

  // ── Live scoring / box score section ──────────────────────────────────────
  const s   = getLiveScore(g.id);
  const gid = escHtml(g.id);

  // Live broadcast indicator (shown when another device is actively scoring)
  const STALE_MS = 30 * 60 * 1000; // 30 min — after this, treat as stale
  const isRemoteLive = !!(s._remote && s.gameState && s.gameState !== 'pre'
    && (Date.now() - (s._broadcastAt || 0)) < STALE_MS);
  const liveBadgeHtml = isRemoteLive
    ? `<span class="live-badge">🔴 LIVE</span>` : '';
  const liveScoreBarHtml = isRemoteLive ? (() => {
    const updatedAt = s._broadcastAt
      ? new Date(s._broadcastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const periodStr = PERIOD_LABELS[s.period] || '';
    return `<div class="live-score-bar">
      <span class="lsb-scores">Team&nbsp;<strong>${Number.isInteger(s.team) ? s.team : s.team.toFixed(1)}</strong>&nbsp;—&nbsp;<strong>${Number.isInteger(s.opp) ? s.opp : s.opp.toFixed(1)}</strong>&nbsp;${escHtml(g.opponent||'Opp')}</span>
      ${periodStr ? `<span class="lsb-period">${periodStr}</span>` : ''}
      ${updatedAt ? `<span class="lsb-updated">↻ ${updatedAt}</span>` : ''}
    </div>`;
  })() : '';
  const events = s.events || [];

  // Game state bar
  const GS_OPTS = [
    { key:'start',    label:'▶ Start'  },
    { key:'q1',       label:'Q1'       },
    { key:'q2',       label:'Q2'       },
    { key:'half',     label:'½ Time'   },
    { key:'q3',       label:'Q3'       },
    { key:'q4',       label:'Q4'       },
    { key:'shootout', label:'🎯 SO'    },
    { key:'final',    label:'🏁 End'   },
  ];
  const TOGGLE_KEYS = new Set(['start', 'shootout', 'final']);
  // Pre-Game reset button — only show once a game state has been set
  const preBtn = (s.gameState && s.gameState !== 'pre')
    ? `<button class="gs-btn gs-btn-pre" onclick="resetToPreGame('${gid}')" title="Reset to Pre-Game">↩ Pre</button>`
    : '';
  const gsBar = preBtn + GS_OPTS.map(o => {
    const active = s.gameState === o.key ? ' gs-active' : '';
    let handler;
    if (o.key === 'start') {
      handler = `startScoring('${gid}')`;
    } else if (TOGGLE_KEYS.has(o.key)) {
      handler = `toggleGameState('${gid}','${o.key}')`;
    } else {
      handler = `setGameState('${gid}','${o.key}')`;
    }
    return `<button class="gs-btn${active}" onclick="${handler}">${o.label}</button>`;
  }).join('');

  // Auto-clock display (replaces manual clock entry row)
  const cs = getClockSettings();
  const timerSecsLeft = (() => {
    if (s.timerRunning && s.timerStartedAt) {
      const elapsed = (Date.now() - s.timerStartedAt) / 1000;
      return Math.max(0, (s.timerSecondsLeft || 0) - elapsed);
    }
    return s.timerSecondsLeft || 0;
  })();
  const phaseLabel = (() => {
    if (s.timerPhase) return _phaseLabel(s.timerPhase);
    if (s.gameState && s.gameState !== 'pre') return s.gameState.toUpperCase();
    return '';
  })();
  const isBreakPhase = s.timerPhase === 'break12' || s.timerPhase === 'break34' || s.timerPhase === 'halftime';
  const teamTOUsed = s.teamTimeoutsUsed || [];
  const oppTOUsed  = s.oppTimeoutsUsed  || [];

  const timingRow = `
    <div class="auto-clock-wrap">
      <div class="auto-clock-phase">${phaseLabel}</div>
      <div class="auto-clock-time" id="game-clock-${gid}">${fmtClock(timerSecsLeft)}</div>
      <div class="auto-clock-controls">
        ${isBreakPhase ? `<span class="auto-clock-break-label">${s.timerPhase === 'halftime' ? 'Halftime break' : 'Quarter break'} — next quarter ready</span>` : `
          ${s.timerRunning
            ? `<button class="auto-clock-btn auto-clock-pause" onclick="pauseGameTimer('${gid}')">⏸ Pause</button>`
            : `<button class="auto-clock-btn auto-clock-resume" onclick="${s.gameState === 'pre' ? `startScoring('${gid}')` : `resumeGameTimer('${gid}')`}">▶ ${s.gameState === 'pre' ? 'Start' : 'Resume'}</button>`
          }
          <button class="auto-clock-btn auto-clock-reset" onclick="resetGameClock('${gid}')">↺ Reset</button>
        `}
      </div>
      ${cs.timeoutsPerTeam > 0 ? `
      <div class="auto-clock-to-row">
        ${(cs.timeoutLengths||[]).map(m => {
          const used = teamTOUsed.includes(m);
          return `<span class="auto-clock-to-chip${used?' auto-clock-to-used':''}">${used?'✓':'◉'} ${fmtTOLabel(m)}</span>`;
        }).join('')}
        <span class="auto-clock-to-sep">·</span>
        ${(cs.timeoutLengths||[]).map(m => {
          const used = oppTOUsed.includes(m);
          return `<span class="auto-clock-to-chip auto-clock-to-opp${used?' auto-clock-to-used':''}">${used?'✓':'◉'} Opp ${fmtTOLabel(m)}</span>`;
        }).join('')}
      </div>` : ''}
    </div>`;

  // Event log + box score
  const eventLogHtml = buildEventLog(events);
  const boxScoreHtml = buildBoxScoreHtml(events, g.opponent || 'Opp');
  const hasEvents    = events.filter(e=>e.type!=='game_state').length > 0;

  // Scorer mode: show full controls only if no password is set, or password is unlocked
  const canScore = !TOURNAMENT.scoringPassword || isScorerUnlocked();

  // ── Scorer section (full controls) ────────────────────────────────────────
  const isActiveGame = s.gameState && s.gameState !== 'pre';
  const scorerSection = `
    <details class="scorer-details" ${isActiveGame ? 'open' : ''}>
      <summary class="scorer-summary">
        ${isActiveGame ? '▼ Scoring Controls' : '▶ Open Scorer'}
      </summary>
    <div class="scoring-section">
      <div class="gs-bar">${gsBar}</div>
      ${timingRow}
      <div class="live-scoreboard">
        <div class="ls-team">
          <span class="ls-label">Team</span>
          <span class="ls-score ls-score-team">${Number.isInteger(s.team) ? s.team : s.team.toFixed(1)}</span>
        </div>
        <span class="ls-sep">—</span>
        <div class="ls-team ls-team-opp">
          <span class="ls-label">${escHtml(g.opponent || 'Opp')}</span>
          <span class="ls-score ls-score-opp">${Number.isInteger(s.opp) ? s.opp : s.opp.toFixed(1)}</span>
        </div>
      </div>
      ${s.gameState === 'shootout' ? `
      <div style="background:#fef3c7;border:1.5px solid #f59e0b;border-radius:8px;padding:6px 10px;margin-bottom:6px;text-align:center">
        <span style="font-weight:700;color:#92400e">🎯 SHOOTOUT MODE</span>
        <span style="color:#78350f;font-size:0.8rem;display:block;margin-top:2px">Each goal = +0.1 · Track who shoots!</span>
      </div>` : ''}
      <div class="score-btns-row">
        <button class="score-btn score-btn-team" onclick="openEventPicker('${gid}','goal')">${s.gameState === 'shootout' ? '🎯 Team SO Goal' : '+ Goal'}</button>
        <button class="score-btn score-btn-opp"  onclick="recordEventDirect('${gid}','opp_goal')">${s.gameState === 'shootout' ? '🎯 Opp SO Goal' : '+ Opp Goal'}</button>
      </div>
      ${s.gameState === 'shootout' ? `
      <div class="score-btns-row" style="margin-top:4px">
        <button class="score-btn" style="background:#fff1f2;color:#be123c;border-color:#fda4af" onclick="openEventPicker('${gid}','so_miss')">❌ Team SO Miss</button>
        <button class="score-btn" style="background:#fff1f2;color:#be123c;border-color:#fda4af" onclick="recordEventDirect('${gid}','opp_so_miss')">❌ Opp SO Miss</button>
      </div>` : ''}
      <div class="stat-btns-row">
        <button class="stat-btn stat-assist"      onclick="openEventPicker('${gid}','assist')">Assist</button>
        <button class="stat-btn stat-attempt"     onclick="openEventPicker('${gid}','shot_miss')">Attempt</button>
        <button class="stat-btn stat-exclusion"   onclick="openEventPicker('${gid}','exclusion')">Excl</button>
        <button class="stat-btn stat-opp-attempt" onclick="recordEventDirect('${gid}','opp_shot_miss')">Opp Attempt</button>
        <button class="stat-btn stat-opp-excl"    onclick="recordEventDirect('${gid}','opp_exclusion')">Opp Excl</button>
      </div>
      ${s.gameState !== 'shootout' ? `
      <div class="stat-btns-row">
        <button class="stat-btn stat-goal-5m"     onclick="openEventPicker('${gid}','goal_5m')">🎯 5m</button>
        <button class="stat-btn stat-attempt-5m"  onclick="openEventPicker('${gid}','miss_5m')">❌ 5m Attempt</button>
        <button class="stat-btn stat-goal-5m"     onclick="recordEventDirect('${gid}','opp_goal_5m')">🎯 Opp 5m</button>
        <button class="stat-btn stat-attempt-5m"  onclick="recordEventDirect('${gid}','opp_miss_5m')">❌ Opp 5m Attempt</button>
      </div>` : ''}
      <div class="stat-btns-row">
        <button class="stat-btn stat-save"  onclick="openEventPicker('${gid}','save')">🧤 GK Save</button>
        <button class="stat-btn stat-block" onclick="openEventPicker('${gid}','block')">🛡️ GK Block</button>
      </div>
      ${(cs.timeoutLengths||[]).map(m => {
        const teamUsed = (s.teamTimeoutsUsed||[]).includes(m);
        const oppUsed  = (s.oppTimeoutsUsed||[]).includes(m);
        const lbl = fmtTOLabel(m);
        return `<div class="stat-btns-row stat-btns-row-to">
          <button class="stat-btn stat-timeout${teamUsed?' stat-btn-used':''}"
                  onclick="callTeamTimeout('${gid}',${m})"
                  ${teamUsed?'disabled':''}>${teamUsed?'✓':' ⏱'} ${lbl} T/O</button>
          <button class="stat-btn stat-opp-timeout${oppUsed?' stat-btn-used':''}"
                  onclick="callOppTimeout('${gid}',${m})"
                  ${oppUsed?'disabled':''}>${oppUsed?'✓':'⏱'} Opp ${lbl}</button>
        </div>`;
      }).join('')}
      ${eventLogHtml}
      ${hasEvents ? `
        <div class="bs-actions-row">
          <button class="undo-goal-btn" onclick="undoLastEvent('${gid}')">↩ Undo</button>
          <button class="bs-share-btn"  onclick="shareBoxScore('${gid}')">📤 Share</button>
        </div>` : ''}
      ${boxScoreHtml}
    </div>
    </details>`;

  // ── Viewer section (read-only) ─────────────────────────────────────────────
  const periodLabel = s.gameState && s.gameState !== 'pre'
    ? (s.gameState === 'final' ? 'Final' : (PERIOD_LABELS[s.period] || ''))
    : '';
  const viewerSection = `
    <div class="scoring-section scoring-viewer">
      ${periodLabel ? `<div class="viewer-state-bar">${periodLabel}</div>` : ''}
      ${(s.team > 0 || s.opp > 0 || s.gameState !== 'pre') ? `
        <div class="live-scoreboard viewer-scoreboard">
          <div class="ls-team">
            <span class="ls-label">Team</span>
            <span class="ls-score ls-score-team">${s.team}</span>
          </div>
          <span class="ls-sep">—</span>
          <div class="ls-team ls-team-opp">
            <span class="ls-label">${escHtml(g.opponent || 'Opp')}</span>
            <span class="ls-score ls-score-opp">${s.opp}</span>
          </div>
        </div>` : ''}
      ${eventLogHtml}
      ${hasEvents ? `
        <div class="bs-actions-row">
          <button class="bs-share-btn" onclick="shareBoxScore('${gid}')">📤 Share</button>
        </div>` : ''}
      ${boxScoreHtml}
    </div>`;

  return `
    <div class="game-card ${cardClass}">
      <div class="game-card-top">
        <div class="game-vs">${TOURNAMENT.clubName ? escHtml(TOURNAMENT.clubName) + ' vs ' : 'vs '}${escHtml(g.opponent || 'TBD')}${pillHtml}${liveBadgeHtml}</div>
        ${g.gameNum ? `<div class="game-num-tag">${escHtml(g.gameNum)}</div>` : ''}
      </div>
      ${liveScoreBarHtml}
      <div class="game-info-row">
        <span class="icon-label">🕐 ${escHtml(g.time || 'TBD')}</span>
        ${g.pool              ? `<span class="icon-label">${swimmerEmoji()} ${escHtml(g.pool)}</span>`              : ''}
        ${TOURNAMENT.location ? buildLocationLink(TOURNAMENT.location) : ''}
      </div>
      <div class="game-info-row">
        <span class="icon-label ${g.cap === 'Dark' ? 'cap-dark' : 'cap-white'}">${capIcon} ${escHtml(g.cap || '')} Caps</span>
        ${pts !== null ? `<span class="points-badge">+${pts} bracket pts</span>` : ''}
      </div>

      ${(viewerOnly || !canScore) ? viewerSection : scorerSection}

      ${!viewerOnly ? `
      <div class="result-row result-row-5">
        ${btn('result-w-btn',  'W',  'WIN',   4)}
        ${btn('result-sw-btn', 'SW', 'SO·W',  3)}
        ${btn('result-sl-btn', 'SL', 'SO·L',  2)}
        ${btn('result-l-btn',  'L',  'LOSS',  1)}
        ${btn('result-f-btn',  'F',  'FF',    0)}
      </div>
      ${s.gameState === 'shootout' ? `
      <div class="result-notify-row">
        <button class="notify-btn" style="background:#fef3c7;color:#92400e;border-color:#f59e0b" onclick="sendShootoutAlert('${gid}','tg')">🎯✈️ Shootout Alert → Telegram</button>
        <button class="notify-btn" style="background:#fef3c7;color:#92400e;border-color:#f59e0b" onclick="sendShootoutAlert('${gid}','gm')">🎯💬 Shootout Alert → GroupMe</button>
      </div>` : ''}
      <div class="result-notify-row">
        <button class="notify-btn notify-tg" onclick="sendBoxScoreNotify('${gid}','tg')">✈️ Send to Telegram</button>
        <button class="notify-btn notify-gm" onclick="sendBoxScoreNotify('${gid}','gm')">💬 Send to GroupMe</button>
      </div>` : ''}
    </div>`;
}

// ─── RENDER: POSSIBLE GAMES TAB ───────────────────────────────────────────────

// Builds the full location string for a bracket step pin.
// If the step has a short sub-location (pool name like "Main Pool", "Pool E"),
// it is prefixed with the venue name from TOURNAMENT.location so the pin reads
// e.g. "Foothill College · Main Pool" instead of just "Main Pool".
function bracketLocationDisplay(stepLocation) {
  // No location on the step — fall back to the tournament venue
  if (!stepLocation) return (TOURNAMENT.location || '').split(',')[0].trim() || '';
  // If it already looks like a full address (contains a comma) show it as-is
  if (stepLocation.includes(',')) return stepLocation;
  // Short sub-location → prepend venue name (first segment of TOURNAMENT.location)
  const venue = (TOURNAMENT.location || '').split(',')[0].trim();
  return venue ? `${venue} · ${stepLocation}` : stepLocation;
}

function renderPossibleTab() {
  // ── Director standings + reseeding (shown when dir scores exist) ─────────
  const dirPkg = getDirectorPkg();
  const dirGames = dirPkg?.directorGames || [];
  const hasAnyDirScores = dirGames.some(g => state.dirScores[g.id]?.status === 'final');
  if (hasAnyDirScores) {
    const standingsHtml = buildDirStandingsHtml(dirGames);
    const reseedHtml = buildDirReseedHtml(dirPkg, dirGames);
    const standingsCard = document.getElementById('dir-standings-card');
    const container = document.getElementById('view-possible');
    if (container && !standingsCard) {
      const card = document.createElement('div');
      card.id = 'dir-standings-card';
      card.className = 'card tab-card';
      card.innerHTML = `<div class="history-header-row"><h2>Division Standings</h2></div>
        <div id="dir-standings-body"></div>
        <div id="dir-reseed-body"></div>`;
      container.insertBefore(card, container.firstChild);
    }
    const bodyEl = document.getElementById('dir-standings-body');
    if (bodyEl) bodyEl.innerHTML = standingsHtml;
    const reseedEl = document.getElementById('dir-reseed-body');
    if (reseedEl) reseedEl.innerHTML = reseedHtml;
  }

  const slots = getExpandedTeamSlots();
  if (slots.length === 0) {
    const listEl = $('possible-list');   if (listEl) listEl.innerHTML = '';
    const descEl = $('possible-desc');   if (descEl) descEl.innerHTML = '';
    const emptyEl = $('possible-empty');
    if (emptyEl) { emptyEl.classList.remove('hidden'); emptyEl.innerHTML = 'Select an age group above to view the bracket.'; }
    return;
  }
  if (slots.length > 1 && !_inMultiRender) { _renderPossibleMulti(slots); return; }
  const listEl  = $('possible-list');
  const emptyEl = $('possible-empty');
  const descEl  = $('possible-desc');
  listEl.innerHTML = '';

  // Upcoming mode — no games loaded yet, or upcomingMode flag is set
  const hasGames = Array.isArray(TOURNAMENT.games) && TOURNAMENT.games.length > 0 && !TOURNAMENT.upcomingMode;
  if (!hasGames) {
    emptyEl.innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:2rem;margin-bottom:10px">🏆</div>
        <div style="font-weight:700;font-size:1rem;margin-bottom:6px">Bracket Coming Soon</div>
        <div style="color:var(--gray-600);font-size:0.88rem;line-height:1.55">
          The Bracket feature will be made available once the tournament schedule is received.
        </div>
      </div>`;
    emptyEl.classList.remove('hidden');
    descEl.textContent = '';
    return;
  }

  const paths = getTournamentBracketPaths();
  if (!paths?.length) { emptyEl.innerHTML = 'No bracket data for this tournament.'; emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');

  const projected  = inferProjectedPath();
  const allPoolDone = getTournamentGames().every(g => state.results[g.id]) && getTournamentGames().length > 0;

  if (projected) {
    descEl.textContent = allPoolDone
      ? `${getPoolRecord()} pool record → ${projected.label} confirmed.`
      : `${getPoolRecord()} pool record → projected ${projected.label}.`;
  } else {
    descEl.textContent = 'Mark pool play results to see your projected bracket path.';
  }

  paths.forEach(path => {
    const isProjected  = projected && path.id === projected.id;
    const isEliminated = projected && !isProjected;

    const section = document.createElement('div');
    section.className = `bracket-section${isProjected ? ' projected' : isEliminated ? ' eliminated' : ''}`;

    const header = document.createElement('div');
    header.className = 'bracket-header';
    header.innerHTML = `
      <span class="bracket-title">${escHtml(path.label)}</span>
      ${isProjected ? '<span class="bracket-projected-badge">Projected</span>' : ''}`;
    section.appendChild(header);

    if (path.qualifier) {
      const qual = document.createElement('div');
      qual.className = 'bracket-qualifier';
      qual.textContent = path.qualifier;
      section.appendChild(qual);
    }

    (path.steps || []).forEach(step => {
      const stepKey    = `${path.id}-${step.gameNum}`;
      const stepResult = state.bracketResults[stepKey] || null;
      const timeStr    = step.time && step.time !== 'TBD'
        ? `${escHtml(step.date || '')} · ${escHtml(step.time)}`
        : step.date ? escHtml(step.date) : 'Time TBD';
      const resultPill = stepResult
        ? `<span class="result-pill ${stepResult==='W'?'win':'loss'}">${stepResult==='W'?'WIN':'LOSS'}</span>` : '';
      const resultBtns = isProjected ? `
        <div class="bracket-result-row">
          <button class="bracket-result-btn win-btn  ${stepResult==='W'?'active':''}" onclick="setBracketResult('${stepKey}','W')">WIN</button>
          <button class="bracket-result-btn loss-btn ${stepResult==='L'?'active':''}" onclick="setBracketResult('${stepKey}','L')">LOSS</button>
        </div>` : '';

      const stepLocDisplay = bracketLocationDisplay(step.location);
      const row = document.createElement('div');
      row.className = 'bracket-step-row';
      row.innerHTML = `
        <div class="bracket-step-num">${escHtml(step.gameNum || '')}</div>
        <div class="bracket-step-inner">
          <div class="bracket-step-desc">${escHtml(step.desc || '')}${resultPill}</div>
          <div class="bracket-step-meta">
            <span>${timeStr}</span>
            ${stepLocDisplay ? `<span>📍 ${escHtml(stepLocDisplay)}</span>` : ''}
          </div>
          ${resultBtns}
        </div>`;
      section.appendChild(row);
    });

    listEl.appendChild(section);
  });
}

// ─── RENDER: HISTORY TAB ──────────────────────────────────────────────────────

function buildHistoryCard(t) {
  const { wins = 0, losses = 0, record = '0-0', totalPoints } = t;
  const recordClass = wins > losses ? 'winning' : losses > wins ? 'losing' : 'even';

  const gameRowsHtml = (t.games || []).map(g => {
    const r  = g.result;
    const rc = isWin(r) ? 'win' : isLoss(r) ? 'loss' : 'none';
    const rl = resultLabel(r);

    // Live scoring data (saved at archive time) — support both events[] and old goals[]
    const ls      = g.liveScore || {};
    const allEvts = ls.events || (ls.goals
      ? ls.goals.map(g2 => ({ type: g2.side === 'team' ? 'goal' : 'opp_goal', ...g2 }))
      : []);
    const nonState = allEvts.filter(e => e.type !== 'game_state');

    // Goal scorer chips
    const teamGoals   = nonState.filter(ev => ev.type === 'goal');
    const scorerChips = teamGoals.map(ev => {
      const cap   = ev.cap || '';
      const name  = ev.name || '';
      const label = cap
        ? `#${escHtml(cap)} ${escHtml(name.split(' ')[0])}`
        : escHtml(name.split(' ')[0] || '?');
      const sixTag = ev.sixOnFive ? ' ⚡' : '';
      return `<span class="hist-scorer-chip">${label}${sixTag}</span>`;
    }).join('');

    // Assist chips
    const teamAssists  = nonState.filter(ev => ev.type === 'assist');
    const assistChips  = teamAssists.map(ev => {
      const cap   = ev.cap || '';
      const name  = ev.name || '';
      const label = cap
        ? `#${escHtml(cap)} ${escHtml(name.split(' ')[0])}`
        : escHtml(name.split(' ')[0] || '?');
      return `<span class="hist-scorer-chip hist-assist-chip">${label}</span>`;
    }).join('');

    // Per-player box score table (only when meaningful data exists)
    const playerMap = {};
    for (const ev of nonState) {
      if (ev.side !== 'team') continue;
      const k = ev.cap || ev.name || '?';
      if (!playerMap[k]) playerMap[k] = { cap: ev.cap||'', name: ev.name||'', G:0, A:0, Ex:0 };
      if (ev.type === 'goal')                              playerMap[k].G++;
      if (ev.type === 'assist')                            playerMap[k].A++;
      if (ev.type === 'exclusion' || ev.type === 'brutality') playerMap[k].Ex++;
    }
    const playerRows = Object.values(playerMap)
      .sort((a, b) => parseInt(a.cap||'999') - parseInt(b.cap||'999'));
    const hasStats   = playerRows.some(p => p.G || p.A || p.Ex);

    const boxScoreTable = hasStats ? `
      <div class="hist-box-score">
        <div class="hist-bs-row hist-bs-header">
          <span class="hist-bs-player">Player</span>
          <span class="hist-bs-stat">G</span>
          <span class="hist-bs-stat">A</span>
          <span class="hist-bs-stat">Ex</span>
        </div>
        ${playerRows.filter(p => p.G || p.A || p.Ex).map(p => `
          <div class="hist-bs-row">
            <span class="hist-bs-player">${p.cap ? `#${escHtml(p.cap)} ` : ''}${escHtml((p.name||'').split(' ')[0] || '?')}</span>
            <span class="hist-bs-stat">${p.G || '—'}</span>
            <span class="hist-bs-stat">${p.A || '—'}</span>
            <span class="hist-bs-stat">${p.Ex || '—'}</span>
          </div>`).join('')}
      </div>` : '';

    return `
      <div class="history-game-row">
        ${g.gameNum ? `<span class="hg-num">${escHtml(g.gameNum)}</span>` : ''}
        <span class="hg-vs">vs ${escHtml(g.opponent || 'TBD')}</span>
        <span class="hg-meta">${escHtml(g.score || g.time || '')}</span>
        ${g.points != null ? `<span class="hg-pts">+${g.points}</span>` : ''}
        <span class="hg-result ${rc}">${rl}</span>
      </div>
      ${scorerChips ? `
        <div class="hist-scorer-row">
          <span class="hist-scorers-label">Goals:</span>
          <div class="hist-scorer-chips">${scorerChips}</div>
        </div>` : ''}
      ${assistChips ? `
        <div class="hist-scorer-row">
          <span class="hist-scorers-label">Assists:</span>
          <div class="hist-scorer-chips">${assistChips}</div>
        </div>` : ''}
      ${boxScoreTable}`;
  }).join('');

  const bracketRowsHtml = (t.bracketPaths || []).flatMap(p =>
    (p.steps || []).filter(s => s.result).map(s => {
      const r = s.result;
      const rc = r === 'W' ? 'win' : r === 'L' ? 'loss' : 'none';
      return `<div class="history-game-row">
        ${s.gameNum ? `<span class="hg-num">${escHtml(s.gameNum)}</span>` : ''}
        <span class="hg-vs">${escHtml(s.desc || 'Bracket')}</span>
        <span class="hg-meta">${escHtml(p.label || '')}</span>
        <span class="hg-result ${rc}">${r}</span>
      </div>`;
    })
  ).join('');

  const card = document.createElement('div');
  card.className = 'history-card';
  card.id = `history-card-${t.id}`;
  card.innerHTML = `
    <div class="history-card-header" onclick="toggleHistoryCard('${t.id}')">
      <div class="history-name-block">
        <div class="history-tournament-name">${escHtml(t.name || 'Tournament')}</div>
        <div class="history-meta">${[t.dates, t.location, t.pool].filter(Boolean).join(' · ')}</div>
      </div>
      <div class="history-badges">
        <div class="history-record-badge ${recordClass}">${escHtml(record)}</div>
        ${totalPoints != null ? `<div class="history-pts-badge">${totalPoints} pts</div>` : ''}
      </div>
      <div class="history-expand-icon">▼</div>
    </div>
    <div class="history-games">
      ${gameRowsHtml}${bracketRowsHtml}
      ${!gameRowsHtml && !bracketRowsHtml
        ? '<div class="history-game-row" style="color:var(--gray-400);font-size:.85rem;">No results recorded.</div>'
        : ''}
    </div>`;
  return card;
}

function _renderPossibleMulti(slots) {
  $('possible-desc').textContent = '';
  $('possible-list').innerHTML = slots.map(({ groupKey, letter, suffix }) =>
    `<div class="team-section">
      <div class="team-section-header">${escHtml(_groupSectionLabelFor(groupKey, letter))}</div>
      <div id="possible-desc-${suffix}" style="font-size:.85rem;color:var(--gray-600);padding:0 2px 8px"></div>
      <div id="possible-list-${suffix}"></div>
      <div id="possible-empty-${suffix}" class="empty-msg hidden"></div>
    </div>`
  ).join('');
  $('possible-empty').classList.add('hidden');

  _inMultiRender = true;
  for (const { groupKey, letter, suffix } of slots) {
    const cache = TEAM_CACHE[groupKey];
    if (!cache) continue;
    const savedT = window.TOURNAMENT, savedH = window.HISTORY_SEED;
    window.TOURNAMENT = cache.tournament; window.HISTORY_SEED = cache.history || [];
    _activeAgeGroup = groupKey;
    _activeTeamLetters = letter ? [letter] : null;
    _renderSuffix = '-' + suffix;
    renderPossibleTab();
    _renderSuffix = '';
    _activeTeamLetters = null;
    _activeAgeGroup = null;
    window.TOURNAMENT = savedT; window.HISTORY_SEED = savedH;
  }
  _inMultiRender = false;
}

function renderHistoryTab() {
  const slots = getExpandedTeamSlots();

  // No teams selected — show empty prompt
  if (slots.length === 0 && !_inMultiRender) {
    const viewEl = document.getElementById('view-history');
    if (viewEl) viewEl.innerHTML = `<div class="card tab-card">
      <div class="history-header-row"><h2>Tournament History</h2></div>
      <p class="step-desc">Select an age group above to view tournament history.</p>
    </div>`;
    return;
  }

  // Multi-team render
  if (slots.length > 1 && !_inMultiRender) { _renderHistoryMulti(slots); return; }

  // Single-team: ensure static HTML structure exists (may have been replaced by multi-render)
  if (!_inMultiRender && slots.length === 1) {
    const viewEl = document.getElementById('view-history');
    if (viewEl && !viewEl.querySelector('#history-list')) {
      const label = _groupSectionLabelFor(slots[0].groupKey, slots[0].letter);
      viewEl.innerHTML = `<div class="card tab-card">
        <div class="history-header-row">
          <h2>Tournament History</h2>
          <span class="history-subtitle" id="history-subtitle">${escHtml(label)}</span>
        </div>
        <p class="step-desc" id="history-desc">Past tournament results, most recent first.</p>
        <div id="history-team-search"></div>
        <div id="history-standings"></div>
        <div id="history-list"></div>
        <div id="history-empty" class="empty-msg hidden">
          No history yet. Results from completed tournaments will appear here automatically.
        </div>
      </div>`;
    } else {
      const subtitleEl = viewEl?.querySelector('#history-subtitle');
      if (subtitleEl) subtitleEl.textContent = _groupSectionLabelFor(slots[0].groupKey, slots[0].letter);
    }
  }
  const listEl  = $('history-list');
  const emptyEl = $('history-empty');
  const history = getHistoryForActiveTeam();
  listEl.innerHTML = '';

  // Clear old top-level standings slot — standings are now embedded per tournament
  const standingsEl = $('history-standings');
  if (standingsEl) standingsEl.innerHTML = '';

  renderHistoryTeamSearch();

  // ── Season Dashboard (record overview) ─────────────────────────────────────
  if (standingsEl && history.length) {
    let totalW = 0, totalL = 0, totalGF = 0, totalGA = 0, totalGames = 0;
    for (const h of history) {
      totalW += h.wins || 0;
      totalL += h.losses || 0;
      // Count goals from game scores
      for (const g of (h.games || [])) {
        if (g.liveScore && typeof g.liveScore.us === 'number') {
          totalGF += g.liveScore.us || 0;
          totalGA += g.liveScore.them || 0;
        }
      }
      totalGames += (h.games || []).filter(g => g.result).length;
    }
    const totalPlayed = totalW + totalL;
    const pct = totalPlayed ? Math.round((totalW / totalPlayed) * 100) : 0;
    const pctColor = pct >= 70 ? '#16a34a' : pct >= 50 ? '#ca8a04' : pct >= 30 ? '#ea580c' : '#dc2626';
    const pctBg = pct >= 70 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : pct >= 30 ? '#fff7ed' : '#fef2f2';

    // Get current team label for the header
    const teamLabel = (() => {
      const slot = getExpandedTeamSlots()[0];
      if (slot) return _groupSectionLabelFor(slot.groupKey, slot.letter);
      return '';
    })();

    standingsEl.innerHTML = `
      <div style="background:linear-gradient(135deg,rgba(0,40,104,.06),rgba(99,102,241,.08));border-radius:12px;padding:14px 16px;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">
          <div style="flex:1">
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--royal);margin-bottom:2px">Season Record${teamLabel ? ' · ' + escHtml(teamLabel) : ''}</div>
            <div style="font-size:1.35rem;font-weight:800;color:var(--text)">${totalW}W - ${totalL}L</div>
            <div style="font-size:0.78rem;color:var(--gray-500)">${totalGames} games · ${history.length} tournament${history.length > 1 ? 's' : ''}${totalGF || totalGA ? ` · ${totalGF} GF / ${totalGA} GA` : ''}</div>
          </div>
          <div style="width:50px;height:50px;border-radius:50%;background:${pctBg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span style="font-size:1rem;font-weight:800;color:${pctColor}">${pct}%</span>
          </div>
        </div>
        <div style="height:6px;background:rgba(0,0,0,.08);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${pctColor};border-radius:3px;transition:width .3s"></div>
        </div>
      </div>
    `;
  }

  // ── Season Stats aggregate (Phase 5D) ─────────────────────────────────────
  if (standingsEl && history.length) {
    const seasonStats = {};
    for (const h of history) {
      const ps = h.playerStats || {};
      for (const [name, s] of Object.entries(ps)) {
        if (!seasonStats[name]) seasonStats[name] = { goals: 0, assists: 0, steals: 0, exclusions: 0, gamesPlayed: 0, tournaments: 0 };
        seasonStats[name].goals += s.goals || 0;
        seasonStats[name].assists += s.assists || 0;
        seasonStats[name].steals += s.steals || 0;
        seasonStats[name].exclusions += s.exclusions || 0;
        seasonStats[name].gamesPlayed += s.gamesPlayed || 0;
        seasonStats[name].tournaments++;
      }
    }
    const sorted = Object.entries(seasonStats).sort((a, b) => b[1].goals - a[1].goals);
    if (sorted.length) {
      const rows = sorted.slice(0, 15).map(([name, s], i) =>
        `<tr><td style="font-weight:600">${i + 1}. ${escHtml(name)}</td><td>${s.goals}</td><td>${s.assists}</td><td>${s.steals}</td><td>${s.gamesPlayed}</td></tr>`
      ).join('');
      standingsEl.innerHTML += `
        <details class="season-stats-details" style="margin-bottom:12px">
          <summary style="font-weight:800;font-size:0.88rem;color:var(--royal);cursor:pointer;padding:8px 0">
            📊 Season Stats (${history.length} tournament${history.length > 1 ? 's' : ''})
          </summary>
          <div style="overflow-x:auto;margin-top:6px">
            <table class="season-stats-table">
              <thead><tr><th>Player</th><th>Goals</th><th>Assists</th><th>Steals</th><th>Games</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </details>`;
    }
  }

  // ── Current tournament: completed games section ───────────────────────────
  const completedNow = getTournamentGames().filter(g => state.results[g.id]);
  if (completedNow.length) {
    emptyEl.classList.add('hidden');
    const curSecId = 'hs-content-current';
    const curHead  = document.createElement('div');
    curHead.className = 'history-section-heading history-section-toggle';
    curHead.setAttribute('aria-expanded', 'false');
    curHead.innerHTML = `<span class="hs-title">${escHtml(TOURNAMENT.name || 'Current Tournament')}</span><span class="hs-chevron">▶</span>`;
    curHead.onclick = () => toggleHistorySection(curSecId, curHead);
    listEl.appendChild(curHead);

    const curContent = document.createElement('div');
    curContent.id = curSecId;
    curContent.className = 'history-section-content';
    listEl.appendChild(curContent);

    for (const g of completedNow) {
      const result = state.results[g.id];
      const s      = state.liveScores[g.id] || {};
      const rc     = isWin(result) ? 'win' : isLoss(result) ? 'loss' : 'none';
      const rl     = resultLabel(result);
      const scoreStr = (s.team != null && s.opp != null && (s.team > 0 || s.opp > 0))
        ? `${s.team}–${s.opp}` : '';
      const row = document.createElement('div');
      row.className = 'history-game-row';
      row.innerHTML = `
        ${g.gameNum ? `<span class="hg-num">${escHtml(g.gameNum)}</span>` : ''}
        <span class="hg-vs">vs ${escHtml(g.opponent || 'TBD')}</span>
        ${scoreStr ? `<span class="hg-meta">${escHtml(scoreStr)}</span>` : ''}
        <span class="hg-result ${rc}">${rl}</span>`;
      curContent.appendChild(row);
    }
  }

  if (!history.length && !completedNow.length) { emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');

  const TEAM_ORDER = ['Team', 'Team A', 'Team A1', 'Team A2', 'Team B', 'A', 'A1', 'A2', 'B', 'Other'];

  // Each entry defines one tournament section shown in the history tab
  // (newest season first). Set noStandings:true for tournaments with no bracket points.
  const TOURNEY_GROUPS = [
    {
      heading:   'Kap 7 Futures League · 2026',
      shortName: 'Kap 7 Futures League',
      filter:    e => /futures|kap.?7/i.test((e.name || '') + (e.id || '')),
    },
    {
      heading:     '14U SoCal International Tournament · 2026',
      shortName:   'SoCal International 2026',
      noStandings: true,
      filter:      e => /socal.?intl|socal.?international/i.test((e.name || '') + (e.id || '')),
    },
    {
      heading:   'Bay Area Water Polo League · Winter 2025–2026',
      shortName: 'BAWL Winter 2025–2026',
      filter:    e => /bay area|bawl/i.test((e.name || '') + (e.id || ''))
                   && /winter/i.test((e.name || '') + (e.id || '')),
    },
    {
      heading:   'Bay Area Water Polo League · Fall 2025–2026',
      shortName: 'BAWL Fall 2025–2026',
      filter:    e => /bay area|bawl/i.test((e.name || '') + (e.id || ''))
                   && /fall/i.test((e.name || '') + (e.id || '')),
    },
    {
      heading:     'Evan Cousineau Memorial Cup · 2025',
      shortName:   'EC Cup 2025',
      noStandings: true,
      filter:      e => /evan.?cousineau|ec.?cup/i.test((e.name || '') + (e.id || '')),
    },
    {
      heading:    'Pacific Zone Champions Cup Qualification · 2025',
      shortName:  'Pacific Zone Qual 2025',
      noStandings: true,
      filter:     e => /pac.?zone|champions.?cup/i.test((e.name || '') + (e.id || '')),
    },
  ];

  TOURNEY_GROUPS.forEach((group, gi) => {
    const entries = history.filter(group.filter);
    if (!entries.length) return;

    const sectionId = `hs-content-${gi}`;

    // ── Collapsible section heading ───────────────────────────────────────────
    const secEl = document.createElement('div');
    secEl.className = 'history-section-heading history-section-toggle';
    secEl.setAttribute('aria-expanded', 'false');
    secEl.innerHTML = `<span class="hs-title">${escHtml(group.heading)}</span><span class="hs-chevron">▶</span>`;
    secEl.onclick = () => toggleHistorySection(sectionId, secEl);
    listEl.appendChild(secEl);

    // ── Collapsible content wrapper (collapsed by default) ────────────────────
    const contentEl = document.createElement('div');
    contentEl.id = sectionId;
    contentEl.className = 'history-section-content';
    listEl.appendChild(contentEl);

    // ── Standings card (only for tournaments with bracket points) ─────────────
    if (!group.noStandings) {
      const standDiv = document.createElement('div');
      standDiv.className = 'history-section-standings';
      standDiv.innerHTML = buildStandingsHtml(entries, group.shortName);
      contentEl.appendChild(standDiv);
    }

    // ── Team sub-sections ────────────────────────────────────────────────────
    const byTeam = {};
    entries.forEach(e => {
      const sub = e.subtitle || '';
      const key = e.team
        || (/Team B/i.test(sub) ? 'Team B' : /Team A/i.test(sub) ? 'Team A' : 'Other');
      if (!byTeam[key]) byTeam[key] = [];
      byTeam[key].push(e);
    });

    const teamKeys = Object.keys(byTeam).sort((a, b) => {
      const ai = TEAM_ORDER.indexOf(a), bi = TEAM_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    // Only show sub-team headings when there are multiple distinct teams in this section
    const showSubHeadings = teamKeys.length > 1;

    teamKeys.forEach(team => {
      if (showSubHeadings) {
        const th = document.createElement('div');
        th.className = 'history-team-heading';
        th.textContent = team;
        contentEl.appendChild(th);
      }
      byTeam[team].forEach(t => contentEl.appendChild(buildHistoryCard(t)));
    });
  });

  // ── Ungrouped entries (manually added via admin) — group by season ─────────
  const grouped = new Set();
  TOURNEY_GROUPS.forEach(g => history.filter(g.filter).forEach(e => grouped.add(e.id)));
  const ungrouped = history.filter(e => !grouped.has(e.id));

  if (ungrouped.length) {
    // Group by season, or "Other Tournaments" if no season set
    const bySeason = {};
    const seasonOrder = [];
    for (const h of ungrouped) {
      const s = h.season || 'Other Tournaments';
      if (!bySeason[s]) { bySeason[s] = []; seasonOrder.push(s); }
      bySeason[s].push(h);
    }
    seasonOrder.forEach((season, si) => {
      const sEntries = bySeason[season];
      const sectionId = `hs-content-season-${si}`;
      const totalW = sEntries.reduce((s, h) => s + (h.wins || 0), 0);
      const totalL = sEntries.reduce((s, h) => s + (h.losses || 0), 0);
      const record = totalW || totalL ? ` · ${totalW}W–${totalL}L` : '';

      const secEl = document.createElement('div');
      secEl.className = 'history-section-heading history-section-toggle';
      secEl.setAttribute('aria-expanded', 'false');
      secEl.innerHTML = `<span class="hs-title">${escHtml(season)}${record}</span><span class="hs-chevron">▶</span>`;
      secEl.onclick = () => toggleHistorySection(sectionId, secEl);
      listEl.appendChild(secEl);

      const contentEl = document.createElement('div');
      contentEl.id = sectionId;
      contentEl.className = 'history-section-content';
      listEl.appendChild(contentEl);

      sEntries.forEach(t => contentEl.appendChild(buildHistoryCard(t)));
    });
  }
}

function toggleHistorySection(contentId, headingEl) {
  const el = document.getElementById(contentId);
  if (!el) return;
  const isOpen = el.classList.toggle('expanded');
  if (headingEl) {
    headingEl.setAttribute('aria-expanded', String(isOpen));
    const chevron = headingEl.querySelector('.hs-chevron');
    if (chevron) chevron.textContent = isOpen ? '▼' : '▶';
  }
}

function toggleHistoryCard(id) {
  document.getElementById(`history-card-${id}`)?.classList.toggle('expanded');
}

// ─── HISTORY SEED ─────────────────────────────────────────────────────────────
// Removes any test/placeholder history entries that should never appear in production.
const PURGE_IDS = [
  // Add any test/placeholder history IDs here to auto-purge them on load
];
function purgeTestHistory() {
  const history = getHistory();
  const cleaned = history.filter(h => !PURGE_IDS.includes(h.id));
  if (cleaned.length !== history.length) {
    localStorage.setItem(STORE.HISTORY, JSON.stringify(cleaned));
  }
}

// Merges HISTORY_SEED entries from tournament.js into localStorage on first load.
// Entries already in history (matched by id) are never overwritten.

function seedHistory() {
  if (typeof HISTORY_SEED === 'undefined' || !HISTORY_SEED.length) return;
  const history = getHistory();
  let changed = false;
  for (const entry of HISTORY_SEED) {
    const idx = history.findIndex(h => h.id === entry.id);
    if (idx >= 0) {
      // Always overwrite seed entries so updates (like added points) propagate
      if (JSON.stringify(history[idx]) !== JSON.stringify(entry)) {
        history[idx] = entry;
        changed = true;
      }
    } else {
      history.push(entry);   // append — seed entries are older, show after current
      changed = true;
    }
  }
  if (changed) localStorage.setItem(STORE.HISTORY, JSON.stringify(history));
}

// ─── CUMULATIVE STANDINGS ─────────────────────────────────────────────────────
// Pass in a filtered array of history entries; returns sorted team totals.

function getCumulativeStandings(entries) {
  const TEAM_ORDER = ['Team', 'Team A', 'Team A1', 'Team A2', 'Team B'];
  const map = {};
  for (const entry of entries) {
    const sub  = entry.subtitle || '';
    const team = entry.team
      || (/Team B/i.test(sub) ? 'Team B' : /Team A/i.test(sub) ? 'Team A' : null);
    if (!team) continue;
    if (!map[team]) map[team] = { team, pts: 0, wins: 0, losses: 0, days: 0 };
    map[team].pts    += entry.totalPoints || 0;
    map[team].wins   += entry.wins        || 0;
    map[team].losses += entry.losses      || 0;
    map[team].days++;
  }
  return Object.values(map).sort((a, b) => {
    const d = (b.pts - a.pts) || (b.wins - a.wins);
    return d !== 0 ? d : TEAM_ORDER.indexOf(a.team) - TEAM_ORDER.indexOf(b.team);
  });
}

// Builds and returns the HTML for a standings card for the given entries.
function buildStandingsHtml(entries, seriesLabel) {
  const standings = getCumulativeStandings(entries);
  if (!standings.length) return '';
  const maxPts = Math.max(...standings.map(s => s.pts));
  const rows = standings.map((s, i) => {
    const isLeader = s.pts === maxPts && s.pts > 0;
    const pos = i === 0 && isLeader ? '🥇' : i === 1 ? '🥈' : `${i + 1}`;
    return `
      <div class="standings-row${isLeader ? ' standings-leader' : ''}">
        <span class="standings-pos">${pos}</span>
        <span class="standings-team-name">${escHtml(s.team)}</span>
        <span class="standings-wl">${s.wins}-${s.losses} · ${s.days} day${s.days !== 1 ? 's' : ''}</span>
        <span class="standings-pts">${s.pts} pts</span>
      </div>`;
  }).join('');
  return `
    <div class="standings-card">
      <div class="standings-heading">Bracket Points Standings</div>
      <div class="standings-series">${escHtml(seriesLabel)} · Cumulative</div>
      ${rows}
    </div>`;
}

function _renderHistoryMulti(slots) {
  const viewEl = document.getElementById('view-history');
  if (!viewEl) return;
  viewEl.innerHTML = `<div class="card tab-card">
    <div class="history-header-row"><h2>Tournament History</h2></div>
    <p class="step-desc">Results for all your selected age groups.</p>
    ${slots.map(({ groupKey, letter, suffix }) =>
      `<div class="team-section" style="margin:0 -2px">
        <div class="team-section-header">${escHtml(_groupSectionLabelFor(groupKey, letter))}</div>
        <div id="history-team-search-${suffix}"></div>
        <div id="history-standings-${suffix}"></div>
        <div id="history-list-${suffix}"></div>
        <div id="history-empty-${suffix}" class="empty-msg hidden">No history yet.</div>
      </div>`
    ).join('')}
  </div>`;

  _inMultiRender = true;
  for (const { groupKey, letter, suffix } of slots) {
    const cache = TEAM_CACHE[groupKey];
    if (!cache) continue;
    const savedT = window.TOURNAMENT, savedH = window.HISTORY_SEED;
    window.TOURNAMENT   = cache.tournament;
    window.HISTORY_SEED = cache.history || [];
    _historyOverride    = cache.history || [];
    _activeAgeGroup     = groupKey;
    _activeTeamLetters  = letter ? [letter] : null;
    _renderSuffix       = '-' + suffix;
    renderHistoryTab();
    _renderSuffix      = '';
    _activeTeamLetters = null;
    _activeAgeGroup    = null;
    _historyOverride   = null;
    window.TOURNAMENT   = savedT;
    window.HISTORY_SEED = savedH;
  }
  _inMultiRender = false;
  const primaryKey = getSelectedTeams()[0];
  if (TEAM_CACHE[primaryKey]) window.HISTORY_SEED = TEAM_CACHE[primaryKey].history || [];
  seedHistory();
}

// Schedule tab — only show Futures standings (the active bracket play).
function renderHistoryStandings(targetId = 'history-standings', historyData = null) {
  const el = $(targetId);
  if (!el) return;
  const data = historyData !== null ? historyData : getHistory();
  const futuresEntries = data.filter(
    e => /futures|kap.?7/i.test((e.name || '') + (e.id || ''))
  );
  el.innerHTML = buildStandingsHtml(futuresEntries, 'Kap 7 Futures League');
}

// ─── RELOAD TOURNAMENT DATA ───────────────────────────────────────────────────
// Called when a PUSH_SYNC arrives after an admin deploy.
// Fetches fresh tournament.js from the network (bypassing SW cache),
// re-evaluates it so window.TOURNAMENT / window.HISTORY_SEED are updated,
// then re-renders every tab that depends on tournament data.

async function reloadTournamentJs() {
  try {
    const res = await fetch(`/tournament.js?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      // Can't fetch — just re-render with what we have
      renderScheduleTab();
      renderPossibleTab();
      return;
    }
    const code = await res.text();
    // Re-execute the file so window.TOURNAMENT and window.HISTORY_SEED are updated
    // eslint-disable-next-line no-new-func
    new Function(code)();
  } catch (err) {
    console.warn('reloadTournamentJs fetch failed:', err.message);
  }
  // Also reload from worker for all selected teams
  await loadAllSelectedTeams();
  // Re-run initialization that depends on TOURNAMENT (archive check, seed history)
  checkTournamentChange();
  seedHistory();
  // Re-render all tabs that display tournament data
  renderHeader();
  renderScheduleTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

function init() {
  if (typeof TOURNAMENT === 'undefined') {
    document.body.innerHTML = '<p style="padding:2rem;color:red;">Error: tournament.js not loaded.</p>';
    return;
  }

  // Phase 3: Show club picker on first visit (no club selected yet)
  // Firebase still inits in the background so the picker can list clubs
  if (typeof fbInit === 'function') fbInit();

  // ── Handle ?join=CLUB_ID — parent clicked admin's share link ──
  _handleJoinParam();

  // ── Backward compat: migrate existing club selection to joined list ──
  _migrateJoinedClubs();

  // ── One-time migration: clear stale 14u-girls data for HS clubs ──
  if (!localStorage.getItem('ebwp-migrated-v2')) {
    const clubType = localStorage.getItem('ebwp-club-type');
    const teamKey  = localStorage.getItem('ebwp-team-key');
    const HS_KEYS  = ['boys-varsity','boys-jv','girls-varsity','girls-jv'];
    const CLUB_KEYS = ['10u-coed','12u-girls','12u-boys','14u-girls','14u-boys','16u-girls','16u-boys','18u-girls','18u-boys'];
    // If HS club but team key is a club key (or vice versa), clear stale data
    if ((clubType === 'highschool' && teamKey && CLUB_KEYS.includes(teamKey)) ||
        (clubType === 'club' && teamKey && HS_KEYS.includes(teamKey))) {
      localStorage.removeItem(STORE.HISTORY);
      localStorage.removeItem(STORE.SNAPSHOT);
      localStorage.removeItem(STORE.RESULTS);
      localStorage.removeItem(STORE.BRACKET_RESULTS);
      localStorage.removeItem(STORE.TOURNAMENT_ID);
      localStorage.removeItem('ebwp-team-key');
      localStorage.removeItem('ebwp-team-keys');
      console.info('[ebwp] Cleared stale data from mismatched team type');
    }
    localStorage.setItem('ebwp-migrated-v2', '1');
  }

  if (showClubPickerIfNeeded()) return; // picker shown — wait for selection

  checkTournamentChange(); // also restores state.liveScores from localStorage

  // Resume any auto-clocks that were running before page reload
  const hasRunning = Object.values(state.liveScores).some(s => s && s.timerRunning);
  if (hasRunning) ensureClockTicker();

  state.roster      = loadRoster();
  purgeTestHistory();
  seedHistory();
  renderHeader();
  renderScheduleTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
  startLivePoller(); // start polling for live scores from other devices
  updateLiveDot();   // set dot state on initial load
  startDirScorePolling(); // start polling for director game scores
  restoreTournScoreSession(); // restore Tournament Score tab session if saved
  updateTScoreTabVisibility(); // hide T-Score tab unless director pkg imported

  // Load team data for all selected age groups (async — updates TOURNAMENT from KV)
  // IMPORTANT: fetch club info FIRST to set correct TEAM_OPTIONS before loading data
  const _appClubId = getAppClubId();
  if (_appClubId && typeof fbSetClubId === 'function') {
    fbSetClubId(_appClubId);
  }

  // Detect club change for auto-favorite logic
  const _lastClubId = sessionStorage.getItem('ebwp-last-club-id');
  const _isClubChange = _lastClubId && _lastClubId !== _appClubId;
  if (_appClubId) sessionStorage.setItem('ebwp-last-club-id', _appClubId);

  const _doTeamLoad = async () => {
    // Fetch club info to ensure we have the right team options
    if (_appClubId) {
      // Reset primary color so applyClubLogo can detect "no branding" on club switch
      window._clubPrimaryColor = null;

      try {
        const infoRes = await fetch(WORKER + '/club-info?club=' + encodeURIComponent(_appClubId));
        const info = await infoRes.json();
        if (info.ok) {
          if (info.clubName) {
            // Title-case if it's a slug (e.g., "alameda-high" → "Alameda High")
            const displayName = info.clubName.includes('-') && !info.clubName.includes(' ')
              ? info.clubName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              : info.clubName;
            localStorage.setItem('ebwp-club-name', displayName);
            renderHeader(); // update header as soon as we have the club name
          }
          if (info.clubType) {
            localStorage.setItem('ebwp-club-type', info.clubType);
            const isHS = info.clubType === 'highschool';
            TEAM_OPTIONS = isHS ? TEAM_OPTIONS_HS : TEAM_OPTIONS_CLUB;
            // Reset selection if current keys are invalid for this club type
            const validKeys = TEAM_OPTIONS.map(t => t.key);
            // Always prioritize favorite if current selection is the default or missing
            const hasInvalid = current.some(k => !validKeys.includes(k));
            const favTeam = _getAutoFavoriteTeam(validKeys);
            const isDefault = current.length === 1 && (current[0] === validKeys[0] || current[0] === '10u-coed');
            
            if (hasInvalid || _isClubChange || (favTeam && isDefault && favTeam !== current[0])) {
              if (favTeam) {
                console.log('[ebwp] Favoriting team transition:', favTeam);
                setSelectedTeams([favTeam]);
              } else if (hasInvalid) {
                setSelectedTeams([validKeys[0]]);
              }
            }
          }
          // Apply club logo — show custom logo prominently if uploaded, else eggbeater logo
          applyClubLogo(info.logo || null, info.clubName || null);
        }
      } catch (e) {
        console.warn('[ebwp] club-info fetch failed:', e.message);
      }

      // Fetch club branding (custom colors)
      try {
        const brandRes = await fetch(WORKER + '/club-branding?club=' + encodeURIComponent(_appClubId));
        const brand = await brandRes.json();
        if (brand.ok && brand.primaryColor) {
          applyClubBranding(brand.primaryColor, brand.secondaryColor, brand.headerStyle);
        }
      } catch (e) {
        console.warn('[ebwp] club-branding fetch failed:', e.message);
      }
    }

    // Now load team data with correct team keys
    await loadAllSelectedTeams();
    checkTournamentChange();
    seedHistory();
    renderHeader();
    renderScheduleTab();
    renderPossibleTab();
    renderHistoryTab();
    renderRosterTab();
    // Phase 2: start Firestore real-time listeners for each selected team
    if (typeof fbListenToTournament === 'function') {
      getSelectedTeams().forEach(k => fbListenToTournament(k));
    }
  };

  _doTeamLoad();

  // Phase 3: listen for active tournament changes — auto-reload when admin switches tournaments
  if (typeof fbListenToActiveTournament === 'function') {
    let _knownActiveTournId = null;
    fbListenToActiveTournament(tourDoc => {
      if (!tourDoc) return;
      if (_knownActiveTournId === null) {
        // First snapshot — record current active tournament
        _knownActiveTournId = tourDoc.id;
        return;
      }
      if (tourDoc.id !== _knownActiveTournId) {
        // Active tournament changed — reload to pick up new deployed data
        console.info('[phase3] Active tournament changed:', _knownActiveTournId, '→', tourDoc.id);
        _knownActiveTournId = tourDoc.id;
        if (typeof showToast === 'function') showToast('New tournament activated — refreshing…');
        setTimeout(() => window.location.reload(), 1500);
      }
    });
  }

  // Pre-initialize token client once GIS loads
  const gisReady = setInterval(() => {
    if (window.google?.accounts?.oauth2) {
      clearInterval(gisReady);
      ensureTokenClient();
      if (state.syncActive) updateSyncBadge('ok');
    }
  }, 300);

  // Keep --header-h updated so the desktop sidebar top offset stays correct
  window.addEventListener('resize', syncHeaderHeight);

  // ── Offline/online detection (Phase 5E) ─────────────────────────────────
  window.addEventListener('offline', () => {
    const b = document.getElementById('offline-banner');
    if (b) b.classList.remove('hidden');
  });
  window.addEventListener('online', () => {
    const b = document.getElementById('offline-banner');
    if (b) b.classList.add('hidden');
    // Auto-refresh tournament data on reconnect
    if (typeof reloadTournamentJs === 'function') reloadTournamentJs();
  });
  // Check initial state
  if (!navigator.onLine) {
    const b = document.getElementById('offline-banner');
    if (b) b.classList.remove('hidden');
  }

  if ('serviceWorker' in navigator) {
    // Auto-reload when a new service worker activates so every device always
    // runs the latest code immediately after a deploy (no manual refresh needed).
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        // Listen for messages from the service worker
        navigator.serviceWorker.addEventListener('message', e => {
          if (e.data?.type === 'PUSH_SYNC' || e.data?.type === 'PERIODIC_SYNC_TRIGGERED') {
            // Re-fetch tournament.js from the network and refresh all tabs
            reloadTournamentJs();
          }
          // SW signals that a new version just activated — reload to get fresh assets
          if (e.data?.type === 'SW_UPDATED') {
            window.location.reload();
          }
        });
        // Register periodic background sync (Android/Chrome, best-effort)
        if ('periodicSync' in reg) {
          reg.periodicSync.register('check-schedule', { minInterval: 30 * 60 * 1000 })
            .catch(() => { /* permission not granted — push will still work */ });
        }
      })
      .catch(() => {});
  }
}

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────

// VAPID public key for the ebwp-push Cloudflare Worker
const PUSH_SERVER_URL = 'https://ebwp-push.sarah-new.workers.dev';
const WORKER = PUSH_SERVER_URL;

// Phase 3: Club ID detection — URL param > localStorage > tournament data > default
function getAppClubId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('club');
  if (fromUrl) {
    localStorage.setItem('ebwp-club-id', fromUrl);
    return fromUrl;
  }
  const saved = localStorage.getItem('ebwp-club-id');
  if (saved) return saved;
  if (typeof TOURNAMENT !== 'undefined' && TOURNAMENT.clubId) return TOURNAMENT.clubId;
  return null; // null = don't send club param (use legacy un-namespaced KV)
}

// ─── CLUB PICKER ──────────────────────────────────────────────────────────────

// ── Joined clubs list management ──────────────────────────────────────────────

function getJoinedClubs() {
  try {
    return JSON.parse(localStorage.getItem('ebwp-joined-clubs') || '[]');
  } catch { return []; }
}

function addJoinedClub(clubId) {
  if (!clubId) return;
  const joined = getJoinedClubs();
  if (!joined.includes(clubId)) {
    joined.push(clubId);
    localStorage.setItem('ebwp-joined-clubs', JSON.stringify(joined));
  }
}

function removeJoinedClub(clubId) {
  const joined = getJoinedClubs().filter(id => id !== clubId);
  localStorage.setItem('ebwp-joined-clubs', JSON.stringify(joined));
}

/**
 * Handle ?join=CLUB_ID URL parameter — adds the club to the joined list
 * and auto-selects it so the parent lands directly in the app.
 */
function _handleJoinParam() {
  const params = new URLSearchParams(window.location.search);
  const joinClub = params.get('join');
  if (!joinClub) return;

  // Add to joined list
  addJoinedClub(joinClub);

  // Auto-select this club (sets ebwp-club-id)
  localStorage.setItem('ebwp-club-id', joinClub);

  // Clean up the URL (remove ?join= so refreshes don't re-trigger)
  params.delete('join');
  const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
  window.history.replaceState({}, '', newUrl);
}

/**
 * Backward compatibility: if user has an existing club selection
 * but no joined clubs list yet, migrate it.
 */
function _migrateJoinedClubs() {
  const existing = localStorage.getItem('ebwp-club-id');
  if (existing && !getJoinedClubs().length) {
    addJoinedClub(existing);
  }
}

/**
 * Show the club picker if no club is selected yet.
 * Returns true if the picker was shown (app should wait), false if club is already set.
 */
function showClubPickerIfNeeded() {
  // If club is already set (via URL param or localStorage), skip picker
  if (getAppClubId()) return false;

  const picker = document.getElementById('club-picker');
  if (!picker) return false;

  picker.classList.remove('hidden');
  // Hide the main app chrome while picker is showing
  document.querySelector('.app-header').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('bottom-nav').style.display = 'none';

  // Load clubs from Firestore once Firebase is ready
  _loadClubPickerList();
  return true;
}

/**
 * Fetch clubs from the worker and render the picker cards.
 * Only shows clubs the parent has joined via a share link.
 */
async function _loadClubPickerList(switchMode) {
  const listEl = document.getElementById('club-picker-list');
  if (!listEl) return;

  const joined = getJoinedClubs();
  let allClubs = [];
  try {
    const res = await fetch(WORKER + '/clubs');
    if (res.ok) {
      const data = await res.json();
      allClubs = data.clubs || [];
    }
  } catch (e) {
    console.warn('[club-picker] fetch /clubs error:', e.message);
  }

  // Filter to only show joined clubs
  const clubs = allClubs.filter(c => joined.includes(c.id));

  listEl.innerHTML = '';

  if (!clubs.length) {
    // No joined clubs — show join prompt
    listEl.innerHTML = `
      <div style="text-align:center;padding:24px 16px">
        <div style="font-size:2.2rem;margin-bottom:10px">🤽‍♀️</div>
        <div style="font-size:1.1rem;font-weight:700;color:white;margin-bottom:8px">Join Your Club</div>
        <div style="font-size:0.88rem;color:rgba(255,255,255,0.7);line-height:1.5;margin-bottom:16px">
          Ask your club admin for the parent join link.<br>
          It looks like: <em style="color:#fbbf24">eggbeater.app?join=your-club</em>
        </div>
        <div style="display:flex;gap:8px;max-width:320px;margin:0 auto">
          <input id="join-code-input" type="text" placeholder="Enter club code"
                 style="flex:1;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:0.9rem;font-family:inherit">
          <button onclick="_manualJoinClub()" style="padding:10px 16px;background:#002868;color:white;border:none;border-radius:8px;font-size:0.88rem;font-weight:700;cursor:pointer">Join</button>
        </div>
        <div id="join-error" style="font-size:0.82rem;color:#dc2626;margin-top:8px;min-height:18px"></div>
      </div>
    `;
    return;
  }

  // Auto-select only on first visit (not when switching clubs)
  if (!switchMode && clubs.length === 1) {
    _selectClub(clubs[0].id, clubs[0].name, clubs[0].clubType);
    return;
  }

  for (const club of clubs) {
    const card = document.createElement('div');
    card.className = 'club-picker-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const logoHtml = club.logo
      ? `<img src="${club.logo}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover">`
      : `<span style="font-size:1.6rem">\u{1F3CA}</span>`;

    card.innerHTML = `
      <div class="club-picker-card-icon">${logoHtml}</div>
      <div class="club-picker-card-info">
        <div class="club-picker-card-name">${_escHtml(club.name || club.id)}</div>
      </div>
      <div class="club-picker-card-arrow">\u203A</div>
    `;

    card.addEventListener('click', () => _selectClub(club.id, club.name, club.clubType));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') _selectClub(club.id, club.name, club.clubType); });
    listEl.appendChild(card);
  }

  // Add "Join another club" link at bottom
  const joinMore = document.createElement('div');
  joinMore.style.cssText = 'text-align:center;padding:12px;font-size:0.82rem';
  joinMore.innerHTML = `<a href="#" onclick="event.preventDefault();_showJoinInput()" style="color:rgba(255,255,255,0.8);font-weight:600">+ Join another club</a>`;
  listEl.appendChild(joinMore);
}

/** Manual join via text input */
async function _manualJoinClub() {
  const input = document.getElementById('join-code-input');
  const errEl = document.getElementById('join-error');
  if (!input) return;
  const code = input.value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!code) { if (errEl) errEl.textContent = 'Please enter a club code'; return; }

  // Validate club exists
  try {
    const res = await fetch(WORKER + '/clubs');
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    const club = (data.clubs || []).find(c => c.id === code);
    if (!club) {
      if (errEl) errEl.textContent = `Club "${code}" not found. Check with your admin.`;
      return;
    }
    addJoinedClub(code);
    _selectClub(club.id, club.name, club.clubType);
  } catch (e) {
    if (errEl) errEl.textContent = 'Could not connect. Try again.';
  }
}

/** Show inline join input when user already has clubs but wants to add another */
function _showJoinInput() {
  const listEl = document.getElementById('club-picker-list');
  if (!listEl) return;
  const existing = listEl.querySelector('.join-another-row');
  if (existing) return; // already showing
  const row = document.createElement('div');
  row.className = 'join-another-row';
  row.style.cssText = 'display:flex;gap:8px;padding:8px 16px;max-width:320px;margin:0 auto';
  row.innerHTML = `
    <input id="join-code-input" type="text" placeholder="Club code"
           style="flex:1;padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:0.88rem;font-family:inherit">
    <button onclick="_manualJoinClub()" style="padding:8px 14px;background:#002868;color:white;border:none;border-radius:8px;font-size:0.82rem;font-weight:700;cursor:pointer">Join</button>
  `;
  listEl.appendChild(row);
  row.querySelector('input').focus();
}

function _escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/**
 * Called when a parent taps a club card.
 */
function _selectClub(clubId, clubName, clubType) {
  localStorage.setItem('ebwp-club-id', clubId);
  if (clubName) localStorage.setItem('ebwp-club-name', clubName);
  localStorage.setItem('ebwp-club-type', clubType || 'club');
  TEAM_OPTIONS = clubType === 'highschool' ? TEAM_OPTIONS_HS : TEAM_OPTIONS_CLUB;
  // Reset team selection to first valid team for this club type
  localStorage.setItem('ebwp-team-keys', JSON.stringify([TEAM_OPTIONS[0].key]));

  // Update URL so bookmarks and shares include the club
  const url = new URL(window.location);
  url.searchParams.set('club', clubId);
  window.history.replaceState({}, '', url);

  // Hide picker, show app
  document.getElementById('club-picker').classList.add('hidden');
  document.querySelector('.app-header').style.display = '';
  document.getElementById('app').style.display = '';
  document.getElementById('bottom-nav').style.display = '';

  // Set club for Firestore routing
  if (typeof fbSetClubId === 'function') fbSetClubId(clubId);

  // Reload all team data with the new club ID
  loadAllSelectedTeams().then(() => {
    checkTournamentChange();
    seedHistory();
    renderHeader();
    renderScheduleTab();
    renderPossibleTab();
    renderHistoryTab();
    renderRosterTab();
  });
}

/**
 * Reset club selection — shows the picker again.
 * Called from "Change Club" link in header.
 */
function changeClub() {
  localStorage.removeItem('ebwp-club-id');
  localStorage.removeItem('ebwp-club-name');
  localStorage.removeItem('ebwp-club-type');
  localStorage.removeItem('ebwp-team-keys');
  localStorage.removeItem('ebwp-team-key');
  TEAM_OPTIONS = TEAM_OPTIONS_CLUB; // reset to default
  // Note: ebwp-joined-clubs is NOT cleared — user keeps their club memberships
  // Clear URL club param
  const url = new URL(window.location);
  url.searchParams.delete('club');
  window.history.replaceState({}, '', url);
  // Show picker (force show even if only 1 club, so user can add more)
  _showPickerForSwitch();
}

/** Show picker in "switch" mode — always shows all clubs + add option, never auto-selects */
function _showPickerForSwitch() {
  const picker = document.getElementById('club-picker');
  if (!picker) return;
  picker.classList.remove('hidden');
  document.querySelector('.app-header').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('bottom-nav').style.display = 'none';
  _loadClubPickerList(true); // true = switch mode (no auto-select)
}

// ─── TEAM / AGE-GROUP ─────────────────────────────────────────────────────────

const TEAM_OPTIONS_CLUB = [
  { key: '10u-coed',  label: '10u Co-Ed' },
  { key: '12u-girls', label: '12u Girls' },
  { key: '12u-boys',  label: '12u Boys'  },
  { key: '14u-girls', label: '14u Girls' },
  { key: '14u-boys',  label: '14u Boys'  },
  { key: '16u-girls', label: '16u Girls' },
  { key: '16u-boys',  label: '16u Boys'  },
  { key: '18u-girls', label: '18u Girls' },
  { key: '18u-boys',  label: '18u Boys'  },
];

const TEAM_OPTIONS_HS = [
  { key: 'boys-varsity',  label: 'Boys Varsity' },
  { key: 'boys-jv',       label: 'Boys JV' },
  { key: 'girls-varsity', label: 'Girls Varsity' },
  { key: 'girls-jv',      label: 'Girls JV' },
];

let TEAM_OPTIONS = localStorage.getItem('ebwp-club-type') === 'highschool'
  ? TEAM_OPTIONS_HS : TEAM_OPTIONS_CLUB;

// ── Age-group selection (supports multiple selections) ────────────────────────

function _teamKeysKey() {
  // Per-club namespaced key so each club remembers its own selected teams
  const clubId = getAppClubId();
  return clubId ? `ebwp-team-keys-${clubId}` : 'ebwp-team-keys';
}

function getSelectedTeams() {
  const validKeys = TEAM_OPTIONS.map(t => t.key);
  try {
    // Try per-club key first, fall back to legacy global key
    const stored = localStorage.getItem(_teamKeysKey()) || localStorage.getItem('ebwp-team-keys');
    if (stored !== null) {
      const parsed = JSON.parse(stored);
      // Filter to only keys valid for the current club's team options
      const filtered = parsed.filter(k => validKeys.includes(k));
      if (filtered.length) return filtered;
    }
  } catch {}
  // Fall back to auto-favorite for the current club if available
  const fav = _getAutoFavoriteTeam(validKeys);
  if (fav) return [fav];
  // Fall back to legacy single-team key if it's valid, otherwise first option
  const legacy = localStorage.getItem('ebwp-team-key');
  if (legacy && validKeys.includes(legacy)) return [legacy];
  return [validKeys[0] || '14u-girls'];
}

function getSelectedTeam() {
  return getSelectedTeams()[0];
}

function setSelectedTeams(keys) {
  localStorage.setItem(_teamKeysKey(), JSON.stringify(keys));
  if (keys.length) localStorage.setItem('ebwp-team-key', keys[0]); // compat
  // Sync to Firestore if parent is signed in (Phase 1)
  if (typeof fbSavePrefs === 'function') fbSavePrefs();
}

// ── Favorite age groups (Phase 5A) ────────────────────────────────────────────

function _favKey() {
  // Per-club namespaced key so each club remembers its own favorites independently
  const clubId = getAppClubId();
  return clubId ? `ebwp-fav-groups-${clubId}` : 'ebwp-fav-groups';
}

function getFavGroups() {
  try {
    // Try per-club key first, fall back to legacy global key
    const stored = localStorage.getItem(_favKey()) || localStorage.getItem('ebwp-fav-groups');
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function setFavGroups(groups) {
  localStorage.setItem(_favKey(), JSON.stringify(groups));
  if (typeof fbSavePrefs === 'function') fbSavePrefs();
}

/**
 * Auto-select a favorite team for the current club.
 * Returns the first favorite team key that's valid for this club, or null.
 */
function _getAutoFavoriteTeam(validKeys) {
  const favs = getFavGroups();
  if (!favs.length) return null;
  // Return the first favorite that's a valid team for this club
  for (const fav of favs) {
    if (validKeys.includes(fav)) return fav;
  }
  return null;
}

function toggleFavGroup(key) {
  const favs = getFavGroups();
  const idx = favs.indexOf(key);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(key);
  setFavGroups(favs);
  renderTeamPicker();
}

function toggleSelectedTeam(key) {
  const teams = getSelectedTeams();
  const idx   = teams.indexOf(key);
  if (idx >= 0) {
    teams.splice(idx, 1);
  } else {
    teams.push(key);
  }
  // Always keep in canonical age-group order regardless of selection order
  const order = TEAM_OPTIONS.map(t => t.key);
  teams.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  setSelectedTeams(teams);
}

async function loadTeamData(teamKey) {
  try {
    let teamUrl = `${WORKER}/team-data?team=${encodeURIComponent(teamKey)}`;
    const club = getAppClubId();
    if (club) teamUrl += `&club=${encodeURIComponent(club)}`;
    const res = await fetch(teamUrl, { cache: 'no-store' });
    if (!res.ok) return; // no data for this team yet — keep current TOURNAMENT
    const data = await res.json();
    const { tournament, history, clubType, clubName, branding } = data;
    if (tournament) {
      TEAM_CACHE[teamKey]  = { tournament, history: history || [] };
      window.TOURNAMENT    = tournament;
      window.HISTORY_SEED  = history || [];
    }

    // Apply branding from the team data payload (preferred source)
    if (branding) {
      if (branding.primaryColor) {
        applyClubBranding(branding.primaryColor, branding.secondaryColor, branding.headerStyle);
      }
      if (branding.logoUrl) {
        applyClubLogo(branding.logoUrl, clubName);
      }
      // Don't call applyClubLogo(null) here — if team-data has no logoUrl,
      // keep whatever logo was already set by the club-info fetch in _doTeamLoad.
    }
    // Detect HS club type and switch team options dynamically
    if (clubType && clubType !== localStorage.getItem('ebwp-club-type')) {
      localStorage.setItem('ebwp-club-type', clubType);
      const isHS = clubType === 'highschool';
      TEAM_OPTIONS = isHS ? TEAM_OPTIONS_HS : TEAM_OPTIONS_CLUB;
      // If the current team key doesn't belong to the new options, reset selection
      const validKeys = TEAM_OPTIONS.map(t => t.key);
      const current = getSelectedTeams();
      if (!current.some(k => validKeys.includes(k))) {
        setSelectedTeams([validKeys[0]]);
      }
      renderHeader(); // switch header style (HS vs Club)
    }
    if (clubName && clubName !== localStorage.getItem('ebwp-club-name')) {
      localStorage.setItem('ebwp-club-name', clubName);
      renderHeader();
    }
  } catch (e) {
    console.warn('[ebwp] loadTeamData failed:', e.message);
  }
}

async function loadAllSelectedTeams() {
  const teams = getSelectedTeams();
  if (teams.length > 0) await loadTeamData(teams[0]); // primary first
  if (teams.length > 1) await Promise.all(teams.slice(1).map(k => loadTeamData(k)));
  // Restore primary tournament context
  if (TEAM_CACHE[teams[0]]) {
    window.TOURNAMENT   = TEAM_CACHE[teams[0]].tournament;
    window.HISTORY_SEED = TEAM_CACHE[teams[0]].history || [];
  }
}

/** Deselect all team keys in an HS group (e.g., boys-varsity,boys-jv) */
async function deselectHSGroup(keysStr) {
  const keysToRemove = keysStr.split(',');
  let teams = getSelectedTeams().filter(k => !keysToRemove.includes(k));
  setSelectedTeams(teams);
  // Restore primary from remaining teams
  if (teams.length && TEAM_CACHE[teams[0]]) {
    window.TOURNAMENT   = TEAM_CACHE[teams[0]].tournament;
    window.HISTORY_SEED = TEAM_CACHE[teams[0]].history || [];
  }
  checkTournamentChange();
  seedHistory();
  renderTeamPicker();
  renderHeader();
  renderScheduleTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
}

async function onAgeGroupToggle(teamKey) {
  toggleSelectedTeam(teamKey);
  const teams = getSelectedTeams();
  // Load any uncached teams
  const missing = teams.filter(k => !TEAM_CACHE[k]);
  if (missing.length) await Promise.all(missing.map(k => loadTeamData(k)));
  // Restore primary
  if (TEAM_CACHE[teams[0]]) {
    window.TOURNAMENT   = TEAM_CACHE[teams[0]].tournament;
    window.HISTORY_SEED = TEAM_CACHE[teams[0]].history || [];
  }
  checkTournamentChange();
  seedHistory();
  renderTeamPicker();
  renderHeader();
  renderScheduleTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
  // Phase 2: sync Firestore listeners to match current team selection
  if (typeof fbListenToTournament === 'function') {
    teams.forEach(k => fbListenToTournament(k));
  }
}

async function onTeamChange(teamKey) {
  setSelectedTeams([teamKey]);
  await loadTeamData(teamKey);
  checkTournamentChange();
  seedHistory();
  renderHeader();
  renderScheduleTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
}
const VAPID_PUBLIC_KEY = 'BLAUkqU0MK0iweY295OlM0ZvnsnW_sY9nimSShbwBZRQc2swcC79ReFT2Abs4drLSZZdrToy3nZRILeta37USBY';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    showToast('Push notifications not supported in this browser');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('Notifications blocked — enable in browser settings');
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    let sub   = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Send the subscription to the Cloudflare Worker
    const res = await fetch(`${PUSH_SERVER_URL}/subscribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(sub),
    });

    if (res.ok) {
      localStorage.setItem('ebwp-push-subscribed', '1');
      showToast('🔔 Notifications enabled! You\'ll be alerted when new games are added.', 'ok');
      renderPushButton();
    } else {
      showToast('Subscription failed — try again');
    }
  } catch (e) {
    console.error('Push subscribe error:', e);
    showToast('Could not enable notifications: ' + e.message);
  }
}

async function unsubscribeFromPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    localStorage.removeItem('ebwp-push-subscribed');
    showToast('Notifications turned off');
    renderPushButton();
  } catch (e) {
    showToast('Could not unsubscribe: ' + e.message);
  }
}

function isPushSubscribed() {
  return !!localStorage.getItem('ebwp-push-subscribed');
}

/** Renders the push toggle button inside the sync card area. */
function renderPushButton() {
  const el = $('push-btn-container');
  if (!el) return;

  // Check support: native (Capacitor) or web (Service Worker + PushManager)
  const native    = typeof EggbeaterPush !== 'undefined' && EggbeaterPush.isNative();
  const webSupported = ('serviceWorker' in navigator) && ('PushManager' in window);
  if (!native && !webSupported) { el.innerHTML = ''; return; }

  const subscribed = isPushSubscribed();

  if (subscribed) {
    // ── Subscribed: show preferences + unsubscribe ───────────────────────
    const prefs = _loadPushPrefs();
    const ageGroups = (typeof getSelectedTeams === 'function') ? getSelectedTeams() : [];

    el.innerHTML = `
      <div class="push-card">
        <div class="push-header">
          <span class="push-icon">🔔</span>
          <span class="push-title">Notifications On${native ? ' (iOS)' : ''}</span>
        </div>
        <div class="push-prefs">
          <label class="push-pref-row">
            <input type="checkbox" id="pref-scores" ${prefs.gameScores ? 'checked' : ''}
                   onchange="onPushPrefChange()">
            <span>Game score updates</span>
          </label>
          <div id="score-freq-section" class="push-sub-prefs" style="${prefs.gameScores ? '' : 'display:none'}">
            <label class="push-pref-row push-pref-sub">
              <input type="radio" name="score-freq" value="everyGoal" ${prefs.scoreFrequency === 'everyGoal' ? 'checked' : ''}
                     onchange="onPushPrefChange()">
              <span>Every goal ⚽</span>
            </label>
            <label class="push-pref-row push-pref-sub">
              <input type="radio" name="score-freq" value="endOfQuarter" ${prefs.scoreFrequency === 'endOfQuarter' ? 'checked' : ''}
                     onchange="onPushPrefChange()">
              <span>End of quarter</span>
            </label>
            <label class="push-pref-row push-pref-sub">
              <input type="radio" name="score-freq" value="endOfGame" ${prefs.scoreFrequency === 'endOfGame' ? 'checked' : ''}
                     onchange="onPushPrefChange()">
              <span>End of game only</span>
            </label>
          </div>
          <label class="push-pref-row">
            <input type="checkbox" id="pref-schedule" ${prefs.scheduleChanges ? 'checked' : ''}
                   onchange="onPushPrefChange()">
            <span>Schedule changes</span>
          </label>
          <label class="push-pref-row">
            <input type="checkbox" id="pref-announce" ${prefs.tournamentAnnouncements ? 'checked' : ''}
                   onchange="onPushPrefChange()">
            <span>Tournament announcements</span>
          </label>
          <label class="push-pref-row">
            <input type="checkbox" id="pref-reminders" ${prefs.gameReminders ? 'checked' : ''}
                   onchange="onPushPrefChange()">
            <span>Game reminders ⏰</span>
          </label>
          <div id="reminder-lead-section" class="push-sub-prefs" style="${prefs.gameReminders ? '' : 'display:none'}">
            <label class="push-pref-row push-pref-sub">
              <input type="checkbox" id="pref-remind-30" ${(prefs.reminderLeadMinutes || []).includes(30) ? 'checked' : ''}
                     onchange="onPushPrefChange()">
              <span>30 minutes before</span>
            </label>
            <label class="push-pref-row push-pref-sub">
              <input type="checkbox" id="pref-remind-60" ${(prefs.reminderLeadMinutes || []).includes(60) ? 'checked' : ''}
                     onchange="onPushPrefChange()">
              <span>1 hour before</span>
            </label>
            <label class="push-pref-row push-pref-sub">
              <input type="checkbox" id="pref-remind-120" ${(prefs.reminderLeadMinutes || []).includes(120) ? 'checked' : ''}
                     onchange="onPushPrefChange()">
              <span>2 hours before</span>
            </label>
          </div>
        </div>
        <button class="push-btn push-btn-on" onclick="handlePushUnsubscribe()">
          Turn off notifications
        </button>
      </div>`;
  } else {
    // ── Not subscribed: show opt-in ──────────────────────────────────────
    el.innerHTML = `
      <div class="push-card">
        <div class="push-header">
          <span class="push-icon">🔕</span>
          <span class="push-title">Stay in the loop</span>
        </div>
        <p class="push-desc">Get notified about game scores, schedule changes, and tournament updates.</p>
        <button class="push-btn push-btn-off" onclick="handlePushSubscribe()">
          Enable Notifications
        </button>
      </div>`;
  }
}

function _loadPushPrefs() {
  try {
    const saved = localStorage.getItem('ebwp-push-prefs');
    if (saved) {
      const p = JSON.parse(saved);
      // Ensure new fields have defaults
      if (!p.scoreFrequency) p.scoreFrequency = 'everyGoal';
      if (p.gameReminders === undefined) p.gameReminders = false;
      if (!Array.isArray(p.reminderLeadMinutes)) p.reminderLeadMinutes = [60];
      return p;
    }
  } catch {}
  return { gameScores: true, scoreFrequency: 'everyGoal', scheduleChanges: true,
           tournamentAnnouncements: true, gameReminders: false, reminderLeadMinutes: [60] };
}

function _savePushPrefs(prefs) {
  localStorage.setItem('ebwp-push-prefs', JSON.stringify(prefs));
}

function onPushPrefChange() {
  const scoresOn = !!($('pref-scores') && $('pref-scores').checked);
  const remindersOn = !!($('pref-reminders') && $('pref-reminders').checked);

  // Toggle sub-sections visibility
  const freqSec = document.getElementById('score-freq-section');
  if (freqSec) freqSec.style.display = scoresOn ? '' : 'none';
  const remSec = document.getElementById('reminder-lead-section');
  if (remSec) remSec.style.display = remindersOn ? '' : 'none';

  // Read score frequency radio
  const freqRadio = document.querySelector('input[name="score-freq"]:checked');
  const scoreFrequency = freqRadio ? freqRadio.value : 'everyGoal';

  // Read reminder lead times
  const reminderLeadMinutes = [];
  if ($('pref-remind-30')?.checked) reminderLeadMinutes.push(30);
  if ($('pref-remind-60')?.checked) reminderLeadMinutes.push(60);
  if ($('pref-remind-120')?.checked) reminderLeadMinutes.push(120);

  const prefs = {
    gameScores:              scoresOn,
    scoreFrequency,
    scheduleChanges:         !!($('pref-schedule') && $('pref-schedule').checked),
    tournamentAnnouncements: !!($('pref-announce') && $('pref-announce').checked),
    gameReminders:           remindersOn,
    reminderLeadMinutes,
    ageGroups: (typeof getSelectedTeams === 'function') ? getSelectedTeams() : [],
  };
  _savePushPrefs(prefs);
  // Update Firestore if native
  if (typeof EggbeaterPush !== 'undefined' && EggbeaterPush.isNativePush()) {
    EggbeaterPush.updatePreferences(prefs);
  }
}

async function handlePushSubscribe() {
  const prefs = {
    gameScores: true,
    scoreFrequency: 'everyGoal',
    scheduleChanges: true,
    tournamentAnnouncements: true,
    gameReminders: false,
    reminderLeadMinutes: [60],
    ageGroups: (typeof getSelectedTeams === 'function') ? getSelectedTeams() : [],
  };
  _savePushPrefs(prefs);

  if (typeof EggbeaterPush !== 'undefined' && EggbeaterPush.isNative()) {
    await EggbeaterPush.register(prefs);
  } else {
    await subscribeToPush();
  }
}

async function handlePushUnsubscribe() {
  if (typeof EggbeaterPush !== 'undefined' && EggbeaterPush.isNativePush()) {
    await EggbeaterPush.unregister();
  } else {
    await unsubscribeFromPush();
  }
  localStorage.removeItem('ebwp-push-prefs');
}

// ─── SCORER MODE (password-gated scoring controls) ────────────────────────────

function isScorerUnlocked() {
  return localStorage.getItem('ebwp-scorer-unlocked') === '1'
    && localStorage.getItem('ebwp-scorer-tournament') === (TOURNAMENT.id || '');
}

function openScoringPasswordModal() {
  const modal = $('scoring-pw-modal');
  if (!modal) return;
  $('scoring-pw-input').value = '';
  $('scoring-pw-error').textContent = '';
  modal.classList.remove('hidden');
  setTimeout(() => $('scoring-pw-input').focus(), 150);
}

function closeScoringPasswordModal() {
  $('scoring-pw-modal').classList.add('hidden');
}

function submitScoringPassword() {
  const entered = ($('scoring-pw-input').value || '').trim();
  const correct = (TOURNAMENT.scoringPassword || '').trim();

  if (!correct || entered === correct) {
    localStorage.setItem('ebwp-scorer-unlocked',    '1');
    localStorage.setItem('ebwp-scorer-tournament',  TOURNAMENT.id || '');
    state.viewerMode = false;
    closeScoringPasswordModal();
    showToast('🔓 Scorer mode unlocked!', 'ok');
    renderGamesList();
    if (state.currentTab === 'scores') renderScoresTab();
  } else {
    $('scoring-pw-error').textContent = 'Incorrect password — try again';
    $('scoring-pw-input').value = '';
    $('scoring-pw-input').focus();
  }
}

function lockScoring() {
  localStorage.removeItem('ebwp-scorer-unlocked');
  localStorage.removeItem('ebwp-scorer-tournament');
  // Broadcast 'pre' to worker for every game this device was scoring so that
  // ALL other devices' live dots and LIVE badges clear immediately.
  const myGames = getMyGames();
  for (const [gameId, s] of Object.entries(state.liveScores)) {
    if (s && s.gameState && s.gameState !== 'pre' && (myGames.has(gameId) || !s._remote)) {
      broadcastGameReset(gameId);
    }
  }
  showToast('🔒 Scorer mode locked');
  updateLiveDot();
  renderGamesList();
  renderNextGameCard(); // clear LIVE badge on blue card
  if (state.currentTab === 'scores') renderScoresTab();
}

// ─── LIVE SCORE BROADCAST & SYNC ──────────────────────────────────────────────
// Scorer device pushes state after every event.
// Viewer devices poll every 10 s and merge remote state into their display.
// Devices are distinguished by a random per-device ID stored in localStorage
// so the scorer never overwrites their own live state with stale remote data.

const LIVE_POLL_MS = 10_000;
let _livePollTimer = null;

function getDeviceId() {
  let id = localStorage.getItem('ebwp-device-id');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('ebwp-device-id', id);
  }
  return id;
}

/** Push current live score for a game to Cloudflare KV. Fire-and-forget. */
async function broadcastLiveScore(gameId) {
  const score = state.liveScores[gameId];
  if (!score || score.gameState === 'pre') return; // nothing worth broadcasting yet
  // Strip private tracking fields before sending
  const { _remote, _broadcastAt, _deviceId, ...cleanScore } = score;
  const payload = {
    gameId,
    tournamentId: TOURNAMENT.id || '',
    deviceId:     getDeviceId(),
    score:        cleanScore,
  };
  try {
    const res = await fetch(`${PUSH_SERVER_URL}/live-score`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  } catch (e) {
    // Queue for later sync
    _queuePendingScore(payload);
  }
}

// ── Offline Score Queue (IndexedDB) ──────────────────────────────────────────

function _openScoreDB() {
  return new Promise((resolve, reject) => {
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
}

async function _queuePendingScore(payload) {
  try {
    const db = await _openScoreDB();
    const tx = db.transaction('pending-scores', 'readwrite');
    tx.objectStore('pending-scores').add({
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    });
    // Show offline banner
    _showOfflineBanner(true);
    // Register background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('score-sync').catch(() => {});
    }
  } catch (e) { console.warn('[offline] queue failed:', e.message); }
}

async function _syncPendingScores() {
  try {
    const db = await _openScoreDB();
    const tx = db.transaction('pending-scores', 'readonly');
    const store = tx.objectStore('pending-scores');
    const all = await new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    if (!all.length) return;

    let synced = 0;
    for (const entry of all) {
      if (entry.retryCount >= 10) {
        // Give up — delete and notify
        const dtx = db.transaction('pending-scores', 'readwrite');
        dtx.objectStore('pending-scores').delete(entry.id);
        showToast('❌ Failed to sync a score after 10 retries', 'err');
        continue;
      }
      try {
        const res = await fetch(`${PUSH_SERVER_URL}/live-score`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(entry.payload),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        // Success — remove from queue
        const dtx = db.transaction('pending-scores', 'readwrite');
        dtx.objectStore('pending-scores').delete(entry.id);
        synced++;
      } catch {
        // Increment retry count
        const utx = db.transaction('pending-scores', 'readwrite');
        utx.objectStore('pending-scores').put({ ...entry, retryCount: entry.retryCount + 1 });
        break; // stop trying if still offline
      }
    }
    if (synced > 0) {
      showToast(`✅ ${synced} score${synced > 1 ? 's' : ''} synced`, 'ok');
    }
    // Check if queue is empty now
    const checkTx = db.transaction('pending-scores', 'readonly');
    const remaining = await new Promise((res) => {
      const req = checkTx.objectStore('pending-scores').count();
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(0);
    });
    if (remaining === 0) _showOfflineBanner(false);
  } catch (e) { console.warn('[offline] sync failed:', e.message); }
}

function _showOfflineBanner(show) {
  let banner = document.getElementById('offline-score-banner');
  if (show && !banner) {
    banner = document.createElement('div');
    banner.id = 'offline-score-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:0.82rem;font-weight:700;text-align:center;padding:8px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.15)';
    banner.textContent = '📡 Offline — scores will sync when connected';
    document.body.appendChild(banner);
  } else if (!show && banner) {
    banner.remove();
  }
}

// Sync when connectivity resumes
window.addEventListener('online', () => { _syncPendingScores(); });
// Also try syncing on page load
setTimeout(_syncPendingScores, 3000);

// ── Cache tournament data for offline fallback ───────────────────────────────

async function _cacheTournamentData(team, data) {
  try {
    const db = await _openScoreDB();
    const tx = db.transaction('tournament-cache', 'readwrite');
    tx.objectStore('tournament-cache').put({ key: team, data, updatedAt: Date.now() });
  } catch { /* ignore */ }
}

async function _getCachedTournamentData(team) {
  try {
    const db = await _openScoreDB();
    const tx = db.transaction('tournament-cache', 'readonly');
    return await new Promise((res) => {
      const req = tx.objectStore('tournament-cache').get(team);
      req.onsuccess = () => res(req.result?.data || null);
      req.onerror = () => res(null);
    });
  } catch { return null; }
}

// Broadcast gameState:'pre' to the worker so ALL polling devices clear their
// live dot / LIVE badge the moment this scorer locks.
function broadcastGameReset(gameId) {
  try {
    const score = state.liveScores[gameId] || {};
    const { _remote, _broadcastAt, _deviceId, ...cleanScore } = score;
    fetch(`${PUSH_SERVER_URL}/live-score`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        gameId,
        tournamentId: TOURNAMENT.id || '',
        deviceId:     getDeviceId(),
        score:        { ...cleanScore, gameState: 'pre' },
      }),
    }).catch(() => {});
  } catch { /* ignore */ }
}

/** Fire-and-forget APNs push to parents when a score event happens. */
function notifyScorePush(gameId, eventType) {
  const score = state.liveScores[gameId];
  if (!score || score.gameState === 'pre' || score.gameState === 'final') return;
  const game = getTournamentGames().find(g => g.id === gameId);
  const clubId = (typeof getAppClubId === 'function' ? getAppClubId() : null) || '680-drivers';
  const teamKey = (typeof getSelectedTeam === 'function') ? getSelectedTeam() : TEAM_OPTIONS[0].key;
  try {
    const headers = { 'Content-Type': 'application/json' };
    // Include scoring password if available
    const scorePw = TOURNAMENT.scoringPassword || '';
    if (scorePw) headers['X-Score-Password'] = scorePw;
    fetch(`${PUSH_SERVER_URL}/notify-score`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clubId,
        ageGroup: teamKey,
        gameId,
        teamScore: score.team || 0,
        oppScore: score.opp || 0,
        opponent: game?.opponent || 'Opponent',
        event: eventType,
      }),
    }).catch(() => {});
  } catch { /* ignore */ }
}

/** Poll worker for live scores pushed by other devices. */
async function pollLiveScores() {
  try {
    const tid = encodeURIComponent(TOURNAMENT.id || '');
    const res = await fetch(`${PUSH_SERVER_URL}/live-scores?t=${tid}`);
    if (!res.ok) return;
    const remote = await res.json();

    let changed = false;
    const myGames = getMyGames();

    for (const [gameId, remoteScore] of Object.entries(remote)) {
      if (myGames.has(gameId)) continue; // we scored this game — never overwrite with remote
      const local = state.liveScores[gameId] || {};
      if ((remoteScore.broadcastAt || 0) <= (local._broadcastAt || 0)) continue; // not newer

      // Strip worker meta fields; tag the score as remote with the source device
      const { deviceId, tournamentId, gameId: _gid, broadcastAt, ...scoreData } = remoteScore;
      state.liveScores[gameId] = { ...scoreData, _remote: true, _broadcastAt: broadcastAt, _deviceId: deviceId };
      changed = true;
    }

    if (changed) {
      saveLiveScores();
      renderNextGameCard();  // update IN PROGRESS card + live score on Schedule tab
      renderGamesList();
      if (state.currentTab === 'scores') renderScoresTab();
      updateLiveDot();
      showLiveToast();
      // Android 16 Live Update Sync (for viewers)
      if (typeof EggbeaterLiveUpdate !== 'undefined') {
        const liveGames = getTournamentGames().filter(g => isGameLive(g.id));
        if (liveGames.length > 0) {
          // Sync the first one found (usually only one game live at a time for a team)
          const gId = liveGames[0].id;
          EggbeaterLiveUpdate.sync(gId, state.liveScores[gId]);
        }
      }
    }
  } catch { /* ignore network errors — offline is fine */ }
}

let _liveToastShown = false;
function showLiveToast() {
  if (_liveToastShown) return;
  _liveToastShown = true;
  showToast('📡 Live scoring update received', 'ok');
  setTimeout(() => { _liveToastShown = false; }, 15000);
}

function startLivePoller() {
  if (_livePollTimer) return;
  pollLiveScores(); // immediate first check
  _livePollTimer = setInterval(pollLiveScores, LIVE_POLL_MS);
}

// ─── PLAYER STATS DOWNLOAD ────────────────────────────────────────────────────

/**
 * Scans all events (current tournament + full history) and returns a
 * de-duped list of players who have at least one recorded event.
 * Players are keyed by NAME (case-insensitive) so the same player
 * wearing different cap numbers across tournaments is merged into one row.
 * Each entry: { name, G, A, Excl, sixOnFive, gameCount }
 */
function getAllPlayersWithStats() {
  // key = lowercased full name (or 'unknown:cap' fallback for nameless events)
  const map = {};

  function nameKey(ev) {
    const name = String(ev.name || '').trim();
    if (name) return name.toLowerCase();
    const cap = String(ev.cap || '').trim();
    return cap ? ('unknown:' + cap) : null;
  }

  function processEvts(evts, gameKey) {
    for (const ev of (evts || [])) {
      if (ev.side !== 'team' || ev.type === 'game_state') continue;
      if (!['goal','shot_miss','goal_5m','miss_5m','so_goal','so_miss','assist','exclusion','brutality','save','block'].includes(ev.type)) continue;
      const key = nameKey(ev);
      if (!key) continue;
      const name = String(ev.name || '').trim();
      if (!map[key]) map[key] = { name, G: 0, SM: 0, G5: 0, M5: 0, SOG: 0, SOM: 0, A: 0, Excl: 0, sixOnFive: 0, Sv: 0, Blk: 0, games: new Set() };
      // Keep the longest / most complete name seen for this player
      if (name.length > map[key].name.length) map[key].name = name;
      map[key].games.add(gameKey);
      if (ev.type === 'goal')                               { map[key].G++;      if (ev.sixOnFive) map[key].sixOnFive++; }
      if (ev.type === 'shot_miss')                            map[key].SM++;
      if (ev.type === 'goal_5m')                              map[key].G5++;
      if (ev.type === 'miss_5m')                              map[key].M5++;
      if (ev.type === 'so_goal')                              map[key].SOG++;
      if (ev.type === 'so_miss')                              map[key].SOM++;
      if (ev.type === 'assist')                               map[key].A++;
      if (ev.type === 'exclusion' || ev.type === 'brutality') map[key].Excl++;
      if (ev.type === 'save')                                 map[key].Sv++;
      if (ev.type === 'block')                                map[key].Blk++;
    }
  }

  // Current tournament live scores
  for (const g of getTournamentGames()) {
    const ls = state.liveScores[g.id] || {};
    processEvts(ls.events || [], 'current:' + g.id);
  }

  // Full history (localStorage)
  for (const t of getHistory()) {
    for (const g of (t.games || [])) {
      const ls   = g.liveScore || {};
      const evts = ls.events || (ls.goals
        ? ls.goals.map(g2 => ({ type: g2.side === 'team' ? 'goal' : 'opp_goal', ...g2 }))
        : []);
      processEvts(evts, t.id + ':' + (g.id || g.opponent));
    }
  }

  return Object.values(map)
    .map(p => ({ ...p, gameCount: p.games.size }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * Collects per-game stats for one player matched by NAME.
 * Matching rules (in order of specificity):
 *  1. Full name exact match (case-insensitive)
 *  2. First name exact match (only when first name is > 2 chars, avoids "Jo" collisions)
 * Cap numbers are intentionally ignored for matching — they rotate per tournament.
 * Returns an array of row objects sorted oldest → newest.
 */
function collectPlayerGameRows(name) {
  const rows    = [];
  const nameStr = String(name || '').trim().toLowerCase();
  const firstName = nameStr.split(' ')[0] || '';

  function matchesPlayer(ev) {
    const evName = String(ev.name || '').trim().toLowerCase();
    if (!evName) return false;
    if (evName === nameStr) return true;                                    // full match
    if (firstName.length > 2 && evName.split(' ')[0] === firstName) return true; // first-name match
    return false;
  }

  function extractFromEvts(evts) {
    let G = 0, SM = 0, G5 = 0, M5 = 0, SOG = 0, SOM = 0, A = 0, Excl = 0, sixOnFive = 0, Sv = 0, Blk = 0, hasAny = false;
    for (const ev of (evts || [])) {
      if (ev.type === 'game_state') continue;
      if (!matchesPlayer(ev)) continue;
      hasAny = true;
      if (ev.type === 'goal')                               { G++;  if (ev.sixOnFive) sixOnFive++; }
      if (ev.type === 'shot_miss')                            SM++;
      if (ev.type === 'goal_5m')                              G5++;
      if (ev.type === 'miss_5m')                              M5++;
      if (ev.type === 'so_goal')                              SOG++;
      if (ev.type === 'so_miss')                              SOM++;
      if (ev.type === 'assist')                               A++;
      if (ev.type === 'exclusion' || ev.type === 'brutality') Excl++;
      if (ev.type === 'save')                                 Sv++;
      if (ev.type === 'block')                                Blk++;
    }
    return { hasAny, G, SM, G5, M5, SOG, SOM, A, Excl, sixOnFive, Sv, Blk };
  }

  // Current tournament
  for (const g of getTournamentGames()) {
    const ls   = state.liveScores[g.id] || {};
    const evts = ls.events || [];
    const stats = extractFromEvts(evts);
    if (stats.hasAny || evts.filter(e => e.type !== 'game_state').length > 0) {
      // Only include this game if events were recorded AND this player appeared
      if (!stats.hasAny) continue;
      rows.push({
        tournamentName: TOURNAMENT.name || 'Eggbeater',
        date:           g.dateISO || g.date || '',
        opponent:       g.opponent || 'TBD',
        result:         state.results[g.id] || '',
        teamScore:      ls.team ?? '',
        oppScore:       ls.opp  ?? '',
        ...stats,
      });
    }
  }

  // Full history
  for (const t of getHistory()) {
    for (const g of (t.games || [])) {
      const ls   = g.liveScore || {};
      const evts = ls.events || (ls.goals
        ? ls.goals.map(g2 => ({ type: g2.side === 'team' ? 'goal' : 'opp_goal', ...g2 }))
        : []);
      const stats = extractFromEvts(evts);
      if (!stats.hasAny) continue;
      rows.push({
        tournamentName: t.name || 'Past Tournament',
        date:           g.dateISO || g.date || '',
        opponent:       g.opponent || 'TBD',
        result:         g.result || '',
        teamScore:      ls.team ?? '',
        oppScore:       ls.opp  ?? '',
        ...stats,
      });
    }
  }

  // Sort chronologically (oldest first)
  rows.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  return rows;
}

/** Builds a CSV string for a player's stats. */
function buildPlayerStatsCSV(playerLabel, rows) {
  const now      = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const totalG    = rows.reduce((s, r) => s + r.G, 0);
  const totalA    = rows.reduce((s, r) => s + r.A, 0);
  const totalExcl = rows.reduce((s, r) => s + r.Excl, 0);
  const total6v5  = rows.reduce((s, r) => s + r.sixOnFive, 0);
  const totalSv   = rows.reduce((s, r) => s + (r.Sv  || 0), 0);
  const totalBlk  = rows.reduce((s, r) => s + (r.Blk || 0), 0);
  const totalWins = rows.filter(r => isWin(r.result)).length;
  const isGkPlayer = totalSv > 0 || totalBlk > 0;

  const q = str => `"${String(str || '').replace(/"/g, '""')}"`;

  const header = isGkPlayer
    ? 'Tournament,Date,Opponent,Result,Team Score,Opp Score,Goals,Assists,Exclusions,6v5 Goals,Saves,Blocks'
    : 'Tournament,Date,Opponent,Result,Team Score,Opp Score,Goals,Assists,Exclusions,6v5 Goals';

  const lines = [
    q('Eggbeater Water Polo — Player Stats Export'),
    q(`Player: ${playerLabel}`),
    q(`Exported: ${now}`),
    q(`${rows.length} game${rows.length !== 1 ? 's' : ''}  |  Record: ${totalWins}-${rows.length - totalWins}  |  Goals: ${totalG}  Assists: ${totalA}  Exclusions: ${totalExcl}${total6v5 ? '  6v5: ' + total6v5 : ''}${isGkPlayer ? `  Saves: ${totalSv}  Blocks: ${totalBlk}` : ''}`),
    '',
    header,
  ];

  for (const r of rows) {
    let dateStr = '';
    if (r.date) {
      try {
        dateStr = new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch { dateStr = r.date; }
    }
    const base = [
      q(r.tournamentName),
      q(dateStr),
      q(r.opponent),
      q(resultLabel(r.result)),
      r.teamScore !== '' ? r.teamScore : '',
      r.oppScore  !== '' ? r.oppScore  : '',
      r.G,
      r.A,
      r.Excl,
      r.sixOnFive,
    ];
    if (isGkPlayer) base.push(r.Sv || 0, r.Blk || 0);
    lines.push(base.join(','));
  }

  lines.push('');
  const totalsBase = [q('SEASON TOTALS'), '', '', '', '', '', totalG, totalA, totalExcl, total6v5];
  if (isGkPlayer) totalsBase.push(totalSv, totalBlk);
  lines.push(totalsBase.join(','));

  return lines.join('\n');
}

/** Triggers a file download in the browser. */
function triggerDownload(filename, content, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Opens the player stats download modal. */
function openPlayerStatsModal() {
  const players = getAllPlayersWithStats();
  const listEl  = $('player-stats-list');

  if (!players.length) {
    listEl.innerHTML = `<p class="pstats-empty">No box scores recorded yet.<br>Use live scoring during a game to start tracking stats.</p>`;
  } else {
    listEl.innerHTML = players.map(p => {
      const displayName = escHtml(p.name || '?');
      const gkExtra     = (p.Sv || p.Blk) ? `&nbsp;&nbsp;Sv&nbsp;${p.Sv||0}&nbsp;&nbsp;Blk&nbsp;${p.Blk||0}` : '';
      const totals      = `<span class="pstats-totals">G&nbsp;${p.G}&nbsp;&nbsp;A&nbsp;${p.A}&nbsp;&nbsp;Ex&nbsp;${p.Excl}${gkExtra}</span>`;
      const gamesStr    = `<span class="pstats-games">${p.gameCount} game${p.gameCount !== 1 ? 's' : ''}</span>`;
      const nameEncoded = encodeURIComponent(p.name || '');
      return `<button class="pstats-player-btn" onclick="downloadPlayerStats('${nameEncoded}')">
        <div class="pstats-player-left"><span class="pstats-name">${displayName}</span></div>
        <div class="pstats-player-right">${totals}${gamesStr}<span class="pstats-dl-icon">⬇</span></div>
      </button>`;
    }).join('');
  }

  $('player-stats-modal').classList.remove('hidden');
}

/** Closes the player stats modal. */
function closePlayerStatsModal() {
  $('player-stats-modal').classList.add('hidden');
}

// ── Season Stats Modal (from archived tournaments) ──────────────────────────

let _seasonStatsData = [];
let _seasonStatsSort = { col: 'goals', desc: true };

async function openSeasonStatsModal() {
  // Create modal if not exists
  let modal = $('season-stats-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'season-stats-modal';
    modal.className = 'modal-overlay hidden';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:480px;width:100%;max-height:90vh;overflow-y:auto;border-radius:16px;padding:0">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px;border-bottom:1px solid var(--gray-200,#e5e7eb)">
          <h2 style="margin:0;font-size:1.1rem">📊 Season Player Stats</h2>
          <button onclick="closeSeasonStatsModal()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--gray-500,#6b7280)">✕</button>
        </div>
        <div id="season-stats-body" style="padding:12px 16px"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeSeasonStatsModal(); });
  }

  modal.classList.remove('hidden');
  const body = $('season-stats-body');
  body.innerHTML = '<div style="text-align:center;color:var(--gray-500,#6b7280);padding:24px;font-size:0.85rem">Loading season stats…</div>';

  try {
    const clubId = localStorage.getItem('ebwp-club') || '680-drivers';
    const team = getSelectedTeam();
    const res = await fetch(`${PUSH_SERVER_URL}/player-stats?club=${encodeURIComponent(clubId)}&team=${encodeURIComponent(team)}`);
    const data = await res.json();
    _seasonStatsData = data.stats || [];

    if (!_seasonStatsData.length) {
      body.innerHTML = '<div style="text-align:center;color:var(--gray-500,#6b7280);padding:24px;font-size:0.85rem">No archived stats yet.<br>Stats aggregate from archived tournaments with player data.</div>';
      return;
    }

    renderSeasonStatsTable();
  } catch (e) {
    body.innerHTML = `<div style="color:#dc2626;padding:16px;font-size:0.85rem">Failed to load: ${escHtml(e.message)}</div>`;
  }
}

function closeSeasonStatsModal() {
  const m = $('season-stats-modal');
  if (m) m.classList.add('hidden');
}

function sortSeasonStats(col) {
  if (_seasonStatsSort.col === col) {
    _seasonStatsSort.desc = !_seasonStatsSort.desc;
  } else {
    _seasonStatsSort.col = col;
    _seasonStatsSort.desc = true;
  }
  renderSeasonStatsTable();
}

function renderSeasonStatsTable() {
  const body = $('season-stats-body');
  if (!body || !_seasonStatsData.length) return;

  const { col, desc } = _seasonStatsSort;
  const sorted = [..._seasonStatsData].sort((a, b) => {
    if (col === 'name') return desc ? (b.name||'').localeCompare(a.name||'') : (a.name||'').localeCompare(b.name||'');
    const av = a[col] ?? 0, bv = b[col] ?? 0;
    return desc ? bv - av : av - bv;
  });

  const arrow = (c) => _seasonStatsSort.col === c ? (_seasonStatsSort.desc ? ' ▼' : ' ▲') : '';
  const th = (label, key, align) => `<th style="padding:6px 4px;cursor:pointer;white-space:nowrap;font-size:0.68rem;text-align:${align||'center'};color:${_seasonStatsSort.col===key?'#1d4ed8':'#6b7280'};font-weight:700;user-select:none" onclick="sortSeasonStats('${key}')">${label}${arrow(key)}</th>`;

  let html = `<div style="overflow-x:auto;margin:0 -16px;padding:0 16px">
    <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
      <thead><tr style="border-bottom:2px solid #e5e7eb">
        ${th('#','cap','center')}${th('Name','name','left')}${th('GP','gamesPlayed')}${th('G','goals')}${th('A','assists')}${th('S','steals')}${th('EX','exclusions')}${th('G/GP','goalsPerGame')}
      </tr></thead><tbody>`;

  for (const [i, p] of sorted.entries()) {
    const bg = i % 2 ? '#f9fafb' : 'white';
    html += `<tr style="background:${bg}">
      <td style="padding:5px 4px;text-align:center;font-weight:700;color:#1d4ed8">${escHtml(p.cap||'')}</td>
      <td style="padding:5px 4px;font-weight:600;white-space:nowrap">${escHtml(p.name)}</td>
      <td style="padding:5px 4px;text-align:center">${p.gamesPlayed}</td>
      <td style="padding:5px 4px;text-align:center;font-weight:700;color:#16a34a">${p.goals}</td>
      <td style="padding:5px 4px;text-align:center">${p.assists}</td>
      <td style="padding:5px 4px;text-align:center">${p.steals}</td>
      <td style="padding:5px 4px;text-align:center;color:#dc2626">${p.exclusions}</td>
      <td style="padding:5px 4px;text-align:center;font-weight:600">${(p.goalsPerGame||0).toFixed(2)}</td>
    </tr>`;
  }

  html += '</tbody></table></div>';
  html += `<div style="font-size:0.68rem;color:#9ca3af;margin-top:8px;text-align:right">${sorted.length} players · tap column to sort</div>`;
  body.innerHTML = html;
}

/** Compiles and downloads one player's stats as a CSV. */
function downloadPlayerStats(nameEncoded) {
  const name  = decodeURIComponent(nameEncoded);
  const rows  = collectPlayerGameRows(name);

  if (!rows.length) {
    showToast('No stats found for this player');
    return;
  }

  const playerLabel = name || 'Player';
  const safeName    = playerLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  const filename    = `ebwp_${safeName}_stats.csv`;

  const csv = buildPlayerStatsCSV(playerLabel, rows);
  triggerDownload(filename, csv);
  closePlayerStatsModal();
  showToast(`📥 Downloaded ${playerLabel}'s stats (${rows.length} game${rows.length !== 1 ? 's' : ''})`, 'ok');
}

// ─── HELP TAB ─────────────────────────────────────────────────────────────────

function renderHelpTab() {
  const el = $('view-help');
  if (!el) return;

  const sections = [
    {
      icon: '📲',
      title: 'Installing the App (iOS App Store & Google Play)',
      body: `<p>Download the native <strong>Eggbeater Water Polo</strong> app for the best experience — faster performance, reliable push notifications, and home screen access.</p>
      <p style="margin-top:10px"><strong>🍎 iPhone / iPad (iOS)</strong></p>
      <ol>
        <li>Open the <strong>App Store</strong> on your iPhone or iPad.</li>
        <li>Search for <strong>Eggbeater Water Polo</strong>.</li>
        <li>Tap <strong>Get</strong> to download and install.</li>
        <li>Open the app, select your club and age group, then go to <strong>Settings → Notifications</strong> to enable push notifications.</li>
      </ol>
      <p style="margin-top:10px"><strong>🤖 Android</strong></p>
      <ol>
        <li>Open the <strong>Google Play Store</strong> on your Android device.</li>
        <li>Search for <strong>Eggbeater Water Polo</strong>.</li>
        <li>Tap <strong>Install</strong>.</li>
        <li>Open the app, select your club and age group, then allow notifications when prompted.</li>
      </ol>
      <p style="margin-top:8px;color:var(--text-muted);font-size:0.85rem">💡 The native app is recommended for the most reliable notifications and the smoothest experience.</p>`
    },
    {
      icon: '📱',
      title: 'Installing the Web App (iOS & Android)',
      body: `<p>No App Store needed — you can install the Eggbeater web app directly from your browser and add it to your home screen for a full-screen, app-like experience.</p>
      <p style="margin-top:10px"><strong>🍎 iPhone / iPad (iOS — Safari required)</strong></p>
      <ol>
        <li>Open <a href="https://eggbeater.app" target="_blank" rel="noopener" style="color:var(--royal);font-weight:700">eggbeater.app</a> in <strong>Safari</strong> (must be Safari — Chrome and other iOS browsers cannot install home screen apps).</li>
        <li>Tap the <strong>Share</strong> button — the box-with-arrow icon at the bottom of the screen (top-right on iPad).</li>
        <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
        <li>Tap <strong>Add</strong> — the Eggbeater icon appears on your home screen.</li>
        <li>Always open from the home screen icon for full-screen mode and push notifications.</li>
        <li>Go to <strong>Settings → Calendar &amp; Notifications</strong> and tap <em>Enable Notifications</em>.</li>
      </ol>
      <p style="margin-top:8px;color:var(--text-muted);font-size:0.85rem">⚠️ Push notifications on iOS require iOS 16.4+ and the app must be opened from the home screen icon, not from Safari directly.</p>
      <p style="margin-top:10px"><strong>🤖 Android (Chrome)</strong></p>
      <ol>
        <li>Open <a href="https://eggbeater.app" target="_blank" rel="noopener" style="color:var(--royal);font-weight:700">eggbeater.app</a> in <strong>Chrome</strong>.</li>
        <li>Tap the <strong>three-dot menu</strong> (⋮) in the top-right corner.</li>
        <li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
        <li>Tap <strong>Add</strong> or <strong>Install</strong> to confirm.</li>
        <li>Open from your home screen icon, then tap <em>Get Notified</em> and allow notifications when prompted.</li>
      </ol>`
    },
    {
      icon: '📅',
      title: 'Schedule Tab',
      body: `<p>The <strong>Schedule</strong> tab shows all upcoming games for the selected team sorted by game number.</p>
      <ul>
        <li>The <strong>Next Game</strong> card at the top highlights your next upcoming game in blue — when a game is being live-scored it turns red, shows <strong>🔴 LIVE</strong>, and displays the current score, quarter, and live clock so you can follow the action at a glance.</li>
        <li>Games below the Next Game card show opponent, game number, time, pool, location, and cap color. The next game only appears once — it won't duplicate in the list below.</li>
        <li>Once a game is marked with a result it automatically moves to the <strong>History</strong> tab — keeping this screen clean and future-focused.</li>
        <li>Tap <strong>Add to Calendar</strong> to sync all games to your Google Calendar.</li>
        <li>Tap <strong>Get Notified</strong> to enable push notifications when the schedule is updated.</li>
        <li>If multiple age groups are selected, the schedule is divided into labeled sections — one per age group — so you can see all your kids' games on one screen.</li>
      </ul>`
    },
    {
      icon: '🏆',
      title: 'Scores Tab — Live Scores & Box Scores',
      body: `<p>The <strong>Scores</strong> tab is where all live scoring and box scores live. Watch for a <strong>pulsing red dot</strong> on the Scores nav button — it lights up whenever a game is being actively scored.</p>
      <ul>
        <li><strong>👁 View Live Scores</strong> — tap this button (above the scorer login) to follow a live game in real time without needing the scoring password. You'll see the live score, event log, and box score updating every 10 seconds.</li>
        <li>Tap <strong>🔒 Scorer Login</strong> in the top-right corner of the viewer to switch to full scoring mode if you have the password.</li>
        <li>When a scorer is active, you'll see a <strong>🔴 LIVE</strong> badge and all updates appear within 10 seconds.</li>
        <li>The <strong>event log</strong> shows every goal 🏐, assist 🤝, exclusion ❌, and other events with clock times.</li>
        <li>The <strong>box score</strong> shows each player's totals: Goals, Attempts, 5m Goals, 5m Attempts, SO Goals, SO Attempts, Assists, and Exclusions.</li>
        <li>After the game, all stats are saved and flow into each player's history in the Roster tab.</li>
      </ul>`
    },
    {
      icon: '📊',
      title: 'Live Scoring — Scorer Controls',
      body: `<p>If you have the scoring password, tap <strong>🔒 Scorer Login</strong> (top-right of the viewer screen) and enter the tournament password to unlock full scoring controls.</p>
      <ul>
        <li><strong>Only the current game</strong> shows its full scoring buttons — upcoming games are collapsed to keep the screen clean. Tap any game header to expand it when it's time to score.</li>
        <li><strong>Auto Clock</strong> — the clock counts down automatically from the quarter length set by the admin. Tap <strong>▶ Start</strong> to begin Q1 and the clock. Every scoring event is instantly stamped with the current clock time the moment you tap the button — no prompts, no manual entry.</li>
        <li><strong>Game State bar</strong> — ▶ Start → Q1 → Q2 → ½ Time → Q3 → Q4 → 🏁 End. The <strong>↩ Pre</strong> button resets to pre-game from any state.</li>
        <li><strong>Goal / Opp Goal</strong> — records a goal and prompts you to pick the scorer. Check <strong>6-on-5</strong> in the picker to tag it as a power-play goal.</li>
        <li><strong>Attempt / Opp Attempt</strong> — records a shot that didn't score (used to calculate shooting %).</li>
        <li><strong>Assist</strong> — tap and pick the player who assisted.</li>
        <li><strong>Excl / Opp Excl</strong> — records an exclusion foul for either team.</li>
        <li><strong>5m / Opp 5m</strong> — records a 5-meter penalty shot as a goal.</li>
        <li><strong>5m Attempt / Opp 5m Attempt</strong> — records a 5-meter shot that didn't score.</li>
        <li><strong>🧤 GK Save / 🛡️ GK Block</strong> — records goalie saves and blocks.</li>
        <li><strong>Timeouts</strong> — separate buttons for each timeout length (e.g. <em>1 Min T/O</em> and <em>30s T/O</em>). Each button can only be used once — it grays out after use. The clock pauses automatically during a timeout.</li>
        <li><strong>↺ Reset Clock</strong> — resets the clock back to the full quarter length without changing the game state.</li>
        <li><strong>↩ Undo</strong> — removes the last logged event if you make a mistake.</li>
        <li>All updates are visible to everyone watching the app within 10 seconds.</li>
      </ul>`
    },
    {
      icon: '🎯',
      title: 'Shootout Mode',
      body: `<p>When a game is tied at the end of regulation, tap <strong>🎯 SO</strong> in the game state bar to enter Shootout Mode.</p>
      <ul>
        <li>Each team selects 5 players who each take a 5-meter shot.</li>
        <li>Every shootout goal scores <strong>+0.1 points</strong> — so a 3-goal shootout shows as 7.3 vs 7.0 if the score was 7–7.</li>
        <li>The <strong>SO Goal / Opp SO Goal</strong> buttons replace the regular goal buttons in shootout mode.</li>
        <li><strong>SO Attempts</strong> buttons track missed shootout shots for stats purposes.</li>
        <li>The 5m penalty row is hidden during shootouts since 5m penalties don't occur during SO.</li>
        <li>Tap the <strong>🎯✈️ Shootout Alert</strong> button to send an alert to your Telegram or GroupMe channel when a shootout begins.</li>
        <li>Tapping 🎯 SO a second time undoes the shootout state — use <strong>↩ Pre</strong> to fully reset if needed.</li>
      </ul>`
    },
    {
      icon: '🏅',
      title: 'Bracket Tab',
      body: `<p>The <strong>Bracket</strong> tab shows where the team could end up based on pool play results.</p>
      <ul>
        <li>Before the schedule is posted the tab shows <em>"Bracket Coming Soon"</em> — it activates once games are loaded.</li>
        <li>As pool play results are entered, the projected bracket path highlights automatically.</li>
        <li>Gold, Silver, and Bronze paths each show the possible opponent, time, and location.</li>
        <li>Bracket points: <strong>Win = 4 · SO Win = 3 · SO Loss = 2 · Loss = 1 · Forfeit = 0</strong>.</li>
        <li>When multiple age groups or A/B teams are selected, each has its own labeled bracket section — scroll to see them all.</li>
      </ul>`
    },
    {
      icon: '📜',
      title: 'History Tab',
      body: `<p>The <strong>History</strong> tab keeps a running record of every completed tournament.</p>
      <ul>
        <li>When you mark a game result in the Scores tab, it moves off the Schedule and into History automatically.</li>
        <li>Full tournament results archive automatically when a new tournament loads on any device.</li>
        <li>The standings table shows cumulative bracket points across all tournament days.</li>
        <li>Tap any tournament entry to expand and see game-by-game results.</li>
        <li>History is stored on your device and also seeded from the official record on first install.</li>
      </ul>`
    },
    {
      icon: '⭐',
      title: 'My Player — Follow Your Child',
      body: `<p>In the <strong>Roster</strong> tab, the <em>My Player</em> card lets you follow your child's full stats across the entire season. If you have kids on multiple age groups, you can follow one player per team simultaneously.</p>
      <ul>
        <li><strong>Single age group:</strong> tap the dropdown on the My Player card and select your child's name to start tracking them. Tap the card header to collapse or expand it.</li>
        <li><strong>Multiple age groups selected:</strong> a "My Players" card appears for each age group — pick your child from each team's dropdown. All followed players are shown at the top of the Roster tab.</li>
        <li><strong>Row 1 (large):</strong> Goals · Assists · Attempts — the three primary stats at a glance.</li>
        <li><strong>Row 2:</strong> 6on5 Goals · 5m Goals · 5m Attempts · SO Goals — specialty scoring stats.</li>
        <li><strong>Row 3:</strong> Exclusions · SO Attempts · Games — discipline and game count.</li>
        <li>Three <strong>Shooting % boxes</strong> show regular shot %, 5m shot %, and SO shot % — each with made/attempts breakdown.</li>
        <li>Recent games are listed with per-game stats and scores.</li>
        <li>The <strong>📊 Download Stats CSV</strong> button exports the full stat history as a spreadsheet.</li>
        <li>Goalies see Saves and Blocks instead of shooting stats.</li>
      </ul>`
    },
    {
      icon: '🤽‍♀️',
      title: 'Age Group Selector & A/B Team Picker',
      body: `<p>The <strong>age group pills</strong> just below the tournament header let you choose which age group(s) to view — 10u Co-Ed through 18u Boys, always displayed in age order.</p>
      <ul>
        <li><strong>Tap any pill</strong> to activate that age group. The active pill turns blue and all tabs reload with that group's data.</li>
        <li><strong>Tap a second pill</strong> to add another age group — great for parents with kids on two different teams. Multiple selections always display in age order (10u → 12u → 14u → 16u → 18u) regardless of the order you tap them.</li>
        <li>Tap an active pill again to deselect it (at least one must stay selected).</li>
        <li>Your selections are remembered between sessions.</li>
        <li>The pills scroll horizontally — swipe left or right to see all age groups.</li>
      </ul>
      <p style="margin-top:10px"><strong>A/B team sub-selector (compound pill):</strong> when a tournament has multiple squads in the same age group (e.g. 680 Red and 680 Blue), the age group pill expands into a <em>compound pill</em>:</p>
      <ul>
        <li>The pill shows the age group label followed by team name buttons: <code>14u Girls · 680 Red  680 Blue</code></li>
        <li>The currently active team name(s) are highlighted with a white background inside the pill.</li>
        <li><strong>Tap a team name button</strong> to select it. Tap it again to deselect it (at least one must stay selected per age group).</li>
        <li><strong>You can select both A and B at the same time</strong> — perfect if your child plays on both squads. When both are active, every tab shows two separate labeled sections: one for each team.</li>
        <li>Each age group has its own <em>independent</em> A/B selection — pick 12u Girls A-team and 16u Boys B-team at the same time with no conflict.</li>
      </ul>`
    },
    {
      icon: '👥',
      title: 'Multi-Age-Group & Split-Team View',
      body: `<p>The app supports viewing multiple age groups and multiple team squads simultaneously across all tabs.</p>
      <ul>
        <li><strong>Multiple age groups:</strong> when two or more age group pills are active, every tab — Schedule, Scores, Bracket, Roster, History — splits into labeled sections, one per age group. Scroll to see each team's data without switching back and forth.</li>
        <li><strong>Both A and B teams selected:</strong> when you select both team names within one age group, that group expands into two separate sections labeled "14u Girls · 680 Red" and "14u Girls · 680 Blue" — each showing only that squad's games, bracket, and roster. No mixing.</li>
        <li>Section headers always tell you exactly which squad you're looking at: <em>age group · team name</em>.</li>
        <li>Each team's history and bracket are tracked separately across all tournaments.</li>
        <li>The A/B sub-selector only appears when the admin has enabled multi-team mode for that age group.</li>
      </ul>`
    },
    {
      icon: '🌐',
      title: 'Accessing the Parent App from the Web',
      body: `<p>No install required — the full app works in any modern browser on any device: phone, tablet, or computer.</p>
      <ul>
        <li>Open <a href="https://eggbeater.app" target="_blank" rel="noopener" style="color:var(--royal);font-weight:700">eggbeater.app</a> in any browser — Chrome, Safari, Firefox, Edge, etc.</li>
        <li>All features work in the browser: schedule, live scores, bracket, roster, and history.</li>
        <li><strong>Bookmark it</strong> for quick access — tap the browser's share or bookmark icon and save it to your favorites.</li>
        <li>Your age group selections and preferences are remembered automatically in your browser.</li>
        <li>For push notifications and full-screen mode, install the app to your home screen — see <em>Installing the Web App</em> above, or download the native app from the App Store or Google Play.</li>
      </ul>`
    },
    {
      icon: '☁️',
      title: 'Sign In with Google — One Tap Covers Everything',
      body: `<p>Go to <strong>Settings → Account</strong> and tap <strong>Sign In with Google</strong>. This single sign-in covers <em>both</em> preference sync and Google Calendar access — no second popup ever.</p>
      <ul>
        <li><strong>Preferences sync:</strong> your selected age group(s), A/B team choices, and My Player picks are saved to the cloud and restored automatically on every device you use.</li>
        <li><strong>Calendar access included:</strong> the same sign-in grants calendar permission, so when you tap Connect in Settings → Calendar &amp; Notifications you just pick which calendar to use — Google doesn't ask you to sign in again.</li>
        <li><strong>Automatic reconnect:</strong> on every future visit your calendar reconnects silently in the background. You'll never need to re-authenticate unless you revoke access.</li>
        <li>Sign in on your phone — within seconds your tablet or laptop shows the exact same setup.</li>
        <li>Tap <strong>Sign Out</strong> (same button) to disconnect. Your local preferences stay on the device — nothing is deleted.</li>
        <li>The app works fully without signing in. Sign-In is purely additive and optional.</li>
      </ul>`
    },
    {
      icon: '🔔',
      title: 'Notifications & Calendar Sync',
      body: `<p>Stay up to date automatically:</p>
      <ul>
        <li><strong>Google Calendar</strong> — Sign in with Google first (tap <strong>Sign In</strong> in Settings), then go to <strong>Settings → Calendar &amp; Notifications</strong> and tap <strong>Connect</strong> to choose which of your Google calendars to sync to. All games are added automatically and update if times or locations change.</li>
        <li>To change which calendar is used, tap <em>Change</em> in the connected calendar card in Settings.</li>
        <li>Your calendar connection is remembered. On future visits the app reconnects silently in the background — no action needed.</li>
        <li><strong>Push Notifications</strong> — On iOS (iPhone/iPad), first install the app to your home screen (see <em>Installing the Web App</em> above), open from the home screen icon, then go to <strong>Settings → Calendar &amp; Notifications</strong> and tap <em>Enable Notifications</em>. On Android you can do the same directly in Chrome, or use the native Google Play app.</li>
        <li><strong>Telegram / GroupMe</strong> — The scorer can send box score updates and shootout alerts directly to your team channel from the Scores tab.</li>
      </ul>`
    },
    {
      icon: '📺',
      title: 'T-Score Tab — Tournament Director Scores',
      body: `<p>The <strong>T-Score</strong> tab shows official game scores submitted by the tournament director — separate from the live stat tracking on the Scores tab.</p>
      <ul>
        <li><strong>Director scores</strong> are the official final scores published by tournament organizers. They appear here as simple win/loss results with final scores.</li>
        <li>If the tournament director has enabled score entry, authorized scorers can submit final scores directly from this tab using the <strong>🏆 Submit Live Scores</strong> button.</li>
        <li>Director scores are used to calculate <strong>bracket placement</strong> and standings — they feed directly into the Bracket tab.</li>
        <li>These scores update automatically when the director publishes new results. Pull down to refresh or use the refresh button.</li>
        <li>The T-Score tab also shows the <strong>import schedule</strong> option if the tournament provides a director-managed schedule feed.</li>
      </ul>`
    },
    {
      icon: '🏢',
      title: 'Multi-Club Support',
      body: `<p>Eggbeater supports multiple water polo clubs, each with their own tournaments, rosters, and admin teams.</p>
      <ul>
        <li>Each club has a unique <strong>club ID</strong> (e.g. <code>680-drivers</code>) that scopes all data — schedules, scores, rosters, and history are kept completely separate between clubs.</li>
        <li>If you receive a link with <code>?club=</code> in the URL, the app automatically loads that club's data. No extra setup needed.</li>
        <li>Your age group selections and My Player picks are saved per club, so switching between clubs doesn't lose your preferences.</li>
        <li>Club admins manage their own tournaments independently — changes by one club's admin never affect another club.</li>
        <li><strong>Custom club colors</strong> — each club's admin can set custom brand colors (primary and secondary). The app automatically applies these colors when you visit that club's page, theming the header, buttons, and accents to match the club's identity.</li>
      </ul>`
    },
    {
      icon: '🌙',
      title: 'Dark Mode',
      body: `<p>Eggbeater supports <strong>dark mode</strong> for comfortable viewing in low-light environments.</p>
      <ul>
        <li><strong>Toggle:</strong> go to <strong>Settings → Appearance</strong> and choose Light, Dark, or System to match your preference.</li>
        <li><strong>Auto-detection:</strong> on first visit, the app matches your device's system theme (e.g. if your iPhone is set to dark mode, the app starts in dark mode).</li>
        <li><strong>Remembered:</strong> your preference is saved in your browser and will persist across visits and page reloads.</li>
        <li>All tabs, cards, modals, the bottom nav, and the More drawer are fully styled for dark mode.</li>
      </ul>`
    },
    {
      icon: '📍',
      title: 'Map & Directions',
      body: `<p>Game cards include <strong>tappable direction links</strong> so you can get to the venue in your preferred maps app.</p>
      <ul>
        <li>When a game has a location, the 📍 location name is a tappable link.</li>
        <li>Three direction buttons appear next to each location — choose whichever app you prefer:
          <ul style="margin-top:4px">
            <li><strong>Apple</strong> — opens Apple Maps (great for iPhone users)</li>
            <li><strong>Google</strong> — opens Google Maps</li>
            <li><strong>Waze</strong> — opens Waze for live traffic routing</li>
          </ul>
        </li>
        <li>Both the Next Game card and regular schedule cards show direction buttons.</li>
        <li>If the location is GPS coordinates, they're passed directly; otherwise the venue name is searched.</li>
      </ul>`
    },
    {
      icon: '📡',
      title: 'Offline Scoring Support',
      body: `<p>Scorers can now continue entering scores even when their internet connection drops.</p>
      <ul>
        <li>If a live score update fails due to a network error, it is <strong>automatically queued</strong> on the device.</li>
        <li>A yellow <strong>"📡 Offline — scores will sync when connected"</strong> banner appears when scores are queued.</li>
        <li>When connectivity returns, all queued scores are automatically replayed in order.</li>
        <li>A green <strong>"✅ Scores synced"</strong> toast confirms successful sync.</li>
        <li>If the app is closed, the <strong>Background Sync API</strong> retries automatically when the device reconnects.</li>
        <li>Each queued score retries up to 10 times before raising an error.</li>
      </ul>`
    },
    {
      icon: '🔍',
      title: 'Club Directory',
      body: `<p>A <strong>public club directory</strong> is available for discovering clubs on the Eggbeater platform.</p>
      <ul>
        <li>Visit <a href="https://eggbeater.app/directory.html" target="_blank" style="color:var(--royal);font-weight:700">the Club Directory</a> to browse all clubs.</li>
        <li>Each club shows their logo, name, type (Club or High School), and number of active age groups.</li>
        <li>Use the <strong>search bar</strong> at the top to filter clubs by name.</li>
        <li>Tapping a club card loads the app with that club's schedule pre-selected.</li>
        <li>The directory is mobile-responsive and requires no login.</li>
      </ul>`
    },
  ];

  const accordionHtml = sections.map((s, i) => `
    <details class="help-item">
      <summary class="help-summary">
        <span class="help-icon">${s.icon}</span>
        <span class="help-title">${s.title}</span>
        <svg class="help-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </summary>
      <div class="help-body">${s.body}</div>
    </details>`).join('');

  el.innerHTML = `
    <div class="card tab-card help-intro-card">
      <div class="help-intro-row">
        <img src="icon-512.png" alt="Eggbeater" class="help-logo">
        <div>
          <h2 class="help-intro-title">Eggbeater Water Polo</h2>
          <p class="help-intro-sub">Parent guide &amp; quick reference</p>
        </div>
      </div>
      <a href="eggbeater-quickstart.pdf" target="_blank" rel="noopener" class="help-quickstart-btn">
        📄 Download Quick Start Guide
      </a>
    </div>

    <div class="card tab-card help-accordion-card">
      ${accordionHtml}
    </div>

    <div class="card tab-card help-feedback-card">
      <div class="help-feedback-header">
        <span class="help-feedback-icon">💡</span>
        <div>
          <div class="help-feedback-title">Have an idea or feedback?</div>
          <div class="help-feedback-sub">We're always adding new features — let us know what you'd find useful!</div>
        </div>
      </div>
      <a class="help-request-btn"
         href="mailto:pipers4323@gmail.com?subject=Eggbeater%20App%20Feature%20Request&body=Hi%2C%20I%20have%20a%20suggestion%20for%20the%20Eggbeater%20WP%20app%3A%0A%0A"
         target="_blank" rel="noopener">
        ✉️ Request a Feature
      </a>
      <p class="help-feedback-note">Tapping this opens your email app addressed to the app team. Just type your idea and hit send!</p>
    </div>

    <div class="help-version">Eggbeater Water Polo · Built with ❤️ for the team</div>
  `;
}

// ─── MY PLAYER(S) ─────────────────────────────────────────────────────────────

/** Returns array of followed players: [{name, teamKey}]. */
function getMyPlayers() {
  try { return JSON.parse(localStorage.getItem(STORE.MY_PLAYERS) || '[]'); } catch { return []; }
}
function saveMyPlayers(arr) {
  localStorage.setItem(STORE.MY_PLAYERS, JSON.stringify(arr));
  // Sync to Firestore if parent is signed in (Phase 1)
  if (typeof fbSavePrefs === 'function') fbSavePrefs();
}
function addMyPlayer(name, teamKey) {
  const arr = getMyPlayers();
  const key = teamKey || getSelectedTeam();
  // Uniqueness is per team — two different kids in two different age groups can
  // share the same name, and two kids in the same age group can both be followed.
  if (!arr.find(p => p.name.toLowerCase() === name.toLowerCase() && p.teamKey === key)) {
    arr.push({ name, teamKey: key });
    saveMyPlayers(arr);
    showToast(`⭐ Following ${name}`, 'ok');
  }
  renderRosterTab();
}
function removeMyPlayer(name, teamKey) {
  // If teamKey is provided, only remove that specific team entry.
  // Otherwise remove ALL entries with this name (legacy / fallback).
  saveMyPlayers(getMyPlayers().filter(p => {
    const nameMatch = p.name.toLowerCase() === name.toLowerCase();
    if (!nameMatch) return true;        // keep — different name
    if (teamKey)    return p.teamKey !== teamKey;  // keep — different team
    return false;                       // no teamKey — remove all with this name
  }));
  // Also clear legacy single-player if it matches
  if ((localStorage.getItem(STORE.MY_PLAYER) || '').toLowerCase() === name.toLowerCase()) {
    localStorage.removeItem(STORE.MY_PLAYER);
  }
  renderRosterTab();
}

/** Legacy single-player getter — returns first tracked player's name. */
function getMyPlayer() {
  const arr = getMyPlayers();
  if (arr.length) return arr[0].name;
  return localStorage.getItem(STORE.MY_PLAYER) || '';
}

/** Legacy single-player setter — replaces the first tracked player. */
function setMyPlayer(name) {
  if (name) {
    const arr = getMyPlayers();
    const teamKey = getSelectedTeam();
    if (!arr.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      // Replace first entry for this team, or add
      const idx = arr.findIndex(p => p.teamKey === teamKey);
      if (idx >= 0) arr[idx] = { name, teamKey };
      else arr.push({ name, teamKey });
      saveMyPlayers(arr);
    }
    localStorage.setItem(STORE.MY_PLAYER, name);
    showToast(`⭐ Following ${name}`, 'ok');
  } else {
    localStorage.removeItem(STORE.MY_PLAYER);
  }
  renderRosterTab();
}

/** Clears the followed player for the current team. */
function clearMyPlayer() {
  const teamKey = getSelectedTeam();
  const arr = getMyPlayers().filter(p => p.teamKey !== teamKey);
  saveMyPlayers(arr);
  localStorage.removeItem(STORE.MY_PLAYER);
  renderRosterTab();
}

/**
 * Renders multi-child "My Players" card for the top of the multi-team roster tab.
 * Shows one card per followed player.
 */
function renderMyPlayersCard() {
  const players = getMyPlayers();
  const teams   = getSelectedTeams();

  // Build one mini card per team with an add-player option
  let html = '';
  for (const teamKey of teams) {
    const label    = TEAM_OPTIONS.find(t => t.key === teamKey)?.label || teamKey;
    const cache    = TEAM_CACHE[teamKey];
    const roster   = cache
      ? (Array.isArray(cache.tournament.roster) ? cache.tournament.roster : (cache.tournament.roster?.A || []))
      : (state.roster || []);
    const tracked  = players.filter(p => p.teamKey === teamKey);
    const sorted   = sortedRoster(roster).filter(p => p.first || p.last);
    const opts     = sorted.map(p => {
      const full = [p.first, p.last].filter(Boolean).join(' ');
      const sel  = tracked.some(t => t.name.toLowerCase() === full.toLowerCase()) ? ' selected' : '';
      return `<option value="${escHtml(full)}"${sel}>${p.cap ? '#' + escHtml(p.cap) + ' ' : ''}${escHtml(full)}</option>`;
    }).join('');

    if (tracked.length) {
      const badges = tracked.map(p => `
        <span class="mp-multi-badge">
          ⭐ ${escHtml(p.name)}
          <button class="mp-multi-remove" onclick="removeMyPlayer('${escHtml(p.name)}','${escHtml(p.teamKey)}')" title="Remove">×</button>
        </span>`).join('');
      html += `<div class="card tab-card mp-multi-card">
        <div class="mp-multi-header"><span class="history-subtitle">${escHtml(label)}</span></div>
        <div class="mp-multi-badges">${badges}</div>
        ${opts ? `<div class="mp-multi-add-row">
          <select class="mp-multi-select" id="mp-sel-${escHtml(teamKey)}">
            <option value="">+ Add another player…</option>${opts}
          </select>
          <button class="mp-multi-add-btn" onclick="_addPlayerFromSelect('${escHtml(teamKey)}')">Add</button>
        </div>` : ''}
      </div>`;
    } else {
      html += `<div class="card tab-card mp-multi-card mp-multi-empty">
        <div class="mp-multi-header"><span>⭐</span><span class="history-subtitle">${escHtml(label)}</span></div>
        <p class="step-desc" style="margin-bottom:8px">Tap a player below to follow their stats.</p>
        ${opts ? `<div class="mp-multi-add-row">
          <select class="mp-multi-select" id="mp-sel-${escHtml(teamKey)}">
            <option value="">Select a player…</option>${opts}
          </select>
          <button class="mp-multi-add-btn" onclick="_addPlayerFromSelect('${escHtml(teamKey)}')">Follow</button>
        </div>` : '<p class="empty-msg">No roster loaded yet.</p>'}
      </div>`;
    }
  }
  return html;
}

function _addPlayerFromSelect(teamKey) {
  const sel = document.getElementById('mp-sel-' + teamKey);
  if (!sel || !sel.value) return;
  addMyPlayer(sel.value, teamKey);
}

/** Gets saved 6-8 Sports profile URL. */
function get68SportsUrl() {
  return localStorage.getItem(STORE.SPORTS68_URL) || '';
}

/** Saves 6-8 Sports profile URL to localStorage. */
function save68SportsUrl(url) {
  if (url) {
    localStorage.setItem(STORE.SPORTS68_URL, url.trim());
  } else {
    localStorage.removeItem(STORE.SPORTS68_URL);
  }
}

/** Opens the saved 6-8 Sports profile URL, or the dashboard homepage. */
function open68SportsUrl() {
  const url = get68SportsUrl();
  window.open(url || 'https://www.6-8dashboard.com/', '_blank', 'noopener');
}

/**
 * Looks up summary stats for a player by name from getAllPlayersWithStats().
 * Uses the same full-name / first-name matching rules as the CSV download.
 */
function getMyPlayerSummaryStats(name) {
  if (!name) return null;
  const all       = getAllPlayersWithStats();
  const nameLC    = name.toLowerCase();
  const firstName = nameLC.split(' ')[0] || '';
  return all.find(p => {
    const pn = (p.name || '').toLowerCase();
    if (pn === nameLC) return true;
    if (firstName.length > 2 && pn.split(' ')[0] === firstName) return true;
    return false;
  }) || null;
}

/** Sanitises a player name into a safe key for localStorage / data attributes. */
function _mpKey(name) { return name.toLowerCase().replace(/[^a-z0-9]/g, '_'); }

/** Toggles collapse state for a specific player stats card (keyed by sanitised name). */
function toggleMyPlayerCollapse(key) {
  const storeKey  = `ebwp-mpc-${key}`;
  const collapsed = localStorage.getItem(storeKey) === '1';
  localStorage.setItem(storeKey, collapsed ? '0' : '1');
  const chevron = document.querySelector(`.mp-collapse-chevron[data-mpkey="${key}"]`);
  const body    = document.querySelector(`.mp-body[data-mpkey="${key}"]`);
  if (chevron) chevron.classList.toggle('mp-collapsed', !collapsed);
  if (body)    body.classList.toggle('mp-body-hidden', !collapsed);
}

/** Renders a full stats card for one player (used in single-team mode). */
function _renderPlayerStatsCard(playerName) {
  const roster   = state.roster || [];
  const stats    = getMyPlayerSummaryStats(playerName);
  const G        = stats ? stats.G          : 0;
  const SM       = stats ? (stats.SM  || 0) : 0;
  const G5       = stats ? (stats.G5  || 0) : 0;
  const M5       = stats ? (stats.M5  || 0) : 0;
  const SOG      = stats ? (stats.SOG || 0) : 0;
  const SOM      = stats ? (stats.SOM || 0) : 0;
  const A        = stats ? stats.A          : 0;
  const Excl     = stats ? stats.Excl       : 0;
  const sixOnFive = stats ? (stats.sixOnFive || 0) : 0;
  const Sv       = stats ? (stats.Sv  || 0) : 0;
  const Blk      = stats ? (stats.Blk || 0) : 0;
  const gameCount = stats ? stats.gameCount  : 0;

  function shotPct(made, missed) {
    const total = made + missed;
    if (!total) return { pct: '—', frac: '0/0' };
    return { pct: Math.round((made / total) * 100) + '%', frac: `${made}/${total}` };
  }
  const regPct  = shotPct(G, SM);
  const fivePct = shotPct(G5, M5);
  const soPct   = shotPct(SOG, SOM);
  const initials      = playerName.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
  const hasStats      = stats && gameCount > 0;
  const nameEnc       = encodeURIComponent(playerName);
  const rosterEntry   = roster.find(p => `${p.first} ${p.last}`.toLowerCase() === playerName.toLowerCase());
  const playerIsGoalie = rosterEntry ? isGoalie(rosterEntry.cap) : (Sv > 0 || Blk > 0);

  const gameRows = (() => {
    const rows = collectPlayerGameRows(playerName);
    if (!rows.length) return '';
    const recent = [...rows].reverse().slice(0, 5);
    const cells  = recent.map(r => {
      const res   = r.result ? `<span class="mp-game-result mp-res-${r.result.toLowerCase()}">${resultLabel(r.result)}</span>` : '';
      const score = (r.teamScore !== '' && r.oppScore !== '') ? `${r.teamScore}–${r.oppScore}` : '';
      return `<div class="mp-game-row">
        <div class="mp-game-opp">${escHtml(r.opponent)}${res ? ' ' + res : ''} ${score ? `<span class="mp-game-score">${score}</span>` : ''}</div>
        <div class="mp-game-stats">${playerIsGoalie
          ? `Sv&nbsp;${r.Sv||0}&nbsp; Blk&nbsp;${r.Blk||0}&nbsp; Ex&nbsp;${r.Excl}`
          : `G&nbsp;${r.G}&nbsp; A&nbsp;${r.A}&nbsp; Ex&nbsp;${r.Excl}`}</div>
      </div>`;
    }).join('');
    const moreNote = rows.length > 5 ? `<div class="mp-game-more">${rows.length - 5} more game${rows.length - 5 !== 1 ? 's' : ''} in download</div>` : '';
    return `<div class="mp-games-section">
      <div class="mp-section-label">Recent games</div>
      ${cells}
      ${moreNote}
    </div>`;
  })();

  const key         = _mpKey(playerName);
  const isCollapsed = localStorage.getItem(`ebwp-mpc-${key}`) === '1';

  return `<div class="card tab-card my-player-card">
    <div class="mp-header" onclick="toggleMyPlayerCollapse('${escHtml(key)}')" style="cursor:pointer">
      <div class="mp-avatar">${escHtml(initials)}</div>
      <div class="mp-info">
        <div class="mp-name">${escHtml(playerName)}</div>
        <button class="mp-change-btn" onclick="event.stopPropagation();removeMyPlayer('${escHtml(playerName)}')">Remove</button>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="mp-star-badge">⭐</span>
        <svg class="mp-collapse-chevron${isCollapsed ? ' mp-collapsed' : ''}" data-mpkey="${escHtml(key)}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>

    <div class="mp-body${isCollapsed ? ' mp-body-hidden' : ''}" data-mpkey="${escHtml(key)}">
    <div class="mp-stat-rows">
      ${playerIsGoalie ? `
      <div class="mp-stat-row-lg">
        <div class="mp-stat-box"><span class="mp-stat-num">${Sv}</span><span class="mp-stat-lbl">Saves</span></div>
        <div class="mp-stat-box"><span class="mp-stat-num">${Blk}</span><span class="mp-stat-lbl">Blocks</span></div>
        <div class="mp-stat-box"><span class="mp-stat-num">${Excl}</span><span class="mp-stat-lbl">Exclusions</span></div>
      </div>
      <div class="mp-stat-row-3">
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${gameCount}</span><span class="mp-stat-lbl-sm">Games</span></div>
      </div>
` : `
      <div class="mp-stat-row-lg">
        <div class="mp-stat-box"><span class="mp-stat-num">${G}</span><span class="mp-stat-lbl">Goals</span></div>
        <div class="mp-stat-box"><span class="mp-stat-num">${A}</span><span class="mp-stat-lbl">Assists</span></div>
        <div class="mp-stat-box"><span class="mp-stat-num">${SM}</span><span class="mp-stat-lbl">Attempts</span></div>
      </div>
      <div class="mp-stat-row-4">
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${sixOnFive}</span><span class="mp-stat-lbl-sm">6on5 Goals</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${G5}</span><span class="mp-stat-lbl-sm">5m Goals</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${M5}</span><span class="mp-stat-lbl-sm">5m Attempts</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${SOG}</span><span class="mp-stat-lbl-sm">SO Goals</span></div>
      </div>
      <div class="mp-stat-row-3">
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${Excl}</span><span class="mp-stat-lbl-sm">Exclusions</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${SOM}</span><span class="mp-stat-lbl-sm">SO Attempts</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${gameCount}</span><span class="mp-stat-lbl-sm">Games</span></div>
      </div>`}
    </div>

    ${!playerIsGoalie ? `
    <div class="mp-pct-grid">
      <div class="mp-pct-box">
        <span class="mp-pct-num">${regPct.pct}</span>
        <span class="mp-pct-frac">${regPct.frac} shots</span>
        <span class="mp-pct-lbl">Shooting %</span>
      </div>
      <div class="mp-pct-box">
        <span class="mp-pct-num">${fivePct.pct}</span>
        <span class="mp-pct-frac">${fivePct.frac} shots</span>
        <span class="mp-pct-lbl">5m Shot %</span>
      </div>
      <div class="mp-pct-box">
        <span class="mp-pct-num">${soPct.pct}</span>
        <span class="mp-pct-frac">${soPct.frac} shots</span>
        <span class="mp-pct-lbl">SO Shot %</span>
      </div>
    </div>` : ''}

    ${!hasStats ? `<p class="mp-no-stats">No stats tracked yet — start live scoring to build this player's history!</p>` : ''}
    ${gameRows}
    <div class="mp-dl-bar">
      <button class="mp-dl-wide-btn" onclick="downloadPlayerStats('${nameEnc}')">
        <span class="mp-dl-wide-icon">📊</span>
        <span class="mp-dl-wide-lbl">Download Stats CSV</span>
      </button>
    </div>
    </div>
  </div>`;
}

/**
 * Builds the "My Players" card(s) for the top of the Roster tab in single-team mode.
 * Supports multiple players from the same age group.
 */
function renderMyPlayerCard() {
  const teamKey = getSelectedTeam();
  const roster  = state.roster || [];
  const players = getMyPlayers().filter(p => p.teamKey === teamKey);

  // Build options excluding already-followed players
  const opts = sortedRoster(roster)
    .filter(p => p.first || p.last)
    .filter(p => {
      const full = [p.first, p.last].filter(Boolean).join(' ');
      return !players.some(t => t.name.toLowerCase() === full.toLowerCase());
    })
    .map(p => {
      const full = [p.first, p.last].filter(Boolean).join(' ');
      return `<option value="${escHtml(full)}">${p.cap ? '#' + escHtml(p.cap) + ' ' : ''}${escHtml(full)}</option>`;
    }).join('');

  if (!players.length) {
    return `<div class="card tab-card my-player-card mp-empty">
      <div class="mp-empty-header">
        <span class="mp-empty-star">⭐</span>
        <div>
          <div class="mp-empty-title">My Players</div>
          <div class="mp-empty-sub">Follow your child's stats at a glance</div>
        </div>
      </div>
      ${opts
        ? `<div class="mp-multi-add-row">
             <select class="mp-multi-select" id="mp-sel-${escHtml(teamKey)}">
               <option value="">— Pick a player —</option>${opts}
             </select>
             <button class="mp-multi-add-btn" onclick="_addPlayerFromSelect('${escHtml(teamKey)}')">Follow</button>
           </div>`
        : `<p class="mp-no-roster">Add players to the roster below, then come back here to follow your child.</p>`
      }
    </div>`;
  }

  // Selection management card
  let html = `<div class="card tab-card my-player-card">
    <div class="mp-multi-header"><span>⭐</span> <strong>My Players</strong></div>
    <div class="mp-multi-badges">
      ${players.map(p => `
        <span class="mp-multi-badge">
          ⭐ ${escHtml(p.name)}
          <button class="mp-multi-remove" onclick="removeMyPlayer('${escHtml(p.name)}','${escHtml(p.teamKey || teamKey)}')" title="Remove">×</button>
        </span>`).join('')}
    </div>
    ${opts ? `<div class="mp-multi-add-row">
      <select class="mp-multi-select" id="mp-sel-${escHtml(teamKey)}">
        <option value="">+ Add another player…</option>${opts}
      </select>
      <button class="mp-multi-add-btn" onclick="_addPlayerFromSelect('${escHtml(teamKey)}')">Add</button>
    </div>` : ''}
  </div>`;

  // Individual stats card per followed player
  for (const p of players) {
    html += _renderPlayerStatsCard(p.name);
  }
  return html;
}

// ─── LIVE ACTIVITIES (iOS) ───────────────────────────────────────────────────
async function toggleLiveActivity(gameId) {
  if (!window.Capacitor || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    showToast("Live Activities only supported on iOS App");
    return;
  }
  
  const LiveActivity = Capacitor.Plugins.LiveActivityPlugin;
  if (!LiveActivity) {
    showToast("Live Activity plugin not installed/registered", "error");
    return;
  }

  const game = getTournamentGames().find(g => g.id === gameId);
  const score = getLiveScore(gameId);
  
  try {
    const result = await LiveActivity.startActivity({
      homeTeam: game ? getTeamLabel(game.team) : "Home",
      awayTeam: game && game.opponent ? game.opponent : "Away",
      homeScore: score.team || 0,
      awayScore: score.opp || 0,
      clock: score.clock || "0:00",
      quarter: score.quarter || "1"
    });

    // Listen for push token to send to the Worker
    LiveActivity.addListener('onPushTokenReceived', async (info) => {
      console.log("Live Activity APNs Token Received:", info.token);
      
      // Save to Cloudflare Worker KV so backend can push updates
      try {
        await fetch(`${PUSH_SERVER_URL}/live-activity/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: gameId,
            pushToken: info.token
          })
        });
        showToast("Following Live! Updates will appear on your lock screen.", "ok");
      } catch (e) {
        console.error("Failed to sync Live Activity token:", e);
      }
    });
  } catch (e) {
    showToast("Live activities unavailable: " + e.message, "error");
  }
}

document.addEventListener('DOMContentLoaded', init);
